import express from 'express';
import path from 'path';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

// Read Firebase config safely from JSON file
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase client SDK server-side
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Seeding default users to Firestore if the 'users' collection is empty
async function seedUsersIfEmpty() {
  try {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log('Seeding default users to Firestore users collection...');
      const defaultUsers = [
        { 
          email: 'superadmin@esm.or.id', 
          password: 'admin123', 
          name: 'Super Admin Operator', 
          role: 'Super Admin',
          features: ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system'],
          deleted: false
        },
        { 
          email: 'ketua@esm.or.id', 
          password: 'ketua123', 
          name: 'Ketua Yayasan Operator', 
          role: 'Ketua Yayasan',
          features: ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system'],
          deleted: false
        },
        { 
          email: 'bendahara@esm.or.id', 
          password: 'bendahara123', 
          name: 'Bendahara Operator', 
          role: 'Bendahara',
          features: ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals'],
          deleted: false
        },
        { 
          email: 'sekretaris@esm.or.id', 
          password: 'sekretaris123', 
          name: 'Sekretaris Operator', 
          role: 'Sekretaris',
          features: ['dashboard', 'members', 'small_groups', 'letters', 'system'],
          deleted: false
        },
        { 
          email: 'staff@esm.or.id', 
          password: 'staff123', 
          name: 'Staff Operator', 
          role: 'Staff',
          features: ['dashboard', 'members', 'small_groups'],
          deleted: false
        }
      ];
      for (const u of defaultUsers) {
        await setDoc(doc(db, 'users', u.email), u);
      }
    }
  } catch (error) {
    console.error('Failed to seed users to Firestore:', error);
  }
}

// Seeding default corresponding staff profile matching the seeded users (except superadmin)
async function seedStaffIfEmpty() {
  try {
    const colRef = collection(db, 'staff');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log('Seeding default staff corresponding to seeded users to Firestore...');
      const defaultStaff = [
        {
          nik: 'NIK-K100',
          name: 'Ketua Yayasan Operator',
          phone: '08122334455',
          email: 'ketua@esm.or.id',
          address: 'Jl. Diponegoro No. 12, Jakarta',
          position: 'Ketua Yayasan',
          division: 'Direksi Eksekutif',
          status: 'Tetap',
          joinedDate: '2020-01-01',
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
          deleted: false
        },
        {
          nik: 'NIK-B200',
          name: 'Bendahara Operator',
          phone: '08122334466',
          email: 'bendahara@esm.or.id',
          address: 'Jl. Merdeka No. 45, Bandung',
          position: 'Bendahara Yayasan',
          division: 'Keuangan',
          status: 'Tetap',
          joinedDate: '2021-06-01',
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
          deleted: false
        },
        {
          nik: 'NIK-S300',
          name: 'Sekretaris Operator',
          phone: '081122883399',
          email: 'sekretaris@esm.or.id',
          address: 'Jl. Terusan Babakan Jeruk I No. 4, Bandung',
          position: 'Sekretaris Yayasan',
          division: 'Sekretariat',
          status: 'Tetap',
          joinedDate: '2022-07-15',
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
          deleted: false
        },
        {
          nik: 'NIK-1004',
          name: 'Staff Operator',
          phone: '081234567890',
          email: 'staff@esm.or.id',
          address: 'Jl. Diponegoro No. 12, Jakarta Pusat',
          position: 'Staff Pelaksana Lapangan',
          division: 'Pelayanan Wilayah',
          status: 'Tetap',
          joinedDate: '2025-01-10',
          salaryBase: 4200000,
          allowancePosition: 300000,
          allowanceHousing: 300000,
          allowanceTransport: 300000,
          allowanceComm: 200000,
          bonus: 0,
          thr: 0,
          bpjsAllowance: 200000,
          taxDeduction: 80000,
          bpjsDeduction: 80000,
          kasbonDeduction: 0,
          otherDeduction: 0,
          paidAmount: 5120000,
          deleted: false
        }
      ];
      for (const s of defaultStaff) {
        await setDoc(doc(db, 'staff', s.nik), s);
      }
    }
  } catch (error) {
    console.error('Failed to seed staff to Firestore:', error);
  }
}

