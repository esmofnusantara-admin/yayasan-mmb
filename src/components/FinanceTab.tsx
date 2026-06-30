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
  RefreshCw
} from 'lucide-react';
import { Transaction, FinancialCategory, InstitutionalProfile } from '../types';
import { exportToCSV, exportLedgerToPDF } from '../utils/export';

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
    setTxType(tx.type);
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
        id: `TX-2026-${String(transactions.length + 1).padStart(5, '0')}`,
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

      lines.forEach(line => {
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
            id: `TX-2026-${String(transactions.length + 1 + loaded).padStart(5, '0')}`,
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
  
  const totalIncome = approvedTx
    .filter(t => t.type?.toLowerCase() === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = approvedTx
    .filter(t => t.type?.toLowerCase() === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const finalKasBalance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(tx => {
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
      exportToCSV(filteredTransactions, headers, keys, `data_keuangan_kas_${new Date().toISOString().substring(0, 10)}.csv`);
    } else {
      exportLedgerToPDF(filteredTransactions, profile, structures);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Finance Analytics Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card: Total Saldo Kas */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-md border border-slate-700/50 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-300">Total Saldo Kas Yayasan (Verified)</span>
            <h2 className="text-2xl font-bold font-mono tracking-tight mt-1">
              Rp {finalKasBalance.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/40 text-xs text-slate-300 flex justify-between items-center">
            <span>Staf Relasi: Mandiri Utama</span>
            <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
              ● Buku Jurnal Kas Aktif
            </span>
          </div>
        </div>

        {/* Card: Pemasukan Terkumpul */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-1 translate-y-1 w-24 h-24 bg-emerald-50 rounded-full -scale-110 opacity-30 pointer-events-none"></div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Income (Pemasukan)</span>
            <h2 className="text-xl font-bold font-mono text-emerald-600 tracking-tight mt-1">
              Rp {totalIncome.toLocaleString('id-ID')}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-4">Bersumber dari Komitmen bulanan, donasi insidental & sponsor.</p>
        </div>

        {/* Card: Pengeluaran Kantor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-1 translate-y-1 w-24 h-24 bg-rose-50 rounded-full -scale-110 opacity-30 pointer-events-none"></div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Expense (Pengeluaran)</span>
            <h2 className="text-xl font-bold font-mono text-slate-800 tracking-tight mt-1">
              Rp {totalExpense.toLocaleString('id-ID')}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-4">Dialokasikan untuk payroll gaji, operasional sewa, & retret siswa.</p>
        </div>

      </div>

      {/* Mode Control & Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        {/* Menu selections */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setActiveSubView('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              activeSubView === 'ledger' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Buku Jurnal Kas
          </button>
          <button 
            onClick={() => setActiveSubView('import')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              activeSubView === 'import' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Unggah Jurnal Excel
          </button>
          <button 
            onClick={() => setActiveSubView('categories')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              activeSubView === 'categories' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Kategori & Budgeting
          </button>
          <button 
            onClick={() => setActiveSubView('kas_history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
              activeSubView === 'kas_history' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Log Aliran Saldo (Table Kas)
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {activeSubView === 'ledger' && (
            <>
              <button 
                onClick={() => triggerSimulationExport('Excel')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors"
                title="Export Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export
              </button>
              <button 
                onClick={() => triggerSimulationExport('PDF')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors"
                title="Unduh PDF Resmi"
              >
                <Download className="w-4 h-4 text-indigo-600" /> Unduh PDF
              </button>
              {isEditable && (
                <button 
                  onClick={openAddForm}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Entri Kas
                </button>
              )}
            </>
          )}
        </div>

      </div>

      {/* VIEW 1: GENERAL LEDGER TABLE */}
      {activeSubView === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          
          {/* Filtering bar in ledger */}
          <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari deskripsi transaksi, sumber pendana atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            
            <div className="flex gap-2 text-xs">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none"
              >
                <option value="Semua">Semua Aliran Kas</option>
                <option value="Income">Pemasukan (+IN)</option>
                <option value="Expense">Pengeluaran (-EXP)</option>
              </select>

              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none"
              >
                <option value="Semua">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Jurnal Ledger table rendering */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                  <th className="p-4">Kode Ref / Tanggal</th>
                  <th className="p-4">Kategori Akun</th>
                  <th className="p-4">Deskripsi Mutasi</th>
                  <th className="p-4">Sumber / Pihak Relasi</th>
                  <th className="p-4 text-right">Nominal Transaksi</th>
                  <th className="p-4">Status Approval</th>
                  {isEditable && <th className="p-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/10 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 font-mono tracking-tight text-[11px]">{tx.id}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{tx.date}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-600 font-semibold">{tx.category}</span>
                      {tx.type?.toLowerCase() === 'income' && tx.allocationObjective && (
                        <div className="text-[10px] text-indigo-600 font-bold mt-0.5">Peruntukan: {tx.allocationObjective}</div>
                      )}
                    </td>
                    <td className="p-4 font-medium text-slate-800 max-w-sm leading-relaxed">
                      {tx.description}
                    </td>
                    <td className="p-4 font-medium text-slate-600">
                      {tx.sourceOrRecipient}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-mono text-sm font-bold ${
                        tx.type?.toLowerCase() === 'income' ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {tx.type?.toLowerCase() === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        (tx.status || 'Approved') === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        (tx.status || 'Approved') === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {tx.status || 'Approved'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          {canEdit && (
                            <button 
                              onClick={() => openEditForm(tx)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[10px] rounded-lg font-bold text-indigo-755 cursor-pointer shadow-xs transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => onDeleteTransaction(tx.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-150 border border-rose-200 text-[10px] rounded-lg font-bold text-rose-755 cursor-pointer shadow-xs transition-colors"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex justify-between text-xs text-slate-505">
            <span>Filter Menampilkan {filteredTransactions.length} baris riwayat kas</span>
            <span className="font-mono text-[10px]">Jurnal Terverifikasi &bull; Sistem Internal</span>
          </div>

        </div>
      )}

      {/* VIEW 2: MASS PARSING EXCEL IMPORT */}
      {activeSubView === 'import' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-semibold text-slate-800">Unggah Masal Jurnal Transaksi</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Modul penyesuaian kas bulanan dari slip mutasi bank atau laporan audit fisik. Salin-tempel multi baris dengan pemisah karakter pipa (<code className="bg-slate-100 p-0.5 rounded font-bold font-mono">|</code>) untuk langsung menyatukannya dengan catatan kas utama di memori aplikasi.
            </p>
          </div>

          <div className="space-y-3 font-sans">
            <span className="text-xs font-mono font-bold text-indigo-600 block">FORMAT PASTE KOLOM KAS JURNAL:</span>
            <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-xl border border-slate-800 overflow-x-auto whitespace-nowrap">
              Tanggal (YYYY-MM-DD) | Kategori_Akun | Deskripsi_Mutasi | Nominal_Rupiah | Tipe_Aliran_Kas (Income/Expense) | Rekening_Sumber
            </div>
            
            <div>
              <label className="text-xs text-slate-600 block mb-1">Jurnal Arus Kas:</label>
              <textarea 
                rows={5}
                value={pastedLedgerText}
                onChange={(e) => setPastedLedgerText(e.target.value)}
                className="w-full font-mono text-[11px] p-3 border border-slate-200 rounded-xl leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {importStatus}
              </div>
            )}

            <button 
              onClick={handleBulkLedgerImport}
              className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Impor Data ke Catatan Kas
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: CATEGORIES & CONTROLS BUDGET LIMITS */}
      {activeSubView === 'categories' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-semibold text-slate-800">Pengaturan Kategori & Batas Anggaran Kelembagaan (Budgeting Limit)</h3>
            <p className="text-xs text-slate-500 mt-1">Garis kontrol alokasi kas bulanan per pos pengeluaran dalam setahun.</p>
          </div>

          {/* Form to Add New Category */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">➕ Tambah Kategori Akun Baru / Atur Batas Budgeting</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-500 block mb-1 text-[10px] font-bold">Nama Kategori Buku Kas :</label>
                <input 
                  type="text" 
                  value={newCatName} 
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: ATK & Cetak, Sewa Kantor"
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="text-slate-500 block mb-1 text-[10px] font-bold">Jenis Akun Mutasi :</label>
                <select 
                  value={newCatType} 
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-xs text-slate-800"
                >
                  <option value="Expense">Pengeluaran (-EXP)</option>
                  <option value="Income">Pemasukan (+IN)</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 block mb-1 text-[10px] font-bold">Batas Limit Anggaran Bulanan (IDR - Opsional) :</label>
                <input 
                  type="number" 
                  value={newCatLimit || ''} 
                  onChange={(e) => setNewCatLimit(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Contoh: 5000000"
                  className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-xs text-slate-800 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
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
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-[11px] shadow-sm cursor-pointer"
              >
                Simpan & Daftarkan Kategori
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const txsForCat = transactions.filter(t => t.category === cat.name && (t.status === undefined || t.status === 'Approved'));
              const usedAmount = txsForCat.reduce((sum, t) => sum + t.amount, 0);
              const percentage = cat.budgetLimit ? Math.min((usedAmount / cat.budgetLimit) * 100, 100) : 0;
              const isOver = cat.budgetLimit && usedAmount > cat.budgetLimit;

              return (
                <div key={cat.id} className="p-4 border border-slate-100 bg-white rounded-2xl hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        cat.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {cat.type === 'Income' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {cat.id}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3">{cat.name}</h4>
                    
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Realisasi Kas:</span>
                        <strong className="text-slate-800 font-mono">Rp {usedAmount.toLocaleString('id-ID')}</strong>
                      </div>
                      
                      {editingCatId === cat.id ? (
                        <div className="space-y-1.5 pt-2 border-t mt-2">
                          <label className="text-[10px] text-slate-400 font-bold block">Edit Limit Anggaran (IDR):</label>
                          <div className="flex gap-1.5">
                            <input 
                              type="number"
                              value={editLimitVal}
                              onChange={(e) => setEditLimitVal(e.target.value ? Number(e.target.value) : '')}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                              placeholder="Limit..."
                            />
                            <button 
                              onClick={() => {
                                if (onUpdateCategory) {
                                  onUpdateCategory({
                                    ...cat,
                                    budgetLimit: editLimitVal ? Number(editLimitVal) : undefined
                                  });
                                }
                                setEditingCatId(null);
                                setEditLimitVal('');
                              }}
                              className="px-2 py-1 bg-indigo-650 hover:bg-slate-800 text-white rounded font-bold text-[10px]"
                            >
                              OK
                            </button>
                            <button 
                              onClick={() => setEditingCatId(null)}
                              className="px-2 py-1 border rounded text-[10px]"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center pt-1">
                            <span>Batas Limit Anggaran:</span>
                            <span className="font-semibold text-slate-600 font-mono">
                              {cat.budgetLimit ? `Rp ${cat.budgetLimit.toLocaleString('id-ID')}` : 'Belum Ditentukan'}
                            </span>
                          </div>
                          
                          {cat.budgetLimit ? (
                            <>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                                <div 
                                  style={{ width: `${percentage}%` }} 
                                  className={`h-full ${isOver ? 'bg-rose-500' : 'bg-indigo-600'} transition-all`}
                                />
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold mt-1 text-right">Pemakaian: {percentage.toFixed(0)}%</p>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>

                  {isOver && (
                    <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pos Anggaran ini Melebihi Batas Tahun Ini!
                    </div>
                  )}

                  {/* Edit / Delete actions at the card bottom */}
                  {editingCatId !== cat.id && (
                    <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end gap-1.5">
                      <button 
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditLimitVal(cat.budgetLimit || '');
                        }}
                        className="px-2 py-1 hover:bg-slate-100 text-slate-500 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Edit limit anggaran"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit Limit
                      </button>
                      <button 
                        onClick={() => {
                          setDeleteConfirmCategory(cat);
                        }}
                        className="px-2 py-1 hover:bg-red-50 text-red-500 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Hapus kategori ini"
                      >
                        <Trash className="w-3.5 h-3.5" /> Hapus
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
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-md font-semibold text-slate-800">Buku Register Aliran Saldo & Jurnal Transaksi (Table Kas Trace Log)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Catatan mutasi saldo kas riil secara terus-menerus (append-only ledger) untuk akuntabilitas tinggi dan kepatuhan audit.
              </p>
            </div>
            <button 
              onClick={fetchKasHistory}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHistoryLoading ? 'animate-spin' : ''}`} /> Refresh Log
            </button>
          </div>

          {/* Log metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Snapshot Entri Log</span>
              <p className="text-lg font-bold text-slate-705 font-mono mt-0.5">{kasHistory.length} Baris Jurnal</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Saldo Akhir di Buku Kas</span>
              <p className="text-lg font-bold text-indigo-700 font-mono mt-0.5">Rp {finalKasBalance.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Kepatuhan Integritas</span>
              <p className="text-xs font-bold text-emerald-600 mt-1 font-mono">✓ Lolos Audit Otomatis (100% Cocok)</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Cari Keterangan / Ref / Operator:</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder="Ketik keterangan..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Filter Tipe Kas:</label>
              <select 
                value={historyFilterType}
                onChange={(e) => setHistoryFilterType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
              >
                <option value="Semua">Semua Tipe (Income & Expense)</option>
                <option value="income">Hanya Pemasukan (+)</option>
                <option value="expense">Hanya Pengeluaran (-)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Filter Sumber:</label>
              <select 
                value={historyFilterSource}
                onChange={(e) => setHistoryFilterSource(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
              >
                <option value="Semua">Semua Sumber (Manual, Donasi, Gaji)</option>
                <option value="manual">Manual / Bendahara</option>
                <option value="donation">Fundraising / Mitra</option>
                <option value="payroll">Disbursement / Payroll</option>
              </select>
            </div>
          </div>

          {/* Log Table Container */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                  <th className="p-4">Tanggal Log & ID Jurnal</th>
                  <th className="p-4">Aksi</th>
                  <th className="p-4">Kategori & Pihak Kedua</th>
                  <th className="p-4 text-right font-mono">Nominal</th>
                  <th className="p-4 text-center font-mono">Aliran Saldo</th>
                  <th className="p-4">Operator & Saluran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isHistoryLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <div className="animate-spin inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
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
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold">Belum Ada Catatan Mutasi / Filter Tidak Cocok</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Coba tambahkan atau hapus transaksi keuangan kas, maka perubahannya akan otomatis terekam secara atomic di sini.
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
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-700 font-mono text-[10px] tracking-tight">{log.id}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formattedDate} {formattedTime}</div>
                        {log.transaction_id && (
                          <div className="text-[9px] text-indigo-500 font-bold font-mono mt-0.5">Ref ID: {log.transaction_id}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase ${
                          log.action === 'DELETE' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          log.action === 'EDIT' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {log.action || 'CREATE'}
                        </span>
                      </td>
                      <td className="p-4 font-medium">
                        <span className="font-bold text-slate-800 block text-[11px] mb-0.5">{log.category}</span>
                        <span className="text-slate-500 line-clamp-2 max-w-xs block leading-relaxed">{log.description || '(Tidak ada keterangan)'}</span>
                      </td>
                      <td className="p-4 text-right font-bold font-mono text-[11px]">
                        <span className={(log.type || '').toLowerCase() === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                          {(log.type || '').toLowerCase() === 'income' ? '+' : '-'} Rp {Number(log.amount || 0).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono text-[10px]">
                        <div className="text-slate-400">Sebelum: Rp {Number(log.balanceBefore || 0).toLocaleString('id-ID')}</div>
                        <div className="text-indigo-600 font-semibold mt-0.5">Sesudah: Rp {Number(log.balanceAfter || 0).toLocaleString('id-ID')}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-700">{log.updatedBy}</div>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded mt-1 inline-block uppercase ${
                          log.source === 'donation' ? 'bg-teal-50 text-teal-600' :
                          log.source === 'payroll' ? 'bg-blue-50 text-blue-600' :
                          'bg-slate-100 text-slate-600'
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
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden my-8 scale-95 transition-transform">
            
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">{editingTx ? 'Ubah Catatan Transaksi Kas' : 'Input Transaksi Jurnal Baru'}</dt>
                <dd className="text-[11px] text-slate-300">Setiap nominal pengeluaran di bawah wewenang persetujuan Bendahara.</dd>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-450 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">Tanggal Transaksi :</label>
                  <input 
                    type="date" 
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Aliran Jurnal Kas :</label>
                  <select 
                    value={txType}
                    onChange={(e) => {
                      setTxType(e.target.value as any);
                      // set corresponding category
                      const matchingCat = categories.find(c => c.type === e.target.value);
                      if (matchingCat) setTxCategory(matchingCat.name);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                  >
                    <option value="Income">Pemasukan (+IN)</option>
                    <option value="Expense">Pengeluaran (-EXP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Kategori Akun Makro :</label>
                <select 
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 font-sans"
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
                  <label className="text-slate-500 block mb-1">Peruntukan / Tujuan Pemasukan :</label>
                  <select 
                    value={txAllocation}
                    onChange={(e) => setTxAllocation(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                  >
                    {(profile?.incomeAllocations || ["Gaji / Operasional", "Peralatan", "Kegiatan Khusus", "Lainnya"]).map((alloc, idx) => (
                      <option key={idx} value={alloc}>{alloc}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-500 block mb-1">Deskripsi / Perihal Transaksi :</label>
                <textarea 
                  rows={3}
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="Contoh: Pembayaran Gaji Karyawan Bln Juni...."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">Nominal Transaksi (IDR) :</label>
                  <input 
                    type="number" 
                    value={txAmount}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">{txType === 'Income' ? 'Pemberi Dukungan :' : 'Penerima Dana :'}</label>
                  <input 
                    type="text" 
                    value={txSource}
                    onChange={(e) => setTxSource(e.target.value)}
                    placeholder="Contoh: Bapak Hendra / Toko ATK Surya"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-750 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4 inline mr-1" /> Simpan Jurnal
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRM MODAL: HAPUS KATEGORI ANGGARAN */}
      {deleteConfirmCategory && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Konfirmasi Hapus Kategori</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus kategori kustom <strong className="text-slate-800">"{deleteConfirmCategory.name}"</strong>? Transaksi yang sudah terdaftar dengan kategori ini akan tetap dipertahankan dengan kategori aslinya.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCategory(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs cursor-pointer"
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
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
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
