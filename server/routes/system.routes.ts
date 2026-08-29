import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { seedUsersIfEmpty, seedStructuresIfEmpty, seedAllInitialData } from '../services/seed.service';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore } from '../services/transaction-sync.service';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Profile Lembaga
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profiles = await dbDriver.getDocs('profiles');
    const profile = profiles.find((p: any) => p.id === 'PROF-01') || null;
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan' && role !== 'Sekretaris') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const old = await dbDriver.getDoc('profiles', 'PROF-01');
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id: 'PROF-01', updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('profiles', 'PROF-01', updated);
    await writeAuditLog({ userName, userRole, action: 'Update Profil Lembaga', module: 'Sistem', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, profile: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Struktur Organisasi
// ─────────────────────────────────────────────────────────────────────────────
router.get('/structures', authenticateToken, async (_req: any, res: Response) => {
  try {
    const structures = (await dbDriver.getDocs('structures')).filter((s: any) => !s.deleted);
    res.json(structures);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/structures', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const id = req.body.id || `node-${Date.now()}`;
    const node = cleanObjectForFirestore({ ...req.body, id, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('structures', id, node);
    await writeAuditLog({ userName, userRole, action: `Tambah Node Struktur: ${node.title} — ${node.name}`, module: 'Sistem' });
    res.json({ success: true, id, node });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/structures/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('structures', id);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id, updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('structures', id, updated);
    await writeAuditLog({ userName, userRole, action: `Update Node Struktur: ${updated.title} — ${updated.name}`, module: 'Sistem' });
    res.json({ success: true, node: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/structures/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    await dbDriver.updateDoc('structures', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Node Struktur ID: ${id}`, module: 'Sistem' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Users Management
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan' && role !== 'Pengawas Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const users = (await dbDriver.getDocs('users')).filter((u: any) => !u.deleted);
    // Hapus password dari response
    const safeUsers = users.map((u: any) => { const { password: _, ...safe } = u; return safe; });
    res.json(safeUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:email', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { email } = req.params;
    const old = await dbDriver.getDoc('users', email);
    const allowedFields = ['approved', 'role', 'features', 'name', 'phone'];
    const update: any = {};
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    }
    update.updatedAt = new Date().toISOString();
    await dbDriver.updateDoc('users', email, cleanObjectForFirestore(update));
    await writeAuditLog({
      userName, userRole,
      action: `Update User: ${email}. Perubahan: ${JSON.stringify(update)}`,
      module: 'Sistem',
      beforeValue: JSON.stringify({ ...old, password: '[REDACTED]' }),
      afterValue: JSON.stringify(update),
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/users/:email', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin') {
    return res.status(403).json({ success: false, message: 'Hanya Super Admin yang dapat menghapus akun.' });
  }
  try {
    const { email } = req.params;
    if (email === 'superadmin@esm.or.id') {
      return res.status(403).json({ success: false, message: 'Akun Super Admin utama tidak dapat dihapus.' });
    }
    await dbDriver.updateDoc('users', email, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Non-aktifkan User: ${email}`, module: 'Sistem' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/audits', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan' && role !== 'Pengawas Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const logs = (await dbDriver.getDocs('audits')).filter((a: any) => !a.deleted);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Seed Data (dipindah dari FE ke BE)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/seed', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    await seedAllInitialData();
    await writeAuditLog({ userName, userRole, action: 'Seed Data Awal Berhasil Dilakukan dari BE', module: 'Sistem' });
    res.json({ success: true, message: 'Data awal berhasil di-seed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// System Cleanse (sudah ada, dipertahankan)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/cleanse', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak Akses Ditolak.' });
  }

  try {
    const collectionsToClean = [
      'members', 'small_groups', 'transactions', 'partners', 'salaries',
      'inward_letters', 'outward_letters', 'approvals', 'audits', 'donations',
      'prayer_requests', 'member_notes', 'follow_ups', 'meeting_logs', 'materials',
      'profiles', 'structures', 'kas', 'categories', 'incomes', 'expenses',
      'fundraising', 'payroll_payments', 'detail_pengeluaran', 'detail_expenses',
      'activities', 'activity_rundowns', 'activity_preparations', 'activity_transactions',
      'staff_tasks', 'staff_meetings', 'career_history', 'id_counters',
    ];

    for (const colName of collectionsToClean) {
      try {
        const docs = await dbDriver.getDocs(colName);
        for (const d of docs) {
          const docId = d.id || d.nik;
          if (docId) await dbDriver.deleteDoc(colName, docId);
        }
      } catch (colErr) {
        console.warn(`Err cleansing collection ${colName}:`, colErr);
      }
    }

    // Clean users except superadmin
    const allUsers = await dbDriver.getDocs('users');
    for (const u of allUsers) {
      if (u.email && u.email !== 'superadmin@esm.or.id') {
        await dbDriver.deleteDoc('users', u.email);
      }
    }

    // Clean staff
    const allStaff = await dbDriver.getDocs('staff');
    for (const s of allStaff) {
      if (s.nik) await dbDriver.deleteDoc('staff', s.nik);
    }

    await seedUsersIfEmpty();
    await seedStructuresIfEmpty();

    await dbDriver.setDoc('system_state', 'seed_status', { id: 'seed_status', seeded: true, cleansedAt: new Date().toISOString() });

    await writeAuditLog({ userName, userRole, action: 'System Cleanse: Semua data dibersihkan dan superadmin di-reset.', module: 'Sistem' });
    res.json({ success: true, message: 'Database berhasil dibersihkan total.' });
  } catch (err: any) {
    console.error('Cleansing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/health', (_req, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const systemRouter = router;
export default systemRouter;
