/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Member, 
  MemberNote, 
  PrayerRequest, 
  FollowUpLog, 
  SmallGroup, 
  MeetingLog, 
  MaterialInfo, 
  Transaction, 
  FinancialCategory, 
  Partner, 
  CampaignDonation, 
  Staff, 
  StaffSalary,
  CareerHistory, 
  LetterInward, 
  LetterOutward, 
  OrgDocument, 
  ApprovalRequest, 
  InstitutionalProfile, 
  AuditLog 
} from '../types';

export const INITIAL_PROFILE: InstitutionalProfile = {
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
  regions: ["Yogyakarta", "Solo", "Semarang", "Purwokerto"],
  materialCategories: ["Materi Dasar / Siswa", "Siswa & Mahasiswa", "Alumni", "Pelatihan Pemimpin (PKK)", "Materi Umum / Publik"],
  incomeAllocations: ["Gaji / Operasional", "Peralatan", "Kegiatan Khusus", "Lainnya"],
  meetingDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
  memberKeaktifanStatuses: ["Aktif", "Pasif", "Cuti", "Pindah"],
  memberComponents: ["Siswa", "Mahasiswa", "Alumni", "Umum"],
  partnerStatuses: ["Prospek", "Kontak Awal", "Presentasi", "Komitmen", "Donasi Pertama", "Aktif", "Tidak Aktif"],
  partnerTypes: ["Pribadi", "Gereja", "Perusahaan", "Instansi", "Yayasan"],
  stampUrl: '',
  signatureChairmanUrl: '',
  signatureSecretaryUrl: '',
  signatureTreasurerUrl: '',
};

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'EXP-2026-00001',
    fullName: 'Yusuf Raja Tamba',
    nickName: 'Yusuf',
    gender: 'Laki-laki',
    birthPlace: 'Medan',
    birthDate: '2004-05-12',
    phone: '081234567890',
    email: 'yusuf.tamba@student.univ.ac.id',
    address: 'Kosan Green House No. 5, Pogung Kidul',
    city: 'Yogyakarta',
    province: 'DIY',
    instagram: '@yusuf_rt',
    originalChurch: 'HKBP Yogyakarta',
    education: 'S1 Teknik Informatika - UGM',
    occupation: 'Mahasiswa',
    photoUrl: undefined,
    component: 'Mahasiswa',
    region: 'Yogyakarta',
    smallGroupId: 'SG-01',
    staffAdvisor: 'Ahmad Faisal',
    mentor: 'Christian Sitorus',
    statusKeaktifan: 'Aktif',
    joinedDate: '2024-02-15'
  },
  {
    id: 'ENC-2026-00002',
    fullName: 'Maria Grace Wijaya',
    nickName: 'Maria',
    gender: 'Perempuan',
    birthPlace: 'Surabaya',
    birthDate: '2008-09-20',
    phone: '082198765432',
    email: 'maria.grace@gmail.com',
    address: 'Jl. Manyar Sabrangan No. 42',
    city: 'Surabaya',
    province: 'Jawa Timur',
    instagram: '@maria_g_w',
    originalChurch: 'GKI Manyar',
    education: 'SMA Kristen Petra 1',
    occupation: 'Siswa',
    photoUrl: undefined,
    component: 'Siswa',
    region: 'Surabaya',
    smallGroupId: 'SG-02',
    staffAdvisor: 'Sarah Sitorus',
    mentor: 'Maria Grace Wijaya',
    statusKeaktifan: 'Aktif',
    joinedDate: '2025-01-10'
  },
  {
    id: 'CON-2026-00003',
    fullName: 'Daniel Panjaitan',
    nickName: 'Daniel',
    gender: 'Laki-laki',
    birthPlace: 'Jakarta',
    birthDate: '1999-11-05',
    phone: '081122334455',
    email: 'daniel.panjaitan@corpnet.co.id',
    address: 'Apartemen Kebon Jeruk Indah Tower B',
    city: 'Jakarta Barat',
    province: 'DKI Jakarta',
    instagram: '@dan_panjaitan',
    originalChurch: 'GBI Senayan',
    education: 'S1 Akuntansi - UI',
    occupation: 'Financial Analyst',
    photoUrl: undefined,
    component: 'Alumni',
    region: 'Jakarta',
    smallGroupId: 'SG-03',
    staffAdvisor: 'Ahmad Faisal',
    mentor: 'Andi Siregar',
    statusKeaktifan: 'Aktif',
    joinedDate: '2018-09-01'
  },
  {
    id: 'ENC-2026-00004',
    fullName: 'Ahmad Maulana Malik',
    nickName: 'Ahmad',
    gender: 'Laki-laki',
    birthPlace: 'Bandung',
    birthDate: '2009-04-14',
    phone: '089876543210',
    email: 'ahmad.maulana@secondary.edu',
    address: 'Komplek Dago Elok Blok C3',
    city: 'Bandung',
    province: 'Jawa Barat',
    instagram: '@ahmaad_m',
    originalChurch: 'GKP Bandung',
    education: 'SMP Negeri 5 Bandung',
    occupation: 'Siswa',
    photoUrl: undefined,
    component: 'Siswa',
    region: 'Bandung',
    smallGroupId: 'SG-04',
    staffAdvisor: 'Grace Natalia',
    mentor: 'Budi Hartono',
    statusKeaktifan: 'Aktif',
    joinedDate: '2025-07-20'
  },
  {
    id: 'EXP-2026-00005',
    fullName: 'Stella Caroline Simanjuntak',
    nickName: 'Stella',
    gender: 'Perempuan',
    birthPlace: 'Medan',
    birthDate: '2005-01-30',
    phone: '085233446677',
    email: 'stella.caroline@student.unimed.ac.id',
    address: 'Jl. Dr. Mansyur Gg. Keluarga No. 3',
    city: 'Medan',
    province: 'Sumatera Utara',
    instagram: '@stella_sim',
    originalChurch: 'HKBP Sudirman Medan',
    education: 'S1 Kedokteran - USU',
    occupation: 'Mahasiswa',
    photoUrl: undefined,
    component: 'Mahasiswa',
    region: 'Medan',
    smallGroupId: undefined,
    staffAdvisor: 'Sarah Sitorus',
    mentor: 'Grace Natalia',
    statusKeaktifan: 'Pasif',
    joinedDate: '2023-08-11'
  }
];

