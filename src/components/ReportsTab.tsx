/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FilePieChart, 
  Coins, 
  Users, 
  BookOpen, 
  HeartHandshake, 
  UserSquare2, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  CheckSquare, 
  Square,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Briefcase,
  Layers,
  FileSpreadsheet,
  Wallet,
  LayoutList,
  Table
} from 'lucide-react';
import { Member, Transaction, Partner, SmallGroup, MeetingLog } from '../types';
import { 
  exportToCSV, 
  exportFinanceReportPDF, 
  exportActivitiesReportPDF, 
  exportStaffReportPDF, 
  exportMemberReportPDF, 
  exportPartnerReportPDF 
} from '../utils/export';
import { 
  getCutoffDay, 
  getCutoffPeriodRange, 
  getCurrentActiveCycle, 
  INDO_MONTHS 
} from '../utils/cutoff';

interface ReportsTabProps {
  members: Member[];
  transactions: Transaction[];
  partners: Partner[];
  smallGroups: SmallGroup[];
  meetings: MeetingLog[];
  staffs: any[];
  salaries?: any[];
  donations: any[];
  profile: any;
  structures?: any[];
}

type ReportModule = 'finance' | 'activities' | 'staff' | 'members' | 'partners';

const INDONESIAN_MONTHS = INDO_MONTHS;

function getMonthsInRange(startStr: string, endStr: string) {
  const now = new Date();
  const effectiveStart = startStr ? startStr : `${now.getFullYear()}-01-01`;
  const effectiveEnd = endStr ? endStr : `${now.getFullYear()}-12-31`;
  const start = new Date(effectiveStart);
  const end = new Date(effectiveEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }
  const result = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);
  
  let count = 0;
  while (current <= endLimit && count < 24) {
    result.push({
      year: current.getFullYear(),
      month: current.getMonth(),
      label: `${INDONESIAN_MONTHS[current.getMonth()]} ${current.getFullYear()}`
    });
    current.setMonth(current.getMonth() + 1);
    count++;
  }
  return result;
}

