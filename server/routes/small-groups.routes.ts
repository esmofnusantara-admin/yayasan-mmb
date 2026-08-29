import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore } from '../services/transaction-sync.service';
import { generateSmallGroupId, generateMeetingLogId, generateMaterialId } from '../utils/id-generator';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Small Groups CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (_req: any, res: Response) => {
  try {
    const groups = (await dbDriver.getDocs('small_groups')).filter((g: any) => !g.deleted);
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const id = await generateSmallGroupId();
    const group = cleanObjectForFirestore({ ...req.body, id, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('small_groups', id, group);
    await writeAuditLog({ userName, userRole, action: `Rintis Kelompok Kecil Baru: ${group.name} (${id})`, module: 'Kelompok Kecil' });
    res.json({ success: true, id, group });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('small_groups', id);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id, updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('small_groups', id, updated);
    await writeAuditLog({ userName, userRole, action: `Update Kelompok Kecil: ${updated.name} (${id})`, module: 'Kelompok Kecil', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, group: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('small_groups', id);
    await dbDriver.updateDoc('small_groups', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Bubarkan Kelompok Kecil: ${old?.name || id} (Soft-Delete)`, module: 'Kelompok Kecil' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Meeting Logs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:groupId/meetings', authenticateToken, async (req: any, res: Response) => {
  try {
    const { groupId } = req.params;
    const meetings = (await dbDriver.getDocs('meeting_logs')).filter((m: any) => !m.deleted && m.groupId === groupId);
    res.json(meetings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:groupId/meetings', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { groupId } = req.params;
    const id = await generateMeetingLogId();
    const meeting = cleanObjectForFirestore({ ...req.body, id, groupId, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('meeting_logs', id, meeting);
    await writeAuditLog({ userName, userRole, action: `Laporkan Pertemuan KTB ${groupId}: Materi "${meeting.materialName}"`, module: 'Kelompok Kecil' });
    res.json({ success: true, id, meeting });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:groupId/meetings/:mid', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { groupId, mid } = req.params;
    const old = await dbDriver.getDoc('meeting_logs', mid);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id: mid, groupId, updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('meeting_logs', mid, updated);
    await writeAuditLog({ userName, userRole, action: `Update Laporan Pertemuan KTB ${groupId}`, module: 'Kelompok Kecil', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, meeting: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:groupId/meetings/:mid', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { groupId, mid } = req.params;
    await dbDriver.updateDoc('meeting_logs', mid, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Laporan Pertemuan KTB ${groupId} (Soft-Delete)`, module: 'Kelompok Kecil' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Semua Meeting Logs (untuk dashboard/reports)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/meetings/all', authenticateToken, async (_req: any, res: Response) => {
  try {
    const meetings = (await dbDriver.getDocs('meeting_logs')).filter((m: any) => !m.deleted);
    res.json(meetings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Materials / Kurikulum
// ─────────────────────────────────────────────────────────────────────────────
router.get('/materials/all', authenticateToken, async (_req: any, res: Response) => {
  try {
    const materials = (await dbDriver.getDocs('materials')).filter((m: any) => !m.deleted);
    res.json(materials);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/materials', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const id = await generateMaterialId();
    const mat = cleanObjectForFirestore({ ...req.body, id, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('materials', id, mat);
    await writeAuditLog({ userName, userRole, action: `Upload Materi/Kurikulum: ${mat.title} (${id})`, module: 'Kurikulum' });
    res.json({ success: true, id, material: mat });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/materials/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('materials', id);
    await dbDriver.updateDoc('materials', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Materi/Kurikulum: ${old?.title || id} (Soft-Delete)`, module: 'Kurikulum' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const smallGroupsRouter = router;
export default smallGroupsRouter;