export const INITIAL_MEMBER_NOTES: MemberNote[] = [
  {
    id: 'NOTE-01',
    memberId: 'EXP-2026-00001',
    date: '2026-01-10',
    category: 'Konseling Akademik',
    notes: 'Yusuf berkonsultasi mengenai beban SKS semester akhir yang padat berbarengan dengan magang industri. Didoakan agar diberikan hikmat manajemen waktu.',
    author: 'Ahmad Faisal'
  },
  {
    id: 'NOTE-02',
    memberId: 'EXP-2026-00001',
    date: '2026-01-15',
    category: 'Follow Up Retret',
    notes: 'Mengikuti retret kepemimpinan dengan fokus materi visi pemuridan di kampus. Yusuf menunjukkan ketertarikan tinggi untuk memimpin Kelompok Kecil baru.',
    author: 'Christian Sitorus'
  },
  {
    id: 'NOTE-03',
    memberId: 'EXP-2026-00001',
    date: '2026-01-25',
    category: 'Kepemimpinan',
    notes: 'Yusuf resmi mulai menjadi pendamping kelompok kecil binaan siswa SMA. Sangat antusias dalam membimbing adik-adik tingkat.',
    author: 'Ahmad Faisal'
  },
  {
    id: 'NOTE-04',
    memberId: 'ENC-2026-00002',
    date: '2026-02-14',
    category: 'Follow Up Retret',
    notes: 'Maria sangat diberkati melalui sesi Encounter Camp. Dia menyerahkan komitmen penuh untuk rajin menghadiri persekutuan kelompok kecil setiap minggu.',
    author: 'Sarah Sitorus'
  }
];

export const INITIAL_PRAYER_REQUESTS: PrayerRequest[] = [
  {
    id: 'PRAY-01',
    memberId: 'EXP-2026-00001',
    memberName: 'Yusuf Raja Tamba',
    title: 'Ujian Akhir Semester & Skripsi',
    request: 'Mohon dukungan doa agar penulisan skripsi tentang Sistem Informasi Pelayanan dapat berjalan lancar dan selesai tepat waktu di bulan Juli.',
    date: '2026-06-01',
    status: 'Didoakan'
  },
  {
    id: 'PRAY-02',
    memberId: 'ENC-2026-00002',
    memberName: 'Maria Grace Wijaya',
    title: 'Kesehatan Orang Tua',
    request: 'Ibunda sedang menjalani perawatan pasca operasi batu empedu di Surabaya. Doakan kelancaran pemulihan fisik.',
    date: '2026-06-03',
    status: 'Terjawab'
  },
  {
    id: 'PRAY-03',
    memberId: 'ENC-2026-00004',
    memberName: 'Ahmad Maulana Malik',
    title: 'Ketaatan Beribadah & Belajar',
    request: 'Memohon kekuatan agar konsisten mengalokasikan waktu bersaat teduh pagi dan fokus mempersiapkan ujian masuk universitas.',
    date: '2026-06-05',
    status: 'Pending'
  }
];

