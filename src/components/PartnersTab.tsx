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
  Tag, 
  CheckCircle, 
  User, 
  Award,
  KanbanSquare,
  Download
} from 'lucide-react';
import { Partner, CampaignDonation } from '../types';
import { exportToCSV } from '../utils/export';

interface PartnersTabProps {
  partners: Partner[];
  onAddPartner: (p: Partner) => void;
  onUpdatePartner: (p: Partner) => void;
  onDeletePartner: (id: string) => void;
  currentRole: string;
  donations: CampaignDonation[];
  onAddDonation: (d: CampaignDonation) => Promise<void>;
}

export default function PartnersTab({
  partners,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  currentRole,
  donations,
  onAddDonation,
}: PartnersTabProps) {
  const [subView, setSubView] = useState<'directory' | 'pipeline' | 'donations'>('directory');
  
  // Search metrics
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('Semua');

  // Partner Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pBirthDate, setPBirthDate] = useState('');
  const [pOccupation, setPOccupation] = useState('');
  const [pType, setPType] = useState<'Pribadi' | 'Gereja' | 'Perusahaan' | 'Instansi' | 'Yayasan'>('Pribadi');
  const [pRegion, setPRegion] = useState('Yogyakarta');
  const [pStaff, setPStaff] = useState('Ahmad Faisal');
  const [pStatus, setPStatus] = useState<any>('Prospek');
  
  // Commitment
  const [pAmount, setPAmount] = useState<number>(500000);
  const [pFreq, setPFreq] = useState<'Bulanan' | 'Tahunan' | 'Satu Kali'>('Bulanan');
  const [pStartDate, setPStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pEndDate, setPEndDate] = useState('2027-12-31');

  // Simulated Donation Logging State
  const [isDonationFormOpen, setIsDonationFormOpen] = useState(false);
  const [donationPartnerId, setDonationPartnerId] = useState('');
  const [donationAmount, setDonationAmount] = useState<number>(500000);
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [donationChannel, setDonationChannel] = useState('Transfer Bank Mandiri');
  const [donationLogs, setDonationLogs] = useState<CampaignDonation[]>([
    { id: 'DON-01', partnerId: 'PTR-01', partnerName: 'Bapak Hendra Wijaya', amount: 1500000, date: '2026-06-01', channel: 'Transfer Bank Mandiri' },
    { id: 'DON-02', partnerId: 'PTR-02', partnerName: 'GKI Manyar Surabaya', amount: 12000000, date: '2026-05-10', channel: 'BCA Yayasan' }
  ]);

  const finalDonationLogs = donations && donations.length > 0 ? donations : donationLogs;

  const openAddForm = () => {
    setEditingPartner(null);
    setPName('');
    setPPhone('');
    setPEmail('');
    setPAddress('');
    setPBirthDate('');
    setPOccupation('');
    setPType('Pribadi');
    setPRegion('Yogyakarta');
    setPStaff('Ahmad Faisal');
    setPStatus('Prospek');
    setPAmount(500000);
    setPFreq('Bulanan');
    setPStartDate(new Date().toISOString().split('T')[0]);
    setPEndDate('2027-12-31');
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
    setIsFormOpen(true);
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || pAmount <= 0) {
      alert('Nama Mitra dan nominal komitmen wajib diisi!');
      return;
    }

    if (editingPartner) {
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
        endDate: pEndDate || undefined
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
        endDate: pEndDate || undefined
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

    const newDonation: CampaignDonation = {
      id: `DON-${Date.now()}`,
      partnerId: donationPartnerId,
      partnerName: partnerObj.name,
      amount: Number(donationAmount),
      date: donationDate,
      channel: donationChannel
    };

    try {
      await onAddDonation(newDonation);
      setIsDonationFormOpen(false);
      alert(`Donasi sebesar Rp ${Number(donationAmount).toLocaleString('id-ID')} dari ${partnerObj.name} berhasil diverifikasi sistem!`);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mendaftarkan donasi.');
    }
  };

  // Pipeline stages Kanban definition
  const STAGES: any[] = ['Prospek', 'Kontak Awal', 'Presentasi', 'Komitmen', 'Donasi Pertama', 'Aktif'];

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'Semua' || p.partnerType === filterType;
    return matchesSearch && matchesType;
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

  return (
    <div className="space-y-6">
      
      {/* Metrics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Mitra Setia Aktif</span>
          <h2 className="text-xl font-bold text-indigo-600 mt-1">{partners.filter(p => p.status === 'Aktif').length} Mitra</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Tahap Pendekatan CRM</span>
          <h2 className="text-xl font-bold text-slate-800 mt-1">{partners.filter(p => p.status !== 'Aktif').length} Prospek</h2>
        </div>
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
      </div>

      {/* View switching bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setSubView('directory')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subView === 'directory' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Database Donatur & Mitra
          </button>
          <button 
            onClick={() => setSubView('pipeline')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 transition-all ${
              subView === 'pipeline' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <KanbanSquare className="w-3.5 h-3.5 text-indigo-500" /> Pipeline Fundraising CRM
          </button>
          <button 
            onClick={() => setSubView('donations')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subView === 'donations' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Log Penerimaan Donasi
          </button>
        </div>

        <div className="flex gap-2">
          {subView === 'directory' && (
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Export CSV
            </button>
          )}
          <button 
            onClick={openAddForm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Mitra Baru
          </button>
          {subView === 'donations' && (
            <button 
              onClick={() => setIsDonationFormOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Heart className="w-4 h-4 text-rose-500" /> Verifikasi Donasi Masuk
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: CRM DIRECTORY SPREADSHEET */}
      {subView === 'directory' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          
          <div className="p-4 border-b border-slate-50 flex gap-4">
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white"
            >
              <option value="Semua">Semua Klasifikasi Mitra</option>
              <option value="Pribadi">Sponsor Pribadi</option>
              <option value="Gereja">Lembaga Gereja</option>
              <option value="Perusahaan">CSR Perusahaan</option>
              <option value="Yayasan">Mitra Yayasan / CSO</option>
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
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi</th>
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
                      <span className="text-[10px] text-slate-400 font-medium">Frekuensi: {partner.frequency}</span>
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
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => openEditForm(partner)}
                          className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] rounded font-semibold text-slate-650 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => onDeletePartner(partner.id)}
                          className="p-1 text-red-500 hover:bg-slate-50 text-[10px] cursor-pointer"
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
        </div>
      )}

      {/* VIEW 2: KANBAN PIPELINE BOARD */}
      {subView === 'pipeline' && (
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
      )}

      {/* VIEW 3: DONATION LOG MODULE */}
      {subView === 'donations' && (
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
                <div className="text-right">
                  <span className="font-bold font-mono text-base text-slate-800">
                    Rp {log.amount.toLocaleString('id-ID')}
                  </span>
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5 justify-end">
                    <CheckCircle className="w-3.5 h-3.5" /> Jurnal Verified
                  </div>
                </div>
              </div>
            ))}
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
                      <option value="Pribadi">Pribadi / Perorangan</option>
                      <option value="Gereja">Donatur Lembaga Gereja</option>
                      <option value="Perusahaan">CSR Perusahaan / Corporate</option>
                      <option value="Instansi">Instansi Pemerintah</option>
                      <option value="Yayasan">Mitra Yayasan / NGO</option>
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
                      <option value="Yogyakarta">Yogyakarta</option>
                      <option value="Surabaya">Surabaya</option>
                      <option value="Jakarta">Jakarta</option>
                      <option value="Bandung">Bandung</option>
                      <option value="Medan">Medan</option>
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
                    <option value="Transfer Bank Mandiri">Mandiri Utama 123-00-x</option>
                    <option value="BCA Yayasan">BCA Yayasan 552-x</option>
                    <option value="Transfer BNI">BNI 0928-x</option>
                    <option value="Dana Cash (Fisik)">Tunai / Cash Fisik</option>
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
