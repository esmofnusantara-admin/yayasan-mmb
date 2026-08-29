/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
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
  Edit,
  Download, 
  BookMarked, 
  Users, 
  Layout, 
  HeartHandshake, 
  Sliders, 
  CheckSquare,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { SmallGroup, MeetingLog, MaterialInfo, Member, InstitutionalProfile } from '../types';
import { exportToCSV } from '../utils/export';

const GDRIVE_KURIKULUM_URL = "https://drive.google.com/drive/folders/1z9WXkVgZUCNzZHOmyQKh3mBP0axvLxAg?usp=sharing";
const MAX_KURIKULUM_UPLOAD_MB = 1;
const MAX_KURIKULUM_UPLOAD_BYTES = MAX_KURIKULUM_UPLOAD_MB * 1024 * 1024;

interface SmallGroupsTabProps {
  groups: SmallGroup[];
  meetings: MeetingLog[];
  materials: MaterialInfo[];
  members: Member[];
  onAddGroup: (g: SmallGroup) => void;
  onDeleteGroup: (id: string) => void;
  onAddMeeting: (m: MeetingLog) => void;
  onAddMaterial: (mat: MaterialInfo) => void;
  onDeleteMaterial: (id: string) => void;
  onUpdateMeeting?: (m: MeetingLog) => void;
  onDeleteMeeting?: (id: string) => void;
  profile?: InstitutionalProfile;
  currentRole: string;
}