export const INITIAL_FOLLOW_UPS: FollowUpLog[] = [
  {
    id: 'FU-01',
    memberId: 'EXP-2026-00001',
    memberName: 'Yusuf Raja Tamba',
    date: '2026-05-18',
    type: 'Mentoring',
    notes: 'Pertemuan rutin membahas materi Integritas di Tempat Kerja. Yusuf terbuka menceritakan tantangan menjaga integritas di perkantoran saat magang.',
    staffName: 'Christian Sitorus'
  },
  {
    id: 'FU-02',
    memberId: 'EXP-2026-00005',
    memberName: 'Stella Caroline Simanjuntak',
    date: '2026-05-22',
    type: 'Kunjungan',
    notes: 'Kunjungan ke area kos Stella untuk menanyakan alasan absen dari persekutuan dalam 3 minggu terakhir. Ternyata Stella sedang kesulitan finansial untuk membayar sewa kos.',
    staffName: 'Sarah Sitorus'
  },
  {
    id: 'FU-03',
    memberId: 'ENC-2026-00002',
    memberName: 'Maria Grace Wijaya',
    date: '2026-05-30',
    type: 'Pemuridan',
    notes: 'Belajar bersama Metode Pemuridan Kontekstual untuk Siswa. Maria sangat antusias menyusun daftar bahan perbincangan harian berbasis Alkitab.',
    staffName: 'Sarah Sitorus'
  }
];

export const INITIAL_SMALL_GROUPS: SmallGroup[] = [
  {
    id: 'SG-01',
    name: 'Tunas Kasih UGM',
    region: 'Yogyakarta',
    staffAdvisor: 'Ahmad Faisal',
    leaderName: 'Christian Sitorus',
    meetingDay: 'Rabu',
    meetingTime: '17:00',
    location: 'Selasar Perpustakaan Pusat UGM',
    memberCount: 6
  },
  {
    id: 'SG-02',
    name: 'Agape Siswa Surabaya',
    region: 'Surabaya',
    staffAdvisor: 'Sarah Sitorus',
    leaderName: 'Maria Grace Wijaya',
    meetingDay: 'Jumat',
    meetingTime: '15:30',
    location: 'Gazebo GKI Manyar',
    memberCount: 5
  },
  {
    id: 'SG-03',
    name: 'Sinergi Alumni Jakarta',
    region: 'Jakarta',
    staffAdvisor: 'Ahmad Faisal',
    leaderName: 'Andi Siregar',
    meetingDay: 'Sabtu',
    meetingTime: '10:00',
    location: 'Starbucks Wisma BNI 46',
    memberCount: 8
  },
  {
    id: 'SG-04',
    name: 'Immanuel Siswa Bandung',
    region: 'Bandung',
    staffAdvisor: 'Grace Natalia',
    leaderName: 'Budi Hartono',
    meetingDay: 'Kamis',
    meetingTime: '16:00',
    location: 'Taman Gasibu Bandung',
    memberCount: 4
  }
];

export const INITIAL_MEETING_LOGS: MeetingLog[] = [
  {
    id: 'MEET-01',
    groupId: 'SG-01',
    date: '2026-05-25',
    materialName: 'Pertumbuhan Rohani Kristen',
    attendance: ['EXP-2026-00001'],
    notes: 'Membahas bab 3 buku Fondasi Iman. Semua peserta berpartisipasi aktif berbagi refleksi.'
  },
  {
    id: 'MEET-02',
    groupId: 'SG-02',
    date: '2026-05-27',
    materialName: 'Karakter Kristus dalam Remaja',
    attendance: ['ENC-2026-00002'],
    notes: 'Diskusi interaktif tentang perundungan di sekolah dan bagaimana cara murid Kristus bersikap.'
  },
  {
    id: 'MEET-03',
    groupId: 'SG-03',
    date: '2026-05-29',
    materialName: 'Integrasi Iman dan Profesi',
    attendance: ['CON-2026-00003'],
    notes: 'Sesi kupas tuntas etika profesional berbasis firman Tuhan. Sangat relevan untuk yang baru masuk dunia kerja.'
  }
];

