import { dbDriver } from '../db/driver';

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
          features: ['dashboard', 'members', 'small_groups', 'finance', 'partners', 'staff', 'payroll', 'letters', 'approvals', 'system'],
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

// Seeding default structures if empty or if 'ketua' is incorrect
export async function seedStructuresIfEmpty() {
  try {
    const rawStructures = await dbDriver.getDocs('structures');
    if (rawStructures.length === 0) {
      console.log('Seeding default structures to database...');
      const defaultStructures = [
        { id: 'ketua', title: 'Ketua Dewan Pembina', name: 'Fernandes Manihuruk', sub: 'Pembuat Keputusan/Ketua', order: 10, deleted: false },
        { id: 'sekretaris', title: 'Sekretaris Eksekutif', name: 'Yusuf Raja Tamba', sub: 'Administrasi & Legalitas Lembaga', order: 20, deleted: false },
        { id: 'bendahara', title: 'Bendahara Umum', name: 'Angelina Meilia Putri Manalu', sub: 'Jurnal Kas, Transaksi & Audit', order: 30, deleted: false },
        { id: 'korwil', title: 'Koordinator Wilayah DIY', name: 'Ahmad Faisal, S.Th.', sub: 'Lapangan & Persekutuan Cabang', order: 40, deleted: false },
        { id: 'staff', title: 'Staf Lapangan & Kelompok Kecil', name: 'Simpatisan Mitra Aliansi', sub: 'Pendamping Siswa & Pelayanan', order: 50, deleted: false },
      ];
      for (const s of defaultStructures) {
        await dbDriver.setDoc('structures', s.id, s);
      }
    }
  } catch (error) {
    console.error('Failed to seed structures:', error);
  }
}

// Seeding default corresponding staff profile
export async function seedStaffIfEmpty() {
  // No-op to respect manual input directive from user
}
