import React, { useState, useEffect } from 'react';
import { initialStudents } from './data/defaultStudents';
import { Student, AccessLog, SchoolSettings } from './types';
import SiswaDashboard from './components/SiswaDashboard';
import GuruDashboard from './components/GuruDashboard';
import { 
  School, 
  Terminal, 
  LogIn, 
  UserCheck, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

type UserRole = 'role' | 'guru' | 'siswa';

export default function App() {
  const [role, setRole] = useState<UserRole>('role');
  
  // App States
  const [students, setStudents] = useState<Student[]>([]);
  const [kkm, setKkm] = useState<number>(75);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  
  // Custom Branding States
  const [appName, setAppName] = useState<string>('Sistem Informasi Nilai Siswa (SINS)');
  const [appLogo, setAppLogo] = useState<string>('🎓');

  // School Identity & Wali Kelas Settings
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    namaSekolah: 'SD Negeri SukaMaju 1',
    npsn: '20261234',
    alamatSekolah: 'Jl. Raya Pendidikan No. 45',
    kecamatan: 'Sukasari',
    kabupaten: 'Bandung',
    provinsi: 'Jawa Barat',
    namaWali: 'Asep Sunandar, S.Pd.',
    nipWali: '198712122010121001',
    pangkatWali: 'Penata Muda / IIIa',
    showRaporCard: true,
    showBiodataCard: true,
    showNisnCard: true,
  });


  // Login input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Initializing App State from LocalStorage or Default Seed Data
  useEffect(() => {
    const savedStudents = localStorage.getItem('sins_students');
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    } else {
      localStorage.setItem('sins_students', JSON.stringify(initialStudents));
      setStudents(initialStudents);
    }

    const savedKkm = localStorage.getItem('sins_kkm');
    if (savedKkm) {
      setKkm(Number(savedKkm));
    } else {
      localStorage.setItem('sins_kkm', '75');
      setKkm(75);
    }

    const savedAppName = localStorage.getItem('sins_app_name');
    if (savedAppName) {
      setAppName(savedAppName);
    }

    const savedAppLogo = localStorage.getItem('sins_app_logo');
    if (savedAppLogo) {
      setAppLogo(savedAppLogo);
    }

    const savedSchoolSettings = localStorage.getItem('sins_school_settings');
    if (savedSchoolSettings) {
      const parsed = JSON.parse(savedSchoolSettings);
      setSchoolSettings({
        showRaporCard: true,
        showBiodataCard: true,
        showNisnCard: true,
        ...parsed
      });
    }

    const savedLogs = localStorage.getItem('sins_access_logs');
    if (savedLogs) {
      setAccessLogs(JSON.parse(savedLogs));
    } else {
      const defaultLogs: AccessLog[] = [
        {
          id: 'log_1',
          name: 'Ahmad Fauzi',
          nisn: '0091234561',
          role: 'siswa',
          timestamp: '25/06/2026, 18:35:10',
          activity: 'Mengakses transkrip nilai Semester 1'
        },
        {
          id: 'log_2',
          name: 'Budi Santoso',
          nisn: '0091234562',
          role: 'siswa',
          timestamp: '25/06/2026, 18:50:45',
          activity: 'Mengakses transkrip nilai Semester 2'
        },
        {
          id: 'log_3',
          name: 'Guru Wali Kelas',
          nisn: 'admin',
          role: 'guru',
          timestamp: '25/06/2026, 19:12:05',
          activity: 'Masuk ke Dashboard Guru'
        }
      ];
      localStorage.setItem('sins_access_logs', JSON.stringify(defaultLogs));
      setAccessLogs(defaultLogs);
    }
  }, []);

  const handleAddAccessLog = (name: string, nisn: string, role: 'guru' | 'siswa' | 'tamu', activity: string) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: '2-digit',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const newLog: AccessLog = {
      id: String(Date.now() + Math.random()),
      name,
      nisn,
      role,
      timestamp: formattedDate,
      activity
    };

    setAccessLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem('sins_access_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateStudents = (updated: Student[]) => {
    setStudents(updated);
    localStorage.setItem('sins_students', JSON.stringify(updated));
  };

  const handleUpdateKkm = (updatedKkm: number) => {
    setKkm(updatedKkm);
    localStorage.setItem('sins_kkm', String(updatedKkm));
  };

  const handleUpdateAppName = (name: string) => {
    setAppName(name);
    localStorage.setItem('sins_app_name', name);
  };

  const handleUpdateAppLogo = (logo: string) => {
    setAppLogo(logo);
    localStorage.setItem('sins_app_logo', logo);
  };

  const handleUpdateSchoolSettings = (updated: SchoolSettings) => {
    setSchoolSettings(updated);
    localStorage.setItem('sins_school_settings', JSON.stringify(updated));
  };

  const handleGuruLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password.trim() === '123456') {
      setIsLoggedIn(true);
      setRole('guru');
      setLoginError('');
      handleAddAccessLog('Guru Wali Kelas', 'admin', 'guru', 'Masuk ke Dashboard Guru');
    } else {
      setLoginError('Username atau password salah! (Hint: admin / 123456)');
      handleAddAccessLog('Percobaan Gagal', username || 'anonim', 'tamu', 'Gagal masuk login pendidik');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setRole('role');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      
      <div className="flex-grow flex flex-col">
        
        {/* 1. ROLE PORTAL SELECTOR */}
        {role === 'role' && (
          <div className="flex-grow flex items-center justify-center px-4 py-16 bg-gradient-to-tr from-blue-500/10 via-slate-50 to-green-500/10 min-h-[calc(100vh-140px)]">
            <div className="w-full max-w-md space-y-4 animate-fade-in">
              
              {/* Selectors Cards */}
              <div className="bg-white/90 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-slate-800">Akses Masuk Sistem</h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Guru Trigger */}
                  <button 
                    onClick={() => setRole('guru')}
                    className="group p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-300 rounded-2xl flex items-center justify-between transition-all hover:scale-[1.01] text-left hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md group-hover:scale-110 transition-all flex-shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-xs">Login Guru</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Kelola database nilai & konfigurasi sekolah</p>
                      </div>
                    </div>
                    <LogIn className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-all" />
                  </button>

                  {/* Siswa Trigger */}
                  <button 
                    onClick={() => setRole('siswa')}
                    className="group p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 hover:border-green-300 rounded-2xl flex items-center justify-between transition-all hover:scale-[1.01] text-left hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-600 text-white rounded-xl shadow-md group-hover:scale-110 transition-all flex-shrink-0">
                        <LogIn className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-xs">Akses Siswa</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">Cari dan lihat transkrip hasil belajar mandiri</p>
                      </div>
                    </div>
                    <LogIn className="w-4 h-4 text-green-600 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* 2. GURU LOGIN SCREEN (If clicked Guru but not yet logged in) */}
        {role === 'guru' && !isLoggedIn && (
          <div className="flex-grow flex items-center justify-center px-4 py-16 bg-gradient-to-tr from-blue-500/10 via-slate-50 to-green-500/10 min-h-[calc(100vh-140px)]">
            <div className="w-full max-w-md bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 animate-fade-in">
              
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setRole('role')}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Back
                </button>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[9px] font-bold rounded-full uppercase tracking-wider border border-blue-200">
                  Guru Portal
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Login Pendidik</h2>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Masukkan kredensial akun administrasi Anda</p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleGuruLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Contoh: admin" 
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password..." 
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-slate-200/15 cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: '#093f41' }}
                >
                  Masuk ke Dashboard
                </button>
              </form>

            </div>
          </div>
        )}

        {/* 3. GURU LIVE DASHBOARD (If logged in) */}
        {role === 'guru' && isLoggedIn && (
          <GuruDashboard 
            students={students}
            kkm={kkm}
            onUpdateStudents={handleUpdateStudents}
            onUpdateKkm={handleUpdateKkm}
            onLogout={handleLogout}
            username={username || 'admin'}
            appName={appName}
            onUpdateAppName={handleUpdateAppName}
            appLogo={appLogo}
            onUpdateAppLogo={handleUpdateAppLogo}
            accessLogs={accessLogs}
            onAddAccessLog={handleAddAccessLog}
            schoolSettings={schoolSettings}
            onUpdateSchoolSettings={handleUpdateSchoolSettings}
          />
        )}

        {/* 4. SISWA ACCESS SCREEN */}
        {role === 'siswa' && (
          <SiswaDashboard 
            students={students}
            kkm={kkm}
            onBackToPortal={() => setRole('role')}
            appName={appName}
            appLogo={appLogo}
            onAddAccessLog={handleAddAccessLog}
            schoolSettings={schoolSettings}
            onUpdateStudents={handleUpdateStudents}
          />
        )}

      </div>

      {/* FOOTER */}
      <footer className="text-white py-6 px-4 border-t border-slate-200/10 text-xs mt-auto" style={{ backgroundColor: '#093f41' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-bold text-white">
              {schoolSettings?.namaSekolah || 'SD Negeri SukaMaju 1'}
            </p>
            <p className="text-slate-100 font-semibold text-[11px]">Kelas 5 CD</p>
            <p className="text-[10px]" style={{ color: '#00c0a4' }}>{schoolSettings?.alamatSekolah || 'Jl. Raya Pendidikan No. 45'}</p>
          </div>
          <div className="space-y-1 text-center md:text-right">
            <p className="text-slate-100">© 2026 Kelas 5 CD. Hak Cipta Dilindungi.</p>
            <p className="text-[10px] font-semibold" style={{ color: '#00c0a4' }}>Dikembangkan oleh Agus Rijwan, S.Pd untuk kemudahan wali kelas, dan siswa sekolah.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
