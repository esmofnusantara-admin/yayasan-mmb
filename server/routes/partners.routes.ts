import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore, syncTransactionSubcollections } from '../services/transaction-sync.service';
import { generatePartnerId, generateDonationId, generateTransactionId } from '../utils/id-generator';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';
import { computeKasBalance } from './finance.routes';

const router = Router();

// ─── Helper: Auto-post donation sebagai transaction income ───────────────────
async function createDonationTransaction(donation: any, operatorName: string, operatorRole: string): Promise<string> {
  const txId = await generateTransactionId();
  const balanceBefore = await computeKasBalance();

  const tx = cleanObjectForFirestore({
    id: txId,
    transaction_code: txId,
    type: 'Income',
    source: 'donation',
    category_id: 'Donasi Kemitraan',
    amount: Number(donation.amount),
    description: `[Autoposting Fundraising CRM] Donasi masuk dari Mitra: ${donation.partnerName}. Channel: ${donation.channel}. Notes: ${donation.notes || 'Tanpa catatan tambahan'}`,
    transaction_date: donation.date || new Date().toISOString().split('T')[0],
    created_by: operatorName,
    reference_id: donation.id,
    reference_type: 'donation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    date: donation.date || new Date().toISOString().split('T')[0],
    category: 'Donasi Kemitraan',
    sourceOrRecipient: donation.partnerName,
    status: 'Approved',
    approvedBy: operatorName,
    deleted: false,
  });

  await dbDriver.setDoc('transactions', txId, tx);
  await syncTransactionSubcollections(tx, false, operatorRole, operatorName);

  const balanceAfter = await computeKasBalance();
  // Save kas snapshot
  await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({
    id: 'main', balance: balanceAfter, lastUpdated: new Date().toISOString(), updatedBy: operatorName,
  }));
  const kasId = `KAS-LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await dbDriver.setDoc('kas', kasId, cleanObjectForFirestore({
    id: kasId, transaction_id: txId, type: 'income', amount: Number(donation.amount),
    source: 'donation', category: 'Donasi Kemitraan',
    description: tx.description, balanceBefore, balanceAfter,
    updatedBy: operatorName, timestamp: new Date().toISOString(), action: 'CREATE',
  }));

  return txId;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/partners
// ─────────────────────────────────────────────────────────────────────────────
// Helper: Normalisasi data mitra agar selalu memiliki field yang valid
// ─────────────────────────────────────────────────────────────────────────────
function normalizePartner(p: any) {
  if (!p) return p;
  return {
    ...p,
    name: p.name || 'Tanpa Nama',
    partnerType: p.partnerType || p.type || 'Pribadi',
    type: p.partnerType || p.type || 'Pribadi',
    commitmentAmount: Number(p.commitmentAmount || 0),
    frequency: p.frequency || 'Bulanan',
    staffRelasi: p.staffRelasi || 'Ahmad Faisal',
    status: p.status || 'Prospek',
    region: p.region || 'Yogyakarta',
    donationDay: Number(p.donationDay || 10),
    startDate: p.startDate || new Date().toISOString().split('T')[0],
    endDate: p.endDate || '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/partners
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (_req: any, res: Response) => {
  try {
    const partners = (await dbDriver.getDocs('partners'))
      .filter((p: any) => !p.deleted)
      .map(normalizePartner);
    res.json(partners);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/partners  — tambah mitra (BE generate ID)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const id = await generatePartnerId();
    const partner = cleanObjectForFirestore(normalizePartner({
      ...req.body, id, createdBy: userName, createdAt: new Date().toISOString(), deleted: false,
    }));
    await dbDriver.setDoc('partners', id, partner);
    await writeAuditLog({ userName, userRole, action: `Tambah Mitra Baru: ${partner.name} (${id})`, module: 'Mitra & Fundraising', afterValue: JSON.stringify(partner) });
    res.json({ success: true, id, partner });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/partners/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('partners', id);
    const updated = cleanObjectForFirestore(normalizePartner({
      ...old, ...req.body, id, updatedBy: userName, updatedAt: new Date().toISOString(),
    }));
    await dbDriver.setDoc('partners', id, updated);
    await writeAuditLog({ userName, userRole, action: `Update Mitra: ${updated.name} (${id})`, module: 'Mitra & Fundraising', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, partner: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/partners/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { id } = req.params;
    const old = await dbDriver.getDoc('partners', id);
    await dbDriver.updateDoc('partners', id, { deleted: true, deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Mitra: ${old?.name || id} (Soft-Delete)`, module: 'Mitra & Fundraising' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/partners/donations  — semua donasi
