import React, { useState } from 'react';
import {
  ClipboardList,
  Users,
  Calendar,
  Plus,
  Search,
  FileText,
  ExternalLink,
  Edit,
  Trash,
  Download,
  Paperclip,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
  FileDown,
  ChevronRight,
  TrendingUp,
  ArrowLeft,
  Archive,
  CheckCircle,
  FolderOpen,
  Award,
  Layers,
  Sparkles,
  ShieldCheck,
  UserPlus,
  GraduationCap,
  Briefcase,
  School,
  UserCheck,
  BookOpen,
  HeartHandshake,
  Kanban,
  CalendarDays,
  ListFilter,
  Check,
  Zap,
  Tag,
  ArrowRight
} from 'lucide-react';
import { StaffTask, StaffMeeting, Staff, Member, MemberNote, SmallGroup, InstitutionalProfile } from '../types';

interface StaffTasksTabProps {
  staffTasks: StaffTask[];
  staffMeetings: StaffMeeting[];
  staffs: Staff[];
  members?: Member[];
  notes?: MemberNote[];
  smallGroups?: SmallGroup[];
  currentUser: any;
  currentRole: string;
  profile?: InstitutionalProfile;
  onSaveTask: (task: StaffTask) => Promise<void>;
  onDeleteTask: (id: string, title: string) => Promise<void>;
  onSaveMeeting: (meeting: StaffMeeting) => Promise<void>;
  onDeleteMeeting: (id: string, title: string) => Promise<void>;
  onUpdateMember?: (member: Member) => Promise<void> | void;
  onAddMemberNote?: (note: MemberNote) => Promise<void> | void;
}

const getSessionUserToken = () => {
  try {
    const saved = localStorage.getItem('esm_session_user');
    if (saved) {
      const user = JSON.parse(saved);
      return user?.token || '';
    }
  } catch (err) {
    console.error(err);
  }
  return '';
};

const MONTHS_IN_INDONESIAN = [
  { val: 1, label: 'Januari' },
  { val: 2, label: 'Februari' },
  { val: 3, label: 'Maret' },
  { val: 4, label: 'April' },
  { val: 5, label: 'Mei' },
  { val: 6, label: 'Juni' },
  { val: 7, label: 'Juli' },
  { val: 8, label: 'Agustus' },
  { val: 9, label: 'September' },
  { val: 10, label: 'Oktober' },
  { val: 11, label: 'November' },
  { val: 12, label: 'Desember' }
];

export const formatIndonesianDateFull = (dateStr?: string): string => {
  if (!dateStr || dateStr.length < 10) return dateStr || '-';
  try {
    const d = new Date(dateStr.substring(0, 10));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const formatIndonesianDateShort = (dateStr?: string): string => {
  if (!dateStr || dateStr.length < 10) return dateStr || '-';
  try {
    const d = new Date(dateStr.substring(0, 10));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const getMonthFromTargetDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  if (dateStr.includes('-W')) {
    const matchMonthWeek = dateStr.match(/^(\d{4})-(\d{2})-W(\d+)$/);
    if (matchMonthWeek) {
      const m = parseInt(matchMonthWeek[2], 10);
      if (!isNaN(m)) return m;
    }
    const [yearPart, weekPart] = dateStr.split('-W');
    const y = parseInt(yearPart);
    const w = parseInt(weekPart);
    if (!isNaN(y) && !isNaN(w)) {
      const d = new Date(y, 0, 1 + (w - 1) * 7);
      return d.getMonth() + 1;
    }
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      if (!isNaN(m)) return m;
    }
  }
  return 0;
};

const getYearFromTargetDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  const match = dateStr.match(/^(\d{4})/);
  if (match) {
    const y = parseInt(match[1], 10);
    return isNaN(y) ? 0 : y;
  }
  return 0;
};

export const normalizePeriodType = (p?: string): 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ONE_TIME_ACTIVITY' => {
  if (!p) return 'ONE_TIME_ACTIVITY';
  const clean = p.toUpperCase().replace(/[\s\-_]/g, '');
  if (clean.includes('DAILY') || clean.includes('HARIAN')) return 'DAILY';
  if (clean.includes('WEEK') || clean.includes('MINGGU')) return 'WEEKLY';
  if (clean.includes('MONTH') || clean.includes('BULAN')) return 'MONTHLY';
  if (clean.includes('YEAR') || clean.includes('TAHUN')) return 'YEARLY';
  return 'ONE_TIME_ACTIVITY';
};

