import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { dbDriver } from '../db/driver';
import { seedUsersIfEmpty } from '../services/seed.service';
import { cleanObjectForFirestore } from '../services/transaction-sync.service';

const JWT_SECRET = process.env.JWT_SECRET || 'yayasan-mmb-super-secure-key-1029384756';

export function generateToken(payload: { email: string, role: string, features: string[] }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { email: string, role: string, features: string[] } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Authentication middleware to protect API routes from unauthorized clients
export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  let token = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token as string;
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Akses Ditolak: Token otentikasi tidak ditemukan. Harap masuk terlebih dahulu.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Sesi Tidak Valid: Sesi Anda telah berakhir atau tanda tangan token tidak sah.' });
  }

  req.user = decoded;
  next();
};

// Check if user has explicit access to a specific collection/resource
export const checkCollectionPermission = (req: any, res: Response, next: NextFunction) => {
  const { colName } = req.params;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Otentikasi wajib.' });
  }

  const role = user.role;

  // 1. Highly restricted system admin collections
  if (colName === 'users' || colName === 'system_state' || colName === 'audits') {
    if (role !== 'Super Admin' && role !== 'Ketua Yayasan') {
      return res.status(403).json({ success: false, message: 'Hak Akses Terbatas: Hanya Super Admin atau Ketua Yayasan yang diizinkan mengelola data sistem ini.' });
    }
  }

  // 2. Financial, Payroll & Kas collections (Only Super Admin, Ketua Yayasan and Bendahara are authorized, or users with explicit 'reports' access for read-only GET requests)
  if (colName === 'transactions' || colName === 'kas' || colName === 'salaries' || colName === 'staff' || colName === 'partners' || colName === 'categories' || colName === 'donations' || colName === 'incomes' || colName === 'expenses' || colName === 'detail_pengeluaran' || colName === 'detail_expenses' || colName === 'fundraising' || colName === 'payroll_payments') {
    const isReadRequest = req.method === 'GET';
    const hasReportsAccess = Array.isArray(user.features) && user.features.includes('reports');

    const isStaffOrSalaryRead = (colName === 'staff' || colName === 'salaries') && isReadRequest;
    
    // Check custom bypasses for Staff/Partners:
    // 1. Staff can read/write partners
    const isPartnersAccess = colName === 'partners';
    // 2. Staff can only read donations
    const isDonationsRead = colName === 'donations' && isReadRequest;

    const isBypassed = isStaffOrSalaryRead || isPartnersAccess || isDonationsRead;

    if (!isBypassed && !(role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Bendahara' || (isReadRequest && hasReportsAccess))) {
      return res.status(403).json({ success: false, message: 'Hak Akses Terbatas: Anda tidak memiliki wewenang untuk melihat atau memodifikasi data keuangan/kepegawaian/kemitraan.' });
    }
  }

  // 3. Staff Tasks & Meetings access (Requires 'staff_tasks' feature, or Super Admin/Ketua Yayasan role)
  if (colName === 'staff_tasks' || colName === 'staff_meetings') {
    const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan';
    const hasAccess = Array.isArray(user.features) && user.features.includes('staff_tasks');
    if (!isSuperAdmin && !hasAccess) {
      return res.status(403).json({ success: false, message: 'Hak Akses Terbatas: Anda tidak memiliki wewenang untuk mengakses modul Program & Rapat Staf.' });
    }
  }

  next();
};

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { name, phone, password, role } = req.body;
  try {
    await seedUsersIfEmpty();

    if (!name || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'Harap lengkapi seluruh formulir registrasi.' });
    }

    // Normalized phone
    const cleanPhone = phone.trim();
    const docId = `${cleanPhone}@esm.or.id`; // standard document ID as email for full compatibility

    // Check if phone or email already registered
    const docSnap = await dbDriver.getDoc('users', docId);
    if (docSnap) {
      return res.status(400).json({ success: false, message: 'Nomor telepon ini sudah terdaftar.' });
    }

    const newUser = {
      name: name.trim(),
      phone: cleanPhone,
      email: docId,
      password,
      role,
      approved: false, // Pending verification
      features: [], // No features until approved
      deleted: false,
      createdAt: new Date().toISOString()
    };

    await dbDriver.setDoc('users', docId, newUser);

    // Only map/create a staff profile entry if they register as a 'Staff'
    if (role === 'Staff') {
      const staffNik = `NIK-REG-${Date.now().toString().slice(-4)}`;
      const newStaff = {
        nik: staffNik,
        name: name.trim(),
        phone: cleanPhone,
        email: docId,
        address: 'Kantor Yayasan MMB',
        position: 'Staf Pelaksana',
        division: 'Umum',
        status: 'Kontrak',
        joinedDate: new Date().toISOString().split('T')[0],
        salaryBase: 0,
        allowancePosition: 0,
        allowanceHousing: 0,
        allowanceTransport: 0,
        allowanceComm: 0,
        bonus: 0,
        thr: 0,
        bpjsAllowance: 0,
        taxDeduction: 0,
        bpjsDeduction: 0,
        kasbonDeduction: 0,
        otherDeduction: 0,
        paidAmount: 0,
        deleted: false,
        createdAt: new Date().toISOString()
      };
      await dbDriver.setDoc('staff', staffNik, cleanObjectForFirestore(newStaff));
    }

    // Write audit log
    const auditId = `AUD-REG-${Date.now()}`;
    await dbDriver.setDoc('audits', auditId, cleanObjectForFirestore({
      id: auditId,
      userName: name,
      userRole: role,
      action: `[Registrasi] Operator baru ${name} mendaftarkan diri dengan no telepon ${cleanPhone} sebagai calon ${role}. (Menunggu persetujuan & berhasil diintegrasikan ke data staff)`,
      module: 'Sistem',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      deleted: false
    }));

    res.json({ success: true, message: 'Pengajuan akun berhasil! Silakan hubungi Super Admin atau Ketua Yayasan untuk persetujuan akun Anda.' });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Alamat email/nomor telepon dan password wajib diisi.' });
  }

  try {
    await seedUsersIfEmpty();

    // Try to fetch direct
    let user: any = await dbDriver.getDoc('users', email);

    if (!user || user.deleted) {
      // Query all users as fallback for phone number comparison or case-insensitive matching
      const allUsers = await dbDriver.getDocs('users');
      for (const u of allUsers) {
        if (!u.deleted) {
          if (u.phone === email || u.email?.toLowerCase() === email.toLowerCase()) {
            user = u;
            break;
          }
        }
      }
    }

    if (user) {
      if (user.password === password) {
        if (user.approved === false) {
          return res.status(403).json({ 
            success: false, 
            message: 'Koneksi Ditolak: Akun Anda dalam status menunggu persetujuan dari Super Admin.' 
          });
        }

        const features = user.features || [];
        const token = generateToken({
          email: user.email || user.phone,
          role: user.role,
          features: features
        });

        return res.json({
          success: true,
          user: {
            email: user.email || user.phone,
            name: user.name,
            role: user.role,
            features: features,
            approved: user.approved !== false,
            token: token
          }
        });
      }
    }
    res.status(401).json({ success: false, message: 'Kredensial salah: Alamat email, nomor telepon, atau password tidak valid.' });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cryptographic token verification & dynamic session alignment endpoint
router.get('/verify', authenticateToken, async (req: any, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Payload token tidak valid.' });
    }

    // Load active record from authentic datasource
    let user: any = await dbDriver.getDoc('users', email);
    if (!user || user.deleted) {
      // Fallback query for phone and case-insensitive check
      const allUsers = await dbDriver.getDocs('users');
      for (const u of allUsers) {
        if (!u.deleted && (u.phone === email || u.email?.toLowerCase() === email.toLowerCase())) {
          user = u;
          break;
        }
      }
    }

    if (!user || user.deleted) {
      return res.status(401).json({ success: false, message: 'Sesi Kedaluwarsa: Akun pengguna tidak ditemukan atau telah dinonaktifkan.' });
    }

    if (user.approved === false) {
      return res.status(403).json({ success: false, message: 'Koneksi Ditangguhkan: Akses akun dibekukan oleh Admin.' });
    }

    const features = user.features || [];
    // Issue a refreshed token aligned with latest DB privileges
    const freshToken = generateToken({
      email: user.email || user.phone,
      role: user.role,
      features: features
    });

    res.json({
      success: true,
      user: {
        email: user.email || user.phone,
        name: user.name,
        role: user.role,
        features: features,
        approved: true,
        token: freshToken
      }
    });
  } catch (error: any) {
    console.error('Session verify error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/forgot-password/challenge', async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    await seedUsersIfEmpty();
    const docSnap = await dbDriver.getDoc('users', email);
    if (!docSnap || docSnap.deleted) {
      return res.status(404).json({ success: false, message: 'Alamat email tidak terdaftar.' });
    }
    res.json({
      success: true,
      question: 'Siapa nama Ketua Dewan Pembina Yayasan MMB? (Petunjuk: Terdapat di struktur organisasi)'
    });
  } catch (error: any) {
    console.error('Forgot password challenge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/forgot-password/reset', async (req: Request, res: Response) => {
  const { email, answer, newPassword } = req.body;
  try {
    const docSnap = await dbDriver.getDoc('users', email);
    if (!docSnap || docSnap.deleted) {
      return res.status(404).json({ success: false, message: 'Alamat email tidak terdaftar.' });
    }
    
    const cleanAnswer = (answer || '').toLowerCase().replace(/[^a-z]/g, '');
    const isCorrect = cleanAnswer.includes('josephsinaga') || cleanAnswer.includes('sinaga') || cleanAnswer.includes('joseph');
    
    if (isCorrect) {
      await dbDriver.updateDoc('users', email, { password: newPassword });
      res.json({ success: true, message: 'Password berhasil diatur ulang.' });
    } else {
      res.status(400).json({ success: false, message: 'Jawaban keamanan salah.' });
    }
  } catch (error: any) {
    console.error('Forgot password reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/change-password', authenticateToken, async (req: any, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userEmail = req.user?.email;

  if (!userEmail) {
    return res.status(401).json({ success: false, message: 'Sesi tidak valid.' });
  }
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
  }

  try {
    // Fetch user from DB
    let user: any = await dbDriver.getDoc('users', userEmail);
    if (!user || user.deleted) {
      const allUsers = await dbDriver.getDocs('users');
      user = allUsers.find((u: any) => !u.deleted && (u.email?.toLowerCase() === userEmail.toLowerCase() || u.phone === userEmail));
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Akun tidak ditemukan.' });
    }

    // Verify current password
    if (user.password !== currentPassword) {
      return res.status(401).json({ success: false, message: 'Password saat ini salah.' });
    }

    // Update password
    const docId = user.email || userEmail;
    await dbDriver.updateDoc('users', docId, { password: newPassword });

    res.json({ success: true, message: 'Password berhasil diperbarui.' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export const authRouter = router;
