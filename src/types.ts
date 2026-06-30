/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoleType = 
  | 'Super Admin'
  | 'Ketua Yayasan'
  | 'Bendahara'
  | 'Sekretaris'
  | 'Koordinator Wilayah'
  | 'Staff';

export interface UserPermission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export type JourneyStatus = 
  | 'Prospect'
  | 'Encounter'
  | 'Explore'
  | 'Connect'
  | 'Alumni Aktif'
  | 'Alumni Non Aktif';

export interface Member {
  id: string; // Auto-generated e.g. ENC-2026-00001
  fullName: string;
  nickName: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  instagram: string;
  originalChurch: string;
  education: string;
  occupation: string;
  photoUrl?: string;
  
  // Ministry Details
  component: 'Siswa' | 'Mahasiswa' | 'Alumni' | 'Umum';
  region: string;
  smallGroupId?: string;
  staffAdvisor: string;
  mentor: string;
  statusKeaktifan: 'Aktif' | 'Pasif' | 'Cuti' | 'Pindah';
  joinedDate: string;
}

export interface MemberNote {
  id: string;
  memberId: string;
  date: string;
  category: string; // e.g. Konseling Akademik, Follow Up Retret, Kepemimpinan
  notes: string;
  author: string;
}

export interface PrayerRequest {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  request: string;
  date: string;
  status: 'Pending' | 'Didoakan' | 'Terjawab';
}

export interface FollowUpLog {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  type: 'Telepon' | 'Kunjungan' | 'Konseling' | 'Mentoring' | 'Pemuridan';
  notes: string;
  staffName: string;
}

export interface SmallGroup {
  id: string;
  name: string;
  region: string;
  staffAdvisor: string;
  leaderName: string;
  leaderId?: string;
  meetingDay: string;
  meetingTime: string;
  location: string;
  memberCount: number;
}

export interface MeetingLog {
  id: string;
  groupId: string;
  date: string;
  materialName: string; // Materi
  attendance: string[]; // List of member IDs who were present
  notes: string;
}

export interface MaterialInfo {
  id: string;
  title: string;
  category: string;
  description: string;
  fileSize?: string;
  pdfData?: string;
}

export interface Transaction {
  id: string;
  transaction_code?: string;
  type: 'Income' | 'Expense' | 'income' | 'expense';
  source?: 'manual' | 'donation' | 'payroll';
  category_id?: string;
  amount: number;
  description: string;
  transaction_date?: string;
  created_by?: string;
  reference_id?: string | null;
  reference_type?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;

  // Backwards compatibility fields for the React components:
  date?: string;
  category?: string;
  sourceOrRecipient?: string;
  approvedBy?: string;
  status?: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  allocationObjective?: string;
}

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'Income' | 'Expense';
  budgetLimit?: number;
}

export type PartnerType = 'Pribadi' | 'Gereja' | 'Perusahaan' | 'Instansi' | 'Yayasan';
export type PartnerStatus = 'Prospek' | 'Kontak Awal' | 'Presentasi' | 'Komitmen' | 'Donasi Pertama' | 'Aktif' | 'Tidak Aktif';

export interface Partner {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  birthDate?: string;
  occupation?: string;
  partnerType: PartnerType;
  region: string;
  staffRelasi: string;
  status: PartnerStatus;
  
  // Commitment Details
  commitmentAmount: number;
  frequency: 'Bulanan' | 'Tahunan' | 'Satu Kali';
  startDate: string;
  endDate?: string;
  donationDay?: number;
}

export interface CampaignDonation {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  date: string;
  channel: string; // Transfer Bank, Cash, dll
  notes?: string;
}

export interface CustomPayrollField {
  id: string;
  name: string;
  amount: number;
  type: 'allowance' | 'deduction';
}

export interface SalaryComponent {
  id: string;
  name: string;
  amount: number;
  type: 'allowance' | 'deduction';
}

export interface StaffSalary {
  id: string; // Matches staff's NIK
  salaryBase: number;
  components: SalaryComponent[];
}

export interface PublicField {
  id: string;
  name: string;
  type: 'allowance' | 'deduction';
  property?: string;
  isCustom?: boolean;
}

export interface Staff {
  nik: string; // e.g. NIK-1002
  name: string;
  phone: string;
  email: string;
  address: string;
  position: string; // Jabatan
  division: string; // Divisi
  status: 'Tetap' | 'Kontrak' | 'Magang' | 'Resigned';
  joinedDate: string;
  contractEndDate?: string;
  birthDate?: string;
  birthPlace?: string;
  
  // Salary details
  salaryBase: number;
  allowancePosition: number;
  allowanceHousing: number;
  allowanceTransport: number;
  allowanceComm: number;
  bonus: number;
  thr: number;
  bpjsAllowance: number;
  
  // Deductions
  taxDeduction: number;
  bpjsDeduction: number;
  kasbonDeduction: number;
  otherDeduction: number;

