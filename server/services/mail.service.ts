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

    // Cari alamat email staf atau pengurus
    let targetEmail = explicitEmail?.trim();
    let staffName = task.staffName || 'Staf / Pengurus Yayasan MMB';

    if (!targetEmail) {
      const allStaff = await dbDriver.getDocs('staff');
      const matchedStaff = allStaff.find(
        (s: any) =>
          !s.deleted &&
          ((task.staffNik && s.nik === task.staffNik) ||
            (task.staffName && s.name?.toLowerCase().trim() === task.staffName?.toLowerCase().trim()))
      );

      if (matchedStaff && matchedStaff.email) {
        targetEmail = matchedStaff.email.trim();
        staffName = matchedStaff.name || staffName;
      } else {
        // Cari di data struktur organisasi
        const allStructures = await dbDriver.getDocs('structures');
        const matchedStructure = allStructures.find(
          (s: any) =>
            !s.deleted &&
            ((task.staffNik && s.id === task.staffNik) ||
              (task.staffName && s.name?.toLowerCase().trim() === task.staffName?.toLowerCase().trim()) ||
              (task.staffName && s.title?.toLowerCase().trim() === task.staffName?.toLowerCase().trim()))
        );

        if (matchedStructure && matchedStructure.email) {
          targetEmail = matchedStructure.email.trim();
          staffName = matchedStructure.name || matchedStructure.title || staffName;
        } else {
          // Cari di data pengguna / users
          const allUsers = await dbDriver.getDocs('users');
          const matchedUser = allUsers.find(
            (u: any) =>
              !u.deleted &&
              ((task.staffName && u.name?.toLowerCase().trim() === task.staffName?.toLowerCase().trim()) ||
                (task.staffName && u.email?.toLowerCase().trim() === task.staffName?.toLowerCase().trim()))
          );
          if (matchedUser && matchedUser.email) {
            targetEmail = matchedUser.email.trim();
            staffName = matchedUser.name || staffName;
          }
        }
      }
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      console.warn(`[MailService] No valid email found for recipient ${task.staffName} (${task.staffNik}). Notification not sent.`);
      return { sent: false, reason: 'No valid email address found' };
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
            <div class="badge">📋 Penugasan & Program Kerja</div>
          </div>
          <div class="content">
            <p>Yth. <strong>${staffName}</strong>,</p>
            <p>Berikut adalah konfirmasi tugas Anda pada aplikasi Management Yayasan MMB - ESM:</p>

            <div class="task-box">
              <div class="task-title">📌 ${task.title}</div>
              <table class="info-table">
                <tr>
                  <td class="info-label">Nama Staf / Pengurus</td>
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
      subject: `📋 [Penugasan & Program Kerja] ${task.title} — Yayasan MMB`,
      html,
    });

    if (res.success) {
      console.log(`[MailService] Task notification email sent successfully to ${targetEmail} for task "${task.title}"`);
      await writeAuditLog({
        userName: assignerName || 'System Mailer',
        userRole: 'System',
        action: `Kirim Notifikasi Email Program Kerja: "${task.title}" ke ${targetEmail}`,
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
 * Mengirimkan ringkasan harian (Daily Morning Digest) jam 07:00 pagi ke seluruh Staf & Pengurus Yayasan.
 */
export async function sendDailyMorningTaskDigest(): Promise<{ totalSent: number; errors: number; details: any[] }> {
  const result = { totalSent: 0, errors: 0, details: [] as any[] };
  try {
    const config = await getSmtpConfig();
    if (!config.enabled) {
      console.log('[MorningDigest] Skipped: SMTP is disabled.');
      return result;
    }

    const allStaff = await dbDriver.getDocs('staff');
    const allPengurus = await dbDriver.getDocs('pengurus');
    const allStructures = await dbDriver.getDocs('structures');
    const allUsers = await dbDriver.getDocs('users');
    const allStaffTasks = (await dbDriver.getDocs('staff_tasks')).filter((t: any) => !t.deleted);
    const allFoundationTasks = (await dbDriver.getDocs('foundation_tasks')).filter((t: any) => !t.deleted);

    // Build unified de-duplicated recipient list for Morning Digest (Staf & Pengurus)
    const recipientsMap = new Map<string, {
      name: string;
      email: string;
      roleOrTitle: string;
      isPengurus: boolean;
      nikOrId: string;
      structureNodeId?: string;
    }>();

    // 1. Ambil dari database Staff
    for (const s of allStaff) {
      if (s.deleted || !s.email || !s.email.includes('@')) continue;
      const cleanEmail = s.email.toLowerCase().trim();
      const pos = (s.position || '').toLowerCase();
      const isPengurus = s.category === 'Pengurus' ||
        ['pembina', 'pengawas', 'ketua', 'sekretaris', 'bendahara', 'direksi', 'pengurus', 'wakil ketua'].some(k => pos.includes(k));

      recipientsMap.set(cleanEmail, {
        name: s.name || 'Rekan Pelayanan MMB',
        email: cleanEmail,
        roleOrTitle: s.position || (isPengurus ? 'Pengurus Yayasan' : 'Staf Yayasan'),
        isPengurus,
        nikOrId: s.nik || s.id || ''
      });
    }

    // 2. Ambil dari database Pengurus Yayasan (tabel pengurus terpisah)
    for (const p of allPengurus) {
      if (p.deleted || !p.email || !p.email.includes('@')) continue;
      const cleanEmail = p.email.toLowerCase().trim();
      recipientsMap.set(cleanEmail, {
        name: p.name || 'Pengurus Yayasan MMB',
        email: cleanEmail,
        roleOrTitle: p.position || 'Pengurus Yayasan',
        isPengurus: true,
        nikOrId: p.nik || p.id || ''
      });
    }

    // 2. Ambil dari struktur organisasi yang memiliki email terdaftar
    for (const str of allStructures) {
      if (str.deleted || !str.email || !str.email.includes('@')) continue;
      const cleanEmail = str.email.toLowerCase().trim();
      const existing = recipientsMap.get(cleanEmail);
      recipientsMap.set(cleanEmail, {
        name: str.name || str.title || existing?.name || 'Pengurus Yayasan',
        email: cleanEmail,
        roleOrTitle: str.title || existing?.roleOrTitle || 'Pengurus Yayasan',
        isPengurus: true,
        nikOrId: str.id,
        structureNodeId: str.id
      });
    }

    // 3. Ambil dari akun pengguna / operator yang memiliki email
    for (const u of allUsers) {
      if (u.deleted || !u.email || !u.email.includes('@')) continue;
      const cleanEmail = u.email.toLowerCase().trim();
      if (!recipientsMap.has(cleanEmail)) {
        const isPengurus = u.role !== 'Staff' && u.role !== 'Volunteer';
        recipientsMap.set(cleanEmail, {
          name: u.name || cleanEmail,
          email: cleanEmail,
          roleOrTitle: u.role || (isPengurus ? 'Pengurus Yayasan' : 'Staf Yayasan'),
          isPengurus,
          nikOrId: u.id || ''
        });
      }
    }

    const recipients = Array.from(recipientsMap.values());
    console.log(`[MorningDigest] Preparing morning reminder for ${recipients.length} recipients (Staf & Pengurus)...`);

    // Ambil tanggal hari ini format YYYY-MM-DD (WIB / Asia/Jakarta)
    const timeZone = 'Asia/Jakarta';
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now); // 'YYYY-MM-DD' di zona WIB
    const todayMonthDay = todayStr.substring(5, 10); // 'MM-DD'
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(now);

    // -------------------------------------------------------------
    // 1. CEK ULANG TAHUN HARI INI (KIRIM KE SEMUA STAF & PENGURUS)
    // -------------------------------------------------------------
    const allMembers = await dbDriver.getDocs('members');
    
    const isBirthdayToday = (birthDateStr?: string): boolean => {
      if (!birthDateStr || birthDateStr.length < 5) return false;
      const clean = birthDateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
        return clean.substring(5, 10) === todayMonthDay;
      }
      const parts = clean.split(/[/-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}` === todayMonthDay;
        } else {
          return `${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}` === todayMonthDay;
        }
      }
      return false;
    };

    const birthdayPeople: Array<{ name: string; role: string; category: string; phone?: string; email?: string }> = [];

    for (const s of allStaff) {
      if (!s.deleted && s.birthDate && isBirthdayToday(s.birthDate)) {
        birthdayPeople.push({
          name: s.name,
          role: s.position || 'Staf Yayasan',
          category: s.category === 'Pengurus' ? 'Pengurus Yayasan' : 'Staf Pelaksana',
          phone: s.phone,
          email: s.email
        });
      }
    }

    for (const p of allPengurus) {
      if (!p.deleted && p.birthDate && isBirthdayToday(p.birthDate)) {
        if (!birthdayPeople.some(b => b.name.toLowerCase() === (p.name || '').toLowerCase())) {
          birthdayPeople.push({
            name: p.name,
            role: p.position || 'Pengurus Yayasan',
            category: 'Pengurus Yayasan',
            phone: p.phone,
            email: p.email
          });
        }
      }
    }

    for (const m of allMembers) {
      if (!m.deleted && m.birthDate && isBirthdayToday(m.birthDate)) {
        const mName = m.fullName || m.nickName || '';
        if (mName && !birthdayPeople.some(b => b.name.toLowerCase() === mName.toLowerCase())) {
          birthdayPeople.push({
            name: mName,
            role: 'Anggota / Komunitas Pemuridan',
            category: 'Keluarga Besar MMB',
            phone: m.phone,
            email: m.email
          });
        }
      }
    }

    if (birthdayPeople.length > 0) {
      console.log(`[MorningDigest] ${birthdayPeople.length} people have birthdays today! Sending broadcast to all staff & pengurus...`);
      const namesStr = birthdayPeople.map(b => b.name).join(', ');
      
      const celebrantsListHtml = birthdayPeople.map(b => {
        const rawPhone = (b.phone || '').replace(/[^0-9]/g, '');
        const waPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : (rawPhone.startsWith('62') ? rawPhone : (rawPhone ? '62' + rawPhone : ''));
        const waText = encodeURIComponent(`Halo ${b.name}, Selamat Ulang Tahun! 🎉 Kiranya Tuhan Yesus senantiasa memberkati, melindungi, dan melimpahkan sukacita dalam hidup serta pelayananmu.`);
        const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waText}` : '';
        const mailtoLink = b.email ? `mailto:${b.email}?subject=${encodeURIComponent(`Selamat Ulang Tahun, ${b.name}! 🎉`)}&body=${encodeURIComponent(`Halo ${b.name},\n\nSelamat Hari Ulang Tahun! 🎉\nKiranya berkat kasih, kesehatan, penyertaan, dan damai sejahtera dari Tuhan Yesus Kristus senantiasa melimpah bagi saudara/i sekeluarga.\n\nSalam hangat,\nKeluarga Besar Yayasan Murid Muda Bermisi`)}` : '';

        return `
          <div style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-left: 5px solid #ec4899; padding: 16px; margin-bottom: 14px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="font-weight: bold; color: #831843; font-size: 16px;">🎂 ${b.name}</div>
                <div style="color: #9d174d; font-size: 12px; margin-top: 2px; font-weight: 500;">${b.role} • ${b.category}</div>
              </div>
            </div>
            
            <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
              ${waLink ? `
                <a href="${waLink}" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: bold; padding: 6px 14px; border-radius: 6px; margin-right: 8px; margin-top: 6px;">
                  💬 Kirim Ucapan via WhatsApp
                </a>
              ` : ''}
              ${mailtoLink ? `
                <a href="${mailtoLink}" target="_blank" style="display: inline-block; background-color: #0c2340; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: bold; padding: 6px 14px; border-radius: 6px; margin-top: 6px;">
                  ✉️ Kirim Email Ucapan
                </a>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      const birthdayHtml = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #0c2340 0%, #1e3a8a 100%); color: #ffffff; padding: 26px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: bold; }
            .badge { display: inline-block; background-color: #ec4899; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 14px; border-radius: 9999px; margin-top: 10px; text-transform: uppercase; }
            .content { padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6; }
            .callout-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 18px; color: #1e40af; font-size: 13px; }
            .verse-box { background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 14px 16px; margin: 20px 0; color: #713f12; font-style: italic; font-size: 13px; }
            .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Kabar Sukacita Ulang Tahun!</h1>
              <p style="margin: 6px 0 0 0; color: #cbd5e1; font-size: 13px;">Keluarga Besar Yayasan Murid Muda Bermisi</p>
              <div class="badge">🎂 Hari Ini • ${dateFormatted}</div>
            </div>
            <div class="content">
              <p>Salam damai sejahtera dalam kasih Kristus,</p>
              
              <div class="callout-box">
                <strong>💌 Mari Berikan Ucapan & Doa!</strong><br/>
                Hari ini Tuhan menambahkan setahun usia bagi rekan kita. Mari seluruh staf dan pengurus meluangkan waktu sejenak untuk menyampaikan ucapan selamat, doa, dan berkat secara langsung kepada yang bersangkutan.
              </div>

              ${celebrantsListHtml}

              <div class="verse-box">
                "TUHAN memberkati engkau dan melindungi engkau; TUHAN menyinari engkau dengan wajah-Nya dan memberi engkau kasih karunia; TUHAN menghadapkan wajah-Nya kepadamu dan memberi engkau damai sejahtera."
                <div style="font-weight: bold; font-style: normal; color: #854d0e; margin-top: 6px; text-align: right;">— Bilangan 6:24-26</div>
              </div>

              <p style="color: #475569; font-size: 13px;">
                Klik tombol <strong>WhatsApp</strong> atau <strong>Email</strong> di atas untuk langsung mengirimkan ucapan hangat kepada yang berulang tahun.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Yayasan Murid Muda Bermisi.</p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">Notifikasi otomatis ulang tahun untuk seluruh Staf & Pengurus Yayasan MMB.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      for (const rec of recipients) {
        await sendMail({
          to: rec.email,
          subject: `🎂 [Ulang Tahun Hari Ini] Selamat Ulang Tahun: ${namesStr}! — Mari Berikan Ucapan`,
          html: birthdayHtml
        });
      }
    }

    // -------------------------------------------------------------
    // 2. TUGAS JATUH TEMPO HARI INI (08:00) & TERLEWAT 3 HARI
    // -------------------------------------------------------------
    const getTaskDeadlineDate = (t: any): string => {
      if (t.endDate && /^\d{4}-\d{2}-\d{2}/.test(t.endDate)) return t.endDate.substring(0, 10);
      if (t.targetDate && /^\d{4}-\d{2}-\d{2}/.test(t.targetDate)) return t.targetDate.substring(0, 10);
      if (t.startDate && /^\d{4}-\d{2}-\d{2}/.test(t.startDate)) return t.startDate.substring(0, 10);
      if (t.createdAt && t.createdAt.length >= 10) return t.createdAt.substring(0, 10);
      return '';
    };

    const getDiffDays = (deadlineStr: string): number => {
      if (!deadlineStr || deadlineStr.length < 10) return 0;
      const dParts = deadlineStr.substring(0, 10).split('-').map(Number);
      const tParts = todayStr.split('-').map(Number);
      const dDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
      const tDate = new Date(tParts[0], tParts[1] - 1, tParts[2]);
      return Math.round((tDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    for (const recipient of recipients) {
      const targetEmail = recipient.email;
      const recipientName = recipient.name;
      const isPengurus = recipient.isPengurus;

      // Cari tugas yang relevan untuk penerima ini
      const relevantPool = isPengurus ? [...allFoundationTasks, ...allStaffTasks] : allStaffTasks;
      const personTasks = relevantPool.filter((t: any) => {
        const nikMatch = recipient.nikOrId && t.staffNik && String(t.staffNik).toLowerCase().trim() === String(recipient.nikOrId).toLowerCase().trim();
        const nameMatch = recipient.name && t.staffName && t.staffName.toLowerCase().trim() === recipient.name.toLowerCase().trim();
        const titleMatch = recipient.roleOrTitle && t.staffName && t.staffName.toLowerCase().trim() === recipient.roleOrTitle.toLowerCase().trim();
        const nodeMatch = recipient.structureNodeId && (
          (t.staffNik && String(t.staffNik).toLowerCase().trim() === recipient.structureNodeId.toLowerCase().trim()) ||
          (t.staffName && t.staffName.toLowerCase().trim() === recipient.structureNodeId.toLowerCase().trim())
        );
        return nikMatch || nameMatch || titleMatch || nodeMatch;
      });

      // 1. Tugas yang duedate-nya HARI INI
      const dueTodayTasks = personTasks.filter((t: any) => {
        if (t.status === 'Selesai') return false;
        const dl = getTaskDeadlineDate(t);
        const diff = getDiffDays(dl);
        return diff === 0;
      });

      // 2. Tugas yang SUDAH TERLEWAT 3 HARI (atau lebih)
      const overdue3DaysTasks = personTasks.filter((t: any) => {
        if (t.status === 'Selesai') return false;
        const dl = getTaskDeadlineDate(t);
        const diff = getDiffDays(dl);
        return diff >= 3;
      });

      // HANYA KIRIM jika ada tugas jatuh tempo hari ini ATAU ada tugas terlewat 3 hari
      if (dueTodayTasks.length === 0 && overdue3DaysTasks.length === 0) {
        continue;
      }

      const bibleVerse = getRandomBibleVerse();
      let emailContentHtml = '';

      // Render tugas hari ini jika ada
      if (dueTodayTasks.length > 0) {
        const todayRows = dueTodayTasks.map((t: any, idx: number) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 8px; font-weight: 600; color: #0c2340;">${idx + 1}. ${t.title}</td>
            <td style="padding: 10px 8px; color: #64748b;">${t.time ? `Pukul ${t.time}` : formatPeriodLabel(t.periodType, t.targetDate)}</td>
            <td style="padding: 10px 8px;">
              <span style="display: inline-block; background: ${t.status === 'Dalam Proses' ? '#dbeafe' : '#fef3c7'}; color: ${t.status === 'Dalam Proses' ? '#1e40af' : '#92400e'}; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px;">
                ${t.status || 'Belum Mulai'}
              </span>
              <span style="display: inline-block; background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">
                🎯 BATAS HARI INI
              </span>
            </td>
          </tr>
        `).join('');

        emailContentHtml += `
          <div style="margin: 18px 0;">
            <div style="font-weight: bold; color: #0c2340; font-size: 14px; margin-bottom: 8px;">
              📋 Tugas Jatuh Tempo Hari Ini (${dueTodayTasks.length} Kegiatan):
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #f8fafc; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
              <thead>
                <tr style="background: #e2e8f0; color: #334155; text-align: left; font-size: 12px;">
                  <th style="padding: 8px;">Program / Tugas</th>
                  <th style="padding: 8px;">Waktu / Periode</th>
                  <th style="padding: 8px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${todayRows}
              </tbody>
            </table>
          </div>
        `;
      }

      // Render tugas terlewat 3 hari jika ada
      if (overdue3DaysTasks.length > 0) {
        const overdueRows = overdue3DaysTasks.map((t: any, idx: number) => {
          const dl = getTaskDeadlineDate(t);
          const diff = getDiffDays(dl);
          return `
            <tr style="border-bottom: 1px solid #fecdd3;">
              <td style="padding: 10px 8px; font-weight: 600; color: #9f1239;">${idx + 1}. ${t.title}</td>
              <td style="padding: 10px 8px; color: #881337; font-size: 12px;">Target: ${dl || '-'}</td>
              <td style="padding: 10px 8px;">
                <span style="display: inline-block; background: #ffe4e6; color: #9f1239; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid #fecdd3;">
                  ⚠️ Terlewat ${diff} Hari
                </span>
              </td>
            </tr>
          `;
        }).join('');

        emailContentHtml += `
          <div style="margin: 20px 0; background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px;">
            <div style="font-weight: bold; color: #9f1239; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              ⚠️ Peringatan: Tugas Telah Terlewat 3 Hari / Perlu Tindak Lanjut (${overdue3DaysTasks.length} Tugas)
            </div>
            <p style="margin: 0 0 10px 0; color: #881337; font-size: 12px;">
              Mohon segera memperbarui status kegiatan ini di sistem, atau selesaikan kendala yang dihadapi:
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #fecdd3;">
              <thead>
                <tr style="background: #ffe4e6; color: #881337; text-align: left; font-size: 12px;">
                  <th style="padding: 8px;">Program / Tugas</th>
                  <th style="padding: 8px;">Target Semula</th>
                  <th style="padding: 8px;">Keterlambatan</th>
                </tr>
              </thead>
              <tbody>
                ${overdueRows}
              </tbody>
            </table>
          </div>
        `;
      }

      const salutationGreeting = isPengurus
        ? `Selamat Pagi, Bapak/Ibu <strong>${recipientName}</strong> (${recipient.roleOrTitle})!`
        : `Selamat Pagi, <strong>${recipientName}</strong> (${recipient.roleOrTitle})!`;

      const openingBlessing = `Berikut adalah ringkasan agenda tugas dan status penugasan Anda per hari ini, <strong>${dateFormatted}</strong> (Pukul 08:00 WIB).`;

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
              <div class="badge">☀️ Notifikasi Tugas Pagi (08:00 WIB)</div>
            </div>
            <div class="content">
              <p>${salutationGreeting}</p>
              <p>${openingBlessing}</p>

              ${emailContentHtml}

              <div class="verse-box">
                "${bibleVerse.text}"
                <div class="verse-title">— ${bibleVerse.verse}</div>
              </div>

              <div class="btn-container">
                <a href="${isPengurus ? 'https://prod.yayasan-mmb.web.id/#/foundation-tasks' : 'https://prod.yayasan-mmb.web.id/#/staff-tasks'}" class="btn-primary" target="_blank">
                  ${isPengurus ? 'Buka Portal Program & Rapat Yayasan &rarr;' : 'Buka Portal Program & Rapat Staf &rarr;'}
                </a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Yayasan Murid Muda Bermisi. Seluruh hak cipta dilindungi.</p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">Notifikasi otomatis harian (Pukul 08:00 WIB) via Sistem Yayasan MMB.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      let emailSubject = `☀️ [Pengingat Pagi 08:00] Agenda Tugas Jatuh Tempo Hari Ini (${dateFormatted}) — Yayasan MMB`;
      if (overdue3DaysTasks.length > 0 && dueTodayTasks.length > 0) {
        emailSubject = `⚠️ [Penting 08:00] Tugas Jatuh Tempo Hari Ini & Peringatan Terlewat 3 Hari — Yayasan MMB`;
      } else if (overdue3DaysTasks.length > 0) {
        emailSubject = `⚠️ [Peringatan Keterlambatan] Tugas Anda Telah Terlewat 3 Hari — Yayasan MMB`;
      }

      const sendRes = await sendMail({
        to: targetEmail,
        subject: emailSubject,
        html,
      });

      if (sendRes.success) {
        result.totalSent++;
        result.details.push({ recipientName, email: targetEmail, role: recipient.roleOrTitle, status: 'sent' });
      } else {
        result.errors++;
        result.details.push({ recipientName, email: targetEmail, role: recipient.roleOrTitle, status: 'failed', error: sendRes.message });
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
