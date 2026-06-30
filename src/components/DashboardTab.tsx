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
  ArrowDownRight,
  Printer,
  Gift,
  FilePieChart,
  Sparkles,
  Copy
} from 'lucide-react';
import { Member, Transaction, Partner, SmallGroup, ApprovalRequest, AuditLog, Staff } from '../types';
import { exportDashboardSummaryToPDF } from '../utils/export';
import MMBLogo from './MMBLogo';

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
  profile?: any;
  staffs?: Staff[];
  hasFeatureAccess: (feature: string) => boolean;
  currentRole?: string;
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
  profile,
  staffs = [],
  hasFeatureAccess,
  currentRole = 'Staff',
}: DashboardTabProps) {
  // Financial Calculators
  const approvedTx = transactions.filter(t => t.status === undefined || t.status === 'Approved');
  const activeIncome = approvedTx
    .filter(t => t.type?.toLowerCase() === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const activeExpense = approvedTx
    .filter(t => t.type?.toLowerCase() === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = activeIncome - activeExpense;

  // Dynamic 6-month financial timeline calculated from real transactions
  const generateMonthsList = () => {
    const list = [];
    const now = new Date();
    // Generate 6 months ending with current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({
        shortName: d.toLocaleString('id-ID', { month: 'short' }),
        fullName: d.toLocaleString('id-ID', { month: 'long' }),
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        isCurrent: i === 0,
      });
    }
    return list;
  };

  const monthlyTimeline = generateMonthsList().map((m, idx) => {
    const txsInMonth = approvedTx.filter(t => {
      const tDateString = t.date || t.transaction_date || t.created_at;
      if (!tDateString) return false;
      const txDate = new Date(tDateString);
      return txDate.getMonth() === m.monthNum && txDate.getFullYear() === m.year;
    });

    const inc = txsInMonth
      .filter(t => t.type?.toLowerCase() === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const exp = txsInMonth
      .filter(t => t.type?.toLowerCase() === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      monthLabel: m.shortName,
      monthFullLabel: idx === 5 ? `${m.fullName} (Aktif)` : m.fullName,
      inc,
      exp,
      isCurrent: m.isCurrent,
    };
  });

  const maxInTimeline = Math.max(...monthlyTimeline.map(m => Math.max(m.inc, m.exp)), 1000000);
  const chartMax = Math.ceil(maxInTimeline / 5000000) * 5000000;

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

  // Birthdays Filter & Print Summary Handler
  const currentMonthNumStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const monthName = new Date().toLocaleDateString('id-ID', { month: 'long' });

  // Define unified birthday elements
  const memberBirthdays = members
    .filter(m => m.birthDate)
    .map(m => ({
      id: m.id,
      fullName: m.fullName,
      nickName: m.nickName || m.fullName.split(' ')[0],
      birthDate: m.birthDate,
      component: m.component || 'Anggota',
      region: m.region || 'Umum'
    }));

  const staffBirthdays = (staffs || [])
    .filter(s => s.birthDate)
    .map(s => ({
      id: s.nik,
      fullName: s.name,
      nickName: s.name.split(' ')[0],
      birthDate: s.birthDate,
      component: 'Staf kepegawaian',
      region: s.division || 'Kantor Pusat'
    }));

  const upcomingBirthdays = [...memberBirthdays, ...staffBirthdays]
    .filter(b => {
      const parts = b.birthDate.split('-');
      return parts.length >= 2 && parts[1] === currentMonthNumStr;
    })
    .sort((a, b) => {
      const dayA = parseInt(a.birthDate.split('-')[2] || '0', 10);
      const dayB = parseInt(b.birthDate.split('-')[2] || '0', 10);
      return dayA - dayB;
    });

  const pendingApprovals = approvals.filter(a => a.status === 'Pending');

  const handlePrintSummary = () => {
    exportDashboardSummaryToPDF(upcomingBirthdays, pendingApprovals);
  };

  // Let's build a timeline of transactions for dynamic mini graph
  // Sorting transactions chronologically
  const sortedTx = [...transactions]
    .filter(t => t.status === undefined || t.status === 'Approved')
    .sort((a, b) => {
      const dateA = a.date || a.transaction_date || '';
      const dateB = b.date || b.transaction_date || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Upper Welcoming Banner - Styled to be extremely warm, cozy and friendly ("Santai, tidak kaku") */}
      <div className="bg-gradient-to-br from-indigo-50/90 via-sky-50/80 to-rose-50/80 border border-indigo-100/60 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6 transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-md shadow-indigo-150/50 shrink-0 border border-indigo-50/50 hover:rotate-3 transition-transform duration-300">
            <MMBLogo size="100%" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#DC2626] font-semibold flex items-center gap-1 bg-red-50/60 px-2.5 py-1 rounded-full border border-red-100/20">
                ❤️ Mari Melayani dengan Kasih
              </span>
            </div>
            <h1 className="text-2xl font-black font-sans tracking-tight text-slate-900 mt-2">
              Shalom Kak, Selamat Melayani! 👋
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl font-medium leading-relaxed">
              Selamat datang di pusat informasi dan administrasi pelayanan. Mari jalankan tata kelola siswa, mahasiswa, alumni, dan kelompok kecil pemuridan (KTB) dengan penuh sukacita! 📖✨
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start xl:self-center bg-white/50 p-3 rounded-2xl border border-white/80 shadow-xs">
          {hasFeatureAccess('reports') && (
            <button 
              onClick={() => setTab('reports')}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] hover:translate-y-[-1px] active:translate-y-0 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all text-white cursor-pointer shadow-[0_4px_14px_rgba(37,99,235,0.15)]"
            >
              <FilePieChart className="w-4 h-4" /> Pusat Laporan
            </button>
          )}
          <button 
            onClick={onOpenQuickMember}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 hover:translate-y-[-1px] active:translate-y-0 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all text-white cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Anggota
          </button>
          {hasFeatureAccess('finance') && (
            <button 
              onClick={onOpenQuickTx}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 hover:translate-y-[-1px] active:translate-y-0 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all text-white cursor-pointer shadow-[0_4px_14px_rgba(225,29,72,0.15)]"
            >
              <Plus className="w-4 h-4" /> Transaksi Baru
            </button>
          )}
        </div>
      </div>

      {/* Primary Key Performance Indicators - Cozy Pastel Transitions */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${
        hasFeatureAccess('finance') && hasFeatureAccess('partners') 
          ? 'lg:grid-cols-4' 
          : (hasFeatureAccess('finance') || hasFeatureAccess('partners') ? 'lg:grid-cols-3' : 'lg:grid-cols-2')
      } gap-4`}>
        {/* KPI: Saldo Kas */}
        {hasFeatureAccess('finance') && (
          <div className="bg-gradient-to-br from-white to-emerald-50/40 p-5 rounded-3xl border border-emerald-100/50 shadow-xs hover:shadow-md hover:border-emerald-200/80 transition-all duration-300 flex flex-col justify-between overflow-hidden min-w-0">
            <div className="flex justify-between items-start gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-wider block truncate">Saldo Kas Yayasan 💰</span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1.5 break-words">
                  Rp {netBalance.toLocaleString('id-ID')}
                </h2>
              </div>
              <div className="p-3 bg-emerald-100/80 text-emerald-700 rounded-2xl shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-100/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 min-w-0">
              <span className="flex items-center gap-1 text-emerald-600 font-bold truncate">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> Rp {activeIncome.toLocaleString('id-ID')} msk
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-bold truncate">
                <ArrowDownRight className="w-3.5 h-3.5 shrink-0" /> Rp {activeExpense.toLocaleString('id-ID')} kel
              </span>
            </div>
          </div>
        )}

        {/* KPI: Total Anggota */}
        <div className="bg-gradient-to-br from-white to-blue-50/40 p-5 rounded-3xl border border-blue-100/50 shadow-xs hover:shadow-md hover:border-blue-200/80 transition-all duration-300 flex flex-col justify-between overflow-hidden min-w-0">
          <div className="flex justify-between items-start gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-blue-700/80 uppercase tracking-wider block truncate">Kaderisasi Anggota 👥</span>
              <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1.5 break-words">
                {totalMembers} Orang
              </h2>
            </div>
            <div className="p-3 bg-blue-100/80 text-blue-700 rounded-2xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-100/40 flex items-center justify-between gap-2 text-[11px] text-slate-500 min-w-0">
            <span className="font-bold text-blue-700 truncate bg-blue-50/85 px-2 py-0.5 rounded-md">
              {activeMembersCount} Aktif Melayani
            </span>
            <span className="text-blue-600 font-bold cursor-pointer flex items-center shrink-0 hover:underline" onClick={() => setTab('members')}>
              Kelola <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* KPI: Kelompok Kecil */}
        <div className="bg-gradient-to-br from-white to-amber-50/40 p-5 rounded-3xl border border-amber-100/50 shadow-xs hover:shadow-md hover:border-amber-200/80 transition-all duration-300 flex flex-col justify-between overflow-hidden min-w-0">
          <div className="flex justify-between items-start gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-amber-700/85 uppercase tracking-wider block truncate">Kelompok Kecil (KTB) 📖</span>
              <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1.5 break-words">
                {smallGroups.length} Kelompok
              </h2>
            </div>
            <div className="p-3 bg-amber-100/80 text-amber-700 rounded-2xl shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-100/40 flex items-center justify-between gap-2 text-[11px] text-slate-500 min-w-0">
            <span className="font-semibold text-amber-800 truncate bg-amber-50/85 px-2 py-0.5 rounded-md">
              Di Wilayah Pelayanan
            </span>
            <span className="text-amber-600 font-bold cursor-pointer flex items-center shrink-0 hover:underline" onClick={() => setTab('small_groups')}>
              Detail <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* KPI: Fundraising & Mitra */}
        {hasFeatureAccess('partners') && (
          <div className="bg-gradient-to-br from-white to-violet-50/40 p-5 rounded-3xl border border-violet-100/50 shadow-xs hover:shadow-md hover:border-violet-200/80 transition-all duration-300 flex flex-col justify-between overflow-hidden min-w-0">
            <div className="flex justify-between items-start gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-violet-700/80 uppercase tracking-wider block truncate">Mitra Pendukung 🤝</span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight mt-1.5 break-words">
                  {activePartners.length} Mitra <span className="text-[9px] font-medium text-slate-400 block truncate">({prospectivePartners.length} prospek)</span>
                </h2>
              </div>
              <div className="p-3 bg-violet-100/80 text-violet-700 rounded-2xl shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-violet-100/40 flex items-center justify-between gap-2 text-[11px] text-slate-500 min-w-0">
              {currentRole !== 'Staff' ? (
                <span className="text-violet-700 font-bold truncate bg-violet-50/85 px-2 py-0.5 rounded-md flex-1 min-w-0">
                  Rp {(activeCommitmentsTotal / 12).toLocaleString('id-ID')}/bln
                </span>
              ) : (
                <span className="text-violet-700 font-bold truncate bg-violet-50/85 px-2 py-0.5 rounded-md flex-1 min-w-0">
                  Database & Pipeline CRM Mitra
                </span>
              )}
              <span className="text-violet-600 font-bold cursor-pointer flex items-center shrink-0 hover:underline" onClick={() => setTab('partners')}>
                Detail <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
          </div>
        )}
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
      <div className={`grid grid-cols-1 ${currentRole === 'Staff' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
        
        {/* Cashflow Custom Visual Graphic (Left & Center) */}
        {currentRole !== 'Staff' && (
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
              {monthlyTimeline.map((item, idx) => {
                const incHeight = Math.min((item.inc / chartMax) * 100, 100);
                const expHeight = Math.min((item.exp / chartMax) * 100, 100);
                
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
                    <span className="text-[11px] font-mono font-medium text-slate-500">{item.monthLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2.5">
            <span>* Skala Visual maksimum: Rp {chartMax.toLocaleString('id-ID')}</span>
            <span>Update Terakhir: {new Date().toLocaleDateString('id-ID')}</span>
          </div>
        </div>
        )}
 
         {/* Right Column Grid: Career pipeline and Birthday highlights */}
         {currentRole !== 'Staff' ? (
           <div className="space-y-6 flex flex-col">
           {/* Member Journey Conversion Widget */}
           <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between flex-1">
             <div>
               <h3 className="text-md font-semibold text-slate-800 mb-1">Pipeline Kaderisasi</h3>
               <p className="text-slate-400 text-xs mb-4">Journey Anggota dari Prospect hingga Alumni Aktif</p>
               
               <div className="space-y-3.5">
                 {[
                   { status: 'Prospect', color: 'bg-slate-300', count: members.filter(m => m.component === 'Umum').length },
                   { status: 'Encounter (Siswa)', color: 'bg-emerald-400', count: members.filter(m => m.component === 'Siswa').length },
                   { status: 'Explore (Mahasiswa)', color: 'bg-indigo-500', count: members.filter(m => m.component === 'Mahasiswa').length },
                   { status: 'Connect (Alumni)', color: 'bg-amber-400', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan !== 'Aktif').length },
                   { status: 'Alumni Aktif', color: 'bg-indigo-600', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan === 'Aktif').length },
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
                onClick={() => setTab('members')}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                Ubah Data Anggota <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Birthday highlights of the month */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5 text-slate-800">
                  <Gift className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <h3 className="text-sm font-bold">Ulang Tahun Bulan Ini</h3>
                </div>
                <span className="bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full text-[9px] font-bold font-sans">
                  {monthName}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mb-3">Apresiasi hari istimewa dan rencana perayaan bersama Yayasan MMB</p>
              
              {upcomingBirthdays.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-[11px] italic">
                  Tidak ada ulang tahun di bulan ini.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
                  {upcomingBirthdays.map((m) => {
                    const birthDay = parseInt(m.birthDate.split('-')[2] || '0', 10);
                    const isToday = birthDay === new Date().getDate();
                    
                    // Generate Initials
                    const names = m.fullName.split(' ');
                    const initials = names.map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                    
                    // Determine theme styling based on category
                    const styleMap: { [key: string]: { bg: string, border: string, avatar: string } } = {
                      'Siswa': { bg: 'bg-emerald-50/40', border: 'border-emerald-100/70', avatar: 'bg-emerald-100 text-emerald-700' },
                      'Mahasiswa': { bg: 'bg-indigo-50/40', border: 'border-indigo-100/70', avatar: 'bg-indigo-100 text-indigo-700' },
                      'Alumni': { bg: 'bg-amber-50/40', border: 'border-amber-100/70', avatar: 'bg-amber-100 text-amber-700' },
                      'Staf kepegawaian': { bg: 'bg-sky-50/40', border: 'border-sky-100/70', avatar: 'bg-sky-100 text-sky-700' },
                      'default': { bg: 'bg-slate-50/40', border: 'border-slate-100/70', avatar: 'bg-slate-100 text-slate-700' }
                    };
                    
                    const theme = styleMap[m.component] || styleMap['default'];
                    const displayDay = new Date(m.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                    return (
                      <div 
                        key={m.id} 
                        className={`group p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all duration-300 hover:shadow-xs ${
                          isToday 
                            ? 'bg-gradient-to-r from-rose-50/80 to-pink-50/80 border-rose-200 shadow-xs ring-2 ring-rose-500/10' 
                            : `${theme.bg} ${theme.border} hover:bg-white`
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circle initial or icon */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs transition-all duration-300 group-hover:scale-105 ${
                            isToday ? 'bg-gradient-to-br from-rose-450 to-pink-500 text-white shadow-rose-200' : theme.avatar
                          }`}>
                            {isToday ? '🎂' : initials}
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 truncate block max-w-[120px] sm:max-w-none">{m.fullName}</span>
                              {isToday && (
                                <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-0.5 shrink-0 select-none">
                                  <Sparkles className="w-2 h-2" /> Hari Ini
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                              Kak {m.nickName} &bull; <span className="font-semibold text-slate-500">{m.component}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {/* Copy greetings template */}
                          <button
                            onClick={() => {
                              const text = `Selamat Ulang Tahun yang luar biasa, Kak ${m.fullName}! 🎉🎂 Semoga senantiasa diberkati dengan kesehatan, kebahagiaan, dan kelancaran dalam pelayanan bersama Yayasan MMB. Kiranya kasih penyertaan Tuhan menyertai setiap langkah Kak ${m.nickName}. GBU! ✨`;
                              navigator.clipboard.writeText(text);
                              alert(`Ucapan ulang tahun hangat sudah disalin ke clipboard! Siap dikirim ke Kak ${m.nickName} ❤️`);
                            }}
                            title="Salin Ucapan Selamat"
                            className="p-1 px-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50/40 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer flex items-center shadow-xs"
                          >
                            <Copy className="w-3 h-3 hover:scale-105" />
                          </button>
                          
                          <div className={`text-right ${isToday ? 'text-rose-600 font-extrabold' : 'text-slate-500 font-semibold'}`}>
                            <span className="text-[10px] block uppercase tracking-wider font-mono">{displayDay}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        ) : (
          <>
            {/* Member Journey Conversion Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-md font-semibold text-slate-800 mb-1">Pipeline Kaderisasi</h3>
                <p className="text-slate-400 text-xs mb-4">Journey Anggota dari Prospect hingga Alumni Aktif</p>
                
                <div className="space-y-3.5">
                  {[
                    { status: 'Prospect', color: 'bg-slate-300', count: members.filter(m => m.component === 'Umum').length },
                    { status: 'Encounter (Siswa)', color: 'bg-emerald-400', count: members.filter(m => m.component === 'Siswa').length },
                    { status: 'Explore (Mahasiswa)', color: 'bg-indigo-500', count: members.filter(m => m.component === 'Mahasiswa').length },
                    { status: 'Connect (Alumni)', color: 'bg-amber-400', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan !== 'Aktif').length },
                    { status: 'Alumni Aktif', color: 'bg-indigo-600', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan === 'Aktif').length },
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
                  onClick={() => setTab('members')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  Ubah Data Anggota <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Birthday highlights of the month */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Gift className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                    <h3 className="text-sm font-bold">Ulang Tahun Bulan Ini</h3>
                  </div>
                  <span className="bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full text-[9px] font-bold font-sans">
                    {monthName}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] mb-3">Apresiasi hari istimewa dan rencana perayaan bersama Yayasan MMB</p>
                
                {upcomingBirthdays.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-[11px] italic">
                    Tidak ada ulang tahun di bulan ini.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
                    {upcomingBirthdays.map((m) => {
                      const birthDay = parseInt(m.birthDate.split('-')[2] || '0', 10);
                      const isToday = birthDay === new Date().getDate();
                      
                      // Generate Initials
                      const names = m.fullName.split(' ');
                      const initials = names.map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
                      
                      // Determine theme styling based on category
                      const styleMap: { [key: string]: { bg: string, border: string, avatar: string } } = {
                        'Siswa': { bg: 'bg-emerald-50/40', border: 'border-emerald-100/70', avatar: 'bg-emerald-100 text-emerald-700' },
                        'Mahasiswa': { bg: 'bg-indigo-50/40', border: 'border-indigo-100/70', avatar: 'bg-indigo-100 text-indigo-700' },
                        'Alumni': { bg: 'bg-amber-50/40', border: 'border-amber-100/70', avatar: 'bg-amber-100 text-amber-700' },
                        'Staf kepegawaian': { bg: 'bg-sky-50/40', border: 'border-sky-100/70', avatar: 'bg-sky-100 text-sky-700' },
                        'default': { bg: 'bg-slate-50/40', border: 'border-slate-100/70', avatar: 'bg-slate-100 text-slate-700' }
                      };
                      
                      const theme = styleMap[m.component] || styleMap['default'];
                      const displayDay = new Date(m.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                      return (
                        <div 
                          key={m.id} 
                          className={`group p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all duration-300 hover:shadow-xs ${
                            isToday 
                              ? 'bg-gradient-to-r from-rose-50/80 to-pink-50/80 border-rose-200 shadow-xs ring-2 ring-rose-500/10' 
                              : `${theme.bg} ${theme.border} hover:bg-white`
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Circle initial or icon */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs transition-all duration-300 group-hover:scale-105 ${
                              isToday ? 'bg-gradient-to-br from-rose-450 to-pink-500 text-white shadow-rose-200' : theme.avatar
                            }`}>
                              {isToday ? '🎂' : initials}
                            </div>
                            
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 truncate block max-w-[120px] sm:max-w-none">{m.fullName}</span>
                                {isToday && (
                                  <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-0.5 shrink-0 select-none">
                                    <Sparkles className="w-2 h-2" /> Hari Ini
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                Kak {m.nickName} &bull; <span className="font-semibold text-slate-500">{m.component}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Copy greetings template */}
                            <button
                              onClick={() => {
                                const text = `Selamat Ulang Tahun yang luar biasa, Kak ${m.fullName}! 🎉🎂 Semoga senantiasa diberkati dengan kesehatan, kebahagiaan, dan kelancaran dalam pelayanan bersama Yayasan MMB. Kiranya kasih penyertaan Tuhan menyertai setiap langkah Kak ${m.nickName}. GBU! ✨`;
                                navigator.clipboard.writeText(text);
                                alert(`Ucapan ulang tahun hangat sudah disalin ke clipboard! Siap dikirim ke Kak ${m.nickName} ❤️`);
                              }}
                              title="Salin Ucapan Selamat"
                              className="p-1 px-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50/40 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer flex items-center shadow-xs"
                            >
                              <Copy className="w-3 h-3 hover:scale-105" />
                            </button>
                            
                            <div className={`text-right ${isToday ? 'text-rose-600 font-extrabold' : 'text-slate-500 font-semibold'}`}>
                              <span className="text-[10px] block uppercase tracking-wider font-mono">{displayDay}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Grid: Recent Transactions and Audit Trials */}
      <div className={`grid grid-cols-1 ${hasFeatureAccess('finance') ? 'lg:grid-cols-2' : ''} gap-6`}>
        
        {/* Recent Ledger Entries */}
        {hasFeatureAccess('finance') && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-md font-semibold text-slate-800">Mutasi Kas Hari Ini</h3>
                <p className="text-slate-400 text-xs">Mutasi transaksi finansial yayasan terakhir</p>
              </div>
              <button 
                onClick={() => setTab('finance')}
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
                      tx.type?.toLowerCase() === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {tx.type?.toLowerCase() === 'income' ? '+IN' : '-EXP'}
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
                        tx.type?.toLowerCase() === 'income' ? 'text-emerald-600' : 'text-slate-850'
                      }`}>
                        {tx.type?.toLowerCase() === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
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
        )}

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
