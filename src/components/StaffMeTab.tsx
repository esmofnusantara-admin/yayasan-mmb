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
    address: 'Sistem Karyawan Yayasan MMB',
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
      <div className="bg-[#0c2340] text-white p-5 rounded-lg border border-slate-700 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-300 block font-semibold mb-0.5">DASHBOARD AKSES STAF PRIBADI</span>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5 leading-none">
            <User className="w-4 h-4 text-emerald-400" />
            Informasi Data Diri & Gaji Saya
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Selamat datang, <span className="text-white font-bold">{currentUser.name}</span>. Halaman ini terintegrasi langsung dengan akun Anda secara privat untuk melihat data diri dan rincian slip gaji.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded text-xs font-mono text-slate-200 self-start sm:self-auto">
          Hak Akses: <span className="text-emerald-400 font-bold">{currentUser.role}</span>
        </div>
      </div>

      {currentStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT PANEL: PROFILE CARD & OFFICE METRICS (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Main Staff ID Card */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden text-left">
              {/* Card top banner background */}
              <div className="h-24 bg-[#0c2340] p-4 flex flex-col justify-between relative border-b border-slate-700">
                <div className="flex justify-between items-center z-10">
                  <span className="text-[9px] font-semibold font-mono text-slate-300 tracking-wider uppercase bg-slate-800/80 py-0.5 px-2 rounded border border-slate-700">
                    KARTU IDENTITAS STAF
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-200 tracking-wider">
                    {currentStaff.nik}
                  </span>
                </div>
                <div className="z-10">
                  <h3 className="text-white font-bold text-sm leading-none tracking-tight">{currentStaff.name}</h3>
                  <p className="text-[10px] text-slate-300 font-mono mt-1 uppercase tracking-wider font-semibold">{currentStaff.position}</p>
                </div>
              </div>

              {/* Card Body Details */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Divisi Lembaga
                  </span>
                  <span className="font-semibold text-slate-900">{currentStaff.division}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Join
                  </span>
                  <span className="font-semibold text-slate-900">{currentStaff.joinedDate}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Masa Bakti Pelayanan
                  </span>
                  <span className="font-semibold text-[#0c2340] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono text-[11px]">
                    {calculateDurationOfService(currentStaff.joinedDate)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-400" /> Status Kontrak
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    currentStaff.status === 'Tetap' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    currentStaff.status === 'Kontrak' ? 'bg-slate-50 text-slate-800 border-slate-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {currentStaff.status}
                  </span>
                </div>

                {currentStaff.contractEndDate && (
                  <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-100">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Akhir Komitmen
                    </span>
                    <span className="font-semibold text-slate-900 font-mono">{currentStaff.contractEndDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Contact card */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs text-left space-y-3">
              <h3 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wider">Informasi Kontak & Alamat</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-mono leading-none block mb-0.5 font-semibold">TELEPON / WA</span>
                    <span className="font-semibold text-slate-900 font-mono text-[11px]">{currentStaff.phone || '-'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-mono leading-none block mb-0.5 font-semibold">ALAMAT EMAIL RESMI</span>
                    <span className="font-semibold text-slate-900 font-mono text-[11px] break-all">{currentStaff.email || '-'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-mono leading-none block mb-0.5 font-semibold">ALAMAT DOMISILI</span>
                    <p className="text-slate-700 leading-relaxed font-sans">{currentStaff.address || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: COMPREHENSIVE SLIP GAJI / PAYSLIP DISPLAY (8 Cols) */}
          <div className="lg:col-span-8 space-y-5">
            
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden text-left">
              
              {/* Header Slip Gaji */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Slip Gaji Bulanan Transparan</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Rincian pendapatan kotor (allowance) dan potongan wajib (deductions) peruntukan pelayanan.</p>
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
                  className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Slip Gaji (PDF)
                </button>
              </div>

              <div id="print-slips-container" className="p-6 space-y-6 bg-white">
                
                {currentStaff.nik === 'NIK-BELUM-FORMAL' ? (
                  <div className="bg-blue-50 text-blue-900 border border-blue-200 rounded p-3.5 text-xs font-medium space-y-1 text-left">
                    <span className="font-bold flex items-center gap-1.5 text-blue-900">ℹ️ Akun Login Belum Terkait dengan Data Karyawan</span>
                    <p className="text-blue-800 leading-relaxed">
                      ID akun login Anda (<strong>{currentUser.email}</strong>) saat ini belum terdaftar atau belum terhubung dengan database Karyawan Yayasan MMB, sehingga slip rincian gaji Anda masih kosong (Rp 0).
                    </p>
                    <div className="pt-1.5 border-t border-blue-200 text-[11px] text-blue-700 space-y-0.5">
                      <p className="font-semibold">Cara Menampilkan Data Gaji Anda:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>Buka tab <strong>Karyawan (Staffs)</strong> atau hubungi Admin untuk mendaftarkan data staf baru dengan email <strong>{currentUser.email}</strong>.</li>
                        <li>Hubungi Bendahara atau Ketua Yayasan untuk mengatur nominal <strong>Gaji Pokok & Tunjangan</strong> di pengaturan gaji.</li>
                      </ul>
                    </div>
                  </div>
                ) : salaryBase === 0 && (
                  <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded p-3.5 text-xs font-medium space-y-1 text-left">
                    <span className="font-bold flex items-center gap-1.5 text-amber-900">⚠️ Rincian Gaji Belum Dikonfigurasikan</span>
                    <p className="text-amber-800 leading-relaxed">
                      Data Anda (<strong>{currentStaff.name}</strong>) terdeteksi dengan NIK <strong>{currentStaff.nik}</strong>. Namun rincian Gaji Pokok & Tunjangan Anda masih terhitung Rp 0 atau belum dikonfigurasikan oleh Bendahara Yayasan.
                    </p>
                  </div>
                )}

                {/* Invoice Letterhead */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div className="space-y-0.5">
                    <span className="text-[#0c2340] font-mono text-[9px] font-bold uppercase tracking-wider block">MURID MUDA BERMISI</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">YAYASAN MURID MUDA BERMISI (MMB)</h4>
                    <span className="text-[10px] text-slate-500 block font-mono">Gedung Pusat Administrasi &bull; Jakarta-Yogyakarta</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-slate-500 block leading-none">DOKUMEN SLIP GAJI</span>
                    <strong className="text-xs text-slate-900 font-mono tracking-wider block mt-1">PAY/{currentStaff.nik}/2026-VI</strong>
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded inline-block mt-1 font-mono">
                      STATUS: PAID / PERIODE JUNI 2026
                    </span>
                  </div>
                </div>

                {/* Recipient meta card info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                  <div className="space-y-1 text-xs">
                    <span className="text-[9px] text-slate-500 font-mono font-semibold uppercase block">Penerima Manfaat (Employee) :</span>
                    <div>
                      <strong className="text-slate-900 text-xs">{currentStaff.name}</strong>
                      <span className="text-slate-600 block text-[11px]">{currentStaff.position} ({currentStaff.nik})</span>
                    </div>
                    <span className="text-slate-500 block text-[10px]">Email: {currentStaff.email}</span>
                  </div>

                  <div className="space-y-1 text-xs sm:text-right">
                    <span className="text-[9px] text-slate-500 font-mono font-semibold uppercase block sm:text-right">Tanggal Penyelesaian Dana :</span>
                    <div>
                      <strong className="text-slate-900 text-xs">Rabu, 10 Juni 2026</strong>
                      <span className="text-slate-600 block text-[11px]">Via Kas Utama Yayasan MMB</span>
                    </div>
                    <span className="text-slate-500 block text-[10px] font-mono">Metode: Transfer Bank Mandiri</span>
                  </div>
                </div>

                {/* Table Breakdown Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                  
                  {/* PENDAPATAN (EARNINGS) */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-mono border-b border-slate-200 pb-1 flex items-center justify-between">
                      <span>Rincian Pendapatan</span>
                      <span className="text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">Earnings</span>
                    </h5>

                    <div className="space-y-2 text-xs">
                      
                      {/* Base Salary */}
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-700 font-medium">Gaji Pokok Utama</span>
                        <span className="font-bold text-slate-900 font-mono">{formatIDRCurrency(salaryBase)}</span>
                      </div>

                      {/* Allowances List */}
                      {allowances.map((item, idx) => {
                        if (item.amount === 0) return null;
                        return (
                          <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-600">{item.name}</span>
                            <span className="font-semibold text-slate-800 font-mono">{formatIDRCurrency(item.amount)}</span>
                          </div>
                        );
                      })}

                    </div>
                  </div>

                  {/* POTONGAN (DEDUCTIONS) */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-mono border-b border-slate-200 pb-1 flex items-center justify-between">
                      <span>Rincian Potongan</span>
                      <span className="text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">Deductions</span>
                    </h5>

                    <div className="space-y-2 text-xs">
                      
                      {/* Deductions List */}
                      {deductions.map((item, idx) => {
                        if (item.amount === 0) return null;
                        return (
                          <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100">
                            <span className="text-slate-600">{item.name}</span>
                            <span className="font-semibold text-rose-800 font-mono font-bold">- {formatIDRCurrency(item.amount)}</span>
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
                <div className="border-t border-slate-200 mt-4 pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal Pendapatan Kotor:</span>
                        <span className="font-semibold text-slate-800 font-mono">{formatIDRCurrency(totalGrossSalary)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Potongan Bulanan:</span>
                        <span className="font-semibold text-slate-800 font-mono">{formatIDRCurrency(totalDeductions)}</span>
                      </div>
                    </div>

                    <div className="sm:text-right border-l-0 sm:border-l sm:border-slate-200 sm:pl-4 flex flex-col justify-center">
                      <span className="text-[#0c2340] text-[10px] uppercase font-mono tracking-wider block font-bold">TOTAL GAJI NET (TAKE HOME PAY) :</span>
                      <strong className="text-xl font-bold text-slate-900 tracking-tight font-mono leading-none mt-1 block">
                        {formatIDRCurrency(takeHomePay)}
                      </strong>
                    </div>
                  </div>

                  {/* Footnote Slip */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 flex items-center gap-2.5 text-[11px] leading-relaxed text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                    <p>
                      <strong>Sertifikat Keabsahan Digital:</strong> Slip ini sah secara digital diterbitkan oleh Bendahara & Sistem ERP Lembaga MMB. Jika terdapat selisih pencatatan atau pertanyaan, mohon ajukan ke koordinator keuangan di menu Sekretariat.
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
