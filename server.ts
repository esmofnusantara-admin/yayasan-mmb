import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Pool } from 'pg';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DB_PROVIDER = (process.env.DB_PROVIDER || 'firebase').toLowerCase();
const JSON_DB_PATH = process.env.JSON_DB_PATH || path.join(process.cwd(), 'data', 'local-db.json');

type PlainObject = Record<string, any>;

interface DbAdapter {
  list(colName: string): Promise<PlainObject[]>;
  get(colName: string, id: string): Promise<PlainObject | null>;
  set(colName: string, id: string, value: PlainObject): Promise<void>;
  update(colName: string, id: string, patch: PlainObject): Promise<void>;
  delete(colName: string, id: string): Promise<void>;
}

interface JsonDbData {
  collections: Record<string, Record<string, PlainObject>>;
}

function ensureJsonDbExists() {
  const dir = path.dirname(JSON_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    const initial: JsonDbData = { collections: {} };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readJsonDb(): JsonDbData {
  ensureJsonDbExists();
  const raw = fs.readFileSync(JSON_DB_PATH, 'utf8');
  const parsed = JSON.parse(raw) as JsonDbData;
  if (!parsed.collections || typeof parsed.collections !== 'object') {
    return { collections: {} };
  }
  return parsed;
}

function writeJsonDb(data: JsonDbData) {
  ensureJsonDbExists();
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function createJsonAdapter(): DbAdapter {
  return {
    async list(colName: string) {
      const dbData = readJsonDb();
      const col = dbData.collections[colName] || {};
      return Object.values(col);
    },
    async get(colName: string, id: string) {
      const dbData = readJsonDb();
      const col = dbData.collections[colName] || {};
      return col[id] || null;
    },
    async set(colName: string, id: string, value: PlainObject) {
      const dbData = readJsonDb();
      if (!dbData.collections[colName]) dbData.collections[colName] = {};
      dbData.collections[colName][id] = value;
      writeJsonDb(dbData);
    },
    async update(colName: string, id: string, patch: PlainObject) {
      const dbData = readJsonDb();
      const col = dbData.collections[colName] || {};
      if (!col[id]) {
        throw new Error(`Document not found: ${colName}/${id}`);
      }
      col[id] = { ...col[id], ...patch };
      dbData.collections[colName] = col;
      writeJsonDb(dbData);
    },
    async delete(colName: string, id: string) {
      const dbData = readJsonDb();
      const col = dbData.collections[colName] || {};
      delete col[id];
      dbData.collections[colName] = col;
      writeJsonDb(dbData);
    },
  };
}

function createFirebaseAdapter(): DbAdapter {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

  return {
    async list(colName: string) {
      const snap = await getDocs(collection(db, colName));
      const result: PlainObject[] = [];
      snap.forEach((docSnap) => result.push(docSnap.data() as PlainObject));
      return result;
    },
    async get(colName: string, id: string) {
      const ref = doc(db, colName, id);
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as PlainObject) : null;
    },
    async set(colName: string, id: string, value: PlainObject) {
      await setDoc(doc(db, colName, id), value);
    },
    async update(colName: string, id: string, patch: PlainObject) {
      await updateDoc(doc(db, colName, id), patch);
    },
    async delete(colName: string, id: string) {
      await deleteDoc(doc(db, colName, id));
    },
  };
}

function createPostgresAdapter(): DbAdapter {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Ensure the generic kv_store table exists on first use
  let initialized = false;
  async function ensureSchema() {
    if (initialized) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kv_store (
        collection TEXT NOT NULL,
        id         TEXT NOT NULL,
        data       JSONB NOT NULL DEFAULT '{}',
        PRIMARY KEY (collection, id)
      )
    `);
    initialized = true;
  }

  return {
    async list(colName: string) {
      await ensureSchema();
      const res = await pool.query(
        'SELECT data FROM kv_store WHERE collection = $1',
        [colName]
      );
      return res.rows.map((r) => r.data as PlainObject);
    },
    async get(colName: string, id: string) {
      await ensureSchema();
      const res = await pool.query(
        'SELECT data FROM kv_store WHERE collection = $1 AND id = $2',
        [colName, id]
      );
      return res.rows.length > 0 ? (res.rows[0].data as PlainObject) : null;
    },
    async set(colName: string, id: string, value: PlainObject) {
      await ensureSchema();
      await pool.query(
        `INSERT INTO kv_store (collection, id, data)
         VALUES ($1, $2, $3)
         ON CONFLICT (collection, id) DO UPDATE SET data = $3`,
        [colName, id, JSON.stringify(value)]
      );
    },
    async update(colName: string, id: string, patch: PlainObject) {
      await ensureSchema();
      const res = await pool.query(
        'SELECT data FROM kv_store WHERE collection = $1 AND id = $2',
        [colName, id]
      );
      if (res.rows.length === 0) {
        throw new Error(`Document not found: ${colName}/${id}`);
      }
      const merged = { ...res.rows[0].data, ...patch };
      await pool.query(
        'UPDATE kv_store SET data = $3 WHERE collection = $1 AND id = $2',
        [colName, id, JSON.stringify(merged)]
      );
    },
    async delete(colName: string, id: string) {
      await ensureSchema();
      await pool.query(
        'DELETE FROM kv_store WHERE collection = $1 AND id = $2',
        [colName, id]
      );
    },
  };
}

function resolveAdapter(): DbAdapter {
  if (DB_PROVIDER === 'json') return createJsonAdapter();
  if (DB_PROVIDER === 'postgres') return createPostgresAdapter();
  return createFirebaseAdapter();
}

const dbAdapter: DbAdapter = resolveAdapter();
console.log(`[DB] Using provider: ${DB_PROVIDER}`);

const app = express();
app.use(express.json());

// Seeding default users to Firestore if the 'users' collection is empty
async function seedUsersIfEmpty() {
  try {
    const users = await dbAdapter.list('users');
    if (users.length === 0) {
      console.log('Seeding default users to users collection...');
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
        await dbAdapter.set('users', u.email, u);
      }
    }
  } catch (error) {
    console.error('Failed to seed users:', error);
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
    const existingUser = await dbAdapter.get('users', docId);
    if (existingUser) {
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

    await dbAdapter.set('users', docId, newUser);

    // Write audit log
    const auditId = `AUD-REG-${Date.now()}`;
    await dbAdapter.set('audits', auditId, cleanObjectForFirestore({
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
    let user: any = null;
    const directUser = await dbAdapter.get('users', email);

    if (directUser && !directUser.deleted) {
      user = directUser;
    } else {
      // 2. Query all users (fallback for phone number comparison or lowercased email)
      const users = await dbAdapter.list('users');
      users.forEach((u) => {
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
    const user = await dbAdapter.get('users', email);
    if (!user || user.deleted) {
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
    const user = await dbAdapter.get('users', email);
    if (!user || user.deleted) {
      return res.status(404).json({ success: false, message: 'Alamat email tidak terdaftar.' });
    }
    
    const cleanAnswer = (answer || '').toLowerCase().replace(/[^a-z]/g, '');
    const isCorrect = cleanAnswer.includes('josephsinaga') || cleanAnswer.includes('sinaga') || cleanAnswer.includes('joseph');
    
    if (isCorrect) {
      await dbAdapter.update('users', email, { password: newPassword });
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
    const docs = await dbAdapter.list(colName);
    const items = docs.filter((data) => !data.deleted);
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
    await dbAdapter.set(colName, id, cleaned);
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
    await dbAdapter.update(colName, id, cleaned);
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
    await dbAdapter.update(colName, id, { deleted: true, deletedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (error: any) {
    try {
      // fallback delete for non-soft records if needed
      await dbAdapter.delete(colName, id);
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
    await dbAdapter.set('transactions', tx.id, cleanObjectForFirestore({
      ...tx,
      createdBy: operatorName,
      createdAt: new Date().toISOString(),
      deleted: false
    }));

    // 2. Set/update the 'kas' snapshot document
    await dbAdapter.set('kas', 'main', cleanObjectForFirestore({
      id: 'main',
      balance: newBalance,
      lastUpdated: new Date().toISOString(),
      updatedBy: operatorName
    }));

    // 3. Write real audit entry log
    const auditId = `AUD-FIN-${Date.now()}`;
    const actionText = `[Sistem Atomik Keuangan] Entry Transaksi ${tx.id} (${tx.type}) senilai Rp ${tx.amount.toLocaleString('id-ID')} tersimpan (${tx.status}). Sisa kas: Rp ${newBalance.toLocaleString('id-ID')}`;
    
    await dbAdapter.set('audits', auditId, cleanObjectForFirestore({
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
