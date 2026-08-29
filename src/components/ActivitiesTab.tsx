import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  User, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeftRight, 
  ListOrdered, 
  Clock, 
  Info,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Download
} from 'lucide-react';
import { Activity, ActivityTransaction, ActivityRundownItem, ActivityPreparationItem, Transaction } from '../types';
import { exportToCSV, exportActivityDetailToPDF } from '../utils/export';

interface ActivitiesTabProps {
  activities: Activity[];
  activityTransactions: ActivityTransaction[];
  activityRundowns: ActivityRundownItem[];
  activityPreparations: ActivityPreparationItem[];
  onAddActivity: (act: Activity) => Promise<void>;
  onUpdateActivity: (act: Activity) => Promise<void>;
  onDeleteActivity: (id: string) => Promise<void>;
  onAddActivityTransaction: (tx: ActivityTransaction) => Promise<void>;
  onDeleteActivityTransaction: (id: string) => Promise<void>;
  onUpdateActivityTransaction: (tx: ActivityTransaction) => Promise<void>;
  onAddMainTransaction: (tx: Transaction) => Promise<void>;
  onAddRundownItem: (item: ActivityRundownItem) => Promise<void>;
  onDeleteRundownItem: (id: string) => Promise<void>;
  onAddPrepItem: (item: ActivityPreparationItem) => Promise<void>;
  onUpdatePrepItem: (item: ActivityPreparationItem) => Promise<void>;
  onDeletePrepItem: (id: string) => Promise<void>;
  mainKasBalance: number;
  currentRole: string;
  currentUser: { name: string; email: string };
  profile?: any;
  structures?: any[];
}

