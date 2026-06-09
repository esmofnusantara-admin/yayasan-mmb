/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash, 
  Trash2,
  Settings,
  Wallet, 
  Printer, 
  Lock,
  PlusCircle,
  Coins,
  ChevronRight,
  Calculator,
  User,
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Staff, CustomPayrollField, ApprovalRequest, StaffSalary, SalaryComponent } from '../types';
import { exportToCSV, exportSlipToPDF } from '../utils/export';

interface PayrollTabProps {
  staffs: Staff[];
  onUpdateStaff: (s: Staff) => void;
  currentRole: string;
  onPostApproval: (app: ApprovalRequest) => void;
  transactions: any[];
  onAddTransaction: (tx: any) => Promise<void>;
  salaries?: StaffSalary[];
  onUpdateSalary?: (s: StaffSalary) => void;
}

const DEFAULT_PUBLIC_FIELDS = [
  { id: 'allowancePosition', name: 'Tunjangan Jabatan', type: 'allowance', property: 'allowancePosition' },
  { id: 'allowanceHousing', name: 'Tunjangan Perumahan', type: 'allowance', property: 'allowanceHousing' },
  { id: 'allowanceTransport', name: 'Tunjangan Transport', type: 'allowance', property: 'allowanceTransport' },
  { id: 'allowanceComm', name: 'Tunjangan Komunikasi', type: 'allowance', property: 'allowanceComm' },
  { id: 'bpjsAllowance', name: 'Premi BPJS Allowance', type: 'allowance', property: 'bpjsAllowance' },
  { id: 'taxDeduction', name: 'Pajak PPH21 Bruto', type: 'deduction', property: 'taxDeduction' },
  { id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', type: 'deduction', property: 'bpjsDeduction' },
  { id: 'kasbonDeduction', name: 'Kasbon / Angsuran', type: 'deduction', property: 'kasbonDeduction' },
];

export default function PayrollTab({
  staffs,
  onUpdateStaff,
  currentRole,
  onPostApproval,
  transactions,
  onAddTransaction,
  salaries = [],
  onUpdateSalary,
}: PayrollTabProps) {
  const [editingSalary, setEditingSalary] = useState<StaffSalary | null>(null);
  const [publicFields, setPublicFields] = useState<any[]>(() => {
    const saved = localStorage.getItem('siad_public_payroll_fields');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_PUBLIC_FIELDS;
  });

  const savePublicFields = (newFields: any[]) => {
    setPublicFields(newFields);
    localStorage.setItem('siad_public_payroll_fields', JSON.stringify(newFields));
  };

  // Helper to retrieve salary configuration from the salaries collection, or fallback to default
  const getStaffSalaryConfig = (nik: string, baseFromStaff: number): StaffSalary => {
    const found = salaries.find(sal => sal.id === nik);
    if (found) {
      return found;
    }
    return {
      id: nik,
      salaryBase: baseFromStaff,
      components: [
        { id: 'allowancePosition', name: 'Tunjangan Jabatan', amount: 0, type: 'allowance' },
        { id: 'allowanceHousing', name: 'Tunjangan Perumahan', amount: 0, type: 'allowance' },
        { id: 'allowanceTransport', name: 'Tunjangan Transport', amount: 0, type: 'allowance' },
        { id: 'allowanceComm', name: 'Tunjangan Komunikasi', amount: 0, type: 'allowance' },
        { id: 'bpjsAllowance', name: 'Premi BPJS Allowance', amount: 0, type: 'allowance' },
        { id: 'taxDeduction', name: 'Pajak PPH21 Bruto', amount: 0, type: 'deduction' },
        { id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', amount: 0, type: 'deduction' }
      ]
    };
  };

  // Helper to dynamically calculate base, standard public components, and individual components for a Staff member
  const getStaffFinancialBreakdown = (s: Staff) => {
    const config = getStaffSalaryConfig(s.nik, s.salaryBase);
    
    let baseSalary = config.salaryBase;
    let totalAllowanceCombined = 0;
    let totalDeductionCombined = 0;

    config.components.forEach(comp => {
      if (comp.type === 'allowance') {
        totalAllowanceCombined += comp.amount;
      } else {
        totalDeductionCombined += comp.amount;
      }
    });

    const netSalarySum = baseSalary + totalAllowanceCombined - totalDeductionCombined;

    return {
      stdAllowance: 0,
      stdDeduction: 0,
      customAllowance: totalAllowanceCombined,
      customDeduction: totalDeductionCombined,
      totalAllowanceCombined,
      totalDeductionCombined,
      netSalarySum
    };
  };

  // Calculates Net Salary (Take-Home Pay) for a developer-defined staff
  function getStaffNetSalary(s: Staff) {
    return getStaffFinancialBreakdown(s).netSalarySum;
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [editingPayrollStaff, setEditingPayrollStaff] = useState<Staff | null>(null);
  const [activeSlipStaff, setActiveSlipStaff] = useState<Staff | null>(null);

  // States for target payroll day
  const [targetPayrollDay, setTargetPayrollDay] = useState<number>(() => {
    return Number(localStorage.getItem('esm_target_payroll_day') || '7');
  });

  // Keep target payroll day state synchronized with LocalStorage
  useEffect(() => {
    localStorage.setItem('esm_target_payroll_day', String(targetPayrollDay));
  }, [targetPayrollDay]);

  // Derive cumulative paid amounts directly from Firestore staffs data mapping
  const staffPaidAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    staffs.forEach(s => {
      map[s.nik] = s.paidAmount || 0;
    });
    return map;
  }, [staffs]);

  // Derive payroll logs directly from live global Firestore Transactions ledger!
  const paymentLogs = useMemo(() => {
    return transactions
      .filter(t => t.id.startsWith('TX-PAY-') && t.status === 'Approved')
      .map(t => {
        let termLabel = 'Termin';
        if (t.description.includes('Lunas 100%')) {
          termLabel = 'Lunas 100%';
        } else if (t.description.includes('Termin')) {
          const match = t.description.match(/Termin \(([^)]+)\)/);
          if (match) termLabel = `Termin (${match[1]})`;
        }
        return {
          id: t.id,
          date: t.date,
          term: termLabel,
          amount: t.amount,
          description: t.description
        };
      })
      .sort((a, b) => b.id.localeCompare(a.id)); // Newest first
  }, [transactions]);

  // States for dynamic custom payment builder form in the tab
  const [selectedStaffsForPay, setSelectedStaffsForPay] = useState<string[]>([]);
  const [selectedTerminTab, setSelectedTerminTab] = useState<number>(1);
  const [payMode, setPayMode] = useState<'percent' | 'full' | 'custom'>('percent');
  const [payPercentValue, setPayPercentValue] = useState<number>(35);
  const [customNominalValue, setCustomNominalValue] = useState<number>(1000000);

  // Dynamically calculate visible termins based on staff payment status (remaining balance metrics)
  const availableTermins = useMemo(() => {
    const list = [1];
    const hasPartiallyPaid = staffs.some(s => {
      const thp = getStaffNetSalary(s);
      const paid = staffPaidAmounts[s.nik] || 0;
      return paid > 0 && paid < thp;
    });

    if (hasPartiallyPaid) {
      list.push(2);
      // If there are still staffs whose sisa saldo is under 100%, show Termin 3, but if they are 100% paid, do not add Termin 3
      const anyStillUnder100 = staffs.some(s => {
        const thp = getStaffNetSalary(s);
        const paid = staffPaidAmounts[s.nik] || 0;
        return paid > 0 && paid < thp;
      });
      if (anyStillUnder100) {
        list.push(3);
      }
    }
    return list;
  }, [staffs, staffPaidAmounts]);

  // States for new manual custom allowance/deduction additions inside the modal
  const [customFieldName, setCustomFieldName] = useState('');
  const [customFieldAmount, setCustomFieldAmount] = useState<number>(0);
  const [customFieldType, setCustomFieldType] = useState<'allowance' | 'deduction'>('allowance');

  // Authorization definitions
  const canModifyPayroll = ['Super Admin', 'Ketua Yayasan', 'Bendahara'].includes(currentRole);
  const canViewPayroll = ['Super Admin', 'Ketua Yayasan', 'Bendahara'].includes(currentRole);

  const finalKasBalance = useMemo(() => {
    const approvedTx = (transactions || []).filter(t => t.status === 'Approved');
    const totalIncome = approvedTx
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = approvedTx
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return totalIncome - totalExpense;
  }, [transactions]);

  const totalPayrollSum = useMemo(() => {
    let sum = 0;
    selectedStaffsForPay.forEach(nik => {
      const s = staffs.find(x => x.nik === nik);
      if (!s) return;
      const thp = getStaffNetSalary(s);
      const unpaid = thp - (staffPaidAmounts[nik] || 0);
      let val = 0;
      if (payMode === 'percent') val = Math.min(unpaid, Math.round(thp * (payPercentValue / 100)));
      else if (payMode === 'full') val = unpaid;
      else if (payMode === 'custom') val = Math.min(unpaid, customNominalValue);
      sum += val;
    });
    return sum;
  }, [selectedStaffsForPay, staffs, staffPaidAmounts, payMode, payPercentValue, customNominalValue]);

  const filteredStaffs = staffs.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.position.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.nik.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculates Next payroll calendar date dynamically based on chosen day of month
  const getNextPayrollDate = (dayNum: number) => {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth(); // 0-11
    
    if (today.getDate() > dayNum) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    
    const maxDays = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(dayNum, maxDays);
    const nextPayday = new Date(year, month, safeDay);
    
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return nextPayday.toLocaleDateString('id-ID', options);
  };

  const handleExportCSV = () => {
    const dataWithTotals = filteredStaffs.map(s => {
      const {
        totalAllowanceCombined: totalAllowance,
        totalDeductionCombined: totalDeduction,
        netSalarySum: netSalary
      } = getStaffFinancialBreakdown(s);

      return {
        ...s,
        totalAllowance,
        totalDeduction,
        netSalary
      };
    });

    const headers = [
      'NIK',
      'Nama Staff',
      'Jabatan',
      'Divisi',
      'Gaji Pokok Base (IDR)',
      'Total Seluruh Tunjangan',
      'Total Seluruh Potongan',
      'Take-Home Pay (Gaji Bersih)'
    ];
    const keys = [
      'nik',
      'name',
      'position',
      'division',
      'salaryBase',
      'totalAllowance',
      'totalDeduction',
      'netSalary'
    ];
    exportToCSV(dataWithTotals, headers, keys, `payroll_rekap_gaji_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  // Calculate high-level summary metrics
  const totalBaseSalary = staffs.reduce((sum, s) => sum + s.salaryBase, 0);
  
  const totalAllowances = staffs.reduce((sum, s) => {
    return sum + getStaffFinancialBreakdown(s).totalAllowanceCombined;
  }, 0);

  const totalDeductions = staffs.reduce((sum, s) => {
    return sum + getStaffFinancialBreakdown(s).totalDeductionCombined;
  }, 0);

  const totalNetPayout = (totalBaseSalary + totalAllowances) - totalDeductions;

  // Real "Dana Gaji Terbayar" derived dynamically based on cumulative staff payments
  const totalNetPaid = staffs.reduce((sum, s) => {
    const thp = getStaffNetSalary(s);
    const paid = staffPaidAmounts[s.nik] || 0;
    return sum + Math.min(paid, thp);
  }, 0);

  const remainingUnpaidSalary = Math.max(0, totalNetPayout - totalNetPaid);

  // System treasury balance derived from global transactions
  const approvedTx = transactions.filter(t => t.status === 'Approved');
  const totalIncome = approvedTx.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = approvedTx.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const currentSystemBalance = totalIncome - totalExpense;

  const isBalanceSufficient = currentSystemBalance >= remainingUnpaidSalary;

  const handlePayCustomTermin = async () => {
    if (selectedStaffsForPay.length === 0) {
      alert("Silakan pilih minimal satu staf untuk memproses pembayaran!");
      return;
    }

    let totalDisbursed = 0;
    const updatedPaidMap = { ...staffPaidAmounts };
    const paymentDetailsList: string[] = [];
    const affectedStaffNames: string[] = [];

    selectedStaffsForPay.forEach(nik => {
      const s = staffs.find(x => x.nik === nik);
      if (!s) return;
      const thp = getStaffNetSalary(s);
      const alreadyPaid = updatedPaidMap[nik] || 0;
      const unpaid = Math.max(0, thp - alreadyPaid);

      if (unpaid <= 0) return;

      let payAmount = 0;
      if (payMode === 'percent') {
        const calculateAmount = Math.round(thp * (payPercentValue / 100));
        payAmount = Math.min(unpaid, calculateAmount);
      } else if (payMode === 'full') {
        payAmount = unpaid;
      } else if (payMode === 'custom') {
        payAmount = Math.min(unpaid, customNominalValue);
      }

      if (payAmount > 0) {
        updatedPaidMap[nik] = Math.round(alreadyPaid + payAmount);
        totalDisbursed += payAmount;
        const finalPaidPercent = Math.round((updatedPaidMap[nik] / thp) * 100);
        paymentDetailsList.push(`${s.name} (+Rp ${payAmount.toLocaleString('id-ID')} -> Sisa: ${100 - finalPaidPercent}%)`);
        affectedStaffNames.push(s.name);
      }
    });

    if (totalDisbursed <= 0) {
      alert("Tidak ada sisa nominal gaji yang perlu dibayarkan pada staf terpilih (sudah lunas 100% atau nominal bayar 0).");
      return;
    }

    if (currentSystemBalance < totalDisbursed) {
      alert(`Waduh, saldo dana kas saat ini (Rp ${currentSystemBalance.toLocaleString('id-ID')}) tidak mencukupi untuk memproses pembayaran gaji sebesar Rp ${totalDisbursed.toLocaleString('id-ID')}. Silakan entri pemasukan kas terlebih dahulu di menu Keuangan.`);
      return;
    }

    const termLabelOfPayment = payMode === 'full' ? 'Lunas 100%' : `Termin (${payPercentValue}%)`;
    // Record dynamic transaction entry
    const txId = `TX-PAY-${Date.now()}`;
    const newTx = {
      id: txId,
      date: new Date().toISOString().split('T')[0],
      category: 'Payroll Staff & BPJS',
      description: `[Pencairan Gaji] Pembayaran Gaji - ${termLabelOfPayment} untuk ${paymentDetailsList.length} karyawan. Rincian: ${paymentDetailsList.join(', ')}`,
      amount: totalDisbursed,
      type: 'Expense' as 'Expense',
      sourceOrRecipient: `${paymentDetailsList.length} Orang Staff`,
      status: 'Approved' as 'Approved',
      approvedBy: `${currentRole} Operator`
    };

    try {
      await onAddTransaction(newTx);
      
      // Update each staff document in Firestore with their new cumulative paid amount
      for (const nik of selectedStaffsForPay) {
        const s = staffs.find(x => x.nik === nik);
        if (!s) continue;
        const nextPaid = updatedPaidMap[nik];
        if (nextPaid !== undefined && nextPaid !== (s.paidAmount || 0)) {
          await onUpdateStaff({
            ...s,
            paidAmount: nextPaid
          });
        }
      }

      setSelectedStaffsForPay([]);

      alert(`Pencairan Pembayaran Gaji Berhasil! Dana Rp ${totalDisbursed.toLocaleString('id-ID')} otomatis ditarik dari Buku Kas Yayasan.`);
    } catch (err) {
      console.error(err);
      alert("Terjadi kegagalan saat mendaftarkan pencairan transaksi ke kas.");
    }
  };

  const handleResetPayments = async () => {
    if (window.confirm('Apakah Anda yakin ingin menyetel ulang rekapitulasi pembayaran gaji dan termin karyawan bulan ini? Semua pencatatan cicilan staf akan dimulai dari 0%.')) {
      try {
        for (const s of staffs) {
          if (s.paidAmount && s.paidAmount > 0) {
            await onUpdateStaff({
              ...s,
              paidAmount: 0
            });
          }
        }
        alert('Rekapitulasi pembayaran gaji berhasil disetel ulang ke 0%!');
      } catch (err) {
        console.error(err);
        alert('Gagal menyetujui penyetelan ulang gaji.');
      }
    }
  };

  // Save the modified payroll fields back to state / Firebase
  const handleSavePayrollSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalary || !onUpdateSalary) return;
    onUpdateSalary(editingSalary);
    setEditingPayrollStaff(null);
    setEditingSalary(null);
  };

  // Add a manual custom payroll field in the editor modal
  const handleAddCustomField = () => {
    if (!editingSalary) return;
    if (!customFieldName.trim()) {
      alert('Nama komponen tambahan wajib diisi!');
      return;
    }
    if (customFieldAmount <= 0) {
      alert('Jumlah rupiah komponen tambahan harus lebih dari 0!');
      return;
    }

    const newField: SalaryComponent = {
      id: `FLD-${Date.now()}`,
      name: customFieldName.trim(),
      amount: Number(customFieldAmount),
      type: customFieldType
    };

    const updatedSalary: StaffSalary = {
      ...editingSalary,
      components: [...editingSalary.components, newField]
    };

    setEditingSalary(updatedSalary);
    setCustomFieldName('');
    setCustomFieldAmount(0);
  };

  // Remove a manual custom payroll field by ID in the editor modal
  const handleRemoveCustomField = (id: string) => {
    if (!editingSalary) return;
    const updatedSalary: StaffSalary = {
      ...editingSalary,
      components: editingSalary.components.filter(f => f.id !== id)
    };
    setEditingSalary(updatedSalary);
  };

  // Submit collective payroll process to Approval Center
  const handleSubmitCollectivePayroll = () => {
    const totalGajiBersih = staffs.reduce((sum, s) => {
      return sum + getStaffNetSalary(s);
    }, 0);

    const app: ApprovalRequest = {
      id: `APP-PAYROLL-${Date.now()}`,
      module: 'Payroll',
      title: 'Pencairan Payroll Staff Bulanan (Custom Fields)',
      description: `Pengajuan payroll gaji kolektif untuk ${staffs.length} staff dengan detail tunjangan dan potongan manual. Total dana kas siap cair: Rp ${totalGajiBersih.toLocaleString('id-ID')}`,
      amount: totalGajiBersih,
      requestedBy: currentRole,
      requestedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'Pending',
      referenceId: 'PAYROLL-COLLECTIVE'
    };
    onPostApproval(app);
    alert('Pengajuan anggaran payroll kolektif berhasil dikirim ke Approval Center! Menunggu persetujuan atau disposisi Ketua Yayasan.');
  };

  if (!canViewPayroll) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
        <div className="w-16 h-16 bg-slate-50 border border-slate-200/50 rounded-full mx-auto flex items-center justify-center text-slate-400">
          <Lock className="w-8 h-8 text-slate-300 animate-pulse" />
        </div>
        <h3 className="text-md font-bold text-slate-850">Akomodasi Keamanan Terbatas</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Maaf, Anda tidak memiliki izin akses untuk mengulas sistem Payroll, data remunerasi atau slip gaji. Silakan beralih ke peran **Bendahara**, **Ketua Yayasan**, atau **Super Admin**.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Sistem Payroll & Gaji SDM</h2>
          <p className="text-xs text-slate-500 mt-1">Kelola gaji pokok, tunjangan standar, slip gaji PDF, dan tambahkan parameter rincian tunjangan/potongan secara manual.</p>
        </div>
        
        {canModifyPayroll && (
          <button 
            onClick={handleSubmitCollectivePayroll}
            className="px-4 py-2 bg-indigo-650 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-slate-900/10 cursor-pointer transition-colors"
          >
            <Wallet className="w-4 h-4 text-emerald-350" /> Ajukan Anggaran Payroll Kolektif
          </button>
        )}
      </div>

      {/* Financial aggregate metrics dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Card 1: Total Staf */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Total Staff</span>
            <div className="bg-slate-50 p-1.5 rounded-lg text-slate-600">
              <User className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="mt-1">
            <strong className="text-lg text-slate-800 font-extrabold block font-sans">{staffs.length} Orang</strong>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Penerima Bulanan</span>
          </div>
        </div>

        {/* Card 2: Total Gaji THP Staff */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Total Gaji THP</span>
            <div className="bg-indigo-55/40 p-1.5 rounded-lg text-indigo-600">
              <Calculator className="w-4 h-4 text-indigo-650" />
            </div>
          </div>
          <div className="mt-1">
            <strong className="text-[13px] sm:text-[14px] text-slate-800 font-bold block font-mono">
              Rp {totalNetPayout.toLocaleString('id-ID')}
            </strong>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Beban Gaji Bersih</span>
          </div>
        </div>

        {/* Card 3: Tanggal Penggajian Berikutnya */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Gajian Berikutnya</span>
            <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-1">
            <select 
              value={targetPayrollDay}
              onChange={(e) => setTargetPayrollDay(Number(e.target.value))}
              className="w-full text-[10px] font-semibold text-slate-800 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-lg px-1.5 py-0.5 outline-none font-mono"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>Setiap Tanggal {day}</option>
              ))}
            </select>
            <span className="text-[8px] text-amber-600 block mt-1 font-semibold leading-tight font-sans">
              Cair: {getNextPayrollDate(targetPayrollDay)}
            </span>
          </div>
        </div>

        {/* Card 4: Dana Gaji Terbayar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Gaji Terbayar</span>
            <div className={`p-1.5 rounded-lg ${totalNetPaid >= totalNetPayout ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-0.5">
            <strong className="text-[13px] text-slate-800 font-bold block font-mono">
              Rp {totalNetPaid.toLocaleString('id-ID')}
            </strong>
            <div className="mt-0.5 flex items-center">
              {totalNetPaid >= totalNetPayout ? (
                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                  Lunas 100%
                </span>
              ) : totalNetPaid > 0 ? (
                <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider animate-pulse">
                  Termin Aktif
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                  Belum Bayar
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 5: Saldo Saat Ini (Dynamic Red/Green depending on sufficiency) */}
        <div className={`p-4 rounded-2xl border-2 shadow-sm flex flex-col justify-between h-28 transition-all ${
          isBalanceSufficient 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
            : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider font-mono opacity-80">Saldo Saat Ini</span>
            <div className={`p-1.5 rounded-lg ${isBalanceSufficient ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <strong className="text-[14px] text-slate-900 font-extrabold block font-mono">
              Rp {currentSystemBalance.toLocaleString('id-ID')}
            </strong>
            <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Buku Kas Jurnal</span>
            
            <div className="mt-1 flex items-center gap-1">
              {isBalanceSufficient ? (
                <span className="text-[8px] font-bold text-emerald-700 flex items-center gap-0.5">
                  ✓ Saldo Cukup
                </span>
              ) : (
                <span className="text-[8px] font-bold text-rose-700 flex items-center gap-0.5 animate-pulse">
                  ⚠️ Kurang: Rp {remainingUnpaidSalary.toLocaleString('id-ID')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Sistem Pembayaran Termin & Kontrol Gaji (Auto-Calculated & Multi-Employee Choice) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-indigo-600" />
              Sistem Pembayaran Payroll Termin Kolektif & Jurnal Buku Besar
            </h3>
            <p className="text-[11px] text-slate-500">
              Pilih karyawan yang ingin diproses gajinya pada termin ini, masukkan porsi persentase cicilan atau pelunasan penuh, dan sistem akan mengalkulasikan sisa kewajiban yayasan secara otomatis.
            </p>
          </div>
          <button 
            onClick={handleResetPayments}
            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-250 hover:border-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 text-slate-650 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-slate-500" /> Reset Cicilan Bulan Ini
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Main Wizard): Left 7 Columns */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Step 1: Employee checklist */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono block">1. Pilih Karyawan yang Akan Dibayar:</span>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] text-slate-400 font-mono">Filter Opsi:</span>
                    {availableTermins.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setSelectedTerminTab(val);
                          setSelectedStaffsForPay([]); // Clear selection on tab change
                        }}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors border ${
                          selectedTerminTab === val 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Termin {val}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const unpaidNikList = staffs
                      .filter(s => {
                        const thp = getStaffNetSalary(s);
                        const paid = staffPaidAmounts[s.nik] || 0;
                        if (selectedTerminTab === 1) {
                          return paid === 0 && thp > 0;
                        } else {
                          return paid > 0 && paid < thp;
                        }
                      })
                      .map(s => s.nik);
                    
                    if (selectedStaffsForPay.length === unpaidNikList.length) {
                      setSelectedStaffsForPay([]);
                    } else {
                      setSelectedStaffsForPay(unpaidNikList);
                    }
                  }}
                  className="text-[10px] text-indigo-650 hover:text-indigo-800 font-bold underline shrink-0"
                >
                  {selectedStaffsForPay.length === staffs.filter(s => {
                    const thp = getStaffNetSalary(s);
                    const paid = staffPaidAmounts[s.nik] || 0;
                    if (selectedTerminTab === 1) {
                      return paid === 0 && thp > 0;
                    } else {
                      return paid > 0 && paid < thp;
                    }
                  }).length 
                    ? "Sembunyikan Semua" 
                    : "Pilih Semua Staf"}
                </button>
              </div>

              <div className="max-h-[170px] overflow-y-auto border border-slate-100 rounded-lg p-2 space-y-1.5 divide-y divide-slate-100">
                {staffs.filter(s => {
                  const thp = getStaffNetSalary(s);
                  const paid = staffPaidAmounts[s.nik] || 0;
                  if (selectedTerminTab === 1) {
                    return paid === 0 && thp > 0;
                  } else {
                    return paid > 0 && paid < thp;
                  }
                }).length === 0 ? (
                  <div className="py-6 text-center text-xs text-emerald-600 font-bold bg-emerald-50 rounded-lg">
                    {selectedTerminTab === 1 
                      ? "🎉 Tidak ada staf di Termin 1 (seluruh staf sudah menerima pembayaran sebagian/pelunasan)."
                      : "🎉 Sisa saldo seluruh staf di bawah 100% untuk termin ini telah lunas."}
                  </div>
                ) : (
                  staffs
                    .filter(s => {
                      const thp = getStaffNetSalary(s);
                      const paid = staffPaidAmounts[s.nik] || 0;
                      if (selectedTerminTab === 1) {
                        return paid === 0 && thp > 0;
                      } else {
                        return paid > 0 && paid < thp;
                      }
                    })
                    .map(s => {
                      const thp = getStaffNetSalary(s);
                      const paid = staffPaidAmounts[s.nik] || 0;
                      const rem = thp - paid;
                      const pct = Math.round((paid / thp) * 100);
                      const isSelected = selectedStaffsForPay.includes(s.nik);

                      return (
                        <label 
                          key={s.nik} 
                          className={`flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-xs ${
                            isSelected ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedStaffsForPay(prev => prev.filter(x => x !== s.nik));
                                } else {
                                  setSelectedStaffsForPay(prev => [...prev, s.nik]);
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-slate-800">{s.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{s.nik} • {s.position}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800 font-mono">Rp {rem.toLocaleString('id-ID')} sisa</span>
                            <span className="text-[9px] text-slate-400 block">Telah bayar: {pct}%</span>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
            </div>

            {/* Step 2: Paymode Selector */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 space-y-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono block">2. Tentukan Nominal / Persentase Termin:</span>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMode('percent')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    payMode === 'percent' 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Persentase (%) THP
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode('full')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    payMode === 'full' 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Pelunasan (Sisa 100%)
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode('custom')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                    payMode === 'custom' 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Rupiah Kustom
                </button>
              </div>

              {payMode === 'percent' && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex gap-1.5">
                    {[25, 35, 50, 75].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPayPercentValue(p)}
                        className={`py-1 px-2.5 rounded text-[10px] font-bold font-mono border ${
                          payPercentValue === p 
                            ? 'bg-slate-800 text-white border-slate-800' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-500">Nilai Persen:</span>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={payPercentValue}
                      onChange={(e) => setPayPercentValue(Math.min(100, Math.max(1, Number(e.target.value))))}
                      className="w-20 px-2 py-0.5 border border-slate-200 rounded font-mono text-xs font-bold text-slate-800 outline-none"
                    />
                    <span className="text-[11px] text-slate-500">% dari gaji bersih reguler</span>
                  </div>
                </div>
              )}

              {payMode === 'custom' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <span className="text-[10px] text-slate-400 block font-medium">Masukkan nilai nominal pencairan per staf:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">Rp</span>
                    <input 
                      type="number"
                      value={customNominalValue}
                      onChange={(e) => setCustomNominalValue(Math.max(0, Number(e.target.value)))}
                      className="w-full max-w-sm px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Checkout Preview */}
            {selectedStaffsForPay.length > 0 && (
              <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 text-xs space-y-1">
                <div className="font-bold text-indigo-950 flex justify-between items-center">
                  <span>Pratinjau Penggajian:</span>
                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-mono text-[9px]">
                    {selectedStaffsForPay.length} Staff Terpilih
                  </span>
                </div>
                <div className="text-slate-650 space-y-0.5 max-h-[100px] overflow-y-auto font-mono text-[10px] py-1 bg-white/40 rounded px-2">
                  {staffs
                    .filter(s => selectedStaffsForPay.includes(s.nik))
                    .map(s => {
                      const thp = getStaffNetSalary(s);
                      const unpaid = thp - (staffPaidAmounts[s.nik] || 0);
                      let payValue = 0;
                      if (payMode === 'percent') payValue = Math.min(unpaid, Math.round(thp * (payPercentValue / 100)));
                      else if (payMode === 'full') payValue = unpaid;
                      else if (payMode === 'custom') payValue = Math.min(unpaid, customNominalValue);

                      return (
                        <div key={s.nik} className="flex justify-between">
                          <span>{s.name}:</span>
                          <span className="font-bold text-indigo-950">Rp {payValue.toLocaleString('id-ID')}</span>
                        </div>
                      );
                    })}
                </div>
                
                {/* Dynamically compute preview sum */}
                {(() => {
                  let sum = 0;
                  selectedStaffsForPay.forEach(nik => {
                    const s = staffs.find(x => x.nik === nik);
                    if (!s) return;
                    const thp = getStaffNetSalary(s);
                    const unpaid = thp - (staffPaidAmounts[nik] || 0);
                    let val = 0;
                    if (payMode === 'percent') val = Math.min(unpaid, Math.round(thp * (payPercentValue / 100)));
                    else if (payMode === 'full') val = unpaid;
                    else if (payMode === 'custom') val = Math.min(unpaid, customNominalValue);
                    sum += val;
                  });

                  return (
                    <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-indigo-150 text-[11px] font-extrabold text-indigo-900">
                      <span>Total Anggaran Dicairkan:</span>
                      <span>Rp {sum.toLocaleString('id-ID')}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Dispatch action button */}
            {selectedStaffsForPay.length > 0 && totalPayrollSum > finalKasBalance && (
              <div id="payroll-insufficient-funds-alert" className="bg-rose-50 border border-rose-150 rounded-xl p-3 mb-2 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <div>
                  <p className="font-bold">Saldo Kas Tidak Mencukupi!</p>
                  <p className="text-[10px] text-rose-600">Total anggaran Rp {totalPayrollSum.toLocaleString('id-ID')} melebihi sisa saldo kas tersedia (Rp {finalKasBalance.toLocaleString('id-ID')}). Silakan lakukan penyetoran kas atau tunggu pemasukan baru.</p>
                </div>
              </div>
            )}

            <button
              id="payroll-checkout-submit-btn"
              type="button"
              onClick={handlePayCustomTermin}
              disabled={selectedStaffsForPay.length === 0 || totalPayrollSum > finalKasBalance}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                selectedStaffsForPay.length > 0 && totalPayrollSum <= finalKasBalance
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-350" />
              Proses Cairkan Gaji Staf Terpilih ({selectedStaffsForPay.length} Orang)
            </button>

          </div>

          {/* Right Column (Log & Ledger): Right 5 Columns */}
          <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between h-[415px]">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">Riwayat Log Transaksi Kas Payroll:</span>
                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded font-mono">Auto Recorded</span>
              </div>
              
              <div className="space-y-2 overflow-y-auto max-h-[345px] pr-1">
                {paymentLogs.length === 0 ? (
                  <div className="h-[310px] flex flex-col justify-center items-center text-center text-slate-400 gap-1.5">
                    <AlertCircle className="w-7 h-7 text-slate-300" />
                    <p className="text-[10px] font-medium max-w-xs">Belum ada pencatatan pencairan terdaftar bulan ini. Sisa gaji yang belum terbayar akan tercatat secara akurat setelah transaksi kas dieksekusi.</p>
                  </div>
                ) : (
                  paymentLogs.map((log) => (
                    <div key={log.id} className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-start gap-1">
                      <div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono font-bold">
                          <span>{log.date}</span>
                          <span>&bull;</span>
                          <span className="text-indigo-650">{log.term}</span>
                        </div>
                        <p className="text-slate-700 font-medium leading-normal mt-0.5">{log.description}</p>
                      </div>
                      <span className="text-emerald-700 font-bold font-mono shrink-0">-{`Rp ${log.amount.toLocaleString('id-ID')}`}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>Sisa Kewajiban Gaji: Rp {remainingUnpaidSalary.toLocaleString('id-ID')}</span>
              <span className={remainingUnpaidSalary === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {remainingUnpaidSalary === 0 ? 'STATUS: LUNAS' : 'STATUS: BELUM SELESAI'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main staff list grid with Searcher filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 relative flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Staf berdasarkan Nama, NIK, Jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors"
              title="Export Rekapitulasi Gaji & Payroll"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
            </button>
            <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
              {filteredStaffs.length} dari {staffs.length} Staf Teralokasikan
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                <th className="p-4">Karyawan & Jabatan</th>
                <th className="p-4 text-right">Gaji Pokok Base</th>
                <th className="p-4 text-right">Tunjangan Standar</th>
                <th className="p-4 text-right">Tunjangan Manual</th>
                <th className="p-4 text-right">Total Potongan</th>
                <th className="p-4 text-right">Diterima Bersih</th>
                <th className="p-4 text-center">Tindakan Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStaffs.map((stf) => {
                const {
                  stdAllowance,
                  stdDeduction: stdDeds,
                  customAllowance,
                  customDeduction: customDeds,
                  totalAllowanceCombined: totalCompensations,
                  totalDeductionCombined: totalDeds,
                  netSalarySum
                } = getStaffFinancialBreakdown(stf);

                return (
                  <tr key={stf.nik} className="hover:bg-slate-50/20">
                    <td className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <div className="font-bold text-slate-800 text-sm">{stf.name}</div>
                        {(() => {
                          const paidSum = staffPaidAmounts[stf.nik] || 0;
                          const pct = netSalarySum > 0 ? Math.round((paidSum / netSalarySum) * 100) : 0;
                          if (pct >= 100) {
                            return (
                              <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-[8px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider text-center w-fit">
                                Lunas 100%
                              </span>
                            );
                          } else if (pct > 0) {
                            return (
                              <span className="inline-block bg-amber-50 border border-amber-200 text-amber-700 text-[8px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider animate-pulse text-center w-fit">
                                Termin {pct}%
                              </span>
                            );
                          }
                          return (
                            <span className="inline-block bg-slate-50 border border-slate-200 text-slate-500 text-[8px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider text-center w-fit">
                              Belum Bayar
                            </span>
                          );
                        })()}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono font-bold block">{stf.nik} &bull; {stf.position}</span>
                    </td>
                    <td className="p-4 text-right font-semibold font-mono">Rp {stf.salaryBase.toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right font-mono text-emerald-600 font-medium">+Rp {stdAllowance.toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right font-mono">
                      {customAllowance > 0 ? (
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[10px] font-mono">
                          +Rp {customAllowance.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-slate-450">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-rose-500 font-medium">-Rp {totalDeds.toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right font-mono text-sm font-bold text-slate-900 bg-slate-50/50">
                      <div>Rp {netSalarySum.toLocaleString('id-ID')}</div>
                      {(() => {
                        const paidSum = staffPaidAmounts[stf.nik] || 0;
                        const rem = Math.max(0, netSalarySum - paidSum);
                        if (rem > 0 && paidSum > 0) {
                          return (
                            <span className="text-[9px] text-rose-600 block mt-0.5 font-semibold">
                              Sisa: Rp {rem.toLocaleString('id-ID')}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => {
                            setEditingPayrollStaff(stf);
                            const config = getStaffSalaryConfig(stf.nik, stf.salaryBase);
                            setEditingSalary(JSON.parse(JSON.stringify(config)));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-slate-205 rounded-xl text-[10px] font-semibold cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Calculator className="w-3.5 h-3.5" /> Atur Slip Manual
                        </button>
                        <button 
                          onClick={() => setActiveSlipStaff(stf)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-semibold cursor-pointer flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-300" /> Slip Gaji
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANAGE PAYROLL SLIP WRITER MODAL with Manual Custom Field Generator Column */}
      {editingPayrollStaff && editingSalary && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden my-8 transform scale-100 transition-all flex flex-col max-h-[90vh]">
            
            {/* Header info */}
            <div className="bg-slate-950 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest block uppercase font-mono">RECALIBRATE STAFF SLIP</span>
                <dt className="text-sm font-bold mt-0.5">Atur Parameter Gaji & Slip Gaji: {editingPayrollStaff.name}</dt>
              </div>
              <button 
                onClick={() => {
                  setEditingPayrollStaff(null);
                  setEditingSalary(null);
                }} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto text-xs flex-1">
              
              {/* Grid 1: Basic structural metadata & payroll inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Remunerasi pokok form */}
                <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col">
                  <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 uppercase text-[10px] tracking-wider flex items-center gap-1 text-indigo-750 shrink-0">
                    <User className="w-3.5 h-3.5" /> Gaji Pokok & Tunjangan Standar (SOP)
                  </h3>

                  <div className="space-y-4 text-xs flex-1">
                    <div>
                      <label className="text-slate-500 block mb-1 font-semibold text-indigo-700">Gaji Pokok Base :</label>
                      <input 
                        type="number" 
                        value={editingSalary.salaryBase}
                        onChange={(e) => setEditingSalary({ ...editingSalary, salaryBase: Number(e.target.value) })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold bg-white"
                      />
                    </div>
                    
                    {/* Allowances Panel (Tunjangan / Tambahan) */}
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-emerald-800 text-[10px] uppercase tracking-wider flex items-center gap-1 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                        Tunjangan / Tambahan Yang Aktif (+)
                      </h4>
                      {editingSalary.components.filter(c => c.type === 'allowance').length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-lg">Tidak ada tunjangan aktif</p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {editingSalary.components.filter(c => c.type === 'allowance').map(field => (
                            <div key={field.id} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs flex flex-col gap-1.5 hover:border-emerald-250 transition-colors">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold text-slate-700 font-mono text-[10px] uppercase break-all">{field.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomField(field.id)}
                                  className="text-[9px] text-red-500 hover:text-red-750 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-2.5 h-2.5" /> Hapus
                                </button>
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">Rp</span>
                                <input 
                                  type="number" 
                                  value={field.amount || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const updatedComps = editingSalary.components.map(c => 
                                      c.id === field.id ? { ...c, amount: val } : c
                                    );
                                    setEditingSalary({ ...editingSalary, components: updatedComps });
                                  }}
                                  className="w-full border border-slate-200 focus:border-indigo-500 outline-none rounded-lg pl-8 pr-3 py-1 font-mono font-semibold text-slate-800 text-xs text-right bg-white"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Potongan Column & Addition form */}
                <div className="space-y-4 flex flex-col select-none">
                  
                  {/* Deductions Panel (Potongan / Iuran) */}
                  <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex-1">
                    <h4 className="font-extrabold text-rose-800 text-[10px] uppercase tracking-wider flex items-center gap-1 bg-rose-50 px-2 py-1.5 rounded-lg border border-rose-100">
                      Potongan / Kewajiban Yang Aktif (-)
                    </h4>
                    {editingSalary.components.filter(c => c.type === 'deduction').length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-lg">Tidak ada potongan aktif</p>
                    ) : (
                      <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                        {editingSalary.components.filter(c => c.type === 'deduction').map(field => (
                          <div key={field.id} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-3xs flex flex-col gap-1.5 hover:border-rose-250 transition-colors">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-700 font-mono text-[10px] uppercase break-all">{field.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomField(field.id)}
                                className="text-[9px] text-red-500 hover:text-red-750 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5" /> Hapus
                              </button>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[11px]">Rp</span>
                              <input 
                                type="number" 
                                value={field.amount || ''}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updatedComps = editingSalary.components.map(c => 
                                    c.id === field.id ? { ...c, amount: val } : c
                                  );
                                  setEditingSalary({ ...editingSalary, components: updatedComps });
                                }}
                                className="w-full border border-slate-200 focus:border-indigo-500 outline-none rounded-lg pl-8 pr-3 py-1 font-mono font-semibold text-rose-800 text-xs text-right bg-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Component builder box */}
                  <div className="space-y-3 bg-[#EEF2F6]/50 p-4 rounded-xl border border-[#CBD5E1] shrink-0">
                    <h3 className="font-bold text-indigo-950 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <PlusCircle className="w-3.5 h-3.5 text-indigo-700" /> Buat Parameter Dinamis Baru
                    </h3>
                    
                    <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-slate-500 block text-[9px] font-bold mb-1">Nama Parameter :</label>
                          <input 
                            type="text" 
                            placeholder="misal: THR, Bonus Khusus"
                            value={customFieldName}
                            onChange={(e) => setCustomFieldName(e.target.value)}
                            className="w-full border border-slate-200 hover:border-slate-350 focus:border-indigo-400 focus:outline-none rounded-lg px-2.5 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block text-[9px] font-bold mb-1">Nilai Rupiah :</label>
                          <input 
                            type="number" 
                            placeholder="Nilai awal"
                            value={customFieldAmount || ''}
                            onChange={(e) => setCustomFieldAmount(Number(e.target.value))}
                            className="w-full border border-slate-200 hover:border-slate-350 focus:border-indigo-400 focus:outline-none rounded-lg px-2.5 py-1 font-mono text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-slate-500 block text-[9px] font-bold mb-1">Kategori Tipe :</label>
                          <select 
                            value={customFieldType}
                            onChange={(e) => setCustomFieldType(e.target.value as any)}
                            className="w-full border border-slate-200 focus:border-indigo-400 focus:outline-none rounded-lg px-2.5 py-1 text-xs bg-white text-slate-800"
                          >
                            <option value="allowance">Tunjangan / Tambahan (+)</option>
                            <option value="deduction">Potongan Kewajiban (-)</option>
                          </select>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-xs flex justify-center items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Sisipkan Komponen
                      </button>
                    </div>
                  </div>

                </div>

              </div>
              
              {/* Calculating Take Home aggregates preview block */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-800 mt-4 shrink-0">
                <div className="text-center md:text-left">
                  <span className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-bold font-mono block">Live Recalculation (Take-Home Pay)</span>
                  <div className="text-2xl font-mono font-black text-emerald-400 mt-1">
                    Rp {(() => {
                      let total = editingSalary.salaryBase;
                      editingSalary.components.forEach(c => {
                        if (c.type === 'allowance') {
                          total += c.amount;
                        } else {
                          total -= c.amount;
                        }
                      });
                      return total;
                    })().toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="flex justify-end gap-3.5 w-full md:w-auto">
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingPayrollStaff(null);
                      setEditingSalary(null);
                    }}
                    className="px-4 py-2 border border-slate-700 hover:bg-slate-850 rounded-xl text-slate-300 font-semibold cursor-pointer text-xs"
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={handleSavePayrollSetup}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-705 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    Simpan Perubahan Payroll
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* POPUP OVERLAY: PRINTABLE SALARY SLIP (SLIP GAJI) with Custom Details Listed */}
      {activeSlipStaff && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 scale-100 transition-all p-8 space-y-6">
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <dt className="text-md font-bold text-slate-900 uppercase">Yayasan Evangelical Student Movement (ESM)</dt>
                <dd className="text-xs text-slate-500 mt-1 max-w-md">Jl. Diponegoro No. 84, Menteng, Jakarta Pusat, DKI Jakarta 10103 &bull; NPWP: 01.234.567.8-012.000</dd>
              </div>
              <div className="text-right">
                <dt className="text-sm font-bold text-indigo-700 uppercase font-mono tracking-wide">Slip Gaji Karyawan</dt>
                <dd className="text-xs text-slate-400 font-medium font-mono mt-0.5">{new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</dd>
              </div>
            </div>

            {/* Employee metadata */}
            <div className="grid grid-cols-2 text-xs gap-3 py-1 text-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">NIK KARYAWAN:</span>
                <span className="font-mono font-bold text-slate-900">{activeSlipStaff.nik}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">NAMA PENERIMA:</span>
                <span className="font-bold text-slate-900">{activeSlipStaff.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">JABATAN STRUKTURAL:</span>
                <span className="font-medium text-slate-800">{activeSlipStaff.position}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">DIVISI / STATUS:</span>
                <span className="font-medium text-indigo-750">{activeSlipStaff.division} ({activeSlipStaff.status})</span>
              </div>
            </div>

            {/* Income and Deductions details ledger split columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t-2 border-b-2 border-slate-100 py-4 font-mono text-xs">
              
              {/* Income Columns (Standard + Custom Allowances) */}
              <div className="space-y-1.5 border-r border-slate-100 pr-4">
                <h4 className="font-bold text-indigo-900 text-[11px] mb-3 uppercase tracking-wider">A. Rincian Gaji & Tunjangan</h4>
                
                <div className="flex justify-between">
                  <span>Gaji Pokok Base :</span>
                  <span>Rp {activeSlipStaff.salaryBase.toLocaleString('id-ID')}</span>
                </div>

                {(() => {
                  const publicFieldIds = new Set(publicFields.map(pf => pf.id));
                  
                  const publicAllowances = publicFields.filter(f => f.type === 'allowance');
                  const publicList = publicAllowances.map(field => {
                    let value = 0;
                    if (field.property) {
                      value = Number(activeSlipStaff[field.property as keyof Staff]) || 0;
                    } else {
                      const found = activeSlipStaff.customFields?.find(cf => cf.id === field.id);
                      value = found ? found.amount : 0;
                    }

                    if (value <= 0) return null;
                    return (
                      <div key={field.id} className="flex justify-between">
                        <span>{field.name} :</span>
                        <span>+Rp {value.toLocaleString('id-ID')}</span>
                      </div>
                    );
                  });

                  const individualAllowances = activeSlipStaff.customFields?.filter(f => f.type === 'allowance' && !publicFieldIds.has(f.id)) || [];
                  const individualList = individualAllowances.map(field => (
                    <div key={field.id} className="flex justify-between text-indigo-700 font-bold bg-indigo-50/20 px-1 py-0.5 rounded">
                      <span>{field.name} (Man) :</span>
                      <span>+Rp {field.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ));

                  return (
                    <>
                      {publicList}
                      {individualList}
                    </>
                  );
                })()}
                
                <div className="h-4"></div>
                
                <div className="bg-slate-50 p-2 rounded-lg font-bold flex justify-between uppercase text-[10px] text-slate-800">
                  <span>Total Gross (Bruto):</span>
                  <span>Rp {getStaffFinancialBreakdown(activeSlipStaff).totalAllowanceCombined.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Deductions Columns (Standard + Custom Deductions) */}
              <div className="space-y-1.5 pl-4">
                <h4 className="font-bold text-red-900 text-[11px] mb-3 uppercase tracking-wider">B. Rincian Potongan Slip</h4>
                
                {(() => {
                  const publicFieldIds = new Set(publicFields.map(pf => pf.id));
                  
                  const publicDeductions = publicFields.filter(f => f.type === 'deduction');
                  const publicList = publicDeductions.map(field => {
                    let value = 0;
                    if (field.property) {
                      value = Number(activeSlipStaff[field.property as keyof Staff]) || 0;
                    } else {
                      const found = activeSlipStaff.customFields?.find(cf => cf.id === field.id);
                      value = found ? found.amount : 0;
                    }

                    if (value <= 0) return null;
                    return (
                      <div key={field.id} className="flex justify-between text-rose-900">
                        <span>{field.name} :</span>
                        <span>-Rp {value.toLocaleString('id-ID')}</span>
                      </div>
                    );
                  });

                  const individualDeductions = activeSlipStaff.customFields?.filter(f => f.type === 'deduction' && !publicFieldIds.has(f.id)) || [];
                  const individualList = individualDeductions.map(field => (
                    <div key={field.id} className="flex justify-between text-rose-700 font-bold bg-rose-50/30 px-1 py-0.5 rounded">
                      <span>{field.name} (Man) :</span>
                      <span>-Rp {field.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ));

                  return (
                    <>
                      {publicList}
                      {individualList}
                    </>
                  );
                })()}

                <div className="h-8"></div>

                <div className="bg-rose-50 p-2 rounded-lg font-bold flex justify-between uppercase text-[10px] text-rose-800">
                  <span>Total Potongan :</span>
                  <span>Rp {getStaffFinancialBreakdown(activeSlipStaff).totalDeductionCombined.toLocaleString('id-ID')}</span>
                </div>
              </div>

            </div>

            {/* Calculated take home net salary highlighted box */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#94A3B8] font-bold block">Total Take-Home Pay (Gaji Bersih)</span>
                <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  Rp {getStaffNetSalary(activeSlipStaff).toLocaleString('id-ID')}
                </h3>
              </div>
              <div className="text-center sm:text-right font-sans text-xs">
                <dt className="text-slate-400 text-[10px]">AUTHORIZED VERIFIER :</dt>
                <dd className="font-bold text-slate-200 mt-1">Bendahara Yayasan ESM</dd>
                <dd className="text-[9px] text-slate-400">NPWP. {new Date().getFullYear()}A-0120</dd>
              </div>
            </div>

            {/* Actions for Slip Gaji popup */}
            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => setActiveSlipStaff(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-755 text-xs font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                id="close-slip-button"
              >
                Batal / Tutup Slip
              </button>
              <button 
                onClick={() => {
                  exportSlipToPDF(
                    activeSlipStaff, 
                    publicFields, 
                    getStaffSalaryConfig(activeSlipStaff.nik, activeSlipStaff.salaryBase)
                  );
                }}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" /> Cetak Slip Fisik (PDF)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