export default function ReportsTab({
  members,
  transactions,
  partners,
  smallGroups,
  meetings,
  staffs,
  salaries = [],
  donations,
  profile,
  structures = [],
}: ReportsTabProps) {
  const [activeReport, setActiveReport] = useState<ReportModule>('finance');
  const [financeView, setFinanceView] = useState<'dense' | 'summary'>('dense');
  
  // Cutoff and Financial Period calculation
  const cutoffDay = getCutoffDay(profile);
  const activeCycle = getCurrentActiveCycle(cutoffDay);
  const currentPeriodRange = getCutoffPeriodRange(activeCycle.year, activeCycle.month, cutoffDay);

  // Simulation states matching the spreadsheet structure in user request
  const [initialCashBalance, setInitialCashBalance] = useState<number>(0);
  const [deficitNovember, setDeficitNovember] = useState<number>(12889000);
  const [salaryDecember, setSalaryDecember] = useState<number>(20069500);
  const [monthlyStaffSalaryBudget, setMonthlyStaffSalaryBudget] = useState<number>(32087300);

  // Dynamic Filtering states defaulting to the active financial cycle period
  const [startDate, setStartDate] = useState<string>(() => currentPeriodRange.startDateStr);
  const [endDate, setEndDate] = useState<string>(() => currentPeriodRange.endDateStr);
  const [selectedCycleMonth, setSelectedCycleMonth] = useState<number>(activeCycle.month);
  const [selectedCycleYear, setSelectedCycleYear] = useState<number>(activeCycle.year);

  const [regionFilter, setRegionFilter] = useState<string>('Semua');
  const [memberCompFilter, setMemberCompFilter] = useState<string>('Semua');
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>('Semua');

  // Bulk selector states (for exporting multiple selected things at once)
  const [selectedReports, setSelectedReports] = useState<Record<string, boolean>>({
    finance: true,
    activities: true,
    staff: false,
    members: true,
    partners: false
  });

  // Unique list of regions from data
  const regions = Array.from(new Set([
    'Semua',
    ...smallGroups.map(g => g.region),
    ...members.map(m => m.region),
    ...partners.map(p => p.region)
  ])).filter(Boolean);

  // Helper to dynamically calculate total THP for a staff member
  const getStaffNetSalary = (s: any) => {
    const config = salaries.find(sal => sal.id === s.nik);
    const base = s.salaryBase || 0;
    if (!config) return base;
    let totalAllowances = 0;
    let totalDeductions = 0;
    config.components.forEach(comp => {
      if (comp.type === 'allowance') {
        totalAllowances += comp.amount;
      } else {
        totalDeductions += comp.amount;
      }
    });
    return base + totalAllowances - totalDeductions;
  };

  // Helper to verify approved transactions without casing or status union mismatches
  const isApprovedTx = (t: Transaction) => {
    if (!t.status) return true;
    return t.status === 'Approved' || (t.status as string) === 'approved';
  };

  // Calculations for Financial Report
  const filteredTransactions = transactions.filter(t => {
    if (!isApprovedTx(t)) return false;
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  const totalIncome = filteredTransactions.filter(t => t.type?.toLowerCase() === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type?.toLowerCase() === 'expense').reduce((s, t) => s + t.amount, 0);
  const netWorth = totalIncome - totalExpense;

  // Calculations for Activity Report
  const filteredMeetings = meetings.filter(m => {
    if (startDate && m.date < startDate) return false;
    if (endDate && m.date > endDate) return false;
    
    // region check
    if (regionFilter !== 'Semua') {
      const g = smallGroups.find(sg => sg.id === m.groupId);
      if (!g || g.region !== regionFilter) return false;
    }
    return true;
  });

  // Calculations for Staff Report
  const filteredStaffs = staffs.filter(s => {
    if (staffStatusFilter !== 'Semua' && s.status !== staffStatusFilter) return false;
    return true;
  });
  const totalSalaries = filteredStaffs.reduce((sum, s) => sum + getStaffNetSalary(s), 0);
  const avgSalary = filteredStaffs.length > 0 ? Math.round(totalSalaries / filteredStaffs.length) : 0;

  // Calculations for Member Report
  const filteredMembers = members.filter(m => {
    if (regionFilter !== 'Semua' && m.region !== regionFilter) return false;
    if (memberCompFilter !== 'Semua' && m.component !== memberCompFilter) return false;
    return true;
  });
  const activeMembersCount = filteredMembers.filter(m => m.statusKeaktifan === 'Aktif').length;

  // Calculations for Partner Report
  const filteredPartners = partners.filter(p => {
    if (regionFilter !== 'Semua' && p.region !== regionFilter) return false;
    return true;
  });
  const activeCommitmentsTotal = filteredPartners
    .filter(p => p.status === 'Aktif')
    .reduce((sum, p) => {
      const amt = Number(p.commitmentAmount || 0);
      if (p.frequency === 'Bulanan') return sum + (amt * 12);
      return sum + amt;
    }, 0);

  // Toggle Bulk reports
  const handleToggleReportSelection = (moduleKey: string) => {
    setSelectedReports(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  // Trigger Bulk Export
  const handleBulkExportSelected = () => {
    let count = 0;
    if (selectedReports.finance) {
      exportToCSV(
        filteredTransactions,
        ['ID', 'Tanggal', 'Kategori', 'Deskripsi', 'Nominal', 'Tipe', 'Relasi', 'Status'],
        ['id', 'date', 'category', 'description', 'amount', 'type', 'sourceOrRecipient', 'status'],
        `rekap_keuangan_${startDate}_s_d_${endDate}.csv`
      );
      count++;
    }
    if (selectedReports.activities) {
      const exportMeetingRows = filteredMeetings.map(m => {
        const group = smallGroups.find(g => g.id === m.groupId);
        return {
          id: m.id,
          date: m.date,
          groupName: group?.name || m.groupId,
          region: group?.region || 'Publik',
          materialName: m.materialName,
          attendance: m.attendance?.length || 0,
          notes: m.notes
        };
      });
      exportToCSV(
        exportMeetingRows,
        ['Log ID', 'Tanggal', 'Nama Kelompok', 'Wilayah', 'Bahan Kajian', 'Hadir', 'Catatan'],
        ['id', 'date', 'groupName', 'region', 'materialName', 'attendance', 'notes'],
        `rekap_kegiatan_ktb_${startDate}_s_d_${endDate}.csv`
      );
      count++;
    }
    if (selectedReports.staff) {
      exportToCSV(
        filteredStaffs,
        ['NIK', 'Nama Lengkap', 'Jabatan', 'Divisi', 'Status Kerja', 'Gaji Pokok', 'Tanggal Masuk'],
        ['nik', 'name', 'position', 'division', 'status', 'salaryBase', 'joinedDate'],
        `rekap_database_staff.csv`
      );
      count++;
    }
    if (selectedReports.members) {
      exportToCSV(
        filteredMembers,
        ['ID Anggota', 'Nama Lengkap', 'Panggilan', 'Gender', 'Kontak', 'Email', 'Komponen', 'Wilayah', 'Keaktifan', 'Tanggal Gabung'],
        ['id', 'fullName', 'nickName', 'gender', 'phone', 'email', 'component', 'region', 'statusKeaktifan', 'joinedDate'],
        `rekap_database_anggota.csv`
      );
      count++;
    }
    if (selectedReports.partners) {
      exportToCSV(
        filteredPartners,
        ['ID Mitra', 'Nama Instansi', 'Jenis Mitra', 'Sektor', 'Staff Relasi', 'Status', 'Komitmen Dana', 'Frekuensi', 'Wilayah'],
        ['id', 'name', 'partnerType', 'occupation', 'staffRelasi', 'status', 'commitmentAmount', 'frequency', 'region'],
        `rekap_kemitraan_fundraising.csv`
      );
      count++;
    }

    if (count > 0) {
      alert(`Berhasil mengunduh ${count} berkas pilihan Laporan Terpadu secara paralel.`);
    } else {
      alert('Silakan pilih minimal satu modul laporan untuk di-ekspor!');
    }
  };

  // Single PDF Trigger
  const handleSingleExportPDF = (module: ReportModule) => {
    if (module === 'finance') {
      exportFinanceReportPDF(filteredTransactions, profile, startDate, endDate, structures);
    } else if (module === 'activities') {
      exportActivitiesReportPDF(filteredMeetings, smallGroups, profile);
    } else if (module === 'staff') {
      exportStaffReportPDF(filteredStaffs, profile, structures);
    } else if (module === 'members') {
      exportMemberReportPDF(filteredMembers, profile, structures);
    } else if (module === 'partners') {
      exportPartnerReportPDF(filteredPartners, donations, profile, structures);
    }
  };

  // Single CSV Trigger
  const handleSingleExportCSV = (module: ReportModule) => {
    if (module === 'finance') {
      exportToCSV(
        filteredTransactions,
        ['ID', 'Tanggal', 'Kategori', 'Deskripsi', 'Nominal', 'Tipe', 'Relasi', 'Status'],
        ['id', 'date', 'category', 'description', 'amount', 'type', 'sourceOrRecipient', 'status'],
        `laporan_keuangan_${startDate}_s_d_${endDate}.csv`
      );
    } else if (module === 'activities') {
      const exportRows = filteredMeetings.map(m => {
        const gp = smallGroups.find(g => g.id === m.groupId);
        return {
          id: m.id,
          date: m.date,
          groupName: gp?.name || m.groupId,
          region: gp?.region || 'Publik',
          materialName: m.materialName,
          attendance: m.attendance?.length || 0,
          notes: m.notes
        };
      });
      exportToCSV(
        exportRows,
        ['ID Log', 'Tanggal', 'Kelompok', 'Wilayah', 'Kajian', 'Hadir', 'Catatan'],
        ['id', 'date', 'groupName', 'region', 'materialName', 'attendance', 'notes'],
        `laporan_kegiatan_ktb.csv`
      );
    } else if (module === 'staff') {
      exportToCSV(
        filteredStaffs,
        ['NIK', 'Nama Lengkap', 'Jabatan', 'Divisi', 'Status Kerja', 'Gaji Pokok', 'Tgl Gabung'],
        ['nik', 'name', 'position', 'division', 'status', 'salaryBase', 'joinedDate'],
        `laporan_database_staf.csv`
      );
    } else if (module === 'members') {
      exportToCSV(
        filteredMembers,
        ['ID', 'Nama Lengkap', 'Nama Panggilan', 'Gender', 'Kontak', 'Email', 'Komponen', 'Wilayah', 'Status', 'Tanggal Gabung'],
        ['id', 'fullName', 'nickName', 'gender', 'phone', 'email', 'component', 'region', 'statusKeaktifan', 'joinedDate'],
        `laporan_database_anggota.csv`
      );
    } else if (module === 'partners') {
      exportToCSV(
        filteredPartners,
        ['ID Mitra', 'Nama Mitra', 'Tipe', 'Sektor', 'Staff Relasi', 'Status', 'Komitmen', 'Frekuensi', 'Wilayah'],
        ['id', 'name', 'partnerType', 'occupation', 'staffRelasi', 'status', 'commitmentAmount', 'frequency', 'region'],
        `laporan_kemitraan_mitra.csv`
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Title Section */}
      <div className="bg-[#0c2340] text-white rounded-lg p-5 shadow-xs border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FilePieChart className="w-4 h-4 text-slate-300" />
            <span className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase">Executive Reporting Engine</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-0.5">Pusat Laporan & Ekspor Data</h1>
          <p className="text-slate-300 text-xs mt-0.5">Sistem Pengelolaan Informasi Terpadu - {profile?.name || 'Yayasan Murid Muda Bermisi (MMB)'}</p>
        </div>
      </div>

      {/* Global Sifting & Multi-Exporter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Panel 1: Filter Parameter Laporan */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Filter className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Saring Parameter Sesi</h3>
          </div>

          <div className="space-y-3">
            {/* Periode Siklus Finansial */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase font-bold text-slate-600">
                  Target Periode (Siklus Finansial)
                </label>
                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                  Cut-off tgl {cutoffDay}
                </span>
              </div>
              <select
                value={`${selectedCycleYear}-${selectedCycleMonth}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setSelectedCycleYear(y);
                  setSelectedCycleMonth(m);
                  const range = getCutoffPeriodRange(y, m, cutoffDay);
                  setStartDate(range.startDateStr);
                  setEndDate(range.endDateStr);
                }}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white font-medium focus:outline-none focus:border-[#0c2340]"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const r = getCutoffPeriodRange(selectedCycleYear, i, cutoffDay);
                  return (
                    <option key={i} value={`${selectedCycleYear}-${i}`}>
                      {r.label}
                    </option>
                  );
                })}
              </select>

              {/* Quick Period Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button 
                  type="button"
                  onClick={() => { 
                    setSelectedCycleYear(activeCycle.year);
                    setSelectedCycleMonth(activeCycle.month);
                    const range = getCutoffPeriodRange(activeCycle.year, activeCycle.month, cutoffDay);
                    setStartDate(range.startDateStr); 
                    setEndDate(range.endDateStr); 
                  }}
                  className="px-2 py-1 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-[10px] font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  Periode Saat Ini
                </button>
                <button 
                  type="button"
                  onClick={() => { 
                    const prevMonth = activeCycle.month === 0 ? 11 : activeCycle.month - 1;
                    const prevYear = activeCycle.month === 0 ? activeCycle.year - 1 : activeCycle.year;
                    setSelectedCycleYear(prevYear);
                    setSelectedCycleMonth(prevMonth);
                    const range = getCutoffPeriodRange(prevYear, prevMonth, cutoffDay);
                    setStartDate(range.startDateStr); 
                    setEndDate(range.endDateStr); 
                  }}
                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[10px] text-slate-700 font-medium cursor-pointer transition-colors"
                >
                  Periode Sebelumnya
                </button>
                <button 
                  type="button"
                  onClick={() => { 
                    const now = new Date();
                    const y = now.getFullYear();
                    setStartDate(`${y}-01-01`); 
                    setEndDate(`${y}-12-31`); 
                  }}
                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[10px] text-slate-700 font-medium cursor-pointer transition-colors"
                >
                  Tahun {selectedCycleYear}
                </button>
                <button 
                  type="button"
                  onClick={() => { 
                    setStartDate(''); 
                    setEndDate(''); 
                  }}
                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[10px] text-slate-700 font-medium cursor-pointer transition-colors"
                >
                  Semua Data
                </button>
              </div>
            </div>

            {/* Custom Date Bounds */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Rentang Tanggal Kustom</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Dari Tanggal:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Sampai Tanggal:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Wilayah Operasional</label>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0c2340]"
              >
                {regions.map((reg, idx) => (
                  <option key={idx} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Pembinaan Anggota</label>
                <select
                  value={memberCompFilter}
                  onChange={(e) => setMemberCompFilter(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0c2340]"
                >
                  <option value="Semua">Semua</option>
                  <option value="Siswa">Siswa</option>
                  <option value="Mahasiswa">Mahasiswa</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Status Kepegawaian</label>
                <select
                  value={staffStatusFilter}
                  onChange={(e) => setStaffStatusFilter(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0c2340]"
                >
                  <option value="Semua">Semua</option>
                  <option value="Tetap">Tetap</option>
                  <option value="Kontrak">Kontrak</option>
                  <option value="Magang">Magang</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Pilihan Ekspor Laporan Masal */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3.5 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Ekspor Masal Berkas Sesuai Saringan</h3>
            </div>
            <span className="text-[10px] text-slate-700 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Consolidated Export</span>
          </div>

          <p className="text-slate-600 text-xs leading-relaxed">
            Centang bagian modul di bawah untuk diekspor secara bersamaan dalam format CSV terstruktur.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* Box Keuangan */}
            <div 
              onClick={() => handleToggleReportSelection('finance')}
              className={`p-3 rounded border transition-colors cursor-pointer flex items-center justify-between group ${
                selectedReports.finance ? 'border-[#0c2340] bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Coins className="w-4 h-4 text-slate-700 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block truncate leading-none">Keuangan & Kas</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{filteredTransactions.length} Transaksi</span>
                </div>
              </div>
              {selectedReports.finance ? <CheckSquare className="w-4 h-4 text-[#0c2340]" /> : <Square className="w-4 h-4 text-slate-400" />}
            </div>

            {/* Box Kegiatan */}
            <div 
              onClick={() => handleToggleReportSelection('activities')}
              className={`p-3 rounded border transition-colors cursor-pointer flex items-center justify-between group ${
                selectedReports.activities ? 'border-[#0c2340] bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-slate-700 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block truncate leading-none">Pertemuan KTB</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{filteredMeetings.length} Log Buku</span>
                </div>
              </div>
              {selectedReports.activities ? <CheckSquare className="w-4 h-4 text-[#0c2340]" /> : <Square className="w-4 h-4 text-slate-400" />}
            </div>

            {/* Box Staf */}
            <div 
              onClick={() => handleToggleReportSelection('staff')}
              className={`p-3 rounded border transition-colors cursor-pointer flex items-center justify-between group ${
                selectedReports.staff ? 'border-[#0c2340] bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserSquare2 className="w-4 h-4 text-slate-700 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block truncate leading-none">Database Kepegawaian</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{filteredStaffs.length} Staf Aktif</span>
                </div>
              </div>
              {selectedReports.staff ? <CheckSquare className="w-4 h-4 text-[#0c2340]" /> : <Square className="w-4 h-4 text-slate-400" />}
            </div>

            {/* Box Anggota */}
            <div 
              onClick={() => handleToggleReportSelection('members')}
              className={`p-3 rounded border transition-colors cursor-pointer flex items-center justify-between group ${
                selectedReports.members ? 'border-[#0c2340] bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-slate-700 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block truncate leading-none">Anggota & Binaan</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{filteredMembers.length} Person</span>
                </div>
              </div>
              {selectedReports.members ? <CheckSquare className="w-4 h-4 text-[#0c2340]" /> : <Square className="w-4 h-4 text-slate-400" />}
            </div>

            {/* Box Kemitraan */}
            <div 
              onClick={() => handleToggleReportSelection('partners')}
              className={`p-3 rounded border transition-colors cursor-pointer flex items-center justify-between group ${
                selectedReports.partners ? 'border-[#0c2340] bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <HeartHandshake className="w-4 h-4 text-slate-700 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block truncate leading-none">Dana Donatur</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">{filteredPartners.length} Donatur</span>
                </div>
              </div>
              {selectedReports.partners ? <CheckSquare className="w-4 h-4 text-[#0c2340]" /> : <Square className="w-4 h-4 text-slate-400" />}
            </div>

            <div className="flex items-end">
              <button
                onClick={handleBulkExportSelected}
                className="w-full h-[38px] px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Ekspor {Object.values(selectedReports).filter(Boolean).length} Berkas Pilihan
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Main interactive visualization and table preview */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Navigation Selector for active previews */}
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50 p-1.5 gap-1">
          <button
            onClick={() => setActiveReport('finance')}
            className={`px-3.5 py-2 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeReport === 'finance' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Coins className="w-3.5 h-3.5" /> Laporan Keuangan
          </button>
          
          <button
            onClick={() => setActiveReport('activities')}
            className={`px-3.5 py-2 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeReport === 'activities' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Laporan Kegiatan (KTB)
          </button>

          <button
            onClick={() => setActiveReport('staff')}
            className={`px-3.5 py-2 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeReport === 'staff' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserSquare2 className="w-3.5 h-3.5" /> Laporan Kepegawaian & Gaji
          </button>

          <button
            onClick={() => setActiveReport('members')}
            className={`px-3.5 py-2 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeReport === 'members' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Laporan Database Anggota
          </button>

          <button
            onClick={() => setActiveReport('partners')}
            className={`px-3.5 py-2 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeReport === 'partners' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" /> Laporan Kemitraan Donatur
          </button>
        </div>

        {/* Content body based on active selected report preview */}
        <div className="p-5">
          
          {/* HEADER SUMMARY METRICS */}
          {activeReport === 'finance' && (() => {
            // Compute dynamic monthly list
            const selectedMonths = getMonthsInRange(startDate, endDate);

            // Filter approved transactions for calculations
            const approvedIncomes = transactions.filter(t => isApprovedTx(t) && t.type?.toLowerCase() === 'income');
            const approvedExpenses = transactions.filter(t => isApprovedTx(t) && t.type?.toLowerCase() === 'expense');

            // Unique categories
            const incomeCategories = Array.from(new Set(approvedIncomes.map(t => t.category))).sort();
            const expenseCategories = Array.from(new Set(approvedExpenses.map(t => t.category))).sort();

            // Interrogated sheets
            interface MonthlySheet {
              year: number;
              month: number;
              label: string;
              saldoAwal: number;
              incomes: Record<string, number>;
              totalIncome: number;
              expenses: Record<string, number>;
              totalExpense: number;
              saldoAkhir: number;
            }

            const monthlySheets: MonthlySheet[] = [];
            let runningSaldo = initialCashBalance;

            selectedMonths.forEach((m) => {
              const incomes: Record<string, number> = {};
              let totalInc = 0;
              incomeCategories.forEach(cat => {
                const amt = approvedIncomes
                  .filter(t => {
                    const d = new Date(t.date);
                    return d.getFullYear() === m.year && d.getMonth() === m.month && t.category === cat;
                  })
                  .reduce((sum, t) => sum + t.amount, 0);
                incomes[cat] = amt;
                totalInc += amt;
              });

              const expenses: Record<string, number> = {};
              let totalExp = 0;
              expenseCategories.forEach(cat => {
                const amt = approvedExpenses
                  .filter(t => {
                    const d = new Date(t.date);
                    return d.getFullYear() === m.year && d.getMonth() === m.month && t.category === cat;
                  })
                  .reduce((sum, t) => sum + t.amount, 0);
                expenses[cat] = amt;
                totalExp += amt;
              });

              const saldoAwal = runningSaldo;
              const saldoAkhir = saldoAwal + totalInc - totalExp;
              runningSaldo = saldoAkhir;

              monthlySheets.push({
                year: m.year,
                month: m.month,
                label: m.label,
                saldoAwal,
                incomes,
                totalIncome: totalInc,
                expenses,
                totalExpense: totalExp,
                saldoAkhir
              });
            });

            const formatRupiahExcel = (val: number) => {
              if (val === 0) return '-';
              return val.toLocaleString('id-ID');
            };

            const handleExportSpreadsheetCSV = () => {
              let csvContent = "";
              csvContent += `"${(profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase()}"\n`;
              csvContent += `"LAPORAN KEUANGAN KAS RINGKAS (FORMAT MULTI-BULAN)"\n`;
              csvContent += `"Periode: ${startDate} s/d ${endDate}"\n\n`;
              
              const headers = ["Keterangan", ...monthlySheets.map(ms => ms.label)];
              csvContent += headers.map(h => `"${h}"`).join(",") + "\n";
              
              csvContent += `"-- SALDO AWAL --"\n`;
              const saldoAwalRow = ["Saldo awal kas", ...monthlySheets.map(ms => ms.saldoAwal)];
              csvContent += saldoAwalRow.map(v => typeof v === 'number' ? v : `"${v}"`).join(",") + "\n";
              const totalSaldoAwal = ["Total Saldo", ...monthlySheets.map(ms => ms.saldoAwal)];
              csvContent += totalSaldoAwal.map(v => typeof v === 'number' ? v : `"${v}"`).join(",") + "\n\n";
              
              csvContent += `"-- KAS PEMASUKAN --"\n`;
              incomeCategories.forEach(cat => {
                const row = [cat, ...monthlySheets.map(ms => ms.incomes[cat] || 0)];
                csvContent += row.map(v => typeof v === 'number' ? v : `"${v}"`).join(",") + "\n";
              });
              const totalIncomeRow = ["Total Saldo", ...monthlySheets.map(ms => ms.totalIncome)];
              csvContent += totalIncomeRow.map(v => typeof v === 'number' ? v : `"${v}"`).join(",") + "\n\n";

              csvContent += `"-- KAS PENGELUARAN --"\n`;
              expenseCategories.forEach(cat => {
                const row = [cat, ...monthlySheets.map(ms => ms.expenses[cat] || 0)];
                csvContent += row.map(v => typeof v === 'number' ? v : `"${v}"`).join(",") + "\n";
              });
              const totalExpenseRow = ["Total Saldo", ...monthlySheets.map(ms => ms.totalExpense)];
              csvContent += totalExpenseRow.map(v => typeof v === 'number' ? v : `"${v}"`).join(",") + "\n";
              
              const saldoAkhirRow = ["Saldo Akhir", ...monthlySheets.map(ms => ms.saldoAkhir)];
              csvContent += saldoAkhirRow.map(v => typeof v === 'number' ? v : `"${v}"`).join(",") + "\n\n";

              csvContent += `"-- KEKURANGAN GAJI STAFF & GAJI BULAN DESEMBER --"\n`;
              csvContent += `"Keterangan","Kebutuhan (Rp)"\n`;
              csvContent += `"Kekurangan Gaji Staff November",${deficitNovember}\n`;
              csvContent += `"Gaji Staff Bulan Desember",${salaryDecember}\n`;
              csvContent += `"Total Kebutuhan Tambahan",${deficitNovember + salaryDecember}\n\n`;

              csvContent += `"-- RANCANGAN PENGELUARAN --"\n`;
              csvContent += `"Keterangan","Kebutuhan (Rp)"\n`;
              csvContent += `"Gaji Staff per bulan",${monthlyStaffSalaryBudget}\n`;
              csvContent += `"Gaji Staff per tahun",${monthlyStaffSalaryBudget * 12}\n`;
              csvContent += `"Total Pengeluaran",${monthlyStaffSalaryBudget * 12}\n`;

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `laporan_keuangan_ringkas_${startDate}_s_d_${endDate}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            };

            return (
              <div className="space-y-5">
                {/* Upper Cards Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Penerimaan (Masuk)</span>
                    <dt className="text-lg font-bold text-emerald-800 tracking-tight mt-1 flex items-center gap-1 font-mono">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      Rp {totalIncome.toLocaleString('id-ID')}
                    </dt>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">Draf disetujui dalam rentang aktif</span>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Pengeluaran (Keluar)</span>
                    <dt className="text-lg font-bold text-rose-800 tracking-tight mt-1 flex items-center gap-1 font-mono">
                      <ArrowDownRight className="w-4 h-4 text-rose-600" />
                      Rp {totalExpense.toLocaleString('id-ID')}
                    </dt>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">Pengeluaran disetujui</span>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Aliran Bersih (Net Cashflow)</span>
                    <dt className={`text-lg font-bold tracking-tight mt-1 font-mono ${netWorth >= 0 ? 'text-slate-900' : 'text-rose-800'}`}>
                      Rp {netWorth.toLocaleString('id-ID')}
                    </dt>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">Selisih laba/rugi anggaran</span>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Saldo Keuangan Terakumulasi</span>
                    <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1 font-mono">
                      <Wallet className="w-4 h-4 text-slate-600 shrink-0" />
                      Rp {runningSaldo.toLocaleString('id-ID')}
                    </dt>
                    <span className="text-[10px] text-slate-500 mt-1.5 block">Prediksi sisa kas akhir periode</span>
                  </div>
                </div>

                {/* SPREADSHEET TABLE CARD */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                  <div className="bg-[#0c2340] text-white px-5 py-3.5 border-b border-slate-700">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          LAPORAN RINGKAS ARUS KAS (SPREADSHEET MULTI-BULAN)
                        </h3>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {(profile?.name || 'Yayasan Murid Muda Bermisi (MMB)').toUpperCase()} — Nilai dalam Rupiah (Rp)
                        </p>
                      </div>
                      
                      {/* Configuration Controls */}
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300 text-[11px]">Saldo Awal Kas:</span>
                          <input 
                            type="number"
                            value={initialCashBalance}
                            onChange={(e) => setInitialCashBalance(Number(e.target.value) || 0)}
                            className="w-28 px-2 py-1 border border-slate-500 rounded bg-white text-slate-900 font-mono text-xs focus:outline-none"
                          />
                        </div>

                        {/* View Switcher Toggle */}
                        <div className="flex items-center bg-slate-800 p-0.5 rounded border border-slate-600 h-[28px]">
                          <button
                            onClick={() => setFinanceView('dense')}
                            className={`h-full px-2.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              financeView === 'dense'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-300 hover:text-white'
                            }`}
                            title="Tabel Padat Data"
                          >
                            <Table className="w-3 h-3" />
                            <span>Tabel</span>
                          </button>
                          <button
                            onClick={() => setFinanceView('summary')}
                            className={`h-full px-2.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              financeView === 'summary'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-300 hover:text-white'
                            }`}
                            title="Ringkasan Eksekutif"
                          >
                            <LayoutList className="w-3 h-3" />
                            <span>Ringkasan</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleSingleExportPDF('finance')}
                          className="h-[28px] px-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded text-xs flex items-center gap-1 cursor-pointer transition-colors border border-white/20"
                        >
                          <Printer className="w-3.5 h-3.5" /> PDF
                        </button>
                        <button
                          onClick={handleExportSpreadsheetCSV}
                          className="h-[28px] px-3 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (.csv)
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedMonths.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 italic bg-slate-50">
                      Tidak ada periode bulan dalam saringan tanggal. Silakan perluas rentang saringan tanggal Anda.
                    </div>
                  ) : financeView === 'summary' ? (
                    <div className="p-5 bg-white space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {monthlySheets.map((ms, index) => {
                          const netMonthly = ms.totalIncome - ms.totalExpense;
                          const netPositive = netMonthly >= 0;
                          
                          const highestIncomeCat = Object.entries(ms.incomes)
                            .sort((a, b) => b[1] - a[1])[0];
                          const highestExpenseCat = Object.entries(ms.expenses)
                            .sort((a, b) => b[1] - a[1])[0];

                          return (
                            <div key={index} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                              <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                                <span className="text-xs font-bold text-slate-800 uppercase">{ms.label}</span>
                                <span className="text-[10px] text-slate-500 font-mono">Arus Kas</span>
                              </div>

                              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                <div className="space-y-3">
                                  {/* Saldo Awal */}
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
                                    <span className="text-slate-500 font-medium">Saldo Awal:</span>
                                    <span className="font-mono font-semibold text-slate-800">Rp {ms.saldoAwal.toLocaleString('id-ID')}</span>
                                  </div>

                                  {/* Incomes & Expenses Overview */}
                                  <div className="space-y-2">
                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-700 block">Kas Pemasukan</span>
                                        {highestIncomeCat && highestIncomeCat[1] > 0 ? (
                                          <span className="text-[10px] text-slate-500 block max-w-[140px] truncate">Top: {highestIncomeCat[0]}</span>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 block">Tidak ada penerimaan</span>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="font-mono font-bold text-emerald-800 block">+Rp {ms.totalIncome.toLocaleString('id-ID')}</span>
                                      </div>
                                    </div>

                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-700 block">Kas Pengeluaran</span>
                                        {highestExpenseCat && highestExpenseCat[1] > 0 ? (
                                          <span className="text-[10px] text-slate-500 block max-w-[140px] truncate">Top: {highestExpenseCat[0]}</span>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 block">Tidak ada pengeluaran</span>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="font-mono font-bold text-rose-800 block">-Rp {ms.totalExpense.toLocaleString('id-ID')}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Flow / Bottom State */}
                                <div className="pt-3 border-t border-slate-200">
                                  <div className="flex justify-between items-center text-xs mb-2">
                                    <span className="text-slate-500">Margin Bulanan:</span>
                                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] border ${netPositive ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-800 bg-rose-50 border-rose-200'}`}>
                                      {netPositive ? '+' : ''}Rp {netMonthly.toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-100 p-2 rounded border border-slate-200 text-xs">
                                    <span className="font-bold text-slate-700">SALDO AKHIR:</span>
                                    <span className="font-mono font-bold text-slate-900">
                                      Rp {ms.saldoAkhir.toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Executive Summary Insights Box */}
                      <div className="bg-[#0c2340] text-white p-4 rounded-lg border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider block">Metrik Kesehatan Anggaran</span>
                          <h4 className="text-xs font-bold uppercase text-white">Status Finansial Executive Summary</h4>
                          <p className="text-slate-300 leading-relaxed max-w-xl">
                            Rata-rata pemasukan per periode: <span className="font-bold text-white font-mono">Rp {Math.round(totalIncome / (selectedMonths.length || 1)).toLocaleString('id-ID')}</span>. Beban pengeluaran rata-rata bulanan: <span className="font-bold text-white font-mono">Rp {Math.round(totalExpense / (selectedMonths.length || 1)).toLocaleString('id-ID')}</span>. Status: <strong className="text-white">{netWorth >= 0 ? "SURPLUS" : "DEFISIT"}</strong>.
                          </p>
                        </div>
                        <div className="bg-white/10 px-4 py-2.5 rounded border border-white/10 shrink-0 text-center font-mono">
                          <span className="text-[10px] uppercase text-slate-300 block mb-0.5">Rasio Pengeluaran / Pemasukan</span>
                          <span className="text-base font-bold block text-white">
                            {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : '0'}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs table-fixed min-w-[850px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                            <th className="p-3 border-r border-slate-200 w-1/3">Keterangan / Pos Jurnal</th>
                            {monthlySheets.map((ms, index) => (
                              <th key={index} className="p-3 text-right border-r border-slate-200 whitespace-nowrap">
                                {ms.label} (Rp)
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* SECTION 1: SALDO AWAL */}
                          <tr className="bg-slate-100 font-bold text-slate-900">
                            <td colSpan={1 + monthlySheets.length} className="p-2 text-center tracking-wider text-slate-800 uppercase font-semibold text-[10px]">
                              SALDO AWAL
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/70">
                            <td className="p-2.5 pl-5 border-r border-slate-200 text-slate-700 font-medium">Saldo awal kas</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-2.5 text-right font-mono text-slate-800 border-r border-slate-200">
                                {formatRupiahExcel(ms.saldoAwal)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-slate-50 font-semibold text-slate-800">
                            <td className="p-2.5 pl-5 border-r border-slate-200 uppercase text-[10px] text-slate-600">Total Saldo awal</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-2.5 text-right font-mono border-r border-slate-200 text-slate-900 font-bold">
                                {formatRupiahExcel(ms.saldoAwal)}
                              </td>
                            ))}
                          </tr>

                          {/* SECTION 2: KAS PEMASUKAN */}
                          <tr className="bg-slate-100 font-bold text-slate-900">
                            <td colSpan={1 + monthlySheets.length} className="p-2 text-center tracking-wider text-emerald-800 uppercase font-semibold text-[10px]">
                              KAS PEMASUKAN
                            </td>
                          </tr>
                          {incomeCategories.length === 0 ? (
                            <tr>
                              <td className="p-3 pl-5 border-r border-slate-200 italic text-slate-500">Tidak ada pos jurnal pemasukan terdaftar</td>
                              {monthlySheets.map((_, i) => (
                                <td key={i} className="p-3 text-right font-mono border-r border-slate-200 text-slate-400">-</td>
                              ))}
                            </tr>
                          ) : (
                            incomeCategories.map((cat, catIdx) => (
                              <tr key={catIdx} className="hover:bg-slate-50/70">
                                <td className="p-2.5 pl-5 border-r border-slate-200 text-slate-700">{cat}</td>
                                {monthlySheets.map((ms, msIndex) => (
                                  <td key={msIndex} className="p-2.5 text-right font-mono border-r border-slate-200 text-slate-800">
                                    {formatRupiahExcel(ms.incomes[cat] || 0)}
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                          <tr className="bg-emerald-50/50 font-bold text-emerald-800">
                            <td className="p-2.5 pl-5 border-r border-slate-200 uppercase text-[10px]">Total Pemasukan</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-2.5 text-right font-mono border-r border-slate-200">
                                {formatRupiahExcel(ms.totalIncome)}
                              </td>
                            ))}
                          </tr>

                          {/* SECTION 3: KAS PENGELUARAN */}
                          <tr className="bg-slate-100 font-bold text-slate-900">
                            <td colSpan={1 + monthlySheets.length} className="p-2 text-center tracking-wider text-rose-800 uppercase font-semibold text-[10px]">
                              KAS PENGELUARAN
                            </td>
                          </tr>
                          {expenseCategories.length === 0 ? (
                            <tr>
                              <td className="p-3 pl-5 border-r border-slate-200 italic text-slate-500">Tidak ada pos jurnal pengeluaran terdaftar</td>
                              {monthlySheets.map((_, i) => (
                                <td key={i} className="p-3 text-right font-mono border-r border-slate-200 text-slate-400">-</td>
                              ))}
                            </tr>
                          ) : (
                            expenseCategories.map((cat, catIdx) => (
                              <tr key={catIdx} className="hover:bg-slate-50/70">
                                <td className="p-2.5 pl-5 border-r border-slate-200 text-slate-700">{cat}</td>
                                {monthlySheets.map((ms, msIndex) => (
                                  <td key={msIndex} className="p-2.5 text-right font-mono border-r border-slate-200 text-slate-800">
                                    {formatRupiahExcel(ms.expenses[cat] || 0)}
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                          <tr className="bg-rose-50/50 font-bold text-rose-800">
                            <td className="p-2.5 pl-5 border-r border-slate-200 uppercase text-[10px]">Total Pengeluaran</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-2.5 text-right font-mono border-r border-slate-200">
                                {formatRupiahExcel(ms.totalExpense)}
                              </td>
                            ))}
                          </tr>

                          {/* SALDO AKHIR ROW */}
                          <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                            <td className="p-3 pl-5 border-r border-slate-200 uppercase tracking-wider text-xs">Saldo Akhir Kas</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-3 text-right font-mono border-r border-slate-200 text-slate-900 text-xs font-bold">
                                {formatRupiahExcel(ms.saldoAkhir)}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SPREADSHEET BOTTOM SECTION: MULTI-PART PLANNING FORMS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  
                  {/* SECTION 4: KEKURANGAN GAJI STAFF & GAJI BULAN DESEMBER */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between text-xs">
                    <div>
                      <div className="bg-slate-50 text-slate-800 px-4 py-2.5 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        KEKURANGAN GAJI STAFF & GAJI BULAN DESEMBER
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-slate-500 italic">
                          Sesuaikan kebutuhan dana gaji di bawah ini untuk melihat perkiraan dana tambahan.
                        </p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="uppercase font-bold text-slate-700 block mb-1 text-[10px]">
                              Kekurangan Gaji Staff November (Rp)
                            </label>
                            <div className="relative rounded shadow-xs">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-xs font-mono">Rp</span>
                              </div>
                              <input
                                type="number"
                                value={deficitNovember}
                                onChange={(e) => setDeficitNovember(Number(e.target.value) || 0)}
                                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0c2340]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="uppercase font-bold text-slate-700 block mb-1 text-[10px]">
                              Gaji Staff Bulan Desember (Rp)
                            </label>
                            <div className="relative rounded shadow-xs">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-xs font-mono">Rp</span>
                              </div>
                              <input
                                type="number"
                                value={salaryDecember}
                                onChange={(e) => setSalaryDecember(Number(e.target.value) || 0)}
                                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0c2340]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="m-4 mt-0 p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-700 uppercase tracking-wide text-xs">Total Kebutuhan Tambahan:</span>
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        Rp {(deficitNovember + salaryDecember).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* SECTION 5: RANCANGAN PENGELUARAN */}
                  <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between text-xs">
                    <div>
                      <div className="bg-slate-50 text-slate-800 px-4 py-2.5 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        RANCANGAN ANGGARAN & PENGELUARAN STAF
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-slate-500 italic">
                          Rancang perkiraan besaran anggaran pengeluaran gaji ke depan secara bulanan maupun tahunan.
                        </p>

                        <div className="space-y-3">
                          <div>
                            <label className="uppercase font-bold text-slate-700 block mb-1 text-[10px]">
                              Gaji Staff per bulan (Rp)
                            </label>
                            <div className="relative rounded shadow-xs">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-xs font-mono">Rp</span>
                              </div>
                              <input
                                type="number"
                                value={monthlyStaffSalaryBudget}
                                onChange={(e) => setMonthlyStaffSalaryBudget(Number(e.target.value) || 0)}
                                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0c2340]"
                              />
                            </div>
                            <span 
                              onClick={() => setMonthlyStaffSalaryBudget(totalSalaries)}
                              className="text-[10px] text-[#0c2340] font-semibold mt-1 inline-block cursor-pointer hover:underline"
                            >
                              * Set dari total Gaji Pokok Aktif (Rp {totalSalaries.toLocaleString('id-ID')})
                            </span>
                          </div>

                          <div>
                            <span className="uppercase font-bold text-slate-600 block text-[10px]">Gaji Staff per tahun:</span>
                            <span className="text-xs font-bold text-slate-900 font-mono mt-1 block">
                              Rp {(monthlyStaffSalaryBudget * 12).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="m-4 mt-0 p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-700 uppercase tracking-wide text-xs">Total Pengeluaran Setahun:</span>
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        Rp {(monthlyStaffSalaryBudget * 12).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {activeReport === 'activities' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Kelompok Berlangsung</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-slate-700" />
                    {smallGroups.length} KTB Aktif
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Sesuai binaan di wilayah</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Log Sesi Pertemuan KTB</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-700" />
                    {filteredMeetings.length} Sesi Terlaksana
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Dalam rentang saringan</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Rerata Hadir / Sesi</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1">
                    {filteredMeetings.length > 0 
                      ? Math.round(filteredMeetings.reduce((s, m) => s + (m.attendance?.length || 0), 0) / filteredMeetings.length)
                      : 0} Person / KTB
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Rasio partisipasi binaan</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Akumulasi Kehadiran KTB</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5 font-mono">
                    <Users className="w-4 h-4 text-slate-700 shrink-0" />
                    {filteredMeetings.reduce((sum, met) => sum + (met.attendance?.length || 0), 0)} Absen
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Total kehadiran semua KTB</span>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Arsip Logbook Pertemuan KTB</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Log absensi dan ringkasan pengajaran kelompok ({filteredMeetings.length} Jurnal)</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSingleExportPDF('activities')}
                      className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => handleSingleExportCSV('activities')}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Kelompok Kecil</th>
                        <th className="p-2.5">Wilayah</th>
                        <th className="p-2.5">Pembimbing</th>
                        <th className="p-2.5">Materi Diskusi</th>
                        <th className="p-2.5 text-center">Partisipan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMeetings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 italic">Tidak ada logbook aktivitas KTB dalam rentang tanggal saringan.</td>
                        </tr>
                      ) : (
                        filteredMeetings.slice(0, 10).map((m, idx) => {
                          const gp = smallGroups.find(g => g.id === m.groupId);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/70">
                              <td className="p-2.5 font-mono text-slate-600">{m.date}</td>
                              <td className="p-2.5 font-semibold text-slate-900">{gp?.name || m.groupId}</td>
                              <td className="p-2.5 text-slate-600">{gp?.region || 'Publik'}</td>
                              <td className="p-2.5 text-slate-600">{gp?.staffAdvisor || 'Pembina Pusat'}</td>
                              <td className="p-2.5 text-slate-800 italic">"{m.materialName}"</td>
                              <td className="p-2.5 text-center text-slate-800 font-semibold">{m.attendance?.length || 0} person</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'staff' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Rasio Kepegawaian</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
                    <UserSquare2 className="w-4 h-4 text-slate-700" />
                    {filteredStaffs.length} Staf Aktif
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">SDM Yayasan terdaftar</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Konsumsi Gaji Pokok</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5 font-mono">
                    <Coins className="w-4 h-4 text-slate-700" />
                    Rp {totalSalaries.toLocaleString('id-ID')}
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Total beban upah pokok</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Rerata Upah</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 font-mono">
                    Rp {avgSalary.toLocaleString('id-ID')}
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Rata-rata pendapatan staf</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Pegawai Tetap</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5 font-mono">
                    <Briefcase className="w-4 h-4 text-slate-700 shrink-0" />
                    {filteredStaffs.filter(s => s.status === 'Tetap').length} Person
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Staf kontrak penuh waktu</span>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Database Tenaga Kerja & Rekapitulasi Gaji</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Daftar remunerasi internal dan beban gaji pokok ({filteredStaffs.length} Staf)</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSingleExportPDF('staff')}
                      className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => handleSingleExportCSV('staff')}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                        <th className="p-2.5">NIK</th>
                        <th className="p-2.5">Nama Lengkap</th>
                        <th className="p-2.5">Jabatan</th>
                        <th className="p-2.5">Divisi</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-right">Take-Home Pay (THP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffs.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-mono text-slate-500">{s.nik}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{s.name}</td>
                          <td className="p-2.5 text-slate-600">{s.position}</td>
                          <td className="p-2.5 text-slate-600">{s.division}</td>
                          <td className="p-2.5 text-center">
                            <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">{s.status}</span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-800">Rp {getStaffNetSalary(s).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'members' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Anggota Terdaftar</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-700" />
                    {filteredMembers.length} Person
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Database binaan tersaring</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Partisipan Aktif</span>
                  <dt className="text-lg font-bold text-emerald-800 tracking-tight mt-1 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    {activeMembersCount} Aktif
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Status absensi binaan aktif</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Rasio Keaktifan</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-slate-700" />
                    {filteredMembers.length > 0 
                      ? Math.round((activeMembersCount / filteredMembers.length) * 100) 
                      : 0}%
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Indeks keaktifan regional</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Kader Siswa Binaan</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5 font-mono">
                    <Users className="w-4 h-4 text-slate-700 shrink-0" />
                    {filteredMembers.filter(m => m.component?.toLowerCase() === 'siswa' || m.component === 'Siswa').length} Pelajar
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Siswa pilar gerakan</span>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Profil Anggota Binaan Wilayah</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Daftar profiling dan keterlibatan binaan ({filteredMembers.length} Anggota)</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSingleExportPDF('members')}
                      className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => handleSingleExportCSV('members')}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Nama Lengkap</th>
                        <th className="p-2.5">Panggilan</th>
                        <th className="p-2.5">Gender</th>
                        <th className="p-2.5">Kontak</th>
                        <th className="p-2.5">Komponen</th>
                        <th className="p-2.5">Wilayah</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMembers.slice(0, 10).map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-mono text-slate-500">{m.id}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{m.fullName}</td>
                          <td className="p-2.5 text-slate-600">{m.nickName}</td>
                          <td className="p-2.5 text-slate-600">{m.gender}</td>
                          <td className="p-2.5 text-slate-600">{m.phone}</td>
                          <td className="p-2.5 text-slate-800 font-medium">{m.component}</td>
                          <td className="p-2.5 text-slate-600">{m.region}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              m.statusKeaktifan === 'Aktif' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>{m.statusKeaktifan}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredMembers.length > 10 && (
                  <p className="text-[10px] text-slate-500 text-right mt-1.5 italic">Menampilkan 10 baris pertama. Silakan unduh CSV/PDF untuk melihat {filteredMembers.length} data lengkap.</p>
                )}
              </div>
            </div>
          )}

          {activeReport === 'partners' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Registrasi Mitra Donatur</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-slate-700" />
                    {filteredPartners.length} Donatur
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Basis donatur terdaftar</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Mitra Aktif</span>
                  <dt className="text-lg font-bold text-emerald-800 tracking-tight mt-1">
                    {filteredPartners.filter(p => p.status === 'Aktif').length} Mitra Aktif
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Komitmen donasi rutin</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Komitmen Tahunan</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 font-mono">
                    Rp {activeCommitmentsTotal.toLocaleString('id-ID')}
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Proyeksi fundraising aktif</span>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Komitmen Bulanan</span>
                  <dt className="text-lg font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-1.5 font-mono">
                    <Coins className="w-4 h-4 text-slate-700 shrink-0" />
                    Rp {Math.round(activeCommitmentsTotal / 12).toLocaleString('id-ID')}
                  </dt>
                  <span className="text-[10px] text-slate-500 mt-1 block">Rata-rata ekspektasi per bulan</span>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Daftar Mitra Donatur & Komitmen</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Basis data profil donatur aktif ({filteredPartners.length} Donatur)</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleSingleExportPDF('partners')}
                      className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => handleSingleExportCSV('partners')}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                        <th className="p-2.5">Nama Donatur</th>
                        <th className="p-2.5">Jenis Mitra</th>
                        <th className="p-2.5">Sektor / Profil</th>
                        <th className="p-2.5">Wilayah</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-right">Nilai Komitmen</th>
                        <th className="p-2.5 text-right">Frekuensi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPartners.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-semibold text-slate-900">{p.name}</td>
                          <td className="p-2.5 text-slate-600">{p.partnerType}</td>
                          <td className="p-2.5 text-slate-600">{p.occupation || '-'}</td>
                          <td className="p-2.5 text-slate-600">{p.region}</td>
                          <td className="p-2.5 text-center">
                            <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">{p.status}</span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-800">Rp {(Number(p.commitmentAmount) || 0).toLocaleString('id-ID')}</td>
                          <td className="p-2.5 text-right text-slate-600">{p.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
