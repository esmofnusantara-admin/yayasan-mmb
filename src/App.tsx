/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  BookOpen, 
  Wallet, 
  HeartHandshake, 
  ClipboardCheck, 
  FileText, 
  Server, 
  UserSquare2,
  User,
  Menu,
  X,
  Coins,
  FilePieChart
} from 'lucide-react';

// Import local components
import DashboardTab from './components/DashboardTab';
import MembersTab from './components/MembersTab';
import SmallGroupsTab from './components/SmallGroupsTab';
import FinanceTab from './components/FinanceTab';
import PartnersTab from './components/PartnersTab';
import StaffTab from './components/StaffTab';
import PayrollTab from './components/PayrollTab';
import LettersTab from './components/LettersTab';
import ApprovalsTab from './components/ApprovalsTab';
import SystemTab from './components/SystemTab';
import LoginScreen from './components/LoginScreen';
import StaffMeTab from './components/StaffMeTab';
import ReportsTab from './components/ReportsTab';
import MMBLogo from './components/MMBLogo';

// Import state type bindings & seed data
import { 
  Member, 
  SmallGroup, 
  Transaction, 
  FinancialCategory, 
  Partner, 
  Staff, 
  StaffSalary,
  LetterInward, 
  LetterOutward, 
  OrgDocument, 
  ApprovalRequest, 
  InstitutionalProfile, 
  AuditLog,
  MemberNote,
  PrayerRequest,
  FollowUpLog,
  MeetingLog,
  MaterialInfo,
  CampaignDonation
} from './types';

import { 
  INITIAL_PROFILE,
  INITIAL_MEMBERS,
  INITIAL_MEMBER_NOTES,
  INITIAL_PRAYER_REQUESTS,
  INITIAL_FOLLOW_UPS,
  INITIAL_SMALL_GROUPS,
  INITIAL_MEETING_LOGS,
  INITIAL_MATERIALS,
  INITIAL_TRANSACTIONS,
  INITIAL_CATEGORIES,
  INITIAL_PARTNERS,
  INITIAL_STAFF,
  INITIAL_SALARIES,
  INITIAL_INWARD_LETTERS,
  INITIAL_OUTWARD_LETTERS,
  INITIAL_DOCUMENTS,
  INITIAL_APPROVALS,
  INITIAL_AUDITS,
  INITIAL_DONATIONS
} from './data/initialData';

interface AuthUser {
  email: string;
  name: string;
  role: string;
  features?: string[];
  token?: string;
}

// Global secure request interceptor wrapping vanilla window.fetch safely
const originalFetch = window.fetch;
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const saved = localStorage.getItem('esm_session_user');
  let token = '';
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      token = parsed?.token || '';
    } catch (_) {}
  }

  const modifiedInit: RequestInit = init || {};
  if (token) {
    const headers = new Headers(modifiedInit.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    modifiedInit.headers = headers;
  }

  try {
    const response = await originalFetch(input, modifiedInit);
    // If unauthorized or session is invalid, purge and redirect to handle gracefully
    if (response.status === 401) {
      console.warn('Authentication token is invalid or expired. Logging out.');
      localStorage.removeItem('esm_session_user');
      // Prevent infinite reload loops on login page itself
      const path = typeof input === 'string' ? input : '';
      if (!path.includes('/api/auth/login')) {
        window.location.reload();
      }
    }
    return response;
  } catch (error) {
    throw error;
  }
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  console.error("Failed to redefine window.fetch with Object.defineProperty", e);
}

