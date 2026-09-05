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
  Upload,
  X,
  UserPlus,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  StickyNote,
  Heart,
  Compass,
  Download,
  FileText,
  Layers,
  Sparkles,
  Award,
  CheckSquare
} from 'lucide-react';
import { Member, MemberNote, PrayerRequest, FollowUpLog, SmallGroup, InstitutionalProfile, Staff } from '../types';
import { exportToCSV, exportMemberGrowthReportToPDF } from '../utils/export';

interface MembersTabProps {
  members: Member[];
  onAddMember: (member: Member) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  smallGroups: SmallGroup[];
  notes: MemberNote[];
  onAddNote: (note: MemberNote) => void;
  onUpdateNote?: (note: MemberNote) => void;
  onDeleteNote?: (id: string) => void;
  prayerRequests: PrayerRequest[];
  onAddPrayerRequest: (p: PrayerRequest) => void;
  onUpdatePrayerRequest?: (p: PrayerRequest) => void;
  onDeletePrayerRequest?: (id: string) => void;
  onUpdatePrayerStatus: (id: string, status: 'Pending' | 'Didoakan' | 'Terjawab', answeredDate?: string, answerNotes?: string) => void;
  followUps: FollowUpLog[];
  onAddFollowUp: (fu: FollowUpLog) => void;
  onUpdateFollowUp?: (fu: FollowUpLog) => void;
  onDeleteFollowUp?: (id: string) => void;
  currentRole: string;
  profile?: InstitutionalProfile;
  staffs?: Staff[];
}

