import { dbDriver } from '../db/driver';
import { cleanObjectForFirestore } from './transaction-sync.service';

// Seeding default users to Database if the 'users' collection is empty
export async function seedUsersIfEmpty() {
  try {
    const rawUsers = await dbDriver.getDocs('users');
    if (rawUsers.length === 0) {
      console.log('Seeding default Super Admin user to users collection (Empty State Reset)...');
      const defaultUsers = [
        {
          email: 'superadmin@esm.or.id',
          password: 'admin123',
          name: 'Super Admin Operator',
          role: 'Super Admin',
          features: ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system', 'reports', 'kegiatan', 'staff_tasks'],
          approved: true,
          deleted: false
        }
      ];
      for (const u of defaultUsers) {
        await dbDriver.setDoc('users', u.email, u);
      }
    }
  } catch (error) {
    console.error('Failed to seed users to database:', error);
  }
}

// Seeding default structures if empty
export async function seedStructuresIfEmpty() {
  try {
    const rawStructures = await dbDriver.getDocs('structures');
    if (rawStructures.length === 0) {
      console.log('Seeding default structures to database...');
      const defaultStructures = [
        { id: 'ketua', title: 'Ketua Dewan Pembina', name: 'Fernandes Manihuruk', sub: 'Pembuat Keputusan/Ketua', order: 10, parentId: null, deleted: false },
        { id: 'sekretaris', title: 'Sekretaris Eksekutif', name: 'Yusuf Raja Tamba', sub: 'Administrasi & Legalitas Lembaga', order: 20, parentId: 'ketua', deleted: false },
        { id: 'bendahara', title: 'Bendahara Umum', name: 'Angelina Meilia Putri Manalu', sub: 'Jurnal Kas, Transaksi & Audit', order: 30, parentId: 'ketua', deleted: false },
        { id: 'korwil', title: 'Koordinator Wilayah DIY', name: 'Joseph Daniel, S.Th.', sub: 'Lapangan & Persekutuan Cabang', order: 40, parentId: 'ketua', deleted: false },
        { id: 'staff', title: 'Staf Lapangan & Kelompok Kecil', name: 'Simpatisan Mitra Aliansi', sub: 'Pendamping Siswa & Pelayanan', order: 50, parentId: 'korwil', deleted: false },
      ];
      for (const s of defaultStructures) {
        await dbDriver.setDoc('structures', s.id, s);
      }
    }
  } catch (error) {
    console.error('Failed to seed structures:', error);
  }
}

// Seed profile lembaga jika belum ada
export async function seedProfileIfEmpty() {
  try {
    const profiles = await dbDriver.getDocs('profiles');
    const exists = profiles.find((p: any) => p.id === 'PROF-01');
    if (!exists) {
      console.log('[Seed] Seeding institutional profile PROF-01...');
      const initialProfile = cleanObjectForFirestore({
        id: 'PROF-01',
        name: 'Yayasan Murid Muda Bermisi (MMB)',
        logoUrl: '',
        kopTitle: 'EVANGELICAL STUDENT MOVEMENT',
        kopMotto: 'Kabar baik. Pemuridan. Misi.',
        address: 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat, DKI Jakarta 10310',
        npwp: '01.234.567.8-012.000',
        website: 'https://muridmudabermisi.or.id',
        email: 'info@muridmudabermisi.or.id',
        phone: '+62 21-3456-7890',
        legalReg: 'AHU-0012345.AH.01.04.Tahun 2024',
        systemTitle: 'Yayasan MMB',
        dashboardTitle: 'Institutional Executive ERP',
        regions: ['Yogyakarta', 'Solo', 'Semarang', 'Purwokerto'],
        materialCategories: ['Materi Dasar / Siswa', 'Siswa & Mahasiswa', 'Alumni', 'Pelatihan Pemimpin (PKK)', 'Materi Umum / Publik'],
        incomeAllocations: ['Gaji / Operasional', 'Peralatan', 'Kegiatan Khusus', 'Lainnya'],
        meetingDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
        memberKeaktifanStatuses: ['Aktif', 'Pasif', 'Cuti', 'Pindah'],
        memberComponents: ['Siswa', 'Mahasiswa', 'Alumni', 'Umum'],
        partnerStatuses: ['Prospek', 'Kontak Awal', 'Presentasi', 'Komitmen', 'Donasi Pertama', 'Aktif', 'Tidak Aktif'],
        partnerTypes: ['Pribadi', 'Gereja', 'Perusahaan', 'Instansi', 'Yayasan'],
        donationChannels: [
          { name: 'Transfer Bank Mandiri', detail: 'Mandiri Utama 123-00-x' },
          { name: 'BCA Yayasan', detail: 'BCA Yayasan 552-x' },
          { name: 'Transfer BNI', detail: 'BNI 0928-x' },
          { name: 'Dana Cash (Fisik)', detail: 'Tunai / Cash Fisik' },
        ],
        stampUrl: '',
        signatureChairmanUrl: '',
        signatureSecretaryUrl: '',
        signatureTreasurerUrl: '',
        deleted: false,
        createdAt: new Date().toISOString(),
        createdBy: 'System Seed BE',
      });
      await dbDriver.setDoc('profiles', 'PROF-01', initialProfile);
    }
  } catch (err) {
    console.error('[Seed] Failed to seed profile:', err);
  }
}

