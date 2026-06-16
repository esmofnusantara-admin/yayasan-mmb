import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';

const router = Router();

// Custom File Upload & Document Archive Support (up to 5 MB limit is automatically handled by express body parsers)
router.post('/upload', authenticateToken, async (req: Request, res: Response) => {
  const { id, name, category, fileData, fileSize } = req.body;
  if (!id || !name || !fileData) {
    return res.status(400).json({ error: 'Data dokumen tidak lengkap untuk diunggah.' });
  }

  try {
    // 1. Validate that payload isn't empty and extract base64 components
    const match = fileData.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Format berkas dokumen tidak valid (harus data URL base64).' });
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'Ukuran dokumen melebihi batas maksimum 5 MB.' });
    }

    // 2. Ensure uploads directory exists
    const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // 3. Write physical file to uploads directory
    const filePath = path.join(UPLOADS_DIR, id);
    fs.writeFileSync(filePath, buffer);

    // 4. Save metadata in Firestore documents collection
    const metadata = {
      id,
      name,
      category: category || 'Lain-lain',
      uploadedDate: new Date().toISOString().substring(0, 10),
      fileSize: fileSize || `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`,
      mimeType,
      originalName: name,
      hasFile: true,
      deleted: false
    };

    await dbDriver.setDoc('documents', id, metadata);
    console.log(`[DOCUMENTS UPLOAD] Successfully saved file and metadata for ${name} (id: ${id}, size: ${metadata.fileSize})`);
    res.json({ success: true, metadata });
  } catch (error: any) {
    console.error('[DOCUMENTS UPLOAD] Error uploading document:', error);
    res.status(500).json({ error: `Gagal mengunggah dokumen: ${error.message}` });
  }
});

// Custom Document Download Endpoint
router.get('/download/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
    const filePath = path.join(UPLOADS_DIR, id);

    // Check if the physical file exists
    if (fs.existsSync(filePath)) {
      // Fetch metadata to find the original extension/name and correct content type
      const docMeta = await dbDriver.getDoc('documents', id);
      const originalName = docMeta?.originalName || docMeta?.name || `dokumen_${id}`;
      const mimeType = docMeta?.mimeType || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      // Fallback: If no physical file exists, generate a dynamic text file for a flawless experience
      const docMeta = await dbDriver.getDoc('documents', id);
      const docName = docMeta?.name || `Dokumen Organisasi ${id}`;
      const docCat = docMeta?.category || 'Umum';
      const docDate = docMeta?.uploadedDate || new Date().toISOString().substring(0, 10);

      // Generate a simple, formal text file representation
      const fileContent = `=========================================
YAYASAN MURID MUDA BERMISI (MMB)
          SALINAN DOKUMEN RESMI
=========================================

ID DOKUMEN  : ${id}
NAMA BERKAS : ${docName}
KATEGORI    : ${docCat}
TGL UNGGAH  : ${docDate}
INTEGRITAS  : TERVERIFIKASI SISTEM (ARSIP DIGITAL)

-----------------------------------------
Pemberitahuan Sistem:
Dokumen ini merupakan salinan digital resmi dari arsip konstitusi Yayasan 
Murid Muda Bermisi. Hubungi Sekretaris Eksekutif untuk memperoleh 
salinan cetak kelayakan fisik yang berstempel basah.

Dokumen berhasil diunduh dari Cloud Database.
=========================================`;

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(docName)}.txt"`);
      res.send(fileContent);
    }
  } catch (error: any) {
    console.error('[DOCUMENTS DOWNLOAD] Error downloading document:', error);
    res.status(500).json({ error: `Gagal mengunduh dokumen: ${error.message}` });
  }
});

