/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  HeartHandshake,
  Plus,
  Search,
  Users,
  Download,
  Phone,
  Calendar,
  MapPin,
  Sparkles,
  CheckCircle2,
  UserPlus,
  Trash,
  Save,
  Edit,
  ArrowRight,
  Clock,
  History,
  GraduationCap
} from 'lucide-react';
import {
  MinistryRelation,
  MinistryRelationStage,
  MinistryRelationStageLog,
  SmallGroup,
  Member,
  InstitutionalProfile
} from '../types';
import { exportToCSV } from '../utils/export';

interface MinistryRelationsTabProps {
  ministryRelations: MinistryRelation[];
  members: Member[];
  groups: SmallGroup[];
  onAddMinistryRelation: (r: MinistryRelation) => void;
  onUpdateMinistryRelation: (r: MinistryRelation) => void;
  onDeleteMinistryRelation: (id: string) => void;
  onRegisterAsMember: (rel: MinistryRelation) => void;
  currentRole: string;
  profile?: InstitutionalProfile;
}

export default function MinistryRelationsTab({
  ministryRelations = [],
  members = [],
  groups = [],
  onAddMinistryRelation,
  onUpdateMinistryRelation,
  onDeleteMinistryRelation,
  onRegisterAsMember,
  currentRole,
  profile
}: MinistryRelationsTabProps) {
  const isEditable = ['Super Admin', 'Ketua Yayasan', 'Pembina Yayasan', 'Sekretaris', 'Staff', 'Volunteer'].includes(currentRole);

  const RELATION_STAGES: MinistryRelationStage[] = ['Kenalan', 'Berelasi', 'Diberitakan Injil', 'Dimuridkan'];

  // Search & Filter state
  const [relationSearch, setRelationSearch] = useState('');
  const [relationRegionFilter, setRelationRegionFilter] = useState('all');
  const [relationPicFilter, setRelationPicFilter] = useState('all');

  // Modal Form state (Create & Edit)
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [editingRelation, setEditingRelation] = useState<MinistryRelation | null>(null);
  const [relFullName, setRelFullName] = useState('');
  const [relNickName, setRelNickName] = useState('');
  const [relGender, setRelGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [relPhone, setRelPhone] = useState('');
  const [relCampusOrSchool, setRelCampusOrSchool] = useState('');
  const [relCity, setRelCity] = useState('');
  const [relRegion, setRelRegion] = useState(profile?.regions?.[0] || 'Jabodetabek');
  const [relStage, setRelStage] = useState<MinistryRelationStage>('Kenalan');
  const [relPicStaffOrLeader, setRelPicStaffOrLeader] = useState('');
  const [relNotes, setRelNotes] = useState('');
  const [relLastContactDate, setRelLastContactDate] = useState(new Date().toISOString().split('T')[0]);
  const [relTargetGroupId, setRelTargetGroupId] = useState('');

  // History viewer modal
  const [viewingHistoryRelation, setViewingHistoryRelation] = useState<MinistryRelation | null>(null);

  // Delete confirm state
  const [deleteConfirmRelation, setDeleteConfirmRelation] = useState<MinistryRelation | null>(null);

  const safeRelations = Array.isArray(ministryRelations) ? ministryRelations : [];

  const filteredRelations = safeRelations.filter(rel => {
    const term = relationSearch.toLowerCase();
    const matchesSearch =
      (rel.fullName || '').toLowerCase().includes(term) ||
      (rel.nickName || '').toLowerCase().includes(term) ||
      (rel.campusOrSchool || '').toLowerCase().includes(term) ||
      (rel.picStaffOrLeader || '').toLowerCase().includes(term) ||
      (rel.city || '').toLowerCase().includes(term) ||
      (rel.phone || '').includes(term);
    const matchesRegion = relationRegionFilter === 'all' || rel.region === relationRegionFilter;
    const matchesPic = relationPicFilter === 'all' || rel.picStaffOrLeader === relationPicFilter;
    return matchesSearch && matchesRegion && matchesPic;
  });

  const getStageColor = (stage: MinistryRelationStage) => {
    switch (stage) {
      case 'Kenalan':
        return {
          headerBg: 'bg-[#f4f7fb] border-[#d6e0ec] text-[#243e5c]',
          badge: 'bg-white text-[#243e5c] border-[#d6e0ec]',
          indicator: 'bg-[#507299]'
        };
      case 'Berelasi':
        return {
          headerBg: 'bg-[#fbf7f0] border-[#ebdfcb] text-[#5e4b2d]',
          badge: 'bg-white text-[#5e4b2d] border-[#ebdfcb]',
          indicator: 'bg-[#b88f55]'
        };
      case 'Diberitakan Injil':
        return {
          headerBg: 'bg-[#f8f5f9] border-[#e6dce8] text-[#533c5e]',
          badge: 'bg-white text-[#533c5e] border-[#e6dce8]',
          indicator: 'bg-[#8a6b98]'
        };
      case 'Dimuridkan':
        return {
          headerBg: 'bg-[#f1f6f2] border-[#d4e2d7] text-[#274935]',
          badge: 'bg-white text-[#274935] border-[#d4e2d7]',
          indicator: 'bg-[#4f8060]'
        };
      default:
        return {
          headerBg: 'bg-slate-50 border-slate-200 text-slate-800',
          badge: 'bg-white text-slate-700 border-slate-200',
          indicator: 'bg-slate-400'
        };
    }
  };

  const getNextStage = (current: MinistryRelationStage): MinistryRelationStage => {
    if (current === 'Kenalan') return 'Berelasi';
    if (current === 'Berelasi') return 'Diberitakan Injil';
    if (current === 'Diberitakan Injil') return 'Dimuridkan';
    return 'Dimuridkan';
  };

  const getPrevStage = (current: MinistryRelationStage): MinistryRelationStage => {
    if (current === 'Dimuridkan') return 'Diberitakan Injil';
    if (current === 'Diberitakan Injil') return 'Berelasi';
    if (current === 'Berelasi') return 'Kenalan';
    return 'Kenalan';
  };

  // Helper to check if relation is registered in member database
  const isRelationRegisteredAsMember = (rel: MinistryRelation) => {
    if (rel.memberId && members.some(m => m.id === rel.memberId)) return true;
    return members.some(
      m =>
        (m.outreachRelationId && m.outreachRelationId === rel.id) ||
        (m.fullName && rel.fullName && m.fullName.toLowerCase().trim() === rel.fullName.toLowerCase().trim()) ||
        (rel.phone && m.phone && m.phone.replace(/\D/g, '') === rel.phone.replace(/\D/g, '') && rel.phone.length > 5)
    );
  };

  const handleStageTransition = (rel: MinistryRelation, newStage: MinistryRelationStage) => {
    const today = new Date().toISOString().split('T')[0];
    const existingHistory = Array.isArray(rel.stageHistory) ? [...rel.stageHistory] : [];
    
    // Check if transition is actually changing
    if (rel.stage === newStage && existingHistory.length > 0) return;

    const newLog: MinistryRelationStageLog = {
      stage: newStage,
      date: today,
      notes: rel.notes,
      pic: rel.picStaffOrLeader
    };

    const updatedRel: MinistryRelation = {
      ...rel,
      stage: newStage,
      lastContactDate: today,
      stageHistory: [...existingHistory, newLog]
    };

    onUpdateMinistryRelation(updatedRel);

    // If moving to Dimuridkan and not yet registered, trigger redirect to Member Registration
    if (newStage === 'Dimuridkan' && !isRelationRegisteredAsMember(updatedRel)) {
      onRegisterAsMember(updatedRel);
    }
  };

  const openAddRelation = () => {
    setEditingRelation(null);
    setRelFullName('');
    setRelNickName('');
    setRelGender('Laki-laki');
    setRelPhone('');
    setRelCampusOrSchool('');
    setRelCity('');
    setRelRegion(profile?.regions?.[0] || 'Jabodetabek');
    setRelStage('Kenalan');
    setRelPicStaffOrLeader(groups[0]?.leaderName || 'Vivi Fransiska');
    setRelNotes('');
    setRelLastContactDate(new Date().toISOString().split('T')[0]);
    setRelTargetGroupId('');
    setIsRelationModalOpen(true);
  };

  const openEditRelation = (rel: MinistryRelation) => {
    setEditingRelation(rel);
    setRelFullName(rel.fullName || '');
    setRelNickName(rel.nickName || '');
    setRelGender(rel.gender || 'Laki-laki');
    setRelPhone(rel.phone || '');
    setRelCampusOrSchool(rel.campusOrSchool || '');
    setRelCity(rel.city || '');
    setRelRegion(rel.region || profile?.regions?.[0] || 'Jabodetabek');
    setRelStage(rel.stage);
    setRelPicStaffOrLeader(rel.picStaffOrLeader || '');
    setRelNotes(rel.notes || '');
    setRelLastContactDate(rel.lastContactDate || new Date().toISOString().split('T')[0]);
    setRelTargetGroupId(rel.targetGroupId || '');
    setIsRelationModalOpen(true);
  };

  const handleSaveRelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relFullName.trim()) {
      alert('Nama lengkap relasi pelayanan wajib diisi.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    if (editingRelation) {
      const existingHistory = Array.isArray(editingRelation.stageHistory) ? [...editingRelation.stageHistory] : [];
      let nextHistory = existingHistory;

      // If stage changed during edit, append log
      if (editingRelation.stage !== relStage || existingHistory.length === 0) {
        nextHistory = [
          ...existingHistory,
          {
            stage: relStage,
            date: today,
            notes: relNotes.trim() || undefined,
            pic: relPicStaffOrLeader.trim() || undefined
          }
        ];
      }

      const updatedRel: MinistryRelation = {
        ...editingRelation,
        fullName: relFullName.trim(),
        nickName: relNickName.trim() || undefined,
        gender: relGender,
        phone: relPhone.trim() || undefined,
        campusOrSchool: relCampusOrSchool.trim() || undefined,
        city: relCity.trim() || undefined,
        region: relRegion,
        stage: relStage,
        stageHistory: nextHistory,
        picStaffOrLeader: relPicStaffOrLeader.trim(),
        notes: relNotes.trim() || undefined,
        lastContactDate: relLastContactDate || today,
        targetGroupId: relTargetGroupId || undefined,
      };

      onUpdateMinistryRelation(updatedRel);
      setIsRelationModalOpen(false);

      if (relStage === 'Dimuridkan' && !isRelationRegisteredAsMember(updatedRel)) {
        onRegisterAsMember(updatedRel);
      }
    } else {
      const newId = `REL-${Date.now().toString().slice(-6)}`;
      const initialLog: MinistryRelationStageLog = {
        stage: relStage,
        date: today,
        notes: relNotes.trim() || 'Awal penjangkauan relasi pelayanan',
        pic: relPicStaffOrLeader.trim() || 'Staf Pembina'
      };

      const newRel: MinistryRelation = {
        id: newId,
        fullName: relFullName.trim(),
        nickName: relNickName.trim() || undefined,
        gender: relGender,
        phone: relPhone.trim() || undefined,
        campusOrSchool: relCampusOrSchool.trim() || undefined,
        city: relCity.trim() || undefined,
        region: relRegion,
        stage: relStage,
        stageHistory: [initialLog],
        picStaffOrLeader: relPicStaffOrLeader.trim() || 'Staf Pembina',
        notes: relNotes.trim() || undefined,
        lastContactDate: relLastContactDate || today,
        targetGroupId: relTargetGroupId || undefined,
        createdAt: new Date().toISOString()
      };

      onAddMinistryRelation(newRel);
      setIsRelationModalOpen(false);

      if (relStage === 'Dimuridkan') {
        onRegisterAsMember(newRel);
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredRelations.length === 0) {
      alert('Tidak ada data relasi pelayanan untuk diekspor');
      return;
    }

    const headers = ['No', 'ID', 'Nama Lengkap', 'Panggilan', 'Gender', 'No Telepon', 'Kampus / Sekolah', 'Kota', 'Wilayah', 'Tahap Pipeline', 'PIC Mentor', 'Kontak Terakhir', 'Komunitas Sasaran', 'Status Anggota', 'Catatan'];
    const keys = ['no', 'id', 'fullName', 'nickName', 'gender', 'phone', 'campusOrSchool', 'city', 'region', 'stage', 'pic', 'lastContact', 'targetGroup', 'status', 'notes'];
    
    const dataToExport = filteredRelations.map((r, idx) => ({
      no: idx + 1,
      id: r.id,
      fullName: r.fullName,
      nickName: r.nickName || '-',
      gender: r.gender || '-',
      phone: r.phone || '-',
      campusOrSchool: r.campusOrSchool || '-',
      city: r.city || '-',
      region: r.region || '-',
      stage: r.stage,
      pic: r.picStaffOrLeader || '-',
      lastContact: r.lastContactDate || '-',
      targetGroup: groups.find(g => g.id === r.targetGroupId)?.name || '-',
      status: isRelationRegisteredAsMember(r) ? 'Terdaftar di Anggota' : 'Belum Terdaftar',
      notes: r.notes || '-'
    }));

    exportToCSV(dataToExport, headers, keys, `Relasi_Pelayanan_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const countByStage = {
    Kenalan: safeRelations.filter(r => r.stage === 'Kenalan').length,
    Berelasi: safeRelations.filter(r => r.stage === 'Berelasi').length,
    'Diberitakan Injil': safeRelations.filter(r => r.stage === 'Diberitakan Injil').length,
    Dimuridkan: safeRelations.filter(r => r.stage === 'Dimuridkan').length
  };

  const registeredCount = safeRelations.filter(r => isRelationRegisteredAsMember(r)).length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-[#0c2340]" />
              Relasi Pelayanan & Penjangkauan
            </h2>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
              {safeRelations.length} Total Relasi
            </span>
            {registeredCount > 0 && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {registeredCount} Sudah Masuk Database Anggota
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Halaman khusus mengelola alur penjangkauan personal dari tahap awal (Kenalan, Berelasi, Penginjilan) hingga menjadi murid.
            Relasi yang mencapai tahap <strong>Dimuridkan</strong> akan otomatis diarahkan ke Database Anggota dengan riwayat perjalanan penjangkauannya.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          {isEditable && (
            <button
              onClick={openAddRelation}
              className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Relasi Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Stage Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#f4f7fb] border border-[#d6e0ec] rounded-lg p-3">
          <div className="flex justify-between items-center text-xs font-semibold text-[#243e5c]">
            <span>Kenalan</span>
            <span className="w-2 h-2 rounded-full bg-[#507299]"></span>
          </div>
          <div className="text-xl font-bold text-[#152a42] mt-1">{countByStage.Kenalan}</div>
          <div className="text-[10px] text-[#5a718c] mt-0.5">Kontak pertama & berkenalan</div>
        </div>

        <div className="bg-[#fbf7f0] border border-[#ebdfcb] rounded-lg p-3">
          <div className="flex justify-between items-center text-xs font-semibold text-[#5e4b2d]">
            <span>Berelasi</span>
            <span className="w-2 h-2 rounded-full bg-[#b88f55]"></span>
          </div>
          <div className="text-xl font-bold text-[#42331c] mt-1">{countByStage.Berelasi}</div>
          <div className="text-[10px] text-[#7d6745] mt-0.5">Membangun keakraban & trust</div>
        </div>

        <div className="bg-[#f8f5f9] border border-[#e6dce8] rounded-lg p-3">
          <div className="flex justify-between items-center text-xs font-semibold text-[#533c5e]">
            <span>Diberitakan Injil</span>
            <span className="w-2 h-2 rounded-full bg-[#8a6b98]"></span>
          </div>
          <div className="text-xl font-bold text-[#3b2844] mt-1">{countByStage['Diberitakan Injil']}</div>
          <div className="text-[10px] text-[#745a80] mt-0.5">Diskusi iman & kabar baik</div>
        </div>

        <div className="bg-[#f1f6f2] border border-[#d4e2d7] rounded-lg p-3">
          <div className="flex justify-between items-center text-xs font-semibold text-[#274935]">
            <span>Dimuridkan</span>
            <span className="w-2 h-2 rounded-full bg-[#4f8060]"></span>
          </div>
          <div className="text-xl font-bold text-[#183323] mt-1">{countByStage.Dimuridkan}</div>
          <div className="text-[10px] text-[#52775f] mt-0.5">Masuk KTB & Database Anggota</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, panggilan, telepon, kampus, PIC..."
            value={relationSearch}
            onChange={(e) => setRelationSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs shrink-0">Wilayah:</span>
            <select
              value={relationRegionFilter}
              onChange={(e) => setRelationRegionFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340]"
            >
              <option value="all">Semua Wilayah</option>
              {(profile?.regions || ['Jabodetabek', 'Banten', 'Bandung & Jabar', 'Yogyakarta', 'Jawa Tengah', 'Jawa Timur']).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs shrink-0">PIC:</span>
            <select
              value={relationPicFilter}
              onChange={(e) => setRelationPicFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0c2340]"
            >
              <option value="all">Semua PIC</option>
              {Array.from(new Set(safeRelations.map(r => r.picStaffOrLeader).filter(Boolean))).map(pic => (
                <option key={pic} value={pic}>{pic}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board 4 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {RELATION_STAGES.map((stage) => {
          const itemsInStage = filteredRelations.filter(r => r.stage === stage);
          const style = getStageColor(stage);
          return (
            <div key={stage} className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col min-h-[550px] max-h-[780px]">
              {/* Column Header */}
              <div className={`p-2.5 rounded border mb-3 flex items-center justify-between ${style.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${style.indicator}`}></span>
                  <span className="font-bold text-xs uppercase tracking-wide">{stage}</span>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${style.badge}`}>
                  {itemsInStage.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 pb-2">
                {itemsInStage.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-lg bg-white/60">
                    <HeartHandshake className="w-5 h-5 text-slate-300 mb-1" />
                    <span className="text-[11px] text-slate-400">Belum ada relasi di tahap {stage}</span>
                  </div>
                ) : (
                  itemsInStage.map((rel) => {
                    const isRegistered = isRelationRegisteredAsMember(rel);
                    const historyCount = Array.isArray(rel.stageHistory) ? rel.stageHistory.length : 1;

                    return (
                      <div
                        key={rel.id}
                        onClick={() => openEditRelation(rel)}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs hover:border-[#0c2340] hover:shadow-sm transition-all cursor-pointer space-y-2"
                      >
                        <div className="flex justify-between items-start gap-1.5">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 leading-tight">
                              {rel.fullName}
                              {rel.nickName && <span className="text-slate-500 font-normal"> ({rel.nickName})</span>}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {rel.campusOrSchool || 'Umum'} {rel.city ? `• ${rel.city}` : ''}
                            </p>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                            rel.gender === 'Perempuan' 
                              ? 'bg-[#fdf2f4] text-[#881337] border border-[#f5d0d8]' 
                              : 'bg-[#f0f4f9] text-[#243e5c] border border-[#d6e0ec]'
                          }`}>
                            {rel.gender || 'L/P'}
                          </span>
                        </div>

                        {/* Info bar */}
                        <div className="text-[11px] space-y-1 pt-1.5 border-t border-slate-100 text-slate-600">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">PIC Mentor:</span>
                            <strong className="text-slate-700 truncate max-w-[130px]">{rel.picStaffOrLeader || '-'}</strong>
                          </div>

                          {rel.phone && (
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400">Telepon / WA:</span>
                              <span className="text-slate-700 font-mono">{rel.phone}</span>
                            </div>
                          )}

                          {rel.lastContactDate && (
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400">Kontak Terakhir:</span>
                              <span className="text-slate-600 font-medium">{rel.lastContactDate}</span>
                            </div>
                          )}

                          {rel.targetGroupId && (
                            <div className="bg-[#f1f6f2] text-[#274935] border border-[#d4e2d7] rounded px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 mt-1">
                              <Users className="w-3 h-3 text-[#4f8060] shrink-0" />
                              <span className="truncate">
                                {groups.find(g => g.id === rel.targetGroupId)?.name || rel.targetGroupId}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes if any */}
                        {rel.notes && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic line-clamp-2">
                            "{rel.notes}"
                          </p>
                        )}

                        {/* History badge trigger */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-500">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingHistoryRelation(rel);
                            }}
                            className="text-[#0c2340] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <History className="w-3 h-3" />
                            <span>{historyCount} Catatan Alur</span>
                          </button>

                          {isRegistered && (
                            <span className="text-[#274935] font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-[#4f8060]" /> Terdaftar Anggota
                            </span>
                          )}
                        </div>

                        {/* Stage Transition Control */}
                        {isEditable && (
                          <div
                            className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              {stage !== 'Kenalan' && (
                                <button
                                  type="button"
                                  title={`Kembali ke ${getPrevStage(stage)}`}
                                  onClick={() => handleStageTransition(rel, getPrevStage(stage))}
                                  className="px-1.5 py-0.5 border border-slate-200 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-600 cursor-pointer"
                                >
                                  ←
                                </button>
                              )}
                              <select
                                value={rel.stage}
                                onChange={(e) => handleStageTransition(rel, e.target.value as MinistryRelationStage)}
                                className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-medium text-slate-700 cursor-pointer focus:outline-none"
                              >
                                {RELATION_STAGES.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>

                            {stage !== 'Dimuridkan' ? (
                              <button
                                type="button"
                                title={`Lanjut ke ${getNextStage(stage)}`}
                                onClick={() => handleStageTransition(rel, getNextStage(stage))}
                                className="px-2 py-0.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                              >
                                <span>→</span>
                                <span>{getNextStage(stage)}</span>
                              </button>
                            ) : (
                              isRegistered ? (
                                <span className="text-[10px] bg-[#f1f6f2] text-[#274935] font-bold px-1.5 py-0.5 rounded border border-[#d4e2d7] flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-[#4f8060]" /> Terdaftar
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  title="Daftarkan ke Database Anggota Pelayanan (Staff mengisi sisa data NIK, dsb)"
                                  onClick={() => onRegisterAsMember(rel)}
                                  className="px-2 py-0.5 bg-[#274935] hover:bg-[#1b3425] text-white rounded text-[10px] font-bold cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Daftar Anggota</span>
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: VIEW RIWAYAT PENJANGKAUAN (HISTORY STEPS) */}
      {viewingHistoryRelation && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-lg overflow-hidden p-5 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#0c2340]" />
                  Riwayat Penjangkauan Relasi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perjalanan penjangkauan untuk <strong className="text-slate-800">{viewingHistoryRelation.fullName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistoryRelation(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Stepper Timeline */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {Array.isArray(viewingHistoryRelation.stageHistory) && viewingHistoryRelation.stageHistory.length > 0 ? (
                viewingHistoryRelation.stageHistory.map((step, idx) => (
                  <div key={idx} className="flex gap-3 relative">
                    {idx < (viewingHistoryRelation.stageHistory?.length || 0) - 1 && (
                      <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-slate-200"></div>
                    )}
                    <div className="w-6 h-6 rounded-full bg-[#0c2340] text-white flex items-center justify-center text-[10px] font-bold shrink-0 z-10">
                      {idx + 1}
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{step.stage}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" /> {step.date}
                        </span>
                      </div>
                      {step.pic && (
                        <div className="text-[11px] text-slate-600">
                          <span className="text-slate-400">Pendamping/PIC: </span>{step.pic}
                        </div>
                      )}
                      {step.notes && (
                        <div className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded border border-slate-100">
                          "{step.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Tahap Saat Ini: {viewingHistoryRelation.stage}</div>
                  <div className="text-slate-500">Kontak Terakhir: {viewingHistoryRelation.lastContactDate || '-'}</div>
                  {viewingHistoryRelation.notes && <p className="italic">"{viewingHistoryRelation.notes}"</p>}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <div className="text-xs">
                {isRelationRegisteredAsMember(viewingHistoryRelation) ? (
                  <span className="text-[#274935] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4f8060]" /> Sudah Terdaftar Resmi di Database Anggota
                  </span>
                ) : (
                  <span className="text-[#7d6745] font-medium">Belum terdaftar di Database Anggota</span>
                )}
              </div>

              <div className="flex gap-2">
                {!isRelationRegisteredAsMember(viewingHistoryRelation) && (
                  <button
                    type="button"
                    onClick={() => {
                      const rel = viewingHistoryRelation;
                      setViewingHistoryRelation(null);
                      onRegisterAsMember(rel);
                    }}
                    className="px-3 py-1.5 bg-[#274935] hover:bg-[#1b3425] text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Daftarkan Sekarang
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingHistoryRelation(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 font-medium text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT RELASI PELAYANAN */}
      {isRelationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingRelation ? 'Edit Relasi Pelayanan' : 'Tambah Relasi Pelayanan Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Data kontak personal untuk penjangkauan, penginjilan, dan pemuridan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRelationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRelation} className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span> :
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jonathan Edward"
                    value={relFullName}
                    onChange={(e) => setRelFullName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  />
                </div>

                {/* Nama Panggilan */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Panggilan :</label>
                  <input
                    type="text"
                    placeholder="Contoh: Nathan"
                    value={relNickName}
                    onChange={(e) => setRelNickName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  />
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin :</label>
                  <select
                    value={relGender}
                    onChange={(e) => setRelGender(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                {/* Nomor Telepon / WA */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP :</label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={relPhone}
                    onChange={(e) => setRelPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs font-mono"
                  />
                </div>

                {/* Kampus / Sekolah / Pekerjaan */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asal Kampus / Sekolah :</label>
                  <input
                    type="text"
                    placeholder="Contoh: Universitas Indonesia / SMA 1"
                    value={relCampusOrSchool}
                    onChange={(e) => setRelCampusOrSchool(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  />
                </div>

                {/* Wilayah */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wilayah Pelayanan :</label>
                  <select
                    value={relRegion}
                    onChange={(e) => setRelRegion(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  >
                    {(profile?.regions || ['Jabodetabek', 'Banten', 'Bandung & Jabar', 'Yogyakarta', 'Jawa Tengah', 'Jawa Timur']).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Kota / Kabupaten */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kota / Kabupaten :</label>
                  <input
                    type="text"
                    placeholder="Contoh: Depok / Serang"
                    value={relCity}
                    onChange={(e) => setRelCity(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  />
                </div>

                {/* Tahap Pipeline */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahapan Pipeline :</label>
                  <select
                    value={relStage}
                    onChange={(e) => setRelStage(e.target.value as MinistryRelationStage)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-[#0c2340] focus:border-[#0c2340] focus:outline-none text-xs"
                  >
                    {RELATION_STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* PIC Pembina / Mentor */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIC Pembimbing / Mentor :</label>
                  <input
                    type="text"
                    placeholder="Nama staf atau pemimpin KTB"
                    value={relPicStaffOrLeader}
                    onChange={(e) => setRelPicStaffOrLeader(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  />
                </div>

                {/* Tanggal Kontak Terakhir */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Kontak Terakhir :</label>
                  <input
                    type="date"
                    value={relLastContactDate}
                    onChange={(e) => setRelLastContactDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  />
                </div>

                {/* Hubungkan ke Komunitas Pemuridan */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Komunitas Pemuridan (KTB) :
                  </label>
                  <select
                    value={relTargetGroupId}
                    onChange={(e) => setRelTargetGroupId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  >
                    <option value="">-- Belum Ditempatkan ke Komunitas --</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.communitySpace} - {g.region})</option>
                    ))}
                  </select>
                </div>

                {/* Catatan / Pokok Doa */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Perkembangan & Pokok Doa :</label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan catatan respon firman, pergumulan pribadi, atau rencana tindak lanjut..."
                    value={relNotes}
                    onChange={(e) => setRelNotes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:border-[#0c2340] focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                {editingRelation && isEditable ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmRelation(editingRelation);
                      setIsRelationModalOpen(false);
                    }}
                    className="px-3 py-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash className="w-3.5 h-3.5" /> Hapus
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRelationModalOpen(false)}
                    className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingRelation ? 'Simpan Perubahan' : 'Tambahkan Relasi'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: HAPUS RELASI PELAYANAN */}
      {deleteConfirmRelation && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-md overflow-hidden p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Relasi Pelayanan</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus data relasi pelayanan <strong className="text-slate-900">"{deleteConfirmRelation.fullName}"</strong> (Tahap: {deleteConfirmRelation.stage})? Tindakan ini akan menghapus data tersebut.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRelation(null)}
                className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium text-xs cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMinistryRelation(deleteConfirmRelation.id);
                  setDeleteConfirmRelation(null);
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-xs cursor-pointer shadow-xs transition-colors"
              >
                Ya, Hapus Relasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