// Seed kategori keuangan default jika belum ada
export async function seedCategoriesIfEmpty() {
  try {
    const cats = await dbDriver.getDocs('categories');
    if (cats.length === 0) {
      console.log('[Seed] Seeding default financial categories...');
      const defaultCategories = [
        { id: 'CAT-INCOME-001', name: 'Donasi Kemitraan', type: 'Income', deleted: false },
        { id: 'CAT-INCOME-002', name: 'Persembahan Ibadah', type: 'Income', deleted: false },
        { id: 'CAT-INCOME-003', name: 'Pendapatan Lainnya', type: 'Income', deleted: false },
        { id: 'CAT-INCOME-004', name: 'Alokasi Kegiatan / Event', type: 'Income', deleted: false },
        { id: 'CAT-INCOME-005', name: 'Pemasukan Kegiatan / Event sisa', type: 'Income', deleted: false },
        { id: 'CAT-EXP-001', name: 'Penggajian Staff', type: 'Expense', deleted: false },
        { id: 'CAT-EXP-002', name: 'Operasional Kantor', type: 'Expense', deleted: false },
        { id: 'CAT-EXP-003', name: 'Biaya Kegiatan / Event', type: 'Expense', deleted: false },
        { id: 'CAT-EXP-004', name: 'Transportasi', type: 'Expense', deleted: false },
        { id: 'CAT-EXP-005', name: 'Alokasi Kegiatan / Event', type: 'Expense', deleted: false },
        { id: 'CAT-EXP-006', name: 'Pengeluaran Lainnya', type: 'Expense', deleted: false },
      ];
      for (const cat of defaultCategories) {
        await dbDriver.setDoc('categories', cat.id, cleanObjectForFirestore({ ...cat, createdAt: new Date().toISOString(), createdBy: 'System Seed BE' }));
      }
    }
  } catch (err) {
    console.error('[Seed] Failed to seed categories:', err);
  }
}

