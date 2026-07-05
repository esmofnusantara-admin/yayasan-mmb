/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Plus, 
  Search, 
  Trash, 
  Edit, 
  Heart, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Phone, 
  Sliders, 
  ChevronRight, 
  ChevronLeft,
  Tag, 
  CheckCircle, 
  User, 
  Award,
  KanbanSquare,
  Download,
  MessageSquare,
  Settings,
  X,
  Clock,
  Bell
} from 'lucide-react';
import { Partner, CampaignDonation, InstitutionalProfile } from '../types';
import { exportToCSV } from '../utils/export';
import { jsPDF } from 'jspdf';

interface PartnersTabProps {
  partners: Partner[];
  onAddPartner: (p: Partner) => void;
  onUpdatePartner: (p: Partner) => void;
  onDeletePartner: (id: string) => void;
  currentRole: string;
  donations: CampaignDonation[];
  onAddDonation: (d: CampaignDonation) => Promise<void>;
  onUpdateDonation?: (d: CampaignDonation) => Promise<void>;
  onDeleteDonation?: (id: string) => Promise<void>;
  profile?: InstitutionalProfile;
}

export default function PartnersTab({
  partners,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  currentRole,
  donations,
  onAddDonation,
  onUpdateDonation,
  onDeleteDonation,
  profile,
}: PartnersTabProps) {
  const canManagePartners = ['Super Admin', 'Ketua Yayasan', 'Sekretaris', 'Staff'].includes(currentRole);
  const canManageDonations = ['Super Admin', 'Ketua Yayasan', 'Bendahara'].includes(currentRole);
  const [subView, setSubView] = useState<'directory' | 'pipeline' | 'donations' | 'schedules' | 'scheduling'>('schedules');
  
  // Scheduler / Reminder configuration states
  const [isAutoSchedulerEnabled, setIsAutoSchedulerEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('is_auto_scheduler_enabled');
    return saved !== 'false';
  });
  const [schedulerTrigger, setSchedulerTrigger] = useState<string>(() => {
    return localStorage.getItem('scheduler_trigger') || 'jatuh_tempo';
  });
  const [schedulerTime, setSchedulerTime] = useState<string>(() => {
    return localStorage.getItem('scheduler_time') || '09:00';
  });
  const [remindedPartners, setRemindedPartners] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('reminded_partners_log');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleToggleScheduler = (val: boolean) => {
    setIsAutoSchedulerEnabled(val);
    localStorage.setItem('is_auto_scheduler_enabled', String(val));
  };

  const handleUpdateSchedulerTrigger = (trigger: string) => {
    setSchedulerTrigger(trigger);
    localStorage.setItem('scheduler_trigger', trigger);
  };

  const handleUpdateSchedulerTime = (time: string) => {
    setSchedulerTime(time);
    localStorage.setItem('scheduler_time', time);
  };

  const handleMarkAsReminded = (partnerId: string) => {
    const updated = {
      ...remindedPartners,
      [partnerId]: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    };
    setRemindedPartners(updated);
    localStorage.setItem('reminded_partners_log', JSON.stringify(updated));
  };
  
  // Selected Month & Year for Schedule Tracking (Defaults to current system date)
  const [scheduleMonth, setScheduleMonth] = useState<number>(new Date().getMonth());
  const [scheduleYear, setScheduleYear] = useState<number>(new Date().getFullYear());
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  
  // Search metrics
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('Semua');
  const [donationFilter, setDonationFilter] = useState<'All' | 'GivenThisMonth' | 'NotGivenThisMonth' | 'GivenLastMonth' | 'NotGivenLastMonth'>('All');
  const [selectedDonationDay, setSelectedDonationDay] = useState<string>('Semua');

  // WhatsApp template state with local storage cache
  const [waTemplate, setWaTemplate] = useState<string>(() => {
    const saved = localStorage.getItem('wa_reminder_template');
    return saved || 'Halo {nama}, kami dari tim Kemitraan ingin menyapa dan menginfokan kembali terkait jadwal janji dukungan rutin Anda ({komitmen}) yang direncanakan pada {tanggal}. Terima kasih banyak atas komitmen dan dukungan setia Anda. Tuhan memberkati!';
  });
  const [isWATemplateEditing, setIsWATemplateEditing] = useState(false);

  // Partner Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pBirthDate, setPBirthDate] = useState('');
  const [pOccupation, setPOccupation] = useState('');
  const [pType, setPType] = useState<any>(profile?.partnerTypes?.[0] || 'Pribadi');
  const [pRegion, setPRegion] = useState(profile?.regions?.[0] || 'Yogyakarta');
  const [pStaff, setPStaff] = useState('Ahmad Faisal');
  const [pStatus, setPStatus] = useState<any>(profile?.partnerStatuses?.[0] || 'Prospek');
  
  // Commitment
  const [pAmount, setPAmount] = useState<number>(500000);
  const [pFreq, setPFreq] = useState<'Bulanan' | 'Tahunan' | 'Satu Kali'>('Bulanan');
  const [pStartDate, setPStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pEndDate, setPEndDate] = useState('2027-12-31');
  const [pDonationDay, setPDonationDay] = useState<number>(10);

  // Simulated Donation Logging State
  const [isDonationFormOpen, setIsDonationFormOpen] = useState(false);
  const [donationPartnerId, setDonationPartnerId] = useState('');
  const [donationAmount, setDonationAmount] = useState<number>(500000);
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [donationChannel, setDonationChannel] = useState('Transfer Bank Mandiri');
  
  React.useEffect(() => {
    if (profile?.donationChannels && profile.donationChannels.length > 0) {
      if (!profile.donationChannels.some(chan => chan.name === donationChannel)) {
        setDonationChannel(profile.donationChannels[0].name);
      }
    }
  }, [profile, donationChannel]);
  const [donationLogs, setDonationLogs] = useState<CampaignDonation[]>([
    { id: 'DON-01', partnerId: 'PTR-01', partnerName: 'Bapak Hendra Wijaya', amount: 1500000, date: '2026-06-01', channel: 'Transfer Bank Mandiri' },
    { id: 'DON-02', partnerId: 'PTR-02', partnerName: 'GKI Manyar Surabaya', amount: 12000000, date: '2026-05-10', channel: 'BCA Yayasan' }
  ]);

  const [editingDonation, setEditingDonation] = useState<CampaignDonation | null>(null);
  const finalDonationLogs = donations ? donations : donationLogs;
  const [deleteConfirmDonation, setDeleteConfirmDonation] = useState<CampaignDonation | null>(null);
  const [deleteConfirmPartner, setDeleteConfirmPartner] = useState<Partner | null>(null);

  const openAddForm = () => {
    setEditingPartner(null);
    setPName('');
    setPPhone('');
    setPEmail('');
    setPAddress('');
    setPBirthDate('');
    setPOccupation('');
    setPType('Pribadi');
    setPRegion(profile?.regions?.[0] || 'Yogyakarta');
    setPStaff('Ahmad Faisal');
    setPStatus('Prospek');
    setPAmount(500000);
    setPFreq('Bulanan');
    setPStartDate(new Date().toISOString().split('T')[0]);
    setPEndDate('2027-12-31');
    setPDonationDay(10);
    setIsFormOpen(true);
  };

  const openEditForm = (p: Partner) => {
    setEditingPartner(p);
    setPName(p.name);
    setPPhone(p.phone);
    setPEmail(p.email);
    setPAddress(p.address);
    setPBirthDate(p.birthDate || '');
    setPOccupation(p.occupation || '');
    setPType(p.partnerType);
    setPRegion(p.region);
    setPStaff(p.staffRelasi);
    setPStatus(p.status);
    setPAmount(p.commitmentAmount);
    setPFreq(p.frequency);
    setPStartDate(p.startDate);
    setPEndDate(p.endDate || '');
    setPDonationDay(p.donationDay || 10);
    setIsFormOpen(true);
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || pAmount <= 0) {
      alert('Nama Mitra dan nominal komitmen wajib diisi!');
      return;
    }

    if (editingPartner) {
      if (!window.confirm('Apakah Anda yakin ingin menyimpan perubahan data mitra ini?')) {
        return;
      }
      const updated: Partner = {
        ...editingPartner,
        name: pName,
        phone: pPhone,
        email: pEmail,
        address: pAddress,
        birthDate: pBirthDate || undefined,
        occupation: pOccupation || undefined,
        partnerType: pType,
        region: pRegion,
        staffRelasi: pStaff,
        status: pStatus,
        commitmentAmount: Number(pAmount),
        frequency: pFreq,
        startDate: pStartDate,
        endDate: pEndDate || undefined,
        donationDay: Number(pDonationDay)
      };
      onUpdatePartner(updated);
    } else {
      const newly: Partner = {
        id: `PTR-${String(partners.length + 1).padStart(2, '0')}`,
        name: pName,
        phone: pPhone,
        email: pEmail,
        address: pAddress,
        birthDate: pBirthDate || undefined,
        occupation: pOccupation || undefined,
        partnerType: pType,
        region: pRegion,
        staffRelasi: pStaff,
        status: pStatus,
        commitmentAmount: Number(pAmount),
        frequency: pFreq,
        startDate: pStartDate,
        endDate: pEndDate || undefined,
        donationDay: Number(pDonationDay)
      };
      onAddPartner(newly);
    }
    setIsFormOpen(false);
  };

  const handleLogDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationPartnerId || donationAmount <= 0) {
      alert('Pilih mitra & isi jumlah donasi!');
      return;
    }
    const partnerObj = partners.find(p => p.id === donationPartnerId);
    if (!partnerObj) return;

    try {
      if (editingDonation) {
        if (!window.confirm('Apakah Anda yakin ingin menyimpan perubahan log donasi ini?')) {
          return;
        }
        const updatedDonation: CampaignDonation = {
          ...editingDonation,
          partnerId: donationPartnerId,
          partnerName: partnerObj.name,
          amount: Number(donationAmount),
          date: donationDate,
          channel: donationChannel
        };
        if (onUpdateDonation) {
          await onUpdateDonation(updatedDonation);
        }
        setIsDonationFormOpen(false);
        setEditingDonation(null);
        alert(`Sukses: Log donasi berhasil diperbarui!`);
      } else {
        const newDonation: CampaignDonation = {
          id: `DON-${Date.now()}`,
          partnerId: donationPartnerId,
          partnerName: partnerObj.name,
          amount: Number(donationAmount),
          date: donationDate,
          channel: donationChannel
        };
        await onAddDonation(newDonation);
        setIsDonationFormOpen(false);
        alert(`Donasi sebesar Rp ${Number(donationAmount).toLocaleString('id-ID')} dari ${partnerObj.name} berhasil diverifikasi sistem!`);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan donasi.');
    }
  };

  // Pipeline stages Kanban definition
  const STAGES: any[] = profile?.partnerStatuses || ['Prospek', 'Kontak Awal', 'Presentasi', 'Komitmen', 'Donasi Pertama', 'Aktif', 'Tidak Aktif'];

  // System month & year calculations for Indonesian helper
  const today = new Date();
  const currentMonthNum = today.getMonth(); // 0-11
  const currentYearNum = today.getFullYear();
  
  const prevMonthNum = currentMonthNum === 0 ? 11 : currentMonthNum - 1;
  const prevYearNum = currentMonthNum === 0 ? currentYearNum - 1 : currentYearNum;

  const INDO_MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const currentMonthName = INDO_MONTHS[currentMonthNum];
  const prevMonthName = INDO_MONTHS[prevMonthNum];

  // Helper function to safely parse YYYY-MM-DD date strings in UTC without local timezone shifts
  const parseDateUTC = (dateStr: string) => {
    if (!dateStr) return { year: 0, month: 0, day: 0 };
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1, // 0-indexed
        day: parseInt(parts[2], 10)
      };
    }
    const d = new Date(dateStr);
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  };

  const checkDonation = (partnerId: string, year: number, month: number) => {
    return finalDonationLogs.some(d => {
      if (!d.partnerId || d.partnerId !== partnerId || !d.date) return false;
      const parsed = parseDateUTC(d.date);
      return parsed.year === year && parsed.month === month;
    });
  };

  const countGivenThisMonth = partners.filter(p => p.status === 'Aktif' && checkDonation(p.id, currentYearNum, currentMonthNum)).length;
  const countNotGivenThisMonth = partners.filter(p => p.status === 'Aktif' && !checkDonation(p.id, currentYearNum, currentMonthNum)).length;
  const countGivenLastMonth = partners.filter(p => p.status === 'Aktif' && checkDonation(p.id, prevYearNum, prevMonthNum)).length;
  const countNotGivenLastMonth = partners.filter(p => p.status === 'Aktif' && !checkDonation(p.id, prevYearNum, prevMonthNum)).length;

  const getWhatsAppLink = (p: Partner) => {
    const cleanPhone = p.phone ? p.phone.replace(/[^0-9]/g, '') : '';
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('0')) {
      formattedPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62') && cleanPhone.length > 0) {
      formattedPhone = '62' + cleanPhone;
    }
    
    const donationDayText = p.donationDay ? `tanggal ${p.donationDay}` : 'setiap bulannya';
    const commitmentText = `Rp ${p.commitmentAmount.toLocaleString('id-ID')}`;
    
    const msg = waTemplate
      .replace(/{nama}/g, p.name)
      .replace(/{tanggal}/g, donationDayText)
      .replace(/{komitmen}/g, commitmentText);
    
    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`;
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'Semua' || p.partnerType === filterType;
    
    if (!(matchesSearch && matchesType)) return false;

    // Filter by selectedDonationDay (planned/commitment day of the month)
    if (selectedDonationDay !== 'Semua') {
      const dayNum = parseInt(selectedDonationDay, 10);
      if (p.donationDay !== dayNum) return false;
    }
    
    const givenThisMonth = checkDonation(p.id, currentYearNum, currentMonthNum);
    const givenLastMonth = checkDonation(p.id, prevYearNum, prevMonthNum);
    
    if (donationFilter === 'GivenThisMonth') return givenThisMonth;
    if (donationFilter === 'NotGivenThisMonth') return !givenThisMonth && p.status === 'Aktif';
    if (donationFilter === 'GivenLastMonth') return givenLastMonth;
    if (donationFilter === 'NotGivenLastMonth') return !givenLastMonth && p.status === 'Aktif';
    
    return true;
  });

  const handleExportCSV = () => {
    const headers = [
      'ID Mitra',
      'Nama Mitra',
      'No. Telepon',
      'Email',
      'Alamat',
      'Tanggal Lahir',
      'Pekerjaan',
      'Tipe Mitra',
      'Wilayah',
      'Staf Relasi',
      'Status Keaktifan',
      'Jumlah Komitmen (IDR)',
      'Frekuensi Donasi',
      'Tanggal Mulai Komitmen'
    ];
    const keys = [
      'id',
      'name',
      'phone',
      'email',
      'address',
      'birthDate',
      'occupation',
      'partnerType',
      'region',
      'staffRelasi',
      'status',
      'commitmentAmount',
      'frequency',
      'startDate'
    ];
    exportToCSV(filteredPartners, headers, keys, `data_mitra_fundraising_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  const openDonationForPartner = (partner: Partner) => {
    setDonationPartnerId(partner.id);
    setDonationAmount(partner.commitmentAmount);
    // Set date to a suitable date in the selected month/year
    const year = scheduleYear;
    const month = String(scheduleMonth + 1).padStart(2, '0');
    // Use current day if current month/year matches selected, otherwise partner's planned donation day
    const today = new Date();
    const day = (today.getFullYear() === year && today.getMonth() === scheduleMonth) 
      ? String(today.getDate()).padStart(2, '0') 
      : String(partner.donationDay || 10).padStart(2, '0');
    
    setDonationDate(`${year}-${month}-${day}`);
    setIsDonationFormOpen(true);
  };

  const handleDownloadAllPartnersPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      
      const drawHeader = (pageNum: number) => {
        // Top banner
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(0, 0, 297, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('LAPORAN DIREKTORI MITRA & DONATUR FUNDRAISING', 15, 11);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Unduh: ${new Date().toLocaleDateString('id-ID')} | Total: ${filteredPartners.length} Mitra`, 15, 17);
        
        if (profile?.name) {
          doc.text(profile.name.toUpperCase(), 282, 11, { align: 'right' });
        }
        
        // Table Header
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(15, 30, 267, 10, 'F');
        
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.rect(15, 30, 267, 10, 'S');
        
        doc.setTextColor(71, 85, 105); // slate-600
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        
        let x = 15;
        doc.text('No.', x + 2, 36.5);
        x += 12;
        doc.text('ID Mitra', x + 2, 36.5);
        x += 25;
        doc.text('Nama Lengkap Mitra', x + 2, 36.5);
        x += 65;
        doc.text('Tipe / Wilayah', x + 2, 36.5);
        x += 45;
        doc.text('Staff Relasi', x + 2, 36.5);
        x += 45;
        doc.text('Komitmen Bulanan', x + 2, 36.5);
        x += 50;
        doc.text('Status', x + 2, 36.5);
      };
      
      let y = 40;
      let pageNum = 1;
      
      drawHeader(pageNum);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      
      filteredPartners.forEach((partner, idx) => {
        if (y > 180) {
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Halaman ${pageNum}`, 148.5, 202, { align: 'center' });
          
          doc.addPage();
          pageNum++;
          y = 40;
          drawHeader(pageNum);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
        }
        
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(15, y, 267, 9, 'F');
        }
        
        doc.setDrawColor(241, 245, 249);
        doc.line(15, y + 9, 282, y + 9);
        
        let x = 15;
        doc.text(`${idx + 1}`, x + 2, y + 5.5);
        x += 12;
        
        doc.setFont('helvetica', 'bold');
        doc.text(partner.id, x + 2, y + 5.5);
        doc.setFont('helvetica', 'normal');
        x += 25;
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(partner.name, x + 2, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        x += 65;
        
        doc.text(`${partner.partnerType} / ${partner.region}`, x + 2, y + 5.5);
        x += 45;
        
        doc.text(partner.staffRelasi, x + 2, y + 5.5);
        x += 45;
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Rp ${partner.commitmentAmount.toLocaleString('id-ID')}`, x + 2, y + 5.5);
        doc.setFont('helvetica', 'normal');
        x += 50;
        
        const stat = partner.status;
        if (stat === 'Aktif') {
          doc.setTextColor(16, 185, 129); // emerald-500
        } else if (stat === 'Komitmen') {
          doc.setTextColor(79, 70, 229); // indigo-600
        } else {
          doc.setTextColor(100, 116, 139); // slate-500
        }
        doc.setFont('helvetica', 'bold');
        doc.text(stat, x + 2, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        
        y += 9;
      });
      
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Halaman ${pageNum}`, 148.5, 202, { align: 'center' });
      
      doc.save(`direktori_mitra_fundraising_${new Date().toISOString().substring(0, 10)}.pdf`);
    } catch (err) {
      console.error('Gagal export PDF:', err);
      alert('Terjadi kesalahan saat mengunduh laporan PDF.');
    }
  };

  const handleDownloadSinglePartnerPDF = (partner: Partner) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // 1. TOP HEADER BANNER
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(partner.name.toUpperCase(), 20, 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`KODE MITRA: ${partner.id}  |  KLASIFIKASI: ${partner.partnerType}  |  WILAYAH: ${partner.region}`, 20, 22);
      doc.text(`Unduh Dokumen: ${new Date().toLocaleDateString('id-ID')} | Staff Pendamping: ${partner.staffRelasi}`, 20, 27);
      
      if (profile?.name) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(profile.name.toUpperCase(), 190, 15, { align: 'right' });
      }

      // 2. PROFILE DETAILS BOX
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('I. PROFIL & KOMITMEN KEMITRAAN', 20, 47);
      
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(20, 49, 190, 49);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      
      let y = 56;
      doc.text('Status Keaktifan:', 20, y);
      doc.text('Nominal Komitmen:', 20, y + 8);
      doc.text('Frekuensi Janji:', 20, y + 16);
      doc.text('Masa Kontrak / Mulai:', 20, y + 24);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(partner.status, 60, y);
      doc.text(`Rp ${partner.commitmentAmount.toLocaleString('id-ID')}`, 60, y + 8);
      doc.text(partner.frequency + (partner.donationDay ? ` (Tiap tanggal ${partner.donationDay})` : ''), 60, y + 16);
      
      const pStart = partner.startDate ? parseDateUTC(partner.startDate) : null;
      const pEnd = partner.endDate ? parseDateUTC(partner.endDate) : null;
      const dateRangeText = pStart 
        ? `${pStart.day} ${INDO_MONTHS[pStart.month]} ${pStart.year}${pEnd ? ` s/d ${pEnd.day} ${INDO_MONTHS[pEnd.month]} ${pEnd.year}` : ' (Berkelanjutan)'}`
        : 'Tidak ditentukan';
      doc.text(dateRangeText, 60, y + 24);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Nomor Telepon:', 115, y);
      doc.text('Email Korespondensi:', 115, y + 8);
      doc.text('Alamat Domisili:', 115, y + 16);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(partner.phone || '-', 150, y);
      doc.text(partner.email || '-', 150, y + 8);
      
      const addrLines = doc.splitTextToSize(partner.address || '-', 40);
      doc.text(addrLines, 150, y + 16);

      // 3. CALENDAR CHART
      y = 96;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`II. REKAPITULASI JURNAL PEMBAYARAN BULANAN (TAHUN ${scheduleYear})`, 20, y);
      doc.line(20, y + 2, 190, y + 2);
      
      y += 8;
      const cols = 4;
      const boxW = 39.5;
      const boxH = 18;
      const gap = 4;
      
      INDO_MONTHS.forEach((monthName, mIdx) => {
        const r = Math.floor(mIdx / cols);
        const c = mIdx % cols;
        const bx = 20 + c * (boxW + gap);
        const by = y + r * (boxH + gap);
        
        const checkSecs = new Date(scheduleYear, mIdx, 1).getTime();
        const startSecs = pStart ? new Date(pStart.year, pStart.month, 1).getTime() : 0;
        const endSecs = pEnd ? new Date(pEnd.year, pEnd.month, 28).getTime() : Infinity;
        const isActiveInMonth = checkSecs >= startSecs && checkSecs <= endSecs;
        
        const monthDonations = finalDonationLogs.filter(d => {
          if (d.partnerId !== partner.id || !d.date) return false;
          const parsed = parseDateUTC(d.date);
          return parsed.year === scheduleYear && parsed.month === mIdx;
        });
        const totalPaid = monthDonations.reduce((sum, d) => sum + d.amount, 0);
        const isLunas = totalPaid >= partner.commitmentAmount;
        
        if (!isActiveInMonth) {
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(226, 232, 240);
          doc.rect(bx, by, boxW, boxH, 'FD');
          doc.setTextColor(148, 163, 184);
        } else if (isLunas) {
          doc.setFillColor(236, 253, 245);
          doc.setDrawColor(167, 243, 208);
          doc.rect(bx, by, boxW, boxH, 'FD');
          doc.setTextColor(6, 95, 70);
        } else if (totalPaid > 0) {
          doc.setFillColor(254, 243, 199);
          doc.setDrawColor(253, 230, 138);
          doc.rect(bx, by, boxW, boxH, 'FD');
          doc.setTextColor(146, 64, 14);
        } else {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(226, 232, 240);
          doc.rect(bx, by, boxW, boxH, 'FD');
          doc.setTextColor(71, 85, 105);
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(monthName, bx + 2, by + 4.5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        if (!isActiveInMonth) {
          doc.text('Non-Aktif', bx + 2, by + 10);
        } else if (isLunas) {
          doc.setFont('helvetica', 'bold');
          doc.text(`Rp ${totalPaid.toLocaleString('id-ID')}`, bx + 2, by + 10);
          doc.text('LUNAS ✓', bx + 2, by + 14);
        } else if (totalPaid > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text(`Rp ${totalPaid.toLocaleString('id-ID')}`, bx + 2, by + 10);
          doc.setFont('helvetica', 'normal');
          doc.text('Belum Lunas', bx + 2, by + 14);
        } else {
          doc.setTextColor(185, 28, 28);
          doc.setFont('helvetica', 'bold');
          doc.text('Rp 0', bx + 2, by + 10);
          doc.text('TUNGGAKAN', bx + 2, by + 14);
        }
      });

      // 4. TRANSACTION LOG TABLE
      y += 3 * (boxH + gap) + 12;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('III. HISTORI MUTASI PENERIMAAN KAS DONASI (LOG JURNAL)', 20, y);
      doc.line(20, y + 2, 190, y + 2);
      
      y += 8;
      
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y, 170, 7, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, y, 170, 7, 'S');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      
      doc.text('Tanggal Terima Kas', 23, y + 4.5);
      doc.text('Jumlah Penerimaan', 75, y + 4.5);
      doc.text('Saluran / Rekening', 120, y + 4.5);
      doc.text('Verifikator', 165, y + 4.5);
      
      y += 7;
      
      const partnerLogs = finalDonationLogs
        .filter(d => d.partnerId === partner.id)
        .sort((a, b) => b.date.localeCompare(a.date));
        
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      
      if (partnerLogs.length === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, y, 170, 8, 'F');
        doc.text('Belum ada riwayat setoran kontribusi kas terdaftar.', 25, y + 5);
        y += 8;
      } else {
        partnerLogs.forEach((log, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(20, y, 170, 8, 'F');
          }
          
          doc.setDrawColor(241, 245, 249);
          doc.line(20, y + 8, 190, y + 8);
          
          const logDate = parseDateUTC(log.date);
          const dateStr = `${logDate.day} ${INDO_MONTHS[logDate.month]} ${logDate.year}`;
          
          doc.text(dateStr, 23, y + 5);
          
          doc.setFont('helvetica', 'bold');
          doc.text(`Rp ${log.amount.toLocaleString('id-ID')}`, 75, y + 5);
          doc.setFont('helvetica', 'normal');
          
          doc.text(log.channel, 120, y + 5);
          doc.text(log.verifiedBy || 'Sistem', 165, y + 5);
          
          y += 8;
        });
      }

      if (y > 240) {
        doc.addPage();
        y = 20;
      } else {
        y += 10;
      }
      
      doc.setDrawColor(226, 232, 240);
      doc.line(20, y, 190, y);
      
      y += 8;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('* Laporan ini diterbitkan secara otomatis dan sah oleh sistem manajemen kemitraan gereja/lembaga yayasan.', 20, y);
      doc.text('  Segala bentuk kontribusi dana telah dicatat dan direkonsiliasi dengan rekening koran resmi.', 20, y + 3.5);
      
      doc.save(`laporan_kemitraan_${partner.id}_${partner.name.toLowerCase().replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error('Gagal export PDF mitra tunggal:', err);
      alert('Terjadi kesalahan saat mengunduh laporan PDF mitra.');
    }
  };

  // 1. Get active partners that have ongoing commitment for the selected month/year
  const activePartnersForPeriod = partners.filter(p => {
    // Include 'Aktif', 'Komitmen', and 'Donasi Pertama' as committed partners
    if (p.status !== 'Aktif' && p.status !== 'Komitmen' && p.status !== 'Donasi Pertama') return false;
    
    // Check start and end dates
    const pStart = p.startDate ? parseDateUTC(p.startDate) : null;
    const pEnd = p.endDate ? parseDateUTC(p.endDate) : null;
    
    // Construct safe dates for comparison (using 1st of month for start, 28th for end)
    const currentSecs = new Date(scheduleYear, scheduleMonth, 1).getTime();
    const startSecs = pStart ? new Date(pStart.year, pStart.month, 1).getTime() : 0;
    const endSecs = pEnd ? new Date(pEnd.year, pEnd.month, 28).getTime() : Infinity;
    
    if (currentSecs < startSecs || currentSecs > endSecs) return false;
    
    // If they actually made a donation in this specific month, always show them in the schedule status list!
    const hasDonatedInPeriod = finalDonationLogs.some(d => {
      if (!d.partnerId || d.partnerId !== p.id || !d.date) return false;
      const parsed = parseDateUTC(d.date);
      return parsed.year === scheduleYear && parsed.month === scheduleMonth;
    });
    if (hasDonatedInPeriod) return true;

    // Frequency filter
    if (p.frequency === 'Bulanan') return true;
    if (p.frequency === 'Satu Kali') {
      return pStart ? (pStart.year === scheduleYear && pStart.month === scheduleMonth) : false;
    }
    if (p.frequency === 'Tahunan') {
      // Annual commitment usually falls on the start month
      return pStart ? (pStart.month === scheduleMonth) : false;
    }
    
    return true;
  });

  // 2. Get total actual donations from each active partner in this selected month
  const getDonationsForPartnerInPeriod = (partnerId: string) => {
    return finalDonationLogs.filter(d => {
      if (!d.partnerId || d.partnerId !== partnerId || !d.date) return false;
      const parsed = parseDateUTC(d.date);
      return parsed.year === scheduleYear && parsed.month === scheduleMonth;
    });
  };

  const getPartnerPaidAmountInPeriod = (partnerId: string) => {
    return getDonationsForPartnerInPeriod(partnerId).reduce((sum, d) => sum + d.amount, 0);
  };

  // 3. Status determination for each partner in this period
  const isPartnerLunasInPeriod = (p: Partner) => {
    const paid = getPartnerPaidAmountInPeriod(p.id);
    return paid >= p.commitmentAmount;
  };

  const searchedSchedulesPartners = activePartnersForPeriod.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filter by selectedDonationDay (planned/commitment day of the month OR actual donation day)
    if (selectedDonationDay !== 'Semua') {
      const dayNum = parseInt(selectedDonationDay, 10);
      const matchesPlannedDay = p.donationDay === dayNum;
      
      const actualDonations = getDonationsForPartnerInPeriod(p.id);
      const matchesActualDay = actualDonations.some(d => {
        const parsed = parseDateUTC(d.date);
        return parsed.day === dayNum;
      });

      if (!matchesPlannedDay && !matchesActualDay) return false;
    }

    const isLunas = isPartnerLunasInPeriod(p);
    if (scheduleStatusFilter === 'Paid') return isLunas;
    if (scheduleStatusFilter === 'Unpaid') return !isLunas;
    return true;
  });

  const handlePrevMonth = () => {
    if (scheduleMonth === 0) {
      setScheduleMonth(11);
      setScheduleYear(prev => prev - 1);
    } else {
      setScheduleMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (scheduleMonth === 11) {
      setScheduleMonth(0);
      setScheduleYear(prev => prev + 1);
    } else {
      setScheduleMonth(prev => prev + 1);
    }
  };

  const totalActivePartners = partners.filter(p => p.status === 'Aktif').length;
  const crmProspectsCount = partners.filter(p => p.status !== 'Aktif').length;
  const unpaidCount = partners.filter(p => {
    const isActive = p.status === 'Aktif' || p.status === 'Komitmen' || p.status === 'Donasi Pertama';
    if (!isActive) return false;
    return !checkDonation(p.id, currentYearNum, currentMonthNum);
  }).length;

  return (
    <div className="space-y-6">
      
      {/* Metrics widgets */}
      <div className={`grid grid-cols-1 ${currentRole === 'Staff' ? 'sm:grid-cols-2' : 'sm:grid-cols-4'} gap-4`}>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Mitra Setia Aktif</span>
          <h2 className="text-xl font-bold text-indigo-600 mt-1">{partners.filter(p => p.status === 'Aktif').length} Mitra</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Tahap Pendekatan CRM</span>
          <h2 className="text-xl font-bold text-slate-800 mt-1">{partners.filter(p => p.status !== 'Aktif').length} Prospek</h2>
        </div>
        {currentRole !== 'Staff' && (
          <>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Dukungan Bulanan</span>
              <h2 className="text-xl font-bold text-emerald-600 mt-1">
                Rp {partners.filter(p => p.status === 'Aktif' && p.frequency === 'Bulanan').reduce((sum, p) => sum + p.commitmentAmount, 0).toLocaleString('id-ID')}
              </h2>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
              <span className="text-[10px] text-slate-400 tracking-widest uppercase font-mono">Donasi Masuk Mei-Juni</span>
              <h2 className="text-xl font-bold text-slate-800 mt-1">
                Rp {finalDonationLogs.reduce((sum, d) => sum + d.amount, 0).toLocaleString('id-ID')}
              </h2>
            </div>
          </>
        )}
      </div>

      {/* View switching bar */}
      <div className="bg-white border border-slate-200/80 p-2 rounded-2xl shadow-3xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-1 w-full md:w-auto">
          <button 
            onClick={() => setSubView('schedules')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
              subView === 'schedules' 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-3xs' 
                : 'text-slate-600 hover:text-slate-900 border border-transparent hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500" /> 
            <span>Jadwal Bulanan</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              subView === 'schedules' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-550'
            }`}>
              {totalActivePartners}
            </span>
          </button>

          <button 
            onClick={() => setSubView('scheduling')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
              subView === 'scheduling' 
                ? 'bg-rose-50 text-rose-700 border border-rose-100 shadow-3xs' 
                : 'text-slate-600 hover:text-slate-900 border border-transparent hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" /> 
            <span>Pengingat</span>
            {unpaidCount > 0 ? (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-extrabold ${
                subView === 'scheduling' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {unpaidCount}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">0</span>
            )}
          </button>

          <button 
            onClick={() => setSubView('directory')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
              subView === 'directory' 
                ? 'bg-slate-900 text-white border border-slate-950 shadow-3xs' 
                : 'text-slate-600 hover:text-slate-900 border border-transparent hover:bg-slate-50'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400" /> 
            <span>Database</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              subView === 'directory' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-550'
            }`}>
              {partners.length}
            </span>
          </button>

          <button 
            onClick={() => setSubView('pipeline')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
              subView === 'pipeline' 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-3xs' 
                : 'text-slate-600 hover:text-slate-900 border border-transparent hover:bg-slate-50'
            }`}
          >
            <KanbanSquare className="w-3.5 h-3.5 text-indigo-500" /> 
            <span>Pipeline CRM</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              subView === 'pipeline' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-550'
            }`}>
              {crmProspectsCount}
            </span>
          </button>

          {currentRole !== 'Staff' && (
            <button 
              onClick={() => setSubView('donations')}
              className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                subView === 'donations' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-3xs' 
                  : 'text-slate-600 hover:text-slate-900 border border-transparent hover:bg-slate-50'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> 
              <span>Jurnal Donasi</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                subView === 'donations' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-550'
              }`}>
                {finalDonationLogs.length}
              </span>
            </button>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-450 font-medium bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span>Sistem Sinkronisasi CRM Aktif &bull; {currentRole}</span>
        </div>
      </div>

      {/* VIEW 0: MONITORING JADWAL & STATUS BULANAN */}
      {subView === 'schedules' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Month & Year Navigator */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Monitoring Jadwal & Komitmen Bulanan</h3>
                <p className="text-[11px] text-slate-500">Menganalisis pencapaian dan mengirim pengingat donasi terjadwal mitra aktif.</p>
              </div>
            </div>

            {/* Quick Month Control Navigator */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-1.5 rounded-xl">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex gap-1.5">
                  <select
                    value={scheduleMonth}
                    onChange={(e) => setScheduleMonth(Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 bg-white font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {INDO_MONTHS.map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={scheduleYear}
                    onChange={(e) => setScheduleYear(Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 bg-white font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setScheduleMonth(new Date().getMonth());
                  setScheduleYear(new Date().getFullYear());
                }}
                className="px-3.5 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 shadow-2xs cursor-pointer transition-all active:translate-y-0"
              >
                Bulan Ini
              </button>

              <button 
                onClick={handleDownloadAllPartnersPDF}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-3xs cursor-pointer transition-colors"
                title="Unduh seluruh direktori mitra aktif dalam bentuk tabel PDF"
              >
                <Download className="w-3.5 h-3.5 text-rose-500" /> 
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* KPI Bento Box Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Target Komitmen</span>
                <span className="text-[10px] text-indigo-500 font-medium block">Periode {INDO_MONTHS[scheduleMonth]} {scheduleYear}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-2 font-mono">
                Rp {activePartnersForPeriod.reduce((sum, p) => sum + p.commitmentAmount, 0).toLocaleString('id-ID')}
              </h2>
              <div className="text-[10px] text-slate-400 mt-1">
                Dari <strong className="text-slate-600 font-bold">{activePartnersForPeriod.length} mitra</strong> aktif berjadwal.
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Realisasi Terbayar</span>
                <span className="text-[10px] text-emerald-500 font-medium block">Penerimaan kas terverifikasi</span>
              </div>
              <h2 className="text-xl font-bold text-emerald-600 mt-2 font-mono">
                Rp {activePartnersForPeriod.reduce((sum, p) => sum + getPartnerPaidAmountInPeriod(p.id), 0).toLocaleString('id-ID')}
              </h2>
              <div className="text-[10px] text-slate-400 mt-1">
                Jumlah lunas: <strong className="text-emerald-700 font-bold">{activePartnersForPeriod.filter(p => isPartnerLunasInPeriod(p)).length} mitra</strong>.
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Belum Realisasi</span>
                <span className="text-[10px] text-amber-500 font-medium block">Tunggakan / Belum Menyalurkan</span>
              </div>
              <h2 className="text-xl font-bold text-amber-600 mt-2 font-mono">
                Rp {activePartnersForPeriod.reduce((sum, p) => {
                  const paid = getPartnerPaidAmountInPeriod(p.id);
                  const diff = p.commitmentAmount - paid;
                  return sum + (diff > 0 ? diff : 0);
                }, 0).toLocaleString('id-ID')}
              </h2>
              <div className="text-[10px] text-slate-400 mt-1">
                Belum lunas: <strong className="text-amber-700 font-bold">{activePartnersForPeriod.filter(p => !isPartnerLunasInPeriod(p)).length} mitra</strong>.
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono block">Persentase Capaian</span>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-2xl font-bold text-indigo-600 font-mono">
                    {activePartnersForPeriod.reduce((sum, p) => sum + p.commitmentAmount, 0) > 0 ? Math.min(100, Math.round((activePartnersForPeriod.reduce((sum, p) => sum + getPartnerPaidAmountInPeriod(p.id), 0) / activePartnersForPeriod.reduce((sum, p) => sum + p.commitmentAmount, 0)) * 100)) : 0}%
                  </span>
                  <span className="text-[10px] text-indigo-500 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md font-mono">Target Kemitraan</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${activePartnersForPeriod.reduce((sum, p) => sum + p.commitmentAmount, 0) > 0 ? Math.min(100, Math.round((activePartnersForPeriod.reduce((sum, p) => sum + getPartnerPaidAmountInPeriod(p.id), 0) / activePartnersForPeriod.reduce((sum, p) => sum + p.commitmentAmount, 0)) * 100)) : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Schedule Template WA Alert/Editor */}
          {isWATemplateEditing && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 shadow-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Atur Format WhatsApp Pengingat (Template WA)</h3>
                    <p className="text-[11px] text-slate-500">Sesuaikan pesan WA otomatis saat melakukan penagihan kemitraan.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsWATemplateEditing(false)}
                  className="text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer px-3 py-1.5 bg-white rounded-xl border border-slate-200 transition-colors shadow-2xs hover:bg-slate-50"
                >
                  Tutup Pengaturan [X]
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase font-mono tracking-wider">Isi Pesan:</label>
                  <textarea
                    rows={4}
                    value={waTemplate}
                    onChange={(e) => {
                      setWaTemplate(e.target.value);
                      localStorage.setItem('wa_reminder_template', e.target.value);
                    }}
                    className="w-full border border-slate-250 rounded-xl p-3 text-xs bg-white text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Halo {nama}, kami dari..."
                  />
                  
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-650">Masukkan variabel:</span>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {nama}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer text-[10px] shadow-3xs"
                    >
                      &#123;nama&#125;
                    </button>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {tanggal}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer text-[10px] shadow-3xs"
                    >
                      &#123;tanggal&#125;
                    </button>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {komitmen}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer text-[10px] shadow-3xs"
                    >
                      &#123;komitmen&#125;
                    </button>
                    <button
                      onClick={() => {
                        const def = 'Halo {nama}, kami dari tim Kemitraan ingin menyapa dan menginfokan kembali terkait jadwal janji dukungan rutin Anda ({komitmen}) yang direncanakan pada {tanggal}. Terima kasih banyak atas komitmen dan dukungan setia Anda. Tuhan memberkati!';
                        setWaTemplate(def);
                        localStorage.setItem('wa_reminder_template', def);
                      }}
                      className="ml-auto text-emerald-650 font-bold hover:underline cursor-pointer text-[10px]"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>

                <div className="bg-emerald-50/40 rounded-2xl border border-emerald-100 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono tracking-wider block mb-1">Pratinjau Hasil Pesan WA (Contoh):</span>
                    <div className="bg-white border border-emerald-100/70 p-3 rounded-xl text-xs text-slate-700 leading-relaxed shadow-3xs whitespace-pre-line min-h-[95px]">
                      {waTemplate
                        .replace(/{nama}/g, 'Bapak Hendra Wijaya')
                        .replace(/{tanggal}/g, 'tanggal 5 tiap bulan')
                        .replace(/{komitmen}/g, 'Rp 1.500.000')}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-450 mt-2">
                    *Saat tombol <strong className="text-slate-600 font-bold">"Hubungi WA"</strong> ditekan, variabel di atas akan langsung disubstitusi secara otomatis sesuai data profil mitra tersebut.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List Section with Filter Options */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              {/* Search & Filter pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400 mr-1">Status Bayar:</span>
                
                <button
                  onClick={() => setScheduleStatusFilter('All')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    scheduleStatusFilter === 'All' 
                      ? 'bg-indigo-650 text-white shadow-sm' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Semua Mitra ({activePartnersForPeriod.length})
                </button>

                <button
                  onClick={() => setScheduleStatusFilter('Unpaid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                    scheduleStatusFilter === 'Unpaid' 
                      ? 'bg-amber-600 text-white shadow-sm font-bold' 
                      : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50/40'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Belum Kasih ({activePartnersForPeriod.filter(p => !isPartnerLunasInPeriod(p)).length})
                </button>

                <button
                  onClick={() => setScheduleStatusFilter('Paid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                    scheduleStatusFilter === 'Paid' 
                      ? 'bg-emerald-600 text-white shadow-sm font-bold' 
                      : 'bg-white text-emerald-750 border border-emerald-200 hover:bg-emerald-50/40'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Sudah Lunas ({activePartnersForPeriod.filter(p => isPartnerLunasInPeriod(p)).length})
                </button>
              </div>

              {/* Filter per tanggal memberi & Search */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex items-center gap-1.5 border border-slate-200 bg-white rounded-xl px-2.5 py-1 text-xs text-slate-700 shadow-3xs hover:bg-slate-50/50">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-semibold text-[11px] text-slate-500">Tgl Memberi:</span>
                  <select
                    value={selectedDonationDay}
                    onChange={(e) => setSelectedDonationDay(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 cursor-pointer focus:outline-none"
                  >
                    <option value="Semua">Semua Tanggal</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(day => (
                      <option key={day} value={day}>Tanggal {day}</option>
                    ))}
                  </select>
                </div>

                {/* Inline Search in Schedules tab */}
                <div className="relative w-full md:w-56">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari mitra dalam jadwal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

            </div>

            {searchedSchedulesPartners.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Jadwal Mitra Ditemukan</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {scheduleStatusFilter === 'Unpaid' 
                    ? "Luar biasa! Seluruh mitra kemitraan telah melunasi dukungan mereka untuk bulan berjalan ini."
                    : "Tidak ada data mitra aktif yang sesuai dengan kriteria filter pencarian Anda di periode ini."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                      <th className="p-4">Kode / Nama Mitra</th>
                      <th className="p-4">Target Komitmen</th>
                      <th className="p-4">Tanggal Rencana</th>
                      <th className="p-4">Realisasi Penerimaan</th>
                      <th className="p-4">Status Bulan Ini</th>
                      <th className="p-4 text-center">Aksi & Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {searchedSchedulesPartners.map((partner) => {
                      const isLunas = isPartnerLunasInPeriod(partner);
                      const paidAmount = getPartnerPaidAmountInPeriod(partner.id);
                      const matchedLogs = getDonationsForPartnerInPeriod(partner.id);
                      const donationDayText = partner.donationDay ? `Setiap tanggal ${partner.donationDay}` : 'Akhir bulan';
                      
                      return (
                        <tr key={partner.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-lg font-bold font-mono text-[11px] ${
                                isLunas ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {partner.id}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block">{partner.name}</span>
                                <span className="text-[10px] text-slate-450">{partner.partnerType} &bull; Relasi: {partner.staffRelasi}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-slate-700">
                            Rp {partner.commitmentAmount.toLocaleString('id-ID')}
                            <span className="text-[10px] text-slate-450 block font-normal">{partner.frequency}</span>
                          </td>
                          <td className="p-4 font-medium text-slate-600">
                            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md text-[10px]">
                              <Calendar className="w-3 h-3 text-indigo-500" /> {donationDayText}
                            </span>
                          </td>
                          <td className="p-4">
                            {paidAmount > 0 ? (
                              <div>
                                <span className="font-bold text-emerald-600 font-mono">Rp {paidAmount.toLocaleString('id-ID')}</span>
                                {matchedLogs.length > 0 && (
                                  <span className="text-[9px] text-slate-400 block font-medium">via {matchedLogs[0].channel}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">Rp 0</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isLunas 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                : 'bg-amber-50 text-amber-700 border border-amber-150'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isLunas ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                              {isLunas ? 'Lunas ✓' : 'Belum Lunas'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Direct WA Remind Button */}
                              <a 
                                href={getWhatsAppLink(partner)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                              >
                                <Phone className="w-3 h-3 fill-white" /> Hubungi WA
                              </a>

                              {/* Prefilled Quick Payment Verification */}
                              {!isLunas && canManageDonations && (
                                <button 
                                  onClick={() => openDonationForPartner(partner)}
                                  className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                  title="Verifikasi Penerimaan Dana Donasi"
                                >
                                  <Heart className="w-3 h-3 fill-white text-white" /> Verifikasi Bayar
                                </button>
                              )}

                              {/* Detail Modal Button */}
                              <button 
                                onClick={() => setDetailPartner(partner)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Detail
                              </button>

                              {/* Single PDF Exporter */}
                              <button 
                                onClick={() => handleDownloadSinglePartnerPDF(partner)}
                                className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="Unduh Laporan Profil & Kartu Kontribusi PDF"
                              >
                                <Download className="w-3 h-3 text-red-600" /> PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW : SCHEDULING & AUTOMATED REMINDERS */}
      {subView === 'scheduling' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Section Header Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl">
                <Clock className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Mesin Pengingat & Notifikasi Kemitraan</h3>
                <p className="text-[11px] text-slate-500">Kirim pengingat tagihan janji dukungan via WhatsApp secara instan dan efisien.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsWATemplateEditing(!isWATemplateEditing)}
                className={`px-3.5 py-2 border rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-3xs cursor-pointer transition-colors ${
                  isWATemplateEditing 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> 
                <span>{isWATemplateEditing ? 'Tutup Template WA' : 'Atur Template WA'}</span>
              </button>
            </div>
          </div>
          
          {/* WA Template Editor Panel if active */}
          {isWATemplateEditing && (
            <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 shadow-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Pengaturan Template WhatsApp Pengingat</h3>
                    <p className="text-[11px] text-slate-500">Konfigurasikan template pesan otomatis untuk menyapa dan mengingatkan mitra.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsWATemplateEditing(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Tutup Pengaturan [X]
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase font-mono tracking-wider">Isi Pesan:</label>
                  <textarea
                    rows={4}
                    value={waTemplate}
                    onChange={(e) => {
                      setWaTemplate(e.target.value);
                      localStorage.setItem('wa_reminder_template', e.target.value);
                    }}
                    className="w-full border border-slate-250 rounded-xl p-3 text-xs bg-white text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Halo {nama}, kami dari..."
                  />
                  
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-650">Masukkan variabel:</span>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {nama}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer text-[10px] shadow-3xs"
                    >
                      &#123;nama&#125;
                    </button>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {tanggal}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer text-[10px] shadow-3xs"
                    >
                      &#123;tanggal&#125;
                    </button>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {komitmen}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer text-[10px] shadow-3xs"
                    >
                      &#123;komitmen&#125;
                    </button>
                    <button
                      onClick={() => {
                        const def = 'Halo {nama}, kami dari tim Kemitraan ingin menyapa dan menginfokan kembali terkait jadwal janji dukungan rutin Anda ({komitmen}) yang direncanakan pada {tanggal}. Terima kasih banyak atas komitmen dan dukungan setia Anda. Tuhan memberkati!';
                        setWaTemplate(def);
                        localStorage.setItem('wa_reminder_template', def);
                      }}
                      className="ml-auto text-emerald-650 font-bold hover:underline cursor-pointer text-[10px]"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>

                <div className="bg-emerald-50/40 rounded-2xl border border-emerald-100 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono tracking-wider block mb-1">Pratinjau Hasil Pesan WA (Contoh):</span>
                    <div className="bg-white border border-emerald-100/70 p-3 rounded-xl text-xs text-slate-700 leading-relaxed shadow-3xs whitespace-pre-line min-h-[95px]">
                      {waTemplate
                        .replace(/{nama}/g, 'Bapak Hendra Wijaya')
                        .replace(/{tanggal}/g, 'tanggal 5 tiap bulan')
                        .replace(/{komitmen}/g, 'Rp 1.500.000')}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-450 mt-2">
                    *Saat tombol <strong className="text-slate-600 font-bold">"Hubungi WA"</strong> ditekan, variabel di atas akan langsung disubstitusi secara otomatis sesuai data profil mitra tersebut.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Core Configuration & Status Deck */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Scheduler Setup Card */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Clock className="w-5 h-5 text-indigo-650" />
                <h3 className="font-bold text-slate-800 text-sm">Konfigurasi Penjadwal</h3>
              </div>

              {/* Toggle Switch */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Status Mesin Pengingat</label>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isAutoSchedulerEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    {isAutoSchedulerEnabled ? 'Aktif (Berjalan Otomatis)' : 'Mati / Non-Aktif'}
                  </span>
                  <button
                    onClick={() => handleToggleScheduler(!isAutoSchedulerEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                      isAutoSchedulerEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isAutoSchedulerEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Trigger Interval Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Kriteria Pemicu (Trigger)</label>
                <select
                  value={schedulerTrigger}
                  onChange={(e) => handleUpdateSchedulerTrigger(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white font-semibold cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="jatuh_tempo">Sesuai tanggal jatuh tempo masing-masing (H-1 & Hari H)</option>
                  <option value="tanggal_5">Setiap tanggal 5 (Reminder Masal Tahap I)</option>
                  <option value="tanggal_15">Setiap tanggal 15 (Reminder Masal Tahap II)</option>
                  <option value="tanggal_25">Setiap tanggal 25 (Reminder Masal Tahap Akhir)</option>
                  <option value="harian">Setiap hari untuk yang menunggak (Sistem Harian)</option>
                </select>
              </div>

              {/* Hour trigger */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-wider">Waktu Eksekusi Harian</label>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={schedulerTime}
                    onChange={(e) => handleUpdateSchedulerTime(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button 
                    onClick={() => alert(`Pengaturan Penjadwal Otomatis berhasil disimpan! Sistem akan mengecek setiap hari pada jam ${schedulerTime} WIB.`)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
                  >
                    Simpan
                  </button>
                </div>
              </div>

              {/* System Note */}
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px] text-slate-650 leading-relaxed">
                <p className="font-semibold text-indigo-700 mb-0.5 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5" /> Cara Kerja Penjadwal:
                </p>
                Ketika sistem berjalan di latar belakang (background) pada waktu yang ditentukan, ia akan menyusun daftar mitra yang berjadwal bayar bulan ini namun belum melunasi dukungannya. Notifikasi pengingat satu-klik disiapkan secara personal untuk Anda eksekusi.
              </div>

            </div>

            {/* Bento statistics panel */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-amber-800 tracking-wider uppercase font-mono font-bold block mb-1">Menunggu Donasi Bulan Ini</span>
                  <h2 className="text-3xl font-extrabold text-amber-800 font-mono">
                    {partners.filter(p => p.status === 'Aktif' && !checkDonation(p.id, currentYearNum, currentMonthNum)).length} <span className="text-xs font-normal font-sans">Mitra</span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Daftar mitra aktif yang belum tercatat melakukan donasi sama sekali pada bulan {new Date().toLocaleString('id-ID', { month: 'long' })} {new Date().getFullYear()}.
                </p>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-emerald-800 tracking-wider uppercase font-mono font-bold block mb-1">Sudah Diingatkan (WhatsApp)</span>
                  <h2 className="text-3xl font-extrabold text-emerald-800 font-mono">
                    {Object.keys(remindedPartners).length} <span className="text-xs font-normal font-sans">Mitra</span>
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Jumlah mitra yang telah dikirimi pesan pengingat langsung via aplikasi bulan ini.
                </p>
              </div>

              <div className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-2xl flex flex-col justify-between shadow-xs sm:col-span-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-indigo-800 tracking-wider uppercase font-mono font-bold block mb-1">Informasi Jatuh Tempo Hari Ini</span>
                    <h2 className="text-2xl font-extrabold text-indigo-900 font-mono">
                      {partners.filter(p => p.status === 'Aktif' && p.donationDay === new Date().getDate() && !checkDonation(p.id, currentYearNum, currentMonthNum)).length} <span className="text-xs font-normal font-sans text-indigo-700">Mitra Belum Bayar</span>
                    </h2>
                  </div>
                  <span className="bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    Tanggal {new Date().getDate()} Hari Ini
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2">
                  Mendahulukan kontak ke mitra yang jatuh tempo hari ini sangat disarankan untuk menjaga kelancaran cashflow yayasan. Hubungi langsung melalui tabel antrean di bawah.
                </p>
              </div>

            </div>

          </div>

          {/* List Section: Queue of Unpaid Partners */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">Antrean Pengingat Mitra (Belum Donasi Bulan Ini)</h4>
                <p className="text-[11px] text-slate-500">Berikut adalah daftar seluruh mitra aktif yang belum menyalurkan komitmen donasinya pada bulan berjalan ({new Date().toLocaleString('id-ID', { month: 'long' })} {new Date().getFullYear()}).</p>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari antrean mitra..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {(() => {
              const unpaidPartners = partners.filter(p => {
                const isActive = p.status === 'Aktif' || p.status === 'Komitmen' || p.status === 'Donasi Pertama';
                if (!isActive) return false;
                
                const hasDonated = checkDonation(p.id, currentYearNum, currentMonthNum);
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase());
                
                return !hasDonated && matchesSearch;
              });

              if (unpaidPartners.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
                    <h4 className="font-bold text-slate-700 text-sm">Hebat! Semua Antrean Bersih</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Seluruh mitra aktif telah melunasi atau menyalurkan komitmen donasi mereka untuk bulan berjalan ini. Tidak ada antrean pengingat yang perlu dikirimkan.
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                        <th className="p-4">Mitra</th>
                        <th className="p-4">Komitmen Bulanan</th>
                        <th className="p-4">Tanggal Rencana</th>
                        <th className="p-4">Status & Keterlambatan</th>
                        <th className="p-4">Terakhir Diingatkan</th>
                        <th className="p-4 text-center">Aksi Pengingat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {unpaidPartners.map((partner) => {
                        const donationDayText = partner.donationDay ? `Setiap tanggal ${partner.donationDay}` : 'Akhir bulan';
                        const todayDay = new Date().getDate();
                        const targetDay = partner.donationDay || 28;
                        
                        let overdueBadge = null;
                        if (todayDay > targetDay) {
                          const days = todayDay - targetDay;
                          overdueBadge = (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-[9px] font-bold">
                              Terlambat {days} Hari
                            </span>
                          );
                        } else if (todayDay === targetDay) {
                          overdueBadge = (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold animate-pulse">
                              Jatuh Tempo Hari Ini
                            </span>
                          );
                        } else {
                          const daysLeft = targetDay - todayDay;
                          overdueBadge = (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-semibold">
                              H-{daysLeft} Jatuh Tempo
                            </span>
                          );
                        }

                        const lastRemindedTime = remindedPartners[partner.id];

                        return (
                          <tr key={partner.id} className="hover:bg-slate-50/30 transition-colors animate-in fade-in">
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-slate-50 border border-slate-100 text-slate-700 font-bold font-mono text-[11px] rounded-lg">
                                  {partner.id}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 block">{partner.name}</span>
                                  <span className="text-[10px] text-slate-450">{partner.phone || 'Tidak ada nomor telepon'} &bull; PIC: {partner.staffRelasi}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-700">Rp {partner.commitmentAmount.toLocaleString('id-ID')}</span>
                              <span className="text-[10px] text-slate-400 block">{partner.frequency}</span>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md text-[10px] text-slate-600 font-medium">
                                <Calendar className="w-3 h-3 text-indigo-500" /> {donationDayText}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-150">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  Belum Bayar
                                </span>
                                {overdueBadge}
                              </div>
                            </td>
                            <td className="p-4 text-slate-500 font-medium">
                              {lastRemindedTime ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {lastRemindedTime}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Belum diingatkan</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <a 
                                  href={getWhatsAppLink(partner)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => handleMarkAsReminded(partner.id)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                                >
                                  <Phone className="w-3.5 h-3.5 fill-white" /> Hubungi WA (Pengingat)
                                </a>
                                {!isPartnerLunasInPeriod(partner) && canManageDonations && (
                                  <button 
                                    onClick={() => openDonationForPartner(partner)}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Heart className="w-3.5 h-3.5" /> Verifikasi Bayar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

          </div>

        </div>
      )}

      {/* VIEW 1: CRM DIRECTORY SPREADSHEET */}
      {subView === 'directory' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Section Header Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 text-indigo-700 border border-slate-150 rounded-xl">
                <Search className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Database Donatur & Mitra Setia</h3>
                <p className="text-[11px] text-slate-500">Manajemen komprehensif profil kemitraan, info kontak, klasifikasi, dan PIC relasi.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={handleDownloadAllPartnersPDF}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-3xs cursor-pointer transition-colors"
                title="Unduh seluruh direktori mitra aktif dalam bentuk tabel PDF"
              >
                <Download className="w-3.5 h-3.5 text-rose-500" /> 
                <span>Export PDF</span>
              </button>
              
              <button 
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-3xs cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" /> 
                <span>Export CSV</span>
              </button>

              {canManagePartners && (
                <button 
                  onClick={openAddForm}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4 shrink-0" /> 
                  <span>Registrasi Mitra</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          
          {isWATemplateEditing && (
            <div className="bg-slate-50 border-b border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-700 shadow-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Format Pesan Pengingat WhatsApp (Template WA)</h3>
                    <p className="text-[11px] text-slate-500">Anda dapat mengubah isi pesan pengingat donasi di bawah ini untuk dikirim via WA.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsWATemplateEditing(false)}
                  className="text-slate-500 hover:text-slate-700 font-bold text-xs cursor-pointer px-3 py-1.5 bg-white rounded-xl border border-slate-200 transition-colors shadow-2xs hover:bg-slate-50"
                >
                  Tutup Pengaturan [X]
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase font-mono tracking-wider">Isi Pesan:</label>
                  <textarea
                    rows={5}
                    value={waTemplate}
                    onChange={(e) => {
                      setWaTemplate(e.target.value);
                      localStorage.setItem('wa_reminder_template', e.target.value);
                    }}
                    className="w-full border border-slate-250 rounded-xl p-3 text-xs bg-white text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Halo {nama}, kami dari..."
                  />
                  
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1">
                    <span className="font-semibold text-slate-600">Klik untuk menyisipkan variabel:</span>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {nama}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-1 bg-white border border-slate-250 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer font-bold shadow-2xs"
                    >
                      &#123;nama&#125;
                    </button>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {tanggal}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-1 bg-white border border-slate-250 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer font-bold shadow-2xs"
                    >
                      &#123;tanggal&#125;
                    </button>
                    <button 
                      onClick={() => {
                        const newTemp = waTemplate + ' {komitmen}';
                        setWaTemplate(newTemp);
                        localStorage.setItem('wa_reminder_template', newTemp);
                      }} 
                      className="px-2 py-1 bg-white border border-slate-250 rounded-lg hover:bg-slate-50 font-mono text-indigo-650 cursor-pointer font-bold shadow-2xs"
                    >
                      &#123;komitmen&#125;
                    </button>
                    <button
                      onClick={() => {
                        const def = 'Halo {nama}, kami dari tim Kemitraan ingin menyapa dan menginfokan kembali terkait jadwal janji dukungan rutin Anda ({komitmen}) yang direncanakan pada {tanggal}. Terima kasih banyak atas komitmen dan dukungan setia Anda. Tuhan memberkati!';
                        setWaTemplate(def);
                        localStorage.setItem('wa_reminder_template', def);
                      }}
                      className="ml-auto text-emerald-650 font-bold hover:underline cursor-pointer"
                    >
                      Reset Default
                    </button>
                  </div>
                </div>

                <div className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono tracking-wider block mb-1">Pratinjau Hasil Pesan (Live Preview):</span>
                    <div className="bg-white border border-emerald-100 p-3 rounded-xl text-xs text-slate-705 leading-relaxed shadow-3xs whitespace-pre-line min-h-[105px]">
                      {waTemplate
                        .replace(/{nama}/g, 'Bapak Hendra Wijaya')
                        .replace(/{tanggal}/g, 'tanggal 5 tiap bulan')
                        .replace(/{komitmen}/g, 'Rp 1.500.000')}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-450 leading-normal">
                    *Saat Anda menekan tombol <strong className="text-slate-600 font-bold">"Remind WA"</strong> pada mitra di tabel bawah, teks di atas akan diisi data aslinya dan langsung membuka aplikasi WhatsApp.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Mitra berdasarkan nama, instansi, staff relasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            
            <select 
              value={selectedDonationDay}
              onChange={(e) => setSelectedDonationDay(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white font-semibold cursor-pointer"
            >
              <option value="Semua">Semua Tanggal Rencana</option>
              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(day => (
                <option key={day} value={day}>Tanggal Rencana: {day}</option>
              ))}
            </select>

            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white"
            >
              <option value="Semua">Semua Klasifikasi Mitra</option>
              {(profile?.partnerTypes || ["Pribadi", "Gereja", "Perusahaan", "Instansi", "Yayasan"]).map((type, idx) => (
                <option key={idx} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                  <th className="p-4">Kode Mitra / Identitas</th>
                  <th className="p-4">Klasifikasi / Wilayah</th>
                  <th className="p-4">Hubungan & Relasi Staff</th>
                  <th className="p-4">Komitmen Bulanan / Kontrak</th>
                  <th className="p-4 font-semibold text-slate-400">Status</th>
                  {canManagePartners && <th className="p-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold font-mono">
                          PT
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-sm">{partner.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 text-medium">{partner.id} &bull; {partner.phone} &bull; {partner.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-700">{partner.partnerType}</div>
                      <span className="text-[10px] text-slate-400">{partner.region}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">Hubungan: {partner.occupation || 'Simpatisan'}</div>
                      <span className="text-[10px] text-slate-400">Staff Relasi: {partner.staffRelasi}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-emerald-600 font-mono">
                        Rp {partner.commitmentAmount.toLocaleString('id-ID')}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Frekuensi: {partner.frequency} {partner.donationDay ? `(Tgl ${partner.donationDay})` : ''}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        partner.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        partner.status === 'Komitmen' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                        'bg-slate-150 text-slate-500'
                      }`}>
                        {partner.status}
                      </span>
                    </td>
                    {canManagePartners && (
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => openEditForm(partner)}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] rounded font-semibold text-slate-650 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmPartner(partner)}
                            className="p-1 text-red-500 hover:bg-slate-50 text-[10px] cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* VIEW 2: KANBAN PIPELINE BOARD */}
      {subView === 'pipeline' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Section Header Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-750 border border-slate-150 rounded-xl">
                <KanbanSquare className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Pipeline Kemitraan & CRM Fundraising</h3>
                <p className="text-[11px] text-slate-500">Memantau progress pendekatan calon donatur baru sejak sosialisasi hingga komitmen pertama.</p>
              </div>
            </div>

            {canManagePartners && (
              <button 
                onClick={openAddForm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus className="w-4 h-4 shrink-0" /> 
                <span>Prospek Baru</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STAGES.map((stage) => {
            const partnersInStage = partners.filter(p => p.status === stage);
            return (
              <div key={stage} className="bg-slate-100/70 rounded-2xl p-3 border border-slate-250/30 flex flex-col h-[500px]">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-[11px] text-slate-700 font-mono uppercase truncate">{stage}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">{partnersInStage.length}</span>
                </div>

                <div className="space-y-2.5 overflow-y-auto flex-1 pb-4">
                  {partnersInStage.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => openEditForm(p)}
                      className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer group hover:border-indigo-300"
                    >
                      <h4 className="font-bold text-xs text-slate-800 line-clamp-1 group-hover:text-indigo-650 transition-colors">{p.name}</h4>
                      <p className="text-[9px] text-slate-400 mt-1">{p.partnerType} &bull; {p.region}</p>
                      
                      <div className="pt-2.5 mt-2.5 border-t border-slate-50 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 text-[9px]">Komitmen:</span>
                        <strong className="text-emerald-600 font-mono">Rp {Math.round(p.commitmentAmount/1000)}k</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
      {subView === 'donations' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Section Header Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Log Penerimaan Jurnal Donasi</h3>
                <p className="text-[11px] text-slate-500">Mencatat, memverifikasi, dan melacak riwayat penyaluran janji komitmen donasi.</p>
              </div>
            </div>

            {canManageDonations && (
              <button 
                onClick={() => setIsDonationFormOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                <Heart className="w-4 h-4 text-white shrink-0" /> 
                <span>Verifikasi Donasi Masuk</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-50">
              <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400">Verifikasi Donasi Masuk Jurnal</h3>
            </div>
          
          <div className="divide-y divide-slate-100 font-sans text-xs">
            {finalDonationLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Heart className="w-5 h-5 fill-emerald-500 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{log.partnerName}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Tanggal terima: {log.date} &bull; Channel: {log.channel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="font-bold font-mono text-base text-slate-800">
                      Rp {log.amount.toLocaleString('id-ID')}
                    </span>
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5 justify-end">
                      <CheckCircle className="w-3.5 h-3.5" /> Jurnal Verified
                    </div>
                  </div>
                  {canManageDonations && (
                    <div className="flex gap-1.5 pl-2 border-l border-slate-100">
                      <button
                        onClick={() => {
                          setEditingDonation(log);
                          setDonationPartnerId(log.partnerId);
                          setDonationAmount(log.amount);
                          setDonationDate(log.date);
                          setDonationChannel(log.channel);
                          setIsDonationFormOpen(true);
                        }}
                        className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-750 text-[10.5px] rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit Log Donasi"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmDonation(log);
                        }}
                        className="p-1 px-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-650 text-[10.5px] rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Hapus Log Donasi"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* MODAL: ADD / EDIT DONATUR MITRA */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden scale-95 transition-transform">
            
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">{editingPartner ? 'Edit Data Mitra Donatur' : 'Registrasi Mitra & Fundraising Baru'}</dt>
                <dd className="text-[11px] text-slate-200">Manajemen perolehan dana dari individu, instansi, gereja, atau CSR perusahaan.</dd>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>

            <form onSubmit={handleSavePartner} className="p-6 space-y-4 text-xs">
              
              <div className="space-y-3">
                <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-50 pb-1">Bagian A: Profil Pendonor</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-500 block mb-1">Nama Mitra / Lembaga :</label>
                    <input 
                      type="text" 
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="Contoh: Bapak Hendra Wijaya"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-850"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">E-mail Aktif :</label>
                    <input 
                      type="email" 
                      value={pEmail}
                      onChange={(e) => setPEmail(e.target.value)}
                      placeholder="hendra_w@gmail.com"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-850"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Tipe / Klasifikasi Mitra :</label>
                    <select 
                      value={pType}
                      onChange={(e) => setPType(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-850"
                    >
                      {(profile?.partnerTypes || ["Pribadi", "Gereja", "Perusahaan", "Instansi", "Yayasan"]).map((type, idx) => (
                        <option key={idx} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Nomor Telepon :</label>
                    <input 
                      type="text" 
                      value={pPhone}
                      onChange={(e) => setPPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-850"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-500 block mb-1">Alamat Korespondensi :</label>
                    <input 
                      type="text" 
                      value={pAddress}
                      onChange={(e) => setPAddress(e.target.value)}
                      placeholder="Jl. Diponegoro No. 8"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-850"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-50">
                <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[9px] border-b border-slate-50 pb-1">Bagian B: Komitmen Donasi & CRM</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-500 block mb-1">Nominal Janji Dukungan :</label>
                    <input 
                      type="number" 
                      value={pAmount}
                      onChange={(e) => setPAmount(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Frekuensi Pembayaran :</label>
                    <select 
                      value={pFreq}
                      onChange={(e) => setPFreq(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="Bulanan">Setiap Bulan (Recurring)</option>
                      <option value="Tahunan">Setiap Tahun (Annually)</option>
                      <option value="Satu Kali">Satu Kali Saja (One-time)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Tanggal Donasi Rutin Bulanan (1-31) :</label>
                    <input 
                      type="number"
                      min={1}
                      max={31}
                      value={pDonationDay}
                      onChange={(e) => setPDonationDay(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-semibold"
                      required={pFreq === 'Bulanan'}
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Tahap Negosiasi Pipeline :</label>
                    <select 
                      value={pStatus}
                      onChange={(e) => setPStatus(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                    >
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1 font-mono tracking-tight text-[11px]">Relasi Teritorial :</label>
                    <select 
                      value={pRegion}
                      onChange={(e) => setPRegion(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                    >
                      {(profile?.regions || ["Yogyakarta", "Solo", "Semarang", "Purwokerto"]).map((r, idx) => (
                        <option key={idx} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Staff Pemelihara Hubungan :</label>
                    <input 
                      type="text" 
                      value={pStaff}
                      onChange={(e) => setPStaff(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Relasi dengan / Kontak Bisnis :</label>
                    <input 
                      type="text" 
                      value={pOccupation}
                      onChange={(e) => setPOccupation(e.target.value)}
                      placeholder="Contoh: Direktur CSR / Pendeta Jemaat"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4 inline mr-1" /> Simpan Janji Dukungan
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: VERIFY RECEIVED DONATION (Heart logo) */}
      {isDonationFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden scale-95 transition-transform">
            
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <span className="text-sm font-bold block">Verifikasi Penerimaan Dana Donasi</span>
                <span className="text-[11px] text-slate-300">Setiap transfer dari mitra harus diverifikasi agar balance dengan cashflow.</span>
              </div>
              <button onClick={() => setIsDonationFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>

            <form onSubmit={handleLogDonation} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="text-slate-500 block mb-1">Pilih Rekening Mitra Pengirim :</label>
                <select 
                  value={donationPartnerId}
                  onChange={(e) => setDonationPartnerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-850"
                  required
                >
                  <option value="">-- PILIH MITRA AKTIF --</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.frequency} &rarr; Rp {p.commitmentAmount.toLocaleString('id-ID')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Nominal yang Ditransfer (IDR) :</label>
                <input 
                  type="number" 
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">Tanggal Terima :</label>
                  <input 
                    type="date"
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Saluran & Rek Tujuan Bank :</label>
                  <select 
                    value={donationChannel}
                    onChange={(e) => setDonationChannel(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                  >
                    {profile?.donationChannels && profile.donationChannels.length > 0 ? (
                      profile.donationChannels.map((chan, idx) => (
                        <option key={idx} value={chan.name}>{chan.name} ({chan.detail})</option>
                      ))
                    ) : (
                      <>
                        <option value="Transfer Bank Mandiri">Mandiri Utama 123-00-x</option>
                        <option value="BCA Yayasan flex">BCA Yayasan 552-x</option>
                        <option value="Transfer BNI">BNI 0928-x</option>
                        <option value="Dana Cash (Fisik)">Tunai / Cash Fisik</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsDonationFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  Verifikasi & Masukkan Jurnal
                </button>
              </div>

            </form>

          </div>
        </div>
      )}


      {/* DETAILED PARTNER PROFILE MODAL */}
      {detailPartner && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-150 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-750 rounded-2xl font-black font-mono text-lg">
                  {detailPartner.id.substring(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{detailPartner.name}</h3>
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-bold text-indigo-700 font-mono">
                      {detailPartner.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {detailPartner.partnerType} &bull; Wilayah {detailPartner.region} &bull; Relasi: {detailPartner.staffRelasi}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailPartner(null)}
                className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Profile Panel */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Informasi Kemitraan</h4>
                    
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Status Keaktifan:</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                          detailPartner.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-150 text-slate-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${detailPartner.status === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {detailPartner.status}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Komitmen Donasi:</span>
                        <span className="font-bold text-indigo-750 text-sm font-mono block">
                          Rp {detailPartner.commitmentAmount.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-slate-500">Direncanakan: {detailPartner.frequency}</span>
                      </div>

                      {detailPartner.donationDay && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-mono">Rencana Bayar Bulanan:</span>
                          <span className="font-semibold text-slate-700 block mt-0.5">
                            Setiap tanggal {detailPartner.donationDay}
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Masa Kontrak Komitmen:</span>
                        <span className="font-medium text-slate-700 block mt-0.5">
                          {detailPartner.startDate ? `${parseDateUTC(detailPartner.startDate).day} ${INDO_MONTHS[parseDateUTC(detailPartner.startDate).month]} ${parseDateUTC(detailPartner.startDate).year}` : 'Tidak ditentukan'}
                          {detailPartner.endDate ? ` s/d ${parseDateUTC(detailPartner.endDate).day} ${INDO_MONTHS[parseDateUTC(detailPartner.endDate).month]} ${parseDateUTC(detailPartner.endDate).year}` : ' (Berkelanjutan)'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Kontak Handphone:</span>
                        <span className="font-semibold text-slate-700 block mt-0.5">{detailPartner.phone || '-'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Email Korespondensi:</span>
                        <span className="font-semibold text-slate-700 block mt-0.5 break-all">{detailPartner.email || '-'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Alamat Kantor / Domisili:</span>
                        <span className="text-slate-650 block mt-0.5 leading-relaxed">{detailPartner.address || 'Tidak terdaftar'}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <a 
                        href={getWhatsAppLink(detailPartner)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Phone className="w-4 h-4 fill-white" /> Hubungi WhatsApp
                      </a>

                      {canManageDonations && (
                        <button 
                          onClick={() => openDonationForPartner(detailPartner)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                        >
                          <Heart className="w-4 h-4 fill-rose-400 text-rose-400" /> Verifikasi Bayar Donasi
                        </button>
                      )}

                      <button 
                        onClick={() => handleDownloadSinglePartnerPDF(detailPartner)}
                        className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Download className="w-4 h-4 text-red-600" /> Unduh Laporan PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Calendar and Transaction List Panel */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Grid 12 Bulan */}
                  <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-5 space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                        Kalender Kontribusi 12 Bulan (Tahun {scheduleYear})
                      </h4>
                      <span className="text-[10px] text-slate-450 font-bold bg-white border border-slate-150 px-2 py-0.5 rounded-md font-mono">
                        Periode Audit {scheduleYear}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {INDO_MONTHS.map((monthName, mIdx) => {
                        // Check if active in this month
                        const pStart = detailPartner.startDate ? parseDateUTC(detailPartner.startDate) : null;
                        const pEnd = detailPartner.endDate ? parseDateUTC(detailPartner.endDate) : null;
                        
                        const checkSecs = new Date(scheduleYear, mIdx, 1).getTime();
                        const startSecs = pStart ? new Date(pStart.year, pStart.month, 1).getTime() : 0;
                        const endSecs = pEnd ? new Date(pEnd.year, pEnd.month, 28).getTime() : Infinity;
                        
                        const isActiveInMonth = checkSecs >= startSecs && checkSecs <= endSecs;
                        
                        // Check donations
                        const donationsInMonth = finalDonationLogs.filter(d => {
                          if (d.partnerId !== detailPartner.id || !d.date) return false;
                          const parsed = parseDateUTC(d.date);
                          return parsed.year === scheduleYear && parsed.month === mIdx;
                        });
                        
                        const totalPaidInMonth = donationsInMonth.reduce((sum, d) => sum + d.amount, 0);
                        const isLunas = totalPaidInMonth >= detailPartner.commitmentAmount;

                        return (
                          <div 
                            key={mIdx} 
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                              !isActiveInMonth 
                                ? 'bg-slate-100 border-slate-200 text-slate-400' 
                                : isLunas 
                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-850 shadow-3xs' 
                                  : totalPaidInMonth > 0
                                    ? 'bg-amber-50/50 border-amber-200 text-amber-850'
                                    : 'bg-white border-slate-150 text-slate-700'
                            }`}
                          >
                            <span className="text-[10px] font-bold block uppercase tracking-wider">{monthName}</span>
                            
                            <div className="mt-2 text-[9px] leading-tight">
                              {!isActiveInMonth ? (
                                <span className="text-slate-400 font-mono font-medium">Belum Aktif</span>
                              ) : isLunas ? (
                                <div>
                                  <span className="font-bold text-emerald-600 block font-mono">Rp {totalPaidInMonth.toLocaleString('id-ID')}</span>
                                  <span className="text-emerald-700 font-bold block mt-0.5">Lunas ✓</span>
                                </div>
                              ) : totalPaidInMonth > 0 ? (
                                <div>
                                  <span className="font-bold text-amber-600 block font-mono">Rp {totalPaidInMonth.toLocaleString('id-ID')}</span>
                                  <span className="text-amber-700 block mt-0.5">Kurang Rp {(detailPartner.commitmentAmount - totalPaidInMonth).toLocaleString('id-ID')}</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-slate-400 block font-mono">Rp 0</span>
                                  <span className="text-rose-600 font-bold block mt-0.5">Belum Realisasi</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Riwayat Mutasi Jurnal Jangka Panjang */}
                  <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                      Riwayat Log Penerimaan Kas Donasi (Jurnal Kas)
                    </h4>
                    
                    {finalDonationLogs.filter(d => d.partnerId === detailPartner.id).length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-150 text-xs">
                        Tidak ada riwayat mutasi penerimaan terdaftar untuk mitra ini.
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-slate-100 rounded-xl">
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-[9px] uppercase font-mono text-slate-400 font-bold border-b border-slate-100">
                                <th className="p-3">Tanggal Jurnal</th>
                                <th className="p-3">Jumlah Kas</th>
                                <th className="p-3">Kanal Transaksi</th>
                                <th className="p-3">Verifikator</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {finalDonationLogs
                                .filter(d => d.partnerId === detailPartner.id)
                                .sort((a, b) => b.date.localeCompare(a.date))
                                .map((log) => {
                                  const logDate = parseDateUTC(log.date);
                                  return (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                      <td className="p-3 font-medium text-slate-650">
                                        {logDate.day} {INDO_MONTHS[logDate.month]} {logDate.year}
                                      </td>
                                      <td className="p-3 font-bold text-emerald-600 font-mono">
                                        Rp {log.amount.toLocaleString('id-ID')}
                                      </td>
                                      <td className="p-3">
                                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-600 font-medium">
                                          {log.channel}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-450 font-medium">
                                        {log.verifiedBy || 'Sistem'}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3">
              <button 
                onClick={() => handleDownloadSinglePartnerPDF(detailPartner)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5 transition-colors"
                title="Unduh laporan profil & histori kontribusi mitra PDF"
              >
                <Download className="w-4 h-4" /> Unduh Laporan PDF
              </button>
              <button
                onClick={() => setDetailPartner(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-colors"
              >
                Tutup Detail
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM MODAL: HAPUS MITRA */}
      {deleteConfirmPartner && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Konfirmasi Hapus Mitra</h3>
            <p className="text-slate-500 text-xs">
              Apakah Anda yakin ingin menghapus data kemitraan/donatur <strong className="text-slate-800">"{deleteConfirmPartner.name}"</strong>? Data transaksi historis yang telah terdaftar tidak akan dihapus otomatis untuk akurasi auditing kas.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPartner(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onDeletePartner(deleteConfirmPartner.id);
                  setDeleteConfirmPartner(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Ya, Hapus Mitra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: HAPUS LOG DONASI */}
      {deleteConfirmDonation && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Konfirmasi Hapus Penerimaan Donasi</h3>
            <p className="text-slate-550 text-xs">
              Apakah Anda yakin ingin menghapus log donasi dari <strong className="text-slate-800">"{deleteConfirmDonation.partnerName}"</strong> senilai <strong className="text-slate-850 font-bold">Rp {deleteConfirmDonation.amount.toLocaleString('id-ID')}</strong> ini?
            </p>
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-amber-800 text-[11px] leading-relaxed">
              <strong>Pemberitahuan Sistem:</strong> Jurnal kas, rujukan fundraising, dan saldo akhir keuangan terkait akan disesuaikan (Soft-delete & Revert) secara terpadu dan aman di database.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDonation(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const donationId = deleteConfirmDonation.id;
                  setDeleteConfirmDonation(null);
                  if (onDeleteDonation) {
                    await onDeleteDonation(donationId);
                  }
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Ya, Hapus Log Donasi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Icon proxy
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