  customFields?: CustomPayrollField[];
  paidAmount?: number;
  lastMonthUnpaid?: number; // Sisa kekurangan / utang gaji bulan lalu
  lastPayrollMonth?: string; // Bulan siklus payroll terakhir (e.g. '2026-06')
}

export interface CareerHistory {
  id: string;
  staffNik: string;
  position: string;
  salaryBase: number;
  periodStart: string;
  periodEnd?: string;
  notes?: string;
}

export interface LetterInward {
  id: string;
  letterNumber: string;
  sender: string;
  subject: string; // Perihal
  receivedDate: string;
  attachmentUrl?: string;
  status: 'Arsip' | 'Disposisi' | 'Tindak Lanjut';
}

export interface LetterOutward {
  id: string;
  letterNumber: string; // Auto-generate like 001/SK/MMB/VI/2026
  templateType: 'SK' | 'Surat Tugas' | 'Surat Keterangan' | 'Surat Relasi' | 'Surat Peminjaman' | 'Surat Permohonan';
  recipient: string;
  subject: string;
  date: string;
  content: string;
  author: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Sent';
  // Dynamic Signees attributes
  signLeftType?: 'Ketua' | 'Sekretaris' | 'Bendahara' | 'Custom' | 'None';
  signLeftName?: string;
  signLeftTitle?: string;
  signRightType?: 'Ketua' | 'Sekretaris' | 'Bendahara' | 'Custom' | 'None';
  signRightName?: string;
  signRightTitle?: string;
  showStamp?: boolean;
  stampTarget?: 'left' | 'right' | 'center';
  stampOffsetX?: number;
  stampOffsetY?: number;
  stampSize?: number;
  signPlaceDate?: string;
  additionalSignatures?: Array<{ id: string; nodeId: string; title: string; name: string }>;
}

export interface OrgDocument {
  id: string;
  name: string; // e.g. AD/ART, SOP Keuangan, Akta Pendirian
  category: string;
  uploadedDate: string;
  fileSize: string;
  deleted?: boolean;
}

export interface ApprovalRequest {
  id: string;
  module: 'Keuangan' | 'Payroll' | 'Surat' | 'Mitra' | 'Event Budget';
  title: string;
  description: string;
  amount?: number;
  requestedBy: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comment?: string;
  referenceId: string; // ID of the referenced object
}

export interface InstitutionalProfile {
  id: string;
  name: string;
  logoUrl?: string;
  signatureUrl?: string;
  kopTitle?: string;
  kopMotto?: string;
  address: string;
  npwp: string;
  website: string;
  email: string;
  phone: string;
  legalReg: string; // Legalitas/SK Kemenkumham
  systemTitle?: string;
  dashboardTitle?: string;
  regions?: string[];
  materialCategories?: string[];
  incomeAllocations?: string[];
  meetingDays?: string[];
  memberKeaktifanStatuses?: string[];
  memberComponents?: string[];
  partnerStatuses?: string[];
  partnerTypes?: string[];
  donationChannels?: Array<{ name: string; detail: string }>;
  // Stamp and Role-based custom signatures
  stampUrl?: string;
  signatureChairmanUrl?: string;
  signatureSecretaryUrl?: string;
  signatureTreasurerUrl?: string;
  customSignatures?: Array<{ id: string; nodeId: string; title: string; name: string; signatureUrl: string }>;
}

export interface AuditLog {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  timestamp: string;
  beforeValue?: string;
  afterValue?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface ActivityRundownItem {
  id: string;
  activityId: string;
  time: string;
  activity: string;
  pic: string;
  createdAt?: string;
  createdBy?: string;
  deleted?: boolean;
}

export interface ActivityPreparationItem {
  id: string;
  activityId: string;
  task: string;
  date: string;
  pic: string;
  needsFunding: boolean;
  requiredAmount?: number;
  status: 'Pending' | 'Completed';
  funded?: boolean;
  createdAt?: string;
  createdBy?: string;
  deleted?: boolean;
}

export interface ActivityCommitteeMember {
  id: string;
  role: string; // e.g., Ketua, Sekretaris, Bendahara, Sie Konsumsi, etc.
  name: string;
  contact?: string;
}

export interface Activity {
  id: string;
  title: string;
  theme?: string;
  description?: string;
  ministers?: string; // pelayan
  time?: string;      // waktu kegiatan
  place?: string;     // tempat kegiatan
  budgetEstimated: number; // taksasi dana yang dibutuhkan
  budgetWalletBalance: number; // saldo kantong dana kegiatan sendiri
  committeeMembers?: ActivityCommitteeMember[];
  status?: 'Sedang Berjalan' | 'Selesai';
  createdAt?: string;
  createdBy?: string;
  deleted?: boolean;
}

export interface ActivityTransaction {
  id: string;
  activityId: string;
  type: 'In' | 'Out' | 'Transfer_From_Main' | 'Transfer_To_Main';
  amount: number;
  description: string;
  date: string;
  operator: string;
  deleted?: boolean;
  createdAt?: string;
}