// Seed data pengurus yayasan default jika belum ada
export async function seedPengurusIfEmpty() {
  try {
    const existing = await dbDriver.getDocs('pengurus');
    if (existing.length === 0) {
      console.log('[Seed] Seeding default Pengurus Yayasan to pengurus collection...');
      const defaultPengurus = [
        {
          nik: 'PENG-1001',
          name: 'Fernandes Manihuruk',
          category: 'Pengurus',
          position: 'Ketua Pengurus Yayasan',
          division: 'Pengurus Harian Yayasan',
          status: 'Pengurus Aktif',
          phone: '08123456701',
          email: 'ketua@esm.or.id',
          address: 'Kantor Yayasan MMB',
          joinedDate: '2020-01-01',
          periodStart: '2024-01-01',
          periodEnd: '2029-01-01',
          skNumber: '001/SK-YYS/2024',
          deleted: false
        },
        {
          nik: 'PENG-1002',
          name: 'Yusuf Raja Tamba',
          category: 'Pengurus',
          position: 'Sekretaris Yayasan',
          division: 'Sekretariat',
          status: 'Pengurus Aktif',
          phone: '08123456702',
          email: 'sekretaris@esm.or.id',
          address: 'Kantor Yayasan MMB',
          joinedDate: '2020-01-01',
          periodStart: '2024-01-01',
          periodEnd: '2029-01-01',
          skNumber: '002/SK-YYS/2024',
          deleted: false
        },
        {
          nik: 'PENG-1003',
          name: 'Angelina Meilia Putri Manalu',
          category: 'Pengurus',
          position: 'Bendahara Yayasan',
          division: 'Keuangan & Audit',
          status: 'Pengurus Aktif',
          phone: '08123456703',
          email: 'bendahara@esm.or.id',
          address: 'Kantor Yayasan MMB',
          joinedDate: '2020-01-01',
          periodStart: '2024-01-01',
          periodEnd: '2029-01-01',
          skNumber: '003/SK-YYS/2024',
          deleted: false
        },
        {
          nik: 'PENG-1004',
          name: 'Wilda Silvany',
          category: 'Pengurus',
          position: 'Pelaksana Tugas Bendahara Yayasan',
          division: 'Keuangan & Audit',
          status: 'Pengurus Aktif',
          phone: '08123456704',
          email: 'wilda@esm.or.id',
          address: 'Kantor Yayasan MMB',
          joinedDate: '2022-01-01',
          periodStart: '2024-01-01',
          periodEnd: '2029-01-01',
          skNumber: '004/SK-YYS/2024',
          deleted: false
        },
        {
          nik: 'PENG-1005',
          name: 'Triawan Wicaksono',
          category: 'Pengurus',
          position: 'Ketua Dewan Pembina',
          division: 'Pengurus Harian Yayasan',
          status: 'Pengurus Aktif',
          phone: '08123456705',
          email: 'pembina1@esm.or.id',
          address: 'Kantor Yayasan MMB',
          joinedDate: '2019-01-01',
          periodStart: '2024-01-01',
          periodEnd: '2029-01-01',
          skNumber: '005/SK-YYS/2024',
          deleted: false
        },
        {
          nik: 'PENG-1006',
          name: 'Flafiana Trinurjani Tagung,S.Si., M.Min., M.Si.',
          category: 'Pengurus',
          position: 'Anggota Dewan Pembina',
          division: 'Pengurus Harian Yayasan',
          status: 'Pengurus Aktif',
          phone: '08123456706',
          email: 'pembina2@esm.or.id',
          address: 'Kantor Yayasan MMB',
          joinedDate: '2019-01-01',
          periodStart: '2024-01-01',
          periodEnd: '2029-01-01',
          skNumber: '006/SK-YYS/2024',
          deleted: false
        },
        {
          nik: 'PENG-1007',
          name: 'Febry Ramos Sinaga',
          category: 'Pengurus',
          position: 'Ketua Dewan Pengawas',
          division: 'Pengurus Harian Yayasan',
          status: 'Pengurus Aktif',
          phone: '08123456707',
          email: 'pengawas1@esm.or.id',
          address: 'Kantor Yayasan MMB',
          joinedDate: '2020-01-01',
          periodStart: '2024-01-01',
          periodEnd: '2029-01-01',
          skNumber: '007/SK-YYS/2024',
          deleted: false
        },
        {
          nik: 'PENG-1008',
          name: 'Lucky Regina',
          category: 'Pengurus',
          position: 'Anggota Dewan Pengawas',
          division: 'Pengurus Harian Yayasan',
          status: 'Pengurus Aktif',
          phone: '08123456708',
          email: 'pengawas2@esm.or.id',
          address: 'Kantor Yayasan MMB',
          joinedDate: '2020-01-01',
          periodStart: '2024-01-01',
          periodEnd: '2029-01-01',
          skNumber: '008/SK-YYS/2024',
          deleted: false
        }
      ];
      for (const p of defaultPengurus) {
        await dbDriver.setDoc('pengurus', p.nik, p);
      }
    }
  } catch (err) {
    console.error('[Seed] Failed to seed pengurus:', err);
  }
}