export default function App() {
  // Active Authenticated Session
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('esm_session_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(() => {
    const saved = localStorage.getItem('esm_session_user');
    return !!saved;
  });

  // Cryptographic Session Verification and Profile Real-Time Sync on Boot
  useEffect(() => {
    const verifySessionOnStartup = async () => {
      const saved = localStorage.getItem('esm_session_user');
      if (!saved) {
        setIsVerifyingSession(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/verify');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            // Overwrite and align with the authentic, cryptographically validated server-side parameters only
            localStorage.setItem('esm_session_user', JSON.stringify(result.user));
            setCurrentUser(result.user);
          } else {
            throw new Error('Identitas token palsu atau kedaluwarsa');
          }
        } else {
          throw new Error('Otentikasi ditolak oleh server');
        }
      } catch (err) {
        console.warn('Proteksi Sesi Sistem: Kunci token tidak sah atau terdeteksi manipulasi data. Menghapus sesi...', err);
        localStorage.removeItem('esm_session_user');
        setCurrentUser(null);
      } finally {
        setIsVerifyingSession(false);
      }
    };

    verifySessionOnStartup();
  }, []);

  const currentRole = currentUser?.role || 'Staff';

  const hasFeatureAccess = (feature: string): boolean => {
    if (!currentUser) return false;
    if (feature === 'staff_profile') return true; // Always allow self-profile
    
    // Allow override if the feature is explicitly granted in the user's customized features list
    if (currentUser.features && currentUser.features.includes(feature)) {
      return true;
    }

    // Explicitly deny restricted administrative areas for Staff role
    if (currentUser.role === 'Staff' && (feature === 'finance' || feature === 'reports' || feature === 'partners' || feature === 'staff' || feature === 'payroll' || feature === 'approvals' || feature === 'system')) {
      return false;
    }

    const defaultFeaturesMap: Record<string, string[]> = {
      'Super Admin': ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system', 'staff_profile', 'reports'],
      'Ketua Yayasan': ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system', 'staff_profile', 'reports'],
      'Bendahara': ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'staff_profile', 'reports'],
      'Sekretaris': ['dashboard', 'members', 'small_groups', 'letters', 'system', 'staff_profile', 'reports'],
      'Staff': ['dashboard', 'members', 'small_groups', 'staff_profile']
    };
    const roleFeatures = defaultFeaturesMap[currentUser.role] || ['dashboard'];
    if (currentUser.features && currentUser.features.length > 0) {
      return currentUser.features.includes(feature) || roleFeatures.includes(feature);
    }
    return roleFeatures.includes(feature);
  };

  // Auto-logout feature (30 minutes of inactivity)
  useEffect(() => {
    if (!currentUser) return;

    let inactivityTimeout: NodeJS.Timeout;

    const handleAutoLogout = () => {
      localStorage.removeItem('esm_session_user');
      setCurrentUser(null);
      alert('Sesi Keamanan: Anda telah keluar secara otomatis karena tidak ada aktivitas selama 30 menit demi perlindungan akses.');
    };

    const resetInactivityTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      // 30 minutes = 30 * 60 * 1000 miliseconds
      inactivityTimeout = setTimeout(handleAutoLogout, 30 * 60 * 1000);
    };

    // Activity indicator events
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach((eventName) => {
      window.addEventListener(eventName, resetInactivityTimer);
    });

    // Start initial timer
    resetInactivityTimer();

    return () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetInactivityTimer);
      });
    };
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // States
  const [profile, setProfile] = useState<InstitutionalProfile>(INITIAL_PROFILE);
  const [members, setMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpLog[]>([]);
  
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [meetings, setMeetings] = useState<MeetingLog[]>([]);
  const [materials, setMaterials] = useState<MaterialInfo[]>([]);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [salaries, setSalaries] = useState<StaffSalary[]>([]);
  const [inwardLetters, setInwardLetters] = useState<LetterInward[]>([]);
  const [outwardLetters, setOutwardLetters] = useState<LetterOutward[]>([]);
  const [documents, setDocuments] = useState<OrgDocument[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [donations, setDonations] = useState<CampaignDonation[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [isSystemSeeded, setIsSystemSeeded] = useState<boolean | null>(null);

  // Restful Loader Helper with Auto-Seeding
  const safeFetchJson = async (url: string, retries = 7, delayMs = 2000): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      let responseStatus: number | null = null;
      try {
        const res = await fetch(url);
        responseStatus = res.status;
        if (!res.ok) {
          throw new Error(`HTTP status ${res.status}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (
          contentType.toLowerCase().includes('text/html') || 
          (contentType.toLowerCase().includes('text/plain') && !contentType.toLowerCase().includes('json'))
        ) {
          throw new Error('Received non-JSON response from server (HTML or plain text fallback)');
        }
        const data = await res.json();
        return data;
      } catch (err: any) {
        if (responseStatus === 401 || responseStatus === 403 || responseStatus === 400 || responseStatus === 404) {
          // Fast fail for strict permission constraints and invalid client requests
          throw err;
        }
        console.warn(`Attempt ${i + 1} to fetch ${url} failed: ${err.message}`);
        if (i === retries - 1) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  };

  const loadCollection = async <T extends { id?: string; nik?: string; deleted?: boolean; createdAt?: string; createdBy?: string }>(
    colName: string,
    initialData: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ): Promise<T[]> => {
    // Client-side authority alignment check to prevent unauthorized 403 network failures
    const role = currentUser?.role || 'Staff';
    const features = currentUser?.features || [];

    if (colName === 'users' || colName === 'system_state' || colName === 'audits') {
      if (role !== 'Super Admin' && role !== 'Ketua Yayasan') {
        setter([]);
        return [];
      }
    }

    if (
      colName === 'transactions' || 
      colName === 'kas' || 
      colName === 'salaries' || 
      colName === 'staff' || 
      colName === 'partners' || 
      colName === 'categories' || 
      colName === 'donations' || 
      colName === 'incomes' || 
      colName === 'expenses' || 
      colName === 'detail_pengeluaran' || 
      colName === 'detail_expenses' || 
      colName === 'fundraising' || 
      colName === 'payroll_payments'
    ) {
      const hasReportsAccess = Array.isArray(features) && features.includes('reports');
      if (!(role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Bendahara' || hasReportsAccess)) {
        setter([]);
        return [];
      }
    }

    try {
      const rawData = await safeFetchJson(`/api/data/${colName}?includeDeleted=true&t=${Date.now()}`);
      const activeData = Array.isArray(rawData) ? rawData.filter((x: any) => !x.deleted) : [];
      setter(activeData);
      return activeData as T[];
    } catch (err) {
      console.warn(`[loadCollection] Bypassed or restricted collection ${colName}:`, err);
      return [];
    }
  };

  const recalculateBalances = async (targetTransactions?: Transaction[]) => {
    // Authority alignment check to prevent unauthorized 403 update attempts
    const role = currentUser?.role || 'Staff';
    if (role !== 'Super Admin' && role !== 'Ketua Yayasan' && role !== 'Bendahara') {
      return { totalIncome: 0, totalExpense: 0, correctBalance: 0 };
    }

    const txsToUse = targetTransactions || transactions;
    const approvedTx = txsToUse.filter(t => t.status === undefined || t.status === 'Approved');
    
    const totalIncome = approvedTx
      .filter(t => t.type?.toLowerCase() === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = approvedTx
      .filter(t => t.type?.toLowerCase() === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const correctBalance = totalIncome - totalExpense;

    console.log(`[recalculateBalances] Recalculating: Income=Rp ${totalIncome.toLocaleString('id-ID')}, Expense=Rp ${totalExpense.toLocaleString('id-ID')}, Balance=Rp ${correctBalance.toLocaleString('id-ID')}`);

    try {
      await fetch('/api/data/kas/main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'main',
          balance: correctBalance,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'System Validator (recalculateBalances)'
        })
      });
    } catch (err) {
      console.error('Failed to sync kas main snapshot:', err);
    }

    return { totalIncome, totalExpense, correctBalance };
  };

  const loadProfile = async () => {
    try {
      const data = await safeFetchJson('/api/data/profiles');
      const mainProfile = Array.isArray(data) ? data.find((p: any) => p.id === 'PROF-01') : null;
      if (!mainProfile) {
        console.log('Seeding profiles via API...');
        await fetch('/api/data/profiles/PROF-01', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...INITIAL_PROFILE,
            deleted: false,
            createdAt: new Date().toISOString(),
            createdBy: 'System Seed API'
          })
        });
        setProfile(INITIAL_PROFILE);
      } else {
        setProfile(mainProfile);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const loadStructures = async () => {
    try {
      const data = await safeFetchJson('/api/data/structures');
      if (Array.isArray(data)) {
        const sanitized = data.map(item => ({
          ...item,
          name: item.name || ''
        }));
        setStructures(sanitized);
      }
    } catch (e) {
      console.error('Failed to load structures:', e);
    }
  };

  const loadAllData = async () => {
    if (isVerifyingSession) return;
    try {
      let seededVal = isSystemSeeded;
      if (seededVal === null) {
        try {
          const stateData = await safeFetchJson('/api/data/system_state?t=' + Date.now());
          const statusObj = Array.isArray(stateData) ? stateData.find((x: any) => x.id === 'seed_status') : null;
          if (statusObj && statusObj.seeded) {
            seededVal = true;
            setIsSystemSeeded(true);
          } else {
            seededVal = false;
            setIsSystemSeeded(false);
          }
        } catch (stateErr: any) {
          console.warn('Proteksi Sesi Sistem: Gagal melakukan pembacaan status seed (Akses Terbatas). Mengasumsikan database telah terisi...', stateErr);
          // Set to true by default to bypass initial seed requirements for limited roles
          seededVal = true;
          setIsSystemSeeded(true);
        }
      }

      const [
        _p,
        _s,
        _m,
        _n,
        _pr,
        _f,
        _sg,
        _mtg,
        _mat,
        loadedTransactions,
      ] = await Promise.all([
        loadProfile(),
        loadStructures(),
        loadCollection('members', INITIAL_MEMBERS, setMembers),
        loadCollection('member_notes', INITIAL_MEMBER_NOTES, setNotes),
        loadCollection('prayer_requests', INITIAL_PRAYER_REQUESTS, setPrayerRequests),
        loadCollection('follow_ups', INITIAL_FOLLOW_UPS, setFollowUps),
        loadCollection('small_groups', INITIAL_SMALL_GROUPS, setSmallGroups),
        loadCollection('meeting_logs', INITIAL_MEETING_LOGS, setMeetings),
        loadCollection('materials', INITIAL_MATERIALS, setMaterials),
        loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions) as Promise<Transaction[]>,
        loadCollection('categories', INITIAL_CATEGORIES, setCategories),
        loadCollection('partners', INITIAL_PARTNERS, setPartners),
        loadCollection('staff', INITIAL_STAFF, setStaffs),
        loadCollection('salaries', INITIAL_SALARIES, setSalaries),
        loadCollection('inward_letters', INITIAL_INWARD_LETTERS, setInwardLetters),
        loadCollection('outward_letters', INITIAL_OUTWARD_LETTERS, setOutwardLetters),
        loadCollection('documents', INITIAL_DOCUMENTS, setDocuments),
        loadCollection('approvals', INITIAL_APPROVALS, setApprovals),
        loadCollection('audits', INITIAL_AUDITS, setAuditLogs),
        loadCollection('donations', INITIAL_DONATIONS, setDonations),
      ]);

      if (loadedTransactions && Array.isArray(loadedTransactions)) {
        await recalculateBalances(loadedTransactions);
      }

      if (seededVal === false) {
        console.log('Successfully completed initial data import. Saving seed_status to database...');
        await fetch('/api/data/system_state/seed_status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'seed_status',
            seeded: true,
            createdAt: new Date().toISOString()
          })
        });
        setIsSystemSeeded(true);
      }
    } catch (err) {
      console.error('Failed to load all database collections:', err);
    }
  };

  // Sync effect periodically polling
  useEffect(() => {
    if (currentUser && !isVerifyingSession) {
      loadAllData();
      const interval = setInterval(() => {
        loadAllData();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser, isVerifyingSession]);

  // Core Audit Logging API Utility
  const logAudit = async (actionDescription: string, moduleName: string, before?: string, after?: string) => {
    const id = `AUD-${Date.now()}`;
    const freshLog: AuditLog = {
      id,
      userName: `${currentRole} Operator`,
      userRole: currentRole,
      action: actionDescription,
      module: moduleName,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      beforeValue: before || '',
      afterValue: after || '',
      createdBy: `${currentRole} Operator`,
      createdAt: new Date().toISOString(),
      deleted: false
    };
    try {
      await fetch(`/api/data/audits/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freshLog)
      });
      loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e) {
      console.error('Failed to write audit log via API:', e);
    }
  };

  // 1. Members Handlers
  const handleAddMember = async (m: Member) => {
    try {
      const payload = {
        ...m,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/members/${m.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Menambahkan Anggota Baru ID: ${m.id}`, 'Anggota', undefined, `Nama: ${m.fullName}`);
      loadCollection('members', INITIAL_MEMBERS, setMembers);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateMember = async (m: Member) => {
    try {
      const payload = {
        ...m,
        updatedAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/members/${m.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Memperbarui profil anggota ID: ${m.id}`, 'Anggota');
      loadCollection('members', INITIAL_MEMBERS, setMembers);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      const res = await fetch(`/api/data/members/${id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        alert(`Gagal menghapus Anggota: ${errText}`);
        return;
      }
      await logAudit(`Menghapus anggota ID: ${id} (Soft-Delete)`, 'Anggota');
      loadCollection('members', INITIAL_MEMBERS, setMembers);
    } catch (e: any) {
      console.error(e);
      alert(`Terjadi kesalahan saat menghapus anggota: ${e.message}`);
    }
  };

  const handleImportMembers = async (newMembers: Member[]) => {
    try {
      for (const m of newMembers) {
        const payload = {
          ...m,
          createdBy: `${currentRole} Operator`,
          createdAt: new Date().toISOString(),
          deleted: false
        };
        await fetch(`/api/data/members/${m.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      await logAudit(`Mengimpor Massal ${newMembers.length} Anggota Baru dari Excel Simulator`, 'Anggota');
      loadCollection('members', INITIAL_MEMBERS, setMembers);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAddMemberNote = async (note: MemberNote) => {
    try {
      const payload = {
        ...note,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/member_notes/${note.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Menambahkan Catatan Konseling Anggota ID: ${note.memberId}`, 'Anggota');
      loadCollection('member_notes', INITIAL_MEMBER_NOTES, setNotes);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAddPrayerRequest = async (prayer: PrayerRequest) => {
    try {
      const payload = {
        ...prayer,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/prayer_requests/${prayer.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Membukukan Pokok Doa Baru Anggota ID: ${prayer.memberId}`, 'Anggota');
      loadCollection('prayer_requests', INITIAL_PRAYER_REQUESTS, setPrayerRequests);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdatePrayerStatus = async (id: string, status: 'Pending' | 'Didoakan' | 'Terjawab') => {
    try {
      const payload = {
        status,
        updatedAt: new Date().toISOString()
      };
      await fetch(`/api/data/prayer_requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Mengubah status doa ID: ${id} menjadi ${status}`, 'Anggota');
      loadCollection('prayer_requests', INITIAL_PRAYER_REQUESTS, setPrayerRequests);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAddFollowUp = async (logVal: FollowUpLog) => {
    try {
      const payload = {
        ...logVal,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/follow_ups/${logVal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Mencatat Riwayat Kunjungan/Keluarga (Follow-Up) Anggota ID: ${logVal.memberId}`, 'Anggota');
      loadCollection('follow_ups', INITIAL_FOLLOW_UPS, setFollowUps);
    } catch (e: any) {
      console.error(e);
    }
  };

  // 2. Small Group Handlers
  const handleAddSmallGroup = async (sg: SmallGroup) => {
    try {
      const payload = {
        ...sg,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/small_groups/${sg.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Merintis Kelompok Kecil Baru ID: ${sg.id}`, 'Kelompok Kecil');
      loadCollection('small_groups', INITIAL_SMALL_GROUPS, setSmallGroups);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteSmallGroup = async (id: string) => {
    try {
      const res = await fetch(`/api/data/small_groups/${id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        alert(`Gagal membubarkan Kelompok Kecil: ${errText}`);
        return;
      }
      await logAudit(`Membubarkan Kelompok Kecil ID: ${id} (Soft-Delete)`, 'Kelompok Kecil');
      loadCollection('small_groups', INITIAL_SMALL_GROUPS, setSmallGroups);
    } catch (e: any) {
      console.error(e);
      alert(`Terjadi kesalahan saat membubarkan kelompok kecil: ${e.message}`);
    }
  };

  const handleAddGroupMeeting = async (meeting: MeetingLog) => {
    try {
      const payload = {
        ...meeting,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/meeting_logs/${meeting.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Melaporkan Pertemuan Kelompok Kecil KTB ID: ${meeting.groupId}`, 'Kelompok Kecil');
      loadCollection('meeting_logs', INITIAL_MEETING_LOGS, setMeetings);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateGroupMeeting = async (meeting: MeetingLog) => {
    try {
      const payload = {
        ...meeting,
        updatedBy: `${currentRole} Operator`,
        updatedAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/meeting_logs/${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Memperbarui Laporan Pertemuan Kelompok Kecil KTB ID: ${meeting.groupId}`, 'Kelompok Kecil');
      loadCollection('meeting_logs', INITIAL_MEETING_LOGS, setMeetings);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteGroupMeeting = async (id: string) => {
    try {
      await fetch(`/api/data/meeting_logs/${id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole
        }
      });
      await logAudit(`Menghapus Laporan Pertemuan Kelompok Kecil ID: ${id} (Soft-Delete)`, 'Kelompok Kecil');
      loadCollection('meeting_logs', INITIAL_MEETING_LOGS, setMeetings);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAddMaterial = async (mat: MaterialInfo) => {
    try {
      const payload = {
        ...mat,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/materials/${mat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Mengunggah Kurikulum/Materi Baru ID: ${mat.id}`, 'Kurikulum');
      loadCollection('materials', INITIAL_MATERIALS, setMaterials);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      const res = await fetch(`/api/data/materials/${id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        alert(`Gagal menghapus Kurikulum/Materi: ${errText}`);
        return;
      }
      await logAudit(`Menghapus Kurikulum/Materi ID: ${id} (Soft-Delete)`, 'Kurikulum');
      loadCollection('materials', INITIAL_MATERIALS, setMaterials);
    } catch (e: any) {
      console.error(e);
      alert(`Terjadi kesalahan saat menghapus kurikulum/materi: ${e.message}`);
    }
  };

  // 3. Finance Handlers
  const handleAddTransaction = async (tx: Transaction) => {
    try {
      const currentKasBalance = transactions
        .filter(t => t.status === undefined || t.status === 'Approved')
        .reduce((sum, t) => sum + (t.type?.toLowerCase() === 'income' ? t.amount : -t.amount), 0);

      const syncRes = await fetch('/api/finance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx,
          operatorName: `${currentRole} Operator`,
          operatorRole: currentRole,
          currentBalanceBeforeTx: currentKasBalance
        })
      });
      if (!syncRes.ok) throw new Error('Finance sync failed');
      
      if (tx.status === 'Pending Approval') {
        const appReq: ApprovalRequest = {
          id: `APP-TX-${Date.now()}`,
          module: 'Keuangan',
          title: `Persetujuan Transaksi: ${tx.category}`,
          description: tx.description,
          amount: tx.amount,
          requestedBy: `${currentRole} Operator`,
          requestedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'Pending',
          referenceId: tx.id,
          createdBy: `${currentRole} Operator`,
          createdAt: new Date().toISOString(),
          deleted: false
        } as any;
        await fetch(`/api/data/approvals/${appReq.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appReq)
        });
      }

      const updatedTxs = await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
      await recalculateBalances(updatedTxs);
      await loadCollection('approvals', INITIAL_APPROVALS, setApprovals);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateTransaction = async (tx: Transaction) => {
    try {
      const oldTx = transactions.find(t => t.id === tx.id);
      const previousApprovedBalanceOfOthers = transactions
        .filter(t => t.id !== tx.id && (t.status === undefined || t.status === 'Approved'))
        .reduce((sum, t) => sum + (t.type?.toLowerCase() === 'income' ? t.amount : -t.amount), 0);

      const syncRes = await fetch('/api/finance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx,
          operatorName: `${currentRole} Operator`,
          operatorRole: currentRole,
          currentBalanceBeforeTx: previousApprovedBalanceOfOthers
        })
      });
      if (!syncRes.ok) throw new Error('Finance update sync failed');

      await logAudit(
        `Mengubah Transaksi Kas ID: ${tx.id} (${tx.description})`,
        'Keuangan',
        oldTx ? JSON.stringify(oldTx) : '',
        JSON.stringify(tx)
      );

      const updatedTxs = await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
      await recalculateBalances(updatedTxs);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const oldTx = transactions.find(t => t.id === id);
      const previousApprovedBalanceOfOthers = transactions
         .filter(t => t.id !== id && (t.status === undefined || t.status === 'Approved'))
         .reduce((sum, t) => sum + (t.type?.toLowerCase() === 'income' ? t.amount : -t.amount), 0);
 
       if (oldTx) {
         const softDeletedTx: Transaction = {
           ...oldTx,
           status: 'Rejected',
         };
         const syncRes = await fetch('/api/finance/sync', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             tx: softDeletedTx,
             operatorName: `${currentRole} Operator`,
             operatorRole: currentRole,
             currentBalanceBeforeTx: previousApprovedBalanceOfOthers
           })
         });
         if (!syncRes.ok) throw new Error('Finance atomic synchronization failed on transaction reject action');
       }
       
       const res = await fetch(`/api/data/transactions/${id}?role=${encodeURIComponent(currentRole)}`, {
         method: 'DELETE',
         headers: {
           'x-user-role': currentRole
         }
       });
       if (!res.ok) {
         const errText = await res.text();
         alert(`Gagal menghapus Transaksi Kas: ${errText}`);
         return;
       }
       await logAudit(
         `Menghapus Transaksi Kas ID: ${id} (Soft-Delete)`, 
         'Keuangan',
         oldTx ? JSON.stringify(oldTx) : '',
         ''
       );
       
       const updatedTxs = await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
       await recalculateBalances(updatedTxs);
       await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
     } catch (e: any) {
       console.error(e);
       alert(`Terjadi kesalahan saat menghapus transaksi: ${e.message}`);
     }
   };

  const handleAddCategory = async (cat: FinancialCategory) => {
    try {
      await fetch(`/api/data/categories/${cat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cat, deleted: false, createdAt: new Date().toISOString() })
      });
      await logAudit(`Menambah Kategori Kas Baru: ${cat.name}`, 'Keuangan');
      await loadCollection('categories', INITIAL_CATEGORIES, setCategories);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCategory = async (cat: FinancialCategory) => {
    try {
      await fetch(`/api/data/categories/${cat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
      });
      await logAudit(`Mengubah Batas Anggaran Kategori: ${cat.name}`, 'Keuangan');
      await loadCollection('categories', INITIAL_CATEGORIES, setCategories);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const match = categories.find(c => c.id === id);
      const res = await fetch(`/api/data/categories/${id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        alert(`Gagal menghapus Kategori Kas: ${errText}`);
        return;
      }
      if (match) {
        await logAudit(`Menghapus Kategori Kas: ${match.name}`, 'Keuangan');
      }
      await loadCollection('categories', INITIAL_CATEGORIES, setCategories);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
      alert(`Terjadi kesalahan saat menghapus kategori kas: ${e.message}`);
    }
  };

  // 4. Partners Handlers
  const handleAddDonation = async (d: CampaignDonation) => {
    try {
      const payload = {
        ...d,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/donations/${d.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const txId = `TX-DON-${Date.now()}`;
      const newTx: Transaction = {
        id: txId,
        date: d.date,
        category: 'Donasi Kemitraan',
        description: `[Autoposting Fundraising CRM] Donasi masuk dari Mitra: ${d.partnerName}. Channel: ${d.channel}. Notes: ${d.notes || 'Tanpa catatan tambahan'}`,
        amount: d.amount,
        type: 'Income',
        sourceOrRecipient: d.partnerName,
        status: 'Approved',
        approvedBy: `${currentRole} Operator`,
        reference_id: d.id,
        reference_type: 'donation',
        source: 'donation',
        category_id: 'Donasi Kemitraan',
        transaction_code: txId
      } as any;

      const currentKasBalance = transactions
        .filter(t => t.status === undefined || t.status === 'Approved')
        .reduce((sum, t) => sum + (t.type?.toLowerCase() === 'income' ? t.amount : -t.amount), 0);

      await fetch('/api/finance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx: newTx,
          operatorName: `${currentRole} Operator`,
          operatorRole: currentRole,
          currentBalanceBeforeTx: currentKasBalance
        })
      });

      await logAudit(
        `Registrasi & Verifikasi Donasi Baru ID: ${d.id} dari "${d.partnerName}" senilai Rp ${d.amount.toLocaleString('id-ID')}`, 
        'Mitra & Fundraising',
        '',
        JSON.stringify(d)
      );

      await loadCollection('donations', INITIAL_DONATIONS, setDonations);
      const updatedTxs = await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
      await recalculateBalances(updatedTxs);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateDonation = async (d: CampaignDonation) => {
    try {
      const oldDonation = donations.find(item => item.id === d.id);
      
      const payload = {
        ...d,
        updatedBy: `${currentRole} Operator`,
        updatedAt: new Date().toISOString()
      };
      await fetch(`/api/data/donations/${d.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const matchedTx = transactions.find(t => t.reference_id === d.id);
      if (matchedTx) {
        const previousApprovedBalanceOfOthers = transactions
          .filter(t => t.id !== matchedTx.id && (t.status === undefined || t.status === 'Approved'))
          .reduce((sum, t) => sum + (t.type?.toLowerCase() === 'income' ? t.amount : -t.amount), 0);

        const updatedTx: Transaction = {
          ...matchedTx,
          date: d.date,
          description: `[Autoposting Fundraising CRM - Updated] Donasi masuk dari Mitra: ${d.partnerName}. Channel: ${d.channel}. Notes: ${d.notes || 'Tanpa catatan tambahan'}`,
          amount: d.amount,
          sourceOrRecipient: d.partnerName
        };

        await fetch('/api/finance/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx: updatedTx,
            operatorName: `${currentRole} Operator`,
            operatorRole: currentRole,
            currentBalanceBeforeTx: previousApprovedBalanceOfOthers
          })
        });
      }

      await logAudit(
        `Mengubah Log Donasi ID: ${d.id} untuk Mitra "${d.partnerName}"`, 
        'Mitra & Fundraising',
        oldDonation ? JSON.stringify(oldDonation) : '',
        JSON.stringify(d)
      );

      await loadCollection('donations', INITIAL_DONATIONS, setDonations);
      const updatedTxs = await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
      await recalculateBalances(updatedTxs);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteDonation = async (id: string) => {
    try {
      const oldDonation = donations.find(item => item.id === id);
      if (!oldDonation) return;

      const res = await fetch(
  `/api/data/donations/${id}?role=${encodeURIComponent(currentRole)}`,
  {
    method: 'DELETE',
    headers: {
      'x-user-role': currentRole
    }
  }
);

if (!res.ok) {
  const errText = await res.text();
  alert(`Gagal menghapus log donasi: ${errText}`);
  return;
}

      const matchedTx = transactions.find(t => t.reference_id === id);
      if (matchedTx) {
        const previousApprovedBalanceOfOthers = transactions
          .filter(t => t.id !== matchedTx.id && (t.status === undefined || t.status === 'Approved'))
          .reduce((sum, t) => sum + (t.type?.toLowerCase() === 'income' ? t.amount : -t.amount), 0);

        const softDeletedTx: Transaction = {
          ...matchedTx,
          status: 'Rejected',
          deleted: true
        };

        await fetch('/api/finance/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx: softDeletedTx,
            operatorName: `${currentRole} Operator`,
            operatorRole: currentRole,
            currentBalanceBeforeTx: previousApprovedBalanceOfOthers
          })
        });

        await fetch(`/api/data/transactions/${matchedTx.id}?role=${encodeURIComponent(currentRole)}`, {
          method: 'DELETE',
          headers: {
            'x-user-role': currentRole
          }
        });
      }

      await logAudit(
        `Menghapus Log Donasi ID: ${id} (Mitra: ${oldDonation.partnerName}) (Soft-Delete & Jurnal Revert)`, 
        'Mitra & Fundraising',
        JSON.stringify(oldDonation),
        ''
      );

      await loadCollection('donations', INITIAL_DONATIONS, setDonations);
      const updatedTxs = await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
      await recalculateBalances(updatedTxs);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAddPartner = async (p: Partner) => {
    try {
      const payload = {
        ...p,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/partners/${p.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Menerima Komitmen Kemitraan Baru Sponsor ID: ${p.id}`, 'Mitra & Fundraising');
      loadCollection('partners', INITIAL_PARTNERS, setPartners);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdatePartner = async (p: Partner) => {
    try {
      const payload = {
        ...p,
        updatedAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/partners/${p.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Memperbarui Profil Sponsorship CRM Mitra ID: ${p.id}`, 'Mitra & Fundraising');
      loadCollection('partners', INITIAL_PARTNERS, setPartners);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      const res = await fetch(`/api/data/partners/${id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole
        }
      });
      if (!res.ok) {
        const errText = await res.text();
        alert(`Gagal mencabut komitmen kemitraan sponsor: ${errText}`);
        return;
      }
      await logAudit(`Mencabut Komitmen Kemitraan Sponsor ID: ${id} (Soft-Delete)`, 'Mitra & Fundraising');
      loadCollection('partners', INITIAL_PARTNERS, setPartners);
    } catch (e: any) {
      console.error(e);
      alert(`Terjadi kesalahan saat mencabut komitmen kemitraan sponsor: ${e.message}`);
    }
  };

  // 5. Staff Handlers
  const handleAddStaff = async (s: Staff) => {
    try {
      const payload = {
        ...s,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/staff/${s.nik}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Automatically register user/operator account
      const cleanEmail = s.email?.trim() || `${s.nik.toLowerCase().trim()}@esm.or.id`;
      const cleanPhone = s.phone?.trim() || '0812345678';
      const userPayload = {
        name: s.name,
        email: cleanEmail.toLowerCase(),
        phone: cleanPhone,
        password: 'staff123', // Default starter password
        role: 'Staff',
        approved: true, // Auto-approved because added by Super Admin/Operator directly
        features: ['dashboard', 'members', 'small_groups'],
        deleted: false,
        createdAt: new Date().toISOString(),
        createdBy: `${currentRole} Operator`
      };

      await fetch(`/api/data/users/${encodeURIComponent(cleanEmail.toLowerCase())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
      });

      await logAudit(`Menggunakan Penerimaan Karyawan Baru NIK: ${s.nik} & Auto-Registrasi Akun Operator Staff: ${cleanEmail}`, 'Staf & HR');
      loadCollection('staff', INITIAL_STAFF, setStaffs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateStaff = async (s: Staff) => {
    try {
      const payload = {
        ...s,
        updatedAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/staff/${s.nik}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Melakukan Perubahan Kontrak Kerja Kepegawaian NIK: ${s.nik}`, 'Staf & HR');
      loadCollection('staff', INITIAL_STAFF, setStaffs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateSalary = async (sal: StaffSalary) => {
    try {
      const oldSal = salaries.find(s => s.id === sal.id);
      const payload = {
        ...sal,
        updatedAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/salaries/${sal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(
        `Melakukan Perubahan Komponen Gaji Pegawai NIK: ${sal.id}`, 
        'Staf & HR',
        oldSal ? JSON.stringify(oldSal) : '',
        JSON.stringify(sal)
      );
      loadCollection('salaries', INITIAL_SALARIES, setSalaries);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteStaff = async (nik: string) => {
    // Check authorizations
    const canModifyHR = ['Super Admin', 'Ketua Yayasan', 'Sekretaris'].includes(currentRole);
    if (!canModifyHR) {
      alert('Akses Terbatas: Anda tidak memiliki hak akses untuk menghapus data kepegawaian.');
      return;
    }

    const staffToDelete = staffs.find(s => s.nik === nik);
    if (!staffToDelete) {
      alert('Kesalahan: Data staf tidak ditemukan.');
      return;
    }

    try {
      // Check for associated operator/user account
      let associatedUserDeletedText = '';
      const cleanEmail = staffToDelete.email?.toLowerCase().trim();
      
      if (cleanEmail) {
        // Fetch users to see if there is a matching operator account
        const usersRes = await fetch('/api/data/users');
        if (usersRes.ok) {
          const usersList = await usersRes.json();
          const matchedUser = usersList.find((u: any) => u.email?.toLowerCase().trim() === cleanEmail && !u.deleted);
          
          if (matchedUser) {
            // Found matched operator user, de-activate/delete it as well since Super Admin has full permission
            const userDelRes = await fetch(`/api/data/users/${encodeURIComponent(cleanEmail)}?role=${encodeURIComponent(currentRole)}`, {
              method: 'DELETE',
              headers: {
                'x-user-role': currentRole
              }
            });

            if (userDelRes.ok) {
              // Log audit for operator deletion
              await logAudit(
                `[Database Staf] Menonaktifkan otomatis akun operator terkait: "${matchedUser.name}" (${cleanEmail}) karena data kepegawaiannya (NIK ${nik}) dinonaktifkan oleh ${currentRole}.`,
                'Sistem / Pelayanan'
              );
              associatedUserDeletedText = ` Serta akun operator terkait (${matchedUser.name}) berhasil dinonaktifkan secara otomatis.`;
            }
          }
        }
      }

      // Call delete route on server
      const res = await fetch(`/api/data/staff/${nik}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole
        }
      });

      if (res.ok) {
        await logAudit(`[Database Staf] Pemutusan Kontrak Kerja, Pegawai NIK: ${nik} - "${staffToDelete.name}" dinonaktifkan oleh ${currentRole}.`, 'Staf & HR');
        
        // Refresh staffs list
        await loadCollection('staff', INITIAL_STAFF, setStaffs);
        alert(`Sukses: Data kepegawaian staf ${staffToDelete.name} berhasil dinonaktifkan.${associatedUserDeletedText}`);
      } else {
        const errorText = await res.text();
        alert(`Gagal menonaktifkan data staf: ${errorText}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Terjadi kesalahan: ${e.message}`);
    }
  };

  // 6. Letters Handlers
  const handleAddInwardLetter = async (l: LetterInward) => {
    try {
      const payload = {
        ...l,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/inward_letters/${l.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Menerima & Mendisporisikan Surat Masuk Baru Ref: ${l.letterNumber}`, 'Surat-Arsip');
      loadCollection('inward_letters', INITIAL_INWARD_LETTERS, setInwardLetters);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAddOutwardLetter = async (l: LetterOutward) => {
    try {
      const payload = {
        ...l,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/outward_letters/${l.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (l.status === 'Pending Approval') {
        const appReq: ApprovalRequest = {
          id: `APP-LET-${Date.now()}`,
          module: 'Surat',
          title: `Penerbitan Surat Keluar: ${l.templateType}`,
          description: l.subject,
          requestedBy: `${currentRole} Operator`,
          requestedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'Pending',
          referenceId: l.id,
          createdBy: `${currentRole} Operator`,
          createdAt: new Date().toISOString(),
          deleted: false
        } as any;
        await fetch(`/api/data/approvals/${appReq.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appReq)
        });
      }

      await logAudit(`Pengajuan/Penerbitan Draft Agenda Surat Keluar Ref: ${l.letterNumber}`, 'Surat-Arsip');
      loadCollection('outward_letters', INITIAL_OUTWARD_LETTERS, setOutwardLetters);
      loadCollection('approvals', INITIAL_APPROVALS, setApprovals);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateOutwardLetter = async (l: LetterOutward) => {
    try {
      const payload = {
        ...l,
        updatedBy: `${currentRole} Operator`,
        updatedAt: new Date().toISOString()
      };
      await fetch(`/api/data/outward_letters/${l.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Mengubah detail Surat Keluar Ref: ${l.letterNumber}`, 'Surat-Arsip');
      loadCollection('outward_letters', INITIAL_OUTWARD_LETTERS, setOutwardLetters);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateOutwardStatus = async (id: string, status: any) => {
    try {
      const payload = {
        status,
        updatedAt: new Date().toISOString()
      };
      await fetch(`/api/data/outward_letters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Mengubah Status Agenda Surat Keluar ID: ${id} menjadi ${status}`, 'Surat-ArsipText');
      loadCollection('outward_letters', INITIAL_OUTWARD_LETTERS, setOutwardLetters);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleAddDocument = async (docObj: { id: string; name: string; category: string; fileData: string; fileSize: string }) => {
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docObj)
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal mengunggah dokumen');
      }
      await logAudit(`Mengunggah Dokumen Resmi Baru: ${docObj.name}`, 'Arsip-Konstitusi');
      await loadCollection('documents', INITIAL_DOCUMENTS, setDocuments);
    } catch (e: any) {
      console.error(e);
      alert(`Gagal mengunggah dokumen: ${e.message}`);
    }
  };

  const handleDeleteDocument = async (id: string, name: string) => {
    try {
      // Optimistic visual update
      setDocuments(prev => prev.filter(doc => doc.id !== id));

      const res = await fetch(`/api/data/documents/${id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Gagal menghapus dokumen dari server');
      }
      await logAudit(`Menghapus Dokumen Resmi: ${name}`, 'Arsip-Konstitusi');
      await loadCollection('documents', INITIAL_DOCUMENTS, setDocuments);
    } catch (e: any) {
      console.error(e);
      alert(`Gagal menghapus dokumen: ${e.message}`);
      // Revert/Re-sync back from database if failed
      await loadCollection('documents', INITIAL_DOCUMENTS, setDocuments);
    }
  };

  const handleUpdateInwardLetter = async (l: LetterInward) => {
    // Optimistic UI state update
    setInwardLetters(prev => prev.map(x => x.id === l.id ? l : x));
    try {
      const payload = {
        ...l,
        updatedBy: `${currentRole} Operator`,
        updatedAt: new Date().toISOString()
      };
      const res = await fetch(`/api/data/inward_letters/${l.id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Gagal menyimpan perubahan surat masuk di server');
      }
      await logAudit(`Mengubah detail Surat Masuk Ref: ${l.letterNumber}`, 'Surat-Arsip');
      await loadCollection('inward_letters', INITIAL_INWARD_LETTERS, setInwardLetters);
    } catch (e: any) {
      console.error(e);
      alert(`Gagal mengubah surat masuk: ${e.message}`);
      // Revert if error
      await loadCollection('inward_letters', INITIAL_INWARD_LETTERS, setInwardLetters);
    }
  };

  const handleDeleteInwardLetter = async (id: string, refNum: string) => {
    try {
      // Optimistic visual update
      setInwardLetters(prev => prev.filter(x => x.id !== id));

      const res = await fetch(`/api/data/inward_letters/${id}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Gagal menghapus surat masuk dari server');
      }
      await logAudit(`Menghapus Surat Masuk Ref: ${refNum}`, 'Surat-Arsip');
      await loadCollection('inward_letters', INITIAL_INWARD_LETTERS, setInwardLetters);
    } catch (e: any) {
      console.error(e);
      alert(`Gagal menghapus surat masuk: ${e.message}`);
      // Revert/Re-sync back from database if failed
      await loadCollection('inward_letters', INITIAL_INWARD_LETTERS, setInwardLetters);
    }
  };

  // Post Approval handler to wire HR collective payrolls
  const handlePostApproval = async (app: ApprovalRequest) => {
    try {
      const payload = {
        ...app,
        createdBy: `${currentRole} Operator`,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      await fetch(`/api/data/approvals/${app.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await logAudit(`Mengirimkan Pengajuan Kolektif Otomatis Baru ke Approval Center ID: ${app.id}`, 'Approval');
      loadCollection('approvals', INITIAL_APPROVALS, setApprovals);
    } catch (e: any) {
      console.error(e);
    }
  };

  // 7. Approvals Solver
  const handleResolveApproval = async (id: string, decision: 'Approved' | 'Rejected', comment?: string) => {
    try {
      const payload = {
        status: decision,
        comment,
        updatedAt: new Date().toISOString()
      };
      await fetch(`/api/data/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resolvedReq = approvals.find(item => item.id === id);
      if (resolvedReq) {
        const refId = resolvedReq.referenceId;
        
        if (resolvedReq.module === 'Keuangan') {
          const txn = transactions.find(t => t.id === refId);
          if (txn) {
            const updatedTx = {
              ...txn,
              status: decision === 'Approved' ? ('Approved' as const) : ('Rejected' as const),
              updatedAt: new Date().toISOString()
            };
            await fetch('/api/finance/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tx: updatedTx,
                operatorName: `${currentRole} Operator`,
                operatorRole: currentRole,
                currentBalanceBeforeTx: transactions
                  .filter(t => t.id !== refId && (t.status === undefined || t.status === 'Approved'))
                  .reduce((sum, t) => sum + (t.type?.toLowerCase() === 'income' ? t.amount : -t.amount), 0)
              })
            });
          }
        }
        
        if (resolvedReq.module === 'Surat') {
          await fetch(`/api/data/outward_letters/${refId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: decision === 'Approved' ? 'Approved' : 'Draft',
              updatedAt: new Date().toISOString()
            })
          });
        }
        
        if (resolvedReq.module === 'Payroll' && refId === 'PAYROLL-COLLECTIVE' && decision === 'Approved') {
          await logAudit(`Dana Gaji Kolektif Berhasil Disetujui Ketua Yayasan, Gaji Siap Ditransfer!`, 'Payroll');
        }
      }

      await logAudit(`Resolusi Persetujuan Agenda ID: ${id} menjadi ${decision}`, 'Approval');
      await loadAllData();
    } catch (e: any) {
      console.error(e);
    }
  };

  // 8. Institutional Settings
  const handleUpdateProfile = async (p: InstitutionalProfile) => {
    try {
      await fetch(`/api/data/profiles/${p.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...p,
          updatedAt: new Date().toISOString()
        })
      });
      await logAudit('Merubah Parameter Konstitusi Hukum Lembaga MMB draf Akta Yayasan', 'Sistem');
      loadProfile();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Pending counts for notifications
  const pendingApprovalsCount = approvals.filter(item => item.status === 'Pending').length;

  if (isVerifyingSession) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8FAFC] font-sans">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm p-8 bg-white rounded-2xl border border-slate-200/80 shadow-lg animate-pulse">
          <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight mb-1">Verifikasi Kunci Keamanan</h3>
            <p className="text-[11px] text-slate-500 leading-normal">Menghubungkan sesi Anda dengan database otentikasi pusat melalui jalur kriptografi terenkripsi...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white overflow-hidden">
      
      {/* Upper Navigation Control header bar (Global) - Geometric Balance Theme Accent */}
      <header className="sticky top-0 z-40 bg-white text-slate-800 px-6 py-3 border-b border-slate-200 shadow-sm flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-0.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden bg-white w-9 h-9 shrink-0">
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt="Logo Yayasan" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="p-0.5 w-full h-full flex items-center justify-center">
                <MMBLogo size="100%" />
              </div>
            )}
          </div>
          <div>
            <h1 id="header-system-title" className="font-extrabold text-sm tracking-tight text-slate-900 leading-none">{profile.systemTitle || 'MMB FMS'}</h1>
            <span id="header-dashboard-title" className="text-[9px] text-[#64748B] font-bold uppercase tracking-widest block font-mono mt-1">{profile.dashboardTitle || 'Institutional Executive ERP'}</span>
          </div>
        </div>

        {/* Authenticated Session Dashboard Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <div className="text-right mr-2">
              <div className="font-semibold text-xs text-slate-800">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400">Operator: {currentUser.email}</div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[#2563EB] font-bold font-mono text-[9px] uppercase tracking-wider">{currentUser.role}</span>
            </div>

            <button 
              onClick={() => {
                localStorage.removeItem('esm_session_user');
                setCurrentUser(null);
              }}
              className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-[11px] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
            >
              Keluar Sesi
            </button>
            
            {pendingApprovalsCount > 0 && (
              <div 
                onClick={() => setActiveTab('approvals')}
                className="bg-orange-50 text-orange-700 font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse cursor-pointer border border-orange-200 text-[11px]"
              >
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                <span>{pendingApprovalsCount} Pending Persetujuan</span>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2 text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors border border-slate-200"
          >
            {isMobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
          </button>
        </div>
      </header>

      {/* Main Grid: Left Navigation Rail & Right Center Layout panel content */}
      <div className="flex-1 flex flex-col sm:flex-row relative h-[calc(100vh-61px)] overflow-hidden">
        
        {/* SIDE BAR NAVIGATION RAIL (Left column - Cozy, Elegant, Bright Light Theme) */}
        <nav className={`sm:w-60 bg-white border-r border-slate-200 p-4 shrink-0 flex flex-col justify-between absolute sm:relative inset-y-0 left-0 z-30 transition-all duration-300 transform sm:translate-x-0 overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0 w-60 shadow-2xl' : '-translate-x-full sm:translate-x-0'
        }`}>
          
          <div className="space-y-5">
            
            {/* Operator Active Badge Grid */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-2 shadow-xs/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-extrabold rounded-lg text-xs flex items-center justify-center font-mono shadow-sm shrink-0">
                  {currentRole.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-xs truncate">
                  <span className="text-slate-400 block font-bold text-[8px] uppercase tracking-widest font-mono">KONSEL OPERATOR</span>
                  <strong className="text-slate-700 text-xs block truncate font-sans">{currentUser.name}</strong>
                </div>
              </div>
              <div className="border-t border-slate-200/50 pt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono font-semibold">{currentUser.role}</span>
              </div>
            </div>

            {/* Micro Mobile Auth Logout */}
            <div className="block sm:hidden text-xs space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium">Sesi Aktif: {currentUser.role}</span>
              <button 
                onClick={() => {
                  localStorage.removeItem('esm_session_user');
                  setCurrentUser(null);
                }}
                className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100/50 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
              >
                Keluar Sesi
              </button>
            </div>

            {/* Menu Sections layout List */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-2 px-3">Menu Utama</span>
              
              {hasFeatureAccess('dashboard') && (
                <button 
                  onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'dashboard' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" /> Dashboard
                </button>
              )}

              {hasFeatureAccess('members') && (
                <button 
                  onClick={() => { setActiveTab('members'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'members' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" /> Anggota Pelayanan
                </button>
              )}

              {hasFeatureAccess('small_groups') && (
                <button 
                  onClick={() => { setActiveTab('small_groups'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'small_groups' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" /> Kelompok Kecil
                </button>
              )}

              {hasFeatureAccess('finance') && (
                <button 
                  onClick={() => { setActiveTab('finance'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'finance' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <Wallet className="w-4 h-4 shrink-0" /> Keuangan & Kas
                </button>
              )}

              {hasFeatureAccess('reports') && (
                <button 
                  onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'reports' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <FilePieChart className="w-4 h-4 shrink-0" /> Pusat Laporan
                </button>
              )}

              {(hasFeatureAccess('partners') || hasFeatureAccess('staff') || hasFeatureAccess('payroll') || hasFeatureAccess('letters') || hasFeatureAccess('approvals') || hasFeatureAccess('reports')) && (
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block pt-4 pb-2 px-3">Administrasi</span>
              )}

              {hasFeatureAccess('partners') && (
                <button 
                  onClick={() => { setActiveTab('partners'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'partners' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 shrink-0" /> Mitra & Fundraising
                </button>
              )}

              {hasFeatureAccess('staff') && (
                <button 
                  onClick={() => { setActiveTab('staff'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'staff' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <UserSquare2 className="w-4 h-4 shrink-0" /> Database Staf
                </button>
              )}

              {hasFeatureAccess('payroll') && (
                <button 
                  onClick={() => { setActiveTab('payroll'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'payroll' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <Coins className="w-4 h-4 shrink-0 text-amber-500" /> Payroll & Slip Gaji
                </button>
              )}

              {hasFeatureAccess('letters') && (
                <button 
                  onClick={() => { setActiveTab('letters'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                    activeTab === 'letters' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" /> Surat & Dokumen
                </button>
              )}

              {hasFeatureAccess('approvals') && (
                <button 
                  onClick={() => { setActiveTab('approvals'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left ${
                    activeTab === 'approvals' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ClipboardCheck className="w-4 h-4 shrink-0" /> Approval Center
                  </span>
                  
                  {pendingApprovalsCount > 0 && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      activeTab === 'approvals' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700 font-mono font-bold'
                    }`}>
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>
              )}

              {currentUser?.role !== 'Super Admin' && hasFeatureAccess('staff_profile') && (
                <button 
                  onClick={() => { setActiveTab('staff_profile'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left ${
                    activeTab === 'staff_profile' ? 'bg-[#2563EB] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <User className="w-4 h-4 shrink-0 text-emerald-600" /> Profil & Gaji Saya
                  </span>
                  <span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">Staf</span>
                </button>
              )}

              {hasFeatureAccess('system') && (
                <>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block pt-4 pb-2 px-3">Organisasi</span>

                  <button 
                    onClick={() => { setActiveTab('system'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-[13px] font-semibold px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
                      activeTab === 'system' ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/15' : 'text-slate-600 hover:bg-slate-100/70 hover:text-[#2563EB]'
                    }`}
                  >
                    <Server className="w-4 h-4 shrink-0" /> Profil & Audit Log
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Footer of Sidebar */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed font-sans shrink-0">
            <span className="font-bold text-slate-600">{profile.name || 'Yayasan Murid Muda Bermisi (MMB)'}</span>
            <p className="mt-1">Tata Kerja Terpadu &bull; v1.3</p>
          </div>

        </nav>

        {/* WORKSPACE CENTRAL AREA PANEL (Right side view container) */}
        <main className="flex-1 p-6 sm:p-8 max-w-full h-full overflow-y-auto block">
          
          {/* Main conditional module tabs switching renderer */}
          <div className="max-w-7xl mx-auto space-y-6">
            
            {activeTab === 'dashboard' && (
              <DashboardTab 
                members={members}
                transactions={transactions}
                partners={partners}
                smallGroups={smallGroups}
                approvals={approvals}
                audits={auditLogs}
                setTab={setActiveTab}
                onOpenQuickTx={() => { setActiveTab('finance'); setTimeout(() => alert('Silakan klik tombol "Entri Kas" di kanan atas untuk memproses pencatatan jurnal keuangan.'), 400); }}
                onOpenQuickMember={() => { setActiveTab('members'); setTimeout(() => alert('Silakan klik tombol "Registrasi Anggota" di kanan atas.'), 400); }}
                profile={profile}
                staffs={staffs}
                hasFeatureAccess={hasFeatureAccess}
              />
            )}

            {activeTab === 'members' && (
              <MembersTab 
                members={members}
                onAddMember={handleAddMember}
                onUpdateMember={handleUpdateMember}
                onDeleteMember={handleDeleteMember}
                smallGroups={smallGroups}
                notes={notes}
                onAddNote={handleAddMemberNote}
                prayerRequests={prayerRequests}
                onAddPrayerRequest={handleAddPrayerRequest}
                onUpdatePrayerStatus={handleUpdatePrayerStatus}
                followUps={followUps}
                onAddFollowUp={handleAddFollowUp}
                currentRole={currentRole}
                profile={profile}
              />
            )}

            {activeTab === 'small_groups' && (
              <SmallGroupsTab 
                groups={smallGroups}
                meetings={meetings}
                materials={materials}
                members={members}
                onAddGroup={handleAddSmallGroup}
                onDeleteGroup={handleDeleteSmallGroup}
                onAddMeeting={handleAddGroupMeeting}
                onAddMaterial={handleAddMaterial}
                onDeleteMaterial={handleDeleteMaterial}
                onUpdateMeeting={handleUpdateGroupMeeting}
                onDeleteMeeting={handleDeleteGroupMeeting}
                profile={profile}
                currentRole={currentRole}
              />
            )}

            {activeTab === 'finance' && (
              <FinanceTab 
                transactions={transactions}
                categories={categories}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                currentRole={currentRole}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                profile={profile}
              />
            )}

            {activeTab === 'partners' && (
              <PartnersTab 
                partners={partners}
                onAddPartner={handleAddPartner}
                onUpdatePartner={handleUpdatePartner}
                onDeletePartner={handleDeletePartner}
                currentRole={currentRole}
                donations={donations}
                onAddDonation={handleAddDonation}
                onUpdateDonation={handleUpdateDonation}
                onDeleteDonation={handleDeleteDonation}
                profile={profile}
              />
            )}

            {activeTab === 'staff' && (
              <StaffTab 
                staffs={staffs}
                onAddStaff={handleAddStaff}
                onUpdateStaff={handleUpdateStaff}
                onDeleteStaff={handleDeleteStaff}
                currentRole={currentRole}
              />
            )}

            {activeTab === 'payroll' && (
              <PayrollTab 
                staffs={staffs}
                onUpdateStaff={handleUpdateStaff}
                currentRole={currentRole}
                onPostApproval={handlePostApproval}
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                salaries={salaries}
                onUpdateSalary={handleUpdateSalary}
                profile={profile}
                structures={structures}
                onLogAudit={logAudit}
              />
            )}

            {activeTab === 'letters' && (
              <LettersTab 
                inwardLetters={inwardLetters}
                outwardLetters={outwardLetters}
                documents={documents}
                onAddInwardLetter={handleAddInwardLetter}
                onUpdateInwardLetter={handleUpdateInwardLetter}
                onDeleteInwardLetter={handleDeleteInwardLetter}
                onAddOutwardLetter={handleAddOutwardLetter}
                onUpdateOutwardLetter={handleUpdateOutwardLetter}
                onUpdateOutwardStatus={handleUpdateOutwardStatus}
                onAddDocument={handleAddDocument}
                onDeleteDocument={handleDeleteDocument}
                currentRole={currentRole}
                profile={profile}
                structures={structures}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsTab 
                members={members}
                transactions={transactions}
                partners={partners}
                smallGroups={smallGroups}
                meetings={meetings}
                staffs={staffs}
                salaries={salaries}
                donations={donations}
                profile={profile}
                structures={structures}
              />
            )}

            {activeTab === 'approvals' && (
              <ApprovalsTab 
                approvals={approvals}
                onResolveApproval={handleResolveApproval}
                currentRole={currentRole}
              />
            )}

            {activeTab === 'system' && (
              <SystemTab 
                profile={profile}
                auditLogs={auditLogs}
                onUpdateProfile={handleUpdateProfile}
                currentRole={currentRole}
              />
            )}

            {activeTab === 'staff_profile' && (
              <StaffMeTab 
                currentUser={currentUser}
                staffs={staffs}
                salaries={salaries}
                profile={profile}
                structures={structures}
              />
            )}

          </div>

        </main>

      </div>
    </div>
  );
}
