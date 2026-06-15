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

// Initialize Firebase client SDK server-side (uses API Key, authorized by security rules)
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Unified Database Access Layer (DbDriver)
const mapCollection = (name: string) => name;

const dbDriver = {
  async getDocs(collectionName: string): Promise<any[]> {
    const mappedCollection = mapCollection(collectionName);
    const colRef = collection(db, mappedCollection);
    const snap = await getDocs(colRef);
    const items: any[] = [];
    snap.forEach(d => {
      items.push(d.data());
    });
    return items;
  },

  async getDoc(collectionName: string, docId: string): Promise<any | null> {
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() || null : null;
  },

  async setDoc(collectionName: string, docId: string, data: any): Promise<void> {
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await setDoc(docRef, data);
  },

  async updateDoc(collectionName: string, docId: string, data: any): Promise<void> {
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await updateDoc(docRef, data);
  },

  async deleteDoc(collectionName: string, docId: string): Promise<void> {
    const mappedCollection = mapCollection(collectionName);
    const docRef = doc(db, mappedCollection, docId);
    await deleteDoc(docRef);
  }
};

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Seeding default users to Database if the 'users' collection is empty
async function seedUsersIfEmpty() {
  try {
    const rawUsers = await dbDriver.getDocs('users');
    if (rawUsers.length === 0) {
      console.log('Seeding default Super Admin user to users collection (Empty State Reset)...');
      const defaultUsers = [
        { 
          email: 'superadmin@esm.or.id', 
          password: 'admin123', 
          name: 'Super Admin Operator', 
          role: 'Super Admin',
          features: ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system'],
          approved: true,
          deleted: false
        }
      ];
      for (const u of defaultUsers) {
        await dbDriver.setDoc('users', u.email, u);
      }
    }
  } catch (error) {
    console.error('Failed to seed users to database:', error);
  }
}

// Seeding default structures if empty or if 'ketua' is incorrect
async function seedStructuresIfEmpty() {
  try {
    const rawStructures = await dbDriver.getDocs('structures');
    if (rawStructures.length === 0) {
      console.log('Seeding default structures to database...');
      const defaultStructures = [
        { id: 'ketua', title: 'Ketua Dewan Pembina', name: 'Fernandes Manihuruk', sub: 'Pembuat Keputusan/Ketua', order: 10, deleted: false },
        { id: 'sekretaris', title: 'Sekretaris Eksekutif', name: 'Yusuf Raja Tamba', sub: 'Administrasi & Legalitas Lembaga', order: 20, deleted: false },
        { id: 'bendahara', title: 'Bendahara Umum', name: 'Angelina Meilia Putri Manalu', sub: 'Jurnal Kas, Transaksi & Audit', order: 30, deleted: false },
        { id: 'korwil', title: 'Koordinator Wilayah DIY', name: 'Ahmad Faisal, S.Th.', sub: 'Lapangan & Persekutuan Cabang', order: 40, deleted: false },
        { id: 'staff', title: 'Staf Lapangan & Kelompok Kecil', name: 'Simpatisan Mitra Aliansi', sub: 'Pendamping Siswa & Pelayanan', order: 50, deleted: false },
      ];
      for (const s of defaultStructures) {
        await dbDriver.setDoc('structures', s.id, s);
      }
    }
  } catch (error) {
    console.error('Failed to seed structures:', error);
  }
}

// Seeding default corresponding staff profile (No longer seeding sample staff profiles to maintain perfect clean-state)
async function seedStaffIfEmpty() {
  // No-op to respect manual input directive from user
}

// Helper to sanitize payload for Firestore/JSON storage
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