export const INITIAL_MATERIALS: MaterialInfo[] = [
  {
    id: 'MAT-01',
    title: 'Fondasi Iman Kristen (Buku 1)',
    category: 'Materi Dasar / Siswa',
    description: 'Modul pengenalan Kristus bagi pemula, mengajarkan kesaksian iman, pentingnya firman Tuhan, dan doa.',
    fileSize: '2.4 MB'
  },
  {
    id: 'MAT-02',
    title: 'Bertumbuh bersama Kristus (Buku 2)',
    category: 'Siswa & Mahasiswa',
    description: 'Modul pemuridan tentang pertumbuhan rohani, mengelola karakter, pergaulan sehat, dan disiplin rohani.',
    fileSize: '3.1 MB'
  },
  {
    id: 'MAT-03',
    title: 'Iman dan Karir Kontemporer',
    category: 'Alumni',
    description: 'Artikel dan panduan diskusi praktis mengenai integritas kerja, menghadapi politik kantor, dan pelayanan alumni.',
    fileSize: '1.2 MB'
  },
  {
    id: 'MAT-04',
    title: 'Pedoman Memimpin Kelompok Kecil',
    category: 'Pelatihan Pemimpin (PKK)',
    description: 'Panduan lengkap bagi para calon pemimpin kelompok kecil di sekolah maupun kampus.',
    fileSize: '4.8 MB'
  }
];

export const INITIAL_CATEGORIES: FinancialCategory[] = [
  { id: 'CAT-01', name: 'Dukungan Mitra Bulanan', type: 'Income', budgetLimit: undefined },
  { id: 'CAT-02', name: 'Donasi Insidental / Sponsor', type: 'Income', budgetLimit: undefined },
  { id: 'CAT-03', name: 'Kontribusi Alumni / Iuran', type: 'Income', budgetLimit: undefined },
  { id: 'CAT-04', name: 'Payroll Staff & BPJS', type: 'Expense', budgetLimit: 40000000 },
  { id: 'CAT-05', name: 'Operasional Kantor & Sewa', type: 'Expense', budgetLimit: 12000000 },
  { id: 'CAT-06', name: 'Kepanitiaan & Event Retret', type: 'Expense', budgetLimit: 25000000 },
  { id: 'CAT-07', name: 'Alat Tulis Kantor & Cetak', type: 'Expense', budgetLimit: 3000000 },
  { id: 'CAT-08', name: 'Subsidi Pelayanan Siswa', type: 'Expense', budgetLimit: 10000000 }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-2026-00001',
    date: '2026-06-01',
    category: 'Dukungan Mitra Bulanan',
    description: 'Penerimaan dana mitra setia dari Bapak Hendra Wijaya',
    amount: 1500000,
    type: 'Income',
    sourceOrRecipient: 'Hendra Wijaya',
    status: 'Approved'
  },
  {
    id: 'TX-2026-00002',
    date: '2026-06-02',
    category: 'Donasi Insidental / Sponsor',
    description: 'Sponsorship dari PT Berkah Abadi untuk Retreat Mahasiswa',
    amount: 10000000,
    type: 'Income',
    sourceOrRecipient: 'PT Berkah Abadi',
    status: 'Approved'
  },
  {
    id: 'TX-2026-00003',
    date: '2026-06-03',
    category: 'Payroll Staff & BPJS',
    description: 'Pembayaran Payroll Staff Yayasan Periode Mei 2026',
    amount: 23650000,
    type: 'Expense',
    sourceOrRecipient: 'Transfer Rekening Mandiri Kolektif',
    status: 'Approved'
  },
  {
    id: 'TX-2026-00004',
    date: '2026-06-04',
    category: 'Operasional Kantor & Sewa',
    description: 'Pembayaran tagihan listrik, internet, dan air kantor pusat',
    amount: 1850000,
    type: 'Expense',
    sourceOrRecipient: 'PLN & IndiHome',
    status: 'Approved'
  },
  {
    id: 'TX-2026-00005',
    date: '2026-06-05',
    category: 'Kepanitiaan & Event Retret',
    description: 'Pengajuan DP Akomodasi penginapan Retret Encounter Salatiga',
    amount: 5000000,
    type: 'Expense',
    sourceOrRecipient: 'Wisma Retreat Salatiga',
    status: 'Pending Approval'
  },
  {
    id: 'TX-2026-00006',
    date: '2026-06-06',
    category: 'Kontribusi Alumni / Iuran',
    description: 'Sumbangan iuran alumni regional Surabaya',
    amount: 3000000,
    type: 'Income',
    sourceOrRecipient: 'Ikatan Alumni ESM Sby',
    status: 'Approved'
  },
  {
    id: 'TX-2026-00007',
    date: '2026-06-07',
    category: 'Subsidi Pelayanan Siswa',
    description: 'Reimbursement dana konsumsi persekutuan siswa Bandung',
    amount: 750000,
    type: 'Expense',
    sourceOrRecipient: 'Grace Natalia',
    status: 'Pending Approval'
  },
  {
    id: 'TX-2026-00008',
    date: '2026-05-10',
    category: 'Dukungan Mitra Bulanan',
    description: 'Penerimaan donasi tahunan GKI Manyar Surabaya',
    amount: 12000000,
    type: 'Income',
    sourceOrRecipient: 'GKI Manyar Surabaya',
    status: 'Approved'
  }
];

