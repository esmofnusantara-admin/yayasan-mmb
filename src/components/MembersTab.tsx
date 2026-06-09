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
import { Member, MemberNote, PrayerRequest, FollowUpLog, SmallGroup } from '../types';
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
}: MembersTabProps) {
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
  
  const [component, setComponent] = useState<'Siswa' | 'Mahasiswa' | 'Alumni' | 'Umum'>('Mahasiswa');
  const [region, setRegion] = useState('Yogyakarta');
  const [smallGroupId, setSmallGroupId] = useState('');
  const [staffAdvisor, setStaffAdvisor] = useState('');
  const [mentor, setMentor] = useState('');
  const [statusKeaktifan, setStatusKeaktifan] = useState<'Aktif' | 'Pasif' | 'Cuti' | 'Pindah'>('Aktif');

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
    setComponent('Mahasiswa');
    setRegion('Yogyakarta');
    setSmallGroupId('');
    setStaffAdvisor('');
    setMentor('');
    setStatusKeaktifan('Aktif');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Anggota ESM</h2>
          <p className="text-xs text-slate-500">Administrasi database kaderisasi, pembinaan kelompok kecil, & monitoring rohani siswa - alumni.</p>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2">
          {subTab === 'directory' && (
            <button 
              onClick={openAddForm}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-900/10"
            >
              <UserPlus className="w-4 h-4" /> Tambah Anggota
            </button>
          )}
        </div>
      </div>

      {/* Internal Subtabs Selector */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl max-w-2xl">
        <button 
          onClick={() => setSubTab('directory')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
            subTab === 'directory' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Directory Database
        </button>
        <button 
          onClick={() => setSubTab('notes')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
            subTab === 'notes' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Catatan Pelayanan
        </button>
        <button 
          onClick={() => setSubTab('prayers')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
            subTab === 'prayers' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Prayer Request
        </button>
        <button 
          onClick={() => setSubTab('followup')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
            subTab === 'followup' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Follow Up Log
        </button>
        <button 
          onClick={() => setSubTab('import')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer ${
            subTab === 'import' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Import Excel / CSV
        </button>
      </div>

      {/* SUBTAB 1: DIRECTORY SPREADSHEET */}
      {subTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Members Table (Left and center) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              {/* Filter controls */}
              <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari anggota berdasarkan nama, NIK, kota..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={filterComponent}
                    onChange={(e) => setFilterComponent(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Semua">Semua Tingkat (Kader)</option>
                    <option value="Siswa">Siswa (Encounter)</option>
                    <option value="Mahasiswa">Mahasiswa (Explore)</option>
                    <option value="Alumni">Alumni (Connect)</option>
                  </select>
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer text-slate-600 hover:text-slate-800 transition-colors"
                    title="Export Data Anggota"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                      <th className="p-4">ID Anggota / Nama</th>
                      <th className="p-4">Komponen / Wilayah</th>
                      <th className="p-4">Kelompok Kecil</th>
                      <th className="p-4">Gereja / Pekerjaan</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredMembers.map((member) => (
                      <tr 
                        key={member.id} 
                        onClick={() => setSelectedMember(member)}
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          selectedMember?.id === member.id ? 'bg-indigo-50/20 text-indigo-900 font-medium' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 uppercase">
                              {member.nickName.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-1">
                                {member.fullName}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 font-bold tracking-widest">{member.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700">{member.component}</div>
                          <span className="text-[10px] text-slate-400">{member.region}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700">
                            {smallGroups.find(g => g.id === member.smallGroupId)?.name || 'Belum Tergabung'}
                          </div>
                          <span className="text-[10px] text-slate-400">Mentor: {member.mentor}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-600 max-w-xs truncate">{member.originalChurch}</div>
                          <span className="text-[10px] text-slate-400">{member.occupation}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            member.statusKeaktifan === 'Aktif' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            member.statusKeaktifan === 'Pasif' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {member.statusKeaktifan}
                          </span>
                        </td>
                        <td className="p-4 text-center cursor-auto">
                          <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => openEditForm(member)}
                              className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-all text-slate-600 hover:text-slate-800 font-semibold text-[10px] flex items-center gap-0.5 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                            <button 
                              onClick={() => onDeleteMember(member.id)}
                              className="p-1 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded transition-all text-[10px] cursor-pointer"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
              <span>Menampilkan {filteredMembers.length} dari {members.length} Anggota</span>
              <span className="font-mono text-[10px]">Database Synced</span>
            </div>
          </div>

          {/* Member Detail Sidebar Drawer (Right panel) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            {selectedMember ? (
              <div className="space-y-6">
                
                {/* Header info card */}
                <div className="text-center pb-5 border-b border-slate-50">
                  <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold text-xl uppercase rounded-2xl mx-auto flex items-center justify-center shadow-md">
                    {selectedMember.nickName.slice(0, 2)}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mt-3">{selectedMember.fullName}</h3>
                  <span className="text-xs font-mono text-slate-400 font-bold">{selectedMember.id}</span>
                  <div className="mt-2.5 flex justify-center gap-2">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      {selectedMember.component}
                    </span>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium">
                      {selectedMember.statusKeaktifan}
                    </span>
                  </div>
                </div>

                {/* Sub-details lists */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Biodata Pribadi</h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kontak :</span>
                      <span className="text-slate-800 font-medium">{selectedMember.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Email :</span>
                      <span className="text-slate-800 font-medium truncate block">{selectedMember.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tempat/Tgl Lahir :</span>
                      <span className="text-slate-800 font-medium">{selectedMember.birthPlace}, {selectedMember.birthDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tempat Belajar :</span>
                      <span className="text-slate-800 font-medium line-clamp-1">{selectedMember.education}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Alamat & Instagram :</span>
                      <span className="text-slate-800 font-medium text-[11px] block">{selectedMember.address}, {selectedMember.city} ({selectedMember.instagram})</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono pt-3 border-t border-slate-50">Struktur Pelayanan</h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Wilayah Pelayanan :</span>
                      <span className="text-slate-800 font-semibold">{selectedMember.region}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kelompok Kecil :</span>
                      <span className="text-indigo-600 font-semibold">
                        {smallGroups.find(g => g.id === selectedMember.smallGroupId)?.name || 'Belum Tergabung'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Staff Pembimbing :</span>
                      <span className="text-slate-800 font-medium">{selectedMember.staffAdvisor}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Mentor :</span>
                      <span className="text-slate-800 font-medium">{selectedMember.mentor}</span>
                    </div>
                  </div>

                  {/* Add Service Note Trigger */}
                  <div className="pt-4 flex gap-2">
                    <button 
                      onClick={() => {
                        setNoteMemberId(selectedMember.id);
                        setSubTab('notes');
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-slate-500" /> Catat Layanan
                    </button>
                    <button 
                      onClick={() => {
                        setPrayerMemberId(selectedMember.id);
                        setSubTab('prayers');
                      }}
                      className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5" /> Prayer Request
                    </button>
                  </div>

                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
                <Compass className="w-10 h-10 text-slate-300 animate-bounce mb-3" />
                <h4 className="text-sm font-semibold text-slate-600">Pilih Anggota</h4>
                <p className="text-xs px-4 mt-1 leading-relaxed">Klik salah satu baris baris di daftar sebelah kiri untuk memunculkan riwayat, detail pelayanan, biodata, dan aksi cepat.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB 2: CATATAN PELAYANAN (COUNSELING TIMELINE) */}
      {subTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Timeline of notes */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-md font-semibold text-slate-800">Timeline Catatan Pelayanan & Counseling</h3>
            
            <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6 max-h-160 overflow-y-auto pt-2">
              {notes.map((note) => {
                const memberObj = members.find(m => m.id === note.memberId);
                return (
                  <div key={note.id} className="relative group">
                    {/* Circle marker on timeline */}
                    <span className="absolute -left-10 top-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center">
                      <StickyNote className="w-4 h-4" />
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-indigo-600 font-mono font-bold tracking-wider uppercase bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/50">
                          {note.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">{note.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {memberObj ? `${memberObj.fullName} (${memberObj.id})` : 'Kader Organisasi'}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        "{note.notes}"
                      </p>
                      <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        <span>Ditulis oleh:</span>
                        <span className="text-slate-600 font-semibold">{note.author}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form to add note */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Plus className="w-4 h-4 text-indigo-500" /> Catat Histori Konseling Baru
            </h3>
            <form onSubmit={handleAddNotesForm} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">Pilih Anggota pelayanan :</label>
                <select 
                  value={noteMemberId} 
                  onChange={(e) => setNoteMemberId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- PILIH ANGGOTA --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Kategori Pelayanan :</label>
                <select 
                  value={noteCategory} 
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Konseling Akademik">Konseling Akademik</option>
                  <option value="Follow Up Retret">Follow Up Retret</option>
                  <option value="Bimbingan Karir">Bimbingan Karir</option>
                  <option value="Konseling Pribadi">Konseling Pribadi</option>
                  <option value="Pengutusan Kepemimpinan">Mulai / PKK / Pemimpin</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Detail Catatan / Perkembangan :</label>
                <textarea 
                  rows={4}
                  placeholder="Ceritakan ringkasan bimbingan, kondisi pelayanan, perkembangan rohani atau tantangan akademis yang dialami keder..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Simpan Catatan Pelayanan
              </button>
            </form>
          </div>

        </div>
      )}

      {/* SUBTAB 3: PRAYER REQUESTS BOARD */}
      {subTab === 'prayers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Prayer directory list */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-md font-semibold text-slate-800">Pokok Permohonan Doa (Prayer Request)</h3>
            
            <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
              {prayerRequests.map((p) => (
                <div key={p.id} className="py-4 hover:bg-slate-50/50 px-2 rounded-xl transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 font-mono tracking-tight uppercase text-indigo-700">{p.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Diajukan oleh: <span className="text-slate-600 font-semibold">{p.memberName}</span> (Tgl: {p.date})</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      p.status === 'Terjawab' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      p.status === 'Didoakan' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed py-2 pl-3 border-l-2 border-slate-200 mt-2">
                    "{p.request}"
                  </p>
                  
                  {/* Action states toggle */}
                  <div className="flex gap-2.5 mt-2 justify-end">
                    <span className="text-[9px] text-slate-400 self-center">Ubah Status Doa:</span>
                    <button 
                      onClick={() => onUpdatePrayerStatus(p.id, 'Didoakan')}
                      className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-transparent rounded-lg text-[9px] font-semibold cursor-pointer"
                    >
                      Mulai Doakan
                    </button>
                    <button 
                      onClick={() => onUpdatePrayerStatus(p.id, 'Terjawab')}
                      className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-transparent rounded-lg text-[9px] font-semibold cursor-pointer"
                    >
                      Puji Tuhan, Terjawab!
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form to add prayer */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Plus className="w-4 h-4 text-indigo-500" /> Ajukan Pokok Doa Baru
            </h3>
            <form onSubmit={handleAddPrayerForm} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">Pemohon (Anggota):</label>
                <select 
                  value={prayerMemberId} 
                  onChange={(e) => setPrayerMemberId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- PILIH PEMOHON --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Judul / Bidang Doa:</label>
                <input 
                  type="text"
                  placeholder="Contoh: Skripsi Akhir, Kesehatan Keluarga..."
                  value={prayerTitle}
                  onChange={(e) => setPrayerTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Detail Permohonan Doa:</label>
                <textarea 
                  rows={4}
                  placeholder="Berikan deskripsi detail tentang hal-hal rohani, jasmani, atau target yang mau dibawakan bersama di persekutuan kelompok kecil..."
                  value={prayerContent}
                  onChange={(e) => setPrayerContent(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Kirim Pembawa Doa
              </button>
            </form>
          </div>

        </div>
      )}

      {/* SUBTAB 4: FOLLOW UP WORKSPACE */}
      {subTab === 'followup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of past follow ups */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-md font-semibold text-slate-800">History Follow Up</h3>
            
            <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
              {followUps.map((fu) => (
                <div key={fu.id} className="py-4 hover:bg-slate-50/50 px-2 rounded-xl transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800">{fu.memberName}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full border border-slate-200/50 font-semibold">{fu.type}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">Tanggal Follow Up: {fu.date}</span>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">Oleh: {fu.staffName}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    "{fu.notes}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Form to submit a follow up report */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Plus className="w-4 h-4 text-indigo-500" /> Catat Laporan Follow Up
            </h3>
            <form onSubmit={handleAddFollowUpForm} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">Kader yang di-Follow Up:</label>
                <select 
                  value={followUpMemberId} 
                  onChange={(e) => setFollowUpMemberId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- PILIH KADER --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Metode Follow Up:</label>
                <select 
                  value={followUpType} 
                  onChange={(e) => setFollowUpType(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Telepon">Telepon / WhatsApp Call</option>
                  <option value="Kunjungan">Kunjungan Rumah / Kos</option>
                  <option value="Konseling">Konseling Dua Arah</option>
                  <option value="Mentoring">Mentoring Modul Pelayanan</option>
                  <option value="Pemuridan">Pemuridan Intensif</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Laporan Hasil Pertemuan / Pembicaraan:</label>
                <textarea 
                  rows={4}
                  placeholder="Tuliskan perkembangan, pergumulan rohani, saran yang diberikan kepada anggota, dan rencana tindak lanjut (Next plan mentoring)..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Simpan Pendampingan
              </button>
            </form>
          </div>

        </div>
      )}

      {/* SUBTAB 5: MOCK CSV/EXCEL BULK IMPORTER */}
      {subTab === 'import' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-semibold text-slate-800">Enterprise Bulk Excel / CSV Data Importer</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Modul ini menyimulasikan sistem parse file excel. Anda bisa menyalin-tempel data multi-kolom di bawah dengan pembatas karakter pipa (<code className="bg-slate-100 p-0.5 rounded font-bold">|</code>) untuk langsung mengimpor baris baru ke dalam record memori lokal aplikasi.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-mono font-bold text-indigo-600 uppercase block">FORMAT KOLOM TRANSFER DATA:</span>
            <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-xl border border-slate-800 overflow-x-auto whitespace-nowrap leading-relaxed">
              Nama_Lengkap | Jenis_Kelamin | Tempat_Lahir | Tanggal_Lahir | No_HP | Email | Alamat | Kota | Provinsi | Instagram | Gereja_Asal | Pendidikan | Pekerjaan | Komponen_ESM (Siswa/Mahasiswa/Alumni) | Wilayah
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Teks Mentah Salinan Spreadsheet:</label>
              <textarea 
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full font-mono text-[11px] p-3 border border-slate-200 rounded-xl leading-relaxed focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {importStatus && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {importStatus}
              </div>
            )}

            <button 
              onClick={handleBulkImport}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Import Massal ke Memori
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DIALOG FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-3xl overflow-hidden my-8 scale-95 transition-transform">
            
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">{editingMember ? 'Edit Data Profil Anggota' : 'Registrasi Anggota Baru'}</dt>
                <dd className="text-[11px] text-slate-300 mt-0.5">Lengkapi formulir biodata dan penugasan wilayah ESM.</dd>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={handleSaveMember} className="p-6 space-y-6 max-h-120 overflow-y-auto text-xs">
              
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-tight text-[11px]">Bagian A: Identitas Anggota</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-slate-500 block mb-1">Nama Lengkap :</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Yusuf Raja Tamba"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Nama Panggilan :</label>
                    <input 
                      type="text" 
                      value={nickName}
                      onChange={(e) => setNickName(e.target.value)}
                      placeholder="Yusuf"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Jenis Kelamin :</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Tempat Lahir :</label>
                    <input 
                      type="text" 
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      placeholder="Medan"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Tanggal Lahir :</label>
                    <input 
                      type="date" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">No. HP (WhatsApp) :</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812xxxxxx"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">E-mail Aktif :</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yusuf@gmail.com"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Instagram Account :</label>
                    <input 
                      type="text" 
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@username"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-slate-500 block mb-1">Alamat Domisili Tetap (Kota / Kosan) :</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Jl. Perintis Kemerdekaan No. 10"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Kota :</label>
                    <input 
                      type="text" 
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Sleman"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Provinsi :</label>
                    <input 
                      type="text" 
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="DIY"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Gereja Asal / Denominasi :</label>
                    <input 
                      type="text" 
                      value={originalChurch}
                      onChange={(e) => setOriginalChurch(e.target.value)}
                      placeholder="HKBP / GKI / GBI..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-500 block mb-1">Pendidikan (Sekolah / Kampus - Kepeminat) :</label>
                    <input 
                      type="text" 
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="S1 Teknik Informatika - UGM"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Pekerjaan saat ini :</label>
                    <input 
                      type="text" 
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="Mahasiswa"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-tight text-[11px]">Bagian B: Delegasi Pelayanan Yayasan</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-slate-500 block mb-1">Komponen Kategori ESM :</label>
                    <select 
                      value={component}
                      onChange={(e) => setComponent(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="Siswa">Siswa (Encounter)</option>
                      <option value="Mahasiswa">Mahasiswa (Explore)</option>
                      <option value="Alumni">Alumni (Connect)</option>
                      <option value="Umum">Umum (Pihak Luar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Wilayah Pelayanan :</label>
                    <select 
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
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
                    <label className="text-slate-500 block mb-1">Delegasi Kelompok Kecil (CG) :</label>
                    <select 
                      value={smallGroupId}
                      onChange={(e) => setSmallGroupId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="">-- LUANGKAN (Belum Tergabung) --</option>
                      {smallGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Staff Pendamping (Advisor) :</label>
                    <input 
                      type="text" 
                      value={staffAdvisor}
                      onChange={(e) => setStaffAdvisor(e.target.value)}
                      placeholder="Ahmad Faisal"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Mentor Pemuridan :</label>
                    <input 
                      type="text" 
                      value={mentor}
                      onChange={(e) => setMentor(e.target.value)}
                      placeholder="Christian Sitorus"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Status Keaktifan rohani :</label>
                    <select 
                      value={statusKeaktifan}
                      onChange={(e) => setStatusKeaktifan(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Pasif">Pasif</option>
                      <option value="Cuti">Cuti</option>
                      <option value="Pindah">Pindah wilayah</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action operations buttons */}
              <div className="pt-6 border-t border-slate-50 flex justify-end gap-3.5">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md shadow-indigo-950/20"
                >
                  <Save className="w-4 h-4 inline mr-1" /> Simpan Data Anggota
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
