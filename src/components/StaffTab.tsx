/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Trash,
  Edit,
  X,
  Lock,
  Building,
  Activity,
  Briefcase,
  Download,
  ShieldCheck,
  UserCheck,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Award,
  FileText
} from 'lucide-react';
import { Staff, InstitutionalProfile, StructureNode } from '../types';
import { exportToCSV } from '../utils/export';

interface StaffTabProps {
  staffs: Staff[];
  pengurusList?: Staff[];
  onAddStaff: (s: Staff) => void;
  onUpdateStaff: (s: Staff) => void;
  onDeleteStaff: (nik: string) => void;
  currentRole: string;
  profile?: InstitutionalProfile;
  structures?: StructureNode[];
}

export const isPengurusMember = (s: Staff): boolean => {
  if (s.category === 'Pengurus') return true;
  if (s.category === 'Staf') return false;

  const pos = (s.position || '').toLowerCase();
  const stat = (s.status || '').toLowerCase();
  const pengurusKeywords = [
    'pembina',
    'pengawas',
    'ketua',
    'sekretaris',
    'bendahara',
    'direksi',
    'pengurus',
    'wakil ketua',
    'penasihat'
  ];

  return pengurusKeywords.some(k => pos.includes(k)) || stat.includes('pengurus') || stat.includes('demisioner');
};

