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
  BookOpen, 
  Calendar, 
  Tag, 
  Upload, 
  X, 
  UserPlus, 
  Check, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  StickyNote,
  Heart,
  Smartphone,
  MapPin,
  Compass,
  Download
} from 'lucide-react';
import { Member, MemberNote, PrayerRequest, FollowUpLog, SmallGroup, InstitutionalProfile } from '../types';
import { exportToCSV } from '../utils/export';

interface MembersTabProps {
  members: Member[];
  onAddMember: (member: Member) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  smallGroups: SmallGroup[];
  notes: MemberNote[];
  onAddNote: (note: MemberNote) => void;
  prayerRequests: PrayerRequest[];
  onAddPrayerRequest: (p: PrayerRequest) => void;
  onUpdatePrayerStatus: (id: string, status: 'Pending' | 'Didoakan' | 'Terjawab') => void;
  followUps: FollowUpLog[];
  onAddFollowUp: (fu: FollowUpLog) => void;
  currentRole: string;
  profile?: InstitutionalProfile;
}

export default function MembersTab({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  smallGroups,
  notes,
  onAddNote,
  prayerRequests,
  onAddPrayerRequest,
  onUpdatePrayerStatus,
  followUps,
  onAddFollowUp,
  currentRole,
  profile,
}: MembersTabProps) {
  const isEditable = ['Super Admin', 'Ketua Yayasan', 'Sekretaris', 'Staff'].includes(currentRole);

  // Navigation within sub-tabs in Members
  const [subTab, setSubTab] = useState<'directory' | 'notes' | 'prayers' | 'followup' | 'import'>('directory');
  
  // States for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterComponent, setFilterComponent] = useState<string>('Semua');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Modal forms states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  
  // Member Form Field States
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('2005-01-01');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [instagram, setInstagram] = useState('');
  const [originalChurch, setOriginalChurch] = useState('');
  const [education, setEducation] = useState('');
  const [occupation, setOccupation] = useState('');
  
  const [component, setComponent] = useState<'Siswa' | 'Mahasiswa' | 'Alumni' | 'Umum'>((profile?.memberComponents?.[0] as any) || 'Mahasiswa');
  const [region, setRegion] = useState(profile?.regions?.[0] || 'Yogyakarta');
  const [smallGroupId, setSmallGroupId] = useState('');
  const [staffAdvisor, setStaffAdvisor] = useState('');
  const [mentor, setMentor] = useState('');
  const [statusKeaktifan, setStatusKeaktifan] = useState<'Aktif' | 'Pasif' | 'Cuti' | 'Pindah'>((profile?.memberKeaktifanStatuses?.[0] as any) || 'Aktif');

  // Sub-tab States: Adding counseling note
  const [noteCategory, setNoteCategory] = useState('Konseling Akademik');
  const [noteContent, setNoteContent] = useState('');
  const [noteMemberId, setNoteMemberId] = useState('');

  // Sub-tab States: Adding prayer
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerContent, setPrayerContent] = useState('');
  const [prayerMemberId, setPrayerMemberId] = useState('');

  // Sub-tab States: Adding follow up
  const [followUpType, setFollowUpType] = useState<'Telepon' | 'Kunjungan' | 'Konseling' | 'Mentoring' | 'Pemuridan'>('Konseling');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpMemberId, setFollowUpMemberId] = useState('');

  // Excel Bulk Import state
  const [importText, setImportText] = useState(
    "Ahmad Budi|Laki-laki|Jakarta|2005-10-09|081223344|ahmad@budi.com|Kamar 3 Gg. Sukasari|Bandung|Jawa Barat|@ahmadbudi|GKI Bandung|S1 Matematika|Mahasiswa|Mahasiswa|Bandung\n" +
    "Siska Amelia|Perempuan|Jogja|2008-04-22|081928374|siska@amelia.com|Sleman Indah|Yogyakarta|DIY|@siska_amelia|HKBP|SMA|Siswa|Siswa|Yogyakarta"
  );
  const [importStatus, setImportStatus] = useState('');

  // Handle open Form
  const openAddForm = () => {
    setEditingMember(null);
    setFullName('');
    setNickName('');
    setGender('Laki-laki');
    setBirthPlace('');
    setBirthDate('2005-01-01');
    setPhone('');
    setEmail('');
    setAddress('');
    setCity('');
    setProvince('');
    setInstagram('');
    setOriginalChurch('');
    setEducation('');
    setOccupation('');
    setComponent((profile?.memberComponents?.[0] as any) || 'Mahasiswa');
    setRegion(profile?.regions?.[0] || 'Yogyakarta');
    setSmallGroupId('');
    setStaffAdvisor('');
    setMentor('');
    setStatusKeaktifan((profile?.memberKeaktifanStatuses?.[0] as any) || 'Aktif');
    setIsFormOpen(true);
  };

  const openEditForm = (member: Member) => {
    setEditingMember(member);
    setFullName(member.fullName);
    setNickName(member.nickName);
    setGender(member.gender);
    setBirthPlace(member.birthPlace);
    setBirthDate(member.birthDate);
    setPhone(member.phone);
    setEmail(member.email);
    setAddress(member.address);
    setCity(member.city);
    setProvince(member.province);
    setInstagram(member.instagram);
    setOriginalChurch(member.originalChurch);
    setEducation(member.education);
    setOccupation(member.occupation);
    setComponent(member.component);
    setRegion(member.region);
    setSmallGroupId(member.smallGroupId || '');
    setStaffAdvisor(member.staffAdvisor);
    setMentor(member.mentor);
    setStatusKeaktifan(member.statusKeaktifan);
    setIsFormOpen(true);
  };

  // Helper to auto generate Member ID
  // Format:
  // ENC-2026-0000X for Siswa (Encounter)
  // EXP-2026-0000X for Mahasiswa (Explore)
  // CON-2026-0000X for Alumni/Connect
  const generateNewId = (comp: 'Siswa' | 'Mahasiswa' | 'Alumni' | 'Umum') => {
    const currentYear = new Date().getFullYear();
    let prefix = 'EXP';
    if (comp === 'Siswa') prefix = 'ENC';
    else if (comp === 'Alumni') prefix = 'CON';
    
    // find count of members with same prefix
    const count = members.filter(m => {
      if (comp === 'Siswa') return m.component === 'Siswa';
      if (comp === 'Alumni') return m.component === 'Alumni';
      return m.component === 'Mahasiswa' || m.component === 'Umum';
    }).length;
    
    const sequenceNum = String(count + 1).padStart(5, '0');
    return `${prefix}-${currentYear}-${sequenceNum}`;
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nickName) {
      alert('Nama lengkap dan Panggilan wajib diisi!');
      return;
    }

    if (editingMember) {
      if (!window.confirm('Apakah Anda yakin ingin menyimpan perubahan data anggota ini?')) {
        return;
      }
      const updated: Member = {
        ...editingMember,
        fullName,
        nickName,
         gender,
        birthPlace,
        birthDate,
        phone,
        email,
        address,
        city,
        province,
        instagram,
        originalChurch,
        education,
        occupation,
        component,
        region,
        smallGroupId: smallGroupId || undefined,
        staffAdvisor,
        mentor,
        statusKeaktifan,
      };
      onUpdateMember(updated);
    } else {
      const newlyCreated: Member = {
        id: generateNewId(component),
        fullName,
        nickName,
        gender,
        birthPlace,
        birthDate,
        phone,
        email,
        address,
        city,
        province,
        instagram,
        originalChurch,
        education,
        occupation,
        component,
        region,
        smallGroupId: smallGroupId || undefined,
        staffAdvisor: staffAdvisor || 'Ahmad Faisal',
        mentor: mentor || 'Christian Sitorus',
        statusKeaktifan,
        joinedDate: new Date().toISOString().split('T')[0]
      };
      onAddMember(newlyCreated);
    }
    setIsFormOpen(false);
  };

  const handleAddNotesForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent || !noteMemberId) {
      alert('Mohon isi catatan dan pilih anggota');
      return;
    }
    const newNote: MemberNote = {
      id: `NOTE-${Date.now()}`,
      memberId: noteMemberId,
      date: new Date().toISOString().split('T')[0],
      category: noteCategory,
      notes: noteContent,
      author: currentRole === 'Staff' ? 'Internal Staff' : `${currentRole}`
    };
    onAddNote(newNote);
    setNoteContent('');
    alert('Catatan pelayanan berhasil dicatat.');
  };

  const handleAddPrayerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerTitle || !prayerContent || !prayerMemberId) {
      alert('Mohon isi seluruh data prayer request');
      return;
    }
    const memberName = members.find(m => m.id === prayerMemberId)?.fullName || 'Anggota Mandiri';
    const newPrayer: PrayerRequest = {
      id: `PRAY-${Date.now()}`,
      memberId: prayerMemberId,
      memberName,
      title: prayerTitle,
      request: prayerContent,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
    onAddPrayerRequest(newPrayer);
    setPrayerTitle('');
    setPrayerContent('');
    alert('Prayer request berhasil diajukan untuk didoakan bersama!');
  };

  const handleAddFollowUpForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpNotes || !followUpMemberId) {
      alert('Mohon isi laporan follow up');
      return;
    }
    const memberName = members.find(m => m.id === followUpMemberId)?.fullName || 'Anggota';
    const newLog: FollowUpLog = {
      id: `FU-${Date.now()}`,
      memberId: followUpMemberId,
      memberName,
      date: new Date().toISOString().split('T')[0],
      type: followUpType,
      notes: followUpNotes,
      staffName: currentRole
    };
    onAddFollowUp(newLog);
    setFollowUpNotes('');
    alert('Laporan follow up berhasil tersimpan.');
  };

  // Parsing pasted excel rows
  const handleBulkImport = () => {
    try {
      const rows = importText.trim().split('\n');
      let loaded = 0;
      rows.forEach(row => {
        const parts = row.split('|');
        if (parts.length >= 10) {
          const comp = parts[13]?.trim() as 'Siswa' | 'Mahasiswa' | 'Alumni' | 'Umum' || 'Mahasiswa';
          const newMemb: Member = {
            id: generateNewId(comp),
            fullName: parts[0]?.trim(),
            nickName: parts[0]?.trim().split(' ')[0],
            gender: (parts[1]?.trim() as 'Laki-laki' | 'Perempuan') || 'Laki-laki',
            birthPlace: parts[2]?.trim(),
            birthDate: parts[3]?.trim() || '2005-01-01',
            phone: parts[4]?.trim() || '',
            email: parts[5]?.trim() || '',
            address: parts[6]?.trim() || '',
            city: parts[7]?.trim() || '',
            province: parts[8]?.trim() || '',
            instagram: parts[9]?.trim() || '',
            originalChurch: parts[10]?.trim() || '',
            education: parts[11]?.trim() || '',
            occupation: parts[12]?.trim() || '',
            component: comp,
            region: parts[14]?.trim() || 'Yogyakarta',
            staffAdvisor: 'Ahmad Faisal',
            mentor: 'Christian Sitorus',
            statusKeaktifan: 'Aktif',
            joinedDate: new Date().toISOString().split('T')[0]
          };
          onAddMember(newMemb);
          loaded++;
        }
      });
      setImportStatus(`Berhasil mengimpor ${loaded} anggota baru secara massal.`);
    } catch (err) {
      setImportStatus('Gagal parsing data. Pastikan format teks dipisahkan dengan garis tegak ( | )');
    }
  };

  // Filter lists based on input query
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.nickName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          member.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesComponent = filterComponent === 'Semua' || member.component === filterComponent;
    return matchesSearch && matchesComponent;
  });

  const handleExportCSV = () => {
    const headers = [
      'ID Anggota',
      'Nama Lengkap',
      'Nama Panggilan',
      'Komponen',
      'Pekerjaan/Pendidikan',
      'No. Telepon',
      'Alamat',
      'Studi/Jurusan',
      'ID Kelompok Kecil',
      'Gereja Asal',
      'Wilayah',
      'Status Keadatan/Kader',
      'Tanggal Lahir'
    ];
    const keys = [
      'id',
      'fullName',
      'nickName',
      'component',
      'occupation',
      'phoneNumber',
      'address',
      'fieldOfStudy',
      'smallGroupId',
      'churchAffiliation',
      'region',
      'kaderStatus',
      'birthDate'
    ];
    exportToCSV(filteredMembers, headers, keys, `data_anggota_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#0c2340]">Manajemen Anggota Yayasan</h2>
          <p className="text-xs text-slate-500 mt-0.5">Database terpusat kaderisasi, pembinaan kelompok kecil, dan monitoring pelayanan anggota.</p>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2">
          {subTab === 'directory' && isEditable && (
            <button 
              onClick={openAddForm}
              className="px-3.5 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Registrasi Anggota
            </button>
          )}
        </div>
      </div>

      {/* Internal Subtabs Selector */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 sm:gap-2">
        <button 
          onClick={() => setSubTab('directory')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${
            subTab === 'directory' 
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Database Anggota
        </button>
        <button 
          onClick={() => setSubTab('notes')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${
            subTab === 'notes' 
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Catatan Pelayanan
        </button>
        <button 
          onClick={() => setSubTab('prayers')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${
            subTab === 'prayers' 
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Permohonan Doa
        </button>
        <button 
          onClick={() => setSubTab('followup')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${
            subTab === 'followup' 
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Log Pendampingan
        </button>
        <button 
          onClick={() => setSubTab('import')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${
            subTab === 'import' 
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Impor Data CSV
        </button>
      </div>

      {/* SUBTAB 1: DIRECTORY SPREADSHEET */}
      {subTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Members Table (Left and center) */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              {/* Filter controls */}
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 bg-slate-50/50">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari berdasarkan nama, ID, kota..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={filterComponent}
                    onChange={(e) => setFilterComponent(e.target.value)}
                    className="border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-700 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    <option value="Semua">Semua Kategori</option>
                    {(profile?.memberComponents || ["Siswa", "Mahasiswa", "Alumni", "Umum"]).map((comp, idx) => (
                      <option key={idx} value={comp}>{comp}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-slate-700 transition-colors shadow-xs"
                    title="Export Data Anggota"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3.5">ID / Nama Anggota</th>
                      <th className="p-3.5">Komponen / Wilayah</th>
                      <th className="p-3.5">Kelompok Kecil (KTB)</th>
                      <th className="p-3.5">Gereja / Profesi</th>
                      <th className="p-3.5">Status</th>
                      {isEditable && <th className="p-3.5 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredMembers.map((member) => (
                      <tr 
                        key={member.id} 
                        onClick={() => setSelectedMember(member)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          selectedMember?.id === member.id ? 'bg-slate-100/70 font-semibold' : ''
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                              {member.nickName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">
                                {member.fullName}
                              </div>
                              <span className="text-xs text-slate-500 font-mono">{member.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-800">{member.component}</div>
                          <span className="text-xs text-slate-500">{member.region}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-800">
                            {smallGroups.find(g => g.id === member.smallGroupId)?.name || 'Belum Tergabung'}
                          </div>
                          <span className="text-xs text-slate-500">Mentor: {member.mentor || '-'}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-800 max-w-xs truncate">{member.originalChurch || '-'}</div>
                          <span className="text-xs text-slate-500">{member.occupation || '-'}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            member.statusKeaktifan === 'Aktif' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            member.statusKeaktifan === 'Pasif' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {member.statusKeaktifan}
                          </span>
                        </td>
                        {isEditable && (
                          <td className="p-3.5 text-center cursor-auto">
                            <div className="flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => openEditForm(member)}
                                className="p-1 px-2 bg-white hover:bg-slate-50 rounded border border-slate-300 transition-colors text-slate-700 font-medium text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3 h-3 text-slate-600" /> Edit
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm('Apakah Anda yakin ingin menghapus data anggota ini?')) {
                                    onDeleteMember(member.id);
                                  }
                                }}
                                className="p-1 px-2 text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded transition-colors text-xs cursor-pointer"
                              >
                                <Trash className="w-3 h-3" />
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

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-600">
              <span>Menampilkan {filteredMembers.length} dari {members.length} Anggota</span>
              <span className="text-xs text-slate-500">Database Terenkripsi</span>
            </div>
          </div>

          {/* Member Detail Sidebar Drawer (Right panel) */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            {selectedMember ? (
              <div className="space-y-5">
                
                {/* Header info card */}
                <div className="text-center pb-4 border-b border-slate-200">
                  <div className="w-14 h-14 bg-[#0c2340] text-white font-bold text-lg uppercase rounded mx-auto flex items-center justify-center shadow-xs">
                    {selectedMember.nickName.slice(0, 2)}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2.5">{selectedMember.fullName}</h3>
                  <span className="text-xs font-mono text-slate-500">{selectedMember.id}</span>
                  <div className="mt-2 flex justify-center gap-2">
                    <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-xs font-semibold">
                      {selectedMember.component}
                    </span>
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-xs font-medium">
                      {selectedMember.statusKeaktifan}
                    </span>
                  </div>
                </div>

                {/* Sub-details lists */}
                <div className="space-y-4 text-xs">
                  <h4 className="text-xs font-bold text-[#0c2340] uppercase tracking-wider">Biodata Pribadi</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Kontak / HP:</span>
                      <span className="text-slate-900 font-medium">{selectedMember.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Email:</span>
                      <span className="text-slate-900 font-medium truncate block">{selectedMember.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Tempat/Tgl Lahir:</span>
                      <span className="text-slate-900 font-medium">{selectedMember.birthPlace || '-'}, {selectedMember.birthDate || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Pendidikan:</span>
                      <span className="text-slate-900 font-medium line-clamp-1">{selectedMember.education || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[11px]">Alamat & Media Sosial:</span>
                      <span className="text-slate-900 font-medium block">{selectedMember.address || '-'}, {selectedMember.city || '-'} ({selectedMember.instagram || '-'})</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-[#0c2340] uppercase tracking-wider pt-3 border-t border-slate-200">Struktur Pelayanan</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Wilayah Pelayanan:</span>
                      <span className="text-slate-900 font-semibold">{selectedMember.region}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Kelompok Kecil:</span>
                      <span className="text-[#0c2340] font-semibold">
                        {smallGroups.find(g => g.id === selectedMember.smallGroupId)?.name || 'Belum Tergabung'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Staff Pembimbing:</span>
                      <span className="text-slate-900 font-medium">{selectedMember.staffAdvisor || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Mentor:</span>
                      <span className="text-slate-900 font-medium">{selectedMember.mentor || '-'}</span>
                    </div>
                  </div>

                  {/* Add Service Note Trigger */}
                  <div className="pt-3 flex gap-2">
                    <button 
                      onClick={() => {
                        setNoteMemberId(selectedMember.id);
                        setSubTab('notes');
                      }}
                      className="flex-1 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-slate-500" /> Catat Layanan
                    </button>
                    <button 
                      onClick={() => {
                        setPrayerMemberId(selectedMember.id);
                        setSubTab('prayers');
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 text-slate-600" /> Permohonan Doa
                    </button>
                  </div>

                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
                <Compass className="w-10 h-10 text-slate-300 mb-3" />
                <h4 className="text-sm font-semibold text-slate-700">Pilih Data Anggota</h4>
                <p className="text-xs px-4 mt-1 text-slate-500 leading-relaxed">Klik salah satu baris di tabel untuk melihat profil lengkap, riwayat pelayanan, dan tindakan cepat.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB 2: CATATAN PELAYANAN (COUNSELING TIMELINE) */}
      {subTab === 'notes' && (
        <div className={isEditable ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6"}>
          
          {/* Timeline of notes */}
          <div className={isEditable ? "lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4" : "w-full bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4"}>
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Catatan Pelayanan & Konseling</h3>
              <p className="text-xs text-slate-500 mt-0.5">Riwayat perkembangan rohani, pendampingan, dan bimbingan anggota</p>
            </div>
            
            <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-5 max-h-160 overflow-y-auto pt-2">
              {notes.map((note) => {
                const memberObj = members.find(m => m.id === note.memberId);
                return (
                  <div key={note.id} className="relative">
                    {/* Circle marker on timeline */}
                    <span className="absolute -left-10 top-0.5 bg-slate-100 border border-slate-300 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center">
                      <StickyNote className="w-4 h-4" />
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {note.category}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{note.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {memberObj ? `${memberObj.fullName} (${memberObj.id})` : 'Kader Organisasi'}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                        "{note.notes}"
                      </p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>Pencatat:</span>
                        <span className="text-slate-800 font-medium">{note.author}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form to add note */}
          {isEditable && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3.5 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
              <Plus className="w-4 h-4 text-slate-600" /> Catat Riwayat Layanan Baru
            </h3>
            <form onSubmit={handleAddNotesForm} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Anggota Pelayanan:</label>
                <select 
                  value={noteMemberId} 
                  onChange={(e) => setNoteMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Anggota --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Kategori Pelayanan:</label>
                <select 
                  value={noteCategory} 
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                >
                  <option value="Konseling Akademik">Konseling Akademik</option>
                  <option value="Follow Up Retret">Follow Up Retret</option>
                  <option value="Bimbingan Karir">Bimbingan Karir</option>
                  <option value="Konseling Pribadi">Konseling Pribadi</option>
                  <option value="Pengutusan Kepemimpinan">Pengutusan Kepemimpinan</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Detail Catatan / Perkembangan:</label>
                <textarea 
                  rows={4}
                  placeholder="Tuliskan ringkasan bimbingan, kondisi pelayanan, atau tantangan yang dihadapi anggota..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none leading-relaxed"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Simpan Catatan Pelayanan
              </button>
            </form>
          </div>
          )}

        </div>
      )}

      {/* SUBTAB 3: PRAYER REQUESTS BOARD */}
      {subTab === 'prayers' && (
        <div className={isEditable ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6"}>
          
          {/* Prayer directory list */}
          <div className={isEditable ? "lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4" : "w-full bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4"}>
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Pokok Permohonan Doa</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daftar permohonan doa bersama kelompok kecil dan staf pelayanan</p>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
              {prayerRequests.map((p) => (
                <div key={p.id} className="py-3.5 hover:bg-slate-50/70 px-2 rounded transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{p.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Pemohon: <span className="text-slate-800 font-semibold">{p.memberName}</span> &bull; {p.date}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'Terjawab' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      p.status === 'Didoakan' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 italic leading-relaxed py-2 pl-3 border-l-2 border-slate-300 mt-2 bg-slate-50/50 rounded-r">
                    "{p.request}"
                  </p>
                  
                  {/* Action states toggle */}
                  {isEditable && (
                    <div className="flex gap-2 mt-2.5 justify-end">
                      <span className="text-xs text-slate-500 self-center">Status Doa:</span>
                      <button 
                        onClick={() => onUpdatePrayerStatus(p.id, 'Didoakan')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium cursor-pointer transition-colors"
                      >
                        Sedang Didoakan
                      </button>
                      <button 
                        onClick={() => onUpdatePrayerStatus(p.id, 'Terjawab')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-xs font-medium cursor-pointer transition-colors"
                      >
                        Puji Tuhan, Terjawab!
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form to add prayer */}
          {isEditable && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3.5 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
              <Plus className="w-4 h-4 text-slate-600" /> Ajukan Pokok Doa Baru
            </h3>
            <form onSubmit={handleAddPrayerForm} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Nama Anggota Pemohon:</label>
                <select 
                  value={prayerMemberId} 
                  onChange={(e) => setPrayerMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Pemohon --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Judul / Topik Doa:</label>
                <input 
                  type="text"
                  placeholder="Contoh: Ujian Skripsi, Pemulihan Kesehatan..."
                  value={prayerTitle}
                  onChange={(e) => setPrayerTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Detail Pokok Doa:</label>
                <textarea 
                  rows={4}
                  placeholder="Tuliskan pokok permohonan doa secara jelas..."
                  value={prayerContent}
                  onChange={(e) => setPrayerContent(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none leading-relaxed"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Kirimkan Pokok Doa
              </button>
            </form>
          </div>
          )}

        </div>
      )}

      {/* SUBTAB 4: FOLLOW UP WORKSPACE */}
      {subTab === 'followup' && (
        <div className={isEditable ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6"}>
          
          {/* List of past follow ups */}
          <div className={isEditable ? "lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4" : "w-full bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4"}>
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Riwayat Pendampingan (Follow-Up)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Catatan interaksi personal dan tindak lanjut mentoring</p>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
              {followUps.map((fu) => (
                <div key={fu.id} className="py-3.5 hover:bg-slate-50/70 px-2 rounded transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{fu.memberName}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 py-0.5 px-2 rounded border border-slate-200 font-semibold">{fu.type}</span>
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block">Tanggal Pendampingan: {fu.date}</span>
                    </div>
                    <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Pendamping: {fu.staffName}</span>
                  </div>
                  <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                    "{fu.notes}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Form to submit a follow up report */}
          {isEditable && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3.5 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
              <Plus className="w-4 h-4 text-slate-600" /> Catat Laporan Pendampingan
            </h3>
            <form onSubmit={handleAddFollowUpForm} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Anggota yang Didampingi:</label>
                <select 
                  value={followUpMemberId} 
                  onChange={(e) => setFollowUpMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Anggota --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Metode Interaksi:</label>
                <select 
                  value={followUpType} 
                  onChange={(e) => setFollowUpType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                >
                  <option value="Telepon">Telepon / WhatsApp Call</option>
                  <option value="Kunjungan">Kunjungan Langsung</option>
                  <option value="Konseling">Konseling Tatap Muka</option>
                  <option value="Mentoring">Mentoring Modul</option>
                  <option value="Pemuridan">Pemuridan Intensif</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Hasil Pertemuan / Tindak Lanjut:</label>
                <textarea 
                  rows={4}
                  placeholder="Tuliskan poin pembicaraan, kebutuhan anggota, dan rencana langkah selanjutnya..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none leading-relaxed"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Simpan Pendampingan
              </button>
            </form>
          </div>
          )}

        </div>
      )}

      {/* SUBTAB 5: MOCK CSV/EXCEL BULK IMPORTER */}
      {subTab === 'import' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800">Impor Massal Data Anggota (CSV / Spreadsheet)</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Gunakan pemisah pipa (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">|</code>) untuk menyalin-tempel data multi-kolom langsung ke dalam sistem.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase block">Urutan Kolom:</span>
            <div className="bg-slate-900 text-slate-200 font-mono text-[11px] p-3 rounded border border-slate-800 overflow-x-auto whitespace-nowrap leading-relaxed">
              Nama_Lengkap | Jenis_Kelamin | Tempat_Lahir | Tanggal_Lahir | No_HP | Email | Alamat | Kota | Provinsi | Instagram | Gereja_Asal | Pendidikan | Pekerjaan | Komponen_MMB (Siswa/Mahasiswa/Alumni) | Wilayah
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Data Teks Spreadsheet:</label>
              <textarea 
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full font-mono text-xs p-3 border border-slate-300 rounded leading-relaxed focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              />
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            <button 
              onClick={handleBulkImport}
              className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Proses Impor Data
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DIALOG FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">{editingMember ? 'Ubah Data Profil Anggota' : 'Registrasi Anggota Baru'}</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Lengkapi data identitas dan penugasan pelayanan Yayasan MMB.</dd>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={handleSaveMember} className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              
              <div className="space-y-3.5">
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-tight text-xs">Bagian A: Identitas Anggota</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="text-slate-700 font-semibold block mb-1">Nama Lengkap :</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Yusuf Raja Tamba"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Nama Panggilan :</label>
                    <input 
                      type="text" 
                      value={nickName}
                      onChange={(e) => setNickName(e.target.value)}
                      placeholder="Yusuf"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Jenis Kelamin :</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Tempat Lahir :</label>
                    <input 
                      type="text" 
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      placeholder="Medan"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Tanggal Lahir :</label>
                    <input 
                      type="date" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">No. HP (WhatsApp) :</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812xxxxxx"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">E-mail Aktif :</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yusuf@gmail.com"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Akun Instagram :</label>
                    <input 
                      type="text" 
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@username"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-slate-700 font-semibold block mb-1">Alamat Domisili Tetap :</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Jl. Perintis Kemerdekaan No. 10"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Kota :</label>
                    <input 
                      type="text" 
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Sleman"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Provinsi :</label>
                    <input 
                      type="text" 
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="DIY"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Gereja Asal / Denominasi :</label>
                    <input 
                      type="text" 
                      value={originalChurch}
                      onChange={(e) => setOriginalChurch(e.target.value)}
                      placeholder="HKBP / GKI / GBI..."
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-700 font-semibold block mb-1">Pendidikan (Sekolah / Kampus) :</label>
                    <input 
                      type="text" 
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="S1 Teknik Informatika - UGM"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Pekerjaan :</label>
                    <input 
                      type="text" 
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="Mahasiswa"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 pt-3.5 border-t border-slate-200">
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-tight text-xs">Bagian B: Penugasan Pelayanan Yayasan</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Komponen Kategori :</label>
                    <select 
                      value={component}
                      onChange={(e) => setComponent(e.target.value as any)}
                      className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    >
                      {(profile?.memberComponents || ["Siswa", "Mahasiswa", "Alumni", "Umum"]).map((comp, idx) => (
                        <option key={idx} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Wilayah Pelayanan :</label>
                    <select 
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    >
                      {(profile?.regions || ["Yogyakarta", "Solo", "Semarang", "Purwokerto"]).map((r, idx) => (
                        <option key={idx} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Kelompok Kecil (KTB) :</label>
                    <select 
                      value={smallGroupId}
                      onChange={(e) => setSmallGroupId(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    >
                      <option value="">-- Belum Tergabung --</option>
                      {smallGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Staff Pendamping :</label>
                    <input 
                      type="text" 
                      value={staffAdvisor}
                      onChange={(e) => setStaffAdvisor(e.target.value)}
                      placeholder="Ahmad Faisal"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Mentor Pemuridan :</label>
                    <input 
                      type="text" 
                      value={mentor}
                      onChange={(e) => setMentor(e.target.value)}
                      placeholder="Christian Sitorus"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Status Keaktifan :</label>
                    <select 
                      value={statusKeaktifan}
                      onChange={(e) => setStatusKeaktifan(e.target.value as any)}
                      className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    >
                      {(profile?.memberKeaktifanStatuses || ["Aktif", "Pasif", "Cuti", "Pindah"]).map((stat, idx) => (
                        <option key={idx} value={stat}>{stat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action operations buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded text-slate-700 font-medium cursor-pointer transition-colors text-xs"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" /> Simpan Data Anggota
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponent visual Icon wrapper for quick identification
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
      width="16"
      height="16"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  );
}