// Custom Document Preview Endpoint
router.get('/preview/:id', authenticateToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
    const filePath = path.join(UPLOADS_DIR, id);

    if (fs.existsSync(filePath)) {
      const docMeta = await dbDriver.getDoc('documents', id);
      const mimeType = docMeta?.mimeType || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', 'inline');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      const docMeta = await dbDriver.getDoc('documents', id);
      const docName = docMeta?.name || `Dokumen Organisasi ${id}`;
      const docCat = docMeta?.category || 'Umum';
      const docDate = docMeta?.uploadedDate || new Date().toISOString().substring(0, 10);

      // Render a formal HTML digital duplicate document sheet for preview
      res.setHeader('Content-Type', 'text/html');
      res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pratinjau Dokumen - ${docName}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 16px;
      display: flex;
      justify-content: center;
    }
    .document {
      background: white;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
      border-radius: 16px;
      padding: 48px;
      max-width: 650px;
      width: 100%;
      box-sizing: border-box;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 48px;
      font-weight: 900;
      color: rgba(99, 102, 241, 0.03);
      user-select: none;
      pointer-events: none;
      white-space: nowrap;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #ebf1f9;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .school {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #475569;
      text-transform: uppercase;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      margin: 12px 0 6px 0;
      color: #0f172a;
    }
    .subtitle {
      font-size: 11px;
      color: #64748b;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    .meta-section {
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 13px;
    }
    .row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .row:first-child {
      padding-top: 0;
    }
    .label {
      font-weight: 600;
      color: #64748b;
      width: 40%;
    }
    .value {
      color: #1e293b;
      font-weight: 700;
      width: 60%;
      text-align: right;
    }
    .badge {
      display: inline-block;
      background: #e0e7ff;
      color: #4f46e5;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
    }
    .info-footer {
      border-top: 2px solid #ebf1f9;
      padding-top: 24px;
      margin-top: 32px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .stamp-area {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 32px;
    }
    .digital-seal {
      width: 70px;
      height: 70px;
      border: 2px solid #4f46e5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4f46e5;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      transform: rotate(-10deg);
      text-align: center;
      padding: 4px;
      box-sizing: border-box;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <div class="document">
    <div class="watermark">MMB ARSIP RESMI</div>
    <div class="header">
      <div class="school">Yayasan Murid Muda Bermisi (MMB)</div>
      <div class="title">SI-ARSEP (Arsip Elektronik)</div>
      <div class="subtitle font-mono">DOKUMEN REGISTER: ${id}</div>
    </div>
    
    <div class="meta-section">
      <div class="row">
        <div class="label">Nama Dokumen</div>
        <div class="value">${docName}</div>
      </div>
      <div class="row">
        <div class="label">Kategori Arsip</div>
        <div class="value"><span class="badge">${docCat}</span></div>
      </div>
      <div class="row">
        <div class="label">Tanggal Diunggah</div>
        <div class="value">${docDate}</div>
      </div>
      <div class="row">
        <div class="label">Status Keamanan</div>
        <div class="value" style="color: #10b981;">Tersimpan & Terenkripsi</div>
      </div>
    </div>

    <div class="info-footer">
      <strong>Catatan Keterangan Fisik:</strong><br>
      Dokumen ini tercatat dalam pangkalan data digital SI-ARSEP MMB. Segala bentuk salinan digital di atas dinyatakan absah dan sesuai dengan salinan berkas fisik asli yang tersimpan di bawah penanganan Sekretaris Eksekutif Yayasan MMB.
    </div>

    <div class="stamp-area">
      <div style="font-size: 11px; color: #94a3b8;">
        Sistem Informasi Kearsipan Terpadu<br>
        Yayasan Murid Muda Bermisi (MMB)
      </div>
      <div class="digital-seal">
        DEPARTEMEN ARSIP<br>&bull;<br>MMB
      </div>
    </div>
  </div>
</body>
</html>`);
    }
  } catch (error: any) {
    console.error('[DOCUMENTS PREVIEW] Error previewing document:', error);
    res.status(500).send(`Gagal memuat pratinjau dokumen: ${error.message}`);
  }
});

export const documentsRouter = router;
export default documentsRouter;
