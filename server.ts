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

    // Write audit log
    const auditId = `AUD-REG-${Date.now()}`;
    await setDoc(doc(db, 'audits', auditId), cleanObjectForFirestore({
      id: auditId,
      userName: name,
      userRole: role,
      action: `[Registrasi] Operator baru ${name} mendaftarkan diri dengan no telepon ${cleanPhone} sebagai calon ${role}. (Menunggu persetujuan)`,
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

// REST Api Endpoints
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    await seedUsersIfEmpty();

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
  try {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    const items: any[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.deleted) {
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

// DELETE soft-delete document setting deleted: true
app.delete('/api/data/:colName/:id', async (req, res) => {
  const { colName, id } = req.params;
  try {
    const docRef = doc(db, colName, id);
    await updateDoc(docRef, { deleted: true, deletedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (error: any) {
    try {
      // fallback delete for non-soft records if needed
      await deleteDoc(doc(db, colName, id));
      res.json({ success: true });
    } catch (fallbackError: any) {
      console.error(`Error hard/soft deleting document ${colName}/${id}:`, fallbackError);
      res.status(500).json({ error: fallbackError.message });
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
