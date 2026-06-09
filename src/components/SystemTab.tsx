/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building, 
  MapPin, 
  FileCheck2, 
  ShieldCheck, 
  History, 
  Check, 
  X, 
  UserCheck, 
  Sliders, 
  User, 
  Terminal, 
  Activity, 
  ArrowRight,
  Database,
  PlusCircle,
  Lock,
  UserPlus2,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { InstitutionalProfile, AuditLog } from '../types';

interface SystemTabProps {
  profile: InstitutionalProfile;
  auditLogs: AuditLog[];
  onUpdateProfile: (p: InstitutionalProfile) => void;
  currentRole: string;
}

export default function SystemTab({
  profile,
  auditLogs,
  onUpdateProfile,
  currentRole,
}: SystemTabProps) {
  const [activeSubView, setActiveSubView] = useState<'profile' | 'structure' | 'operators' | 'audit'>('profile');
  const [activeNodeId, setActiveNodeId] = useState<string>('ketua');
  
  // Dynamic Organizational Structure State
  const [orgTree, setOrgTree] = useState<any[]>([
    { id: 'ketua', title: 'Ketua Dewan Pembina', name: 'Dr. (H.C.) Dr. Joseph Sinaga', sub: 'Pembuat Keputusan Tertinggi', order: 10, deleted: false },
    { id: 'sekretaris', title: 'Sekretaris Eksekutif', name: 'Pdt. Johannes Lie, M.Th.', sub: 'Administrasi & Legalitas Lembaga', order: 20, deleted: false },
    { id: 'bendahara', title: 'Bendahara Umum', name: 'Ibu Ruth Sitorus, S.E.', sub: 'Jurnal Kas, Ledger & Audit', order: 30, deleted: false },
    { id: 'korwil', title: 'Koordinator Wilayah DIY', name: 'Ahmad Faisal, S.Th.', sub: 'Lapangan & Persekutuan Cabang', order: 40, deleted: false },
    { id: 'staff', title: 'Staf Lapangan & Kelompok Kecil', name: 'Simpatisan Mitra Aliansi', sub: 'Pendamping Siswa & Pelayanan', order: 50, deleted: false },
  ]);
  const [isFetchingTree, setIsFetchingTree] = useState(false);
  const [isSavingTree, setIsSavingTree] = useState(false);

  // States for editing the active structural node:
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSub, setEditSub] = useState('');
  const [editOrder, setEditOrder] = useState<number>(100);

  // Add custom node states
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeSub, setNewNodeSub] = useState('');
  const [newNodeOrder, setNewNodeOrder] = useState<number>(100);

  const fetchOrgTree = async () => {
    setIsFetchingTree(true);
    try {
      const res = await fetch('/api/data/structures');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const activeDocs = data.filter(d => !d.deleted);
          
          const defaultNodes = [
            { id: 'ketua', title: 'Ketua Dewan Pembina', name: 'Dr. (H.C.) Dr. Joseph Sinaga', sub: 'Pembuat Keputusan Tertinggi', order: 10, deleted: false },
            { id: 'sekretaris', title: 'Sekretaris Eksekutif', name: 'Pdt. Johannes Lie, M.Th.', sub: 'Administrasi & Legalitas Lembaga', order: 20, deleted: false },
            { id: 'bendahara', title: 'Bendahara Umum', name: 'Ibu Ruth Sitorus, S.E.', sub: 'Jurnal Kas, Ledger & Audit', order: 30, deleted: false },
            { id: 'korwil', title: 'Koordinator Wilayah DIY', name: 'Ahmad Faisal, S.Th.', sub: 'Lapangan & Persekutuan Cabang', order: 40, deleted: false },
            { id: 'staff', title: 'Staf Lapangan & Kelompok Kecil', name: 'Simpatisan Mitra Aliansi', sub: 'Pendamping Siswa & Pelayanan', order: 50, deleted: false },
          ];

          // Merge: default nodes that are not soft-deleted or customized in the database
          const finalNodes = [...activeDocs];
          defaultNodes.forEach(def => {
            const hasCustomized = data.some(d => d.id === def.id);
            if (!hasCustomized && !finalNodes.some(n => n.id === def.id)) {
              finalNodes.push(def);
            }
          });

          // Sort by the order parameter
          finalNodes.sort((a, b) => {
            const ordA = typeof a.order === 'number' ? a.order : 100;
            const ordB = typeof b.order === 'number' ? b.order : 100;
            return ordA - ordB;
          });

          setOrgTree(finalNodes);
        }
      }
    } catch (err) {
      console.error('Failed to fetch structures:', err);
    } finally {
      setIsFetchingTree(false);
    }
  };

  const handleUpdateStructureNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'Super Admin' && currentRole !== 'Ketua Yayasan') {
      alert('Akses Terbatas: Hanya Super Admin / Ketua Yayasan yang berhak mengubah struktur organisasi.');
      return;
    }

    setIsSavingTree(true);
    try {
      const updatedNode = {
        id: activeNodeId,
        title: editTitle,
        name: editName,
        sub: editSub,
        order: Number(editOrder) || 100,
        deleted: false
      };

      const res = await fetch(`/api/data/structures/${activeNodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedNode)
      });

      if (res.ok) {
        // Log to audit logger
        const sessionUser = localStorage.getItem('esm_session_user');
        const userName = sessionUser ? JSON.parse(sessionUser).name : 'Operator';
        
        const auditId = `AUD-STR-${Date.now()}`;
        await fetch(`/api/data/audits/${auditId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: auditId,
            userName: userName,
            userRole: currentRole,
            action: `[Bagan Organisasi] Mengubah data pengurus/staf ${editTitle} menjadi nama: "${editName}", urutan: ${editOrder}.`,
            module: 'Sistem',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            deleted: false
          })
        });

        alert(`Sukses: Struktur jabatan ${editTitle} berhasil diperbarui.`);
        await fetchOrgTree();
      } else {
        alert('Gagal merekam data struktur ke database.');
      }
    } catch (err) {
      console.error('Failed to update structure node:', err);
      alert('Kesalahan jaringan saat memperbarui struktur.');
    } finally {
      setIsSavingTree(false);
    }
  };

  const handleCreateStructureNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'Super Admin' && currentRole !== 'Ketua Yayasan') {
      alert('Akses Terbatas: Hanya Super Admin / Ketua Yayasan yang berhak menambahkan struktur baru.');
      return;
    }

    const cleanId = newNodeId.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');
    if (!cleanId) {
      alert('ID Jabatan tidak valid (hanya karakter huruf kecil, angka, strip, dan underscore)');
      return;
    }

    // Check if ID already exists
    if (orgTree.some(node => node?.id === cleanId)) {
      alert(`Error: ID Jabatan "${cleanId}" sudah ada dalam bagan.`);
      return;
    }

    setIsSavingTree(true);
    try {
      const newNode = {
        id: cleanId,
        title: newNodeTitle,
        name: newNodeName,
        sub: newNodeSub,
        order: Number(newNodeOrder) || 100,
        deleted: false
      };

      const res = await fetch(`/api/data/structures/${cleanId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newNode)
      });

      if (res.ok) {
        // Log to audit logger
        const sessionUser = localStorage.getItem('esm_session_user');
        const userName = sessionUser ? JSON.parse(sessionUser).name : 'Operator';
        
        const auditId = `AUD-STR-ADD-${Date.now()}`;
        await fetch(`/api/data/audits/${auditId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: auditId,
            userName: userName,
            userRole: currentRole,
            action: `[Bagan Organisasi] Menambahkan struktur baru "${newNodeTitle}" (ID: ${cleanId}), Nama: "${newNodeName}".`,
            module: 'Sistem',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            deleted: false
          })
        });

        alert(`Sukses: Struktur baru "${newNodeTitle}" berhasil ditambahkan.`);
        setIsAddingNode(false);
        setNewNodeId('');
        setNewNodeTitle('');
        setNewNodeName('');
        setNewNodeSub('');
        setNewNodeOrder(100);
        setActiveNodeId(cleanId);
        await fetchOrgTree();
      } else {
        alert('Gagal merekam data struktur baru ke database.');
      }
    } catch (err) {
      console.error('Failed to create structure node:', err);
      alert('Kesalahan jaringan saat menambahkan struktur baru.');
    } finally {
      setIsSavingTree(false);
    }
  };

  const handleDeleteStructureNode = async (nodeId: string) => {
    if (currentRole !== 'Super Admin' && currentRole !== 'Ketua Yayasan') {
      alert('Akses Terbatas: Hanya Super Admin / Ketua Yayasan yang berhak menghapus struktur.');
      return;
    }

    const nodeToDelete = orgTree.find(n => n.id === nodeId);
    const titleLabel = nodeToDelete?.title || nodeId;

    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${titleLabel}" dari bagan organisasi?`)) {
      return;
    }

    setIsSavingTree(true);
    try {
      // Set to soft-delete by posting empty object with deleted: true
      const res = await fetch(`/api/data/structures/${nodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: nodeId,
          title: nodeToDelete?.title || '',
          name: nodeToDelete?.name || '',
          sub: nodeToDelete?.sub || '',
          order: nodeToDelete?.order || 100,
          deleted: true
        })
      });

      if (res.ok) {
        // Log to audit logger
        const sessionUser = localStorage.getItem('esm_session_user');
        const userName = sessionUser ? JSON.parse(sessionUser).name : 'Operator';
        
        const auditId = `AUD-STR-DEL-${Date.now()}`;
        await fetch(`/api/data/audits/${auditId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: auditId,
            userName: userName,
            userRole: currentRole,
            action: `[Bagan Organisasi] Menghapus struktur jabatan/hierarki ID: "${nodeId}".`,
            module: 'Sistem',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            deleted: false
          })
        });

        alert(`Sukses: Struktur jabatan ${titleLabel} berhasil dihapus.`);
        
        // Find next active nodeId that is not deleted
        const remainingNodes = orgTree.filter(n => n.id !== nodeId);
        if (remainingNodes.length > 0) {
          setActiveNodeId(remainingNodes[0].id);
        } else {
          setActiveNodeId('ketua');
        }
        await fetchOrgTree();
      } else {
        alert('Gagal menghapus struktur dari database.');
      }
    } catch (err) {
      console.error('Error soft deleting node:', err);
      alert('Kesalahan jaringan saat menghapus struktur.');
    } finally {
      setIsSavingTree(false);
    }
  };

  useEffect(() => {
    fetchOrgTree();
  }, []);

  useEffect(() => {
    const activeNode = orgTree.find(n => n?.id === activeNodeId);
    if (activeNode) {
      setEditName(activeNode.name || '');
      setEditTitle(activeNode.title || '');
      setEditSub(activeNode.sub || '');
      setEditOrder(typeof activeNode.order === 'number' ? activeNode.order : 100);
    }
  }, [activeNodeId, orgTree]);

  // Form profile
  const [name, setName] = useState(profile.name);
  const [address, setAddress] = useState(profile.address);
  const [phone, setPhone] = useState(profile.phone || '');
  const [email, setEmail] = useState(profile.email || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [npwp, setNpwp] = useState(profile.npwp || '');
  const [skLegal, setSkLegal] = useState(profile.legalReg || '');

  // Operators & Checklist Database States
  const [operators, setOperators] = useState<any[]>([]);
  const [isFetchingOps, setIsFetchingOps] = useState(false);
  const [isSavingOps, setIsSavingOps] = useState(false);

  // New Operator Form States
  const [newOpName, setNewOpName] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [newOpRole, setNewOpRole] = useState('Staff');
  const [newOpFeatures, setNewOpFeatures] = useState<string[]>(['dashboard', 'members', 'small_groups']);
  const [showOpPassword, setShowOpPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Active password viewing toggle for users table
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const ALL_FEATURES = [
    { id: 'dashboard', label: 'Dashboard Utama' },
    { id: 'members', label: 'Anggota & KTB' },
    { id: 'small_groups', label: 'Kelompok Kecil' },
    { id: 'finance', label: 'Keuangan & Kas' },
    { id: 'partners', label: 'Mitra & CRM' },
    { id: 'staff', label: 'Database Staf' },
    { id: 'payroll', label: 'Payroll & Slip Gaji' },
    { id: 'letters', label: 'Surat & Dokumen' },
    { id: 'approvals', label: 'Approval Center' },
    { id: 'system', label: 'Profil & Audit Log (System)' }
  ];

  const fetchOperators = async () => {
    setIsFetchingOps(true);
    try {
      const res = await fetch('/api/data/users');
      if (res.ok) {
        const data = await res.json();
        // filter out elements that are flagged as deleted
        setOperators(data.filter((u: any) => !u.deleted));
      }
    } catch (err) {
      console.error('Failed to fetch operators:', err);
    } finally {
      setIsFetchingOps(false);
    }
  };

  useEffect(() => {
    fetchOperators();
  }, [activeSubView]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'Super Admin' && currentRole !== 'Ketua Yayasan') {
      alert('Akses Terbatas: Hanya Super Admin / Ketua Yayasan yang berhak mengubah identitas hukum lembaga.');
      return;
    }
    const updated: InstitutionalProfile = {
      id: profile.id,
      name,
      address,
      phone,
      email,
      website,
      npwp,
      legalReg: skLegal
    };
    onUpdateProfile(updated);
    alert('Informasi legalitas profil institusi ESM berhasil diperbarui & dicadangkan.');
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const isAuthorized = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan';
    if (!isAuthorized) {
      setFormError('Akses Ditolak: Hanya Super Admin atau Ketua Yayasan yang dapat menambahkan akun operator.');
      return;
    }

    if (!newOpName || !newOpEmail || !newOpPassword) {
      setFormError('Harap lengkapi semua bidang isian formulir.');
      return;
    }

    if (!newOpEmail.endsWith('@esm.or.id') && !newOpEmail.includes('@')) {
      setFormError('Gunakan email resmi institusi (contoh: nama@esm.or.id).');
      return;
    }

    // Check if duplicate email
    if (operators.some(op => op.email.toLowerCase() === newOpEmail.toLowerCase())) {
      setFormError('Operator dengan alamat email ini telah terdaftar.');
      return;
    }

    setIsSavingOps(true);

    try {
      const newPayload = {
        name: newOpName,
        email: newOpEmail.toLowerCase(),
        password: newOpPassword,
        role: newOpRole,
        features: newOpFeatures,
        deleted: false
      };

      const id = newOpEmail.toLowerCase();
      const res = await fetch(`/api/data/users/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPayload)
      });

      if (res.ok) {
        setFormSuccess(`Operator ${newOpName} berhasil terdaftar dan ditambahkan ke database.`);
        setNewOpName('');
        setNewOpEmail('');
        setNewOpPassword('');
        // Refresh operator list
        await fetchOperators();
      } else {
        setFormError('Gagal menyimpan operator baru ke Firestore.');
      }
    } catch (err) {
      setFormError('Kesalahan jaringan saat mendaftarkan operator.');
    } finally {
      setIsSavingOps(false);
    }
  };

  const handleToggleFeature = async (userEmail: string, featureId: string) => {
    const isAuthorized = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan';
    if (!isAuthorized) {
      alert('Akses Terbatas: Hanya Super Admin atau Ketua Yayasan yang dapat mengubah konfigurasi checklist hak akses.');
      return;
    }

    const targetUser = operators.find(op => op.email === userEmail);
    if (!targetUser) return;

    let updatedFeatures = [...(targetUser.features || [])];
    if (updatedFeatures.includes(featureId)) {
      updatedFeatures = updatedFeatures.filter(f => f !== featureId);
    } else {
      updatedFeatures.push(featureId);
    }

    // Update in UI locally first for instant feedback (optimistic update)
    setOperators(prev => prev.map(op => {
      if (op.email === userEmail) {
        return { ...op, features: updatedFeatures };
      }
      return op;
    }));

    // Post update to Firestore database
    try {
      const payload = {
        ...targetUser,
        features: updatedFeatures
      };

      const res = await fetch(`/api/data/users/${userEmail}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.error('Failed to sync feature updates to database.');
        // Revert local changes if failed
        await fetchOperators();
      }
    } catch (err) {
      console.error('Network mistake while updating operator:', err);
      await fetchOperators();
    }
  };

  const handleApproveOperator = async (userEmail: string) => {
    const isAuthorized = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan';
    if (!isAuthorized) {
      alert('Akses Terbatas: Hanya Super Admin atau Ketua Yayasan yang dapat menyetujui akun operator baru.');
      return;
    }

    const targetUser = operators.find(op => op.email === userEmail);
    if (!targetUser) return;

    try {
      const payload = {
        ...targetUser,
        approved: true,
        features: targetUser.features && targetUser.features.length > 0 
          ? targetUser.features 
          : ['dashboard', 'members', 'small_groups'] // default starter features
      };

      const res = await fetch(`/api/data/users/${userEmail}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(`Sukses: Akun operator ${targetUser.name} telah disetujui & diaktifkan.`);
        await fetchOperators();
      } else {
        alert('Gagal memperbarui status persetujuan di database.');
      }
    } catch (err) {
      console.error('Error approving operator:', err);
      alert('Kesalahan jaringan saat menyetujui operator.');
    }
  };

  const handleDeleteOperator = async (userEmail: string, userRole: string) => {
    const isAuthorized = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan';
    if (!isAuthorized) {
      alert('Akses Terbatas: Hanya Ketua Yayasan atau Super Admin yang dapat menonaktifkan operator.');
      return;
    }

    if (userEmail === 'superadmin@esm.or.id') {
      alert('Proteksi Keamanan: Akun Super Admin bawaan sistem tidak boleh dihapus demi kelangsungan sistem.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menonaktifkan operator ${userEmail}?`)) {
      return;
    }

    // Flag as deleted in database instead of hard-delete to keep audit integrity
    try {
      const targetUser = operators.find(op => op.email === userEmail);
      if (!targetUser) return;

      const payload = {
        ...targetUser,
        deleted: true
      };

      const res = await fetch(`/api/data/users/${userEmail}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Operator berhasil dinonaktifkan.');
        await fetchOperators();
      } else {
        alert('Gagal memperbarui status operator di database.');
      }
    } catch (err) {
      console.error('Failed to request operator removal:', err);
    }
  };

  const handleTogglePasswordVisibility = (email: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };

  const handleNewOpFeatureToggle = (featureId: string) => {
    if (newOpFeatures.includes(featureId)) {
      setNewOpFeatures(prev => prev.filter(f => f !== featureId));
    } else {
      setNewOpFeatures(prev => [...prev, featureId]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Config buttons bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl max-w-full">
        <button 
          onClick={() => setActiveSubView('profile')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSubView === 'profile' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Profil Institusi & Legalitas
        </button>
        <button 
          onClick={() => setActiveSubView('structure')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeSubView === 'structure' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Struktur Organisasi (Interaktif)
        </button>
        {/* NEW OPERATORS TAB COLLABORATION CHECKLIST */}
        <button 
          onClick={() => setActiveSubView('operators')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${
            activeSubView === 'operators' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-indigo-505" /> Hak Akses Operator & Checklist
        </button>
        <button 
          onClick={() => setActiveSubView('audit')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 transition-all ${
            activeSubView === 'audit' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> Audit Trail Logs
        </button>
      </div>

      {/* SUBVIEW 1: LEGAL PROFILE FORM */}
      {activeSubView === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-xs text-left">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1"><Building className="w-4 h-4 text-indigo-650" /> Identitas Hukum Yayasan ESM</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">Identitas ini otomatis disematkan pada slip gaji pegawai, kepala surat keluar, dan laporan fundraising donor.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Nama Resmi Yayasan :</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold text-sm bg-slate-50"
                disabled
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Nomor Pokok Wajib Pajak (NPWP) :</label>
              <input 
                type="text" 
                value={npwp}
                onChange={(e) => setNpwp(e.target.value)}
                placeholder="12.345.678.9-012.000"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-1 font-semibold">E-mail Hubungan Publik :</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Telepon Sekretariat :</label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-500 block mb-1 font-semibold">SK Menkumham Legalitas Akta :</label>
              <input 
                type="text" 
                value={skLegal}
                onChange={(e) => setSkLegal(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-500 block mb-1 font-semibold"><MapPin className="w-3.5 h-3.5 inline mr-0.5 text-red-500" /> Alamat Kantor Pusat :</label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-850"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 flex justify-end">
            <button 
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer transition-colors"
            >
              Simpan Identitas Lembaga
            </button>
          </div>
        </form>
      )}

      {/* SUBVIEW 2: DYNAMIC ORGANIZATIONAL STRUCTURE */}
      {activeSubView === 'structure' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Visual Bagan Struktur Organisasi & Pengambil Keputusan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pilih salah satu tingkatan hierarki untuk mempelajari hak otorisasi dan rantai komando internal ESM.</p>
            </div>
            
            {(currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan') && (
              <button
                onClick={() => setIsAddingNode(!isAddingNode)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isAddingNode ? 'Batal Tambah' : 'Tambah Jabatan Baru'}</span>
              </button>
            )}
          </div>

          {/* Form to add new structural node */}
          {isAddingNode && (currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan') && (
            <form onSubmit={handleCreateStructureNode} className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 text-xs">
              <div className="border-b border-indigo-100 pb-2">
                <h4 className="font-bold text-slate-800">Formulir Penambahan Jabatan / Struktur Baru</h4>
                <p className="text-[10px] text-slate-500">Isi data di bawah ini untuk menghubungkan tingkatan hierarki baru.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-650 font-semibold mb-1 block">ID Jabatan (Unik, misal: wakil_ketua):</label>
                  <input
                    type="text"
                    value={newNodeId}
                    onChange={(e) => setNewNodeId(e.target.value)}
                    placeholder="contoh: wakil_ketua"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-655 font-semibold mb-1 block">Gelar Jabatan :</label>
                  <input
                    type="text"
                    value={newNodeTitle}
                    onChange={(e) => setNewNodeTitle(e.target.value)}
                    placeholder="contoh: Wakil Ketua Bidang Pelayanan"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-655 font-semibold mb-1 block">Nama Pengurus/Staf :</label>
                  <input
                    type="text"
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="contoh: Samuel Pratama, M.Div."
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className="text-slate-655 font-semibold mb-1 block">Urutan Tampilan (Angka):</label>
                  <input
                    type="number"
                    value={newNodeOrder}
                    onChange={(e) => setNewNodeOrder(Number(e.target.value) || 100)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    required
                  />
                  <span className="text-[9px] text-slate-400">Ketua (10), Sekretaris (20), Bendahara (30), dst. Pasang nilai di antaranya untuk menyisipkan.</span>
                </div>
                <div className="sm:col-span-3">
                  <label className="text-slate-655 font-semibold mb-1 block">Deskripsi Tugas & Hak Komando :</label>
                  <input
                    type="text"
                    value={newNodeSub}
                    onChange={(e) => setNewNodeSub(e.target.value)}
                    placeholder="Sebutkan wewenang, kewenangan persetujuan budget, audit internal, atau pendampingan..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNode(false);
                    setNewNodeId('');
                    setNewNodeTitle('');
                    setNewNodeName('');
                    setNewNodeSub('');
                    setNewNodeOrder(100);
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingTree}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSavingTree && <RefreshCw className="w-3 animate-spin" />}
                  <span>Simpan Struktur Baru</span>
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Tree nodes (Chart layout) */}
            <div className="space-y-2 max-w-sm mx-auto w-full relative">
              <div className="absolute top-4 bottom-4 left-6 w-0.5 bg-slate-205 pointer-events-none"></div>

              {orgTree.map((node) => {
                if (!node) return null;
                const isSelected = activeNodeId === node.id;
                return (
                  <div 
                    key={node.id} 
                    onClick={() => setActiveNodeId(node.id)}
                    className={`ml-4 pl-8 pr-4 py-3 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-102 font-bold' : 
                      'bg-slate-50 border-slate-100 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 rounded-full border-2 ${
                      isSelected ? 'bg-white border-indigo-600' : 'bg-slate-200 border-slate-300'
                    }`} />
                    
                    <div className="flex justify-between items-center gap-1">
                      <span className={`text-[9px] uppercase font-mono tracking-widest block font-bold truncate ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400'
                      }`}>{node.title}</span>
                      <span className={`text-[9px] font-mono shrink-0 px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-indigo-700/50 text-indigo-100' : 'bg-slate-200/50 text-slate-550'
                      }`}>
                        #{node.order || 100}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold leading-tight mt-0.5">{node.name}</h4>
                  </div>
                );
              })}
            </div>

            {/* Structure info block */}
            <div className="p-6 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between min-h-[300px]">
              {activeNodeId ? (() => {
                const activeNode = orgTree.find(n => n?.id === activeNodeId);
                const canEdit = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan';

                return (
                  <div className="space-y-4">
                    <span className="bg-slate-900 text-white font-bold font-mono tracking-wider text-[10px] px-2 py-0.5 rounded">
                      STATUS JABATAN : {activeNodeId.toUpperCase()}
                    </span>
                    
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">{activeNode?.name}</h4>
                      <span className="text-xs text-indigo-700 font-semibold block">{activeNode?.title}</span>
                    </div>

                    <p className="text-xs text-slate-650 leading-relaxed font-sans bg-white p-3 rounded-xl border border-slate-100">
                      {activeNode?.sub}
                    </p>

                    {canEdit && (
                      <form onSubmit={handleUpdateStructureNode} className="pt-4 border-t border-slate-200 space-y-3.5 text-xs">
                        <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider font-mono block">Edit Data Pengurus & Tugas</span>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-semibold block">Nama Pengurus/Staf :</label>
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                            placeholder="Masukkan nama pengurus..."
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-semibold block">Gelar Jabatan :</label>
                            <input 
                              type="text" 
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                              placeholder="Contoh: Ketua Dewan Pembina"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-semibold block">Urutan Tampilan :</label>
                            <input 
                              type="number" 
                              value={editOrder}
                              onChange={(e) => setEditOrder(Number(e.target.value) || 100)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                              placeholder="contoh: 15"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-semibold block">Deskripsi Tugas & Hak Otoritas :</label>
                          <textarea 
                            value={editSub}
                            onChange={(e) => setEditSub(e.target.value)}
                            rows={3}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-sans leading-relaxed"
                            placeholder="Sebutkan wewenang, komando, atau tugas pelayanan..."
                            required
                          />
                        </div>

                        <div className="flex justify-between items-center pt-1 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteStructureNode(activeNodeId)}
                            disabled={isSavingTree}
                            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-red-200 disabled:opacity-50 font-bold"
                            title="Hapus Jabatan Ini dari Bagan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Jabatan</span>
                          </button>

                          <button
                            type="submit"
                            disabled={isSavingTree}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            {isSavingTree && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            <span>Simpan Perubahan</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })() : (
                <p className="text-xs text-slate-400 text-center py-20">Pilih salah satu tingkat organisasi untuk meninjau penugasan formal.</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* SUBVIEW 4: OPERATOR LIST & FEATURE CHECKLISTS (REAL-CASE DB CONNECTED) */}
      {activeSubView === 'operators' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          
          {/* Left panel: List active operators with feature checkboxes */}
          <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Konfigurasi Hak Akses Operator & Fitur
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan modul sistem mana saja yang dapat diakses oleh masing-masing operator di bawah ini.
                </p>
              </div>

              <button 
                onClick={fetchOperators}
                className="p-1 px-2.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Segarkan
              </button>
            </div>

            {/* Warn authorization */}
            {!(currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan') && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Informasi: Hanya <strong>Super Admin</strong> dan <strong>Ketua Yayasan</strong> yang berhak mengedit checkbox fitur operator. Sesi Anda ({currentRole}) saat ini terkunci sebagai baca-saja.
                </span>
              </div>
            )}

            {isFetchingOps ? (
              <div className="py-20 text-center">
                <span className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin inline-block mb-2"></span>
                <p className="text-xs text-slate-400">Loading data operator dari database Firestore...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {operators.map((op) => {
                  const hasAdminRights = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan';
                  const isPasswordVisible = !!visiblePasswords[op.email];

                  return (
                    <div 
                      key={op.email} 
                      className="p-4 bg-slate-50 rounded-xl border border-slate-150/80 space-y-3 shadow-2xs hover:shadow-xs transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{op.name}</h4>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-full uppercase">
                              {op.role}
                            </span>
                            {op.approved === false ? (
                              <span className="text-[9px] bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase animate-pulse">
                                Menunggu Persetujuan
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-1.5 py-0.5 rounded-full uppercase">
                                Aktif
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                            {op.email} {op.phone && `• Telp: ${op.phone}`}
                          </span>
                        </div>

                        {/* Actions block */}
                        <div className="flex items-center gap-2">
                          {op.approved === false && hasAdminRights && (
                            <button
                              onClick={() => handleApproveOperator(op.email)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                              title="Setujui dan aktifkan operator ini"
                            >
                              Setujui Akun
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleTogglePasswordVisibility(op.email)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
                            title="Tampilkan password operator"
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteOperator(op.email, op.role)}
                            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus Operator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display password if toggled */}
                      {isPasswordVisible && (
                        <div className="text-[11px] bg-indigo-50 border border-indigo-100 p-2 rounded-lg flex items-center justify-between font-mono text-indigo-900">
                          <span>Sandi Operator: <strong>{op.password}</strong></span>
                        </div>
                      )}

                      {/* Checklist Features panel */}
                      <div className="space-y-1.5 border-t border-slate-200/70 pt-2 bg-white/40 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono block mb-1">
                          Feature Access Checklist :
                        </span>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-[10px]">
                          {ALL_FEATURES.map((feat) => {
                            const isChecked = Array.isArray(op.features) 
                              ? op.features.includes(feat.id) 
                              : ['dashboard', 'members', 'small_groups'].includes(feat.id); // Default fallback

                            return (
                              <label 
                                key={feat.id} 
                                className={`flex items-center gap-1.5 p-1 px-2 rounded-md border cursor-pointer select-none transition-colors ${
                                  isChecked 
                                    ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold' 
                                    : 'bg-[#FCFCFD]/50 border-slate-100 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleFeature(op.email, feat.id)}
                                  disabled={!hasAdminRights}
                                  className="rounded text-blue-600 focus:ring-0 scale-95"
                                />
                                <span className="truncate">{feat.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Add new operator account */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs uppercase font-mono tracking-widest font-bold text-slate-400 flex items-center gap-1">
                  <UserPlus2 className="w-4 h-4 text-emerald-500" />
                  Tambah Operator Baru
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Daftarkan staf pelaksana atau dewan pengurus baru ke dalam sistem ERP.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] leading-relaxed">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] leading-relaxed">
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleCreateOperator} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Operator :</label>
                  <input 
                    type="text"
                    value={newOpName}
                    onChange={(e) => { setNewOpName(e.target.value); setFormError(null); }}
                    placeholder="Contoh: Ibu Ruth Sitorus"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Alamat Email Resmi :</label>
                  <input 
                    type="email"
                    value={newOpEmail}
                    onChange={(e) => { setNewOpEmail(e.target.value); setFormError(null); }}
                    placeholder="nama@esm.or.id"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono"
                    required
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">Akun akan login menggunakan alamat email ini</span>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Password Masuk :</label>
                  <div className="relative">
                    <input 
                      type={showOpPassword ? 'text' : 'password'}
                      value={newOpPassword}
                      onChange={(e) => { setNewOpPassword(e.target.value); setFormError(null); }}
                      placeholder="Tentukan sandi awal..."
                      className="w-full border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-slate-800 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpPassword(!showOpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showOpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Hak Struktural (Role) :</label>
                  <select 
                    value={newOpRole}
                    onChange={(e) => setNewOpRole(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 bg-white"
                  >
                    <option value="Staff">Staff Lapangan</option>
                    <option value="Sekretaris">Sekretaris Eksekutif</option>
                    <option value="Bendahara">Bendahara Umum</option>
                    <option value="Ketua Yayasan">Ketua Yayasan</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>

                {/* Default starting features checklist for new operator creation */}
                <div className="space-y-1.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Fitur Awal :</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {ALL_FEATURES.map((feat) => {
                      const isChecked = newOpFeatures.includes(feat.id);
                      return (
                        <label key={feat.id} className="flex items-center gap-2 cursor-pointer p-0.5 hover:bg-slate-100 rounded text-[11px] text-slate-700">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleNewOpFeatureToggle(feat.id)}
                            className="rounded text-indigo-600"
                          />
                          <span>{feat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingOps || !(currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {isSavingOps ? 'Mengunggah Database...' : 'Daftarkan Akun Operator'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 5: SYSTEM AUDIT LOGGER (AUDIT TRAILS) */}
      {activeSubView === 'audit' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 font-mono text-[11px] text-slate-350 text-left">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5"><Database className="w-4 h-4 text-indigo-400" /> SYSTEM TRANSACTION AUDIT LOGS</h3>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">● COMPLIANT LEDGER</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto leading-relaxed">
            {auditLogs.map((log) => (
              <div key={log.id} className="hover:bg-slate-900 p-2 rounded-lg border border-transparent hover:border-slate-800/50 flex flex-col sm:flex-row sm:justify-between items-start gap-1 font-mono transition-all">
                <div className="flex gap-1.5 shrink-0">
                  <span className="text-slate-500 font-bold shrink-0">{log.timestamp}</span>
                  <span className="text-yellow-500 font-bold shrink-0">[{log.userName}]</span>
                </div>
                <div className="text-slate-300 md:flex-1 md:px-3 text-left">
                  {log.action}
                </div>
                <span className="bg-slate-800 text-[10px] text-indigo-400 px-1.5 py-0.5 rounded font-bold self-end sm:self-auto shrink-0 animate-pulse">
                  ROLE: {log.userRole || 'System'}
                </span>
              </div>
            ))}
          </div>
          
          <p className="text-[9px] text-slate-500">Jurnal audit sistem ini bersifat tertutup, non-destruktif, dan terenkripsi AES-256 otomatis dalam standard audit kepatuhan IT Yayasan.</p>
        </div>
      )}

    </div>
  );
}
