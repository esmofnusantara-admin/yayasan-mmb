import nodemailer from 'nodemailer';
import { dbDriver } from '../db/driver';
import { writeAuditLog } from '../utils/audit.util';

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  notifyStaffTasks: boolean;
}

/**
 * Mendapatkan konfigurasi SMTP aktif dari profil institusi (database) atau environment variables.
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  let profile: any = null;
  try {
    profile = await dbDriver.getDoc('profiles', 'PROF-01');
    if (!profile) {
      const all = await dbDriver.getDocs('profiles');
      profile = all.find((p: any) => p.id === 'PROF-01') || all[0] || null;
    }
  } catch (err) {
    console.warn('[MailService] Failed to read profile for SMTP config, falling back to ENV:', err);
  }

  const host = profile?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(profile?.smtpPort || process.env.SMTP_PORT || 465);
  const secure = profile?.smtpSecure !== undefined ? Boolean(profile.smtpSecure) : (port === 465);
  const user = profile?.smtpUser || process.env.SMTP_USER || '';
  const pass = profile?.smtpPass || process.env.SMTP_PASS || '';
  const from = profile?.smtpFrom || process.env.SMTP_FROM || (user ? `"Yayasan MMB" <${user}>` : '"Yayasan MMB" <no-reply@muridmudabermisi.or.id>');
  const enabled = profile?.smtpEnabled !== undefined ? Boolean(profile.smtpEnabled) : (Boolean(user && pass));
  const notifyStaffTasks = profile?.smtpNotifyStaffTasks !== undefined ? Boolean(profile.smtpNotifyStaffTasks) : true;

  return {
    enabled,
    host,
    port,
    secure,
    user,
    pass,
    from,
    notifyStaffTasks,
  };
}

/**
 * Membuat nodemailer transporter berdasarkan konfigurasi yang diberikan atau aktif.
 */
export function createTransporter(overrideConfig?: Partial<SmtpConfig>, baseConfig?: SmtpConfig) {
  const host = overrideConfig?.host ?? baseConfig?.host ?? 'smtp.gmail.com';
  const port = Number(overrideConfig?.port ?? baseConfig?.port ?? 465);
  const secure = overrideConfig?.secure !== undefined ? Boolean(overrideConfig.secure) : (port === 465);
  const user = overrideConfig?.user ?? baseConfig?.user ?? '';
  const pass = overrideConfig?.pass ?? baseConfig?.pass ?? '';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Menghindari kendala sertifikat pada lingkungan tertutup
    },
  });
}

/**
 * Memverifikasi kredensial dan konektivitas SMTP server.
 */
export async function verifySmtpConnection(overrideConfig?: Partial<SmtpConfig>): Promise<{ success: boolean; message: string }> {
  try {
    const baseConfig = await getSmtpConfig();
    const config = { ...baseConfig, ...overrideConfig };

    if (!config.host || !config.user || !config.pass) {
      return {
        success: false,
        message: 'Kredensial SMTP belum lengkap (Host, Username/Email, dan Password diperlukan).',
      };
    }

    const transporter = createTransporter(config);
    await transporter.verify();
    return {
      success: true,
      message: `Koneksi SMTP ke ${config.host}:${config.port} berhasil diverifikasi.`,
    };
  } catch (err: any) {
    console.error('[MailService] SMTP verification failed:', err);
    return {
      success: false,
      message: `Gagal verifikasi SMTP: ${err.message || 'Koneksi ditolak atau autentikasi gagal.'}`,
    };
  }
}

/**
 * Mengirim email secara umum.
 */
export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  overrideConfig?: Partial<SmtpConfig>;
}): Promise<{ success: boolean; message: string; messageId?: string }> {
  try {
    const baseConfig = await getSmtpConfig();
    const config = { ...baseConfig, ...options.overrideConfig };

    if (!config.enabled && !options.overrideConfig) {
      return {
        success: false,
        message: 'Layanan email SMTP sedang dinonaktifkan dalam pengaturan sistem.',
      };
    }

    if (!config.host || !config.user || !config.pass) {
      return {
        success: false,
        message: 'Kredensial SMTP belum lengkap.',
      };
    }

    const fromAddress = config.from || (config.user ? `"Yayasan MMB" <${config.user}>` : '"Yayasan MMB" <no-reply@muridmudabermisi.or.id>');
    const transporter = createTransporter(config);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]+>/g, ' '),
      html: options.html,
    });

    return {
      success: true,
      message: `Email berhasil dikirim ke ${options.to}`,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error('[MailService] Failed to send email to', options.to, err);
    return {
      success: false,
      message: `Gagal mengirim email: ${err.message || 'Terjadi kesalahan pada server mail.'}`,
    };
  }
}

