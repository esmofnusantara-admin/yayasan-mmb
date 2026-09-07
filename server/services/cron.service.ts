import { sendDailyMorningTaskDigest } from './mail.service';

let lastDailyDigestRunDate = '';
let cronIntervalId: NodeJS.Timeout | null = null;

/**
 * Memulai penjadwal otomatis latar belakang (Background Cron Scheduler).
 * Berjalan setiap hari pada pukul 07:00 WIB (Asia/Jakarta).
 */
export function initCronScheduler() {
  if (cronIntervalId) {
    clearInterval(cronIntervalId);
  }

  console.log('[CronScheduler] Initializing morning task reminder scheduler (Target: 07:00 AM WIB)...');

  cronIntervalId = setInterval(async () => {
    try {
      const now = new Date();
      const timeZone = 'Asia/Jakarta';
      
      // Ambil waktu & tanggal sekarang di zona waktu WIB
      const timeFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone }); // Format YYYY-MM-DD

      const currentTimeWib = timeFormatter.format(now);
      const currentDateWib = dateFormatter.format(now);

      // Cek apakah waktu saat ini pukul 07:00 dan belum dijalankan hari ini
      if (currentTimeWib === '07:00' && lastDailyDigestRunDate !== currentDateWib) {
        lastDailyDigestRunDate = currentDateWib;
        console.log(`[CronScheduler] Triggering 07:00 AM WIB daily morning task digest for ${currentDateWib}...`);
        
        await sendDailyMorningTaskDigest();
      }
    } catch (err) {
      console.error('[CronScheduler] Error checking scheduler interval:', err);
    }
  }, 30 * 1000); // Periksa setiap 30 detik
}

/**
 * Menjalankan pengingat pagi hari ini secara manual (untuk testing).
 */
export async function runMorningTaskDigestNow() {
  console.log('[CronScheduler] Manual trigger of daily morning task digest initiated.');
  return await sendDailyMorningTaskDigest();
}
