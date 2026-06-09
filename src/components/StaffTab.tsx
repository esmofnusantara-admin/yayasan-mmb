/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Trash, 
  Edit, 
  X, 
  Lock,
  Building,
  Activity,
  Briefcase,
  Download
} from 'lucide-react';
import { Staff } from '../types';
import { exportToCSV } from '../utils/export';

interface StaffTabProps {
  staffs: Staff[];
  onAddStaff: (s: Staff) => void;
  onUpdateStaff: (s: Staff) => void;
  onDeleteStaff: (nik: string) => void;
  currentRole: string;
}

export default function StaffTab({
  staffs,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  currentRole,
}: StaffTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(staffs[0] || null);

  // Form registration states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  
  // Fields staff
  const [sNik, setSNik] = useState('');
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sEmail, setSEmail] = useState('');
  const [sAddress, setSAddress] = useState('');
  const [sPosition, setSPosition] = useState('');
  const [sDivision, setSDivision] = useState('Pelayanan Wilayah');
  const [sStatus, setSStatus] = useState<'Tetap' | 'Kontrak' | 'Magang' | 'Resigned'>('Tetap');
  
  // Base constants when registering a new staff
  const [baseSalary, setBaseSalary] = useState<number>(4500000);

  // Security authorizations for HR Directory
  const canViewHRDetails = ['Super Admin', 'Ketua Yayasan', 'Staff', 'Bendahara', 'Sekretaris'].includes(currentRole);
  const canModifyHR = ['Super Admin', 'Ketua Yayasan'].includes(currentRole);

  const openAddForm = () => {
    setEditingStaff(null);
    setSNik(`NIK-${1000 + staffs.length + 1}`);
    setSName('');
    setSPhone('');
    setSEmail('');
    setSAddress('');
    setSPosition('');
    setSDivision('Pelayanan Wilayah');
    setSStatus('Tetap');
    setBaseSalary(4500000);
    setIsFormOpen(true);
  };

  const openEditForm = (stf: Staff) => {
    setEditingStaff(stf);
    setSNik(stf.nik);
    setSName(stf.name);
    setSPhone(stf.phone || '');
    setSEmail(stf.email || '');
    setSAddress(stf.address || '');
    setSPosition(stf.position || '');
    setSDivision(stf.division || 'Pelayanan Wilayah');
    setSStatus(stf.status || 'Tetap');
    setBaseSalary(stf.salaryBase || 4500000);
    setIsFormOpen(true);
  };

  const handleSaveStaffForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName || !sPosition) {
      alert('Nama & Jabatan staf wajib diisi!');
      return;
    }

    const compiled: Staff = {
      nik: sNik,
      name: sName,
      phone: sPhone,
      email: sEmail,
      address: sAddress,
      position: sPosition,
      division: sDivision,
      status: sStatus,
      joinedDate: editingStaff ? editingStaff.joinedDate : new Date().toISOString().split('T')[0],
      salaryBase: Number(baseSalary),
      // Retain or set standard empty defaults which can be customised in Payroll panel
      allowancePosition: editingStaff ? editingStaff.allowancePosition : 300000,
      allowanceHousing: editingStaff ? editingStaff.allowanceHousing : 300000,
      allowanceTransport: editingStaff ? editingStaff.allowanceTransport : 300000,
      allowanceComm: editingStaff ? editingStaff.allowanceComm : 200000,
      bonus: editingStaff ? editingStaff.bonus : 0,
      thr: editingStaff ? editingStaff.thr : 0,
      bpjsAllowance: editingStaff ? editingStaff.bpjsAllowance : 200005,
      taxDeduction: editingStaff ? editingStaff.taxDeduction : 100000,
      bpjsDeduction: editingStaff ? editingStaff.bpjsDeduction : 100000,
      kasbonDeduction: editingStaff ? editingStaff.kasbonDeduction : 0,
      otherDeduction: editingStaff ? editingStaff.otherDeduction : 0,
      customFields: editingStaff ? editingStaff.customFields || [] : []
    };

    if (editingStaff) {
      onUpdateStaff(compiled);
    } else {
      onAddStaff(compiled);
    }
    setIsFormOpen(false);
  };

  const filteredStaffs = staffs.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.position.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.nik.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = [
      'NIK',
      'Nama Staff',
      'No. Telepon',
      'Email',
      'Alamat',
      'Jabatan',
      'Divisi',
      'Status Karyawan',
      'Tanggal Bergabung',
      'Tanggal Selesai Kontrak',
      'Gaji Pokok',
      'Tunjangan Jabatan',
      'Tunjangan Rumah'
    ];
    const keys = [
      'nik',
      'name',
      'phone',
      'email',
      'address',
      'position',
      'division',
      'status',
      'joinedDate',
      'contractEndDate',
      'salaryBase',
      'allowancePosition',
      'allowanceHousing'
    ];
    exportToCSV(filteredStaffs, headers, keys, `database_staff_${new Date().toISOString().substring(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper header action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Database Staf & Kepegawaian</h2>
          <p className="text-xs text-slate-500 mt-1">Registrasi status pelayanan, profil hubungan kontrak kerja, divisi struktural, dan legalitas karir staf ESM.</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5 shadow-sm text-xs cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Export CSV
          </button>
          {canModifyHR && (
            <button 
              onClick={openAddForm}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm text-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrasi Staff Baru
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Staff registry profile lists */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Search filter bar */}
            <div className="p-4 border-b border-slate-50 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Staf berdasarkan Nama, NIK, Divisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
              />
            </div>

            {/* Table layout */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono border-b border-slate-100">
                    <th className="p-4">NIK / Nama Lengkap</th>
                    <th className="p-4">Struktural Jabatan</th>
                    <th className="p-4">Divisi Kerja</th>
                    <th className="p-4">Status Hubungan Kerja</th>
                    <th className="p-4 border-r-0">Mulai Mengabdi</th>
                    {canModifyHR && <th className="p-4 text-center">Aksi Pelayanan</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStaffs.map((staff) => (
                    <tr 
                      key={staff.nik} 
                      onClick={() => setSelectedStaff(staff)}
                      className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                        selectedStaff?.nik === staff.nik ? 'bg-indigo-50/25 text-indigo-950 font-semibold' : ''
                      }`}
                    >
                      <td className="p-4">
                        <span className="font-mono text-[9px] font-bold text-slate-400 block tracking-widest">{staff.nik}</span>
                        <span className="font-bold text-slate-800 text-sm block mt-0.5">{staff.name}</span>
                      </td>
                      <td className="p-4 font-semibold text-slate-700">{staff.position}</td>
                      <td className="p-4 text-slate-650">{staff.division}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.status === 'Tetap' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-550'
                        }`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">{staff.joinedDate}</td>
                      {canModifyHR && (
                        <td className="p-4 text-center animate-none" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1.5 justify-center">
                            <button 
                              onClick={() => openEditForm(staff)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-205 rounded-lg text-[10px] font-semibold cursor-pointer shadow-xs"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`Apakah Anda yakin ingin menghapus data kepegawaian ${staff.name}?`)) {
                                  onDeleteStaff(staff.nik);
                                }
                              }}
                              className="p-1 px-2 hover:bg-red-50 text-red-500 border border-transparent rounded-lg text-[10px] cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 border-t border-slate-50 bg-slate-50/55 text-xs text-slate-500">
            Menampilkan {filteredStaffs.length} dari {staffs.length} Sumber Daya Manusia (SDM) Staf Yayasan
          </div>
        </div>

        {/* Details Sidebar panel (Right) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          {selectedStaff ? (
            <div className="space-y-6">
              
              <div className="text-center pb-5 border-b border-slate-50">
                <div className="w-12 h-12 bg-slate-900 border border-slate-800 text-white font-black rounded-2xl mx-auto flex items-center justify-center font-mono">
                  HR
                </div>
                <h3 className="font-bold text-slate-850 text-base mt-3.5">{selectedStaff.name}</h3>
                <span className="text-[9px] font-mono text-slate-400 font-bold tracking-widest uppercase">{selectedStaff.nik}</span>
              </div>

              <div className="space-y-5 text-xs">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">Informasi Kontak Staf</h4>
                  <div className="space-y-2 text-slate-650 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p><strong>E-mail:</strong> {selectedStaff.email || '-'}</p>
                    <p><strong>Telepon:</strong> {selectedStaff.phone || '-'}</p>
                    <p className="leading-relaxed"><strong>Alamat Domisili:</strong> {selectedStaff.address || '-'}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2.5">Histori Struktural Pelayanan</h4>
                  
                  {canViewHRDetails ? (
                    <div className="bg-indigo-50/30 border border-indigo-100/50 p-3.5 rounded-xl space-y-2 font-sans">
                      <div className="flex justify-between items-center bg-white p-2 text-[11px] rounded-lg border border-slate-150">
                        <div>
                          <span className="font-bold block text-slate-800">{selectedStaff.position}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Penempatan: {selectedStaff.division}</span>
                        </div>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500">Mulai Mengabdi: {selectedStaff.joinedDate}. Setiap mutasi ataupun perubahan divisi wajib diproses dengan surat keputusan legalitas dari Ketua Yayasan.</p>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl text-center text-slate-400 flex flex-col items-center gap-1 shadow-inner">
                      <Lock className="w-5 h-5 text-slate-300" />
                      <span className="font-semibold text-slate-600 text-[11px]">Strict Security Access</span>
                      <p className="text-[10px] px-2 text-slate-400 leading-relaxed">Sesuai SOP keamanan Yayasan, akses dibatasi khusus untuk Staf, Ketua, dan Super Admin.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-xs">
              Pilih salah satu staf untuk menelaah status hubungan kerja dan profil data kepegawaian.
            </div>
          )}
        </div>

      </div>

      {/* FORM: ADD / EDIT STAFF DIALOG MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl overflow-hidden scale-100 transition-all my-8">
            
            <div className="bg-slate-950 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <dt className="text-sm font-bold">{editingStaff ? 'Ubah Akun Data Staf' : 'Registrasi Profil Angkatan Staf Baru'}</dt>
                <dd className="text-[11px] text-slate-300">Setiap penerimaan kontrak kerja tunduk pada SK Pengurus Yayasan ESM.</dd>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveStaffForm} className="p-6 space-y-5 text-xs">
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-500 block mb-1">NIK Identitas Pegawai :</label>
                    <input 
                      type="text" 
                      value={sNik}
                      onChange={(e) => setSNik(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold bg-slate-50"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Nama Lengkap & Gelar :</label>
                    <input 
                      type="text" 
                      value={sName}
                      onChange={(e) => setSName(e.target.value)}
                      placeholder="Ahmad Faisal, S.Th."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">E-mail Yayasan :</label>
                    <input 
                      type="email" 
                      value={sEmail}
                      onChange={(e) => setSEmail(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Telepon Handphone :</label>
                    <input 
                      type="text" 
                      value={sPhone}
                      onChange={(e) => setSPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Struktural Divisi :</label>
                    <select 
                      value={sDivision}
                      onChange={(e) => setSDivision(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-2 bg-white text-slate-800"
                    >
                      <option value="Pelayanan Wilayah">Pelayanan Wilayah</option>
                      <option value="Fundraising & Mitra">Fundraising & Mitra</option>
                      <option value="Sekretariat">Sekretariat & Dokumen</option>
                      <option value="Keuangan & Audit">Keuangan & Audit</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Jabatan Struktural :</label>
                    <input 
                      type="text" 
                      value={sPosition}
                      onChange={(e) => setSPosition(e.target.value)}
                      placeholder="Koordinator Pelayanan & HR"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Status Kepegawaian :</label>
                    <select 
                      value={sStatus}
                      onChange={(e) => setSStatus(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-2 bg-white text-slate-800"
                    >
                      <option value="Tetap">Karyawan Tetap</option>
                      <option value="Kontrak">Kontrak Jangka Panjang</option>
                      <option value="Magang">Magang / Volunteer</option>
                      <option value="Resigned">Mundur / Resigned</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1 font-semibold text-indigo-700">Gaji Pokok Awal (Base) :</label>
                    <input 
                      type="number" 
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold bg-white"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-slate-500 block mb-1">Alamat Domisili :</label>
                  <textarea 
                    value={sAddress}
                    onChange={(e) => setSAddress(e.target.value)}
                    rows={2}
                    placeholder="Alamat lengkap, RT/RW, Kecamatan, Kota"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-650 hover:bg-slate-900 text-white font-semibold rounded-xl cursor-pointer shadow-md transition-colors"
                >
                  Simpan Profil Staf
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