export default function MembersTab({
  members,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  smallGroups,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  prayerRequests,
  onAddPrayerRequest,
  onUpdatePrayerRequest,
  onDeletePrayerRequest,
  onUpdatePrayerStatus,
  followUps,
  onAddFollowUp,
  onUpdateFollowUp,
  onDeleteFollowUp,
  currentRole,
  profile,
  staffs = []
}: MembersTabProps) {
  const isEditable = ['Super Admin', 'Ketua Yayasan', 'Sekretaris', 'Staff', 'Pembina Yayasan'].includes(currentRole);

  // Navigation within sub-tabs in Members
  const [subTab, setSubTab] = useState<'directory' | 'notes' | 'prayers' | 'followup' | 'import'>('directory');

  // States for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterComponent, setFilterComponent] = useState<string>('Semua');
  const [filterSpace, setFilterSpace] = useState<string>('Semua');
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
  const [region, setRegion] = useState(profile?.regions?.[0] || '');

  // 3 Space Communities states
  const [selectedSpaces, setSelectedSpaces] = useState<('Core Circle' | 'Intimate Space' | 'Social Space')[]>(['Intimate Space']);
  const [coreCircleComm, setCoreCircleComm] = useState('');
  const [intimateSpaceComm, setIntimateSpaceComm] = useState('');
  const [socialSpaceComm, setSocialSpaceComm] = useState('');

  const [discipleshipLeader, setDiscipleshipLeader] = useState('');
  const [mentor, setMentor] = useState(''); // Pemimpin Komunitas
  const [staffAdvisor, setStaffAdvisor] = useState('');
  const [statusKeaktifan, setStatusKeaktifan] = useState<'Penjangkauan' | 'Aktif' | 'Pasif' | 'Cuti' | 'Pindah'>('Aktif');

  // Sub-tab States: Adding / Editing Growth Note
  const [editingNote, setEditingNote] = useState<MemberNote | null>(null);
  const [noteCategory, setNoteCategory] = useState<'Penginjilan' | 'Pemuridan' | 'Pengutusan' | string>('Pemuridan');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteContent, setNoteContent] = useState('');
  const [noteCommittee, setNoteCommittee] = useState('');
  const [noteMemberId, setNoteMemberId] = useState('');
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [expandedNoteMemberIds, setExpandedNoteMemberIds] = useState<string[]>([]);

  // Sub-tab States: Adding / Editing prayer
  const [editingPrayer, setEditingPrayer] = useState<PrayerRequest | null>(null);
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerContent, setPrayerContent] = useState('');
  const [prayerMemberId, setPrayerMemberId] = useState('');
  const [prayerDate, setPrayerDate] = useState(new Date().toISOString().split('T')[0]);
  const [prayerStatus, setPrayerStatus] = useState<'Pending' | 'Didoakan' | 'Terjawab'>('Pending');
  const [prayerAnsweredDate, setPrayerAnsweredDate] = useState(new Date().toISOString().split('T')[0]);
  const [prayerAnswerNotes, setPrayerAnswerNotes] = useState('');
  const [prayerSearchQuery, setPrayerSearchQuery] = useState('');
  const [expandedPrayerMemberIds, setExpandedPrayerMemberIds] = useState<string[]>([]);

  // Modal State for Answering Prayer
  const [answeringPrayer, setAnsweringPrayer] = useState<PrayerRequest | null>(null);
  const [modalAnsweredDate, setModalAnsweredDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalAnswerNotes, setModalAnswerNotes] = useState('');

  // Sub-tab States: Adding / Editing follow up
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpLog | null>(null);
  const [followUpType, setFollowUpType] = useState<'Telepon' | 'Kunjungan' | 'Konseling' | 'Mentoring' | 'Pemuridan'>('Konseling');
  const [serviceCategory, setServiceCategory] = useState<'Konseling Akademik' | 'Bimbingan Karir' | 'Konseling Pribadi' | 'Pengutusan Kepemimpinan' | 'Follow Up Kegiatan' | string>('Konseling Pribadi');
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpStaffName, setFollowUpStaffName] = useState('');
  const [followUpMemberId, setFollowUpMemberId] = useState('');
  const [followUpSearchQuery, setFollowUpSearchQuery] = useState('');
  const [expandedFollowUpMemberIds, setExpandedFollowUpMemberIds] = useState<string[]>([]);

  const getMemberInitials = (m: { fullName: string; nickName?: string }) => {
    if (!m.fullName) return '??';
    const words = m.fullName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return m.fullName.slice(0, 2).toUpperCase();
  };

  const toggleExpandNoteMember = (id: string) => {
    setExpandedNoteMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleExpandPrayerMember = (id: string) => {
    setExpandedPrayerMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleExpandFollowUpMember = (id: string) => {
    setExpandedFollowUpMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Excel Bulk Import state
  const [importText, setImportText] = useState(
    "Ahmad Budi|Laki-laki|Jakarta|2005-10-09|081223344|ahmad@budi.com|Kamar 3 Gg. Sukasari|Bandung|Jawa Barat|@ahmadbudi|GKI Bandung|S1 Matematika|Mahasiswa|Mahasiswa|Bandung\n" +
    "Siska Amelia|Perempuan|Jogja|2008-04-22|081928374|siska@amelia.com|Sleman Indah|Yogyakarta|DIY|@siska_amelia|HKBP|SMA|Siswa|Siswa|Yogyakarta"
  );
  const [importStatus, setImportStatus] = useState('');

  // Space helper for form
  const toggleSpaceSelection = (space: 'Core Circle' | 'Intimate Space' | 'Social Space') => {
    setSelectedSpaces(prev =>
      prev.includes(space)
        ? prev.filter(s => s !== space)
        : [...prev, space]
    );
  };

  // Handle open Add Form
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
    setRegion(profile?.regions?.[0] || '');

    setSelectedSpaces(['Intimate Space']);
    setCoreCircleComm('');
    setIntimateSpaceComm(smallGroups.find(g => !g.communitySpace || g.communitySpace === 'Intimate Space')?.name || '');
    setSocialSpaceComm('');

    setDiscipleshipLeader(staffs[0]?.name || 'Joseph Daniel');
    setMentor('Christian Sitorus');
    setStaffAdvisor(staffs[0]?.name || 'Joseph Daniel');
    setStatusKeaktifan('Aktif');
    setIsFormOpen(true);
  };

  // Handle open Edit Form
  const openEditForm = (member: Member) => {
    setEditingMember(member);
    setFullName(member.fullName);
    setNickName(member.nickName);
    setGender(member.gender);
    setBirthPlace(member.birthPlace || '');
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

    const spaces: ('Core Circle' | 'Intimate Space' | 'Social Space')[] = [];
    if (member.coreCircleCommunity) spaces.push('Core Circle');
    if (member.intimateSpaceCommunity || member.smallGroupId) spaces.push('Intimate Space');
    if (member.socialSpaceCommunity) spaces.push('Social Space');
    setSelectedSpaces(spaces.length > 0 ? spaces : ['Intimate Space']);

    setCoreCircleComm(member.coreCircleCommunity || '');
    setIntimateSpaceComm(member.intimateSpaceCommunity || smallGroups.find(g => g.id === member.smallGroupId)?.name || '');
    setSocialSpaceComm(member.socialSpaceCommunity || '');

    setDiscipleshipLeader(member.discipleshipLeader || member.staffAdvisor || '');
    setMentor(member.mentor || '');
    setStaffAdvisor(member.staffAdvisor || '');
    setStatusKeaktifan(member.statusKeaktifan as any || 'Aktif');
    setIsFormOpen(true);
  };

  // Helper to auto generate Member ID
  const generateNewId = (comp: 'Siswa' | 'Mahasiswa' | 'Alumni' | 'Umum') => {
    const currentYear = new Date().getFullYear();
    let prefix = 'EXP';
    if (comp === 'Siswa') prefix = 'ENC';
    else if (comp === 'Alumni') prefix = 'CON';

    let maxSeq = 0;

    const checkId = (id?: string) => {
      if (!id || !id.startsWith(prefix)) return;
      const match = id.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    };

    members.forEach(m => checkId(m.id));
    notes.forEach(n => checkId(n.memberId));
    prayerRequests.forEach(p => checkId(p.memberId));
    followUps.forEach(f => checkId(f.memberId));

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}-${currentYear}-${String(nextSeq).padStart(5, '0')}`;
    while (
      members.some(m => m.id === candidate) ||
      notes.some(n => n.memberId === candidate) ||
      prayerRequests.some(p => p.memberId === candidate) ||
      followUps.some(f => f.memberId === candidate)
    ) {
      nextSeq++;
      candidate = `${prefix}-${currentYear}-${String(nextSeq).padStart(5, '0')}`;
    }
    return candidate;
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nickName) {
      alert('Nama lengkap dan Panggilan wajib diisi!');
      return;
    }

    const matchedIntimateGroup = smallGroups.find(g => g.name === intimateSpaceComm);

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
        communitySpaces: selectedSpaces,
        coreCircleCommunity: selectedSpaces.includes('Core Circle') ? coreCircleComm : undefined,
        intimateSpaceCommunity: selectedSpaces.includes('Intimate Space') ? intimateSpaceComm : undefined,
        socialSpaceCommunity: selectedSpaces.includes('Social Space') ? socialSpaceComm : undefined,
        smallGroupId: selectedSpaces.includes('Intimate Space') && matchedIntimateGroup ? matchedIntimateGroup.id : undefined,
        discipleshipLeader,
        staffAdvisor,
        mentor, // Pemimpin Komunitas
        statusKeaktifan,
      };
      onUpdateMember(updated);
      if (selectedMember?.id === updated.id) {
        setSelectedMember(updated);
      }
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
        communitySpaces: selectedSpaces,
        coreCircleCommunity: selectedSpaces.includes('Core Circle') ? coreCircleComm : undefined,
        intimateSpaceCommunity: selectedSpaces.includes('Intimate Space') ? intimateSpaceComm : undefined,
        socialSpaceCommunity: selectedSpaces.includes('Social Space') ? socialSpaceComm : undefined,
        smallGroupId: selectedSpaces.includes('Intimate Space') && matchedIntimateGroup ? matchedIntimateGroup.id : undefined,
        discipleshipLeader: discipleshipLeader || 'Joseph Daniel',
        staffAdvisor: staffAdvisor || 'Joseph Daniel',
        mentor: mentor || 'Christian Sitorus',
        statusKeaktifan,
        joinedDate: new Date().toISOString().split('T')[0]
      };
      onAddMember(newlyCreated);
      setSelectedMember(newlyCreated);
    }
    setIsFormOpen(false);
  };

  // --- Growth Notes Handlers ---
  const handleStartEditNote = (n: MemberNote) => {
    setEditingNote(n);
    setNoteMemberId(n.memberId);
    setNoteCategory(n.category);
    setNoteDate(n.date || new Date().toISOString().split('T')[0]);
    setNoteContent(n.notes);
    setNoteCommittee(n.committeeNotes || '');
    if (!expandedNoteMemberIds.includes(n.memberId)) {
      setExpandedNoteMemberIds(prev => [...prev, n.memberId]);
    }
  };

  const handleCancelEditNote = () => {
    setEditingNote(null);
    setNoteMemberId('');
    setNoteCategory('Pemuridan');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setNoteContent('');
    setNoteCommittee('');
  };

  const handleSaveNotesForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent || !noteMemberId) {
      alert('Mohon isi catatan pertumbuhan dan pilih anggota');
      return;
    }
    if (editingNote) {
      if (onUpdateNote) {
        onUpdateNote({
          ...editingNote,
          memberId: noteMemberId,
          date: noteDate,
          category: noteCategory,
          notes: noteContent,
          committeeNotes: noteCommittee.trim() || undefined
        });
      }
      handleCancelEditNote();
      alert('Catatan pertumbuhan berhasil diperbarui.');
    } else {
      const newNote: MemberNote = {
        id: `NOTE-${Date.now()}`,
        memberId: noteMemberId,
        date: noteDate,
        category: noteCategory,
        notes: noteContent,
        committeeNotes: noteCommittee.trim() || undefined,
        author: currentRole === 'Staff' ? 'Internal Staff' : `${currentRole}`
      };
      onAddNote(newNote);
      handleCancelEditNote();
      alert('Catatan pertumbuhan & kepengurusan berhasil dicatat.');
    }
  };

  const handleDeleteNoteClick = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan pertumbuhan ini?')) {
      if (onDeleteNote) {
        onDeleteNote(id);
      }
      if (editingNote?.id === id) {
        handleCancelEditNote();
      }
    }
  };

  // --- Prayer Requests Handlers ---
  const handleStartEditPrayer = (p: PrayerRequest) => {
    setEditingPrayer(p);
    setPrayerMemberId(p.memberId);
    setPrayerTitle(p.title);
    setPrayerContent(p.request);
    setPrayerDate(p.date || new Date().toISOString().split('T')[0]);
    setPrayerStatus(p.status || 'Pending');
    setPrayerAnsweredDate(p.answeredDate || new Date().toISOString().split('T')[0]);
    setPrayerAnswerNotes(p.answerNotes || '');
    if (!expandedPrayerMemberIds.includes(p.memberId)) {
      setExpandedPrayerMemberIds(prev => [...prev, p.memberId]);
    }
  };

  const handleCancelEditPrayer = () => {
    setEditingPrayer(null);
    setPrayerMemberId('');
    setPrayerTitle('');
    setPrayerContent('');
    setPrayerDate(new Date().toISOString().split('T')[0]);
    setPrayerStatus('Pending');
    setPrayerAnsweredDate(new Date().toISOString().split('T')[0]);
    setPrayerAnswerNotes('');
  };

  const handleOpenAnswerModal = (p: PrayerRequest) => {
    setAnsweringPrayer(p);
    setModalAnsweredDate(p.answeredDate || new Date().toISOString().split('T')[0]);
    setModalAnswerNotes(p.answerNotes || '');
  };

  const handleCloseAnswerModal = () => {
    setAnsweringPrayer(null);
    setModalAnsweredDate(new Date().toISOString().split('T')[0]);
    setModalAnswerNotes('');
  };

  const handleSaveAnswerModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringPrayer) return;
    onUpdatePrayerStatus(answeringPrayer.id, 'Terjawab', modalAnsweredDate, modalAnswerNotes);
    if (editingPrayer?.id === answeringPrayer.id) {
      setPrayerStatus('Terjawab');
      setPrayerAnsweredDate(modalAnsweredDate);
      setPrayerAnswerNotes(modalAnswerNotes);
    }
    handleCloseAnswerModal();
  };

  const handleSavePrayerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerTitle || !prayerContent || !prayerMemberId) {
      alert('Mohon isi seluruh data prayer request');
      return;
    }
    const memberName = members.find(m => m.id === prayerMemberId)?.fullName || editingPrayer?.memberName || 'Anggota Mandiri';
    if (editingPrayer) {
      if (onUpdatePrayerRequest) {
        onUpdatePrayerRequest({
          ...editingPrayer,
          memberId: prayerMemberId,
          memberName,
          title: prayerTitle,
          request: prayerContent,
          date: prayerDate,
          status: prayerStatus,
          answeredDate: prayerStatus === 'Terjawab' ? prayerAnsweredDate : undefined,
          answerNotes: prayerStatus === 'Terjawab' ? prayerAnswerNotes : undefined
        });
      }
      handleCancelEditPrayer();
      alert('Pokok permohonan doa berhasil diperbarui.');
    } else {
      const newPrayer: PrayerRequest = {
        id: `PRAY-${Date.now()}`,
        memberId: prayerMemberId,
        memberName,
        title: prayerTitle,
        request: prayerContent,
        date: prayerDate,
        status: prayerStatus,
        answeredDate: prayerStatus === 'Terjawab' ? prayerAnsweredDate : undefined,
        answerNotes: prayerStatus === 'Terjawab' ? prayerAnswerNotes : undefined
      };
      onAddPrayerRequest(newPrayer);
      handleCancelEditPrayer();
      alert('Prayer request berhasil diajukan untuk didoakan bersama!');
    }
  };

  const handleDeletePrayerClick = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus permohonan doa ini?')) {
      if (onDeletePrayerRequest) {
        onDeletePrayerRequest(id);
      }
      if (editingPrayer?.id === id) {
        handleCancelEditPrayer();
      }
    }
  };

  // --- Follow-Up Handlers ---
  const handleStartEditFollowUp = (fu: FollowUpLog) => {
    setEditingFollowUp(fu);
    setFollowUpMemberId(fu.memberId);
    setFollowUpType((fu.type as any) || 'Konseling');
    setServiceCategory(fu.serviceCategory || 'Konseling Pribadi');
    setFollowUpDate(fu.date || new Date().toISOString().split('T')[0]);
    setFollowUpNotes(fu.notes);
    setFollowUpStaffName(fu.staffName || currentRole);
    if (!expandedFollowUpMemberIds.includes(fu.memberId)) {
      setExpandedFollowUpMemberIds(prev => [...prev, fu.memberId]);
    }
  };

  const handleCancelEditFollowUp = () => {
    setEditingFollowUp(null);
    setFollowUpMemberId('');
    setFollowUpType('Konseling');
    setServiceCategory('Konseling Pribadi');
    setFollowUpDate(new Date().toISOString().split('T')[0]);
    setFollowUpNotes('');
    setFollowUpStaffName('');
  };

  const handleSaveFollowUpForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpNotes || !followUpMemberId) {
      alert('Mohon isi laporan follow up');
      return;
    }
    const memberName = members.find(m => m.id === followUpMemberId)?.fullName || editingFollowUp?.memberName || 'Anggota';
    if (editingFollowUp) {
      if (onUpdateFollowUp) {
        onUpdateFollowUp({
          ...editingFollowUp,
          memberId: followUpMemberId,
          memberName,
          date: followUpDate,
          type: followUpType,
          serviceCategory,
          notes: followUpNotes,
          staffName: followUpStaffName.trim() || currentRole
        });
      }
      handleCancelEditFollowUp();
      alert('Laporan pendampingan berhasil diperbarui.');
    } else {
      const newLog: FollowUpLog = {
        id: `FU-${Date.now()}`,
        memberId: followUpMemberId,
        memberName,
        date: followUpDate,
        type: followUpType,
        serviceCategory,
        notes: followUpNotes,
        staffName: followUpStaffName.trim() || currentRole
      };
      onAddFollowUp(newLog);
      handleCancelEditFollowUp();
      alert('Laporan pendampingan berhasil tersimpan.');
    }
  };

  const handleDeleteFollowUpClick = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus log pendampingan ini?')) {
      if (onDeleteFollowUp) {
        onDeleteFollowUp(id);
      }
      if (editingFollowUp?.id === id) {
        handleCancelEditFollowUp();
      }
    }
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
            staffAdvisor: 'Joseph Daniel',
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

    let matchesSpace = true;
    if (filterSpace === 'Core Circle') {
      matchesSpace = !!member.coreCircleCommunity;
    } else if (filterSpace === 'Intimate Space') {
      matchesSpace = !!member.intimateSpaceCommunity || !!member.smallGroupId;
    } else if (filterSpace === 'Social Space') {
      matchesSpace = !!member.socialSpaceCommunity;
    }

    return matchesSearch && matchesComponent && matchesSpace;
  });

  const handleExportCSV = () => {
    const headers = [
      'ID Anggota',
      'Nama Lengkap',
      'Nama Panggilan',
      'Jenis Kelamin',
      'Komponen',
      'Wilayah',
      'Status Keaktifan',
      'Core Circle',
      'Intimate Space',
      'Social Space',
      'Pemimpin Pemuridan',
      'Pemimpin Komunitas',
      'Staff Pendamping',
      'No. Telepon',
      'Email',
      'Pendidikan',
      'Pekerjaan',
      'Gereja Asal',
      'Kota',
      'Tanggal Bergabung'
    ];
    const keys = [
      'id',
      'fullName',
      'nickName',
      'gender',
      'component',
      'region',
      'statusKeaktifan',
      'coreCircleCommunity',
      'intimateSpaceCommunity',
      'socialSpaceCommunity',
      'discipleshipLeader',
      'mentor',
      'staffAdvisor',
      'phone',
      'email',
      'education',
      'occupation',
      'originalChurch',
      'city',
      'joinedDate'
    ];
    exportToCSV(filteredMembers, headers, keys, `data_anggota_pelayanan_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  const handleExportSinglePDF = (member: Member) => {
    exportMemberGrowthReportToPDF(member, notes, prayerRequests, followUps, profile);
  };

  // Filtered notes for Growth subtab
  const filteredNotes = notes.filter(n => {
    if (!noteSearchQuery) return true;
    const m = members.find(mem => mem.id === n.memberId);
    const memberMatch = m ? m.fullName.toLowerCase().includes(noteSearchQuery.toLowerCase()) : false;
    const notesMatch = n.notes.toLowerCase().includes(noteSearchQuery.toLowerCase());
    const commMatch = n.committeeNotes ? n.committeeNotes.toLowerCase().includes(noteSearchQuery.toLowerCase()) : false;
    return memberMatch || notesMatch || commMatch;
  });

  return (
    <div className="space-y-6">

      {/* Tab Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#0c2340]">Manajemen Anggota Pelayanan</h2>
          <p className="text-xs text-slate-500 mt-0.5">Database terpadu keanggotaan, 3 Ruang Komunitas Pemuridan, catatan pertumbuhan, & monitoring pendampingan.</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {subTab === 'directory' && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs text-slate-700 transition-colors"
                title="Ekspor Seluruh Anggota ke CSV"
              >
                <Download className="w-4 h-4 text-slate-600" /> Ekspor Semua (CSV)
              </button>
              {isEditable && (
                <button
                  onClick={openAddForm}
                  className="px-3.5 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> Registrasi Anggota
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Internal Subtabs Selector */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 sm:gap-2">
        <button
          onClick={() => setSubTab('directory')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${subTab === 'directory'
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
          Database Anggota
        </button>
        <button
          onClick={() => setSubTab('notes')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${subTab === 'notes'
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
          Catatan Pertumbuhan
        </button>
        <button
          onClick={() => setSubTab('prayers')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${subTab === 'prayers'
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
          Permohonan Doa
        </button>
        <button
          onClick={() => setSubTab('followup')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${subTab === 'followup'
              ? 'border-[#0c2340] text-[#0c2340] bg-slate-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
          Log Pendampingan
        </button>
        <button
          onClick={() => setSubTab('import')}
          className={`px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer border-b-2 ${subTab === 'import'
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
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filterComponent}
                    onChange={(e) => setFilterComponent(e.target.value)}
                    className="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    <option value="Semua">Semua Komponen</option>
                    {(profile?.memberComponents || ["Siswa", "Mahasiswa", "Alumni", "Umum"]).map((comp, idx) => (
                      <option key={idx} value={comp}>{comp}</option>
                    ))}
                  </select>
                  <select
                    value={filterSpace}
                    onChange={(e) => setFilterSpace(e.target.value)}
                    className="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    <option value="Semua">Semua Ruang</option>
                    <option value="Core Circle">Core Circle</option>
                    <option value="Intimate Space">Intimate Space</option>
                    <option value="Social Space">Social Space</option>
                  </select>
                </div>
              </div>

              {/* Members List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3.5">ID / Nama Anggota</th>
                      <th className="p-3.5">Komponen / Wilayah</th>
                      <th className="p-3.5">3 Ruang Komunitas</th>
                      <th className="p-3.5">Pemimpin & Staff</th>
                      <th className="p-3.5">Status Keaktifan</th>
                      {isEditable && <th className="p-3.5 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredMembers.map((member) => {
                      const spaces = [];
                      if (member.coreCircleCommunity) spaces.push({ name: member.coreCircleCommunity, type: 'Core Circle', color: 'bg-purple-50 text-purple-800 border-purple-200' });
                      if (member.intimateSpaceCommunity || member.smallGroupId) {
                        const grpName = member.intimateSpaceCommunity || smallGroups.find(g => g.id === member.smallGroupId)?.name || 'KTB';
                        spaces.push({ name: grpName, type: 'Intimate Space', color: 'bg-amber-50 text-amber-800 border-amber-200' });
                      }
                      if (member.socialSpaceCommunity) spaces.push({ name: member.socialSpaceCommunity, type: 'Social Space', color: 'bg-blue-50 text-blue-800 border-blue-200' });

                      return (
                        <tr
                          key={member.id}
                          onClick={() => setSelectedMember(member)}
                          className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${selectedMember?.id === member.id ? 'bg-slate-100/70 font-semibold' : ''
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
                            <div className="flex flex-col gap-1">
                              {spaces.length > 0 ? (
                                spaces.map((sp, idx) => (
                                  <span key={idx} className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border inline-block truncate max-w-[150px] ${sp.color}`}>
                                    [{sp.type.split(' ')[0]}] {sp.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Belum terdaftar ruang</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-slate-800 truncate">Pemuridan: {member.discipleshipLeader || '-'}</div>
                            <span className="text-xs text-slate-500">Staff: {member.staffAdvisor || '-'}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${member.statusKeaktifan === 'Aktif' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                member.statusKeaktifan === 'Penjangkauan' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                  'bg-slate-100 text-slate-700 border border-slate-200'
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
                                    if (window.confirm(`Apakah Anda yakin ingin menghapus data anggota "${member.fullName}"?`)) {
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-600">
              <span>Menampilkan {filteredMembers.length} dari {members.length} Anggota</span>
              <span className="text-xs text-slate-500">Database Yayasan Terintegrasi</span>
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
                  <div className="mt-2 flex justify-center gap-2 flex-wrap">
                    <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded text-xs font-semibold">
                      {selectedMember.component}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${selectedMember.statusKeaktifan === 'Aktif' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        selectedMember.statusKeaktifan === 'Penjangkauan' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                      {selectedMember.statusKeaktifan}
                    </span>
                    {selectedMember.committeeRole && (
                      <span className="bg-[#881337]/10 text-[#881337] border border-[#881337]/20 px-2 py-0.5 rounded text-xs font-semibold">
                        👑 {selectedMember.committeeRole}
                      </span>
                    )}
                  </div>

                  {/* Export Individual PDF Report Button */}
                  <div className="mt-3">
                    <button
                      onClick={() => handleExportSinglePDF(selectedMember)}
                      className="w-full py-1.5 px-3 bg-[#881337] hover:bg-[#9f1239] text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Ekspor Rapor Pertumbuhan (PDF)
                    </button>
                  </div>
                </div>

                {/* Sub-details lists */}
                <div className="space-y-4 text-xs">
                  <h4 className="text-xs font-bold text-[#0c2340] uppercase tracking-wider">Biodata Pribadi</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Kontak / WA:</span>
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
                      <span className="text-slate-500 block text-[11px]">Alamat & Medsos:</span>
                      <span className="text-slate-900 font-medium block">{selectedMember.address || '-'}, {selectedMember.city || '-'} ({selectedMember.instagram || '-'})</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-[#0c2340] uppercase tracking-wider pt-3 border-t border-slate-200">Struktur 3 Ruang Komunitas</h4>

                  <div className="space-y-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-purple-900">1. Core Circle:</span>
                      <span className="font-medium text-slate-800">{selectedMember.coreCircleCommunity || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-amber-900">2. Intimate Space:</span>
                      <span className="font-medium text-slate-800">{selectedMember.intimateSpaceCommunity || smallGroups.find(g => g.id === selectedMember.smallGroupId)?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-blue-900">3. Social Space:</span>
                      <span className="font-medium text-slate-800">{selectedMember.socialSpaceCommunity || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Pemimpin Pemuridan:</span>
                      <span className="text-[#0c2340] font-semibold">{selectedMember.discipleshipLeader || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Pemimpin Komunitas:</span>
                      <span className="text-slate-900 font-medium">{selectedMember.mentor || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-[11px]">Staff Pendamping:</span>
                      <span className="text-slate-900 font-medium">{selectedMember.staffAdvisor || '-'}</span>
                    </div>
                  </div>

                  {/* Growth History Preview inside drawer */}
                  <div className="pt-3 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-[#0c2340] uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Catatan Pertumbuhan Terakhir</span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-normal text-slate-600">
                        {notes.filter(n => n.memberId === selectedMember.id).length} Catatan
                      </span>
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {notes.filter(n => n.memberId === selectedMember.id).map(n => (
                        <div key={n.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-semibold text-[10px] text-purple-900 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                              {n.category}
                            </span>
                            <span className="text-[10px] text-slate-400">{n.date}</span>
                          </div>
                          <p className="text-slate-700 text-[11px] line-clamp-2 italic">"{n.notes}"</p>
                          {n.committeeNotes && (
                            <p className="text-[#881337] font-semibold text-[10px] mt-0.5">Kepengurusan: {n.committeeNotes}</p>
                          )}
                        </div>
                      ))}
                      {notes.filter(n => n.memberId === selectedMember.id).length === 0 && (
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center text-slate-400 italic text-[11px]">
                          Belum ada catatan pertumbuhan rohani tercatat.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Growth Note / Prayer Trigger */}
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => {
                        setNoteMemberId(selectedMember.id);
                        setSubTab('notes');
                      }}
                      className="flex-1 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-slate-500" /> Catat Pertumbuhan
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
                <p className="text-xs px-4 mt-1 text-slate-500 leading-relaxed">Klik salah satu baris di tabel untuk melihat profil lengkap, 3 Ruang Komunitas, riwayat pertumbuhan, dan ekspor rapor.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB 2: CATATAN PERTUMBUHAN (GROUPED BY ANGGOTA PELAYANAN) */}
      {subTab === 'notes' && (
        <div className={isEditable ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6"}>

          {/* Member-grouped list */}
          <div className={isEditable ? "lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4" : "w-full bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4"}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Catatan Pertumbuhan per Anggota</h3>
                <p className="text-xs text-slate-500 mt-0.5">Daftar riwayat bimbingan rohani, komitmen misi, dan pengutusan terkelompok per anggota</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama anggota atau catatan..."
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>
            </div>

            {/* Grouped member accordion cards */}
            {(() => {
              // Group notes by member
              const query = noteSearchQuery.toLowerCase().trim();
              const matchingMembers = members.filter(m => {
                const nameMatches = m.fullName.toLowerCase().includes(query) || m.nickName.toLowerCase().includes(query) || m.id.toLowerCase().includes(query);
                const memberNotes = notes.filter(n => n.memberId === m.id);
                const noteMatches = memberNotes.some(n => 
                  n.notes.toLowerCase().includes(query) || 
                  (n.committeeNotes && n.committeeNotes.toLowerCase().includes(query)) ||
                  n.category.toLowerCase().includes(query)
                );
                return query ? (nameMatches || noteMatches) : memberNotes.length > 0;
              });

              if (matchingMembers.length === 0) {
                return (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 space-y-2">
                    <StickyNote className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">Tidak ada catatan pertumbuhan yang ditemukan</p>
                    <p className="text-[11px] text-slate-400">Gunakan form di samping untuk menambahkan catatan pertumbuhan anggota pertama.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-160 overflow-y-auto pr-1">
                  {matchingMembers.map(member => {
                    const memberNotes = notes.filter(n => n.memberId === member.id);
                    const isExpanded = expandedNoteMemberIds.includes(member.id) || (query.length > 0 && matchingMembers.length <= 3);

                    return (
                      <div key={member.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs transition-all">
                        {/* Member Header */}
                        <div 
                          onClick={() => toggleExpandNoteMember(member.id)}
                          className="p-3.5 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-3 border-b border-slate-100 select-none transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0c2340] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {getMemberInitials(member)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900">{member.fullName}</h4>
                                <span className="text-[10px] font-mono text-slate-500">[{member.id}]</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {member.component} &bull; {member.region} {member.committeeRole ? `• ${member.committeeRole}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                              {memberNotes.length} Catatan
                            </span>
                            {isEditable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNoteMemberId(member.id);
                                }}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-[#0c2340] border border-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Tambah Catatan untuk Anggota Ini"
                              >
                                <Plus className="w-3 h-3" /> Tambah
                              </button>
                            )}
                            <div className="text-slate-400 hover:text-slate-600">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Notes List for this member */}
                        {isExpanded && (
                          <div className="p-4 space-y-3 bg-white">
                            {memberNotes.length > 0 ? (
                              <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-4">
                                {memberNotes.map(n => (
                                  <div key={n.id} className="relative space-y-1.5">
                                    <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#0c2340] border-2 border-white"></span>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                        n.category === 'Penginjilan' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                        n.category === 'Pemuridan' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                        'bg-blue-50 text-blue-800 border-blue-200'
                                      }`}>
                                        {n.category}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-500">{n.date}</span>
                                        {isEditable && (
                                          <div className="flex items-center gap-1.5 ml-1">
                                            <button
                                              onClick={() => handleStartEditNote(n)}
                                              className="text-xs text-[#0c2340] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                              title="Edit Catatan"
                                            >
                                              <Edit className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                              onClick={() => handleDeleteNoteClick(n.id)}
                                              className="text-xs text-rose-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                              title="Hapus Catatan"
                                            >
                                              <Trash className="w-3 h-3" /> Hapus
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                                      "{n.notes}"
                                    </p>
                                    {n.committeeNotes && (
                                      <div className="bg-slate-100 border border-slate-200 p-2 rounded text-[11px] flex items-center gap-1.5 text-slate-800 font-medium">
                                        <Award className="w-3.5 h-3.5 text-[#0c2340] shrink-0" />
                                        <span>Kepengurusan: <strong>{n.committeeNotes}</strong></span>
                                      </div>
                                    )}
                                    <div className="text-[10px] text-slate-400">
                                      Pencatat: <span className="text-slate-600 font-medium">{n.author}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-xs text-slate-400 italic">
                                Belum ada catatan pertumbuhan untuk anggota ini.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          </div>

          {/* Form to add / edit growth note */}
          {isEditable && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center mb-3.5 border-b border-slate-200 pb-2.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  {editingNote ? <Edit className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-slate-600" />}
                  {editingNote ? 'Edit Catatan Pertumbuhan' : 'Catat Pertumbuhan Anggota'}
                </h3>
                {editingNote && (
                  <button
                    type="button"
                    onClick={handleCancelEditNote}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Batal Edit
                  </button>
                )}
              </div>
              <form onSubmit={handleSaveNotesForm} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Anggota Pelayanan :</label>
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
                  <label className="text-slate-700 font-semibold block mb-1">Tanggal Catatan :</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Kategori Tahap Pelayanan :</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    <option value="Penginjilan">Penginjilan (Penjangkauan Jiwa)</option>
                    <option value="Pemuridan">Pemuridan (Pertumbuhan KTB)</option>
                    <option value="Pengutusan">Pengutusan (Kepemimpinan & Misi)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Catatan Kepengurusan / Kepanitiaan (Opsional) :</label>
                  <input
                    type="text"
                    value={noteCommittee}
                    onChange={(e) => setNoteCommittee(e.target.value)}
                    placeholder="Contoh: Koordinator Acara Retret / Sie Doa"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Detail Catatan Pertumbuhan Rohani :</label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan perkembangan bimbingan rohani, pembentukan karakter murid Kristus, refleksi firman..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  {editingNote && (
                    <button
                      type="button"
                      onClick={handleCancelEditNote}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {editingNote ? 'Simpan Perubahan Catatan' : 'Simpan Catatan Pertumbuhan'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB 3: PRAYER REQUESTS BOARD (GROUPED BY ANGGOTA) */}
      {subTab === 'prayers' && (
        <div className={isEditable ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6"}>

          {/* Prayer directory list grouped by member */}
          <div className={isEditable ? "lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4" : "w-full bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4"}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Pokok Permohonan Doa per Anggota</h3>
                <p className="text-xs text-slate-500 mt-0.5">Daftar permohonan doa bersama komunitas pemuridan terkelompok per nama anggota</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama anggota atau topik doa..."
                  value={prayerSearchQuery}
                  onChange={(e) => setPrayerSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>
            </div>

            {(() => {
              const query = prayerSearchQuery.toLowerCase().trim();
              const matchingMembers = members.filter(m => {
                const nameMatches = m.fullName.toLowerCase().includes(query) || m.nickName.toLowerCase().includes(query) || m.id.toLowerCase().includes(query);
                const memberPrayers = prayerRequests.filter(p => p.memberId === m.id || p.memberName?.toLowerCase() === m.fullName.toLowerCase());
                const prayerMatches = memberPrayers.some(p => 
                  p.title.toLowerCase().includes(query) || 
                  p.request.toLowerCase().includes(query) || 
                  p.status.toLowerCase().includes(query)
                );
                return query ? (nameMatches || prayerMatches) : memberPrayers.length > 0;
              });

              // Orphan prayers whose memberId/name isn't in active members list
              const orphanPrayers = prayerRequests.filter(p => 
                !members.some(m => m.id === p.memberId || m.fullName.toLowerCase() === p.memberName?.toLowerCase()) &&
                (!query || p.title.toLowerCase().includes(query) || p.request.toLowerCase().includes(query) || (p.memberName && p.memberName.toLowerCase().includes(query)) || p.status.toLowerCase().includes(query))
              );

              if (matchingMembers.length === 0 && orphanPrayers.length === 0) {
                return (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 space-y-2">
                    <Heart className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">Tidak ada pokok doa yang ditemukan</p>
                    <p className="text-[11px] text-slate-400">Gunakan form di samping untuk mengajukan pokok permohonan doa baru.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-160 overflow-y-auto pr-1">
                  {matchingMembers.map(member => {
                    const memberPrayers = prayerRequests.filter(p => p.memberId === member.id || p.memberName?.toLowerCase() === member.fullName.toLowerCase());
                    const isExpanded = expandedPrayerMemberIds.includes(member.id) || (query.length > 0 && matchingMembers.length <= 3);
                    const answeredCount = memberPrayers.filter(p => p.status === 'Terjawab').length;

                    return (
                      <div key={member.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs transition-all">
                        {/* Member Header */}
                        <div 
                          onClick={() => toggleExpandPrayerMember(member.id)}
                          className="p-3.5 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-3 border-b border-slate-100 select-none transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0c2340] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {getMemberInitials(member)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900">{member.fullName}</h4>
                                <span className="text-[10px] font-mono text-slate-500">[{member.id}]</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {member.component} &bull; {member.region}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                              {memberPrayers.length} Doa {answeredCount > 0 ? `(${answeredCount} Terjawab)` : ''}
                            </span>
                            {isEditable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrayerMemberId(member.id);
                                }}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-[#0c2340] border border-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Ajukan Pokok Doa untuk Anggota Ini"
                              >
                                <Plus className="w-3 h-3" /> Ajukan
                              </button>
                            )}
                            <div className="text-slate-400 hover:text-slate-600">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Prayer List */}
                        {isExpanded && (
                          <div className="p-4 space-y-3 bg-white divide-y divide-slate-100">
                            {memberPrayers.length > 0 ? (
                              memberPrayers.map(p => (
                                <div key={p.id} className="pt-3 first:pt-0 space-y-2">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-900">{p.title}</h5>
                                      <span className="text-[10px] text-slate-400">{p.date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        p.status === 'Terjawab' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                        p.status === 'Didoakan' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                        'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                        {p.status}
                                      </span>
                                      {isEditable && (
                                        <div className="flex items-center gap-1.5 ml-1">
                                          <button
                                            onClick={() => handleStartEditPrayer(p)}
                                            className="text-xs text-[#0c2340] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                            title="Edit Pokok Doa"
                                          >
                                            <Edit className="w-3 h-3" /> Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeletePrayerClick(p.id)}
                                            className="text-xs text-rose-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                            title="Hapus Pokok Doa"
                                          >
                                            <Trash className="w-3 h-3" /> Hapus
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-700 italic leading-relaxed py-2 pl-3 border-l-2 border-slate-300 bg-slate-50/50 rounded-r">
                                    "{p.request}"
                                  </p>

                                  {/* Detail Jawaban Doa */}
                                  {p.status === 'Terjawab' && (
                                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 space-y-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Puji Tuhan, Doa Terjawab!</span>
                                          {p.answeredDate && (
                                            <span className="text-[10px] font-normal text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                              Tgl: {p.answeredDate}
                                            </span>
                                          )}
                                        </div>
                                        {isEditable && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenAnswerModal(p)}
                                            className="text-[10px] text-emerald-700 hover:text-emerald-900 hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                                          >
                                            <Edit className="w-2.5 h-2.5" /> {p.answerNotes ? 'Edit Catatan' : '+ Catat Jawaban'}
                                          </button>
                                        )}
                                      </div>
                                      {p.answerNotes ? (
                                        <p className="text-xs text-slate-800 bg-white/90 p-2.5 rounded border border-emerald-100 leading-relaxed font-medium">
                                          {p.answerNotes}
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-emerald-700/80 italic">
                                          (Belum ada catatan kesaksian jawaban doa)
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {isEditable && (
                                    <div className="flex gap-1.5 justify-end pt-1 flex-wrap items-center">
                                      <span className="text-[11px] text-slate-500">Ubah Status:</span>
                                      <button
                                        onClick={() => onUpdatePrayerStatus(p.id, 'Pending')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors border ${
                                          p.status === 'Pending' ? 'bg-slate-200 text-slate-800 border-slate-400 font-bold' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-300'
                                        }`}
                                      >
                                        Pending
                                      </button>
                                      <button
                                        onClick={() => onUpdatePrayerStatus(p.id, 'Didoakan')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors border ${
                                          p.status === 'Didoakan' ? 'bg-blue-100 text-blue-800 border-blue-400 font-bold' : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
                                        }`}
                                      >
                                        Sedang Didoakan
                                      </button>
                                      <button
                                        onClick={() => handleOpenAnswerModal(p)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors border flex items-center gap-1 ${
                                          p.status === 'Terjawab' ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                        }`}
                                      >
                                        <Sparkles className="w-3 h-3" />
                                        Puji Tuhan, Terjawab!
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-xs text-slate-400 italic">
                                Belum ada permohonan doa untuk anggota ini.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Orphan prayers section */}
                  {orphanPrayers.length > 0 && (
                    <div className="border border-amber-200 rounded-lg bg-amber-50/30 overflow-hidden shadow-2xs">
                      <div className="p-3.5 bg-amber-100/50 flex items-center justify-between border-b border-amber-200">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-amber-700" />
                          <h4 className="text-xs font-bold text-amber-900">Pokok Doa Lainnya / Non-Terdaftar ({orphanPrayers.length})</h4>
                        </div>
                      </div>
                      <div className="p-4 space-y-3 bg-white divide-y divide-slate-100">
                        {orphanPrayers.map(p => (
                          <div key={p.id} className="pt-3 first:pt-0 space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h5 className="text-xs font-bold text-slate-900">{p.title}</h5>
                                <p className="text-[10px] text-slate-500">Pemohon: <strong>{p.memberName || p.memberId}</strong> &bull; {p.date}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.status === 'Terjawab' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                  p.status === 'Didoakan' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                  'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {p.status}
                                </span>
                                {isEditable && (
                                  <div className="flex items-center gap-1.5 ml-1">
                                    <button
                                      onClick={() => handleStartEditPrayer(p)}
                                      className="text-xs text-[#0c2340] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                      title="Edit Pokok Doa"
                                    >
                                      <Edit className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeletePrayerClick(p.id)}
                                      className="text-xs text-rose-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                      title="Hapus Pokok Doa"
                                    >
                                      <Trash className="w-3 h-3" /> Hapus
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 italic leading-relaxed py-2 pl-3 border-l-2 border-amber-300 bg-slate-50/50 rounded-r">
                              "{p.request}"
                            </p>

                            {/* Detail Jawaban Doa */}
                            {p.status === 'Terjawab' && (
                              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Puji Tuhan, Doa Terjawab!</span>
                                    {p.answeredDate && (
                                      <span className="text-[10px] font-normal text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                        Tgl: {p.answeredDate}
                                      </span>
                                    )}
                                  </div>
                                  {isEditable && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAnswerModal(p)}
                                      className="text-[10px] text-emerald-700 hover:text-emerald-900 hover:underline font-semibold cursor-pointer flex items-center gap-0.5"
                                    >
                                      <Edit className="w-2.5 h-2.5" /> {p.answerNotes ? 'Edit Catatan' : '+ Catat Jawaban'}
                                    </button>
                                  )}
                                </div>
                                {p.answerNotes ? (
                                  <p className="text-xs text-slate-800 bg-white/90 p-2.5 rounded border border-emerald-100 leading-relaxed font-medium">
                                    {p.answerNotes}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-emerald-700/80 italic">
                                    (Belum ada catatan kesaksian jawaban doa)
                                  </p>
                                )}
                              </div>
                            )}

                            {isEditable && (
                              <div className="flex gap-1.5 justify-end pt-1 flex-wrap items-center">
                                <span className="text-[11px] text-slate-500">Ubah Status:</span>
                                <button
                                  onClick={() => onUpdatePrayerStatus(p.id, 'Pending')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors border ${
                                    p.status === 'Pending' ? 'bg-slate-200 text-slate-800 border-slate-400 font-bold' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-300'
                                  }`}
                                >
                                  Pending
                                </button>
                                <button
                                  onClick={() => onUpdatePrayerStatus(p.id, 'Didoakan')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors border ${
                                    p.status === 'Didoakan' ? 'bg-blue-100 text-blue-800 border-blue-400 font-bold' : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  Sedang Didoakan
                                </button>
                                <button
                                  onClick={() => handleOpenAnswerModal(p)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors border flex items-center gap-1 ${
                                    p.status === 'Terjawab' ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  <Sparkles className="w-3 h-3" />
                                  Puji Tuhan, Terjawab!
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Form to add / edit prayer */}
          {isEditable && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center mb-3.5 border-b border-slate-200 pb-2.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  {editingPrayer ? <Edit className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-slate-600" />}
                  {editingPrayer ? 'Edit Pokok Permohonan Doa' : 'Ajukan Pokok Doa Baru'}
                </h3>
                {editingPrayer && (
                  <button
                    type="button"
                    onClick={handleCancelEditPrayer}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Batal Edit
                  </button>
                )}
              </div>
              <form onSubmit={handleSavePrayerForm} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Nama Anggota Pemohon :</label>
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
                  <label className="text-slate-700 font-semibold block mb-1">Tanggal Permohonan :</label>
                  <input
                    type="date"
                    value={prayerDate}
                    onChange={(e) => setPrayerDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Judul / Topik Doa :</label>
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
                  <label className="text-slate-700 font-semibold block mb-1">Detail Pokok Doa :</label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan pokok permohonan doa secara jelas..."
                    value={prayerContent}
                    onChange={(e) => setPrayerContent(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Status Pokok Doa :</label>
                  <select
                    value={prayerStatus}
                    onChange={(e) => setPrayerStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    <option value="Pending">Pending (Baru)</option>
                    <option value="Didoakan">Didoakan (Sedang Berjalan)</option>
                    <option value="Terjawab">Terjawab (Selesai/Puji Tuhan)</option>
                  </select>
                </div>

                {prayerStatus === 'Terjawab' && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-3">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Detail Jawaban Doa & Kesaksian</span>
                    </div>

                    <div>
                      <label className="text-slate-700 font-semibold block mb-1">Tanggal Jawaban Doa :</label>
                      <input
                        type="date"
                        value={prayerAnsweredDate}
                        onChange={(e) => setPrayerAnsweredDate(e.target.value)}
                        className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                        required={prayerStatus === 'Terjawab'}
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 font-semibold block mb-1">Catatan Kesaksian / Jawaban :</label>
                      <textarea
                        rows={3}
                        placeholder="Tuliskan bagaimana Tuhan menjawab doa ini, kesaksian syukur, atau catatan tindak lanjut..."
                        value={prayerAnswerNotes}
                        onChange={(e) => setPrayerAnswerNotes(e.target.value)}
                        className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                        required={prayerStatus === 'Terjawab'}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingPrayer && (
                    <button
                      type="button"
                      onClick={handleCancelEditPrayer}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {editingPrayer ? 'Simpan Perubahan Doa' : 'Kirimkan Pokok Doa'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB 4: FOLLOW UP WORKSPACE (GROUPED BY ANGGOTA) */}
      {subTab === 'followup' && (
        <div className={isEditable ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6"}>

          {/* List of past follow ups grouped by member */}
          <div className={isEditable ? "lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4" : "w-full bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4"}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Riwayat Pendampingan per Anggota</h3>
                <p className="text-xs text-slate-500 mt-0.5">Catatan interaksi personal, konseling, dan tindak lanjut terkelompok per nama anggota</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama anggota atau topik konseling..."
                  value={followUpSearchQuery}
                  onChange={(e) => setFollowUpSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>
            </div>

            {(() => {
              const query = followUpSearchQuery.toLowerCase().trim();
              const matchingMembers = members.filter(m => {
                const nameMatches = m.fullName.toLowerCase().includes(query) || m.nickName.toLowerCase().includes(query) || m.id.toLowerCase().includes(query);
                const memberFollowUps = followUps.filter(fu => fu.memberId === m.id || fu.memberName?.toLowerCase() === m.fullName.toLowerCase());
                const fuMatches = memberFollowUps.some(fu => 
                  fu.notes.toLowerCase().includes(query) || 
                  fu.serviceCategory?.toLowerCase().includes(query) ||
                  fu.type.toLowerCase().includes(query)
                );
                return query ? (nameMatches || fuMatches) : memberFollowUps.length > 0;
              });

              // Orphan follow-ups whose memberId/name isn't in active members list
              const orphanFollowUps = followUps.filter(fu => 
                !members.some(m => m.id === fu.memberId || m.fullName.toLowerCase() === fu.memberName?.toLowerCase()) &&
                (!query || fu.notes.toLowerCase().includes(query) || fu.serviceCategory?.toLowerCase().includes(query) || (fu.memberName && fu.memberName.toLowerCase().includes(query)) || fu.type.toLowerCase().includes(query))
              );

              if (matchingMembers.length === 0 && orphanFollowUps.length === 0) {
                return (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 space-y-2">
                    <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">Tidak ada log pendampingan yang ditemukan</p>
                    <p className="text-[11px] text-slate-400">Gunakan form di samping untuk mencatat log interaksi pendampingan anggota.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-160 overflow-y-auto pr-1">
                  {matchingMembers.map(member => {
                    const memberFollowUps = followUps.filter(fu => fu.memberId === member.id || fu.memberName?.toLowerCase() === member.fullName.toLowerCase());
                    const isExpanded = expandedFollowUpMemberIds.includes(member.id) || (query.length > 0 && matchingMembers.length <= 3);

                    return (
                      <div key={member.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs transition-all">
                        {/* Member Header */}
                        <div 
                          onClick={() => toggleExpandFollowUpMember(member.id)}
                          className="p-3.5 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between gap-3 border-b border-slate-100 select-none transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#0c2340] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              {getMemberInitials(member)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900">{member.fullName}</h4>
                                <span className="text-[10px] font-mono text-slate-500">[{member.id}]</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {member.component} &bull; {member.region}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                              {memberFollowUps.length} Pendampingan
                            </span>
                            {isEditable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFollowUpMemberId(member.id);
                                }}
                                className="px-2 py-1 bg-white hover:bg-slate-100 text-[#0c2340] border border-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Catat Pendampingan untuk Anggota Ini"
                              >
                                <Plus className="w-3 h-3" /> Catat
                              </button>
                            )}
                            <div className="text-slate-400 hover:text-slate-600">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Follow Up List */}
                        {isExpanded && (
                          <div className="p-4 space-y-3 bg-white divide-y divide-slate-100">
                            {memberFollowUps.length > 0 ? (
                              memberFollowUps.map(fu => (
                                <div key={fu.id} className="pt-3 first:pt-0 space-y-1.5">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {fu.serviceCategory && (
                                        <span className="text-[10px] bg-slate-100 text-[#0c2340] py-0.5 px-2 rounded border border-slate-200 font-bold">
                                          {fu.serviceCategory}
                                        </span>
                                      )}
                                      <span className="text-[10px] bg-slate-50 text-slate-600 py-0.5 px-2 rounded border border-slate-200">
                                        Metode: {fu.type}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-slate-500">{fu.date}</span>
                                      {isEditable && (
                                        <div className="flex items-center gap-1.5 ml-1">
                                          <button
                                            onClick={() => handleStartEditFollowUp(fu)}
                                            className="text-xs text-[#0c2340] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                            title="Edit Log Pendampingan"
                                          >
                                            <Edit className="w-3 h-3" /> Edit
                                          </button>
                                          <button
                                            onClick={() => handleDeleteFollowUpClick(fu.id)}
                                            className="text-xs text-rose-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                            title="Hapus Log Pendampingan"
                                          >
                                            <Trash className="w-3 h-3" /> Hapus
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                                    "{fu.notes}"
                                  </p>
                                  <div className="text-[10px] text-slate-400">
                                    Staff Pendamping: <span className="text-slate-700 font-medium">{fu.staffName}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-xs text-slate-400 italic">
                                Belum ada riwayat pendampingan untuk anggota ini.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Orphan follow ups section */}
                  {orphanFollowUps.length > 0 && (
                    <div className="border border-amber-200 rounded-lg bg-amber-50/30 overflow-hidden shadow-2xs">
                      <div className="p-3.5 bg-amber-100/50 flex items-center justify-between border-b border-amber-200">
                        <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-amber-700" />
                          <h4 className="text-xs font-bold text-amber-900">Pendampingan Lainnya / Non-Terdaftar ({orphanFollowUps.length})</h4>
                        </div>
                      </div>
                      <div className="p-4 space-y-3 bg-white divide-y divide-slate-100">
                        {orphanFollowUps.map(fu => (
                          <div key={fu.id} className="pt-3 first:pt-0 space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {fu.serviceCategory && (
                                  <span className="text-[10px] bg-slate-100 text-[#0c2340] py-0.5 px-2 rounded border border-slate-200 font-bold">
                                    {fu.serviceCategory}
                                  </span>
                                )}
                                <span className="text-[10px] bg-slate-50 text-slate-600 py-0.5 px-2 rounded border border-slate-200">
                                  Metode: {fu.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500">{fu.date}</span>
                                {isEditable && (
                                  <div className="flex items-center gap-1.5 ml-1">
                                    <button
                                      onClick={() => handleStartEditFollowUp(fu)}
                                      className="text-xs text-[#0c2340] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                      title="Edit Log Pendampingan"
                                    >
                                      <Edit className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteFollowUpClick(fu.id)}
                                      className="text-xs text-rose-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                                      title="Hapus Log Pendampingan"
                                    >
                                      <Trash className="w-3 h-3" /> Hapus
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 italic leading-relaxed py-2 pl-3 border-l-2 border-amber-300 bg-slate-50/50 rounded-r">
                              "{fu.notes}"
                            </p>
                            <div className="text-[10px] text-slate-400">
                              Anggota: <strong>{fu.memberName || fu.memberId}</strong> &bull; Staff: <span className="text-slate-700 font-medium">{fu.staffName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Form to submit a follow up report */}
          {isEditable && (
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex justify-between items-center mb-3.5 border-b border-slate-200 pb-2.5">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  {editingFollowUp ? <Edit className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-slate-600" />}
                  {editingFollowUp ? 'Edit Laporan Pendampingan' : 'Catat Laporan Pendampingan'}
                </h3>
                {editingFollowUp && (
                  <button
                    type="button"
                    onClick={handleCancelEditFollowUp}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Batal Edit
                  </button>
                )}
              </div>
              <form onSubmit={handleSaveFollowUpForm} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Anggota yang Didampingi :</label>
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
                  <label className="text-slate-700 font-semibold block mb-1">Tanggal :</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Kategori Pelayanan Pendampingan :</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  >
                    <option value="Konseling Akademik">Konseling Akademik</option>
                    <option value="Bimbingan Karir">Bimbingan Karir</option>
                    <option value="Konseling Pribadi">Konseling Pribadi</option>
                    <option value="Pengutusan Kepemimpinan">Pengutusan Kepemimpinan</option>
                    <option value="Follow Up Kegiatan">Follow Up Kegiatan</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Metode Interaksi :</label>
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
                  <label className="text-slate-700 font-semibold block mb-1">Staff Pendamping :</label>
                  <input
                    type="text"
                    value={followUpStaffName}
                    onChange={(e) => setFollowUpStaffName(e.target.value)}
                    placeholder={currentRole}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 bg-white focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Hasil Pertemuan / Tindak Lanjut :</label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan poin pembicaraan, kebutuhan anggota, dan rencana langkah selanjutnya..."
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  {editingFollowUp && (
                    <button
                      type="button"
                      onClick={handleCancelEditFollowUp}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {editingFollowUp ? 'Simpan Perubahan Laporan' : 'Simpan Pendampingan'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB 5: CSV/EXCEL BULK IMPORTER */}
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

      {/* MODAL: ADD / EDIT MEMBER DIALOG FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-3xl overflow-hidden my-8">

            {/* Modal Header */}
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">{editingMember ? 'Ubah Data Profil Anggota' : 'Registrasi Anggota Pelayanan Baru'}</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Lengkapi identitas pribadi dan 3 Ruang Komunitas Pemuridan Yayasan MMB.</dd>
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
                      list="education-levels-list"
                      value={education}
                      onChange={(e) => setEducation(e.target.value)}
                      placeholder="Pilih jenjang atau ketik nama sekolah/kampus..."
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                    <datalist id="education-levels-list">
                      {(profile?.educationLevels || [
                        "SD / Sederajat",
                        "SMP / Sederajat",
                        "SMA / SMK / Sederajat",
                        "Diploma (D1-D4)",
                        "Sarjana (S1)",
                        "Magister (S2)",
                        "Doktor (S3)",
                        "Lainnya"
                      ]).map((lvl, idx) => (
                        <option key={idx} value={lvl} />
                      ))}
                    </datalist>
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

              {/* Bagian B: 3 Ruang Komunitas & Penugasan Pelayanan */}
              <div className="space-y-3.5 pt-3.5 border-t border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <h3 className="font-bold text-slate-800 uppercase tracking-tight text-xs">
                    Bagian B: 3 Ruang Komunitas & Penugasan Pelayanan
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Anggota dapat terdaftar di 1, 2, atau 3 ruang sekaligus)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      {(profile?.regions || []).map((r, idx) => (
                        <option key={idx} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3 Space Community Checkbox & Selectors */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
                  <label className="text-slate-800 font-bold block text-xs">
                    Partisipasi 3 Ruang Komunitas Pemuridan :
                  </label>

                  {/* 1. Core Circle */}
                  <div className="p-2.5 bg-white border border-purple-200 rounded space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSpaces.includes('Core Circle')}
                        onChange={() => toggleSpaceSelection('Core Circle')}
                        className="rounded text-purple-700 focus:ring-0 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-purple-900 text-xs block">Ruang 1: Core Circle</span>
                        <span className="text-[11px] text-slate-500 block leading-tight">Sekelompok murid yang berkomitmen hidup meneladani (imitating) Kristus.</span>
                      </div>
                    </label>
                    {selectedSpaces.includes('Core Circle') && (
                      <div className="pl-6 pt-1">
                        <label className="text-slate-600 block mb-1 text-[11px] font-semibold">Pilih Komunitas Core Circle :</label>
                        <select
                          value={coreCircleComm}
                          onChange={(e) => setCoreCircleComm(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 text-xs focus:border-purple-600 focus:outline-none"
                        >
                          <option value="">-- Pilih dari Komunitas Core Circle --</option>
                          {smallGroups.filter(g => g.communitySpace === 'Core Circle').map(g => (
                            <option key={g.id} value={g.name}>{g.name} ({g.region})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 2. Intimate Space */}
                  <div className="p-2.5 bg-white border border-amber-200 rounded space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSpaces.includes('Intimate Space')}
                        onChange={() => toggleSpaceSelection('Intimate Space')}
                        className="rounded text-amber-700 focus:ring-0 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-amber-900 text-xs block">Ruang 2: Intimate Space</span>
                        <span className="text-[11px] text-slate-500 block leading-tight">Ruang bagi para murid untuk berbagi kerentanan dan saling menguatkan</span>
                      </div>
                    </label>
                    {selectedSpaces.includes('Intimate Space') && (
                      <div className="pl-6 pt-1">
                        <label className="text-slate-600 block mb-1 text-[11px] font-semibold">Pilih Komunitas Intimate Space :</label>
                        <select
                          value={intimateSpaceComm}
                          onChange={(e) => setIntimateSpaceComm(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 text-xs focus:border-amber-600 focus:outline-none"
                        >
                          <option value="">-- Pilih dari Komunitas Intimate Space --</option>
                          {smallGroups.filter(g => !g.communitySpace || g.communitySpace === 'Intimate Space').map(g => (
                            <option key={g.id} value={g.name}>{g.name} ({g.region})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 3. Social Space */}
                  <div className="p-2.5 bg-white border border-blue-200 rounded space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSpaces.includes('Social Space')}
                        onChange={() => toggleSpaceSelection('Social Space')}
                        className="rounded text-blue-700 focus:ring-0 mt-0.5"
                      />
                      <div>
                        <span className="font-bold text-blue-900 text-xs block">Ruang 3: Social Space</span>
                        <span className="text-[11px] text-slate-500 block leading-tight">Ruang untuk mengalami dan menghidupi misi Allah bersama-sama, yang lahir dari kebutuhan lokal</span>
                      </div>
                    </label>
                    {selectedSpaces.includes('Social Space') && (
                      <div className="pl-6 pt-1">
                        <label className="text-slate-600 block mb-1 text-[11px] font-semibold">Pilih Komunitas Social Space :</label>
                        <select
                          value={socialSpaceComm}
                          onChange={(e) => setSocialSpaceComm(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-800 text-xs focus:border-blue-600 focus:outline-none"
                        >
                          <option value="">-- Pilih dari Komunitas Social Space --</option>
                          {smallGroups.filter(g => g.communitySpace === 'Social Space').map(g => (
                            <option key={g.id} value={g.name}>{g.name} ({g.region})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Leaders & Staff Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Pemimpin Pemuridan :</label>
                    <input
                      type="text"
                      value={discipleshipLeader}
                      onChange={(e) => setDiscipleshipLeader(e.target.value)}
                      placeholder="Contoh: Joseph Daniel, S.Th."
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Pemimpin Komunitas :</label>
                    <input
                      type="text"
                      value={mentor}
                      onChange={(e) => setMentor(e.target.value)}
                      placeholder="Contoh: Christian Sitorus"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Staff Pendamping (Database) :</label>
                    <select
                      value={staffAdvisor}
                      onChange={(e) => setStaffAdvisor(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    >
                      <option value="">-- Pilih Staff dari Database --</option>
                      {staffs.map(s => (
                        <option key={s.nik || s.id || s.name} value={s.name}>{s.name} ({s.position})</option>
                      ))}
                      <option value="Joseph Daniel">Joseph Daniel (Direktur Pelayanan)</option>
                      <option value="Sarah Sitorus">Sarah Sitorus (Staff Kaderisasi Siswa)</option>
                      <option value="Grace Natalia">Grace Natalia (Staff Mahasiswa)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">Status Keaktifan Pelayanan :</label>
                    <select
                      value={statusKeaktifan}
                      onChange={(e) => setStatusKeaktifan(e.target.value as any)}
                      className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none font-medium"
                    >
                      {(profile?.memberKeaktifanStatuses || [
                        "Penjangkauan",
                        "Aktif",
                        "Pasif",
                        "Cuti",
                        "Pindah"
                      ]).map((st, idx) => (
                        <option key={idx} value={st}>{st}</option>
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
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Simpan Data Anggota
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal: Catat Jawaban Doa & Kesaksian */}
      {answeringPrayer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#0c2340] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base">Catat Jawaban Doa & Kesaksian</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseAnswerModal}
                className="p-1 hover:bg-slate-700/60 rounded-full transition-colors cursor-pointer text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnswerModal} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[11px] text-slate-500 font-semibold mb-0.5">Pemohon: <span className="text-slate-800 font-bold">{answeringPrayer.memberName || 'Anggota'}</span></p>
                <p className="text-xs font-bold text-slate-800 mb-1">{answeringPrayer.title}</p>
                <p className="text-[11px] text-slate-600 italic leading-relaxed">"{answeringPrayer.request}"</p>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Tanggal Doa Terjawab :</label>
                <input
                  type="date"
                  value={modalAnsweredDate}
                  onChange={(e) => setModalAnsweredDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Catatan Detail Jawaban Doa / Kesaksian Syukur :</label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan bagaimana Tuhan menjawab doa ini, mukjizat/pertolongan-Nya, atau catatan kesaksian syukur..."
                  value={modalAnswerNotes}
                  onChange={(e) => setModalAnswerNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseAnswerModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Simpan Jawaban Doa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
