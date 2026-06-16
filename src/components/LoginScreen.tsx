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
    <div className="min-h-screen bg-gradient-to-tr from-slate-100/90 via-sky-50/70 to-rose-50/85 text-slate-800 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans transition-all selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Decorative warm ambient background spots */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 my-4">
        
        {/* Left Side: Friendly Brand Intro & El-Shaddai Identity */}
        <div id="login-panel-left" className="lg:col-span-7 space-y-6 text-left pr-0 lg:pr-6 shrink-0">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/25 text-[#2563EB] text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-pulse"></span>
            Sistem Informasi Terpadu
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg shadow-indigo-150/50 border border-slate-100 hover:rotate-3 transition-transform duration-300">
              <MMBLogo size="100%" />
            </div>
            <div>
              <span className="text-[11px] font-black tracking-widest text-[#DC2626] uppercase block">YAYASAN MURID MUDA BERMISI</span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                MMB Finance & <br />
                <span className="text-blue-600">Management System</span>
              </h1>
            </div>
          </div>
          
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-semibold">
            Sistem tata kerja dan pelaporan eksekutif Yayasan Murid Muda Bermisi (MMB). 
            Membantu kita bersama memanajemen data komponen pelayanan, siswa, asrama mahasiswa, kelompok kecil pemuridan (KTB), anggaran 
            jurnal kas, kemitraan fundraising, serta slip gaji staf pelaksana dalam satu wadah pelayanan yang akuntabel dan penuh kasih.
          </p>
        </div> 
        
        {/* Right Side: Cozy & Clean Login Card Form */}
        <div id="login-panel-right" className="lg:col-span-5 bg-white/95 border border-indigo-100/70 backdrop-blur-lg rounded-3xl p-6 sm:p-8 shadow-xl relative">
          
          {/* TITLE HEADER BRANDED */}
          <div className="text-center space-y-2.5 mb-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-50/50 to-blue-50/55 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-md border border-indigo-100/50">
              <MMBLogo size="75%" />
            </div>
            
            {forgotStep === 'login' && (
              <>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-sans">LOGIN</h2>
                <p className="text-xs text-slate-500 font-medium font-sans">Login umum untuk seluruh pelaksana dan pengurus pelayanan</p>
              </>
            )}

            {forgotStep === 'register' && (
              <>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-sans">Daftar Operator</h2>
                <p className="text-xs text-slate-500 font-medium">Daftarkan nomor telepon untuk mengajukan akun akses baru</p>
              </>
            )}

            {forgotStep === 'email' && (
              <>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Atur Ulang Sandi</h2>
                <p className="text-xs text-slate-500 font-medium">Verifikasi email operator untuk memulai pemulihan mandiri</p>
              </>
            )}

            {forgotStep === 'challenge' && (
              <>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Tantangan Keamanan</h2>
                <p className="text-xs text-slate-500 font-medium">Jawab pertanyaan berikut untuk memverifikasi identitas Anda</p>
              </>
            )}

            {forgotStep === 'reset' && (
              <>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-sans">Sandi Baru</h2>
                <p className="text-xs text-slate-500 font-medium">Sandi minimal terdiri dari 5 karakter unik</p>
              </>
            )}
          </div>

          {/* MAIN NOTIFICATION MESSAGES */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-700 text-xs flex items-start gap-2 max-w-full overflow-hidden font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed break-words">{error}</span>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-700 text-xs flex items-start gap-2 max-w-full overflow-hidden font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed break-words">{resetSuccessMessage}</span>
            </div>
          )}

          {/* STEP 1: LOGIN FORM */}
          {forgotStep === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Email / No Telepon</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="nama@esm.or.id atau nomor telepon..."
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Sandi Akses</label>
                  <button 
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Masukkan password..."
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl pl-10 pr-12 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    disabled={isLoading}
                    required
                  />
                  
                  {/* Password Eye Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={showPassword ? "Sembunyikan Sandi" : "Lihat Sandi"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] hover:translate-y-[-1px] active:translate-y-0 text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed mt-5"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>LOGIN/MASUK</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-slate-100 text-center">
                <button 
                  type="button"
                  onClick={() => { setForgotStep('register'); setError(null); }}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  Belum punya akun? Daftar Operator Baru
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: REGISTER FORM */}
          {forgotStep === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-left">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={regName}
                  onChange={(e) => { setRegName(e.target.value); setError(null); }}
                  placeholder="Contoh: Ibu Ruth Sitorus"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-sans"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Nomor Telepon</label>
                <input 
                  type="tel" 
                  value={regPhone}
                  onChange={(e) => { setRegPhone(e.target.value); setError(null); }}
                  placeholder="Contoh: 08123456789"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Sandi Akses (Password)</label>
                <input 
                  type="password" 
                  value={regPassword}
                  onChange={(e) => { setRegPassword(e.target.value); setError(null); }}
                  placeholder="Masukkan sandi..."
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Ulangi Sandi Akses</label>
                <input 
                  type="password" 
                  value={regConfirmPassword}
                  onChange={(e) => { setRegConfirmPassword(e.target.value); setError(null); }}
                  placeholder="Ulangi sandi..."
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Pilihan Jabatan (Role)</label>
                <select 
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none transition-all"
                  disabled={isLoading}
                >
                  <option value="Staff">Staff Pelaksana</option>
                  <option value="Sekretaris">Sekretaris Yayasan</option>
                  <option value="Bendahara">Bendahara Yayasan</option>
                  <option value="Ketua Yayasan">Ketua Yayasan</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-505 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
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
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 mt-2 cursor-pointer font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Batal & Kembali
              </button>
            </form>
          )}

          {/* STEP 2: FORGOT - INPUT EMAIL */}
          {forgotStep === 'email' && (
            <form onSubmit={handleRequestChallenge} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Masukkan Email Terdaftar</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setError(null); }}
                    placeholder="Masukkan email operator Anda..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 mt-2 cursor-pointer font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali Ke Login
              </button>
            </form>
          )}

          {/* STEP 3: FORGOT - CHALLENGE QUESTION */}
          {forgotStep === 'challenge' && (
            <form onSubmit={handleVerifyChallenge} className="space-y-4 text-left">
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1">
                <span className="text-[10px] text-[#2563EB] font-bold uppercase block tracking-wider">TANTANGAN KEAMANAN :</span>
                <p className="text-xs text-slate-800 leading-relaxed font-bold">{challengeQuestion}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Jawaban Verifikasi Anda</label>
                <input 
                  type="text" 
                  value={challengeAnswer}
                  onChange={(e) => { setChallengeAnswer(e.target.value); setError(null); }}
                  placeholder="Ketik jawaban di sini..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Validasi Jawaban</span>
              </button>

              <button 
                type="button"
                onClick={() => { setForgotStep('email'); setError(null); }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 mt-2 cursor-pointer font-bold animate-pulse"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali
              </button>
            </form>
          )}

          {/* STEP 4: FORGOT - RESET TO NEW PASSWORD */}
          {forgotStep === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Password Baru</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                  placeholder="Ketik password baru Anda..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Ulangi Password Baru</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  placeholder="Ketik ulang password baru..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors animate-bounce"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Simpan Password Baru</span>
                )}
              </button>

              <button 
                type="button"
                onClick={() => { setForgotStep('login'); setError(null); }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 mt-2 cursor-pointer font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Batal & Kembali
              </button>
            </form>
          )}

          <p className="text-[10px] text-slate-400 text-center mt-6">
            Sistem dilindungi enkripsi standar industri. Riwayat audit login dan aktifitas disimpan secara otomatis di server.
          </p>
        </div>

      </div>

    </div>
  );
}