export const INITIAL_PARTNERS: Partner[] = [
  {
    id: 'PTR-01',
    name: 'Bapak Hendra Wijaya',
    phone: '081234560001',
    email: 'hendra_wijaya@gmail.com',
    address: 'Jl. Menteng Asri No. 12',
    partnerType: 'Pribadi',
    region: 'Jakarta',
    staffRelasi: 'Ahmad Faisal',
    status: 'Aktif',
    commitmentAmount: 1500000,
    frequency: 'Bulanan',
    startDate: '2024-01-01',
    endDate: '2027-12-31'
  },
  {
    id: 'PTR-02',
    name: 'GKI Manyar Surabaya',
    phone: '031-5992233',
    email: 'sekretariat@gkimanyarsby.or.id',
    address: 'Jl. Manyar Sindu No. 12, Surabaya',
    partnerType: 'Gereja',
    region: 'Surabaya',
    staffRelasi: 'Sarah Sitorus',
    status: 'Aktif',
    commitmentAmount: 12000000,
    frequency: 'Tahunan',
    startDate: '2025-01-10',
    endDate: '2026-12-31'
  },
  {
    id: 'PTR-03',
    name: 'PT Berkah Abadi',
    phone: '021-8273641',
    email: 'csr@berkahabadi.co.id',
    address: 'Menara Berkah Perkasa Lt. 14, Sudirman',
    partnerType: 'Perusahaan',
    region: 'Jakarta',
    staffRelasi: 'Ahmad Faisal',
    status: 'Komitmen',
    commitmentAmount: 10000000,
    frequency: 'Satu Kali',
    startDate: '2026-06-01',
    endDate: '2026-06-30'
  },
  {
    id: 'PTR-04',
    name: 'Ibu Listia Hutapea',
    phone: '082215443290',
    email: 'listia_h@yahoo.com',
    address: 'Pondok Indah Indah Lestari Blok F4',
    partnerType: 'Pribadi',
    region: 'Jakarta',
    staffRelasi: 'Ahmad Faisal',
    status: 'Presentasi',
    commitmentAmount: 500000,
    frequency: 'Bulanan',
    startDate: '2026-07-01',
    endDate: '2027-06-30'
  },
  {
    id: 'PTR-05',
    name: 'Yayasan Harapan Bangsa',
    phone: '022-4235431',
    email: 'contact@harapanbangsafoundation.org',
    address: 'Jl. Surya Sumantri No. 89, Bandung',
    partnerType: 'Yayasan',
    region: 'Bandung',
    staffRelasi: 'Grace Natalia',
    status: 'Kontak Awal',
    commitmentAmount: 25000000,
    frequency: 'Tahunan',
    startDate: '2027-01-01',
    endDate: '2028-12-31'
  }
];

