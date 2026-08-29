import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore } from '../services/transaction-sync.service';
import { generateApprovalId } from '../utils/id-generator';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/approvals
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara' && role !== 'Sekretaris') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const approvals = (await dbDriver.getDocs('approvals')).filter((a: any) => !a.deleted);
    res.json(approvals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approvals  — buat approval request (biasanya dipanggil dari BE sendiri)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const body = req.body;
    const id = await generateApprovalId(body.module || 'Umum');
    const approval = cleanObjectForFirestore({
      ...body, id, status: 'Pending',
      requestedBy: body.requestedBy || userName,
      requestedAt: body.requestedAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
      createdBy: userName,
      createdAt: new Date().toISOString(),
      deleted: false,
    });
    await dbDriver.setDoc('approvals', id, approval);
    await writeAuditLog({ userName, userRole, action: `Buat Approval Request ID: ${id} — ${approval.title}`, module: approval.module || 'Approvals' });
    res.json({ success: true, id, approval });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approvals/:id/process  — Approve atau Reject (atomik di BE)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/process', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas. Hanya Ketua Yayasan atau Super Admin yang dapat menyetujui/menolak.' });
  }
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'Approved' | 'Rejected'
    if (!['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action harus "Approved" atau "Rejected".' });
    }

    const approval = await dbDriver.getDoc('approvals', id);
    if (!approval) return res.status(404).json({ success: false, message: 'Approval tidak ditemukan.' });
    if (approval.status !== 'Pending') {
      return res.status(409).json({ success: false, message: `Approval ini sudah ${approval.status}.` });
    }

    // Update status approval
    const updated = cleanObjectForFirestore({
      ...approval, status: action, comment: comment || '',
      processedBy: userName, processedAt: new Date().toISOString(),
    });
    await dbDriver.setDoc('approvals', id, updated);

    // Update status referensi (transaksi/surat/dll) secara atomik
    if (approval.referenceId && approval.module) {
      try {
        if (approval.module === 'Keuangan') {
          const tx = await dbDriver.getDoc('transactions', approval.referenceId);
          if (tx) {
            await dbDriver.updateDoc('transactions', approval.referenceId, {
              status: action === 'Approved' ? 'Approved' : 'Rejected',
              approvedBy: action === 'Approved' ? userName : undefined,
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (approval.module === 'Surat') {
          const letter = await dbDriver.getDoc('outward_letters', approval.referenceId);
          if (letter) {
            await dbDriver.updateDoc('outward_letters', approval.referenceId, {
              status: action === 'Approved' ? 'Approved' : 'Draft',
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (approval.module === 'Payroll') {
          // Payroll diproses via /api/staff/payroll/process
        }
      } catch (refErr) {
        console.warn('[approvals/process] Failed to update reference:', refErr);
      }
    }

    await writeAuditLog({
      userName, userRole,
      action: `${action} Approval ID: ${id} — ${approval.title}. Komentar: ${comment || '-'}`,
      module: approval.module || 'Approvals',
      beforeValue: JSON.stringify(approval),
      afterValue: JSON.stringify(updated),
    });

    res.json({ success: true, approval: updated });
  } catch (err: any) {
    console.error('[approvals/process]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/approvals/:id  — hapus approval (soft-delete)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    await dbDriver.updateDoc('approvals', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Approval Request ID: ${id}`, module: 'Approvals' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const approvalsRouter = router;
export default approvalsRouter;
