import { Router, Request, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';

const router = Router();

// Custom Inward Letter Download Endpoint
router.get('/download/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const letter = await dbDriver.getDoc('inward_letters', id);
    if (!letter) {
      return res.status(404).send('Surat masuk tidak ditemukan');
    }

    const { letterNumber, sender, subject, receivedDate, attachmentUrl } = letter as any;
    const cleanNum = (letterNumber || 'S-MASUK').replace(/[\/\s]/g, '_');

    // If there is an attachment URL that has base64 data
    if (attachmentUrl && attachmentUrl.startsWith('data:')) {
      const match = attachmentUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.split('/')[1] || 'bin';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="Scan_Surat_Masuk_${cleanNum}.${ext}"`);
        res.end(buffer);
        return;
      }
    }

    // Fallback: Generate structured formal text file representational metadata of the letter
    const textData = `========================================================================
YAYASAN MURID MUDA BERMISI (MMB)
SISTEM INFORMASI ARSIP SECARA ELEKTRONIK (SI-ARSEP)
------------------------------------------------------------------------
ARSIP SALINAN DIGITAL: PENERIMAAN SURAT MASUK (INWARD MAIL)
========================================================================

ID ARSIP REGISTER : ${id}
NOMOR BERKAS SURAT : ${letterNumber || '-'}
INSTANSI PENGIRIM  : ${sender || '-'}
PERIHAL AGENDA     : ${subject || '-'}
TANGGAL DITERIMA   : ${receivedDate || '-'}
ALUR STATUS DISPOS : ${letter.status || 'Disposisi'}

------------------------------------------------------------------------
DESKRIPSI RINCIAN SURAT:
Surat masuk ini telah terverifikasi dan tercatat secara komputerisasi 
pada Database Sekretariat Yayasan Murid Muda Bermisi (MMB).

Dokumen fisik asli (hardcopy) disimpan di lemari arsip Sekretariat Utama.
Silakan hubungi staf sekretaris eksekutif dengan menyertakan Nomor Berkas
di atas jika membutuhkan pemindaian fisik/stempel basah.

Dokumen berhasil diunduh secara aman dari Sistem Informasi MMB.
========================================================================`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Arsip_Surat_Masuk_${cleanNum}.txt"`);
    res.send(textData);
  } catch (error: any) {
    console.error('Error downloading inward letter:', error);
    res.status(500).send(`Gagal mengunduh berkas: ${error.message}`);
  }
});

// Custom Inward Letter Preview Endpoint
router.get('/preview/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const letter = await dbDriver.getDoc('inward_letters', id);
    if (!letter) {
      return res.status(404).send('Surat masuk tidak ditemukan');
    }

    const { letterNumber, sender, subject, receivedDate, attachmentUrl } = letter as any;

    if (attachmentUrl && attachmentUrl.startsWith('data:')) {
      const match = attachmentUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', 'inline');
        res.end(buffer);
        return;
      }
    }

    // Fallback HTML page representation acting as the document preview sheet
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pratinjau Arsip Surat - ${letterNumber || 'S-MASUK'}</title>
  <style>
    body {
      font-family: 'Courier New', Courier, monospace;
      background-color: #f1f5f9;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }
    .document {
      background: white;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      border-radius: 8px;
      padding: 40px;
      max-width: 800px;
      width: 100%;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .school {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .title {
      font-size: 20px;
      margin: 10px 0;
      color: #1e3a8a;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .meta-table td {
      padding: 10px;
      border-bottom: 1px dashed #cbd5e1;
      font-size: 14px;
    }
    .meta-table td.label {
      font-weight: bold;
      color: #475569;
      width: 30%;
    }
    .notes-box {
      border: 1.5px dashed #64748b;
      background: #f8fafc;
      padding: 20px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="header">
      <div class="school">YAYASAN MURID MUDA BERMISI (MMB)</div>
      <div class="title">SI-ARSEP (Sistem Informasi Arsip Elektronik)</div>
      <div style="font-size: 12px; color: #64748b;">Dokumen Salinan Digital Resmi Sekretariat</div>
    </div>
    
    <table class="meta-table">
      <tr>
        <td class="label">ID Dokumen</td>
        <td>${id}</td>
      </tr>
      <tr>
        <td class="label">Nomor Surat</td>
        <td style="font-weight: bold; color: #1e293b;">${letterNumber || '-'}</td>
      </tr>
      <tr>
        <td class="label">Instansi Pengirim</td>
        <td>${sender || '-'}</td>
      </tr>
      <tr>
        <td class="label">Perihal Agenda</td>
        <td style="font-weight: 500;">${subject || '-'}</td>
      </tr>
      <tr>
        <td class="label">Tanggal Diterima</td>
        <td>${receivedDate || '-'}</td>
      </tr>
      <tr>
        <td class="label">Status Disposisi</td>
        <td><span class="badge">${letter.status || 'Disposisi'}</span></td>
      </tr>
    </table>

    <div class="notes-box">
      <strong>Catatan Keterangan Fisik:</strong><br>
      Surat masuk asli telah diarsipkan di Sekretariat Utama Yayasan Murid Muda Bermisi (MMB). Informasi di atas diregistrasikan oleh operator sistem yang berwenang sebagai asupan disposisi pimpinan tingkat yayasan.
    </div>
  </div>
</body>
</html>`);
  } catch (error: any) {
    console.error('Error previewing inward letter:', error);
    res.status(500).send(`Gagal memuat pratinjau: ${error.message}`);
  }
});

export const lettersRouter = router;
export default lettersRouter;
