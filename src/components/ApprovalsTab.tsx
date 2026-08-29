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
  Banknote, 
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

  // Security gate: only Super Admin, Pembina Yayasan, Ketua Yayasan, and Bendahara are allowed to resolve approvals.
  // Others/Staff/Pengawas can only view queue!
  const canDisposeApprovals = ['Super Admin', 'Ketua Yayasan', 'Pembina Yayasan', 'Bendahara'].includes(currentRole);

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
      <div className="bg-[#0c2340] text-white rounded-lg p-5 shadow-xs border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Approval Center (Pusat Verifikasi)</h2>
          <p className="text-xs text-slate-300 mt-0.5">Otorisasi dana pengeluaran, payroll karyawan, surat keputusan struktural, dan donasi.</p>
        </div>
        
        {/* Filter Status Selector */}
        <div className="flex gap-1 bg-slate-800/80 p-1 rounded border border-slate-700">
          <button 
            onClick={() => setFilterStatus('Pending')}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
              filterStatus === 'Pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Menunggu Persetujuan
          </button>
          <button 
            onClick={() => setFilterStatus('Resolved')}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
              filterStatus === 'Resolved' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Arsip Keputusan
          </button>
          <button 
            onClick={() => setFilterStatus('All')}
            className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
              filterStatus === 'All' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            Semua Aliran
          </button>
        </div>
      </div>

      {/* Main Approval queue wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* List (Left column 2-span) */}
        <div className="lg:col-span-2 space-y-3">
          {filteredApprovals.length > 0 ? (
            filteredApprovals.map((req) => {
              // Icon selector
              let modIcon = <FileText className="w-4 h-4 text-slate-700" />;
              if (req.module === 'Keuangan' || req.module === 'Event Budget') {
                modIcon = <Banknote className="w-4 h-4 text-emerald-800" />;
              } else if (req.module === 'Payroll') {
                modIcon = <Wallet className="w-4 h-4 text-[#0c2340]" />;
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
                  className={`bg-white p-4 rounded-lg border transition-colors cursor-pointer ${
                    isActive ? 'border-[#0c2340] shadow-xs' : 
                    req.status === 'Pending' ? 'border-slate-200 hover:border-slate-300 shadow-xs' : 'border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className={`p-2.5 rounded border ${
                        req.module === 'Keuangan' ? 'bg-emerald-50 border-emerald-200' : 
                        req.module === 'Payroll' ? 'bg-slate-100 border-slate-200' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {modIcon}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">{req.module} &bull; REF: {req.referenceId}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-xs mt-0.5">{req.title}</h3>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">"{req.description}"</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {req.amount && (
                        <div className="font-bold text-xs font-mono text-slate-900">
                          Rp {req.amount.toLocaleString('id-ID')}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 block mt-0.5">Oleh: {req.requestedBy}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">{req.requestedAt}</span>
                    </div>
                  </div>

                  {/* Status marker */}
                  {req.status !== 'Pending' && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                      <span className={`flex items-center gap-1 ${
                        req.status === 'Approved' ? 'text-emerald-800' : 'text-rose-800'
                      }`}>
                        {req.status === 'Approved' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        Keputusan: {req.status}
                      </span>
                      {req.comment && (
                        <span className="text-slate-600 italic font-normal text-xs">Komentar: "{req.comment}"</span>
                      )}
                    </div>
                  )}

                  {/* ACTIVE COMPOSER RESOLVER IN-LINE DRAWER ONLY FOR PENDING & AUTHORIZED */}
                  {isActive && req.status === 'Pending' && (
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {canDisposeApprovals ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-600 block mb-1 font-semibold flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> Tambahkan Komentar Penyetuju (Opsional) :
                            </label>
                            <input 
                              type="text" 
                              placeholder="Contoh: Lampiran struk valid, disetujui..."
                              value={resolverComment}
                              onChange={(e) => setResolverComment(e.target.value)}
                              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0c2340]"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button 
                              onClick={() => handleAction(req.id, 'Rejected')}
                              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 border border-rose-300 rounded text-xs font-semibold text-rose-800 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" /> Tolak Request
                            </button>
                            <button 
                              onClick={() => handleAction(req.id, 'Approved')}
                              className="px-4 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" /> Setujui & Posting
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded flex items-center gap-2 text-xs text-amber-900 font-medium">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" /> 
                          <span>Anda login sebagai {currentRole}. Akun ini hanya memiliki lisensi baca-antrean, tidak berhak menandatangani disposisi.</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-500">
              <Inbox className="w-8 h-8 text-slate-300 mb-2" />
              <h4 className="font-semibold text-slate-800 text-xs">Klip Antrean Kosong</h4>
              <p className="text-xs text-slate-500 mt-0.5">Tidak ada pengajuan otorisasi pending yang terdata saat ini.</p>
            </div>
          )}
        </div>

        {/* Informative Side Rules (Right column 1-span) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3.5 text-xs text-slate-700 leading-relaxed">
          <div className="pb-3 border-b border-slate-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Prinsip Audit Disposisi</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <CornerDownRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>Setiap pengeluaran kas di atas Rp 1.000.000 diparaf secara kolektif oleh Bendahara dan disetujui Ketua Yayasan.</p>
            </div>
            <div className="flex gap-2">
              <CornerDownRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>Surat keputusan eksternal atau SK pengangkatan pengurus cabang / regional wajib ditandatangani Ketua atau Sekretaris.</p>
            </div>
            <div className="flex gap-2">
              <CornerDownRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>Prospek dukungan komitmen mitra baru otomatis diposting setelah donasi pertama telah diverifikasi oleh Bendahara.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