export const formatTaskPeriodBadge = (task: {
  periodType?: string;
  targetDate?: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  scheduleMode?: string;
}): { badge: string; icon: string; label: string; dateRangeText: string } => {
  const pType = normalizePeriodType(task.periodType);
  const tDate = task.targetDate || '';
  const sDate = task.startDate || '';
  const eDate = task.endDate || '';
  const time = task.time || '';

  if (pType === 'ONE_TIME_ACTIVITY') {
    if (sDate && eDate && sDate !== eDate) {
      return {
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        icon: '⚡',
        label: 'Kegiatan Khusus',
        dateRangeText: `${formatIndonesianDateShort(sDate)} s/d ${formatIndonesianDateShort(eDate)}${time ? ` • ${time} WIB` : ''}`
      };
    }
    const dt = sDate || tDate;
    return {
      badge: 'bg-purple-50 text-purple-800 border-purple-200',
      icon: '⚡',
      label: 'Kegiatan Khusus',
      dateRangeText: `${formatIndonesianDateFull(dt)}${time ? ` • ${time} WIB` : ''}`
    };
  }

  if (pType === 'DAILY') {
    if (sDate && eDate && sDate !== eDate) {
      return {
        badge: 'bg-sky-50 text-sky-800 border-sky-200',
        icon: '📅',
        label: 'Harian',
        dateRangeText: `${formatIndonesianDateShort(sDate)} s/d ${formatIndonesianDateShort(eDate)}${time ? ` • ${time} WIB` : ''}`
      };
    }
    const dt = sDate || tDate;
    return {
      badge: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: '📅',
      label: 'Harian',
      dateRangeText: `${formatIndonesianDateFull(dt)}${time ? ` • ${time} WIB` : ''}`
    };
  }

  if (pType === 'WEEKLY') {
    let text = tDate;
    const matchMW = tDate.match(/^(\d{4})-(\d{2})-W(\d+)$/);
    if (matchMW) {
      const mName = MONTHS_IN_INDONESIAN[parseInt(matchMW[2], 10) - 1]?.label || matchMW[2];
      const wNum = parseInt(matchMW[3], 10);
      const startDay = (wNum - 1) * 7 + 1;
      const lastDay = Math.min(wNum * 7, 31);
      text = `Pekan ${wNum} (${startDay}-${lastDay} ${mName} ${matchMW[1]})`;
    } else if (tDate.includes('-W')) {
      const [y, w] = tDate.split('-W');
      text = `Pekan ke-${w} (${y})`;
    }
    return {
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      icon: '🗓️',
      label: 'Mingguan',
      dateRangeText: text
    };
  }

  if (pType === 'MONTHLY') {
    let text = tDate;
    if (tDate.includes('-')) {
      const parts = tDate.split('-');
      const mIdx = parseInt(parts[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        text = `${MONTHS_IN_INDONESIAN[mIdx].label} ${parts[0]}`;
      }
    }
    return {
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: '📆',
      label: 'Bulanan',
      dateRangeText: text
    };
  }

  if (pType === 'YEARLY') {
    return {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: '🎯',
      label: 'Tahunan',
      dateRangeText: `Tahun ${tDate}`
    };
  }

  return {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: '📌',
    label: pType,
    dateRangeText: tDate
  };
};

const GDRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1UeWgBx8r7jP9I03XO4r-1xtTmDER5x4t?usp=drive_link";
const MAX_DIRECT_UPLOAD_MB = 1;
const MAX_DIRECT_UPLOAD_BYTES = MAX_DIRECT_UPLOAD_MB * 1024 * 1024;

export default function StaffTasksTab({
  staffTasks,
  staffMeetings,
  staffs,
  members = [],
  notes = [],
  smallGroups = [],
  currentUser,
  currentRole,
  profile,
  onSaveTask,
  onDeleteTask,
  onSaveMeeting,
  onDeleteMeeting,
  onUpdateMember,
  onAddMemberNote
}: StaffTasksTabProps) {
  const [subTab, setSubTab] = useState<'tasks' | 'meetings' | 'structure'>('tasks');

  // Tracking View Mode: 'staff' (Grid Staf) | 'kanban' (Papan Kanban) | 'timeline' (Timeline / Agenda)
  const [taskViewMode, setTaskViewMode] = useState<'staff' | 'kanban' | 'timeline'>('staff');

  // Tracking Filters
  const [staffSearch, setStaffSearch] = useState('');
  const [filterPeriodType, setFilterPeriodType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterStaffNik, setFilterStaffNik] = useState<string>('ALL');

  // Selected staff for full page task details (Null means show grid/kanban/timeline)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Filters within staff task details archive section
  const [taskMonthFilter, setTaskMonthFilter] = useState<string>('Semua');
  const [taskYearFilter, setTaskYearFilter] = useState<string>('Semua');

  // Rapat Search & Date Range state
  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingStartDate, setMeetingStartDate] = useState('');
  const [meetingEndDate, setMeetingEndDate] = useState('');

  // Selected meeting for details modal
  const [viewingMeeting, setViewingMeeting] = useState<StaffMeeting | null>(null);

  // Kepengurusan Structure state
  const [selectedSector, setSelectedSector] = useState<'Siswa' | 'Mahasiswa' | 'Alumni'>('Siswa');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('Semua');
  const [structureSearch, setStructureSearch] = useState('');
  const [isCommitteeModalOpen, setIsCommitteeModalOpen] = useState(false);
  const [editingCommitteeMember, setEditingCommitteeMember] = useState<Member | null>(null);
  const [committeeMemberId, setCommitteeMemberId] = useState('');
  const [committeeSector, setCommitteeSector] = useState<'Siswa' | 'Mahasiswa' | 'Alumni'>('Siswa');
  const [committeeRegion, setCommitteeRegion] = useState('Cilegon');
  const [committeeRoleName, setCommitteeRoleName] = useState('');
  const [committeeCommunityName, setCommitteeCommunityName] = useState('');
  const [committeeNotesText, setCommitteeNotesText] = useState('');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<StaffMeeting | null>(null);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string } | null>(null);

  // Determine current calendar Month and Year
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12
  const todayStr = today.toISOString().substring(0, 10);

  // Form Fields - Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStaffNik, setTaskStaffNik] = useState('');
  const [taskPeriodType, setTaskPeriodType] = useState<StaffTask['periodType']>('ONE_TIME_ACTIVITY');
  const [taskScheduleMode, setTaskScheduleMode] = useState<'SpecificDate' | 'Range' | 'Today'>('SpecificDate');
  const [taskStartDate, setTaskStartDate] = useState(todayStr);
  const [taskEndDate, setTaskEndDate] = useState(todayStr);
  const [taskTime, setTaskTime] = useState('08:00');
  const [taskTargetDate, setTaskTargetDate] = useState(todayStr);

  // Weekly Helper State
  const [taskWeekYear, setTaskWeekYear] = useState(currentYear);
  const [taskWeekMonth, setTaskWeekMonth] = useState(currentMonth);
  const [taskWeekNum, setTaskWeekNum] = useState(1);

  // Monthly Helper State
  const [taskMonthYear, setTaskMonthYear] = useState(currentYear);
  const [taskMonthVal, setTaskMonthVal] = useState(currentMonth);

  // Yearly Helper State
  const [taskYearVal, setTaskYearVal] = useState(currentYear);

  const [taskStatus, setTaskStatus] = useState<StaffTask['status']>('Belum Mulai');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskParentId, setTaskParentId] = useState('');
  const [taskExternalLink, setTaskExternalLink] = useState('');

  // Form Fields - Meeting
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('Kantor Yayasan MMB');
  const [meetingLeaderName, setMeetingLeaderName] = useState('');
  const [meetingAttendees, setMeetingAttendees] = useState<string[]>([]);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingExternalLink, setMeetingExternalLink] = useState('');

  const isSuperAdmin = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan' || currentRole === 'Pembina Yayasan' || currentRole === 'Sekretaris' || currentRole === 'Staff';

  // Get current logged-in staff info if any
  const matchedCurrentStaff = staffs.find(s => s.email?.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim());

  // Quick Status Update Handler
  const handleQuickUpdateStatus = async (task: StaffTask, newStatus: StaffTask['status']) => {
    if (!isSuperAdmin && matchedCurrentStaff && task.staffNik !== matchedCurrentStaff.nik) {
      alert('Akses Ditolak: Anda hanya diizinkan mengubah status program kerja Anda sendiri.');
      return;
    }
    const updated: StaffTask = {
      ...task,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    await onSaveTask(updated);
  };
  // Dynamic Wilayah Pelayanan directly from profile settings
  const availableRegions = (profile?.regions && profile.regions.length > 0)
    ? profile.regions
    : Array.from(new Set(members.map(m => m.region).filter(Boolean)));

  // Dynamic Sektor Pelayanan directly from profile settings
  const availableSectors = (profile?.memberComponents && profile.memberComponents.length > 0)
    ? profile.memberComponents.filter(c => c !== 'Umum')
    : ['Siswa', 'Mahasiswa', 'Alumni'];

  // Open Committee Modal
  const handleOpenAddCommittee = (defaultRegion?: string) => {
    setEditingCommitteeMember(null);
    setCommitteeMemberId(members[0]?.id || '');
    setCommitteeSector(selectedSector);
    setCommitteeRegion(defaultRegion || (selectedRegionFilter !== 'Semua' ? selectedRegionFilter : (availableRegions[0] || '')));
    setCommitteeRoleName('');
    setCommitteeCommunityName('');
    setCommitteeNotesText('');
    setIsCommitteeModalOpen(true);
  };

  const handleOpenEditCommittee = (member: Member) => {
    setEditingCommitteeMember(member);
    setCommitteeMemberId(member.id);
    setCommitteeSector((member.component as any) || selectedSector);
    setCommitteeRegion(member.region || availableRegions[0] || '');
    setCommitteeCommunityName(member.coreCircleCommunity || member.intimateSpaceCommunity || member.socialSpaceCommunity || '');
    setCommitteeRoleName(member.committeeRole ? member.committeeRole.replace(/\s*\([^)]*\)/g, '').trim() : '');
    setCommitteeNotesText('');
    setIsCommitteeModalOpen(true);
  };

  const handleSaveCommitteeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!committeeMemberId || !committeeRoleName.trim()) {
      alert('Pilih Anggota & Masukkan Jabatan Kepengurusan!');
      return;
    }

    const member = members.find(m => m.id === committeeMemberId);
    if (!member) {
      alert('Data anggota tidak ditemukan!');
      return;
    }

    const updatedMember: Member = {
      ...member,
      component: committeeSector,
      region: committeeRegion,
      committeeRole: `${committeeRoleName.trim()} (${committeeSector} ${committeeRegion})`,
      ...(committeeCommunityName.trim() ? { coreCircleCommunity: committeeCommunityName.trim() } : {})
    };

    if (onUpdateMember) {
      await onUpdateMember(updatedMember);
    }

    if (onAddMemberNote) {
      const newNote: MemberNote = {
        id: `NOTE-${Date.now()}`,
        memberId: member.id,
        date: new Date().toISOString().split('T')[0],
        category: 'Pengutusan',
        notes: `Ditetapkan dalam Struktur Kepengurusan ${committeeSector} Wilayah ${committeeRegion} sebagai ${committeeRoleName.trim()}${committeeNotesText ? `. Catatan: ${committeeNotesText}` : ''}`,
        committeeNotes: `${committeeRoleName.trim()} • ${committeeSector} ${committeeRegion}${committeeCommunityName.trim() ? ` (${committeeCommunityName.trim()})` : ''}`,
        author: currentUser?.name || currentRole || 'Staff Yayasan'
      };
      await onAddMemberNote(newNote);
    }

    setIsCommitteeModalOpen(false);
    setEditingCommitteeMember(null);
    setCommitteeMemberId('');
    setCommitteeRoleName('');
    setCommitteeCommunityName('');
    setCommitteeNotesText('');
    alert(`Berhasil menetapkan ${member.fullName} sebagai ${committeeRoleName.trim()} Pengurus ${committeeSector} (${committeeRegion}). Data otomatis masuk ke profil & rapor anggota.`);
  };

  const handleRemoveCommittee = async (member: Member) => {
    if (!window.confirm(`Apakah Anda yakin ingin melepas status/jabatan kepengurusan "${member.committeeRole || 'Pengurus'}" dari ${member.fullName}?`)) {
      return;
    }

    const updatedMember: Member = {
      ...member,
      committeeRole: undefined
    };

    if (onUpdateMember) {
      await onUpdateMember(updatedMember);
    }

    if (onAddMemberNote) {
      const newNote: MemberNote = {
        id: `NOTE-${Date.now()}`,
        memberId: member.id,
        date: new Date().toISOString().split('T')[0],
        category: 'Pengutusan',
        notes: `Purna tugas amanah kepengurusan Sektor ${member.component} Wilayah ${member.region}. Terima kasih atas pelayanan dan dedikasinya.`,
        committeeNotes: `Purna Tugas / Selesai Masa Bakti Kepengurusan`,
        author: currentUser?.name || currentRole || 'Staff Yayasan'
      };
      await onAddMemberNote(newNote);
    }

    alert(`Status kepengurusan ${member.fullName} telah dinonaktifkan.`);
  };

  const handleOpenAddTask = (staffNik?: string) => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskStaffNik(staffNik || matchedCurrentStaff?.nik || staffs[0]?.nik || '');
    setTaskPeriodType('ONE_TIME_ACTIVITY');

    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const currYear = today.getFullYear();
    const currMonth = today.getMonth() + 1;

    setTaskScheduleMode('SpecificDate');
    setTaskStartDate(todayStr);
    setTaskEndDate(todayStr);
    setTaskTime('08:00');
    setTaskTargetDate(todayStr);

    setTaskWeekYear(currYear);
    setTaskWeekMonth(currMonth);
    setTaskWeekNum(1);

    setTaskMonthYear(currYear);
    setTaskMonthVal(currMonth);

    setTaskYearVal(currYear);

    setTaskStatus('Belum Mulai');
    setTaskNotes('');
    setTaskParentId('');
    setTaskExternalLink('');
    setUploadedFile(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: StaffTask) => {
    // Standard staff can only edit their own task unless they are Admin
    if (!isSuperAdmin && matchedCurrentStaff && task.staffNik !== matchedCurrentStaff.nik) {
      alert('Akses Ditolak: Anda hanya diizinkan mengubah program kerja Anda sendiri.');
      return;
    }

    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const currYear = today.getFullYear();
    const currMonth = today.getMonth() + 1;

    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskStaffNik(task.staffNik);

    const pType = normalizePeriodType(task.periodType);
    setTaskPeriodType(pType);

    const schedMode = task.scheduleMode || (task.startDate && task.endDate && task.startDate !== task.endDate ? 'Range' : 'SpecificDate');
    setTaskScheduleMode(schedMode);

    const sDate = task.startDate || (task.targetDate && task.targetDate.length === 10 ? task.targetDate : todayStr);
    const eDate = task.endDate || sDate;
    setTaskStartDate(sDate);
    setTaskEndDate(eDate);
    setTaskTime(task.time || '08:00');
    setTaskTargetDate(task.targetDate || sDate);

    // Parse Weekly state
    if (pType === 'WEEKLY' && task.targetDate) {
      const matchMW = task.targetDate.match(/^(\d{4})-(\d{2})-W(\d+)$/);
      if (matchMW) {
        setTaskWeekYear(parseInt(matchMW[1], 10));
        setTaskWeekMonth(parseInt(matchMW[2], 10));
        setTaskWeekNum(parseInt(matchMW[3], 10));
      } else if (task.targetDate.includes('-W')) {
        const [y, w] = task.targetDate.split('-W');
        setTaskWeekYear(parseInt(y, 10) || currYear);
        const wNum = parseInt(w, 10) || 1;
        const approxMonth = Math.min(12, Math.max(1, Math.ceil(wNum / 4.3)));
        setTaskWeekMonth(approxMonth);
        setTaskWeekNum(Math.min(5, Math.max(1, wNum % 4 || 1)));
      } else {
        setTaskWeekYear(currYear);
        setTaskWeekMonth(currMonth);
        setTaskWeekNum(1);
      }
    } else {
      setTaskWeekYear(currYear);
      setTaskWeekMonth(currMonth);
      setTaskWeekNum(1);
    }

    // Parse Monthly state
    if (pType === 'MONTHLY' && task.targetDate && task.targetDate.includes('-')) {
      const parts = task.targetDate.split('-');
      setTaskMonthYear(parseInt(parts[0], 10) || currYear);
      setTaskMonthVal(parseInt(parts[1], 10) || currMonth);
    } else {
      setTaskMonthYear(currYear);
      setTaskMonthVal(currMonth);
    }

    // Parse Yearly state
    if (pType === 'YEARLY' && task.targetDate) {
      setTaskYearVal(parseInt(task.targetDate, 10) || currYear);
    } else {
      setTaskYearVal(currYear);
    }

    setTaskStatus(task.status);
    setTaskNotes(task.notes || '');
    setTaskParentId(task.parentTaskId || '');
    setTaskExternalLink(task.externalLink || '');
    if (task.attachmentUrl && task.attachmentName) {
      setUploadedFile({ id: task.attachmentUrl, name: task.attachmentName });
    } else {
      setUploadedFile(null);
    }
    setIsTaskModalOpen(true);
  };

  const handleOpenAddMeeting = () => {
    setEditingMeeting(null);
    setMeetingTitle('');
    setMeetingDate(new Date().toISOString().substring(0, 10));
    setMeetingLocation('Kantor Yayasan MMB');
    setMeetingLeaderName(currentUser?.name || '');
    setMeetingAttendees(staffs.map(s => s.name)); // Default to checking all staff members
    setMeetingNotes('');
    setMeetingExternalLink('');
    setUploadedFile(null);
    setIsMeetingModalOpen(true);
  };

  const handleOpenEditMeeting = (meet: StaffMeeting) => {
    setEditingMeeting(meet);
    setMeetingTitle(meet.title);
    setMeetingDate(meet.date);
    setMeetingLocation(meet.location);
    setMeetingLeaderName(meet.leaderName);
    setMeetingAttendees(meet.attendees);
    setMeetingNotes(meet.notes);
    setMeetingExternalLink(meet.externalLink || '');
    if (meet.attachmentUrl && meet.attachmentName) {
      setUploadedFile({ id: meet.attachmentUrl, name: meet.attachmentName });
    } else {
      setUploadedFile(null);
    }
    setIsMeetingModalOpen(true);
  };

  // Convert File to Base64 and upload to server document library (Max 1 MB for direct upload)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
      alert(
        `Ukuran berkas "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas upload langsung ${MAX_DIRECT_UPLOAD_MB} MB agar penyimpanan server tetap ringan.\n\nSilakan unggah berkas ke Folder Google Drive Yayasan melalui tombol yang tersedia di atas, lalu cantumkan tautan/link berkasnya pada formulir.`
      );
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const fileId = `DOC-STAFF-${Date.now()}`;

      try {
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getSessionUserToken()}`
          },
          body: JSON.stringify({
            id: fileId,
            name: file.name,
            category: subTab === 'tasks' ? 'Kegiatan Staf' : 'Rapat Staf',
            fileData: base64Data,
            fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          })
        });

        if (response.ok) {
          setUploadedFile({ id: fileId, name: file.name });
          alert('Berkas berhasil diunggah dan disimpan!');
        } else {
          const errData = await response.json();
          alert(`Gagal mengunggah berkas: ${errData.error || 'Unknown error'}`);
        }
      } catch (err: any) {
        console.error(err);
        alert(`Gagal mengunggah berkas: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      alert('Gagal membaca berkas.');
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleSaveTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      alert('Judul Kegiatan wajib diisi!');
      return;
    }

    const assignedStaff = staffs.find(s => s.nik === taskStaffNik);
    const staffName = assignedStaff ? assignedStaff.name : 'Unknown Staff';

    if (editingTask) {
      if (!window.confirm('Apakah Anda yakin ingin menyimpan perubahan program kerja ini?')) {
        return;
      }
    }

    const generateStaffTaskId = (existingTasks: StaffTask[]): string => {
      const currentYear = new Date().getFullYear();
      let maxSeq = 0;
      existingTasks.forEach(t => {
        if (!t.id) return;
        const match = t.id.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });
      let nextSeq = maxSeq + 1;
      let candidate = `ST-${currentYear}-${String(nextSeq).padStart(5, '0')}`;
      while (existingTasks.some(t => t.id === candidate)) {
        nextSeq++;
        candidate = `ST-${currentYear}-${String(nextSeq).padStart(5, '0')}`;
      }
      return candidate;
    };

    const todayStr = new Date().toISOString().substring(0, 10);
    let finalTargetDate = '';
    let finalStartDate: string | undefined = undefined;
    let finalEndDate: string | undefined = undefined;
    let finalTime: string | undefined = undefined;
    let finalScheduleMode: StaffTask['scheduleMode'] = undefined;

    if (taskPeriodType === 'ONE_TIME_ACTIVITY') {
      finalScheduleMode = taskScheduleMode;
      finalStartDate = taskStartDate || todayStr;
      finalEndDate = taskScheduleMode === 'Range' ? (taskEndDate || finalStartDate) : finalStartDate;
      finalTime = taskTime || '08:00';
      finalTargetDate = finalStartDate;
    } else if (taskPeriodType === 'DAILY') {
      finalScheduleMode = taskScheduleMode;
      if (taskScheduleMode === 'Today') {
        finalStartDate = todayStr;
        finalEndDate = todayStr;
      } else if (taskScheduleMode === 'SpecificDate') {
        finalStartDate = taskStartDate || todayStr;
        finalEndDate = taskStartDate || todayStr;
      } else {
        finalStartDate = taskStartDate || todayStr;
        finalEndDate = taskEndDate || finalStartDate;
      }
      finalTime = taskTime || '08:00';
      finalTargetDate = finalStartDate;
    } else if (taskPeriodType === 'WEEKLY') {
      finalTargetDate = `${taskWeekYear}-${String(taskWeekMonth).padStart(2, '0')}-W${taskWeekNum}`;
      const startDay = (taskWeekNum - 1) * 7 + 1;
      const lastDayOfMonth = new Date(taskWeekYear, taskWeekMonth, 0).getDate();
      const endDay = Math.min(taskWeekNum * 7, lastDayOfMonth);
      finalStartDate = `${taskWeekYear}-${String(taskWeekMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
      finalEndDate = `${taskWeekYear}-${String(taskWeekMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    } else if (taskPeriodType === 'MONTHLY') {
      finalTargetDate = `${taskMonthYear}-${String(taskMonthVal).padStart(2, '0')}`;
      finalStartDate = `${taskMonthYear}-${String(taskMonthVal).padStart(2, '0')}-01`;
      const lastDay = new Date(taskMonthYear, taskMonthVal, 0).getDate();
      finalEndDate = `${taskMonthYear}-${String(taskMonthVal).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (taskPeriodType === 'YEARLY') {
      finalTargetDate = `${taskYearVal}`;
      finalStartDate = `${taskYearVal}-01-01`;
      finalEndDate = `${taskYearVal}-12-31`;
    }

    const taskPayload: StaffTask = {
      id: editingTask ? editingTask.id : generateStaffTaskId(staffTasks),
      staffNik: taskStaffNik,
      staffName,
      title: taskTitle.trim(),
      periodType: taskPeriodType,
      targetDate: finalTargetDate,
      scheduleMode: finalScheduleMode,
      startDate: finalStartDate,
      endDate: finalEndDate,
      time: finalTime,
      status: taskStatus,
      notes: taskNotes.trim() || undefined,
      attachmentUrl: uploadedFile?.id || undefined,
      attachmentName: uploadedFile?.name || undefined,
      externalLink: taskExternalLink.trim() || undefined,
      parentTaskId: taskParentId || undefined,
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    await onSaveTask(taskPayload);
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle || !meetingDate || !meetingLeaderName) {
      alert('Topik, Tanggal & Pimpinan Rapat wajib diisi!');
      return;
    }

    if (meetingAttendees.length === 0) {
      alert('Pilih minimal satu staf yang menghadiri rapat!');
      return;
    }

    if (editingMeeting) {
      if (!window.confirm('Apakah Anda yakin ingin menyimpan perubahan notulensi rapat ini?')) {
        return;
      }
    }

    const generateStaffMeetingId = (existingMeetings: StaffMeeting[]): string => {
      const currentYear = new Date().getFullYear();
      let maxSeq = 0;
      existingMeetings.forEach(m => {
        if (!m.id) return;
        const match = m.id.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });
      let nextSeq = maxSeq + 1;
      let candidate = `SM-${currentYear}-${String(nextSeq).padStart(5, '0')}`;
      while (existingMeetings.some(m => m.id === candidate)) {
        nextSeq++;
        candidate = `SM-${currentYear}-${String(nextSeq).padStart(5, '0')}`;
      }
      return candidate;
    };

    const meetingPayload: StaffMeeting = {
      id: editingMeeting ? editingMeeting.id : generateStaffMeetingId(staffMeetings),
      title: meetingTitle,
      date: meetingDate,
      location: meetingLocation,
      leaderName: meetingLeaderName,
      attendees: meetingAttendees,
      notes: meetingNotes,
      attachmentUrl: uploadedFile?.id || undefined,
      attachmentName: uploadedFile?.name || undefined,
      externalLink: meetingExternalLink || undefined,
      createdAt: editingMeeting ? editingMeeting.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false
    };

    await onSaveMeeting(meetingPayload);
    setIsMeetingModalOpen(false);
    setEditingMeeting(null);
  };

  const handleDeleteTaskClick = async (task: StaffTask) => {
    if (!isSuperAdmin && matchedCurrentStaff && task.staffNik !== matchedCurrentStaff.nik) {
      alert('Akses Ditolak: Anda hanya diizinkan menghapus program kerja Anda sendiri.');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus program kerja "${task.title}"?`)) {
      await onDeleteTask(task.id, task.title);
    }
  };

  const handleDeleteMeetingClick = async (meet: StaffMeeting) => {
    if (!isSuperAdmin) {
      alert('Akses Ditolak: Hanya Admin, Ketua Yayasan atau Sekretaris yang diizinkan menghapus notulensi rapat.');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus notulensi rapat "${meet.title}"?`)) {
      await onDeleteMeeting(meet.id, meet.title);
    }
  };

  // Filter matching functions
  const matchesStaffFilter = (t: StaffTask) => {
    if (filterStaffNik === 'ALL') return true;
    if (t.staffNik === filterStaffNik) return true;
    const targetStaff = staffs.find(s => s.nik === filterStaffNik);
    if (targetStaff && t.staffName && t.staffName.toLowerCase() === targetStaff.name.toLowerCase()) return true;
    if (t.staffName && t.staffName === filterStaffNik) return true;
    return false;
  };

  const matchesPeriodFilter = (t: StaffTask) => {
    if (filterPeriodType === 'ALL') return true;
    return normalizePeriodType(t.periodType) === filterPeriodType;
  };

  const matchesStatusFilter = (t: StaffTask) => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  };

  const matchesSearchFilter = (t: StaffTask) => {
    if (!staffSearch.trim()) return true;
    const q = staffSearch.toLowerCase();
    const mStaff = (t.staffName || '').toLowerCase().includes(q) || (t.staffNik || '').toLowerCase().includes(q);
    const mTitle = (t.title || '').toLowerCase().includes(q);
    const mNotes = (t.notes || '').toLowerCase().includes(q);
    return mStaff || mTitle || mNotes;
  };

  const isAnyFilterActive = staffSearch.trim() !== '' || filterStaffNik !== 'ALL' || filterPeriodType !== 'ALL' || filterStatus !== 'ALL';

  const handleResetFilters = () => {
    setStaffSearch('');
    setFilterStaffNik('ALL');
    setFilterPeriodType('ALL');
    setFilterStatus('ALL');
  };

  const distinctStaffNamesFromTasks = Array.from(new Set(staffTasks.map(t => t.staffName).filter(Boolean)))
    .filter(name => !staffs.some(s => s.name === name));

  // Filtered staffs based on search and staff filter
  const filteredStaffs = staffs.filter(s => {
    if (filterStaffNik !== 'ALL' && s.nik !== filterStaffNik) return false;
    if (!staffSearch.trim()) return true;
    return s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      (s.position || '').toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.nik.includes(staffSearch);
  });

  // Split tasks for selected staff member:
  // 1. Ongoing Tasks: Not Completed OR (Completed AND target date is in current month)
  // 2. Archived Tasks: Completed AND target date is in previous months
  const allSelectedStaffTasks = selectedStaff
    ? staffTasks.filter(t => t.staffNik === selectedStaff.nik)
    : [];

  const ongoingTasks = allSelectedStaffTasks.filter(t => {
    const isCompleted = t.status === 'Selesai';
    const tMonth = getMonthFromTargetDate(t.targetDate);
    const tYear = getYearFromTargetDate(t.targetDate);
    const isCurrentMonth = tMonth === currentMonth && tYear === currentYear;

    return !isCompleted || isCurrentMonth;
  });

  const archivedTasks = allSelectedStaffTasks.filter(t => {
    const isCompleted = t.status === 'Selesai';
    const tMonth = getMonthFromTargetDate(t.targetDate);
    const tYear = getYearFromTargetDate(t.targetDate);
    const isCurrentMonth = tMonth === currentMonth && tYear === currentYear;

    // Must be completed, and NOT in current month
    if (!isCompleted || isCurrentMonth) return false;

    // Apply archive filters
    const matchesMonth = taskMonthFilter === 'Semua' || tMonth === parseInt(taskMonthFilter);
    const matchesYear = taskYearFilter === 'Semua' || tYear === parseInt(taskYearFilter);

    return matchesMonth && matchesYear;
  });

  // Filter Meetings with Date Range support
  const filteredMeetings = staffMeetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(meetingSearch.toLowerCase()) ||
      m.notes.toLowerCase().includes(meetingSearch.toLowerCase()) ||
      m.leaderName.toLowerCase().includes(meetingSearch.toLowerCase());

    const matchesStart = !meetingStartDate || m.date >= meetingStartDate;
    const matchesEnd = !meetingEndDate || m.date <= meetingEndDate;

    return matchesSearch && matchesStart && matchesEnd;
  });

  // Unique years of archived tasks for filter
  const uniqueArchivedYears = Array.from(new Set(
    allSelectedStaffTasks
      .filter(t => t.status === 'Selesai' && !(getMonthFromTargetDate(t.targetDate) === currentMonth && getYearFromTargetDate(t.targetDate) === currentYear))
      .map(t => getYearFromTargetDate(t.targetDate))
      .filter(y => y > 0)
  )).sort((a, b) => b - a);

  // Overall statistics for all tasks (for monthly dashboard summary card fills)
  const totalTasksThisMonth = staffTasks.filter(t => {
    return getMonthFromTargetDate(t.targetDate) === currentMonth && getYearFromTargetDate(t.targetDate) === currentYear;
  }).length;

  const completedTasksThisMonth = staffTasks.filter(t => {
    return t.status === 'Selesai' && getMonthFromTargetDate(t.targetDate) === currentMonth && getYearFromTargetDate(t.targetDate) === currentYear;
  }).length;

  const inProgressTasksThisMonth = staffTasks.filter(t => {
    return t.status === 'Dalam Proses' && getMonthFromTargetDate(t.targetDate) === currentMonth && getYearFromTargetDate(t.targetDate) === currentYear;
  }).length;

  const pendingTasksThisMonth = staffTasks.filter(t => {
    return (t.status === 'Belum Mulai' || t.status === 'Tertunda') && getMonthFromTargetDate(t.targetDate) === currentMonth && getYearFromTargetDate(t.targetDate) === currentYear;
  }).length;

  return (
    <div className="space-y-6">
      {!selectedStaff && (
        <div className="bg-[#0c2340] rounded-lg p-5 text-white shadow-xs border border-slate-700 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800/80 rounded border border-slate-700">
                <ClipboardList className="w-5 h-5 text-slate-200" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Program & Rapat Staf</h1>
                <p className="text-xs text-slate-300 mt-0.5">Halaman pemantauan program kerja bulanan, penugasan berlanjut, dan arsip notulensi rapat</p>
              </div>
            </div>

            <div className="flex bg-slate-800/80 p-1 rounded border border-slate-700 shrink-0 flex-wrap gap-1">
              <button
                onClick={() => setSubTab('tasks')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${subTab === 'tasks'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                  }`}
              >
                <ClipboardList className="w-3.5 h-3.5" /> Program Kerja Staf
              </button>
              <button
                onClick={() => setSubTab('meetings')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${subTab === 'meetings'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                  }`}
              >
                <Users className="w-3.5 h-3.5" /> Dokumentasi Rapat
              </button>
              <button
                onClick={() => setSubTab('structure')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${subTab === 'structure'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                  }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-400" /> Struktur Kepengurusan
              </button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'tasks' && !selectedStaff && (
        <div className="space-y-5">
          {/* Monthly Metric Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded text-slate-700">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Total Kegiatan</span>
                <span className="text-base font-bold text-slate-900 font-mono">{staffTasks.length}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Selesai</span>
                <span className="text-base font-bold text-emerald-800 font-mono">
                  {staffTasks.filter(t => t.status === 'Selesai').length}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded text-amber-800 border border-amber-200">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Dalam Proses</span>
                <span className="text-base font-bold text-amber-800 font-mono">
                  {staffTasks.filter(t => t.status === 'Dalam Proses').length}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-xs flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 rounded text-rose-800 border border-rose-200">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Belum / Tertunda</span>
                <span className="text-base font-bold text-rose-800 font-mono">
                  {staffTasks.filter(t => t.status === 'Belum Mulai' || t.status === 'Tertunda').length}
                </span>
              </div>
            </div>
          </div>

          {/* Control Bar: View Switcher, Filter by Staff, Period, Status, Search & Action */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              {/* View Switcher Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                {[
                  { mode: 'staff', label: 'Per Staf', icon: Users },
                  { mode: 'kanban', label: 'Papan Status', icon: Kanban },
                  { mode: 'timeline', label: 'Timeline & Agenda', icon: CalendarDays }
                ].map((v) => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.mode}
                      onClick={() => setTaskViewMode(v.mode as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${taskViewMode === v.mode
                        ? 'bg-white text-[#0c2340] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{v.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAddTask()}
                  className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Entri Kegiatan Staf
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari staf, judul, catatan..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>

              <div>
                <select
                  value={filterStaffNik}
                  onChange={(e) => setFilterStaffNik(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Staf Pelaksana</option>
                  {staffs.map(s => (
                    <option key={s.nik} value={s.nik}>{s.name} ({s.nik})</option>
                  ))}
                  {distinctStaffNamesFromTasks.map(extraName => (
                    <option key={extraName} value={extraName}>{extraName}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterPeriodType}
                  onChange={(e) => setFilterPeriodType(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Jenis Periode</option>
                  <option value="ONE_TIME_ACTIVITY">⚡ Kegiatan Khusus (Insidental)</option>
                  <option value="DAILY">📅 Tugas Harian</option>
                  <option value="WEEKLY">🗓️ Target Mingguan</option>
                  <option value="MONTHLY">📆 Program Bulanan</option>
                  <option value="YEARLY">🎯 Target Tahunan</option>
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status Kegiatan</option>
                  <option value="Belum Mulai">⚪ Belum Mulai</option>
                  <option value="Dalam Proses">🟡 Dalam Proses</option>
                  <option value="Selesai">🟢 Selesai</option>
                  <option value="Tertunda">🔴 Tertunda</option>
                </select>
              </div>
            </div>

            {isAnyFilterActive && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-600">
                <span className="text-[11px] text-slate-500">
                  🔍 Filter aktif sedang diterapkan
                </span>
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Reset Semua Filter
                </button>
              </div>
            )}
          </div>

          {/* VIEW 1: STAFF GRID */}
          {taskViewMode === 'staff' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStaffs.length === 0 ? (
                <div className="col-span-full bg-white p-12 text-center text-slate-500 rounded-lg border border-slate-200">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Tidak ada data staf yang sesuai pencarian.
                </div>
              ) : (
                filteredStaffs.map((st) => {
                  const myTasks = staffTasks.filter(t => {
                    const matchesThis = t.staffNik === st.nik || (t.staffName && t.staffName.toLowerCase() === st.name.toLowerCase());
                    if (!matchesThis) return false;
                    if (!matchesPeriodFilter(t)) return false;
                    if (!matchesStatusFilter(t)) return false;
                    if (!matchesSearchFilter(t)) return false;
                    return true;
                  });
                  const completed = myTasks.filter(t => t.status === 'Selesai').length;
                  const total = myTasks.length;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                  const inProgress = myTasks.filter(t => t.status === 'Dalam Proses').length;
                  const pending = myTasks.filter(t => t.status === 'Belum Mulai' || t.status === 'Tertunda').length;

                  return (
                    <div key={st.nik} className="bg-white rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition-colors p-4 flex flex-col justify-between space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#0c2340] text-white flex items-center justify-center font-bold uppercase shrink-0 text-xs font-mono shadow-xs">
                            {st.name.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-xs leading-tight">{st.name}</h3>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">NIK: {st.nik}</span>
                            <span className="text-[10px] text-slate-700 font-semibold block mt-0.5">{st.position || 'Staf Pelaksana'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 py-1 text-center bg-slate-50 rounded p-2 border border-slate-100">
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-semibold block">Dalam Proses</span>
                          <span className="font-bold text-amber-800 text-xs">{inProgress}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-semibold block">Belum / Tunda</span>
                          <span className="font-bold text-rose-800 text-xs">{pending}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-semibold block">Selesai</span>
                          <span className="font-bold text-emerald-800 text-xs">{completed}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-semibold uppercase tracking-wider">Pencapaian Total</span>
                          {total > 0 ? (
                            <span className="font-bold text-slate-800">{completed} / {total} ({percent}%)</span>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada kegiatan</span>
                          )}
                        </div>

                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${total > 0 ? 'bg-[#0c2340]' : 'bg-slate-200'}`}
                            style={{ width: `${total > 0 ? percent : 0}%` }}
                          ></div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStaff(st);
                          setTaskMonthFilter('Semua');
                          setTaskYearFilter('Semua');
                        }}
                        className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        Lihat & Kelola Program Kerja <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: KANBAN BOARD */}
          {taskViewMode === 'kanban' && (
            <div className="space-y-3">
              {filterStatus !== 'ALL' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3.5 py-2 rounded-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span>🔍</span>
                    <span>Menampilkan fokus kolom status: <strong>{filterStatus}</strong></span>
                  </span>
                  <button
                    onClick={() => setFilterStatus('ALL')}
                    className="text-xs text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                  >
                    Tampilkan Semua Kolom Status
                  </button>
                </div>
              )}

              <div className={`grid grid-cols-1 ${filterStatus === 'ALL' ? 'md:grid-cols-2 lg:grid-cols-4' : 'max-w-xl mx-auto'} gap-4 items-start`}>
                {[
                  { status: 'Belum Mulai', title: 'Belum Mulai', color: 'border-slate-300 bg-slate-100 text-slate-800', dot: 'bg-slate-400' },
                  { status: 'Dalam Proses', title: 'Dalam Proses', color: 'border-amber-300 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
                  { status: 'Selesai', title: 'Selesai', color: 'border-emerald-300 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
                  { status: 'Tertunda', title: 'Tertunda / Pending', color: 'border-rose-300 bg-rose-50 text-rose-800', dot: 'bg-rose-500' }
                ]
                  .filter(col => filterStatus === 'ALL' || col.status === filterStatus)
                  .map((col) => {
                    const colTasks = staffTasks.filter(t => {
                      if (t.status !== col.status) return false;
                      if (!matchesStaffFilter(t)) return false;
                      if (!matchesPeriodFilter(t)) return false;
                      if (!matchesSearchFilter(t)) return false;
                      return true;
                    });

                    return (
                      <div key={col.status} className="bg-slate-50/80 rounded-lg border border-slate-200 p-3 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`}></span>
                            <h4 className="font-bold text-xs text-slate-800">{col.title}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${col.color}`}>
                            {colTasks.length}
                          </span>
                        </div>

                        <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
                          {colTasks.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs italic bg-white rounded-lg border border-dashed border-slate-200">
                              Tidak ada kegiatan
                            </div>
                          ) : (
                            colTasks.map((task) => {
                              const pInfo = formatTaskPeriodBadge(task);
                              const isOwnTask = matchedCurrentStaff && task.staffNik === matchedCurrentStaff.nik;
                              const canModify = isSuperAdmin || isOwnTask;

                              return (
                                <div
                                  key={task.id}
                                  className="bg-white p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 shadow-xs space-y-2.5 transition-all"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border flex items-center gap-1 ${pInfo.badge}`}>
                                      <span>{pInfo.icon}</span>
                                      <span>{pInfo.label}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {task.staffName}
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <h5 className="font-bold text-slate-900 text-xs leading-snug">{task.title}</h5>
                                    <p className="text-[10px] text-slate-600 font-medium">
                                      {pInfo.dateRangeText}
                                    </p>
                                    {task.notes && (
                                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                        {task.notes}
                                      </p>
                                    )}
                                  </div>

                                  {/* Quick Status Action Buttons */}
                                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1 items-center justify-between">
                                    <div className="flex flex-wrap gap-1">
                                      {task.status !== 'Dalam Proses' && (
                                        <button
                                          onClick={() => handleQuickUpdateStatus(task, 'Dalam Proses')}
                                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                                          title="Ubah status ke Dalam Proses"
                                        >
                                          ▶️ Proses
                                        </button>
                                      )}
                                      {task.status !== 'Selesai' && (
                                        <button
                                          onClick={() => handleQuickUpdateStatus(task, 'Selesai')}
                                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                                          title="Tandai Selesai"
                                        >
                                          ✅ Selesai
                                        </button>
                                      )}
                                      {task.status !== 'Tertunda' && task.status !== 'Selesai' && (
                                        <button
                                          onClick={() => handleQuickUpdateStatus(task, 'Tertunda')}
                                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors cursor-pointer"
                                          title="Tandai Tertunda"
                                        >
                                          ⏸️ Tunda
                                        </button>
                                      )}
                                    </div>

                                    {canModify && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleOpenEditTask(task)}
                                          className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                                          title="Edit Kegiatan"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTaskClick(task)}
                                          className="p-1 hover:bg-rose-50 rounded text-rose-700 transition-colors cursor-pointer"
                                          title="Hapus Kegiatan"
                                        >
                                          <Trash className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* VIEW 3: TIMELINE & AGENDA */}
          {taskViewMode === 'timeline' && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs divide-y divide-slate-100">
              {staffTasks
                .filter(t => {
                  if (!matchesStaffFilter(t)) return false;
                  if (!matchesPeriodFilter(t)) return false;
                  if (!matchesStatusFilter(t)) return false;
                  if (!matchesSearchFilter(t)) return false;
                  return true;
                }).length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">
                  Tidak ada program kerja staf yang sesuai dengan kriteria filter saat ini.
                </div>
              ) : (
                staffTasks
                  .filter(t => {
                    if (!matchesStaffFilter(t)) return false;
                    if (!matchesPeriodFilter(t)) return false;
                    if (!matchesStatusFilter(t)) return false;
                    if (!matchesSearchFilter(t)) return false;
                    return true;
                  })
                  .sort((a, b) => (b.targetDate || '').localeCompare(a.targetDate || ''))
                  .map((task) => {
                    const pInfo = formatTaskPeriodBadge(task);
                    const isOwnTask = matchedCurrentStaff && task.staffNik === matchedCurrentStaff.nik;
                    const canModify = isSuperAdmin || isOwnTask;

                    return (
                      <div key={task.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase border flex items-center gap-1 ${pInfo.badge}`}>
                              <span>{pInfo.icon}</span>
                              <span>{pInfo.label}</span>
                            </span>

                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              👤 {task.staffName}
                            </span>

                            <span className="text-[10px] font-mono text-slate-600">
                              {pInfo.dateRangeText}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-xs">{task.title}</h4>
                          {task.notes && (
                            <p className="text-[11px] text-slate-600 leading-relaxed max-w-2xl">{task.notes}</p>
                          )}

                          <div className="flex flex-wrap gap-2 pt-0.5 text-[10px]">
                            {task.attachmentUrl && task.attachmentName && (
                              <a
                                href={`/api/documents/download/${task.attachmentUrl}?token=${getSessionUserToken()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#0c2340] hover:underline font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
                              >
                                <Paperclip className="w-3 h-3" /> {task.attachmentName}
                              </a>
                            )}
                            {task.externalLink && (
                              <a
                                href={task.externalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded"
                              >
                                <ExternalLink className="w-3 h-3" /> Link Lampiran
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Status Switcher */}
                          <select
                            value={task.status}
                            onChange={(e) => handleQuickUpdateStatus(task, e.target.value as any)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold border outline-none cursor-pointer ${task.status === 'Selesai' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              task.status === 'Dalam Proses' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                task.status === 'Tertunda' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                                  'bg-slate-100 text-slate-800 border-slate-300'
                              }`}
                          >
                            <option value="Belum Mulai">⚪ Belum Mulai</option>
                            <option value="Dalam Proses">🟡 Dalam Proses</option>
                            <option value="Selesai">🟢 Selesai</option>
                            <option value="Tertunda">🔴 Tertunda</option>
                          </select>

                          {canModify && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditTask(task)}
                                className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition-colors cursor-pointer"
                                title="Edit Kegiatan"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTaskClick(task)}
                                className="p-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded transition-colors cursor-pointer"
                                title="Hapus Kegiatan"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>
      )}



      {subTab === 'tasks' && selectedStaff && (
        <div className="space-y-5">
          <div className="bg-[#0c2340] text-white p-5 rounded-lg border border-slate-700 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedStaff(null)}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700 shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Staf
              </button>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-700 font-mono">
                  {selectedStaff.name.substring(0, 2)}
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight">Rincian Kegiatan: {selectedStaff.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300 font-medium">
                    <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 text-[10px]">NIK: {selectedStaff.nik}</span>
                    <span>&bull;</span>
                    <span className="text-slate-200">{selectedStaff.position || 'Staf Pelaksana'}</span>
                  </div>
                </div>
              </div>
            </div>

            {(isSuperAdmin || (matchedCurrentStaff && selectedStaff.nik === matchedCurrentStaff.nik)) && (
              <button
                onClick={() => handleOpenAddTask(selectedStaff.nik)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Kegiatan
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <CheckCircle className="w-4 h-4 text-slate-700" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Kegiatan Berjalan & Bulan Ini</h3>
                </div>

                <div className="space-y-3">
                  {ongoingTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs italic">
                      Tidak ada kegiatan berjalan atau belum selesai.
                    </div>
                  ) : (
                    ongoingTasks.map(task => {
                      const isOwnTask = matchedCurrentStaff && task.staffNik === matchedCurrentStaff.nik;
                      const canModify = isSuperAdmin || isOwnTask;
                      const parentTask = staffTasks.find(x => x.id === task.parentTaskId);
                      const pInfo = formatTaskPeriodBadge(task);

                      const getBorderClass = (st: StaffTask['status']) => {
                        switch (st) {
                          case 'Selesai': return 'border-l-4 border-emerald-600 bg-emerald-50/20';
                          case 'Dalam Proses': return 'border-l-4 border-amber-500 bg-amber-50/20';
                          case 'Tertunda': return 'border-l-4 border-rose-600 bg-rose-50/20';
                          default: return 'border-l-4 border-[#0c2340] bg-slate-50/50';
                        }
                      };

                      return (
                        <div key={task.id} className={`p-4 rounded-lg border border-slate-200 space-y-2.5 relative hover:border-slate-300 transition-colors ${getBorderClass(task.status)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded font-semibold text-[9px] uppercase border flex items-center gap-1 ${pInfo.badge}`}>
                                <span>{pInfo.icon}</span>
                                <span>{pInfo.label}</span>
                              </span>
                              <span className="text-[10px] text-slate-600 font-mono font-semibold">
                                {pInfo.dateRangeText}
                              </span>
                            </div>

                            {/* Status Quick Switcher Dropdown */}
                            <select
                              value={task.status}
                              onChange={(e) => handleQuickUpdateStatus(task, e.target.value as any)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border outline-none cursor-pointer ${task.status === 'Selesai' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                task.status === 'Dalam Proses' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                  task.status === 'Tertunda' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                    'bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                            >
                              <option value="Belum Mulai">⚪ Belum Mulai</option>
                              <option value="Dalam Proses">🟡 Dalam Proses</option>
                              <option value="Selesai">🟢 Selesai</option>
                              <option value="Tertunda">🔴 Tertunda</option>
                            </select>
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="font-bold text-slate-900 text-xs leading-snug">{task.title}</h4>
                            {task.notes && (
                              <p className="text-slate-600 text-[11px] leading-relaxed">{task.notes}</p>
                            )}
                          </div>

                          {parentTask && (
                            <div className="flex items-center gap-1 text-[10px] bg-slate-50 border border-slate-200 p-2 rounded text-slate-700 font-semibold">
                              <TrendingUp className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <span className="truncate">Melanjutkan: <strong>{parentTask.title}</strong></span>
                            </div>
                          )}

                          {task.attachmentUrl && task.attachmentName && (
                            <div className="pt-1.5 border-t border-slate-100 flex items-center">
                              <a
                                href={`/api/documents/download/${task.attachmentUrl}?token=${getSessionUserToken()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0c2340] hover:underline bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
                              >
                                <Paperclip className="w-3.5 h-3.5" /> Unduh Lampiran: {task.attachmentName}
                              </a>
                            </div>
                          )}

                          {task.externalLink && (
                            <div className="pt-1 flex items-center">
                              <a
                                href={task.externalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 hover:underline bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-emerald-700 shrink-0" /> Buka Tautan GDrive / Lampiran
                              </a>
                            </div>
                          )}

                          {canModify && (
                            <div className="flex justify-end items-center gap-1.5 pt-2 border-t border-slate-200">
                              <button
                                onClick={() => handleOpenEditTask(task)}
                                className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer shadow-xs transition-colors"
                              >
                                <Edit className="w-3 h-3 text-slate-600" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTaskClick(task)}
                                className="px-2 py-0.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-800 rounded text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer shadow-xs transition-colors"
                                title="Hapus Tugas"
                              >
                                <Trash className="w-3 h-3 text-rose-700" /> Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Archive className="w-4 h-4 text-slate-700" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Riwayat Kegiatan (Arsip)</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1 uppercase text-[9px] tracking-wider">Tahun</label>
                    <select
                      value={taskYearFilter}
                      onChange={(e) => setTaskYearFilter(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1 text-xs bg-white text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="Semua">Semua</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      {uniqueArchivedYears.filter(y => y !== 2026 && y !== 2027).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-600 font-semibold block mb-1 uppercase text-[9px] tracking-wider">Bulan</label>
                    <select
                      value={taskMonthFilter}
                      onChange={(e) => setTaskMonthFilter(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1 text-xs bg-white text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="Semua">Semua</option>
                      {MONTHS_IN_INDONESIAN.map(m => (
                        <option key={m.val} value={m.val}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {archivedTasks.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs italic">
                      Belum ada arsip kegiatan selesai pada periode ini.
                    </div>
                  ) : (
                    archivedTasks.map(task => {
                      const isOwnTask = matchedCurrentStaff && task.staffNik === matchedCurrentStaff.nik;
                      const canModify = isSuperAdmin || isOwnTask;
                      const pInfo = formatTaskPeriodBadge(task);

                      return (
                        <div key={task.id} className="bg-emerald-50/30 p-3.5 rounded-lg border-l-4 border-emerald-600 border-r border-y border-emerald-200 shadow-xs space-y-1.5 relative">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-slate-600 font-mono">{pInfo.dateRangeText}</span>
                            <span className="font-semibold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200">Arsip Selesai</span>
                          </div>

                          <h5 className="font-bold text-slate-900 text-xs leading-tight">{task.title}</h5>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {task.attachmentUrl && task.attachmentName && (
                              <a
                                href={`/api/documents/download/${task.attachmentUrl}?token=${getSessionUserToken()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-slate-700 hover:underline font-medium bg-white border border-slate-200 px-1.5 py-0.5 rounded"
                              >
                                <Paperclip className="w-3 h-3" /> Berkas
                              </a>
                            )}
                            {task.externalLink && (
                              <a
                                href={task.externalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-800 hover:underline font-medium bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                              >
                                <ExternalLink className="w-3 h-3" /> Link GDrive
                              </a>
                            )}
                          </div>

                          {canModify && (
                            <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-200/50 text-[10px]">
                              <button
                                onClick={() => handleOpenEditTask(task)}
                                className="text-slate-700 hover:underline font-semibold cursor-pointer"
                              >
                                Edit
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => handleDeleteTaskClick(task)}
                                className="text-rose-700 hover:underline cursor-pointer"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'meetings' && !selectedStaff && (
        <div className="space-y-5">

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">

              <div className="relative w-full lg:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari topik atau pimpinan rapat..."
                  value={meetingSearch}
                  onChange={(e) => setMeetingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span>Mulai:</span>
                  <input
                    type="date"
                    value={meetingStartDate}
                    onChange={(e) => setMeetingStartDate(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-xs outline-none bg-white text-slate-800 font-mono cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span>Selesai:</span>
                  <input
                    type="date"
                    value={meetingEndDate}
                    onChange={(e) => setMeetingEndDate(e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-xs outline-none bg-white text-slate-800 font-mono cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleOpenAddMeeting}
                  className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Catat Rapat
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMeetings.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center text-slate-500 rounded-lg border border-slate-200">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Belum ada dokumentasi rapat staf yang terdaftar.
              </div>
            ) : (
              filteredMeetings.map((meet) => (
                <div key={meet.id} className="bg-white hover:bg-slate-50/50 border border-slate-200 rounded-lg p-4 shadow-xs hover:border-slate-300 transition-colors relative flex flex-col justify-between space-y-3.5">

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 justify-between">
                      <span className="bg-[#0c2340] text-white font-semibold font-mono text-[9px] px-2 py-0.5 rounded shadow-xs">
                        {meet.id}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-600 font-mono font-semibold">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(meet.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-xs leading-tight line-clamp-2" title={meet.title}>
                      {meet.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px]">
                      <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded border border-slate-200">
                        Host: {meet.leaderName}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                        {meet.attendees.length} Peserta
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {meet.attachmentUrl ? (
                      <a
                        href={`/api/documents/download/${meet.attachmentUrl}?token=${getSessionUserToken()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                        title={`Download lampiran: ${meet.attachmentName}`}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">Tanpa Lampiran</span>
                    )}

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setViewingMeeting(meet)}
                        className="py-1 px-3 bg-[#0c2340] hover:bg-[#1b365d] text-white text-[10px] font-semibold rounded shadow-xs transition-colors cursor-pointer"
                      >
                        Lihat Notulensi
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleOpenEditMeeting(meet)}
                          className="p-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-slate-700 transition-colors cursor-pointer"
                          title="Edit Rapat"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {viewingMeeting && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[calc(100vh-4rem)] animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0c2340] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-300" />
                <h3 className="font-bold text-xs">Notulensi Rapat: {viewingMeeting.id}</h3>
              </div>
              <button
                onClick={() => setViewingMeeting(null)}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">Topik Agenda Rapat</span>
                <h2 className="text-xs font-bold text-slate-900 leading-snug">{viewingMeeting.title}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">Tanggal Rapat</span>
                  <span className="font-semibold text-slate-900 block">
                    {new Date(viewingMeeting.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">Lokasi / Tempat</span>
                  <span className="font-semibold text-slate-900 block">{viewingMeeting.location}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">Pimpinan Rapat (Host)</span>
                  <span className="font-semibold text-slate-900 block">{viewingMeeting.leaderName}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Daftar Kehadiran ({viewingMeeting.attendees.length} Orang)</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-200">
                  {viewingMeeting.attendees.map((att, i) => (
                    <span key={i} className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                      {att}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Notulen & Kesepakatan</span>
                <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto font-sans">
                  {viewingMeeting.notes}
                </div>
              </div>

              {(viewingMeeting.attachmentUrl || viewingMeeting.externalLink) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200">
                  {viewingMeeting.attachmentUrl && (
                    <a
                      href={`/api/documents/download/${viewingMeeting.attachmentUrl}?token=${getSessionUserToken()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Download Berkas
                    </a>
                  )}

                  {viewingMeeting.externalLink && (
                    <a
                      href={viewingMeeting.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center px-3 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka Tautan Notulen
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setViewingMeeting(null)}
                className="px-4 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[calc(100vh-4rem)]">
            <div className="bg-[#0c2340] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-300" />
                <h3 className="font-bold text-xs">{editingTask ? 'Ubah Rencana Program Kerja' : 'Entri Kegiatan Kerja Baru'}</h3>
              </div>
              <button
                onClick={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskSubmit} className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Staf Pelaksana</label>
                <select
                  disabled={!isSuperAdmin}
                  value={taskStaffNik}
                  onChange={(e) => {
                    setTaskStaffNik(e.target.value);
                    setTaskParentId('');
                  }}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                >
                  {staffs.map(s => (
                    <option key={s.nik} value={s.nik}>{s.name} ({s.position})</option>
                  ))}
                </select>
              </div>

              {/* Segmented Period Type Picker */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                  Pilih Jenis Periode Kegiatan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { type: 'ONE_TIME_ACTIVITY', label: 'Kegiatan Khusus', icon: '⚡', desc: 'Insidental / Event' },
                    { type: 'DAILY', label: 'Tugas Harian', icon: '📅', desc: 'Rutinitas harian' },
                    { type: 'WEEKLY', label: 'Mingguan', icon: '🗓️', desc: 'Target per pekan' },
                    { type: 'MONTHLY', label: 'Bulanan', icon: '📆', desc: 'Program bulanan' },
                    { type: 'YEARLY', label: 'Tahunan', icon: '🎯', desc: 'Target tahunan' }
                  ].map((p) => (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => {
                        const nextType = p.type as StaffTask['periodType'];
                        setTaskPeriodType(nextType);
                        const currTodayStr = new Date().toISOString().substring(0, 10);

                        if (nextType === 'ONE_TIME_ACTIVITY') {
                          setTaskScheduleMode('SpecificDate');
                          setTaskStartDate(currTodayStr);
                          setTaskEndDate(currTodayStr);
                          setTaskTime('08:00');
                          setTaskTargetDate(currTodayStr);
                        } else if (nextType === 'DAILY') {
                          setTaskScheduleMode('Today');
                          setTaskStartDate(currTodayStr);
                          setTaskEndDate(currTodayStr);
                          setTaskTime('08:00');
                          setTaskTargetDate(currTodayStr);
                        } else if (nextType === 'WEEKLY') {
                          setTaskTargetDate(`${taskWeekYear}-${String(taskWeekMonth).padStart(2, '0')}-W${taskWeekNum}`);
                        } else if (nextType === 'MONTHLY') {
                          setTaskTargetDate(`${taskMonthYear}-${String(taskMonthVal).padStart(2, '0')}`);
                        } else if (nextType === 'YEARLY') {
                          setTaskTargetDate(`${taskYearVal}`);
                        }
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${taskPeriodType === p.type
                        ? 'border-[#0c2340] bg-[#0c2340] text-white shadow-sm ring-1 ring-[#0c2340]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </div>
                      <span className={`text-[9px] mt-0.5 ${taskPeriodType === p.type ? 'text-slate-300' : 'text-slate-400'}`}>
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Date & Period Configuration */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0c2340]" />
                    {taskPeriodType === 'ONE_TIME_ACTIVITY' && 'Pengaturan Waktu Kegiatan Khusus'}
                    {taskPeriodType === 'DAILY' && 'Pengaturan Jadwal Harian'}
                    {taskPeriodType === 'WEEKLY' && 'Pilih Bulan & Pekan Target'}
                    {taskPeriodType === 'MONTHLY' && 'Pilih Bulan & Tahun Pelaksanaan'}
                    {taskPeriodType === 'YEARLY' && 'Pilih Tahun Program'}
                  </label>
                </div>

                {/* 1. ONE_TIME_ACTIVITY Picker */}
                {taskPeriodType === 'ONE_TIME_ACTIVITY' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { mode: 'SpecificDate', label: '📌 Satu Hari Pelaksanaan' },
                        { mode: 'Range', label: '↔️ Rentang Tanggal (Mulai - Selesai)' }
                      ].map((opt) => (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => {
                            setTaskScheduleMode(opt.mode as any);
                            if (opt.mode === 'SpecificDate') {
                              setTaskEndDate(taskStartDate);
                            }
                          }}
                          className={`py-1.5 px-2 rounded text-[10px] font-semibold border transition-all cursor-pointer ${taskScheduleMode === opt.mode
                            ? 'bg-[#0c2340] text-white border-[#0c2340]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {taskScheduleMode === 'Range' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Tanggal Mulai</label>
                          <input
                            type="date"
                            value={taskStartDate}
                            onChange={(e) => {
                              setTaskStartDate(e.target.value);
                              setTaskTargetDate(e.target.value);
                              if (taskEndDate < e.target.value) {
                                setTaskEndDate(e.target.value);
                              }
                            }}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Tanggal Selesai</label>
                          <input
                            type="date"
                            value={taskEndDate}
                            min={taskStartDate}
                            onChange={(e) => setTaskEndDate(e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Jam Mulai</label>
                          <input
                            type="time"
                            value={taskTime}
                            onChange={(e) => setTaskTime(e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Tanggal Pelaksanaan</label>
                          <input
                            type="date"
                            value={taskStartDate}
                            onChange={(e) => {
                              setTaskStartDate(e.target.value);
                              setTaskEndDate(e.target.value);
                              setTaskTargetDate(e.target.value);
                            }}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Jam Pelaksanaan</label>
                          <input
                            type="time"
                            value={taskTime}
                            onChange={(e) => setTaskTime(e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. DAILY Picker */}
                {taskPeriodType === 'DAILY' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { mode: 'Today', label: '☀️ Hari Ini' },
                        { mode: 'SpecificDate', label: '📌 Pilih Tanggal' },
                        { mode: 'Range', label: '↔️ Rentang Hari' }
                      ].map((opt) => (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => {
                            setTaskScheduleMode(opt.mode as any);
                            const currToday = new Date().toISOString().substring(0, 10);
                            if (opt.mode === 'Today') {
                              setTaskStartDate(currToday);
                              setTaskEndDate(currToday);
                              setTaskTargetDate(currToday);
                            }
                          }}
                          className={`py-1.5 px-2 rounded text-[10px] font-semibold border transition-all cursor-pointer ${taskScheduleMode === opt.mode
                            ? 'bg-[#0c2340] text-white border-[#0c2340]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {taskScheduleMode === 'Range' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Mulai Tanggal</label>
                          <input
                            type="date"
                            value={taskStartDate}
                            onChange={(e) => {
                              setTaskStartDate(e.target.value);
                              setTaskTargetDate(e.target.value);
                            }}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Sampai Tanggal</label>
                          <input
                            type="date"
                            value={taskEndDate}
                            min={taskStartDate}
                            onChange={(e) => setTaskEndDate(e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Jam Kegiatan</label>
                          <input
                            type="time"
                            value={taskTime}
                            onChange={(e) => setTaskTime(e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                      </div>
                    ) : taskScheduleMode === 'SpecificDate' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Pilih Tanggal</label>
                          <input
                            type="date"
                            value={taskStartDate}
                            onChange={(e) => {
                              setTaskStartDate(e.target.value);
                              setTaskEndDate(e.target.value);
                              setTaskTargetDate(e.target.value);
                            }}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold uppercase text-slate-500 block">Jam Kegiatan</label>
                          <input
                            type="time"
                            value={taskTime}
                            onChange={(e) => setTaskTime(e.target.value)}
                            className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-200 text-xs">
                        <span className="font-semibold text-slate-700">
                          Hari ini: {formatIndonesianDateFull(new Date().toISOString().substring(0, 10))}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-semibold">Jam:</span>
                          <input
                            type="time"
                            value={taskTime}
                            onChange={(e) => setTaskTime(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white text-slate-800 font-mono"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. WEEKLY Picker */}
                {taskPeriodType === 'WEEKLY' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold uppercase text-slate-500 block">Tahun</label>
                        <select
                          value={taskWeekYear}
                          onChange={(e) => {
                            const y = parseInt(e.target.value, 10);
                            setTaskWeekYear(y);
                            setTaskTargetDate(`${y}-${String(taskWeekMonth).padStart(2, '0')}-W${taskWeekNum}`);
                          }}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-medium cursor-pointer"
                        >
                          {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold uppercase text-slate-500 block">Bulan</label>
                        <select
                          value={taskWeekMonth}
                          onChange={(e) => {
                            const m = parseInt(e.target.value, 10);
                            setTaskWeekMonth(m);
                            setTaskTargetDate(`${taskWeekYear}-${String(m).padStart(2, '0')}-W${taskWeekNum}`);
                          }}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-medium cursor-pointer"
                        >
                          {MONTHS_IN_INDONESIAN.map(m => (
                            <option key={m.val} value={m.val}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-semibold uppercase text-slate-500 block">Pekan Ke</label>
                        <select
                          value={taskWeekNum}
                          onChange={(e) => {
                            const w = parseInt(e.target.value, 10);
                            setTaskWeekNum(w);
                            setTaskTargetDate(`${taskWeekYear}-${String(taskWeekMonth).padStart(2, '0')}-W${w}`);
                          }}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs bg-white text-slate-800 font-medium cursor-pointer"
                        >
                          <option value={1}>Pekan 1 (Tgl 1 - 7)</option>
                          <option value={2}>Pekan 2 (Tgl 8 - 14)</option>
                          <option value={3}>Pekan 3 (Tgl 15 - 21)</option>
                          <option value={4}>Pekan 4 (Tgl 22 - 28)</option>
                          <option value={5}>Pekan 5 (Tgl 29 - Akhir)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. MONTHLY Picker */}
                {taskPeriodType === 'MONTHLY' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold uppercase text-slate-500 block">Bulan Target</label>
                      <select
                        value={taskMonthVal}
                        onChange={(e) => {
                          const m = parseInt(e.target.value, 10);
                          setTaskMonthVal(m);
                          setTaskTargetDate(`${taskMonthYear}-${String(m).padStart(2, '0')}`);
                        }}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 font-medium cursor-pointer"
                      >
                        {MONTHS_IN_INDONESIAN.map(m => (
                          <option key={m.val} value={m.val}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold uppercase text-slate-500 block">Tahun</label>
                      <select
                        value={taskMonthYear}
                        onChange={(e) => {
                          const y = parseInt(e.target.value, 10);
                          setTaskMonthYear(y);
                          setTaskTargetDate(`${y}-${String(taskMonthVal).padStart(2, '0')}`);
                        }}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 font-medium cursor-pointer"
                      >
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* 5. YEARLY Picker */}
                {taskPeriodType === 'YEARLY' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold uppercase text-slate-500 block">Tahun Program</label>
                    <select
                      value={taskYearVal}
                      onChange={(e) => {
                        const y = parseInt(e.target.value, 10);
                        setTaskYearVal(y);
                        setTaskTargetDate(`${y}`);
                      }}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white text-slate-800 font-medium cursor-pointer"
                    >
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                        <option key={y} value={y}>Tahun {y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Live Formatted Summary Preview Box */}
                <div className="mt-2 p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2 shadow-xs">
                  <div className="p-1.5 rounded bg-slate-100 text-[#0c2340] shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                      Ringkasan Target Jadwal Terpilih
                    </span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">
                      {taskPeriodType === 'ONE_TIME_ACTIVITY' && (
                        taskScheduleMode === 'Range'
                          ? `⚡ Kegiatan Khusus: ${formatIndonesianDateShort(taskStartDate)} s/d ${formatIndonesianDateShort(taskEndDate)} • Pukul ${taskTime} WIB`
                          : `⚡ Kegiatan Khusus: ${formatIndonesianDateFull(taskStartDate)} • Pukul ${taskTime} WIB`
                      )}
                      {taskPeriodType === 'DAILY' && (
                        taskScheduleMode === 'Range'
                          ? `📅 Tugas Harian: ${formatIndonesianDateShort(taskStartDate)} s/d ${formatIndonesianDateShort(taskEndDate)} • Pukul ${taskTime} WIB`
                          : taskScheduleMode === 'Today'
                            ? `📅 Tugas Harian: Hari ini (${formatIndonesianDateFull(new Date().toISOString().substring(0, 10))}) • Pukul ${taskTime} WIB`
                            : `📅 Tugas Harian: ${formatIndonesianDateFull(taskStartDate)} • Pukul ${taskTime} WIB`
                      )}
                      {taskPeriodType === 'WEEKLY' && (
                        `🗓️ Target Mingguan: Pekan ke-${taskWeekNum} (${(taskWeekNum - 1) * 7 + 1} - ${Math.min(taskWeekNum * 7, 31)} ${MONTHS_IN_INDONESIAN[taskWeekMonth - 1]?.label} ${taskWeekYear})`
                      )}
                      {taskPeriodType === 'MONTHLY' && (
                        `📆 Target Bulanan: Bulan ${MONTHS_IN_INDONESIAN[taskMonthVal - 1]?.label} ${taskMonthYear}`
                      )}
                      {taskPeriodType === 'YEARLY' && (
                        `🎯 Target Tahunan: Tahun ${taskYearVal}`
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Judul Rencana Kegiatan</label>
                <input
                  type="text"
                  placeholder="Misal: Kunjungan Jemaat ke Cabang"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Melanjutkan Kegiatan Sebelumnya (Opsional)</label>
                <select
                  value={taskParentId}
                  onChange={(e) => setTaskParentId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800 cursor-pointer"
                >
                  <option value="">-- Bukan Kelanjutan Kegiatan Lain --</option>
                  {staffTasks
                    .filter(t => t.staffNik === taskStaffNik && t.id !== editingTask?.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>[{t.targetDate}] {t.title}</option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Status Kerja</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as any)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs outline-none bg-white text-slate-800 cursor-pointer"
                >
                  <option value="Belum Mulai">Belum Mulai</option>
                  <option value="Dalam Proses">Dalam Proses</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Tertunda">Tertunda</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Catatan Detail</label>
                <textarea
                  placeholder="Keterangan pendukung atau rincian kegiatan..."
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800 leading-relaxed font-sans"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                    Tautan GDrive / Berkas Eksternal (Opsional)
                  </label>
                  <a
                    href={GDRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-[#0c2340] hover:underline flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                    title="Buka Folder Google Drive Yayasan untuk upload berkas besar"
                  >
                    <FolderOpen className="w-3 h-3" /> Folder GDrive <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... (Jika berkas > 1 MB)"
                  value={taskExternalLink}
                  onChange={(e) => setTaskExternalLink(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800 font-mono"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                  Unggah Berkas Lampiran Langsung (PDF/Gambar - Maks. 1 MB)
                </label>

                {uploadedFile ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-800 truncate max-w-[200px] flex items-center gap-1 text-[11px]">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {uploadedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="p-1 hover:bg-slate-100 text-rose-700 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-300 rounded bg-white hover:bg-slate-50 transition-colors py-3 px-2 text-center cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1 text-slate-600">
                      <PlusCircle className="w-5 h-5 mx-auto text-slate-400" />
                      <p className="text-[10px] font-semibold">{isUploading ? 'Sedang mengunggah...' : 'Klik untuk memilih berkas lampiran (≤ 1 MB)'}</p>
                      <p className="text-[9px] text-slate-400">Jika berkas &gt; 1 MB, unggah ke Google Drive & cantumkan tautan di atas</p>
                    </div>
                  </div>
                )}
              </div>

                <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
                    className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 rounded text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Simpan Kegiatan
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[calc(100vh-4rem)]">
            <div className="bg-[#0c2340] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-300" />
                <h3 className="font-bold text-xs">{editingMeeting ? 'Ubah Notulensi Rapat Staf' : 'Pencatatan Rapat Staf Baru'}</h3>
              </div>
              <button
                onClick={() => { setIsMeetingModalOpen(false); setEditingMeeting(null); }}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingSubmit} className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Topik / Judul Rapat</label>
                <input
                  type="text"
                  list="meeting-categories-list"
                  placeholder="Pilih kategori atau ketik topik rapat..."
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800"
                  required
                />
                <datalist id="meeting-categories-list">
                  {(profile?.meetingCategories || [
                    "Rapat Pleno Yayasan",
                    "Rapat Koordinasi Mingguan",
                    "Rapat Divisi / Departemen",
                    "Evaluasi Bulanan",
                    "Rapat Anggaran & Finansial",
                    "Rapat Darurat / Khusus"
                  ]).map((cat, idx) => (
                    <option key={idx} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Tanggal Rapat</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs outline-none bg-white text-slate-800 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Tempat / Lokasi</label>
                  <input
                    type="text"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Pimpinan Rapat (Host)</label>
                <input
                  type="text"
                  placeholder="Nama pimpinan rapat..."
                  value={meetingLeaderName}
                  onChange={(e) => setMeetingLeaderName(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Daftar Hadir Staf ({meetingAttendees.length} Terpilih)</label>
                <div className="border border-slate-200 rounded p-2.5 bg-slate-50 max-h-32 overflow-y-auto grid grid-cols-2 gap-1.5">
                  {staffs.map(s => {
                    const isChecked = meetingAttendees.includes(s.name);
                    return (
                      <label key={s.nik} className="flex items-center gap-1.5 p-1 hover:bg-white rounded transition-colors cursor-pointer text-[11px] font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setMeetingAttendees(prev => prev.filter(x => x !== s.name));
                            } else {
                              setMeetingAttendees(prev => [...prev, s.name]);
                            }
                          }}
                          className="rounded text-[#0c2340] focus:ring-[#0c2340] cursor-pointer"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">Notulen / Keputusan & Tindakan</label>
                <textarea
                  placeholder="Tulis ringkasan hasil rapat, keputusan, rencana lanjutan, dll..."
                  rows={4}
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800 leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                    Tautan Rapat / GDrive / Zoom (Opsional)
                  </label>
                  <a
                    href={GDRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-[#0c2340] hover:underline flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                    title="Buka Folder Google Drive Yayasan untuk upload berkas notulen besar"
                  >
                    <FolderOpen className="w-3 h-3" /> Folder GDrive <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... atau https://zoom.us/..."
                  value={meetingExternalLink}
                  onChange={(e) => setMeetingExternalLink(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800 font-mono"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                  Lampiran Notulen Resmi (PDF/Gambar - Maks. 1 MB)
                </label>

                {uploadedFile ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                    <span className="font-semibold text-slate-800 truncate max-w-[250px] flex items-center gap-1 text-[11px]">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {uploadedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="p-1 hover:bg-slate-100 text-rose-700 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-300 rounded bg-white hover:bg-slate-50 transition-colors py-3 px-2 text-center cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1 text-slate-600">
                      <PlusCircle className="w-5 h-5 mx-auto text-slate-400" />
                      <p className="text-[10px] font-semibold">{isUploading ? 'Sedang mengunggah...' : 'Klik untuk memilih berkas PDF/Gambar (≤ 1 MB)'}</p>
                      <p className="text-[9px] text-slate-400">Jika berkas &gt; 1 MB, unggah ke Google Drive & cantumkan tautan di atas</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsMeetingModalOpen(false); setEditingMeeting(null); }}
                  className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 rounded text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Notulen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
            {/* SUBTAB 3: STRUKTUR KEPENGURUSAN PELAYANAN (BERDASARKAN SEKTOR & WILAYAH PELAYANAN) */}
      {subTab === 'structure' && !selectedStaff && (
        <div className="space-y-6">
          
          {/* Header & Sector Switcher */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#0c2340]" />
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Struktur Kepengurusan Pelayanan
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Pengelolaan struktur kepengurusan sektor Siswa, Mahasiswa, dan Alumni yang terdistribusi di setiap wilayah pelayanan.
                </p>
              </div>

              <button
                onClick={() => handleOpenAddCommittee()}
                className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4 text-amber-400" /> Tetapkan Pengurus Baru
              </button>
            </div>

            {/* Sektor Selector Pills */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 w-full sm:w-auto flex-wrap">
                {availableSectors.map((sec) => {
                  const count = members.filter(m => (m.component === sec || (sec === 'Mahasiswa' && !m.component)) && (m.committeeRole || m.communitySpaces?.length)).length;
                  return (
                    <button
                      key={sec}
                      onClick={() => setSelectedSector(sec as any)}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        selectedSector === sec
                          ? 'bg-[#0c2340] text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {sec === 'Siswa' ? <School className="w-3.5 h-3.5" /> : sec === 'Mahasiswa' ? <GraduationCap className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
                      <span>Pengurus {sec}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-normal ${
                        selectedSector === sec ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar for Members/Committee */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama pengurus, jabatan..."
                  value={structureSearch}
                  onChange={(e) => setStructureSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>
            </div>

            {/* Wilayah Pelayanan Filter Pills */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">Wilayah Pelayanan:</span>
              <button
                onClick={() => setSelectedRegionFilter('Semua')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  selectedRegionFilter === 'Semua'
                    ? 'bg-[#0c2340] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Semua Wilayah
              </button>
              {availableRegions.map(reg => (
                <button
                  key={reg}
                  onClick={() => setSelectedRegionFilter(reg)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    selectedRegionFilter === reg
                      ? 'bg-[#0c2340] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped by Wilayah Pelayanan */}
          {(() => {
            const sectorMembersList = members.filter(m => {
              if (selectedSector === 'Mahasiswa') {
                return m.component === 'Mahasiswa' || !m.component;
              }
              return m.component === selectedSector;
            });

            // Filter by search query
            const searchFilteredMembers = sectorMembersList.filter(m => {
              if (!structureSearch.trim()) return true;
              const q = structureSearch.toLowerCase();
              return (
                m.fullName.toLowerCase().includes(q) ||
                m.nickName.toLowerCase().includes(q) ||
                m.id.toLowerCase().includes(q) ||
                (m.committeeRole || '').toLowerCase().includes(q) ||
                (m.coreCircleCommunity || '').toLowerCase().includes(q) ||
                (m.region || '').toLowerCase().includes(q)
              );
            });

            // Determine which regions to display
            const regionsToDisplay = selectedRegionFilter === 'Semua'
              ? availableRegions
              : [selectedRegionFilter];

            const totalAssignedCount = searchFilteredMembers.filter(m => m.committeeRole || m.coreCircleCommunity).length;

            return (
              <div className="space-y-6">
                {regionsToDisplay.map(regionName => {
                  const regionMembers = searchFilteredMembers.filter(m => 
                    (m.region || '').toLowerCase() === regionName.toLowerCase()
                  );
                  const regionPengurus = regionMembers.filter(m => m.committeeRole || m.coreCircleCommunity);

                  if (selectedRegionFilter === 'Semua' && regionPengurus.length === 0 && !structureSearch) {
                    return null;
                  }

                  return (
                    <div key={regionName} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0c2340]"></span>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Pengurus {selectedSector} &mdash; Wilayah {regionName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-semibold">
                            {regionPengurus.length} Pengurus
                          </span>
                          <button
                            onClick={() => handleOpenAddCommittee(regionName)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-600" /> Tambah
                          </button>
                        </div>
                      </div>

                      <div className="p-4">
                        {regionPengurus.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {regionPengurus.map(member => (
                              <div key={member.id} className="p-3.5 bg-white border border-slate-200 rounded-lg hover:border-slate-400 transition-colors shadow-2xs space-y-2 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-[#0c2340] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                        {member.nickName ? member.nickName.slice(0, 2).toUpperCase() : member.fullName.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-xs text-slate-900 leading-snug">{member.fullName}</h5>
                                        <span className="text-[10px] font-mono text-slate-500">{member.id} &bull; {member.region}</span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                                      {member.statusKeaktifan}
                                    </span>
                                  </div>

                                  {/* Role Badge */}
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-[#0c2340] font-bold px-2 py-0.5 rounded border border-slate-300">
                                      👑 {member.committeeRole || `Pengurus ${selectedSector} ${member.region}`}
                                    </span>
                                    {member.coreCircleCommunity && (
                                      <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                        {member.coreCircleCommunity}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                                  <span className="text-slate-500">{member.phone || 'No WA: -'}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleOpenEditCommittee(member)}
                                      className="text-[#0c2340] hover:underline font-semibold cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-slate-300">&bull;</span>
                                    <button
                                      onClick={() => handleRemoveCommittee(member)}
                                      className="text-rose-700 hover:underline cursor-pointer"
                                    >
                                      Lepas
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4 space-y-2">
                            <p className="text-xs text-slate-500">Belum ada pengurus {selectedSector} terdaftar di Wilayah {regionName}.</p>
                            <button
                              onClick={() => handleOpenAddCommittee(regionName)}
                              className="px-3 py-1 bg-white hover:bg-slate-100 text-[#0c2340] border border-slate-300 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Tetapkan Pengurus {regionName}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {totalAssignedCount === 0 && (
                  <div className="p-10 text-center bg-white rounded-lg border border-slate-200 shadow-xs space-y-3">
                    <Award className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">Belum Ada Pengurus {selectedSector} Terdaftar</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Tetapkan anggota pelayanan sebagai pengurus {selectedSector.toLowerCase()} di wilayah pelayanan yang telah dikonfigurasi.
                    </p>
                    <button
                      onClick={() => handleOpenAddCommittee()}
                      className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-amber-400" /> Tetapkan Pengurus Pertama
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* MODAL PENETAPAN / EDIT PENGURUS PELAYANAN */}
      {isCommitteeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[calc(100vh-4rem)]">
            <div className="bg-[#0c2340] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs">
                  {editingCommitteeMember ? 'Edit Penugasan Kepengurusan' : 'Penetapan Pengurus Pelayanan'}
                </h3>
              </div>
              <button
                onClick={() => { setIsCommitteeModalOpen(false); setEditingCommitteeMember(null); }}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCommitteeSubmit} className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              
              {/* Sektor & Wilayah Pelayanan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                    1. Sektor Pelayanan
                  </label>
                  <select
                    value={committeeSector}
                    onChange={(e) => setCommitteeSector(e.target.value as any)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800 font-medium"
                    required
                  >
                    {availableSectors.map(sec => (
                      <option key={sec} value={sec}>Pelayanan {sec}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                    2. Wilayah Pelayanan
                  </label>
                  <select
                    value={committeeRegion}
                    onChange={(e) => setCommitteeRegion(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800 font-medium"
                    required
                  >
                    {availableRegions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pilih Anggota Pelayanan */}
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                  3. Pilih Anggota Pelayanan (Database Anggota)
                </label>
                <select
                  value={committeeMemberId}
                  onChange={(e) => {
                    setCommitteeMemberId(e.target.value);
                    const selected = members.find(m => m.id === e.target.value);
                    if (selected?.region) {
                      setCommitteeRegion(selected.region);
                    }
                  }}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800"
                  required
                >
                  <option value="">-- Pilih Anggota Pelayanan --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.id}] {m.fullName} ({m.nickName}) - {m.component} ({m.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Jabatan / Peran Kepengurusan */}
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                  4. Jabatan / Amanah Kepengurusan
                </label>
                <input
                  type="text"
                  placeholder="Misal: Ketua Pengurus, Koordinator Pelayanan, Sekretaris..."
                  value={committeeRoleName}
                  onChange={(e) => setCommitteeRoleName(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800"
                  required
                />

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">Pilihan Cepat:</span>
                  {[
                    'Ketua Pengurus',
                    'Wakil Ketua',
                    'Sekretaris',
                    'Bendahara',
                    'Koordinator Pelayanan',
                    'Sie Acara',
                    'Sie Doa & Pemerhati',
                    'Tim Media'
                  ].map(roleItem => (
                    <button
                      key={roleItem}
                      type="button"
                      onClick={() => setCommitteeRoleName(roleItem)}
                      className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 cursor-pointer"
                    >
                      {roleItem}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nama Komunitas Terkait */}
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                  5. Nama Komunitas / Tim Kepengurusan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder={`Misal: Pengurus ${committeeSector} ${committeeRegion}, Tim Pelayanan Misi...`}
                  value={committeeCommunityName}
                  onChange={(e) => setCommitteeCommunityName(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800"
                />
              </div>

              {/* Catatan / Periode Penugasan */}
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold uppercase tracking-wider text-[9px] block">
                  6. Catatan Penugasan / Periode (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Periode Kepengurusan 2026/2027, Pembina: Joseph Daniel..."
                  value={committeeNotesText}
                  onChange={(e) => setCommitteeNotesText(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none bg-white text-slate-800"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 leading-relaxed">
                ℹ️ <strong>Sinkronisasi Otomatis:</strong> Data kepengurusan langsung tersinkron ke profil anggota di menu <strong>Anggota Pelayanan</strong>, tercatat dalam log pengutusan, dan dicetak pada rapor pertumbuhan anggota.
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsCommitteeModalOpen(false); setEditingCommitteeMember(null); }}
                  className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 rounded text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {editingCommitteeMember ? 'Simpan Perubahan' : 'Tetapkan Pengurus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
