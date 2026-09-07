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

export const INSPIRATIONAL_BIBLE_VERSES = [
  {
    verse: "Kolose 3:23-24",
    text: "Apapun juga yang kamu perbuat, perbuatlah dengan segenap hatimu seperti untuk Tuhan dan bukan untuk manusia. Kamu tahu, bahwa dari Tuhanlah kamu akan menerima bagian yang ditentukan bagimu sebagai upah."
  },
  {
    verse: "Amsal 16:3",
    text: "Serahkanlah perbuatanmu kepada TUHAN, maka terlaksanalah rencanamu."
  },
  {
    verse: "1 Korintus 15:58",
    text: "Karena itu, saudara-saudaraku yang kekasih, berdirilah teguh, jangan goyah, dan giatlah selalu dalam pekerjaan Tuhan! Sebab kamu tahu, bahwa dalam persekutuan dengan Tuhan jerih payahmu tidak sia-sia."
  },
  {
    verse: "Galatia 6:9",
    text: "Janganlah kita jemu-jemu berbuat baik, karena apabila sudah datang waktunya, kita akan menuai, jika kita tidak menjadi lemah."
  },
  {
    verse: "Filipi 4:13",
    text: "Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku."
  },
  {
    verse: "Yesaya 40:31",
    text: "Tetapi orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang terbang dengan kekuatan sayapnya; mereka berlari dan tidak menjadi lesu, mereka berjalan dan tidak menjadi lelah."
  },
  {
    verse: "Matius 5:16",
    text: "Demikianlah hendaknya terangmu bercahaya di depan orang, supaya mereka melihat perbuatanmu yang baik dan memuliakan Bapamu yang di sorga."
  }
];

export function getRandomBibleVerse() {
  const index = Math.floor(Math.random() * INSPIRATIONAL_BIBLE_VERSES.length);
  return INSPIRATIONAL_BIBLE_VERSES[index];
}

/**
 * Format mata uang Rupiah
 */
