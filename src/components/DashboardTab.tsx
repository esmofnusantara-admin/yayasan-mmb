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
  const activeCommitmentsTotal = (partners || [])
    .filter(p => p.status === 'Aktif')
    .reduce((sum, p) => {
      const amt = Number(p.commitmentAmount || 0);
      if (p.frequency === 'Bulanan') return sum + (amt * 12);
      return sum + amt;
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
      {/* Upper Welcoming Banner - Institutional Executive Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 bg-slate-50 rounded p-2 flex items-center justify-center border border-slate-200 shrink-0">
            <MMBLogo size="100%" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#991b1b] uppercase tracking-wider">
                Yayasan Murid Muda Bermisi
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0c2340] mt-1">
              Ringkasan Eksekutif & Monitoring Pelayanan
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-0.5 max-w-2xl leading-relaxed">
              Pusat pemantauan data keanggotaan, kelompok kecil pemuridan (KTB), transaksi jurnal kas, kemitraan, dan persetujuan eksekutif.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start xl:self-center">
          {hasFeatureAccess('reports') && (
            <button 
              onClick={() => setTab('reports')}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FilePieChart className="w-4 h-4 text-slate-500" /> Pusat Laporan
            </button>
          )}
          <button 
            onClick={onOpenQuickMember}
            className="px-3.5 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors text-white cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Registrasi Anggota
          </button>
          {hasFeatureAccess('finance') && (
            <button 
              onClick={onOpenQuickTx}
              className="px-3.5 py-2 bg-[#881337] hover:bg-[#9f1239] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors text-white cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Entri Kas
            </button>
          )}
        </div>
      </div>

      {/* Primary Key Performance Indicators - Clean Institutional Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${
        hasFeatureAccess('finance') && hasFeatureAccess('partners') 
          ? 'lg:grid-cols-4' 
          : (hasFeatureAccess('finance') || hasFeatureAccess('partners') ? 'lg:grid-cols-3' : 'lg:grid-cols-2')
      } gap-4`}>
        {/* KPI: Saldo Kas */}
        {hasFeatureAccess('finance') && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Saldo Kas Yayasan</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                  Rp {netBalance.toLocaleString('id-ID')}
                </h2>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Rp {activeIncome.toLocaleString('id-ID')}
              </span>
              <span className="text-rose-700 font-semibold flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /> Rp {activeExpense.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        )}

        {/* KPI: Total Anggota */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Data Anggota</span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                {totalMembers} Orang
              </h2>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded border border-slate-200 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-slate-700 font-medium">
              {activeMembersCount} Status Aktif
            </span>
            <span className="text-[#0c2340] font-semibold cursor-pointer flex items-center hover:underline" onClick={() => setTab('members')}>
              Kelola <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* KPI: Kelompok Kecil */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Kelompok Kecil (KTB)</span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                {smallGroups.length} Kelompok
              </h2>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded border border-slate-200 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-slate-700 font-medium">
              Di Wilayah Pelayanan
            </span>
            <span className="text-[#0c2340] font-semibold cursor-pointer flex items-center hover:underline" onClick={() => setTab('small_groups')}>
              Detail <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* KPI: Fundraising & Mitra */}
        {hasFeatureAccess('partners') && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Mitra Pendukung</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                  {activePartners.length} Mitra <span className="text-xs font-normal text-slate-400">({prospectivePartners.length} prospek)</span>
                </h2>
              </div>
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded border border-slate-200 shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              {currentRole !== 'Staff' ? (
                <span className="text-slate-700 font-semibold truncate">
                  Rp {(activeCommitmentsTotal / 12).toLocaleString('id-ID')}/bln
                </span>
              ) : (
                <span className="text-slate-700 font-medium">
                  Pipeline Mitra
                </span>
              )}
              <span className="text-[#0c2340] font-semibold cursor-pointer flex items-center hover:underline" onClick={() => setTab('partners')}>
                Detail <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Alerts and Pending Actions */}
      {pendingApprovalsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-900 rounded">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Antrean Verifikasi Approval Center</h4>
              <p className="text-xs text-amber-800">Terdapat {pendingApprovalsCount} pengajuan yang memerlukan peninjauan dan persetujuan.</p>
            </div>
          </div>
          <button 
            onClick={() => setTab('approvals')}
            className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            Buka Approval Center
          </button>
        </div>
      )}

      {/* Main Grid: Analytical Charts & Recent Transactions */}
      <div className={`grid grid-cols-1 ${currentRole === 'Staff' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
        
        {/* Cashflow Custom Visual Graphic (Left & Center) */}
        {currentRole !== 'Staff' && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs lg:col-span-2">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Visualisasi Arus Kas Bulanan</h3>
                <p className="text-slate-500 text-xs mt-0.5">Ringkasan pemasukan dan pengeluaran 6 bulan terakhir</p>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600 block"></span>
                  <span className="text-slate-600 font-medium">Pemasukan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-600 block"></span>
                  <span className="text-slate-600 font-medium">Pengeluaran</span>
                </div>
              </div>
            </div>

            {/* Responsive Chart Container */}
            <div className="h-60 relative flex items-end justify-between px-4 pt-4 border-b border-l border-slate-200">
              {/* Grid helper lines */}
              <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-t border-slate-200 w-full h-0"></div>
                <div className="border-t border-slate-200 w-full h-0"></div>
                <div className="border-t border-slate-200 w-full h-0"></div>
                <div className="border-t border-slate-200 w-full h-0"></div>
              </div>

              {/* Responsive Chart Columns */}
              <div className="w-full flex justify-around items-end z-10 h-full pb-2">
                {monthlyTimeline.map((item, idx) => {
                  const incHeight = Math.min((item.inc / chartMax) * 100, 100);
                  const expHeight = Math.min((item.exp / chartMax) * 100, 100);
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 group w-12">
                      <div className="flex items-end gap-1.5 h-40 w-full justify-center">
                        {/* Income Bar */}
                        <div 
                          style={{ height: `${incHeight}%` }} 
                          className="w-3.5 bg-emerald-600 rounded-t-xs transition-all duration-300 relative group-hover:bg-emerald-700"
                        >
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30 shadow-md">
                            Masuk: Rp {Math.round(item.inc/1000)}k
                          </div>
                        </div>
                        {/* Expense Bar */}
                        <div 
                          style={{ height: `${expHeight}%` }} 
                          className="w-3.5 bg-rose-600 rounded-t-xs transition-all duration-300 relative group-hover:bg-rose-700"
                        >
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-30 shadow-md">
                            Keluar: Rp {Math.round(item.exp/1000)}k
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-slate-600">{item.monthLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5">
              <span>Skala maksimum: Rp {chartMax.toLocaleString('id-ID')}</span>
              <span>Diperbarui per: {new Date().toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        )}
 
        {/* Right Column Grid: Career pipeline and Birthday highlights */}
        {currentRole !== 'Staff' ? (
          <div className="space-y-6 flex flex-col">
            {/* Member Journey Conversion Widget */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between flex-1">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-0.5">Distribusi Jenjang Kaderisasi</h3>
                <p className="text-slate-500 text-xs mb-4">Klasifikasi anggota dari tahap Siswa hingga Alumni</p>
                
                <div className="space-y-3">
                  {[
                    { status: 'Umum / Simpatisan', color: 'bg-slate-400', count: members.filter(m => m.component === 'Umum').length },
                    { status: 'Siswa / Encounter', color: 'bg-emerald-600', count: members.filter(m => m.component === 'Siswa').length },
                    { status: 'Mahasiswa / Explore', color: 'bg-blue-600', count: members.filter(m => m.component === 'Mahasiswa').length },
                    { status: 'Alumni Terdaftar', color: 'bg-amber-600', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan !== 'Aktif').length },
                    { status: 'Alumni Aktif Melayani', color: 'bg-[#0c2340]', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan === 'Aktif').length },
                  ].map((stage, idx) => {
                    const percentage = Math.max((stage.count / (totalMembers || 1)) * 100, 4);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700">{stage.status}</span>
                          <span className="font-semibold text-slate-900">{stage.count} orang</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${percentage}%` }} 
                            className={`h-full ${stage.color} transition-all duration-300`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4">
                <button 
                  onClick={() => setTab('members')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  Kelola Data Anggota <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Birthday highlights of the month */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Gift className="w-4 h-4 text-[#881337] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-800">Ulang Tahun Bulan Ini</h3>
                  </div>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
                    {monthName}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mb-3">Daftar anggota yang berulang tahun pada bulan ini</p>
                
                {upcomingBirthdays.length === 0 ? (
                  <div className="text-center py-5 text-slate-400 text-xs italic">
                    Tidak ada ulang tahun di bulan ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                    {upcomingBirthdays.map((m) => {
                      const birthDay = parseInt(m.birthDate.split('-')[2] || '0', 10);
                      const isToday = birthDay === new Date().getDate();
                      const displayDay = new Date(m.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                      return (
                        <div 
                          key={m.id} 
                          className={`p-2.5 rounded border flex items-center justify-between gap-3 text-xs transition-colors ${
                            isToday 
                              ? 'bg-rose-50 border-rose-200 text-rose-900' 
                              : 'bg-slate-50/70 border-slate-200 hover:bg-white text-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 truncate">{m.fullName}</span>
                              {isToday && (
                                <span className="bg-rose-700 text-white font-bold text-[10px] px-1.5 py-0.2 rounded uppercase tracking-wider">
                                  Hari Ini
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {m.component} &bull; Wilayah {m.region}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-slate-600">{displayDay}</span>
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
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-0.5">Distribusi Kaderisasi</h3>
                <p className="text-slate-500 text-xs mb-4">Klasifikasi anggota dari tahap Siswa hingga Alumni</p>
                
                <div className="space-y-3">
                  {[
                    { status: 'Umum / Simpatisan', color: 'bg-slate-400', count: members.filter(m => m.component === 'Umum').length },
                    { status: 'Siswa / Encounter', color: 'bg-emerald-600', count: members.filter(m => m.component === 'Siswa').length },
                    { status: 'Mahasiswa / Explore', color: 'bg-blue-600', count: members.filter(m => m.component === 'Mahasiswa').length },
                    { status: 'Alumni Terdaftar', color: 'bg-amber-600', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan !== 'Aktif').length },
                    { status: 'Alumni Aktif Melayani', color: 'bg-[#0c2340]', count: members.filter(m => m.component === 'Alumni' && m.statusKeaktifan === 'Aktif').length },
                  ].map((stage, idx) => {
                    const percentage = Math.max((stage.count / (totalMembers || 1)) * 100, 4);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700">{stage.status}</span>
                          <span className="font-semibold text-slate-900">{stage.count} orang</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${percentage}%` }} 
                            className={`h-full ${stage.color} transition-all duration-300`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4">
                <button 
                  onClick={() => setTab('members')}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  Kelola Data Anggota <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Birthday highlights */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Gift className="w-4 h-4 text-[#881337] shrink-0" />
                    <h3 className="text-sm font-bold text-slate-800">Ulang Tahun Bulan Ini</h3>
                  </div>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
                    {monthName}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mb-3">Daftar anggota yang berulang tahun pada bulan ini</p>
                
                {upcomingBirthdays.length === 0 ? (
                  <div className="text-center py-5 text-slate-400 text-xs italic">
                    Tidak ada ulang tahun di bulan ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                    {upcomingBirthdays.map((m) => {
                      const birthDay = parseInt(m.birthDate.split('-')[2] || '0', 10);
                      const isToday = birthDay === new Date().getDate();
                      const displayDay = new Date(m.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                      return (
                        <div 
                          key={m.id} 
                          className={`p-2.5 rounded border flex items-center justify-between gap-3 text-xs transition-colors ${
                            isToday 
                              ? 'bg-rose-50 border-rose-200 text-rose-900' 
                              : 'bg-slate-50/70 border-slate-200 hover:bg-white text-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 truncate">{m.fullName}</span>
                              {isToday && (
                                <span className="bg-rose-700 text-white font-bold text-[10px] px-1.5 py-0.2 rounded uppercase tracking-wider">
                                  Hari Ini
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {m.component} &bull; Wilayah {m.region}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-slate-600">{displayDay}</span>
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
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Mutasi Kas Terbaru</h3>
                <p className="text-slate-500 text-xs mt-0.5">Riwayat transaksi jurnal kas terakhir</p>
              </div>
              <button 
                onClick={() => setTab('finance')}
                className="text-xs font-semibold text-[#0c2340] hover:underline cursor-pointer flex items-center"
              >
                Buka Modul Keuangan <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="py-3 hover:bg-slate-50/70 px-1 rounded transition-colors flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        tx.type?.toLowerCase() === 'income' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {tx.type?.toLowerCase() === 'income' ? 'Masuk' : 'Keluar'}
                      </span>
                      <h4 className="font-semibold text-slate-900 truncate">{tx.description}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {tx.date} &bull; Kategori: {tx.category}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-bold text-xs ${
                      tx.type?.toLowerCase() === 'income' ? 'text-emerald-700' : 'text-slate-900'
                    }`}>
                      {tx.type?.toLowerCase() === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium mt-0.5 inline-block ${
                      tx.status === 'Approved' ? 'bg-slate-100 text-slate-700' : 
                      tx.status === 'Pending Approval' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Trail System Activity Logs */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100 justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Log Aktivitas & Keamanan</h3>
              <p className="text-slate-500 text-xs mt-0.5">Jejak audit operasional data sistem</p>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <Activity className="w-3.5 h-3.5 text-slate-600" />
              <span>Log Aktif</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded p-3 text-xs text-slate-300 space-y-2 max-h-80 overflow-y-auto">
            <div className="text-slate-400 text-[11px] border-b border-slate-800 pb-1 flex justify-between font-semibold">
              <span>Waktu</span>
              <span>Operator & Aktivitas</span>
            </div>
            {audits.map((log) => (
              <div key={log.id} className="flex gap-2 leading-relaxed py-1 px-1 rounded border-l-2 border-slate-600 bg-slate-800/40 text-xs">
                <span className="text-slate-400 shrink-0 text-[11px]">{log.timestamp}</span>
                <div className="space-y-0.5 min-w-0">
                  <div className="truncate">
                    <span className="text-slate-200 font-semibold">[{log.userName}]</span>{' '}
                    <span className="text-slate-300 font-medium">{log.action}</span>{' '}
                    <span className="text-slate-400 text-[11px]">({log.module})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
