import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { seedUsersIfEmpty } from '../services/seed.service';
import { authenticateToken } from './auth.routes';

const router = Router();

router.post('/cleanse', authenticateToken, async (req: any, res: Response) => {
  if (req.user.role !== 'Super Admin' && req.user.role !== 'Ketua Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak Akses Ditolak: Hanya Super Admin yang berwenang melakukan pembersihan data sistem secara menyeluruh.' });
  }

  try {
    const collectionsToClean = [
      'members',
      'small_groups',
      'transactions',
      'partners',
      'salaries',
      'inward_letters',
      'outward_letters',
      'approvals',
      'audits',
      'donations',
      'prayer_requests',
      'member_notes',
      'follow_ups',
      'meeting_logs',
      'materials',
      'profiles',
      'structures',
      'kas',
      'categories',
      'incomes',
      'expenses',
      'fundraising',
      'payroll_payments',
      'detail_pengeluaran',
      'detail_expenses'
    ];

    for (const colName of collectionsToClean) {
      try {
        const docs = await dbDriver.getDocs(colName);
        for (const d of docs) {
          if (d.id) await dbDriver.deleteDoc(colName, d.id);
        }
      } catch (colErr) {
        console.warn(`Err cleansing collection ${colName}:`, colErr);
      }
    }

    // Also clean any users that are not 'superadmin@esm.or.id'
    const allUsers = await dbDriver.getDocs('users');
    for (const u of allUsers) {
      if (u.email && u.email !== 'superadmin@esm.or.id') {
        await dbDriver.deleteDoc('users', u.email);
      }
    }

    // Clean staff collection entirely
    const allStaff = await dbDriver.getDocs('staff');
    for (const s of allStaff) {
      if (s.nik) await dbDriver.deleteDoc('staff', s.nik);
    }

    // Re-seed only the single superadmin user
    await seedUsersIfEmpty();

    // Mark system state as seeded so that clean state is preserved
    try {
      await dbDriver.setDoc('system_state', 'seed_status', {
        id: 'seed_status',
        seeded: true,
        cleansedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Failed to set seed_status in system_state:', err);
    }

    res.json({ success: true, message: 'Database dan seluruh sample data berhasil dibersihkan total. Hanya akun superadmin@esm.or.id yang tersisa.' });
  } catch (error: any) {
    console.error('Cleansing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/health', (_req, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const systemRouter = router;
export default systemRouter;