// ─────────────────────────────────────────────────────────────────────────────
router.get('/donations/all', authenticateToken, async (_req: any, res: Response) => {
  try {
    const donations = (await dbDriver.getDocs('donations')).filter((d: any) => !d.deleted);
    res.json(donations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/partners/:partnerId/donations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:partnerId/donations', authenticateToken, async (req: any, res: Response) => {
  try {
    const { partnerId } = req.params;
    const donations = (await dbDriver.getDocs('donations'))
      .filter((d: any) => !d.deleted && d.partnerId === partnerId);
    res.json(donations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/partners/:partnerId/donations  — tambah donasi + auto-post tx (atomik BE)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:partnerId/donations', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { partnerId } = req.params;
    const partner = await dbDriver.getDoc('partners', partnerId);
    const donationId = await generateDonationId();

    const donation = cleanObjectForFirestore({
      ...req.body,
      id: donationId,
      partnerId,
      partnerName: req.body.partnerName || partner?.name || '',
      createdBy: userName,
      createdAt: new Date().toISOString(),
      deleted: false,
    });

    await dbDriver.setDoc('donations', donationId, donation);

    // Auto-post transaksi keuangan dari BE
    const txId = await createDonationTransaction(donation, userName, userRole);

    await writeAuditLog({
      userName, userRole,
      action: `Registrasi Donasi ${donationId} dari "${donation.partnerName}" Rp ${Number(donation.amount).toLocaleString('id-ID')}. Auto-posted TX: ${txId}`,
      module: 'Mitra & Fundraising',
      afterValue: JSON.stringify(donation),
    });

    res.json({ success: true, id: donationId, transactionId: txId, donation });
  } catch (err: any) {
    console.error('[partners/donations POST]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/partners/:partnerId/donations/:did  — update donasi + sinkronisasi tx
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:partnerId/donations/:did', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { partnerId, did } = req.params;
    const old = await dbDriver.getDoc('donations', did);

    const updated = cleanObjectForFirestore({
      ...old, ...req.body,
      id: did, partnerId,
      updatedBy: userName, updatedAt: new Date().toISOString(),
    });
    await dbDriver.setDoc('donations', did, updated);

    // Sinkronisasi transaksi terkait di BE
    const allTx = await dbDriver.getDocs('transactions');
    const matchedTx = allTx.find((t: any) => t.reference_id === did && !t.deleted);
    if (matchedTx) {
      const updatedTx = cleanObjectForFirestore({
        ...matchedTx,
        amount: Number(updated.amount),
        date: updated.date,
        transaction_date: updated.date,
        description: `[Autoposting Fundraising CRM - Updated] Donasi masuk dari Mitra: ${updated.partnerName}. Channel: ${updated.channel}. Notes: ${updated.notes || '-'}`,
        sourceOrRecipient: updated.partnerName,
        updated_at: new Date().toISOString(),
      });
      await dbDriver.setDoc('transactions', matchedTx.id, updatedTx);
      await syncTransactionSubcollections(updatedTx, false, userRole, userName);

      // Recalculate dan simpan snapshot kas
      const { computeKasBalance: cKb } = await import('./finance.routes');
      const bal = await cKb();
      await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({ id: 'main', balance: bal, lastUpdated: new Date().toISOString(), updatedBy: userName }));
    }

    await writeAuditLog({ userName, userRole, action: `Update Donasi ${did} dari "${updated.partnerName}" Rp ${Number(updated.amount).toLocaleString('id-ID')}`, module: 'Mitra & Fundraising', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, donation: updated });
  } catch (err: any) {
    console.error('[partners/donations PUT]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/partners/:partnerId/donations/:did  — hapus donasi + revert tx
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:partnerId/donations/:did', authenticateToken, async (req: any, res: Response) => {
  const { userName, userRole } = auditFromReq(req);
  try {
    const { did } = req.params;
    const old = await dbDriver.getDoc('donations', did);
    if (!old) return res.status(404).json({ success: false, message: 'Donasi tidak ditemukan.' });

    // Hard delete donasi
    await dbDriver.deleteDoc('donations', did);

    // Revert transaksi terkait
    const allTx = await dbDriver.getDocs('transactions');
    const matchedTx = allTx.find((t: any) => t.reference_id === did);
    if (matchedTx) {
      await dbDriver.deleteDoc('transactions', matchedTx.id);
      await syncTransactionSubcollections({ id: matchedTx.id }, true, userRole, userName);

      const bal = await computeKasBalance();
      await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({ id: 'main', balance: bal, lastUpdated: new Date().toISOString(), updatedBy: userName }));
    }

    await writeAuditLog({
      userName, userRole,
      action: `Hapus Donasi ${did} dari "${old.partnerName}" Rp ${Number(old.amount).toLocaleString('id-ID')}. Jurnal terkait dihapus.`,
      module: 'Mitra & Fundraising',
      beforeValue: JSON.stringify(old),
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[partners/donations DELETE]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export const partnersRouter = router;
export default partnersRouter;
