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

      // Ambil jam dan menit WIB secara numerik dengan hourCycle h23
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23'
      }).formatToParts(now);

      const rawHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      const hour = rawHour === 24 ? 0 : (rawHour % 24);
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

      // Cek apakah sudah pukul 08:00 WIB atau lebih (dan tidak melebihi jam 21:00 WIB malam)
      if (hour < 8 || hour >= 21) {
        return; // Belum mencapai jam 8 pagi WIB atau sudah larut malam
      }

      // Cek apakah sudah pernah dijalankan hari ini (cek cache memori)
      if (lastDailyDigestRunDate === currentDateWib) {
        return;
      }

      // Cek apakah sudah pernah dijalankan hari ini dari database (agar aman jika PM2 restart)
      const record = await dbDriver.getDoc('system_state', 'daily_digest_status');
      if (record && record.lastRunDate === currentDateWib) {
        // Cek jam eksekusi sebelumnya di zona WIB
        let executedHourWib = -1;
        if (record.executedAt) {
          try {
            const execParts = new Intl.DateTimeFormat('en-US', {
              timeZone,
              hour: 'numeric',
              hourCycle: 'h23'
            }).formatToParts(new Date(record.executedAt));
            const rawExecH = parseInt(execParts.find(p => p.type === 'hour')?.value || '0', 10);
            executedHourWib = rawExecH === 24 ? 0 : (rawExecH % 24);
          } catch {
            executedHourWib = -1;
          }
        }

        // Jika eksekusi sebelumnya terjadi sebelum pukul 08:00 WIB (misal bug eksekusi dini hari 00:01),
        // dan sekarang sudah masuk jadwal resmi (08:00 WIB atau lebih), izinkan berjalan kembali!
        if (executedHourWib >= 0 && executedHourWib < 8 && hour >= 8) {
          console.log(`[CronScheduler] Previous run for ${currentDateWib} occurred prematurely at hour ${executedHourWib} WIB (< 08:00). Re-running official 08:00 AM digest now.`);
        } else {
          lastDailyDigestRunDate = currentDateWib;
          return;
        }
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

