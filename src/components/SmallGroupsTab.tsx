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
  FolderOpen,
  Layers,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon
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
  onUpdateGroup?: (g: SmallGroup) => void;
  onDeleteGroup: (id: string) => void;
  onAddMeeting: (m: MeetingLog) => void;
  onAddMaterial: (mat: MaterialInfo) => void;
  onDeleteMaterial: (id: string) => void;
  onUpdateMeeting?: (m: MeetingLog) => void;
  onDeleteMeeting?: (id: string) => void;
  onUpdateMember?: (m: Member) => void;
  profile?: InstitutionalProfile;
  currentRole: string;
}

export default function SmallGroupsTab({
  groups,
  meetings,
  materials,
  members,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddMeeting,
  onAddMaterial,
  onDeleteMaterial,
  onUpdateMeeting,
  onDeleteMeeting,
  onUpdateMember,
  profile,
  currentRole,
}: SmallGroupsTabProps) {
  const isEditable = ['Super Admin', 'Ketua Yayasan', 'Pembina Yayasan', 'Sekretaris', 'Staff', 'Volunteer'].includes(currentRole);

  // Navigation inside groups
  const [activeSubView, setActiveSubView] = useState<'groups' | 'matrix' | 'meetings' | 'materials'>('groups');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<SmallGroup | null>(groups[0] || null);

  // Group Form state (Create)
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSpace, setGroupSpace] = useState<'Core Circle' | 'Intimate Space' | 'Social Space'>('Intimate Space');
  const [groupRegion, setGroupRegion] = useState(profile?.regions?.[0] || '');
  const [groupStaff, setGroupStaff] = useState('Joseph Daniel');
  const [groupLeader, setGroupLeader] = useState('');
  const [groupDay, setGroupDay] = useState(profile?.meetingDays?.[0] || 'Rabu');
  const [groupTime, setGroupTime] = useState('17:00');
  const [groupLocation, setGroupLocation] = useState('');
  const [groupDocUrl, setGroupDocUrl] = useState('');
  const [addGroupMemberIds, setAddGroupMemberIds] = useState<string[]>([]);
  const [addGroupMemberSearch, setAddGroupMemberSearch] = useState('');

  // Group Form state (Edit)
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SmallGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupSpace, setEditGroupSpace] = useState<'Core Circle' | 'Intimate Space' | 'Social Space'>('Intimate Space');
  const [editGroupRegion, setEditGroupRegion] = useState('Yogyakarta');
  const [editGroupStaff, setEditGroupStaff] = useState('');
  const [editGroupLeader, setEditGroupLeader] = useState('');
  const [editGroupDay, setEditGroupDay] = useState('Rabu');
  const [editGroupTime, setEditGroupTime] = useState('17:00');
  const [editGroupLocation, setEditGroupLocation] = useState('');
  const [editGroupDocUrl, setEditGroupDocUrl] = useState('');
  const [editGroupMemberIds, setEditGroupMemberIds] = useState<string[]>([]);
  const [editGroupMemberSearch, setEditGroupMemberSearch] = useState('');

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

  // Matrix Filter state
  const [matrixSearch, setMatrixSearch] = useState('');

  // Function to create group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !groupLeader) {
      alert('Nama Komunitas & Pemimpin wajib diisi!');
      return;
    }
    const newGroup: SmallGroup = {
      id: `SG-${String(groups.length + 1).padStart(2, '0')}`,
      name: groupName,
      communitySpace: groupSpace,
      region: groupRegion,
      staffAdvisor: groupStaff,
      leaderName: groupLeader,
      meetingDay: groupDay,
      meetingTime: groupTime,
      location: groupLocation,
      documentationUrl: groupDocUrl.trim() || undefined,
      memberCount: addGroupMemberIds.length
    };
    onAddGroup(newGroup);

    // Sync member assignments
    if (onUpdateMember && addGroupMemberIds.length > 0) {
      addGroupMemberIds.forEach(mId => {
        const member = members.find(m => m.id === mId);
        if (member) {
          const spaces = Array.from(new Set([...(member.communitySpaces || []), groupSpace]));
          const updatedMember: Member = {
            ...member,
            communitySpaces: spaces as any,
            ...(groupSpace === 'Core Circle' ? { coreCircleCommunity: newGroup.name } : {}),
            ...(groupSpace === 'Intimate Space' ? { intimateSpaceCommunity: newGroup.name, smallGroupId: newGroup.id } : {}),
            ...(groupSpace === 'Social Space' ? { socialSpaceCommunity: newGroup.name } : {}),
          };
          onUpdateMember(updatedMember);
        }
      });
    }

    setGroupName('');
    setGroupLeader('');
    setGroupLocation('');
    setGroupDocUrl('');
    setAddGroupMemberIds([]);
    setAddGroupMemberSearch('');
    setIsAddGroupOpen(false);
    setSelectedGroup(newGroup);
  };

  // Function to open edit modal
  const handleOpenEditGroup = (group: SmallGroup) => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupSpace((group.communitySpace as any) || 'Intimate Space');
    setEditGroupRegion(group.region || 'Yogyakarta');
    setEditGroupStaff(group.staffAdvisor || '');
    setEditGroupLeader(group.leaderName || '');
    setEditGroupDay(group.meetingDay || 'Rabu');
    setEditGroupTime(group.meetingTime || '17:00');
    setEditGroupLocation(group.location || '');
    setEditGroupDocUrl(group.documentationUrl || '');
    
    // Find current assigned members
    const currentMemberIds = members
      .filter(m =>
        m.smallGroupId === group.id ||
        m.coreCircleCommunity === group.name ||
        m.intimateSpaceCommunity === group.name ||
        m.socialSpaceCommunity === group.name
      )
      .map(m => m.id);
    setEditGroupMemberIds(currentMemberIds);
    setEditGroupMemberSearch('');
    setIsEditGroupOpen(true);
  };

  // Function to save edited group
  const handleSaveEditGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editGroupName || !editGroupLeader) {
      alert('Nama Komunitas & Pemimpin wajib diisi!');
      return;
    }
    const updated: SmallGroup = {
      ...editingGroup,
      name: editGroupName,
      communitySpace: editGroupSpace,
      region: editGroupRegion,
      staffAdvisor: editGroupStaff,
      leaderName: editGroupLeader,
      meetingDay: editGroupDay,
      meetingTime: editGroupTime,
      location: editGroupLocation,
      documentationUrl: editGroupDocUrl.trim() || undefined,
      memberCount: editGroupMemberIds.length
    };
    if (onUpdateGroup) {
      onUpdateGroup(updated);
    }
    if (selectedGroup?.id === updated.id) {
      setSelectedGroup(updated);
    }

    // Sync member updates
    if (onUpdateMember) {
      members.forEach(member => {
        const wasInGroup =
          member.smallGroupId === editingGroup.id ||
          member.coreCircleCommunity === editingGroup.name ||
          member.intimateSpaceCommunity === editingGroup.name ||
          member.socialSpaceCommunity === editingGroup.name;

        const isNowSelected = editGroupMemberIds.includes(member.id);

        if (isNowSelected) {
          const spaces = Array.from(new Set([...(member.communitySpaces || []), editGroupSpace]));
          const updatedMember: Member = {
            ...member,
            communitySpaces: spaces as any,
            ...(editGroupSpace === 'Core Circle' ? { coreCircleCommunity: updated.name } : {}),
            ...(editGroupSpace === 'Intimate Space' ? { intimateSpaceCommunity: updated.name, smallGroupId: updated.id } : {}),
            ...(editGroupSpace === 'Social Space' ? { socialSpaceCommunity: updated.name } : {}),
          };
          if (
            !wasInGroup ||
            (editGroupSpace === 'Core Circle' && member.coreCircleCommunity !== updated.name) ||
            (editGroupSpace === 'Intimate Space' && (member.intimateSpaceCommunity !== updated.name || member.smallGroupId !== updated.id)) ||
            (editGroupSpace === 'Social Space' && member.socialSpaceCommunity !== updated.name)
          ) {
            onUpdateMember(updatedMember);
          }
        } else if (wasInGroup && !isNowSelected) {
          // Member was removed from this community
          const updatedMember: Member = {
            ...member,
            ...(member.smallGroupId === editingGroup.id ? { smallGroupId: undefined } : {}),
            ...(member.coreCircleCommunity === editingGroup.name ? { coreCircleCommunity: '' } : {}),
            ...(member.intimateSpaceCommunity === editingGroup.name ? { intimateSpaceCommunity: '' } : {}),
            ...(member.socialSpaceCommunity === editingGroup.name ? { socialSpaceCommunity: '' } : {}),
          };
          onUpdateMember(updatedMember);
        }
      });
    }

    setIsEditGroupOpen(false);
    setEditingGroup(null);
  };

  // Function to lock in meeting logs
  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      alert('Pilih Komunitas Pemuridan terlebih dahulu!');
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
      alert('Laporan Pertemuan Komunitas Berhasil Diperbarui.');
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
      alert('Laporan Pertemuan Komunitas Berhasil Tersimpan.');
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
    setIsAddMeetingOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Harap unggah berkas dokumen dalam format PDF!');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_KURIKULUM_UPLOAD_BYTES) {
      alert(
        `Ukuran file "${file.name}" adalah ${(file.size / (1024 * 1024)).toFixed(2)} MB, melebihi batas maksimal ${MAX_KURIKULUM_UPLOAD_MB} MB.\n\nSilakan unggah dokumen kurikulum tersebut ke Google Drive Yayasan MMB, kemudian salin tautannya ke kolom "Tautan Google Drive Kurikulum".`
      );
      e.target.value = '';
      return;
    }

    const sizeInKb = (file.size / 1024).toFixed(1);
    setFileSizeStr(`${sizeInKb} KB`);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setPdfData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialTitle || !materialDescription) {
      alert('Mohon lengkapi judul kurikulum & deskripsi materi!');
      return;
    }

    const newMaterial: MaterialInfo = {
      id: `MAT-${Date.now()}`,
      title: materialTitle,
      category: materialCategory,
      description: materialDescription,
      pdfUrl: pdfData || undefined,
      externalLink: materialExternalLink.trim() || undefined,
      fileSize: pdfData ? fileSizeStr : undefined,
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    onAddMaterial(newMaterial);
    setMaterialTitle('');
    setMaterialDescription('');
    setUploadedFileName('');
    setPdfData('');
    setFileSizeStr('');
    setMaterialExternalLink('');
    setIsAddMaterialOpen(false);
  };

  const handleDownloadPDF = (mat: MaterialInfo) => {
    if (mat.pdfUrl) {
      const link = document.createElement('a');
      link.href = mat.pdfUrl;
      link.download = `${mat.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const doc = new jsPDF();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(12, 35, 64);
      doc.text('MODUL PEMURIDAN - YAYASAN MURID MUDA BERMISI', 15, 20);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Kategori: ${mat.category} | Diunggah: ${mat.uploadedAt || '-'}`, 15, 28);

      doc.setDrawColor(12, 35, 64);
      doc.line(15, 32, 195, 32);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(mat.title, 15, 42);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(mat.description, 180);
      doc.text(splitText, 15, 50);

      doc.save(`${mat.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    }
  };

  // Group filter
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.communitySpace && g.communitySpace.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeGroupMembers = members.filter(m =>
    m.smallGroupId === selectedGroup?.id ||
    m.coreCircleCommunity === selectedGroup?.name ||
    m.intimateSpaceCommunity === selectedGroup?.name ||
    m.socialSpaceCommunity === selectedGroup?.name
  );

  const toggleAttendance = (memberId: string) => {
    setPresentMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleExportCSV = () => {
    const headers = [
      'ID Komunitas',
      'Nama Komunitas',
      'Ruang Komunitas',
      'Wilayah',
      'Staff Advisor',
      'Pemimpin Komunitas',
      'Hari Pertemuan',
      'Waktu Pertemuan',
      'Lokasi',
      'Dokumentasi GDrive'
    ];
    const keys = [
      'id',
      'name',
      'communitySpace',
      'region',
      'staffAdvisor',
      'leaderName',
      'meetingDay',
      'meetingTime',
      'location',
      'documentationUrl'
    ];
    exportToCSV(filteredGroups, headers, keys, `data_komunitas_pemuridan_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  // Helper badge color for community space
  const getSpaceBadge = (space?: string) => {
    if (space === 'Core Circle') {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    } else if (space === 'Intimate Space') {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    } else if (space === 'Social Space') {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Matrix Filtered members
  const filteredMatrixMembers = members.filter(m =>
    m.fullName.toLowerCase().includes(matrixSearch.toLowerCase()) ||
    m.component.toLowerCase().includes(matrixSearch.toLowerCase()) ||
    m.region.toLowerCase().includes(matrixSearch.toLowerCase()) ||
    (m.coreCircleCommunity && m.coreCircleCommunity.toLowerCase().includes(matrixSearch.toLowerCase())) ||
    (m.intimateSpaceCommunity && m.intimateSpaceCommunity.toLowerCase().includes(matrixSearch.toLowerCase())) ||
    (m.socialSpaceCommunity && m.socialSpaceCommunity.toLowerCase().includes(matrixSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">

      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pemuridan Misional & Komunitas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Tata kelola 3 Ruang Komunitas (Core Circle, Intimate Space, Social Space), kurikulum bimbingan, & log absensi pemuridan.</p>
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
                  <Plus className="w-3.5 h-3.5" /> Buat Komunitas
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
      <div className="bg-slate-100 border border-slate-200 p-1 rounded-lg flex max-w-2xl shadow-xs my-2">
        <button
          onClick={() => setActiveSubView('groups')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${activeSubView === 'groups'
              ? 'bg-[#0c2340] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
            }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Daftar Komunitas</span>
        </button>
        <button
          onClick={() => setActiveSubView('matrix')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${activeSubView === 'matrix'
              ? 'bg-[#0c2340] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
            }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Matriks 3 Ruang Komunitas</span>
        </button>
        <button
          onClick={() => setActiveSubView('meetings')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${activeSubView === 'meetings'
              ? 'bg-[#0c2340] text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
            }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Log Pertemuan</span>
        </button>
        <button
          onClick={() => setActiveSubView('materials')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${activeSubView === 'materials'
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
                placeholder="Cari komunitas pemuridan, ruang, pemimpin, atau wilayah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
              />
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredGroups.map(group => {
                const grpMembersCount = members.filter(m =>
                  m.smallGroupId === group.id ||
                  m.coreCircleCommunity === group.name ||
                  m.intimateSpaceCommunity === group.name ||
                  m.socialSpaceCommunity === group.name
                ).length;
                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`bg-white p-4 rounded-lg border transition-colors cursor-pointer relative group flex flex-col justify-between ${selectedGroup?.id === group.id
                        ? 'border-[#0c2340] ring-1 ring-[#0c2340] shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getSpaceBadge(group.communitySpace)}`}>
                              {group.communitySpace || 'Intimate Space'}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-semibold border border-slate-200">
                              {group.id}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-xs">{group.name}</h3>
                        </div>
                        <span className="text-[10px] text-slate-700 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shrink-0">
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
                        {group.documentationUrl && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <a
                              href={group.documentationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-semibold text-[#0c2340] hover:underline flex items-center gap-1 truncate"
                            >
                              Foto Dokumentasi GDrive <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between mt-auto gap-2">
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> {grpMembersCount} Anggota
                      </span>
                      {isEditable && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditGroup(group);
                            }}
                            className="text-xs text-[#0c2340] hover:underline cursor-pointer font-medium flex items-center gap-0.5"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Apakah Anda yakin ingin menghapus komunitas "${group.name}"?`)) {
                                onDeleteGroup(group.id);
                              }
                            }}
                            className="text-xs text-rose-700 hover:underline cursor-pointer font-medium"
                          >
                            Hapus
                          </button>
                        </div>
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
                  <div className="inline-block mb-1.5">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded font-semibold border ${getSpaceBadge(selectedGroup.communitySpace)}`}>
                      {selectedGroup.communitySpace || 'Intimate Space'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedGroup.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Staff Pembina: {selectedGroup.staffAdvisor || '-'}</p>
                  <p className="text-xs text-slate-500">Pemimpin Komunitas: <strong className="text-slate-800">{selectedGroup.leaderName}</strong></p>

                  {selectedGroup.documentationUrl && (
                    <div className="mt-2">
                      <a
                        href={selectedGroup.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-800 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-blue-700" /> Buka Folder Dokumentasi GDrive <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Anggota Kelompok Roster */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Daftar Anggota Terdaftar</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-normal text-slate-600">
                        {activeGroupMembers.length} Orang
                      </span>
                      {isEditable && (
                        <button
                          onClick={() => handleOpenEditGroup(selectedGroup)}
                          className="text-[11px] text-[#0c2340] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                          title="Kelola / Tambah Adik-Adik"
                        >
                          <Plus className="w-3 h-3" /> Tambah
                        </button>
                      )}
                    </div>
                  </h4>
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
                      Belum ada anggota di komunitas ini. Klik <strong>+ Tambah</strong> atau tombol <strong>Edit Data Komunitas</strong> di bawah untuk memilih adik-adik.
                    </div>
                  )}
                </div>

                {isEditable && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <button
                      onClick={() => {
                        setMeetingMaterial(materials[0]?.title || 'Fondasi Iman Kristen (Buku 1)');
                        setIsAddMeetingOpen(true);
                        setActiveSubView('meetings');
                      }}
                      className="w-full py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Presensi Pertemuan Mingguan
                    </button>
                    <button
                      onClick={() => handleOpenEditGroup(selectedGroup)}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Data Komunitas
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                Pilih salah satu komunitas untuk melihat detail anggota & membuat catatan pertemuan.
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBVIEW 2: MATRIKS 3 RUANG KOMUNITAS */}
      {activeSubView === 'matrix' && (
        <div className="space-y-6">
          {/* Header Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#881337]" /> Struktur 3 Ruang Komunitas Pemuridan Misional
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Setiap anggota pelayanan dapat terdaftar dan bertumbuh di <strong>satu, dua, atau ketiga ruang komunitas sekaligus</strong>:
              <span className="font-semibold text-purple-800 ml-1">Core Circle</span> (Tim Inti / Kepemimpinan),
              <span className="font-semibold text-amber-800 ml-1">Intimate Space</span> (Kelompok Kecil Pemuridan / KTB), dan
              <span className="font-semibold text-blue-800 ml-1">Social Space</span> (Persekutuan Terbuka / Misi Kampus).
            </p>
          </div>

          {/* 3 Space Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Column 1: Core Circle */}
            <div className="bg-white border border-purple-200 rounded-lg p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-purple-100">
                <div>
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Ruang 1</span>
                  <h4 className="font-bold text-slate-900 text-sm">Core Circle</h4>
                </div>
                <span className="text-xs bg-purple-100 text-purple-900 font-semibold px-2 py-0.5 rounded">
                  {groups.filter(g => g.communitySpace === 'Core Circle').length} Komunitas
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Lingkar kepemimpinan, perintis pelayanan, dan pengurus inti.</p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {groups.filter(g => g.communitySpace === 'Core Circle').map(g => {
                  const gMembers = members.filter(m => m.coreCircleCommunity === g.name || m.smallGroupId === g.id);
                  return (
                    <div key={g.id} className="p-2.5 bg-purple-50/50 border border-purple-100 rounded text-xs">
                      <div className="flex justify-between items-start font-semibold text-slate-900">
                        <span>{g.name}</span>
                        <span className="text-[10px] text-purple-800 font-normal">{g.region}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span>Pemimpin: {g.leaderName}</span> &bull; <span>{gMembers.length} Anggota</span>
                      </div>
                      {gMembers.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {gMembers.map(m => (
                            <span key={m.id} className="text-[10px] px-1.5 py-0.2 bg-white text-slate-700 rounded border border-purple-200">
                              {m.nickName || m.fullName.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {groups.filter(g => g.communitySpace === 'Core Circle').length === 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-400 italic">
                    Belum ada komunitas Core Circle yang terdaftar.
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Intimate Space */}
            <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-amber-100">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Ruang 2</span>
                  <h4 className="font-bold text-slate-900 text-sm">Intimate Space</h4>
                </div>
                <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">
                  {groups.filter(g => !g.communitySpace || g.communitySpace === 'Intimate Space').length} Komunitas
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Kelompok kecil pemuridan (KTB 3-6 orang) untuk akuntabilitas rohani mendalam.</p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {groups.filter(g => !g.communitySpace || g.communitySpace === 'Intimate Space').map(g => {
                  const gMembers = members.filter(m => m.intimateSpaceCommunity === g.name || m.smallGroupId === g.id);
                  return (
                    <div key={g.id} className="p-2.5 bg-amber-50/50 border border-amber-100 rounded text-xs">
                      <div className="flex justify-between items-start font-semibold text-slate-900">
                        <span>{g.name}</span>
                        <span className="text-[10px] text-amber-800 font-normal">{g.region}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span>Pemimpin: {g.leaderName}</span> &bull; <span>{gMembers.length} Anggota</span>
                      </div>
                      {gMembers.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {gMembers.map(m => (
                            <span key={m.id} className="text-[10px] px-1.5 py-0.2 bg-white text-slate-700 rounded border border-amber-200">
                              {m.nickName || m.fullName.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Social Space */}
            <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-blue-100">
                <div>
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Ruang 3</span>
                  <h4 className="font-bold text-slate-900 text-sm">Social Space</h4>
                </div>
                <span className="text-xs bg-blue-100 text-blue-900 font-semibold px-2 py-0.5 rounded">
                  {groups.filter(g => g.communitySpace === 'Social Space').length} Komunitas
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Persekutuan terbuka, ibadah gabungan regional, dan wadah misi penjangkauan.</p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {groups.filter(g => g.communitySpace === 'Social Space').map(g => {
                  const gMembers = members.filter(m => m.socialSpaceCommunity === g.name || m.smallGroupId === g.id);
                  return (
                    <div key={g.id} className="p-2.5 bg-blue-50/50 border border-blue-100 rounded text-xs">
                      <div className="flex justify-between items-start font-semibold text-slate-900">
                        <span>{g.name}</span>
                        <span className="text-[10px] text-blue-800 font-normal">{g.region}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        <span>Pemimpin: {g.leaderName}</span> &bull; <span>{gMembers.length} Anggota</span>
                      </div>
                      {gMembers.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {gMembers.map(m => (
                            <span key={m.id} className="text-[10px] px-1.5 py-0.2 bg-white text-slate-700 rounded border border-blue-200">
                              {m.nickName || m.fullName.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Member Matrix Cross-Reference Table */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Rekapitulasi Partisipasi Anggota dalam 3 Ruang Komunitas</h4>
                <p className="text-xs text-slate-500">Daftar anggota dan keterlibatan komunitas di setiap ruang.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari anggota atau komunitas..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="py-2.5 px-3 font-semibold">Nama Anggota</th>
                    <th className="py-2.5 px-3 font-semibold">Komponen & Wilayah</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-purple-900 bg-purple-50/50">Core Circle</th>
                    <th className="py-2.5 px-3 font-semibold text-amber-900 bg-amber-50/50">Intimate Space</th>
                    <th className="py-2.5 px-3 font-semibold text-blue-900 bg-blue-50/50">Social Space</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Total Ruang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredMatrixMembers.map((m) => {
                    const spacesCount = [m.coreCircleCommunity, m.intimateSpaceCommunity, m.socialSpaceCommunity].filter(Boolean).length;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{m.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{m.id}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span>{m.component}</span> &bull; <span className="text-slate-500">{m.region}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${m.statusKeaktifan === 'Aktif' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              m.statusKeaktifan === 'Penjangkauan' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                            {m.statusKeaktifan}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 bg-purple-50/20">
                          {m.coreCircleCommunity ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-900">
                              <CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" /> {m.coreCircleCommunity}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 bg-amber-50/20">
                          {m.intimateSpaceCommunity ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900">
                              <CheckCircle2 className="w-3 h-3 text-amber-600 shrink-0" /> {m.intimateSpaceCommunity}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 bg-blue-50/20">
                          {m.socialSpaceCommunity ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900">
                              <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" /> {m.socialSpaceCommunity}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${spacesCount === 3 ? 'bg-emerald-100 text-emerald-900' :
                              spacesCount === 2 ? 'bg-blue-100 text-blue-900' :
                                spacesCount === 1 ? 'bg-amber-100 text-amber-900' :
                                  'bg-slate-100 text-slate-500'
                            }`}>
                            {spacesCount} Ruang
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: MEETINGS & PRESENSI ATTENDANCE ROSTER */}
      {activeSubView === 'meetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* List of past logged meetings */}
          <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Arsip Pertemuan Komunitas Pemuridan</h3>

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
                          <p className="text-xs text-slate-500 mt-0.5">Komunitas: <span className="text-slate-700 font-semibold">{grp?.name}</span> &bull; Tanggal: {meet.date}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                            {meet.attendance.length} Hadir
                          </span>
                          {isEditable && (
                            <button
                              onClick={() => handleEditMeeting(meet)}
                              className="text-xs text-slate-600 hover:text-[#0c2340] cursor-pointer"
                              title="Edit Log Pertemuan"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isEditable && onDeleteMeeting && (
                            <button
                              onClick={() => setDeleteConfirmMeeting(meet)}
                              className="text-xs text-rose-600 hover:text-rose-800 cursor-pointer"
                              title="Hapus Log Pertemuan"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 leading-relaxed italic">
                        "{meet.notes}"
                      </p>

                      {/* Attendance Chips */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {meet.attendance.map(mId => {
                          const mInfo = members.find(m => m.id === mId);
                          return (
                            <span key={mId} className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                              &bull; {mInfo?.fullName || mId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              {meetings.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Belum ada log pertemuan yang tercatat. Gunakan formulir presensi untuk mulai mencatat.
                </div>
              )}
            </div>
          </div>

          {/* Form to log new meeting / edit meeting */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {editingMeeting ? 'Edit Log Pertemuan' : 'Catat Pertemuan Baru'}
              </h3>
              {editingMeeting && (
                <button
                  onClick={() => {
                    setEditingMeeting(null);
                    setMeetingNotes('');
                    setPresentMembers([]);
                  }}
                  className="text-[10px] text-slate-500 hover:underline cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Komunitas Pemuridan :</label>
                <select
                  value={selectedGroup?.id || ''}
                  onChange={(e) => {
                    const grp = groups.find(g => g.id === e.target.value);
                    if (grp) setSelectedGroup(grp);
                  }}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>[{g.communitySpace || 'Intimate'}] {g.name} ({g.region})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Tanggal Temu :</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Bahan Kajian / Materi Kurikulum :</label>
                <select
                  value={meetingMaterial}
                  onChange={(e) => setMeetingMaterial(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Materi dari Kurikulum --</option>
                  {materials.map((mat) => (
                    <option key={mat.id} value={mat.title}>
                      [{mat.category}] {mat.title}
                    </option>
                  ))}
                  {meetingMaterial && !materials.some(m => m.title === meetingMaterial) && (
                    <option value={meetingMaterial}>{meetingMaterial}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Presensi Kehadiran Anggota :</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50">
                  {activeGroupMembers.map(m => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors text-xs">
                      <input
                        type="checkbox"
                        checked={presentMembers.includes(m.id)}
                        onChange={() => toggleAttendance(m.id)}
                        className="rounded text-[#0c2340] focus:ring-0"
                      />
                      <span className="text-slate-800">{m.fullName}</span>
                    </label>
                  ))}
                  {activeGroupMembers.length === 0 && (
                    <span className="text-slate-400 italic text-[11px]">Belum ada anggota terdaftar di komunitas ini.</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Ringkasan Diskusi & Doa :</label>
                <textarea
                  rows={3}
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  placeholder="Catatan pertumbuhan rohani, refleksi pembelajaran, sharing pergumulan..."
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 leading-relaxed focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5 inline mr-1" /> {editingMeeting ? 'Perbarui Log Pertemuan' : 'Simpan Log Presensi'}
              </button>
            </form>
          </div>

        </div>
      )}

      {/* SUBVIEW 4: MATERIALS LIBRARY */}
      {activeSubView === 'materials' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-lg">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Perpustakaan Kurikulum & Modul Pembinaan MMB</h3>
              <p className="text-xs text-slate-500 mt-0.5">Arsip silabus pemuridan, buku renungan, modul kepemimpinan (PKK), dan panduan retreat.</p>
            </div>
            <a
              href={GDRIVE_KURIKULUM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded text-xs font-semibold hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-blue-700" /> Folder Kurikulum GDrive <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(mat => (
              <div key={mat.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                      {mat.category}
                    </span>
                    {isEditable && (
                      <button
                        onClick={() => setDeleteConfirmMaterial(mat)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Hapus Materi"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs leading-snug">{mat.title}</h4>
                  <p className="text-xs text-slate-600 my-2.5 leading-relaxed line-clamp-3">
                    {mat.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {mat.fileSize || 'PDF Modul'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {mat.externalLink && (
                      <a
                        href={mat.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded text-[11px] font-semibold flex items-center gap-1 border border-blue-200"
                        title="Buka Tautan Google Drive"
                      >
                        <FolderOpen className="w-3 h-3" /> GDrive
                      </a>
                    )}
                    <button
                      onClick={() => handleDownloadPDF(mat)}
                      className="px-2.5 py-1 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
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

      {/* MODAL: CREATE COMMUNITY / GROUP */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-6">

            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div>
                <dt className="text-sm font-bold">Buat Komunitas Pemuridan Baru</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Daftarkan rintisan komunitas baru di bawah 3 Ruang Pelayanan MMB.</dd>
              </div>
              <button
                onClick={() => setIsAddGroupOpen(false)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Pilih Ruang Komunitas :</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Core Circle', 'Intimate Space', 'Social Space'] as const).map(space => (
                    <button
                      key={space}
                      type="button"
                      onClick={() => setGroupSpace(space)}
                      className={`py-2 px-2 rounded text-center text-xs font-semibold border transition-all cursor-pointer ${groupSpace === space
                          ? space === 'Core Circle' ? 'bg-purple-700 text-white border-purple-800 shadow-xs' :
                            space === 'Intimate Space' ? 'bg-amber-700 text-white border-amber-800 shadow-xs' :
                              'bg-blue-700 text-white border-blue-800 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {space}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Nama Komunitas :</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Contoh: Tunas Kasih UGM / Tim Inti Kampus"
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
                    {(profile?.regions || []).map((r, idx) => (
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
                    placeholder="Joseph Daniel, S.Th."
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Pemimpin Komunitas :</label>
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
                  placeholder="Contoh: Selasar Perpustakaan UGM / Gazebo GKI"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Tautan Google Drive Foto/Dokumentasi :</label>
                <input
                  type="url"
                  value={groupDocUrl}
                  onChange={(e) => setGroupDocUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 font-mono text-xs focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>

              {/* Member Selection / Adik-Adik Komunitas */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0c2340]" />
                    Pilih Adik-Adik / Anggota Komunitas :
                  </label>
                  <span className="text-[10px] font-semibold bg-[#0c2340] text-white px-2 py-0.5 rounded-full">
                    {addGroupMemberIds.length} Terpilih
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={addGroupMemberSearch}
                    onChange={(e) => setAddGroupMemberSearch(e.target.value)}
                    placeholder="Cari nama adik-adik / anggota..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-white border border-slate-200 rounded p-1.5">
                  {members
                    .filter(m =>
                      m.fullName.toLowerCase().includes(addGroupMemberSearch.toLowerCase()) ||
                      (m.nickName && m.nickName.toLowerCase().includes(addGroupMemberSearch.toLowerCase())) ||
                      (m.component && m.component.toLowerCase().includes(addGroupMemberSearch.toLowerCase()))
                    )
                    .map(m => {
                      const isChecked = addGroupMemberIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-xs ${
                            isChecked ? 'bg-sky-50 border border-sky-200' : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setAddGroupMemberIds(prev =>
                                  prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                );
                              }}
                              className="rounded text-[#0c2340] focus:ring-0"
                            />
                            <div>
                              <span className="font-medium text-slate-800 block">{m.fullName} {m.nickName ? `(${m.nickName})` : ''}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{m.id} &bull; {m.component} &bull; {m.region}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {m.statusKeaktifan}
                          </span>
                        </label>
                      );
                    })}
                  {members.length === 0 && (
                    <div className="text-center py-2 text-slate-400 text-xs italic">
                      Belum ada data anggota di database.
                    </div>
                  )}
                </div>
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
                  <Save className="w-3.5 h-3.5 inline mr-1" /> Simpan Komunitas
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: EDIT COMMUNITY / GROUP */}
      {isEditGroupOpen && editingGroup && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-6">

            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div>
                <dt className="text-sm font-bold">Edit Komunitas Pemuridan</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Perbarui rincian data komunitas #{editingGroup.id}</dd>
              </div>
              <button
                onClick={() => {
                  setIsEditGroupOpen(false);
                  setEditingGroup(null);
                }}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGroup} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Pilih Ruang Komunitas :</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Core Circle', 'Intimate Space', 'Social Space'] as const).map(space => (
                    <button
                      key={space}
                      type="button"
                      onClick={() => setEditGroupSpace(space)}
                      className={`py-2 px-2 rounded text-center text-xs font-semibold border transition-all cursor-pointer ${editGroupSpace === space
                          ? space === 'Core Circle' ? 'bg-purple-700 text-white border-purple-800 shadow-xs' :
                            space === 'Intimate Space' ? 'bg-amber-700 text-white border-amber-800 shadow-xs' :
                              'bg-blue-700 text-white border-blue-800 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {space}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Nama Komunitas :</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Contoh: Tunas Kasih UGM"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Wilayah Pelayanan :</label>
                  <select
                    value={editGroupRegion}
                    onChange={(e) => setEditGroupRegion(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    {(profile?.regions || []).map((r, idx) => (
                      <option key={idx} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Staff Advisor :</label>
                  <input
                    type="text"
                    value={editGroupStaff}
                    onChange={(e) => setEditGroupStaff(e.target.value)}
                    placeholder="Joseph Daniel, S.Th."
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Pemimpin Komunitas :</label>
                <input
                  type="text"
                  value={editGroupLeader}
                  onChange={(e) => setEditGroupLeader(e.target.value)}
                  placeholder="Nama Lengkap Pemimpin..."
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Hari Pertemuan :</label>
                  <select
                    value={editGroupDay}
                    onChange={(e) => setEditGroupDay(e.target.value)}
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
                    value={editGroupTime}
                    onChange={(e) => setEditGroupTime(e.target.value)}
                    placeholder="17:00"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Lokasi Pertemuan :</label>
                <input
                  type="text"
                  value={editGroupLocation}
                  onChange={(e) => setEditGroupLocation(e.target.value)}
                  placeholder="Lokasi pertemuan..."
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Tautan Google Drive Foto/Dokumentasi :</label>
                <input
                  type="url"
                  value={editGroupDocUrl}
                  onChange={(e) => setEditGroupDocUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 font-mono text-xs focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>

              {/* Member Selection / Adik-Adik Komunitas */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#0c2340]" />
                    Pilih Adik-Adik / Anggota Komunitas :
                  </label>
                  <span className="text-[10px] font-semibold bg-[#0c2340] text-white px-2 py-0.5 rounded-full">
                    {editGroupMemberIds.length} Terpilih
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={editGroupMemberSearch}
                    onChange={(e) => setEditGroupMemberSearch(e.target.value)}
                    placeholder="Cari nama adik-adik / anggota..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-white border border-slate-200 rounded p-1.5">
                  {members
                    .filter(m =>
                      m.fullName.toLowerCase().includes(editGroupMemberSearch.toLowerCase()) ||
                      (m.nickName && m.nickName.toLowerCase().includes(editGroupMemberSearch.toLowerCase())) ||
                      (m.component && m.component.toLowerCase().includes(editGroupMemberSearch.toLowerCase()))
                    )
                    .map(m => {
                      const isChecked = editGroupMemberIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-xs ${
                            isChecked ? 'bg-sky-50 border border-sky-200' : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setEditGroupMemberIds(prev =>
                                  prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                );
                              }}
                              className="rounded text-[#0c2340] focus:ring-0"
                            />
                            <div>
                              <span className="font-medium text-slate-800 block">{m.fullName} {m.nickName ? `(${m.nickName})` : ''}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{m.id} &bull; {m.component} &bull; {m.region}</span>
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {m.statusKeaktifan}
                          </span>
                        </label>
                      );
                    })}
                  {members.length === 0 && (
                    <div className="text-center py-2 text-slate-400 text-xs italic">
                      Belum ada data anggota di database.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditGroupOpen(false);
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" /> Simpan Perubahan
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
                <dd className="text-xs text-slate-300 mt-0.5">Arsipkan bahan ajar baru ke dalam Discipleship Library MMB.</dd>
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
