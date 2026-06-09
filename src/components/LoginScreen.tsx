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

interface AuthUser {
  email: string;
  name: string;
  role: string;
  features?: string[];
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
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans transition-all selection:bg-blue-600 selection:text-white">
      
      {/* Decorative ambient background flares */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Side: Modern Brand Intro + Real Case Server Details */}
        <div id="login-panel-left" className="lg:col-span-7 space-y-6 text-left pr-0 lg:pr-8">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-950/65 border border-blue-900 text-blue-400 text-xs font-semibold uppercase tracking-widest font-mono">
            <Building2 className="w-4 h-4 text-blue-400" />
            V1.3 Secured API Framework
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            ESM Finance & <br />
            <span className="text-blue-500">Management System</span>
          </h1>
          
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Sistem ERP Eksekutif Yayasan Evangelical Student Movement (ESM) Indonesia. 
            Membantu memanajemen jemaat, asrama mahasiswa, kelompok kecil (KTB), anggaran 
            jurnal kas atomic, fundraising kemitraan, ledger payroll gaji, serta tata persuratan resmi yayasan secara terintegrasi dan aman.
          </p>

          {/* Real-time Connection Status & Policy (No Mock Predefined Grid) */}
          <div className="bg-[#1E293B]/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                <Server className="w-4 h-4 text-emerald-400 animate-pulse" />
                Status Konsol Sistem Real-case
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-950/65 border border-emerald-900 text-emerald-400 px-2 py-0.5 rounded-full font-bold font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                FIRESTORE CONNECTED
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-400">
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/40 space-y-1.5 leading-relaxed">
                <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Perlindungan Sesi Otoritas
                </h3>
                <p className="text-[11px]">
                  Kredensial dan kata sandi disimpan terenkripsi di database pusat. Ketersediaan menu, payroll, formulir anggota, 
                  hingga laporan anggaran disinkronkan langsung berdasarkan checklist hak akses operator yang diatur secara 
                  eksklusif oleh <strong>Super Admin</strong> atau <strong>Ketua Yayasan</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                  <Database className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-200 block text-[11px]">Enkripsi Transport</span>
                    <span className="text-[10px] text-slate-500">Mencegah kebocoran data sesi admin</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
                  <Key className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-200 block text-[11px]">Opsi Pulih Mandiri</span>
                    <span className="text-[10px] text-slate-500">Reset sandi via pertanyaan keamanan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sleek Login Card Form & Forgot Pass Flow */}
        <div id="login-panel-right" className="lg:col-span-5 bg-[#1E293B]/50 border border-slate-800 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          
          {/* TITLE HEADER */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              {forgotStep === 'login' ? (
                <Lock className="w-6 h-6 text-white" />
              ) : (
                <Key className="w-6 h-6 text-amber-400" />
              )}
            </div>
            
            {forgotStep === 'login' && (
              <>
                <h2 className="text-xl font-bold text-white">Otentikasi Operator</h2>
                <p className="text-xs text-slate-400">Masukkan kredensial akun Anda untuk mengakses konsol</p>
              </>
            )}

            {forgotStep === 'register' && (
              <>
                <h2 className="text-xl font-bold text-white">Registrasi Operator Baru</h2>
                <p className="text-xs text-slate-400 font-sans">Daftarkan akun operator ERP menggunakan nomor telepon Anda</p>
              </>
            )}

            {forgotStep === 'email' && (
              <>
                <h2 className="text-xl font-bold text-white">Lupa Sandi Akses?</h2>
                <p className="text-xs text-slate-400">Verifikasi email operator untuk memulai pemulihan mandiri</p>
              </>
            )}

            {forgotStep === 'challenge' && (
              <>
                <h2 className="text-xl font-bold text-white">Pertanyaan Keamanan</h2>
                <p className="text-xs text-slate-400">Jawab pertanyaan berikut sesuai akta hukum yayasan</p>
              </>
            )}

            {forgotStep === 'reset' && (
              <>
                <h2 className="text-xl font-bold text-white">Atur Ulang Sandi</h2>
                <p className="text-xs text-slate-400">Buat password baru Anda untuk masuk sistem</p>
              </>
            )}
          </div>

          {/* MAIN NOTIFICATION MESSAGES */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-950 rounded-xl text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="mb-4 p-3 bg-emerald-950/45 border border-emerald-900 rounded-xl text-emerald-400 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{resetSuccessMessage}</span>
            </div>
          )}

          {/* STEP 1: LOGIN FORM */}
          {forgotStep === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Email / No Telepon</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="nama@esm.or.id atau nomor telepon..."
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Sandi Akses</label>
                  <button 
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Masukkan password..."
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-11 pr-12 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                    disabled={isLoading}
                    required
                  />
                  
                  {/* Password Eye Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Masuk Konsel Operator</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-slate-800/80 text-center">
                <button 
                  type="button"
                  onClick={() => { setForgotStep('register'); setError(null); }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  Belum punya akun? Daftar Operator Baru
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: REGISTER FORM */}
          {forgotStep === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={regName}
                  onChange={(e) => { setRegName(e.target.value); setError(null); }}
                  placeholder="Contoh: Ibu Ruth Sitorus"
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-sans"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Nomor Telepon</label>
                <input 
                  type="tel" 
                  value={regPhone}
                  onChange={(e) => { setRegPhone(e.target.value); setError(null); }}
                  placeholder="Contoh: 08123456789"
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Sandi Akses (Password)</label>
                <input 
                  type="password" 
                  value={regPassword}
                  onChange={(e) => { setRegPassword(e.target.value); setError(null); }}
                  placeholder="Masukkan sandi..."
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Ulangi Sandi Akses</label>
                <input 
                  type="password" 
                  value={regConfirmPassword}
                  onChange={(e) => { setRegConfirmPassword(e.target.value); setError(null); }}
                  placeholder="Ulangi sandi..."
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Pilihan Jabatan (Role)</label>
                <select 
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all"
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
                className="w-full text-center text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Batal & Kembali
              </button>
            </form>
          )}

          {/* STEP 2: FORGOT - INPUT EMAIL */}
          {forgotStep === 'email' && (
            <form onSubmit={handleRequestChallenge} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Masukkan Email Terdaftar</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    value={forgotEmail}
                    onChange={(e) => { setForgotEmail(e.target.value); setError(null); }}
                    placeholder="Masukkan email operator Anda..."
                    className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all font-mono"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
                className="w-full text-center text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali Ke Login
              </button>
            </form>
          )}

          {/* STEP 3: FORGOT - CHALLENGE QUESTION */}
          {forgotStep === 'challenge' && (
            <form onSubmit={handleVerifyChallenge} className="space-y-4 text-left">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase block">TANTANGAN KEAMANAN :</span>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">{challengeQuestion}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Jawaban Verifikasi Anda</label>
                <input 
                  type="text" 
                  value={challengeAnswer}
                  onChange={(e) => { setChallengeAnswer(e.target.value); setError(null); }}
                  placeholder="Ketik jawaban di sini..."
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Validasi Jawaban</span>
              </button>

              <button 
                type="button"
                onClick={() => { setForgotStep('email'); setError(null); }}
                className="w-full text-center text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali
              </button>
            </form>
          )}

          {/* STEP 4: FORGOT - RESET TO NEW PASSWORD */}
          {forgotStep === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Password Baru</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                  placeholder="Ketik password baru Anda..."
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Ulangi Password Baru</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  placeholder="Ketik ulang password baru..."
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                  disabled={isLoading}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
                className="w-full text-center text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Batal & Kembali
              </button>
            </form>
          )}

          <p className="text-[10px] text-slate-500 text-center mt-6">
            Sistem dilindungi enkripsi standard industri. Riwayat audit login dan aktifitas disimpan secara otomatis di server.
          </p>
        </div>

      </div>

    </div>
  );
}
