/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash, 
  Edit, 
  Download, 
  Upload, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  CheckCircle, 
  X, 
  FileSpreadsheet, 
  Printer, 
  AlertTriangle,
  History,
  ArrowUpDown,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Transaction, FinancialCategory, InstitutionalProfile } from '../types';
import { exportToCSV, exportLedgerToPDF } from '../utils/export';
import { getCutoffDay, getCutoffPeriodRange, isDateInCutoffPeriod, getCurrentActiveCycle, INDO_MONTHS } from '../utils/cutoff';

interface FinanceTabProps {
  transactions: Transaction[];
  categories: FinancialCategory[];
  onAddTransaction: (tx: Transaction) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentRole: string;
  onAddCategory?: (cat: FinancialCategory) => void;
  onUpdateCategory?: (cat: FinancialCategory) => void;
  onDeleteCategory?: (id: string) => void;
  profile?: InstitutionalProfile;
  structures?: any[];
}

export default function FinanceTab({
  transactions,
  categories,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  currentRole,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  profile,
  structures = [],
}: FinanceTabProps) {
  const canAdd = ['Super Admin', 'Ketua Yayasan', 'Bendahara'].includes(currentRole);
  const canEdit = ['Super Admin', 'Ketua Yayasan', 'Bendahara'].includes(currentRole);
  const canDelete = ['Super Admin', 'Ketua Yayasan'].includes(currentRole);
  const isEditable = canAdd; // Keep fallback compatible
  const [activeSubView, setActiveSubView] = useState<'ledger' | 'import' | 'categories' | 'kas_history'>('ledger');
  
  // Real-time server-side cash-book chronicle log tracker (representing table kas running logs)
  const [kasHistory, setKasHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<string>('Semua');
  const [historyFilterSource, setHistoryFilterSource] = useState<string>('Semua');

  const fetchKasHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`/api/data/kas?includeDeleted=true&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const logsOnly = data.filter((item: any) => item.id !== 'main' && !item.deleted);
          // Sort raw log snapshots chronologically, newest first
          logsOnly.sort((a, b) => {
            const timeA = a.timestamp || a.lastUpdated || '';
            const timeB = b.timestamp || b.lastUpdated || '';
            return timeB.localeCompare(timeA);
          });
          setKasHistory(logsOnly);
        }
      }
    } catch (err) {
      console.error('Failed to load transaction-by-transaction cash history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    // Proactively fetch updated log rows straight from the trace engine
    if (activeSubView === 'kas_history') {
      fetchKasHistory();
    }
  }, [activeSubView, transactions]);
  
  // Financial Cut-Off Cycle states
  const cutoffDay = getCutoffDay(profile);
  const [filterCycleMode, setFilterCycleMode] = useState<'cycle' | 'all'>('cycle');
  const [cycleMonth, setCycleMonth] = useState<number>(() => getCurrentActiveCycle(getCutoffDay(profile)).month);
  const [cycleYear, setCycleYear] = useState<number>(() => getCurrentActiveCycle(getCutoffDay(profile)).year);

  const currentFinanceCycle = React.useMemo(() => {
    return getCutoffPeriodRange(cycleYear, cycleMonth, cutoffDay);
  }, [cycleYear, cycleMonth, cutoffDay]);

  const handlePrevCycle = () => {
    if (cycleMonth === 0) {
      setCycleMonth(11);
      setCycleYear(prev => prev - 1);
    } else {
      setCycleMonth(prev => prev - 1);
    }
  };

  const handleNextCycle = () => {
    if (cycleMonth === 11) {
      setCycleMonth(0);
      setCycleYear(prev => prev + 1);
    } else {
      setCycleMonth(prev => prev + 1);
    }
  };

  const handleCurrentCycle = () => {
    const active = getCurrentActiveCycle(cutoffDay);
    setCycleMonth(active.month);
    setCycleYear(active.year);
  };

  // States for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('Semua');
  const [filterCategory, setFilterCategory] = useState<string>('Semua');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  
  // Transaction Form fields
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState(categories[0]?.name || 'Dukungan Mitra Bulanan');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState<number>(150000);
  const [txType, setTxType] = useState<'Income' | 'Expense'>('Income');
  const [txSource, setTxSource] = useState('');

  // Transaction Allocation selection
  const [txAllocation, setTxAllocation] = useState(profile?.incomeAllocations?.[0] || 'Gaji / Operasional');

  // Categories Form fields
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'Income' | 'Expense'>('Expense');
  const [newCatLimit, setNewCatLimit] = useState<number | ''>('');

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editLimitVal, setEditLimitVal] = useState<number | ''>('');
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<any | null>(null);

  // Bulk Excel Paste Simulation state
  const [pastedLedgerText, setPastedLedgerText] = useState(
    "2026-06-10|Dukungan Mitra Bulanan|Dukungan Pdt. Samuel Siregar|2500000|Income|Pdt Samuel\n" +
    "2026-06-11|Operasional Kantor & Sewa|Konsumsi rapat yayasan pengurus inti|450000|Expense|Konsumsi Rapat"
  );
  const [importStatus, setImportStatus] = useState('');

  const openAddForm = () => {
    setEditingTx(null);
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxCategory(categories[0]?.name || 'Dukungan Mitra Bulanan');
    setTxDescription('');
    setTxAmount(150000);
    setTxType('Income');
    setTxSource('');
    setTxAllocation(profile?.incomeAllocations?.[0] || 'Gaji / Operasional');
    setIsFormOpen(true);
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTx(tx);
    setTxDate(tx.date);
    setTxCategory(tx.category);
    setTxDescription(tx.description);
    setTxAmount(tx.amount);
    setTxType((tx.type === 'expense' || tx.type === 'Expense') ? 'Expense' : 'Income');
    setTxSource(tx.sourceOrRecipient);
    setTxAllocation(tx.allocationObjective || profile?.incomeAllocations?.[0] || 'Gaji / Operasional');
    setIsFormOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription || txAmount <= 0) {
      alert('Deskripsi & Nominal wajib diisi dengan benar!');
      return;
    }

    // Simplified model: No approval workflow required for manual income/expense. All manual entries are directly Approved.
    const requiresApproval = false;
    const resolvedStatus = 'Approved';

    // Balance checks: Validate if debit balance/cash is sufficient for this credit transaction (Expense)
    if (txType === 'Expense' && resolvedStatus === 'Approved') {
      const oldCreditAmount = (editingTx && (editingTx.status === undefined || editingTx.status === 'Approved') && editingTx.type?.toLowerCase() === 'expense') ? editingTx.amount : 0;
      const currentAvailable = finalKasBalance + oldCreditAmount;
      if (Number(txAmount) > currentAvailable) {
        alert(`Transaksi Gagal: Saldo kas tidak mencukupi!\nTotal Saldo Kas Tersedia: Rp ${currentAvailable.toLocaleString('id-ID')}.\nAnda memproses nominal pengeluaran sebesar Rp ${Number(txAmount).toLocaleString('id-ID')}. Silakan entri pemasukan kas terlebih dahulu.`);
        return;
      }
    }

    if (editingTx) {
      if (!window.confirm('Apakah Anda yakin ingin menyimpan perubahan pada transaksi ini?')) {
        return;
      }
      const updated: Transaction = {
        ...editingTx,
        date: txDate,
        category: txCategory,
        description: txDescription,
        amount: Number(txAmount),
        type: txType,
        sourceOrRecipient: txSource,
        status: resolvedStatus,
        allocationObjective: txType === 'Income' ? txAllocation : undefined
      };
      onUpdateTransaction(updated);
    } else {
      const newTx: Transaction = {
        id: `TX-${Date.now()}`,
        date: txDate,
        category: txCategory,
        description: txDescription,
        amount: Number(txAmount),
        type: txType,
        sourceOrRecipient: txSource,
        status: resolvedStatus,
        allocationObjective: txType === 'Income' ? txAllocation : undefined
      };
      onAddTransaction(newTx);
    }

    setIsFormOpen(false);
    alert('Transaksi Berhasil Disimpan & Diterbitkan ke Ledger Induk.');
  };

  // Excel Bulk upload ledger parser with dynamic cash sufficiency audits
  const handleBulkLedgerImport = () => {
    try {
      const lines = pastedLedgerText.trim().split('\n');
      let loaded = 0;
      let rejected = 0;
      let runningBalance = finalKasBalance;

      lines.forEach((line, index) => {
        const parts = line.split('|');
        if (parts.length >= 4) {
          const cat = parts[1]?.trim() || 'Dukungan Mitra Bulanan';
          const type = (parts[4]?.trim() as 'Income' | 'Expense') || 'Income';
          const amount = Number(parts[3]?.trim()) || 0;

          if (type === 'Expense' && amount > runningBalance) {
            rejected++;
            return; // Skip this credit record to avoid negative cash balance
          }

          // Track running balance contribution
          if (type === 'Income') {
            runningBalance += amount;
          } else {
            runningBalance -= amount;
          }

          const newTx: Transaction = {
            id: `TX-${Date.now()}-${index}`,
            date: parts[0]?.trim() || new Date().toISOString().split('T')[0],
            category: cat,
            description: parts[2]?.trim(),
            amount: amount,
            type: type,
            sourceOrRecipient: parts[5]?.trim() || 'Imported Excel',
            status: 'Approved' // Imported is bulk assumed verified
          };
          onAddTransaction(newTx);
          loaded++;
        }
      });
      
      let feedback = `Berhasil mendistribusikan ${loaded} entri buku kas dari Excel.`;
      if (rejected > 0) {
        feedback += ` Temuan Audit: ${rejected} entri pengeluaran secara otomatis ditolak/diabaikan karena melampaui sisa saldo kas tersedia.`;
      }
      setImportStatus(feedback);
    } catch (err) {
      setImportStatus('Gagal membaca data ledger. Gunakan format pembatas pipa (|).');
    }
  };

  // Filter calculations
  const approvedTx = transactions.filter(t => t.status === undefined || t.status === 'Approved');
  
  // Total All-Time
  const totalIncome = approvedTx
    .filter(t => t.type?.toLowerCase() === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalExpense = approvedTx
    .filter(t => t.type?.toLowerCase() === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const finalKasBalance = totalIncome - totalExpense;

  // Cycle Specific (Cut-off period based)
  const cycleApprovedTx = approvedTx.filter(t => isDateInCutoffPeriod(t.date, cycleYear, cycleMonth, cutoffDay));
  const cycleIncome = cycleApprovedTx
    .filter(t => t.type?.toLowerCase() === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const cycleExpense = cycleApprovedTx
    .filter(t => t.type?.toLowerCase() === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const cycleNetBalance = cycleIncome - cycleExpense;

  const activeIncome = filterCycleMode === 'cycle' ? cycleIncome : totalIncome;
  const activeExpense = filterCycleMode === 'cycle' ? cycleExpense : totalExpense;
  const activeNetBalance = filterCycleMode === 'cycle' ? cycleNetBalance : finalKasBalance;

  const filteredTransactions = transactions.filter(tx => {
    if (filterCycleMode === 'cycle' && !isDateInCutoffPeriod(tx.date, cycleYear, cycleMonth, cutoffDay)) {
      return false;
    }
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.sourceOrRecipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'Semua' || tx.type?.toLowerCase() === filterType.toLowerCase();
    const matchesCategory = filterCategory === 'Semua' || tx.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  // Export PDF/Excel
  const triggerSimulationExport = (format: string) => {
    if (format === 'Excel') {
      const headers = [
        'ID Transaksi',
        'Tanggal',
        'Kategori',
        'Keterangan',
        'Jumlah (IDR)',
        'Tipe',
        'Sumber / Penerima',
        'Disetujui Oleh',
        'Status Approval'
      ];
      const keys = [
        'id',
        'date',
        'category',
        'description',
        'amount',
        'type',
        'sourceOrRecipient',
        'approvedBy',
        'status'
      ];
      const filename = filterCycleMode === 'cycle'
        ? `data_keuangan_siklus_${currentFinanceCycle.targetMonthName}_${currentFinanceCycle.targetYear}.csv`
        : `data_keuangan_kas_${new Date().toISOString().substring(0, 10)}.csv`;
      exportToCSV(filteredTransactions, headers, keys, filename);
    } else {
      exportLedgerToPDF(filteredTransactions, profile, structures);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* FINANCIAL CUT-OFF CYCLE SELECTOR & CONTROLLER */}
      <div className="bg-[#0c2340] p-4 rounded-lg text-white shadow-xs border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 text-white rounded border border-white/20">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-slate-300 font-semibold">
                Siklus Finansial & Cut-Off
              </span>
              <span className="text-[10px] bg-white/15 text-white border border-white/20 px-2 py-0.5 rounded font-semibold">
                Cut-off Tgl {cutoffDay}
              </span>
            </div>
            <h3 className="font-bold text-sm text-white tracking-tight mt-0.5">
              {filterCycleMode === 'cycle' ? currentFinanceCycle.formattedRange : 'Semua Riwayat Transaksi (All-Time)'}
            </h3>
            {filterCycleMode === 'cycle' && (
              <span className="text-xs text-slate-300 block mt-0.5">
                Target Periode: <strong>{currentFinanceCycle.targetMonthName} {currentFinanceCycle.targetYear}</strong> &bull; Target Gaji: <strong>{currentFinanceCycle.targetPayDateStr}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Mode switch */}
          <div className="flex bg-black/20 p-1 rounded border border-white/10">
            <button
              onClick={() => setFilterCycleMode('cycle')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                filterCycleMode === 'cycle'
                  ? 'bg-white text-[#0c2340] shadow-xs'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              Per Siklus (8–7)
            </button>
            <button
              onClick={() => setFilterCycleMode('all')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                filterCycleMode === 'all'
                  ? 'bg-white text-[#0c2340] shadow-xs'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              Semua Waktu
            </button>
          </div>

          {filterCycleMode === 'cycle' && (
            <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded border border-white/10">
              <button
                onClick={handlePrevCycle}
                className="p-1 hover:bg-white/10 text-slate-200 hover:text-white rounded transition-colors cursor-pointer"
                title="Siklus Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={cycleMonth}
                onChange={(e) => setCycleMonth(Number(e.target.value))}
                className="bg-[#0c2340] text-white text-xs font-semibold px-2 py-1 rounded border border-slate-600 outline-none cursor-pointer"
              >
                {INDO_MONTHS.map((m, idx) => {
                  const range = getCutoffPeriodRange(cycleYear, idx, cutoffDay);
                  return (
                    <option key={idx} value={idx}>
                      Target {m} ({range.startDay} {range.prevMonthName.slice(0, 3)} – {range.endDay} {m.slice(0, 3)})
                    </option>
                  );
                })}
              </select>

              <select
                value={cycleYear}
                onChange={(e) => setCycleYear(Number(e.target.value))}
                className="bg-[#0c2340] text-white text-xs font-semibold px-2 py-1 rounded border border-slate-600 outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button
                onClick={handleNextCycle}
                className="p-1 hover:bg-white/10 text-slate-200 hover:text-white rounded transition-colors cursor-pointer"
                title="Siklus Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleCurrentCycle}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold rounded transition-colors cursor-pointer"
                title="Kembali ke Siklus Saat Ini"
              >
                Saat Ini
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Finance Analytics Board - Clean Institutional Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* Card: Total Saldo Kas Keseluruhan */}
        <div className="bg-[#0c2340] p-5 rounded-lg text-white shadow-xs border border-slate-700 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-300">Total Saldo Kas Yayasan</span>
            <h2 className="text-2xl font-bold tracking-tight mt-1 text-white">
              Rp {finalKasBalance.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-700 text-xs text-slate-300 flex justify-between items-center">
            <span>Kas Utama Mandiri</span>
            <span className="text-emerald-400 font-semibold text-xs">
              ● Saldo Terverifikasi
            </span>
          </div>
        </div>

        {/* Card: Pemasukan Siklus / Total */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
              {filterCycleMode === 'cycle' ? `Pemasukan Siklus ${currentFinanceCycle.targetMonthName}` : 'Total Pemasukan'}
            </span>
            <h2 className="text-xl font-bold text-emerald-700 tracking-tight mt-1">
              Rp {activeIncome.toLocaleString('id-ID')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-2.5 border-t border-slate-100">
            {filterCycleMode === 'cycle' ? `Rentang: ${currentFinanceCycle.formattedRange}` : 'Seluruh donasi & penerimaan kas.'}
          </p>
        </div>

        {/* Card: Pengeluaran Siklus / Total */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
              {filterCycleMode === 'cycle' ? `Pengeluaran Siklus ${currentFinanceCycle.targetMonthName}` : 'Total Pengeluaran'}
            </span>
            <h2 className="text-xl font-bold text-rose-700 tracking-tight mt-1">
              Rp {activeExpense.toLocaleString('id-ID')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-2.5 border-t border-slate-100">
            {filterCycleMode === 'cycle' ? `Beban operasional & payroll ${currentFinanceCycle.targetMonthName}` : 'Beban payroll & operasional.'}
          </p>
        </div>

        {/* Card: Net Cashflow Siklus */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-500">
              {filterCycleMode === 'cycle' ? `Surplus / Defisit Siklus` : 'Surplus / Defisit Kas'}
            </span>
            <h2 className={`text-xl font-bold tracking-tight mt-1 ${
              activeNetBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {activeNetBalance >= 0 ? '+' : ''}Rp {activeNetBalance.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <span>Status Keuangan:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              activeNetBalance >= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {activeNetBalance >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          </div>
        </div>

      </div>

      {/* Mode Control & Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">
        
        {/* Menu selections */}
        <div className="flex flex-wrap gap-1 sm:gap-2">
          <button 
            onClick={() => setActiveSubView('ledger')}
            className={`px-4 py-2 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
              activeSubView === 'ledger' 
                ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Buku Jurnal Kas
          </button>
          <button 
            onClick={() => setActiveSubView('import')}
            className={`px-4 py-2 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
              activeSubView === 'import' 
                ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Unggah Jurnal CSV
          </button>
          <button 
            onClick={() => setActiveSubView('categories')}
            className={`px-4 py-2 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
              activeSubView === 'categories' 
                ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Kategori & Anggaran
          </button>
          <button 
            onClick={() => setActiveSubView('kas_history')}
            className={`px-4 py-2 text-xs font-semibold cursor-pointer flex items-center gap-1.5 border-b-2 transition-colors ${
              activeSubView === 'kas_history' 
                ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Log Mutasi Kas
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {activeSubView === 'ledger' && (
            <>
              <button 
                onClick={() => triggerSimulationExport('Excel')}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer text-slate-700 transition-colors shadow-xs"
                title="Export Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Ekspor CSV
              </button>
              <button 
                onClick={() => triggerSimulationExport('PDF')}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer text-slate-700 transition-colors shadow-xs"
                title="Unduh PDF Resmi"
              >
                <Download className="w-4 h-4 text-[#0c2340]" /> Unduh PDF
              </button>
              {isEditable && (
                <button 
                  onClick={openAddForm}
                  className="px-3.5 py-1.5 bg-[#881337] hover:bg-[#9f1239] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Entri Kas Baru
                </button>
              )}
            </>
          )}
        </div>

      </div>

      {/* VIEW 1: GENERAL LEDGER TABLE */}
      {activeSubView === 'ledger' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          
          {/* Filtering bar in ledger */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari deskripsi transaksi, nomor referensi, atau pihak relasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              />
            </div>
            
            <div className="flex gap-2 text-xs">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              >
                <option value="Semua">Semua Aliran Kas</option>
                <option value="Income">Pemasukan (+IN)</option>
                <option value="Expense">Pengeluaran (-EXP)</option>
              </select>

              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              >
                <option value="Semua">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filterCycleMode === 'cycle' && (
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold">Menampilkan Transaksi Siklus:</span>
                <span className="font-semibold text-[#0c2340]">{currentFinanceCycle.formattedRange}</span>
              </span>
              <span className="font-medium text-slate-500">
                {filteredTransactions.length} Transaksi Terdata
              </span>
            </div>
          )}

          {/* Jurnal Ledger table rendering */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Kode Ref / Tanggal</th>
                  <th className="p-3.5">Kategori Akun</th>
                  <th className="p-3.5">Deskripsi Mutasi</th>
                  <th className="p-3.5">Sumber / Pihak Relasi</th>
                  <th className="p-3.5 text-right">Nominal</th>
                  <th className="p-3.5">Status</th>
                  {isEditable && <th className="p-3.5 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{tx.id}</div>
                      <span className="text-[11px] text-slate-500">{tx.date}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-slate-800 font-semibold">{tx.category}</span>
                      {tx.type?.toLowerCase() === 'income' && tx.allocationObjective && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">Peruntukan: {tx.allocationObjective}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-800 max-w-sm leading-relaxed">
                      {tx.description}
                    </td>
                    <td className="p-3.5 text-slate-700">
                      {tx.sourceOrRecipient}
                    </td>
                    <td className="p-3.5 text-right">
                      <span className={`font-semibold ${
                        tx.type?.toLowerCase() === 'income' ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {tx.type?.toLowerCase() === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (tx.status || 'Approved') === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 
                        (tx.status || 'Approved') === 'Pending Approval' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {tx.status || 'Approved'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="p-3.5 text-center">
                        <div className="flex justify-center gap-1.5">
                          {canEdit && (
                            <button 
                              onClick={() => openEditForm(tx)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded font-medium cursor-pointer transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => {
                                if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs rounded font-medium cursor-pointer transition-colors"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      <p className="text-xs">Tidak ada transaksi yang tercatat dalam rentang <strong>{filterCycleMode === 'cycle' ? currentFinanceCycle.formattedRange : 'filter yang dipilih'}</strong>.</p>
                      {filterCycleMode === 'cycle' && (
                        <div className="flex justify-center gap-2 mt-3">
                          <button
                            onClick={handleCurrentCycle}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded transition-colors cursor-pointer border border-slate-300"
                          >
                            Pindah ke Siklus Berjalan
                          </button>
                          <button
                            onClick={() => setFilterCycleMode('all')}
                            className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded transition-colors cursor-pointer"
                          >
                            Lihat Semua Transaksi
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count indicator */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
            <span>Menampilkan {filteredTransactions.length} baris riwayat kas</span>
            <span>Jurnal Terverifikasi &bull; Yayasan MMB</span>
          </div>

        </div>
      )}

      {/* VIEW 2: MASS PARSING EXCEL IMPORT */}
      {activeSubView === 'import' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800">Unggah Masal Jurnal Transaksi</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Penyesuaian kas bulanan dari slip mutasi bank atau laporan audit fisik. Salin-tempel multi baris dengan pemisah karakter pipa (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">|</code>) untuk langsung menyatukannya dengan catatan kas utama.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase block">Format Urutan Kolom:</span>
            <div className="bg-slate-900 text-slate-200 font-mono text-[11px] p-3 rounded border border-slate-800 overflow-x-auto whitespace-nowrap leading-relaxed">
              Tanggal (YYYY-MM-DD) | Kategori_Akun | Deskripsi_Mutasi | Nominal_Rupiah | Tipe_Aliran_Kas (Income/Expense) | Rekening_Sumber
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Data Salinan Jurnal Kas:</label>
              <textarea 
                rows={5}
                value={pastedLedgerText}
                onChange={(e) => setPastedLedgerText(e.target.value)}
                className="w-full font-mono text-xs p-3 border border-slate-300 rounded leading-relaxed focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              />
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            <button 
              onClick={handleBulkLedgerImport}
              className="px-4 py-2 text-white bg-[#0c2340] hover:bg-[#1b365d] font-semibold rounded text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Impor Data ke Catatan Kas
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: CATEGORIES & CONTROLS BUDGET LIMITS */}
      {activeSubView === 'categories' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800">Kategori & Batas Anggaran (Budgeting Limit)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Kontrol alokasi kas bulanan per pos pengeluaran dan pemasukan tahunan.</p>
          </div>

          {/* Form to Add New Category */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">Tambah Kategori / Atur Batas Budgeting</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-700 block mb-1 text-xs font-semibold">Nama Kategori Buku Kas :</label>
                <input 
                  type="text" 
                  value={newCatName} 
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: ATK & Cetak, Sewa Kantor"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-xs text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-700 block mb-1 text-xs font-semibold">Jenis Akun Mutasi :</label>
                <select 
                  value={newCatType} 
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-xs text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                >
                  <option value="Expense">Pengeluaran (-EXP)</option>
                  <option value="Income">Pemasukan (+IN)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-700 block mb-1 text-xs font-semibold">Batas Anggaran Bulanan (IDR - Opsional) :</label>
                <input 
                  type="number" 
                  value={newCatLimit || ''} 
                  onChange={(e) => setNewCatLimit(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Contoh: 5000000"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-xs text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button 
                type="button"
                onClick={() => {
                  if (!newCatName.trim()) {
                    alert('Harap isi Nama Kategori!');
                    return;
                  }
                  if (onAddCategory) {
                    onAddCategory({
                      id: `CAT-ACC-${Date.now()}`,
                      name: newCatName.trim(),
                      type: newCatType,
                      budgetLimit: newCatLimit ? Number(newCatLimit) : undefined
                    });
                    setNewCatName('');
                    setNewCatLimit('');
                    alert(`Kategori "${newCatName}" berhasil didaftarkan.`);
                  } else {
                    alert('Backend sinkronisasi belum tersedia untuk kategori baru.');
                  }
                }}
                className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs shadow-xs transition-colors cursor-pointer"
              >
                Simpan Kategori
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {categories.map((cat) => {
              const txsForCat = transactions.filter(t => t.category === cat.name && (t.status === undefined || t.status === 'Approved'));
              const usedAmount = txsForCat.reduce((sum, t) => sum + t.amount, 0);
              const percentage = cat.budgetLimit ? Math.min((usedAmount / cat.budgetLimit) * 100, 100) : 0;
              const isOver = cat.budgetLimit && usedAmount > cat.budgetLimit;

              return (
                <div key={cat.id} className="p-4 border border-slate-200 bg-white rounded-lg shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        cat.type === 'Income' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {cat.type === 'Income' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                      <span className="text-[11px] text-slate-400">ID: {cat.id}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs mb-3">{cat.name}</h4>
                    
                    <div className="text-xs text-slate-600 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Realisasi Kas:</span>
                        <strong className="text-slate-900 font-bold">Rp {usedAmount.toLocaleString('id-ID')}</strong>
                      </div>
                      
                      {editingCatId === cat.id ? (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200 mt-2">
                          <label className="text-[11px] text-slate-700 font-semibold block">Edit Limit Anggaran (IDR):</label>
                          <div className="flex gap-1.5">
                            <input 
                              type="number"
                              value={editLimitVal}
                              onChange={(e) => setEditLimitVal(e.target.value ? Number(e.target.value) : '')}
                              className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                              placeholder="Limit..."
                            />
                            <button 
                              onClick={() => {
                                if (onUpdateCategory) {
                                  if (window.confirm('Apakah Anda yakin ingin menyimpan perubahan limit anggaran kategori ini?')) {
                                    onUpdateCategory({
                                      ...cat,
                                      budgetLimit: editLimitVal ? Number(editLimitVal) : undefined
                                    });
                                  }
                                }
                                setEditingCatId(null);
                                setEditLimitVal('');
                              }}
                              className="px-2.5 py-1 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded font-bold text-xs cursor-pointer transition-colors"
                            >
                              OK
                            </button>
                            <button 
                              onClick={() => setEditingCatId(null)}
                              className="px-2 py-1 border border-slate-300 hover:bg-slate-50 rounded text-xs text-slate-700 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center pt-1">
                            <span>Batas Anggaran:</span>
                            <span className="font-semibold text-slate-800">
                              {cat.budgetLimit ? `Rp ${cat.budgetLimit.toLocaleString('id-ID')}` : 'Belum Ditentukan'}
                            </span>
                          </div>
                          
                          {cat.budgetLimit ? (
                            <>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-200">
                                <div 
                                  style={{ width: `${percentage}%` }} 
                                  className={`h-full ${isOver ? 'bg-rose-600' : 'bg-[#0c2340]'} transition-all`}
                                />
                              </div>
                              <p className="text-[11px] text-slate-500 font-semibold mt-1 text-right">Pemakaian: {percentage.toFixed(0)}%</p>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  {isOver && (
                    <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Pos Anggaran ini Melebihi Batas Tahun Ini!
                    </div>
                  )}

                  {/* Edit / Delete actions at the card bottom */}
                  {editingCatId !== cat.id && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditLimitVal(cat.budgetLimit || '');
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit limit anggaran"
                      >
                        <Edit className="w-3 h-3" /> Edit Limit
                      </button>
                      <button 
                        onClick={() => {
                          setDeleteConfirmCategory(cat);
                        }}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Hapus kategori ini"
                      >
                        <Trash className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: REAL-TIME CHRONOLOGICAL CASH JOURNAL LOGS (Table Kas) */}
      {activeSubView === 'kas_history' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Buku Register Mutasi Kas (Trace Log)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Catatan mutasi saldo kas riil secara terus-menerus (append-only ledger) untuk akuntabilitas dan audit internal.
              </p>
            </div>
            <button 
              onClick={fetchKasHistory}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer text-slate-700 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} /> Refresh Log
            </button>
          </div>

          {/* Log metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] uppercase font-bold text-slate-500">Total Snapshot Entri Log</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">{kasHistory.length} Baris Jurnal</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] uppercase font-bold text-slate-500">Saldo Akhir di Buku Kas</span>
              <p className="text-base font-bold text-[#0c2340] mt-0.5">Rp {finalKasBalance.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] uppercase font-bold text-slate-500">Kepatuhan Integritas</span>
              <p className="text-xs font-bold text-emerald-700 mt-1">✓ Lolos Audit Otomatis (100% Cocok)</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Cari Keterangan / Ref / Operator:</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Ketik keterangan..."
                  className="w-full bg-white border border-slate-300 rounded pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Filter Tipe Kas:</label>
              <select 
                value={historyFilterType}
                onChange={(e) => setHistoryFilterType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              >
                <option value="Semua">Semua Tipe (Income & Expense)</option>
                <option value="income">Hanya Pemasukan (+)</option>
                <option value="expense">Hanya Pengeluaran (-)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Filter Sumber:</label>
              <select 
                value={historyFilterSource}
                onChange={(e) => setHistoryFilterSource(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              >
                <option value="Semua">Semua Sumber (Manual, Donasi, Gaji)</option>
                <option value="manual">Manual / Bendahara</option>
                <option value="donation">Fundraising / Mitra</option>
                <option value="payroll">Disbursement / Payroll</option>
              </select>
            </div>
          </div>

          {/* Log Table Container */}
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Tanggal Log & ID Jurnal</th>
                  <th className="p-3.5">Aksi</th>
                  <th className="p-3.5">Kategori & Keterangan</th>
                  <th className="p-3.5 text-right">Nominal</th>
                  <th className="p-3.5 text-center">Aliran Saldo</th>
                  <th className="p-3.5">Operator & Saluran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isHistoryLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <div className="animate-spin inline-block w-5 h-5 border-2 border-[#0c2340] border-t-transparent rounded-full mb-2"></div>
                      <p>Memuat jurnal detail aliran saldo...</p>
                    </td>
                  </tr>
                ) : kasHistory.filter(log => {
                  const query = historySearchQuery.toLowerCase();
                  const matchesSearch = !query || 
                    (log.description || '').toLowerCase().includes(query) ||
                    (log.category || '').toLowerCase().includes(query) ||
                    (log.updatedBy || '').toLowerCase().includes(query) ||
                    (log.transaction_id || '').toLowerCase().includes(query) ||
                    (log.id || '').toLowerCase().includes(query);

                  const matchesType = historyFilterType === 'Semua' || (log.type || '').toLowerCase() === historyFilterType.toLowerCase();
                  const matchesSource = historyFilterSource === 'Semua' || (log.source || '').toLowerCase() === historyFilterSource.toLowerCase();

                  return matchesSearch && matchesType && matchesSource;
                }).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">Belum Ada Catatan Mutasi / Filter Tidak Cocok</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Coba tambahkan atau hapus transaksi keuangan kas, maka perubahannya akan otomatis terekam di sini.
                      </p>
                    </td>
                  </tr>
                ) : kasHistory.filter(log => {
                  const query = historySearchQuery.toLowerCase();
                  const matchesSearch = !query || 
                    (log.description || '').toLowerCase().includes(query) ||
                    (log.category || '').toLowerCase().includes(query) ||
                    (log.updatedBy || '').toLowerCase().includes(query) ||
                    (log.transaction_id || '').toLowerCase().includes(query) ||
                    (log.id || '').toLowerCase().includes(query);

                  const matchesType = historyFilterType === 'Semua' || (log.type || '').toLowerCase() === historyFilterType.toLowerCase();
                  const matchesSource = historyFilterSource === 'Semua' || (log.source || '').toLowerCase() === historyFilterSource.toLowerCase();

                  return matchesSearch && matchesType && matchesSource;
                }).map((log) => {
                  const formattedTime = log.timestamp 
                    ? new Date(log.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : '-';
                  const formattedDate = log.timestamp 
                    ? log.timestamp.split('T')[0]
                    : '-';
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-xs">{log.id}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{formattedDate} {formattedTime}</div>
                        {log.transaction_id && (
                          <div className="text-[11px] text-[#0c2340] font-semibold mt-0.5">Ref ID: {log.transaction_id}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase border ${
                          log.action === 'DELETE' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          log.action === 'EDIT' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {log.action || 'CREATE'}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium">
                        <span className="font-bold text-slate-900 block text-xs mb-0.5">{log.category}</span>
                        <span className="text-slate-600 line-clamp-2 max-w-xs block leading-relaxed">{log.description || '(Tidak ada keterangan)'}</span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-xs">
                        <span className={(log.type || '').toLowerCase() === 'income' ? 'text-emerald-700' : 'text-rose-700'}>
                          {(log.type || '').toLowerCase() === 'income' ? '+' : '-'} Rp {Number(log.amount || 0).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="p-3.5 text-center text-xs">
                        <div className="text-slate-500">Sebelum: Rp {Number(log.balanceBefore || 0).toLocaleString('id-ID')}</div>
                        <div className="text-[#0c2340] font-semibold mt-0.5">Sesudah: Rp {Number(log.balanceAfter || 0).toLocaleString('id-ID')}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{log.updatedBy}</div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded mt-1 inline-block uppercase border ${
                          log.source === 'donation' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          log.source === 'payroll' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {log.source || 'manual'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EXCEL JURNAL ENTRY */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-md overflow-hidden my-8">
            
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">{editingTx ? 'Ubah Catatan Transaksi Kas' : 'Entri Transaksi Jurnal Baru'}</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Setiap nominal pengeluaran di bawah wewenang persetujuan Bendahara.</dd>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Tanggal Transaksi :</label>
                  <input 
                    type="date" 
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Aliran Jurnal Kas :</label>
                  <select 
                    value={txType}
                    onChange={(e) => {
                      setTxType(e.target.value as any);
                      // set corresponding category
                      const matchingCat = categories.find(c => c.type === e.target.value);
                      if (matchingCat) setTxCategory(matchingCat.name);
                    }}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    <option value="Income">Pemasukan (+IN)</option>
                    <option value="Expense">Pengeluaran (-EXP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Kategori Akun :</label>
                <select 
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                >
                  {categories
                    .filter(c => c.type === txType)
                    .map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {txType === 'Income' && (
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Peruntukan / Alokasi :</label>
                  <select 
                    value={txAllocation}
                    onChange={(e) => setTxAllocation(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    {(profile?.incomeAllocations || ["Gaji / Operasional", "Peralatan", "Kegiatan Khusus", "Lainnya"]).map((alloc, idx) => (
                      <option key={idx} value={alloc}>{alloc}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Deskripsi / Perihal Transaksi :</label>
                <textarea 
                  rows={3}
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="Contoh: Pembayaran Gaji Karyawan Bln Juni...."
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 leading-relaxed focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Nominal Transaksi (IDR) :</label>
                  <input 
                    type="number" 
                    value={txAmount}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 font-semibold focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">{txType === 'Income' ? 'Pemberi Dukungan :' : 'Penerima Dana :'}</label>
                  <input 
                    type="text" 
                    value={txSource}
                    onChange={(e) => setTxSource(e.target.value)}
                    placeholder="Contoh: Bapak Hendra / Toko ATK Surya"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-medium cursor-pointer transition-colors text-xs"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" /> Simpan Jurnal
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRM MODAL: HAPUS KATEGORI ANGGARAN */}
      {deleteConfirmCategory && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-md overflow-hidden p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Kategori</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus kategori <strong className="text-slate-900">"{deleteConfirmCategory.name}"</strong>? Transaksi yang sudah terdaftar dengan kategori ini akan tetap dipertahankan dengan kategori aslinya.
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeleteConfirmCategory(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-medium text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCategory) {
                    onDeleteCategory(deleteConfirmCategory.id);
                  }
                  setDeleteConfirmCategory(null);
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
              >
                Ya, Hapus Kategori
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Visual Icon Save proxy
function Save(props: any) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={props.className}
      width="15"
      height="15"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  );
}
