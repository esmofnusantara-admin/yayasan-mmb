/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  Wallet, 
  Calendar, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Download, 
  CheckCircle, 
  Clock, 
  Coins, 
  CreditCard, 
  Users,
  Award,
  BookOpen
} from 'lucide-react';
import { Staff, StaffSalary, InstitutionalProfile } from '../types';
import { exportSlipToPDF } from '../utils/export';

const DEFAULT_PUBLIC_FIELDS = [
  { id: 'allowancePosition', name: 'Tunjangan Jabatan', type: 'allowance', property: 'allowancePosition' },
  { id: 'allowanceHousing', name: 'Tunjangan Perumahan', type: 'allowance', property: 'allowanceHousing' },
  { id: 'allowanceTransport', name: 'Tunjangan Transport', type: 'allowance', property: 'allowanceTransport' },
  { id: 'allowanceComm', name: 'Tunjangan Komunikasi', type: 'allowance', property: 'allowanceComm' },
  { id: 'bpjsAllowance', name: 'Premi BPJS Allowance', type: 'allowance', property: 'bpjsAllowance' },
  { id: 'taxDeduction', name: 'Pajak PPH21 Bruto', type: 'deduction', property: 'taxDeduction' },
  { id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', type: 'deduction', property: 'bpjsDeduction' },
  { id: 'kasbonDeduction', name: 'Kasbon / Angsuran', type: 'deduction', property: 'kasbonDeduction' },
];

interface StaffMeTabProps {
  currentUser: { email: string; name: string; role: string };
  staffs: Staff[];
  salaries?: StaffSalary[];
  profile?: InstitutionalProfile;
  structures?: any[];
}

export default function StaffMeTab({ currentUser, staffs, salaries = [], profile, structures = [] }: StaffMeTabProps) {
  // Try to find matching staff item based on email, name, or phone number
  const matchedByEmail = staffs.find(s => s.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim());
  const matchedByName = staffs.find(s => s.name?.toLowerCase().trim().includes(currentUser.name?.toLowerCase().trim()) || currentUser.name?.toLowerCase().trim().includes(s.name?.toLowerCase().trim()));
  const matchedByPhone = staffs.find(s => s.phone?.trim() === currentUser.email?.split('@')[0] || s.phone?.trim() === currentUser.email || (currentUser as any).phone === s.phone);
  const matchedStaff = matchedByEmail || matchedByName || matchedByPhone || null;

  // For users who are not registered in staffs database, provide a beautifully formatted fallback profile
  const fallbackStaff: Staff = {
    nik: 'NIK-BELUM-FORMAL',
    name: currentUser.name || 'Staf Operator',
    phone: currentUser.email?.includes('@') && !currentUser.email.startsWith('0') ? '' : currentUser.email,
    email: currentUser.email || '',
    address: 'Sistem Karyawan Yayasan ESM',
    position: currentUser.role || 'Staf Pelaksana',
    division: 'Umum',
    status: 'Kontrak',
    joinedDate: new Date().toISOString().split('T')[0],
    salaryBase: 0,
    allowancePosition: 0,
    allowanceHousing: 0,
    allowanceTransport: 0,
    allowanceComm: 0,
    bonus: 0,
    thr: 0,
    bpjsAllowance: 0,
    taxDeduction: 0,
    bpjsDeduction: 0,
    kasbonDeduction: 0,
    otherDeduction: 0,
    paidAmount: 0
  };

  const currentStaff = matchedStaff || fallbackStaff;
  const [printMode, setPrintMode] = useState(false);

  const calculateDurationOfService = (joinedDateStr?: string) => {
    if (!joinedDateStr) return '0 Hari';
    const joined = new Date(joinedDateStr);
    const today = new Date('2026-06-10'); // Unified system date
    
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

  const formatIDRCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculations
  const config = salaries.find(sal => sal.id === currentStaff.nik);

  const salaryBase = config ? config.salaryBase : (currentStaff?.salaryBase || 0);

  let allowances = [];
  let deductions = [];

  if (config) {
    // If we have a custom slip/payroll configuration from the salaries collection (edited by Admin/Ketua/Bendahara)
    allowances = config.components
      .filter(c => c.type === 'allowance')
      .map(c => ({ name: c.name, amount: c.amount }));
    
    deductions = config.components
      .filter(c => c.type === 'deduction')
      .map(c => ({ name: c.name, amount: c.amount }));
  } else {
    // Standard profile fallback
    allowances = [
      { name: 'Tunjangan Jabatan', amount: currentStaff?.allowancePosition || 0 },
      { name: 'Tunjangan Perumahan', amount: currentStaff?.allowanceHousing || 0 },
      { name: 'Tunjangan Transportasi', amount: currentStaff?.allowanceTransport || 0 },
      { name: 'Tunjangan Komunikasi', amount: currentStaff?.allowanceComm || 0 },
      { name: 'BPJS Di tanggung Yayasan', amount: currentStaff?.bpjsAllowance || 0 },
      { name: 'Bonus Tambahan', amount: currentStaff?.bonus || 0 },
      { name: 'Tunjangan Hari Raya (THR)', amount: currentStaff?.thr || 0 }
    ];

    if (currentStaff?.customFields) {
      currentStaff.customFields.forEach(f => {
        if (f.type === 'allowance') {
          allowances.push({ name: f.name, amount: f.amount });
        }
      });
    }

    deductions = [
      { name: 'Potongan PPh 21 (Pajak)', amount: currentStaff?.taxDeduction || 0 },
      { name: 'Potongan BPJS Ketenagakerjaan/Kesehatan', amount: currentStaff?.bpjsDeduction || 0 },
      { name: 'Potongan Kasbon / Pinjaman', amount: currentStaff?.kasbonDeduction || 0 },
      { name: 'Potongan Lain-lain', amount: currentStaff?.otherDeduction || 0 }
    ];

    if (currentStaff?.customFields) {
      currentStaff.customFields.forEach(f => {
        if (f.type === 'deduction') {
          deductions.push({ name: f.name, amount: f.amount });
        }
      });
    }
  }

  const totalAllowances = allowances.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
  const totalGrossSalary = salaryBase + totalAllowances;
  const takeHomePay = totalGrossSalary - totalDeductions;

  const publicFields = (() => {
    const saved = localStorage.getItem('siad_public_payroll_fields');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_PUBLIC_FIELDS;
  })();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Private Workspace Greeting banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-slate-300 p-5 rounded-2xl border border-indigo-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <span className="text-[9px] uppercase font-mono tracking-widest text-[#38BDF8] block font-bold leading-none mb-1">DASHBOARD AKSES STAF PRIBADI</span>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 leading-none">
            <User className="w-4 h-4 text-emerald-450" />
            Informasi Data Diri & Gaji Saya
          </h2>
          <p className="text-[10px] text-slate-300 mt-1.5 max-w-xl">
            Selamat datang, <span className="text-white font-bold">{currentUser.name}</span>. Halaman ini terintegrasi langsung dengan akun Anda secara privat. Anda hanya berwenang melihat data diri dan rincian slip gaji pribadi Anda.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-800 px-3 py-1.5 rounded-xl text-xs font-mono text-indigo-300 self-start sm:self-auto">
          Hak Akses: <span className="text-emerald-400 font-bold">{currentUser.role}</span>
        </div>
      </div>

      {currentStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: PROFILE CARD & OFFICE METRICS (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Main Staff ID Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-left">
              {/* Card top banner background */}
              <div className="h-28 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 flex flex-col justify-between relative">
                <div className="absolute top-2 right-2 text-[#4338CA] opacity-10">
                  <Award className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-center z-10">
                  <span className="text-[9px] font-bold font-mono text-indigo-300 tracking-widest uppercase bg-indigo-950/70 py-1 px-2.5 rounded-full border border-indigo-900">
                    KARTU IDENTITAS STAF
                  </span>
                  <span className="text-[10px] font-mono font-extrabold text-[#38BDF8] tracking-widest">
                    {currentStaff.nik}
                  </span>
                </div>
                <div className="z-10">
                  <h3 className="text-white font-black text-base leading-none tracking-tight">{currentStaff.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-wider font-semibold">{currentStaff.position}</p>
                </div>
              </div>

              {/* Card Body Details */}
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-400" /> Divisi Lembaga
                  </span>
                  <span className="font-semibold text-slate-750">{currentStaff.division}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> Tanggal Join
                  </span>
                  <span className="font-semibold text-slate-750">{currentStaff.joinedDate}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" /> Masa Bakti Pelayanan
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono text-[11px]">
                    {calculateDurationOfService(currentStaff.joinedDate)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-slate-400" /> Status Kontrak
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    currentStaff.status === 'Tetap' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    currentStaff.status === 'Kontrak' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                    'bg-slate-150 text-slate-500'
                  }`}>
                    {currentStaff.status}
                  </span>
                </div>

                {currentStaff.contractEndDate && (
                  <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" /> Akhir Komitmen
                    </span>
                    <span className="font-semibold text-slate-700 font-mono">{currentStaff.contractEndDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Contact card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-left space-y-4">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-50 pb-2">Informasi Kontak & Alamat</h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] font-mono leading-none block mb-0.5">TELEPON / WA</span>
                    <span className="font-semibold text-slate-800 font-mono text-[11px]">{currentStaff.phone || '-'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] font-mono leading-none block mb-0.5">ALAMAT EMAIL RESMI</span>
                    <span className="font-semibold text-slate-800 font-mono text-[11px] break-all">{currentStaff.email || '-'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-400 text-[10px] font-mono leading-none block mb-0.5">ALAMAT DOMISILI TINGGAL</span>
                    <p className="text-slate-700 leading-relaxed font-sans">{currentStaff.address || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: COMPREHENSIVE SLIP GAJI / PAYSLIP DISPLAY (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-left">
              
              {/* Header Slip Gaji */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-850 tracking-tight">Slip Gaji Bulanan Transparan</h3>
                  <p className="text-xs text-slate-450 mt-0.5">Rincian pendapatan kotor (allowance) dan potongan wajib (deductions) peruntukan pelayanan.</p>
                </div>
                
                <button 
                  id="direct-download-slip-btn"
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
                      currentStaff, 
                      publicFields, 
                      config ? config : {
                        id: currentStaff.nik,
                        salaryBase: currentStaff.salaryBase || 0,
                        components: [
                          { id: 'allowancePosition', name: 'Tunjangan Jabatan', amount: currentStaff?.allowancePosition || 0, type: 'allowance' },
                          { id: 'allowanceHousing', name: 'Tunjangan Perumahan', amount: currentStaff?.allowanceHousing || 0, type: 'allowance' },
                          { id: 'allowanceTransport', name: 'Tunjangan Transport', amount: currentStaff?.allowanceTransport || 0, type: 'allowance' },
                          { id: 'allowanceComm', name: 'Tunjangan Komunikasi', amount: currentStaff?.allowanceComm || 0, type: 'allowance' },
                          { id: 'bpjsAllowance', name: 'Premi BPJS Allowance', amount: currentStaff?.bpjsAllowance || 0, type: 'allowance' },
                          { id: 'taxDeduction', name: 'Pajak PPH21 Bruto', amount: currentStaff?.taxDeduction || 0, type: 'deduction' },
                          { id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', amount: currentStaff?.bpjsDeduction || 0, type: 'deduction' },
                          { id: 'kasbonDeduction', name: 'Kasbon / Angsuran', amount: currentStaff?.kasbonDeduction || 0, type: 'deduction' }
                        ]
                      },
                      profile,
                      currentStaff.paidAmount || 0,
                      treasurerName
                    );
                  }}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Slip Gaji (PDF)
                </button>
              </div>

              <div id="print-slips-container" className="p-8 space-y-8 bg-white">
                
                {salaryBase === 0 && (
                  <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl p-4 text-xs font-medium space-y-1 text-left">
                    <span className="font-bold flex items-center gap-1.5 text-amber-900">⚠️ Akun Non-Gaji / Sukarelawan</span>
                    <p className="text-amber-700 font-sans leading-relaxed">
                      Sistem mendeteksi rincian gaji Anda belum dikonfigurasikan atau Anda masuk dalam kategori Pelayanan Sukarela (Voluntary). Hubungi Bendahara Yayasan jika ini adalah kekeliruan administrasi.
                    </p>
                  </div>
                )}

                {/* Invoice Letterhead */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                  <div className="space-y-1">
                    <span className="text-[#2563EB] font-mono text-[9px] font-extrabold uppercase tracking-widest block">EVANGELICAL STUDENT MOVEMENT</span>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">YAYASAN ESM INDONESIA</h4>
                    <span className="text-[10px] text-slate-400 block font-mono">Gedung Pusat Administrasi &bull; Jakarta-Yogyakarta</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-slate-400 block leading-none">DOKUMEN SLIP GAJI</span>
                    <strong className="text-xs text-slate-800 font-mono tracking-wider block mt-1">PAY/{currentStaff.nik}/2026-VI</strong>
                    <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold px-2 py-0.5 rounded-full inline-block mt-1 font-mono">
                      STATUS: PAID / PERIODE JUNI 2026
                    </span>
                  </div>
                </div>

                {/* Recipient meta card info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Penerima Manfaat (Employee) :</span>
                    <div>
                      <strong className="text-slate-800 text-[13px]">{currentStaff.name}</strong>
                      <span className="text-slate-500 block text-[11px]">{currentStaff.position} ({currentStaff.nik})</span>
                    </div>
                    <span className="text-slate-400 block text-[10px]">Email: {currentStaff.email}</span>
                  </div>

                  <div className="space-y-1.5 text-xs sm:text-right">
                    <span className="text-[9px] text-slate-400 font-mono font-bold uppercase block sm:text-right">Tanggal Penyelesaian Dana :</span>
                    <div>
                      <strong className="text-slate-800 text-[12px]">Rabu, 10 Juni 2026</strong>
                      <span className="text-slate-500 block text-[11px]">Via Kas Utama Yayasan ESM</span>
                    </div>
                    <span className="text-slate-400 block text-[10px] font-mono">Metode: Transfer Bank Mandiri</span>
                  </div>
                </div>

                {/* Table Breakdown Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                  
                  {/* PENDAPATAN (EARNINGS) */}
                  <div className="space-y-4">
                    <h5 className="font-extrabold text-[12px] text-slate-800 uppercase tracking-wider font-mono border-b border-indigo-100 pb-1.5 flex items-center justify-between">
                      <span>Rincian Pendapatan</span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">Earnings</span>
                    </h5>

                    <div className="space-y-2.5 text-xs">
                      
                      {/* Base Salary */}
                      <div className="flex justify-between items-center py-1 border-b border-slate-50">
                        <span className="text-slate-600 font-medium">Gaji Pokok Utama</span>
                        <span className="font-bold text-slate-800 font-mono">{formatIDRCurrency(salaryBase)}</span>
                      </div>

                      {/* Allowances List */}
                      {allowances.map((item, idx) => {
                        if (item.amount === 0) return null;
                        return (
                          <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-slate-500">{item.name}</span>
                            <span className="font-semibold text-slate-700 font-mono">{formatIDRCurrency(item.amount)}</span>
                          </div>
                        );
                      })}

                    </div>
                  </div>

                  {/* POTONGAN (DEDUCTIONS) */}
                  <div className="space-y-4">
                    <h5 className="font-extrabold text-[12px] text-slate-800 uppercase tracking-wider font-mono border-b border-rose-100 pb-1.5 flex items-center justify-between">
                      <span>Rincian Potongan</span>
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px]">Deductions</span>
                    </h5>

                    <div className="space-y-2.5 text-xs">
                      
                      {/* Deductions List */}
                      {deductions.map((item, idx) => {
                        if (item.amount === 0) return null;
                        return (
                          <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                            <span className="text-rose-605 text-slate-500">{item.name}</span>
                            <span className="font-semibold text-rose-650 text-slate-700 font-mono font-bold">- {formatIDRCurrency(item.amount)}</span>
                          </div>
                        );
                      })}

                      {/* If no deductions */}
                      {totalDeductions === 0 && (
                        <div className="py-2 text-slate-400 italic text-center text-[11px]">
                          Tidak ada pemotongan gaji pada periode ini.
                        </div>
                      )}

                    </div>
                  </div>

                </div>

                {/* SUMMARY CONTAINER (Subtotals & Grand Total Take Home Pay) */}
                <div className="border-t border-slate-200 mt-6 pt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal Pendapatan Kotor:</span>
                        <span className="font-semibold text-slate-700 font-mono">{formatIDRCurrency(totalGrossSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Potongan Bulanan:</span>
                        <span className="font-semibold text-slate-750 font-mono">{formatIDRCurrency(totalDeductions)}</span>
                      </div>
                    </div>

                    <div className="sm:text-right border-l-0 sm:border-l sm:border-slate-100 sm:pl-6 flex flex-col justify-center">
                      <span className="text-[#2563EB] text-[10px] uppercase font-mono tracking-widest block font-bold">TOTAL GAJI NET (TAKE HOME PAY) :</span>
                      <strong className="text-2xl font-black text-slate-900 tracking-tight font-mono leading-none mt-1.5 block">
                        {formatIDRCurrency(takeHomePay)}
                      </strong>
                    </div>
                  </div>

                  {/* Footnote Slip */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3 text-[11px] leading-relaxed text-slate-500">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p>
                      <strong>Sertifikat Keabsahan Digital:</strong> Slip ini sah secara digital diterbitkan oleh Bendahara & Sistem ERP Lembaga ESM. Jika terdapat selisih pencatatan atau keterlambatan transfer, mohon ajukan pertanyaan ke koordinator keuangan di menu Sekretariat.
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
