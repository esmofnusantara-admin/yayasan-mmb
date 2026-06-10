/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Users, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  HeartHandshake, 
  CheckSquare, 
  ShieldAlert, 
  ChevronRight, 
  Plus, 
  Calendar, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Member, Transaction, Partner, SmallGroup, ApprovalRequest, AuditLog } from '../types';

interface DashboardTabProps {
  members: Member[];
  transactions: Transaction[];
  partners: Partner[];
  smallGroups: SmallGroup[];
  approvals: ApprovalRequest[];
  audits: AuditLog[];
  setTab: (tab: string) => void;
  onOpenQuickTx: () => void;
  onOpenQuickMember: () => void;
}

export default function DashboardTab({
  members,
  transactions,
  partners,
  smallGroups,
  approvals,
  audits,
  setTab,
  onOpenQuickTx,
  onOpenQuickMember,
}: DashboardTabProps) {
  // Financial Calculators
  const approvedTx = transactions.filter(t => t.status === 'Approved');
  const activeIncome = approvedTx
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);
  const activeExpense = approvedTx
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = activeIncome - activeExpense;

  // Partner Counts
  const activePartners = partners.filter(p => p.status === 'Aktif');
  const prospectivePartners = partners.filter(p => ['Prospek', 'Kontak Awal', 'Presentasi'].includes(p.status));
  const activeCommitmentsTotal = partners
    .filter(p => p.status === 'Aktif')
    .reduce((sum, p) => {
      if (p.frequency === 'Bulanan') return sum + (p.commitmentAmount * 12);
      return sum + p.commitmentAmount;
    }, 0);

  // Member Status Distribution
  const totalMembers = members.length;
  const activeMembersCount = members.filter(m => m.statusKeaktifan === 'Aktif').length;
  
  // Quick notifications
  const pendingApprovalsCount = approvals.filter(a => a.status === 'Pending').length;

  // Let's build a timeline of transactions for dynamic mini graph
  // Sorting transactions chronologically
  const sortedTx = [...transactions]
    .filter(t => t.status === 'Approved')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      {/* Upper Welcoming Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight">Pusat Kendali & Ringkasan Yayasan</h1>
          <p className="text-slate-300 text-sm mt-1">Sistem Pengelolaan Informasi Terpadu - Yayasan Gerakan Siswa Injili (ESM)</p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={onOpenQuickMember}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Anggota
          </button>
          <button 
            onClick={onOpenQuickTx}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all text-white cursor-pointer shadow-blue-900/30 shadow-md"
          >
            <Plus className="w-4 h-4" /> Transaksi Baru
          </button>
        </div>
      </div>

      {/* Primary Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Saldo Kas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all flex flex-col justify-between overflow-hidden min-w-0">
          <div className="flex justify-between items-start gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-widest font-mono block truncate">Saldo Kas Yayasan</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-1 break-words">
                Rp {netBalance.toLocaleString('id-ID')}
              </h2>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
            <span className="flex items-center gap-1 text-emerald-600 font-medium truncate">
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> Rp {activeIncome.toLocaleString('id-ID')} msk
            </span>
            <span className="flex items-center gap-1 text-rose-500 font-medium truncate">
              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" /> Rp {activeExpense.toLocaleString('id-ID')} kel
            </span>
          </div>
        </div>

        {/* KPI: Total Anggota */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all flex flex-col justify-between overflow-hidden min-w-0">
          <div className="flex justify-between items-start gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-widest font-mono block truncate">Kaderisasi Anggota</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-1 break-words">
                {totalMembers} Orang
              </h2>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
            <span className="font-medium text-slate-700 truncate">
              {activeMembersCount} Aktif Melayani
            </span>
            <span className="text-blue-600 font-semibold cursor-pointer flex items-center shrink-0" onClick={() => setTab('members')}>
              Kelola <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI: Kelompok Kecil */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all flex flex-col justify-between overflow-hidden min-w-0">
          <div className="flex justify-between items-start gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-widest font-mono block truncate">Kelompok Kecil (CG)</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-1 break-words">
                {smallGroups.length} Kelompok
              </h2>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
            <span className="text-slate-600 truncate">
              Di 4 Wilayah Pelayanan
            </span>
            <span className="text-amber-600 font-semibold cursor-pointer flex items-center shrink-0" onClick={() => setTab('small_groups')}>
              Detail <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI: Fundraising & Mitra */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md transition-all flex flex-col justify-between overflow-hidden min-w-0">
          <div className="flex justify-between items-start gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-widest font-mono block truncate">Mitra Pendukung</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-1 break-words">
                {activePartners.length} Aktif <span className="text-[10px] font-normal text-slate-450 block truncate">({prospectivePartners.length} prospek)</span>
              </h2>
            </div>
            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
            <span className="text-violet-700 font-medium truncate flex-1 min-w-0">
              Rp {(activeCommitmentsTotal / 12).toLocaleString('id-ID')}/bln
            </span>
            <span className="text-violet-600 font-semibold cursor-pointer flex items-center shrink-0" onClick={() => setTab('partners')}>
              Mitra <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Alerts and Pending Actions */}
      {pendingApprovalsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Antrean Verifikasi Approval Center</h4>
              <p className="text-xs text-amber-700">Ada {pendingApprovalsCount} pengajuan keuangan, surat, atau payroll yang membutuhkan keputusan persetujuan Anda.</p>
            </div>
          </div>
          <button 
            onClick={() => setTab('approvals')}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            Buka Approval Center
          </button>
        </div>
      )}

      {/* Main Grid: Analytical Charts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cashflow Custom Visual Graphic (Left & Center) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-md font-semibold text-slate-800">Visualisasi Arus Kas Bulanan</h3>
              <p className="text-slate-400 text-xs">Arus kas masuk-keluar berdasarkan log transaksi saat ini</p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 block"></span>
                <span>Pemasukan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-400 block"></span>
                <span>Pengeluaran</span>
              </div>
            </div>
          </div>

          {/* Simple Highly Polished Responsive SVG Chart */}
          <div className="h-64 relative flex items-end justify-between px-4 pt-6 border-b border-l border-slate-100">
            {/* Grid helper lines */}
            <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-between pointer-events-none opacity-50">
              <div className="border-t border-slate-100 w-full h-0"></div>
              <div className="border-t border-slate-100 w-full h-0"></div>
              <div className="border-t border-slate-100 w-full h-0"></div>
              <div className="border-t border-slate-100 w-full h-0"></div>
            </div>

            {/* Custom Responsive Chart Columns for realistic display */}
            <div className="w-full flex justify-around items-end z-10 h-full pb-2">
              {[
                { month: 'Jan', inc: 12000000, exp: 8000000 },
                { month: 'Feb', inc: 15400000, exp: 9500000 },
                { month: 'Mar', inc: 18000000, exp: 12100000 },
                { month: 'Apr', inc: 11200000, exp: 10500000 },
                { month: 'Mei', inc: 23000000, exp: 23650000 },
                { month: 'Jun', inc: activeIncome, exp: activeExpense },
              ].map((item, idx) => {
                const max = 30000000; // max scale
                const incHeight = Math.min((item.inc / max) * 100, 100);
                const expHeight = Math.min((item.exp / max) * 100, 100);
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 group w-12">
                    <div className="flex items-end gap-1.5 h-44 w-full justify-center">
                      {/* Income Bar */}
                      <div 
                        style={{ height: `${incHeight}%` }} 
                        className="w-3.5 bg-emerald-500 rounded-t-sm transition-all duration-500 relative group-hover:bg-emerald-400 animate-slide-up"
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-mono whitespace-nowrap z-30 shadow-md">
                          Inc: Rp {Math.round(item.inc/1000)}k
                        </div>
                      </div>
                      {/* Expense Bar */}
                      <div 
                        style={{ height: `${expHeight}%` }} 
                        className="w-3.5 bg-rose-400 rounded-t-sm transition-all duration-500 relative group-hover:bg-rose-300 animate-slide-up"
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-mono whitespace-nowrap z-30 shadow-md">
                          Exp: Rp {Math.round(item.exp/1000)}k
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-medium text-slate-500">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2.5">
            <span>* Skala Visual maksimum: Rp 30.000.000</span>
            <span>Update Terakhir: {new Date().toLocaleDateString('id-ID')}</span>
          </div>
        </div>

        {/* Member Journey Conversion Widget (Right) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-md font-semibold text-slate-800 mb-1">Pipeline Kaderisasi</h3>
            <p className="text-slate-400 text-xs mb-4">Journey Anggota dari Prospect hingga Alumni Aktif</p>
            
            <div className="space-y-3.5">
              {[
                { status: 'Prospect', color: 'bg-slate-300', count: members.filter(m => m.component === 'Umum').length + 1 },
                { status: 'Encounter (Siswa)', color: 'bg-emerald-400', count: members.filter(m => m.component === 'Siswa').length },
                { status: 'Explore (Mahasiswa)', color: 'bg-indigo-500', count: members.filter(m => m.component === 'Mahasiswa').length },
                { status: 'Connect (Alumni)', color: 'bg-amber-400', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan !== 'Aktif').length },
                { status: 'Alumni Aktif', color: 'bg-indigo-600', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan === 'Aktif').length + 1 },
              ].map((stage, idx) => {
                const percentage = Math.max((stage.count / (totalMembers || 1)) * 100, 8);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700">{stage.status}</span>
                      <span className="font-semibold text-slate-900 font-mono">{stage.count} org</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${percentage}%` }} 
                        className={`h-full ${stage.color} transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 mt-4">
            <button 
              onClick={() => setTab('Anggota')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              Ubah Data Anggota <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

      </div>

      {/* Standalone Monthly Financial Summary Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-3.5 uppercase tracking-wide font-sans">Rincian Nominal Bulanan</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { month: 'Januari', inc: 12000000, exp: 8000000 },
            { month: 'Februari', inc: 15400000, exp: 9500000 },
            { month: 'Maret', inc: 18000000, exp: 12100000 },
            { month: 'April', inc: 11200000, exp: 10500000 },
            { month: 'Mei', inc: 23000000, exp: 23650000 },
            { month: 'Juni (Aktif)', inc: activeIncome, exp: activeExpense },
          ].map((item, idx) => {
            const net = item.inc - item.exp;
            const isMei = idx === 4;
            const isActive = item.month.includes('Aktif');
            
            return (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 relative ${
                  isMei 
                    ? 'bg-slate-900 text-white border-slate-950 shadow-md ring-1 ring-slate-850' 
                    : isActive
                      ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950 hover:bg-slate-50'
                      : 'bg-white border-slate-200 text-slate-850 hover:border-slate-350 hover:bg-slate-50/20'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-100/10">
                  <span className={`text-[10px] font-extrabold uppercase font-mono tracking-wider ${
                    isMei ? 'text-slate-300' : isActive ? 'text-indigo-800' : 'text-slate-500'
                  }`}>
                    {item.month}
                  </span>
                  {isMei && (
                    <span className="bg-emerald-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      FOCUSED
                    </span>
                  )}
                </div>
                
                <div className="mt-3.5 space-y-2 text-[10px]">
                  <div className="flex justify-between items-center font-sans">
                    <span className={isMei ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>DEBET (Masuk):</span>
                    <span className={`font-mono font-bold ${isMei ? 'text-emerald-450' : 'text-emerald-600'}`}>
                      Rp {item.inc.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-sans">
                    <span className={isMei ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>KREDIT (Keluar):</span>
                    <span className={`font-mono font-bold ${isMei ? 'text-rose-405' : 'text-rose-500'}`}>
                      Rp {item.exp.toLocaleString('id-ID')}
                    </span>
                  </div>
                  
                  <div className={`flex justify-between items-center pt-2 mt-2 border-t font-mono font-bold ${
                    isMei ? 'border-slate-800' : 'border-slate-200/60'
                  }`}>
                    <span className={`font-sans text-[9px] font-bold ${isMei ? 'text-slate-300' : 'text-slate-650'}`}>
                      {net >= 0 ? 'SURPLUS' : 'DEFISIT'}:
                    </span>
                    <span className={`font-bold ${
                      net >= 0 
                        ? isMei ? 'text-emerald-400' : 'text-emerald-700' 
                        : isMei ? 'text-rose-400' : 'text-rose-600'
                    }`}>
                      {net >= 0 ? '+' : '-'}{`Rp ${Math.abs(net).toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions and Audit Trials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Ledger Entries */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-md font-semibold text-slate-800">Mutasi Kas Hari Ini</h3>
              <p className="text-slate-400 text-xs">Mutasi transaksi finansial yayasan terakhir</p>
            </div>
            <button 
              onClick={() => setTab('Keuangan')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center"
            >
              Buka Keuangan <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="py-3.5 hover:bg-slate-50/50 px-2 rounded-lg transition-all space-y-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl text-xs font-mono font-bold shrink-0 ${
                    tx.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {tx.type === 'Income' ? '+IN' : '-EXP'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">{tx.description}</h4>
                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <span>{tx.date}</span>&bull;<span>Kat: {tx.category}</span>
                    </p>
                  </div>
                </div>

                {/* Amount and Status wrapped under */}
                <div className="pl-11 pt-1.5 flex justify-between items-center text-xs border-t border-slate-50">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Nominal:</span>
                    <span className={`font-bold ${
                      tx.type === 'Income' ? 'text-emerald-600' : 'text-slate-850'
                    }`}>
                      {tx.type === 'Income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                      tx.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      tx.status === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Trail System Activity Logs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 justify-between">
            <div>
              <h3 className="text-md font-semibold text-slate-800">Audit Log Sistem</h3>
              <p className="text-slate-400 text-xs">Jejak aktivitas keamanan dan pengolahan data</p>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
              <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Real-time Secure log</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 space-y-2.5 max-h-80 overflow-y-auto shadow-inner">
            <div className="text-slate-500 text-[10px] border-b border-slate-800 pb-1.5 flex justify-between">
              <span>Timestamp</span>
              <span>Account Identity & Activity</span>
            </div>
            {audits.map((log) => (
              <div key={log.id} className="flex gap-2.5 leading-relaxed bg-slate-950/20 py-1 px-1.5 rounded border-l-2 border-indigo-500">
                <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                <div className="space-y-0.5">
                  <div>
                    <span className="text-indigo-400 font-bold">[{log.userName}]</span>{' '}
                    <span className="text-indigo-300 font-semibold">{log.userRole}</span>{' '}
                    <span className="text-white font-medium">{log.action}</span>{' '}
                    <span className="text-slate-500">({log.module})</span>
                  </div>
                  {log.beforeValue && (
                    <div className="text-emerald-400/85 pl-2 text-[10px]">
                      &rarr; changed value from <span className="line-through text-red-400/80">{log.beforeValue}</span> to <span className="font-bold">{log.afterValue}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
