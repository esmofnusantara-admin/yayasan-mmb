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

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function getMonthsInRange(startStr: string, endStr: string) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return [];
  }
  const result = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);
  
  let count = 0;
  while (current <= endLimit && count < 12) {
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
  
  // Simulation states matching the spreadsheet structure in user request
  const [initialCashBalance, setInitialCashBalance] = useState<number>(0);
  const [deficitNovember, setDeficitNovember] = useState<number>(12889000);
  const [salaryDecember, setSalaryDecember] = useState<number>(20069500);
  const [monthlyStaffSalaryBudget, setMonthlyStaffSalaryBudget] = useState<number>(32087300);

  // Filtering states
  const [startDate, setStartDate] = useState<string>('2026-05-01');
  const [endDate, setEndDate] = useState<string>('2026-06-30');
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

  // Calculations for Financial Report
  const filteredTransactions = transactions.filter(t => {
    if (t.status !== 'Approved') return false;
    const tDate = new Date(t.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && tDate < start) return false;
    if (end && tDate > end) return false;
    return true;
  });

  const totalIncome = filteredTransactions.filter(t => t.type?.toLowerCase() === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type?.toLowerCase() === 'expense').reduce((s, t) => s + t.amount, 0);
  const netWorth = totalIncome - totalExpense;

  // Calculations for Activity Report
  const filteredMeetings = meetings.filter(m => {
    const mDate = new Date(m.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && mDate < start) return false;
    if (end && mDate > end) return false;
    
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
      if (p.frequency === 'Bulanan') return sum + (p.commitmentAmount * 12);
      return sum + p.commitmentAmount;
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
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
        <div>
          <div className="flex items-center gap-2">
            <FilePieChart className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="text-[10px] text-indigo-300 font-bold tracking-widest font-mono uppercase">Executive Reporting Engine</span>
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight mt-1">Pusat Laporan & Ekspor Data</h1>
          <p className="text-slate-300 text-sm mt-1">Sistem Pengelolanan Informasi Terpadu - {profile?.name || 'Yayasan Murid Muda Bermisi (MMB)'}</p>
        </div>
      </div>

      {/* Global Sifting & Multi-Exporter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Filter Parameter Laporan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-sans">Saring Parameter Sesi</h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">Rentang Tanggal Jurnal / Kegiatan</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-slate-400 block">Dari Tanggal:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block">Sampai Tanggal:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button 
                  onClick={() => { setStartDate('2026-06-01'); setEndDate('2026-06-30'); }}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-600 font-semibold cursor-pointer"
                >
                  Bulan Ini
                </button>
                <button 
                  onClick={() => { setStartDate('2026-01-01'); setEndDate('2026-12-31'); }}
                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[9px] text-slate-600 font-semibold cursor-pointer"
                >
                  Semua (2026)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">Wilayah Operasional (Kecuali Finansial)</label>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs text-slate-700 bg-[#F8FAFC]"
              >
                {regions.map((reg, idx) => (
                  <option key={idx} value={reg}>{reg}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">Pembinaan Anggota</label>
                <select
                  value={memberCompFilter}
                  onChange={(e) => setMemberCompFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-700 bg-[#F8FAFC]"
                >
                  <option value="Semua">Semua</option>
                  <option value="Siswa">Siswa</option>
                  <option value="Mahasiswa">Mahasiswa</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-500 font-mono block mb-1">Status Kepegawaian</label>
                <select
                  value={staffStatusFilter}
                  onChange={(e) => setStaffStatusFilter(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-700 bg-[#F8FAFC]"
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

        {/* Panel 2: Pilihan Ekspor Laporan Masal Berkas Pilihan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-sans">Ekspor Masal Berkas Sesuai Saringan</h3>
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full font-mono">Consolidated Export</span>
          </div>

          <p className="text-slate-500 text-[11px] leading-relaxed">
            Centang bagian modul di bawah untuk diekspor secara bersamaan. Sistem akan mengunduh file format berkas CSV terstruktur sesuai saringan parameter di samping kiri.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {/* Box Keuangan */}
            <div 
              onClick={() => handleToggleReportSelection('finance')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                selectedReports.finance ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Coins className="w-4 h-4 text-[#10B981] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-700 block truncate leading-none">Keuangan & Kas</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">{filteredTransactions.length} Transaksi</span>
                </div>
              </div>
              {selectedReports.finance ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
            </div>

            {/* Box Kegiatan */}
            <div 
              onClick={() => handleToggleReportSelection('activities')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                selectedReports.activities ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-[#4F46E5] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-700 block truncate leading-none">Pertemuan KTB</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">{filteredMeetings.length} Log Buku</span>
                </div>
              </div>
              {selectedReports.activities ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
            </div>

            {/* Box Staf */}
            <div 
              onClick={() => handleToggleReportSelection('staff')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                selectedReports.staff ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <UserSquare2 className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-700 block truncate leading-none">Database Kepegawaian</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">{filteredStaffs.length} Staf Aktif</span>
                </div>
              </div>
              {selectedReports.staff ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
            </div>

            {/* Box Anggota */}
            <div 
              onClick={() => handleToggleReportSelection('members')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                selectedReports.members ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-700 block truncate leading-none">Anggota & Binaan</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">{filteredMembers.length} Person</span>
                </div>
              </div>
              {selectedReports.members ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
            </div>

            {/* Box Kemitraan */}
            <div 
              onClick={() => handleToggleReportSelection('partners')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                selectedReports.partners ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <HeartHandshake className="w-4 h-4 text-[#EC4899] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-700 block truncate leading-none">Dana Donatur</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">{filteredPartners.length} Donatur</span>
                </div>
              </div>
              {selectedReports.partners ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
            </div>

            <div className="flex items-end">
              <button
                onClick={handleBulkExportSelected}
                className="w-full h-[40px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-200 transition-all active:scale-98"
              >
                <Download className="w-4 h-4" /> Ekspor {Object.values(selectedReports).filter(Boolean).length} Berkas Pilihan
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Main interactive visualization and table preview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Navigation Selector for active previews */}
        <div className="flex flex-wrap border-b border-slate-100 bg-slate-50/60 p-2 gap-1">
          <button
            onClick={() => setActiveReport('finance')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeReport === 'finance' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-600" /> Laporan Keuangan
          </button>
          
          <button
            onClick={() => setActiveReport('activities')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeReport === 'activities' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" /> Laporan Kegiatan kelompok (KTB)
          </button>

          <button
            onClick={() => setActiveReport('staff')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeReport === 'staff' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            <UserSquare2 className="w-4 h-4 text-amber-500" /> Laporan Kepegawaian & Gaji
          </button>

          <button
            onClick={() => setActiveReport('members')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeReport === 'members' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            <Users className="w-4 h-4 text-blue-500" /> Laporan Database Anggota
          </button>

          <button
            onClick={() => setActiveReport('partners')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeReport === 'partners' ? 'bg-white text-indigo-650 shadow-xs' : 'text-slate-600 hover:bg-white/40'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-pink-500" /> Laporan Kemitraan Donatur
          </button>
        </div>

        {/* Content body based on active selected report preview */}
        <div className="p-6">
          
          {/* HEADER SUMMARY METRICS */}
          {activeReport === 'finance' && (() => {
            // Compute dynamic monthly list
            const selectedMonths = getMonthsInRange(startDate, endDate);

            // Filter approved transactions for calculations
            const approvedIncomes = transactions.filter(t => (t.status === undefined || t.status === 'Approved') && t.type?.toLowerCase() === 'income');
            const approvedExpenses = transactions.filter(t => (t.status === undefined || t.status === 'Approved') && t.type?.toLowerCase() === 'expense');

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
              <div className="space-y-6 animate-fadeIn">
                {/* Upper Cards Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">Total Penerimaan (Masuk)</span>
                    <dt className="text-xl font-bold text-emerald-800 tracking-tight mt-1.5 flex items-center gap-1.5 font-mono">
                      <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                      Rp {totalIncome.toLocaleString('id-ID')}
                    </dt>
                    <span className="text-[9px] text-slate-400 mt-2 block">Draf disetujui dalam rentang aktif</span>
                  </div>

                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold text-red-700 uppercase tracking-wider block">Total Pengeluaran (Keluar)</span>
                    <dt className="text-xl font-bold text-red-800 tracking-tight mt-1.5 flex items-center gap-1.5 font-mono">
                      <ArrowDownRight className="w-5 h-5 text-red-600" />
                      Rp {totalExpense.toLocaleString('id-ID')}
                    </dt>
                    <span className="text-[9px] text-slate-400 mt-2 block">Pengeluaran disetujui</span>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider block">Aliran Bersih (Net Cashflow)</span>
                    <dt className={`text-xl font-bold tracking-tight mt-1.5 font-mono ${netWorth >= 0 ? 'text-blue-800' : 'text-red-750'}`}>
                      Rp {netWorth.toLocaleString('id-ID')}
                    </dt>
                    <span className="text-[9px] text-slate-400 mt-2 block">Selisih laba/rugi anggaran</span>
                  </div>

                  <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider block">Saldo Keuangan Terakumulasi</span>
                    <dt className="text-xl font-bold text-slate-800 tracking-tight mt-1.5 flex items-center gap-1.5 font-mono">
                      <Wallet className="w-5 h-5 text-indigo-600 shrink-0" />
                      Rp {runningSaldo.toLocaleString('id-ID')}
                    </dt>
                    <span className="text-[9px] text-slate-400 mt-2 block">Prediksi sisa kas akhir periode</span>
                  </div>
                </div>

                {/* SPREADSHEET TABLE CARD */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
                  <div className="bg-slate-900 text-white px-6 py-4.5 border-b border-slate-800">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-widest font-mono text-indigo-300">
                          LAPORAN RINGKAS ARUS KAS (SPREADSHEET MULTI-BULAN)
                        </h3>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {(profile?.name || 'Yayasan Murid Muda Bermisi (MMB)').toUpperCase()} — Nilai saring tanggal dalam Rupiah (Rp)
                        </p>
                      </div>
                      
                      {/* Configuration Controls */}
                      <div className="flex flex-wrap items-center gap-3.5 bg-white/10 p-2.5 rounded-xl border border-white/10 text-xs">
                        <div>
                          <span className="font-semibold text-slate-300 block mb-1">Saldo Awal Kas Pokok (Rp):</span>
                          <input 
                            type="number"
                            value={initialCashBalance}
                            onChange={(e) => setInitialCashBalance(Number(e.target.value) || 0)}
                            className="w-32 px-2 py-1 border border-slate-700 rounded bg-slate-850 font-mono text-white text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </div>

                        {/* View Switcher Toggle */}
                        <div>
                          <span className="font-semibold text-slate-300 block mb-1">Tampilan Jurnal:</span>
                          <div className="flex items-center bg-slate-950/80 p-0.5 rounded border border-slate-700 h-[29px] max-w-fit">
                            <button
                              onClick={() => setFinanceView('dense')}
                              className={`h-full px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                financeView === 'dense'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              title="Tabel Padat Data"
                            >
                              <Table className="w-3.5 h-3.5" />
                              <span>Tabel</span>
                            </button>
                            <button
                              onClick={() => setFinanceView('summary')}
                              className={`h-full px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                financeView === 'summary'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              title="Ringkasan Eksekutif"
                            >
                              <LayoutList className="w-3.5 h-3.5" />
                              <span>Ringkasan</span>
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSingleExportPDF('finance')}
                          className="h-[29px] self-end px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Unduh PDF Jurnal
                        </button>
                        <button
                          onClick={handleExportSpreadsheetCSV}
                          className="h-[29px] self-end px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Ekspor ke Excel (.csv)
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedMonths.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic bg-slate-50/50">
                      Tidak ada periode bulan dalam saringan tanggal. Silakan perluas rentang saringan tanggal Anda (misalnya Mei s/d Juni).
                    </div>
                  ) : financeView === 'summary' ? (
                    <div className="p-6 bg-slate-50/10 font-sans space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {monthlySheets.map((ms, index) => {
                          const netMonthly = ms.totalIncome - ms.totalExpense;
                          const netPositive = netMonthly >= 0;
                          
                          // Find highest income & expense categories for this month
                          const highestIncomeCat = Object.entries(ms.incomes)
                            .sort((a, b) => b[1] - a[1])[0];
                          const highestExpenseCat = Object.entries(ms.expenses)
                            .sort((a, b) => b[1] - a[1])[0];

                          return (
                            <div key={index} className="bg-white rounded-xl border border-slate-150 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col animate-fadeIn">
                              {/* Header bulanan */}
                              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-indigo-900/10">
                                <span className="font-mono text-xs font-bold uppercase tracking-wider">{ms.label}</span>
                                <span className="text-[10px] text-indigo-300 font-mono">Arus Kas Bulanan</span>
                              </div>

                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-4">
                                  {/* Saldo Awal */}
                                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 text-[11px]">
                                    <span className="text-slate-500 font-medium">Saldo Awal:</span>
                                    <span className="font-mono font-bold text-slate-700">Rp {ms.saldoAwal.toLocaleString('id-ID')}</span>
                                  </div>

                                  {/* Incomes & Expenses Overview */}
                                  <div className="space-y-2.5">
                                    <div className="bg-emerald-50/45 hover:bg-emerald-50/75 p-3 rounded-xl border border-emerald-100/60 flex items-center justify-between transition-all">
                                      <div>
                                        <span className="text-[9.5px] uppercase tracking-wider text-emerald-800 font-bold font-mono block">Kas Pemasukan</span>
                                        {highestIncomeCat && highestIncomeCat[1] > 0 ? (
                                          <span className="text-[9px] text-slate-500 block mt-0.5 max-w-[140px] truncate">Top: {highestIncomeCat[0]} ({formatRupiahExcel(highestIncomeCat[1])})</span>
                                        ) : (
                                          <span className="text-[9px] text-slate-400 block mt-0.5">Tidak ada penerimaan</span>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-mono font-extrabold text-emerald-600 block">+Rp {ms.totalIncome.toLocaleString('id-ID')}</span>
                                      </div>
                                    </div>

                                    <div className="bg-red-50/45 hover:bg-red-50/75 p-3 rounded-xl border border-red-100/60 flex items-center justify-between transition-all">
                                      <div>
                                        <span className="text-[9.5px] uppercase tracking-wider text-red-800 font-bold font-mono block">Kas Pengeluaran</span>
                                        {highestExpenseCat && highestExpenseCat[1] > 0 ? (
                                          <span className="text-[9px] text-slate-500 block mt-0.5 max-w-[140px] truncate">Top: {highestExpenseCat[0]} ({formatRupiahExcel(highestExpenseCat[1])})</span>
                                        ) : (
                                          <span className="text-[9px] text-slate-400 block mt-0.5">Tidak ada pengeluaran</span>
                                        )}
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-mono font-extrabold text-red-600 block">-Rp {ms.totalExpense.toLocaleString('id-ID')}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Flow / Bottom State */}
                                <div className="pt-4 border-t border-slate-100 mt-5">
                                  <div className="flex justify-between items-center text-[10px] mb-2.5">
                                    <span className="text-slate-500 font-medium">Net Margin Bulanan:</span>
                                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${netPositive ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-red-700 bg-red-50 border border-red-100'}`}>
                                      {netPositive ? '+' : ''}Rp {netMonthly.toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/50">
                                    <span className="text-[10px] font-bold text-indigo-900/80 font-mono">SALDO AKHIR:</span>
                                    <span className="text-xs font-mono font-black text-indigo-900">
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
                      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-fadeIn">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block font-bold">Metrik Kesehatan Anggaran</span>
                          <h4 className="text-xs font-extrabold tracking-tight uppercase font-mono text-slate-200">Status Finansial Executive Summary</h4>
                          <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xl">
                            Selama rentang periode aktif, rata-rata pemasukan per periode bernilai <span className="font-bold text-emerald-400 font-mono text-xs">Rp {Math.round(totalIncome / (selectedMonths.length || 1)).toLocaleString('id-ID')}</span> dengan beban pengeluaran rata-rata bulanan sebesar <span className="font-bold text-rose-400 font-mono text-xs">Rp {Math.round(totalExpense / (selectedMonths.length || 1)).toLocaleString('id-ID')}</span>. Aliran dana menunjukkan performa {netWorth >= 0 ? "SURPLUS" : "DEFISIT"} secara global.
                          </p>
                        </div>
                        <div className="bg-white/5 px-5 py-3.5 rounded-xl border border-white/5 shrink-0 text-center font-mono">
                          <span className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Rasio Pengeluaran / Pemasukan</span>
                          <span className="text-lg font-black block text-indigo-300">
                            {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : '0'}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px] table-fixed min-w-[850px] border-b border-slate-200">
                        <thead>
                          <tr className="bg-slate-550/80 bg-slate-100 text-slate-700 font-bold border-b border-slate-250">
                            <th className="p-3 border-r border-slate-200 w-1/3 text-xs uppercase font-semibold text-slate-800">Keterangan / Pos Jurnal</th>
                            {monthlySheets.map((ms, index) => (
                              <th key={index} className="p-3 text-right border-r border-slate-200 text-xs font-bold text-slate-800 whitespace-nowrap">
                                {ms.label} (Rp)
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* SECTION 1: SALDO AWAL */}
                          <tr className="bg-slate-50 font-bold text-slate-900 border-b border-slate-250">
                            <td colSpan={1 + monthlySheets.length} className="p-2 text-center tracking-widest text-[#92400E] uppercase font-mono bg-amber-50 border-y border-slate-200">
                              SALDO AWAL
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 border-b border-slate-200">
                            <td className="p-2.5 pl-6 border-r border-slate-200 text-slate-705 font-medium text-[11px]">Saldo awal kas</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-2.5 text-right font-mono text-slate-900 border-r border-slate-200">
                                {formatRupiahExcel(ms.saldoAwal)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-amber-50/30 font-bold border-b border-slate-250 text-slate-900">
                            <td className="p-2.5 pl-6 border-r border-slate-200 uppercase font-mono text-[10px] text-slate-600">Total Saldo awal</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-2.5 text-right font-mono border-r border-slate-200 text-slate-950">
                                {formatRupiahExcel(ms.saldoAwal)}
                              </td>
                            ))}
                          </tr>

                          {/* SECTION 2: KAS PEMASUKAN */}
                          <tr className="bg-slate-50 font-bold text-slate-900 border-b border-slate-250">
                            <td colSpan={1 + monthlySheets.length} className="p-2 text-center tracking-widest text-emerald-800 uppercase font-mono bg-emerald-50 border-y border-slate-200">
                              KAS PEMASUKAN
                            </td>
                          </tr>
                          {incomeCategories.length === 0 ? (
                            <tr className="border-b border-slate-200">
                              <td className="p-3 pl-6 border-r border-slate-200 italic text-slate-400">Tidak ada pos jurnal pemasukan terdaftar dalam periode ini</td>
                              {monthlySheets.map((_, i) => (
                                <td key={i} className="p-3 text-right font-mono border-r border-slate-200 text-slate-400">-</td>
                              ))}
                            </tr>
                          ) : (
                            incomeCategories.map((cat, catIdx) => (
                              <tr key={catIdx} className="hover:bg-slate-50/50 border-b border-slate-200">
                                <td className="p-2.5 pl-6 border-r border-slate-200 font-medium text-slate-700">{cat}</td>
                                {monthlySheets.map((ms, msIndex) => (
                                  <td key={msIndex} className="p-2.5 text-right font-mono border-r border-slate-200 text-slate-900">
                                    {formatRupiahExcel(ms.incomes[cat] || 0)}
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                          <tr className="bg-emerald-50/20 font-bold border-b border-slate-250 text-slate-900">
                            <td className="p-2.5 pl-6 border-r border-slate-200 uppercase font-mono text-[10px] text-emerald-800">Total Pemasukan</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-2.5 text-right font-mono border-r border-slate-200 text-emerald-700">
                                {formatRupiahExcel(ms.totalIncome)}
                              </td>
                            ))}
                          </tr>

                          {/* SECTION 3: KAS PENGELUARAN */}
                          <tr className="bg-slate-50 font-bold text-slate-900 border-b border-slate-250">
                            <td colSpan={1 + monthlySheets.length} className="p-2 text-center tracking-widest text-red-800 uppercase font-mono bg-red-50 border-y border-slate-200">
                              KAS PENGELUARAN
                            </td>
                          </tr>
                          {expenseCategories.length === 0 ? (
                            <tr className="border-b border-slate-200">
                              <td className="p-3 pl-6 border-r border-slate-200 italic text-slate-400">Tidak ada pos jurnal pengeluaran terdaftar dalam periode ini</td>
                              {monthlySheets.map((_, i) => (
                                <td key={i} className="p-3 text-right font-mono border-r border-slate-200 text-slate-400">-</td>
                              ))}
                            </tr>
                          ) : (
                            expenseCategories.map((cat, catIdx) => (
                              <tr key={catIdx} className="hover:bg-slate-50/50 border-b border-slate-200">
                                <td className="p-2.5 pl-6 border-r border-slate-200 font-medium text-slate-700">{cat}</td>
                                {monthlySheets.map((ms, msIndex) => (
                                  <td key={msIndex} className="p-2.5 text-right font-mono border-r border-slate-200 text-slate-900">
                                    {formatRupiahExcel(ms.expenses[cat] || 0)}
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                          <tr className="bg-red-50/20 font-bold border-b border-slate-250 text-slate-900">
                            <td className="p-2.5 pl-6 border-r border-slate-200 uppercase font-mono text-[10px] text-red-800">Total Pengeluaran</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-2.5 text-right font-mono border-r border-slate-200 text-red-700">
                                {formatRupiahExcel(ms.totalExpense)}
                              </td>
                            ))}
                          </tr>

                          {/* SALDO AKHIR ROW */}
                          <tr className="bg-indigo-50/60 font-black text-indigo-900 border-b border-slate-300 text-[12px]">
                            <td className="p-3 pl-6 border-r border-slate-200 uppercase tracking-wider text-xs">Saldo Akhir Kas Buku</td>
                            {monthlySheets.map((ms, index) => (
                              <td key={index} className="p-3 text-right font-mono border-r border-slate-200 text-indigo-800 text-xs font-extrabold">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  
                  {/* SECTION 4: KEKURANGAN GAJI STAFF & GAJI BULAN DESEMBER */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="bg-[#FFFBEB] text-[#92400E] px-5 py-3.5 border-b border-slate-250 font-extrabold text-[11px] uppercase tracking-wider font-mono">
                        KEKURANGAN GAJI STAFF & GAJI BULAN DESEMBER
                      </div>
                      <div className="p-5 space-y-4">
                        <p className="text-[11px] text-slate-500 leading-relaxed font-mono italic">
                          * Sesuaikan kebutuhan dana gaji langsung di bawah ini untuk melihat perkiraan dana tambahan.
                        </p>
                        
                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[10px] tracking-wider uppercase font-extrabold text-slate-600 block mb-1">
                              Kekurangan Gaji Staff November (Rp)
                            </label>
                            <div className="relative rounded-lg shadow-2xs">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-xs font-mono">Rp</span>
                              </div>
                              <input
                                type="number"
                                value={deficitNovember}
                                onChange={(e) => setDeficitNovember(Number(e.target.value) || 0)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] tracking-wider uppercase font-extrabold text-slate-600 block mb-1">
                              Gaji Staff Bulan Desember (Rp)
                            </label>
                            <div className="relative rounded-lg shadow-2xs">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-xs font-mono">Rp</span>
                              </div>
                              <input
                                type="number"
                                value={salaryDecember}
                                onChange={(e) => setSalaryDecember(Number(e.target.value) || 0)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="m-5 mt-0 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Total Kebutuhan Tambahan:</span>
                      <span className="text-sm font-black text-amber-800 font-mono">
                        Rp {(deficitNovember + salaryDecember).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* SECTION 5: RANCANGAN PENGELUARAN */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="bg-[#EFF6FF] text-[#1E40AF] px-5 py-3.5 border-b border-slate-250 font-extrabold text-[11px] uppercase tracking-wider font-mono">
                        RANCANGAN ANGGARAN & PENGELUARAN STAF
                      </div>
                      <div className="p-5 space-y-4">
                        <p className="text-[11px] text-slate-500 leading-relaxed font-mono italic">
                          * Rancang perkiraan besaran anggaran pengeluaran gaji ke depan secara bulanan maupun tahunan.
                        </p>

                        <div className="space-y-3.5">
                          <div>
                            <label className="text-[10px] tracking-wider uppercase font-extrabold text-slate-600 block mb-1">
                              Gaji Staff per bulan (Rp)
                            </label>
                            <div className="relative rounded-lg shadow-2xs">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 text-xs font-mono">Rp</span>
                              </div>
                              <input
                                type="number"
                                value={monthlyStaffSalaryBudget}
                                onChange={(e) => setMonthlyStaffSalaryBudget(Number(e.target.value) || 0)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                            <span 
                              onClick={() => setMonthlyStaffSalaryBudget(totalSalaries)}
                              className="text-[9px] text-[#2563EB] font-bold mt-1.5 inline-block cursor-pointer hover:underline"
                            >
                              * Klik untuk auto-set dari total Gaji Pokok Aktif (Rp {totalSalaries.toLocaleString('id-ID')})
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-500 block">Gaji Staff per tahun:</span>
                            <span className="text-xs font-extrabold text-slate-800 font-mono mt-1.5 block">
                              Rp {(monthlyStaffSalaryBudget * 12).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="m-5 mt-0 p-4 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Total Pengeluaran Setahun:</span>
                      <span className="text-sm font-black text-blue-800 font-mono">
                        Rp {(monthlyStaffSalaryBudget * 12).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {activeReport === 'activities' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider block">Kelompok Berlangsung</span>
                  <dt className="text-xl font-bold text-indigo-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    {smallGroups.length} KTB Aktif
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Sesuai binaan di wilayah</span>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">Log Sesi Skenario KTB</span>
                  <dt className="text-xl font-bold text-emerald-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    {filteredMeetings.length} Sesi Terlaksana
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Sejak rentang saringan</span>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider block">Rerata Hadir / Sesi</span>
                  <dt className="text-xl font-bold text-blue-800 tracking-tight mt-1.5">
                    {filteredMeetings.length > 0 
                      ? Math.round(filteredMeetings.reduce((s, m) => s + (m.attendance?.length || 0), 0) / filteredMeetings.length)
                      : 0} Person / KTB
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Rasio partisipasi binaan</span>
                </div>

                <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider block">Akumulasi Kehadiran KTB</span>
                  <dt className="text-xl font-bold text-slate-800 tracking-tight mt-1.5 flex items-center gap-1.5 font-mono">
                    <Users className="w-5 h-5 text-indigo-600 shrink-0" />
                    {filteredMeetings.reduce((sum, met) => sum + (met.attendance?.length || 0), 0)} Absen
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Total partisipasi semua KTB</span>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-150 mb-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Arsip Jurnal Agenda & Logbook Pertemuan KTB</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Log absensi dan ringkasan pengajaran kelompok ({filteredMeetings.length} Jurnal)</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleSingleExportPDF('activities')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak PDF Resmi
                  </button>
                  <button
                    onClick={() => handleSingleExportCSV('activities')}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> Ekspor CSV
                  </button>
                </div>
              </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">Tanggal Kegiatan</th>
                        <th className="p-3">Kelompok Kecil</th>
                        <th className="p-3">Wilayah</th>
                        <th className="p-3">Pembimbing / Pendamping</th>
                        <th className="p-3">Materi yang Didiskusikan</th>
                        <th className="p-3 text-center">Partisipan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMeetings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic">Tidak ada logbook aktivitas KTB dalam rentang tanggal saringan.</td>
                        </tr>
                      ) : (
                        filteredMeetings.slice(0, 10).map((m, idx) => {
                          const gp = smallGroups.find(g => g.id === m.groupId);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono">{m.date}</td>
                              <td className="p-3 font-bold text-slate-700">{gp?.name || m.groupId}</td>
                              <td className="p-3">{gp?.region || 'Publik'}</td>
                              <td className="p-3 text-slate-500">{gp?.staffAdvisor || 'Pembina Pusat'}</td>
                              <td className="p-3 font-medium text-indigo-600 italic">"{m.materialName}"</td>
                              <td className="p-3 text-center text-slate-800 font-bold">{m.attendance?.length || 0} person</td>
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider block">Rasio Kepegawaian</span>
                  <dt className="text-xl font-bold text-amber-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                    <UserSquare2 className="w-5 h-5 text-amber-600" />
                    {filteredStaffs.length} Staf Aktif
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">SDM Yayasan terdaftar</span>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider block">Konsumsi Gaji Pokok</span>
                  <dt className="text-xl font-bold text-blue-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                    <Coins className="w-5 h-5 text-blue-500" />
                    Rp {totalSalaries.toLocaleString('id-ID')}
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Daftar beban upah pokok</span>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">Pemberian Upah Rerata</span>
                  <dt className="text-xl font-bold text-emerald-800 tracking-tight mt-1.5">
                    Rp {avgSalary.toLocaleString('id-ID')}
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Rata-rata pendapatan staf</span>
                </div>

                <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider block">Pegawai Organik Tetap</span>
                  <dt className="text-xl font-bold text-slate-800 tracking-tight mt-1.5 flex items-center gap-1.5 font-mono">
                    <Briefcase className="w-5 h-5 text-indigo-600 shrink-0" />
                    {filteredStaffs.filter(s => s.status === 'Tetap').length} Person
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Staf dengan kontrak penuh waktu</span>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-150 mb-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Database Tenaga Kerja & Rekapitulasi Gaji Pokok</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Daftar remunerasi internal dan beban gaji pokok pegawai ({filteredStaffs.length} Staf)</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleSingleExportPDF('staff')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak PDF Resmi
                  </button>
                  <button
                    onClick={() => handleSingleExportCSV('staff')}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> Ekspor CSV
                  </button>
                </div>
              </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">NIK</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">Jabatan</th>
                        <th className="p-3">Divisi Organisasi</th>
                        <th className="p-3 text-center">Status Kerja</th>
                        <th className="p-3 text-right">Take-Home Pay (THP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffs.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono">{s.nik}</td>
                          <td className="p-3 font-bold text-slate-700">{s.name}</td>
                          <td className="p-3 text-slate-600">{s.position}</td>
                          <td className="p-3">{s.division}</td>
                          <td className="p-3 text-center">
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold">{s.status}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">Rp {getStaffNetSalary(s).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'members' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider block">Anggota Terdaftar</span>
                  <dt className="text-xl font-bold text-blue-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-blue-500" />
                    {filteredMembers.length} Person
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Database binaan tersaring</span>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">Partisipan Aktif</span>
                  <dt className="text-xl font-bold text-emerald-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                    <CheckSquare className="w-5 h-5 text-emerald-500" />
                    {activeMembersCount} Aktif
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Status absensi binaan aktif</span>
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider block">Rasio Keaktifan</span>
                  <dt className="text-xl font-bold text-indigo-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                    <Percent className="w-5 h-5 text-indigo-500" />
                    {filteredMembers.length > 0 
                      ? Math.round((activeMembersCount / filteredMembers.length) * 100) 
                      : 0}%
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Indeks keaktifan regional</span>
                </div>

                <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider block">Kader Siswa Binaan</span>
                  <dt className="text-xl font-bold text-slate-800 tracking-tight mt-1.5 flex items-center gap-1.5 font-mono">
                    <Users className="w-5 h-5 text-indigo-600 shrink-0" />
                    {filteredMembers.filter(m => m.component?.toLowerCase() === 'siswa' || m.component === 'Siswa').length} Pelajar
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Siswa sekolah pilar utama gerakan</span>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-150 mb-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Data Profil Murid & Anggota Binaan Wilayah</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Daftar lengkap profiling dan status keterlibatan kader binaan ({filteredMembers.length} Anggota)</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleSingleExportPDF('members')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak PDF Resmi
                  </button>
                  <button
                    onClick={() => handleSingleExportCSV('members')}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> Ekspor CSV
                  </button>
                </div>
              </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">ID Anggota</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">Panggilan</th>
                        <th className="p-3">Gender</th>
                        <th className="p-3">Kontak WA</th>
                        <th className="p-3">Komponen Pembinaan</th>
                        <th className="p-3">Wilayah</th>
                        <th className="p-3 text-center">Status Keaktifan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMembers.slice(0, 10).map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-400">{m.id}</td>
                          <td className="p-3 font-bold text-slate-700">{m.fullName}</td>
                          <td className="p-3">{m.nickName}</td>
                          <td className="p-3 text-slate-500">{m.gender}</td>
                          <td className="p-3">{m.phone}</td>
                          <td className="p-3 font-semibold text-indigo-650">{m.component}</td>
                          <td className="p-3">{m.region}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              m.statusKeaktifan === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>{m.statusKeaktifan}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredMembers.length > 10 && (
                  <p className="text-[10px] text-slate-400 text-right mt-2 italic">Menampilkan 10 baris pertama. Silakan unduh CSV/PDF untuk melihat keseluruhan {filteredMembers.length} data.</p>
                )}
              </div>
            </div>
          )}

          {activeReport === 'partners' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-pink-700 uppercase tracking-wider block">Registrasi Mitra Donatur</span>
                  <dt className="text-xl font-bold text-pink-800 tracking-tight mt-1.5 flex items-center gap-1.5">
                    <HeartHandshake className="w-5 h-5 text-pink-500" />
                    {filteredPartners.length} Donatur
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Basis donatur terdaftar</span>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">Mitra Sehat (Aktif)</span>
                  <dt className="text-xl font-bold text-emerald-800 tracking-tight mt-1.5">
                    {filteredPartners.filter(p => p.status === 'Aktif').length} Mitra Aktif
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Berkomitmen menyumbang rutin</span>
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider block">Estimasi Komitmen Tahunan</span>
                  <dt className="text-xl font-bold text-blue-800 tracking-tight mt-1.5">
                    Rp {activeCommitmentsTotal.toLocaleString('id-ID')}
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Proyeksi fundraising aktif</span>
                </div>

                <div className="bg-slate-50/75 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider block">Estimasi Komitmen Bulanan</span>
                  <dt className="text-xl font-bold text-slate-800 tracking-tight mt-1.5 flex items-center gap-1.5 font-mono">
                    <Coins className="w-5 h-5 text-indigo-600 shrink-0" />
                    Rp {Math.round(activeCommitmentsTotal / 12).toLocaleString('id-ID')}
                  </dt>
                  <span className="text-[9px] text-slate-400 mt-2 block">Rata-rata ekspektasi donasi/bulan</span>
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-150 mb-4 animate-fadeIn">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Daftar Lembaga, Gereja & Donatur Pribadi Binaan</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Basis rekapitulasi data profil donatur aktif dan komitmen donasi yayasan ({filteredPartners.length} Donatur)</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleSingleExportPDF('partners')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak PDF Resmi
                  </button>
                  <button
                    onClick={() => handleSingleExportCSV('partners')}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> Ekspor CSV
                  </button>
                </div>
              </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="p-3">Nama Donatur</th>
                        <th className="p-3">Jenis Mitra</th>
                        <th className="p-3">Sektor Pekerjaan / Profil</th>
                        <th className="p-3">Hubungan Wilayah</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Nilai Komitmen</th>
                        <th className="p-3 text-right">Frekuensi Bayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPartners.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-700">{p.name}</td>
                          <td className="p-3 font-semibold text-slate-600">{p.partnerType}</td>
                          <td className="p-3 text-slate-500">{p.occupation || '-'}</td>
                          <td className="p-3">{p.region}</td>
                          <td className="p-3 text-center">
                            <span className="bg-pink-100 text-pink-700 px-2.5 py-0.5 rounded-full text-[9px] font-bold">{p.status}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">Rp {p.commitmentAmount.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right text-slate-500">{p.frequency}</td>
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
