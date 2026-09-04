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
  ChevronLeft,
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
import { Staff, CustomPayrollField, ApprovalRequest, StaffSalary, SalaryComponent, InstitutionalProfile } from '../types';
import { exportToCSV, exportSlipToPDF } from '../utils/export';
import { 
  INDO_MONTHS, 
  getStaffPaidAmountInPeriod, 
  getCurrentActiveCycle, 
  isDateInCutoffPeriod, 
  getCutoffPeriodRange 
} from '../utils/cutoff';

interface PayrollTabProps {
  staffs: Staff[];
  onUpdateStaff: (s: Staff) => void;
  onBatchUpdateStaff?: (staffList: Staff[]) => Promise<void>;
  currentRole: string;
  onPostApproval: (app: ApprovalRequest) => void;
  transactions: any[];
  onAddTransaction: (tx: any) => Promise<void>;
  salaries?: StaffSalary[];
  onUpdateSalary?: (s: StaffSalary) => void;
  profile?: InstitutionalProfile;
  structures?: any[];
  onLogAudit?: (actionDescription: string, moduleName: string, before?: string, after?: string) => Promise<void>;
  onUpdateProfile?: (p: InstitutionalProfile) => void;
}

export const DEFAULT_MASTER_SALARY_COMPONENTS: SalaryComponent[] = [
  { id: 'allowancePosition', name: 'Tunjangan Jabatan', type: 'allowance', amount: 0 },
  { id: 'allowanceHousing', name: 'Tunjangan Perumahan', type: 'allowance', amount: 0 },
  { id: 'allowanceTransport', name: 'Tunjangan Transport', type: 'allowance', amount: 0 },
  { id: 'allowanceComm', name: 'Tunjangan Komunikasi', type: 'allowance', amount: 0 },
  { id: 'bpjsAllowance', name: 'Premi BPJS Allowance', type: 'allowance', amount: 0 },
  { id: 'taxDeduction', name: 'Pajak PPH21 Bruto', type: 'deduction', amount: 0 },
  { id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', type: 'deduction', amount: 0 },
  { id: 'kasbonDeduction', name: 'Kasbon / Angsuran', type: 'deduction', amount: 0 },
];

export default function PayrollTab({
  staffs,
  onUpdateStaff,
  onBatchUpdateStaff,
  currentRole,
  onPostApproval,
  transactions,
  onAddTransaction,
  salaries = [],
  onUpdateSalary,
  profile,
  structures = [],
  onLogAudit,
  onUpdateProfile,
}: PayrollTabProps) {
  const [editingSalary, setEditingSalary] = useState<StaffSalary | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [publicFields, setPublicFields] = useState<any[]>(() => {
    const saved = localStorage.getItem('siad_public_payroll_fields');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_MASTER_SALARY_COMPONENTS;
  });

  const savePublicFields = (newFields: any[]) => {
    setPublicFields(newFields);
    localStorage.setItem('siad_public_payroll_fields', JSON.stringify(newFields));
  };

  // Master salary components from profile variable system
  const masterSalaryComponents = useMemo<SalaryComponent[]>(() => {
    if (profile?.salaryComponents && profile.salaryComponents.length > 0) {
      return profile.salaryComponents;
    }
    return DEFAULT_MASTER_SALARY_COMPONENTS;
  }, [profile?.salaryComponents]);

  // Helper to retrieve salary configuration from the salaries collection, ensuring all master components are included
  const getStaffSalaryConfig = (nik: string, baseFromStaff: number): StaffSalary => {
    const found = salaries.find(sal => sal.id === nik);
    const existingComponents = found ? [...found.components] : [];
    
    const existingMap = new Map<string, SalaryComponent>();
    existingComponents.forEach(c => {
      existingMap.set(c.id, c);
      existingMap.set(c.name.toLowerCase().trim(), c);
    });

    // 1. Mandatory Master Components: guaranteed to be present for all staff
    const mergedMasterComps: SalaryComponent[] = masterSalaryComponents.map(m => {
      const match = existingMap.get(m.id) || existingMap.get(m.name.toLowerCase().trim());
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        amount: match ? match.amount : (m.amount || 0)
      };
    });

    const masterIdSet = new Set(masterSalaryComponents.map(m => m.id));
    const masterNameSet = new Set(masterSalaryComponents.map(m => m.name.toLowerCase().trim()));

    // 2. Custom Manual Components: individual components not in the master variable list
    const customComps = existingComponents.filter(c => 
      !masterIdSet.has(c.id) && !masterNameSet.has(c.name.toLowerCase().trim())
    );

    return {
      id: nik,
      salaryBase: found ? found.salaryBase : baseFromStaff,
      components: [...mergedMasterComps, ...customComps]
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
    return profile?.cutoffDay || Number(localStorage.getItem('esm_target_payroll_day') || '7');
  });

  // Keep target payroll day synchronized with profile prop and LocalStorage
  useEffect(() => {
    if (profile?.cutoffDay && profile.cutoffDay !== targetPayrollDay) {
      setTargetPayrollDay(profile.cutoffDay);
    }
  }, [profile?.cutoffDay]);

  useEffect(() => {
    localStorage.setItem('esm_target_payroll_day', String(targetPayrollDay));
  }, [targetPayrollDay]);

  const handlePayrollDayChange = (newDay: number) => {
    setTargetPayrollDay(newDay);
    localStorage.setItem('esm_target_payroll_day', String(newDay));
    if (profile && onUpdateProfile && (currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan' || currentRole === 'Pembina Yayasan' || currentRole === 'Bendahara')) {
      onUpdateProfile({
        ...profile,
        cutoffDay: newDay
      });
    }
  };

  // Period / Cycle Selector State (Default to current active calendar month)
  const today = new Date();
  const currentCalendarYear = today.getFullYear();
  const currentCalendarMonth = today.getMonth(); // 0-indexed

  const [selectedPeriodYear, setSelectedPeriodYear] = useState<number>(currentCalendarYear);
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState<number>(currentCalendarMonth);

  const selectedPeriodStr = `${selectedPeriodYear}-${String(selectedPeriodMonth + 1).padStart(2, '0')}`;

  const handlePrevMonth = () => {
    if (selectedPeriodMonth === 0) {
      setSelectedPeriodMonth(11);
      setSelectedPeriodYear(prev => prev - 1);
    } else {
      setSelectedPeriodMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedPeriodMonth === 11) {
      setSelectedPeriodMonth(0);
      setSelectedPeriodYear(prev => prev + 1);
    } else {
      setSelectedPeriodMonth(prev => prev + 1);
    }
  };

  const handleResetToCurrentCycle = () => {
    const now = new Date();
    setSelectedPeriodYear(now.getFullYear());
    setSelectedPeriodMonth(now.getMonth());
  };

  // Derive cumulative paid amounts dynamically from the Transactions single-source-of-truth ledger
  const staffPaidAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    staffs.forEach(s => {
      map[s.nik] = getStaffPaidAmountInPeriod(
        s,
        selectedPeriodYear,
        selectedPeriodMonth,
        transactions
      );
    });
    return map;
  }, [staffs, selectedPeriodYear, selectedPeriodMonth, transactions]);

  // Automated Payroll Rollover & Arrears Engine
  useEffect(() => {
    const checkAndRollover = async () => {
      const now = new Date();
      const activeDueMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const updates: Staff[] = [];

      for (const s of staffs) {
        const lastMonth = s.lastPayrollMonth || '';
        
        // 1. Initial configuration: If staff does not have a past payroll month record yet,
        // align them with the active cycle month so they don't get artificial arrears.
        if (!lastMonth) {
          updates.push({
            ...s,
            lastPayrollMonth: activeDueMonth,
            lastMonthUnpaid: s.lastMonthUnpaid || 0,
            paidAmount: s.paidAmount || 0
          });
          continue;
        }

        // 2. Rollover condition: If the staff's last recorded cycle month is older than
        // the active due month (e.g. was recorded in '2026-08', now active '2026-09')
        if (lastMonth < activeDueMonth) {
          const [prevYStr, prevMStr] = lastMonth.split('-');
          const prevYear = parseInt(prevYStr, 10) || now.getFullYear();
          const prevMonth = (parseInt(prevMStr, 10) - 1) >= 0 ? parseInt(prevMStr, 10) - 1 : now.getMonth();

          // Cross-reference transaction ledger to get exact historical disbursements for that cycle!
          const actualPaidFromLedger = getStaffPaidAmountInPeriod(s, prevYear, prevMonth, transactions);
          const baseTHP = getStaffNetSalary(s);
          const totalExpectedDue = baseTHP + (s.lastMonthUnpaid || 0);
          const outstandingDeficit = Math.max(0, totalExpectedDue - actualPaidFromLedger);

          updates.push({
            ...s,
            lastMonthUnpaid: outstandingDeficit,
            paidAmount: 0, // Reset for the new cycle
            lastPayrollMonth: activeDueMonth
          });
        }
      }

      if (updates.length > 0) {
        if (onBatchUpdateStaff) {
          await onBatchUpdateStaff(updates);
        } else {
          for (const u of updates) {
            await onUpdateStaff(u);
          }
        }

        if (onLogAudit) {
          await onLogAudit(
            `[Sistem Otomatis Payroll] Memulai periode payroll baru (${activeDueMonth}) dan melakukan rollover sisa kewajiban gaji sebelumnya.`,
            'Payroll & Gaji'
          );
        }
      }
    };

    if (staffs && staffs.length > 0) {
      checkAndRollover();
    }
  }, [staffs, transactions]);

  // Helper to get total THP due (including carried-over arrears/debt)
  const getStaffTotalTHPWithArrears = (s: Staff) => {
    return getStaffNetSalary(s) + (s.lastMonthUnpaid || 0);
  };

  // Automatic tracking of 'Salary Debt' (Kekurangan Gaji) if payment date has passed
  const getStaffSalaryDebt = (s: Staff) => {
    const today = new Date();
    const isPaymentDatePassed = today.getDate() >= targetPayrollDay;
    
    const thp = getStaffNetSalary(s);
    const totalExpected = thp + (s.lastMonthUnpaid || 0);
    const paid = staffPaidAmounts[s.nik] || 0;
    
    if (isPaymentDatePassed) {
      return Math.max(0, totalExpected - paid);
    } else {
      return s.lastMonthUnpaid || 0;
    }
  };

  // Derive payroll logs directly for the selected period from global Transactions ledger
  const paymentLogs = useMemo(() => {
    return transactions
      .filter(t => {
        if (t.deleted) return false;
        if (t.status && t.status !== 'Approved') return false;

        const isPayroll = t.id?.startsWith('TX-PAY-') || 
          t.category === 'Penggajian Staff' || 
          t.category === 'Payroll Staff & BPJS' || 
          t.source === 'payroll' || 
          t.reference_type === 'payroll';
        if (!isPayroll) return false;

        if (t.payrollMonth) {
          return t.payrollMonth === selectedPeriodStr;
        }
        const txDate = t.date || t.transaction_date || '';
        return txDate.startsWith(selectedPeriodStr);
      })
      .map(t => {
        let termLabel = 'Termin';
        if (t.description?.includes('Lunas 100%') || t.description?.includes('Periode') || t.description?.includes('Gaji')) {
          termLabel = 'Lunas 100%';
        } else if (t.description?.includes('Termin')) {
          const match = t.description.match(/Termin \(([^)]+)\)/);
          if (match) termLabel = `Termin (${match[1]})`;
        }
        return {
          id: t.id,
          date: t.date || t.transaction_date || '',
          term: termLabel,
          amount: t.amount,
          description: t.description
        };
      })
      .sort((a, b) => b.id.localeCompare(a.id)); // Newest first
  }, [transactions, selectedPeriodStr, selectedPeriodYear, selectedPeriodMonth, targetPayrollDay]);

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
      const totalTHP = getStaffTotalTHPWithArrears(s);
      const paid = staffPaidAmounts[s.nik] || 0;
      return paid > 0 && paid < totalTHP;
    });

    if (hasPartiallyPaid) {
      list.push(2);
      // If there are still staffs whose sisa saldo is under 100%, show Termin 3, but if they are 100% paid, do not add Termin 3
      const anyStillUnder100 = staffs.some(s => {
        const totalTHP = getStaffTotalTHPWithArrears(s);
        const paid = staffPaidAmounts[s.nik] || 0;
        return paid > 0 && paid < totalTHP;
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
  const canModifyPayroll = ['Super Admin', 'Ketua Yayasan', 'Pembina Yayasan', 'Bendahara'].includes(currentRole);
  const canViewPayroll = ['Super Admin', 'Ketua Yayasan', 'Pembina Yayasan', 'Pengawas Yayasan', 'Bendahara'].includes(currentRole);

  const finalKasBalance = useMemo(() => {
    const approvedTx = (transactions || []).filter(t => t.status === 'Approved');
    const totalIncome = approvedTx
      .filter(t => t.type?.toLowerCase() === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = approvedTx
      .filter(t => t.type?.toLowerCase() === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return totalIncome - totalExpense;
  }, [transactions]);

  const totalPayrollSum = useMemo(() => {
    let sum = 0;
    selectedStaffsForPay.forEach(nik => {
      const s = staffs.find(x => x.nik === nik);
      if (!s) return;
      const thp = getStaffNetSalary(s);
      const thpTotal = thp + (s.lastMonthUnpaid || 0);
      const unpaid = thpTotal - (staffPaidAmounts[nik] || 0);
      let val = 0;
      if (payMode === 'percent') val = Math.min(unpaid, Math.round(thpTotal * (payPercentValue / 100)));
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

  const totalNetPayout = staffs.reduce((sum, s) => {
    return sum + getStaffNetSalary(s) + (s.lastMonthUnpaid || 0);
  }, 0);

  // Real "Dana Gaji Terbayar" derived dynamically based on cumulative staff payments
  const totalNetPaid = staffs.reduce((sum, s) => {
    const totalDue = getStaffNetSalary(s) + (s.lastMonthUnpaid || 0);
    const paid = staffPaidAmounts[s.nik] || 0;
    return sum + Math.min(paid, totalDue);
  }, 0);

  const remainingUnpaidSalary = Math.max(0, totalNetPayout - totalNetPaid);

  const totalSalaryDebt = staffs.reduce((sum, s) => sum + getStaffSalaryDebt(s), 0);

  // System treasury balance derived from global transactions
  const approvedTx = transactions.filter(t => t.status === 'Approved');
  const totalIncome = approvedTx.filter(t => t.type?.toLowerCase() === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = approvedTx.filter(t => t.type?.toLowerCase() === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const currentSystemBalance = totalIncome - totalExpense;

  const isBalanceSufficient = currentSystemBalance >= remainingUnpaidSalary;
  const cashDeficit = Math.max(0, remainingUnpaidSalary - currentSystemBalance);

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
      const thpTotal = thp + (s.lastMonthUnpaid || 0);
      const alreadyPaid = updatedPaidMap[nik] || 0;
      const unpaid = Math.max(0, thpTotal - alreadyPaid);

      if (unpaid <= 0) return;

      let payAmount = 0;
      if (payMode === 'percent') {
        const calculateAmount = Math.round(thpTotal * (payPercentValue / 100));
        payAmount = Math.min(unpaid, calculateAmount);
      } else if (payMode === 'full') {
        payAmount = unpaid;
      } else if (payMode === 'custom') {
        payAmount = Math.min(unpaid, customNominalValue);
      }

      if (payAmount > 0) {
        updatedPaidMap[nik] = Math.round(alreadyPaid + payAmount);
        totalDisbursed += payAmount;
        const finalPaidPercent = thpTotal > 0 ? Math.round((updatedPaidMap[nik] / thpTotal) * 100) : 100;
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
    const txId = `TX-PAY-${Date.now()}`;
    const staffBreakdownList: any[] = [];
    selectedStaffsForPay.forEach(nik => {
      const s = staffs.find(x => x.nik === nik);
      if (!s) return;
      const thp = getStaffNetSalary(s);
      const thpTotal = thp + (s.lastMonthUnpaid || 0);
      const alreadyPaid = staffPaidAmounts[nik] || 0;
      const unpaid = Math.max(0, thpTotal - alreadyPaid);
      if (unpaid <= 0) return;

      let payAmount = 0;
      if (payMode === 'percent') {
        const calculateAmount = Math.round(thpTotal * (payPercentValue / 100));
        payAmount = Math.min(unpaid, calculateAmount);
      } else if (payMode === 'full') {
        payAmount = unpaid;
      } else if (payMode === 'custom') {
        payAmount = Math.min(unpaid, customNominalValue);
      }

      if (payAmount > 0) {
        staffBreakdownList.push({
          nik: s.nik,
          name: s.name,
          amount: payAmount,
          termin: termLabelOfPayment
        });
      }
    });

    const newTx = {
      id: txId,
      date: new Date().toISOString().split('T')[0],
      category: 'Penggajian Staff',
      description: `[Pencairan Gaji] Pembayaran Gaji - ${termLabelOfPayment} untuk ${paymentDetailsList.length} karyawan. Periode ${INDO_MONTHS[selectedPeriodMonth]} ${selectedPeriodYear}. Rincian: ${paymentDetailsList.join(', ')}`,
      amount: totalDisbursed,
      type: 'Expense' as const,
      source: 'payroll' as const,
      reference_type: 'payroll',
      payrollMonth: selectedPeriodStr,
      staffBreakdown: staffBreakdownList,
      category_id: 'Penggajian Staff',
      sourceOrRecipient: `${paymentDetailsList.length} Orang Staff`,
      status: 'Approved' as const,
      approvedBy: `${currentRole} Operator`
    };

    try {
      await onAddTransaction(newTx);
      
      const staffUpdates: Staff[] = [];
      for (const nik of selectedStaffsForPay) {
        const s = staffs.find(x => x.nik === nik);
        if (!s) continue;
        const nextPaid = updatedPaidMap[nik];
        if (nextPaid !== undefined) {
          staffUpdates.push({
            ...s,
            paidAmount: nextPaid,
            lastPayrollMonth: selectedPeriodStr
          });
        }
      }

      if (onBatchUpdateStaff) {
        await onBatchUpdateStaff(staffUpdates);
      } else {
        for (const st of staffUpdates) {
          await onUpdateStaff(st);
        }
      }

      setSelectedStaffsForPay([]);

      alert(`Pencairan Pembayaran Gaji Berhasil! Dana Rp ${totalDisbursed.toLocaleString('id-ID')} otomatis ditarik dari Buku Kas Yayasan.`);
    } catch (err) {
      console.error(err);
      alert("Terjadi kegagalan saat mendaftarkan pencairan transaksi ke kas.");
    }
  };

  const executeResetPayments = async () => {
    try {
      const resetTargets = staffs.map(s => ({
        ...s,
        paidAmount: 0
      }));

      if (onBatchUpdateStaff) {
        await onBatchUpdateStaff(resetTargets);
      } else {
        for (const s of resetTargets) {
          await onUpdateStaff(s);
        }
      }

      if (onLogAudit) {
        await onLogAudit(
          `Menyetel Ulang Rekapitulasi Pembayaran Gaji & Termin Bulanan Karyawan (Pengurangan Seluruh Cicilan Terbayar ke 0%)`,
          'Staf & HR',
          JSON.stringify(resetTargets),
          ''
        );
      }
      setShowResetConfirm(false);
      alert('Rekapitulasi pembayaran gaji berhasil disetel ulang ke 0%!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyetujui penyetelan ulang gaji.');
    }
  };

  const handleResetPayments = () => {
    setShowResetConfirm(true);
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
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Sistem Penggajian & Remunerasi SDM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Kelola gaji pokok, tunjangan, slip gaji resmi, dan pencatatan termin pembayaran staf yayasan.</p>
        </div>
        
        {canModifyPayroll && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleResetPayments}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              title="Mulai periode penggajian baru atau setel ulang progres pembayaran"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" /> Buka Periode Baru
            </button>
            <button 
              onClick={handleSubmitCollectivePayroll}
              className="px-4 py-2 bg-[#881337] hover:bg-[#9f1239] text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Wallet className="w-4 h-4 text-white" /> Ajukan Anggaran Payroll Kolektif
            </button>
          </div>
        )}
      </div>

      {/* Month & Year Period Navigator */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#0c2340] text-white p-2 rounded-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Periode Penggajian: {INDO_MONTHS[selectedPeriodMonth]} {selectedPeriodYear}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Jadwal Gajian: <strong className="text-slate-700">Tanggal {targetPayrollDay} {INDO_MONTHS[selectedPeriodMonth]} {selectedPeriodYear}</strong></span>
              <span>&bull;</span>
              {selectedPeriodMonth === currentCalendarMonth && selectedPeriodYear === currentCalendarYear ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">Periode Berjalan (Aktif)</span>
              ) : (
                <span className="text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Arsip Periode</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Month Control Navigator */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 p-1 rounded">
            <button
              onClick={handlePrevMonth}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-1">
              <select
                value={selectedPeriodMonth}
                onChange={(e) => setSelectedPeriodMonth(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0c2340]"
              >
                {INDO_MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={selectedPeriodYear}
                onChange={(e) => setSelectedPeriodYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0c2340]"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1 border border-slate-300 rounded bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {(selectedPeriodYear !== currentCalendarYear || selectedPeriodMonth !== currentCalendarMonth) && (
            <button
              onClick={handleResetToCurrentCycle}
              className="px-2.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              Kembali ke Bulan Berjalan
            </button>
          )}
        </div>
      </div>

      {/* Financial aggregate metrics dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Staf */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Staf</span>
            <div className="bg-slate-100 p-1.5 rounded text-slate-700">
              <User className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-lg text-slate-900 font-bold block">{staffs.length} Orang</strong>
            <span className="text-xs text-slate-500 block mt-0.5">Penerima Bulanan</span>
          </div>
        </div>

        {/* Card 2: Total Gaji THP Staff */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Beban THP</span>
            <div className="bg-slate-100 p-1.5 rounded text-slate-700">
              <Calculator className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-base text-slate-900 font-bold block">
              Rp {totalNetPayout.toLocaleString('id-ID')}
            </strong>
            <span className="text-xs text-slate-500 block mt-0.5">Beban Gaji Bersih</span>
          </div>
        </div>

        {/* Card 3: Tanggal Penggajian Berikutnya */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Target Gajian</span>
            <div className="bg-slate-100 p-1.5 rounded text-slate-700">
              <Calendar className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="mt-3">
            <select 
              value={targetPayrollDay}
              onChange={(e) => handlePayrollDayChange(Number(e.target.value))}
              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0c2340]"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>Setiap Tanggal {day}</option>
              ))}
            </select>
            <span className="text-[11px] text-[#881337] block mt-1 font-semibold leading-tight">
              Cair: {getNextPayrollDate(targetPayrollDay)}
            </span>
          </div>
        </div>

        {/* Card 4: Dana Gaji Terbayar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Gaji Terbayar</span>
            <div className={`p-1.5 rounded ${totalNetPaid >= totalNetPayout ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-base text-slate-900 font-bold block">
              Rp {totalNetPaid.toLocaleString('id-ID')}
            </strong>
            <div className="mt-1 flex items-center justify-between text-xs">
              {totalNetPaid >= totalNetPayout ? (
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Lunas 100%
                </span>
              ) : totalNetPaid > 0 ? (
                <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Termin ({Math.round((totalNetPaid / (totalNetPayout || 1)) * 100)}%)
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                  Belum Bayar (0%)
                </span>
              )}
              {remainingUnpaidSalary > 0 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  Sisa: Rp {remainingUnpaidSalary.toLocaleString('id-ID')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 5: Saldo Kas */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Saldo Kas</span>
            <div className="bg-slate-100 p-1.5 rounded text-slate-700">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <strong className="text-base text-slate-900 font-bold block">
              Rp {currentSystemBalance.toLocaleString('id-ID')}
            </strong>
            <div className="mt-1">
              {isBalanceSufficient ? (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  ✓ Saldo Kas Mencukupi
                </span>
              ) : (
                <span className="text-xs font-semibold text-rose-700 flex items-center gap-1" title="Kekurangan saldo kas untuk mencukupi seluruh sisa beban gaji periode ini">
                  Defisit Kas: Rp {cashDeficit.toLocaleString('id-ID')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Sistem Pembayaran Termin & Kontrol Gaji */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-slate-700" />
              Pencairan Payroll Termin Kolektif
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih karyawan yang ingin diproses gajinya pada termin ini, tentukan porsi pencairan, dan sistem akan mengalkulasikan sisa kewajiban yayasan secara otomatis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Main Wizard): Left 7 Columns */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Step 1: Employee checklist */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-2">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">1. Pilih Staf yang Akan Dibayar:</span>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-xs text-slate-500">Filter Termin:</span>
                    {availableTermins.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setSelectedTerminTab(val);
                          setSelectedStaffsForPay([]); // Clear selection on tab change
                        }}
                        className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-colors border ${
                          selectedTerminTab === val 
                            ? 'bg-[#0c2340] text-white border-[#0c2340]' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
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
                        const totalTHP = getStaffTotalTHPWithArrears(s);
                        const paid = staffPaidAmounts[s.nik] || 0;
                        if (selectedTerminTab === 1) {
                          return paid === 0 && totalTHP > 0;
                        } else {
                          return paid > 0 && paid < totalTHP;
                        }
                      })
                      .map(s => s.nik);
                    
                    if (selectedStaffsForPay.length === unpaidNikList.length) {
                      setSelectedStaffsForPay([]);
                    } else {
                      setSelectedStaffsForPay(unpaidNikList);
                    }
                  }}
                  className="text-xs text-[#0c2340] hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  {selectedStaffsForPay.length === staffs.filter(s => {
                    const totalTHP = getStaffTotalTHPWithArrears(s);
                    const paid = staffPaidAmounts[s.nik] || 0;
                    if (selectedTerminTab === 1) {
                      return paid === 0 && totalTHP > 0;
                    } else {
                      return paid > 0 && paid < totalTHP;
                    }
                  }).length 
                    ? "Batal Pilih Semua" 
                    : "Pilih Semua Staf"}
                </button>
              </div>

              <div className="max-h-[170px] overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-white divide-y divide-slate-100">
                {staffs.filter(s => {
                  const totalTHP = getStaffTotalTHPWithArrears(s);
                  const paid = staffPaidAmounts[s.nik] || 0;
                  if (selectedTerminTab === 1) {
                    return paid === 0 && totalTHP > 0;
                  } else {
                    return paid > 0 && paid < totalTHP;
                  }
                }).length === 0 ? (
                  <div className="py-6 text-center text-xs text-emerald-800 font-semibold bg-emerald-50 rounded border border-emerald-200">
                    {selectedTerminTab === 1 
                      ? "Seluruh staf sudah menerima pembayaran sebagian / pelunasan."
                      : "Sisa kewajiban seluruh staf untuk termin ini telah lunas."}
                  </div>
                ) : (
                  staffs
                    .filter(s => {
                      const totalTHP = getStaffTotalTHPWithArrears(s);
                      const paid = staffPaidAmounts[s.nik] || 0;
                      if (selectedTerminTab === 1) {
                        return paid === 0 && totalTHP > 0;
                      } else {
                        return paid > 0 && paid < totalTHP;
                      }
                    })
                    .map(s => {
                      const totalTHP = getStaffTotalTHPWithArrears(s);
                      const paid = staffPaidAmounts[s.nik] || 0;
                      const rem = totalTHP - paid;
                      const pct = Math.round((paid / totalTHP) * 100);
                      const isSelected = selectedStaffsForPay.includes(s.nik);

                      return (
                        <label 
                          key={s.nik} 
                          className={`flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors text-xs ${
                            isSelected ? 'bg-slate-100 font-semibold' : ''
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
                              className="rounded border-slate-300 text-[#0c2340] focus:ring-[#0c2340] h-3.5 w-3.5 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold text-slate-800">{s.name}</span>
                              <span className="text-[11px] text-slate-500 block">{s.nik} &bull; {s.position}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800">Rp {rem.toLocaleString('id-ID')} sisa</span>
                            <span className="text-[11px] text-slate-500 block">Telah bayar: {pct}%</span>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>
            </div>

            {/* Step 2: Paymode Selector */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">2. Tentukan Nominal / Persentase Termin:</span>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMode('percent')}
                  className={`py-1.5 px-3 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                    payMode === 'percent' 
                      ? 'bg-[#0c2340] text-white border-[#0c2340]' 
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Persentase (%) THP
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode('full')}
                  className={`py-1.5 px-3 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                    payMode === 'full' 
                      ? 'bg-[#0c2340] text-white border-[#0c2340]' 
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Pelunasan (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode('custom')}
                  className={`py-1.5 px-3 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                    payMode === 'custom' 
                      ? 'bg-[#0c2340] text-white border-[#0c2340]' 
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Nominal Kustom
                </button>
              </div>

              {payMode === 'percent' && (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    {[25, 35, 50, 75].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPayPercentValue(p)}
                        className={`py-1 px-2.5 rounded text-xs font-semibold border cursor-pointer ${
                          payPercentValue === p 
                            ? 'bg-[#0c2340] text-white border-[#0c2340]' 
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">Nilai Persen:</span>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={payPercentValue}
                      onChange={(e) => setPayPercentValue(Math.min(100, Math.max(1, Number(e.target.value))))}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] outline-none"
                    />
                    <span className="text-xs text-slate-500">% dari gaji bersih reguler</span>
                  </div>
                </div>
              )}

              {payMode === 'custom' && (
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-600 block font-medium">Masukkan nominal pencairan per staf:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Rp</span>
                    <input 
                      type="number"
                      value={customNominalValue}
                      onChange={(e) => setCustomNominalValue(Math.max(0, Number(e.target.value)))}
                      className="w-full max-w-sm px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Checkout Preview */}
            {selectedStaffsForPay.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 flex justify-between items-center">
                  <span>Pratinjau Penggajian:</span>
                  <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-semibold text-xs">
                    {selectedStaffsForPay.length} Staf Terpilih
                  </span>
                </div>
                <div className="space-y-1 max-h-[100px] overflow-y-auto text-xs py-1 bg-white rounded p-2 border border-slate-200">
                  {staffs
                    .filter(s => selectedStaffsForPay.includes(s.nik))
                    .map(s => {
                      const totalTHP = getStaffTotalTHPWithArrears(s);
                      const unpaid = totalTHP - (staffPaidAmounts[s.nik] || 0);
                      let payValue = 0;
                      if (payMode === 'percent') payValue = Math.min(unpaid, Math.round(totalTHP * (payPercentValue / 100)));
                      else if (payMode === 'full') payValue = unpaid;
                      else if (payMode === 'custom') payValue = Math.min(unpaid, customNominalValue);

                      return (
                        <div key={s.nik} className="flex justify-between">
                          <span>{s.name}:</span>
                          <span className="font-bold text-slate-900">Rp {payValue.toLocaleString('id-ID')}</span>
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
                    const totalTHP = getStaffTotalTHPWithArrears(s);
                    const unpaid = totalTHP - (staffPaidAmounts[nik] || 0);
                    let val = 0;
                    if (payMode === 'percent') val = Math.min(unpaid, Math.round(totalTHP * (payPercentValue / 100)));
                    else if (payMode === 'full') val = unpaid;
                    else if (payMode === 'custom') val = Math.min(unpaid, customNominalValue);
                    sum += val;
                  });

                  return (
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200 text-xs font-bold text-slate-900">
                      <span>Total Anggaran Dicairkan:</span>
                      <span>Rp {sum.toLocaleString('id-ID')}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Dispatch action button */}
            {selectedStaffsForPay.length > 0 && totalPayrollSum > finalKasBalance && (
              <div id="payroll-insufficient-funds-alert" className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <div>
                  <p className="font-bold">Saldo Kas Tidak Mencukupi!</p>
                  <p className="text-xs text-rose-700 mt-0.5">Total anggaran Rp {totalPayrollSum.toLocaleString('id-ID')} melebihi sisa saldo kas tersedia (Rp {finalKasBalance.toLocaleString('id-ID')}).</p>
                </div>
              </div>
            )}

            <button
              id="payroll-checkout-submit-btn"
              type="button"
              onClick={handlePayCustomTermin}
              disabled={selectedStaffsForPay.length === 0 || totalPayrollSum > finalKasBalance}
              className={`w-full py-2.5 rounded font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                selectedStaffsForPay.length > 0 && totalPayrollSum <= finalKasBalance
                  ? 'bg-[#0c2340] hover:bg-[#1b365d] text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Proses Cairkan Gaji Staf Terpilih ({selectedStaffsForPay.length} Orang)
            </button>

          </div>

          {/* Right Column (Log & Ledger): Right 5 Columns */}
          <div className="lg:col-span-5 bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-between h-[415px]">
            <div>
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Log Transaksi Kas Payroll:</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">Tercatat Otomatis</span>
              </div>
              
              <div className="space-y-2 overflow-y-auto max-h-[310px] pr-1">
                {paymentLogs.length === 0 ? (
                  <div className="h-[280px] flex flex-col justify-center items-center text-center text-slate-400 gap-1.5">
                    <AlertCircle className="w-6 h-6 text-slate-300" />
                    <p className="text-xs font-medium max-w-xs">Belum ada pencatatan pencairan terdaftar bulan ini.</p>
                  </div>
                ) : (
                  paymentLogs.map((log) => (
                    <div key={log.id} className="text-xs bg-white p-2.5 rounded border border-slate-200 flex justify-between items-start gap-2 shadow-2xs">
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                          <span>{log.date}</span>
                          <span>&bull;</span>
                          <span className="text-[#0c2340]">{log.term}</span>
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed mt-0.5">{log.description}</p>
                      </div>
                      <span className="text-rose-700 font-bold shrink-0">-{`Rp ${log.amount.toLocaleString('id-ID')}`}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs text-slate-600">
              <span>Sisa Kewajiban: Rp {remainingUnpaidSalary.toLocaleString('id-ID')}</span>
              <span className={remainingUnpaidSalary === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                {remainingUnpaidSalary === 0 ? 'LUNAS' : 'BELUM SELESAI'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main staff list grid with Searcher filter bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 relative flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari staf berdasarkan Nama, NIK, atau Jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 bg-white focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer text-slate-700 transition-colors shadow-xs"
              title="Export Rekapitulasi Gaji & Payroll"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" /> Ekspor CSV
            </button>
            <div className="text-xs text-slate-500 hidden sm:block">
              {filteredStaffs.length} dari {staffs.length} Staf
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-3.5">Karyawan & Jabatan</th>
                <th className="p-3.5 text-right">Gaji Pokok Base</th>
                <th className="p-3.5 text-right">Tunjangan Standar</th>
                <th className="p-3.5 text-right">Tunjangan Manual</th>
                <th className="p-3.5 text-right">Total Potongan</th>
                <th className="p-3.5 text-right">Diterima Bersih</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStaffs.map((stf) => {
                const {
                  stdAllowance,
                  customAllowance,
                  totalDeductionCombined: totalDeds,
                  netSalarySum
                } = getStaffFinancialBreakdown(stf);

                return (
                  <tr key={stf.nik} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <div className="font-bold text-slate-900 text-xs">{stf.name}</div>
                        {(() => {
                          const paidSum = staffPaidAmounts[stf.nik] || 0;
                          const totalExpected = netSalarySum + (stf.lastMonthUnpaid || 0);
                          const pct = totalExpected > 0 ? Math.round((paidSum / totalExpected) * 100) : 100;
                          if (pct >= 100) {
                            return (
                              <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">
                                Lunas 100%
                              </span>
                            );
                          } else if (pct > 0) {
                            return (
                              <span className="inline-block bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">
                                Termin {pct}%
                              </span>
                            );
                          }
                          return (
                            <span className="inline-block bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">
                              Belum Bayar
                            </span>
                          );
                        })()}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{stf.nik} &bull; {stf.position}</span>
                    </td>
                    <td className="p-3.5 text-right font-semibold text-slate-800">Rp {stf.salaryBase.toLocaleString('id-ID')}</td>
                    <td className="p-3.5 text-right text-emerald-700 font-medium">+Rp {stdAllowance.toLocaleString('id-ID')}</td>
                    <td className="p-3.5 text-right">
                      {customAllowance > 0 ? (
                        <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-xs">
                          +Rp {customAllowance.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right text-rose-700 font-medium">-Rp {totalDeds.toLocaleString('id-ID')}</td>
                    <td className="p-3.5 text-right text-slate-900 bg-slate-50/50">
                      <div className="font-bold text-xs text-[#0c2340]">Rp {(netSalarySum + (stf.lastMonthUnpaid || 0)).toLocaleString('id-ID')}</div>
                      {getStaffSalaryDebt(stf) > 0 && (
                        <div className="text-[10px] text-rose-800 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1">
                          Kekurangan: Rp {getStaffSalaryDebt(stf).toLocaleString('id-ID')}
                        </div>
                      )}
                      {(() => {
                        const paidSum = staffPaidAmounts[stf.nik] || 0;
                        const totalExpected = netSalarySum + (stf.lastMonthUnpaid || 0);
                        const rem = Math.max(0, totalExpected - paidSum);
                        if (rem > 0) {
                          return (
                            <span className="text-[11px] text-rose-700 block mt-0.5 font-semibold">
                              Sisa: Rp {rem.toLocaleString('id-ID')}
                            </span>
                          );
                        }
                        return (
                          <span className="text-[11px] text-emerald-700 block mt-0.5 font-semibold">
                            Lunas
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button 
                          onClick={() => {
                            setEditingPayrollStaff(stf);
                            const config = getStaffSalaryConfig(stf.nik, stf.salaryBase);
                            setEditingSalary(JSON.parse(JSON.stringify(config)));
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Calculator className="w-3.5 h-3.5" /> Atur Parameter
                        </button>
                        <button 
                          onClick={() => setActiveSlipStaff(stf)}
                          className="px-2.5 py-1 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Slip Gaji
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

      {/* MANAGE PAYROLL SLIP WRITER MODAL */}
      {editingPayrollStaff && editingSalary && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-4xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
            
            {/* Header info */}
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div>
                <dt className="text-sm font-bold">Atur Parameter Gaji: {editingPayrollStaff.name}</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Penyesuaian gaji pokok, tunjangan rutin, dan potongan gaji.</dd>
              </div>
              <button 
                onClick={() => {
                  setEditingPayrollStaff(null);
                  setEditingSalary(null);
                }} 
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto text-xs flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Remunerasi pokok form */}
                <div className="space-y-3.5 bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col">
                  <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 uppercase text-xs tracking-wider flex items-center gap-1 shrink-0">
                    <User className="w-3.5 h-3.5" /> Gaji Pokok & Tunjangan
                  </h3>

                  <div className="space-y-3.5 text-xs flex-1">
                    <div>
                      <label className="text-slate-700 block mb-1 font-semibold">Gaji Pokok Base :</label>
                      <input 
                        type="number" 
                        value={editingSalary.salaryBase}
                        onChange={(e) => setEditingSalary({ ...editingSalary, salaryBase: Number(e.target.value) })}
                        className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 font-bold bg-white focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      />
                    </div>
                    
                    {/* Allowances Panel */}
                    <div className="space-y-2.5">
                      <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1 bg-slate-100 px-2 py-1.5 rounded border border-slate-200">
                        Tunjangan / Tambahan Aktif (+)
                      </h4>
                      {editingSalary.components.filter(c => c.type === 'allowance').length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2 text-center bg-white rounded border border-slate-200">Tidak ada tunjangan aktif</p>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {editingSalary.components.filter(c => c.type === 'allowance').map(field => {
                            const isMaster = masterSalaryComponents.some(m => m.id === field.id || m.name.toLowerCase().trim() === field.name.toLowerCase().trim());
                            return (
                              <div key={field.id} className="bg-white p-2.5 rounded border border-slate-200 flex flex-col gap-1.5 shadow-2xs">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-800 text-xs">{field.name}</span>
                                    {isMaster ? (
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 flex items-center gap-0.5" title="Item wajib dari Master Variabel Sistem">
                                        <Lock className="w-2.5 h-2.5 text-slate-400" /> Master
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                                        Kustom
                                      </span>
                                    )}
                                  </div>
                                  {!isMaster ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCustomField(field.id)}
                                      className="text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded transition-colors font-semibold flex items-center gap-0.5 cursor-pointer border border-rose-200"
                                      title="Hapus komponen manual ini"
                                    >
                                      <Trash2 className="w-3 h-3" /> Hapus
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Item Wajib</span>
                                  )}
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">Rp</span>
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
                                    className="w-full border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] outline-none rounded pl-8 pr-3 py-1 font-semibold text-slate-800 text-xs text-right bg-white"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Potongan Column & Addition form */}
                <div className="space-y-3.5 flex flex-col">
                  
                  {/* Deductions Panel */}
                  <div className="space-y-2.5 bg-slate-50 p-4 rounded-lg border border-slate-200 flex-1">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1 bg-slate-100 px-2 py-1.5 rounded border border-slate-200">
                      Potongan / Kewajiban Aktif (-)
                    </h4>
                    {editingSalary.components.filter(c => c.type === 'deduction').length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 text-center bg-white rounded border border-slate-200">Tidak ada potongan aktif</p>
                    ) : (
                      <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                        {editingSalary.components.filter(c => c.type === 'deduction').map(field => {
                          const isMaster = masterSalaryComponents.some(m => m.id === field.id || m.name.toLowerCase().trim() === field.name.toLowerCase().trim());
                          return (
                            <div key={field.id} className="bg-white p-2.5 rounded border border-slate-200 flex flex-col gap-1.5 shadow-2xs">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-800 text-xs">{field.name}</span>
                                  {isMaster ? (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 flex items-center gap-0.5" title="Item wajib dari Master Variabel Sistem">
                                      <Lock className="w-2.5 h-2.5 text-slate-400" /> Master
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                                      Kustom
                                    </span>
                                  )}
                                </div>
                                {!isMaster ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomField(field.id)}
                                    className="text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded transition-colors font-semibold flex items-center gap-0.5 cursor-pointer border border-rose-200"
                                    title="Hapus komponen manual ini"
                                  >
                                    <Trash2 className="w-3 h-3" /> Hapus
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Item Wajib</span>
                                )}
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">Rp</span>
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
                                  className="w-full border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] outline-none rounded pl-8 pr-3 py-1 font-semibold text-rose-800 text-xs text-right bg-white"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Component builder box */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 shrink-0">
                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider flex items-center gap-1">
                      <PlusCircle className="w-3.5 h-3.5 text-slate-600" /> Buat Komponen Gaji Baru
                    </h3>
                    
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-slate-700 block text-xs font-semibold mb-1">Nama Komponen :</label>
                          <input 
                            type="text" 
                            placeholder="misal: THR, Tunjangan Hari Raya"
                            value={customFieldName}
                            onChange={(e) => setCustomFieldName(e.target.value)}
                            className="w-full border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none rounded px-2.5 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-slate-700 block text-xs font-semibold mb-1">Nilai Nominal (IDR) :</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={customFieldAmount || ''}
                            onChange={(e) => setCustomFieldAmount(Number(e.target.value))}
                            className="w-full border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none rounded px-2.5 py-1 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-slate-700 block text-xs font-semibold mb-1">Kategori Tipe :</label>
                          <select 
                            value={customFieldType}
                            onChange={(e) => setCustomFieldType(e.target.value as any)}
                            className="w-full border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none rounded px-2.5 py-1 text-xs bg-white text-slate-800"
                          >
                            <option value="allowance">Tunjangan / Tambahan (+)</option>
                            <option value="deduction">Potongan Kewajiban (-)</option>
                          </select>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="w-full py-1.5 px-3 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs flex justify-center items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Sisipkan Komponen
                      </button>
                    </div>
                  </div>

                </div>

              </div>
              
              {/* Calculating Take Home aggregates preview block */}
              <div className="bg-[#0c2340] text-white rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 border border-slate-700 mt-4 shrink-0">
                <div className="text-center md:text-left">
                  <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold block">Total Take-Home Pay (Gaji Bersih)</span>
                  <div className="text-2xl font-bold text-white mt-0.5">
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

                <div className="flex justify-end gap-2.5 w-full md:w-auto">
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingPayrollStaff(null);
                      setEditingSalary(null);
                    }}
                    className="px-4 py-2 border border-slate-500 hover:bg-white/10 rounded text-slate-200 font-medium cursor-pointer text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={handleSavePayrollSetup}
                    className="px-5 py-2 bg-[#881337] hover:bg-[#9f1239] text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* POPUP OVERLAY: PRINTABLE SALARY SLIP (SLIP GAJI) */}
      {activeSlipStaff && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-2xl overflow-hidden my-8 p-6 space-y-5">
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
              <div>
                <dt className="text-sm font-bold text-slate-900 uppercase">{profile?.name || 'Yayasan Murid Muda Bermisi (MMB)'}</dt>
                <dd className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                  {profile?.address || 'Jl. Kaliurang KM 9.3, Sleman, D.I. Yogyakarta'} 
                  {profile?.phone && ` • Telp: ${profile.phone}`}
                  {profile?.email && ` • Email: ${profile.email}`}
                  <br />
                  <span className="font-semibold text-slate-700">NPWP: {profile?.npwp || '01.234.567.8-012.000'}</span> &bull; SK: {profile?.legalReg || 'AHU-00123.AH.01.04'}
                </dd>
              </div>
              <div className="text-right shrink-0">
                <dt className="text-xs font-bold text-[#0c2340] uppercase tracking-wider">Slip Gaji Resmi</dt>
                <dd className="text-xs text-slate-600 font-semibold mt-0.5">{new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</dd>
                <dd className="text-[11px] text-slate-400 mt-0.5">SLIP/{activeSlipStaff.nik}/{new Date().getFullYear()}</dd>
              </div>
            </div>

            {/* Employee metadata */}
            <div className="grid grid-cols-2 text-xs gap-x-4 gap-y-2 py-1 bg-slate-50 p-3.5 rounded border border-slate-200">
              <div>
                <span className="text-slate-500 block text-xs font-semibold">NIK Karyawan:</span>
                <span className="font-bold text-slate-900">{activeSlipStaff.nik}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-semibold">Nama Penerima:</span>
                <span className="font-bold text-slate-900">{activeSlipStaff.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-semibold">Jabatan:</span>
                <span className="font-medium text-slate-800">{activeSlipStaff.position}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-semibold">Divisi & Status:</span>
                <span className="font-medium text-slate-800">{activeSlipStaff.division} ({activeSlipStaff.status})</span>
              </div>
            </div>

            {/* Income and Deductions details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-200 py-3 text-xs">
              
              {/* Income Columns */}
              <div className="space-y-1.5 border-r border-slate-200 pr-4">
                <h4 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider border-b pb-1 border-slate-200">A. Gaji & Tunjangan</h4>
                
                <div className="flex justify-between text-slate-700">
                  <span>Gaji Pokok Base :</span>
                  <span>Rp {getStaffSalaryConfig(activeSlipStaff.nik, activeSlipStaff.salaryBase).salaryBase.toLocaleString('id-ID')}</span>
                </div>

                {(() => {
                  const salConfig = getStaffSalaryConfig(activeSlipStaff.nik, activeSlipStaff.salaryBase);
                  return salConfig.components
                    .filter(comp => comp.type === 'allowance' && comp.amount > 0)
                    .map(comp => (
                      <div key={comp.id} className="flex justify-between text-slate-700">
                        <span>{comp.name} :</span>
                        <span>+Rp {comp.amount.toLocaleString('id-ID')}</span>
                      </div>
                    ));
                })()}
                
                <div className="bg-slate-100 p-2 rounded font-bold flex justify-between uppercase text-xs text-slate-800 border border-slate-200 mt-2">
                  <span>Total Bruto:</span>
                  <span>Rp {(getStaffSalaryConfig(activeSlipStaff.nik, activeSlipStaff.salaryBase).salaryBase + getStaffFinancialBreakdown(activeSlipStaff).totalAllowanceCombined).toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Deductions Columns */}
              <div className="space-y-1.5 pl-4">
                <h4 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider border-b pb-1 border-slate-200">B. Potongan & Kewajiban</h4>
                
                {(() => {
                  const salConfig = getStaffSalaryConfig(activeSlipStaff.nik, activeSlipStaff.salaryBase);
                  const list = salConfig.components.filter(comp => comp.type === 'deduction' && comp.amount > 0);
                  if (list.length === 0) {
                    return <div className="text-slate-400 italic text-xs py-1">Tidak ada potongan.</div>;
                  }
                  return list.map(comp => (
                    <div key={comp.id} className="flex justify-between text-rose-800">
                      <span>{comp.name} :</span>
                      <span>-Rp {comp.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ));
                })()}

                <div className="bg-rose-50 p-2 rounded font-bold flex justify-between uppercase text-xs text-rose-800 border border-rose-200 mt-2">
                  <span>Total Potongan :</span>
                  <span>Rp {getStaffFinancialBreakdown(activeSlipStaff).totalDeductionCombined.toLocaleString('id-ID')}</span>
                </div>
              </div>

            </div>

            {/* Calculated take home net salary highlighted box */}
            <div className="bg-[#0c2340] text-white rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold block">Total Diterima (Take-Home Pay)</span>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  Rp {(staffPaidAmounts[activeSlipStaff.nik] || 0) > 0 
                    ? (staffPaidAmounts[activeSlipStaff.nik] || 0).toLocaleString('id-ID') 
                    : (getStaffNetSalary(activeSlipStaff) + (activeSlipStaff.lastMonthUnpaid || 0)).toLocaleString('id-ID')}
                </h3>
              </div>
              <div className="text-center sm:text-right text-xs shrink-0 border-l border-slate-700 pl-4">
                <dt className="text-slate-300 text-xs font-semibold">VERIFIKASI OTORISASI</dt>
                <dd className="font-bold text-white mt-0.5">{profile?.name ? `Bendahara ${profile.name}` : 'Bendahara Yayasan MMB'}</dd>
                <dd className="text-xs text-slate-400 mt-0.5">NPWP: {profile?.npwp || '01.234.567.8-012.000'}</dd>
              </div>
            </div>

            {/* Actions for Slip Gaji popup */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                onClick={() => setActiveSlipStaff(null)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded text-slate-700 text-xs font-medium cursor-pointer transition-colors"
                id="close-slip-button"
              >
                Tutup
              </button>
              <button 
                onClick={() => {
                  const bendaharaNode = structures.find(s => s.id === 'bendahara');
                  let treasurerName = '';
                  if (bendaharaNode && !bendaharaNode.deleted && bendaharaNode.name?.trim()) {
                    treasurerName = bendaharaNode.name;
                  } else {
                    const treasurerStaff = staffs.find(s => s.position?.toLowerCase().includes('bendahara') || s.email?.toLowerCase().includes('bendahara'));
                    if (treasurerStaff?.name?.trim()) {
                      treasurerName = treasurerStaff.name;
                    } else if (bendaharaNode && bendaharaNode.deleted) {
                      treasurerName = 'BENDAHARA YAYASAN';
                    } else {
                      treasurerName = 'Ibu Ruth Sitorus, S.E.';
                    }
                  }
                  exportSlipToPDF(
                    activeSlipStaff, 
                    publicFields, 
                    getStaffSalaryConfig(activeSlipStaff.nik, activeSlipStaff.salaryBase),
                    profile,
                    staffPaidAmounts[activeSlipStaff.nik] || 0,
                    treasurerName
                  );
                }}
                className="px-5 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4 text-white" /> Unduh Dokumen PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM MODAL: RESET SELURUH GAJI & TERMIN */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-md overflow-hidden p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Konfirmasi Setel Ulang Pembayaran</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Apakah Anda yakin ingin menyetel ulang rekapitulasi pembayaran gaji dan termin karyawan bulan ini? Semua pencatatan cicilan staf akan dimulai dari 0% kembali.
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-medium text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeResetPayments}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
              >
                Ya, Setel Ulang Gaji
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