export default function SmallGroupsTab({
  groups,
  meetings,
  materials,
  members,
  onAddGroup,
  onDeleteGroup,
  onAddMeeting,
  onAddMaterial,
  onDeleteMaterial,
  onUpdateMeeting,
  onDeleteMeeting,
  profile,
  currentRole,
}: SmallGroupsTabProps) {
  const isEditable = ['Super Admin', 'Ketua Yayasan', 'Pembina Yayasan', 'Sekretaris', 'Staff', 'Volunteer'].includes(currentRole);

  // Navigation inside groups
  const [activeSubView, setActiveSubView] = useState<'groups' | 'meetings' | 'materials'>('groups');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<SmallGroup | null>(groups[0] || null);

  // Group Form state
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupRegion, setGroupRegion] = useState(profile?.regions?.[0] || 'Yogyakarta');
  const [groupStaff, setGroupStaff] = useState('Ahmad Faisal');
  const [groupLeader, setGroupLeader] = useState('');
  const [groupDay, setGroupDay] = useState(profile?.meetingDays?.[0] || 'Rabu');
  const [groupTime, setGroupTime] = useState('17:00');
  const [groupLocation, setGroupLocation] = useState('');

  // Meeting logger state
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingMaterial, setMeetingMaterial] = useState('Fondasi Iman Kristen (Buku 1)');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [presentMembers, setPresentMembers] = useState<string[]>([]);
  const [editingMeeting, setEditingMeeting] = useState<MeetingLog | null>(null);

  // Material Form state
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [deleteConfirmMeeting, setDeleteConfirmMeeting] = useState<MeetingLog | null>(null);
  const [deleteConfirmMaterial, setDeleteConfirmMaterial] = useState<MaterialInfo | null>(null);
  const [materialCategory, setMaterialCategory] = useState(profile?.materialCategories?.[0] || 'Materi Dasar / Siswa');
  const [materialDescription, setMaterialDescription] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [pdfData, setPdfData] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [materialExternalLink, setMaterialExternalLink] = useState('');

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
    if (editingMeeting) {
      if (!window.confirm('Apakah Anda yakin ingin menyimpan perubahan log pertemuan ini?')) {
        return;
      }
      const updatedMeeting: MeetingLog = {
        ...editingMeeting,
        groupId: selectedGroup.id,
        date: meetingDate,
        materialName: meetingMaterial,
        attendance: presentMembers,
        notes: meetingNotes
      };
      if (onUpdateMeeting) {
        onUpdateMeeting(updatedMeeting);
      }
      setEditingMeeting(null);
      setMeetingNotes('');
      setPresentMembers([]);
      alert('Laporan Pertemuan Kelompok Kecil Berhasil Diperbarui.');
    } else {
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
    }
  };

  const handleEditMeeting = (meet: MeetingLog) => {
    const grp = groups.find(g => g.id === meet.groupId);
    if (grp) {
      setSelectedGroup(grp);
    }
    setEditingMeeting(meet);
    setMeetingDate(meet.date);
    setMeetingMaterial(meet.materialName);
    setMeetingNotes(meet.notes);
    setPresentMembers(meet.attendance);
  };

  const handleCancelEditMeeting = () => {
    setEditingMeeting(null);
    setMeetingDate(new Date().toISOString().split('T')[0]);
    if (materials.length > 0) {
      setMeetingMaterial(materials[0].title);
    }
    setMeetingNotes('');
    setPresentMembers([]);
  };

  // Toggle dynamic attendance
  const toggleAttendance = (memberId: string) => {
    if (presentMembers.includes(memberId)) {
      setPresentMembers(presentMembers.filter(id => id !== memberId));
    } else {
      setPresentMembers([...presentMembers, memberId]);
    }
  };

  // Handle PDF file selection & conversion to Base64 (Max 1 MB)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Hanya file PDF yang diperbolehkan!');
      return;
    }
    if (file.size > MAX_KURIKULUM_UPLOAD_BYTES) {
      alert(
        `Ukuran file PDF "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas upload langsung ${MAX_KURIKULUM_UPLOAD_MB} MB agar database tetap ringan.\n\nSilakan unggah file PDF kurikulum ke Folder Google Drive Yayasan melalui tombol yang tersedia di formulir, lalu cantumkan tautan/link berkasnya.`
      );
      e.target.value = '';
      return;
    }

    const kb = (file.size / 1024).toFixed(1);
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = file.size > 1024 * 1024 ? `${mb} MB` : `${kb} KB`;
    setFileSizeStr(sizeStr);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPdfData(reader.result);
      }
    };
    reader.onerror = () => {
      alert('Gagal membaca file PDF.');
    };
    reader.readAsDataURL(file);
  };

  // Submit new material/curriculum
  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialTitle || !materialCategory || !materialDescription) {
      alert('Judul, Kategori & Deskripsi wajib diisi!');
      return;
    }

    const newMaterial: MaterialInfo = {
      id: `MAT-${Date.now()}`,
      title: materialTitle,
      category: materialCategory,
      description: materialDescription,
      fileSize: fileSizeStr || (materialExternalLink ? 'GDrive Link' : 'Generated PDF'),
      pdfData: pdfData || undefined,
      externalLink: materialExternalLink.trim() || undefined,
    };

    onAddMaterial(newMaterial);

    // Reset Form
    setMaterialTitle('');
    setMaterialCategory('Materi Dasar / Siswa');
    setMaterialDescription('');
    setUploadedFileName('');
    setPdfData('');
    setFileSizeStr('');
    setMaterialExternalLink('');
    setIsAddMaterialOpen(false);
    alert('Materi Kurikulum Berhasil Diupload & Tersimpan.');
  };

  // Download PDF file handling
  const handleDownloadPDF = (material: MaterialInfo) => {
    if (material.pdfData) {
      try {
        const link = document.createElement('a');
        link.href = material.pdfData;
        link.download = `${material.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error downloading uploaded PDF:', err);
        alert('Gagal mengunduh file PDF.');
      }
    } else {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // Background styling
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(0, 0, 210, 297, 'F');

        // Header bar
        doc.setFillColor(79, 70, 229); // indigo-600
        doc.rect(0, 0, 210, 15, 'F');

        // Brand Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text("YAYASAN MURID MUDA BERMISI", 15, 35);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("DISCIPLESHIP LIBRARY - OFFICIAL CURRICULUM SYLLABUS", 15, 41);

        // Header Divider
        doc.setLineWidth(0.5);
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(15, 45, 195, 45);

        // Kategori Block
        doc.setFillColor(238, 242, 255); // indigo-50
        doc.setDrawColor(224, 231, 255); // indigo-100
        doc.rect(15, 52, 180, 10, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(79, 70, 229); // indigo-600
        doc.text(`KATEGORI: ${material.category.toUpperCase()}`, 20, 58.5);

        // Core Content: Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42); // slate-900
        const titleLines = doc.splitTextToSize(material.title, 170);
        doc.text(titleLines, 15, 75);

        const startY = 75 + (titleLines.length * 7);

        // Description Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text("Deskripsi & Garis Besar Diskusi:", 15, startY + 5);

        // Description Body Text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85); // slate-700
        const descLines = doc.splitTextToSize(material.description, 170);
        doc.text(descLines, 15, startY + 12);

        // Footer block
        const footerY = Math.max(startY + 12 + (descLines.length * 6) + 20, 245);
        doc.setLineWidth(0.2);
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.line(15, footerY, 195, footerY);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`ID Referensi: ${material.id} | Versi Cetak Digital Resmi - MMB Indonesia`, 15, footerY + 8);
        doc.text(`Unduhan Elektronik: ${new Date().toLocaleDateString('id-ID')} | Status: Terakreditasi`, 15, footerY + 13);

        doc.save(`${material.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      } catch (err) {
        console.error('Error synthesizing PDF using jsPDF:', err);
        alert('Gagal menyusun data PDF.');
      }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pembinaan Kelompok Kecil (CG)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Tata laksana persekutuan kecil, kurikulum bimbingan, log absensi, & direktori pemimpin pembuat murid.</p>
        </div>
        <div className="flex gap-2">
          {activeSubView === 'groups' && (
            <>
              <button 
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs text-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
              </button>
              {isEditable && (
                <button 
                  onClick={() => setIsAddGroupOpen(true)}
                  className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Kelompok
                </button>
              )}
            </>
          )}
          {activeSubView === 'materials' && isEditable && (
            <button 
              onClick={() => setIsAddMaterialOpen(true)}
              className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Unggah Kurikulum / Materi
            </button>
          )}
        </div>
      </div>

      {/* Segmented Menu Control */}
      <div className="bg-slate-100 border border-slate-200 p-1 rounded-lg flex max-w-lg shadow-xs my-2">
        <button 
          onClick={() => setActiveSubView('groups')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubView === 'groups' 
              ? 'bg-[#0c2340] text-white shadow-xs' 
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Kelompok Pemuridan</span>
        </button>
        <button 
          onClick={() => setActiveSubView('meetings')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubView === 'meetings' 
              ? 'bg-[#0c2340] text-white shadow-xs' 
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Log Pertemuan</span>
        </button>
        <button 
          onClick={() => setActiveSubView('materials')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubView === 'materials' 
              ? 'bg-[#0c2340] text-white shadow-xs' 
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>Bahan Kurikulum</span>
        </button>
      </div>

      {/* SUBVIEW 1: GROUPS BOARD */}
      {activeSubView === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Groups List */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari kelompok kecil, pemimpin, atau wilayah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
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
                    className={`bg-white p-4 rounded-lg border transition-colors cursor-pointer relative group flex flex-col justify-between ${
                      selectedGroup?.id === group.id 
                        ? 'border-[#0c2340] ring-1 ring-[#0c2340] shadow-xs' 
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        <div>
                          <h3 className="font-bold text-slate-900 text-xs">{group.name}</h3>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-semibold mt-1 inline-block border border-slate-200">{group.id}</span>
                        </div>
                        <span className="text-[10px] text-slate-700 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {group.region}
                        </span>
                      </div>

                      {/* Info details */}
                      <div className="space-y-1 text-xs text-slate-600 my-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pemimpin: <strong className="text-slate-800">{group.leaderName}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{group.meetingDay}, {group.meetingTime} WIB</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{group.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between mt-auto">
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> {grpMembersCount} Kader
                      </span>
                      {isEditable && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Apakah Anda yakin ingin menghapus kelompok ini?')) {
                              onDeleteGroup(group.id);
                            }
                          }}
                          className="text-xs text-rose-700 hover:underline cursor-pointer font-medium"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group details & Members breakdown side widget */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-5">
            {selectedGroup ? (
              <div className="space-y-4">
                <div className="text-center pb-3 border-b border-slate-200">
                  <BookMarked className="w-8 h-8 text-[#0c2340] mx-auto mb-1.5" />
                  <h3 className="font-bold text-slate-900 text-sm">{selectedGroup.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Staff Pembina: {selectedGroup.staffAdvisor}</p>
                </div>

                {/* Anggota Kelompok Roster */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Daftar Anggota</h4>
                  {activeGroupMembers.length > 0 ? (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {activeGroupMembers.map(member => (
                        <div key={member.id} className="p-2 bg-slate-50 border border-slate-200 rounded flex items-center justify-between hover:bg-slate-100 transition-colors">
                          <div>
                            <span className="font-semibold text-xs text-slate-800 block">{member.fullName}</span>
                            <span className="text-[10px] font-mono text-slate-500">{member.id} &bull; {member.component}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">{member.statusKeaktifan}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-500">
                      Belum ada anggota di kelompok ini. Alokasikan di Profil Anggota.
                    </div>
                  )}
                </div>

                {isEditable && (
                  <div className="pt-3 border-t border-slate-200 text-center">
                    <button 
                      onClick={() => {
                        setMeetingMaterial('Pertumbuhan Rohani Kristen');
                        setIsAddMeetingOpen(true);
                        setActiveSubView('meetings');
                      }}
                      className="w-full py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Presensi Pertemuan Mingguan
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                Pilih salah satu kelompok kecil untuk melihat detail anggota & membuat catatan pertemuan.
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBVIEW 2: MEETINGS & PRESENSI ATTENDANCE ROSTER */}
      {activeSubView === 'meetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of past logged meetings */}
          <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Arsip Pertemuan Kelompok Kecil</h3>
            
            <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
              {meetings
                .filter(m => {
                  const grp = groups.find(g => g.id === m.groupId);
                  if (!grp) return false;
                  return !selectedGroup || m.groupId === selectedGroup.id;
                })
                .map((meet) => {
                  const grp = groups.find(g => g.id === meet.groupId);
                  return (
                    <div key={meet.id} className="py-3 hover:bg-slate-50 px-2 rounded transition-colors space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 tracking-tight">Materi: {meet.materialName}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Kelompok: <span className="text-slate-700 font-semibold">{grp?.name}</span> &bull; Tanggal: {meet.date}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                            {meet.attendance.length} Hadir
                          </span>
                          <button
                            onClick={() => handleEditMeeting(meet)}
                            title="Edit Laporan"
                            type="button"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmMeeting(meet);
                            }}
                            title="Hapus Laporan"
                            type="button"
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                        "{meet.notes}"
                      </p>
                      
                      <div className="text-xs text-slate-500 font-medium">
                        Kader hadir: <span className="text-slate-800 font-semibold">{
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
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
           <h3 className="text-xs font-bold text-slate-900 mb-3.5 flex items-center gap-1.5 border-b border-slate-200 pb-2">
             {editingMeeting ? (
               <>
                 <Edit className="w-3.5 h-3.5 text-slate-700" /> Edit Laporan: {selectedGroup ? selectedGroup.name : 'Pilih Kelompok'}
               </>
             ) : (
               <>
                 <Plus className="w-3.5 h-3.5 text-slate-700" /> Presensi Baru: {selectedGroup ? selectedGroup.name : 'Pilih Kelompok'}
               </>
             )}
           </h3>
            {selectedGroup ? (
              <form onSubmit={handleCreateMeeting} className="space-y-3.5 text-xs">
                
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Tanggal Pertemuan :</label>
                  <input 
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Materi yang Dibahas :</label>
                  <select 
                    value={meetingMaterial}
                    onChange={(e) => setMeetingMaterial(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    {materials.map(m => (
                      <option key={m.id} value={m.title}>{m.title}</option>
                    ))}
                  </select>
                </div>

                {/* Checkbox attendance */}
                <div>
                  <label className="text-slate-700 block mb-1.5 font-bold uppercase tracking-wider text-[10px]">Daftar Hadir:</label>
                  {activeGroupMembers.length > 0 ? (
                    <div className="space-y-1.5 border border-slate-200 p-2 rounded max-h-48 overflow-y-auto bg-slate-50">
                      {activeGroupMembers.map(member => {
                        const isChecked = presentMembers.includes(member.id);
                        return (
                          <label key={member.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => toggleAttendance(member.id)}
                              className="accent-[#0c2340] rounded"
                            />
                            <div>
                              <span className="font-semibold text-slate-800 block text-xs">{member.fullName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{member.id}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-700 italic">Tambahkan anggota ke dalam kelompok ini di tab "Direktori Anggota" terlebih dahulu.</p>
                  )}
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Catatan Pertemuan :</label>
                  <textarea 
                    rows={3}
                    placeholder="Catatan diskusi, perkembangan rohani, refleksi, dll..."
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 leading-relaxed focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>

                 <div className="flex gap-2 pt-1">
                   <button 
                     type="submit"
                     disabled={activeGroupMembers.length === 0}
                     className="flex-1 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                   >
                     {editingMeeting ? 'Perbarui Log Pertemuan' : 'Simpan Presensi'}
                   </button>
                   {editingMeeting && (
                     <button 
                       type="button"
                       onClick={handleCancelEditMeeting}
                       className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
                     >
                       Batal
                     </button>
                   )}
                 </div>
              </form>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                Pilih salah satu kelompok kecil terlebih dahulu.
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBVIEW 3: CURRICULUM materials */}
      {activeSubView === 'materials' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Kurikulum & Materi Pelayanan (Discipleship Library)</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Arsip bahan ajar resmi yang didistribusikan untuk bahan diskusi Kelompok Kecil MMB di semua tingkatan wilayah.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {materials.map(material => (
              <div key={material.id} className="p-4 border border-slate-200 rounded-lg hover:border-[#0c2340] transition-colors flex flex-col justify-between bg-white shadow-xs">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded font-mono">
                      {material.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-medium">{material.fileSize}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">{material.title}</h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                    "{material.description}"
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200 mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Salinan Resmi</span>
                  <div className="flex items-center gap-1.5">
                    {material.externalLink && (
                      <a 
                        href={material.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1 px-2.5 bg-white hover:bg-slate-50 text-xs text-slate-700 font-medium border border-slate-300 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Buka materi di Google Drive"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-600" /> GDrive
                      </a>
                    )}
                    {isEditable && (
                      <button 
                        onClick={() => {
                          setDeleteConfirmMaterial(material);
                        }}
                        className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-xs text-rose-700 font-medium border border-rose-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                        title="Hapus materi kurikulum ini"
                      >
                        <Trash className="w-3 h-3" /> Hapus
                      </button>
                    )}
                    <button 
                      onClick={() => handleDownloadPDF(material)}
                      className="py-1 px-2.5 bg-[#0c2340] hover:bg-[#1b365d] text-xs text-white font-medium rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3 h-3" /> Unduh PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CREATE SMALL GROUP */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden my-8">
            
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">Tambah Kelompok Kecil Baru</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Buat rintisan kelompok pemuridan baru di bawah naungan wilayah.</dd>
              </div>
              <button 
                onClick={() => setIsAddGroupOpen(false)} 
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Nama Kelompok Kecil (CG) :</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Contoh: Tunas Kasih UGM"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Wilayah Pelayanan :</label>
                  <select 
                    value={groupRegion}
                    onChange={(e) => setGroupRegion(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    {(profile?.regions || ["Yogyakarta", "Surabaya", "Jakarta", "Bandung", "Medan"]).map((r, idx) => (
                      <option key={idx} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Staff Advisor :</label>
                  <input 
                    type="text" 
                    value={groupStaff}
                    onChange={(e) => setGroupStaff(e.target.value)}
                    placeholder="Ahmad Faisal, S.Th."
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Nama Pemimpin (PKK) :</label>
                <input 
                  type="text" 
                  value={groupLeader}
                  onChange={(e) => setGroupLeader(e.target.value)}
                  placeholder="Nama Lengkap Pemimpin..."
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Hari Pertemuan :</label>
                  <select 
                    value={groupDay}
                    onChange={(e) => setGroupDay(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    {(profile?.meetingDays || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]).map((day, idx) => (
                      <option key={idx} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Waktu Temu (WIB) :</label>
                  <input 
                    type="text" 
                    value={groupTime}
                    onChange={(e) => setGroupTime(e.target.value)}
                    placeholder="17:00"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Lokasi Pertemuan :</label>
                <input 
                  type="text" 
                  value={groupLocation}
                  onChange={(e) => setGroupLocation(e.target.value)}
                  placeholder="Contoh: Perpustakaan UGM / Kost Wisma Salatiga"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsAddGroupOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" /> Simpan Kelompok
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: CREATE / UPLOAD MATERIAL */}
      {isAddMaterialOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden my-8">
            
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">Unggah Kurikulum & Materi Baru</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Arsipkan bahan ajar KTB baru ke dalam Discipleship Library MMB.</dd>
              </div>
              <button 
                onClick={() => {
                  setIsAddMaterialOpen(false);
                  setUploadedFileName('');
                  setPdfData('');
                  setFileSizeStr('');
                }} 
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Judul Materi / Modul :</label>
                <input 
                  type="text" 
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="Contoh: Bertumbuh dalam Karakter Kristus (Buku 3)"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Kategori Sasaran Bimbingan :</label>
                <select 
                  value={materialCategory}
                  onChange={(e) => setMaterialCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                >
                  {(profile?.materialCategories || [
                    "Materi Dasar / Siswa",
                    "Siswa & Mahasiswa",
                    "Alumni",
                    "Pelatihan Pemimpin (PKK)",
                    "Materi Umum / Publik"
                  ]).map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Deskripsi & Garis Besar :</label>
                <textarea 
                  rows={4}
                  value={materialDescription}
                  onChange={(e) => setMaterialDescription(e.target.value)}
                  placeholder="Deskripsikan secara ringkas bab bimbingan ini, sasaran pembimbingan, referensi firman..."
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 leading-relaxed focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              {/* EXTERNAL LINK & GDRIVE HELPER */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 block font-semibold">
                    Tautan Google Drive Kurikulum (Opsional) :
                  </label>
                  <a
                    href={GDRIVE_KURIKULUM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#0c2340] hover:underline flex items-center gap-1"
                    title="Buka Folder Google Drive Kurikulum MMB"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Buka Folder GDrive <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... (Cantumkan tautan jika file PDF > 1 MB)"
                  value={materialExternalLink}
                  onChange={(e) => setMaterialExternalLink(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-800 bg-white focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Lampiran File PDF Langsung (Maks. 1 MB):</label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#0c2340] rounded p-4 transition-colors cursor-pointer relative bg-slate-50 hover:bg-slate-100">
                  <input 
                    type="file" 
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Download className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700 block text-center truncate max-w-[280px]">
                    {uploadedFileName || 'Klik atau seret file PDF di sini (≤ 1 MB)'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 text-center px-1 block">
                    Jika modul &gt; 1 MB, unggah ke Google Drive di atas & cantumkan tautannya.
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddMaterialOpen(false);
                    setUploadedFileName('');
                    setPdfData('');
                    setFileSizeStr('');
                    setMaterialExternalLink('');
                  }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" /> Unggah & Simpan
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRM MODAL: HAPUS PERTEMUAN */}
      {deleteConfirmMeeting && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Laporan Pertemuan</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus laporan pertemuan tanggal <strong>{deleteConfirmMeeting.date}</strong> untuk materi <strong>"{deleteConfirmMeeting.materialName}"</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMeeting(null)}
                className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium text-xs cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteMeeting) {
                    onDeleteMeeting(deleteConfirmMeeting.id);
                  }
                  setDeleteConfirmMeeting(null);
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
              >
                Ya, Hapus Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: HAPUS MATERI KURIKULUM */}
      {deleteConfirmMaterial && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Materi Kurikulum</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus materi pengajaran kurikulum <strong className="text-slate-800">"{deleteConfirmMaterial.title}"</strong> ({deleteConfirmMaterial.category}) ini dari katalog kurikulum?
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMaterial(null)}
                className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium text-xs cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMaterial(deleteConfirmMaterial.id);
                  setDeleteConfirmMaterial(null);
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
              >
                Ya, Hapus Materi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
