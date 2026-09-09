import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Palette,
  Heading1,
  Heading2,
  Heading3,
  Heading,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table,
  Minus,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Sparkles,
  ExternalLink,
  FolderOpen,
  FileText,
  AlertTriangle,
  Check,
  Copy
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  gdriveFolderUrl?: string;
  minHeight?: string;
  maxCharacters?: number;
  warningCharacters?: number;
}

const HIGHLIGHT_COLORS = [
  { name: 'Kuning', color: '#fef08a', bgClass: 'bg-yellow-200' },
  { name: 'Hijau Muda', color: '#bbf7d0', bgClass: 'bg-green-200' },
  { name: 'Biru Muda', color: '#bae6fd', bgClass: 'bg-sky-200' },
  { name: 'Jingga', color: '#fed7aa', bgClass: 'bg-orange-200' },
  { name: 'Pink', color: '#fbcfe8', bgClass: 'bg-pink-200' },
  { name: 'Hapus Sorotan', color: 'transparent', bgClass: 'bg-white border border-slate-300' },
];

const TEXT_COLORS = [
  { name: 'Hitam (Default)', color: '#1e293b' },
  { name: 'Navy', color: '#0c2340' },
  { name: 'Biru', color: '#2563eb' },
  { name: 'Hijau', color: '#16a34a' },
  { name: 'Merah', color: '#dc2626' },
  { name: 'Ungu', color: '#9333ea' },
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tulis ringkasan hasil rapat, keputusan, rencana lanjutan, dll...',
  title = 'Notulen / Keputusan & Tindakan',
  gdriveFolderUrl = 'https://drive.google.com/drive/folders/1UeWgBx8r7jP9I03XO4r-1xtTmDER5x4t?usp=drive_link',
  minHeight = '180px',
  maxCharacters = 15000,
  warningCharacters = 8000,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const isInternalUpdate = useRef(false);

  // Calculate characters & words from text content
  const updateCounts = useCallback((html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    setCharCount(text.length);
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, []);

  // Initialize and sync editor content
  useEffect(() => {
    if (!editorRef.current) return;
    if (!isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalUpdate.current = false;
    updateCounts(value || '');
  }, [value, updateCounts]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Execute formatting commands
  const executeCommand = (command: string, val: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    // Close any open dropdowns
    setShowHighlightDropdown(false);
    setShowColorDropdown(false);
    setShowHeadingDropdown(false);

    try {
      document.execCommand(command, false, val);
    } catch {
      // fallback
    }

    handleInput();
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;

    // Check if character limit reached
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';

    if (text.length > maxCharacters) {
      setCharCount(text.length);
      const words = text.trim().split(/\s+/).filter(Boolean);
      setWordCount(words.length);
    } else {
      updateCounts(html);
    }

    isInternalUpdate.current = true;
    onChange(html);
  };

  // Custom formatting helpers
  const applyHighlight = (color: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (color === 'transparent') {
      executeCommand('removeFormat');
    } else {
      const success = document.execCommand('hiliteColor', false, color);
      if (!success) {
        document.execCommand('backColor', false, color);
      }
    }
    setShowHighlightDropdown(false);
    handleInput();
  };

  const applyTextColor = (color: string) => {
    executeCommand('foreColor', color);
    setShowColorDropdown(false);
  };

  const applyHeading = (headingTag: string) => {
    if (headingTag === 'p') {
      executeCommand('formatBlock', '<p>');
    } else {
      executeCommand('formatBlock', `<${headingTag}>`);
    }
    setShowHeadingDropdown(false);
  };

  const insertTable = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; width: 35px; text-align: center;">No</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Keputusan & Penugasan</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; width: 140px; text-align: left;">PIC</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; width: 110px; text-align: left;">Tenggat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Tuliskan poin tindakan atau penugasan...</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Nama Staf</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">dd/mm/yyyy</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, tableHtml);
    handleInput();
  };

  const insertChecklist = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const checkHtml = `<p>⬜ <i>[Tindakan / Action item baru]</i></p>`;
    document.execCommand('insertHTML', false, checkHtml);
    handleInput();
  };

  const insertMeetingTemplate = () => {
    if (!editorRef.current) return;
    if (editorRef.current.innerText.trim().length > 15) {
      if (!window.confirm('Apakah Anda ingin menyisipkan kerangka template notulen rapat di posisi kursor?')) {
        return;
      }
    }

    editorRef.current.focus();
    const templateHtml = `
      <h3>📌 1. Agenda Pembahasan</h3>
      <ul>
        <li>Poin agenda rapat pertama</li>
        <li>Poin agenda rapat kedua</li>
      </ul>
      <h3>💬 2. Poin Diskusi & Masukan Staf</h3>
      <ul>
        <li>Diskusi dan kendala operasional yang dihadapi...</li>
        <li>Evaluasi pelaksanaan program kerja...</li>
      </ul>
      <h3>✅ 3. Keputusan & Kesepakatan Bersama</h3>
      <ul>
        <li>Keputusan strategis rapat...</li>
      </ul>
      <h3>🚀 4. Tindak Lanjut & Penugasan (Action Items)</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; width: 35px; text-align: center;">No</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Tindakan / Tugas</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; width: 140px; text-align: left;">PIC</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; width: 110px; text-align: left;">Tenggat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Penyelesaian laporan bulanan</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Sekretariat</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Akhir Pekan</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, templateHtml);
    handleInput();
  };

  const isNearLimit = charCount >= warningCharacters;
  const isOverLimit = charCount >= maxCharacters;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200'
          : 'relative border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:border-[#0c2340] focus-within:ring-1 focus-within:ring-[#0c2340] transition-all'
      }
    >
      {/* Fullscreen Wrapper Window */}
      <div
        className={
          isFullscreen
            ? 'bg-slate-50 w-full h-full max-w-5xl rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-700/50'
            : 'w-full flex flex-col'
        }
      >
        {/* Fullscreen Top Header */}
        {isFullscreen && (
          <div className="bg-[#0c2340] px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="p-1.5 bg-white/10 rounded text-slate-200">
                <FileText className="w-4 h-4" />
              </span>
              <div className="truncate">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate">{title}</h3>
                <p className="text-[10px] text-slate-300">
                  Mode Layar Penuh (Distraction-Free Editor) &bull; Tekan{' '}
                  <kbd className="bg-white/20 px-1 py-0.2 rounded text-[9px] font-mono">Esc</kbd> untuk kembali
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded text-slate-200 hidden sm:inline-block">
                {wordCount} kata &bull; {charCount.toLocaleString('id-ID')} karakter
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Keluar Layar Penuh (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar Layar Penuh</span>
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-slate-100 border-b border-slate-200 px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1 shrink-0 select-none">
          <div className="flex flex-wrap items-center gap-0.5">
            {/* Heading Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowHeadingDropdown(!showHeadingDropdown);
                  setShowHighlightDropdown(false);
                  setShowColorDropdown(false);
                }}
                className="p-1.5 hover:bg-slate-200 rounded text-slate-700 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Pilih Format Judul / Paragraf"
              >
                <Heading className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium hidden sm:inline">Format</span>
              </button>
              {showHeadingDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-1 z-30 w-36 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => applyHeading('p')}
                    className="w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    Normal (Paragraf)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHeading('h1')}
                    className="w-full text-left px-2 py-1 text-sm font-bold text-slate-900 hover:bg-slate-100 rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    <Heading1 className="w-3.5 h-3.5 text-[#0c2340]" /> Judul 1 (H1)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHeading('h2')}
                    className="w-full text-left px-2 py-1 text-xs font-bold text-slate-900 hover:bg-slate-100 rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    <Heading2 className="w-3.5 h-3.5 text-[#0c2340]" /> Judul 2 (H2)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHeading('h3')}
                    className="w-full text-left px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded flex items-center gap-1.5 cursor-pointer"
                  >
                    <Heading3 className="w-3.5 h-3.5 text-[#0c2340]" /> Subjudul (H3)
                  </button>
                </div>
              )}
            </div>

            <div className="w-[1px] h-4 bg-slate-300 mx-1" />

            {/* Bold */}
            <button
              type="button"
              onClick={() => executeCommand('bold')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Tebal (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => executeCommand('italic')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Miring (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            {/* Underline */}
            <button
              type="button"
              onClick={() => executeCommand('underline')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Garis Bawah (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            {/* Strikethrough */}
            <button
              type="button"
              onClick={() => executeCommand('strikeThrough')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Coret (Strikethrough)"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-300 mx-1" />

            {/* Highlight / Stabilo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowHighlightDropdown(!showHighlightDropdown);
                  setShowColorDropdown(false);
                  setShowHeadingDropdown(false);
                }}
                className="p-1.5 hover:bg-slate-200 rounded text-amber-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Sorot Warna / Stabilo (Highlight)"
              >
                <Highlighter className="w-3.5 h-3.5" />
              </button>
              {showHighlightDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 z-30 w-44 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 px-1">Pilih Warna Stabilo:</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {HIGHLIGHT_COLORS.map((hc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyHighlight(hc.color)}
                        className={`h-6 rounded text-[9px] font-medium flex items-center justify-center cursor-pointer shadow-2xs hover:opacity-80 transition-opacity ${hc.bgClass}`}
                        title={hc.name}
                      >
                        {hc.color === 'transparent' ? '✕' : ''}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => applyHighlight('transparent')}
                    className="w-full text-center text-[10px] text-slate-500 hover:text-slate-800 pt-1 border-t border-slate-100 cursor-pointer block mt-1"
                  >
                    Hapus Sorotan
                  </button>
                </div>
              )}
            </div>

            {/* Text Color */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorDropdown(!showColorDropdown);
                  setShowHighlightDropdown(false);
                  setShowHeadingDropdown(false);
                }}
                className="p-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Warna Teks"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              {showColorDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-2 z-30 w-36 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 px-1">Warna Font:</div>
                  <div className="space-y-1">
                    {TEXT_COLORS.map((tc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyTextColor(tc.color)}
                        className="w-full text-left px-2 py-0.5 rounded text-xs flex items-center gap-2 hover:bg-slate-100 cursor-pointer"
                      >
                        <span className="w-3 h-3 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: tc.color }} />
                        <span className="truncate">{tc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-[1px] h-4 bg-slate-300 mx-1" />

            {/* Bullet List */}
            <button
              type="button"
              onClick={() => executeCommand('insertUnorderedList')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Daftar Poin (Bullet List)"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            {/* Numbered List */}
            <button
              type="button"
              onClick={() => executeCommand('insertOrderedList')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Daftar Angka (Numbered List)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            {/* Checklist */}
            <button
              type="button"
              onClick={insertChecklist}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-emerald-700 transition-colors cursor-pointer hidden sm:inline-flex"
              title="Sisipkan Item Centang / Checklist"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>

            {/* Blockquote */}
            <button
              type="button"
              onClick={() => executeCommand('formatBlock', '<blockquote>')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Kutipan / Catatan Penting (Blockquote)"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            {/* Divider */}
            <button
              type="button"
              onClick={() => executeCommand('insertHorizontalRule')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer hidden sm:inline-flex"
              title="Garis Pembatas (Divider)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Table */}
            <button
              type="button"
              onClick={insertTable}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Sisipkan Tabel Tugas & PIC"
            >
              <Table className="w-3.5 h-3.5" />
            </button>

            {/* Template Notulen */}
            <button
              type="button"
              onClick={insertMeetingTemplate}
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-[11px] font-semibold text-amber-800 flex items-center gap-1 transition-colors cursor-pointer ml-0.5"
              title="Sisipkan Kerangka Notulen Rapat Standar"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span className="hidden sm:inline">Template Notulen</span>
            </button>

            <div className="w-[1px] h-4 bg-slate-300 mx-1" />

            {/* Undo */}
            <button
              type="button"
              onClick={() => executeCommand('undo')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Redo */}
            <button
              type="button"
              onClick={() => executeCommand('redo')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Clear Formatting */}
            <button
              type="button"
              onClick={() => executeCommand('removeFormat')}
              className="p-1.5 hover:bg-slate-200 active:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer"
              title="Hapus Pemformatan"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Action: Fullscreen Toggle */}
          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                {wordCount} kata &bull; {charCount} ktr
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-800 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh (Esc)' : 'Gedekan Jadi Layar Penuh (Full Screen)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Kecilkan</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#0c2340]" />
                  <span className="text-[11px] font-bold text-[#0c2340]">Layar Penuh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Warning / Suggest Google Docs Banner if text is large */}
        {isNearLimit && (
          <div
            className={`px-3 py-2 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shrink-0 ${
              isOverLimit ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isOverLimit ? 'text-rose-600' : 'text-amber-600'}`} />
              <div>
                <p className="font-semibold text-[11px]">
                  {isOverLimit
                    ? `Batas maksimal tercapai (${charCount.toLocaleString('id-ID')} / ${maxCharacters.toLocaleString('id-ID')} karakter)`
                    : `Catatan notulensi sudah cukup panjang (${charCount.toLocaleString('id-ID')} / ${maxCharacters.toLocaleString('id-ID')} karakter)`}
                </p>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Untuk notulensi rapat yang sangat tebal/detail, disarankan menggunakan <strong>Google Docs</strong> agar
                  lebih leluasa dan cantumkan tautannya pada kolom tautan di bawah.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
              <a
                href="https://docs.new"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                title="Buat dokumen Google Docs baru di tab baru"
              >
                <FileText className="w-3 h-3" /> Buka Google Docs <ExternalLink className="w-2.5 h-2.5" />
              </a>

              {gdriveFolderUrl && (
                <a
                  href={gdriveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[10px] font-medium flex items-center gap-1 shadow-2xs transition-colors"
                  title="Buka Folder Google Drive Yayasan"
                >
                  <FolderOpen className="w-3 h-3" /> Folder Drive
                </a>
              )}
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div
          className={
            isFullscreen
              ? 'flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-100'
              : 'relative bg-white'
          }
        >
          <div
            className={
              isFullscreen
                ? 'max-w-4xl w-full bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-10 min-h-full flex flex-col'
                : 'w-full'
            }
          >
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onBlur={handleInput}
              style={{ minHeight: isFullscreen ? '60vh' : minHeight }}
              className="rich-text-content px-3.5 py-2.5 text-xs text-slate-800 outline-none leading-relaxed overflow-y-auto font-sans focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
              data-placeholder={placeholder}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Footer / Status bar (Especially helpful in fullscreen) */}
        {isFullscreen && (
          <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-3 text-[11px]">
              <span>
                <strong>{wordCount}</strong> Kata &bull; <strong>{charCount.toLocaleString('id-ID')}</strong> Karakter
              </span>
              <span className="hidden md:inline text-slate-400">|</span>
              <span className="hidden md:inline text-slate-400">
                Pintasan: <strong>Ctrl+B</strong> Tebal &bull; <strong>Ctrl+I</strong> Miring &bull; <strong>Ctrl+U</strong> Garis Bawah
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-1.5 bg-[#0c2340] hover:bg-[#1b365d] text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Selesai & Kembali ke Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Rich Text Viewer Component for viewing formatted meeting notes
interface RichTextViewerProps {
  content: string;
  className?: string;
}

export const RichTextViewer: React.FC<RichTextViewerProps> = ({ content, className = '' }) => {
  const [copied, setCopied] = useState(false);

  if (!content) {
    return <span className="text-slate-400 italic text-xs">Belum ada notulen / catatan tercatat.</span>;
  }

  // Check if content has HTML tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  const handleCopy = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const textToCopy = tempDiv.innerText || tempDiv.textContent || content;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 bg-white/90 hover:bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded text-[10px] font-semibold flex items-center gap-1 shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
        title="Salin isi notulen ke clipboard"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 text-emerald-600" />
            <span className="text-emerald-700">Tersalin!</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Salin</span>
          </>
        )}
      </button>

      {hasHtml ? (
        <div
          className={`rich-text-content text-xs text-slate-800 leading-relaxed font-sans ${className}`}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <div className={`text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans ${className}`}>
          {content}
        </div>
      )}
    </div>
  );
};