export const INITIAL_STAFF: Staff[] = [
  {
    nik: 'NIK-1001',
    name: 'Ahmad Faisal, S.Th.',
    phone: '081273645341',
    email: 'ahmad.faisal@esm-student.or.id',
    address: 'Komplek Permata Indah Residence No. D4, Depok',
    position: 'Koordinator Pelayanan & HR',
    division: 'Pelayanan Wilayah',
    status: 'Tetap',
    joinedDate: '2020-03-01',
    salaryBase: 7500000,
    allowancePosition: 1500000,
    allowanceHousing: 1000000,
    allowanceTransport: 1000000,
    allowanceComm: 500000,
    bonus: 0,
    thr: 0,
    bpjsAllowance: 350000,
    taxDeduction: 250000,
    bpjsDeduction: 150000,
    kasbonDeduction: 0,
    otherDeduction: 0,
    paidAmount: 11450000
  },
  {
    nik: 'NIK-1002',
    name: 'Sarah Sitorus, S.Psi.',
    phone: '085299447732',
    email: 'sarah.sitorus@esm-student.or.id',
    address: 'Graha Kalijudan Indah Gg. 2 No. 80, Surabaya',
    position: 'Koordinator Wilayah Surabaya',
    division: 'Pelayanan Wilayah',
    status: 'Tetap',
    joinedDate: '2022-07-15',
    salaryBase: 5500000,
    allowancePosition: 1000000,
    allowanceHousing: 800000,
    allowanceTransport: 800000,
    allowanceComm: 400000,
    bonus: 0,
    thr: 0,
    bpjsAllowance: 300000,
    taxDeduction: 150000,
    bpjsDeduction: 120000,
    kasbonDeduction: 0,
    otherDeduction: 0,
    paidAmount: 8530000
  },
  {
    nik: 'NIK-1003',
    name: 'Grace Natalia, S.Kom.',
    phone: '081122883399',
    email: 'grace.natalia@esm-student.or.id',
    address: 'Jl. Terusan Babakan Jeruk I No. 4, Bandung',
    position: 'Sekretariat & IT Admin',
    division: 'Sekretariat',
    status: 'Kontrak',
    joinedDate: '2024-05-10',
    contractEndDate: '2027-05-09',
    salaryBase: 4800000,
    allowancePosition: 500000,
    allowanceHousing: 500000,
    allowanceTransport: 500000,
    allowanceComm: 300000,
    bonus: 0,
    thr: 0,
    bpjsAllowance: 250000,
    taxDeduction: 100000,
    bpjsDeduction: 100000,
    kasbonDeduction: 400000, // Kasbon potongan
    otherDeduction: 0,
    paidAmount: 3670000
  },
  {
    nik: 'NIK-1004',
    name: 'Staff Operator',
    phone: '081234567890',
    email: 'staff@esm.or.id',
    address: 'Jl. Diponegoro No. 12, Jakarta Pusat',
    position: 'Staff Pelaksana Lapangan',
    division: 'Pelayanan Wilayah',
    status: 'Tetap',
    joinedDate: '2025-01-10',
    salaryBase: 4200000,
    allowancePosition: 300000,
    allowanceHousing: 300000,
    allowanceTransport: 300000,
    allowanceComm: 200000,
    bonus: 0,
    thr: 0,
    bpjsAllowance: 200000,
    taxDeduction: 80000,
    bpjsDeduction: 80000,
    kasbonDeduction: 0,
    otherDeduction: 0,
    paidAmount: 5140000
  }
];

export const INITIAL_INWARD_LETTERS: LetterInward[] = [
  {
    id: 'LETIN-01',
    letterNumber: '084/Pan-Ret/GKI-M/V/2026',
    sender: 'Panitia Retreat Pemuda GKI Manyar',
    subject: 'Undangan Menjadi Pembicara Retreat Pemuda 2026',
    receivedDate: '2026-05-15',
    status: 'Disposisi'
  },
  {
    id: 'LETIN-02',
    letterNumber: '110/ADM/USU/V/2026',
    sender: 'Biro Kemahasiswaan Universitas Sumatera Utara',
    subject: 'Pemberitahuan Sertifikat Akreditasi Organisasi Mitra Unimed/USU',
    receivedDate: '2026-05-20',
    status: 'Arsip'
  }
];

