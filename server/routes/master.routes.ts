import { Router, Response } from 'express';
import { dbDriver } from '../db/driver';
import { authenticateToken } from './auth.routes';
import { cleanObjectForFirestore } from '../services/transaction-sync.service';
import { writeAuditLog, auditFromReq } from '../utils/audit.util';

const router = Router();

// ─── Helper: Ambil master data dari profile lembaga ─────────────────────────
async function getProfileMaster() {
  const profiles = await dbDriver.getDocs('profiles');
  return profiles.find((p: any) => p.id === 'PROF-01') || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/regions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/regions', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const regions = profile?.regions || ['Yogyakarta', 'Solo', 'Semarang', 'Purwokerto'];
    res.json(regions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/components
// ─────────────────────────────────────────────────────────────────────────────
router.get('/components', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const components = profile?.memberComponents || ['Siswa', 'Mahasiswa', 'Alumni', 'Umum'];
    res.json(components);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/categories  — kategori keuangan dari DB
// ─────────────────────────────────────────────────────────────────────────────
router.get('/categories', authenticateToken, async (_req: any, res: Response) => {
  try {
    const cats = (await dbDriver.getDocs('categories')).filter((c: any) => !c.deleted);
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/partner-statuses
// ─────────────────────────────────────────────────────────────────────────────
router.get('/partner-statuses', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const statuses = profile?.partnerStatuses || ['Prospek', 'Kontak Awal', 'Presentasi', 'Komitmen', 'Donasi Pertama', 'Aktif', 'Tidak Aktif'];
    res.json(statuses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/partner-types
// ─────────────────────────────────────────────────────────────────────────────
router.get('/partner-types', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const types = profile?.partnerTypes || ['Pribadi', 'Gereja', 'Perusahaan', 'Instansi', 'Yayasan'];
    res.json(types);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/material-categories
// ─────────────────────────────────────────────────────────────────────────────
router.get('/material-categories', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const cats = profile?.materialCategories || ['Materi Dasar / Siswa', 'Siswa & Mahasiswa', 'Alumni', 'Pelatihan Pemimpin (PKK)', 'Materi Umum / Publik'];
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/donation-channels
// ─────────────────────────────────────────────────────────────────────────────
router.get('/donation-channels', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const channels = profile?.donationChannels || [];
    res.json(channels);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/member-statuses
// ─────────────────────────────────────────────────────────────────────────────
router.get('/member-statuses', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const statuses = profile?.memberKeaktifanStatuses || ['Aktif', 'Pasif', 'Cuti', 'Pindah'];
    res.json(statuses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/meeting-days
// ─────────────────────────────────────────────────────────────────────────────
router.get('/meeting-days', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const days = profile?.meetingDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    res.json(days);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/income-allocations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/income-allocations', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const allocs = profile?.incomeAllocations || ['Gaji / Operasional', 'Peralatan', 'Kegiatan Khusus', 'Lainnya'];
    res.json(allocs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/master/all  — semua master data sekaligus (untuk initial load FE)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/all', authenticateToken, async (_req: any, res: Response) => {
  try {
    const profile = await getProfileMaster();
    const categories = (await dbDriver.getDocs('categories')).filter((c: any) => !c.deleted);
    res.json({
      regions: profile?.regions || [],
      components: profile?.memberComponents || [],
      categories,
      partnerStatuses: profile?.partnerStatuses || [],
      partnerTypes: profile?.partnerTypes || [],
      materialCategories: profile?.materialCategories || [],
      donationChannels: profile?.donationChannels || [],
      memberStatuses: profile?.memberKeaktifanStatuses || [],
      meetingDays: profile?.meetingDays || [],
      incomeAllocations: profile?.incomeAllocations || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/master/regions  — update daftar wilayah
// ─────────────────────────────────────────────────────────────────────────────
router.put('/regions', authenticateToken, async (req: any, res: Response) => {
  const role = req.user?.role;
  const { userName, userRole } = auditFromReq(req);
  if (role !== 'Super Admin' && role !== 'Ketua Yayasan') {
    return res.status(403).json({ success: false, message: 'Hak akses terbatas.' });
  }
  try {
    const { regions } = req.body;
    const profile = await getProfileMaster();
    if (profile) {
      await dbDriver.updateDoc('profiles', 'PROF-01', cleanObjectForFirestore({ regions }));
    }
    await writeAuditLog({ userName, userRole, action: `Update Master Data Wilayah: ${JSON.stringify(regions)}`, module: 'Sistem' });
    res.json({ success: true, regions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const masterRouter = router;
export default masterRouter;
