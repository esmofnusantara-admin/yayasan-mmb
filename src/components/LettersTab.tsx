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
import { LetterInward, LetterOutward, OrgDocument, InstitutionalProfile } from '../types';
import { exportToCSV, exportLetterToPDF } from '../utils/export';

interface LettersTabProps {
  inwardLetters: LetterInward[];
  outwardLetters: LetterOutward[];
  documents: OrgDocument[];
  onAddInwardLetter: (l: LetterInward) => void;
  onUpdateInwardLetter?: (l: LetterInward) => void;
  onDeleteInwardLetter?: (id: string, refNum: string) => void;
  onAddOutwardLetter: (l: LetterOutward) => void;
  onUpdateOutwardLetter: (l: LetterOutward) => void;
  onUpdateOutwardStatus: (id: string, status: any) => void;
  onAddDocument?: (docObj: { id: string; name: string; category: string; fileData: string; fileSize: string }) => Promise<void> | void;
  onDeleteDocument?: (id: string, name: string) => Promise<void> | void;
  currentRole: string;
  profile: InstitutionalProfile;
  structures?: any[];
}

const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${day < 10 ? '0' + day : day} ${months[monthIndex]} ${year}`;
    }
  } catch (e) {
    // ignore
  }
  return dateStr;
};

export default function LettersTab({
  inwardLetters,
  outwardLetters,
  documents,
  onAddInwardLetter,
  onUpdateInwardLetter,
  onDeleteInwardLetter,
  onAddOutwardLetter,
  onUpdateOutwardLetter,
  onUpdateOutwardStatus,
  onAddDocument,
  onDeleteDocument,
  currentRole,
  profile,
  structures = [],
}: LettersTabProps) {
  const isEditable = ['Super Admin', 'Ketua Yayasan', 'Sekretaris'].includes(currentRole);
  const [subTab, setSubTab] = useState<'inward' | 'outward' | 'repository'>('outward');
  const [searchQuery, setSearchQuery] = useState('');

  // States and functions for standard file uploads up to 5 MB
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('Konstitusi Organisasi');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Boundary Size Limit: 5 Megabytes
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      alert(`Ukuran berkas "${file.name}" melebihi batas koordinasi maksimum 5 MB! Harap pilih berkas yang lebih kecil.`);
      e.target.value = ''; // Reset target
      return;
    }

    setUploadFile(file);
    if (!newDocName) {
      // Auto pre-fill name with sanitized filename excluding extension
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setNewDocName(nameWithoutExt);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadBase64(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) {
      alert('Tentukan Nama Dokumen Resmi!');
      return;
    }
    if (!uploadBase64) {
      alert('Pilih berkas dokumen yang akan diunggah!');
      return;
    }

    const docObj = {
      id: `DOC-${Date.now()}`,
      name: newDocName,
      category: newDocCategory,
      fileData: uploadBase64,
      fileSize: uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : '0 MB'
    };

    if (onAddDocument) {
      await onAddDocument(docObj);
    }
    
    // Clear and close
    setNewDocName('');
    setUploadFile(null);
    setUploadBase64('');
    setIsUploadDocOpen(false);
  };

  // Active overlays for viewing letter bodies
  const [readingLetter, setReadingLetter] = useState<LetterOutward | null>(null);
  const [editingLetter, setEditingLetter] = useState<LetterOutward | null>(null);

  const handleStartEditOutwardLetter = (letter: LetterOutward) => {
    setEditingLetter(letter);
    setOutType(letter.templateType as any);
    setOutRecipient(letter.recipient);
    setOutSubject(letter.subject);
    setOutContent(letter.content);
    setSignLeftType(letter.signLeftType || 'None');
    setSignLeftName(letter.signLeftName || '');
    setSignLeftTitle(letter.signLeftTitle || '');
    setSignRightType(letter.signRightType || 'None');
    setSignRightName(letter.signRightName || '');
    setSignRightTitle(letter.signRightTitle || '');
    setShowStamp(letter.showStamp ?? true);
    setStampTarget(letter.stampTarget || 'left');
    setStampOffsetX(letter.stampOffsetX ?? 0);
    setStampOffsetY(letter.stampOffsetY ?? 0);
    setStampSize(letter.stampSize ?? 22);
    setSignPlaceDate(letter.signPlaceDate || `Cilegon, ${formatIndonesianDate(letter.date || new Date().toISOString().substring(0, 10))}`);
    setAdditionalSignatures(letter.additionalSignatures || []);
    setSelectedAdditionalNodeId('');
    
    setIsFormOutOpen(true);
    setReadingLetter(null); // Close reading modal if open
  };

  const handleStartNewOutwardLetter = () => {
    setEditingLetter(null);
    setOutType('SK');
    setOutRecipient('');
    setOutSubject('');
    setOutContent('');
    setSignLeftType('Ketua');
    setSignLeftName(ketuaName);
    setSignLeftTitle('Ketua Yayasan');
    setSignRightType('Sekretaris');
    setSignRightName(sekretarisName);
    setSignRightTitle('Sekretaris Yayasan');
    setShowStamp(true);
    setStampTarget('left');
    setStampOffsetX(0);
    setStampOffsetY(0);
    setStampSize(22);
    setSignPlaceDate(`Cilegon, ${formatIndonesianDate(new Date().toISOString().substring(0, 10))}`);
    setAdditionalSignatures([]);
    setSelectedAdditionalNodeId('');
    
    setIsFormOutOpen(true);
  };

  // Form states: Surat Masuk
  const [isFormInOpen, setIsFormInOpen] = useState(false);
  const [inNum, setInNum] = useState('');
  const [inSender, setInSender] = useState('');
  const [inSubject, setInSubject] = useState('');
  const [inDate, setInDate] = useState(new Date().toISOString().split('T')[0]);
  const [inStatus, setInStatus] = useState<'Arsip' | 'Disposisi' | 'Tindak Lanjut'>('Disposisi');
  const [inAttachmentBase64, setInAttachmentBase64] = useState<string>('');
  const [inAttachmentName, setInAttachmentName] = useState<string>('');
  
  const [editingInwardLetter, setEditingInwardLetter] = useState<LetterInward | null>(null);
  const [readingInwardLetter, setReadingInwardLetter] = useState<LetterInward | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewingDocument, setPreviewingDocument] = useState<OrgDocument | null>(null);

  const handleStartNewInwardLetter = () => {
    setEditingInwardLetter(null);
    setInNum('');
    setInSender('');
    setInSubject('');
    setInDate(new Date().toISOString().split('T')[0]);
    setInStatus('Disposisi');
    setInAttachmentBase64('');
    setInAttachmentName('');
    
    setIsFormInOpen(true);
  };

  const handleStartEditInwardLetter = (letter: LetterInward) => {
    setEditingInwardLetter(letter);
    setInNum(letter.letterNumber);
    setInSender(letter.sender);
    setInSubject(letter.subject);
    setInDate(letter.receivedDate);
    setInStatus(letter.status || 'Disposisi');
    setInAttachmentBase64(letter.attachmentUrl || '');
    setInAttachmentName(letter.attachmentUrl ? 'lampiran_terunggah' : '');
    
    setIsFormInOpen(true);
    setReadingInwardLetter(null);
  };

  // Form states: Surat Keluar Compose
  const [isFormOutOpen, setIsFormOutOpen] = useState(false);
  const [outType, setOutType] = useState<'SK' | 'Surat Tugas' | 'Surat Keterangan' | 'Surat Relasi' | 'Surat Peminjaman' | 'Surat Permohonan'>('SK');
  const [outRecipient, setOutRecipient] = useState('');
  const [outSubject, setOutSubject] = useState('');
  const [outContent, setOutContent] = useState('');

  // Dynamic Names from Org Structures
  const ketuaNode = structures?.find(n => n.id === 'ketua' || n.id === 'ketua_yayasan') || structures?.find(n => n.title?.toLowerCase().includes('ketua'));
  const ketuaName = ketuaNode?.name || 'Fernandes';

  const sekretarisNode = structures?.find(n => n.id === 'sekretaris') || structures?.find(n => n.title?.toLowerCase().includes('sekretaris'));
  const sekretarisName = sekretarisNode?.name || 'Yusuf Raja Tamba';

  const bendaharaNode = structures?.find(n => n.id === 'bendahara') || structures?.find(n => n.title?.toLowerCase().includes('bendahara'));
  const bendaharaName = bendaharaNode?.name || 'Angelina';

  // Form states: dynamic signees
  const [signLeftType, setSignLeftType] = useState<string>('ketua');
  const [signLeftName, setSignLeftName] = useState(ketuaName);
  const [signLeftTitle, setSignLeftTitle] = useState('Ketua Yayasan');

  const [signRightType, setSignRightType] = useState<string>('sekretaris');
  const [signRightName, setSignRightName] = useState(sekretarisName);
  const [signRightTitle, setSignRightTitle] = useState('Sekretaris Yayasan');

  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [stampTarget, setStampTarget] = useState<'left' | 'right' | 'center'>('left');
  const [stampOffsetX, setStampOffsetX] = useState<number>(0);
  const [stampOffsetY, setStampOffsetY] = useState<number>(0);
  const [stampSize, setStampSize] = useState<number>(22);
  const [signPlaceDate, setSignPlaceDate] = useState<string>('');
  const [additionalSignatures, setAdditionalSignatures] = useState<Array<{ id: string; nodeId: string; title: string; name: string }>>([]);
  const [selectedAdditionalNodeId, setSelectedAdditionalNodeId] = useState<string>('');

  // Auto-sync initial state values when structures load
  React.useEffect(() => {
    if (editingLetter) return;
    if (signLeftType === 'Custom' || signLeftType === 'None') return;
    const node = structures?.find(n => n.id === signLeftType);
    if (node) {
      setSignLeftName(node.name);
      setSignLeftTitle(node.title);
    } else if (signLeftType === 'Ketua') {
      setSignLeftName(ketuaName);
      setSignLeftTitle('Ketua Yayasan');
    } else if (signLeftType === 'Sekretaris') {
      setSignLeftName(sekretarisName);
      setSignLeftTitle('Sekretaris Yayasan');
    } else if (signLeftType === 'Bendahara') {
      setSignLeftName(bendaharaName);
      setSignLeftTitle('Bendahara Yayasan');
    }
  }, [structures, signLeftType, ketuaName, sekretarisName, bendaharaName, editingLetter]);

  React.useEffect(() => {
    if (editingLetter) return;
    if (signRightType === 'Custom' || signRightType === 'None') return;
    const node = structures?.find(n => n.id === signRightType);
    if (node) {
      setSignRightName(node.name);
      setSignRightTitle(node.title);
    } else if (signRightType === 'Ketua') {
      setSignRightName(ketuaName);
      setSignRightTitle('Ketua Yayasan');
    } else if (signRightType === 'Sekretaris') {
      setSignRightName(sekretarisName);
      setSignRightTitle('Sekretaris Yayasan');
    } else if (signRightType === 'Bendahara') {
      setSignRightName(bendaharaName);
      setSignRightTitle('Bendahara Yayasan');
    }
  }, [structures, signRightType, ketuaName, sekretarisName, bendaharaName, editingLetter]);

  const handleLeftSigneeTypeChange = (val: string) => {
    setSignLeftType(val);
    if (val === 'Custom') {
      // Keep existing or empty for user input
    } else if (val === 'None') {
      setSignLeftName('');
      setSignLeftTitle('');
    } else {
      const node = structures?.find(n => n.id === val);
      if (node) {
        setSignLeftName(node.name);
        setSignLeftTitle(node.title);
      } else if (val === 'Ketua') {
        setSignLeftName(ketuaName);
        setSignLeftTitle('Ketua Yayasan');
      } else if (val === 'Sekretaris') {
        setSignLeftName(sekretarisName);
        setSignLeftTitle('Sekretaris Yayasan');
      } else if (val === 'Bendahara') {
        setSignLeftName(bendaharaName);
        setSignLeftTitle('Bendahara Yayasan');
      }
    }
  };

  const handleRightSigneeTypeChange = (val: string) => {
    setSignRightType(val);
    if (val === 'Custom') {
      // Keep existing or empty for user input
    } else if (val === 'None') {
      setSignRightName('');
      setSignRightTitle('');
    } else {
      const node = structures?.find(n => n.id === val);
      if (node) {
        setSignRightName(node.name);
        setSignRightTitle(node.title);
      } else if (val === 'Ketua') {
        setSignRightName(ketuaName);
        setSignRightTitle('Ketua Yayasan');
      } else if (val === 'Sekretaris') {
        setSignRightName(sekretarisName);
        setSignRightTitle('Sekretaris Yayasan');
      } else if (val === 'Bendahara') {
        setSignRightName(bendaharaName);
        setSignRightTitle('Bendahara Yayasan');
      }
    }
  };

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
    
    if (editingInwardLetter) {
      const updatedIn: LetterInward = {
        ...editingInwardLetter,
        letterNumber: inNum,
        sender: inSender,
        subject: inSubject,
        receivedDate: inDate,
        status: inStatus,
        attachmentUrl: inAttachmentBase64 || undefined
      };
      if (onUpdateInwardLetter) {
        onUpdateInwardLetter(updatedIn);
      }
      setIsFormInOpen(false);
      setEditingInwardLetter(null);
      alert('Surat Masuk Berhasil Diperbarui.');
    } else {
      const newIn: LetterInward = {
        id: `LET-IN-${Date.now()}`,
        letterNumber: inNum,
        sender: inSender,
        subject: inSubject,
        receivedDate: inDate,
        status: inStatus,
        attachmentUrl: inAttachmentBase64 || undefined
      };
      onAddInwardLetter(newIn);
      setIsFormInOpen(false);
      alert('Surat Masuk Berhasil Diarsip ke Sekretariat.');
    }

    // Reset fields
    setInNum('');
    setInSender('');
    setInSubject('');
    setInDate(new Date().toISOString().split('T')[0]);
    setInStatus('Disposisi');
    setInAttachmentBase64('');
    setInAttachmentName('');
  };

  const handleComposeOutwardLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outRecipient || !outSubject || !outContent) {
      alert('Isi data surat keluar secara lengkap!');
      return;
    }

    if (editingLetter) {
      const updatedOut: LetterOutward = {
        ...editingLetter,
        templateType: outType,
        recipient: outRecipient,
        subject: outSubject,
        content: outContent,
        signLeftType,
        signLeftName,
        signLeftTitle,
        signRightType,
        signRightName,
        signRightTitle,
        showStamp,
        stampTarget,
        stampOffsetX,
        stampOffsetY,
        stampSize,
        signPlaceDate,
        additionalSignatures
      };

      onUpdateOutwardLetter(updatedOut);
      setIsFormOutOpen(false);
      setEditingLetter(null);

      setOutRecipient('');
      setOutSubject('');
      setOutContent('');
      alert('Perubahan Surat Keluar berhasil disimpan!');
      return;
    }

    const serialNumber = generateOutwardLetterNumber(outType);

    // If composer is Super Admin / Sekretaris, pre-approve right away!
    // Others route into pending state in App Center
    const isOfficer = isEditable;
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
      status: resolvedStatus,
      signLeftType,
      signLeftName,
      signLeftTitle,
      signRightType,
      signRightName,
      signRightTitle,
      showStamp,
      stampTarget,
      stampOffsetX,
      stampOffsetY,
      stampSize,
      signPlaceDate,
      additionalSignatures
    };

    onAddOutwardLetter(newOut);
    setIsFormOutOpen(false);
    setOutRecipient('');
    setOutSubject('');
    setOutContent('');
    
    // Reset stamp customization states to default values
    setStampTarget('left');
    setStampOffsetX(0);
    setStampOffsetY(0);
    setStampSize(22);

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
          {subTab === 'outward' && isEditable && (
            <button 
              onClick={handleStartNewOutwardLetter}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSignature className="w-4 h-4" /> Buka Composer Surat Keluar
            </button>
          )}

          {subTab === 'inward' && isEditable && (
            <button 
              onClick={handleStartNewInwardLetter}
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
                    <td className="p-4">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                        <button 
                          onClick={() => setReadingLetter(letter)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat
                        </button>
                        {isEditable && (
                          <button 
                            onClick={() => handleStartEditOutwardLetter(letter)}
                            className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                      </div>
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
                  <th className="p-4 text-center">Aksi Korespondensi</th>
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
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        letter.status === 'Arsip' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                        letter.status === 'Disposisi' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {letter.status || 'Disposisi'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                        <button 
                          onClick={() => setReadingInwardLetter(letter)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat detil
                        </button>
                        {isEditable && (
                          <>
                            <button 
                              onClick={() => handleStartEditInwardLetter(letter)}
                              className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                            {deleteConfirmId === letter.id ? (
                              <div className="flex items-center gap-1 z-10 shrink-0">
                                <button
                                  onClick={() => {
                                    if (onDeleteInwardLetter) {
                                      onDeleteInwardLetter(letter.id, letter.letterNumber);
                                    }
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-2 py-1 bg-red-650 hover:bg-red-700 text-white rounded font-bold text-[9px] cursor-pointer whitespace-nowrap"
                                >
                                  Yakin?
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[9px] cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setDeleteConfirmId(letter.id)}
                                className="p-1 bg-red-50 hover:bg-red-100 text-red-650 rounded border border-red-200 text-[10px] font-bold flex items-center cursor-pointer transition-colors"
                                title="Hapus Surat Masuk"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
          <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
            <div>
              <h3 className="text-md font-semibold text-slate-800">Dokumen Arsip Hukum & SOP Kelembagaan</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Arsip legalitas, SK Menkumham, sertifikat denda pajak, dokumen AD/ART, dan Memorandum of Understanding (MoU) kemitraan dengan universitas/gereja lokal.
              </p>
            </div>
            {isEditable && (
              <button
                onClick={() => setIsUploadDocOpen(true)}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors whitespace-nowrap"
              >
                <Upload className="w-4 h-4" /> Unggah Dokumen Baru
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {documents.filter(doc => !doc.deleted).map((doc) => (
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
                
                <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between gap-2 text-xs">
                  <div className="flex gap-1.5 items-center">
                    {isEditable && (
                      deleteConfirmId === doc.id ? (
                        <div className="flex items-center gap-1 z-10">
                          <button
                            onClick={() => {
                              if (onDeleteDocument) {
                                onDeleteDocument(doc.id, doc.name);
                              }
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 bg-red-650 hover:bg-red-700 text-white rounded font-bold text-[9px] cursor-pointer whitespace-nowrap"
                          >
                            Yakin?
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[9px] cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirmId(doc.id)}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-650 rounded border border-red-200 text-[10px] font-bold flex items-center cursor-pointer transition-colors"
                          title="Hapus Dokumen"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">&bull; Salinan Resmi</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => setPreviewingDocument(doc)}
                      className="p-1 px-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Pratinjau
                    </button>
                    <a 
                      href={`/api/documents/download/${doc.id}`}
                      download
                      className="p-1 px-3 bg-slate-800 hover:bg-slate-900 border border-slate-705 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DIALOG: UPLOAD DOKUMEN RESMI (MAKS 5 MB) */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden scale-95 transition-transform my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">Unggah Berkas Dokumen Resmi</dt>
                <dd className="text-[11px] text-slate-300">Batas kapasitas koordinasi fail maks. 5 MB</dd>
              </div>
              <button 
                type="button"
                onClick={() => setIsUploadDocOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs font-sans">
              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Kategori Dokumen :</label>
                <select 
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none"
                >
                  <option value="Konstitusi Organisasi">Konstitusi Organisasi</option>
                  <option value="SOP Keuangan">SOP Keuangan</option>
                  <option value="Legalitas Kelembagaan">Legalitas Kelembagaan</option>
                  <option value="Perpajakan & Legalitas">Perpajakan & Legalitas</option>
                  <option value="Akademik & Kemitraan">Akademik & Kemitraan</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Nama Dokumen Resmi / Berkas :</label>
                <input 
                  type="text" 
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Contoh: AD-ART ESM Terbaru 2026"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Pilih Berkas Fail (Maks. 5 MB) :</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg,.zip"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required={!uploadBase64}
                  />
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-slate-600 font-medium text-center">
                    {uploadFile ? uploadFile.name : "Klik untuk memilih fail atau drop disini"}
                  </p>
                  <p className="text-slate-400 text-[10px] mt-1 text-center">
                    {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : "Mendukung PDF, Word, Excel, Gambar, ZIP (~5MB)"}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsUploadDocOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Arsipkan Dokumen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: DIGITAL DOCUMENT PREVIEW MODAL */}
      {previewingDocument && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 w-full max-w-4xl overflow-hidden scale-95 transition-transform my-4 flex flex-col h-[85vh]">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <dt className="text-sm font-bold truncate max-w-md">{previewingDocument.name}</dt>
                  <dd className="text-[11px] text-slate-350 flex items-center gap-2">
                    <span className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase">{previewingDocument.category}</span>
                    <span>&bull;</span>
                    <span>Diunggah: {previewingDocument.uploadedDate}</span>
                    <span>&bull;</span>
                    <span>Ukuran: {previewingDocument.fileSize}</span>
                  </dd>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewingDocument(null)} 
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                title="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Preview Container */}
            <div className="flex-1 bg-slate-100 p-4 flex flex-col md:flex-row gap-4 overflow-hidden">
              {/* Left Side: Browser Preview Frame */}
              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-inner overflow-hidden relative flex flex-col h-full">
                <iframe 
                  src={`/api/documents/preview/${previewingDocument.id}`}
                  className="w-full h-full border-none"
                  title={`Pratinjau dari ${previewingDocument.name}`}
                />
              </div>

              {/* Right Side: Quick Meta & Actions Panel */}
              <div className="w-full md:w-64 bg-white rounded-xl border border-slate-200 p-4 shrink-0 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs border-b pb-2 font-sans">Status Arsip Elektronik</h4>
                  
                  <div className="space-y-2.5 text-[11px]">
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">ID Register</span>
                      <code className="text-slate-700 font-mono bg-slate-50 px-1 py-0.5 rounded block truncate">{previewingDocument.id}</code>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Aksesibilitas</span>
                      <span className="text-slate-700 font-medium">Internal Yayasan (Terenkripsi)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[9px]">Masa Berlaku</span>
                      <span className="text-slate-750 font-bold text-emerald-600">Aktif & Absah</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[10px] text-slate-500 leading-relaxed space-y-1.5">
                    <p className="font-bold text-slate-700">Validitas Digital (SI-ARSEP):</p>
                    <p>Sistem berkas memverifikasi salinan di sebelah kiri sebagai representasi sah arsip fisik.</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <a 
                    href={`/api/documents/download/${previewingDocument.id}`}
                    download
                    className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" /> Unduh Berkas
                  </a>
                  <button 
                    onClick={() => setPreviewingDocument(null)}
                    type="button"
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: REGISTRASI & EDIT SURAT MASUK */}
      {isFormInOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden scale-95 transition-transform my-8">
            
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">
                  {editingInwardLetter ? `Sistem Edit Surat Masuk (${editingInwardLetter.letterNumber})` : 'Sistem Registrasi Surat Masuk (Inbox)'}
                </dt>
                <dd className="text-[11px] text-slate-350">
                  {editingInwardLetter ? 'Perubahan pada berkas surat masuk akan disimpan ke database.' : 'Menerima dan melaporkan surat dinas luar yang masuk ke sekretariat.'}
                </dd>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsFormInOpen(false);
                  setEditingInwardLetter(null);
                }} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSaveInwardLetter} className="p-6 space-y-4 text-xs font-sans">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Nomor Berkas Surat :</label>
                  <input 
                    type="text" 
                    value={inNum}
                    onChange={(e) => setInNum(e.target.value)}
                    placeholder="Contoh: 120/EXT/DINSOS/VI/2026"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Instansi Pengirim :</label>
                  <input 
                    type="text" 
                    value={inSender}
                    onChange={(e) => setInSender(e.target.value)}
                    placeholder="Contoh: Dinas Sosial / Kantor Camat"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Perihal / Agenda Surat :</label>
                <input 
                  type="text" 
                  value={inSubject}
                  onChange={(e) => setInSubject(e.target.value)}
                  placeholder="Contoh: Undangan Koordinasi Hibah Kemasyarakatan"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Tanggal Berkas Diterima :</label>
                  <input 
                    type="date" 
                    value={inDate}
                    onChange={(e) => setInDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1 font-semibold">Status Alur Disposisi :</label>
                  <select 
                    value={inStatus}
                    onChange={(e) => setInStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:outline-none"
                  >
                    <option value="Disposisi">Perlu Disposisi Ketua</option>
                    <option value="Tindak Lanjut">Tindak Lanjut Staf</option>
                    <option value="Arsip">Selesai & Arsipkan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Unggah File Scan Fisik Surat (Maks 5 MB) :</label>
                <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 relative hover:bg-slate-100/50 transition-colors">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('Ukuran berkas melebihi batas 5 MB!');
                          return;
                        }
                        setInAttachmentName(file.name);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setInAttachmentBase64(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="space-y-1">
                    <Upload className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="text-slate-600 font-medium">
                      {inAttachmentName ? (
                        <span className="text-indigo-650 font-bold truncate block max-w-xs mx-auto">{inAttachmentName}</span>
                      ) : (
                        <span>Pilih scan gambar/PDF dokumen atau tarik kesini</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">Batas toleransi penampung koordinasi fail maksimal 5 MB</p>
                  </div>
                </div>
                {inAttachmentBase64 && (
                  <div className="mt-2 flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => {
                        setInAttachmentBase64('');
                        setInAttachmentName('');
                      }}
                      className="text-red-500 hover:text-red-700 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash className="w-3 h-3" /> Hapus Lampiran
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsFormInOpen(false);
                    setEditingInwardLetter(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
                >
                  {editingInwardLetter ? 'Simpan Perubahan' : 'Registrasikan Surat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: DETAILED INWARD LETTER READER OVERLAY */}
      {readingInwardLetter && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-xl overflow-hidden scale-95 transition-transform my-8">
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-400" /> Detil Arsip Surat Masuk
                </dt>
                <dd className="text-[11px] text-slate-350">
                  Surat diterima dan diarsipkan di database sekretariat ESM.
                </dd>
              </div>
              <button 
                type="button"
                onClick={() => setReadingInwardLetter(null)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs font-sans">
              <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider font-mono">Nomor Berkas Surat</span>
                    <strong className="text-slate-800 text-xs font-mono">{readingInwardLetter.letterNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider font-mono">Status Pengarsipan</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block border ${
                      readingInwardLetter.status === 'Arsip' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                      readingInwardLetter.status === 'Disposisi' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                      'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {readingInwardLetter.status || 'Disposisi'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider font-mono">Instansi Pengirim</span>
                    <span className="text-slate-800 font-bold text-xs">{readingInwardLetter.sender}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider font-mono">Tanggal Diterima</span>
                    <span className="text-slate-600 font-semibold">{formatIndonesianDate(readingInwardLetter.receivedDate)}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider font-mono">Perihal Agenda</span>
                  <p className="text-slate-800 font-bold text-xs mt-0.5">{readingInwardLetter.subject}</p>
                </div>
              </div>

              {/* ATTACHMENT DETAILS */}
              <div className="border border-slate-100 rounded-2xl p-5 bg-white space-y-3">
                <span className="text-slate-800 text-xs font-bold block uppercase tracking-wide">Lampiran Dokumen Scan Asli</span>
                {readingInwardLetter.attachmentUrl ? (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck2 className="w-8 h-8 text-indigo-600 shrink-0" />
                      <div className="truncate pr-2">
                        <p className="font-bold text-slate-800 text-[11px] truncate">Scan_Surat_Masuk_{readingInwardLetter.id}.pdf/img</p>
                        <p className="text-[10px] text-slate-400">Tersimpan di Cloud Database</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5 shrink-0">
                      <a 
                        href={`/api/inward_letters/preview/${readingInwardLetter.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Pratinjau
                      </a>
                      <a 
                        href={`/api/inward_letters/download/${readingInwardLetter.id}`} 
                        download={`Scan_Surat_Masuk_${readingInwardLetter.letterNumber?.replace(/\//g, '_') || 'doc'}.pdf`}
                        className="px-3 py-1.5 bg-indigo-550 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Unduh
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center space-y-2">
                    <p className="text-[11px] text-slate-500 font-semibold">Tidak ada dokumen fisik yang dilampirkan.</p>
                    <p className="text-[10px] text-slate-400 max-w-sm leading-relaxed px-4">
                      Unggah berkas asli saat pengeditan atau klik tombol di bawah untuk memasang berkas simulasi demi pengujian fungsionalitas Pratinjau & Unduh secara instan.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const demoText = `YAYASAN PELAYANAN SISWA & MAHASISWA INDONESIA (ESM)
--------------------------------------------------
DOKUMEN INTEGRASI SURAT MASUK (SIMULASI PENERIMAAN)
--------------------------------------------------
Register ID : ${readingInwardLetter.id}
No. Berkas  : ${readingInwardLetter.letterNumber || '-'}
Pengirim    : ${readingInwardLetter.sender || '-'}
Perihal     : ${readingInwardLetter.subject || '-'}
Diterima Tgl: ${readingInwardLetter.receivedDate || '-'}
Aliran Dok  : ${readingInwardLetter.status || 'Disposisi'}

Status Arsip: ELEKTRONIK (SI-ARSEP) REGISTERED`;
                        const base64Encoded = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(demoText)));
                        const updatedLetterObj: LetterInward = {
                          ...readingInwardLetter,
                          attachmentUrl: base64Encoded
                        };
                        if (onUpdateInwardLetter) {
                          onUpdateInwardLetter(updatedLetterObj);
                        }
                        setReadingInwardLetter(updatedLetterObj);
                        alert('File scan simulasi fungsional berhasil dimasukkan! Silakan klik Pratinjau atau Unduh sekarang.');
                      }}
                      className="px-3.5 py-1.5 mt-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg cursor-pointer transition-all"
                    >
                      Pasang File Scan Simulasi (Uji Demo)
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setReadingInwardLetter(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold cursor-pointer transition-colors"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSER MODAL FOR LETTERS OUTWARD (SURAT KELUAR) */}
      {isFormOutOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden scale-95 transition-transform my-8">
            
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">
                  {editingLetter ? `Sistem Edit Surat Keluar (${editingLetter.letterNumber})` : 'Sistem Penyusunan Surat Keluar (Outbox)'}
                </dt>
                <dd className="text-[11px] text-slate-300">
                  {editingLetter ? 'Perubahan pada isi surat akan disimpan secara dinamis ke database.' : 'Setiap surat keluar akan mereferensikan format nomor registrasi otomatis.'}
                </dd>
              </div>
              <button 
                type="button"
                onClick={() => setIsFormOutOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
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
                  <textarea 
                    value={outRecipient}
                    onChange={(e) => setOutRecipient(e.target.value)}
                    placeholder="Contoh:&#10;Pdt. Jeffrey Siauw, D.Th.&#10;Lead Pastor Gracelife Community Church"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs min-h-[70px] resize-y"
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

              {/* PENGATURAN TANDA TANGAN & STEMPEL (DYNAMIC SIGNEES) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-slate-800 font-bold block text-xs uppercase tracking-wide">Pengaturan Otorisasi & Tanda Tangan PDF</span>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showStamp}
                      onChange={(e) => setShowStamp(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Bubuhkan Stempel Lembaga</span>
                  </label>
                </div>

                {/* STEMPELS CUSTOM LAYOUT (NON-STATIC SETUP) */}
                {showStamp && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 mt-2 space-y-3.5">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                      Kustomisasi Tata Letak Stempel Resmi (Kamera/Gambar Transparan)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[10px]">
                      <div>
                        <label className="text-slate-600 block mb-1 font-bold">Sasaran Overlap Stempel:</label>
                        <select
                          value={stampTarget}
                          onChange={(e) => setStampTarget(e.target.value as any)}
                          className="w-full border border-slate-250 rounded-lg p-1.5 bg-white text-slate-800 text-[10px] font-sans focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value="left">Tanda Tangan Kiri (Overlay 1/4 Sisi Kiri)</option>
                          <option value="right">Tanda Tangan Kanan (Overlay 1/4 Sisi Kiri)</option>
                          <option value="center">Murni di Tengah Kertas (Center Alignment)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-600 block mb-1 font-bold">Diameter Ukuran Stempel (mm):</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="10"
                            max="50"
                            value={stampSize}
                            onChange={(e) => setStampSize(Number(e.target.value))}
                            className="flex-1 accent-indigo-600 cursor-pointer"
                          />
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-755 min-w-[28px] text-center font-bold text-[10px]">
                            {stampSize}mm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-600 block mb-1 font-bold flex justify-between">
                          <span>Geser Horisontal (X-Offset):</span>
                          <span className="font-mono text-[9px] text-slate-500">({stampOffsetX > 0 ? `+${stampOffsetX}` : stampOffsetX} mm)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400">Kiri</span>
                          <input
                            type="range"
                            min="-40"
                            max="40"
                            value={stampOffsetX}
                            onChange={(e) => setStampOffsetX(Number(e.target.value))}
                            className="flex-1 accent-indigo-600 cursor-pointer"
                          />
                          <span className="text-[9px] text-slate-400">Kanan</span>
                          <button
                            type="button"
                            onClick={() => setStampOffsetX(0)}
                            className="text-[9px] font-semibold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer border border-slate-200"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-600 block mb-1 font-bold flex justify-between">
                          <span>Geser Vertikal (Y-Offset):</span>
                          <span className="font-mono text-[9px] text-slate-500">({stampOffsetY > 0 ? `+${stampOffsetY}` : stampOffsetY} mm)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400">Atas</span>
                          <input
                            type="range"
                            min="-40"
                            max="40"
                            value={stampOffsetY}
                            onChange={(e) => setStampOffsetY(Number(e.target.value))}
                            className="flex-1 accent-indigo-600 cursor-pointer"
                          />
                          <span className="text-[9px] text-slate-400">Bawah</span>
                          <button
                            type="button"
                            onClick={() => setStampOffsetY(0)}
                            className="text-[9px] font-semibold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer border border-slate-200"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* LOKASI & TANGGAL PENGESAHAN (PLACE AND DATE) */}
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Lokasi & Tanggal Surat (Muncul di Atas Tanda Tangan):
                  </label>
                  <input
                    type="text"
                    value={signPlaceDate}
                    onChange={(e) => setSignPlaceDate(e.target.value)}
                    placeholder="Contoh: Cilegon, 12 Juni 2026"
                    className="w-full border border-slate-250 rounded-lg p-2 text-slate-850 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    * Format ini akan tercetak secara presisi di atas tanda tangan kanan (atau kiri jika tunggal) dan menyelaraskan penamaan surat dinas.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PENANDATANGAN 1 (KIRI) */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 block">Penandatangan Utama 1 (Kiri):</label>
                    <select
                      value={signLeftType}
                      onChange={(e) => handleLeftSigneeTypeChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 bg-white text-slate-800 text-[11px]"
                    >
                      {structures && structures.map(n => (
                        <option key={n.id} value={n.id}>{n.title} ({n.name})</option>
                      ))}
                      {(!structures || !structures.some(n => n.id === 'ketua')) && (
                        <option value="Ketua">Ketua Dewan/Yayasan ({ketuaName})</option>
                      )}
                      {(!structures || !structures.some(n => n.id === 'sekretaris')) && (
                        <option value="Sekretaris">Sekretaris ({sekretarisName})</option>
                      )}
                      {(!structures || !structures.some(n => n.id === 'bendahara')) && (
                        <option value="Bendahara">Bendahara ({bendaharaName})</option>
                      )}
                      <option value="Custom">Kustom (Ketik Manual)</option>
                      <option value="None">Tanpa Tanda Tangan Kiri</option>
                    </select>

                    {signLeftType !== 'None' && (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={signLeftName}
                          onChange={(e) => setSignLeftName(e.target.value)}
                          placeholder="Nama lengkap penandatangan"
                          className="w-full border border-slate-200 rounded-lg p-1.5 text-slate-800 text-[10.5px]"
                          disabled={signLeftType !== 'Custom'}
                          required
                        />
                        <input
                          type="text"
                          value={signLeftTitle}
                          onChange={(e) => setSignLeftTitle(e.target.value)}
                          placeholder="Jabatan resmi"
                          className="w-full border border-slate-200 rounded-lg p-1.5 text-slate-500 text-[10.5px]"
                          disabled={signLeftType !== 'Custom'}
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* PENANDATANGAN 2 (KANAN) */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 block">Penandatangan Utama 2 (Kanan):</label>
                    <select
                      value={signRightType}
                      onChange={(e) => handleRightSigneeTypeChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 bg-white text-slate-800 text-[11px]"
                    >
                      {structures && structures.map(n => (
                        <option key={n.id} value={n.id}>{n.title} ({n.name})</option>
                      ))}
                      {(!structures || !structures.some(n => n.id === 'sekretaris')) && (
                        <option value="Sekretaris">Sekretaris ({sekretarisName})</option>
                      )}
                      {(!structures || !structures.some(n => n.id === 'ketua')) && (
                        <option value="Ketua">Ketua Dewan/Yayasan ({ketuaName})</option>
                      )}
                      {(!structures || !structures.some(n => n.id === 'bendahara')) && (
                        <option value="Bendahara">Bendahara ({bendaharaName})</option>
                      )}
                      <option value="Custom">Kustom (Ketik Manual)</option>
                      <option value="None">Tanpa Tanda Tangan Kanan</option>
                    </select>

                    {signRightType !== 'None' && (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={signRightName}
                          onChange={(e) => setSignRightName(e.target.value)}
                          placeholder="Nama lengkap penandatangan"
                          className="w-full border border-slate-200 rounded-lg p-1.5 text-slate-800 text-[10.5px]"
                          disabled={signRightType !== 'Custom'}
                          required
                        />
                        <input
                          type="text"
                          value={signRightTitle}
                          onChange={(e) => setSignRightTitle(e.target.value)}
                          placeholder="Jabatan resmi"
                          className="w-full border border-slate-200 rounded-lg p-1.5 text-slate-500 text-[10.5px]"
                          disabled={signRightType !== 'Custom'}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TANDA TANGAN TAMBAHAN CUSTOM */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                    Tanda Tangan Tambahan (Dipilih dari Struktur Organisasi):
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">
                    * Opsional
                  </span>
                </div>

                {/* List of currently added signatures */}
                {additionalSignatures.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {additionalSignatures.map((sig, idx) => (
                      <div key={sig.id} className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between text-xs font-semibold text-slate-700 shadow-sm">
                        <div className="truncate pr-2">
                          <p className="text-slate-800 text-[11px] truncate font-sans">{sig.name}</p>
                          <p className="text-[9px] text-slate-400 truncate font-sans">{sig.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdditionalSignatures(prev => prev.filter(s => s.id !== sig.id))}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded text-[9px] font-bold cursor-pointer transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2.5 border border-dashed border-slate-200 rounded-lg bg-white/50">
                    <p className="text-[10px] text-slate-400 font-sans">Belum ada tanda tangan tambahan yang ditambahkan.</p>
                  </div>
                )}

                {/* Input form to add a new additional signatory from structures */}
                <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                  <div className="flex-1">
                    <select
                      value={selectedAdditionalNodeId}
                      onChange={(e) => setSelectedAdditionalNodeId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-1.5 bg-white text-slate-800 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Jabatan / Personel Struktur --</option>
                      {structures && structures
                        .map(n => (
                          <option key={n.id} value={n.id}>
                            {n.title} ({n.name})
                          </option>
                        ))
                      }
                      {/* Standard fallback nodes */}
                      {!structures || structures.length === 0 ? (
                        <>
                          <option value="korwil">Koordinator Wilayah (Ahmad Faisal, S.Th.)</option>
                          <option value="staff">Staf Lapangan (Simpatisan Mitra Aliansi)</option>
                        </>
                      ) : null}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedAdditionalNodeId) {
                        alert('Silakan pilih salah satu jabatan dari struktur organisasi.');
                        return;
                      }
                      // Find node in structures
                      let resolvedName = '';
                      let resolvedTitle = '';
                      const matchedNode = structures?.find(n => n.id === selectedAdditionalNodeId);
                      if (matchedNode) {
                        resolvedName = matchedNode.name;
                        resolvedTitle = matchedNode.title;
                      } else if (selectedAdditionalNodeId === 'korwil') {
                        resolvedName = 'Ahmad Faisal, S.Th.';
                        resolvedTitle = 'Koordinator Wilayah';
                      } else if (selectedAdditionalNodeId === 'staff') {
                        resolvedName = 'Simpatisan Mitra Aliansi';
                        resolvedTitle = 'Staf Lapangan';
                      }

                      if (!resolvedName) return;

                      // Check duplicate
                      if (additionalSignatures.some(s => s.nodeId === selectedAdditionalNodeId)) {
                        alert('Jabatan Kristen / Yayasan ini sudah ditambahkan.');
                        return;
                      }

                      const newSig = {
                        id: `SIG-${Date.now()}`,
                        nodeId: selectedAdditionalNodeId,
                        name: resolvedName,
                        title: resolvedTitle,
                      };
                      setAdditionalSignatures(prev => [...prev, newSig]);
                      setSelectedAdditionalNodeId('');
                    }}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10.5px] cursor-pointer transition-colors flex items-center justify-center"
                  >
                    + Tambahkan Tanda Tangan
                  </button>
                </div>
              </div>

              <div className="bg-slate-550/5 p-3 rounded-xl border border-slate-200 text-slate-600 italic">
                {editingLetter ? (
                  <>Mengubah detail Surat Keluar No: <strong className="text-slate-800">{editingLetter.letterNumber}</strong></>
                ) : (
                  <>Sesuai parameter di atas, nomor serial yang akan diterbitkan: <strong className="text-slate-800">{generateOutwardLetterNumber(outType)}</strong></>
                )}
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
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md inline-flex items-center gap-1.5"
                >
                  {editingLetter ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Simpan Perubahan
                    </>
                  ) : (
                    <>
                      <FileSignature className="w-4 h-4" /> Terbitkan Surat resmi
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* POPUP: DETAILED LETTER READER OVERLAY (A4 size format) */}
      {readingLetter && (() => {
        // Indonesian date formatter for elegant reading view
        const formatIndonesianDate = (dateStr: string): string => {
          if (!dateStr) return '';
          try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const year = parts[0];
              const monthIndex = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              const months = [
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ];
              return `${day < 10 ? '0' + day : day} ${months[monthIndex]} ${year}`;
            }
          } catch (e) {
            // ignore
          }
          return dateStr;
        };

        const leftType = readingLetter.signLeftType || 'Ketua';
        const rightType = readingLetter.signRightType || 'Sekretaris';
        const showStamp = readingLetter.showStamp !== false;
        const finalPlaceDate = readingLetter.signPlaceDate || `Cilegon, ${formatIndonesianDate(readingLetter.date || new Date().toISOString().substring(0, 10))}`;

        const ketuaNode = structures?.find(n => n?.id === 'ketua' || n?.id === 'ketua_yayasan') || structures?.find(n => n?.title?.toLowerCase().includes('ketua'));
        const ketuaNameResolved = ketuaNode?.name || 'Fernandes';

        const sekretarisNode = structures?.find(n => n?.id === 'sekretaris') || structures?.find(n => n?.title?.toLowerCase().includes('sekretaris'));
        const sekretarisNameResolved = sekretarisNode?.name || 'Yusuf Raja Tamba';

        const bendaharaNode = structures?.find(n => n?.id === 'bendahara') || structures?.find(n => n?.title?.toLowerCase().includes('bendahara'));
        const bendaharaNameResolved = bendaharaNode?.name || 'Angelina';

        const leftName = readingLetter.signLeftName || (
          leftType.toLowerCase() === 'ketua' ? ketuaNameResolved : 
          leftType.toLowerCase() === 'sekretaris' ? sekretarisNameResolved : 
          leftType.toLowerCase() === 'bendahara' ? bendaharaNameResolved : ''
        );
        const leftTitle = readingLetter.signLeftTitle || (
          leftType.toLowerCase() === 'ketua' ? 'Ketua Yayasan' : 
          leftType.toLowerCase() === 'sekretaris' ? 'Sekretaris Yayasan' : 
          leftType.toLowerCase() === 'bendahara' ? 'Bendahara Yayasan' : ''
        );

        const rightName = readingLetter.signRightName || (
          rightType.toLowerCase() === 'ketua' ? ketuaNameResolved : 
          rightType.toLowerCase() === 'sekretaris' ? sekretarisNameResolved : 
          rightType.toLowerCase() === 'bendahara' ? bendaharaNameResolved : ''
        );
        const rightTitle = readingLetter.signRightTitle || (
          rightType.toLowerCase() === 'ketua' ? 'Ketua Yayasan' : 
          rightType.toLowerCase() === 'sekretaris' ? 'Sekretaris Yayasan' : 
          rightType.toLowerCase() === 'bendahara' ? 'Bendahara Yayasan' : ''
        );

        const resolveSignatureImg = (type: string, title: string, name: string) => {
          const tType = String(type || '').toLowerCase();
          const tTitle = String(title || '').toLowerCase();
          const tName = String(name || '').toLowerCase();

          // 0. Check customSignatures list in profile
          if (profile?.customSignatures && Array.isArray(profile.customSignatures)) {
            const match = profile.customSignatures.find(cs => {
              const csName = String(cs.name || '').toLowerCase();
              const csTitle = String(cs.title || '').toLowerCase();
              return (tName && csName.includes(tName)) || (tTitle && csTitle.includes(tTitle));
            });
            if (match && match.signatureUrl) {
              return match.signatureUrl;
            }
          }

          // 1. Check if name matches known people or structures
          if (tName.includes('triawan') || tName.includes('fernandes')) {
            return profile?.signatureChairmanUrl || '';
          }
          if (tName.includes('faisal') || tName.includes('johannes lie') || tName.includes('lie') || tName.includes('yusuf')) {
            return profile?.signatureSecretaryUrl || '';
          }
          if (tName.includes('ruth') || tName.includes('sarah') || tName.includes('sitorus') || tName.includes('angelina')) {
            return profile?.signatureTreasurerUrl || profile?.signatureUrl || '';
          }

          // 2. Check title or type
          if (tType.includes('ketua') || tTitle.includes('ketua') || tType === 'ketuapembina' || tTitle.includes('pembina')) {
            return profile?.signatureChairmanUrl || '';
          }
          if (tType.includes('sekretaris') || tTitle.includes('sekretaris') || tType.includes('secretary')) {
            return profile?.signatureSecretaryUrl || '';
          }
          if (tType.includes('bendahara') || tTitle.includes('bendahara') || tType.includes('treasurer')) {
            return profile?.signatureTreasurerUrl || profile?.signatureUrl || '';
          }

          // 3. Fallbacks to type matches
          if (tType === 'ketua') return profile?.signatureChairmanUrl || '';
          if (tType === 'sekretaris') return profile?.signatureSecretaryUrl || '';
          if (tType === 'bendahara') return profile?.signatureTreasurerUrl || profile?.signatureUrl || '';

          return '';
        };

        const leftSignatureImg = resolveSignatureImg(leftType, leftTitle, leftName);
        const rightSignatureImg = resolveSignatureImg(rightType, rightTitle, rightName);

        return (
          <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[800px] overflow-hidden p-10 md:p-14 font-serif text-slate-900 flex flex-col justify-between my-8 min-h-[750px] relative">
              
              {/* Kop Surat Header matching professional PDF exact look */}
              <div className="border-b-[3px] border-double border-slate-900 pb-4 relative flex items-center gap-5 select-none text-left">
                {profile?.logoUrl ? (
                  <img 
                    src={profile.logoUrl} 
                    alt="Logo Pembina" 
                    referrerPolicy="no-referrer"
                    className="w-[75px] h-[75px] object-contain shrink-0" 
                  />
                ) : (
                  <div className="w-[72px] h-[72px] border-2 border-red-700 rounded-full flex items-center justify-center relative select-none shrink-0">
                    <div className="w-[62px] h-[62px] border border-red-700 rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-red-700/60"></div>
                      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-red-700/60"></div>
                      <span className="font-serif font-black text-[9px] text-red-700 bg-white px-1 z-10 tracking-wider">ESM</span>
                    </div>
                  </div>
                )}
                
                <div className="flex-1 text-center">
                  <h2 className="font-serif italic font-extrabold text-[15px] md:text-[21px] tracking-tight text-slate-900 uppercase leading-tight">
                    {profile?.kopTitle || profile?.name || 'EVANGELICAL STUDENT MOVEMENT'}
                  </h2>
                  <p className="font-serif font-black text-[10px] md:text-[11.5px] text-slate-800 tracking-widest mt-0.5 uppercase">
                    {profile?.kopMotto || 'Kabar baik. Pemuridan. Misi.'}
                  </p>
                  <p className="text-[9.5px] text-slate-800 font-medium tracking-tight mt-1 leading-snug">
                    {profile?.address || 'Link. Pal. Asem, RT.01/RW.07, Panggung Rawi, Kec. Jombang, Kota Cilegon, Banten 42412'}
                  </p>
                  <p className="text-[9px] text-slate-650 font-normal mt-0.5 tracking-tight">
                    {profile?.email ? `email: ${profile.email}` : 'email: esmofnusantara@gmail.com'}
                    {profile?.phone ? `   •   Telepon: ${profile.phone}` : '   •   Telepon: +62 812 961 066 11'}
                    {profile?.website ? `   •   Website: ${profile.website}` : ''}
                  </p>
                </div>
              </div>

              {/* Body Letter content structured properly according to standard Indonesian indents */}
              <div className="mt-8 space-y-5 text-left font-serif text-[12.5px] md:text-[13.5px] text-slate-950 flex-1 leading-relaxed">
                
                {/* Publish Date - Right Aligned */}
                <div className="text-right font-serif text-slate-900 font-medium">
                  {finalPlaceDate}
                </div>

                {/* Serial Fields Block */}
                <div className="space-y-0.5 text-slate-950 leading-relaxed max-w-lg">
                  <p><strong>Nomor</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span className="font-mono tracking-tight">{readingLetter.letterNumber}</span></p>
                  <p><strong>Lampiran</strong>&nbsp;&nbsp;&nbsp;: - (Nihil)</p>
                  <p><strong>Sifat</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: Resmi / Terbuka</p>
                  <p><strong>Perihal</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span className="underline font-bold text-slate-900">{readingLetter.subject}</span></p>
                </div>

                {/* Recipient Details */}
                <div className="pt-3 font-serif">
                  <p>Kepada Yth.</p>
                  <p className="font-extrabold whitespace-pre-wrap text-slate-950 mt-0.5 leading-normal">{readingLetter.recipient}</p>
                  <p className="mt-0.5">di Tempat</p>
                </div>

                {/* Greeting Line */}
                <div className="pt-2 font-serif font-medium text-slate-900">
                  Dengan hormat,
                </div>

                {/* Structured paragraphs mapping with custom spacing alignments */}
                <div className="space-y-4 text-justify whitespace-pre-wrap font-serif leading-relaxed text-[13px] md:text-[14px]">
                  {readingLetter.content}
                </div>
              </div>

              {/* Symmetrical Dual Signatures Block Area replicates standard physical signatures */}
              <div className="mt-12 pt-6 border-t border-slate-100 grid grid-cols-2 gap-10 relative font-serif text-[12.5px] md:text-[13.5px] text-slate-950 select-none pb-6">
                
                {/* Penandatangan Kiri */}
                {leftType !== 'None' && leftType !== 'none' ? (
                  <div className="text-center flex flex-col items-center relative z-25">
                    <p className="font-serif leading-tight h-[18px] mb-1 font-medium">
                      {rightType !== 'None' && rightType !== 'none' ? `${leftTitle},` : finalPlaceDate}
                    </p>
                    
                    {/* Image slot */}
                    <div className="h-14 flex items-center justify-center my-2 relative w-full">
                      {leftSignatureImg ? (
                        <img 
                          src={leftSignatureImg} 
                          alt="TTD Utama" 
                          referrerPolicy="no-referrer"
                          className="max-h-14 object-contain" 
                        />
                      ) : (
                        <div className="h-10 w-28 relative opacity-70 border border-dashed border-indigo-200 rounded flex items-center justify-center bg-indigo-50/20">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-indigo-500 font-semibold">Ink Authorized</span>
                        </div>
                      )}
                    </div>

                    <p className="font-serif font-bold underline leading-none mt-2 text-slate-950">{leftName}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{leftTitle}</p>
                  </div>
                ) : (
                  <div className="text-center opacity-0 h-4">-</div>
                )}

                {/* Penandatangan Kanan */}
                {rightType !== 'None' && rightType !== 'none' ? (
                  <div className="text-center flex flex-col items-center relative z-25">
                    <p className="font-serif leading-tight h-[18px] mb-1 font-medium">{finalPlaceDate}</p>

                    {/* Image slot */}
                    <div className="h-14 flex items-center justify-center my-2 relative w-full">
                      {rightSignatureImg ? (
                        <img 
                          src={rightSignatureImg} 
                          alt="TTD Sekretaris" 
                          referrerPolicy="no-referrer"
                          className="max-h-14 object-contain" 
                        />
                      ) : (
                        <div className="h-10 w-28 relative opacity-70 border border-dashed border-indigo-200 rounded flex items-center justify-center bg-indigo-50/20">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-indigo-500 font-semibold">Ink Authorized</span>
                        </div>
                      )}
                    </div>

                    <p className="font-serif font-bold underline leading-none mt-2 text-slate-950">{rightName}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{rightTitle}</p>
                  </div>
                ) : (
                  <div className="text-center opacity-0 h-4">-</div>
                )}

                {/* OVERLAPPED PHYSICAL ROUND BLUE STAMP WATERMARK */}
                {showStamp && (
                  (() => {
                    const stampTarget = readingLetter.stampTarget || 'left';
                    const stampOffsetX = Number(readingLetter.stampOffsetX) || 0;
                    const stampOffsetY = Number(readingLetter.stampOffsetY) || 0;
                    const stampSize = readingLetter.stampSize || 22;

                    let leftPosStyle = 'left-[12%]';
                    if (stampTarget === 'right') leftPosStyle = 'right-[12%]';
                    if (stampTarget === 'center') leftPosStyle = 'left-[42%]';

                    return (
                      <div 
                        className={`absolute z-30 pointer-events-none transition-all duration-300 ${leftPosStyle}`}
                        style={{ 
                          top: `calc(1rem + ${stampOffsetY}px)`,
                          marginLeft: `${stampOffsetX}px`,
                          width: `${stampSize * 3}px`,
                          height: `${stampSize * 3}px`
                        }}
                      >
                        {profile?.stampUrl ? (
                          <img 
                            src={profile.stampUrl} 
                            alt="Stempel Resmi" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain rotate-[-7deg] opacity-85 hover:opacity-100" 
                          />
                        ) : (
                          <div 
                            className="w-full h-full border-[2px] border-double border-blue-600 rounded-full flex items-center justify-center rotate-[-12deg] opacity-80"
                          >
                            <div className="w-[82%] h-[82%] border border-blue-600 rounded-full flex flex-col items-center justify-center font-sans font-bold text-blue-600 select-none bg-white/50">
                              <span className="text-[5px] uppercase tracking-wide leading-none">YAYASAN</span>
                              <span className="text-xs font-black tracking-widest leading-none my-0.5 mt-0.5 text-blue-600">ESM</span>
                              <span className="text-[5px] uppercase tracking-wide leading-none">CILEGON</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Additional Signaries Block Area */}
              {readingLetter.additionalSignatures && readingLetter.additionalSignatures.length > 0 && (
                <div className={`mt-6 pt-4 border-t border-slate-100 relative font-serif text-[12.5px] md:text-[13.5px] text-slate-950 select-none pb-6 ${
                  readingLetter.additionalSignatures.length === 1 ? 'flex justify-center' : 'grid grid-cols-2 gap-10'
                }`}>
                  {readingLetter.additionalSignatures.map((sig: any, idx: number) => {
                    const sigImg = resolveSignatureImg('', sig.title || '', sig.name || '');
                    const isLoneLast = readingLetter.additionalSignatures.length > 1 && idx === readingLetter.additionalSignatures.length - 1 && idx % 2 === 0;
                    return (
                      <div 
                        key={sig.id || idx} 
                        className={`text-center flex flex-col items-center relative z-25 ${
                          readingLetter.additionalSignatures.length === 1 ? 'max-w-xs w-full' : isLoneLast ? 'col-span-2 mx-auto max-w-xs w-full' : ''
                        }`}
                      >
                        <p className="font-serif leading-tight h-[18px] mb-1 font-medium">{sig.title},</p>
                        
                        <div className="h-14 flex items-center justify-center my-2 relative w-full">
                          {sigImg ? (
                            <img 
                              src={sigImg} 
                              alt={`TTD ${sig.name}`} 
                              referrerPolicy="no-referrer"
                              className="max-h-14 object-contain" 
                            />
                          ) : (
                            <div className="h-10 w-28 relative opacity-70 border border-dashed border-indigo-200 rounded flex items-center justify-center bg-indigo-50/20">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-indigo-500 font-semibold font-sans">Ink Authorized</span>
                            </div>
                          )}
                        </div>

                        <p className="font-serif font-bold underline leading-none mt-2 text-slate-950">{sig.name}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{sig.title}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-6 border-t border-slate-100 flex flex-wrap justify-end gap-3.5 no-print">
                <button 
                  onClick={() => setReadingLetter(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer text-slate-700 shadow-sm transition-all"
                >
                  Tutup Dokumen
                </button>
                {isEditable && (
                  <button 
                    onClick={() => handleStartEditOutwardLetter(readingLetter)}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Edit className="w-4 h-4" /> Edit Surat
                  </button>
                )}
                <button 
                  onClick={() => exportLetterToPDF(readingLetter, profile, structures)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" /> Unduh Surat (PDF)
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
