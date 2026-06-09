/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  AlertTriangle 
} from 'lucide-react';
import { Transaction, FinancialCategory } from '../types';
import { exportToCSV } from '../utils/export';

interface FinanceTabProps {
  transactions: Transaction[];
  categories: FinancialCategory[];
  onAddTransaction: (tx: Transaction) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentRole: string;
}

export default function FinanceTab({
  transactions,
  categories,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  currentRole,
}: FinanceTabProps) {
  const [activeSubView, setActiveSubView] = useState<'ledger' | 'import' | 'categories'>('ledger');
  
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
    setIsFormOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription || txAmount <= 0) {
      alert('Deskripsi & Nominal wajib diisi dengan benar!');
      return;
    }

    // Role-based status workflow:
    // Bendahara and Super Admin can directly Approve transactions.
    // Others/Staff create as "Pending Approval" which notifies the Approval center!
    const requiresApproval = !['Bendahara', 'Super Admin'].includes(currentRole);
    const resolvedStatus = editingTx 
      ? editingTx.status 
      : (requiresApproval ? 'Pending Approval' : 'Approved');

    // Balance checks: Validate if debit balance/cash is sufficient for this credit transaction (Expense)
    if (txType === 'Expense' && resolvedStatus === 'Approved') {
      const oldCreditAmount = (editingTx && editingTx.status === 'Approved' && editingTx.type === 'Expense') ? editingTx.amount : 0;
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
        status: resolvedStatus
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
        status: resolvedStatus
      };
      onAddTransaction(newTx);
    }

    setIsFormOpen(false);
    if (requiresApproval) {
      alert('Transaksi berhasil diajukan! Dikarenakan akun Anda bertindak sebagai Staff/Non-Bendahara, nominal ini akan masuk antrean Approval Center untuk divalidasi Bendahara.');
    } else {
      alert('Transaksi Berhasil Disimpan & Diterbitkan ke Ledger Induk.');
    }
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
  const approvedTx = transactions.filter(t => t.status === 'Approved');
  
  const totalIncome = approvedTx
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = approvedTx
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const finalKasBalance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.sourceOrRecipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'Semua' || tx.type === filterType;
    const matchesCategory = filterCategory === 'Semua' || tx.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

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
      window.print();
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
              ● Active Ledger
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
            Aliran kas Jurnal Kas
          </button>
          <button 
            onClick={() => setActiveSubView('import')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              activeSubView === 'import' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Import Excel Ledger
          </button>
          <button 
            onClick={() => setActiveSubView('categories')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              activeSubView === 'categories' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Kategori & Budgeting
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
              >
                <Printer className="w-4 h-4 text-indigo-600" /> Print Laporan
              </button>
              <button 
                onClick={openAddForm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Entri Kas
              </button>
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
                  <th className="p-4 text-center">Aksi</th>
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
                    </td>
                    <td className="p-4 font-medium text-slate-800 max-w-sm leading-relaxed">
                      {tx.description}
                    </td>
                    <td className="p-4 font-medium text-slate-600">
                      {tx.sourceOrRecipient}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-mono text-sm font-bold ${
                        tx.type === 'Income' ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {tx.type === 'Income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        tx.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        tx.status === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => openEditForm(tx)}
                          className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] rounded font-semibold text-slate-600 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded text-[10px] cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex justify-between text-xs text-slate-505">
            <span>Filter Menampilkan {filteredTransactions.length} baris ledger audit</span>
            <span className="font-mono text-[10px]">Verified Ledger &bull; Internal System</span>
          </div>

        </div>
      )}

      {/* VIEW 2: MASS PARSING EXCEL IMPORT */}
      {activeSubView === 'import' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-semibold text-slate-800">Uploader Import Massal Jurnal Transaksi</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Modul penyesuaian kas bulanan dari slip mutasi bank atau laporan audit fisik. Salin-tempel multi baris dengan pemisah karakter pipa (<code className="bg-slate-100 p-0.5 rounded font-bold font-mono">|</code>) untuk langsung menyatukannya dengan ledger utama di memori aplikasi.
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
              <Upload className="w-4 h-4" /> Import Ledger ke Kas Utama
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const txsForCat = transactions.filter(t => t.category === cat.name && t.status === 'Approved');
              const usedAmount = txsForCat.reduce((sum, t) => sum + t.amount, 0);
              const percentage = cat.budgetLimit ? Math.min((usedAmount / cat.budgetLimit) * 100, 100) : 0;
              const isOver = cat.budgetLimit && usedAmount > cat.budgetLimit;

              return (
                <div key={cat.id} className="p-4 border border-slate-100 rounded-2xl hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        cat.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {cat.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {cat.id}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3">{cat.name}</h4>
                    
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Realisasi Kas:</span>
                        <strong className="text-slate-800">Rp {usedAmount.toLocaleString('id-ID')}</strong>
                      </div>
                      
                      {cat.budgetLimit && (
                        <>
                          <div className="flex justify-between">
                            <span>Batas Limit Anggaran:</span>
                            <span className="font-semibold text-slate-600">Rp {cat.budgetLimit.toLocaleString('id-ID')}</span>
                          </div>
                          
                          {/* Visual progress bar */}
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                            <div 
                              style={{ width: `${percentage}%` }} 
                              className={`h-full ${isOver ? 'bg-rose-500' : 'bg-indigo-600'} transition-all`}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {isOver && (
                    <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pos Anggaran ini Melebihi Batas Tahun Ini!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: EXCEL JURNAL ENTRY */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden my-8 scale-95 transition-transform">
            
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">{editingTx ? 'Ubah Data Pencatatan Ledger' : 'Input Transaksi Jurnal Baru'}</dt>
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
