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
  EyeOff,
  Edit,
  RotateCw,
  RotateCcw,
  Image
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
  const [activeSubView, setActiveSubView] = useState<'profile' | 'structure' | 'operators' | 'audit' | 'variables'>('profile');
  const [activeNodeId, setActiveNodeId] = useState<string>('ketua');
  
  // Dynamic Organizational Structure State
  const [orgTree, setOrgTree] = useState<any[]>([
    { id: 'ketua', title: 'Ketua Dewan Pembina', name: 'Dr. (H.C.) Dr. Joseph Sinaga', sub: 'Pembuat Keputusan Tertinggi', order: 10, deleted: false },
    { id: 'sekretaris', title: 'Sekretaris Eksekutif', name: 'Pdt. Johannes Lie, M.Th.', sub: 'Administrasi & Legalitas Lembaga', order: 20, deleted: false },
    { id: 'bendahara', title: 'Bendahara Umum', name: 'Ibu Ruth Sitorus, S.E.', sub: 'Jurnal Kas, Transaksi & Audit', order: 30, deleted: false },
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

  // States for custom modal confirmations
  const [deleteConfirmOp, setDeleteConfirmOp] = useState<{ email: string; role: string; name: string } | null>(null);
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<{ id: string; title: string } | null>(null);

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
            { id: 'bendahara', title: 'Bendahara Umum', name: 'Ibu Ruth Sitorus, S.E.', sub: 'Jurnal Kas, Transaksi & Audit', order: 30, deleted: false },
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



  // Helper to optimize and compress image before setting to state to avoid Firestore document limits (max 1MB per document)
  const optimizeAndResizeImage = (file: File, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new window.Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          let width = image.width;
          let height = image.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(readerEvent.target?.result as string);
            return;
          }

          // Handle transparency for PNG
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(image, 0, 0, width, height);

          // Automatic background removal: filter out white / near-white pixels to make it transparent
          try {
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // If pixel is near-white (all channels above 210)
              if (r > 210 && g > 210 && b > 210) {
                // Calculate average brightness
                const brightness = (r + g + b) / 3;
                if (brightness > 245) {
                  data[i + 3] = 0; // completely transparent
                } else {
                  // smooth alpha transition for edges
                  const factor = (245 - brightness) / 35; // 0 to 1
                  data[i + 3] = Math.max(0, Math.min(255, Math.round(data[i + 3] * factor)));
                }
              }
            }
            ctx.putImageData(imgData, 0, 0);
          } catch (e) {
            console.warn("Background removal skipped due to secure canvas or error:", e);
          }

          // Keep PNG as original file to preserve transparency, otherwise JPEG for high compression
          const isPng = file.type === 'image/png' || file.name.endsWith('.png');
          const outputType = 'image/png'; // Always output PNG to preserve transparency now that background is removed
          const dataUrl = canvas.toDataURL(outputType);
          resolve(dataUrl);
        };
        image.onerror = () => {
          resolve(readerEvent.target?.result as string);
        };
        image.src = readerEvent.target?.result as string;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  };

  // Form profile
  const [name, setName] = useState(profile.name);
  const [address, setAddress] = useState(profile.address);
  const [phone, setPhone] = useState(profile.phone || '');
  const [email, setEmail] = useState(profile.email || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [npwp, setNpwp] = useState(profile.npwp || '');
  const [skLegal, setSkLegal] = useState(profile.legalReg || '');
  const [signatureUrl, setSignatureUrl] = useState(profile.signatureUrl || '');
  const [stampUrl, setStampUrl] = useState(profile.stampUrl || '');
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl || '');
  const [signatureChairmanUrl, setSignatureChairmanUrl] = useState(profile.signatureChairmanUrl || '');
  const [signatureSecretaryUrl, setSignatureSecretaryUrl] = useState(profile.signatureSecretaryUrl || '');
  const [signatureTreasurerUrl, setSignatureTreasurerUrl] = useState(profile.signatureTreasurerUrl || '');
  const [kopTitle, setKopTitle] = useState(profile.kopTitle || 'EVANGELICAL STUDENT MOVEMENT');
  const [kopMotto, setKopMotto] = useState(profile.kopMotto || 'Kabar baik. Pemuridan. Misi.');
  const [isSignatureDirty, setIsSignatureDirty] = useState(false);

  // Dynamic system and dashboard titles
  const [systemTitle, setSystemTitle] = useState(profile.systemTitle || 'ESM FMS');
  const [dashboardTitle, setDashboardTitle] = useState(profile.dashboardTitle || 'Institutional Executive ERP');

  // Dynamic dropdown lists
  const [regions, setRegions] = useState<string[]>(profile.regions || ["Yogyakarta", "Solo", "Semarang", "Purwokerto"]);
  const [materialCategories, setMaterialCategories] = useState<string[]>(profile.materialCategories || ["Materi Dasar / Siswa", "Siswa & Mahasiswa", "Alumni", "Pelatihan Pemimpin (PKK)", "Materi Umum / Publik"]);
  const [incomeAllocations, setIncomeAllocations] = useState<string[]>(profile.incomeAllocations || ["Gaji / Operasional", "Peralatan", "Kegiatan Khusus", "Lainnya"]);
  const [meetingDays, setMeetingDays] = useState<string[]>(profile.meetingDays || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]);
  const [memberKeaktifanStatuses, setMemberKeaktifanStatuses] = useState<string[]>(profile.memberKeaktifanStatuses || ["Aktif", "Pasif", "Cuti", "Pindah"]);
  const [memberComponents, setMemberComponents] = useState<string[]>(profile.memberComponents || ["Siswa", "Mahasiswa", "Alumni", "Umum"]);
  const [partnerStatuses, setPartnerStatuses] = useState<string[]>(profile.partnerStatuses || ["Prospek", "Kontak Awal", "Presentasi", "Komitmen", "Donasi Pertama", "Aktif", "Tidak Aktif"]);
  const [partnerTypes, setPartnerTypes] = useState<string[]>(profile.partnerTypes || ["Pribadi", "Gereja", "Perusahaan", "Instansi", "Yayasan"]);

  // Temporary single input text fields for adding items
  const [newRegion, setNewRegion] = useState('');
  const [newMaterialCat, setNewMaterialCat] = useState('');
  const [newAllocation, setNewAllocation] = useState('');
  const [newMeetingDay, setNewMeetingDay] = useState('');
  const [newKeaktifanStatus, setNewKeaktifanStatus] = useState('');
  const [newMemberComponent, setNewMemberComponent] = useState('');
  const [newPartnerStatus, setNewPartnerStatus] = useState('');
  const [newPartnerType, setNewPartnerType] = useState('');

  const lastSyncedProfileRef = React.useRef<any>(null);

  useEffect(() => {
    const isFirstLoad = !lastSyncedProfileRef.current;
    
    // Check if the current local state matches what we last synced (to detect local edits)
    let isSameAsLastSynced = true;
    if (lastSyncedProfileRef.current) {
      const last = lastSyncedProfileRef.current;
      isSameAsLastSynced = 
        name === last.name &&
        address === last.address &&
        phone === (last.phone || '') &&
        email === (last.email || '') &&
        website === (last.website || '') &&
        npwp === (last.npwp || '') &&
        skLegal === (last.legalReg || '') &&
        kopTitle === (last.kopTitle || '') &&
        kopMotto === (last.kopMotto || '') &&
        signatureUrl === (last.signatureUrl || '') &&
        signatureChairmanUrl === (last.signatureChairmanUrl || '') &&
        signatureSecretaryUrl === (last.signatureSecretaryUrl || '') &&
        signatureTreasurerUrl === (last.signatureTreasurerUrl || '') &&
        stampUrl === (last.stampUrl || '') &&
        logoUrl === (last.logoUrl || '') &&
        systemTitle === (last.systemTitle || 'ESM FMS') &&
        dashboardTitle === (last.dashboardTitle || 'Institutional Executive ERP') &&
        JSON.stringify(regions) === JSON.stringify(last.regions || ["Yogyakarta", "Solo", "Semarang", "Purwokerto"]) &&
        JSON.stringify(materialCategories) === JSON.stringify(last.materialCategories || ["Materi Dasar / Siswa", "Siswa & Mahasiswa", "Alumni", "Pelatihan Pemimpin (PKK)", "Materi Umum / Publik"]) &&
        JSON.stringify(incomeAllocations) === JSON.stringify(last.incomeAllocations || ["Gaji / Operasional", "Peralatan", "Kegiatan Khusus", "Lainnya"]) &&
        JSON.stringify(meetingDays) === JSON.stringify(last.meetingDays || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]) &&
        JSON.stringify(memberKeaktifanStatuses) === JSON.stringify(last.memberKeaktifanStatuses || ["Aktif", "Pasif", "Cuti", "Pindah"]) &&
        JSON.stringify(memberComponents) === JSON.stringify(last.memberComponents || ["Siswa", "Mahasiswa", "Alumni", "Umum"]) &&
        JSON.stringify(partnerStatuses) === JSON.stringify(last.partnerStatuses || ["Prospek", "Kontak Awal", "Presentasi", "Komitmen", "Donasi Pertama", "Aktif", "Tidak Aktif"]) &&
        JSON.stringify(partnerTypes) === JSON.stringify(last.partnerTypes || ["Pribadi", "Gereja", "Perusahaan", "Instansi", "Yayasan"]);
    }

    // Check if the current local state matches the incoming profile prop (e.g. after a successful save)
    const matchesCurrentProfileProp = 
      name === profile.name &&
      address === profile.address &&
      phone === (profile.phone || '') &&
      email === (profile.email || '') &&
      website === (profile.website || '') &&
      npwp === (profile.npwp || '') &&
      skLegal === (profile.legalReg || '') &&
      kopTitle === (profile.kopTitle || 'EVANGELICAL STUDENT MOVEMENT') &&
      kopMotto === (profile.kopMotto || 'Kabar baik. Pemuridan. Misi.') &&
      signatureUrl === (profile.signatureUrl || '') &&
      signatureChairmanUrl === (profile.signatureChairmanUrl || '') &&
      signatureSecretaryUrl === (profile.signatureSecretaryUrl || '') &&
      signatureTreasurerUrl === (profile.signatureTreasurerUrl || '') &&
      stampUrl === (profile.stampUrl || '') &&
      logoUrl === (profile.logoUrl || '') &&
      systemTitle === (profile.systemTitle || 'ESM FMS') &&
      dashboardTitle === (profile.dashboardTitle || 'Institutional Executive ERP') &&
      JSON.stringify(regions) === JSON.stringify(profile.regions || ["Yogyakarta", "Solo", "Semarang", "Purwokerto"]) &&
      JSON.stringify(materialCategories) === JSON.stringify(profile.materialCategories || ["Materi Dasar / Siswa", "Siswa & Mahasiswa", "Alumni", "Pelatihan Pemimpin (PKK)", "Materi Umum / Publik"]) &&
      JSON.stringify(incomeAllocations) === JSON.stringify(profile.incomeAllocations || ["Gaji / Operasional", "Peralatan", "Kegiatan Khusus", "Lainnya"]) &&
      JSON.stringify(meetingDays) === JSON.stringify(profile.meetingDays || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]) &&
      JSON.stringify(memberKeaktifanStatuses) === JSON.stringify(profile.memberKeaktifanStatuses || ["Aktif", "Pasif", "Cuti", "Pindah"]) &&
      JSON.stringify(memberComponents) === JSON.stringify(profile.memberComponents || ["Siswa", "Mahasiswa", "Alumni", "Umum"]) &&
      JSON.stringify(partnerStatuses) === JSON.stringify(profile.partnerStatuses || ["Prospek", "Kontak Awal", "Presentasi", "Komitmen", "Donasi Pertama", "Aktif", "Tidak Aktif"]) &&
      JSON.stringify(partnerTypes) === JSON.stringify(profile.partnerTypes || ["Pribadi", "Gereja", "Perusahaan", "Instansi", "Yayasan"]);

    if (isFirstLoad || isSameAsLastSynced) {
      setName(profile.name);
      setAddress(profile.address);
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setWebsite(profile.website || '');
      setNpwp(profile.npwp || '');
      setSkLegal(profile.legalReg || '');
      setKopTitle(profile.kopTitle || 'EVANGELICAL STUDENT MOVEMENT');
      setKopMotto(profile.kopMotto || 'Kabar baik. Pemuridan. Misi.');
      setSignatureUrl(profile.signatureUrl || '');
      setSignatureChairmanUrl(profile.signatureChairmanUrl || '');
      setSignatureSecretaryUrl(profile.signatureSecretaryUrl || '');
      setSignatureTreasurerUrl(profile.signatureTreasurerUrl || '');
      setStampUrl(profile.stampUrl || '');
      setLogoUrl(profile.logoUrl || '');
      setIsSignatureDirty(false);
      setSystemTitle(profile.systemTitle || 'ESM FMS');
      setDashboardTitle(profile.dashboardTitle || 'Institutional Executive ERP');
      setRegions(profile.regions || ["Yogyakarta", "Solo", "Semarang", "Purwokerto"]);
      setMaterialCategories(profile.materialCategories || ["Materi Dasar / Siswa", "Siswa & Mahasiswa", "Alumni", "Pelatihan Pemimpin (PKK)", "Materi Umum / Publik"]);
      setIncomeAllocations(profile.incomeAllocations || ["Gaji / Operasional", "Peralatan", "Kegiatan Khusus", "Lainnya"]);
      setMeetingDays(profile.meetingDays || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]);
      setMemberKeaktifanStatuses(profile.memberKeaktifanStatuses || ["Aktif", "Pasif", "Cuti", "Pindah"]);
      setMemberComponents(profile.memberComponents || ["Siswa", "Mahasiswa", "Alumni", "Umum"]);
      setPartnerStatuses(profile.partnerStatuses || ["Prospek", "Kontak Awal", "Presentasi", "Komitmen", "Donasi Pertama", "Aktif", "Tidak Aktif"]);
      setPartnerTypes(profile.partnerTypes || ["Pribadi", "Gereja", "Perusahaan", "Instansi", "Yayasan"]);
      
      lastSyncedProfileRef.current = profile;
    } else if (matchesCurrentProfileProp) {
      lastSyncedProfileRef.current = profile;
    }
  }, [profile]);

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
      const res = await fetch(`/api/data/users?t=${Date.now()}`);
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

  const handleRotateImage = (
    currentUrl: string,
    setter: (val: string) => void,
    direction: 'cw' | 'ccw' = 'cw'
  ) => {
    if (!currentUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        if (direction === 'cw') {
          ctx.rotate((90 * Math.PI) / 180);
        } else {
          ctx.rotate((-90 * Math.PI) / 180);
        }
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        setter(canvas.toDataURL('image/png'));
        setIsSignatureDirty(true);
      }
    };
    img.src = currentUrl;
  };

  const handleRotateSignature = (direction: 'cw' | 'ccw' = 'cw') => {
    handleRotateImage(signatureUrl, setSignatureUrl, direction);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'Super Admin' && currentRole !== 'Ketua Yayasan') {
      alert('Akses Terbatas: Hanya Super Admin / Ketua Yayasan yang berhak mengubah identitas hukum lembaga.');
      return;
    }
    const updated: InstitutionalProfile = {
      ...profile,
      id: profile.id,
      name,
      address,
      phone,
      email,
      website,
      npwp,
      legalReg: skLegal,
      kopTitle,
      kopMotto,
      signatureUrl,
      stampUrl,
      signatureChairmanUrl,
      signatureSecretaryUrl,
      signatureTreasurerUrl,
      logoUrl,
    };
    onUpdateProfile(updated);
    setIsSignatureDirty(false);
    alert('Informasi legalitas profil institusi ESM berhasil diperbarui & dicadangkan.');
  };

  const handleSaveVariables = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'Super Admin' && currentRole !== 'Ketua Yayasan') {
      alert('Akses Terbatas: Hanya Super Admin / Ketua Yayasan yang berhak memodifikasi parameter utilitas sistem.');
      return;
    }
    const updated: InstitutionalProfile = {
      ...profile,
      name,
      address,
      phone,
      email,
      website,
      npwp,
      legalReg: skLegal,
      kopTitle,
      kopMotto,
      signatureUrl,
      stampUrl,
      signatureChairmanUrl,
      signatureSecretaryUrl,
      signatureTreasurerUrl,
      logoUrl,
      systemTitle,
      dashboardTitle,
      regions,
      materialCategories,
      incomeAllocations,
      meetingDays,
      memberKeaktifanStatuses,
      memberComponents,
      partnerStatuses,
      partnerTypes
    };
    onUpdateProfile(updated);
    alert('Sukses: Konfigurasi variabel kustom dan utilitas judul berhasil diperbarui & disimpan!');
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
        if (newOpRole === 'Staff') {
          const staffNik = `NIK-OP-${Date.now().toString().slice(-4)}`;
          const blankStaff = {
            nik: staffNik,
            name: newOpName.trim(),
            email: newOpEmail.toLowerCase().trim(),
            phone: '0812345678',
            address: 'Kantor Yayasan',
            position: 'Staf Pelaksana',
            division: 'Umum',
            status: 'Kontrak',
            joinedDate: new Date().toISOString().split('T')[0],
            salaryBase: 0,
            allowancePosition: 0,
            allowanceHousing: 0,
            allowanceTransport: 0,
            allowanceComm: 0,
            deleted: false,
            createdAt: new Date().toISOString()
          };
          await fetch(`/api/data/staff/${staffNik}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(blankStaff)
          });
        }
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
        if (targetUser.role === 'Staff') {
          try {
            const staffRes = await fetch('/api/data/staff');
            if (staffRes.ok) {
              const staffs = await staffRes.json();
              const hasStaff = staffs.some((s: any) => s.email?.toLowerCase().trim() === targetUser.email?.toLowerCase().trim());
              if (!hasStaff) {
                const staffNik = `NIK-OP-${Date.now().toString().slice(-4)}`;
                const blankStaff = {
                  nik: staffNik,
                  name: targetUser.name.trim(),
                  email: targetUser.email.toLowerCase().trim(),
                  phone: targetUser.phone || '0812345678',
                  address: 'Kantor Yayasan',
                  position: 'Staf Pelaksana',
                  division: 'Umum',
                  status: 'Kontrak',
                  joinedDate: new Date().toISOString().split('T')[0],
                  salaryBase: 0,
                  allowancePosition: 0,
                  allowanceHousing: 0,
                  allowanceTransport: 0,
                  allowanceComm: 0,
                  deleted: false,
                  createdAt: new Date().toISOString()
                };
                await fetch(`/api/data/staff/${staffNik}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(blankStaff)
                });
              }
            }
          } catch (staffErr) {
            console.error('Failed to auto-create staff during operator approval:', staffErr);
          }
        }
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

    if (userEmail?.toLowerCase().trim() === 'superadmin@esm.or.id') {
      alert('Proteksi Keamanan: Akun Super Admin bawaan sistem tidak boleh dihapus demi kelangsungan sistem.');
      return;
    }

    const targetUser = operators.find(op => op.email?.toLowerCase().trim() === userEmail?.toLowerCase().trim());
    if (!targetUser) {
      alert('Kesalahan: Operator tidak ditemukan.');
      return;
    }

    try {
      const cleanEmail = targetUser.email.toLowerCase().trim();
      
      // 1. Delete User Account with credentials
      const res = await fetch(`/api/data/users/${encodeURIComponent(cleanEmail)}?role=${encodeURIComponent(currentRole)}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentRole
        }
      });

      if (res.ok) {
        // Log user deletion audit
        const sessionUser = localStorage.getItem('esm_session_user');
        const userName = sessionUser ? JSON.parse(sessionUser).name : 'Super Admin';
        
        const auditId = `AUD-${Date.now()}`;
        await fetch(`/api/data/audits/${auditId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: auditId,
            userName: userName,
            userRole: currentRole,
            action: `[Akun Operator] Menonaktifkan akun operator: "${targetUser.name}" (${targetUser.email}) dengan hak akses: ${targetUser.role}.`,
            module: 'Sistem / Pelayanan',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
            deleted: false
          })
        });

        // 2. Check and delete associated staff records
        let staffAlertNote = '';
        try {
          const staffRes = await fetch('/api/data/staff');
          if (staffRes.ok) {
            const staffsData = await staffRes.json();
            const matchedStaff = staffsData.find((s: any) => s.email?.toLowerCase().trim() === cleanEmail);
            
            if (matchedStaff && !matchedStaff.deleted) {
              const staffDelId = matchedStaff.nik;
              const staffDelRes = await fetch(`/api/data/staff/${staffDelId}?role=${encodeURIComponent(currentRole)}`, {
                method: 'DELETE',
                headers: {
                  'x-user-role': currentRole
                }
              });
              
              if (staffDelRes.ok) {
                // Log staff deletion audit
                const staffAuditId = `AUD-STF-${Date.now()}`;
                await fetch(`/api/data/audits/${staffAuditId}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    id: staffAuditId,
                    userName: userName,
                    userRole: currentRole,
                    action: `[Database Staf] Menonaktifkan otomatis data staf terkait: NIK ${staffDelId} - "${matchedStaff.name}" (Email: ${cleanEmail}) karena akun operatornya dinonaktifkan oleh Super Admin.`,
                    module: 'Staf & HR',
                    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
                    deleted: false
                  })
                });
                staffAlertNote = ` Serta data kepegawaian staf terkait (${matchedStaff.name} - NIK: ${staffDelId}) berhasil dihapus (deleted: true) secara otomatis.`;
              }
            }
          }
        } catch (staffErr) {
          console.error('Error handling associated staff deletion:', staffErr);
        }

        alert(`Operator berhasil dihapus (soft-delete: status "deleted" diubah menjadi true).${staffAlertNote}`);
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

  const ketuaNode = orgTree?.find(n => n?.id === 'ketua' || n?.title?.toLowerCase().includes('ketua') || n?.id === 'ketua_yayasan');
  const ketuaNameResolved = ketuaNode?.name || 'Yusuf Raja Tamba';

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
          onClick={() => setActiveSubView('variables')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${
            activeSubView === 'variables' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
          title="Konfigurasi Dapatkan dropdown dinamis & ubah judul sistem"
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-505" /> Variabel & Utilitas Judul
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

            {/* CONFIG KOP SURAT DYNAMIC FIELDS */}
            <div className="sm:col-span-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/70 space-y-3 mt-2">
              <h4 className="font-bold text-slate-850 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 block animate-pulse"></span>
                Kustomisasi Kop Surat Resmi (Letterhead PDF Headings)
              </h4>
              <p className="text-slate-500 text-[10px] sm:text-[11px]">
                Ubah isi teks Baris 1 & Baris 2 (Motto) pada kop surat di PDF secara instan ("non-static"). Bagian logo, alamat, email, telepon, dan website di atas juga otomatis berubah menyesuaikan identitas hukum ini.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold text-[10px]">Nama Organisasi Kop Surat (Baris 1):</label>
                  <input 
                    type="text" 
                    value={kopTitle}
                    onChange={(e) => setKopTitle(e.target.value)}
                    placeholder="EVANGELICAL STUDENT MOVEMENT"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-semibold text-[10px]">Motto / Tagline Organisasi (Baris 2):</label>
                  <input 
                    type="text" 
                    value={kopMotto}
                    onChange={(e) => setKopMotto(e.target.value)}
                    placeholder="Kabar baik. Pemuridan. Misi."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-850 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 border-t border-slate-100/70 pt-4 mt-2 space-y-6">
              <div>
                <label className="text-slate-800 block mb-1 font-bold text-xs uppercase tracking-wide">
                  Media, Stempel Resmi, & Tanda Tangan Lembaga
                </label>
                <p className="text-slate-500 text-[11px]">
                  Unggah berkas gambar transparan (.png / .jpg) untuk disisipkan otomatis di kop surat, slip gaji, dan dokumen resmi lainnya.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LOGO RESMI YAYASAN */}
                <div className="bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl flex flex-col justify-between">
                  <div>
                    <label className="text-slate-700 block mb-1 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                      Logo Resmi Yayasan / Organisasi
                    </label>
                    <p className="text-slate-400 text-[10px] mb-3">Ditampilkan di header sistem & Kop Surat resmi.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center relative group w-32 h-24 overflow-hidden shadow-sm">
                          <img src={logoUrl} alt="Logo Resmi" className="max-h-20 max-w-full object-contain" referrerPolicy="no-referrer" />
                          <label className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer text-[10px] font-bold gap-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const optimizedUrl = await optimizeAndResizeImage(file);
                                  setLogoUrl(optimizedUrl);
                                  setIsSignatureDirty(true);
                                }
                              }}
                              className="hidden"
                            />
                            <Edit className="w-3.5 h-3.5 text-white" />
                            Ganti Logo
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-[9px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleRotateImage(logoUrl, setLogoUrl, 'ccw')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CCW"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateImage(logoUrl, setLogoUrl, 'cw')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CW"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => { setLogoUrl(''); setIsSignatureDirty(true); }}
                            className="p-1 text-red-600 hover:bg-red-50 hover:text-red-700 rounded cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-white hover:bg-slate-100/50 transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const optimizedUrl = await optimizeAndResizeImage(file);
                              setLogoUrl(optimizedUrl);
                              setIsSignatureDirty(true);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Image className="w-5 h-5 mb-1 text-slate-400 group-hover:text-indigo-505 transition-colors" />
                        <span className="text-[10px] font-semibold text-slate-500">Pilih Logo</span>
                        <span className="text-[7.5px] text-slate-400">PNG / JPG transparan</span>
                      </div>
                    )}
                    <div className="flex-1 text-[10px] text-slate-500 leading-snug">
                      Unggah logo yayasan agar tercetak otomatis di kop surat legal dan kop gaji pegawai yayasan.
                    </div>
                  </div>
                </div>

                {/* STEMPEL RESMI YAYASAN */}
                <div className="bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl flex flex-col justify-between">
                  <div>
                    <label className="text-slate-700 block mb-1 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                      Stempel Resmi Yayasan ESM
                    </label>
                    <p className="text-slate-400 text-[10px] mb-3">Akan dicetak di belakang tanda tangan (Pihak Kiri/Ketua) pada PDF.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {stampUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center relative group w-32 h-24 overflow-hidden shadow-sm">
                          <img src={stampUrl} alt="Stempel Resmi" className="max-h-20 max-w-full object-contain" />
                          <label className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer text-[10px] font-bold gap-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const optimizedUrl = await optimizeAndResizeImage(file);
                                  setStampUrl(optimizedUrl);
                                  setIsSignatureDirty(true);
                                }
                              }}
                              className="hidden"
                            />
                            <Edit className="w-3.5 h-3.5 text-white" />
                            Ganti Stempel
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-[9px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleRotateImage(stampUrl, setStampUrl, 'ccw')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CCW"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateImage(stampUrl, setStampUrl, 'cw')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CW"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => { setStampUrl(''); setIsSignatureDirty(true); }}
                            className="p-1 text-red-600 hover:bg-red-50 hover:text-red-700 rounded cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-white hover:bg-slate-100/50 transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const optimizedUrl = await optimizeAndResizeImage(file);
                              setStampUrl(optimizedUrl);
                              setIsSignatureDirty(true);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Image className="w-5 h-5 mb-1 text-slate-400 group-hover:text-indigo-505 transition-colors" />
                        <span className="text-[10px] font-semibold text-slate-500">Pilih Berkas</span>
                        <span className="text-[7.5px] text-slate-400">PNG Transparan</span>
                      </div>
                    )}
                    <div className="flex-1 text-[10px] text-slate-500 leading-snug">
                      Gunakan stempel berwarna biru/ungu berlatar belakang transparan agar menyatu dengan baik pada surat.
                    </div>
                  </div>
                </div>

                {/* KETUA YAYASAN */}
                <div className="bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl flex flex-col justify-between">
                  <div>
                    <label className="text-slate-700 block mb-1 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      Tanda Tangan Ketua ({ketuaNameResolved})
                    </label>
                    <p className="text-slate-400 text-[10px] mb-3">Tanda tangan resmi Ketua Yayasan ESM.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {signatureChairmanUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center relative group w-32 h-24 overflow-hidden shadow-sm">
                          <img src={signatureChairmanUrl} alt="TTD Ketua" className="max-h-20 max-w-full object-contain" />
                          <label className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer text-[10px] font-bold gap-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const optimizedUrl = await optimizeAndResizeImage(file);
                                  setSignatureChairmanUrl(optimizedUrl);
                                  setIsSignatureDirty(true);
                                }
                              }}
                              className="hidden"
                            />
                            <Edit className="w-3.5 h-3.5 text-white" />
                            Ganti TTD
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-[9px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleRotateImage(signatureChairmanUrl, setSignatureChairmanUrl, 'ccw')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CCW"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateImage(signatureChairmanUrl, setSignatureChairmanUrl, 'cw')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CW"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => { setSignatureChairmanUrl(''); setIsSignatureDirty(true); }}
                            className="p-1 text-red-600 hover:bg-red-50 hover:text-red-700 rounded cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-white hover:bg-slate-100/50 transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const optimizedUrl = await optimizeAndResizeImage(file);
                              setSignatureChairmanUrl(optimizedUrl);
                              setIsSignatureDirty(true);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Image className="w-5 h-5 mb-1 text-slate-450 group-hover:text-indigo-505 transition-colors" />
                        <span className="text-[10px] font-semibold text-slate-500">Pilih Berkas</span>
                        <span className="text-[7.5px] text-slate-400">PNG Transparan</span>
                      </div>
                    )}
                    <div className="flex-1 text-[10px] text-slate-500 leading-snug">
                      Tanda tangan digital Ketua Yayasan yang akan disisipkan ex-officio pada surat keluar Pihak Kiri.
                    </div>
                  </div>
                </div>

                {/* SEKRETARIS YAYASAN */}
                <div className="bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl flex flex-col justify-between">
                  <div>
                    <label className="text-slate-700 block mb-1 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-555 inline-block"></span>
                      Tanda Tangan Sekretaris (Ahmad Faisal)
                    </label>
                    <p className="text-slate-400 text-[10px] mb-3">Tanda tangan resmi Sekretaris Yayasan ESM.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {signatureSecretaryUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center relative group w-32 h-24 overflow-hidden shadow-sm">
                          <img src={signatureSecretaryUrl} alt="TTD Sekretaris" className="max-h-20 max-w-full object-contain" />
                          <label className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer text-[10px] font-bold gap-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const optimizedUrl = await optimizeAndResizeImage(file);
                                  setSignatureSecretaryUrl(optimizedUrl);
                                  setIsSignatureDirty(true);
                                }
                              }}
                              className="hidden"
                            />
                            <Edit className="w-3.5 h-3.5 text-white" />
                            Ganti TTD
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-[9px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleRotateImage(signatureSecretaryUrl, setSignatureSecretaryUrl, 'ccw')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CCW"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRotateImage(signatureSecretaryUrl, setSignatureSecretaryUrl, 'cw')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CW"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => { setSignatureSecretaryUrl(''); setIsSignatureDirty(true); }}
                            className="p-1 text-red-600 hover:bg-red-50 hover:text-red-700 rounded cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-white hover:bg-slate-100/50 transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const optimizedUrl = await optimizeAndResizeImage(file);
                              setSignatureSecretaryUrl(optimizedUrl);
                              setIsSignatureDirty(true);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Image className="w-5 h-5 mb-1 text-slate-450 group-hover:text-indigo-505 transition-colors" />
                        <span className="text-[10px] font-semibold text-slate-500">Pilih Berkas</span>
                        <span className="text-[7.5px] text-slate-400">PNG Transparan</span>
                      </div>
                    )}
                    <div className="flex-1 text-[10px] text-slate-500 leading-snug">
                      Tanda tangan digital Sekretaris yang akan disisipkan ex-officio pada surat keluar Pihak Kanan.
                    </div>
                  </div>
                </div>

                {/* BENDAHARA / SLIP GAJI */}
                <div className="bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl flex flex-col justify-between">
                  <div>
                    <label className="text-slate-700 block mb-1 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
                      Tanda Tangan Bendahara / Slip Gaji
                    </label>
                    <p className="text-slate-400 text-[10px] mb-3">Tanda tangan resmi Bendahara Yayasan (Sarah Sitorus).</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {signatureTreasurerUrl || signatureUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center relative group w-32 h-24 overflow-hidden shadow-sm">
                          <img src={signatureTreasurerUrl || signatureUrl} alt="TTD Bendahara" className="max-h-20 max-w-full object-contain" />
                          <label className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer text-[10px] font-bold gap-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const optimizedUrl = await optimizeAndResizeImage(file);
                                  setSignatureTreasurerUrl(optimizedUrl);
                                  setSignatureUrl(optimizedUrl);
                                  setIsSignatureDirty(true);
                                }
                              }}
                              className="hidden"
                            />
                            <Edit className="w-3.5 h-3.5 text-white" />
                            Ganti TTD
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-semibold text-[9px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => {
                              const targetVal = signatureTreasurerUrl || signatureUrl;
                              handleRotateImage(targetVal, (newVal) => {
                                setSignatureTreasurerUrl(newVal);
                                setSignatureUrl(newVal);
                              }, 'ccw');
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CCW"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const targetVal = signatureTreasurerUrl || signatureUrl;
                              handleRotateImage(targetVal, (newVal) => {
                                setSignatureTreasurerUrl(newVal);
                                setSignatureUrl(newVal);
                              }, 'cw');
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Putar CW"
                          >
                            <RotateCw className="w-3 h-3" />
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => { setSignatureTreasurerUrl(''); setSignatureUrl(''); setIsSignatureDirty(true); }}
                            className="p-1 text-red-600 hover:bg-red-50 hover:text-red-700 rounded cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-white hover:bg-slate-100/50 transition-colors relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const optimizedUrl = await optimizeAndResizeImage(file);
                              setSignatureTreasurerUrl(optimizedUrl);
                              setSignatureUrl(optimizedUrl);
                              setIsSignatureDirty(true);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <Image className="w-5 h-5 mb-1 text-slate-450 group-hover:text-indigo-505 transition-colors" />
                        <span className="text-[10px] font-semibold text-slate-500">Pilih Berkas</span>
                        <span className="text-[7.5px] text-slate-400">PNG Transparan</span>
                      </div>
                    )}
                    <div className="flex-1 text-[10px] text-slate-500 leading-snug">
                      Tanda tangan digital Bendahara yang akan disisipkan otomatis di lembar slip gaji karyawan.
                    </div>
                  </div>
                </div>
              </div>

              {isSignatureDirty && (
                <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[10.5px] font-medium flex items-start gap-2 animate-pulse shadow-sm">
                  <span className="text-sm font-bold leading-none text-amber-605">⚠️</span>
                  <div>
                    <strong>Perubahan Belum Disimpan!</strong>
                    <p className="text-[9.5px] mt-0.5 text-amber-750">
                      Anda harus menekan tombol <strong>"Simpan Identitas Lembaga"</strong> di bagian bawah untuk menyimpan gambar/media stempel dan tanda tangan baru.
                    </p>
                  </div>
                </div>
              )}
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
                            onClick={() => {
                              const isAuthorized = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan';
                              if (!isAuthorized) {
                                alert('Akses Terbatas: Hanya Super Admin / Ketua Yayasan yang berhak menghapus struktur.');
                                return;
                              }
                              const nodeToDelete = orgTree.find(n => n.id === activeNodeId);
                              const titleLabel = nodeToDelete?.title || activeNodeId;
                              setDeleteConfirmNode({ id: activeNodeId, title: titleLabel });
                            }}
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
                            onClick={() => {
                              const isAuthorized = currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan';
                              if (!isAuthorized) {
                                alert('Akses Terbatas: Hanya Ketua Yayasan atau Super Admin yang dapat menonaktifkan operator.');
                                return;
                              }
                              if (op.email?.toLowerCase().trim() === 'superadmin@esm.or.id') {
                                alert('Proteksi Keamanan: Akun Super Admin bawaan sistem tidak boleh dihapus demi kelangsungan sistem.');
                                return;
                              }
                              setDeleteConfirmOp({ email: op.email, role: op.role, name: op.name });
                            }}
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

      {/* SUBVIEW: VARIABLES & UTILITY TITLES */}
      {activeSubView === 'variables' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-xs text-left">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Sliders className="w-4 h-4 text-indigo-650" /> Variabel Dropdown Dinamis & Utilitas Judul</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">Semua data dropdown untuk isian formulir di sistem dapat diedit, ditambah, atau dihapus secara langsung di sini oleh operator Super Admin atau Ketua Yayasan.</p>
          </div>

          <form onSubmit={handleSaveVariables} className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-600 block mb-1 font-bold">Judul Singkat Sistem (Header Atas) :</label>
                <input 
                  type="text" 
                  value={systemTitle}
                  onChange={(e) => setSystemTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-850 font-extrabold text-sm bg-white"
                  placeholder="Contoh: ESM FMS"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Muncul sebagai label utama di pojok kiri atas dasbor.</p>
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-bold">Deskripsi / Sub-Judul Dashboard :</label>
                <input 
                  type="text" 
                  value={dashboardTitle}
                  onChange={(e) => setDashboardTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-850 bg-white"
                  placeholder="Contoh: Institutional Executive ERP"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Naskah deskripsi penjelasan di bawah logo dasbor atas.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1.5">📍 Daftar Wilayah & Cabang ({regions.length})</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {regions.map((reg, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-[11px] font-semibold border border-blue-100">
                        {reg}
                        <button 
                          type="button"
                          onClick={() => setRegions(prev => prev.filter(r => r !== reg))}
                          className="hover:text-red-650 font-extrabold ml-1 text-xs cursor-pointer focus:outline-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    placeholder="Tambah wilayah baru..."
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newRegion.trim() && !regions.includes(newRegion.trim())) {
                          setRegions(prev => [...prev, newRegion.trim()]);
                          setNewRegion('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newRegion.trim() && !regions.includes(newRegion.trim())) {
                        setRegions(prev => [...prev, newRegion.trim()]);
                        setNewRegion('');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1.5">📚 Kategori Sasaran Kurikulum ({materialCategories.length})</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {materialCategories.map((cat, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-1 rounded-lg text-[11px] font-semibold border border-amber-100">
                        {cat}
                        <button 
                          type="button"
                          onClick={() => setMaterialCategories(prev => prev.filter(c => c !== cat))}
                          className="hover:text-red-650 font-extrabold ml-1 text-xs cursor-pointer focus:outline-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newMaterialCat}
                    onChange={(e) => setNewMaterialCat(e.target.value)}
                    placeholder="Tambah sasaran kurikulum..."
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newMaterialCat.trim() && !materialCategories.includes(newMaterialCat.trim())) {
                          setMaterialCategories(prev => [...prev, newMaterialCat.trim()]);
                          setNewMaterialCat('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newMaterialCat.trim() && !materialCategories.includes(newMaterialCat.trim())) {
                        setMaterialCategories(prev => [...prev, newMaterialCat.trim()]);
                        setNewMaterialCat('');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1.5">💼 Tujuan Peruntukan Pemasukan ({incomeAllocations.length})</h4>
                  <p className="text-[10px] text-slate-400 mb-2">Pilihan alokasi opsional transaksi pemasukan: Gaji/Operasional, Peralatan, dll.</p>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {incomeAllocations.map((alloc, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 px-2 py-1 rounded-lg text-[11px] font-semibold border border-purple-100">
                        {alloc}
                        <button 
                          type="button"
                          onClick={() => setIncomeAllocations(prev => prev.filter(a => a !== alloc))}
                          className="hover:text-red-650 font-extrabold ml-1 text-xs cursor-pointer focus:outline-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newAllocation}
                    onChange={(e) => setNewAllocation(e.target.value)}
                    placeholder="Tambah tujuan baru..."
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newAllocation.trim() && !incomeAllocations.includes(newAllocation.trim())) {
                          setIncomeAllocations(prev => [...prev, newAllocation.trim()]);
                          setNewAllocation('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newAllocation.trim() && !incomeAllocations.includes(newAllocation.trim())) {
                        setIncomeAllocations(prev => [...prev, newAllocation.trim()]);
                        setNewAllocation('');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1.5">📅 Opsi Hari Pertemuan ({meetingDays.length})</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {meetingDays.map((day, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 px-2 py-1 rounded-lg text-[11px] font-semibold border border-teal-100">
                        {day}
                        <button 
                          type="button"
                          onClick={() => setMeetingDays(prev => prev.filter(d => d !== day))}
                          className="hover:text-red-650 font-extrabold ml-1 text-xs cursor-pointer focus:outline-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newMeetingDay}
                    onChange={(e) => setNewMeetingDay(e.target.value)}
                    placeholder="Tambah hari..."
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newMeetingDay.trim() && !meetingDays.includes(newMeetingDay.trim())) {
                          setMeetingDays(prev => [...prev, newMeetingDay.trim()]);
                          setNewMeetingDay('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newMeetingDay.trim() && !meetingDays.includes(newMeetingDay.trim())) {
                        setMeetingDays(prev => [...prev, newMeetingDay.trim()]);
                        setNewMeetingDay('');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1.5">🟢 Status Keaktifan Anggota ({memberKeaktifanStatuses.length})</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {memberKeaktifanStatuses.map((stat, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[11px] font-semibold border border-emerald-100">
                        {stat}
                        <button 
                          type="button"
                          onClick={() => setMemberKeaktifanStatuses(prev => prev.filter(s => s !== stat))}
                          className="hover:text-red-650 font-extrabold ml-1 text-xs cursor-pointer focus:outline-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newKeaktifanStatus}
                    onChange={(e) => setNewKeaktifanStatus(e.target.value)}
                    placeholder="Tambah status..."
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newKeaktifanStatus.trim() && !memberKeaktifanStatuses.includes(newKeaktifanStatus.trim())) {
                          setMemberKeaktifanStatuses(prev => [...prev, newKeaktifanStatus.trim()]);
                          setNewKeaktifanStatus('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newKeaktifanStatus.trim() && !memberKeaktifanStatuses.includes(newKeaktifanStatus.trim())) {
                        setMemberKeaktifanStatuses(prev => [...prev, newKeaktifanStatus.trim()]);
                        setNewKeaktifanStatus('');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1.5">👥 Komponen Pembinaan ESM ({memberComponents.length})</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {memberComponents.map((comp, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-1 rounded-lg text-[11px] font-semibold border border-sky-100">
                        {comp}
                        <button 
                          type="button"
                          onClick={() => setMemberComponents(prev => prev.filter(c => c !== comp))}
                          className="hover:text-red-650 font-extrabold ml-1 text-xs cursor-pointer focus:outline-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newMemberComponent}
                    onChange={(e) => setNewMemberComponent(e.target.value)}
                    placeholder="Tambah komponen..."
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newMemberComponent.trim() && !memberComponents.includes(newMemberComponent.trim())) {
                          setMemberComponents(prev => [...prev, newMemberComponent.trim()]);
                          setNewMemberComponent('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newMemberComponent.trim() && !memberComponents.includes(newMemberComponent.trim())) {
                        setMemberComponents(prev => [...prev, newMemberComponent.trim()]);
                        setNewMemberComponent('');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1.5">🤝 Status Komitmen Mitra ({partnerStatuses.length})</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {partnerStatuses.map((pStat, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-1 rounded-lg text-[11px] font-semibold border border-rose-100">
                        {pStat}
                        <button 
                          type="button"
                          onClick={() => setPartnerStatuses(prev => prev.filter(s => s !== pStat))}
                          className="hover:text-red-650 font-extrabold ml-1 text-xs cursor-pointer focus:outline-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newPartnerStatus}
                    onChange={(e) => setNewPartnerStatus(e.target.value)}
                    placeholder="Tambah status mitra..."
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPartnerStatus.trim() && !partnerStatuses.includes(newPartnerStatus.trim())) {
                          setPartnerStatuses(prev => [...prev, newPartnerStatus.trim()]);
                          setNewPartnerStatus('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newPartnerStatus.trim() && !partnerStatuses.includes(newPartnerStatus.trim())) {
                        setPartnerStatuses(prev => [...prev, newPartnerStatus.trim()]);
                        setNewPartnerStatus('');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="border border-slate-150 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 border-b pb-1.5">🏢 Jenis/Tipe Profil Mitra ({partnerTypes.length})</h4>
                  <div className="flex flex-wrap gap-1.5 mb-3 max-h-36 overflow-y-auto">
                    {partnerTypes.map((pType, index) => (
                      <span key={index} className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-lg text-[11px] font-semibold border border-orange-100">
                        {pType}
                        <button 
                          type="button"
                          onClick={() => setPartnerTypes(prev => prev.filter(t => t !== pType))}
                          className="hover:text-red-650 font-extrabold ml-1 text-xs cursor-pointer focus:outline-none"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newPartnerType}
                    onChange={(e) => setNewPartnerType(e.target.value)}
                    placeholder="Tambah jenis mitra..."
                    className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPartnerType.trim() && !partnerTypes.includes(newPartnerType.trim())) {
                          setPartnerTypes(prev => [...prev, newPartnerType.trim()]);
                          setNewPartnerType('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newPartnerType.trim() && !partnerTypes.includes(newPartnerType.trim())) {
                        setPartnerTypes(prev => [...prev, newPartnerType.trim()]);
                        setNewPartnerType('');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit"
                disabled={!(currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan')}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan & Sinkronisasi Variabel Sistem
              </button>
            </div>
          </form>

          {/* DATABASE CLEANSLATE & CLEANSING AGENT */}
          {(currentRole === 'Super Admin' || currentRole === 'Ketua Yayasan') && (
            <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="text-left">
                  <h4 className="font-bold text-rose-900 text-sm flex items-center gap-1.5 leading-none">
                    <Trash2 className="w-4 h-4 text-rose-600 animate-pulse" />
                    Pusat Pembersihan Data Kritis (Data Cleansing & Reset)
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-1.5 max-w-xl leading-relaxed">
                    Sesuai instruksi kebijakan, fitur ini bertujuan menghapus seluruh entitas data testing/percobaan (Keuangan, Anggota, Rekaman Payroll, Surat-menyurat, Dokumen, dll) secara tuntas/cleansing dari Firestore, serta mereset user operator kembali ke 5 akun standar yayasan dengan profil staf yang sinkron.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={async () => {
                    const confirmRes = window.confirm('PERINGATAN KRITIS: Anda akan menghapus seluruh data testing di sistem dan mengembalikan database ke kondisi awal bersih (clean slate). Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin?');
                    if (!confirmRes) return;
                    
                    try {
                      const res = await fetch('/api/system/cleanse', { method: 'POST' });
                      const result = await res.json();
                      if (result.success) {
                        alert('SUKSES: Database berhasil dibersihkan (cleansing). Aplikasi akan dimuat ulang otomatis untuk menyegarkan data.');
                        window.location.reload();
                      } else {
                        alert('Gagal membersihkan data: ' + result.error);
                      }
                    } catch (err: any) {
                      alert('Error koneksi saat melakukan cleansing: ' + err.message);
                    }
                  }}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer transition-colors text-xs flex items-center gap-2 shrink-0 shadow-sm shadow-rose-200"
                >
                  <Trash2 className="w-4 h-4" /> Cleansing Data Testing
                </button>
              </div>
            </div>
          )}
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

      {/* Custom Modal Confirmation for Deleting Operator */}
      {deleteConfirmOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Operator</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus operator <strong className="text-slate-800">"{deleteConfirmOp.name}"</strong> ({deleteConfirmOp.email})? 
              Tindakan ini akan mengubah status data <code className="bg-slate-100 text-red-600 px-1 py-0.5 rounded text-[10px] font-mono">deleted: true</code> (soft delete).
            </p>
            
            {currentRole === 'Super Admin' && (
              <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-[11px] text-amber-800 leading-normal font-medium">
                <strong>Info Kepegawaian & Staf:</strong> Jika operator ini juga tercatat di Staff Database, data kepegawaiannya akan secara otomatis ikut dinonaktifkan (deleted: true) secara menyeluruh.
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOp(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const email = deleteConfirmOp.email;
                  const role = deleteConfirmOp.role;
                  setDeleteConfirmOp(null);
                  await handleDeleteOperator(email, role);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-red-100"
              >
                Ya, Hapus Operator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal Confirmation for Deleting Org Tree Node */}
      {deleteConfirmNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Jabatan</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus struktur jabatan <strong className="text-slate-800">"{deleteConfirmNode.title}"</strong> (ID: {deleteConfirmNode.id}) dari bagan organisasi?
            </p>
            
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmNode(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const nodeId = deleteConfirmNode.id;
                  setDeleteConfirmNode(null);
                  await handleDeleteStructureNode(nodeId);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm shadow-red-100"
              >
                Ya, Hapus Jabatan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
