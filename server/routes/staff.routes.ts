import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore, syncTransactionSubcollections } from '../services/transaction-sync.service';
import { generateTransactionId, generateStaffNik } from '../utils/id-generator';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';
import { computeKasBalance } from './finance.routes';

const router = Router();

// ─── Helper: Hitung komponen gaji seorang staff ──────────────────────────────
function computeNetSalary(staff: any): {
  grossSalary: number;
  totalAllowance: number;
  totalDeduction: number;
  netSalary: number;
} {
  const salaryBase = Number(staff.salaryBase || 0);
  const allowancePosition = Number(staff.allowancePosition || 0);
  const allowanceHousing = Number(staff.allowanceHousing || 0);
  const allowanceTransport = Number(staff.allowanceTransport || 0);
  const allowanceComm = Number(staff.allowanceComm || 0);
  const bonus = Number(staff.bonus || 0);
  const thr = Number(staff.thr || 0);
  const bpjsAllowance = Number(staff.bpjsAllowance || 0);

  // Custom fields
  const customAllowances = (staff.customFields || [])
    .filter((f: any) => f.type === 'allowance')
    .reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

  const taxDeduction = Number(staff.taxDeduction || 0);
  const bpjsDeduction = Number(staff.bpjsDeduction || 0);
  const kasbonDeduction = Number(staff.kasbonDeduction || 0);
  const otherDeduction = Number(staff.otherDeduction || 0);

  const customDeductions = (staff.customFields || [])
    .filter((f: any) => f.type === 'deduction')
    .reduce((s: number, f: any) => s + Number(f.amount || 0), 0);

  const lastMonthUnpaid = Number(staff.lastMonthUnpaid || 0);

  const totalAllowance = allowancePosition + allowanceHousing + allowanceTransport + allowanceComm + bonus + thr + bpjsAllowance + customAllowances;
  const grossSalary = salaryBase + totalAllowance;
  const totalDeduction = taxDeduction + bpjsDeduction + kasbonDeduction + otherDeduction + customDeductions;
  const netSalary = grossSalary - totalDeduction + lastMonthUnpaid;

  return { grossSalary, totalAllowance, totalDeduction, netSalary };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/staff
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const role = req.user?.role;
    const features = req.user?.features || [];
    const hasReportsAccess = Array.isArray(features) && features.includes('reports');
    const hasStaffTasksAccess = Array.isArray(features) && features.includes('staff_tasks');
    const isPrivileged = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan' || role === 'Bendahara' || hasReportsAccess || hasStaffTasksAccess;

    let staffList = (await dbDriver.getDocs('staff')).filter((s: any) => !s.deleted);

    if (!isPrivileged) {
      const userEmail = req.user?.email?.toLowerCase().trim();
      staffList = staffList.filter((s: any) =>
        s.email?.toLowerCase().trim() === userEmail ||
        s.phone?.trim() === userEmail ||
        userEmail?.startsWith(s.phone?.trim() || '__')
      );
    }

    res.json(staffList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/staff  — tambah staff (BE generate NIK)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const nik = await generateStaffNik();
    const staff = cleanObjectForFirestore({
      ...req.body, nik,
      createdBy: userName,
      createdAt: new Date().toISOString(),
      deleted: false,
    });
    await dbDriver.setDoc('staff', nik, staff);
    await writeAuditLog({ userName, userRole, action: `Tambah Staff Baru NIK: ${nik} — ${staff.name}`, module: 'Kepegawaian', afterValue: JSON.stringify(staff) });
    res.json({ success: true, nik, staff });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/staff/:nik
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:nik', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { nik } = req.params;
    const old = await dbDriver.getDoc('staff', nik);
    const updated = cleanObjectForFirestore({ ...old, ...req.body, nik, updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('staff', nik, updated);
    await writeAuditLog({ userName, userRole, action: `Update Staff NIK: ${nik} — ${updated.name}`, module: 'Kepegawaian', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(updated) });
    res.json({ success: true, staff: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/staff/:nik  — soft delete
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:nik', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { nik } = req.params;
    const old = await dbDriver.getDoc('staff', nik);
    await dbDriver.updateDoc('staff', nik, { deleted: true, status: 'Resigned', deletedAt: new Date().toISOString(), deletedBy: userName });
    await writeAuditLog({ userName, userRole, action: `Hapus Staff NIK: ${nik} — ${old?.name || ''} (Soft-Delete/Resigned)`, module: 'Kepegawaian' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/staff/:nik/salary
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:nik/salary', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const userEmail = req.user?.email?.toLowerCase();
  const isPrivileged = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan' || role === 'Bendahara' || features.includes('reports');

  try {
    const { nik } = req.params;
    const staff = await dbDriver.getDoc('staff', nik);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff tidak ditemukan.' });

    // Non-privileged hanya bisa lihat data sendiri
    if (!isPrivileged && staff.email?.toLowerCase() !== userEmail && !userEmail?.startsWith(staff.phone || '__')) {
      return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
    }

    const calculation = computeNetSalary(staff);
    res.json({ success: true, nik, staff, calculation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/staff/:nik/salary  — update komponen gaji
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:nik/salary', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { nik } = req.params;
    const old = await dbDriver.getDoc('staff', nik);
    const salaryFields = [
      'salaryBase', 'allowancePosition', 'allowanceHousing', 'allowanceTransport',
      'allowanceComm', 'bonus', 'thr', 'bpjsAllowance',
      'taxDeduction', 'bpjsDeduction', 'kasbonDeduction', 'otherDeduction',
      'customFields', 'paidAmount', 'lastMonthUnpaid', 'lastPayrollMonth',
    ];
    const salaryUpdate: any = {};
    for (const field of salaryFields) {
      if (req.body[field] !== undefined) salaryUpdate[field] = req.body[field];
    }
    const updated = cleanObjectForFirestore({ ...old, ...salaryUpdate, nik, updatedBy: userName, updatedAt: new Date().toISOString() });
    await dbDriver.setDoc('staff', nik, updated);
    await writeAuditLog({ userName, userRole, action: `Update Komponen Gaji Staff NIK: ${nik}`, module: 'Payroll', beforeValue: JSON.stringify(old), afterValue: JSON.stringify(salaryUpdate) });
    res.json({ success: true, staff: updated, calculation: computeNetSalary(updated) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Payroll — GET /api/staff/payroll/calculate/:nik  — hitung take-home pay
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payroll/calculate/:nik', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const isPrivileged = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan' || role === 'Bendahara' || features.includes('reports');
  if (!isPrivileged) return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  try {
    const staff = await dbDriver.getDoc('staff', req.params.nik);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff tidak ditemukan.' });
    res.json({ success: true, nik: req.params.nik, staff, calculation: computeNetSalary(staff) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Payroll — GET /api/staff/payroll/calculate-all  — hitung semua staff
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payroll/calculate-all', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const features = req.user?.features || [];
  const isPrivileged = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Pengawas Yayasan' || role === 'Bendahara' || features.includes('reports');
  if (!isPrivileged) return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  try {
    const allStaff = (await dbDriver.getDocs('staff')).filter((s: any) => !s.deleted && s.status !== 'Resigned');
    const results = allStaff.map((s: any) => ({
      nik: s.nik,
      name: s.name,
      position: s.position,
      division: s.division,
      calculation: computeNetSalary(s),
    }));
    const totalPayroll = results.reduce((sum: number, r: any) => sum + r.calculation.netSalary, 0);
    res.json({ success: true, month: req.query.month || new Date().toISOString().slice(0, 7), results, totalPayroll });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Payroll — POST /api/staff/payroll/process  — proses payroll sebulan (atomik)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payroll/process', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { month, staffNiks } = req.body; // month: 'YYYY-MM', staffNiks: string[] (optional)
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    let allStaff = (await dbDriver.getDocs('staff')).filter((s: any) => !s.deleted && s.status !== 'Resigned');
    if (Array.isArray(staffNiks) && staffNiks.length > 0) {
      allStaff = allStaff.filter((s: any) => staffNiks.includes(s.nik));
    }

    const processedNiks: string[] = [];
    let totalPayout = 0;

    for (const staff of allStaff) {
      const calc = computeNetSalary(staff);
      totalPayout += calc.netSalary;

      // Buat transaksi expense penggajian
      const txId = await generateTransactionId();
      const balanceBefore = await computeKasBalance();
      const tx = cleanObjectForFirestore({
        id: txId,
        transaction_code: txId,
        type: 'Expense',
        source: 'payroll',
        category_id: 'Penggajian Staff',
        amount: calc.netSalary,
        description: `[Payroll ${targetMonth}] Gaji ${staff.name} (${staff.nik}) — Net: Rp ${calc.netSalary.toLocaleString('id-ID')}`,
        transaction_date: new Date().toISOString().split('T')[0],
        created_by: userName,
        reference_id: staff.nik,
        reference_type: 'payroll',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        date: new Date().toISOString().split('T')[0],
        category: 'Penggajian Staff',
        sourceOrRecipient: staff.name,
        status: 'Approved',
        deleted: false,
      });
      await dbDriver.setDoc('transactions', txId, tx);

      const { syncTransactionSubcollections: sync } = await import('../services/transaction-sync.service');
      await sync(tx, false, userRole, userName);

      const balanceAfter = await computeKasBalance();
      await dbDriver.setDoc('kas', 'main', cleanObjectForFirestore({ id: 'main', balance: balanceAfter, lastUpdated: new Date().toISOString(), updatedBy: userName }));

      // Update lastPayrollMonth & reset kasbonDeduction ke 0 setelah dipotong
      await dbDriver.updateDoc('staff', staff.nik, {
        lastPayrollMonth: targetMonth,
        paidAmount: calc.netSalary,
        kasbonDeduction: 0, // Reset kasbon setelah dipotong
        updatedAt: new Date().toISOString(),
      });

      processedNiks.push(staff.nik);
    }

    await writeAuditLog({
      userName, userRole,
      action: `[Payroll] Proses penggajian bulan ${targetMonth} untuk ${processedNiks.length} staff. Total payout: Rp ${totalPayout.toLocaleString('id-ID')}`,
      module: 'Payroll',
    });

    res.json({ success: true, month: targetMonth, processedCount: processedNiks.length, processedNiks, totalPayout });
  } catch (err: any) {
    console.error('[staff/payroll/process]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/staff/payroll/kasbon/:nik  — tambah kasbon
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payroll/kasbon/:nik', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { nik } = req.params;
    const { amount, notes } = req.body;
    const staff = await dbDriver.getDoc('staff', nik);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff tidak ditemukan.' });

    const currentKasbon = Number(staff.kasbonDeduction || 0);
    const newKasbon = currentKasbon + Number(amount);
    await dbDriver.updateDoc('staff', nik, { kasbonDeduction: newKasbon, updatedAt: new Date().toISOString() });

    await writeAuditLog({
      userName, userRole,
      action: `Tambah Kasbon Staff ${staff.name} (${nik}): Rp ${Number(amount).toLocaleString('id-ID')}. Notes: ${notes || '-'}`,
      module: 'Payroll',
    });

    res.json({ success: true, nik, previousKasbon: currentKasbon, addedAmount: Number(amount), newKasbon });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Career History
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:nik/career-history', authenticateToken, async (req: any, res: Response) => {
  try {
    const { nik } = req.params;
    const history = (await dbDriver.getDocs('career_history')).filter((c: any) => !c.deleted && c.staffNik === nik);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:nik/career-history', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Pembina Yayasan' && role !== 'Bendahara') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { nik } = req.params;
    const id = `CAR-${Date.now()}`;
    const entry = cleanObjectForFirestore({ ...req.body, id, staffNik: nik, createdBy: userName, createdAt: new Date().toISOString(), deleted: false });
    await dbDriver.setDoc('career_history', id, entry);
    await writeAuditLog({ userName, userRole, action: `Tambah Riwayat Karir Staff NIK: ${nik}`, module: 'Kepegawaian' });
    res.json({ success: true, id, entry });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const staffRouter = router;
export default staffRouter;
