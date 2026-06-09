/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Clock, 
  Calendar, 
  BookOpen, 
  User, 
  Search, 
  Save, 
  Trash, 
  Download, 
  BookMarked, 
  Users, 
  Layout, 
  HeartHandshake, 
  Sliders, 
  CheckSquare 
} from 'lucide-react';
import { SmallGroup, MeetingLog, MaterialInfo, Member } from '../types';
import { exportToCSV } from '../utils/export';

interface SmallGroupsTabProps {
  groups: SmallGroup[];
  meetings: MeetingLog[];
  materials: MaterialInfo[];
  members: Member[];
  onAddGroup: (g: SmallGroup) => void;
  onDeleteGroup: (id: string) => void;
  onAddMeeting: (m: MeetingLog) => void;
}

export default function SmallGroupsTab({
  groups,
  meetings,
  materials,
  members,
  onAddGroup,
  onDeleteGroup,
  onAddMeeting,
}: SmallGroupsTabProps) {
  // Navigation inside groups
  const [activeSubView, setActiveSubView] = useState<'groups' | 'meetings' | 'materials'>('groups');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<SmallGroup | null>(groups[0] || null);

  // Group Form state
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupRegion, setGroupRegion] = useState('Yogyakarta');
  const [groupStaff, setGroupStaff] = useState('Ahmad Faisal');
  const [groupLeader, setGroupLeader] = useState('');
  const [groupDay, setGroupDay] = useState('Rabu');
  const [groupTime, setGroupTime] = useState('17:00');
  const [groupLocation, setGroupLocation] = useState('');

  // Meeting logger state
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingMaterial, setMeetingMaterial] = useState('Fondasi Iman Kristen (Buku 1)');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [presentMembers, setPresentMembers] = useState<string[]>([]);

  // Function to create group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !groupLeader) {
      alert('Nama Kelompok & Pemimpin wajib diisi!');
      return;
    }
    const newGroup: SmallGroup = {
      id: `SG-${String(groups.length + 1).padStart(2, '0')}`,
      name: groupName,
      region: groupRegion,
      staffAdvisor: groupStaff,
      leaderName: groupLeader,
      meetingDay: groupDay,
      meetingTime: groupTime,
      location: groupLocation,
      memberCount: 0
    };
    onAddGroup(newGroup);
    setGroupName('');
    setGroupLeader('');
    setGroupLocation('');
    setIsAddGroupOpen(false);
    setSelectedGroup(newGroup);
  };

  // Function to lock in meeting logs
  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      alert('Pilih Kelompok Kecil terlebih dahulu!');
      return;
    }
    const newMeeting: MeetingLog = {
      id: `MEET-${Date.now()}`,
      groupId: selectedGroup.id,
      date: meetingDate,
      materialName: meetingMaterial,
      attendance: presentMembers,
      notes: meetingNotes
    };
    onAddMeeting(newMeeting);
    setMeetingNotes('');
    setPresentMembers([]);
    setIsAddMeetingOpen(false);
    alert('Laporan Pertemuan Kelompok Kecil Berhasil Tersimpan.');
  };

  // Toggle dynamic attendance
  const toggleAttendance = (memberId: string) => {
    if (presentMembers.includes(memberId)) {
      setPresentMembers(presentMembers.filter(id => id !== memberId));
    } else {
      setPresentMembers([...presentMembers, memberId]);
    }
  };

  // Get members belonging to current group
  const activeGroupMembers = selectedGroup 
    ? members.filter(m => m.smallGroupId === selectedGroup.id) 
    : [];

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = [
      'ID Kelompok Kecil',
      'Nama Kelompok Kecil',
      'Nama Pemimpin',
      'Wilayah',
      'Komponen',
      'Hari Pertemuan',
      'Waktu Pertemuan',
      'Lokasi Pertemuan',
      'Kurikulum Berjalan'
    ];
    const keys = [
      'id',
      'name',
      'leaderName',
      'region',
      'component',
      'dayOfWeek',
      'meetingTime',
      'location',
      'activeMaterial'
    ];
    exportToCSV(filteredGroups, headers, keys, `data_kelompok_kecil_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pembinaan Kelompok Kecil (CG)</h2>
          <p className="text-xs text-slate-500">Tata laksana persekutuan kecil, kurikulum bimbingan, log absensi, & database pemimpin pembuat murid.</p>
        </div>
        <div className="flex gap-2">
          {activeSubView === 'groups' && (
            <>
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-600" /> Export CSV
              </button>
              <button 
                onClick={() => setIsAddGroupOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Kelompok Kecil
              </button>
            </>
          )}
        </div>
      </div>

      {/* Internal Menu Control */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl max-w-md">
        <button 
          onClick={() => setActiveSubView('groups')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSubView === 'groups' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Konfigurasi Kelompok
        </button>
        <button 
          onClick={() => setActiveSubView('meetings')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSubView === 'meetings' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Log Pertemuan mingguan
        </button>
        <button 
          onClick={() => setActiveSubView('materials')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSubView === 'materials' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Kurikulum & Materi
        </button>
      </div>

      {/* SUBVIEW 1: GROUPS BOARD */}
      {activeSubView === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Groups List */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Kelompok kecil..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredGroups.map(group => {
                const grpMembersCount = members.filter(m => m.smallGroupId === group.id).length;
                return (
                  <div 
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                      selectedGroup?.id === group.id 
                        ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/10' 
                        : 'border-slate-100 hover:shadow-md shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{group.name}</h3>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold mt-1 inline-block">{group.id}</span>
                        </div>
                        <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                          {group.region}
                        </span>
                      </div>

                      {/* Info details */}
                      <div className="space-y-1.5 text-xs text-slate-600 my-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>PM (Pemimpin): <strong className="text-slate-800">{group.leaderName}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pertemuan: {group.meetingDay}, Jam {group.meetingTime} wib</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 line-clamp-1" />
                          <span className="truncate">{group.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between mt-auto">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-4 h-4 text-slate-400" /> {grpMembersCount} Kader Tergabung
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteGroup(group.id);
                        }}
                        className="text-[10px] text-red-500 hover:underline cursor-pointer"
                      >
                        Hapus Kelompok
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group details & Members breakdown side widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            {selectedGroup ? (
              <div className="space-y-5">
                <div className="text-center pb-4 border-b border-slate-50">
                  <BookMarked className="w-10 h-10 text-indigo-500 mx-auto mb-2 animate-pulse" />
                  <h3 className="font-bold text-slate-800 text-base">{selectedGroup.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Staff Advisor: {selectedGroup.staffAdvisor}</p>
                </div>

                {/* Anggota Kelompok Roster */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-3">Daftar Roster Anggota</h4>
                  {activeGroupMembers.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {activeGroupMembers.map(member => (
                        <div key={member.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-100/50 transition-all">
                          <div>
                            <span className="font-semibold text-xs text-slate-800 block">{member.fullName}</span>
                            <span className="text-[9px] font-mono font-medium text-slate-400">{member.id} &bull; {member.component}</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">{member.statusKeaktifan}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                      Belum ada anggota yang dialokasikan ke kelompok kecil ini. Anda dapat mengalokasikan kelompok kecil di Profil Anggota.
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50 text-center">
                  <button 
                    onClick={() => {
                      setMeetingMaterial('Pertumbuhan Rohani Kristen');
                      setIsAddMeetingOpen(true);
                      setActiveSubView('meetings');
                    }}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-transparent rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <CheckSquare className="w-4 h-4" /> Presensi Pertemuan Mingguan
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Silahkan pilih salah satu kelompok kecil untuk mengulas detail anggota & membuat catatan mingguan.
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBVIEW 2: MEETINGS & PRESENSI ATTENDANCE ROSTER */}
      {activeSubView === 'meetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of past logged meetings */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-md font-semibold text-slate-800">Arsip Pertemuan Kelompok Kecil</h3>
            
            <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
              {meetings
                .filter(m => !selectedGroup || m.groupId === selectedGroup.id)
                .map((meet) => {
                  const grp = groups.find(g => g.id === meet.groupId);
                  return (
                    <div key={meet.id} className="py-4 hover:bg-slate-50/50 px-2 rounded-xl transition-all space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 font-mono tracking-tight uppercase text-indigo-700">Materi: {meet.materialName}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">Kelompok: <span className="text-slate-600 font-bold">{grp?.name}</span> &bull; Tgl: {meet.date}</p>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 font-bold">
                          Attendance: {meet.attendance.length} Hadir
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        "{meet.notes}"
                      </p>
                      
                      {/* Attendance list icons */}
                      <div className="text-[10px] text-slate-400 font-medium">
                        Kader hadir: <span className="text-slate-700 font-semibold">{
                          meet.attendance.length > 0
                            ? meet.attendance.map(id => members.find(m => m.id === id)?.fullName || id).join(', ')
                            : 'Nihil / Belum didata'
                        }</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Form to submit a meeting presensi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Plus className="w-4 h-4 text-indigo-500" /> Presensi Baru: {selectedGroup ? selectedGroup.name : 'Pilih Kelompok dulu'}
            </h3>
            {selectedGroup ? (
              <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs">
                
                <div>
                  <label className="text-slate-500 block mb-1">Tanggal Kelompok Kecil :</label>
                  <input 
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Materi / Bab Modul yang Dibahas :</label>
                  <select 
                    value={meetingMaterial}
                    onChange={(e) => setMeetingMaterial(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                  >
                    {materials.map(m => (
                      <option key={m.id} value={m.title}>{m.title}</option>
                    ))}
                  </select>
                </div>

                {/* Checkbox attendance for each active roster */}
                <div>
                  <label className="text-slate-500 block mb-2 font-bold uppercase tracking-wider text-[10px]">Roster Absensi (Tick Hadir):</label>
                  {activeGroupMembers.length > 0 ? (
                    <div className="space-y-2 border border-slate-100 p-2.5 rounded-xl max-h-48 overflow-y-auto">
                      {activeGroupMembers.map(member => {
                        const isChecked = presentMembers.includes(member.id);
                        return (
                          <label key={member.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleAttendance(member.id)}
                              className="accent-indigo-600 rounded"
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block">{member.fullName}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{member.id}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-red-500 italic">Tambahkan anggota ke dalam CG dulu di tab "Directory" agar bisa diabsensi.</p>
                  )}
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Catatan Pertemuan / Hambatan :</label>
                  <textarea 
                    rows={3}
                    placeholder="Contoh: Diskusi luar biasa hangat, Yusuf membagikan refleksi yang memicu teman-teman bersemangat..."
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 leading-relaxed"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={activeGroupMembers.length === 0}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Selesaikan Log & Absensi
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                Pilih salah satu kelompok kecil di tab "Konfigurasi Kelompok" terlebih dahulu untuk mendata daftar presensi kader.
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBVIEW 3: CURRICULUM materials */}
      {activeSubView === 'materials' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-semibold text-slate-800">Kurikulum & Materi Pelayanan (Discipleship Library)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Arsip bahan ajar resmi yang didistribusikan untuk bahan diskusi Kelompok Kecil ESM di semua tingkatan wilayah. Diakreditasi oleh Sekretariat Yayasan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {materials.map(material => (
              <div key={material.id} className="p-5 border border-slate-100 rounded-2xl hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded font-mono">
                      {material.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">{material.fileSize}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{material.title}</h4>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                    "{material.description}"
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Bahan Versi Cetak: Tersedia</span>
                  <a 
                    href="#download"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Menyimulasikan download file "${material.title}" PDF...`);
                    }}
                    className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 font-bold border border-slate-200 rounded-lg flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Unduh PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CREATE SMALL GROUP */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden scale-95 transition-all">
            
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">Tambah Kelompok Kecil Baru</dt>
                <dd className="text-[11px] text-slate-300">Buat rintisan kelompok pemuridan baru di bawah naungan wilayah.</dd>
              </div>
              <button onClick={() => setIsAddGroupOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">Nama Kelompok Kecil (CG) :</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Contoh: Tunas Kasih UGM"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">Wilayah Pelayanan :</label>
                  <select 
                    value={groupRegion}
                    onChange={(e) => setGroupRegion(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-850"
                  >
                    <option value="Yogyakarta">Yogyakarta</option>
                    <option value="Surabaya">Surabaya</option>
                    <option value="Jakarta">Jakarta</option>
                    <option value="Bandung">Bandung</option>
                    <option value="Medan">Medan</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Staff Advisor Pembina :</label>
                  <input 
                    type="text" 
                    value={groupStaff}
                    onChange={(e) => setGroupStaff(e.target.value)}
                    placeholder="Ahmad Faisal, S.Th."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Nama Pemimpin PKK (Kader Senior) :</label>
                <input 
                  type="text" 
                  value={groupLeader}
                  onChange={(e) => setGroupLeader(e.target.value)}
                  placeholder="Nama Lengkap Pemimpin..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-500 block mb-1">Hari Pertemuan rutin :</label>
                  <select 
                    value={groupDay}
                    onChange={(e) => setGroupDay(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-850"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                    <option value="Minggu">Minggu</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Jam Temu rutin (wib) :</label>
                  <input 
                    type="text" 
                    value={groupTime}
                    onChange={(e) => setGroupTime(e.target.value)}
                    placeholder="17:00"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Lokasi Pertemuan rutin :</label>
                <input 
                  type="text" 
                  value={groupLocation}
                  onChange={(e) => setGroupLocation(e.target.value)}
                  placeholder="Contoh: Perpustakaan UGM / Kost Wisma Salatiga"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end gap-3.5">
                <button 
                  type="button" 
                  onClick={() => setIsAddGroupOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  <Save className="w-4 h-4 inline mr-1" /> Simpan Kelompok kecil
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
