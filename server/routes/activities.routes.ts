import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore, syncTransactionSubcollections } from '../services/transaction-sync.service';
import {
  generateActivityId,
  generateRundownId,
  generatePreparationId,
  generateActivityTransactionId,
  generateTransactionId,
} from '../utils/id-generator';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';
import { computeKasBalance } from './finance.routes';

const router = Router();

// ─── Helper: Hitung wallet balance kegiatan dari activity_transactions ───────
async function computeActivityWallet(activityId: string): Promise<number> {
  const txs = (await dbDriver.getDocs('activity_transactions'))
    .filter((t: any) => !t.deleted && t.activityId === activityId);
  return txs.reduce((sum: number, t: any) => {
    const type = t.type as string;
    if (type === 'In' || type === 'Transfer_From_Main') return sum + Number(t.amount);
    if (type === 'Out' || type === 'Transfer_To_Main') return sum - Number(t.amount);
    return sum;
  }, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Activities CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (_req: any, res: Response) => {
  try {
    const activities = (await dbDriver.getDocs('activities')).filter((a: any) => !a.deleted);
    res.json(activities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const id = await generateActivityId();
    const body = { ...req.body };
    delete body.rundownItems;
    delete body.preparationItems;
    const activity = cleanObjectForFirestore({ ...body, id, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('activities', id, activity);
    await writeAuditLog({ userName, userRole, action: `Inisiasi Kegiatan Baru: ${activity.title} (${id})`, module: 'Kegiatan' });
    res.json({ success: true, id, activity });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('activities', id);
    const body = { ...req.body };
    delete body.rundownItems;
    delete body.preparationItems;
    const updated = cleanObjectForFirestore({ ...old, ...body, id, updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('activities', id, updated);
    await writeAuditLog({ userName, userRole, action: `Update Kegiatan: ${updated.title} (${id})`, module: 'Kegiatan', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, activity: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('activities', id);
    await dbDriver.updateDoc('activities', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Kegiatan: ${old?.title || id} (Soft-Delete)`, module: 'Kegiatan' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Rundowns
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:activityId/rundowns', authenticateToken, async (req: any, res: Response) => {
  try {
    const { activityId } = req.params;
    const items = (await dbDriver.getDocs('activity_rundowns')).filter((r: any) => !r.deleted && r.activityId === activityId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:activityId/rundowns', authenticateToken, async (req: any, res: Response) => {
  const { userName } = auditFromReq(req);
  try {
    const { activityId } = req.params;
    const id = await generateRundownId();
    const item = cleanObjectForFirestore({ ...req.body, id, activityId, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('activity_rundowns', id, item);
    res.json({ success: true, id, item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:activityId/rundowns/:rid', authenticateToken, async (req: any, res: Response) => {
  try {
    const { rid } = req.params;
    await dbDriver.updateDoc('activity_rundowns', rid, { deleted: true, deletedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Preparations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:activityId/preparations', authenticateToken, async (req: any, res: Response) => {
  try {
    const { activityId } = req.params;
    const items = (await dbDriver.getDocs('activity_preparations')).filter((p: any) => !p.deleted && p.activityId === activityId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:activityId/preparations', authenticateToken, async (req: any, res: Response) => {
  const { userName } = auditFromReq(req);
  try {
    const { activityId } = req.params;
    const id = await generatePreparationId();
    const item = cleanObjectForFirestore({ ...req.body, id, activityId, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('activity_preparations', id, item);
    res.json({ success: true, id, item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:activityId/preparations/:pid', authenticateToken, async (req: any, res: Response) => {
  const { userName } = auditFromReq(req);
  try {
    const { activityId, pid } = req.params;
    const old = await dbDriver.getDoc('activity_preparations', pid);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id: pid, activityId, updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('activity_preparations', pid, updated);
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:activityId/preparations/:pid', authenticateToken, async (req: any, res: Response) => {
  try {
    const { pid } = req.params;
    await dbDriver.updateDoc('activity_preparations', pid, { deleted: true, deletedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Activity Transactions (wallet kegiatan) — dengan update saldo otomatis
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:activityId/transactions', authenticateToken, async (req: any, res: Response) => {
  try {
    const { activityId } = req.params;
    const txs = (await dbDriver.getDocs('activity_transactions')).filter((t: any) => !t.deleted && t.activityId === activityId);
    const walletBalance = await computeActivityWallet(activityId);
    res.json({ transactions: txs, walletBalance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:activityId/transactions', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { activityId } = req.params;
    const id = await generateActivityTransactionId();
    const tx = cleanObjectForFirestore({
      ...req.body, id, activityId,
      operator: userName,
      createdAt: new Date().toISOString(),
      deleted: false,
    });
    await dbDriver.setDoc('activity_transactions', id, tx);

    // Jika Transfer_From_Main → catat sebagai expense di kas utama
    if (tx.type === 'Transfer_From_Main') {
      const mainTxId = await generateTransactionId();
      const mainTx = cleanObjectForFirestore({
        id: mainTxId, transaction_code: mainTxId,
        type: 'Expense', source: 'manual',
        category_id: 'Alokasi Kegiatan / Event',
        amount: Number(tx.amount),
        description: `[Alokasi Kegiatan] Transfer ke Kantong Kegiatan: ${tx.description || activityId}`,
        transaction_date: tx.date || new Date().toISOString().split('T')[0],
        created_by: userName,
        reference_id: activityId,
        reference_type: 'activity_allocation',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null,
        date: tx.date || new Date().toISOString().split('T')[0],
        category: 'Alokasi Kegiatan / Event',
        sourceOrRecipient: `Kegiatan ${activityId}`,
        status: 'Approved', deleted: false,
      });
      await dbDriver.setDoc('transactions', mainTxId, mainTx);
      await syncTransactionSubcollections(mainTx, false, userRole, userName);
      const bal = await computeKasBalance();
      await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({ id: 'main', balance: bal, lastUpdated: new Date().toISOString(), updatedBy: userName }));
    }

    // Jika Transfer_To_Main → catat sebagai income di kas utama
    if (tx.type === 'Transfer_To_Main') {
      const mainTxId = await generateTransactionId();
      const mainTx = cleanObjectForFirestore({
        id: mainTxId, transaction_code: mainTxId,
        type: 'Income', source: 'manual',
        category_id: 'Pemasukan Kegiatan / Event sisa',
        amount: Number(tx.amount),
        description: `[Sisa Kegiatan] Pengembalian sisa dana ke Kas Utama: ${tx.description || activityId}`,
        transaction_date: tx.date || new Date().toISOString().split('T')[0],
        created_by: userName,
        reference_id: activityId,
        reference_type: 'activity_allocation',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null,
        date: tx.date || new Date().toISOString().split('T')[0],
        category: 'Pemasukan Kegiatan / Event sisa',
        sourceOrRecipient: `Kegiatan ${activityId}`,
        status: 'Approved', deleted: false,
      });
      await dbDriver.setDoc('transactions', mainTxId, mainTx);
      await syncTransactionSubcollections(mainTx, false, userRole, userName);
      const bal = await computeKasBalance();
      await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({ id: 'main', balance: bal, lastUpdated: new Date().toISOString(), updatedBy: userName }));
    }

    // Update budgetWalletBalance di activity
    const walletBalance = await computeActivityWallet(activityId);
    await dbDriver.updateDoc('activities', activityId, { budgetWalletBalance: walletBalance, updatedAt: new Date().toISOString() });

    res.json({ success: true, id, transaction: tx, walletBalance });
  } catch (err: any) {
    console.error('[activities/transactions POST]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:activityId/transactions/:tid', authenticateToken, async (req: any, res: Response) => {
  const { userName } = auditFromReq(req);
  try {
    const { activityId, tid } = req.params;
    const old = await dbDriver.getDoc('activity_transactions', tid);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id: tid, activityId, updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('activity_transactions', tid, updated);
    const walletBalance = await computeActivityWallet(activityId);
    await dbDriver.updateDoc('activities', activityId, { budgetWalletBalance: walletBalance, updatedAt: new Date().toISOString() });
    res.json({ success: true, transaction: updated, walletBalance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:activityId/transactions/:tid', authenticateToken, async (req: any, res: Response) => {
  try {
    const { activityId, tid } = req.params;
    await dbDriver.updateDoc('activity_transactions', tid, { deleted: true, deletedAt: new Date().toISOString() });
    const walletBalance = await computeActivityWallet(activityId);
    await dbDriver.updateDoc('activities', activityId, { budgetWalletBalance: walletBalance, updatedAt: new Date().toISOString() });
    res.json({ success: true, walletBalance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const activitiesRouter = router;
export default activitiesRouter;