export const INITIAL_OUTWARD_LETTERS: LetterOutward[] = [
  {
    id: 'LETOUT-01',
    letterNumber: '001/SK/ESM/VI/2026',
    templateType: 'SK',
    recipient: 'Christian Sitorus',
    subject: 'Surat Keputusan Pengangkatan Pemimpin Kelompok Kecil Wilayah Yogyakarta',
    date: '2026-06-01',
    content: 'Dengan ini memutuskan mengangkat Sdr. Christian Sitorus sebagai Pemimpin Kelompok Kecil Yogyakarta terhitung mulai tanggal 1 Juni 2026 sampai dengan 31 Mei 2027.',
    author: 'Ahmad Faisal, S.Th.',
    status: 'Approved'
  },
  {
    id: 'LETOUT-02',
    letterNumber: '002/Surat-Tugas/ESM/VI/2026',
    templateType: 'Surat Tugas',
    recipient: 'Sarah Sitorus, S.Psi.',
    subject: 'Surat Tugas Pendampingan Camp Encounter Salatiga',
    date: '2026-06-03',
    content: 'Menugaskan Sdri. Sarah Sitorus untuk mendampingi kontingen siswa Surabaya dalam kegiatan Encounter Camp Salatiga yang diselenggarakan pada 15-18 Juni 2026.',
    author: 'Ahmad Faisal, S.Th.',
    status: 'Approved'
  },
  {
    id: 'LETOUT-03',
    letterNumber: '003/Permohonan/ESM/VI/2026',
    templateType: 'Surat Permohonan',
    recipient: 'Pengurus Wisma Retreat Salatiga',
    subject: 'Permohonan Keringanan Tarif Sewa Lokasi Camp Relasi',
    date: '2026-06-05',
    content: 'Mengajukan permohonan dispensasi biaya sewa kamar barak untuk kegiatan retret siswa pembinaan rohani dikarenakan keterbatasan anggaran yayasan.',
    author: 'Grace Natalia, S.Kom.',
    status: 'Pending Approval'
  }
];

export const INITIAL_DOCUMENTS: OrgDocument[] = [
  { id: 'DOC-01', name: 'Anggaran Dasar & Anggaran Rumah Tangga (AD-ART) ESM', category: 'Konstitusi Organisasi', uploadedDate: '2024-01-15', fileSize: '4.5 MB' },
  { id: 'DOC-02', name: 'Standar Operasional Prosedur (SOP) Pengeluaran Kas & Reimbursement', category: 'SOP Keuangan', uploadedDate: '2024-02-10', fileSize: '1.8 MB' },
  { id: 'DOC-03', name: 'Akta Notaris Pendirian Yayasan Pelayanan Siswa & Mahasiswa', category: 'Legalitas Kelembagaan', uploadedDate: '2024-01-05', fileSize: '8.2 MB' },
  { id: 'DOC-04', name: 'Sertifikat Pendaftaran NPWP Yayasan Kementerian Keuangan', category: 'Perpajakan & Legalitas', uploadedDate: '2024-01-20', fileSize: '2.1 MB' }
];

export const INITIAL_APPROVALS: ApprovalRequest[] = [
  {
    id: 'APP-01',
    module: 'Keuangan',
    title: 'DP Penginapan Retret Salatiga',
    description: 'Pengajuan transfer 5 juta rupiah untuk mengunci reservasi wisma retreat Salatiga (retret siswa 15-18 Juni).',
    amount: 5000000,
    requestedBy: 'Sarah Sitorus',
    requestedAt: '2026-06-05 14:20',
    status: 'Pending',
    referenceId: 'TX-2026-00005'
  },
  {
    id: 'APP-02',
    module: 'Surat',
    title: 'Surat Permohonan Keringanan Wisma',
    description: 'Surat permohonan potongan harga sewa kamar Wisma Salatiga untuk Camp Encounter.',
    requestedBy: 'Grace Natalia',
    requestedAt: '2026-06-05 16:30',
    status: 'Pending',
    referenceId: 'LETOUT-03'
  },
  {
    id: 'APP-03',
    module: 'Keuangan',
    title: 'Reimbursement Konsumsi Persekutuan Bandung',
    description: 'Klaim struk pembelian nasi kotak persekutuan siswa SMP tanggal 4 Juni 2026 sbesar Rp750.000.',
    amount: 750000,
    requestedBy: 'Grace Natalia',
    requestedAt: '2026-06-07 10:05',
    status: 'Pending',
    referenceId: 'TX-2026-00007'
  }
];

