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
        <div id="activities-overview-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs/10 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Kegiatan & Acara</h2>
              <p className="text-xs text-slate-500 mt-1">
                Kelola kepanitiaan, rundown, serta keuangan mandiri ("kantong kas terpisah") per acara Yayasan Murid Muda Bermisi.
              </p>
            </div>
            
            <button
              onClick={() => setIsNewActivityFormOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all w-fit cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" /> Rintis Kegiatan
            </button>
          </div>

          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="max-w-md w-full flex gap-2">
              <input
                type="text"
                placeholder="Cari kegiatan berdasarkan nama, kordinator, tempat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div className="text-xs flex items-center gap-1.5 text-slate-500 px-1 font-mono sm:mr-auto">
              Saldo Kas Utama Yayasan saat ini: <strong className="text-slate-900">Rp {mainKasBalance.toLocaleString('id-ID')}</strong>
            </div>
            
            {/* Display viewMode Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold self-start sm:self-auto h-fit">
              <button 
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Tampilan Tabel
              </button>
              <button 
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Tampilan Kartu
              </button>
            </div>
          </div>

          {/* Activities GRID / LIST Layout */}
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 stroke-1.5 mb-3 animate-bounce" />
              <p className="text-xs font-semibold">Tidak ada data kegiatan diarsipkan.</p>
              <p className="text-[11px] text-slate-400 mt-1">Silakan rintis kegiatan baru seperti Perayaan Natal, Retreat, dll.</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase font-mono text-[9px] tracking-wider">
                    <th className="p-3">ID</th>
                    <th className="p-3">Nama Kegiatan</th>
                    <th className="p-3">Tema & Deskripsi</th>
                    <th className="p-3">Kordinator (PIC)</th>
                    <th className="p-3">Tempat & Waktu</th>
                    <th className="p-3 text-right">Taksasi Anggaran</th>
                    <th className="p-3 text-right">Saldo Kantong</th>
                    <th className="p-3 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredActivities.map((act) => {
                    return (
                      <tr key={act.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-mono text-[10px] font-semibold text-slate-400">
                          {act.id}
                        </td>
                        <td className="p-3 font-bold text-slate-850 text-xs sm:text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="block">{act.title}</span>
                            <span className={`inline-block w-fit px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              act.status === 'Selesai' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {act.status === 'Selesai' ? 'Selesai' : 'Sedang Berjalan'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 max-w-xs">
                          {act.theme && (
                            <div className="italic text-slate-600 font-semibold mb-1 text-[11px]">
                              Tema: "{act.theme}"
                            </div>
                          )}
                          <div className="text-slate-400 line-clamp-1 text-[11px]">
                            {act.description || 'Tidak ada deskripsi.'}
                          </div>
                        </td>
                        <td className="p-3 text-slate-700 font-semibold text-[11px] uppercase font-mono">
                          {act.ministers || 'Belum diatur'}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 text-[11px] text-slate-600">
                            <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {act.place || 'Belum diatur'}</span>
                            <span className="flex items-center gap-1 truncate"><Clock className="w-3.5 h-3.5 text-slate-400" /> {act.time || 'Belum diatur'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-500">
                          Rp {act.budgetEstimated.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-[#10B981]">
                          Rp {act.budgetWalletBalance.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedActivityId(act.id)}
                              className="px-3 py-1.5 bg-[#F1F5F9] hover:bg-blue-600 hover:text-white text-slate-700 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer shadow-xs"
                            >
                              Kelola
                            </button>
                            <button
                              onClick={() => handleDeleteActivityRecord(act.id, act.title)}
                              className="p-1.5 border border-red-100 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
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
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredActivities.map((act) => {
                const totalRests = act.budgetWalletBalance;
                const isUnderbudget = totalRests < act.budgetEstimated;
                return (
                  <div 
                    key={act.id}
                    className="group border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 bg-white hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                          <CalendarCheck className="w-5 h-5" />
                        </span>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg h-fit font-mono">
                            {act.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                            act.status === 'Selesai' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-250/50' 
                              : 'bg-amber-50 text-amber-700 border border-amber-250/50'
                          }`}>
                            {act.status === 'Selesai' ? 'Selesai' : 'Sedang Berjalan'}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 mt-4 text-base tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                        {act.title}
                      </h3>
                      
                      {act.theme && (
                        <p className="text-[11px] text-slate-500 italic mt-1.5 font-sans line-clamp-1 border-l-2 border-indigo-200 pl-2">
                          Tema: "{act.theme}"
                        </p>
                      )}

                      <p className="text-xs text-slate-500 mt-3 line-clamp-2">
                        {act.description || 'Tidak ada uraian deskripsi kegiatan.'}
                      </p>

                      {/* Detail metadata list with micro icons */}
                      <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">Pelayan/PIC: <strong>{act.ministers || 'Belum diatur'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 font-bold" />
                          <span className="truncate">Tempat: <strong>{act.place || 'Belum diatur'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Waktu: <strong>{act.time || 'Belum diatur'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      {/* Financial snapshots summary per card */}
                      <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-3 rounded-xl mb-4 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-400 text-[9px] block">TAKSASI ANGGARAN</span>
                          <strong className="text-slate-700 font-semibold">Rp {act.budgetEstimated.toLocaleString('id-ID')}</strong>
                        </div>
                        <div className="border-l border-slate-200/60 pl-3">
                          <span className="text-[#2563EB] text-[9px] block uppercase font-bold">SALDO KANTONG</span>
                          <strong className="text-[#10B981] font-bold">Rp {act.budgetWalletBalance.toLocaleString('id-ID')}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => setSelectedActivityId(act.id)}
                          className="flex-1 py-2 bg-[#F1F5F9] hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold rounded-xl text-center transition-all cursor-pointer"
                        >
                          Kelola Kegiatan
                        </button>

                        <button
                          onClick={() => handleDeleteActivityRecord(act.id, act.title)}
                          className="p-2 border border-red-100 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                          title="Hapus Kegiatan"
                        >
                          <Trash2 className="w-4 h-4" />
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
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-250">
                <div className="px-6 py-4 bg-[#2563EB] text-white flex justify-between items-center">
                  <h3 className="font-bold text-sm tracking-tight">Rintis Dokumen Rencana Kegiatan Baru</h3>
                  <button 
                    onClick={() => setIsNewActivityFormOpen(false)}
                    className="text-white/80 hover:text-white text-xs font-bold cursor-pointer font-mono"
                  >
                    [Tutup X]
                  </button>
                </div>
                
                <form onSubmit={handleSubmitNewActivity} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Nama Kegiatan / Agenda Resmi (Wajib)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Perayaan Natal Yayasan MMB 2026"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Tema Kegiatan (Acara)</label>
                      <input
                        type="text"
                        placeholder="Contoh: Terang Dunia Terbitlah"
                        value={newTheme}
                        onChange={(e) => setNewTheme(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Taksasi Dana yang Dibutuhkan (Rp)</label>
                      <input
                        type="number"
                        placeholder="Berapa perkiraan dana acara?"
                        value={newBudgetEstimated || ''}
                        onChange={(e) => setNewBudgetEstimated(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Kordinator Kegiatan / Pelayan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Yusuf (Kordinator Natal), Angel (Logistik), dll."
                      value={newMinisters}
                      onChange={(e) => setNewMinisters(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Tempat / Lokasi</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Aula Serbaguna Wisma MMB"
                      value={newPlace}
                      onChange={(e) => setNewPlace(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* High Quality Dynamic Date/Time Picker */}
                  <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">Input Format Waktu</label>
                      <button
                        type="button"
                        onClick={() => setIsTimeManual(!isTimeManual)}
                        className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        {isTimeManual ? "Gunakan Kalender Dinamik" : "Tulis Teks Manual"}
                      </button>
                    </div>

                    {!isTimeManual ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">TANGGAL KEGIATAN</label>
                          <input
                            type="date"
                            required
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">JAM MULAI</label>
                            <input
                              type="time"
                              required
                              value={newStartTime}
                              onChange={(e) => setNewStartTime(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">JAM SELESAI</label>
                            <input
                              type="time"
                              required
                              value={newEndTime}
                              onChange={(e) => setNewEndTime(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                            />
                          </div>
                        </div>
                        {newDate && (
                          <div className="p-2 bg-blue-50/50 rounded text-[10px] text-slate-600 font-mono border border-blue-100">
                            <strong>Pratinjau Hasil:</strong> {formatIndonesianDateFull(newDate)} (Pkl. {newStartTime} - {newEndTime} WIB)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">TULIS ALASAN / WAKTU BEBAS</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Setiap hari Jumat sepanjang bulan Desember"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Gambaran Ringkas Acara (Deskripsi)</label>
                    <textarea
                      placeholder="Uraikan deskripsi singkat maksud diadakan perayaan natal atau retreat ini..."
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsNewActivityFormOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Simpan & Buka Dashboard Acara
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
              className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs self-start"
            >
              <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar Kegiatan
            </button>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleStartEditActivity(activeActivity)}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs"
                title="Edit data rincian agenda acara"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Rincian
              </button>

              <button
                onClick={() => handleExportActivityCSV(activeActivity)}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs"
                title="Download / Ekspor rekap jurnal keuangan acara"
              >
                <DollarSign className="w-3.5 h-3.5" /> Unduh Jurnal CSV
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
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs"
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
                className={`px-3 py-1.5 border rounded-xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs ${
                  activeActivity.status === 'Selesai'
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                }`}
                title={activeActivity.status === 'Selesai' ? 'Buka kembali status kegiatan menjadi Sedang Berjalan' : 'Tandai kegiatan ini telah selesai dilaksanakan'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activeActivity.status === 'Selesai' ? 'Buka Kembali Kegiatan' : 'Tandai Kegiatan Selesai'}
              </button>

              <button
                onClick={() => handleDeleteActivityRecord(activeActivity.id, activeActivity.title)}
                className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl flex items-center gap-1.5 text-xs font-black transition-all cursor-pointer shadow-xs"
                title="Hapus dan tutup permanen seluruh dokumen data acara"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Kegiatan
              </button>

              <div className="text-xs text-slate-400 font-mono pl-2 border-l border-slate-200 hidden md:block">
                ID UNIT: <strong>{activeActivity.id}</strong>
              </div>
            </div>
          </div>

          {/* Upper Summary Banner Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-md uppercase font-mono tracking-wider border border-blue-100">
                  Dashboard Kegiatan Terpadu
                </span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">KAS TERISOLASI</span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase font-mono tracking-wider border ${
                  activeActivity.status === 'Selesai' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  Status: {activeActivity.status === 'Selesai' ? 'Selesai' : 'Sedang Berjalan'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {activeActivity.title}
              </h1>
              {activeActivity.theme && (
                <p className="text-sm text-slate-500 italic">
                  Tema: "{activeActivity.theme}"
                </p>
              )}
            </div>

            {/* Standalone Activity Pocket Balances Highlights */}
            <div className="flex-none flex shrink-0 divide-x divide-slate-200 bg-slate-50 border border-slate-150 rounded-2xl p-4 gap-4 md:gap-6">
              <div className="text-left font-mono">
                <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Taksasi Dana Acara</span>
                <strong className="text-slate-800 text-lg font-black">Rp {activeActivity.budgetEstimated.toLocaleString('id-ID')}</strong>
              </div>
              <div className="text-left font-mono pl-4 md:pl-6">
                <span className="text-emerald-600 text-[9px] block font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Target Kas Kantong Kegiatan
                </span>
                <strong className="text-emerald-500 text-lg font-black">Rp {activeActivity.budgetWalletBalance.toLocaleString('id-ID')}</strong>
              </div>
            </div>
          </div>

          {/* Quick Info Grid panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 border border-slate-200/80 rounded-2xl flex items-center gap-3">
              <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <User className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="text-[9px] text-slate-400 block font-bold">PELAYAN / KORDINATOR</span>
                <strong className="text-xs text-slate-700 truncate block">{activeActivity.ministers || 'Belum diisi'}</strong>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200/80 rounded-2xl flex items-center gap-3">
              <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <MapPin className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="text-[9px] text-slate-400 block font-bold">LOKASI & TEMPAT</span>
                <strong className="text-xs text-slate-700 truncate block">{activeActivity.place || 'Belum diisi'}</strong>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200/80 rounded-2xl flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="text-[9px] text-slate-400 block font-bold">WAKTU PERINTISAN</span>
                <strong className="text-xs text-slate-700 truncate block">{activeActivity.time || 'Belum diisi'}</strong>
              </div>
            </div>

            <div className="bg-white p-4 border border-slate-200/80 rounded-2xl flex items-center gap-3">
              <span className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                <Info className="w-4 h-4" />
              </span>
              <div className="truncate">
                <span className="text-[9px] text-slate-400 block font-bold">SURPLUS SISA</span>
                <strong className="text-xs text-slate-700 block text-emerald-600">
                  {activeActivity.budgetWalletBalance > activeActivity.budgetEstimated ? 'SURPLUS' : 'Sedang Berjalan'}
                </strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: INTERACTIVE SEPARATE POCKET TREASURY (KEUANGAN & TRANSFERS) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Isolated Sub-Wallet Controls */}
              <div id="sub-wallet-panel" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                    <DollarSign className="w-4.5 h-4.5 text-blue-600" /> Kantong Dana Kegiatan Sendiri
                  </h3>
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold uppercase">Keuangan Mandiri</span>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-100/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">Uang Masuk & Keluar Kegiatan ini Terpisah!</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Semoga kegiatan {activeActivity.title} berjalan sukses dan penuh berkat.</p>
                  </div>
                  <div className="px-4 py-2 bg-white rounded-xl border border-blue-200 font-mono text-center">
                    <span className="text-[8px] text-slate-400 block">SALDO UTAMA YAYASAN</span>
                    <strong className="text-blue-700 font-extrabold text-xs">Rp {mainKasBalance.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                {/* Direct Manual Entry (An-Acara Pocket Logs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Form 1: Keuangan Pemasukan & Pengeluaran Mandiri */}
                  <form onSubmit={handleAddPocketTransaction} className="space-y-4 p-4 border border-slate-150 rounded-xl bg-slate-50/40">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-600" /> Entri Kas Mandiri Acara
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">ARUS TRANSAKSI</label>
                        <select
                          value={txType}
                          onChange={(e) => setTxType(e.target.value as 'In' | 'Out')}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        >
                          <option value="In">Uang Masuk (Pemasukan)</option>
                          <option value="Out">Uang Keluar (Belanja)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">JUMLAH (RP)</label>
                        <input
                          type="number"
                          required
                          value={txAmount || ''}
                          onChange={(e) => setTxAmount(Number(e.target.value))}
                          placeholder="Rp..."
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">KETERANGAN BELANJA / SUMBER DANA</label>
                        <input
                          type="text"
                          required
                          value={txDescription}
                          onChange={(e) => setTxDescription(e.target.value)}
                          placeholder="e.g. Pembelian lilin natal / Donatur perorangan"
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Buku Transaksi Kegiatan
                    </button>
                  </form>

                  {/* Form 2: TRANSFER DANA DARI/KE KAS YAYASAN */}
                  <form onSubmit={handleFundTransfer} className="space-y-4 p-4 border border-blue-100 rounded-xl bg-blue-50/20">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600 font-bold" /> Subsidi-Kirim Balik Kas Yayasan
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">TIPE PERPINDAHAN</label>
                        <select
                          value={transferDirection}
                          onChange={(e) => setTransferDirection(e.target.value as 'From_Main' | 'To_Main')}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        >
                          <option value="From_Main">Ambil dari Kas Yayasan (Subsidi)</option>
                          <option value="To_Main">Kirim Balik Sisa ke Yayasan (Surplus)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">TRANSFER NOMINAL (RP)</label>
                        <input
                          type="number"
                          required
                          value={transferAmount || ''}
                          onChange={(e) => setTransferAmount(Number(e.target.value))}
                          placeholder="Nominal..."
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">CATATAN TRANSFER</label>
                      <input
                        type="text"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        placeholder="Contoh: Tambahan anggaran Natal Sie Konsumsi"
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Eksekusi Perpindahan Dana Kas
                    </button>
                  </form>
                </div>
              </div>

              {/* Transaction Logs list specific to this activity */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                    Log Jurnal Keuangan Mandiri Acara ({activeTxList.length})
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">ARUS SURAT SEJARAH KAS</span>
                </div>

                {activeTxList.length === 0 ? (
                  <div className="text-center p-8 text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto stroke-1.5 mb-2" />
                    <p className="text-[11px]">Belum ada data jurnal uang dicatatkan untuk kantong modal kegiatan ini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/50">
                          <th className="p-2.5">Tanggal</th>
                          <th className="p-2.5">Kategori / Sumber</th>
                          <th className="p-2.5">Keterangan</th>
                          <th className="p-2.5 text-right">Jumlah (Rp)</th>
                          <th className="p-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTxList.map((tx) => {
                          const isInFlow = tx.type === 'In' || tx.type === 'Transfer_From_Main';
                          const isTransfer = tx.type === 'Transfer_From_Main' || tx.type === 'Transfer_To_Main';
                          
                          return (
                            <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                              <td className="p-2.5 text-slate-500">{tx.date}</td>
                              <td className="p-2.5">
                                <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                                  isTransfer
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                    : isInFlow 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                      : 'bg-red-50 text-red-700 border border-red-100'
                                }`}>
                                  {isTransfer 
                                    ? (tx.type === 'Transfer_From_Main' ? 'SUBSIDI IN' : 'PULANG OUT') 
                                    : (isInFlow ? 'PEMASUKAN' : 'BELANJA ACARA')}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-700 font-sans max-w-xs truncate" title={tx.description}>
                                {tx.description}
                                <span className="block text-[8px] text-slate-400 font-mono">Buku oleh: {tx.operator}</span>
                              </td>
                              <td className={`p-2.5 text-right font-bold text-xs ${
                                isInFlow ? 'text-emerald-600' : 'text-red-500'
                              }`}>
                                {isInFlow ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => handleStartEditTx(tx)}
                                    className="p-1 hover:bg-amber-50 text-amber-600 hover:text-amber-700 rounded transition-colors cursor-pointer"
                                    title="Edit Jurnal"
                                  >
                                    <Edit3 className="w-3 pb-0.5 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteActivityTxRecord(tx)}
                                    className="p-1 hover:bg-red-50 text-red-500 hover:text-red-600 rounded transition-colors cursor-pointer"
                                    title="Hapus Jurnal"
                                  >
                                    <Trash2 className="w-3 h-3" />
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
                      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-250">
                          <div className="px-5 py-3.5 bg-blue-600 text-white flex justify-between items-center">
                            <h3 className="font-bold text-xs tracking-tight uppercase font-mono">Edit Jurnal Transaksi</h3>
                            <button 
                              onClick={() => setEditingTxId(null)}
                              className="text-white/80 hover:text-white text-xs font-bold cursor-pointer font-mono"
                            >
                              [X]
                            </button>
                          </div>
                          
                          <form onSubmit={handleSaveEditTx} className="p-5 space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">ARUS TRANSAKSI</label>
                              <select
                                value={editTxType}
                                onChange={(e) => setEditTxType(e.target.value as 'In' | 'Out')}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                              >
                                <option value="In">Uang Masuk (Pemasukan)</option>
                                <option value="Out">Uang Keluar (Belanja)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">JUMLAH (RP)</label>
                              <input
                                type="number"
                                required
                                value={editTxAmount}
                                onChange={(e) => setEditTxAmount(Number(e.target.value))}
                                placeholder="Rp..."
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">TANGGAL TRANSAKSI</label>
                              <input
                                type="date"
                                required
                                value={editTxDate}
                                onChange={(e) => setEditTxDate(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1">KETERANGAN BELANJA / SUMBER DANA</label>
                              <input
                                type="text"
                                required
                                value={editTxDescription}
                                onChange={(e) => setEditTxDescription(e.target.value)}
                                placeholder="Pembelian rincian..."
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                              />
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setEditingTxId(null)}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="submit"
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
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
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                    <ListOrdered className="w-4.5 h-4.5 text-indigo-600" /> Agenda & Schedule Kerja
                  </h3>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold self-start sm:self-auto">
                    <button 
                      type="button"
                      onClick={() => setActiveAgendaTab('rundown')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeAgendaTab === 'rundown' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Rundown Acara (Hari-H)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveAgendaTab('preparation')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeAgendaTab === 'preparation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Agenda Persiapan Task
                    </button>
                  </div>
                </div>

                {activeAgendaTab === 'rundown' ? (
                  <>
                    <span className="text-[10px] text-slate-500 font-mono tracking-wider block bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      INFO: Rundown waktu acara Hari-H khusus kordinasi alur ibadah/pesta tanpa unsur pendanaan langsung.
                    </span>
                    {/* Rundown list */}
                    {(!activeRundownItemsList || activeRundownItemsList.length === 0) ? (
                      <div className="text-center p-8 text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto stroke-1.5 mb-2 animate-pulse" />
                        <p className="text-[11px]">Agenda rundown belum terdaftar.</p>
                        <p className="text-[9px] text-indigo-400 mt-1">Gunakan form di bawah untuk mendaftarkan jadwal rundown.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[350px]">
                        <table className="w-full text-left border-collapse text-xs border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase font-mono text-[9px] tracking-wider">
                              <th className="p-3">Waktu (Hari-H)</th>
                              <th className="p-3">Agenda & Deskripsi Kegiatan</th>
                              <th className="p-3">PIC / Pelayan</th>
                              <th className="p-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {activeRundownItemsList.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="p-3 font-mono font-bold text-blue-600">
                                  {item.time}
                                </td>
                                <td className="p-3 text-slate-700 font-semibold whitespace-pre-wrap">
                                  {item.activity}
                                </td>
                                <td className="p-3 font-mono text-[10px] font-bold text-indigo-600 uppercase">
                                  {item.pic}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => handleDeleteRundownItem(item.id)}
                                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
                    <form onSubmit={handleAddRundownItem} className="pt-4 border-t border-slate-100 space-y-3 bg-slate-50 p-4 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tambah Agenda Schedule</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <input
                            type="text"
                            required
                            placeholder="Waktu (e.g. 18:00)"
                            value={rundownTime}
                            onChange={(e) => setRundownTime(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Penanggung Jawab (PIC)"
                            value={rundownPic}
                            onChange={(e) => setRundownPic(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Uraian detail rincian acara..."
                          value={rundownActivity}
                          onChange={(e) => setRundownActivity(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-all"
                      >
                        Tambah Agenda rundown
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-amber-800 font-mono tracking-wider block bg-amber-50 px-2 py-1 rounded border border-amber-100">
                      INFO: Alur kerja koordinasi persiapan pra-acara. Tugas dapat ditandai butuh dana kerja kegiatan.
                    </span>
                    {/* Preparation items list */}
                    {(!activePreparationItemsList || activePreparationItemsList.length === 0) ? (
                      <div className="text-center p-8 text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto stroke-1.5 mb-2 animate-pulse" />
                        <p className="text-[11px]">Daftar tugas persiapan masih kosong.</p>
                        <p className="text-[9px] text-amber-500 mt-1">Gunakan form di bawah untuk menambahkan poin agenda persiapan.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[350px]">
                        <table className="w-full text-left border-collapse text-xs border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase font-mono text-[9px] tracking-wider">
                              <th className="p-3">Target Tanggal</th>
                              <th className="p-3">Uraian Tugas / Agenda Persiapan</th>
                              <th className="p-3">PIC</th>
                              <th className="p-3 text-right">Biaya / Status</th>
                              <th className="p-3 text-center">Status Selesai</th>
                              <th className="p-3 text-center">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {activePreparationItemsList.map((item) => {
                              const canFund = activeActivity.budgetWalletBalance >= (item.requiredAmount || 0);
                              return (
                                <tr key={item.id} className={`hover:bg-slate-50/40 transition-colors ${item.status === 'Completed' ? 'bg-emerald-50/10' : ''}`}>
                                  <td className="p-3 font-mono text-[10px] text-slate-400 font-bold">
                                    {item.date}
                                  </td>
                                  <td className="p-3">
                                    <span className={`font-semibold text-slate-800 ${item.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                                      {item.task}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-[10px] font-bold text-indigo-600 uppercase">
                                    {item.pic}
                                  </td>
                                  <td className="p-3 text-right">
                                    {item.needsFunding ? (
                                      <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase font-mono tracking-wide ${
                                          item.funded 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                            : 'bg-amber-50 text-amber-800 border-amber-150'
                                        }`}>
                                          {item.funded ? 'Cair' : `Minta Rp ${item.requiredAmount?.toLocaleString('id-ID')}`}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium italic">Seksi Non-Dana</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePrepStatus(item.id)}
                                      className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all border ${
                                        item.status === 'Completed'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                      }`}
                                    >
                                      {item.status === 'Completed' ? 'Selesai ✓' : 'Belum'}
                                    </button>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {item.needsFunding && !item.funded && (
                                        <button
                                          type="button"
                                          disabled={!canFund}
                                          onClick={() => handleFundPrepTask(item)}
                                          className={`px-2 py-1 text-[9px] font-extrabold rounded-md shadow-xs transition-all ${
                                            canFund 
                                              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
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
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                                        title="Edit Tugas"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePrepItem(item.id)}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
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
                    <form onSubmit={handleAddPreparationItem} className="pt-4 border-t border-slate-100 space-y-3 bg-amber-50/10 p-4 rounded-xl">
                      <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">Tambah Tugas Persiapan</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="date"
                            required
                            value={prepDate}
                            onChange={(e) => setPrepDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="PIC / Petugas"
                            value={prepPic}
                            onChange={(e) => setPrepPic(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="Nama tugas persiapan kerja..."
                          value={prepTask}
                          onChange={(e) => setPrepTask(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="p-2 border border-slate-200/60 bg-white rounded-lg space-y-2">
                        <label className="flex items-center gap-2 text-xs text-slate-700 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={prepNeedsFunding}
                            onChange={(e) => setPrepNeedsFunding(e.target.checked)}
                            className="w-3.5 h-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                          />
                          Memerlukan Alokasi Belanja Anggaran?
                        </label>
                        {prepNeedsFunding && (
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-0.5">NOMINAL (RP)</label>
                            <input
                              type="number"
                              required
                              placeholder="Rp..."
                              value={prepRequiredAmount || ''}
                              onChange={(e) => setPrepRequiredAmount(Number(e.target.value))}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-all"
                      >
                        Tambah Tugas Persiapan
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Detailed Committee & Servants List Panel */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-indigo-500" /> Susunan Pengurus & Pelayan Acara
                  </h4>
                  <span className="text-[9px] text-slate-400 font-mono tracking-widest">COMMITTEE & MINISTERS</span>
                </div>

                {(!activeActivity.committeeMembers || activeActivity.committeeMembers.length === 0) ? (
                  <div className="text-center p-6 text-slate-400">
                    <User className="w-6 h-6 text-slate-300 mx-auto stroke-1.5 mb-1" />
                    <p className="text-[11px]">Belum ada susunan panitia atau pelayan acara yang ditambahkan.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {activeActivity.committeeMembers.map((member) => (
                      <div key={member.id} className="p-2.5 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between gap-1 group">
                        <div className="truncate">
                          <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-md font-extrabold uppercase font-mono block w-max max-w-full truncate mb-0.5">
                            {member.role}
                          </span>
                          <strong className="text-xs text-slate-800 block truncate">{member.name}</strong>
                          {member.contact && <span className="text-[9px] text-slate-400 font-mono block">{member.contact}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCommitteeMember(member.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-all cursor-pointer flex-none"
                          title="Hapus Pengurus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Committee Member form */}
                <form onSubmit={handleAddCommitteeMember} className="pt-3 border-t border-slate-100 space-y-2 bg-slate-50/50 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tambah Panitia / Pelayan</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Peran (e.g. Pembicara / MC / Ketua)"
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Nama Pengurus/Pelayan"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Kontak / Keterangan (Opsional)"
                      value={memberContact}
                      onChange={(e) => setMemberContact(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none flex-1"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer flex-none block"
                    >
                      Tambah
                    </button>
                  </div>
                </form>
              </div>

              {/* Detailed Description Panel */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-800 text-xs">Uraian Deskripsi & Agenda Kegiatan</h4>
                  <button
                    onClick={() => {
                      if (isEditingDescription) {
                        onUpdateActivity(activeActivity);
                      }
                      setIsEditingDescription(!isEditingDescription);
                    }}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> {isEditingDescription ? 'Selesai Edit' : 'Edit Deskripsi'}
                  </button>
                </div>

                {isEditingDescription ? (
                  <textarea
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    rows={6}
                    value={activeActivity.description || ''}
                    onChange={(e) => {
                      const updated = { ...activeActivity, description: e.target.value };
                      onUpdateActivity(updated);
                    }}
                  />
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-250">
            <div className="px-5 py-3.5 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-tight uppercase font-mono">Edit Agenda Persiapan</h3>
              <button 
                type="button"
                onClick={() => setEditingPrepId(null)}
                className="text-white/80 hover:text-white text-xs font-bold cursor-pointer font-mono"
              >
                [X]
              </button>
            </div>
            
            <form onSubmit={handleSaveEditPrepItem} className="p-5 space-y-4 font-sans text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">PROGRAM / TUGAS PERSIAPAN</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cetak banner spanduk, Sewa tenda"
                  value={editPrepTask}
                  onChange={(e) => setEditPrepTask(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">TARGET TANGGAL BARU</label>
                <input
                  type="date"
                  required
                  value={editPrepDate}
                  onChange={(e) => setEditPrepDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">PENANGGUNG JAWAB (PIC)</label>
                <input
                  type="text"
                  required
                  placeholder="Nama PIC"
                  value={editPrepPic}
                  onChange={(e) => setEditPrepPic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPrepNeedsFunding}
                    onChange={(e) => setEditPrepNeedsFunding(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
                  />
                  <span className="text-[11px] font-bold text-slate-700">Agenda ini butuh dana kas kegiatan</span>
                </label>
              </div>

              {editPrepNeedsFunding && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <label className="text-[9px] font-bold text-indigo-600 block mb-1">ALOKASI ANGGARAN (RP) *</label>
                  <input
                    type="number"
                    required={editPrepNeedsFunding}
                    placeholder="Contoh: 150000"
                    value={editPrepRequiredAmount || ''}
                    onChange={(e) => setEditPrepRequiredAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPrepId(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-250">
            <div className="px-6 py-4 bg-amber-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-tight">Edit Rincian Rencana Kegiatan</h3>
              <button 
                onClick={() => setIsEditActivityFormOpen(false)}
                className="text-white/85 hover:text-white text-xs font-bold cursor-pointer font-mono"
              >
                [Tutup X]
              </button>
            </div>
            
            <form onSubmit={handleSaveEditActivity} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Nama Kegiatan / Agenda Resmi (Wajib)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Perayaan Natal Yayasan MMB 2026"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Tema / Slogan Acara (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Kasih Menembus Batas"
                    value={editTheme}
                    onChange={(e) => setEditTheme(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Kordinator Umum / Pelayan PIC</label>
                  <input
                    type="text"
                    placeholder="Contoh: Yusuf R. Tamba"
                    value={editMinisters}
                    onChange={(e) => setEditMinisters(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Tempat / Venue Lokasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gedung Aula Yayasan MMB"
                    value={editPlace}
                    onChange={(e) => setEditPlace(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Taksasi Perkiraan Anggaran Mulai (Rp)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 5000000"
                    value={editBudgetEstimated}
                    onChange={(e) => setEditBudgetEstimated(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2.5 border border-slate-150">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Format Tanggal & Waktu Acara</span>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-amber-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsTimeManual}
                      onChange={(e) => setEditIsTimeManual(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 h-3 w-3"
                    />
                    Atur deskripsi waktu bebas
                  </label>
                </div>

                {!editIsTimeManual ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-[8px] text-slate-400 font-bold block mb-0.5">HARI / TANGGAL</label>
                      <input
                        type="date"
                        required
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[8px] text-slate-400 font-bold block mb-0.5">MULAI (WIB)</label>
                      <input
                        type="text"
                        required
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[8px] text-slate-400 font-bold block mb-0.5">SELESAI</label>
                      <input
                        type="text"
                        required
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 block mb-0.5">TULIS ALASAN / WAKTU BEBAS</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Setiap hari Jumat sepanjang bulan Desember"
                      value={editTimeValueManual}
                      onChange={(e) => setEditTimeValueManual(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Gambaran Ringkas Acara (Deskripsi)</label>
                <textarea
                  placeholder="Uraikan deskripsi singkat maksud diadakan perayaan natal atau retreat ini..."
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditActivityFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION OVERLAY (SANDBOX ROBUST) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`p-4 flex items-center gap-3 ${confirmDialog.isDanger ? 'bg-red-50 border-b border-red-100 text-red-800' : 'bg-indigo-50 border-b border-indigo-100 text-indigo-800'}`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 ${confirmDialog.isDanger ? 'text-red-500 animate-bounce' : 'text-indigo-600'}`} />
              <h3 className="font-extrabold text-xs tracking-tight uppercase font-mono">{confirmDialog.title}</h3>
            </div>
            
            <div className="p-5 space-y-4 font-sans">
              <p className="text-slate-650 text-xs leading-relaxed font-medium">
                {confirmDialog.message}
              </p>
              
              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  {confirmDialog.cancelText || 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`px-3.5 py-1.5 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                    confirmDialog.isDanger 
                      ? 'bg-red-500 hover:bg-red-650' 
                      : 'bg-indigo-600 hover:bg-indigo-750'
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
