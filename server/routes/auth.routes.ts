import { Router } from 'express';
import { dbDriver, cleanObjectForFirestore } from '../db/driver';
import { seedUsersIfEmpty } from '../services/seed.service';

const router = Router();

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
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

        return res.json({
          success: true,
          user: {
            email: user.email || user.phone,
            name: user.name,
            role: user.role,
            features: user.features || [],
            approved: user.approved !== false
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

router.post('/forgot-password/challenge', async (req, res) => {
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

router.post('/forgot-password/reset', async (req, res) => {
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

export default router;
