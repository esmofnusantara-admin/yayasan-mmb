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
  FolderOpen
} from 'lucide-react';
import { StaffTask, StaffMeeting, Staff } from '../types';

interface StaffTasksTabProps {
  staffTasks: StaffTask[];
  staffMeetings: StaffMeeting[];
  staffs: Staff[];
  currentUser: any;
  currentRole: string;
  onSaveTask: (task: StaffTask) => Promise<void>;
  onDeleteTask: (id: string, title: string) => Promise<void>;
  onSaveMeeting: (meeting: StaffMeeting) => Promise<void>;
  onDeleteMeeting: (id: string, title: string) => Promise<void>;
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

const getMonthFromTargetDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  if (dateStr.includes('-W')) {
    const [yearPart, weekPart] = dateStr.split('-W');
    const y = parseInt(yearPart);
    const w = parseInt(weekPart);
    if (!isNaN(y) && !isNaN(w)) {
      const d = new Date(y, 0, 1 + (w - 1) * 7);
      return d.getMonth() + 1;
    }
  } else if (dateStr.length === 7 && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    const m = parseInt(parts[1]);
    if (!isNaN(m)) return m;
  }
  return 0;
};

const getYearFromTargetDate = (dateStr: string): number => {
  if (!dateStr) return 0;
  const yearPart = dateStr.split('-')[0];
  const y = parseInt(yearPart);
  return isNaN(y) ? 0 : y;
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

export default function StaffTasksTab({
  staffTasks,
  staffMeetings,
  staffs,
  currentUser,
  currentRole,
  onSaveTask,
  onDeleteTask,
  onSaveMeeting,
  onDeleteMeeting
}: StaffTasksTabProps) {
  const [subTab, setSubTab] = useState<'tasks' | 'meetings'>('tasks');
  
  // Search state for staff grid
  const [staffSearch, setStaffSearch] = useState('');

  // Selected staff for full page task details (Null means show grid)
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

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<StaffMeeting | null>(null);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string } | null>(null);

  // Form Fields - Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStaffNik, setTaskStaffNik] = useState('');
  const [taskPeriodType, setTaskPeriodType] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
  const [taskTargetDate, setTaskTargetDate] = useState('');
  const [taskStatus, setTaskStatus] = useState<StaffTask['status']>('Belum Mulai');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskParentId, setTaskParentId] = useState('');

  // Form Fields - Meeting
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('Kantor Yayasan MMB');
  const [meetingLeaderName, setMeetingLeaderName] = useState('');
  const [meetingAttendees, setMeetingAttendees] = useState<string[]>([]);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingExternalLink, setMeetingExternalLink] = useState('');

  const isSuperAdmin = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan' || currentRole === 'Sekretaris';

  // Get current logged-in staff info if any
  const matchedCurrentStaff = staffs.find(s => s.email?.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim());

  // Determine current calendar Month and Year
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  const handleOpenAddTask = (staffNik?: string) => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskStaffNik(staffNik || matchedCurrentStaff?.nik || staffs[0]?.nik || '');
    setTaskPeriodType('Weekly');
    
    // Set default target period (current week)
    const today = new Date();
    const currentYear = today.getFullYear();
    const oneJan = new Date(currentYear, 0, 1);
    const numberOfDays = Math.floor((today.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const currentWeekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    setTaskTargetDate(`${currentYear}-W${String(currentWeekNumber).padStart(2, '0')}`);
    setTaskStatus('Belum Mulai');
    setTaskNotes('');
    setTaskParentId('');
    setUploadedFile(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: StaffTask) => {
    // Standard staff can only edit their own task unless they are Admin
    if (!isSuperAdmin && matchedCurrentStaff && task.staffNik !== matchedCurrentStaff.nik) {
      alert('Akses Ditolak: Anda hanya diizinkan mengubah program kerja Anda sendiri.');
      return;
    }

    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskStaffNik(task.staffNik);
    setTaskPeriodType(task.periodType);
    setTaskTargetDate(task.targetDate);
    setTaskStatus(task.status);
    setTaskNotes(task.notes || '');
    setTaskParentId(task.parentTaskId || '');
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

  // Convert File to Base64 and upload to server document library
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran berkas melebihi batas maksimum 5 MB!');
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
    if (!taskTitle || !taskTargetDate) {
      alert('Judul Kegiatan & Target Periode wajib diisi!');
      return;
    }

    const assignedStaff = staffs.find(s => s.nik === taskStaffNik);
    const staffName = assignedStaff ? assignedStaff.name : 'Unknown Staff';

    if (editingTask) {
      if (!window.confirm('Apakah Anda yakin ingin menyimpan perubahan program kerja ini?')) {
        return;
      }
    }

    const taskPayload: StaffTask = {
      id: editingTask ? editingTask.id : `ST-2026-${String(staffTasks.length + 1).padStart(5, '0')}`,
      staffNik: taskStaffNik,
      staffName,
      title: taskTitle,
      periodType: taskPeriodType,
      targetDate: taskTargetDate,
      status: taskStatus,
      notes: taskNotes,
      attachmentUrl: uploadedFile?.id || undefined,
      attachmentName: uploadedFile?.name || undefined,
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

    const meetingPayload: StaffMeeting = {
      id: editingMeeting ? editingMeeting.id : `SM-2026-${String(staffMeetings.length + 1).padStart(5, '0')}`,
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

  // Filtered staffs based on search
  const filteredStaffs = staffs.filter(s => {
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
      {/* HEADER BANNER WITH SOPHISTICATED GRADIENT ACCENT */}
      {!selectedStaff && (
        <div className="bg-gradient-to-r from-indigo-700 via-violet-650 to-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden font-sans border-b-4 border-indigo-500/20">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                <ClipboardList className="w-6 h-6 text-indigo-100" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Program & Rapat Staf</h1>
                <p className="text-xs text-indigo-150 font-medium">Halaman pemantauan program kerja bulanan, penugasan berlanjut, dan arsip notulensi rapat</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABS SELECTOR (Only show if not in full-page detail screen) */}
      {!selectedStaff && (
        <div className="flex border border-slate-200 bg-white p-1 rounded-2xl shadow-xs max-w-sm font-sans">
          <button
            onClick={() => setSubTab('tasks')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              subTab === 'tasks'
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-650 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Program Kerja Staf
          </button>
          <button
            onClick={() => setSubTab('meetings')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              subTab === 'meetings'
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-650 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Dokumentasi Rapat
          </button>
        </div>
      )}

      {/* VIEW 1: STAFF PROGRAM KERJA (GRID OF STAFF CARDS) */}
      {subTab === 'tasks' && !selectedStaff && (
        <div className="space-y-6 font-sans">
          
          {/* STAT CARDS IN THE FRONT VIEW (DASHBOARD HIGHLIGHTS) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Kerja Bulan Ini</span>
                <span className="text-lg font-bold text-slate-800">{totalTasksThisMonth}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Selesai Bulan Ini</span>
                <span className="text-lg font-bold text-emerald-700">{completedTasksThisMonth}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Dalam Proses</span>
                <span className="text-lg font-bold text-amber-700">{inProgressTasksThisMonth}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Tertunda/Pending</span>
                <span className="text-lg font-bold text-rose-700">{pendingTasksThisMonth}</span>
              </div>
            </div>
          </div>

          {/* SEARCH BAR & GENERAL ADD */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama staf/NIK..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleOpenAddTask()}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-700 hover:to-violet-750 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/15 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Entri Kegiatan Staf
              </button>
            </div>
          </div>

          {/* STAFF CARDS GRID (COLORFUL UPGRADES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaffs.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                Tidak ada data staf yang sesuai pencarian.
              </div>
            ) : (
              filteredStaffs.map((st) => {
                // Monthly progress bar (Filtered to current month only!)
                const myMonthlyTasks = staffTasks.filter(t => {
                  if (t.staffNik !== st.nik) return false;
                  const tMonth = getMonthFromTargetDate(t.targetDate);
                  const tYear = getYearFromTargetDate(t.targetDate);
                  return tMonth === currentMonth && tYear === currentYear;
                });
                
                const completed = myMonthlyTasks.filter(t => t.status === 'Selesai').length;
                const total = myMonthlyTasks.length;
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <div key={st.nik} className="bg-white rounded-3xl border-t-4 border-indigo-650 border-x border-b border-slate-100 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 uppercase shrink-0 text-sm">
                          {st.name.substring(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-850 text-[13px] leading-tight">{st.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{st.nik}</span>
                          <span className="text-[10px] text-indigo-600 font-bold block mt-1">{st.position || 'Staf Pelaksana'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress details (Month only!) */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-450 font-bold uppercase tracking-wider">Progres Bulan Ini ({MONTHS_IN_INDONESIAN[currentMonth - 1].label})</span>
                        {total > 0 ? (
                          <span className="font-bold text-slate-700">{completed} / {total} Selesai ({percent}%)</span>
                        ) : (
                          <span className="text-slate-400 italic">Tidak ada kegiatan</span>
                        )}
                      </div>
                      
                      {/* Bar indicator with beautiful gradient fill */}
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            total > 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-slate-200'
                          }`} 
                          style={{ width: `${total > 0 ? percent : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Actions button */}
                    <button
                      onClick={() => {
                        setSelectedStaff(st);
                        setTaskMonthFilter('Semua');
                        setTaskYearFilter('Semua');
                        setTaskStatusFilter('Semua');
                      }}
                      className="w-full py-2 bg-indigo-50/60 hover:bg-indigo-650 border border-indigo-100 hover:border-indigo-650 text-indigo-700 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      Lihat Rincian Kerja <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: STAFF PROGRAM KERJA (FULL-PAGE DETAILED VIEW FOR SELECTED STAFF MEMBER) */}
      {subTab === 'tasks' && selectedStaff && (
        <div className="space-y-6 font-sans animate-fadeIn">
          {/* BACK NAVIGATION HEADER BAR WITH TINTED ACCENT BACKGROUND */}
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50/45 p-5 rounded-3xl border border-indigo-100/60 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedStaff(null)}
                className="flex items-center gap-1.5 text-xs text-indigo-650 hover:text-indigo-800 font-bold transition-all cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-indigo-150 shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-600" /> ← Kembali ke Daftar Staf
              </button>
              
              <div className="flex items-center gap-3 pt-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-md shadow-indigo-500/10 border border-white/20">
                  {selectedStaff.name.substring(0, 2)}
                </div>
                <div>
                  <h2 className="text-md font-bold text-slate-850 leading-tight">Rincian Kegiatan: {selectedStaff.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-450 font-medium">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">NIK: {selectedStaff.nik}</span>
                    <span>•</span>
                    <span className="text-indigo-600 font-bold">{selectedStaff.position || 'Staf Pelaksana'}</span>
                  </div>
                </div>
              </div>
            </div>

            {(isSuperAdmin || (matchedCurrentStaff && selectedStaff.nik === matchedCurrentStaff.nik)) && (
              <button
                onClick={() => handleOpenAddTask(selectedStaff.nik)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-700 hover:to-violet-750 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/15 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Kegiatan
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* LEFT COLUMN: ONGOING & ACTIVE TASKS (Kegiatan Berjalan) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Kegiatan Berjalan & Bulan Ini</h3>
                </div>

                <div className="space-y-4">
                  {ongoingTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic">
                      Tidak ada kegiatan berjalan atau belum selesai.
                    </div>
                  ) : (
                    ongoingTasks.map(task => {
                      const isOwnTask = matchedCurrentStaff && task.staffNik === matchedCurrentStaff.nik;
                      const canModify = isSuperAdmin || isOwnTask;
                      const parentTask = staffTasks.find(x => x.id === task.parentTaskId);

                      // Style task cards color-coded based on status
                      const getBorderClass = (st: StaffTask['status']) => {
                        switch(st) {
                          case 'Selesai': return 'border-l-4 border-emerald-500 bg-emerald-500/5';
                          case 'Dalam Proses': return 'border-l-4 border-amber-500 bg-amber-500/5';
                          case 'Tertunda': return 'border-l-4 border-rose-500 bg-rose-500/5';
                          default: return 'border-l-4 border-blue-500 bg-blue-500/5';
                        }
                      };

                      return (
                        <div key={task.id} className={`p-4.5 rounded-2xl border border-slate-200/60 space-y-3 relative hover:border-slate-300 transition-colors ${getBorderClass(task.status)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                                task.periodType === 'Weekly' ? 'bg-indigo-100 text-indigo-700' :
                                task.periodType === 'Monthly' ? 'bg-sky-100 text-sky-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {task.periodType === 'Weekly' ? 'Mingguan' :
                                 task.periodType === 'Monthly' ? 'Bulanan' : 'Tahunan'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono font-bold">
                                {task.targetDate}
                              </span>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              task.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                              task.status === 'Dalam Proses' ? 'bg-amber-100 text-amber-800' :
                              task.status === 'Tertunda' ? 'bg-rose-100 text-rose-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {task.status}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-850 text-[12.5px] leading-snug">{task.title}</h4>
                            {task.notes && (
                              <p className="text-slate-500 text-[11px] leading-relaxed">{task.notes}</p>
                            )}
                          </div>

                          {parentTask && (
                            <div className="flex items-center gap-1 text-[10px] bg-white border border-indigo-100 p-2 rounded-lg text-indigo-700 font-bold">
                              <TrendingUp className="w-3.5 h-3.5 text-indigo-650 shrink-0 animate-bounce" />
                              <span className="truncate">Melanjutkan: <strong>{parentTask.title}</strong></span>
                            </div>
                          )}

                          {task.attachmentUrl && task.attachmentName && (
                            <div className="pt-2 border-t border-slate-100 flex items-center">
                              <a
                                href={`/api/documents/download/${task.attachmentUrl}?token=${getSessionUserToken()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md"
                              >
                                <Paperclip className="w-3.5 h-3.5" /> Unduh Lampiran: {task.attachmentName}
                              </a>
                            </div>
                          )}

                          {canModify && (
                            <div className="flex justify-end items-center gap-1.5 pt-2.5 border-t border-slate-200/40">
                              <button
                                onClick={() => handleOpenEditTask(task)}
                                className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-xs"
                              >
                                <Edit className="w-3.5 h-3.5 text-indigo-600" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTaskClick(task)}
                                className="p-1 px-1.5 text-red-500 hover:bg-red-50 rounded-lg text-[10px] cursor-pointer"
                                title="Hapus Tugas"
                              >
                                <Trash className="w-3.5 h-3.5" />
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

            {/* RIGHT COLUMN: HISTORICAL COMPLETED ARCHIVE (Riwayat Kegiatan Selesai) */}
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Archive className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Riwayat Kegiatan (Arsip)</h3>
                </div>

                {/* Archive sub-filters */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold block mb-1 uppercase text-[8px] tracking-wider">Tahun</label>
                    <select
                      value={taskYearFilter}
                      onChange={(e) => setTaskYearFilter(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs bg-white outline-none cursor-pointer"
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
                    <label className="text-slate-400 font-bold block mb-1 uppercase text-[8px] tracking-wider">Bulan</label>
                    <select
                      value={taskMonthFilter}
                      onChange={(e) => setTaskMonthFilter(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 text-xs bg-white outline-none cursor-pointer"
                    >
                      <option value="Semua">Semua</option>
                      {MONTHS_IN_INDONESIAN.map(m => (
                        <option key={m.val} value={m.val}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Archived list (compact colored items) */}
                <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                  {archivedTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-450 italic">
                      Belum ada arsip kegiatan selesai pada periode ini.
                    </div>
                  ) : (
                    archivedTasks.map(task => {
                      const isOwnTask = matchedCurrentStaff && task.staffNik === matchedCurrentStaff.nik;
                      const canModify = isSuperAdmin || isOwnTask;

                      return (
                        <div key={task.id} className="bg-emerald-50/20 p-4 rounded-xl border-l-4 border-emerald-500 border-r border-y border-slate-100 shadow-xs space-y-2 relative">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-500 font-mono">{task.targetDate}</span>
                            <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Arsip Selesai</span>
                          </div>
                          
                          <h5 className="font-bold text-slate-800 text-[11.5px] leading-tight">{task.title}</h5>
                          
                          {task.attachmentUrl && task.attachmentName && (
                            <a
                              href={`/api/documents/download/${task.attachmentUrl}?token=${getSessionUserToken()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-indigo-650 hover:underline font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> Berkas
                            </a>
                          )}

                          {canModify && (
                            <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-200/50 text-[10px]">
                              <button
                                onClick={() => handleOpenEditTask(task)}
                                className="text-indigo-600 hover:underline font-bold cursor-pointer"
                              >
                                Edit
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => handleDeleteTaskClick(task)}
                                className="text-red-500 hover:underline cursor-pointer"
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

      {/* VIEW 2: STAFF MEETINGS DOCUMENTATION (COMPACT CARDS GRID) */}
      {subTab === 'meetings' && !selectedStaff && (
        <div className="space-y-6 font-sans">
          
          {/* ADVANCED FILTER BAR WITH DATE RANGE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              {/* Search text */}
              <div className="relative w-full lg:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari topik atau pimpinan rapat..."
                  value={meetingSearch}
                  onChange={(e) => setMeetingSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Date Filters & Add Action */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Mulai:</span>
                  <input
                    type="date"
                    value={meetingStartDate}
                    onChange={(e) => setMeetingStartDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none bg-white font-mono cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Selesai:</span>
                  <input
                    type="date"
                    value={meetingEndDate}
                    onChange={(e) => setMeetingEndDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none bg-white font-mono cursor-pointer"
                  />
                </div>

                {isSuperAdmin && (
                  <button
                    onClick={handleOpenAddMeeting}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-650 to-violet-650 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/15 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Catat Rapat
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MEETING CARDS GRID (COMPACT & RICH UX) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeetings.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                Belum ada dokumentasi rapat staf yang terdaftar.
              </div>
            ) : (
              filteredMeetings.map((meet) => (
                <div key={meet.id} className="bg-white hover:bg-slate-50/10 border-t-4 border-violet-500 border-x border-b border-slate-100 rounded-3xl p-5 shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 relative flex flex-col justify-between space-y-4">
                  
                  <div className="space-y-2.5">
                    {/* Top tags */}
                    <div className="flex flex-wrap items-center gap-1.5 justify-between">
                      <span className="bg-violet-600 text-white font-semibold font-mono text-[9px] px-2.5 py-0.5 rounded-lg shadow-sm">
                        {meet.id}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono font-bold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(meet.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-850 text-[13px] leading-tight line-clamp-2" title={meet.title}>
                      {meet.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                      <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg">
                        Host: {meet.leaderName}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-lg">
                        {meet.attendees.length} Peserta
                      </span>
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    {/* Attachment trigger */}
                    {meet.attachmentUrl ? (
                      <a
                        href={`/api/documents/download/${meet.attachmentUrl}?token=${getSessionUserToken()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all"
                        title={`Download lampiran: ${meet.attachmentName}`}
                      >
                        <FileDown className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-slate-350 text-[10px] italic">Tanpa Lampiran</span>
                    )}

                    {/* View Details Button */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setViewingMeeting(meet)}
                        className="py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Lihat Notulensi
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleOpenEditMeeting(meet)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                          title="Edit Rapat"
                        >
                          <Edit className="w-3.5 h-3.5" />
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

      {/* DETAIL MODAL: COMPACT VIEW MEETING MINUTES (POPUP) */}
      {viewingMeeting && (
        <div className="fixed inset-0 bg-slate-950/65 flex items-center justify-center p-4 z-50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[calc(100vh-4rem)] scale-95 transition-all">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm">Notulensi Rapat: {viewingMeeting.id}</h3>
              </div>
              <button 
                onClick={() => setViewingMeeting(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Topik Agenda Rapat</span>
                <h2 className="text-sm font-bold text-slate-850 leading-snug">{viewingMeeting.title}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Tanggal Rapat</span>
                  <span className="font-semibold text-slate-700 block">
                    {new Date(viewingMeeting.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Lokasi / Tempat</span>
                  <span className="font-semibold text-slate-700 block">{viewingMeeting.location}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/50">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Pimpinan Rapat (Host)</span>
                  <span className="font-semibold text-slate-700 block">{viewingMeeting.leaderName}</span>
                </div>
              </div>

              {/* Attendance list */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Daftar Kehadiran ({viewingMeeting.attendees.length} Orang)</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  {viewingMeeting.attendees.map((att, i) => (
                    <span key={i} className="bg-white border border-slate-200 text-slate-650 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {att}
                    </span>
                  ))}
                </div>
              </div>

              {/* Full decision notes */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Rangking Notulen & Kesepakatan</span>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[11.5px] text-slate-700 leading-relaxed font-sans whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {viewingMeeting.notes}
                </div>
              </div>

              {/* Attachments & external links */}
              {(viewingMeeting.attachmentUrl || viewingMeeting.externalLink) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  {viewingMeeting.attachmentUrl && (
                    <a
                      href={`/api/documents/download/${viewingMeeting.attachmentUrl}?token=${getSessionUserToken()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FileDown className="w-4 h-4" /> Download Berkas Notulen
                    </a>
                  )}

                  {viewingMeeting.externalLink && (
                    <a
                      href={viewingMeeting.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <ExternalLink className="w-4 h-4" /> Buka Tautan Notulen
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="p-4.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setViewingMeeting(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL: ADD/EDIT STAFF TASK */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 flex items-center justify-center p-4 z-50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden scale-95 transition-all flex flex-col max-h-[calc(100vh-4rem)]">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm">{editingTask ? 'Ubah Rencana Program Kerja' : 'Entri Kegiatan Kerja Baru'}</h3>
              </div>
              <button 
                onClick={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTaskSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Staf Pelaksana</label>
                <select
                  disabled={!isSuperAdmin}
                  value={taskStaffNik}
                  onChange={(e) => {
                    setTaskStaffNik(e.target.value);
                    setTaskParentId(''); // reset parent relation
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                >
                  {staffs.map(s => (
                    <option key={s.nik} value={s.nik}>{s.name} ({s.position})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Jenis Periode</label>
                  <select
                    value={taskPeriodType}
                    onChange={(e) => {
                      setTaskPeriodType(e.target.value as any);
                      setTaskTargetDate('');
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none bg-slate-50 cursor-pointer"
                  >
                    <option value="Weekly">Mingguan</option>
                    <option value="Monthly">Bulanan</option>
                    <option value="Yearly">Tahunan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Target Periode</label>
                  {taskPeriodType === 'Weekly' ? (
                    <input
                      type="week"
                      value={taskTargetDate}
                      onChange={(e) => setTaskTargetDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold outline-none bg-slate-50 font-mono"
                      required
                    />
                  ) : taskPeriodType === 'Monthly' ? (
                    <input
                      type="month"
                      value={taskTargetDate}
                      onChange={(e) => setTaskTargetDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold outline-none bg-slate-50 font-mono"
                      required
                    />
                  ) : (
                    <input
                      type="number"
                      placeholder="e.g. 2026"
                      min={2020}
                      max={2050}
                      value={taskTargetDate}
                      onChange={(e) => setTaskTargetDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none bg-slate-50 font-mono"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Judul Rencana Kegiatan</label>
                <input
                  type="text"
                  placeholder="Misal: Kunjungan Jemaat ke Cabang"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none bg-slate-50"
                  required
                />
              </div>

              {/* RELATION DROPDOWN (PARENT TASK REFERENCE) */}
              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Melanjutkan Kegiatan Sebelumnya (Opsional)</label>
                <select
                  value={taskParentId}
                  onChange={(e) => setTaskParentId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none bg-slate-50 cursor-pointer"
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
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Status Kerja</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none bg-slate-50 cursor-pointer"
                >
                  <option value="Belum Mulai">Belum Mulai</option>
                  <option value="Dalam Proses">Dalam Proses</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Tertunda">Tertunda</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Catatan Detail</label>
                <textarea
                  placeholder="Keterangan pendukung atau rincian kegiatan..."
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none bg-slate-50 leading-relaxed"
                />
              </div>

              {/* ATTACHMENT UPLOAD */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Unggah Berkas Lampiran (PDF/Gambar - Maks. 5 MB)</label>
                
                {uploadedFile ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700 truncate max-w-[200px] flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {uploadedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="p-1 hover:bg-slate-100 text-rose-500 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50/50 transition-colors py-4 px-2 text-center cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1 text-slate-500">
                      <PlusCircle className="w-6 h-6 mx-auto text-slate-400" />
                      <p className="text-[10px] font-semibold">{isUploading ? 'Sedang mengunggah...' : 'Klik untuk memilih berkas lampiran'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Kegiatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL: ADD/EDIT STAFF MEETING */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 flex items-center justify-center p-4 z-50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden scale-95 transition-all flex flex-col max-h-[calc(100vh-4rem)]">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm">{editingMeeting ? 'Ubah Notulensi Rapat Staf' : 'Pencatatan Rapat Staf Baru'}</h3>
              </div>
              <button 
                onClick={() => { setIsMeetingModalOpen(false); setEditingMeeting(null); }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Topik / Judul Rapat</label>
                <input
                  type="text"
                  placeholder="Misal: Rapat Koordinasi Mingguan"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none bg-slate-50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Tanggal Rapat</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none bg-slate-50 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Tempat / Lokasi</label>
                  <input
                    type="text"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none bg-slate-50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Pimpinan Rapat (Host)</label>
                <input
                  type="text"
                  placeholder="Nama pimpinan rapat..."
                  value={meetingLeaderName}
                  onChange={(e) => setMeetingLeaderName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none bg-slate-50"
                  required
                />
              </div>

              {/* ATTENDEES MULTI-CHECKBOX */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Daftar Hadir Staf ({meetingAttendees.length} Terpilih)</label>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-36 overflow-y-auto grid grid-cols-2 gap-2">
                  {staffs.map(s => {
                    const isChecked = meetingAttendees.includes(s.name);
                    return (
                      <label key={s.nik} className="flex items-center gap-2 p-1 hover:bg-white rounded-lg transition-colors cursor-pointer text-[11px] font-medium text-slate-700">
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
                          className="rounded text-indigo-650 focus:ring-indigo-500 scale-95 cursor-pointer"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Notulen / Keputusan & Tindakan</label>
                <textarea
                  placeholder="Tulis ringkasan hasil rapat, keputusan, rencana lanjutan, dll..."
                  rows={4}
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none bg-slate-50 leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Tautan Rapat Eksternal (Google Drive / Zoom - Opsional)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... atau https://zoom.us/..."
                  value={meetingExternalLink}
                  onChange={(e) => setMeetingExternalLink(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none bg-slate-50 font-mono"
                />
              </div>

              {/* ATTACHMENT UPLOAD */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                <label className="text-slate-500 font-bold uppercase tracking-wider text-[9px] block">Lampiran Notulen Resmi (PDF/Gambar - Maks. 5 MB)</label>
                
                {uploadedFile ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700 truncate max-w-[250px] flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {uploadedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="p-1 hover:bg-slate-100 text-rose-500 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50/50 transition-colors py-4 px-2 text-center cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1 text-slate-500">
                      <PlusCircle className="w-6 h-6 mx-auto text-slate-400" />
                      <p className="text-[10px] font-semibold">{isUploading ? 'Sedang mengunggah...' : 'Klik untuk memilih berkas PDF/Gambar'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 font-sans">
                <button
                  type="button"
                  onClick={() => { setIsMeetingModalOpen(false); setEditingMeeting(null); }}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Notulen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