export default function ActivitiesTab({
  activities,
  activityTransactions,
  activityRundowns,
  activityPreparations,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onAddActivityTransaction,
  onDeleteActivityTransaction,
  onUpdateActivityTransaction,
  onAddMainTransaction,
  onAddRundownItem,
  onDeleteRundownItem,
  onAddPrepItem,
  onUpdatePrepItem,
  onDeletePrepItem,
  mainKasBalance,
  currentRole,
  currentUser,
  profile,
  structures
}: ActivitiesTabProps) {
  // Navigation & selection states
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  
  // Modals / Form toggles
  const [isNewActivityFormOpen, setIsNewActivityFormOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [localDescription, setLocalDescription] = useState('');

  // Form states for New Activity
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newMinisters, setNewMinisters] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newPlace, setNewPlace] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBudgetEstimated, setNewBudgetEstimated] = useState<number>(0);

  // Form states for Rundown / Agenda
  const [rundownTime, setRundownTime] = useState('');
  const [rundownActivity, setRundownActivity] = useState('');
  const [rundownPic, setRundownPic] = useState('');

  // Form states for transaction entries inside isolated sub-wallet
  const [txType, setTxType] = useState<'In' | 'Out'>('In');
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states for transfer funds
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferDirection, setTransferDirection] = useState<'From_Main' | 'To_Main'>('From_Main');

  // Helper for formatting date to Indonesian full date formatting
  const formatIndonesianDateFull = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Dynamic date and time states for building dynamic dates
  const [isTimeManual, setIsTimeManual] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('12:00');

  // Agenda workspace states
  const [activeAgendaTab, setActiveAgendaTab] = useState<'rundown' | 'preparation'>('rundown');

  // Preparation task form states
  const [prepTask, setPrepTask] = useState('');
  const [prepDate, setPrepDate] = useState('');
  const [prepPic, setPrepPic] = useState('');
  const [prepNeedsFunding, setPrepNeedsFunding] = useState(false);
  const [prepRequiredAmount, setPrepRequiredAmount] = useState<number>(0);

  // Committee/Servants members form states
  const [memberRole, setMemberRole] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberContact, setMemberContact] = useState('');

  // States for Editing Activity Details
  const [isEditActivityFormOpen, setIsEditActivityFormOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTheme, setEditTheme] = useState('');
  const [editMinisters, setEditMinisters] = useState('');
  const [editPlace, setEditPlace] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBudgetEstimated, setEditBudgetEstimated] = useState<number>(0);
  const [editIsTimeManual, setEditIsTimeManual] = useState(false);
  const [editTimeValueManual, setEditTimeValueManual] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('12:00');

  // States for Editing Activity Transaction
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxType, setEditTxType] = useState<'In' | 'Out'>('In');
  const [editTxAmount, setEditTxAmount] = useState<number>(0);
  const [editTxDescription, setEditTxDescription] = useState('');
  const [editTxDate, setEditTxDate] = useState('');

  // States for Editing Preparation Tasks
  const [editingPrepId, setEditingPrepId] = useState<string | null>(null);
  const [editPrepTask, setEditPrepTask] = useState('');
  const [editPrepDate, setEditPrepDate] = useState('');
  const [editPrepPic, setEditPrepPic] = useState('');
  const [editPrepNeedsFunding, setEditPrepNeedsFunding] = useState(false);
  const [editPrepRequiredAmount, setEditPrepRequiredAmount] = useState<number>(0);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDanger = false,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal'
  ) => {
    setConfirmDialog({
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (err: any) {
          alert('Tindakan gagal: ' + err.message);
        } finally {
          setConfirmDialog(null);
        }
      },
      confirmText,
      cancelText,
      isDanger
    });
  };

  // Find currently active event profile details
  const activeActivity = useMemo(() => {
    return activities.find(a => a.id === selectedActivityId);
  }, [activities, selectedActivityId]);

  // Check if current active activity is completed
  const isCompleted = activeActivity?.status === 'Selesai';

  // Filtered and sorted list for rundown schedule events belonging to active activity
  const activeRundownItemsList = useMemo(() => {
    if (!selectedActivityId) return [];
    return activityRundowns.filter(item => item.activityId === selectedActivityId && !item.deleted);
  }, [activityRundowns, selectedActivityId]);

  // Filtered and sorted list for preparation tasks belonging to active activity
  const activePreparationItemsList = useMemo(() => {
    if (!selectedActivityId) return [];
    return activityPreparations.filter(item => item.activityId === selectedActivityId && !item.deleted);
  }, [activityPreparations, selectedActivityId]);

  // Filtered list of transactions for this activity
  const activeTxList = useMemo(() => {
    if (!selectedActivityId) return [];
    const filtered = activityTransactions.filter(t => t.activityId === selectedActivityId && !t.deleted);
    // Sort so that the latest transaction (by createdAt desc, fallback to date/id desc) appears at the top
    return filtered.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
    });
  }, [activityTransactions, selectedActivityId]);

  // Filters parent activities list
  const filteredActivities = useMemo(() => {
    const list = activities.filter(a => {
      const matchQuery = searchQuery.toLowerCase();
      return (
        a.title?.toLowerCase().includes(matchQuery) ||
        a.theme?.toLowerCase().includes(matchQuery) ||
        a.place?.toLowerCase().includes(matchQuery) ||
        a.ministers?.toLowerCase().includes(matchQuery)
      );
    });
    return list.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.localeCompare(a.createdAt);
      }
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      return b.id.localeCompare(a.id);
    });
  }, [activities, searchQuery]);

  // Handle building new activity
  const handleSubmitNewActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Nama kegiatan wajib diisi.');
      return;
    }

    const finalTimeValue = isTimeManual 
      ? newTime.trim() 
      : newDate 
        ? `${formatIndonesianDateFull(newDate)} (Pkl. ${newStartTime} - ${newEndTime} WIB)` 
        : undefined;

    const activityId = `ACT-${Date.now()}`;
    const freshAct: Activity = {
      id: activityId,
      title: newTitle.trim(),
      theme: newTheme.trim() || undefined,
      description: newDescription.trim() || undefined,
      ministers: newMinisters.trim() || undefined,
      time: finalTimeValue,
      place: newPlace.trim() || undefined,
      budgetEstimated: Number(newBudgetEstimated) || 0,
      budgetWalletBalance: 0,
      committeeMembers: [],
      deleted: false
    };

    try {
      await onAddActivity(freshAct);
      
      // Post an initial system-logged transaction
      const systemTx: ActivityTransaction = {
        id: `ACT-TX-SYS-${Date.now()}`,
        activityId,
        type: 'In',
        amount: 0,
        description: 'Pembukaan kantong kas kegiatan mandiri baru oleh staf.',
        date: new Date().toISOString().split('T')[0],
        operator: currentUser.name
      };
      await onAddActivityTransaction(systemTx);

      // Clean form fields
      setNewTitle('');
      setNewTheme('');
      setNewMinisters('');
      setNewTime('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewStartTime('09:00');
      setNewEndTime('12:00');
      setNewPlace('');
      setNewDescription('');
      setNewBudgetEstimated(0);
      setIsNewActivityFormOpen(false);
      setSelectedActivityId(activityId); // Auto view
    } catch (err: any) {
      alert('Gagal membuat kegiatan: ' + err.message);
    }
  };

  // Handle adding a rundown schedule event
  const handleAddRundownItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity) return;
    if (!rundownTime.trim() || !rundownActivity.trim()) {
      alert('Waktu dan detail agenda agenda wajib diisi.');
      return;
    }

    const newItem: ActivityRundownItem = {
      id: `RND-${Date.now()}`,
      activityId: activeActivity.id,
      time: rundownTime.trim(),
      activity: rundownActivity.trim(),
      pic: rundownPic.trim() || '-'
    };

    try {
      await onAddRundownItem(newItem);
      setRundownTime('');
      setRundownActivity('');
      setRundownPic('');
    } catch (err: any) {
      alert('Gagal menambahkan rundown: ' + err.message);
    }
  };

  // Delete a rundown schedule event
  const handleDeleteRundownItem = async (itemId: string) => {
    if (!activeActivity) return;
    
    askConfirmation(
      'Hapus Agenda Rundown',
      'Apakah Anda yakin ingin menghapus agenda rundown ini?',
      async () => {
        await onDeleteRundownItem(itemId);
      },
      true
    );
  };

  // Add preparation task (can require funding)
  const handleAddPreparationItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity) return;
    if (!prepTask.trim() || !prepDate.trim()) {
      alert('Nama tugas persiapan dan target waktu wajib diisi.');
      return;
    }

    const newItem: ActivityPreparationItem = {
      id: `PREP-${Date.now()}`,
      activityId: activeActivity.id,
      task: prepTask.trim(),
      date: formatIndonesianDateFull(prepDate),
      pic: prepPic.trim() || '-',
      needsFunding: prepNeedsFunding,
      requiredAmount: prepNeedsFunding ? prepRequiredAmount : 0,
      status: 'Pending' as const,
      funded: false
    };

    try {
      await onAddPrepItem(newItem);
      setPrepTask('');
      setPrepDate('');
      setPrepPic('');
      setPrepNeedsFunding(false);
      setPrepRequiredAmount(0);
    } catch (err: any) {
      alert('Gagal menambahkan agenda persiapan: ' + err.message);
    }
  };

  // Toggle preparation task status (Pending <-> Completed)
  const handleTogglePrepStatus = async (itemId: string) => {
    if (!activeActivity) return;
    const targetItem = activityPreparations.find(p => p.id === itemId);
    if (!targetItem) return;

    const updatedItem: ActivityPreparationItem = {
      ...targetItem,
      status: targetItem.status === 'Completed' ? 'Pending' as const : 'Completed' as const
    };
    
    try {
      await onUpdatePrepItem(updatedItem);
    } catch (err: any) {
      alert('Gagal mengubah status tugas persiapan: ' + err.message);
    }
  };

  // Fund a preparation task from this activity's isolated sub-wallet
  const handleFundPrepTask = async (item: ActivityPreparationItem) => {
    if (!activeActivity) return;
    const requiredAmount = Number(item.requiredAmount) || 0;
    if (activeActivity.budgetWalletBalance < requiredAmount) {
      alert('Saldo kas kantong kegiatan ini tidak mencukupi! Silakan alokasikan subsidi tambahan dari Kas Utama terlebih dahulu.');
      return;
    }

    askConfirmation(
      'Cairkan Kas Kegiatan',
      `Apakah Anda yakin ingin mendanai tugas "${item.task}" sebesar Rp ${requiredAmount.toLocaleString('id-ID')} dari saldo kantong kegiatan ini?`,
      async () => {
        // Local debit transaction
        const spendTx: ActivityTransaction = {
          id: `ACT-TX-PREP-${Date.now()}`,
          activityId: activeActivity.id,
          type: 'Out',
          amount: requiredAmount,
          description: `[Belanja Agenda Persiapan] ${item.task} (PIC: ${item.pic})`,
          date: new Date().toISOString().split('T')[0],
          operator: currentUser?.name || 'Operator'
        };

        const updatedItem: ActivityPreparationItem = {
          ...item,
          funded: true,
          status: 'Completed' as const
        };

        const updatedAct: Activity = {
          ...activeActivity,
          budgetWalletBalance: activeActivity.budgetWalletBalance - requiredAmount
        };

        await onAddActivityTransaction(spendTx);
        await onUpdatePrepItem(updatedItem);
        await onUpdateActivity(updatedAct);
        alert(`Berhasil mendanai tugas persiapan "${item.task}" sebesar Rp ${requiredAmount.toLocaleString('id-ID')}. Saldo sisa kantong diperbarui.`);
      }
    );
  };

  // Delete a preparation task
  const handleDeletePrepItem = async (itemId: string) => {
    if (!activeActivity) return;
    
    askConfirmation(
      'Hapus Agenda Persiapan',
      'Apakah Anda yakin ingin menghapus agenda persiapan ini?',
      async () => {
        await onDeletePrepItem(itemId);
      },
      true
    );
  };

  // Start edit preparation task
  const handleStartEditPrepItem = (item: any) => {
    setEditingPrepId(item.id);
    setEditPrepTask(item.task);
    setEditPrepPic(item.pic || '-');
    setEditPrepNeedsFunding(!!item.needsFunding);
    setEditPrepRequiredAmount(item.requiredAmount || 0);
    // Prep list uses full indonesian dates. We default picker to today's date if not matched
    setEditPrepDate(new Date().toISOString().split('T')[0]);
  };

  // Save edit preparation task
  const handleSaveEditPrepItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity || !editingPrepId) return;
    if (!editPrepTask.trim() || !editPrepDate) {
      alert('Nama agenda persiapan dan target tanggal wajib diisi.');
      return;
    }

    const targetItem = activityPreparations.find(p => p.id === editingPrepId);
    if (!targetItem) return;

    const updatedItem: ActivityPreparationItem = {
      ...targetItem,
      task: editPrepTask.trim(),
      date: editPrepDate.includes('-') ? formatIndonesianDateFull(editPrepDate) : targetItem.date,
      pic: editPrepPic.trim() || '-',
      needsFunding: editPrepNeedsFunding,
      requiredAmount: editPrepNeedsFunding ? Number(editPrepRequiredAmount) : 0
    };

    try {
      await onUpdatePrepItem(updatedItem);
      setEditingPrepId(null);
      alert('Berhasil menyimpan perubahan agenda persiapan.');
    } catch (err: any) {
      alert('Gagal menyimpan perubahan agenda persiapan: ' + err.message);
    }
  };

  // Add structured committee member
  const handleAddCommitteeMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity) return;
    if (!memberRole.trim() || !memberName.trim()) {
      alert('Jabatan/Peran dan nama pengurus wajib diisi.');
      return;
    }

    const newMember = {
      id: `MEM-${Date.now()}`,
      role: memberRole.trim(),
      name: memberName.trim(),
      contact: memberContact.trim() || undefined
    };

    const updatedMembers = [...(activeActivity.committeeMembers || []), newMember];
    const updatedAct: Activity = {
      ...activeActivity,
      committeeMembers: updatedMembers
    };

    try {
      await onUpdateActivity(updatedAct);
      setMemberRole('');
      setMemberName('');
      setMemberContact('');
    } catch (err: any) {
      alert('Gagal menambahkan pengurus/pelayan: ' + err.message);
    }
  };

  // Delete structured committee member
  const handleDeleteCommitteeMember = async (memberId: string) => {
    if (!activeActivity) return;
    
    askConfirmation(
      'Hapus Petugas/Pelayan',
      'Apakah Anda yakin ingin menghapus petugas/pelayan ini?',
      async () => {
        const filtered = (activeActivity.committeeMembers || []).filter(m => m.id !== memberId);
        await onUpdateActivity({ ...activeActivity, committeeMembers: filtered });
      },
      true
    );
  };

  // Handle standard pocket cash income/expense
  const handleAddPocketTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity) return;
    if (txAmount <= 0) {
      alert('Jumlah uang harus lebih besar dari Rp 0.');
      return;
    }
    if (!txDescription.trim()) {
      alert('Keterangan pencatatan wajib diisi.');
      return;
    }

    const txId = `ACT-TX-${Date.now()}`;
    const freshTx: ActivityTransaction = {
      id: txId,
      activityId: activeActivity.id,
      type: txType,
      amount: Number(txAmount),
      description: txDescription.trim(),
      date: txDate,
      operator: currentUser.name
    };

    // Calculate updated wallet pockets
    const balanceChange = txType === 'In' ? Number(txAmount) : -Number(txAmount);
    const updatedWalletBalance = activeActivity.budgetWalletBalance + balanceChange;

    if (updatedWalletBalance < 0) {
      alert('Uang keluar melebihi saldo kas kantong saat ini! Silakan lakukan pengalokasian dana dari kas utama terlebih dahulu.');
      return;
    }

    const updatedAct: Activity = {
      ...activeActivity,
      budgetWalletBalance: updatedWalletBalance
    };

    try {
      await onAddActivityTransaction(freshTx);
      await onUpdateActivity(updatedAct);
      
      // Reset form fields
      setTxAmount(0);
      setTxDescription('');
    } catch (err: any) {
      alert('Gagal menyimpan transaksi kegiatan: ' + err.message);
    }
  };

  // Safe Fund Transfers: Moving money between the general foundation ledger and this activity's specific sub-treasury pocket
  const handleFundTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity) return;
    if (transferAmount <= 0) {
      alert('Jumlah dana yang ditransfer harus lebih besar dari Rp 0.');
      return;
    }

    if (transferDirection === 'From_Main') {
      // Transfer FROM general foundation treasury TO this activity's pocket
      if (mainKasBalance < transferAmount) {
        alert(`Dana kas utama yayasan sisa Rp ${mainKasBalance.toLocaleString('id-ID')}, tidak mencukupi untuk mentransfer sebesar Rp ${transferAmount.toLocaleString('id-ID')}.`);
        return;
      }

      // Step 1: Create main treasury transaction (Expense)
      const mainTxId = `TX-ALLOC-${Date.now()}`;
      const mainTx: Transaction = {
        id: mainTxId,
        date: new Date().toISOString().split('T')[0],
        category: 'Alokasi Kegiatan / Event',
        description: `[Alokasi Event] Transfer subsidi kas utama ke kegiatan "${activeActivity.title}". Catatan: ${transferNotes || 'Dana subsidi operasional'}`,
        amount: Number(transferAmount),
        type: 'Expense',
        sourceOrRecipient: activeActivity.title,
        status: 'Approved',
        approvedBy: currentUser.name,
        reference_id: activeActivity.id,
        reference_type: 'activity_allocation',
        source: 'manual',
        category_id: 'Alokasi Kegiatan / Event',
        transaction_code: mainTxId
      } as any;

      // Step 2: Create local activity sub-wallet transaction (Transfer_From_Main)
      const activityTx: ActivityTransaction = {
        id: `ACT-TX-TRF-${Date.now()}`,
        activityId: activeActivity.id,
        type: 'Transfer_From_Main',
        amount: Number(transferAmount),
        description: `Bantuan/Subsidi dari Kas Utama Yayasan. Catatan: ${transferNotes || 'Dana subsidi operasional'}`,
        date: new Date().toISOString().split('T')[0],
        operator: currentUser.name
      };

      // Step 3: Math and Action propagation to trigger updates
      const updatedAct: Activity = {
        ...activeActivity,
        budgetWalletBalance: activeActivity.budgetWalletBalance + Number(transferAmount)
      };

      try {
        await onAddMainTransaction(mainTx);
        await onAddActivityTransaction(activityTx);
        await onUpdateActivity(updatedAct);
        
        alert(`Berhasil mengalokasikan dana subsidi sebesar Rp ${transferAmount.toLocaleString('id-ID')} dari Kas Utama Yayasan ke dalam kantong Kegiatan ${activeActivity.title}.`);
        setTransferAmount(0);
        setTransferNotes('');
      } catch (err: any) {
        alert('Gagal memproses alokasi dana subsidi: ' + err.message);
      }

    } else {
      // Transfer leftovers FROM this activity's pocket back TO the general foundation treasury
      if (activeActivity.budgetWalletBalance < transferAmount) {
        alert(`Saldo kantong saat ini hanya Rp ${activeActivity.budgetWalletBalance.toLocaleString('id-ID')}, tidak bisa mengembalikan Rp ${transferAmount.toLocaleString('id-ID')}.`);
        return;
      }

      // Step 1: Create main treasury transaction (Income)
      const mainTxId = `TX-RETURN-${Date.now()}`;
      const mainTx: Transaction = {
        id: mainTxId,
        date: new Date().toISOString().split('T')[0],
        category: 'Pemasukan Kegiatan / Event sisa',
        description: `[Pengembalian Sisa Event] Surplus sisa kas terkemas balik dari kegiatan "${activeActivity.title}". Catatan: ${transferNotes || 'Pengembalian sisa kas sisa kegiatan/acara'}`,
        amount: Number(transferAmount),
        type: 'Income',
        sourceOrRecipient: activeActivity.title,
        status: 'Approved',
        approvedBy: currentUser.name,
        reference_id: activeActivity.id,
        reference_type: 'activity_allocation',
        source: 'manual',
        category_id: 'Pemasukan Kegiatan / Event sisa',
        transaction_code: mainTxId
      } as any;

      // Step 2: Create local activity sub-wallet transaction (Transfer_To_Main)
      const activityTx: ActivityTransaction = {
        id: `ACT-TX-TRF-${Date.now()}`,
        activityId: activeActivity.id,
        type: 'Transfer_To_Main',
        amount: Number(transferAmount),
        description: `Surplus sisa kas dipindahkan kembali ke Kas Utama Yayasan. Catatan: ${transferNotes || 'Pengembalian sisa kas'}`,
        date: new Date().toISOString().split('T')[0],
        operator: currentUser.name
      };

      // Step 3: Math and Action propagation
      const updatedAct: Activity = {
        ...activeActivity,
        budgetWalletBalance: activeActivity.budgetWalletBalance - Number(transferAmount)
      };

      try {
        await onAddMainTransaction(mainTx);
        await onAddActivityTransaction(activityTx);
        await onUpdateActivity(updatedAct);
        
        alert(`Berhasil mengembalikan sisa dana surplus sebesar Rp ${transferAmount.toLocaleString('id-ID')} ke Kas Utama Yayasan.`);
        setTransferAmount(0);
        setTransferNotes('');
      } catch (err: any) {
        alert('Gagal memproses pemindahan sisa dana kas kegiatan: ' + err.message);
      }
    }
  };

  // Start edit activity
  const handleStartEditActivity = (act: Activity) => {
    setEditTitle(act.title);
    setEditTheme(act.theme || '');
    setEditMinisters(act.ministers || '');
    setEditPlace(act.place || '');
    setEditDescription(act.description || '');
    setEditBudgetEstimated(act.budgetEstimated);
    
    // Check if act.time has the format "Waktu..." or is manual
    if (act.time && act.time.includes('WIB')) {
      setEditIsTimeManual(false);
      setEditTimeValueManual('');
    } else {
      setEditIsTimeManual(true);
      setEditTimeValueManual(act.time || '');
    }
    
    setEditDate(new Date().toISOString().split('T')[0]);
    setEditStartTime('09:00');
    setEditEndTime('12:00');
    setIsEditActivityFormOpen(true);
  };

  // Save edit activity details
  const handleSaveEditActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity) return;
    if (!editTitle.trim()) {
      alert('Nama kegiatan wajib diisi.');
      return;
    }

    const finalTimeValue = editIsTimeManual
      ? editTimeValueManual.trim()
      : editDate
        ? `${formatIndonesianDateFull(editDate)} (Pkl. ${editStartTime} - ${editEndTime} WIB)`
        : activeActivity.time;

    const updatedAct: Activity = {
      ...activeActivity,
      title: editTitle.trim(),
      theme: editTheme.trim() || undefined,
      ministers: editMinisters.trim() || undefined,
      place: editPlace.trim() || undefined,
      description: editDescription.trim() || undefined,
      budgetEstimated: Number(editBudgetEstimated) || 0,
      time: finalTimeValue
    };

    try {
      await onUpdateActivity(updatedAct);
      setIsEditActivityFormOpen(false);
      alert('Berhasil memperbarui rincian kegiatan.');
    } catch (err: any) {
      alert('Gagal memperbarui kegiatan: ' + err.message);
    }
  };

  // Export activity transactions as a beautiful CSV report
  const handleExportActivityCSV = (act: Activity) => {
    const actTx = activityTransactions.filter(t => t.activityId === act.id && !t.deleted);
    
    const csvData = actTx.map((tx, idx) => ({
      no: idx + 1,
      date: tx.date,
      type: tx.type === 'In' ? 'PEMASUKAN' : tx.type === 'Transfer_From_Main' ? 'SUBSIDI IN' : tx.type === 'Transfer_To_Main' ? 'PULANG OUT' : 'BELANJA ACARA',
      description: tx.description,
      operator: tx.operator || '-',
      amount: tx.amount
    }));

    const headers = ['No', 'Tanggal', 'Jenis Transaksi', 'Keterangan', 'Buku Oleh', 'Jumlah (Rp)'];
    const keys = ['no', 'date', 'type', 'description', 'operator', 'amount'];

    exportToCSV(csvData, headers, keys, `Rekap_Jurnal_Keuangan_Kegiatan_${act.title.replace(/\s+/g, '_')}.csv`);
  };

  // Delete activity transaction and revert wallet balance
  const handleDeleteActivityTxRecord = async (tx: ActivityTransaction) => {
    if (!activeActivity) return;
    
    askConfirmation(
      'Hapus Transaksi Kantong',
      `Apakah Anda yakin ingin menghapus transaksi "${tx.description}" dari kantong kegiatan? Saldo kantong akan dinormalisasi kembali.`,
      async () => {
        // Determine balance adjustment to revert transaction effect
        let balanceChange = 0;
        const isIncome = tx.type === 'In' || tx.type === 'Transfer_From_Main';
        if (isIncome) {
          balanceChange = -Number(tx.amount || 0);
        } else {
          balanceChange = Number(tx.amount || 0);
        }

        const updatedAct: Activity = {
          ...activeActivity,
          budgetWalletBalance: activeActivity.budgetWalletBalance + balanceChange
        };

        await onDeleteActivityTransaction(tx.id);
        await onUpdateActivity(updatedAct);
        alert('Berhasil menghapus transaksi dan menyesuaikan saldo kantong.');
      },
      true
    );
  };

  // Edit activity transaction start & save
  const handleStartEditTx = (tx: ActivityTransaction) => {
    setEditingTxId(tx.id);
    setEditTxType(tx.type === 'In' || tx.type === 'Transfer_From_Main' ? 'In' : 'Out');
    setEditTxAmount(tx.amount);
    setEditTxDescription(tx.description);
    setEditTxDate(tx.date);
  };

  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActivity || !editingTxId) return;

    const originalTx = activityTransactions.find(t => t.id === editingTxId);
    if (!originalTx) return;

    const newAmount = Number(editTxAmount) || 0;

    // 1. Revert original tx effect on wallet balance
    let originalEffect = 0;
    const isOriginalIncome = originalTx.type === 'In' || originalTx.type === 'Transfer_From_Main';
    if (isOriginalIncome) {
      originalEffect = Number(originalTx.amount || 0);
    } else {
      originalEffect = -Number(originalTx.amount || 0);
    }

    // 2. Add new tx effect on wallet balance
    let newEffect = 0;
    const isNewIncome = editTxType === 'In';
    if (isNewIncome) {
      newEffect = newAmount;
    } else {
      newEffect = -newAmount;
    }

    // New balance = Current Balance - Original Effect + New Effect
    const netChange = -originalEffect + newEffect;
    const updatedBalance = activeActivity.budgetWalletBalance + netChange;

    const updatedTx: ActivityTransaction = {
      ...originalTx,
      type: editTxType === 'In' ? (originalTx.type === 'Transfer_From_Main' ? 'Transfer_From_Main' : 'In') : (originalTx.type === 'Transfer_To_Main' ? 'Transfer_To_Main' : 'Out'),
      amount: newAmount,
      description: editTxDescription.trim(),
      date: editTxDate,
      operator: currentUser.name
    };

    const updatedAct: Activity = {
      ...activeActivity,
      budgetWalletBalance: updatedBalance
    };

    try {
      await onUpdateActivityTransaction(updatedTx);
      await onUpdateActivity(updatedAct);
      setEditingTxId(null);
      alert('Transaksi berhasil diperbarui dan saldo kantong disesuaikan.');
    } catch (err: any) {
      alert('Gagal memperbarui transaksi: ' + err.message);
    }
  };

  // Handle Delete entire event document
  const handleDeleteActivityRecord = async (id: string, name: string) => {
    askConfirmation(
      'Hapus Dokumentasi Kegiatan',
      `Apakah Anda yakin ingin menghapus seluruh dokumentasi kegiatan "${name}"? Pencatatan log transaksi kantong akan ditandai terhapus.`,
      async () => {
        await onDeleteActivity(id);
        if (selectedActivityId === id) {
          setSelectedActivityId(null);
        }
      },
      true
    );
  };

  return (
    <div className="space-y-6">
      {!activeActivity ? (
        // LIST OF ACTIVITIES PANEL
        <div id="activities-overview-panel" className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Kegiatan & Acara</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola kepanitiaan, rundown, serta alokasi kas terpisah per acara Yayasan Murid Muda Bermisi.
              </p>
            </div>
            
            <button
              onClick={() => setIsNewActivityFormOpen(true)}
              className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start"
            >
              <Plus className="w-3.5 h-3.5" /> Rintis Kegiatan
            </button>
          </div>

          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="max-w-md w-full flex gap-2">
              <input
                type="text"
                placeholder="Cari kegiatan berdasarkan nama, kordinator, tempat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white text-slate-800 border border-slate-300 rounded focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
              />
            </div>
            <div className="text-xs flex items-center gap-1.5 text-slate-600 px-1 sm:mr-auto">
              Saldo Kas Utama Yayasan: <strong className="text-slate-900 font-mono">Rp {mainKasBalance.toLocaleString('id-ID')}</strong>
            </div>
            
            {/* Display viewMode Toggle */}
            <div className="flex bg-slate-200 p-0.5 rounded text-xs font-semibold self-start sm:self-auto h-fit">
              <button 
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
              >
                Tabel
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer ${viewMode === 'cards' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
              >
                Kartu
              </button>
            </div>
          </div>

          {/* Activities GRID / LIST Layout */}
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Calendar className="w-10 h-10 mx-auto text-slate-400 stroke-1.5 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Tidak ada data kegiatan.</p>
              <p className="text-xs text-slate-500 mt-0.5">Silakan rintis kegiatan baru seperti Perayaan Natal, Retreat, dll.</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs border border-slate-200 rounded overflow-hidden shadow-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3">ID</th>
                    <th className="p-3">Nama Kegiatan</th>
                    <th className="p-3">Tema & Deskripsi</th>
                    <th className="p-3">Kordinator (PIC)</th>
                    <th className="p-3">Tempat & Waktu</th>
                    <th className="p-3 text-right">Taksasi Anggaran</th>
                    <th className="p-3 text-right">Saldo Kantong</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredActivities.map((act) => {
                    return (
                      <tr key={act.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono text-xs font-semibold text-slate-500">
                          {act.id}
                        </td>
                        <td className="p-3 font-bold text-slate-900 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="block">{act.title}</span>
                            <span className={`inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                              act.status === 'Selesai' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {act.status === 'Selesai' ? 'Selesai' : 'Sedang Berjalan'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 max-w-xs">
                          {act.theme && (
                            <div className="italic text-slate-700 font-semibold mb-0.5 text-xs">
                              Tema: "{act.theme}"
                            </div>
                          )}
                          <div className="text-slate-500 line-clamp-1 text-xs">
                            {act.description || 'Tidak ada deskripsi.'}
                          </div>
                        </td>
                        <td className="p-3 text-slate-700 font-medium text-xs">
                          {act.ministers || 'Belum diatur'}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                            <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {act.place || 'Belum diatur'}</span>
                            <span className="flex items-center gap-1 truncate"><Clock className="w-3.5 h-3.5 text-slate-400" /> {act.time || 'Belum diatur'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-600">
                          Rp {act.budgetEstimated.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-800">
                          Rp {act.budgetWalletBalance.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedActivityId(act.id)}
                              className="px-2.5 py-1 bg-[#0c2340] hover:bg-[#1b365d] text-white text-xs font-medium rounded transition-colors cursor-pointer shadow-xs"
                            >
                              Kelola
                            </button>
                            <button
                              onClick={() => handleDeleteActivityRecord(act.id, act.title)}
                              className="p-1 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded transition-colors cursor-pointer"
                              title="Hapus Kegiatan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredActivities.map((act) => {
                return (
                  <div 
                    key={act.id}
                    className="border border-slate-200 hover:border-[#0c2340] rounded-lg p-5 bg-white hover:shadow-xs transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="p-2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          <CalendarCheck className="w-4 h-4" />
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-mono">
                            {act.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                            act.status === 'Selesai' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {act.status === 'Selesai' ? 'Selesai' : 'Sedang Berjalan'}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 mt-3 text-sm tracking-tight leading-snug">
                        {act.title}
                      </h3>
                      
                      {act.theme && (
                        <p className="text-xs text-slate-600 italic mt-1 line-clamp-1 border-l-2 border-slate-300 pl-2">
                          Tema: "{act.theme}"
                        </p>
                      )}

                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {act.description || 'Tidak ada uraian deskripsi kegiatan.'}
                      </p>

                      {/* Detail metadata list */}
                      <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-200 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">PIC: <strong>{act.ministers || 'Belum diatur'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">Tempat: <strong>{act.place || 'Belum diatur'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Waktu: <strong>{act.time || 'Belum diatur'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200">
                      {/* Financial snapshots */}
                      <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-2.5 rounded border border-slate-200 mb-3 font-mono text-xs">
                        <div>
                          <span className="text-slate-500 text-[10px] block font-medium">TAKSASI ANGGARAN</span>
                          <strong className="text-slate-800 font-semibold">Rp {act.budgetEstimated.toLocaleString('id-ID')}</strong>
                        </div>
                        <div className="border-l border-slate-200 pl-2.5">
                          <span className="text-slate-500 text-[10px] block uppercase font-medium">SALDO KANTONG</span>
                          <strong className="text-emerald-800 font-bold">Rp {act.budgetWalletBalance.toLocaleString('id-ID')}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedActivityId(act.id)}
                          className="flex-1 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white text-xs font-semibold rounded text-center transition-colors cursor-pointer shadow-xs"
                        >
                          Kelola Kegiatan
                        </button>

                        <button
                          onClick={() => handleDeleteActivityRecord(act.id, act.title)}
                          className="p-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded transition-colors cursor-pointer"
                          title="Hapus Kegiatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* NEW ACTIVITY MODAL DIALOG */}
          {isNewActivityFormOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden border border-slate-300 shadow-xl my-8">
                <div className="px-5 py-3.5 bg-[#0c2340] text-white flex justify-between items-center">
                  <h3 className="font-bold text-sm tracking-tight">Rintis Dokumen Kegiatan Baru</h3>
                  <button 
                    onClick={() => setIsNewActivityFormOpen(false)}
                    className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleSubmitNewActivity} className="p-5 space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold block">Nama Kegiatan / Agenda Resmi (Wajib)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Perayaan Natal Yayasan MMB 2026"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-700 font-semibold block">Tema Kegiatan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Terang Dunia Terbitlah"
                        value={newTheme}
                        onChange={(e) => setNewTheme(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-700 font-semibold block">Taksasi Dana Dibutuhkan (Rp)</label>
                      <input
                        type="number"
                        placeholder="Perkiraan dana..."
                        value={newBudgetEstimated || ''}
                        onChange={(e) => setNewBudgetEstimated(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold block">Kordinator Kegiatan / Pelayan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Yusuf (Kordinator Natal), Angel (Logistik), dll."
                      value={newMinisters}
                      onChange={(e) => setNewMinisters(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold block">Tempat / Lokasi</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Aula Serbaguna Wisma MMB"
                      value={newPlace}
                      onChange={(e) => setNewPlace(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
                    />
                  </div>

                  {/* Dynamic Date/Time Picker */}
                  <div className="p-3 border border-slate-200 rounded bg-slate-50 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-800">Format Waktu</label>
                      <button
                        type="button"
                        onClick={() => setIsTimeManual(!isTimeManual)}
                        className="text-xs text-[#0c2340] hover:underline font-semibold cursor-pointer"
                      >
                        {isTimeManual ? "Gunakan Kalender" : "Tulis Manual"}
                      </button>
                    </div>

                    {!isTimeManual ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Tanggal Kegiatan</label>
                          <input
                            type="date"
                            required
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Jam Mulai</label>
                            <input
                              type="time"
                              required
                              value={newStartTime}
                              onChange={(e) => setNewStartTime(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Jam Selesai</label>
                            <input
                              type="time"
                              required
                              value={newEndTime}
                              onChange={(e) => setNewEndTime(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                            />
                          </div>
                        </div>
                        {newDate && (
                          <div className="p-2 bg-white rounded text-xs text-slate-700 border border-slate-200">
                            <strong>Pratinjau:</strong> {formatIndonesianDateFull(newDate)} (Pkl. {newStartTime} - {newEndTime} WIB)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Tulis Waktu Bebas</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Setiap hari Jumat sepanjang bulan Desember"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold block">Gambaran Ringkas Acara (Deskripsi)</label>
                    <textarea
                      placeholder="Uraikan deskripsi singkat maksud diadakan perayaan natal atau retreat ini..."
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
                    />
                  </div>

                  <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsNewActivityFormOpen(false)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white text-xs font-semibold rounded cursor-pointer shadow-xs transition-colors"
                    >
                      Simpan & Buka Dashboard
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        // *******************************************************
        // DEDICATED DETAIL PAGE FOR A SPECIFIC SELECTED EVENT/ACTIVITY
        // *******************************************************
        <div id="activity-detail-page-container" className="space-y-6">
          {/* Header navigation controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => setSelectedActivityId(null)}
              className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-xs self-start"
            >
              <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar Kegiatan
            </button>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleStartEditActivity(activeActivity)}
                disabled={isCompleted}
                className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit data rincian agenda acara"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Edit Rincian
              </button>

              <button
                onClick={() => handleExportActivityCSV(activeActivity)}
                className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-xs"
                title="Download / Ekspor rekap jurnal keuangan acara"
              >
                <DollarSign className="w-3.5 h-3.5 text-slate-600" /> Unduh Jurnal CSV
              </button>

              <button
                onClick={() => exportActivityDetailToPDF(
                  activeActivity,
                  activeRundownItemsList,
                  activePreparationItemsList,
                  activeTxList,
                  profile,
                  structures
                )}
                className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                title="Download / Ekspor laporan rincian detail keuangan & agenda PDF"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Laporan PDF
              </button>

              <button
                onClick={async () => {
                  const newStatus = activeActivity.status === 'Selesai' ? 'Sedang Berjalan' : 'Selesai';
                  await onUpdateActivity({
                    ...activeActivity,
                    status: newStatus
                  });
                }}
                className={`px-3 py-1.5 border rounded flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shadow-xs ${
                  activeActivity.status === 'Selesai'
                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                }`}
                title={activeActivity.status === 'Selesai' ? 'Buka kembali status kegiatan menjadi Sedang Berjalan' : 'Tandai kegiatan ini telah selesai dilaksanakan'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activeActivity.status === 'Selesai' ? 'Buka Kembali Kegiatan' : 'Tandai Selesai'}
              </button>

              <button
                onClick={() => handleDeleteActivityRecord(activeActivity.id, activeActivity.title)}
                disabled={isCompleted}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="Hapus permanen dokumen data acara"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>

              <div className="text-xs text-slate-500 font-mono pl-2 border-l border-slate-300 hidden md:block">
                ID: <strong>{activeActivity.id}</strong>
              </div>
            </div>
          </div>

          {/* Upper Summary Banner Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col md:flex-row gap-5 md:items-center justify-between shadow-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded uppercase font-mono tracking-wider border border-slate-200">
                  Dashboard Kegiatan Terpadu
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider border ${
                  activeActivity.status === 'Selesai' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  Status: {activeActivity.status === 'Selesai' ? 'Selesai' : 'Sedang Berjalan'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                {activeActivity.title}
              </h1>
              {activeActivity.theme && (
                <p className="text-xs text-slate-600 italic">
                  Tema: "{activeActivity.theme}"
                </p>
              )}
            </div>

            {/* Balances Highlights */}
            <div className="flex-none flex shrink-0 divide-x divide-slate-200 bg-slate-50 border border-slate-200 rounded p-3.5 gap-4 md:gap-5">
              <div className="text-left font-mono">
                <span className="text-slate-500 text-[10px] block font-semibold uppercase">Taksasi Dana</span>
                <strong className="text-slate-900 text-base font-bold">Rp {activeActivity.budgetEstimated.toLocaleString('id-ID')}</strong>
              </div>
              <div className="text-left font-mono pl-4 md:pl-5">
                <span className="text-slate-500 text-[10px] block font-semibold uppercase">Kas Kantong Kegiatan</span>
                <strong className="text-emerald-800 text-base font-bold">Rp {activeActivity.budgetWalletBalance.toLocaleString('id-ID')}</strong>
              </div>
            </div>
          </div>

          {/* Quick Info Grid panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-slate-200 rounded-lg flex items-center gap-3 shadow-xs">
              <span className="p-2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                <User className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">PELAYAN / KORDINATOR</span>
                <strong className="text-xs text-slate-800 truncate block">{activeActivity.ministers || 'Belum diatur'}</strong>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200 rounded-lg flex items-center gap-3 shadow-xs">
              <span className="p-2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                <MapPin className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">LOKASI & TEMPAT</span>
                <strong className="text-xs text-slate-800 truncate block">{activeActivity.place || 'Belum diatur'}</strong>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200 rounded-lg flex items-center gap-3 shadow-xs">
              <span className="p-2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                <Clock className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">WAKTU</span>
                <strong className="text-xs text-slate-800 truncate block">{activeActivity.time || 'Belum diatur'}</strong>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200 rounded-lg flex items-center gap-3 shadow-xs">
              <span className="p-2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                <Info className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">STATUS KAS</span>
                <strong className="text-xs text-emerald-800 block">
                  {activeActivity.budgetWalletBalance > activeActivity.budgetEstimated ? 'SURPLUS' : 'Sedang Berjalan'}
                </strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: KEUANGAN & TRANSFERS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Sub-Wallet Controls */}
              <div id="sub-wallet-panel" className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <h3 className="font-bold text-slate-900 text-xs tracking-tight flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-slate-700" /> Kantong Dana Kegiatan
                  </h3>
                  <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-semibold uppercase">Kas Mandiri</span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Uang Masuk & Keluar Kegiatan ini Terpisah</p>
                    <p className="text-xs text-slate-500 mt-0.5">Semoga kegiatan {activeActivity.title} berjalan sukses dan penuh berkat.</p>
                  </div>
                  <div className="px-3 py-1.5 bg-white rounded border border-slate-200 font-mono text-center shrink-0">
                    <span className="text-[9px] text-slate-500 block">SALDO UTAMA YAYASAN</span>
                    <strong className="text-slate-900 font-bold text-xs">Rp {mainKasBalance.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                {/* Direct Manual Entry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Form 1: Keuangan Pemasukan & Pengeluaran Mandiri */}
                  <form onSubmit={handleAddPocketTransaction} className="space-y-3 p-3.5 border border-slate-200 rounded bg-white text-xs">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-600" /> Entri Kas Kegiatan
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Arus Transaksi</label>
                        <select
                          value={txType}
                          disabled={isCompleted}
                          onChange={(e) => setTxType(e.target.value as 'In' | 'Out')}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:border-[#0c2340] focus:outline-none"
                        >
                          <option value="In">Uang Masuk (Pemasukan)</option>
                          <option value="Out">Uang Keluar (Belanja)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Jumlah (Rp)</label>
                        <input
                          type="number"
                          required
                          disabled={isCompleted}
                          value={txAmount || ''}
                          onChange={(e) => setTxAmount(Number(e.target.value))}
                          placeholder="Nominal..."
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:border-[#0c2340] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-1">Keterangan / Sumber Dana</label>
                      <input
                        type="text"
                        required
                        disabled={isCompleted}
                        value={txDescription}
                        onChange={(e) => setTxDescription(e.target.value)}
                        placeholder="Contoh: Pembelian lilin / Donasi"
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:border-[#0c2340] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCompleted}
                      className="w-full py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      Buku Transaksi Kegiatan
                    </button>
                  </form>

                  {/* Form 2: TRANSFER DANA DARI/KE KAS YAYASAN */}
                  <form onSubmit={handleFundTransfer} className="space-y-3 p-3.5 border border-slate-200 rounded bg-white text-xs">
                    <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-slate-600" /> Subsidi / Transfer Kas Yayasan
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Tipe Transfer</label>
                        <select
                          value={transferDirection}
                          disabled={isCompleted}
                          onChange={(e) => setTransferDirection(e.target.value as 'From_Main' | 'To_Main')}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:border-[#0c2340] focus:outline-none"
                        >
                          <option value="From_Main">Ambil Subsidi Yayasan</option>
                          <option value="To_Main">Kembalikan Surplus Sisa</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Nominal (Rp)</label>
                        <input
                          type="number"
                          required
                          disabled={isCompleted}
                          value={transferAmount || ''}
                          onChange={(e) => setTransferAmount(Number(e.target.value))}
                          placeholder="Nominal..."
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:border-[#0c2340] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-1">Catatan Transfer</label>
                      <input
                        type="text"
                        disabled={isCompleted}
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        placeholder="Contoh: Tambahan anggaran Sie Konsumsi"
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:border-[#0c2340] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCompleted}
                      className="w-full py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                    >
                      Eksekusi Transfer Kas
                    </button>
                  </form>
                </div>
              </div>

              {/* Transaction Logs list specific to this activity */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                  <h3 className="font-bold text-slate-900 text-xs tracking-tight">
                    Log Jurnal Keuangan Mandiri Acara ({activeTxList.length})
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">ARUS KAS KEGIATAN</span>
                </div>

                {activeTxList.length === 0 ? (
                  <div className="text-center p-6 text-slate-500">
                    <AlertCircle className="w-6 h-6 text-slate-400 mx-auto stroke-1.5 mb-1.5" />
                    <p className="text-xs">Belum ada data transaksi dicatat untuk kantong kegiatan ini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] text-slate-700 uppercase font-bold tracking-wider bg-slate-50">
                          <th className="p-2.5">Tanggal</th>
                          <th className="p-2.5">Kategori / Sumber</th>
                          <th className="p-2.5">Keterangan</th>
                          <th className="p-2.5 text-right">Jumlah (Rp)</th>
                          <th className="p-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeTxList.map((tx) => {
                          const isInFlow = tx.type === 'In' || tx.type === 'Transfer_From_Main';
                          const isTransfer = tx.type === 'Transfer_From_Main' || tx.type === 'Transfer_To_Main';
                          
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-2.5 text-slate-500 font-mono">{tx.date}</td>
                              <td className="p-2.5">
                                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                  isTransfer
                                    ? 'bg-slate-100 text-slate-800 border-slate-300'
                                    : isInFlow 
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                  {isTransfer 
                                    ? (tx.type === 'Transfer_From_Main' ? 'SUBSIDI IN' : 'PULANG OUT') 
                                    : (isInFlow ? 'PEMASUKAN' : 'BELANJA ACARA')}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-800 max-w-xs truncate" title={tx.description}>
                                {tx.description}
                                <span className="block text-[10px] text-slate-400 font-mono">Dicatat oleh: {tx.operator}</span>
                              </td>
                              <td className={`p-2.5 text-right font-mono font-bold text-xs ${
                                isInFlow ? 'text-emerald-800' : 'text-rose-700'
                              }`}>
                                {isInFlow ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => handleStartEditTx(tx)}
                                    disabled={isCompleted}
                                    className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Edit Jurnal"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteActivityTxRecord(tx)}
                                    disabled={isCompleted}
                                    className="p-1 hover:bg-rose-50 text-rose-700 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Hapus Jurnal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* EDIT TRANSACTION MODAL DIALOG */}
                    {editingTxId && (
                      <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg max-w-sm w-full overflow-hidden border border-slate-300 shadow-xl">
                          <div className="px-4 py-3 bg-[#0c2340] text-white flex justify-between items-center">
                            <h3 className="font-bold text-xs tracking-tight">Edit Jurnal Transaksi</h3>
                            <button 
                              onClick={() => setEditingTxId(null)}
                              className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          
                          <form onSubmit={handleSaveEditTx} className="p-4 space-y-3 text-xs">
                            <div>
                              <label className="text-slate-700 font-semibold block mb-1">Arus Transaksi</label>
                              <select
                                value={editTxType}
                                onChange={(e) => setEditTxType(e.target.value as 'In' | 'Out')}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                              >
                                <option value="In">Uang Masuk (Pemasukan)</option>
                                <option value="Out">Uang Keluar (Belanja)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-slate-700 font-semibold block mb-1">Jumlah (Rp)</label>
                              <input
                                type="number"
                                required
                                value={editTxAmount}
                                onChange={(e) => setEditTxAmount(Number(e.target.value))}
                                placeholder="Rp..."
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                              />
                            </div>

                            <div>
                              <label className="text-slate-700 font-semibold block mb-1">Tanggal Transaksi</label>
                              <input
                                type="date"
                                required
                                value={editTxDate}
                                onChange={(e) => setEditTxDate(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                              />
                            </div>

                            <div>
                              <label className="text-slate-700 font-semibold block mb-1">Keterangan Belanja / Sumber</label>
                              <input
                                type="text"
                                required
                                value={editTxDescription}
                                onChange={(e) => setEditTxDescription(e.target.value)}
                                placeholder="Pembelian rincian..."
                                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                              />
                            </div>

                            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => setEditingTxId(null)}
                                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                              >
                                Batal
                              </button>
                              <button
                                type="submit"
                                className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow-xs"
                              >
                                Simpan Perubahan
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: RUNNDOWN / AGENDA & DESCRIPTION */}
            <div className="space-y-6">
              
              {/* Detailed Agenda & Persiapan Workspace */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <h3 className="font-bold text-slate-900 text-xs tracking-tight flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4 text-slate-700" /> Agenda & Jadwal Kerja
                  </h3>
                  <div className="flex bg-slate-200 p-0.5 rounded text-xs font-semibold self-start sm:self-auto">
                    <button 
                      type="button"
                      onClick={() => setActiveAgendaTab('rundown')}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${activeAgendaTab === 'rundown' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Rundown Acara
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveAgendaTab('preparation')}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${activeAgendaTab === 'preparation' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Tugas Persiapan
                    </button>
                  </div>
                </div>

                {activeAgendaTab === 'rundown' ? (
                  <>
                    <span className="text-[11px] text-slate-600 block bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      Rundown waktu acara Hari-H untuk koordinasi alur acara.
                    </span>
                    {/* Rundown list */}
                    {(!activeRundownItemsList || activeRundownItemsList.length === 0) ? (
                      <div className="text-center p-6 text-slate-500">
                        <CheckCircle2 className="w-6 h-6 text-slate-400 mx-auto stroke-1.5 mb-1" />
                        <p className="text-xs">Agenda rundown belum terdaftar.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[350px]">
                        <table className="w-full text-left border-collapse text-xs border border-slate-200 rounded overflow-hidden shadow-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                              <th className="p-2.5">Waktu</th>
                              <th className="p-2.5">Agenda Kegiatan</th>
                              <th className="p-2.5">PIC</th>
                              <th className="p-2.5 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {activeRundownItemsList.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-2.5 font-mono font-bold text-slate-800">
                                  {item.time}
                                </td>
                                <td className="p-2.5 text-slate-800 font-medium whitespace-pre-wrap">
                                  {item.activity}
                                </td>
                                <td className="p-2.5 font-mono text-[10px] font-semibold text-slate-600 uppercase">
                                  {item.pic}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={() => handleDeleteRundownItem(item.id)}
                                    disabled={isCompleted}
                                    className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Hapus Rincian"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add Rundown Item form */}
                    <form onSubmit={handleAddRundownItem} className="pt-3 border-t border-slate-200 space-y-2.5 bg-slate-50 p-3.5 rounded text-xs">
                      <span className="text-xs font-bold text-slate-800 block mb-0.5">Tambah Agenda Rundown</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <input
                            type="text"
                            required
                            disabled={isCompleted}
                            placeholder="Waktu (e.g. 18:00)"
                            value={rundownTime}
                            onChange={(e) => setRundownTime(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            disabled={isCompleted}
                            placeholder="Penanggung Jawab (PIC)"
                            value={rundownPic}
                            onChange={(e) => setRundownPic(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                          />
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          disabled={isCompleted}
                          placeholder="Uraian detail rincian acara..."
                          value={rundownActivity}
                          onChange={(e) => setRundownActivity(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isCompleted}
                        className="w-full py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                      >
                        Tambah Agenda Rundown
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-slate-600 block bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      Alur kerja persiapan pra-acara. Dapat ditandai bila membutuhkan pencairan dana kas.
                    </span>
                    {/* Preparation items list */}
                    {(!activePreparationItemsList || activePreparationItemsList.length === 0) ? (
                      <div className="text-center p-6 text-slate-500">
                        <CheckCircle2 className="w-6 h-6 text-slate-400 mx-auto stroke-1.5 mb-1" />
                        <p className="text-xs">Daftar tugas persiapan masih kosong.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[350px]">
                        <table className="w-full text-left border-collapse text-xs border border-slate-200 rounded overflow-hidden shadow-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                              <th className="p-2.5">Target</th>
                              <th className="p-2.5">Tugas Persiapan</th>
                              <th className="p-2.5">PIC</th>
                              <th className="p-2.5 text-right">Biaya / Status</th>
                              <th className="p-2.5 text-center">Status</th>
                              <th className="p-2.5 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {activePreparationItemsList.map((item) => {
                              const canFund = activeActivity.budgetWalletBalance >= (item.requiredAmount || 0);
                              return (
                                <tr key={item.id} className={`hover:bg-slate-50/70 transition-colors ${item.status === 'Completed' ? 'bg-slate-50/50' : ''}`}>
                                  <td className="p-2.5 font-mono text-[10px] text-slate-500 font-semibold">
                                    {item.date}
                                  </td>
                                  <td className="p-2.5">
                                    <span className={`font-semibold text-slate-800 ${item.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                                      {item.task}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-mono text-[10px] font-semibold text-slate-600 uppercase">
                                    {item.pic}
                                  </td>
                                  <td className="p-2.5 text-right">
                                    {item.needsFunding ? (
                                      <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase font-mono ${
                                          item.funded 
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}>
                                          {item.funded ? 'Cair' : `Minta Rp ${item.requiredAmount?.toLocaleString('id-ID')}`}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-medium italic">Non-Dana</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePrepStatus(item.id)}
                                      disabled={isCompleted}
                                      className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors border disabled:opacity-50 disabled:cursor-not-allowed ${
                                        item.status === 'Completed'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                      }`}
                                    >
                                      {item.status === 'Completed' ? 'Selesai ✓' : 'Belum'}
                                    </button>
                                  </td>
                                  <td className="p-2.5">
                                    <div className="flex items-center justify-center gap-1">
                                      {item.needsFunding && !item.funded && (
                                        <button
                                          type="button"
                                          disabled={isCompleted || !canFund}
                                          onClick={() => handleFundPrepTask(item)}
                                          className={`px-2 py-0.5 text-[10px] font-semibold rounded shadow-xs transition-colors ${
                                            (canFund && !isCompleted)
                                              ? 'bg-[#0c2340] hover:bg-[#1b365d] text-white cursor-pointer' 
                                              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                          }`}
                                          title={canFund ? 'Cairkan Kas' : 'Saldo Sisa Kantong Tidak Cukup'}
                                        >
                                          Cairkan
                                        </button>
                                      )}
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditPrepItem(item)}
                                        disabled={isCompleted}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                        title="Edit Tugas"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePrepItem(item.id)}
                                        disabled={isCompleted}
                                        className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                        title="Hapus Agenda"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
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

                    {/* Add Prep Item form */}
                    <form onSubmit={handleAddPreparationItem} className="pt-3 border-t border-slate-200 space-y-2.5 bg-slate-50 p-3.5 rounded text-xs">
                      <span className="text-xs font-bold text-slate-800 block mb-0.5">Tambah Tugas Persiapan</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="date"
                            required
                            disabled={isCompleted}
                            value={prepDate}
                            onChange={(e) => setPrepDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            disabled={isCompleted}
                            placeholder="PIC / Petugas"
                            value={prepPic}
                            onChange={(e) => setPrepPic(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                          />
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          disabled={isCompleted}
                          placeholder="Nama tugas persiapan kerja..."
                          value={prepTask}
                          onChange={(e) => setPrepTask(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            disabled={isCompleted}
                            checked={prepNeedsFunding}
                            onChange={(e) => setPrepNeedsFunding(e.target.checked)}
                            className="rounded border-slate-300 text-[#0c2340] focus:ring-[#0c2340] w-3.5 h-3.5"
                          />
                          Butuh Pencairan Dana
                        </label>
                        
                        {prepNeedsFunding && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">Rp</span>
                            <input
                              type="number"
                              required
                              disabled={isCompleted}
                              placeholder="Nominal..."
                              value={prepRequiredAmount || ''}
                              onChange={(e) => setPrepRequiredAmount(Number(e.target.value))}
                              className="px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-800 w-28 focus:outline-none focus:border-[#0c2340]"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isCompleted}
                        className="w-full py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                      >
                        Tambah Tugas Persiapan
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Detailed Committee & Servants List Panel */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3.5 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900 text-xs tracking-tight flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-700" /> Susunan Pengurus & Pelayan Acara
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">PANITIA ACARA</span>
                </div>

                {(!activeActivity.committeeMembers || activeActivity.committeeMembers.length === 0) ? (
                  <div className="text-center p-5 text-slate-500">
                    <User className="w-6 h-6 text-slate-400 mx-auto stroke-1.5 mb-1" />
                    <p className="text-xs">Belum ada susunan panitia atau pelayan acara yang ditambahkan.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {activeActivity.committeeMembers.map((member) => (
                      <div key={member.id} className="p-2 border border-slate-200 bg-slate-50 rounded flex items-center justify-between gap-1 group">
                        <div className="truncate">
                          <span className="text-[9px] bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.2 rounded font-semibold uppercase font-mono block w-max max-w-full truncate mb-0.5">
                            {member.role}
                          </span>
                          <strong className="text-xs text-slate-800 block truncate">{member.name}</strong>
                          {member.contact && <span className="text-[10px] text-slate-500 font-mono block">{member.contact}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCommitteeMember(member.id)}
                          disabled={isCompleted}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer flex-none disabled:opacity-0 disabled:pointer-events-none"
                          title="Hapus Pengurus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Committee Member form */}
                <form onSubmit={handleAddCommitteeMember} className="pt-2.5 border-t border-slate-200 space-y-2 bg-slate-50 p-3 rounded text-xs">
                  <span className="text-xs font-bold text-slate-800 block mb-0.5">Tambah Panitia / Pelayan</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      disabled={isCompleted}
                      placeholder="Peran (e.g. Pembicara / MC)"
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                    <input
                      type="text"
                      required
                      disabled={isCompleted}
                      placeholder="Nama Pengurus/Pelayan"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={isCompleted}
                      placeholder="Kontak / Keterangan (Opsional)"
                      value={memberContact}
                      onChange={(e) => setMemberContact(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340] flex-1"
                    />
                    <button
                      type="submit"
                      disabled={isCompleted}
                      className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold text-xs rounded cursor-pointer flex-none block disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                    >
                      Tambah
                    </button>
                  </div>
                </form>
              </div>

              {/* Detailed Description Panel */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-2.5 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-900 text-xs">Uraian Deskripsi & Agenda Kegiatan</h4>
                  <button
                    onClick={() => {
                      if (isEditingDescription) {
                        onUpdateActivity({ ...activeActivity, description: localDescription });
                      } else {
                        setLocalDescription(activeActivity.description || '');
                      }
                      setIsEditingDescription(!isEditingDescription);
                    }}
                    disabled={isCompleted}
                    className="text-xs text-[#0c2340] hover:underline flex items-center gap-1 cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> {isEditingDescription ? 'Selesai Edit' : 'Edit Deskripsi'}
                  </button>
                </div>

                {isEditingDescription ? (
                  <textarea
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    rows={6}
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                  />
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {activeActivity.description || 'Tidak ada catatan deskripsi tambahan untuk rincian kegiatan ini.'}
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EDIT PREPARATION ITEM MODAL DIALOG */}
      {editingPrepId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full overflow-hidden border border-slate-300 shadow-xl">
            <div className="px-4 py-3 bg-[#0c2340] text-white flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-tight">Edit Agenda Persiapan</h3>
              <button 
                type="button"
                onClick={() => setEditingPrepId(null)}
                className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveEditPrepItem} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Tugas Persiapan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cetak banner spanduk, Sewa tenda"
                  value={editPrepTask}
                  onChange={(e) => setEditPrepTask(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Target Tanggal</label>
                <input
                  type="date"
                  required
                  value={editPrepDate}
                  onChange={(e) => setEditPrepDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Penanggung Jawab (PIC)</label>
                <input
                  type="text"
                  required
                  placeholder="Nama PIC"
                  value={editPrepPic}
                  onChange={(e) => setEditPrepPic(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editPrepNeedsFunding}
                    onChange={(e) => setEditPrepNeedsFunding(e.target.checked)}
                    className="rounded border-slate-300 text-[#0c2340] focus:ring-[#0c2340] w-3.5 h-3.5"
                  />
                  <span className="text-xs font-semibold text-slate-700">Agenda ini butuh dana kas kegiatan</span>
                </label>
              </div>

              {editPrepNeedsFunding && (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Alokasi Anggaran (Rp) *</label>
                  <input
                    type="number"
                    required={editPrepNeedsFunding}
                    placeholder="Contoh: 150000"
                    value={editPrepRequiredAmount || ''}
                    onChange={(e) => setEditPrepRequiredAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
              )}

              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPrepId(null)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white text-xs font-semibold rounded cursor-pointer shadow-xs transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ACTIVITY MODAL DIALOG */}
      {isEditActivityFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden border border-slate-300 shadow-xl my-8">
            <div className="px-5 py-3.5 bg-[#0c2340] text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">Edit Rincian Kegiatan</h3>
              <button 
                onClick={() => setIsEditActivityFormOpen(false)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveEditActivity} className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold block">Nama Kegiatan / Agenda Resmi (Wajib)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Perayaan Natal Yayasan MMB 2026"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold block">Tema / Slogan Acara (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kasih Menembus Batas"
                    value={editTheme}
                    onChange={(e) => setEditTheme(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold block">Kordinator Umum / Pelayan PIC</label>
                  <input
                    type="text"
                    placeholder="Contoh: Yusuf R. Tamba"
                    value={editMinisters}
                    onChange={(e) => setEditMinisters(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold block">Tempat / Venue Lokasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gedung Aula Yayasan MMB"
                    value={editPlace}
                    onChange={(e) => setEditPlace(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold block">Taksasi Perkiraan Anggaran (Rp)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 5000000"
                    value={editBudgetEstimated}
                    onChange={(e) => setEditBudgetEstimated(Number(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded space-y-2 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Format Tanggal & Waktu Acara</span>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsTimeManual}
                      onChange={(e) => setEditIsTimeManual(e.target.checked)}
                      className="rounded text-[#0c2340] focus:ring-[#0c2340] h-3.5 w-3.5"
                    />
                    Tulis Manual
                  </label>
                </div>

                {!editIsTimeManual ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Tanggal</label>
                      <input
                        type="date"
                        required
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-[#0c2340]"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Mulai (WIB)</label>
                      <input
                        type="text"
                        required
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-[#0c2340]"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Selesai</label>
                      <input
                        type="text"
                        required
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-[#0c2340]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Tulis Waktu Bebas</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Setiap hari Jumat sepanjang bulan Desember"
                      value={editTimeValueManual}
                      onChange={(e) => setEditTimeValueManual(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold block">Gambaran Ringkas Acara (Deskripsi)</label>
                <textarea
                  placeholder="Uraikan deskripsi singkat maksud diadakan perayaan natal atau retreat ini..."
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0c2340]"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditActivityFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white text-xs font-semibold rounded cursor-pointer shadow-xs transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION OVERLAY */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full overflow-hidden border border-slate-300 shadow-xl">
            <div className="bg-[#0c2340] px-4 py-3 text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-200" />
              <h3 className="font-bold text-xs tracking-tight">{confirmDialog.title}</h3>
            </div>
            
            <div className="p-4 space-y-3.5 text-xs">
              <p className="text-slate-700 leading-relaxed">
                {confirmDialog.message}
              </p>
              
              <div className="flex gap-2 justify-end pt-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                >
                  {confirmDialog.cancelText || 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow-xs ${
                    confirmDialog.isDanger 
                      ? 'bg-rose-700 hover:bg-rose-800' 
                      : 'bg-[#0c2340] hover:bg-[#1b365d]'
                  }`}
                >
                  {confirmDialog.confirmText || 'Ya, Lanjutkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
