/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus, 
  Search, 
  AlertTriangle, 
  Inbox, 
  DollarSign, 
  FileText, 
  Award,
  Wallet,
  CornerDownRight,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react';
import { ApprovalRequest } from '../types';

interface ApprovalsTabProps {
  approvals: ApprovalRequest[];
  onResolveApproval: (id: string, status: 'Approved' | 'Rejected', comment?: string) => void;
  currentRole: string;
}

export default function ApprovalsTab({
  approvals,
  onResolveApproval,
  currentRole,
}: ApprovalsTabProps) {
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Resolved'>('Pending');
  const [resolverComment, setResolverComment] = useState('');
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);

  // Security gate: only Super Admin, Ketua Yayasan, and Bendahara are allowed to resolve approvals.
  // Others/Staff can only view queue!
  const canDisposeApprovals = ['Super Admin', 'Ketua Yayasan', 'Bendahara'].includes(currentRole);

  const filteredApprovals = approvals.filter(item => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Pending') return item.status === 'Pending';
    return item.status === 'Approved' || item.status === 'Rejected';
  });

  const handleAction = (id: string, decision: 'Approved' | 'Rejected') => {
    onResolveApproval(id, decision, resolverComment);
    setResolverComment('');
    setActiveApprovalId(null);
    alert(`Keputusan pelaporan berhasil direkam: ${decision}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header */}
      <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Approval Center (Pusat Verifikasi)</h2>
          <p className="text-xs text-slate-500">Otorisasi dana pengeluaran, payroll karyawan, surat keputusan struktural, dan donasi.</p>
        </div>
        
        {/* Filter Status Selector */}
        <div className="flex gap-1 bg-slate-150 p-1.5 rounded-xl border border-slate-200">
          <button 
            onClick={() => setFilterStatus('Pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterStatus === 'Pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-650 hover:text-slate-800'
            }`}
          >
            Menunggu Persetujuan
          </button>
          <button 
            onClick={() => setFilterStatus('Resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterStatus === 'Resolved' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-655'
            }`}
          >
            Arsip Keputusan
          </button>
          <button 
            onClick={() => setFilterStatus('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              filterStatus === 'All' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-655'
            }`}
          >
            Semua Aliran
          </button>
        </div>
      </div>

      {/* Main Approval queue wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* List (Left column 2-span) */}
        <div className="lg:col-span-2 space-y-4">
          {filteredApprovals.length > 0 ? (
            filteredApprovals.map((req) => {
              // Icon selector
              let modIcon = <FileText className="w-5 h-5 text-indigo-600" />;
              if (req.module === 'Keuangan' || req.module === 'Event Budget') {
                modIcon = <DollarSign className="w-5 h-5 text-emerald-600" />;
              } else if (req.module === 'Payroll') {
                modIcon = <Wallet className="w-5 h-5 text-purple-600" />;
              }

              const isActive = activeApprovalId === req.id;

              return (
                <div 
                  key={req.id}
                  onClick={() => {
                    if (req.status === 'Pending') {
                      setActiveApprovalId(isActive ? null : req.id);
                    }
                  }}
                  className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer ${
                    isActive ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/10' : 
                    req.status === 'Pending' ? 'border-slate-150 hover:border-slate-200 hover:shadow-xs' : 'border-slate-100 opacity-80'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3.5">
                      <div className={`p-3 rounded-xl ${
                        req.module === 'Keuangan' ? 'bg-emerald-50' : 
                        req.module === 'Payroll' ? 'bg-purple-50' : 'bg-indigo-50'
                      }`}>
                        {modIcon}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">{req.module} &bull; REF: {req.referenceId}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mt-0.5">{req.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">"{req.description}"</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {req.amount && (
                        <div className="font-bold text-sm font-mono text-slate-900">
                          Rp {req.amount.toLocaleString('id-ID')}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-1">Oleh: {req.requestedBy}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">{req.requestedAt}</span>
                    </div>
                  </div>

                  {/* Status marker */}
                  {req.status !== 'Pending' && (
                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-semibold">
                      <span className={`flex items-center gap-1 ${
                        req.status === 'Approved' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {req.status === 'Approved' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        Keputusan: {req.status}
                      </span>
                      {req.comment && (
                        <span className="text-slate-500 italic font-normal">Komentar Pimpinan: "{req.comment}"</span>
                      )}
                    </div>
                  )}

                  {/* ACTIVE COMPOSER RESOLVER IN-LINE DRAWER ONLY FOR PENDING & AUTHORIZED */}
                  {isActive && req.status === 'Pending' && (
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-4" onClick={(e) => e.stopPropagation()}>
                      {canDisposeApprovals ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1 font-medium flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Tambahkan Komentar Penyetuju (Opsional) :
                            </label>
                            <input 
                              type="text" 
                              placeholder="Contoh: Lampiran struk valid, teruskan untuk ditransfer sekretariat / disetujui..."
                              value={resolverComment}
                              onChange={(e) => setResolverComment(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                            />
                          </div>

                          <div className="flex justify-end gap-2.5 pt-1">
                            <button 
                              onClick={() => handleAction(req.id, 'Rejected')}
                              className="px-4.5 py-2 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl text-xs font-semibold text-rose-600 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <ThumbsDown className="w-4 h-4" /> Tolak Request
                            </button>
                            <button 
                              onClick={() => handleAction(req.id, 'Approved')}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shadow-md cursor-pointer"
                            >
                              <ThumbsUp className="w-4 h-4" /> Setujui & Posting
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2 text-xs text-amber-700 font-semibold shadow-inner">
                          <AlertTriangle className="w-4 h-4" /> Anda login sebagai {currentRole}. Akun ini hanya memiliki lisensi baca-antrean, tidak berhak menandatangani disposisi anggaran atau SK.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-400">
              <Inbox className="w-10 h-10 text-slate-200 mb-2.5 animate-bounce" />
              <h4 className="font-semibold text-slate-650">Klip Antrean Kosong</h4>
              <p className="text-xs px-8 text-neutral-400 mt-1">Tidak ada pengajuan otorisasi pending yang terdata saat ini.</p>
            </div>
          )}
        </div>

        {/* Informative Side Rules (Right column 1-span) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-xs text-slate-600 leading-relaxed font-sans">
          <div className="text-center pb-4 border-b border-slate-50 flex flex-col items-center">
            <Award className="w-10 h-10 text-indigo-500 mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">Prinsip Audit Disposisi</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <CornerDownRight className="w-4 h-4 text-indigo-500 shrink-0" />
              <p>Setiap pengeluaran kas di atas Rp 1.000.000 diparaf secara kolektif oleh Bendahara dan disetujui Ketua Yayasan.</p>
            </div>
            <div className="flex gap-2">
              <CornerDownRight className="w-4 h-4 text-indigo-500 shrink-0" />
              <p>Surat keputusan eksternal atau SK pengangkatan pengurus cabang / regional wajib ditandatangani Ketua atau Sekretaris.</p>
            </div>
            <div className="flex gap-2">
              <CornerDownRight className="w-4 h-4 text-indigo-500 shrink-0" />
              <p>Prospek dukungan komitmen mitra baru otomatis diposting setelah donasi pertama telah diverifikasi oleh Bendahara.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
