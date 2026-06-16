import { Router, Response } from 'express';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
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
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, colName, d.id));
        }
      } catch (colErr) {
        console.warn(`Err cleansing collection ${colName}:`, colErr);
      }
    }

    // Also clean any users that are not 'superadmin@esm.or.id'
    const usersCol = collection(db, 'users');
    const usersSnap = await getDocs(usersCol);
    for (const d of usersSnap.docs) {
      if (d.id !== 'superadmin@esm.or.id') {
        await deleteDoc(doc(db, 'users', d.id));
      }
    }

    // Clean staff collection entirely
    const staffCol = collection(db, 'staff');
    const staffSnap = await getDocs(staffCol);
    for (const d of staffSnap.docs) {
      await deleteDoc(doc(db, 'staff', d.id));
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

export const systemRouter = router;
export default systemRouter;
