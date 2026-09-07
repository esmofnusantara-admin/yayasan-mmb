import { Router, Response } from 'express';
import { authenticateToken } from './auth.routes';
import { dbDriver } from '../db/driver';
import {
  getSmtpConfig,
  verifySmtpConnection,
  sendTestEmail,
  sendStaffTaskNotificationEmail,
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
