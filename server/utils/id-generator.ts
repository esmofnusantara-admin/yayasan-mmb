import { dbDriver } from '../db/driver';

const COUNTER_COLLECTION = 'id_counters';

async function nextSeq(key: string): Promise<number> {
  const doc = await dbDriver.getDoc(COUNTER_COLLECTION, key);
  const next = ((doc?.seq as number) || 0) + 1;
  await dbDriver.setDoc(COUNTER_COLLECTION, key, { id: key, seq: next });
  return next;
}

function pad(n: number, digits = 5): string {
  return String(n).padStart(digits, '0');
}

function year(): string {
  return new Date().getFullYear().toString();
}

/** Anggota — prefix berdasarkan component */
const COMPONENT_PREFIX: Record<string, string> = {
  'Siswa':     'SIS',
  'Mahasiswa': 'MHS',
  'Alumni':    'ALM',
  'Umum':      'UMM',
};
export async function generateMemberId(component: string): Promise<string> {
  const prefix = COMPONENT_PREFIX[component] || 'MBR';
  const key = `member_${prefix}_${year()}`;
  const seq = await nextSeq(key);
  return `${prefix}-${year()}-${pad(seq)}`;
}

/** Catatan anggota */
export async function generateMemberNoteId(): Promise<string> {
  const seq = await nextSeq(`member_note_${year()}`);
  return `NOTE-${year()}-${pad(seq)}`;
}

/** Prayer request */
export async function generatePrayerRequestId(): Promise<string> {
  const seq = await nextSeq(`prayer_${year()}`);
  return `PRY-${year()}-${pad(seq)}`;
}

/** Follow-up log */
export async function generateFollowUpId(): Promise<string> {
  const seq = await nextSeq(`followup_${year()}`);
  return `FUP-${year()}-${pad(seq)}`;
}

/** Small Group */
export async function generateSmallGroupId(): Promise<string> {
  const seq = await nextSeq(`sg_${year()}`);
  return `KTB-${year()}-${pad(seq)}`;
}

/** Meeting log */
export async function generateMeetingLogId(): Promise<string> {
  const seq = await nextSeq(`meeting_${year()}`);
  return `MTG-${year()}-${pad(seq)}`;
}

/** Material / kurikulum */
export async function generateMaterialId(): Promise<string> {
  const seq = await nextSeq(`material_${year()}`);
  return `MAT-${year()}-${pad(seq)}`;
}

/** Transaksi keuangan */
export async function generateTransactionId(): Promise<string> {
  const seq = await nextSeq(`tx_${year()}`);
  return `TX-${year()}-${pad(seq)}`;
}

/** Kategori keuangan */
export async function generateCategoryId(): Promise<string> {
  const seq = await nextSeq(`cat_${year()}`);
  return `CAT-${year()}-${pad(seq)}`;
}

/** Partner / mitra */
export async function generatePartnerId(): Promise<string> {
  const seq = await nextSeq(`partner_${year()}`);
  return `PTR-${year()}-${pad(seq)}`;
}

/** Donasi */
export async function generateDonationId(): Promise<string> {
  const seq = await nextSeq(`donation_${year()}`);
  return `DON-${year()}-${pad(seq)}`;
}

/** Staff NIK */
export async function generateStaffNik(): Promise<string> {
  const seq = await nextSeq('staff_nik');
  return `NIK-${pad(seq, 4)}`;
}

/** Surat masuk */
export async function generateInwardLetterId(): Promise<string> {
  const seq = await nextSeq(`inward_${year()}`);
  return `SM-${year()}-${pad(seq)}`;
}

/** Nomor surat keluar resmi: 001/SK/MMB/VI/2026 */
const ROMAN_MONTHS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
export async function generateOutwardLetterNumber(templateType: string): Promise<string> {
  const typeCode = templateType === 'SK' ? 'SK'
    : templateType === 'Surat Tugas' ? 'ST'
    : templateType === 'Surat Keterangan' ? 'Ket'
    : templateType === 'Surat Relasi' ? 'SR'
    : templateType === 'Surat Peminjaman' ? 'SP'
    : templateType === 'Surat Permohonan' ? 'SPm'
    : 'SRT';

  const key = `outward_${typeCode}_${year()}`;
  const seq = await nextSeq(key);
  const now = new Date();
  const roman = ROMAN_MONTHS[now.getMonth()];
  return `${pad(seq, 3)}/${typeCode}/MMB/${roman}/${year()}`;
}

/** ID surat keluar (untuk dokumen ID di DB) */
export async function generateOutwardLetterId(): Promise<string> {
  const seq = await nextSeq(`outward_${year()}`);
  return `SK-${year()}-${pad(seq)}`;
}

/** Approval request */
export async function generateApprovalId(module: string): Promise<string> {
  const prefix = module === 'Keuangan' ? 'APP-TX'
    : module === 'Payroll' ? 'APP-PAY'
    : module === 'Surat' ? 'APP-LTR'
    : module === 'Mitra' ? 'APP-PTR'
    : 'APP';
  const seq = await nextSeq(`approval_${year()}`);
  return `${prefix}-${year()}-${pad(seq)}`;
}

/** Kegiatan / activity */
export async function generateActivityId(): Promise<string> {
  const seq = await nextSeq(`activity_${year()}`);
  return `ACT-${year()}-${pad(seq)}`;
}

/** Activity rundown item */
export async function generateRundownId(): Promise<string> {
  const seq = await nextSeq(`rundown_${year()}`);
  return `RND-${year()}-${pad(seq)}`;
}

/** Activity preparation item */
export async function generatePreparationId(): Promise<string> {
  const seq = await nextSeq(`prep_${year()}`);
  return `PREP-${year()}-${pad(seq)}`;
}

/** Activity transaction */
export async function generateActivityTransactionId(): Promise<string> {
  const seq = await nextSeq(`acttx_${year()}`);
  return `ACTTX-${year()}-${pad(seq)}`;
}

/** Staff Task */
export async function generateStaffTaskId(): Promise<string> {
  const seq = await nextSeq(`staff_task_${year()}`);
  return `ST-${year()}-${pad(seq)}`;
}

/** Staff Meeting */
export async function generateStaffMeetingId(): Promise<string> {
  const seq = await nextSeq(`staff_meeting_${year()}`);
  return `SM-${year()}-${pad(seq)}`;
}

/** Dokumen organisasi */
export async function generateDocumentId(): Promise<string> {
  const seq = await nextSeq(`doc_${year()}`);
  return `DOC-${year()}-${pad(seq)}`;
}

/** Career History */
export async function generateCareerHistoryId(): Promise<string> {
  const seq = await nextSeq(`career_${year()}`);
  return `CAR-${year()}-${pad(seq)}`;
}