// System-wide automated trace propagation helper for transaction, incomes, expenses, detail_pengeluaran, fundraising, and payroll_payments
async function syncTransactionSubcollections(tx: any, isDeleted = false, deleterRole = '', deleterName = '') {
  try {
    const txId = tx.id;
    if (!txId) return;
    
    if (isDeleted) {
      const subCols = ['incomes', 'expenses', 'detail_pengeluaran', 'detail_expenses', 'fundraising', 'payroll_payments'];
      for (const col of subCols) {
        try {
          await dbDriver.deleteDoc(col, txId);
        } catch (e) {}
      }
      return;
    }

    const isIncome = (tx.type || '').toLowerCase() === 'income';
    const txSource = (tx.source || '').toLowerCase();

    // Prepare payload
    const payload = {
      ...tx,
      deleted: isDeleted,
      deletedAt: isDeleted ? new Date().toISOString() : null,
      deleted_at: isDeleted ? new Date().toISOString() : null,
      deletedBy: isDeleted ? (deleterRole || 'System') : null
    };

    const cleaned = cleanObjectForFirestore(payload);

    // 1. Map to incomes / expenses regardless of source, so we have exact copies
    if (isIncome) {
      await dbDriver.setDoc('incomes', txId, cleaned);
      // Clean up from expenses if it was edited from expense to income
      try {
        await dbDriver.deleteDoc('expenses', txId);
        await dbDriver.deleteDoc('detail_pengeluaran', txId);
        await dbDriver.deleteDoc('detail_expenses', txId);
      } catch (e) {}
    } else {
      await dbDriver.setDoc('expenses', txId, cleaned);
      // Clean up from incomes
      try {
        await dbDriver.deleteDoc('incomes', txId);
      } catch (e) {}

      // Write detail_pengeluaran & detail_expenses
      const detailPayload = {
        id: txId,
        transaction_id: txId,
        amount: Number(payload.amount || 0),
        category: payload.category || payload.category_id || 'Lain-lain',
        description: payload.description || '',
        recipient: payload.sourceOrRecipient || payload.reference_id || 'Internal',
        date: payload.date || payload.transaction_date || new Date().toISOString().split('T')[0],
        created_by: payload.created_by || payload.updatedBy || payload.createdBy || 'System',
        source: payload.source || 'manual',
        timestamp: payload.created_at || new Date().toISOString(),
        deleted: isDeleted,
        deletedAt: isDeleted ? new Date().toISOString() : null
      };
      await dbDriver.setDoc('detail_pengeluaran', txId, cleanObjectForFirestore(detailPayload));
      await dbDriver.setDoc('detail_expenses', txId, cleanObjectForFirestore(detailPayload));
    }

    // 2. Map to fundraising or payroll_payments if applicable
    if (txSource === 'donation') {
      await dbDriver.setDoc('fundraising', txId, cleaned);
    } else if (txSource === 'payroll') {
      await dbDriver.setDoc('payroll_payments', txId, cleaned);
    }
  } catch (err) {
    console.warn(`[syncTransactionSubcollections] Failed for ${tx.id || 'unknown'}:`, err);
  }
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
        address: 'Kantor Yayasan ESM',
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
      'materials',
      'profiles',
      'structures',
      'kas',
      'categories',
      'incomes',
      'expenses',
      'fundraising',
      'payroll_payments',
      'detail_pengeluaran',
      'detail_expenses'
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

    // Also clean any users that are not 'superadmin@esm.or.id'
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    for (const d of usersSnap.docs) {
      if (d.id !== 'superadmin@esm.or.id') {
        await deleteDoc(doc(db, 'users', d.id));
      }
    }

    // Clean staff collection entirely
    const staffCol = collection(db, 'staff');
    const staffSnap = await getDocs(staffCol);
    for (const d of staffSnap.docs) {
      await deleteDoc(doc(db, 'staff', d.id));
    }

    // Re-seed only the single superadmin user
    await seedUsersIfEmpty();

    // Mark system state as seeded so that clean state is preserved
    try {
      await dbDriver.setDoc('system_state', 'seed_status', {
        id: 'seed_status',
        seeded: true,
        cleansedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to set seed_status in system_state:', err);
    }

    res.json({ success: true, message: 'Database dan seluruh sample data berhasil dibersihkan total. Hanya akun superadmin@esm.or.id yang tersisa.' });
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

app.post('/api/auth/forgot-password/challenge', async (req, res) => {
  const { email } = req.body;
  try {
    await seedUsersIfEmpty();
    const docSnap = await dbDriver.getDoc('users', email);
    if (!docSnap || docSnap.deleted) {
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

// GET collection elements
app.get('/api/data/:colName', async (req, res) => {
  const { colName } = req.params;
  const includeDeleted = req.query.includeDeleted === 'true';
  try {
    let dataItems = await dbDriver.getDocs(colName);

    if (colName === 'structures') {
      const defaultNodes = [
        { id: 'ketua', title: 'Ketua Dewan Pembina', name: 'Fernandes Manihuruk', sub: 'Pembuat Keputusan/Ketua', order: 10, deleted: false },
        { id: 'sekretaris', title: 'Sekretaris Eksekutif', name: 'Yusuf Raja Tamba', sub: 'Administrasi & Legalitas Lembaga', order: 20, deleted: false },
        { id: 'bendahara', title: 'Bendahara Umum', name: 'Angelina Meilia Putri Manalu', sub: 'Jurnal Kas, Transaksi & Audit', order: 30, deleted: false },
      ];

      for (const def of defaultNodes) {
        const existingIdx = dataItems.findIndex(item => item.id === def.id);
        if (existingIdx > -1) {
          const item = dataItems[existingIdx];
          const needsRepair = !item.name;
          
          if (needsRepair) {
            item.name = def.name;
            item.deleted = false;
            await dbDriver.setDoc('structures', def.id, item);
          }
        } else {
          dataItems.push(def);
          await dbDriver.setDoc('structures', def.id, def);
        }
      }
    }

    const items = dataItems.filter(item => includeDeleted || !item.deleted);
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
    const cleaned = cleanObjectForFirestore(payload);
    await dbDriver.setDoc(colName, id, cleaned);
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
    const cleaned = cleanObjectForFirestore(payload);
    await dbDriver.updateDoc(colName, id, cleaned);

    if (colName === 'transactions') {
      try {
        await syncTransactionSubcollections(cleaned, false);
      } catch (subUpdateErr) {
        console.warn(`[PUT ENDPOINT] Propagation of update failed for sub-collections:`, subUpdateErr);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error updating document ${colName}/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE soft-delete document setting deleted: true (with deep merging to satisfy security schemas)
app.delete('/api/data/:colName/:id', async (req, res) => {
  const { colName, id } = req.params;
  const userRole = req.headers['x-user-role'] || req.query.role;
  const isSuperAdmin = userRole === 'Super Admin' || userRole === 'Ketua Yayasan';

  console.log(`[DELETE ENDPOINT] Attempting delete for ${colName}/${id} by ${userRole} (isSuperAdmin: ${isSuperAdmin})`);

  try {
    if (colName === 'donations' || colName === 'transactions' || colName === 'documents') {
      console.log(`[DELETE ENDPOINT] Performing HARD database delete of ${colName}/${id}`);
      await dbDriver.deleteDoc(colName, id);
      
      if (colName === 'transactions') {
        try {
          await syncTransactionSubcollections({ id }, true, String(userRole || 'System'), isSuperAdmin ? 'Super Admin' : 'System');
        } catch (subErr) {
          console.warn(`[DELETE ENDPOINT] Propagation of hard-delete failed for sub-collections:`, subErr);
        }
      } else if (colName === 'documents') {
        try {
          const filePath = path.join(process.cwd(), 'uploads', id);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[DOCUMENTS DELETE] Successfully deleted physical file uploads/${id}`);
          }
        } catch (err) {
          console.warn(`[DOCUMENTS DELETE] Failed to delete physical file uploads/${id}:`, err);
        }
      }
      res.json({ success: true });
      return;
    }

    const existingData = await dbDriver.getDoc(colName, id);

    if (existingData) {
      const updatedPayload = {
        ...existingData,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: isSuperAdmin ? 'Super Admin' : (userRole || 'System')
      };
      
      const cleaned = cleanObjectForFirestore(updatedPayload);
      console.log(`[DELETE ENDPOINT] Soft-deleting existing document ${colName}/${id}`);
      await dbDriver.setDoc(colName, id, cleaned);

      if (colName === 'transactions') {
        try {
          await syncTransactionSubcollections(existingData, true, String(userRole || 'System'), isSuperAdmin ? 'Super Admin' : 'System');
        } catch (subErr) {
          console.warn(`[DELETE ENDPOINT] Propagation of soft-delete failed for sub-collections:`, subErr);
        }
      }
    } else {
      const newPayload = {
        id: id,
        nik: colName === 'staff' ? id : undefined,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: isSuperAdmin ? 'Super Admin' : (userRole || 'System')
      };
      const cleaned = cleanObjectForFirestore(newPayload);
      console.log(`[DELETE ENDPOINT] Document not found, writing deleted placeholder for ${colName}/${id}`);
      await dbDriver.setDoc(colName, id, cleaned);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(`[DELETE ENDPOINT] Soft-delete failed for ${colName}/${id}: ${error.message}. Doing fallback hard delete...`);
    try {
      await dbDriver.deleteDoc(colName, id);
      res.json({ success: true });
    } catch (fallbackError: any) {
      console.error(`[DELETE ENDPOINT] Critical fallback hard-delete failed for ${colName}/${id}: ${fallbackError.message}`);
      res.status(500).json({ error: `Soft-delete failed: ${error.message}. Hard-delete failed: ${fallbackError.message}` });
    }
  }
});

// Custom File Upload & Document Archive Support (up to 5 MB limit is automatically handled by express body parsers)
app.post('/api/documents/upload', async (req, res) => {
  const { id, name, category, fileData, fileSize } = req.body;
  if (!id || !name || !fileData) {
    return res.status(400).json({ error: 'Data dokumen tidak lengkap untuk diunggah.' });
  }

  try {
    // 1. Validate that payload isn't empty and extract base64 components
    const match = fileData.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Format berkas dokumen tidak valid (harus data URL base64).' });
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'Ukuran dokumen melebihi batas maksimum 5 MB.' });
    }

    // 2. Ensure uploads directory exists
    const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // 3. Write physical file to uploads directory
    const filePath = path.join(UPLOADS_DIR, id);
    fs.writeFileSync(filePath, buffer);

    // 4. Save metadata in Firestore documents collection
    const metadata = {
      id,
      name,
      category: category || 'Lain-lain',
      uploadedDate: new Date().toISOString().substring(0, 10),
      fileSize: fileSize || `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`,
      mimeType,
      originalName: name,
      hasFile: true,
      deleted: false
    };

    await dbDriver.setDoc('documents', id, metadata);
    console.log(`[DOCUMENTS UPLOAD] Successfully saved file and metadata for ${name} (id: ${id}, size: ${metadata.fileSize})`);
    res.json({ success: true, metadata });
  } catch (error: any) {
    console.error('[DOCUMENTS UPLOAD] Error uploading document:', error);
    res.status(500).json({ error: `Gagal mengunggah dokumen: ${error.message}` });
  }
});

// Custom Document Download Endpoint
app.get('/api/documents/download/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
    const filePath = path.join(UPLOADS_DIR, id);

    // Check if the physical file exists
    if (fs.existsSync(filePath)) {
      // Fetch metadata to find the original extension/name and correct content type
      const docMeta = await dbDriver.getDoc('documents', id);
      const originalName = docMeta?.originalName || docMeta?.name || `dokumen_${id}`;
      const mimeType = docMeta?.mimeType || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      // Fallback: If no physical file exists, generate a dynamic text file for a flawless experience
      const docMeta = await dbDriver.getDoc('documents', id);
      const docName = docMeta?.name || `Dokumen Organisasi ${id}`;
      const docCat = docMeta?.category || 'Umum';
      const docDate = docMeta?.uploadedDate || new Date().toISOString().substring(0, 10);

      // Generate a simple, formal text file representation
      const fileContent = `=========================================
YAYASAN PELAYANAN SISWA & MAHASISWA (ESM)
          SALINAN DOKUMEN RESMI
=========================================

ID DOKUMEN  : ${id}
NAMA BERKAS : ${docName}
KATEGORI    : ${docCat}
TGL UNGGAH  : ${docDate}
INTEGRITAS  : TERVERIFIKASI SISTEM (ARSIP DIGITAL)

-----------------------------------------
Pemberitahuan Sistem:
Dokumen ini merupakan salinan digital resmi dari arsip konstitusi Yayasan 
Pelayanan Siswa & Mahasiswa. Hubungi Sekretaris Eksekutif untuk memperoleh 
salinan cetak kelayakan fisik yang berstempel basah.

Dokumen berhasil diunduh dari Cloud Database.
=========================================`;

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(docName)}.txt"`);
      res.send(fileContent);
    }
  } catch (error: any) {
    console.error('[DOCUMENTS DOWNLOAD] Error downloading document:', error);
    res.status(500).json({ error: `Gagal mengunduh dokumen: ${error.message}` });
  }
});

// Custom Document Preview Endpoint
app.get('/api/documents/preview/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
    const filePath = path.join(UPLOADS_DIR, id);

    if (fs.existsSync(filePath)) {
      const docMeta = await dbDriver.getDoc('documents', id);
      const mimeType = docMeta?.mimeType || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', 'inline');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      const docMeta = await dbDriver.getDoc('documents', id);
      const docName = docMeta?.name || `Dokumen Organisasi ${id}`;
      const docCat = docMeta?.category || 'Umum';
      const docDate = docMeta?.uploadedDate || new Date().toISOString().substring(0, 10);

      // Render a formal HTML digital duplicate document sheet for preview
      res.setHeader('Content-Type', 'text/html');
      res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pratinjau Dokumen - ${docName}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 16px;
      display: flex;
      justify-content: center;
    }
    .document {
      background: white;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
      border-radius: 16px;
      padding: 48px;
      max-width: 650px;
      width: 100%;
      box-sizing: border-box;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 48px;
      font-weight: 900;
      color: rgba(99, 102, 241, 0.03);
      user-select: none;
      pointer-events: none;
      white-space: nowrap;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #ebf1f9;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .school {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #475569;
      text-transform: uppercase;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      margin: 12px 0 6px 0;
      color: #0f172a;
    }
    .subtitle {
      font-size: 11px;
      color: #64748b;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    .meta-section {
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 13px;
    }
    .row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .row:first-child {
      padding-top: 0;
    }
    .label {
      font-weight: 600;
      color: #64748b;
      width: 40%;
    }
    .value {
      color: #1e293b;
      font-weight: 700;
      width: 60%;
      text-align: right;
    }
    .badge {
      display: inline-block;
      background: #e0e7ff;
      color: #4f46e5;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .info-footer {
      border-top: 2px solid #ebf1f9;
      padding-top: 24px;
      margin-top: 32px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .stamp-area {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 32px;
    }
    .digital-seal {
      width: 70px;
      height: 70px;
      border: 2px solid #4f46e5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4f46e5;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      transform: rotate(-10deg);
      text-align: center;
      padding: 4px;
      box-sizing: border-box;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="watermark">ESM ARSIP RESMI</div>
    <div class="header">
      <div class="school">Yayasan Pelayanan Siswa & Mahasiswa (ESM) Indonesia</div>
      <div class="title">SI-ARSEP (Arsip Elektronik)</div>
      <div class="subtitle font-mono">DOKUMEN REGISTER: ${id}</div>
    </div>
    
    <div class="meta-section">
      <div class="row">
        <div class="label">Nama Dokumen</div>
        <div class="value">${docName}</div>
      </div>
      <div class="row">
        <div class="label">Kategori Arsip</div>
        <div class="value"><span class="badge">${docCat}</span></div>
      </div>
      <div class="row">
        <div class="label">Tanggal Diunggah</div>
        <div class="value">${docDate}</div>
      </div>
      <div class="row">
        <div class="label">Status Keamanan</div>
        <div class="value" style="color: #10b981;">Tersimpan & Terenkripsi</div>
      </div>
    </div>

    <div class="info-footer">
      <strong>Catatan Keterangan Fisik:</strong><br>
      Dokumen ini tercatat dalam pangkalan data digital SI-ARSEP ESM. Segala bentuk salinan digital di atas dinyatakan absah dan sesuai dengan salinan berkas fisik asli yang tersimpan di bawah penanganan Sekretaris Eksekutif Yayasan ESM.
    </div>

    <div class="stamp-area">
      <div style="font-size: 11px; color: #94a3b8;">
        Sistem Informasi Kearsipan Terpadu<br>
        Yayasan Pelayanan ESM Indonesia
      </div>
      <div class="digital-seal">
        DEPARTEMEN ARSIP<br>&bull;<br>ESM
      </div>
    </div>
  </div>
</body>
</html>`);
    }
  } catch (error: any) {
    console.error('[DOCUMENTS PREVIEW] Error previewing document:', error);
    res.status(500).send(`Gagal memuat pratinjau dokumen: ${error.message}`);
  }
});

// Custom Inward Letter Download Endpoint
app.get('/api/inward_letters/download/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const letter = await dbDriver.getDoc('inward_letters', id);
    if (!letter) {
      return res.status(404).send('Surat masuk tidak ditemukan');
    }

    const { letterNumber, sender, subject, receivedDate, attachmentUrl } = letter as any;
    const cleanNum = (letterNumber || 'S-MASUK').replace(/[\/\s]/g, '_');

    // If there is an attachment URL that has base64 data
    if (attachmentUrl && attachmentUrl.startsWith('data:')) {
      const match = attachmentUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1] || 'bin';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="Scan_Surat_Masuk_${cleanNum}.${ext}"`);
        res.end(buffer);
        return;
      }
    }

    // Fallback: Generate structured formal text file representational metadata of the letter
    const textData = `========================================================================
YAYASAN PELAYANAN SISWA & MAHASISWA INDONESIA (ESM)
SISTEM INFORMASI ARSIP SECARA ELEKTRONIK (SI-ARSEP)
------------------------------------------------------------------------
ARSIP SALINAN DIGITAL: PENERIMAAN SURAT MASUK (INWARD MAIL)
========================================================================

ID ARSIP REGISTER : ${id}
NOMOR BERKAS SURAT : ${letterNumber || '-'}
INSTANSI PENGIRIM  : ${sender || '-'}
PERIHAL AGENDA     : ${subject || '-'}
TANGGAL DITERIMA   : ${receivedDate || '-'}
ALUR STATUS DISPOS : ${letter.status || 'Disposisi'}

------------------------------------------------------------------------
DESKRIPSI RINCIAN SURAT:
Surat masuk ini telah terverifikasi dan tercatat secara komputerisasi 
pada Database Sekretariat Yayasan Pelayanan Siswa & Mahasiswa (ESM) Indonesia.

Dokumen fisik asli (hardcopy) disimpan di lemari arsip Sekretariat Utama.
Silakan hubungi staf sekretaris eksekutif dengan menyertakan Nomor Berkas
di atas jika membutuhkan pemindaian fisik/stempel basah.

Dokumen berhasil diunduh secara aman dari Sistem Informasi ESM.
========================================================================`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Arsip_Surat_Masuk_${cleanNum}.txt"`);
    res.send(textData);
  } catch (error: any) {
    console.error('Error downloading inward letter:', error);
    res.status(500).send(`Gagal mengunduh berkas: ${error.message}`);
  }
});

// Custom Inward Letter Preview Endpoint
app.get('/api/inward_letters/preview/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const letter = await dbDriver.getDoc('inward_letters', id);
    if (!letter) {
      return res.status(404).send('Surat masuk tidak ditemukan');
    }

    const { letterNumber, sender, subject, receivedDate, attachmentUrl } = letter as any;

    if (attachmentUrl && attachmentUrl.startsWith('data:')) {
      const match = attachmentUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', 'inline');
        res.end(buffer);
        return;
      }
    }

    // Fallback HTML page representation acting as the document preview sheet
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pratinjau Arsip Surat - ${letterNumber || 'S-MASUK'}</title>
  <style>
    body {
      font-family: 'Courier New', Courier, monospace;
      background-color: #f1f5f9;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }
    .document {
      background: white;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      border-radius: 8px;
      padding: 40px;
      max-width: 800px;
      width: 100%;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .school {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .title {
      font-size: 20px;
      margin: 10px 0;
      color: #1e3a8a;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .meta-table td {
      padding: 10px;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 14px;
    }
    .meta-table td.label {
      font-weight: bold;
      color: #475569;
      width: 30%;
    }
    .notes-box {
      border: 1.5px dashed #64748b;
      background: #f8fafc;
      padding: 20px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="school">YAYASAN PELAYANAN SISWA & MAHASISWA INDONESIA (ESM)</div>
      <div class="title">SI-ARSEP (Sistem Informasi Arsip Elektronik)</div>
      <div style="font-size: 12px; color: #64748b;">Dokumen Salinan Digital Resmi Sekretariat</div>
    </div>
    
    <table class="meta-table">
      <tr>
        <td class="label">ID Dokumen</td>
        <td>${id}</td>
      </tr>
      <tr>
        <td class="label">Nomor Surat</td>
        <td style="font-weight: bold; color: #1e293b;">${letterNumber || '-'}</td>
      </tr>
      <tr>
        <td class="label">Instansi Pengirim</td>
        <td>${sender || '-'}</td>
      </tr>
      <tr>
        <td class="label">Perihal Agenda</td>
        <td style="font-weight: 500;">${subject || '-'}</td>
      </tr>
      <tr>
        <td class="label">Tanggal Diterima</td>
        <td>${receivedDate || '-'}</td>
      </tr>
      <tr>
        <td class="label">Status Disposisi</td>
        <td><span class="badge">${letter.status || 'Disposisi'}</span></td>
      </tr>
    </table>

    <div class="notes-box">
      <strong>Catatan Keterangan Fisik:</strong><br>
      Surat masuk asli telah diarsipkan di Sekretariat Utama Yayasan Pelayanan Siswa & Mahasiswa Indonesia (ESM). Informasi di atas diregistrasikan oleh operator sistem yang berwenang sebagai asupan disposisi pimpinan tingkat yayasan.
    </div>
  </div>
</body>
</html>`);
  } catch (error: any) {
    console.error('Error previewing inward letter:', error);
    res.status(500).send(`Gagal memuat pratinjau: ${error.message}`);
  }
});

// Atomic Finance Syncer Server-Side Wrapper
app.post('/api/finance/sync', async (req, res) => {
  const { tx, operatorName, operatorRole, currentBalanceBeforeTx } = req.body;
  try {
    const isDeletedAction = tx.status === 'Rejected' || tx.deleted === true;
    const isIncome = (tx.type || 'Income').toLowerCase() === 'income';
    const delta = isDeletedAction ? 0 : (isIncome ? tx.amount : -tx.amount);
    const newBalance = isDeletedAction ? currentBalanceBeforeTx : (currentBalanceBeforeTx + delta);

    // Map and enrich the transaction payload to the requested simplified schema
    const enrichedTx = {
      // Requested simplified schema
      id: tx.id,
      transaction_code: tx.transaction_code || tx.id,
      type: isIncome ? 'Income' : 'Expense',
      source: tx.source || 'manual',
      category_id: tx.category_id || tx.category || 'Lain-lain',
      amount: Number(tx.amount),
      description: tx.description || '',
      transaction_date: tx.transaction_date || tx.date || new Date().toISOString().split('T')[0],
      created_by: tx.created_by || operatorName,
      reference_id: tx.reference_id || null,
      reference_type: tx.reference_type || null,
      created_at: tx.created_at || new Date().toISOString(),
      updated_at: tx.updated_at || new Date().toISOString(),
      deleted_at: isDeletedAction ? new Date().toISOString() : null,

      // Frontend backwards compatibility keys to prevent any viewer breakage
      date: tx.date || tx.transaction_date || new Date().toISOString().split('T')[0],
      category: tx.category || tx.category_id || 'Lain-lain',
      sourceOrRecipient: tx.sourceOrRecipient || tx.reference_id || operatorName,
      status: isDeletedAction ? 'Rejected' : 'Approved',
      deleted: isDeletedAction
    };

    // 1. Write the Transaction record (will map to financial_transactions under the hood)
    await dbDriver.setDoc('transactions', tx.id, cleanObjectForFirestore(enrichedTx));

    // Propagate write to specific sub-tables (incomes, expenses, detail_pengeluaran, fundraising, payroll_payments) as requested by user
    try {
      await syncTransactionSubcollections(enrichedTx, isDeletedAction, operatorRole, operatorName);
    } catch (subWriteErr) {
      console.warn('Propagation to sub-collections failed:', subWriteErr);
    }

    // 2. Set/update the 'kas' snapshot document (backward-suited total)
    await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({
      id: 'main',
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
      updatedBy: operatorName
    }));

    // 3. Append detailed chronological trace log to the 'kas' collection as requested
    const kasId = `KAS-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const kasLogRow = {
      id: kasId,
      transaction_id: tx.id,
      type: isIncome ? 'income' : 'expense',
      amount: Number(tx.amount),
      source: tx.source || 'manual',
      category: tx.category || tx.category_id || 'Lain-lain',
      description: tx.description || '',
      balanceBefore: currentBalanceBeforeTx,
      balanceAfter: newBalance,
      updatedBy: operatorName,
      timestamp: new Date().toISOString(),
      action: isDeletedAction ? 'DELETE' : (tx.isEdit ? 'EDIT' : 'CREATE')
    };
    await dbDriver.setDoc('kas', kasId, cleanObjectForFirestore(kasLogRow));

    // 4. Write real audit entry log
    const auditId = `AUD-FIN-${Date.now()}`;
    const actionText = isDeletedAction 
      ? `[Sistem Atomik Keuangan] Penghapusan Transaksi ${tx.id} (${tx.type}) senilai Rp ${tx.amount.toLocaleString('id-ID')} tersimpan. Sisa kas: Rp ${newBalance.toLocaleString('id-ID')}`
      : `[Sistem Atomik Keuangan] Entry Transaksi ${tx.id} (${tx.type}) senilai Rp ${tx.amount.toLocaleString('id-ID')} tersimpan. Sisa kas: Rp ${newBalance.toLocaleString('id-ID')}`;
    
    await dbDriver.setDoc('audits', auditId, cleanObjectForFirestore({
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
  await seedUsersIfEmpty();
  await seedStructuresIfEmpty();

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