export default function StaffTab({
  staffs,
  pengurusList = [],
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  currentRole,
  profile,
  structures = [],
}: StaffTabProps) {
  // Sub-view tab switcher: 'staff' (Database Staf) vs 'pengurus' (Database Pengurus)
  const [activeCategoryTab, setActiveCategoryTab] = useState<'staff' | 'pengurus'>('staff');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const availableDivisions = (profile?.staffDepartments && profile.staffDepartments.length > 0)
    ? profile.staffDepartments
    : ["Pelayanan Wilayah", "Fundraising & Mitra", "Sekretariat", "Keuangan & Audit", "Media & Komunikasi", "Pengurus Harian Yayasan"];

  const availableStatuses = (profile?.employmentStatuses && profile.employmentStatuses.length > 0)
    ? profile.employmentStatuses
    : ["Tetap", "Kontrak", "Magang", "Resigned"];

  const pengurusStatusOptions = ["Pengurus Aktif", "Masa Bakti (Periode)", "Demisioner", "Non-Aktif"];

  const pengurusPositionSuggestions = [
    "Pembina Yayasan",
    "Ketua Pembina Yayasan",
    "Anggota Pembina Yayasan",
    "Pengawas Yayasan",
    "Ketua Yayasan",
    "Wakil Ketua Yayasan",
    "Sekretaris Yayasan",
    "Bendahara Yayasan",
    "Koordinator Bidang Pelayanan & Pemuridan",
    "Koordinator Bidang Kemitraan & Misi",
    "Koordinator Wilayah & Cabang"
  ];

  const staffPositionSuggestions = [
    "Staff Pelayanan & Kelompok Kecil",
    "Staff Administrasi & HRD",
    "Staff Keuangan & Kasir",
    "Staff Media, IT & Publikasi",
    "Staff Lapangan & Penginjilan",
    "Staff Kerumahtanggaan & Logistik",
    "Koordinator Lapangan"
  ];

  // Separate lists: Staf from staffs table, Pengurus from pengurus table
  const allStaffList = staffs.filter(s => !isPengurusMember(s));
  const allPengurusList = (pengurusList && pengurusList.length > 0)
    ? pengurusList
    : staffs.filter(s => isPengurusMember(s));

  // Current active list
  const currentList = activeCategoryTab === 'staff' ? allStaffList : allPengurusList;

  // Selected item state
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(
    (activeCategoryTab === 'staff' ? allStaffList[0] : allPengurusList[0]) || staffs[0] || null
  );

  // Form registration states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Fields
  const [sCategory, setSCategory] = useState<'Staf' | 'Pengurus'>('Staf');
  const [sNik, setSNik] = useState('');
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sAddress, setSAddress] = useState('');
  const [sPosition, setSPosition] = useState('');
  const [sDivision, setSDivision] = useState(availableDivisions[0] || 'Pelayanan Wilayah');
  const [sStatus, setSStatus] = useState<string>('Tetap');
  const [sContractEndDate, setSContractEndDate] = useState('');
  const [sPeriodStart, setSPeriodStart] = useState('');
  const [sPeriodEnd, setSPeriodEnd] = useState('');
  const [sSkNumber, setSSkNumber] = useState('');
  const [sBirthPlace, setSBirthPlace] = useState('');
  const [sBirthDate, setSBirthDate] = useState('');
  const [sNotes, setSNotes] = useState('');
  const [baseSalary, setBaseSalary] = useState<number>(4500000);

  // Re-hire inline panel state
  const [isRehireOpen, setIsRehireOpen] = useState(false);
  const [rehireDate, setRehireDate] = useState('');

  // Custom delete confirmation state
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<{ nik: string; name: string; category?: string } | null>(null);

  // Security authorizations for HR & Board Directory
  const canViewHRDetails = ['Super Admin', 'Ketua Yayasan', 'Pembina Yayasan', 'Pengawas Yayasan', 'Staff', 'Bendahara', 'Sekretaris'].includes(currentRole);
  const canModifyHR = ['Super Admin', 'Ketua Yayasan', 'Pembina Yayasan', 'Sekretaris'].includes(currentRole);

  const calculateDurationOfService = (joinedDateStr?: string) => {
    if (!joinedDateStr) return '0 Hari';
    const joined = new Date(joinedDateStr);
    const today = new Date();

    let years = today.getFullYear() - joined.getFullYear();
    let months = today.getMonth() - joined.getMonth();
    let days = today.getDate() - joined.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} Tahun`);
    if (months > 0) parts.push(`${months} Bulan`);
    if (days > 0 || parts.length === 0) parts.push(`${days} Hari`);

    return parts.join(' ');
  };

  const getExpirationStatus = (dateStr?: string) => {
    if (!dateStr) return { color: 'text-slate-400', label: 'Selamanya (Tetap)', badgeClass: 'bg-emerald-50 text-emerald-700' };
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { color: 'text-red-650 font-bold', label: `Selesai (${Math.abs(diffDays)} hari lalu)`, expired: true, daysLeft: diffDays, badgeClass: 'bg-red-50 text-red-700 border border-red-200' };
    } else if (diffDays === 0) {
      return { color: 'text-amber-600 font-bold animate-pulse', label: 'Selesai hari ini', expired: false, warning: true, daysLeft: 0, badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200' };
    } else if (diffDays <= 30) {
      return { color: 'text-amber-650 font-medium', label: `${diffDays} hari lagi`, expired: false, warning: true, daysLeft: diffDays, badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200' };
    } else {
      return { color: 'text-slate-600', label: dateStr, expired: false, daysLeft: diffDays, badgeClass: 'bg-slate-50 text-slate-750 font-mono text-[11px]' };
    }
  };

  const handleSaveRehire = () => {
    if (!selectedStaff || !rehireDate) return;
    const updated: Staff = {
      ...selectedStaff,
      contractEndDate: rehireDate,
      status: selectedStaff.status === 'Resigned' ? 'Kontrak' : selectedStaff.status
    };
    onUpdateStaff(updated);
    setSelectedStaff(updated);
    setIsRehireOpen(false);
    alert(`Sukses: Komitmen pelayanan ${selectedStaff.name} berhasil diperpanjang hingga tanggal ${rehireDate}!`);
  };

  const generateIdForCategory = (cat: 'Staf' | 'Pengurus', existing: Staff[]): string => {
    if (cat === 'Pengurus') {
      let maxNum = 1000;
      existing.filter(s => isPengurusMember(s)).forEach(s => {
        if (!s.nik) return;
        const match = s.nik.match(/PENG-(\d+)/i) || s.nik.match(/(\d+)/g);
        if (match) {
          const lastNum = parseInt(match[match.length - 1], 10);
          if (!isNaN(lastNum) && lastNum > maxNum) maxNum = lastNum;
        }
      });
      let nextNum = maxNum + 1;
      let candidate = `PENG-${nextNum}`;
      while (existing.some(s => s.nik === candidate)) {
        nextNum++;
        candidate = `PENG-${nextNum}`;
      }
      return candidate;
    } else {
      let maxNum = 1000;
      existing.filter(s => !isPengurusMember(s)).forEach(s => {
        if (!s.nik) return;
        const match = s.nik.match(/NIK-(\d+)/i) || s.nik.match(/(\d+)/g);
        if (match) {
          const lastNum = parseInt(match[match.length - 1], 10);
          if (!isNaN(lastNum) && lastNum > maxNum) maxNum = lastNum;
        }
      });
      let nextNum = maxNum + 1;
      let candidate = `NIK-${nextNum}`;
      while (existing.some(s => s.nik === candidate)) {
        nextNum++;
        candidate = `NIK-${nextNum}`;
      }
      return candidate;
    }
  };

  const openAddForm = (defaultCat?: 'Staf' | 'Pengurus') => {
    const targetCategory = defaultCat || (activeCategoryTab === 'pengurus' ? 'Pengurus' : 'Staf');
    setEditingStaff(null);
    setSCategory(targetCategory);
    setSNik(generateIdForCategory(targetCategory, staffs));
    setSName('');
    setSPhone('');
    setSEmail('');
    setSAddress('');
    setSPosition(targetCategory === 'Pengurus' ? 'Pengurus Yayasan' : '');
    setSDivision(targetCategory === 'Pengurus' ? 'Pengurus Harian Yayasan' : (availableDivisions[0] || 'Pelayanan Wilayah'));
    setSStatus(targetCategory === 'Pengurus' ? 'Pengurus Aktif' : 'Tetap');
    setSContractEndDate('');
    setSPeriodStart(new Date().toISOString().split('T')[0]);
    setSPeriodEnd('');
    setSSkNumber('');
    setSBirthPlace('');
    setSBirthDate('');
    setSNotes('');
    setBaseSalary(targetCategory === 'Pengurus' ? 0 : 4500000);
    setIsFormOpen(true);
  };

  const openEditForm = (stf: Staff) => {
    const isP = isPengurusMember(stf);
    setEditingStaff(stf);
    setSCategory(stf.category === 'Pengurus' || isP ? 'Pengurus' : 'Staf');
    setSNik(stf.nik);
    setSName(stf.name);
    setSPhone(stf.phone || '');
    setSEmail(stf.email || '');
    setSAddress(stf.address || '');
    setSPosition(stf.position || '');
    setSDivision(stf.division || (isP ? 'Pengurus Harian Yayasan' : 'Pelayanan Wilayah'));
    setSStatus(stf.status || (isP ? 'Pengurus Aktif' : 'Tetap'));
    setSContractEndDate(stf.contractEndDate || '');
    setSPeriodStart(stf.periodStart || stf.joinedDate || '');
    setSPeriodEnd(stf.periodEnd || stf.contractEndDate || '');
    setSSkNumber(stf.skNumber || '');
    setSBirthPlace(stf.birthPlace || '');
    setSBirthDate(stf.birthDate || '');
    setSNotes(stf.notes || '');
    setBaseSalary(stf.salaryBase || 0);
    setIsFormOpen(true);
  };

  const handleSaveStaffForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName || !sPosition) {
      alert('Nama & Jabatan wajib diisi!');
      return;
    }

    const compiled: Staff = {
      ...(editingStaff || {}),
      category: sCategory,
      nik: sNik,
      name: sName,
      phone: sPhone,
      email: sEmail,
      address: sAddress,
      position: sPosition,
      division: sDivision,
      status: sStatus,
      joinedDate: editingStaff ? editingStaff.joinedDate : (sPeriodStart || new Date().toISOString().split('T')[0]),
      contractEndDate: sCategory === 'Staf' ? (sContractEndDate || undefined) : (sPeriodEnd || undefined),
      periodStart: sPeriodStart || undefined,
      periodEnd: sPeriodEnd || undefined,
      skNumber: sSkNumber || undefined,
      birthPlace: sBirthPlace || undefined,
      birthDate: sBirthDate || undefined,
      notes: sNotes || undefined,
      salaryBase: Number(baseSalary) || 0,
      allowancePosition: editingStaff ? editingStaff.allowancePosition : (sCategory === 'Pengurus' ? 0 : 300000),
      allowanceHousing: editingStaff ? editingStaff.allowanceHousing : (sCategory === 'Pengurus' ? 0 : 300000),
      allowanceTransport: editingStaff ? editingStaff.allowanceTransport : (sCategory === 'Pengurus' ? 0 : 300000),
      allowanceComm: editingStaff ? editingStaff.allowanceComm : (sCategory === 'Pengurus' ? 0 : 200000),
      bonus: editingStaff ? editingStaff.bonus : 0,
      thr: editingStaff ? editingStaff.thr : 0,
      bpjsAllowance: editingStaff ? editingStaff.bpjsAllowance : 0,
      taxDeduction: editingStaff ? editingStaff.taxDeduction : 0,
      bpjsDeduction: editingStaff ? editingStaff.bpjsDeduction : 0,
      kasbonDeduction: editingStaff ? editingStaff.kasbonDeduction : 0,
      otherDeduction: editingStaff ? editingStaff.otherDeduction : 0,
      customFields: editingStaff ? editingStaff.customFields || [] : [],
      paidAmount: editingStaff ? editingStaff.paidAmount : 0,
      lastPayrollMonth: editingStaff ? editingStaff.lastPayrollMonth : undefined,
      lastMonthUnpaid: editingStaff ? editingStaff.lastMonthUnpaid : 0
    };

    if (editingStaff) {
      if (!window.confirm(`Apakah Anda yakin ingin menyimpan perubahan data ${sCategory === 'Pengurus' ? 'Pengurus' : 'Staf'} ini?`)) {
        return;
      }
      onUpdateStaff(compiled);
      if (selectedStaff && selectedStaff.nik === compiled.nik) {
        setSelectedStaff(compiled);
      }
    } else {
      onAddStaff(compiled);
      setSelectedStaff(compiled);
    }
    setIsFormOpen(false);
  };

  // Filter logic
  const filteredList = currentList.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchDivision = filterDivision === 'all' || s.division === filterDivision;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;

    return matchSearch && matchDivision && matchStatus;
  });

  const handleExportCSV = () => {
    const isPeng = activeCategoryTab === 'pengurus';
    const headers = [
      isPeng ? 'ID Pengurus' : 'NIK',
      isPeng ? 'Nama Pejabat / Pengurus' : 'Nama Staf',
      'Kategori',
      'Jabatan',
      'Divisi / Bidang',
      'Status',
      'No. Telepon',
      'Email Resmi',
      'Alamat',
      isPeng ? 'Awal Masa Bakti' : 'Tanggal Bergabung',
      isPeng ? 'Akhir Masa Jabatan' : 'Tanggal Selesai Kontrak',
      'No. SK',
      'Gaji / Honorarium'
    ];
    const keys = [
      'nik',
      'name',
      'category',
      'position',
      'division',
      'status',
      'phone',
      'email',
      'address',
      'joinedDate',
      'contractEndDate',
      'skNumber',
      'salaryBase'
    ];
    exportToCSV(
      filteredList,
      headers,
      keys,
      `database_${activeCategoryTab}_${new Date().toISOString().substring(0, 10)}.csv`
    );
  };

  // Metrics for Pengurus
  const activePengurusCount = allPengurusList.filter(p => (p.status || '').toLowerCase().includes('aktif') || (p.status || '').toLowerCase().includes('masa bakti') || p.status === 'Tetap').length;
  const emailReadyPengurusCount = allPengurusList.filter(p => p.email && p.email.includes('@')).length;

  return (
    <div className="space-y-6">

      {/* TOP SUB-VIEW TAB NAVIGATION (Page Switcher) */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-1.5">
        <button
          onClick={() => {
            setActiveCategoryTab('staff');
            setSearchQuery('');
            setFilterDivision('all');
            setFilterStatus('all');
            setSelectedStaff(allStaffList[0] || null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeCategoryTab === 'staff'
              ? 'bg-[#0c2340] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Database Staf (Karyawan & Pelayan)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeCategoryTab === 'staff' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {allStaffList.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveCategoryTab('pengurus');
            setSearchQuery('');
            setFilterDivision('all');
            setFilterStatus('all');
            setSelectedStaff(allPengurusList[0] || null);
          }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeCategoryTab === 'pengurus'
              ? 'bg-[#0c2340] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>🏛️ Database Pengurus (Dewan Pembina, Pengawas & Inti)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeCategoryTab === 'pengurus' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {allPengurusList.length}
          </span>
        </button>
      </div>

      {/* HEADER ACTION BANNER */}
      <div className="bg-[#0c2340] text-white rounded-xl p-5 shadow-xs border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            {activeCategoryTab === 'staff' ? (
              <Users className="w-5 h-5 text-blue-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            )}
            <h2 className="text-xl font-bold tracking-tight">
              {activeCategoryTab === 'staff' ? 'Database Staf & Kepegawaian Operasional' : 'Database Jajaran Pengurus & Pejabat Yayasan'}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {activeCategoryTab === 'staff'
              ? 'Registrasi status pelayanan, profil hubungan kontrak kerja, divisi struktural, dan legalitas karir staf MMB.'
              : 'Registrasi Dewan Pembina, Pengawas, Pengurus Inti, Masa Bakti, Email Resmi untuk Notifikasi Pagi (07:00 WIB), dan Keputusan Legalitas.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-600 flex items-center gap-1.5 shadow-xs text-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
          {canModifyHR && (
            <button
              onClick={() => openAddForm(activeCategoryTab === 'pengurus' ? 'Pengurus' : 'Staf')}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg flex items-center gap-1.5 shadow-xs text-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>{activeCategoryTab === 'staff' ? 'Registrasi Staf Baru' : 'Registrasi Pengurus Baru'}</span>
            </button>
          )}
        </div>
      </div>

      {/* QUICK STATS FOR PENGURUS */}
      {activeCategoryTab === 'pengurus' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pengurus</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{allPengurusList.length}</div>
              <span className="text-[11px] text-slate-500">Dewan Pembina, Pengawas, & Inti</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pengurus Aktif</span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5">{activePengurusCount}</div>
              <span className="text-[11px] text-slate-500">Sedang Menjalani Masa Bakti</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Notifikasi Siap</span>
              <div className="text-2xl font-black text-amber-700 mt-0.5">{emailReadyPengurusCount}</div>
              <span className="text-[11px] text-slate-500">Menerima Pengingat Pagi 07:00 WIB</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-left text-xs">

        {/* LEFT COLUMN: LIST TABLE (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* SEARCH & FILTERS BAR */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={activeCategoryTab === 'staff' ? "Cari Staf berdasarkan Nama, NIK, Jabatan..." : "Cari Pengurus berdasarkan Nama, Gelar, Jabatan..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:border-[#0c2340]"
              >
                <option value="all">Semua Status</option>
                {activeCategoryTab === 'staff' ? (
                  availableStatuses.map(st => <option key={st} value={st}>{st}</option>)
                ) : (
                  pengurusStatusOptions.map(st => <option key={st} value={st}>{st}</option>)
                )}
              </select>
            </div>

            {/* TABLE VIEW */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] text-slate-600 font-bold uppercase tracking-wider font-mono border-b border-slate-200">
                    <th className="p-3">ID / Nama Lengkap</th>
                    <th className="p-3">Jabatan Resmi</th>
                    <th className="p-3">Bidang / Divisi</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">{activeCategoryTab === 'staff' ? 'Mulai Kerja' : 'Awal Bakti'}</th>
                    <th className="p-3">{activeCategoryTab === 'staff' ? 'Akhir Kontrak' : 'Akhir Jabatan'}</th>
                    {activeCategoryTab === 'pengurus' && <th className="p-3">Email Pagi</th>}
                    {canModifyHR && <th className="p-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        Tidak ada data {activeCategoryTab === 'staff' ? 'staf' : 'pengurus'} yang sesuai kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((member) => {
                      const isSelected = selectedStaff?.nik === member.nik;
                      const hasEmail = member.email && member.email.includes('@');

                      return (
                        <tr
                          key={member.nik}
                          onClick={() => setSelectedStaff(member)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50/70 font-semibold' : ''
                          }`}
                        >
                          <td className="p-3">
                            <span className="font-mono text-[9px] font-bold text-slate-500 block tracking-wider">{member.nik}</span>
                            <span className="font-bold text-slate-900 text-xs block mt-0.5">{member.name}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{member.position}</td>
                          <td className="p-3 text-slate-600">{member.division}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              member.status === 'Tetap' || member.status === 'Pengurus Aktif' || (member.status || '').toLowerCase().includes('aktif')
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : member.status === 'Demisioner' || member.status === 'Resigned'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{member.periodStart || member.joinedDate || '-'}</td>
                          <td className="p-3">
                            {member.contractEndDate || member.periodEnd ? (
                              <div className="flex flex-col">
                                <span className={`font-mono text-[11px] font-bold ${getExpirationStatus(member.contractEndDate || member.periodEnd).color}`}>
                                  {member.contractEndDate || member.periodEnd}
                                </span>
                                <span className="text-[9px] text-slate-500 font-medium">
                                  ({getExpirationStatus(member.contractEndDate || member.periodEnd).label})
                                </span>
                              </div>
                            ) : (
                              <span className="text-emerald-800 font-semibold text-[11px]">
                                {activeCategoryTab === 'staff' ? 'Selamanya (Tetap)' : 'Sesuai Anggaran Dasar'}
                              </span>
                            )}
                          </td>
                          {activeCategoryTab === 'pengurus' && (
                            <td className="p-3">
                              {hasEmail ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Terdaftar
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  <AlertCircle className="w-2.5 h-2.5" /> Belum Ada
                                </span>
                              )}
                            </td>
                          )}
                          {canModifyHR && (
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => openEditForm(member)}
                                  className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold cursor-pointer shadow-2xs transition-colors"
                                  title="Ubah Data"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmStaff({ nik: member.nik, name: member.name, category: member.category || (isPengurusMember(member) ? 'Pengurus' : 'Staf') })}
                                  className="px-2 py-0.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded text-[10px] font-semibold cursor-pointer shadow-2xs transition-colors"
                                  title="Hapus Data"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 flex justify-between items-center">
            <span>
              Menampilkan {filteredList.length} dari {currentList.length} {activeCategoryTab === 'staff' ? 'Staf Karyawan' : 'Pengurus Yayasan'}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Total Seluruh SDM: {staffs.length}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILS SIDEBAR */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
          {selectedStaff ? (
            <div className="space-y-5">

              <div className="text-center pb-4 border-b border-slate-200">
                <div className={`w-12 h-12 text-white font-bold rounded-xl mx-auto flex items-center justify-center font-mono text-xs shadow-xs ${
                  isPengurusMember(selectedStaff) ? 'bg-amber-600' : 'bg-[#0c2340]'
                }`}>
                  {isPengurusMember(selectedStaff) ? 'PENG' : 'STAF'}
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-2.5">{selectedStaff.name}</h3>
                <span className="text-[10px] font-mono text-slate-500 font-semibold tracking-wider uppercase">{selectedStaff.nik}</span>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isPengurusMember(selectedStaff) ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {selectedStaff.position}
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Contact Info */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> Informasi Kontak & Akun
                  </h4>
                  <div className="space-y-1.5 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p><strong className="text-slate-900">E-mail Resmi:</strong> {selectedStaff.email || '-'}</p>
                    <p><strong className="text-slate-900">No. Telepon:</strong> {selectedStaff.phone || '-'}</p>
                    <p><strong className="text-slate-900">Tempat Lahir:</strong> {selectedStaff.birthPlace || '-'}</p>
                    <p><strong className="text-slate-900">Tanggal Lahir:</strong> {selectedStaff.birthDate || '-'}</p>
                    <p className="leading-relaxed"><strong className="text-slate-900">Alamat:</strong> {selectedStaff.address || '-'}</p>
                  </div>
                </div>

                {/* Email Morning Digest Status for Pengurus */}
                {isPengurusMember(selectedStaff) && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    selectedStaff.email && selectedStaff.email.includes('@')
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      {selectedStaff.email && selectedStaff.email.includes('@') ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Notifikasi Pagi Jam 07:00 WIB Aktif</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>Email Belum Didaftarkan</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {selectedStaff.email && selectedStaff.email.includes('@')
                        ? `Bapak/Ibu ${selectedStaff.name} akan menerima rekap agenda kepengurusan dan renungan pagi harian ke alamat ${selectedStaff.email}.`
                        : 'Lengkapi alamat email resmi agar pengurus menerima ringkasan agenda kerja pagi dan notifikasi penugasan.'}
                    </p>
                  </div>
                )}

                {/* SK & Mandate Information */}
                <div className="pt-1">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" /> Legalitas & Masa Pengabdian
                  </h4>

                  {canViewHRDetails ? (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                      <div className="bg-white p-2 text-xs rounded border border-slate-200 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Divisi / Bidang:</span>
                          <span className="font-bold text-slate-800">{selectedStaff.division}</span>
                        </div>
                        {selectedStaff.skNumber && (
                          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                            <span className="text-slate-500">Nomor SK:</span>
                            <span className="font-mono font-bold text-blue-700">{selectedStaff.skNumber}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                          <span className="text-slate-500">Mulai Bergabung:</span>
                          <span className="font-semibold text-slate-800">{selectedStaff.periodStart || selectedStaff.joinedDate || '-'}</span>
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        Durasi Pengabdian: <strong className="text-slate-900">{calculateDurationOfService(selectedStaff.periodStart || selectedStaff.joinedDate)}</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-center text-slate-500 flex flex-col items-center gap-1">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700 text-xs">Strict Security Access</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">Akses dibatasi khusus untuk Pengurus Inti dan Super Admin.</p>
                    </div>
                  )}
                </div>

                {/* Contract / Period Renewal */}
                <div className="pt-1 border-t border-slate-200">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                    {isPengurusMember(selectedStaff) ? 'Masa Jabatan / Akhir Periode' : 'Komitmen & Batas Kontrak Kerja'}
                  </h4>
                  {canViewHRDetails ? (
                    <div className="space-y-2.5">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-medium">Batas Akhir :</span>
                          {selectedStaff.contractEndDate || selectedStaff.periodEnd ? (
                            <span className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${getExpirationStatus(selectedStaff.contractEndDate || selectedStaff.periodEnd).badgeClass}`}>
                              {selectedStaff.contractEndDate || selectedStaff.periodEnd}
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                              {isPengurusMember(selectedStaff) ? 'Sesuai Anggaran Dasar' : 'Selamanya (Tetap)'}
                            </span>
                          )}
                        </div>

                        {(selectedStaff.contractEndDate || selectedStaff.periodEnd) && (
                          <div className="text-xs pt-1.5 border-t border-slate-200 flex justify-between items-center text-slate-700">
                            <span>Status Masa Bakti :</span>
                            <span className={`font-semibold ${getExpirationStatus(selectedStaff.contractEndDate || selectedStaff.periodEnd).color}`}>
                              {getExpirationStatus(selectedStaff.contractEndDate || selectedStaff.periodEnd).label}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Re-hire or Extend Section */}
                      {canModifyHR && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                          {isRehireOpen ? (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-700 uppercase">
                                Tentukan Batas Akhir Baru:
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="date"
                                  value={rehireDate}
                                  onChange={(e) => setRehireDate(e.target.value)}
                                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340]"
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveRehire}
                                  disabled={!rehireDate}
                                  className="px-3 py-1 bg-[#0c2340] hover:bg-[#1b365d] font-semibold text-white rounded transition-colors cursor-pointer text-xs disabled:opacity-50"
                                >
                                  Simpan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsRehireOpen(false)}
                                  className="p-1 text-slate-400 hover:text-slate-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = selectedStaff.contractEndDate || selectedStaff.periodEnd ? new Date(selectedStaff.contractEndDate || selectedStaff.periodEnd!) : new Date();
                                  cur.setFullYear(cur.getFullYear() + (isPengurusMember(selectedStaff) ? 5 : 1));
                                  setRehireDate(cur.toISOString().split('T')[0]);
                                  setIsRehireOpen(true);
                                }}
                                className="w-full text-center py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                              >
                                {isPengurusMember(selectedStaff) ? 'Perbarui Periode Masa Bakti' : 'Re-hire / Perbarui Masa Pengabdian'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Pilih salah satu {activeCategoryTab === 'staff' ? 'staf' : 'pengurus'} untuk menelaah profil dan status pengabdian.
            </div>
          )}
        </div>

      </div>

      {/* FORM: ADD / EDIT DIALOG MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 text-left">

            <div className="bg-[#0c2340] px-5 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold">
                  {editingStaff
                    ? `Ubah Data ${sCategory === 'Pengurus' ? 'Pengurus Yayasan' : 'Staf'}`
                    : `Registrasi ${sCategory === 'Pengurus' ? 'Pengurus Baru' : 'Staf Baru'}`}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {sCategory === 'Pengurus'
                    ? 'Pengurus yang terdaftar dengan email akan menerima rekap agenda kepengurusan jam 07:00 WIB.'
                    : 'Setiap penerimaan kontrak kerja tunduk pada SK Pengurus Yayasan MMB.'}
                </p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-300 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveStaffForm} className="p-5 space-y-4 text-xs">

              {/* Category Selector */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="text-slate-700 block mb-1.5 font-bold text-xs">Kategori Keanggotaan :</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSCategory('Staf');
                      if (!editingStaff) {
                        setSNik(generateIdForCategory('Staf', staffs));
                        setSDivision(availableDivisions[0] || 'Pelayanan Wilayah');
                        setSStatus('Tetap');
                      }
                    }}
                    className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      sCategory === 'Staf'
                        ? 'bg-[#0c2340] text-white border-[#0c2340] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>👥 Staf Operasional</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSCategory('Pengurus');
                      if (!editingStaff) {
                        setSNik(generateIdForCategory('Pengurus', staffs));
                        setSDivision('Pengurus Harian Yayasan');
                        setSStatus('Pengurus Aktif');
                        setSPosition('Pengurus Yayasan');
                      }
                    }}
                    className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      sCategory === 'Pengurus'
                        ? 'bg-[#0c2340] text-white border-[#0c2340] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>🏛️ Pengurus Yayasan</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">
                      {sCategory === 'Pengurus' ? 'ID / No. Registrasi Pengurus :' : 'NIK Identitas Pegawai :'}
                    </label>
                    <input
                      type="text"
                      value={sNik}
                      onChange={(e) => setSNik(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono font-bold bg-slate-100"
                      disabled={Boolean(editingStaff)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Nama Lengkap & Gelar :</label>
                    <input
                      type="text"
                      value={sName}
                      onChange={(e) => setSName(e.target.value)}
                      placeholder={sCategory === 'Pengurus' ? "Pdt. Joseph Daniel, M.Th." : "Joseph Daniel, S.Th."}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:border-[#0c2340]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">
                      E-mail Resmi Yayasan <span className="text-amber-600 font-normal">(Untuk Notifikasi Pagi 07:00)</span> :
                    </label>
                    <input
                      type="email"
                      value={sEmail}
                      onChange={(e) => setSEmail(e.target.value)}
                      placeholder="nama@muridmudabermisi.or.id"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">No. Telepon / WhatsApp :</label>
                    <input
                      type="text"
                      value={sPhone}
                      onChange={(e) => setSPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Gelar / Nama Jabatan :</label>
                    <input
                      type="text"
                      list={sCategory === 'Pengurus' ? "pengurus-pos-list" : "staff-pos-list"}
                      value={sPosition}
                      onChange={(e) => setSPosition(e.target.value)}
                      placeholder={sCategory === 'Pengurus' ? "contoh: Ketua Yayasan, Pembina" : "contoh: Staff Pelayanan"}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                      required
                    />
                    <datalist id="pengurus-pos-list">
                      {pengurusPositionSuggestions.map(p => <option key={p} value={p} />)}
                    </datalist>
                    <datalist id="staff-pos-list">
                      {staffPositionSuggestions.map(p => <option key={p} value={p} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Struktural Divisi / Bidang :</label>
                    <input
                      type="text"
                      list="division-options"
                      value={sDivision}
                      onChange={(e) => setSDivision(e.target.value)}
                      placeholder="Pelayanan Wilayah / Pengurus Harian"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                    <datalist id="division-options">
                      {availableDivisions.map(div => <option key={div} value={div} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Status Keanggotaan :</label>
                    <select
                      value={sStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSStatus(val);
                        if (val === 'Tetap' || val === 'Pengurus Aktif') {
                          // keep or leave optional
                        }
                      }}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    >
                      {sCategory === 'Pengurus' ? (
                        pengurusStatusOptions.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))
                      ) : (
                        availableStatuses.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))
                      )}
                      {sStatus && (
                        (sCategory === 'Pengurus' && !pengurusStatusOptions.includes(sStatus)) ||
                        (sCategory === 'Staf' && !availableStatuses.includes(sStatus))
                      ) && (
                        <option value={sStatus}>{sStatus}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Nomor SK Pengangkatan :</label>
                    <input
                      type="text"
                      value={sSkNumber}
                      onChange={(e) => setSSkNumber(e.target.value)}
                      placeholder="contoh: 004/SK-MMB/I/2026"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">
                      {sCategory === 'Pengurus' ? 'Awal Masa Bakti (Periode) :' : 'Tanggal Mulai Kerja / Bergabung :'}
                    </label>
                    <input
                      type="date"
                      value={sPeriodStart}
                      onChange={(e) => setSPeriodStart(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">
                      {sCategory === 'Pengurus' ? 'Akhir Masa Jabatan (Periode) :' : 'Tanggal Selesai Kontrak Kerja :'}
                    </label>
                    <input
                      type="date"
                      value={sCategory === 'Pengurus' ? sPeriodEnd : sContractEndDate}
                      onChange={(e) => {
                        setSPeriodEnd(e.target.value);
                        setSContractEndDate(e.target.value);
                      }}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Tempat Lahir :</label>
                    <input
                      type="text"
                      value={sBirthPlace}
                      onChange={(e) => setSBirthPlace(e.target.value)}
                      placeholder="Contoh: Jakarta"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1 font-semibold">Tanggal Lahir :</label>
                    <input
                      type="date"
                      value={sBirthDate}
                      onChange={(e) => setSBirthDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-600 block mb-1 font-semibold">
                      {sCategory === 'Pengurus' ? 'Honorarium / Kompensasi Dasar (Rp) :' : 'Gaji Pokok Awal (Base) (Rp) :'}
                    </label>
                    <input
                      type="number"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono font-bold bg-white focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 block mb-1 font-semibold">Alamat Domisili :</label>
                  <textarea
                    value={sAddress}
                    onChange={(e) => setSAddress(e.target.value)}
                    rows={2}
                    placeholder="Alamat lengkap domisili, RT/RW, Kota"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded-lg cursor-pointer shadow-xs transition-colors"
                >
                  Simpan Data {sCategory === 'Pengurus' ? 'Pengurus' : 'Staf'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CUSTOM MODAL CONFIRMATION FOR DELETING STAFF */}
      {deleteConfirmStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-md w-full shadow-xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-2.5 text-rose-800">
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                <Trash className="w-4 h-4 text-rose-700" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Konfirmasi Hapus Data {deleteConfirmStaff.category === 'Pengurus' ? 'Pengurus' : 'Kepegawaian'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data <strong className="text-slate-800">"{deleteConfirmStaff.name}"</strong> (ID/NIK: {deleteConfirmStaff.nik})?
              Tindakan ini akan mengubah status data menjadi soft delete (<code className="bg-slate-100 text-rose-800 px-1 py-0.5 rounded text-[10px] font-mono font-medium">deleted: true</code>).
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmStaff(null)}
                className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const nik = deleteConfirmStaff.nik;
                  setDeleteConfirmStaff(null);
                  onDeleteStaff(nik);
                  if (selectedStaff && selectedStaff.nik === nik) {
                    const remaining = staffs.filter(s => s.nik !== nik);
                    setSelectedStaff(remaining[0] || null);
                  }
                }}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
