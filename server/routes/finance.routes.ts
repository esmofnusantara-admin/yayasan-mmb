import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore, syncTransactionSubcollections } from '../services/transaction-sync.service';
import { generateTransactionId, generateCategoryId } from '../utils/id-generator';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';

const router = Router();

// ─── Helper: Hitung balance langsung dari DB (bukan dari FE state) ──────────
export async function computeKasBalance(): Promise<number> {
  const all = await dbDriver.getDocs('transactions');
  const approved = all.filter((t: any) => !t.deleted && t.status !== 'Rejected' && t.status !== 'Draft');
  return approved.reduce((sum: number, t: any) => {
    const isIncome = (t.type || '').toLowerCase() === 'income';
    return sum + (isIncome ? Number(t.amount) : -Number(t.amount));
  }, 0);
}

// ─── Helper: Simpan snapshot kas ────────────────────────────────────────────
async function saveKasSnapshot(newBalance: number, operatorName: string) {
  await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({
    id: 'main',
    balance: newBalance,
    lastUpdated: new Date().toISOString(),
    updatedBy: operatorName,
  }));
}

// ─── Helper: Catat KAS log ───────────────────────────────────────────────────
async function appendKasLog(tx: any, balanceBefore: number, balanceAfter: number, operatorName: string, action: 'CREATE' | 'EDIT' | 'DELETE') {
  const kasId = `KAS-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await dbDriver.setDoc('kas', kasId, cleanObjectForFirestore({
    id: kasId,
    transaction_id: tx.id,
    type: (tx.type || 'income').toLowerCase(),
    amount: Number(tx.amount),
    source: tx.source || 'manual',
    category: tx.category || tx.category_id || 'Lain-lain',
    description: tx.description || '',
    balanceBefore,
    balanceAfter,
    updatedBy: operatorName,
    timestamp: new Date().toISOString(),
    action,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/finance/balance  — saldo kas terkini dihitung dari DB
// ─────────────────────────────────────────────────────────────────────────────
router.get('/balance', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const balance = await computeKasBalance();
    await saveKasSnapshot(balance, 'System Recalculate');
    res.json({ success: true, balance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/finance/transactions  — tambah transaksi (BE generate ID & balance)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/transactions', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  const isActivityAllocation = req.body?.reference_type === 'activity_allocation';
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara' && !isActivityAllocation) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas untuk mencatat transaksi.' });
  }
  try {
    const body = req.body;
    const txId = body.id && !body.id.startsWith('TX-2026-0000') ? body.id : await generateTransactionId();
    const isIncome = (body.type || 'income').toLowerCase() === 'income';
    const balanceBefore = await computeKasBalance();

    const rawCategory = body.category || body.category_id || 'Lain-lain';
    const isPayroll = rawCategory === 'Penggajian Staff' || rawCategory === 'Payroll Staff & BPJS' || body.source === 'payroll';
    const isDonation = rawCategory === 'Donasi Kemitraan' || body.source === 'donation' || body.reference_type === 'donation';

    const standardizedCategory = isPayroll ? 'Penggajian Staff' : isDonation ? 'Donasi Kemitraan' : rawCategory;
    const resolvedSource = isDonation ? 'donation' : isPayroll ? 'payroll' : (body.source || 'manual');

    const tx = cleanObjectForFirestore({
      id: txId,
      transaction_code: txId,
      type: isIncome ? 'Income' : 'Expense',
      source: resolvedSource,
      category_id: standardizedCategory,
      amount: Number(body.amount),
      description: body.description || '',
      transaction_date: body.transaction_date || body.date || new Date().toISOString().split('T')[0],
      created_by: userName,
      reference_id: body.reference_id || null,
      reference_type: body.reference_type || (isDonation ? 'donation' : isPayroll ? 'payroll' : null),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      // FE backwards compat
      date: body.date || body.transaction_date || new Date().toISOString().split('T')[0],
      category: standardizedCategory,
      sourceOrRecipient: body.sourceOrRecipient || body.reference_id || userName,
      status: body.status || 'Approved',
      approvedBy: body.approvedBy || userName,
      deleted: false,
    });

    await dbDriver.setDoc('transactions', txId, tx);
    await syncTransactionSubcollections(tx, false, userRole, userName);

    const balanceAfter = await computeKasBalance();
    await saveKasSnapshot(balanceAfter, userName);
    await appendKasLog(tx, balanceBefore, balanceAfter, userName, 'CREATE');

    await writeAuditLog({
      userName, userRole,
      action: `[Keuangan] Tambah Transaksi ${txId} (${tx.type}) Rp ${Number(body.amount).toLocaleString('id-ID')}. Saldo: Rp ${balanceAfter.toLocaleString('id-ID')}`,
      module: 'Keuangan & Jurnal',
      afterValue: JSON.stringify(tx),
    });

    res.json({ success: true, id: txId, newBalance: balanceAfter, transaction: tx });
  } catch (err: any) {
    console.error('[finance/transactions POST]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/finance/transactions/:id  — update transaksi
// ─────────────────────────────────────────────────────────────────────────────
router.put('/transactions/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('transactions', id);
    const body = req.body;
    const isIncome = (body.type || old?.type || 'income').toLowerCase() === 'income';
    const balanceBefore = await computeKasBalance();

    const rawCategory = body.category || body.category_id || old?.category || old?.category_id || 'Lain-lain';
    const isPayroll = rawCategory === 'Penggajian Staff' || rawCategory === 'Payroll Staff & BPJS' || body.source === 'payroll' || old?.source === 'payroll';
    const isDonation = rawCategory === 'Donasi Kemitraan' || body.source === 'donation' || old?.source === 'donation' || body.reference_type === 'donation' || old?.reference_type === 'donation';

    const standardizedCategory = isPayroll ? 'Penggajian Staff' : isDonation ? 'Donasi Kemitraan' : rawCategory;
    const resolvedSource = isDonation ? 'donation' : isPayroll ? 'payroll' : (body.source || old?.source || 'manual');

    const updated = cleanObjectForFirestore({
      ...old,
      ...body,
      id,
      type: isIncome ? 'Income' : 'Expense',
      source: resolvedSource,
      category: standardizedCategory,
      category_id: standardizedCategory,
      amount: Number(body.amount ?? old?.amount),
      updated_at: new Date().toISOString(),
      // FE compat
      status: body.status || old?.status || 'Approved',
      deleted: false,
    });

    await dbDriver.setDoc('transactions', id, updated);
    await syncTransactionSubcollections(updated, false, userRole, userName);

    // Bidirectional sync: if this was a donation transaction, update the donation doc as well
    if (updated.reference_type === 'donation' && updated.reference_id) {
      try {
        const donDoc = await dbDriver.getDoc('donations', updated.reference_id);
        if (donDoc) {
          await dbDriver.updateDoc('donations', updated.reference_id, cleanObjectForFirestore({
            amount: Number(updated.amount),
            date: updated.date || updated.transaction_date,
            updatedAt: new Date().toISOString(),
            updatedBy: userName,
          }));
        }
      } catch (donErr) {
        console.warn('[finance/transactions PUT] Failed to sync back to donation:', donErr);
      }
    }

    const balanceAfter = await computeKasBalance();
    await saveKasSnapshot(balanceAfter, userName);
    await appendKasLog(updated, balanceBefore, balanceAfter, userName, 'EDIT');

    await writeAuditLog({
      userName, userRole,
      action: `[Keuangan] Update Transaksi ${id} (${updated.type}) Rp ${Number(updated.amount).toLocaleString('id-ID')}`,
      module: 'Keuangan & Jurnal',
      beforeValue: JSON.stringify(old),
      afterValue: JSON.stringify(updated),
    });

    res.json({ success: true, newBalance: balanceAfter, transaction: updated });
  } catch (err: any) {
    console.error('[finance/transactions PUT]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/finance/transactions/:id  — hapus transaksi (hard delete & cascade)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/transactions/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('transactions', id);
    const balanceBefore = await computeKasBalance();

    await dbDriver.deleteDoc('transactions', id);
    if (old) {
      await syncTransactionSubcollections(old, true, userRole, userName);
    } else {
      await syncTransactionSubcollections({ id }, true, userRole, userName);
    }

    const balanceAfter = await computeKasBalance();
    await saveKasSnapshot(balanceAfter, userName);
    if (old) await appendKasLog(old, balanceBefore, balanceAfter, userName, 'DELETE');

    await writeAuditLog({
      userName, userRole,
      action: `[Keuangan] Hapus Transaksi ${id}. Saldo setelah: Rp ${balanceAfter.toLocaleString('id-ID')}`,
      module: 'Keuangan & Jurnal',
      beforeValue: JSON.stringify(old),
    });

    res.json({ success: true, newBalance: balanceAfter });
  } catch (err: any) {
    console.error('[finance/transactions DELETE]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Kategori Keuangan
// ─────────────────────────────────────────────────────────────────────────────
router.get('/categories', authenticateToken, async (_req: any, res: Response) => {
  try {
    const cats = (await dbDriver.getDocs('categories')).filter((c: any) => !c.deleted);
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const body = req.body;
    const id = await generateCategoryId();
    const cat = cleanObjectForFirestore({ ...body, id, deleted: false, createdAt: new Date().toISOString() });
    await dbDriver.setDoc('categories', id, cat);
    await writeAuditLog({ userName, userRole, action: `Tambah Kategori Kas: ${cat.name}`, module: 'Keuangan' });
    res.json({ success: true, id, category: cat });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/categories/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('categories', id);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, id, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('categories', id, updated);
    await writeAuditLog({ userName, userRole, action: `Update Kategori Kas: ${updated.name}`, module: 'Keuangan', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, category: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/categories/:id', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('categories', id);
    await dbDriver.updateDoc('categories', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Kategori Kas: ${old?.name || id}`, module: 'Keuangan' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Legacy sync endpoint — backward compatibility
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync', authenticateToken, async (req: any, res: Response) => {
  const { tx, operatorName, operatorRole } = req.body;
  const userRole = req.user.role;
  const isActivityAllocation = tx && (tx.reference_type === 'activity_allocation' || tx.category === 'Alokasi Kegiatan / Event' || tx.category === 'Pemasukan Kegiatan / Event sisa');
  if (userRole !== 'Super Admin' && userRole !== 'Ketua Yayasan' && userRole !== 'Bendahara' && !isActivityAllocation) {
    return res.status(403).json({ success: false, message: 'Hak Akses Ditolak.' });
  }

  try {
    const isDeletedAction = tx.status === 'Rejected' || tx.deleted === true;
    const isIncome = (tx.type || 'Income').toLowerCase() === 'income';

    const rawCategory = tx.category || tx.category_id || 'Lain-lain';
    const isPayroll = rawCategory === 'Penggajian Staff' || rawCategory === 'Payroll Staff & BPJS' || tx.source === 'payroll';
    const isDonation = rawCategory === 'Donasi Kemitraan' || tx.source === 'donation' || tx.reference_type === 'donation';

    const standardizedCategory = isPayroll ? 'Penggajian Staff' : isDonation ? 'Donasi Kemitraan' : rawCategory;
    const resolvedSource = isDonation ? 'donation' : isPayroll ? 'payroll' : (tx.source || 'manual');

    const enrichedTx = cleanObjectForFirestore({
      id: tx.id,
      transaction_code: tx.transaction_code || tx.id,
      type: isIncome ? 'Income' : 'Expense',
      source: resolvedSource,
      category_id: standardizedCategory,
      amount: Number(tx.amount),
      description: tx.description || '',
      transaction_date: tx.transaction_date || tx.date || new Date().toISOString().split('T')[0],
      created_by: tx.created_by || operatorName,
      reference_id: tx.reference_id || null,
      reference_type: tx.reference_type || (isDonation ? 'donation' : isPayroll ? 'payroll' : null),
      created_at: tx.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: isDeletedAction ? new Date().toISOString() : null,
      date: tx.date || tx.transaction_date || new Date().toISOString().split('T')[0],
      category: standardizedCategory,
      sourceOrRecipient: tx.sourceOrRecipient || tx.reference_id || operatorName,
      status: isDeletedAction ? 'Rejected' : (tx.status || 'Approved'),
      deleted: isDeletedAction,
    });

    if (isDeletedAction) {
      await dbDriver.deleteDoc('transactions', tx.id);
      await syncTransactionSubcollections(enrichedTx, true, operatorRole, operatorName);
    } else {
      await dbDriver.setDoc('transactions', tx.id, enrichedTx);
      await syncTransactionSubcollections(enrichedTx, false, operatorRole, operatorName);
    }

    // Balance dihitung dari DB
    const newBalance = await computeKasBalance();
    await saveKasSnapshot(newBalance, operatorName);

    const kasId = `KAS-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await dbDriver.setDoc('kas', kasId, cleanObjectForFirestore({
      id: kasId,
      transaction_id: tx.id,
      type: isIncome ? 'income' : 'expense',
      amount: Number(tx.amount),
      source: resolvedSource,
      category: standardizedCategory,
      description: tx.description || '',
      balanceAfter: newBalance,
      updatedBy: operatorName,
      timestamp: new Date().toISOString(),
      action: isDeletedAction ? 'DELETE' : (tx.isEdit ? 'EDIT' : 'CREATE'),
    }));

    res.json({ success: true, newBalance, transaction: enrichedTx });
  } catch (err: any) {
    console.error('[finance/sync]', err);
    res.status(500).json({ error: err.message });
  }
});

export const financeRouter = router;
export default financeRouter;
