import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore } from '../services/transaction-sync.service';
import {
  generateMemberId,
  generateMemberNoteId,
  generatePrayerRequestId,
  generateFollowUpId,
} from '../utils/id-generator';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/members
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (_req: any, res: Response) => {
  try {
    const members = (await dbDriver.getDocs('members')).filter((m: any) => !m.deleted);
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/members  — tambah anggota (BE generate ID)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const body = req.body;
    const id = await generateMemberId(body.component || 'Umum');
    const member = cleanObjectForFirestore({
      ...body, id,
      createdBy: userName,
      createdAt: new Date().toISOString(),
      deleted: false,
    });
    await dbDriver.setDoc('members', id, member);
    await writeAuditLog({ userName, userRole, action: `Tambah Anggota Baru ID: ${id} — ${member.fullName}`, module: 'Anggota', afterValue: JSON.stringify(member) });
    res.json({ success: true, id, member });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/members/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('members', id);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id, updatedBy: userName, updatedAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('members', id, updated);
    await writeAuditLog({ userName, userRole, action: `Update Profil Anggota ID: ${id} — ${updated.fullName}`, module: 'Anggota', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, member: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/members/:id  — soft delete
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('members', id);
    await dbDriver.updateDoc('members', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Anggota ID: ${id} — ${old?.fullName || ''} (Soft-Delete)`, module: 'Anggota' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/members/import  — bulk import
// ─────────────────────────────────────────────────────────────────────────────
router.post('/import', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const members: any[] = req.body;
    if (!Array.isArray(members)) return res.status(400).json({ success: false, message: 'Payload harus berupa array.' });

    const results: { id: string }[] = [];
    for (const m of members) {
      const id = m.id || await generateMemberId(m.component || 'Umum');
      const member = cleanObjectForFirestore({ ...m, id, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
      await dbDriver.setDoc('members', id, member);
      results.push({ id });
    }

    await writeAuditLog({ userName, userRole, action: `Import Massal ${members.length} Anggota dari Excel`, module: 'Anggota' });
    res.json({ success: true, count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Member Notes
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:memberId/notes', authenticateToken, async (req: any, res: Response) => {
  try {
    const { memberId } = req.params;
    const notes = (await dbDriver.getDocs('member_notes')).filter((n: any) => !n.deleted && n.memberId === memberId);
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:memberId/notes', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { memberId } = req.params;
    const id = await generateMemberNoteId();
    const note = cleanObjectForFirestore({ ...req.body, id, memberId, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('member_notes', id, note);
    await writeAuditLog({ userName, userRole, action: `Tambah Catatan Anggota ID: ${memberId}`, module: 'Anggota' });
    res.json({ success: true, id, note });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:memberId/notes/:noteId', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { memberId, noteId } = req.params;
    await dbDriver.updateDoc('member_notes', noteId, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Catatan Anggota ID: ${memberId}`, module: 'Anggota' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Prayer Requests
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:memberId/prayer-requests', authenticateToken, async (req: any, res: Response) => {
  try {
    const { memberId } = req.params;
    const items = (await dbDriver.getDocs('prayer_requests')).filter((p: any) => !p.deleted && p.memberId === memberId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:memberId/prayer-requests', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { memberId } = req.params;
    const id = await generatePrayerRequestId();
    const prayer = cleanObjectForFirestore({ ...req.body, id, memberId, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('prayer_requests', id, prayer);
    await writeAuditLog({ userName, userRole, action: `Tambah Pokok Doa Anggota ID: ${memberId}`, module: 'Anggota' });
    res.json({ success: true, id, prayer });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:memberId/prayer-requests/:prid/status', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { memberId, prid } = req.params;
    const { status, answeredDate, answerNotes } = req.body;
    const updatePayload: any = { status, updatedAt: new Date().toISOString() };
    if (answeredDate !== undefined) updatePayload.answeredDate = answeredDate;
    if (answerNotes !== undefined) updatePayload.answerNotes = answerNotes;
    await dbDriver.updateDoc('prayer_requests', prid, updatePayload);
    await writeAuditLog({ userName, userRole, action: `Update Status Doa ID: ${prid} → ${status} (Anggota: ${memberId})`, module: 'Anggota' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Follow-up Logs
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:memberId/follow-ups', authenticateToken, async (req: any, res: Response) => {
  try {
    const { memberId } = req.params;
    const items = (await dbDriver.getDocs('follow_ups')).filter((f: any) => !f.deleted && f.memberId === memberId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:memberId/follow-ups', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { memberId } = req.params;
    const id = await generateFollowUpId();
    const followUp = cleanObjectForFirestore({ ...req.body, id, memberId, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('follow_ups', id, followUp);
    await writeAuditLog({ userName, userRole, action: `Catat Follow-Up Anggota ID: ${memberId}`, module: 'Anggota' });
    res.json({ success: true, id, followUp });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/members/notes/all  — semua catatan (untuk dashboard)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/notes/all', authenticateToken, async (_req: any, res: Response) => {
  try {
    const notes = (await dbDriver.getDocs('member_notes')).filter((n: any) => !n.deleted);
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/prayer-requests/all', authenticateToken, async (_req: any, res: Response) => {
  try {
    const items = (await dbDriver.getDocs('prayer_requests')).filter((p: any) => !p.deleted);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/follow-ups/all', authenticateToken, async (_req: any, res: Response) => {
  try {
    const items = (await dbDriver.getDocs('follow_ups')).filter((f: any) => !f.deleted);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const membersRouter = router;
export default membersRouter;