// Sinkronisasi dinamis seluruh struktur organisasi ke tabel pengurus yayasan
export async function syncStructuresToPengurus() {
  try {
    const rawStructures = await dbDriver.getDocs('structures');
    const existingPengurus = await dbDriver.getDocs('pengurus');

    for (const node of rawStructures) {
      if (!node.name) continue;
      const cleanName = String(node.name).toLowerCase().trim();
      if (cleanName.includes('pemilik pelayanan') || cleanName.includes('allah tritunggal')) continue;

      const nodeNik = `PENG-${String(node.id).toUpperCase()}`;
      // Cari apakah sudah ada di pengurus berdasarkan structureNodeId, nik, atau nama
      const matched = existingPengurus.find((p: any) => 
        (p.structureNodeId && p.structureNodeId === node.id) ||
        (p.nik && p.nik.toLowerCase() === nodeNik.toLowerCase()) ||
        (p.name && String(p.name).toLowerCase().trim() === cleanName)
      );

      if (node.deleted) {
        // Jika di struktur dihapus, tandai juga deleted di pengurus
        if (matched && !matched.deleted) {
          await dbDriver.updateDoc('pengurus', matched.nik, {
            deleted: true,
            deletedAt: new Date().toISOString()
          });
        }
      } else {
        // Node aktif di struktur
        if (matched) {
          // Update jabatan/nama jika ada perubahan
          if (matched.position !== node.title || matched.name !== node.name || matched.deleted) {
            await dbDriver.updateDoc('pengurus', matched.nik, {
              name: node.name,
              position: node.title || matched.position,
              division: node.sub || matched.division || 'Pengurus Harian Yayasan',
              structureNodeId: node.id,
              deleted: false
            });
          }
        } else {
          // Belum ada -> otomatis buat pengurus baru
          const newDoc = {
            nik: nodeNik,
            name: node.name,
            category: 'Pengurus',
            position: node.title || 'Pengurus Yayasan',
            division: node.sub || 'Pengurus Harian Yayasan',
            status: 'Pengurus Aktif',
            phone: node.phone || '0812345678',
            email: node.email || `${String(node.id).toLowerCase()}@esm.or.id`,
            address: 'Kantor Yayasan MMB',
            joinedDate: new Date().toISOString().split('T')[0],
            structureNodeId: node.id,
            deleted: false,
            createdAt: new Date().toISOString(),
            createdBy: 'System Structure Auto-Sync'
          };
          await dbDriver.setDoc('pengurus', nodeNik, newDoc);
        }
      }
    }
  } catch (err) {
    console.error('[Sync] Failed to sync structures to pengurus:', err);
  }
}

// Master seed: panggil semua seed functions sekaligus
export async function seedAllInitialData() {
  await seedUsersIfEmpty();
  await seedStructuresIfEmpty();
  await seedPengurusIfEmpty();
  await syncStructuresToPengurus();
  await seedProfileIfEmpty();
  await seedCategoriesIfEmpty();

  // Mark as seeded
  await dbDriver.setDoc('system_state', 'seed_status', {
    id: 'seed_status',
    seeded: true,
    seededAt: new Date().toISOString(),
    seededBy: 'System BE Auto-Seed',
  });

  console.log('[Seed] All initial data seeded successfully from BE.');
}

// No-op — staff data diinput manual
export async function seedStaffIfEmpty() { }