// Helper to sanitize payload for Firestore
function cleanObjectForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForFirestore(item));
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanObjectForFirestore(val);
      }
    });
    return cleaned;
  }
  return obj;
}

app.post('/api/auth/register', async (req, res) => {
  const { name, phone, password, role } = req.body;
  try {
    await seedUsersIfEmpty();
    await seedStaffIfEmpty();

    if (!name || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'Harap lengkapi seluruh formulir registrasi.' });
    }

    // Normalized phone
    const cleanPhone = phone.trim();
    const docId = `${cleanPhone}@esm.or.id`; // standard document ID as email for full compatibility

    // Check if phone or email already registered
    const docRef = doc(db, 'users', docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
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

    await setDoc(docRef, newUser);

    // Only map/create a staff profile entry if they register as a 'Staff'
    if (role === 'Staff') {
      const staffNik = `NIK-REG-${Date.now().toString().slice(-4)}`;
      const newStaff = {
        nik: staffNik,
        name: name.trim(),
        phone: cleanPhone,
        email: docId,
        address: 'Kantor Yayasan ESM',
        position: 'Staf Pelaksana',
        division: 'Umum',
        status: 'Kontrak',
        joinedDate: new Date().toISOString().split('T')[0],
        salaryBase: 0, // "yang ga ada gajinya dikosongin aja.."
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
      await setDoc(doc(db, 'staff', staffNik), cleanObjectForFirestore(newStaff));
    }

    // Write audit log
    const auditId = `AUD-REG-${Date.now()}`;
    await setDoc(doc(db, 'audits', auditId), cleanObjectForFirestore({
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

// GET REST cleanse endpoint
app.post('/api/system/cleanse', async (req, res) => {
  try {
    const collectionsToClean = [
      'members',
      'small_groups',
      'transactions',
      'partners',
      'salaries',
      'inward_letters',
      'outward_letters',
      'approvals',
      'audits',
      'donations',
      'prayer_requests',
      'member_notes',
      'follow_ups',
      'meeting_logs',
      'materials'
    ];

    for (const colName of collectionsToClean) {
      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, colName, d.id));
        }
      } catch (colErr) {
        console.warn(`Err cleansing collection ${colName}:`, colErr);
      }
    }

    // Also clean any users that are not the standard pre-seeded ones
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    const preservedEmails = [
      'superadmin@esm.or.id',
      'ketua@esm.or.id',
      'bendahara@esm.or.id',
      'sekretaris@esm.or.id',
      'staff@esm.or.id'
    ];
    for (const d of usersSnap.docs) {
      if (!preservedEmails.includes(d.id)) {
        await deleteDoc(doc(db, 'users', d.id));
      }
    }

    // Also clean staff collection and reset to the clean seeded staff matching seeded users
    try {
      const staffCol = collection(db, 'staff');
      const staffSnap = await getDocs(staffCol);
      for (const d of staffSnap.docs) {
        await deleteDoc(doc(db, 'staff', d.id));
      }
    } catch (stfErr) {
      console.warn('Err cleansing staff:', stfErr);
    }

    // Re-seed default users and staff
    await seedUsersIfEmpty();
    await seedStaffIfEmpty();

    res.json({ success: true, message: 'Database berhasil dibersihkan (cleansing) ke kondisi awal yang bersih.' });
  } catch (error: any) {
    console.error('Cleansing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// REST Api Endpoints
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    await seedUsersIfEmpty();
    await seedStaffIfEmpty();

    // 1. Try to fetch direct
    const docRef = doc(db, 'users', email);
    let docSnap = await getDoc(docRef);
    let user: any = null;

    if (docSnap.exists() && !docSnap.data().deleted) {
      user = docSnap.data();
    } else {
      // 2. Query all users (fallback for phone number comparison or lowercased email)
      const colRef = collection(db, 'users');
      const snap = await getDocs(colRef);
      snap.forEach(d => {
        const u = d.data();
        if (!u.deleted) {
          if (u.phone === email || u.email?.toLowerCase() === email.toLowerCase()) {
            user = u;
          }
        }
      });
    }

    if (user) {
      if (user.password === password) {
        // Enforce approval check except for pre-seeded users that may not have 'approved' attribute yet
        if (user.approved === false) {
          return res.status(403).json({ 
            success: false, 
            message: 'Koneksi Ditolak: Akun Anda dalam status menunggu persetujuan dari Ketua Yayasan atau Super Admin.' 
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

app.post('/api/auth/forgot-password/challenge', async (req, res) => {
  const { email } = req.body;
  try {
    await seedUsersIfEmpty();
    const docRef = doc(db, 'users', email);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().deleted) {
      return res.status(404).json({ success: false, message: 'Alamat email tidak terdaftar.' });
    }
    res.json({
      success: true,
      question: 'Siapa nama Ketua Dewan Pembina Yayasan ESM Indonesia? (Petunjuk: Terdapat di struktur organisasi)'
    });
  } catch (error: any) {
    console.error('Forgot password challenge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/forgot-password/reset', async (req, res) => {
  const { email, answer, newPassword } = req.body;
  try {
    const docRef = doc(db, 'users', email);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().deleted) {
      return res.status(404).json({ success: false, message: 'Alamat email tidak terdaftar.' });
    }
    
    const cleanAnswer = (answer || '').toLowerCase().replace(/[^a-z]/g, '');
    const isCorrect = cleanAnswer.includes('josephsinaga') || cleanAnswer.includes('sinaga') || cleanAnswer.includes('joseph');
    
    if (isCorrect) {
      await updateDoc(docRef, { password: newPassword });
      res.json({ success: true, message: 'Password berhasil diatur ulang.' });
    } else {
      res.status(400).json({ success: false, message: 'Jawaban keamanan salah.' });
    }
  } catch (error: any) {
    console.error('Forgot password reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET collection elements
app.get('/api/data/:colName', async (req, res) => {
  const { colName } = req.params;
  const includeDeleted = req.query.includeDeleted === 'true';
  try {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    const items: any[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (includeDeleted || !data.deleted) {
        items.push(data);
      }
    });
    res.json(items);
  } catch (error: any) {
    console.error(`Error fetching collection ${colName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST create/set document
app.post('/api/data/:colName/:id', async (req, res) => {
  const { colName, id } = req.params;
  const payload = req.body;
  try {
    const docRef = doc(db, colName, id);
    const cleaned = cleanObjectForFirestore(payload);
    await setDoc(docRef, cleaned);
    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error writing document ${colName}/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update document
app.put('/api/data/:colName/:id', async (req, res) => {
  const { colName, id } = req.params;
  const payload = req.body;
  try {
    const docRef = doc(db, colName, id);
    const cleaned = cleanObjectForFirestore(payload);
    await updateDoc(docRef, cleaned);
    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating document ${colName}/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE soft-delete document setting deleted: true (with getDoc/setDoc merging to satisfy strict security schemas)
app.delete('/api/data/:colName/:id', async (req, res) => {
  const { colName, id } = req.params;
  const userRole = req.headers['x-user-role'] || req.query.role;
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Ketua Yayasan';

  console.log(`[DELETE ENDPOINT] Attempting delete for ${colName}/${id} by ${userRole} (isSuperAdmin: ${isSuperAdmin})`);

  try {
    const docRef = doc(db, colName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const updatedPayload = {
        ...existingData,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: isSuperAdmin ? 'Super Admin' : (userRole || 'System')
      };
      
      const cleaned = cleanObjectForFirestore(updatedPayload);
      console.log(`[DELETE ENDPOINT] Soft-deleting existing document ${colName}/${id} with payload keys:`, Object.keys(cleaned));
      await setDoc(docRef, cleaned);
    } else {
      const newPayload = {
        id: id,
        nik: colName === 'staff' ? id : undefined, // Nik is required key for validation under isValidStaff
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: isSuperAdmin ? 'Super Admin' : (userRole || 'System')
      };
      const cleaned = cleanObjectForFirestore(newPayload);
      console.log(`[DELETE ENDPOINT] Document ${colName}/${id} not found, writing deleted placeholder with keys:`, Object.keys(cleaned));
      await setDoc(docRef, cleaned);
    }
    console.log(`[DELETE ENDPOINT] Successfully completed soft-delete for ${colName}/${id}`);
    res.json({ success: true });
  } catch (error: any) {
    const fs = require('fs');
    const logMsg = `[${new Date().toISOString()}] DELETE FAILED for ${colName}/${id} by ${userRole}. ERROR: ${error.message}\n`;
    fs.appendFileSync('delete_errors.log', logMsg);
    console.warn(`[DELETE ENDPOINT] Soft-delete failed for ${colName}/${id}: ${error.message}. Trying fallback hard delete...`);
    try {
      await deleteDoc(doc(db, colName, id));
      console.log(`[DELETE ENDPOINT] Successfully completed fallback hard-delete for ${colName}/${id}`);
      res.json({ success: true });
    } catch (fallbackError: any) {
      const fallbackLogMsg = `[${new Date().toISOString()}] FALLBACK HARD-DELETE FAILED for ${colName}/${id} by ${userRole}. ERROR: ${fallbackError.message}\n`;
      fs.appendFileSync('delete_errors.log', fallbackLogMsg);
      console.error(`[DELETE ENDPOINT] Critical failure. Fallback hard-delete failed for ${colName}/${id}: ${fallbackError.message}`);
      res.status(500).json({ error: `Soft-delete failed: ${error.message}. Hard-delete failed: ${fallbackError.message}` });
    }
  }
});

// Atomic Finance Syncer Server-Side Wrapper
app.post('/api/finance/sync', async (req, res) => {
  const { tx, operatorName, operatorRole, currentBalanceBeforeTx } = req.body;
  try {
    const isApproved = tx.status === 'Approved';
    const delta = isApproved ? (tx.type === 'Income' ? tx.amount : -tx.amount) : 0;
    const newBalance = currentBalanceBeforeTx + delta;

    // 1. Write the Transaction record
    await setDoc(doc(db, 'transactions', tx.id), cleanObjectForFirestore({
      ...tx,
      createdBy: operatorName,
      createdAt: new Date().toISOString(),
      deleted: false
    }));

    // 2. Set/update the 'kas' snapshot document
    await setDoc(doc(db, 'kas', 'main'), cleanObjectForFirestore({
      id: 'main',
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
      updatedBy: operatorName
    }));

    // 3. Write real audit entry log
    const auditId = `AUD-FIN-${Date.now()}`;
    const actionText = `[Sistem Atomik Keuangan] Entry Transaksi ${tx.id} (${tx.type}) senilai Rp ${tx.amount.toLocaleString('id-ID')} tersimpan (${tx.status}). Sisa kas: Rp ${newBalance.toLocaleString('id-ID')}`;
    
    await setDoc(doc(db, 'audits', auditId), cleanObjectForFirestore({
      id: auditId,
      userName: operatorName,
      userRole: operatorRole,
      action: actionText,
      module: 'Keuangan & Jurnal',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      beforeValue: `Rp ${currentBalanceBeforeTx.toLocaleString('id-ID')}`,
      afterValue: `Rp ${newBalance.toLocaleString('id-ID')}`,
      createdBy: operatorName,
      createdAt: new Date().toISOString(),
      deleted: false
    }));

    res.json({ success: true, newBalance });
  } catch (error: any) {
    console.error('Error syncing finance data server API:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mount Vite middleware for dev or standard express visual static server for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting and listening on port http://localhost:${PORT}`);
  });
}

startServer();
