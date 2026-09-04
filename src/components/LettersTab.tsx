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
  FileCheck2,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { LetterInward, LetterOutward, OrgDocument, InstitutionalProfile } from '../types';
import { exportToCSV, exportLetterToPDF } from '../utils/export';

const GDRIVE_LETTERS_URL = "https://drive.google.com/drive/folders/1xNPhf2uik17NU9RnaL_muZguqiCifQBJ?usp=drive_link";
const MAX_LETTERS_UPLOAD_MB = 1;
const MAX_LETTERS_UPLOAD_BYTES = MAX_LETTERS_UPLOAD_MB * 1024 * 1024;

const getSessionUserToken = () => {
  try {
    const saved = localStorage.getItem('esm_session_user');
    if (saved) {
      const user = JSON.parse(saved);
      return user?.token || '';
    }
  } catch (err) {
    console.error(err);
  }
  return '';
};

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
  onDeleteOutwardLetter?: (id: string, letterNum: string) => void;
  onAddDocument?: (docObj: { id: string; name: string; category: string; fileData?: string; fileSize: string; externalLink?: string }) => Promise<void> | void;
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
  onDeleteOutwardLetter,
  onAddDocument,
  onDeleteDocument,
  currentRole,
  profile,
  structures = [],
}: LettersTabProps) {
  const isEditable = ['Super Admin', 'Ketua Yayasan', 'Sekretaris'].includes(currentRole);
  const [subTab, setSubTab] = useState<'inward' | 'outward' | 'repository'>('outward');
  const [searchQuery, setSearchQuery] = useState('');

  // States and functions for standard file uploads (Max 1 MB)
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('Konstitusi Organisasi');
  const [newDocExternalLink, setNewDocExternalLink] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LETTERS_UPLOAD_BYTES) {
      alert(
        `Ukuran berkas "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas upload langsung ${MAX_LETTERS_UPLOAD_MB} MB agar database tetap ringan.\n\nSilakan unggah dokumen ke Folder Google Drive Surat Yayasan melalui tombol yang tersedia di formulir, lalu cantumkan tautan/link berkasnya.`
      );
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
    if (!uploadBase64 && !newDocExternalLink.trim()) {
      alert('Pilih berkas dokumen yang akan diunggah atau cantumkan tautan Google Drive!');
      return;
    }

    const docObj = {
      id: `DOC-${Date.now()}`,
      name: newDocName,
      category: newDocCategory,
      fileData: uploadBase64 || undefined,
      fileSize: uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : (newDocExternalLink ? 'GDrive Link' : '0 MB'),
      externalLink: newDocExternalLink.trim() || undefined
    };

    if (onAddDocument) {
      await onAddDocument(docObj);
    }

    // Clear and close
    setNewDocName('');
    setUploadFile(null);
    setUploadBase64('');
    setNewDocExternalLink('');
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
  const [inExternalLink, setInExternalLink] = useState<string>('');

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
    setInExternalLink('');

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
    setInExternalLink(letter.externalLink || '');

    setIsFormInOpen(true);
    setReadingInwardLetter(null);
  };

  // Available Dynamic Dropdown Options
  const availableLetterTypes = (profile?.letterClassifications && profile.letterClassifications.length > 0)
    ? profile.letterClassifications
    : [
        'Surat Keputusan (SK)',
        'Surat Tugas Pengutusan',
        'Surat Keterangan Aktif',
        'Surat Pengantar Relasi',
        'Peminjaman Aula/Akomodasi',
        'Surat Permohonan Biaya/Sponsor'
      ];

  const availableDocCategories = (profile?.documentCategories && profile.documentCategories.length > 0)
    ? profile.documentCategories
    : [
        'Konstitusi Organisasi',
        'SOP Keuangan',
        'Legalitas Kelembagaan',
        'Perpajakan & Legalitas',
        'Akademik & Kemitraan',
        'Laporan Keuangan',
        'MoU & Kerjasama',
        'Lain-lain'
      ];

  // Form states: Surat Keluar Compose
  const [isFormOutOpen, setIsFormOutOpen] = useState(false);
  const [outType, setOutType] = useState<string>(availableLetterTypes[0] || 'Surat Keputusan (SK)');
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
  const [signLeftType, setSignLeftType] = useState<LetterOutward['signLeftType']>('Ketua');
  const [signLeftName, setSignLeftName] = useState(ketuaName);
  const [signLeftTitle, setSignLeftTitle] = useState('Ketua Yayasan');

  const [signRightType, setSignRightType] = useState<LetterOutward['signRightType']>('Sekretaris');
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
    setSignLeftType(val as any);
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
    setSignRightType(val as any);
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
  // Format: 001/SK/MMB/VII/2026
  const generateOutwardLetterNumber = (typeCode: string) => {
    const currentMonth = new Date().getMonth(); // 0-indexed
    const currentYear = new Date().getFullYear();
    const roman = getRomanMonth(currentMonth);

    let maxSerial = 0;
    outwardLetters.filter(l => l.templateType === typeCode || (l.letterNumber && l.letterNumber.includes(`/${typeCode}/`))).forEach(l => {
      if (l.letterNumber) {
        const parts = l.letterNumber.split('/');
        const num = parseInt(parts[0], 10);
        if (!isNaN(num) && num > maxSerial) {
          maxSerial = num;
        }
      }
    });

    const serial = String(maxSerial + 1).padStart(3, '0');

    // type abbreviations
    let abbrev = 'SK';
    const lower = (typeCode || '').toLowerCase();
    if (lower.includes('sk') || lower.includes('keputusan')) abbrev = 'SK';
    else if (lower.includes('tugas')) abbrev = 'Surat-Tugas';
    else if (lower.includes('keterangan')) abbrev = 'Ket';
    else if (lower.includes('relasi') || lower.includes('pengantar')) abbrev = 'Relasi';
    else if (lower.includes('peminjaman')) abbrev = 'Peminjaman';
    else if (lower.includes('permohonan') || lower.includes('sponsor')) abbrev = 'Permohonan';
    else {
      const sanitized = typeCode.replace(/^Surat\s+/i, '').replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 12);
      abbrev = sanitized || 'SURAT';
    }

    return `${serial}/${abbrev}/MMB/${roman}/${currentYear}`;
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
        attachmentUrl: inAttachmentBase64 || undefined,
        externalLink: inExternalLink.trim() || undefined
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
        attachmentUrl: inAttachmentBase64 || undefined,
        externalLink: inExternalLink.trim() || undefined
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
    setInExternalLink('');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">

        {/* Toggle tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            onClick={() => setSubTab('outward')}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${subTab === 'outward' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
          >
            Surat Keluar (Outbox)
          </button>
          <button
            onClick={() => setSubTab('inward')}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${subTab === 'inward' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
          >
            Registrasi Surat Masuk (Inbox)
          </button>
          <button
            onClick={() => setSubTab('repository')}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${subTab === 'repository' ? 'bg-[#0c2340] text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
          >
            Berkas Legal & Dokumen Organisasi
          </button>
        </div>

        {/* Dynamic Buttons */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
          </button>
          {subTab === 'outward' && isEditable && (
            <button
              onClick={handleStartNewOutwardLetter}
              className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <FileSignature className="w-3.5 h-3.5" /> Buka Composer Surat Keluar
            </button>
          )}

          {subTab === 'inward' && isEditable && (
            <button
              onClick={handleStartNewInwardLetter}
              className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Registrasi Surat Masuk
            </button>
          )}
        </div>

      </div>

      {/* VIEW 1: OUTWARD OUTBOX */}
      {subTab === 'outward' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-200 flex gap-4">
            <div className="relative flex-1 text-xs">
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari register nomor surat keluar, perihal atau penerima..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 bg-white focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">No. Registrasi Surat</th>
                  <th className="p-3.5">Klasifikasi</th>
                  <th className="p-3.5">Perihal / Judul Surat</th>
                  <th className="p-3.5">Pihak Penerima</th>
                  <th className="p-3.5">Tanggal Terbit</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOutward.map((letter) => (
                  <tr key={letter.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold font-mono text-xs text-slate-800 shrink-0 select-all block">{letter.letterNumber}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px] border border-slate-200">
                        {letter.templateType}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800 max-w-sm line-clamp-1">
                      {letter.subject}
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {letter.recipient}
                    </td>
                    <td className="p-3.5 text-slate-500">{letter.date}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${letter.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          letter.status === 'Draft' ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                        {letter.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                        <button
                          onClick={() => setReadingLetter(letter)}
                          className="px-2.5 py-1 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-medium flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat
                        </button>
                        {isEditable && (
                          <>
                            <button
                              onClick={() => handleStartEditOutwardLetter(letter)}
                              className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                            {onDeleteOutwardLetter && (
                              deleteConfirmId === letter.id ? (
                                <div className="flex items-center gap-1 z-10 shrink-0">
                                  <button
                                    onClick={() => {
                                      onDeleteOutwardLetter(letter.id, letter.letterNumber);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-2 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-[10px] cursor-pointer whitespace-nowrap"
                                  >
                                    Yakin?
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[10px] cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(letter.id)}
                                  className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors text-xs font-medium cursor-pointer flex items-center gap-0.5"
                                >
                                  <Trash className="w-3.5 h-3.5" /> Hapus
                                </button>
                              )
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

      {/* VIEW 2: INWARD MAIL */}
      {subTab === 'inward' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-200 flex gap-4">
            <div className="relative flex-1 text-xs">
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari register nomor surat masuk, pengirim atau judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 bg-white focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Nomor Berkas</th>
                  <th className="p-3.5">Instansi Pengirim</th>
                  <th className="p-3.5">Perihal Korespondensi</th>
                  <th className="p-3.5">Tanggal Masuk</th>
                  <th className="p-3.5">Status Disposisi</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInward.map((letter) => (
                  <tr key={letter.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <span className="font-bold font-mono text-xs text-slate-800 select-all block">{letter.letterNumber}</span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{letter.sender}</td>
                    <td className="p-3.5 font-medium text-slate-800 max-w-sm line-clamp-1">
                      {letter.subject}
                    </td>
                    <td className="p-3.5 text-slate-500 font-medium">{letter.receivedDate}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${letter.status === 'Arsip' ? 'bg-slate-50 text-slate-700 border-slate-300' :
                          letter.status === 'Disposisi' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                            'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                        {letter.status || 'Disposisi'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                        {letter.externalLink && (
                          <a
                            href={letter.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-medium flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap transition-colors"
                            title="Buka Scan Surat di Google Drive"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-600" /> GDrive
                          </a>
                        )}
                        <button
                          onClick={() => setReadingInwardLetter(letter)}
                          className="px-2.5 py-1 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-medium flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                        {isEditable && (
                          <>
                            <button
                              onClick={() => handleStartEditInwardLetter(letter)}
                              className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap transition-colors"
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
                                  className="px-2 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-[10px] cursor-pointer whitespace-nowrap"
                                >
                                  Yakin?
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[10px] cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(letter.id)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 text-xs font-medium flex items-center cursor-pointer transition-colors"
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

      {/* VIEW 3: REPOSITORY ARCHIVE (LEGAL DOKUMEN & KEBIJAKAN RESMI) */}
      {subTab === 'repository' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Khasanah Dokumen & Kebijakan Kelembagaan (Repository)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kumpulan naskah resmi, AD/ART, akta pendirian, sertifikat, serta SOP yang disahkan oleh Pembina/Pengurus Yayasan MMB.
              </p>
            </div>
            {isEditable && (
              <button
                onClick={() => setIsUploadDocOpen(true)}
                className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Unggah Berkas Resmi
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-slate-200 rounded-lg p-4 bg-white shadow-xs hover:border-[#0c2340] transition-colors flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 rounded font-semibold text-[10px] truncate">
                      {doc.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{doc.fileSize}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs leading-snug">{doc.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">Disahkan: {formatIndonesianDate(doc.uploadedDate)}</p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isEditable && onDeleteDocument && (
                      deleteConfirmId === doc.id ? (
                        <div className="flex items-center gap-1 z-10 shrink-0">
                          <button
                            onClick={() => {
                              onDeleteDocument(doc.id, doc.name);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-[10px] cursor-pointer whitespace-nowrap"
                          >
                            Yakin?
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[10px] cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(doc.id)}
                          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 text-xs font-medium flex items-center cursor-pointer transition-colors"
                          title="Hapus Dokumen"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                    <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-0.5">&bull; Salinan Sah</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {doc.externalLink && (
                      <a
                        href={doc.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 px-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium rounded text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Buka Dokumen di Google Drive"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-600" /> GDrive
                      </a>
                    )}
                    <button
                      onClick={() => setPreviewingDocument(doc)}
                      className="p-1 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Pratinjau
                    </button>
                    <a
                      href={`/api/documents/download/${doc.id}?token=${getSessionUserToken()}`}
                      download
                      className="p-1 px-3 bg-[#0c2340] hover:bg-[#1b365d] text-white font-medium rounded text-xs flex items-center gap-1 cursor-pointer transition-colors"
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

      {/* DIALOG: UPLOAD DOKUMEN RESMI (MAKS 1 MB) */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-md overflow-hidden my-8">
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">Unggah Berkas Dokumen Resmi</dt>
                <dd className="text-xs text-slate-300 mt-0.5">Batas upload langsung maks. 1 MB</dd>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadDocOpen(false)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Kategori Dokumen :</label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                >
                  {availableDocCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {newDocCategory && !availableDocCategories.includes(newDocCategory) && (
                    <option value={newDocCategory}>{newDocCategory}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Nama Dokumen Resmi / Berkas :</label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Contoh: AD-ART MMB Terbaru 2026"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  required
                />
              </div>

              {/* EXTERNAL LINK & GDRIVE HELPER */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 block font-semibold">
                    Tautan Google Drive Dokumen (Opsional) :
                  </label>
                  <a
                    href={GDRIVE_LETTERS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#0c2340] hover:underline flex items-center gap-1"
                    title="Buka Folder Google Drive Persuratan & Dokumen"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Buka Folder GDrive <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="url"
                  value={newDocExternalLink}
                  onChange={(e) => setNewDocExternalLink(e.target.value)}
                  placeholder="https://drive.google.com/... (Cantumkan jika berkas > 1 MB)"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 font-mono text-xs focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">Pilih Berkas Fail Langsung (Maks. 1 MB) :</label>
                <div className="border-2 border-dashed border-slate-300 rounded p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg,.jpeg,.zip"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                  <p className="text-slate-700 font-medium text-center text-xs">
                    {uploadFile ? uploadFile.name : "Klik untuk memilih fail atau drop disini (≤ 1 MB)"}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5 text-center">
                    {uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB` : "Jika berkas > 1 MB, unggah ke Folder GDrive di atas & tempelkan link-nya"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadDocOpen(false);
                    setNewDocExternalLink('');
                  }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded cursor-pointer transition-colors shadow-xs"
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-4xl overflow-hidden my-4 flex flex-col h-[85vh]">
            {/* Header */}
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <dt className="text-sm font-bold truncate max-w-md">{previewingDocument.name}</dt>
                  <dd className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                    <span className="bg-white/10 px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold">{previewingDocument.category}</span>
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
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Tutup Pratinjau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Preview Container */}
            <div className="flex-1 bg-slate-100 p-4 flex flex-col md:flex-row gap-4 overflow-hidden">
              {/* Left Side: Browser Preview Frame */}
              <div className="flex-1 bg-white rounded border border-slate-300 shadow-xs overflow-hidden relative flex flex-col h-full">
                <iframe
                  src={`/api/documents/preview/${previewingDocument.id}?token=${getSessionUserToken()}`}
                  className="w-full h-full border-none"
                  title={`Pratinjau dari ${previewingDocument.name}`}
                />
              </div>

              {/* Right Side: Quick Meta & Actions Panel */}
              <div className="w-full md:w-64 bg-white rounded border border-slate-300 p-4 shrink-0 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-2">Status Arsip Elektronik</h4>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block font-semibold text-[10px] uppercase">ID Register</span>
                      <code className="text-slate-800 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 block truncate">{previewingDocument.id}</code>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-semibold text-[10px] uppercase">Aksesibilitas</span>
                      <span className="text-slate-700 font-medium">Internal Yayasan (Terenkripsi)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-semibold text-[10px] uppercase">Masa Berlaku</span>
                      <span className="text-emerald-800 font-bold">Aktif & Sah</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600 leading-relaxed space-y-1">
                    <p className="font-bold text-slate-800">Validitas Digital:</p>
                    <p>Sistem memverifikasi dokumen ini sebagai representasi sah arsip fisik kelembagaan.</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <a
                    href={`/api/documents/download/${previewingDocument.id}?token=${getSessionUserToken()}`}
                    download
                    className="w-full py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh Berkas
                  </a>
                  <button
                    onClick={() => setPreviewingDocument(null)}
                    type="button"
                    className="w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded text-xs cursor-pointer transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-xl overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">

            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div>
                <dt className="text-sm font-bold">
                  {editingInwardLetter ? `Edit Surat Masuk (${editingInwardLetter.letterNumber})` : 'Registrasi Surat Masuk (Inbox)'}
                </dt>
                <dd className="text-xs text-slate-300 mt-0.5">
                  {editingInwardLetter ? 'Perubahan pada berkas surat masuk akan disimpan ke database.' : 'Menerima dan melaporkan surat dinas luar yang masuk ke sekretariat.'}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormInOpen(false);
                  setEditingInwardLetter(null);
                }}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInwardLetter} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Nomor Berkas Surat :</label>
                    <input
                      type="text"
                      value={inNum}
                      onChange={(e) => setInNum(e.target.value)}
                      placeholder="Contoh: 120/EXT/DINSOS/VI/2026"
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Instansi Pengirim :</label>
                    <input
                      type="text"
                      value={inSender}
                      onChange={(e) => setInSender(e.target.value)}
                      placeholder="Contoh: Dinas Sosial / Kantor Camat"
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Perihal / Agenda Surat :</label>
                  <input
                    type="text"
                    value={inSubject}
                    onChange={(e) => setInSubject(e.target.value)}
                    placeholder="Contoh: Undangan Koordinasi Hibah Kemasyarakatan"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Tanggal Berkas Diterima :</label>
                    <input
                      type="date"
                      value={inDate}
                      onChange={(e) => setInDate(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Status Alur Disposisi :</label>
                    <select
                      value={inStatus}
                      onChange={(e) => setInStatus(e.target.value as any)}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    >
                      <option value="Disposisi">Perlu Disposisi Ketua</option>
                      <option value="Tindak Lanjut">Tindak Lanjut Staf</option>
                      <option value="Arsip">Selesai & Arsipkan</option>
                    </select>
                  </div>
                </div>

                {/* EXTERNAL LINK & GDRIVE HELPER */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 block font-semibold">
                      Tautan Google Drive / Scan Surat (Opsional) :
                    </label>
                    <a
                      href={GDRIVE_LETTERS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#0c2340] hover:underline flex items-center gap-1"
                      title="Buka Folder Google Drive Persuratan MMB"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Buka Folder GDrive <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="url"
                    value={inExternalLink}
                    onChange={(e) => setInExternalLink(e.target.value)}
                    placeholder="https://drive.google.com/... (Cantumkan tautan jika scan surat > 1 MB)"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 font-mono text-xs focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Unggah File Scan Fisik Surat Langsung (Maks. 1 MB) :</label>
                  <div className="border border-dashed border-slate-300 rounded p-4 text-center bg-slate-50 relative hover:bg-slate-100 transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > MAX_LETTERS_UPLOAD_BYTES) {
                            alert(
                              `Ukuran berkas "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas upload langsung ${MAX_LETTERS_UPLOAD_MB} MB agar database tetap ringan.\n\nSilakan unggah scan surat ke Folder Google Drive Surat Yayasan melalui tombol di atas, lalu cantumkan tautannya.`
                            );
                            e.target.value = '';
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
                      <Upload className="mx-auto h-6 w-6 text-slate-400" />
                      <div className="text-slate-700 font-medium text-xs">
                        {inAttachmentName ? (
                          <span className="text-[#0c2340] font-bold truncate block max-w-xs mx-auto">{inAttachmentName}</span>
                        ) : (
                          <span>Pilih scan gambar/PDF dokumen atau tarik kesini (≤ 1 MB)</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Jika berkas &gt; 1 MB, unggah ke Google Drive & cantumkan tautan di atas</p>
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
                        className="text-rose-700 hover:underline font-semibold text-xs flex items-center gap-0.5 cursor-pointer"
                      >
                        <Trash className="w-3.5 h-3.5" /> Hapus Lampiran
                      </button>
                    </div>
                  )}
                </div>

              </div>

              <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2.5 shrink-0 bg-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormInOpen(false);
                    setEditingInwardLetter(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded cursor-pointer transition-colors shadow-xs"
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-xl overflow-hidden my-8">
            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-200" /> Detail Arsip Surat Masuk
                </dt>
                <dd className="text-xs text-slate-300 mt-0.5">
                  Surat diterima dan diarsipkan di database sekretariat MMB.
                </dd>
              </div>
              <button
                type="button"
                onClick={() => setReadingInwardLetter(null)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="border border-slate-200 rounded-lg bg-slate-50 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block text-xs uppercase font-semibold">Nomor Berkas Surat</span>
                    <strong className="text-slate-900 text-xs font-mono">{readingInwardLetter.letterNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs uppercase font-semibold">Status Pengarsipan</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-block border ${readingInwardLetter.status === 'Arsip' ? 'bg-slate-50 text-slate-700 border-slate-300' :
                        readingInwardLetter.status === 'Disposisi' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                      {readingInwardLetter.status || 'Disposisi'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-2.5">
                  <div>
                    <span className="text-slate-500 block text-xs uppercase font-semibold">Instansi Pengirim</span>
                    <span className="text-slate-900 font-bold text-xs">{readingInwardLetter.sender}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs uppercase font-semibold">Tanggal Diterima</span>
                    <span className="text-slate-700 font-medium">{formatIndonesianDate(readingInwardLetter.receivedDate)}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2.5">
                  <span className="text-slate-500 block text-xs uppercase font-semibold">Perihal Agenda</span>
                  <p className="text-slate-900 font-bold text-xs mt-0.5">{readingInwardLetter.subject}</p>
                </div>
              </div>

              {/* ATTACHMENT DETAILS */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
                <span className="text-slate-800 text-xs font-bold block uppercase tracking-wide">Lampiran Dokumen Scan Asli</span>

                {readingInwardLetter.externalLink && (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="w-5 h-5 text-slate-600 shrink-0" />
                      <div className="truncate pr-2">
                        <p className="font-bold text-slate-800 text-xs truncate">Tautan Dokumen Google Drive</p>
                        <p className="text-xs text-slate-600 truncate font-mono">{readingInwardLetter.externalLink}</p>
                      </div>
                    </div>
                    <a
                      href={readingInwardLetter.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 shrink-0 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka GDrive
                    </a>
                  </div>
                )}

                {readingInwardLetter.attachmentUrl ? (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 className="w-5 h-5 text-slate-600 shrink-0" />
                      <div className="truncate pr-2">
                        <p className="font-bold text-slate-800 text-xs truncate">Scan_Surat_Masuk_{readingInwardLetter.id}.pdf/img</p>
                        <p className="text-xs text-slate-500">Tersimpan di Cloud Database</p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <a
                        href={`/api/inward_letters/preview/${readingInwardLetter.id}?token=${getSessionUserToken()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium cursor-pointer transition-colors"
                      >
                        Pratinjau
                      </a>
                      <a
                        href={`/api/inward_letters/download/${readingInwardLetter.id}?token=${getSessionUserToken()}`}
                        download={`Scan_Surat_Masuk_${readingInwardLetter.letterNumber?.replace(/\//g, '_') || 'doc'}.pdf`}
                        className="px-3 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-medium cursor-pointer transition-colors shadow-xs"
                      >
                        Unduh
                      </a>
                    </div>
                  </div>
                ) : !readingInwardLetter.externalLink ? (
                  <div className="text-center py-4 border border-dashed border-slate-200 rounded bg-slate-50 flex flex-col items-center justify-center space-y-1.5">
                    <p className="text-xs text-slate-500 font-semibold">Tidak ada dokumen fisik yang dilampirkan.</p>
                    <p className="text-xs text-slate-400 max-w-sm leading-relaxed px-4">
                      Unggah berkas asli saat pengeditan atau gunakan tombol di bawah untuk simulasi.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const demoText = `YAYASAN MURID MUDA BERMISI (MMB)\n--------------------------------------------------\nDOKUMEN INTEGRASI SURAT MASUK\n--------------------------------------------------\nRegister ID : ${readingInwardLetter.id}\nNo. Berkas  : ${readingInwardLetter.letterNumber || '-'}\nPengirim    : ${readingInwardLetter.sender || '-'}\nPerihal     : ${readingInwardLetter.subject || '-'}\nDiterima Tgl: ${readingInwardLetter.receivedDate || '-'}\nStatus      : ${readingInwardLetter.status || 'Disposisi'}`;
                        const base64Encoded = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(demoText)));
                        const updatedLetterObj: LetterInward = {
                          ...readingInwardLetter,
                          attachmentUrl: base64Encoded
                        };
                        if (onUpdateInwardLetter) {
                          onUpdateInwardLetter(updatedLetterObj);
                        }
                        setReadingInwardLetter(updatedLetterObj);
                        alert('File scan simulasi berhasil dimasukkan!');
                      }}
                      className="px-3 py-1 mt-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                    >
                      Pasang File Scan Simulasi
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setReadingInwardLetter(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSER MODAL FOR LETTERS OUTWARD (SURAT KELUAR) */}
      {isFormOutOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">

            <div className="bg-[#0c2340] px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div>
                <dt className="text-sm font-bold">
                  {editingLetter ? `Edit Surat Keluar (${editingLetter.letterNumber})` : 'Penyusunan Surat Keluar (Outbox)'}
                </dt>
                <dd className="text-xs text-slate-300 mt-0.5">
                  {editingLetter ? 'Perubahan pada isi surat akan disimpan secara dinamis ke database.' : 'Setiap surat keluar akan mereferensikan format nomor registrasi otomatis.'}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOutOpen(false)}
                className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleComposeOutwardLetter} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Klasifikasi Surat Template :</label>
                    <select
                      value={outType}
                      onChange={(e) => setOutType(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-800 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    >
                      {availableLetterTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      {outType && !availableLetterTypes.includes(outType) && (
                        <option value={outType}>{outType}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1 font-semibold">Ditujukan Kepada (Pihak Penerima) :</label>
                    <textarea
                      value={outRecipient}
                      onChange={(e) => setOutRecipient(e.target.value)}
                      placeholder="Contoh:&#10;Pdt. Jeffrey Siauw, D.Th.&#10;Lead Pastor Gracelife Community Church"
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 text-xs min-h-[60px] resize-y focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Perihal / Subject Surat Keluar :</label>
                  <input
                    type="text"
                    value={outSubject}
                    onChange={(e) => setOutSubject(e.target.value)}
                    placeholder="Contoh: Surat Tugas Pengutusan Pendamping Persekutuan"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 font-semibold focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-semibold">Konten Inti Paragraf Surat Resmi :</label>
                  <textarea
                    rows={6}
                    value={outContent}
                    onChange={(e) => setOutContent(e.target.value)}
                    placeholder="Isi draft surat resmi di sini secara lengkap & berbobot...."
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-slate-800 leading-relaxed focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                    required
                  />
                </div>

                {/* PENGATURAN TANDA TANGAN & STEMPEL */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 font-bold block text-xs uppercase tracking-wide">Pengaturan Otorisasi & Tanda Tangan</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showStamp}
                        onChange={(e) => setShowStamp(e.target.checked)}
                        className="rounded border-slate-300 text-[#0c2340] focus:ring-[#0c2340] w-3.5 h-3.5"
                      />
                      <span className="text-xs font-semibold text-slate-700">Bubuhkan Stempel Lembaga</span>
                    </label>
                  </div>

                  {/* STEMPELS CUSTOM LAYOUT */}
                  {showStamp && (
                    <div className="bg-white p-3.5 rounded border border-slate-200 mt-2 space-y-3">
                      <p className="text-xs text-slate-700 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0c2340] inline-block"></span>
                        Kustomisasi Tata Letak Stempel Resmi
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-slate-600 block mb-1 font-semibold">Sasaran Overlap Stempel:</label>
                          <select
                            value={stampTarget}
                            onChange={(e) => setStampTarget(e.target.value as any)}
                            className="w-full border border-slate-300 rounded p-1.5 bg-white text-slate-800 text-xs focus:border-[#0c2340] focus:outline-none"
                          >
                            <option value="left">Tanda Tangan Kiri (Overlay Sisi Kiri)</option>
                            <option value="right">Tanda Tangan Kanan (Overlay Sisi Kiri)</option>
                            <option value="center">Murni di Tengah Kertas (Center Alignment)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-600 block mb-1 font-semibold">Diameter Ukuran Stempel (mm):</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="10"
                              max="50"
                              value={stampSize}
                              onChange={(e) => setStampSize(Number(e.target.value))}
                              className="flex-1 accent-[#0c2340] cursor-pointer"
                            />
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 min-w-[28px] text-center font-bold text-xs">
                              {stampSize}mm
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-600 block mb-1 font-semibold flex justify-between">
                            <span>Geser Horisontal (X-Offset):</span>
                            <span className="font-mono text-xs text-slate-500">({stampOffsetX > 0 ? `+${stampOffsetX}` : stampOffsetX} mm)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Kiri</span>
                            <input
                              type="range"
                              min="-40"
                              max="40"
                              value={stampOffsetX}
                              onChange={(e) => setStampOffsetX(Number(e.target.value))}
                              className="flex-1 accent-[#0c2340] cursor-pointer"
                            />
                            <span className="text-xs text-slate-400">Kanan</span>
                            <button
                              type="button"
                              onClick={() => setStampOffsetX(0)}
                              className="text-xs font-semibold text-slate-600 hover:text-[#0c2340] bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer border border-slate-200"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-600 block mb-1 font-semibold flex justify-between">
                            <span>Geser Vertikal (Y-Offset):</span>
                            <span className="font-mono text-xs text-slate-500">({stampOffsetY > 0 ? `+${stampOffsetY}` : stampOffsetY} mm)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Atas</span>
                            <input
                              type="range"
                              min="-40"
                              max="40"
                              value={stampOffsetY}
                              onChange={(e) => setStampOffsetY(Number(e.target.value))}
                              className="flex-1 accent-[#0c2340] cursor-pointer"
                            />
                            <span className="text-xs text-slate-400">Bawah</span>
                            <button
                              type="button"
                              onClick={() => setStampOffsetY(0)}
                              className="text-xs font-semibold text-slate-600 hover:text-[#0c2340] bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer border border-slate-200"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LOKASI & TANGGAL PENGESAHAN */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Lokasi & Tanggal Surat (Muncul di Atas Tanda Tangan):
                    </label>
                    <input
                      type="text"
                      value={signPlaceDate}
                      onChange={(e) => setSignPlaceDate(e.target.value)}
                      placeholder="Contoh: Cilegon, 12 Juni 2026"
                      className="w-full border border-slate-300 rounded p-1.5 text-slate-800 text-xs font-semibold focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      * Format ini akan tercetak secara presisi di atas tanda tangan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* PENANDATANGAN 1 (KIRI) */}
                    <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Penandatangan Utama 1 (Kiri):</label>
                      <select
                        value={signLeftType}
                        onChange={(e) => handleLeftSigneeTypeChange(e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 bg-white text-slate-800 text-xs"
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
                            className="w-full border border-slate-300 rounded p-1.5 text-slate-800 text-xs"
                            disabled={signLeftType !== 'Custom'}
                            required
                          />
                          <input
                            type="text"
                            value={signLeftTitle}
                            onChange={(e) => setSignLeftTitle(e.target.value)}
                            placeholder="Jabatan resmi"
                            className="w-full border border-slate-300 rounded p-1.5 text-slate-600 text-xs"
                            disabled={signLeftType !== 'Custom'}
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* PENANDATANGAN 2 (KANAN) */}
                    <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">Penandatangan Utama 2 (Kanan):</label>
                      <select
                        value={signRightType}
                        onChange={(e) => handleRightSigneeTypeChange(e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 bg-white text-slate-800 text-xs"
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
                            className="w-full border border-slate-300 rounded p-1.5 text-slate-800 text-xs"
                            disabled={signRightType !== 'Custom'}
                            required
                          />
                          <input
                            type="text"
                            value={signRightTitle}
                            onChange={(e) => setSignRightTitle(e.target.value)}
                            placeholder="Jabatan resmi"
                            className="w-full border border-slate-300 rounded p-1.5 text-slate-600 text-xs"
                            disabled={signRightType !== 'Custom'}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* TANDA TANGAN TAMBAHAN CUSTOM */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-800 block uppercase tracking-wider">
                      Tanda Tangan Tambahan:
                    </label>
                    <span className="text-xs text-slate-500 font-medium">
                      * Opsional
                    </span>
                  </div>

                  {/* List of currently added signatures */}
                  {additionalSignatures.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {additionalSignatures.map((sig) => (
                        <div key={sig.id} className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between text-xs font-semibold text-slate-700 shadow-xs">
                          <div className="truncate pr-2">
                            <p className="text-slate-900 text-xs truncate">{sig.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{sig.title}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdditionalSignatures(prev => prev.filter(s => s.id !== sig.id))}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2.5 border border-dashed border-slate-300 rounded bg-white">
                      <p className="text-xs text-slate-500">Belum ada tanda tangan tambahan yang ditambahkan.</p>
                    </div>
                  )}

                  {/* Input form to add a new additional signatory from structures */}
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    <div className="flex-1">
                      <select
                        value={selectedAdditionalNodeId}
                        onChange={(e) => setSelectedAdditionalNodeId(e.target.value)}
                        className="w-full border border-slate-300 rounded p-1.5 bg-white text-slate-800 text-xs focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] focus:outline-none"
                      >
                        <option value="">-- Pilih Jabatan / Personel Struktur --</option>
                        {structures && structures
                          .map(n => (
                            <option key={n.id} value={n.id}>
                              {n.title} ({n.name})
                            </option>
                          ))
                        }
                        {!structures || structures.length === 0 ? (
                          <>
                            <option value="korwil">Koordinator Wilayah (Joseph Daniel, S.Th.)</option>
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
                        let resolvedName = '';
                        let resolvedTitle = '';
                        const matchedNode = structures?.find(n => n.id === selectedAdditionalNodeId);
                        if (matchedNode) {
                          resolvedName = matchedNode.name;
                          resolvedTitle = matchedNode.title;
                        } else if (selectedAdditionalNodeId === 'korwil') {
                          resolvedName = 'Joseph Daniel, S.Th.';
                          resolvedTitle = 'Koordinator Wilayah';
                        } else if (selectedAdditionalNodeId === 'staff') {
                          resolvedName = 'Simpatisan Mitra Aliansi';
                          resolvedTitle = 'Staf Lapangan';
                        }

                        if (!resolvedName) return;

                        if (additionalSignatures.some(s => s.nodeId === selectedAdditionalNodeId)) {
                          alert('Jabatan ini sudah ditambahkan.');
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
                      className="px-3.5 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs cursor-pointer transition-colors flex items-center justify-center shadow-xs"
                    >
                      + Tambahkan Tanda Tangan
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-700 text-xs">
                  {editingLetter ? (
                    <>Mengubah detail Surat Keluar No: <strong className="text-slate-900">{editingLetter.letterNumber}</strong></>
                  ) : (
                    <>Nomor serial yang akan diterbitkan: <strong className="text-slate-900">{generateOutwardLetterNumber(outType)}</strong></>
                  )}
                </div>

              </div>

              <div className="px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2.5 shrink-0 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsFormOutOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  {editingLetter ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Simpan Perubahan
                    </>
                  ) : (
                    <>
                      <FileSignature className="w-4 h-4" /> Terbitkan Surat Resmi
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

          if (tName.includes('triawan') || tName.includes('fernandes')) {
            return profile?.signatureChairmanUrl || '';
          }
          if (tName.includes('faisal') || tName.includes('johannes lie') || tName.includes('lie') || tName.includes('yusuf')) {
            return profile?.signatureSecretaryUrl || '';
          }
          if (tName.includes('ruth') || tName.includes('sarah') || tName.includes('sitorus') || tName.includes('angelina')) {
            return profile?.signatureTreasurerUrl || profile?.signatureUrl || '';
          }

          if (tType.includes('ketua') || tTitle.includes('ketua') || tType === 'ketuapembina' || tTitle.includes('pembina')) {
            return profile?.signatureChairmanUrl || '';
          }
          if (tType.includes('sekretaris') || tTitle.includes('sekretaris') || tType.includes('secretary')) {
            return profile?.signatureSecretaryUrl || '';
          }
          if (tType.includes('bendahara') || tTitle.includes('bendahara') || tType.includes('treasurer')) {
            return profile?.signatureTreasurerUrl || profile?.signatureUrl || '';
          }

          if (tType === 'ketua') return profile?.signatureChairmanUrl || '';
          if (tType === 'sekretaris') return profile?.signatureSecretaryUrl || '';
          if (tType === 'bendahara') return profile?.signatureTreasurerUrl || profile?.signatureUrl || '';

          return '';
        };

        const leftSignatureImg = resolveSignatureImg(leftType, leftTitle, leftName);
        const rightSignatureImg = resolveSignatureImg(rightType, rightTitle, rightName);

        return (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-[800px] overflow-hidden p-8 md:p-12 text-slate-900 flex flex-col justify-between my-8 min-h-[750px] relative">

              {/* Kop Surat Header */}
              <div className="border-b-[3px] border-double border-slate-900 pb-4 relative flex items-center gap-5 select-none text-left">
                {profile?.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt="Logo Yayasan"
                    referrerPolicy="no-referrer"
                    className="w-[75px] h-[75px] object-contain shrink-0"
                  />
                ) : (
                  <div className="w-[72px] h-[72px] border-2 border-red-700 rounded-full flex items-center justify-center relative select-none shrink-0">
                    <div className="w-[62px] h-[62px] border border-red-700 rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-red-700/60"></div>
                      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-red-700/60"></div>
                      <span className="font-bold text-[9px] text-red-700 bg-white px-1 z-10 tracking-wider">MMB</span>
                    </div>
                  </div>
                )}

                <div className="flex-1 text-center">
                  <h2 className="font-bold text-base md:text-lg tracking-tight text-slate-900 uppercase leading-tight">
                    {profile?.kopTitle || profile?.name || 'YAYASAN MURID MUDA BERMISI'}
                  </h2>
                  <p className="font-bold text-xs text-slate-700 tracking-wider mt-0.5 uppercase">
                    {profile?.kopMotto || 'Kabar baik. Pemuridan. Misi.'}
                  </p>
                  <p className="text-xs text-slate-600 font-normal tracking-tight mt-1 leading-snug">
                    {profile?.address || 'Link. Pal. Asem, RT.01/RW.07, Panggung Rawi, Kec. Jombang, Kota Cilegon, Banten 42412'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5 tracking-tight">
                    {profile?.email ? `Email: ${profile.email}` : 'Email: esmofnusantara@gmail.com'}
                    {profile?.phone ? `   •   Telepon: ${profile.phone}` : '   •   Telepon: +62 812 961 066 11'}
                    {profile?.website ? `   •   Website: ${profile.website}` : ''}
                  </p>
                </div>
              </div>

              {/* Body Letter content */}
              <div className="mt-6 space-y-4 text-left text-xs md:text-sm text-slate-900 flex-1 leading-relaxed">

                {/* Publish Date - Right Aligned */}
                <div className="text-right text-slate-900 font-medium">
                  {finalPlaceDate}
                </div>

                {/* Serial Fields Block */}
                <div className="space-y-0.5 text-slate-900 leading-relaxed max-w-lg">
                  <p><strong>Nomor</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span className="font-mono tracking-tight">{readingLetter.letterNumber}</span></p>
                  <p><strong>Lampiran</strong>&nbsp;&nbsp;&nbsp;: - (Nihil)</p>
                  <p><strong>Sifat</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: Resmi / Terbuka</p>
                  <p><strong>Perihal</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span className="underline font-bold text-slate-900">{readingLetter.subject}</span></p>
                </div>

                {/* Recipient Details */}
                <div className="pt-2">
                  <p>Kepada Yth.</p>
                  <p className="font-bold whitespace-pre-wrap text-slate-900 mt-0.5 leading-normal">{readingLetter.recipient}</p>
                  <p className="mt-0.5">di Tempat</p>
                </div>

                {/* Greeting Line */}
                <div className="pt-1 font-medium text-slate-900">
                  Dengan hormat,
                </div>

                {/* Structured paragraphs */}
                <div className="space-y-3 text-justify whitespace-pre-wrap leading-relaxed text-xs md:text-sm text-slate-800">
                  {readingLetter.content}
                </div>
              </div>

              {/* Symmetrical Dual Signatures Block Area */}
              <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 relative text-xs md:text-sm text-slate-900 select-none pb-4">

                {/* Mengetahui at the center top */}
                {leftType !== 'None' && rightType !== 'None' && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 font-medium text-center h-[18px]">
                    Mengetahui,
                  </div>
                )}

                {/* Penandatangan Kiri */}
                {leftType !== 'None' ? (
                  <div className="text-center flex flex-col items-center relative z-25">
                    <p className="leading-tight h-[18px] mb-1 font-medium">
                      {rightType !== 'None' ? '' : finalPlaceDate}
                    </p>

                    {/* Image slot */}
                    <div className="h-12 flex items-center justify-center my-1 relative w-full">
                      {leftSignatureImg ? (
                        <img
                          src={leftSignatureImg}
                          alt="TTD Utama"
                          referrerPolicy="no-referrer"
                          className="max-h-12 object-contain"
                        />
                      ) : (
                        <div className="h-8 w-24 relative opacity-70 border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600 font-semibold">Tervalidasi</span>
                        </div>
                      )}
                    </div>

                    <p className="font-bold underline leading-none mt-1 text-slate-900">{leftName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{leftTitle}</p>
                  </div>
                ) : (
                  <div className="text-center opacity-0 h-4">-</div>
                )}

                {/* Penandatangan Kanan */}
                {rightType !== 'None' ? (
                  <div className="text-center flex flex-col items-center relative z-25">
                    <p className="leading-tight h-[18px] mb-1 font-medium">
                      {leftType !== 'None' ? '' : finalPlaceDate}
                    </p>

                    {/* Image slot */}
                    <div className="h-12 flex items-center justify-center my-1 relative w-full">
                      {rightSignatureImg ? (
                        <img
                          src={rightSignatureImg}
                          alt="TTD Sekretaris"
                          referrerPolicy="no-referrer"
                          className="max-h-12 object-contain"
                        />
                      ) : (
                        <div className="h-8 w-24 relative opacity-70 border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600 font-semibold">Tervalidasi</span>
                        </div>
                      )}
                    </div>

                    <p className="font-bold underline leading-none mt-1 text-slate-900">{rightName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{rightTitle}</p>
                  </div>
                ) : (
                  <div className="text-center opacity-0 h-4">-</div>
                )}

                {/* OVERLAPPED PHYSICAL STAMP */}
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
                            className="w-full h-full object-contain rotate-[-7deg] opacity-85"
                          />
                        ) : (
                          <div
                            className="w-full h-full border-[2px] border-double border-blue-800 rounded-full flex items-center justify-center rotate-[-12deg] opacity-80"
                          >
                            <div className="w-[82%] h-[82%] border border-blue-800 rounded-full flex flex-col items-center justify-center font-bold text-blue-800 select-none bg-white/50">
                              <span className="text-[5px] uppercase tracking-wide leading-none">YAYASAN</span>
                              <span className="text-xs font-bold tracking-widest leading-none my-0.5 text-blue-800">MMB</span>
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
                <div className={`mt-4 pt-3 border-t border-slate-200 relative text-xs md:text-sm text-slate-900 select-none pb-4 ${readingLetter.additionalSignatures.length === 1 ? 'flex justify-center' : 'grid grid-cols-2 gap-8'
                  }`}>
                  {readingLetter.additionalSignatures.map((sig: any, idx: number) => {
                    const sigImg = resolveSignatureImg('', sig.title || '', sig.name || '');
                    const isLoneLast = readingLetter.additionalSignatures.length > 1 && idx === readingLetter.additionalSignatures.length - 1 && idx % 2 === 0;
                    return (
                      <div
                        key={sig.id || idx}
                        className={`text-center flex flex-col items-center relative z-25 ${readingLetter.additionalSignatures.length === 1 ? 'max-w-xs w-full' : isLoneLast ? 'col-span-2 mx-auto max-w-xs w-full' : ''
                          }`}
                      >

                        <div className="h-12 flex items-center justify-center my-1 relative w-full">
                          {sigImg ? (
                            <img
                              src={sigImg}
                              alt={`TTD ${sig.name}`}
                              referrerPolicy="no-referrer"
                              className="max-h-12 object-contain"
                            />
                          ) : (
                            <div className="h-8 w-24 relative opacity-70 border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600 font-semibold">Tervalidasi</span>
                            </div>
                          )}
                        </div>

                        <p className="font-bold underline leading-none mt-1 text-slate-900">{sig.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{sig.title}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-end gap-2.5 no-print">
                <button
                  onClick={() => setReadingLetter(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded text-xs font-medium cursor-pointer text-slate-700 transition-colors"
                >
                  Tutup
                </button>
                {isEditable && (
                  <button
                    onClick={() => handleStartEditOutwardLetter(readingLetter)}
                    className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                <button
                  onClick={() => exportLetterToPDF(readingLetter, profile, structures)}
                  className="px-4 py-2 bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh PDF
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