/**
 * Mengirim email pengujian koneksi SMTP ke penerima tertentu.
 */
export async function sendTestEmail(
  toEmail: string,
  overrideConfig?: Partial<SmtpConfig>
): Promise<{ success: boolean; message: string; messageId?: string }> {
  const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' });
  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background-color: #0c2340; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0 0; color: #e2e8f0; font-size: 13px; }
        .badge { display: inline-block; background-color: #ca8a04; color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 9999px; margin-top: 10px; text-transform: uppercase; }
        .content { padding: 24px; color: #334155; font-size: 14px; line-height: 1.6; }
        .card { background-color: #f8fafc; border-left: 4px solid #0c2340; padding: 14px 16px; margin: 16px 0; border-radius: 0 6px 6px 0; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Yayasan Murid Muda Bermisi (MMB)</h1>
          <p>Evangelical Student Movement — Sistem Informasi Manajemen</p>
          <div class="badge">Uji Coba Koneksi SMTP Berhasil</div>
        </div>
        <div class="content">
          <p>Halo,</p>
          <p>Email ini adalah pesan pengujian otomatis untuk memverifikasi bahwa integrasi <strong>SMTP Mail Server</strong> pada sistem ERP Yayasan MMB telah terhubung dan berfungsi dengan baik.</p>
          
          <div class="card">
            <strong>Waktu Pengujian:</strong> ${dateStr}<br/>
            <strong>Status Layanan:</strong> Aktif & Siap Mengirim Notifikasi Program Kerja
          </div>

          <p>Mulai saat ini, staf yang diberikan penugasan atau program kerja baru akan menerima notifikasi otomatis langsung ke alamat email masing-masing.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Yayasan Murid Muda Bermisi. Seluruh hak cipta dilindungi.</p>
          <p style="margin: 0; color: #94a3b8; font-size: 11px;">Pesan ini dikirim secara otomatis oleh sistem. Mohon tidak membalas email ini.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail({
    to: toEmail,
    subject: '✅ [Uji Coba Sukses] Integrasi Email SMTP Yayasan MMB',
    html,
    overrideConfig,
  });
}

/**
 * Format label periode penugasan agar mudah dibaca dalam bahasa Indonesia.
 */
function formatPeriodLabel(periodType?: string, targetDate?: string): string {
  switch (periodType) {
    case 'DAILY':
      return `Harian (Tanggal: ${targetDate || '-'})`;
    case 'WEEKLY':
      return `Mingguan (Periode: ${targetDate || '-'})`;
    case 'MONTHLY':
      return `Bulanan (Bulan: ${targetDate || '-'})`;
    case 'YEARLY':
      return `Tahunan (Tahun: ${targetDate || '-'})`;
    case 'ONE_TIME_ACTIVITY':
      return `Kegiatan / Proyek Insidental (Target: ${targetDate || '-'})`;
    default:
      return targetDate || '-';
  }
}

/**
 * Mengirimkan email notifikasi penugasan / program kerja ke staf terkait secara background.
 */
export async function sendStaffTaskNotificationEmail(
  task: any,
  explicitEmail?: string,
  assignerName?: string
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const config = await getSmtpConfig();
    if (!config.enabled) {
      console.log('[MailService] SMTP notification skipped: SMTP is disabled in system profile.');
      return { sent: false, reason: 'SMTP is disabled' };
    }

    if (!config.notifyStaffTasks) {
      console.log('[MailService] SMTP task notification skipped: notifyStaffTasks is disabled.');
      return { sent: false, reason: 'Task notifications disabled' };
    }

    // Cari alamat email staf
    let targetEmail = explicitEmail?.trim();
    let staffName = task.staffName || 'Staf Yayasan MMB';

    if (!targetEmail) {
      const allStaff = await dbDriver.getDocs('staff');
      const matched = allStaff.find(
        (s: any) =>
          !s.deleted &&
          ((task.staffNik && s.nik === task.staffNik) ||
            (task.staffName && s.name?.toLowerCase().trim() === task.staffName?.toLowerCase().trim()))
      );

      if (matched && matched.email) {
        targetEmail = matched.email.trim();
        staffName = matched.name || staffName;
      }
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      console.warn(`[MailService] No valid email found for staff ${task.staffName} (${task.staffNik}). Notification not sent.`);
      return { sent: false, reason: 'No valid staff email address found' };
    }

    const periodFormatted = formatPeriodLabel(task.periodType, task.targetDate);
    const scheduleInfo = task.startDate && task.endDate
      ? `${task.startDate} s/d ${task.endDate}${task.time ? ` (Pukul ${task.time})` : ''}`
      : (task.targetDate ? `${task.targetDate}${task.time ? ` (Pukul ${task.time})` : ''}` : '-');

    const assignerLabel = assignerName ? assignerName : 'Manajemen / Pengurus Yayasan MMB';

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
          .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background-color: #0c2340; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px; }
          .header p { margin: 4px 0 0 0; color: #94a3b8; font-size: 13px; }
          .badge { display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6; }
          .task-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0; }
          .task-title { font-size: 16px; font-weight: bold; color: #0c2340; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
          .info-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .info-table td { padding: 6px 0; vertical-align: top; }
          .info-label { width: 140px; color: #64748b; font-weight: 600; }
          .info-val { color: #0f172a; font-weight: 500; }
          .status-tag { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; }
          .notes-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; margin-top: 14px; border-radius: 0 6px 6px 0; font-size: 13px; color: #78350f; }
          .btn-container { text-align: center; margin: 24px 0 10px 0; }
          .btn-primary { display: inline-block; background-color: #0c2340; color: #ffffff !important; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 13px; }
          .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yayasan Murid Muda Bermisi</h1>
            <p>Sistem Pengelolaan Program Kerja & Penugasan Staf</p>
            <div class="badge">📋 Penugasan Staf Baru</div>
          </div>
          <div class="content">
            <p>Yth. <strong>${staffName}</strong>,</p>
            <p>Anda telah diberikan penugasan / program kerja baru pada sistem ERP Yayasan Murid Muda Bermisi. Berikut adalah rincian penugasan Anda:</p>

            <div class="task-box">
              <div class="task-title">📌 ${task.title}</div>
              <table class="info-table">
                <tr>
                  <td class="info-label">Nama Staf / NIK</td>
                  <td class="info-val">${staffName} ${task.staffNik ? `(${task.staffNik})` : ''}</td>
                </tr>
                <tr>
                  <td class="info-label">Periode Penugasan</td>
                  <td class="info-val">${periodFormatted}</td>
                </tr>
                <tr>
                  <td class="info-label">Jadwal Pelaksanaan</td>
                  <td class="info-val">${scheduleInfo}</td>
                </tr>
                <tr>
                  <td class="info-label">Status Saat Ini</td>
                  <td class="info-val"><span class="status-tag">${task.status || 'Belum Mulai'}</span></td>
                </tr>
                <tr>
                  <td class="info-label">Diberikan Oleh</td>
                  <td class="info-val">${assignerLabel}</td>
                </tr>
                ${task.externalLink ? `
                <tr>
                  <td class="info-label">Tautan / Lampiran</td>
                  <td class="info-val"><a href="${task.externalLink}" target="_blank" style="color: #2563eb; text-decoration: underline;">Buka Berkas Lampiran GDrive</a></td>
                </tr>` : ''}
              </table>

              ${task.notes ? `
              <div class="notes-box">
                <strong>📝 Catatan / Petunjuk Teknis:</strong><br/>
                ${task.notes.replace(/\n/g, '<br/>')}
              </div>` : ''}
            </div>

            <div class="btn-container">
              <a href="https://muridmudabermisi.or.id" class="btn-primary" target="_blank">
                Buka Portal Penugasan Staf &rarr;
              </a>
            </div>
            
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
              Mohon periksa dan perbarui status progres pelaksanaan program kerja ini secara berkala melalui menu <strong>Program & Rapat Staf</strong> pada aplikasi Yayasan MMB.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Yayasan Murid Muda Bermisi. Seluruh hak cipta dilindungi.</p>
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">Pemberitahuan otomatis via SMTP System Yayasan MMB.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await sendMail({
      to: targetEmail,
      subject: `📋 [Penugasan Staf] ${task.title} — Yayasan MMB`,
      html,
    });

    if (res.success) {
      console.log(`[MailService] Task notification email sent successfully to ${targetEmail} for task "${task.title}"`);
      await writeAuditLog({
        userName: assignerName || 'System Mailer',
        userRole: 'System',
        action: `Kirim Notifikasi Email Penugasan Staf: "${task.title}" ke ${targetEmail}`,
        module: 'Program & Rapat Staf',
      });
      return { sent: true };
    } else {
      console.warn(`[MailService] Failed to send task notification email: ${res.message}`);
      return { sent: false, reason: res.message };
    }
  } catch (err: any) {
    console.error('[MailService] Unexpected error in sendStaffTaskNotificationEmail:', err);
    return { sent: false, reason: err.message };
  }
}
