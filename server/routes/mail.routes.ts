import { Router, Response } from 'express';
import { authenticateToken } from './auth.routes';
import { dbDriver } from '../db/driver';
import {
  getSmtpConfig,
  verifySmtpConnection,
  sendTestEmail,
  sendStaffTaskNotificationEmail,
  sendDailyMorningTaskDigest,
  sendCustomBroadcastEmail,
  sendSalarySlipEmail,
  SmtpConfig,
} from '../services/mail.service';
import { auditFromReq, writeAuditLog } from '../utils/audit.util';

export const mailRouter = Router();

// GET /api/mail/config - Cek status dan konfigurasi SMTP (Password disamarkan)
mailRouter.get('/config', authenticateToken, async (req: any, res: Response) => {
  try {
    const config = await getSmtpConfig();
    res.json({
      success: true,
      config: {
        enabled: config.enabled,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        passMasked: config.pass ? '••••••••' : '',
        from: config.from,
        notifyStaffTasks: config.notifyStaffTasks,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/mail/verify - Uji koneksi ke SMTP server
mailRouter.post('/verify', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan';
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas untuk menguji koneksi SMTP.' });
  }

  try {
    const overrideConfig: Partial<SmtpConfig> = req.body || {};
    const result = await verifySmtpConnection(overrideConfig);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mail/test - Kirim email pengujian ke alamat tujuan
mailRouter.post('/test', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan';
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas untuk mengirim email uji coba.' });
  }

  const { toEmail, config } = req.body;
  if (!toEmail || !toEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Alamat email tujuan pengujian tidak valid.' });
  }

  const { userName, userRole } = auditFromReq(req);

  try {
    const result = await sendTestEmail(toEmail, config);
    if (result.success) {
      await writeAuditLog({
        userName,
        userRole,
        action: `Kirim Email Uji Coba SMTP ke ${toEmail}`,
        module: 'Sistem & Konfigurasi SMTP',
      });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mail/notify-task/:taskId - Kirim / kirim ulang notifikasi penugasan staf
mailRouter.post('/notify-task/:taskId', authenticateToken, async (req: any, res: Response) => {
  const { taskId } = req.params;
  const { email } = req.body;
  const { userName } = auditFromReq(req);

  try {
    const task = await dbDriver.getDoc('staff_tasks', taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Data penugasan staf tidak ditemukan.' });
    }

    const result = await sendStaffTaskNotificationEmail(task, email, userName);
    if (result.sent) {
      res.json({ success: true, message: `Notifikasi email untuk task "${task.title}" berhasil dikirim.` });
    } else {
      res.status(400).json({ success: false, message: result.reason || 'Gagal mengirim email notifikasi.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mail/morning-digest - Uji / pemicu manual digest pengingat tugas pagi 07:00 WIB
mailRouter.post('/morning-digest', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const isSuperAdmin = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan';
  if (!isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }

  try {
    const result = await sendDailyMorningTaskDigest();
    res.json({
      success: true,
      message: `Digest pagi berhasil diproses. ${result.totalSent} email terkirim, ${result.errors} gagal.`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mail/broadcast - Kirim pesan / pengumuman broadcast manual ke staf / email tertentu
mailRouter.post('/broadcast', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const isAuthorized = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Sekretaris' || role === 'Bendahara';
  if (!isAuthorized) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas untuk mengirim pesan broadcast.' });
  }

  const { recipients, subject, category, message, attachmentUrl } = req.body;
  const { userName } = auditFromReq(req);

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ success: false, message: 'Pilih setidaknya satu alamat email penerima.' });
  }

  if (!subject || !message) {
    return res.status(400).json({ success: false, message: 'Subjek dan isi pesan wajib diisi.' });
  }

  try {
    const result = await sendCustomBroadcastEmail({
      recipients,
      subject,
      category,
      message,
      attachmentUrl,
      senderName: userName,
    });

    res.json({
      success: true,
      message: `Pesan broadcast berhasil dikirim ke ${result.totalSent} penerima (${result.errors} gagal).`,
      result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/mail/send-slip - Kirim slip gaji ke staf tertentu
mailRouter.post('/send-slip', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const isAuthorized = role === 'Super Admin' || role === 'Ketua Yayasan' || role === 'Pembina Yayasan' || role === 'Bendahara';
  if (!isAuthorized) {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas untuk mengirim slip gaji.' });
  }

  const { staffNik, month, paidAmount, treasurerName, salaryConfig, salaryBreakdown } = req.body;
  const { userName } = auditFromReq(req);

  if (!staffNik) {
    return res.status(400).json({ success: false, message: 'NIK staf wajib disertakan.' });
  }

  try {
    const staff = await dbDriver.getDoc('staff', staffNik);
    if (!staff || staff.deleted) {
      return res.status(404).json({ success: false, message: 'Data staf tidak ditemukan.' });
    }

    const profile = await dbDriver.getDoc('profiles', 'PROF-01');

    const result = await sendSalarySlipEmail({
      staff,
      salaryConfig,
      salaryBreakdown,
      month: month || new Date().toISOString().substring(0, 7),
      paidAmount: Number(paidAmount || 0),
      treasurerName: treasurerName || 'Bendahara Yayasan',
      senderName: userName,
    });

    if (result.sent) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
