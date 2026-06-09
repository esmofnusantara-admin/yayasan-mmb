/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash, 
  Edit, 
  FileText, 
  Upload, 
  Download, 
  CheckCircle, 
  Clock, 
  X, 
  Mail, 
  FileMinus, 
  FileSignature, 
  Info,
  Calendar,
  User,
  Eye,
  FileCheck2
} from 'lucide-react';
import { LetterInward, LetterOutward, OrgDocument } from '../types';
import { exportToCSV } from '../utils/export';

interface LettersTabProps {
  inwardLetters: LetterInward[];
  outwardLetters: LetterOutward[];
  documents: OrgDocument[];
  onAddInwardLetter: (l: LetterInward) => void;
  onAddOutwardLetter: (l: LetterOutward) => void;
  onUpdateOutwardStatus: (id: string, status: any) => void;
  currentRole: string;
}

export default function LettersTab({
  inwardLetters,
  outwardLetters,
  documents,
  onAddInwardLetter,
  onAddOutwardLetter,
  onUpdateOutwardStatus,
  currentRole,
}: LettersTabProps) {
  const [subTab, setSubTab] = useState<'inward' | 'outward' | 'repository'>('outward');
  const [searchQuery, setSearchQuery] = useState('');

  // Active overlays for viewing letter bodies
  const [readingLetter, setReadingLetter] = useState<LetterOutward | null>(null);

  // Form states: Surat Masuk
  const [isFormInOpen, setIsFormInOpen] = useState(false);
  const [inNum, setInNum] = useState('');
  const [inSender, setInSender] = useState('');
  const [inSubject, setInSubject] = useState('');
  const [inDate, setInDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states: Surat Keluar Compose
  const [isFormOutOpen, setIsFormOutOpen] = useState(false);
  const [outType, setOutType] = useState<'SK' | 'Surat Tugas' | 'Surat Keterangan' | 'Surat Relasi' | 'Surat Peminjaman' | 'Surat Permohonan'>('SK');
  const [outRecipient, setOutRecipient] = useState('');
  const [outSubject, setOutSubject] = useState('');
  const [outContent, setOutContent] = useState('');

  // Convert month to Roman numerals
  const getRomanMonth = (monthNumber: number): string => {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romans[monthNumber] || 'I';
  };

  // Generate automated outbound serial letter number
  // Format: 001/SK/ESM/VII/2026
  const generateOutwardLetterNumber = (typeCode: string) => {
    const currentMonth = new Date().getMonth(); // 0-indexed
    const currentYear = new Date().getFullYear();
    const roman = getRomanMonth(currentMonth);
    const count = outwardLetters.filter(l => l.templateType === typeCode).length + 1;
    const serial = String(count).padStart(3, '0');
    
    // type abbreviations
    let abbrev = 'SK';
    if (typeCode === 'Surat Tugas') abbrev = 'Surat-Tugas';
    else if (typeCode === 'Surat Keterangan') abbrev = 'Ket';
    else if (typeCode === 'Surat Relasi') abbrev = 'Relasi';
    else if (typeCode === 'Surat Peminjaman') abbrev = 'Peminjaman';
    else if (typeCode === 'Surat Permohonan') abbrev = 'Permohonan';

    return `${serial}/${abbrev}/ESM/${roman}/${currentYear}`;
  };

  const handleSaveInwardLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inNum || !inSender || !inSubject) {
      alert('Isi seluruh data Surat Masuk!');
      return;
    }
    const newIn: LetterInward = {
      id: `LET-IN-${Date.now()}`,
      letterNumber: inNum,
      sender: inSender,
      subject: inSubject,
      receivedDate: inDate,
      status: 'Disposisi'
    };
    onAddInwardLetter(newIn);
    setIsFormInOpen(false);
    setInNum('');
    setInSender('');
    setInSubject('');
    alert('Surat Masuk Berhasil Diarsip ke Sekretariat.');
  };

  const handleComposeOutwardLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outRecipient || !outSubject || !outContent) {
      alert('Isi data surat keluar secara lengkap!');
      return;
    }

    const serialNumber = generateOutwardLetterNumber(outType);

    // If composer is Super Admin / Sekretaris, pre-approve right away!
    // Others route into pending state in App Center
    const isOfficer = ['Sekretaris', 'Super Admin'].includes(currentRole);
    const resolvedStatus = isOfficer ? 'Approved' : 'Pending Approval';

    const newOut: LetterOutward = {
      id: `LET-OUT-${Date.now()}`,
      letterNumber: serialNumber,
      templateType: outType,
      recipient: outRecipient,
      subject: outSubject,
      date: new Date().toISOString().split('T')[0],
      content: outContent,
      author: currentRole === 'Staff' ? 'Staff Sekretariat' : currentRole,
      status: resolvedStatus
    };

    onAddOutwardLetter(newOut);
    setIsFormOutOpen(false);
    setOutRecipient('');
    setOutSubject('');
    setOutContent('');

    if (resolvedStatus === 'Pending Approval') {
      alert('Draft Surat Keluar dikirim ke antrean Approval! Mengingat wewenang akun Anda, Surat ini harus ditandatangani & disetujui Sekretaris/Ketua Yayasan sebelum dikirim.');
    } else {
      alert(`Surat Keluar Berhasil Terbit! Serial Register: ${serialNumber}`);
    }
  };

  const filteredInward = inwardLetters.filter(l => 
    l.letterNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.sender.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOutward = outwardLetters.filter(l => 
    l.letterNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.recipient.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    if (subTab === 'outward') {
      const headers = [
        'ID Surat Keluar',
        'Nomor Surat',
        'Penerima',
        'Perihal / Subjek',
        'Tanggal Terbit',
        'Konten / Isi Ringkas',
        'Penulis / Pembuat',
        'Status Approval'
      ];
      const keys = [
        'id',
        'letterNumber',
        'recipient',
        'subject',
        'date',
        'content',
        'author',
        'status'
      ];
      exportToCSV(filteredOutward, headers, keys, `arsip_surat_keluar_${new Date().toISOString().substring(0, 10)}.csv`);
    } else if (subTab === 'inward') {
      const headers = [
        'ID Surat Masuk',
        'Nomor Surat Masuk',
        'Pengirim',
        'Perihal / Subjek',
        'Tanggal Penerimaan',
        'Disposisi Kepada',
        'Instruksi Disposisi',
        'Catatan / Ringkasan'
      ];
      const keys = [
        'id',
        'letterNumber',
        'sender',
        'subject',
        'receivedDate',
        'dispositionTo',
        'dispositionInstruction',
        'notes'
      ];
      exportToCSV(filteredInward, headers, keys, `arsip_surat_masuk_${new Date().toISOString().substring(0, 10)}.csv`);
    } else {
      const headers = [
        'ID Dokumen Yayasan',
        'Nama Dokumen Resmi',
        'Nomor Legalitas Hukum',
        'Kategori Dokumen',
        'Tanggal Berlaku / Sah',
        'Deskripsi / Instansi Penerbit'
      ];
      const keys = [
        'id',
        'name',
        'docNumber',
        'category',
        'validFrom',
        'description'
      ];
      exportToCSV(documents, headers, keys, `arsip_dokumen_resmi_konstitusi_${new Date().toISOString().substring(0, 10)}.csv`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub menu controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
        
        {/* Toggle tabs */}
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setSubTab('outward')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'outward' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Surat Keluar (Outbox)
          </button>
          <button 
            onClick={() => setSubTab('inward')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'inward' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Registrasi Surat Masuk (Inbox)
          </button>
          <button 
            onClick={() => setSubTab('repository')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'repository' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Berkas Legal & Dokumen Organisasi
          </button>
        </div>

        {/* Dynamic Buttons */}
        <div className="flex gap-2 text-xs">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          {subTab === 'outward' && (
            <button 
              onClick={() => setIsFormOutOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSignature className="w-4 h-4" /> Buka Composer Surat Keluar
            </button>
          )}

          {subTab === 'inward' && (
            <button 
              onClick={() => setIsFormInOpen(true)}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Registrasi Surat Masuk
            </button>
          )}
        </div>

      </div>

      {/* VIEW 1: OUTWARD OUTBOX */}
      {subTab === 'outward' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-105 flex gap-4">
            <div className="relative flex-1 text-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari register nomor surat keluar, perihal atau penerima..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl focus:ring-1 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto text-xs font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                  <th className="p-4">Kode No. Registrasi Surat</th>
                  <th className="p-4">Klasifikasi Draft</th>
                  <th className="p-4">Perihal / Judul Surat</th>
                  <th className="p-4">Pihak Penerima (Ditujukan ke)</th>
                  <th className="p-4">Tanggal Terbit</th>
                  <th className="p-4">Status Legitimasi</th>
                  <th className="p-4 text-center">Aksi Baca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOutward.map((letter) => (
                  <tr key={letter.id} className="hover:bg-slate-50/10">
                    <td className="p-4">
                      <span className="font-bold font-mono tracking-tight text-[11px] text-slate-800 shrink-0 select-all block">{letter.letterNumber}</span>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-150 text-slate-700 px-2.5 py-0.5 rounded-lg font-semibold tracking-tight text-[10px]">
                        {letter.templateType}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-800 max-w-sm line-clamp-1 mt-3">
                      {letter.subject}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {letter.recipient}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">{letter.date}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        letter.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        letter.status === 'Draft' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {letter.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setReadingLetter(letter)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 mx-auto shadow-sm cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Surat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: INWARD MAIL */}
      {subTab === 'inward' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-50 flex gap-4">
            <div className="relative flex-1 text-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari register nomor surat masuk, pengirim atau judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto text-xs font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                  <th className="p-4">Nomor Berkas</th>
                  <th className="p-4">Instansi Pengirim</th>
                  <th className="p-4">Perihal Korespondensi</th>
                  <th className="p-4">Tanggal Masuk</th>
                  <th className="p-4">Status Disposisi</th>
                  <th className="p-4 text-center">Unduh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInward.map((letter) => (
                  <tr key={letter.id} className="hover:bg-slate-50/10">
                    <td className="p-4">
                      <span className="font-bold font-mono tracking-tight text-[11px] text-slate-800 select-all block">{letter.letterNumber}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{letter.sender}</td>
                    <td className="p-4 font-medium text-slate-800 max-w-sm line-clamp-1 mt-3">
                      {letter.subject}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">{letter.receivedDate}</td>
                    <td className="p-4">
                      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {letter.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => alert('Mengunduh scan dokumen surat masuk asli format JPEG/PDF dari server cloud...')}
                        className="p-1 text-slate-550 border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded text-[10px] inline-flex items-center gap-0.5 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Berkas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: LEGAL RESOLUTIONS & AD/ART COOP */}
      {subTab === 'repository' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-md font-semibold text-slate-800">Dokumen Arsip Hukum & SOP Kelembagaan</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Arsip legalitas, SK Menkumham, sertifikat denda pajak, dokumen AD/ART, dan Memorandum of Understanding (MoU) kemitraan dengan universitas/gereja lokal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="p-5 border border-slate-100 rounded-2xl hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-slate-105 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                      {doc.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">{doc.fileSize}</span>
                  </div>
                  <h4 className="font-bold text-slate-850 text-xs">{doc.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1.5">Tanggal Unggah Dokumen: {doc.uploadedDate}</p>
                </div>
                
                <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">&bull; Salinan Resmi</span>
                  <button 
                    onClick={() => alert(`Mengunduh berkas konstitusi resmi "${doc.name}" dari storage cloud...`)}
                    className="p-1 px-3 bg-slate-800 hover:bg-slate-755 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh Berkas
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPOSER MODAL FOR LETTERS OUTWARD (SURAT KELUAR) */}
      {isFormOutOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden scale-95 transition-transform my-8">
            
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">Sistem Penyusunan Surat Keluar (Outbox)</dt>
                <dd className="text-[11px] text-slate-300">Setiap surat keluar akan mereferensikan format nomor registrasi otomatis.</dd>
              </div>
              <button onClick={() => setIsFormOutOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>

            <form onSubmit={handleComposeOutwardLetter} className="p-6 space-y-4 text-xs font-sans">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 block mb-1">Klasifikasi Surat Template :</label>
                  <select 
                    value={outType}
                    onChange={(e) => setOutType(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="SK">Surat Keputusan (SK)</option>
                    <option value="Surat Tugas">Surat Tugas Pengutusan</option>
                    <option value="Surat Keterangan">Surat Keterangan Aktif</option>
                    <option value="Surat Relasi">Surat Pengantar Relasi</option>
                    <option value="Surat Peminjaman">Peminjaman Aula/Akomodasi</option>
                    <option value="Surat Permohonan">Surat Permohonan Biaya/Sponsor</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Ditujukan Kepada (Pihak Penerima) :</label>
                  <input 
                    type="text" 
                    value={outRecipient}
                    onChange={(e) => setOutRecipient(e.target.value)}
                    placeholder="Contoh: Pengurus Wisma Salatiga / Christian Sitorus"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Perihal / Subject Surat Keluar :</label>
                <input 
                  type="text" 
                  value={outSubject}
                  onChange={(e) => setOutSubject(e.target.value)}
                  placeholder="Contoh: Surat Tugas Pengutusan Pendamping Persekutuan"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Konten Inti Paragraf Surat Resmi :</label>
                <textarea 
                  rows={6}
                  value={outContent}
                  onChange={(e) => setOutContent(e.target.value)}
                  placeholder="Isi draft surat resmi di sini secara lengkap & berbobot...."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 leading-relaxed font-sans"
                  required
                />
              </div>

              <div className="bg-slate-550/5 p-3 rounded-xl border border-slate-200 text-slate-600 italic">
                Sesuai parameter di atas, nomor serial yang akan diterbitkan: <strong className="text-slate-800">{generateOutwardLetterNumber(outType)}</strong>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsFormOutOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md"
                >
                  <FileSignature className="w-4 h-4 inline mr-1" /> Terbitkan Surat resmi
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* POPUP: DETAILED LETTER READER OVERLAY (A4 size format) */}
      {readingLetter && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden scale-95 transition-transform p-10 font-sans text-slate-800 space-y-6 flex flex-col justify-between my-8 min-h-[600px]">
            
            {/* Yayasan Header */}
            <div className="border-b-2 border-slate-800 pb-5 text-center flex flex-col items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Yayasan Evangelical Student Movement (ESM)</h2>
              <span className="text-[10px] text-slate-500 max-w-md mt-1">Sertifikat Legalitas Kemenkumham: {new Date().getFullYear()}A-0120 &bull; Phone +62-21-3456-7890</span>
              <span className="text-[10px] text-indigo-600 font-bold tracking-widest block mt-2">INDONESIA STUDENT MISSION FELLOWSHIP</span>
            </div>

            {/* Letter Serial details */}
            <div className="space-y-4">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <p><strong>Nomor Surat:</strong> <span className="font-mono">{readingLetter.letterNumber}</span></p>
                  <p className="mt-1"><strong>Lampiran:</strong> - (Nihil)</p>
                  <p className="mt-1"><strong>Perihal:</strong> <span className="font-bold">{readingLetter.subject}</span></p>
                </div>
                <div className="text-right">
                  <p><strong>Tanggal:</strong> {readingLetter.date}</p>
                  <p className="mt-1"><strong>Sifat:</strong> Resmi / Terbuka</p>
                </div>
              </div>

              {/* Recipient */}
              <div className="text-xs pt-2">
                <p>Kepada Yth,</p>
                <p className="font-bold mt-0.5">{readingLetter.recipient}</p>
                <p className="text-slate-500 mt-0.5">di Tempat</p>
              </div>

              {/* Content Body */}
              <div className="text-xs pt-4 border-t border-slate-50 leading-relaxed font-sans whitespace-pre-wrap">
                {readingLetter.content}
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-8 border-t border-slate-50 flex justify-between items-end text-xs">
              <div className="italic text-slate-400">
                Dokumen ini sah dirilis dinamis &bull; ID. {readingLetter.id}
              </div>
              <div className="text-center w-48">
                <p>Hormat Kami,</p>
                <div className="h-12 flex items-center justify-center">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-500 border border-dashed border-indigo-200 py-1.5 px-3 rounded">
                    Digitally Authorized
                  </span>
                </div>
                <p className="font-bold border-t border-slate-500 pt-1.5">{readingLetter.author || 'Sekretariat Pusat'}</p>
                <p className="text-[9px] text-slate-400 text-medium">Badan Pengurus ESM</p>
              </div>
            </div>

            {/* Exit Trigger */}
            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3.5 no-print">
              <button 
                onClick={() => setReadingLetter(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer text-slate-700"
              >
                Tutup Dokumen
              </button>
              <button 
                onClick={() => {
                  alert('Menyiapkan transfer sinyal nirkabel ke mesin cetak lokal...');
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Eye className="w-4 h-4" /> Print out A4 Fisik
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
