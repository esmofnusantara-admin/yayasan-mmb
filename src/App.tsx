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
  Menu,
  X,
  Coins
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
  INITIAL_AUDITS 
} from './data/initialData';

interface AuthUser {
  email: string;
  name: string;
  role: string;
  features?: string[];
}

export default function App() {
  // Active Authenticated Session
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('esm_session_user');
    return saved ? JSON.parse(saved) : null;
  });

  const currentRole = currentUser?.role || 'Staff';

  const hasFeatureAccess = (feature: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.features && currentUser.features.length > 0) {
      return currentUser.features.includes(feature);
    }
    const defaultFeaturesMap: Record<string, string[]> = {
      'Super Admin': ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system'],
      'Ketua Yayasan': ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system'],
      'Bendahara': ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals'],
      'Sekretaris': ['dashboard', 'members', 'small_groups', 'letters', 'system'],
      'Staff': ['dashboard', 'members', 'small_groups']
    };
    const roleFeatures = defaultFeaturesMap[currentUser.role] || ['dashboard'];
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

  // Restful Loader Helper with Auto-Seeding
  const loadCollection = async <T extends { id?: string; nik?: string; deleted?: boolean; createdAt?: string; createdBy?: string }>(
    colName: string,
    initialData: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    try {
      const res = await fetch(`/api/data/${colName}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || data.length === 0) {
        console.log(`Seeding ${colName} via restful API endpoints...`);
        for (const item of initialData) {
          const id = item.id || item.nik;
          if (id) {
            await fetch(`/api/data/${colName}/${id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...item,
                deleted: false,
                createdAt: item.createdAt || new Date().toISOString(),
                createdBy: item.createdBy || 'System Seed API'
              })
            });
          }
        }
        const freshRes = await fetch(`/api/data/${colName}`);
        const freshData = await freshRes.json();
        setter(freshData);
      } else {
        setter(data);
      }
    } catch (err) {
      console.error(`Failed to load/seed collection ${colName}:`, err);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/data/profiles');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mainProfile = data.find((p: any) => p.id === 'PROF-01');
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

  const loadAllData = async () => {
    await Promise.all([
      loadProfile(),
      loadCollection('members', INITIAL_MEMBERS, setMembers),
      loadCollection('member_notes', INITIAL_MEMBER_NOTES, setNotes),
      loadCollection('prayer_requests', INITIAL_PRAYER_REQUESTS, setPrayerRequests),
      loadCollection('follow_ups', INITIAL_FOLLOW_UPS, setFollowUps),
      loadCollection('small_groups', INITIAL_SMALL_GROUPS, setSmallGroups),
      loadCollection('meeting_logs', INITIAL_MEETING_LOGS, setMeetings),
      loadCollection('materials', INITIAL_MATERIALS, setMaterials),
      loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions),
      loadCollection('categories', INITIAL_CATEGORIES, setCategories),
      loadCollection('partners', INITIAL_PARTNERS, setPartners),
      loadCollection('staff', INITIAL_STAFF, setStaffs),
      loadCollection('salaries', INITIAL_SALARIES, setSalaries),
      loadCollection('inward_letters', INITIAL_INWARD_LETTERS, setInwardLetters),
      loadCollection('outward_letters', INITIAL_OUTWARD_LETTERS, setOutwardLetters),
      loadCollection('documents', INITIAL_DOCUMENTS, setDocuments),
      loadCollection('approvals', INITIAL_APPROVALS, setApprovals),
      loadCollection('audits', INITIAL_AUDITS, setAuditLogs),
      loadCollection('donations', [], setDonations),
    ]);
  };

  // Sync effect periodically polling
  useEffect(() => {
    if (currentUser) {
      loadAllData();
      const interval = setInterval(() => {
        loadAllData();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

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
      await fetch(`/api/data/members/${id}`, {
        method: 'DELETE'
      });
      await logAudit(`Menghapus anggota ID: ${id} (Soft-Delete)`, 'Anggota');
      loadCollection('members', INITIAL_MEMBERS, setMembers);
    } catch (e: any) {
      console.error(e);
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
      await fetch(`/api/data/small_groups/${id}`, {
        method: 'DELETE'
      });
      await logAudit(`Membubarkan Kelompok Kecil ID: ${id} (Soft-Delete)`, 'Kelompok Kecil');
      loadCollection('small_groups', INITIAL_SMALL_GROUPS, setSmallGroups);
    } catch (e: any) {
      console.error(e);
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

  // 3. Finance Handlers
  const handleAddTransaction = async (tx: Transaction) => {
    try {
      const currentKasBalance = transactions
        .filter(t => t.status === 'Approved')
        .reduce((sum, t) => sum + (t.type === 'Income' ? t.amount : -t.amount), 0);

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

      await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
      await loadCollection('approvals', INITIAL_APPROVALS, setApprovals);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateTransaction = async (tx: Transaction) => {
    try {
      const previousApprovedBalanceOfOthers = transactions
        .filter(t => t.id !== tx.id && t.status === 'Approved')
        .reduce((sum, t) => sum + (t.type === 'Income' ? t.amount : -t.amount), 0);

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

      await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const oldTx = transactions.find(t => t.id === id);
      const previousApprovedBalanceOfOthers = transactions
        .filter(t => t.id !== id && t.status === 'Approved')
        .reduce((sum, t) => sum + (t.type === 'Income' ? t.amount : -t.amount), 0);

      if (oldTx) {
        const softDeletedTx: Transaction = {
          ...oldTx,
          status: 'Rejected',
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
      }
      
      await fetch(`/api/data/transactions/${id}`, {
        method: 'DELETE'
      });
      await logAudit(`Menghapus Transaksi Ledger ID: ${id} (Soft-Delete)`, 'Keuangan');
      
      await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
      await loadCollection('audits', INITIAL_AUDITS, setAuditLogs);
    } catch (e: any) {
      console.error(e);
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
        approvedBy: `${currentRole} Operator`
      };

      const currentKasBalance = transactions
        .filter(t => t.status === 'Approved')
        .reduce((sum, t) => sum + (t.type === 'Income' ? t.amount : -t.amount), 0);

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

      await loadCollection('donations', [], setDonations);
      await loadCollection('transactions', INITIAL_TRANSACTIONS, setTransactions);
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
      await fetch(`/api/data/partners/${id}`, {
        method: 'DELETE'
      });
      await logAudit(`Mencabut Komitmen Kemitraan Sponsor ID: ${id} (Soft-Delete)`, 'Mitra & Fundraising');
      loadCollection('partners', INITIAL_PARTNERS, setPartners);
    } catch (e: any) {
      console.error(e);
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
      await logAudit(`Mengumumkan Penerimaan Karyawan Baru NIK: ${s.nik}`, 'Staf & HR');
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
      await logAudit(`Melakukan Perubahan Komponen Gaji Pegawai NIK: ${sal.id}`, 'Staf & HR');
      loadCollection('salaries', INITIAL_SALARIES, setSalaries);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteStaff = async (nik: string) => {
    try {
      await fetch(`/api/data/staff/${nik}`, {
        method: 'DELETE'
      });
      await logAudit(`Pemutusan Kontrak Kerja Pegawai NIK: ${nik} (Soft-Delete)`, 'Staf & HR');
      loadCollection('staff', INITIAL_STAFF, setStaffs);
    } catch (e: any) {
      console.error(e);
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
                  .filter(t => t.id !== refId && t.status === 'Approved')
                  .reduce((sum, t) => sum + (t.type === 'Income' ? t.amount : -t.amount), 0)
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
      await logAudit('Merubah Parameter Konstitusi Hukum Lembaga ESM draf Akta Yayasan', 'Sistem');
      loadProfile();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Pending counts for notifications
  const pendingApprovalsCount = approvals.filter(item => item.status === 'Pending').length;

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Upper Navigation Control header bar (Global) - Geometric Balance Theme Accent */}
      <header className="sticky top-0 z-40 bg-white text-slate-800 px-6 py-3 border-b border-slate-200 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#2563EB] p-2 rounded-xl text-white shadow-sm shadow-blue-500/20">
            <Building2 className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-900 leading-none">ESM FMS</h1>
            <span className="text-[9px] text-[#64748B] font-bold uppercase tracking-widest block font-mono mt-1">Institutional Executive ERP</span>
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
      <div className="flex-1 flex flex-col sm:flex-row relative">
        
        {/* SIDE BAR NAVIGATION RAIL (Left column - Geometric Slate-900 Dark Theme) */}
        <nav className={`sm:w-60 bg-[#0F172A] border-r border-[#1E293B] p-4 shrink-0 flex flex-col justify-between absolute sm:relative inset-y-0 left-0 z-30 transition-transform duration-300 transform sm:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 w-60 shadow-2xl' : '-translate-x-full sm:translate-x-0'
        }`}>
          
          <div className="space-y-5">
            
            {/* Operator Active Badge Grid */}
            <div className="p-3 bg-[#1E293B]/70 border border-[#334155]/65 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white font-extrabold rounded-lg text-xs flex items-center justify-center font-mono shadow-sm shrink-0">
                  {currentRole.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-xs truncate">
                  <span className="text-[#94A3B8] block font-semibold text-[8px] uppercase tracking-widest font-mono">KONSEL OPERATOR</span>
                  <strong className="text-slate-100 text-xs block truncate">{currentUser.name}</strong>
                </div>
              </div>
              <div className="border-t border-[#334155]/50 pt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-[#94A3B8] font-mono">{currentUser.role}</span>
              </div>
            </div>

            {/* Micro Mobile Auth Logout */}
            <div className="block sm:hidden text-xs space-y-2 bg-[#1E293B]/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Sesi Aktif: {currentUser.role}</span>
              <button 
                onClick={() => {
                  localStorage.removeItem('esm_session_user');
                  setCurrentUser(null);
                }}
                className="w-full py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/60 rounded text-[11px] font-bold"
              >
                Keluar Sesi
              </button>
            </div>

            {/* Menu Sections layout List */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-[#475569] block mb-2 px-3">Main Menu</span>
              
              {hasFeatureAccess('dashboard') && (
                <button 
                  onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                    activeTab === 'dashboard' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" /> Dashboard
                </button>
              )}

              {hasFeatureAccess('members') && (
                <button 
                  onClick={() => { setActiveTab('members'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                    activeTab === 'members' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" /> Anggota & KTB
                </button>
              )}

              {hasFeatureAccess('small_groups') && (
                <button 
                  onClick={() => { setActiveTab('small_groups'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                    activeTab === 'small_groups' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" /> Kelompok Kecil
                </button>
              )}

              {hasFeatureAccess('finance') && (
                <button 
                  onClick={() => { setActiveTab('finance'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                    activeTab === 'finance' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <Wallet className="w-4 h-4 shrink-0" /> Keuangan & Kas
                </button>
              )}

              {(hasFeatureAccess('partners') || hasFeatureAccess('staff') || hasFeatureAccess('payroll') || hasFeatureAccess('letters') || hasFeatureAccess('approvals')) && (
                <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-[#475569] block pt-3 pb-2 px-3">Administration</span>
              )}

              {hasFeatureAccess('partners') && (
                <button 
                  onClick={() => { setActiveTab('partners'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                    activeTab === 'partners' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 shrink-0" /> Mitra & Fundraising
                </button>
              )}

              {hasFeatureAccess('staff') && (
                <button 
                  onClick={() => { setActiveTab('staff'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                    activeTab === 'staff' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <UserSquare2 className="w-4 h-4 shrink-0" /> Database Staf
                </button>
              )}

              {hasFeatureAccess('payroll') && (
                <button 
                  onClick={() => { setActiveTab('payroll'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                    activeTab === 'payroll' ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-500/20' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <Coins className="w-4 h-4 shrink-0 text-amber-500" /> Payroll & Slip Gaji
                </button>
              )}

              {hasFeatureAccess('letters') && (
                <button 
                  onClick={() => { setActiveTab('letters'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                    activeTab === 'letters' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" /> Surat & Dokumen
                </button>
              )}

              {hasFeatureAccess('approvals') && (
                <button 
                  onClick={() => { setActiveTab('approvals'); setIsMobileMenuOpen(false); }}
                  className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-left ${
                    activeTab === 'approvals' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <ClipboardCheck className="w-4 h-4 shrink-0" /> Approval Center
                  </span>
                  
                  {pendingApprovalsCount > 0 && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      activeTab === 'approvals' ? 'bg-white text-blue-700' : 'bg-blue-600/30 text-blue-400 font-mono'
                    }`}>
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>
              )}

              {hasFeatureAccess('system') && (
                <>
                  <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-[#475569] block pt-3 pb-2 px-3">Organization</span>

                  <button 
                    onClick={() => { setActiveTab('system'); setIsMobileMenuOpen(false); }}
                    className={`w-full text-[13px] font-medium px-3.5 py-2 rounded-lg flex items-center gap-3 transition-colors cursor-pointer text-left ${
                      activeTab === 'system' ? 'bg-[#2563EB] text-white shadow-sm animate-pulse' : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Server className="w-4 h-4 shrink-0" /> Profil & Audit Log
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Footer of Sidebar */}
          <div className="pt-4 border-t border-[#1E293B] text-[10px] text-[#475569] leading-relaxed font-sans shrink-0">
            <span className="font-bold text-slate-400">Yayasan ESM Indonesia</span>
            <p className="mt-1">Geometric Balance &bull; v1.3</p>
          </div>

        </nav>

        {/* WORKSPACE CENTRAL AREA PANEL (Right side view container) */}
        <main className="flex-1 p-6 sm:p-8 max-w-full overflow-hidden block">
          
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
              />
            )}

            {activeTab === 'letters' && (
              <LettersTab 
                inwardLetters={inwardLetters}
                outwardLetters={outwardLetters}
                documents={documents}
                onAddInwardLetter={handleAddInwardLetter}
                onAddOutwardLetter={handleAddOutwardLetter}
                onUpdateOutwardStatus={handleUpdateOutwardStatus}
                currentRole={currentRole}
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

          </div>

        </main>

      </div>
    </div>
  );
}
