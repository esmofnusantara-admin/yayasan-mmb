import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore } from '../services/transaction-sync.service';
import { generateStaffTaskId, generateStaffMeetingId } from '../utils/id-generator';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Staff Tasks CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan';
  const hasAccess = features.includes('staff_tasks');
  if (!isSuperAdmin && !hasAccess) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const tasks = (await dbDriver.getDocs('staff_tasks')).filter((t: any) => !t.deleted);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan';
  const hasAccess = features.includes('staff_tasks');
  if (!isSuperAdmin && !hasAccess) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  const { userName, userRole } = auditFromReq(req);
  try {
    const id = await generateStaffTaskId();
    const task = cleanObjectForFirestore({
      ...req.body, id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    });
    await dbDriver.setDoc('staff_tasks', id, task);
    await writeAuditLog({ userName, userRole, action: `Tambah Task Staff: ${task.title} (${id}) — ${task.staffName}`, module: 'Program & Rapat Staf' });
    res.json({ success: true, id, task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan';
  const hasAccess = features.includes('staff_tasks');
  if (!isSuperAdmin && !hasAccess) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('staff_tasks', id);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('staff_tasks', id, updated);
    await writeAuditLog({ userName, userRole, action: `Update Task Staff: ${updated.title} (${id}) → Status: ${updated.status}`, module: 'Program & Rapat Staf', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, task: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('staff_tasks', id);
    await dbDriver.updateDoc('staff_tasks', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Task Staff: ${old?.title || id} (Soft-Delete)`, module: 'Program & Rapat Staf' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Staff Meetings CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/meetings', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan';
  const hasAccess = features.includes('staff_tasks');
  if (!isSuperAdmin && !hasAccess) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const meetings = (await dbDriver.getDocs('staff_meetings')).filter((m: any) => !m.deleted);
    res.json(meetings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/meetings', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan';
  const hasAccess = features.includes('staff_tasks');
  if (!isSuperAdmin && !hasAccess) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  const { userName, userRole } = auditFromReq(req);
  try {
    const id = await generateStaffMeetingId();
    const meeting = cleanObjectForFirestore({
      ...req.body, id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    });
    await dbDriver.setDoc('staff_meetings', id, meeting);
    await writeAuditLog({ userName, userRole, action: `Catat Rapat Staf: ${meeting.title} (${id})`, module: 'Program & Rapat Staf' });
    res.json({ success: true, id, meeting });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/meetings/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan';
  const hasAccess = features.includes('staff_tasks');
  if (!isSuperAdmin && !hasAccess) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('staff_meetings', id);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('staff_meetings', id, updated);
    await writeAuditLog({ userName, userRole, action: `Update Rapat Staf: ${updated.title} (${id})`, module: 'Program & Rapat Staf' });
    res.json({ success: true, meeting: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/meetings/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('staff_meetings', id);
    await dbDriver.updateDoc('staff_meetings', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Rapat Staf: ${old?.title || id} (Soft-Delete)`, module: 'Program & Rapat Staf' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const staffTasksRouter = router;
export default staffTasksRouter;
