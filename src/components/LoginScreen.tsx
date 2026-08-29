import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Key, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  Database,
  Check,
  Server
} from 'lucide-react';
import MMBLogo from './MMBLogo';

interface AuthUser {
  email: string;
  name: string;
  role: string;
  features?: string[];
  token?: string;
}

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Flow States
  const [forgotStep, setForgotStep] = useState<'login' | 'email' | 'challenge' | 'reset' | 'register'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [challengeQuestion, setChallengeQuestion] = useState('');
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Registration States
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('Staff');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Silakan isi alamat email dan password Anda.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('esm_session_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Alamat email atau password yang Anda masukkan salah.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Gagal menghubungkan ke server otentikasi. Silakan coba beberapa saat lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError('Masukkan alamat email operator Anda.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setChallengeQuestion(data.question);
        setForgotStep('challenge');
      } else {
        setError(data.message || 'Alamat email tidak terdaftar.');
      }
    } catch (err) {
      console.error('Challenge error:', err);
      setError('Terjadi kendala server saat memproses reset sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeAnswer) {
      setError('Silakan isi jawaban pertanyaan keamanan Anda.');
      return;
    }

    setError(null);
    setForgotStep('reset');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Harap isi semua kolom password baru.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    if (newPassword.length < 5) {
      setError('Password minimal harus memiliki 5 karakter demi keamanan.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: forgotEmail, 
          answer: challengeAnswer, 
          newPassword 
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setResetSuccessMessage('Sandi operator berhasil diperbarui! Silakan login menggunakan sandi baru.');
        // Clean states and return to login
        setForgotStep('login');
        setEmail(forgotEmail);
        setPassword('');
        setForgotEmail('');
        setChallengeAnswer('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Verifikasi keamanan gagal.');
      }
    } catch (err) {
      setError('Gagal memperbarui sandi di database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regPassword || !regConfirmPassword || !regRole) {
      setError('Harap lengkapi semua kolom pendaftaran.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Konfirmasi sandi tidak cocok.');
      return;
    }

    if (regPassword.length < 5) {
      setError('Sandi minimal harus memiliki 5 karakter.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: regName, 
          phone: regPhone, 
          password: regPassword, 
          role: regRole 
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setResetSuccessMessage('Pendaftaran Diajukan: Akun Anda berhasil disimpan dan menunggu persetujuan (approval) dari Super Admin atau Ketua Yayasan.');
        setForgotStep('login');
        setEmail(regPhone); 
        setPassword('');
        
        // Clear registration form states
        setRegName('');
        setRegPhone('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegRole('Staff');
      } else {
        setError(data.message || 'Gagal mengirim berkas registrasi.');
      }
    } catch (err) {
      setError('Gagal menghubungi server database. Pastikan jaringan aktif.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-between font-sans selection:bg-[#0c2340] selection:text-white">
      {/* Top Institutional Header Stripe */}
      <div className="bg-[#0c2340] text-white py-2 px-6 text-xs border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <span className="font-semibold tracking-wider text-[11px] uppercase">Portal Eksekutif & Tata Kelola Pelayanan Yayasan</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Side: Institutional Identity */}
          <div id="login-panel-left" className="lg:col-span-7 space-y-6 text-left pr-0 lg:pr-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-lg p-2.5 flex items-center justify-center shadow-sm border border-slate-200 shrink-0">
                <MMBLogo size="100%" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-widest text-[#991b1b] uppercase block">YAYASAN MURID MUDA BERMISI</span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0c2340] leading-tight">
                  Executive Management & Financial System
                </h1>
              </div>
            </div>
            
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Sistem informasi terpadu dan tata kelola eksekutif Yayasan Murid Muda Bermisi. 
              Menyediakan platform akuntabel untuk manajemen data komponen pelayanan, asrama mahasiswa, 
              kelompok kecil pemuridan (KTB), anggaran pembukuan kas, kemitraan fundraising, serta slip gaji staf pelaksana.
            </p>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="p-3 bg-white rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Manajemen Kas</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Jurnal & Transaksi Realtime</div>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200">
                <div className="font-semibold text-slate-800">Data Pelayanan</div>
                <div className="text-slate-500 text-[11px] mt-0.5">KTB & Anggota Pelayanan</div>
              </div>
              <div className="p-3 bg-white rounded border border-slate-200 col-span-2 sm:col-span-1">
                <div className="font-semibold text-slate-800">Tata Kelola Surat</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Dokumen & Kop Resmi</div>
              </div>
            </div>
          </div> 
          
          {/* Right Side: Clean Login Card Form */}
          <div id="login-panel-right" className="lg:col-span-5 bg-white border border-slate-300 rounded-lg p-6 sm:p-8 shadow-sm">
            
            {/* Title Header */}
            <div className="text-left space-y-1 mb-6 pb-4 border-b border-slate-200">
              {forgotStep === 'login' && (
                <>
                  <h2 className="text-xl font-bold text-[#0c2340] tracking-tight">Masuk ke Sistem</h2>
                  <p className="text-xs text-slate-500">Masukkan email atau nomor telepon operator terdaftar</p>
                </>
              )}

              {forgotStep === 'register' && (
                <>
                  <h2 className="text-xl font-bold text-[#0c2340] tracking-tight">Daftar Operator Baru</h2>
                  <p className="text-xs text-slate-500">Lengkapi formulir untuk mengajukan akun akses baru</p>
                </>
              )}

              {forgotStep === 'email' && (
                <>
                  <h2 className="text-xl font-bold text-[#0c2340] tracking-tight">Pemulihan Kata Sandi</h2>
                  <p className="text-xs text-slate-500">Verifikasi email operator untuk memulai proses reset sandi</p>
                </>
              )}

              {forgotStep === 'challenge' && (
                <>
                  <h2 className="text-xl font-bold text-[#0c2340] tracking-tight">Verifikasi Keamanan</h2>
                  <p className="text-xs text-slate-500">Jawab pertanyaan keamanan akun Anda</p>
                </>
              )}

              {forgotStep === 'reset' && (
                <>
                  <h2 className="text-xl font-bold text-[#0c2340] tracking-tight">Buat Kata Sandi Baru</h2>
                  <p className="text-xs text-slate-500">Masukkan kata sandi baru (minimal 5 karakter)</p>
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {resetSuccessMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed">{resetSuccessMessage}</span>
              </div>
            )}

            {/* STEP 1: LOGIN FORM */}
            {forgotStep === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Email atau No. Telepon</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="nama@email.com atau 0812..."
                      className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700">Kata Sandi</label>
                    <button 
                      type="button"
                      onClick={() => setForgotStep('email')}
                      className="text-xs text-[#0c2340] hover:underline font-medium cursor-pointer"
                    >
                      Lupa Kata Sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="Masukkan kata sandi..."
                      className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded pl-9 pr-10 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title={showPassword ? "Sembunyikan Sandi" : "Lihat Sandi"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-xs"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Masuk ke Sistem</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-4 border-t border-slate-200 text-center">
                  <button 
                    type="button"
                    onClick={() => { setForgotStep('register'); setError(null); }}
                    className="text-xs text-[#0c2340] hover:underline font-medium cursor-pointer"
                  >
                    Belum memiliki akun? Ajukan Pendaftaran Operator
                  </button>
                </div>
              </form>
            )}

            {/* STEP 5: REGISTER FORM */}
            {forgotStep === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nama Lengkap</label>
                  <input 
                    type="text" 
                    value={regName}
                    onChange={(e) => { setRegName(e.target.value); setError(null); }}
                    placeholder="Contoh: Ibu Ruth Sitorus"
                    className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nomor Telepon</label>
                  <input 
                    type="tel" 
                    value={regPhone}
                    onChange={(e) => { setRegPhone(e.target.value); setError(null); }}
                    placeholder="Contoh: 08123456789"
                    className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kata Sandi</label>
                  <input 
                    type="password" 
                    value={regPassword}
                    onChange={(e) => { setRegPassword(e.target.value); setError(null); }}
                    placeholder="Masukkan kata sandi..."
                    className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Ulangi Kata Sandi</label>
                  <input 
                    type="password" 
                    value={regConfirmPassword}
                    onChange={(e) => { setRegConfirmPassword(e.target.value); setError(null); }}
                    placeholder="Ulangi kata sandi..."
                    className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Pilihan Jabatan (Role)</label>
                  <select 
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded px-3 py-2 text-sm text-slate-800 focus:outline-none transition-colors"
                    disabled={isLoading}
                  >
                    <option value="Volunteer">Volunteer / Relawan Pelayanan</option>
                    <option value="Staff">Staff Pelaksana</option>
                    <option value="Sekretaris">Sekretaris Yayasan</option>
                    <option value="Bendahara">Bendahara Yayasan</option>
                    <option value="Pengawas Yayasan">Pengawas Yayasan</option>
                    <option value="Ketua Yayasan">Ketua Yayasan</option>
                    <option value="Pembina Yayasan">Pembina Yayasan</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Ajukan Pendaftaran Akun</span>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => { setForgotStep('login'); setError(null); }}
                  className="w-full text-center text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 mt-2 cursor-pointer font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Batal & Kembali ke Login
                </button>
              </form>
            )}

            {/* STEP 2: FORGOT - INPUT EMAIL */}
            {forgotStep === 'email' && (
              <form onSubmit={handleRequestChallenge} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Email Operator Terdaftar</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setError(null); }}
                      placeholder="Masukkan email operator..."
                      className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Verifikasi Email & Lanjutkan</span>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => { setForgotStep('login'); setError(null); }}
                  className="w-full text-center text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 mt-2 cursor-pointer font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali Ke Login
                </button>
              </form>
            )}

            {/* STEP 3: FORGOT - CHALLENGE QUESTION */}
            {forgotStep === 'challenge' && (
              <form onSubmit={handleVerifyChallenge} className="space-y-4 text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                  <span className="text-[11px] text-[#0c2340] font-bold uppercase tracking-wider">Pertanyaan Keamanan :</span>
                  <p className="text-sm text-slate-800 font-medium">{challengeQuestion}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Jawaban Anda</label>
                  <input 
                    type="text" 
                    value={challengeAnswer}
                    onChange={(e) => { setChallengeAnswer(e.target.value); setError(null); }}
                    placeholder="Ketik jawaban Anda..."
                    className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>Validasi Jawaban</span>
                </button>

                <button 
                  type="button"
                  onClick={() => { setForgotStep('email'); setError(null); }}
                  className="w-full text-center text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 mt-2 cursor-pointer font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>
              </form>
            )}

            {/* STEP 4: FORGOT - RESET TO NEW PASSWORD */}
            {forgotStep === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Kata Sandi Baru</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                    placeholder="Ketik kata sandi baru..."
                    className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded px-3 py-2 text-sm text-slate-800 focus:outline-none transition-colors"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Ulangi Kata Sandi Baru</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    placeholder="Ketik ulang kata sandi..."
                    className="w-full bg-white border border-slate-300 focus:border-[#0c2340] focus:ring-1 focus:ring-[#0c2340] rounded px-3 py-2 text-sm text-slate-800 focus:outline-none transition-colors"
                    disabled={isLoading}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0c2340] hover:bg-[#1b365d] text-white font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Simpan Kata Sandi Baru</span>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => { setForgotStep('login'); setError(null); }}
                  className="w-full text-center text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 mt-2 cursor-pointer font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Batal & Kembali
                </button>
              </form>
            )}

            <p className="text-[11px] text-slate-400 text-center mt-6">
              Sistem dilindungi otentikasi terenkripsi. Riwayat login operator tercatat dalam log audit resmi.
            </p>
          </div>

        </div>
      </div>

      {/* Institutional Footer */}
      <footer className="py-4 px-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        <p>© {new Date().getFullYear()} Yayasan Murid Muda Bermisi (MMB) — Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  );
}