export function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num || 0);
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
      rejectUnauthorized: false,
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
  const bibleVerse = getRandomBibleVerse();

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
        .verse-box { background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 14px 16px; margin: 18px 0; color: #713f12; font-style: italic; font-size: 13px; }
        .verse-title { font-weight: bold; font-style: normal; color: #854d0e; margin-top: 6px; text-align: right; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Yayasan Murid Muda Bermisi</h1>
          <p>Yayasan MMB — ESM Management System</p>
          <div class="badge">Uji Coba Koneksi SMTP Berhasil</div>
        </div>
        <div class="content">
          <p>Halo,</p>
          <p>Email ini adalah pesan pengujian otomatis untuk memverifikasi bahwa integrasi <strong>SMTP Mail Server</strong> pada sistem ERP Yayasan MMB telah terhubung dan berfungsi dengan baik.</p>
          
          <div class="card">
            <strong>Waktu Pengujian:</strong> ${dateStr}<br/>
            <strong>Status Layanan:</strong> Aktif & Siap Mengirim Notifikasi Program Kerja
          </div>

          <div class="verse-box">
            "${bibleVerse.text}"
            <div class="verse-title">— ${bibleVerse.verse}</div>
          </div>

          <p>Mulai saat ini, staf yang diberikan penugasan atau program kerja baru akan menerima konfirmasi resmi langsung ke alamat email masing-masing.</p>
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
 * Mengirimkan email konfirmasi / notifikasi program kerja ke staf terkait secara background.
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
    const bibleVerse = getRandomBibleVerse();

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
          .badge { display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 14px; border-radius: 9999px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6; }
          .task-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0; }
          .task-title { font-size: 16px; font-weight: bold; color: #0c2340; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
          .info-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .info-table td { padding: 6px 0; vertical-align: top; }
          .info-label { width: 140px; color: #64748b; font-weight: 600; }
          .info-val { color: #0f172a; font-weight: 500; }
          .status-tag { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px; }
          .notes-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; margin-top: 14px; border-radius: 0 6px 6px 0; font-size: 13px; color: #78350f; }
          .verse-box { background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 14px 16px; margin: 20px 0; color: #713f12; font-style: italic; font-size: 13px; }
          .verse-title { font-weight: bold; font-style: normal; color: #854d0e; margin-top: 6px; text-align: right; }
          .btn-container { text-align: center; margin: 24px 0 10px 0; }
          .btn-primary { display: inline-block; background-color: #0c2340; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 13px; letter-spacing: 0.3px; }
          .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yayasan Murid Muda Bermisi</h1>
            <p>Yayasan MMB — ESM Management System</p>
            <div class="badge">📋 Program Kerja Staf</div>
          </div>
          <div class="content">
            <p>Yth. <strong>${staffName}</strong>,</p>
            <p>Berikut adalah konfirmasi tugas Anda pada aplikasi Management Yayasan MMB - ESM:</p>

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

            <div class="verse-box">
              "${bibleVerse.text}"
              <div class="verse-title">— ${bibleVerse.verse}</div>
            </div>

            <div class="btn-container">
              <a href="https://prod.yayasan-mmb.web.id/#/staff-tasks" class="btn-primary" target="_blank">
                Buka Portal Program Kerja Staf &rarr;
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
      subject: `📋 [Program Kerja Staf] ${task.title} — Yayasan MMB`,
      html,
    });

    if (res.success) {
      console.log(`[MailService] Task notification email sent successfully to ${targetEmail} for task "${task.title}"`);
      await writeAuditLog({
        userName: assignerName || 'System Mailer',
        userRole: 'System',
        action: `Kirim Notifikasi Email Program Kerja Staf: "${task.title}" ke ${targetEmail}`,
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

/**
 * Mengirimkan ringkasan harian (Daily Morning Digest) jam 07:00 pagi ke seluruh staf.
 */
export async function sendDailyMorningTaskDigest(): Promise<{ totalSent: number; errors: number; details: any[] }> {
  const result = { totalSent: 0, errors: 0, details: [] as any[] };
  try {
    const config = await getSmtpConfig();
    if (!config.enabled) {
      console.log('[MorningDigest] Skipped: SMTP is disabled.');
      return result;
    }

    const allStaff = (await dbDriver.getDocs('staff')).filter((s: any) => !s.deleted && s.email && s.email.includes('@'));
    const allTasks = (await dbDriver.getDocs('staff_tasks')).filter((t: any) => !t.deleted);

    // Ambil tanggal hari ini format YYYY-MM-DD (WIB / Asia/Jakarta)
    const nowWib = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const todayStr = nowWib.toISOString().substring(0, 10);
    const dateFormatted = nowWib.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    for (const stf of allStaff) {
      const targetEmail = stf.email.trim();
      const staffName = stf.name || 'Staf Yayasan MMB';

      // Cari tugas yang relevan untuk staf ini hari ini
      const staffTasks = allTasks.filter((t: any) =>
        (t.staffNik && t.staffNik === stf.nik) ||
        (t.staffName && t.staffName.toLowerCase().trim() === stf.name?.toLowerCase().trim())
      );

      // Tugas hari ini / belum selesai
      const todayTasks = staffTasks.filter((t: any) => {
        if (t.status === 'Selesai') return false;
        if (t.targetDate === todayStr) return true;
        if (t.startDate && t.endDate && todayStr >= t.startDate && todayStr <= t.endDate) return true;
        if (t.periodType === 'DAILY' && (!t.targetDate || t.targetDate === todayStr)) return true;
        return false;
      });

      // Tugas deadline hari ini
      const deadlineTodayTasks = staffTasks.filter((t: any) => {
        return t.status !== 'Selesai' && (t.endDate === todayStr || t.targetDate === todayStr);
      });

      const bibleVerse = getRandomBibleVerse();
      let emailContentHtml = '';

      if (todayTasks.length === 0) {
        // Staf BELUM punya program kerja hari ini
        emailContentHtml = `
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <div style="font-weight: bold; color: #92400e; font-size: 14px; margin-bottom: 6px;">
              📌 Belum Ada Rencana Kerja yang Terdaftar untuk Hari Ini
            </div>
            <p style="margin: 0; color: #78350f; font-size: 13px;">
              Mari awali hari dengan merencanakan aktivitas pelayanan dan program kerja Anda. Silakan input program kerja harian Anda melalui aplikasi Yayasan MMB.
            </p>
          </div>
        `;
      } else {
        // Staf MEMILIKI program kerja hari ini
        const rowsHtml = todayTasks.map((t: any, idx: number) => {
          const isDeadline = deadlineTodayTasks.some(d => d.id === t.id);
          return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 8px; font-weight: 600; color: #0c2340;">${idx + 1}. ${t.title}</td>
              <td style="padding: 10px 8px; color: #64748b;">${t.time ? `Pukul ${t.time}` : formatPeriodLabel(t.periodType, t.targetDate)}</td>
              <td style="padding: 10px 8px;">
                <span style="display: inline-block; background: ${t.status === 'Dalam Proses' ? '#dbeafe' : '#fef3c7'}; color: ${t.status === 'Dalam Proses' ? '#1e40af' : '#92400e'}; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px;">
                  ${t.status || 'Belum Mulai'}
                </span>
                ${isDeadline ? '<span style="display: inline-block; background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">⚠️ DEADLINE HARI INI</span>' : ''}
              </td>
            </tr>
          `;
        }).join('');

        emailContentHtml = `
          <div style="margin: 18px 0;">
            <div style="font-weight: bold; color: #0c2340; font-size: 14px; margin-bottom: 8px;">
              📋 Agenda & Program Kerja Anda Hari Ini (${todayTasks.length} Tugas):
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #f8fafc; border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: #e2e8f0; color: #334155; text-align: left; font-size: 12px;">
                  <th style="padding: 8px;">Program / Tugas</th>
                  <th style="padding: 8px;">Waktu / Periode</th>
                  <th style="padding: 8px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      }

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
            .badge { display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 14px; border-radius: 9999px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .content { padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6; }
            .verse-box { background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 14px 16px; margin: 20px 0; color: #713f12; font-style: italic; font-size: 13px; }
            .verse-title { font-weight: bold; font-style: normal; color: #854d0e; margin-top: 6px; text-align: right; }
            .btn-container { text-align: center; margin: 24px 0 10px 0; }
            .btn-primary { display: inline-block; background-color: #0c2340; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 13px; letter-spacing: 0.3px; }
            .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Yayasan Murid Muda Bermisi</h1>
              <p>Yayasan MMB — ESM Management System</p>
              <div class="badge">☀️ Pengingat Program Kerja Pagi</div>
            </div>
            <div class="content">
              <p>Selamat Pagi, <strong>${staffName}</strong>!</p>
              <p>Semoga damai sejahtera dan sukacita Tuhan menyertai aktivitas pelayanan Anda pada hari ini, <strong>${dateFormatted}</strong>.</p>

              ${emailContentHtml}

              <div class="verse-box">
                "${bibleVerse.text}"
                <div class="verse-title">— ${bibleVerse.verse}</div>
              </div>

              <div class="btn-container">
                <a href="https://prod.yayasan-mmb.web.id/#/staff-tasks" class="btn-primary" target="_blank">
                  Buka Portal Program Kerja Staf &rarr;
                </a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Yayasan Murid Muda Bermisi. Seluruh hak cipta dilindungi.</p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">Pengingat otomatis harian (Pukul 07:00 WIB) via Sistem Yayasan MMB.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const sendRes = await sendMail({
        to: targetEmail,
        subject: `☀️ [Pengingat Pagi] Agenda Kerja Hari Ini (${dateFormatted}) — Yayasan MMB`,
        html,
      });

      if (sendRes.success) {
        result.totalSent++;
        result.details.push({ staffName, email: targetEmail, status: 'sent' });
      } else {
        result.errors++;
        result.details.push({ staffName, email: targetEmail, status: 'failed', error: sendRes.message });
      }
    }

    console.log(`[MorningDigest] Sent ${result.totalSent} daily reminder emails with ${result.errors} errors.`);
    return result;
  } catch (err: any) {
    console.error('[MorningDigest] Failed to execute morning digest:', err);
    return result;
  }
}

/**
 * Mengirimkan pesan pengumuman / broadcast kustom ke daftar penerima.
 */
export async function sendCustomBroadcastEmail(params: {
  recipients: any[];
  subject: string;
  category?: string;
  message: string;
  attachmentUrl?: string;
  senderName?: string;
}): Promise<{ totalSent: number; errors: number; details: any[] }> {
  const { recipients, subject, category = 'Pengumuman Resmi', message, attachmentUrl, senderName = 'Manajemen Yayasan MMB' } = params;
  const result = { totalSent: 0, errors: 0, details: [] as any[] };

  const bibleVerse = getRandomBibleVerse();
  const htmlMessage = message.replace(/\n/g, '<br/>');

  for (const item of recipients) {
    const recipientEmail = typeof item === 'string' ? item.trim() : (item?.email ? String(item.email).trim() : '');
    if (!recipientEmail || !recipientEmail.includes('@')) continue;

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
          .badge { display: inline-block; background-color: #ca8a04; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 14px; border-radius: 9999px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6; }
          .message-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 18px 0; line-height: 1.7; }
          .verse-box { background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 14px 16px; margin: 20px 0; color: #713f12; font-style: italic; font-size: 13px; }
          .verse-title { font-weight: bold; font-style: normal; color: #854d0e; margin-top: 6px; text-align: right; }
          .btn-container { text-align: center; margin: 24px 0 10px 0; }
          .btn-primary { display: inline-block; background-color: #0c2340; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 13px; letter-spacing: 0.3px; }
          .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yayasan Murid Muda Bermisi</h1>
            <p>Yayasan MMB — ESM Management System</p>
            <div class="badge">📢 ${category}</div>
          </div>
          <div class="content">
            <h2 style="font-size: 16px; color: #0c2340; margin-top: 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              ${subject}
            </h2>

            <div class="message-box">
              ${htmlMessage}
            </div>

            ${attachmentUrl ? `
            <div style="margin: 16px 0; text-align: center;">
              <a href="${attachmentUrl}" target="_blank" style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 12px; border: 1px solid #bae6fd;">
                🔗 Buka Dokumen / Lampiran Terkait
              </a>
            </div>` : ''}

            <div class="verse-box">
              "${bibleVerse.text}"
              <div class="verse-title">— ${bibleVerse.verse}</div>
            </div>

            <div class="btn-container">
              <a href="https://prod.yayasan-mmb.web.id" class="btn-primary" target="_blank">
                Buka Portal Yayasan MMB &rarr;
              </a>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
              Pesan ini disampaikan oleh <strong>${senderName}</strong> untuk seluruh staf dan jajaran Yayasan Murid Muda Bermisi.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Yayasan Murid Muda Bermisi. Seluruh hak cipta dilindungi.</p>
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">Pemberitahuan resmi via ESM Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await sendMail({
      to: recipientEmail,
      subject: `📢 [${category}] ${subject} — Yayasan MMB`,
      html,
    });

    if (res.success) {
      result.totalSent++;
      result.details.push({ email: recipientEmail, status: 'sent' });
    } else {
      result.errors++;
      result.details.push({ email: recipientEmail, status: 'failed', error: res.message });
    }
  }

  await writeAuditLog({
    userName: senderName,
    userRole: 'Pengurus',
    action: `Kirim Broadcast Email "${subject}" ke ${result.totalSent} penerima`,
    module: 'Sistem & Broadcast Email',
  });

  return result;
}

/**
 * Mengirimkan Slip Gaji via email ke staf terkait.
 */
export async function sendSalarySlipEmail(params: {
  staff: any;
  salaryConfig?: any;
  salaryBreakdown?: any;
  month?: string;
  periodStr?: string;
  paidAmount: number;
  treasurerName?: string;
  senderName?: string;
}): Promise<{ sent: boolean; message: string }> {
  const { staff, paidAmount, treasurerName = 'Bendahara Yayasan', senderName = 'Bendahara' } = params;
  const month = params.periodStr || params.month || new Date().toISOString().substring(0, 7);
  const salaryConfig = params.salaryConfig || { salaryBase: staff.salaryBase || 0, components: staff.components || [] };

  try {
    const config = await getSmtpConfig();
    if (!config.enabled) {
      return { sent: false, message: 'Layanan email SMTP sedang dinonaktifkan di pengaturan sistem.' };
    }

    const targetEmail = staff.email?.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      return { sent: false, message: `Staf ${staff.name} belum memiliki alamat email yang valid di data kepegawaian.` };
    }

    const salaryBase = Number(salaryConfig.salaryBase || staff.salaryBase || 0);
    const allowances = (salaryConfig?.components || []).filter((c: any) => c.type === 'allowance' && Number(c.amount) > 0);
    const deductions = (salaryConfig?.components || []).filter((c: any) => c.type === 'deduction' && Number(c.amount) > 0);

    const totalAllowance = allowances.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
    const totalDeduction = deductions.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
    const grossSalary = salaryBase + totalAllowance;
    const netSalary = grossSalary - totalDeduction + Number(staff.lastMonthUnpaid || 0);
    const unpaidSisa = Math.max(0, netSalary - paidAmount);

    const allowanceRows = allowances.map((a: any) => `
      <tr>
        <td style="padding: 5px 8px; color: #475569;">+ ${a.name}</td>
        <td style="padding: 5px 8px; text-align: right; color: #0f172a; font-family: monospace;">${formatRupiah(a.amount)}</td>
      </tr>
    `).join('');

    const deductionRows = deductions.map((d: any) => `
      <tr>
        <td style="padding: 5px 8px; color: #475569;">- ${d.name}</td>
        <td style="padding: 5px 8px; text-align: right; color: #b91c1c; font-family: monospace;">(${formatRupiah(d.amount)})</td>
      </tr>
    `).join('');

    const paymentStatusBadge = paidAmount >= netSalary
      ? '<span style="background: #dcfce7; color: #166534; font-weight: bold; padding: 3px 10px; border-radius: 4px; font-size: 11px;">LUNAS 100%</span>'
      : (paidAmount > 0
        ? `<span style="background: #fef9c3; color: #854d0e; font-weight: bold; padding: 3px 10px; border-radius: 4px; font-size: 11px;">DIBAYAR TERMIN (${formatRupiah(paidAmount)})</span>`
        : '<span style="background: #fee2e2; color: #991b1b; font-weight: bold; padding: 3px 10px; border-radius: 4px; font-size: 11px;">BELUM DICAIRKAN</span>');

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
          .badge { display: inline-block; background-color: #10b981; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 14px; border-radius: 9999px; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 24px; color: #1e293b; font-size: 13px; line-height: 1.6; }
          .slip-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 16px 0; }
          .slip-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .section-title { font-weight: bold; color: #0c2340; background: #e2e8f0; padding: 6px 8px; font-size: 12px; margin-top: 10px; }
          .total-box { background-color: #0c2340; color: #ffffff; padding: 14px; border-radius: 6px; margin-top: 16px; text-align: right; }
          .total-num { font-size: 18px; font-weight: bold; color: #fde047; font-family: monospace; }
          .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yayasan Murid Muda Bermisi</h1>
            <p>Yayasan MMB — ESM Management System</p>
            <div class="badge">💵 Slip Gaji & Tunjangan</div>
          </div>
          <div class="content">
            <p>Yth. <strong>${staff.name}</strong> (${staff.nik}),</p>
            <p>Berikut adalah rincian slip pembayaran gaji dan tunjangan Anda untuk periode bulan <strong>${month}</strong>:</p>

            <div class="slip-box">
              <table style="width: 100%; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px;">
                <tr>
                  <td style="color: #64748b;">Nama Karyawan:</td>
                  <td style="font-weight: bold; text-align: right; color: #0f172a;">${staff.name}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Nomor Induk (NIK):</td>
                  <td style="text-align: right; font-family: monospace; color: #0f172a;">${staff.nik}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Jabatan / Posisi:</td>
                  <td style="text-align: right; color: #0f172a;">${staff.position || '-'}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Periode Pembayaran:</td>
                  <td style="text-align: right; font-weight: bold; color: #0c2340;">${month}</td>
                </tr>
              </table>

              <!-- RINCIAN PENGHASILAN -->
              <div class="section-title">A. PENGHASILAN / PENERIMAAN</div>
              <table class="slip-table">
                <tr>
                  <td style="padding: 5px 8px; color: #475569;">Gaji Pokok</td>
                  <td style="padding: 5px 8px; text-align: right; color: #0f172a; font-family: monospace;">${formatRupiah(salaryConfig?.salaryBase || staff.salaryBase)}</td>
                </tr>
                ${allowanceRows}
                <tr style="border-top: 1px solid #cbd5e1; font-weight: bold; background: #f1f5f9;">
                  <td style="padding: 6px 8px;">Total Penghasilan Bruto</td>
                  <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #0f172a;">${formatRupiah(grossSalary)}</td>
                </tr>
              </table>

              <!-- RINCIAN POTONGAN -->
              ${deductions.length > 0 ? `
              <div class="section-title" style="margin-top: 12px;">B. POTONGAN / IURAN</div>
              <table class="slip-table">
                ${deductionRows}
                <tr style="border-top: 1px solid #cbd5e1; font-weight: bold; background: #f1f5f9;">
                  <td style="padding: 6px 8px; color: #b91c1c;">Total Potongan</td>
                  <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b91c1c;">(${formatRupiah(totalDeduction)})</td>
                </tr>
              </table>
              ` : ''}

              <!-- TOTAL DITERIMA BERSIH -->
              <div class="total-box">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Gaji Bersih Diterima (Take Home Pay)</div>
                <div class="total-num">${formatRupiah(netSalary)}</div>
                <div style="font-size: 11px; margin-top: 4px;">Status: ${paymentStatusBadge}</div>
                ${unpaidSisa > 0 ? `<div style="font-size: 11px; color: #fca5a5; margin-top: 2px;">Sisa Belum Dibayarkan: ${formatRupiah(unpaidSisa)}</div>` : ''}
              </div>
            </div>

            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 12px 14px; margin: 16px 0; color: #713f12; font-style: italic; font-size: 12px; text-align: center;">
              "TUHAN adalah gembalaku, takkan kekurangan aku." — <strong>Mazmur 23:1</strong>
            </div>

            <div style="margin-top: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              Dikeluarkan oleh: <strong>${treasurerName}</strong> (Departemen Keuangan Yayasan Murid Muda Bermisi).<br/>
              Slip gaji ini adalah dokumen elektronik resmi yang dihasilkan oleh sistem ERP Yayasan MMB.
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Yayasan Murid Muda Bermisi. Seluruh hak cipta dilindungi.</p>
            <p style="margin: 0; color: #94a3b8; font-size: 11px;">Pesan otomatis departemen keuangan via ESM Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await sendMail({
      to: targetEmail,
      subject: `💵 [Slip Gaji] Periode ${month} — ${staff.name} — Yayasan MMB`,
      html,
    });

    if (res.success) {
      await writeAuditLog({
        userName: senderName,
        userRole: 'Bendahara',
        action: `Kirim Slip Gaji Periode ${month} ke email ${targetEmail} (${staff.name})`,
        module: 'Penggajian',
      });
      return { sent: true, message: `Slip gaji periode ${month} berhasil dikirimkan ke email ${targetEmail}` };
    } else {
      return { sent: false, message: res.message || 'Gagal mengirim email slip gaji.' };
    }
  } catch (err: any) {
    console.error('[MailService] Error sending salary slip email:', err);
    return { sent: false, message: err.message };
  }
}
