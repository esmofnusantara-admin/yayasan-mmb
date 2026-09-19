import { sendDailyMorningTaskDigest } from './mail.service';
import { dbDriver } from '../db/driver';

let lastDailyDigestRunDate = '';
let cronIntervalId: NodeJS.Timeout | null = null;
let isRunningDigest = false;

/**
 * Memulai penjadwal otomatis latar belakang (Background Cron Scheduler).
 * Berjalan setiap hari pada pukul 08:00 WIB (Asia/Jakarta).
 * Jika server baru dinyalakan setelah jam 08:00 WIB dan belum dikirim hari ini,
 * sistem akan langsung mengirimkannya otomatis saat startup.
 */
export function initCronScheduler() {
  if (cronIntervalId) {
    clearInterval(cronIntervalId);
  }

  console.log('[CronScheduler] Initializing morning task & birthday reminder scheduler (Target: 08:00 AM WIB)...');

  const checkAndRunDigest = async () => {
    if (isRunningDigest) return;

    try {
      const now = new Date();
      const timeZone = 'Asia/Jakarta';

      // Ambil tanggal saat ini di zona WIB (Format YYYY-MM-DD)
      const currentDateWib = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);

      // Ambil jam dan menit WIB secara numerik
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(now);

      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

      // Cek apakah sudah pukul 08:00 WIB atau lebih
      if (hour < 8) {
        return; // Belum mencapai jam 8 pagi WIB
      }

      // Cek apakah sudah pernah dijalankan hari ini (cek cache memori)
      if (lastDailyDigestRunDate === currentDateWib) {
        return;
      }

      // Cek apakah sudah pernah dijalankan hari ini dari database (agar aman jika PM2 restart)
      const record = await dbDriver.getDoc('system_state', 'daily_digest_status');
      if (record && record.lastRunDate === currentDateWib) {
        lastDailyDigestRunDate = currentDateWib;
        return;
      }

      // Jalankan proses pengiriman digest
      isRunningDigest = true;
      lastDailyDigestRunDate = currentDateWib;

      console.log(`[CronScheduler] Triggering 08:00 AM WIB daily morning task & birthday digest for ${currentDateWib} (WIB Time: ${hour}:${String(minute).padStart(2, '0')})...`);

      // Tandai di database terlebih dahulu agar tidak dieksekusi berulang
      await dbDriver.setDoc('system_state', 'daily_digest_status', {
        id: 'daily_digest_status',
        lastRunDate: currentDateWib,
        executedAt: new Date().toISOString()
      });

      const result = await sendDailyMorningTaskDigest();
      console.log(`[CronScheduler] Daily digest finished successfully: ${result.totalSent} sent, ${result.errors} errors.`);
    } catch (err) {
      console.error('[CronScheduler] Error running daily morning digest:', err);
    } finally {
      isRunningDigest = false;
    }
  };

  // Jalankan pengecekan pertama 5 detik setelah server menyala
  setTimeout(checkAndRunDigest, 5000);

  // Periksa secara berkala setiap 30 detik
  cronIntervalId = setInterval(checkAndRunDigest, 30 * 1000);
}

/**
 * Menjalankan pengingat pagi hari ini secara manual (untuk testing).
 */
export async function runMorningTaskDigestNow() {
  console.log('[CronScheduler] Manual trigger of daily morning task digest initiated.');
  return await sendDailyMorningTaskDigest();
}