export const INITIAL_AUDITS: AuditLog[] = [
  { id: 'AUD-01', userName: 'Yusuf Raja Tamba', userRole: 'Staff', action: 'Create Prayer Request', module: 'Anggota', timestamp: '2026-06-01 09:12' },
  { id: 'AUD-02', userName: 'Ahmad Faisal, S.Th.', userRole: 'Ketua Yayasan', action: 'Approve Outward Letter', module: 'Surat', timestamp: '2026-06-01 10:15', beforeValue: 'Status: Draft', afterValue: 'Status: Approved' },
  { id: 'AUD-03', userName: 'Grace Natalia', userRole: 'Bendahara', action: 'Import Member Excel', module: 'Anggota', timestamp: '2026-06-03 14:00', beforeValue: '0 members', afterValue: '5 members loaded' },
  { id: 'AUD-04', userName: 'Bendahara (System)', userRole: 'Bendahara', action: 'Process Payroll', module: 'Staff & Payroll', timestamp: '2026-06-03 15:45', beforeValue: 'Draft', afterValue: 'Disbursed' }
];

export const INITIAL_SALARIES: StaffSalary[] = [
  {
    id: 'NIK-1001',
    salaryBase: 7500000,
    components: [
      { id: 'allowancePosition', name: 'Tunjangan Jabatan', amount: 1500000, type: 'allowance' },
      { id: 'allowanceHousing', name: 'Tunjangan Perumahan', amount: 1000000, type: 'allowance' },
      { id: 'allowanceTransport', name: 'Tunjangan Transport', amount: 1000000, type: 'allowance' },
      { id: 'allowanceComm', name: 'Tunjangan Komunikasi', amount: 500000, type: 'allowance' },
      { id: 'bpjsAllowance', name: 'Premi BPJS Allowance', amount: 350000, type: 'allowance' },
      { id: 'taxDeduction', name: 'Pajak PPH21 Bruto', amount: 250000, type: 'deduction' },
      { id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', amount: 150000, type: 'deduction' }
    ]
  },
  {
    id: 'NIK-1002',
    salaryBase: 5500000,
    components: [
      { id: 'allowancePosition', name: 'Tunjangan Jabatan', amount: 1000000, type: 'allowance' },
      { id: 'allowanceHousing', name: 'Tunjangan Perumahan', amount: 800000, type: 'allowance' },
      { id: 'allowanceTransport', name: 'Tunjangan Transport', amount: 800000, type: 'allowance' },
      { id: 'allowanceComm', name: 'Tunjangan Komunikasi', amount: 400000, type: 'allowance' },
      { id: 'bpjsAllowance', name: 'Premi BPJS Allowance', amount: 300000, type: 'allowance' },
      { id: 'taxDeduction', name: 'Pajak PPH21 Bruto', amount: 150000, type: 'deduction' },
      { id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', amount: 120000, type: 'deduction' }
    ]
  },
  {
    id: 'NIK-1003',
    salaryBase: 4800000,
    components: [
      { id: 'allowancePosition', name: 'Tunjangan Jabatan', amount: 500000, type: 'allowance' },
      { id: 'allowanceHousing', name: 'Tunjangan Perumahan', amount: 500000, type: 'allowance' },
      { id: 'allowanceTransport', name: 'Tunjangan Transport', amount: 500000, type: 'allowance' },
      { id: 'allowanceComm', name: 'Tunjangan Komunikasi', amount: 300000, type: 'allowance' },
      { id: 'bpjsAllowance', name: 'Premi BPJS Allowance', amount: 250000, type: 'allowance' },
      { id: 'taxDeduction', name: 'Pajak PPH21 Bruto', amount: 100000, type: 'deduction' },
      { id: 'bpjsDeduction', name: 'Iuran BPJS Karyawan', amount: 100000, type: 'deduction' },
      { id: 'kasbonDeduction', name: 'Kasbon / Angsuran', amount: 400000, type: 'deduction' }
    ]
  }
];

export const INITIAL_DONATIONS: CampaignDonation[] = [
  { id: 'DON-01', partnerId: 'PTR-01', partnerName: 'Bapak Hendra Wijaya', amount: 1500000, date: '2026-06-01', channel: 'Transfer Bank Mandiri' },
  { id: 'DON-02', partnerId: 'PTR-02', partnerName: 'GKI Manyar Surabaya', amount: 12000000, date: '2026-05-10', channel: 'BCA Yayasan' },
  { id: 'DON-03', partnerId: 'PTR-03', partnerName: 'PT Berkah Abadi', amount: 10000000, date: '2026-06-02', channel: 'BCA Yayasan' }
];
