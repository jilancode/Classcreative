import React, { useState, useEffect } from 'react';
import { Student, SchoolSettings } from '../types';
import { 
  Search, School, GraduationCap, Award, Trophy, Calendar, CheckCircle2, AlertCircle, 
  Printer, ArrowLeft, Shield, MessageSquare, Atom, Palette, Activity, Globe, Compass, BookOpen, Calculator, User, FileText, Check, Save, Camera, Lock
} from 'lucide-react';

interface SiswaDashboardProps {
  students: Student[];
  kkm: number;
  onBackToPortal: () => void;
  appName?: string;
  appLogo?: string;
  onAddAccessLog?: (name: string, nisn: string, role: 'guru' | 'siswa' | 'tamu', activity: string) => void;
  schoolSettings?: SchoolSettings;
  onUpdateStudents?: (students: Student[]) => void;
}

const TutWuriSvg = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
    {/* Base shield */}
    <polygon points="50,5 92,30 92,72 50,95 8,72 8,30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    
    {/* Center white wings / Garuda body */}
    <path d="M 50,45 C 32,43 20,54 20,72 C 34,72 42,65 50,55 C 58,65 66,72 80,72 C 80,54 68,43 50,45 Z" fill="currentColor" />
    
    {/* Additional wings/feathers details */}
    <path d="M 50,45 C 38,40 28,48 28,62 C 38,62 45,56 50,50 C 55,50 62,62 72,62 C 72,48 62,40 50,45 Z" fill="currentColor" opacity="0.8" />
    
    {/* Center Torch */}
    <path d="M 50,15 L 47,28 L 53,28 Z" fill="currentColor" />
    <path d="M 50,28 C 44,28 42,34 42,42 C 42,50 46,54 50,54 C 54,54 58,50 58,42 C 58,34 56,28 50,28 Z" fill="currentColor" opacity="0.9" />
    
    {/* Center Fire (Red/Orange accent) */}
    <path d="M 50,24 C 47,24 45,28 45,35 Q 50,45 55,35 C 55,28 53,24 50,24 Z" fill="#ef4444" />
    <circle cx="50" cy="42" r="3.5" fill="#f59e0b" />
  </svg>
);

const ThreePeopleSvg = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 120 100" className={className}>
    {/* Left person (Green) */}
    <g transform="translate(10, 5)">
      <circle cx="25" cy="25" r="11" fill="url(#greenHeadGrad)" className="drop-shadow-sm" />
      <path d="M 25,38 C 12,38 2,48 2,72 L 48,72 C 48,48 38,38 25,38 Z" fill="url(#greenBodyGrad)" />
    </g>
    
    {/* Center person (Grey/White) */}
    <g transform="translate(35, 0)">
      <circle cx="25" cy="25" r="12" fill="url(#greyHeadGrad)" className="drop-shadow-sm" />
      <path d="M 25,39 C 10,39 0,50 0,76 L 50,76 C 50,50 40,39 25,39 Z" fill="url(#greyBodyGrad)" />
    </g>

    {/* Right person (Blue) */}
    <g transform="translate(60, 5)">
      <circle cx="25" cy="25" r="11" fill="url(#blueHeadGrad)" className="drop-shadow-sm" />
      <path d="M 25,38 C 12,38 2,48 2,72 L 48,72 C 48,48 38,38 25,38 Z" fill="url(#blueBodyGrad)" />
    </g>

    {/* Gradients */}
    <defs>
      <linearGradient id="greenHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
        <stop offset="100%" stopColor="#15803d" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="greenBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
        <stop offset="100%" stopColor="#14532d" stopOpacity="1" />
      </linearGradient>
      
      <linearGradient id="greyHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f1f5f9" stopOpacity="1" />
        <stop offset="100%" stopColor="#64748b" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="greyBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" stopOpacity="1" />
        <stop offset="100%" stopColor="#334155" stopOpacity="1" />
      </linearGradient>

      <linearGradient id="blueHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="blueBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
        <stop offset="100%" stopColor="#1e3a8a" stopOpacity="1" />
      </linearGradient>
    </defs>
  </svg>
);

export default function SiswaDashboard({ 
  students, 
  kkm, 
  onBackToPortal,
  appName = "SINS SCHOOL",
  appLogo = "🎓",
  onAddAccessLog,
  schoolSettings,
  onUpdateStudents
}: SiswaDashboardProps) {
  const [searchNisn, setSearchNisn] = useState('');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSemester, setActiveSemester] = useState<1 | 2>(1);
  const [studentTab, setStudentTab] = useState<'rapor' | 'biodata' | 'kartu'>('rapor');
  const [biodataForm, setBiodataForm] = useState<Partial<Student>>({});
  const [isAgreed, setIsAgreed] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<'menu' | 'cek_nilai' | 'isi_data' | 'cetak_kartu'>('menu');

  useEffect(() => {
    if (foundStudent) {
      setBiodataForm({ 
        ...foundStudent,
        agama: foundStudent.agama || 'Islam',
        lp: foundStudent.lp || 'L'
      });
      setIsAgreed(foundStudent.isBiodataConfirmed || false);
    }
  }, [foundStudent]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNisn = searchNisn.trim();
    if (!cleanNisn) return;

    const student = students.find(s => s.nisn === cleanNisn);
    setSearched(true);
    
    if (student) {
      setFoundStudent(student);
      setErrorMsg('');
      let logActivity = '';
      if (selectedFeature === 'cek_nilai') {
        logActivity = `Mengakses transkrip nilai Semester ${activeSemester} (Mandiri)`;
      } else if (selectedFeature === 'isi_data') {
        logActivity = `Mengakses pengisian data profil mandiri`;
      } else if (selectedFeature === 'cetak_kartu') {
        logActivity = `Mengakses pencetakan kartu NISN digital`;
      } else {
        logActivity = `Mengakses transkrip nilai Semester ${activeSemester}`;
      }
      onAddAccessLog?.(student.nama, student.nisn, 'siswa', logActivity);
    } else {
      setFoundStudent(null);
      setErrorMsg(`NISN "${cleanNisn}" tidak ditemukan di sistem. Harap hubungi wali kelas Anda.`);
      onAddAccessLog?.('Tamu / Wali Siswa', cleanNisn, 'tamu', `Mencari NISN "${cleanNisn}" di fitur ${selectedFeature || 'siswa'} tetapi tidak ditemukan`);
    }
  };

  useEffect(() => {
    if (foundStudent && selectedFeature === 'cek_nilai') {
      onAddAccessLog?.(foundStudent.nama, foundStudent.nisn, 'siswa', `Melihat Nilai Semester ${activeSemester}`);
    }
  }, [activeSemester]);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveBiodata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgreed) {
      alert("Harap centang konfirmasi pernyataan kebenaran data terlebih dahulu.");
      return;
    }
    if (!foundStudent || !onUpdateStudents) {
      alert("Sistem gagal memperbarui data. Hubungi admin sekolah.");
      return;
    }

    const updatedStudent: Student = {
      ...foundStudent,
      ...biodataForm,
      isBiodataConfirmed: true
    };

    const nextStudents = students.map(s => s.nisn === foundStudent.nisn ? updatedStudent : s);
    onUpdateStudents(nextStudents);
    onAddAccessLog?.(updatedStudent.nama, updatedStudent.nisn, 'siswa', 'Mengisi dan memperbarui biodata mandiri');
    alert("Biodata mandiri Anda berhasil disimpan dan dikonfirmasi secara sah!");
    
    // Clear student access and return to menu
    setFoundStudent(null);
    setSearchNisn('');
    setSearched(false);
    setErrorMsg('');
    setSelectedFeature('menu');
  };

  const handleSaveCardData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundStudent || !onUpdateStudents) {
      alert("Sistem gagal memperbarui data. Hubungi admin sekolah.");
      return;
    }

    const updatedStudent: Student = {
      ...foundStudent,
      ...biodataForm,
    };

    const nextStudents = students.map(s => s.nisn === foundStudent.nisn ? updatedStudent : s);
    onUpdateStudents(nextStudents);
    setFoundStudent(updatedStudent);
    onAddAccessLog?.(updatedStudent.nama, updatedStudent.nisn, 'siswa', 'Memperbarui data siswa dari menu Cetak Kartu NISN');
    alert("Data kartu NISN berhasil diperbarui dan disimpan secara sah!");
  };

  // Helper to generate encouraging words from teacher based on grades and ranking
  const getTeacherMessage = (student: Student) => {
    const fullName = student.nama || '';
    
    // Get short name based on custom rules:
    // - Use first name (nama depan).
    // - If first name is "muhammad" or "muhamad" or variations, use first and middle name.
    const getShortName = (nameStr: string) => {
      if (!nameStr) return '';
      const parts = nameStr.trim().split(/\s+/);
      if (parts.length === 0) return '';
      const firstPart = parts[0];
      const normalized = firstPart.toLowerCase();
      const muhammadVariations = ['muhammad', 'muhamad', 'mohammad', 'mohamad', 'm.', 'muh.'];
      if (muhammadVariations.includes(normalized)) {
        if (parts.length > 1) {
          return `${parts[0]} ${parts[1]}`;
        }
      }
      return firstPart;
    };

    const name = getShortName(fullName);
    const avg = activeSemester === 1 ? student.nilaiAkhir : student.nilaiAkhir_s2;
    const isLulusValue = avg !== undefined ? avg >= kkm : false;
    const ranking = activeSemester === 1 ? student.ranking : student.ranking_s2;

    // Find highest and lowest subjects
    const subjectsWithValues = activeSemester === 1 ? [
      { name: 'Pendidikan Agama Islam (PAI)', score: student.pai ?? 0 },
      { name: 'Pendidikan Pancasila (PKN)', score: student.pkn ?? 0 },
      { name: 'Bahasa Indonesia', score: student.bInd ?? 0 },
      { name: 'Matematika', score: student.mtk ?? 0 },
      { name: 'IPAS', score: student.ipas ?? 0 },
      { name: 'Seni Budaya', score: student.seni ?? 0 },
      { name: 'PJOK', score: student.pjok ?? 0 },
      { name: 'Bahasa Inggris', score: student.bIng ?? 0 },
      { name: 'Bahasa Sunda', score: student.bSnd ?? 0 }
    ] : [
      { name: 'Pendidikan Agama Islam (PAI)', score: student.pai_s2 ?? 0 },
      { name: 'Pendidikan Pancasila (PKN)', score: student.pkn_s2 ?? 0 },
      { name: 'Bahasa Indonesia', score: student.bInd_s2 ?? 0 },
      { name: 'Matematika', score: student.mtk_s2 ?? 0 },
      { name: 'IPAS', score: student.ipas_s2 ?? 0 },
      { name: 'Seni Budaya', score: student.seni_s2 ?? 0 },
      { name: 'PJOK', score: student.pjok_s2 ?? 0 },
      { name: 'Bahasa Inggris', score: student.bIng_s2 ?? 0 },
      { name: 'Bahasa Sunda', score: student.bSnd_s2 ?? 0 }
    ];

    // Sort subjects by score
    const sortedSubjects = [...subjectsWithValues].sort((a, b) => b.score - a.score);
    const highestSub = sortedSubjects[0];
    const lowestSub = sortedSubjects[sortedSubjects.length - 1];

    if (avg >= 90) {
      return {
        title: `Pesan Istimewa dari Wali Kelas 🌟`,
        emoji: "🌟",
        colorClass: "bg-amber-50/80 border-amber-200 text-amber-900",
        iconColor: "text-amber-600",
        text: `Masha Allah, luar biasa sekali ${name}! bapa sangat bangga melihat hasil belajarmu yang luar biasa di Semester ${activeSemester} dengan rata-rata ${avg}. Kamu berhasil membuktikan bahwa ketekunan dan kerja kerasmu selama ini membuahkan hasil yang sangat gemilang${ranking && ranking <= 10 ? `, bahkan menduduki peringkat #${ranking} di kelas` : ''}. Pertahankan prestasi indah ini di jenjang berikutnya ya. Ingat untuk selalu rendah hati, rajin beribadah, dan terus bantu teman-temanmu yang membutuhkan bantuan belajar. Selamat ya!`
      };
    } else if (avg >= 80) {
      return {
        title: `Pesan Istimewa dari Wali Kelas 👍`,
        emoji: "✨",
        colorClass: "bg-emerald-50/80 border-emerald-200 text-emerald-900",
        iconColor: "text-emerald-600",
        text: `Selamat ya ${name}! Hasil belajarmu di Semester ${activeSemester} sangat bagus dan memuaskan dengan nilai rata-rata ${avg}. bapa sangat bangga melihat perkembangan belajarmu yang konsisten, terutama di pelajaran ${highestSub.name} dengan nilai ${highestSub.score}. Tingkatkan lagi belajarmu, khususnya untuk lebih teliti lagi di mata pelajaran ${lowestSub.name}. bapa yakin kamu memiliki kapasitas yang lebih besar lagi untuk bersinar di masa depan. Tetap semangat belajar dan jaga kesehatanmu selalu ya!`
      };
    } else if (isLulusValue) {
      return {
        title: `Pesan Istimewa dari Wali Kelas 📚`,
        emoji: "✏️",
        colorClass: "bg-blue-50/80 border-blue-200 text-blue-900",
        iconColor: "text-blue-600",
        text: `Alhamdulillah, selamat ya ${name}, kamu dinyatakan lulus di Semester ${activeSemester} dengan rata-rata ${avg}. bapa sangat mengapresiasi usahamu untuk melampaui standar kelulusan KKM ${kkm}. Kamu memiliki bakat yang sangat baik di pelajaran ${highestSub.name}. Namun, mari kita luangkan sedikit waktu ekstra untuk melatih kembali pelajaran ${lowestSub.name} agar nilaimu bisa lebih seimbang ke depannya. Ingat, setiap usaha kecil yang kamu lakukan hari ini akan menjadi jembatan suksesmu esok hari. Terus melangkah maju ya!`
      };
    } else {
      return {
        title: `Pesan Istimewa dari Wali Kelas ❤️`,
        emoji: "💝",
        colorClass: "bg-rose-50/80 border-rose-200 text-rose-900",
        iconColor: "text-rose-600",
        text: `${name}, bapa tahu kamu sudah berjuang dengan sekuat tenaga di Semester ${activeSemester}, dan bapa sangat menghargai usahamu itu. Jangan pernah berkecil hati atau patah semangat karena nilai rata-ratamu (${avg}) saat ini perlu perbaikan melalui remedial. Ingatlah, nilai ini hanyalah angka sementara, bukan ukuran mutlak kecerdasan dan masa depanmu. Dari lubuk hati terdalam, mari kita hadapi program remedial ini bersama-sama sebagai kesempatan emas untuk belajar kembali. Kamu sangat hebat di pelajaran ${highestSub.name}, dan jika kamu meluangkan sedikit waktu lagi untuk memfokuskan pemahaman pada pelajaran ${lowestSub.name}, bapa yakin nilaimu akan melesat naik. bapa selalu ada untuk membimbingmu. Tetap tersenyum dan semangat ya!`
      };
    }
  };

  const isLulus = foundStudent 
    ? (activeSemester === 1 ? (foundStudent.nilaiAkhir ?? 0) : (foundStudent.nilaiAkhir_s2 ?? 0)) >= kkm 
    : false;

  const subjects = foundStudent ? [
    { label: 'Pendidikan Agama Islam (PAI)', value: activeSemester === 1 ? foundStudent.pai : foundStudent.pai_s2, color: 'bg-emerald-500', icon: BookOpen },
    { label: 'Pendidikan Pancasila (PKN)', value: activeSemester === 1 ? foundStudent.pkn : foundStudent.pkn_s2, color: 'bg-blue-500', icon: Shield },
    { label: 'Bahasa Indonesia (B. IND)', value: activeSemester === 1 ? foundStudent.bInd : foundStudent.bInd_s2, color: 'bg-indigo-500', icon: MessageSquare },
    { label: 'Matematika (MTK)', value: activeSemester === 1 ? foundStudent.mtk : foundStudent.mtk_s2, color: 'bg-amber-500', icon: Calculator },
    { label: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', value: activeSemester === 1 ? foundStudent.ipas : foundStudent.ipas_s2, color: 'bg-cyan-500', icon: Atom },
    { label: 'Seni Budaya (SENI)', value: activeSemester === 1 ? foundStudent.seni : foundStudent.seni_s2, color: 'bg-rose-500', icon: Palette },
    { label: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)', value: activeSemester === 1 ? foundStudent.pjok : foundStudent.pjok_s2, color: 'bg-orange-500', icon: Activity },
    { label: 'Bahasa Inggris (B. ING)', value: activeSemester === 1 ? foundStudent.bIng : foundStudent.bIng_s2, color: 'bg-purple-500', icon: Globe },
    { label: 'Bahasa Sunda (B.SND)', value: activeSemester === 1 ? foundStudent.bSnd : foundStudent.bSnd_s2, color: 'bg-pink-500', icon: Compass },
  ] : [];

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12 bg-gradient-to-tr from-green-500/10 via-slate-50 to-blue-500/10 min-h-[calc(100vh-140px)]">
      <div className={`w-full ${foundStudent ? 'max-w-4xl' : 'max-w-2xl'} space-y-6 transition-all duration-300 animate-fade-in`}>
        
        {/* Navigation back */}
        <div className="flex items-center justify-between print:hidden">
          {selectedFeature === 'menu' ? (
            <button 
              onClick={onBackToPortal}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Portal Utama
            </button>
          ) : (
            <button 
              onClick={() => {
                setSelectedFeature('menu');
                setFoundStudent(null);
                setSearchNisn('');
                setSearched(false);
                setErrorMsg('');
              }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Menu Layanan Siswa
            </button>
          )}
          <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider border border-green-200">
            Akses Siswa
          </span>
        </div>

        {/* Feature 0: MAIN MENU CHOOSE */}
        {selectedFeature === 'menu' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2 py-4">
              <span className="px-3.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider border border-blue-200">
                Menu Akses Mandiri Siswa
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Portal Pelayanan Siswa</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan pilih salah satu layanan digital di bawah ini untuk mengakses data dan hasil belajar Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Cek Nilai */}
              {schoolSettings?.showRaporCard !== false ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFeature('cek_nilai');
                    setFoundStudent(null);
                    setSearchNisn('');
                    setSearched(false);
                    setErrorMsg('');
                  }}
                  className="group text-left bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xl rounded-2xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-56 cursor-pointer shadow-sm"
                >
                  <div className="absolute right-4 top-4 w-12 h-12 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 rounded-xl transition-all duration-300 flex items-center justify-center font-black">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="mt-8 space-y-2">
                    <h3 className="font-extrabold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">Cek Nilai Mandiri</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Pantau rapor hasil belajar, rincian nilai semester ganjil/genap, dan pesan apresiasi langsung dari wali kelas Anda.
                    </p>
                  </div>
                  <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-4 group-hover:translate-x-1 transition-transform">
                    <span>Masuk Fitur</span>
                    <span>→</span>
                  </div>
                </button>
              ) : (
                <div
                  className="relative group text-left bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between h-56 opacity-70 cursor-not-allowed shadow-sm select-none"
                  title="Akses dinonaktifkan oleh guru"
                >
                  <div className="absolute right-4 top-4 w-12 h-12 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center font-black">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="mt-8 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-slate-400">Cek Nilai Mandiri</h3>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded-md">Nonaktif</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      Pantau rapor hasil belajar, rincian nilai semester ganjil/genap, dan pesan apresiasi langsung dari wali kelas Anda.
                    </p>
                  </div>
                  <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-4">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Ditutup oleh Wali Kelas</span>
                  </div>
                </div>
              )}

              {/* Card 2: Isi Data Siswa */}
              {schoolSettings?.showBiodataCard !== false ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFeature('isi_data');
                    setFoundStudent(null);
                    setSearchNisn('');
                    setSearched(false);
                    setErrorMsg('');
                  }}
                  className="group text-left bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xl rounded-2xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-56 cursor-pointer shadow-sm"
                >
                  <div className="absolute right-4 top-4 w-12 h-12 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 rounded-xl transition-all duration-300 flex items-center justify-center font-black">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="mt-8 space-y-2">
                    <h3 className="font-extrabold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">Isi Data Siswa</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Lengkapi atau perbarui biodata mandiri Anda, data kependudukan, informasi orang tua, dan konfirmasi kebenaran data secara sah.
                    </p>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-4 group-hover:translate-x-1 transition-transform">
                    <span>Masuk Fitur</span>
                    <span>→</span>
                  </div>
                </button>
              ) : (
                <div
                  className="relative group text-left bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between h-56 opacity-70 cursor-not-allowed shadow-sm select-none"
                  title="Akses dinonaktifkan oleh guru"
                >
                  <div className="absolute right-4 top-4 w-12 h-12 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center font-black">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="mt-8 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-slate-400">Isi Data Siswa</h3>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded-md">Nonaktif</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      Lengkapi atau perbarui biodata mandiri Anda, data kependudukan, informasi orang tua, dan konfirmasi kebenaran data secara sah.
                    </p>
                  </div>
                  <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-4">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Ditutup oleh Wali Kelas</span>
                  </div>
                </div>
              )}

              {/* Card 3: Cetak Kartu NISN */}
              {schoolSettings?.showNisnCard !== false ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFeature('cetak_kartu');
                    setFoundStudent(null);
                    setSearchNisn('');
                    setSearched(false);
                    setErrorMsg('');
                  }}
                  className="group text-left bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-xl rounded-2xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-56 cursor-pointer shadow-sm"
                >
                  <div className="absolute right-4 top-4 w-12 h-12 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 rounded-xl transition-all duration-300 flex items-center justify-center font-black">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="mt-8 space-y-2">
                    <h3 className="font-extrabold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">Cetak Kartu NISN</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Cetak kartu identitas NISN digital resmi dengan foto avatarmu, barcode otentik, dan ttd wali kelas secara instan.
                    </p>
                  </div>
                  <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-4 group-hover:translate-x-1 transition-transform">
                    <span>Masuk Fitur</span>
                    <span>→</span>
                  </div>
                </button>
              ) : (
                <div
                  className="relative group text-left bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between h-56 opacity-70 cursor-not-allowed shadow-sm select-none"
                  title="Akses dinonaktifkan oleh guru"
                >
                  <div className="absolute right-4 top-4 w-12 h-12 bg-slate-200 text-slate-400 rounded-xl flex items-center justify-center font-black">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="mt-8 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-slate-400">Cetak Kartu NISN</h3>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded-md">Nonaktif</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      Cetak kartu identitas NISN digital resmi dengan foto avatarmu, barcode otentik, dan ttd wali kelas secara instan.
                    </p>
                  </div>
                  <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-4">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Ditutup oleh Wali Kelas</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feature-Specific NISN Authentication Gate */}
        {selectedFeature !== 'menu' && !foundStudent && (
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 relative overflow-hidden print:hidden animate-fade-in">
            {/* Subtle decorative background circle */}
            <div className="absolute -right-16 -top-16 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl"></div>
            
            <div className="text-center space-y-1.5 relative">
              <div className={`inline-flex items-center justify-center p-3 rounded-2xl mb-2 border text-2xl font-extrabold w-12 h-12 ${
                selectedFeature === 'cek_nilai' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                selectedFeature === 'isi_data' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {selectedFeature === 'cek_nilai' && <GraduationCap className="w-6 h-6" />}
                {selectedFeature === 'isi_data' && <User className="w-6 h-6" />}
                {selectedFeature === 'cetak_kartu' && <Award className="w-6 h-6" />}
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
                {selectedFeature === 'cek_nilai' && 'Cek Nilai Siswa Mandiri'}
                {selectedFeature === 'isi_data' && 'Lengkapi Profil Data Siswa'}
                {selectedFeature === 'cetak_kartu' && 'Cetak Kartu NISN Digital'}
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {selectedFeature === 'cek_nilai' && `Masukkan 10 digit NISN Anda untuk memverifikasi identitas dan memantau rapor nilai hasil belajar.`}
                {selectedFeature === 'isi_data' && `Masukkan 10 digit NISN Anda untuk memverifikasi identitas dan mengisi/melengkapi data profil mandiri.`}
                {selectedFeature === 'cetak_kartu' && `Masukkan 10 digit NISN Anda untuk memverifikasi identitas dan mengunduh/mencetak kartu NISN digital Anda.`}
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  maxLength={10}
                  required
                  value={searchNisn}
                  onChange={(e) => setSearchNisn(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 10 digit NISN Anda..." 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                />
              </div>
              <button 
                type="submit" 
                className={`sm:w-44 py-3 text-white font-extrabold rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedFeature === 'cek_nilai' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10' :
                  selectedFeature === 'isi_data' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10' :
                  'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Verifikasi NISN</span>
              </button>
            </form>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedFeature('menu');
                  setFoundStudent(null);
                  setSearchNisn('');
                  setSearched(false);
                  setErrorMsg('');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-extrabold flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Pilihan Fitur
              </button>
            </div>
          </div>
        )}

        {/* Not Found View */}
        {selectedFeature !== 'menu' && !foundStudent && searched && (
          <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-6 flex items-center gap-4 animate-fade-in text-slate-700">
            <div className="p-3 bg-red-50 text-red-500 rounded-xl border border-red-200 flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">NISN tidak ditemukan.</h4>
              <p className="text-xs text-slate-500 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Found Result Cards */}
        {selectedFeature !== 'menu' && foundStudent && (
          <div className="space-y-6 w-full animate-fade-in">
            
            {/* Banner Identitas Siswa */}
            <div className={`p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white transition-all rounded-3xl shadow-lg print:hidden ${
              isLulus 
                ? 'bg-gradient-to-r from-green-600 to-emerald-500' 
                : 'bg-gradient-to-r from-red-600 to-rose-500'
            }`}>
              <div className="flex items-center gap-4">
                {/* Photo Siswa */}
                <div className="w-16 h-16 rounded-full border-2 border-white/60 bg-white/90 shadow-md flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                  {foundStudent.photo ? (
                    <img 
                      src={foundStudent.photo} 
                      alt={foundStudent.nama} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${foundStudent.nisn}`} 
                      alt={foundStudent.nama} 
                      className="w-14 h-14 object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  {/* Fallback Initial */}
                  <div className="absolute inset-0 flex items-center justify-center font-black text-emerald-800 text-lg select-none bg-emerald-100 z-[-1]">
                    {foundStudent.nama.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                    {appName} {selectedFeature === 'cek_nilai' ? '• Kartu Hasil Studi' : ''}
                  </p>
                  <h3 className="text-xl md:text-2xl font-extrabold">{foundStudent.nama}</h3>
                  <p className="text-xs opacity-90 flex items-center gap-1.5 mt-0.5 font-medium">
                    <School className="w-3.5 h-3.5" /> {foundStudent.kelas || 'Kelas 6A'} ({foundStudent.lp === 'L' ? 'Laki-laki' : 'Perempuan'})
                    <span className="mx-1">•</span>
                    <GraduationCap className="w-3.5 h-3.5" /> NISN: {foundStudent.nisn}
                  </p>
                </div>
              </div>

              {selectedFeature === 'cek_nilai' && (
                activeSemester === 2 ? (
                  (() => {
                    const cleanKelas = (foundStudent.kelas || '').toLowerCase();
                    const isKelas6 = cleanKelas.includes('6') || cleanKelas.includes('vi') || cleanKelas.includes('enam');
                    const statusTitle = isKelas6 ? 'STATUS KELULUSAN' : 'STATUS KENAIKAN KELAS';
                    const statusText = isKelas6 
                      ? (isLulus ? 'LULUS' : 'TIDAK LULUS') 
                      : (isLulus ? 'NAIK KELAS' : 'TIDAK NAIK KELAS');
                    
                    return (
                      <div className={`px-5 py-2.5 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg text-white ${
                        isLulus ? 'bg-green-700/60' : 'bg-red-700/60'
                      }`}>
                        <span className="text-[9px] uppercase tracking-wider opacity-80 mb-0.5">{statusTitle}</span>
                        <span className="text-sm tracking-wide flex items-center gap-1">
                          {isLulus ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {statusText}
                        </span>
                      </div>
                    );
                  })()
                ) : (
                  <div className="px-5 py-2.5 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg text-white bg-white/10 border border-white/25">
                    <span className="text-[9px] uppercase tracking-wider opacity-80 mb-0.5">PERIODE BELAJAR</span>
                    <span className="text-xs tracking-wide font-extrabold flex items-center gap-1">
                      SEMESTER 1 (GANJIL)
                    </span>
                  </div>
                )
              )}
            </div>

            {/* CARD 1: RAPOR AKADEMIK SISWA */}
            {selectedFeature === 'cek_nilai' && (
              <div className="bg-white border border-slate-200 shadow-xl rounded-3xl overflow-hidden print:border-none print:shadow-none">
                
                {/* Header Card 1: Title and Semester Selection */}
                <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-extrabold text-sm text-slate-800">Laporan Rapor Hasil Belajar Akademik</span>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveSemester(1)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                        activeSemester === 1 
                          ? 'bg-blue-600 text-white shadow-sm font-extrabold' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Semester 1 (Ganjil)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSemester(2)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                        activeSemester === 2 
                          ? 'bg-blue-600 text-white shadow-sm font-extrabold' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Semester 2 (Genap)
                    </button>
                  </div>
                </div>

                {/* Nilai Detail Grid */}
                <div className="p-6 md:p-8 space-y-6">
                  <div className="space-y-6 animate-fade-in">
                  {/* Statistik Utama */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rata-rata Nilai</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-0.5">
                        {activeSemester === 1 ? (foundStudent.nilaiAkhir ?? '-') : (foundStudent.nilaiAkhir_s2 ?? '-')}
                      </h4>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ranking Kelas</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-0.5">
                        {(() => {
                          const rank = activeSemester === 1 ? foundStudent.ranking : foundStudent.ranking_s2;
                          return rank && rank <= 10 ? `#${rank}` : '-';
                        })()}
                      </h4>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center shadow-sm">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">KKM Sekolah</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-0.5">{kkm}</h4>
                    </div>
                  </div>

                  {/* Keterangan Ranking / Prestasi */}
                  {foundStudent.keteranganRanking && (
                    <div className="bg-blue-50/65 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl flex-shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-blue-800">Keterangan Ranking & Catatan Pendidik</h5>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-semibold">{foundStudent.keteranganRanking}</p>
                      </div>
                    </div>
                  )}

                  {/* Catatan Prestasi Khusus */}
                  {foundStudent.prestasi && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in shadow-sm">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                        <Trophy className="w-5 h-5 animate-bounce text-amber-600" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Prestasi Siswa 🏆</h5>
                        <p className="text-xs text-amber-950 mt-1 leading-relaxed font-extrabold">{foundStudent.prestasi}</p>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar Detail */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <Award className="w-4 h-4 text-blue-600" /> Rincian Nilai Mata Pelajaran
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {subjects.map((sub, index) => {
                        const SubjectIcon = sub.icon;
                        return (
                          <div key={index} className="space-y-1.5 p-3 rounded-2xl bg-slate-50/60 border border-slate-100 hover:shadow-sm transition-all">
                            <div className="flex justify-between text-xs font-semibold text-slate-600 items-center">
                              <span className="flex items-center gap-2 font-bold text-slate-700">
                                <span className={`p-1.5 rounded-lg text-white ${sub.color} flex items-center justify-center`}>
                                  <SubjectIcon className="w-3.5 h-3.5" />
                                </span>
                                {sub.label}
                              </span>
                              <span className="text-slate-800 font-extrabold">{sub.value} / 100</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                              <div 
                                className={`h-full ${sub.color} rounded-full transition-all`} 
                                style={{ width: `${sub.value}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Catatan Motivasi Guru */}
                  {(() => {
                    const note = getTeacherMessage(foundStudent);
                    return (
                      <div className={`border rounded-2xl p-5 flex items-start gap-4 shadow-sm relative overflow-hidden transition-all duration-300 ${note.colorClass}`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-5 rounded-full translate-x-8 -translate-y-8"></div>
                        <div className="p-3 bg-white/90 rounded-2xl flex-shrink-0 text-2xl shadow-sm select-none">
                          {note.emoji}
                        </div>
                        <div className="space-y-1.5 z-10 w-full">
                          <h5 className="text-xs font-black flex items-center gap-1.5 uppercase tracking-wide">
                            {note.title}
                          </h5>
                          <p className="text-xs font-medium leading-relaxed opacity-95 whitespace-pre-line italic">
                            "{note.text}"
                          </p>
                          <div className="pt-2 flex flex-col gap-1 text-[10px] opacity-75 font-bold border-t border-dashed border-current/10 text-left">
                            <span className="uppercase tracking-wider">Wali Kelas Kelas 5 CD</span>
                            <span className="text-slate-800 text-xs font-black">{schoolSettings?.namaWali || 'Asep Sunandar, S.Pd.'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card Footer Info */}
                  <div className="pt-5 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-slate-400 font-semibold print:hidden">
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <button 
                      onClick={handlePrint}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                    >
                      <Printer className="w-3.5 h-3.5" /> Cetak Transkrip
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CARD 2: FORMULIR ISIAN DATA SISWA MANDIRI */}
            {selectedFeature === 'isi_data' && (
              <div className="bg-white border border-slate-200 shadow-xl rounded-3xl overflow-hidden p-6 md:p-8 print:hidden">
                <form onSubmit={handleSaveBiodata} className="space-y-6 animate-fade-in text-left">
                  <div className="border-b pb-3">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <User className="w-4.5 h-4.5 text-blue-600" /> Formulir Mandiri Data Siswa
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Lengkapi biodata diri Anda secara mandiri di bawah ini. Pastikan kecocokan data dengan dokumen resmi.
                    </p>
                  </div>

                  {/* Section 1: Identitas Pokok */}
                  <div className="space-y-4">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">I. Identitas Pokok Siswa</h5>
                    
                    {/* Upload & Preview Photo */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="w-20 h-24 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner">
                        {biodataForm.photo ? (
                          <img src={biodataForm.photo} alt={biodataForm.nama || ''} className="w-full h-full object-cover" />
                        ) : (
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${biodataForm.nisn}`} alt={biodataForm.nama || ''} className="w-16 h-16" />
                        )}
                      </div>
                      <div className="flex-grow space-y-1 text-center sm:text-left">
                        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-center sm:justify-start">
                          <Camera className="w-3.5 h-3.5 text-blue-600" /> Ganti / Unggah Foto Profil Siswa
                        </label>
                        <p className="text-[10px] text-slate-500 max-w-md">
                          Unggah foto format JPG/PNG dengan latar belakang merah atau biru. Foto ini otomatis terpasang pada data profil, transkrip nilai, dan kartu NISN Anda.
                        </p>
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setBiodataForm({ ...biodataForm, photo: base64 });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="mt-2 block w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">No. Induk (Lihat di Rapot)</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.noInduk || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, noInduk: e.target.value })}
                          placeholder="Contoh: 21220101" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">NISN (Kunci Utama - Tidak Dapat Diedit)</label>
                        <input 
                          type="text" 
                          disabled
                          value={biodataForm.nisn || ''} 
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs font-mono outline-none cursor-not-allowed"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Siswa (Harus Sesuai Akte Lahir)</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.nama || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, nama: e.target.value })}
                          placeholder="Nama lengkap siswa..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Jenis Kelamin</label>
                        <select 
                          value={biodataForm.lp || 'L'} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, lp: e.target.value as 'L' | 'P' })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        >
                          <option value="L">Laki-laki (L)</option>
                          <option value="P">Perempuan (P)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Agama</label>
                        <select 
                          value={biodataForm.agama || 'Islam'} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, agama: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        >
                          <option value="Islam">Islam</option>
                          <option value="Kristen Protestan">Kristen Protestan</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                          <option value="Konghucu">Konghucu</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Kelahiran & Keluarga */}
                  <div className="space-y-4 pt-2">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">II. Kelahiran & Keluarga</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Tempat Lahir (Sesuai Akte Lahir)</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.tempatLahir || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, tempatLahir: e.target.value })}
                          placeholder="Kota/Kabupaten tempat lahir..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Lahir (Sesuai Akte Lahir)</label>
                        <input 
                          type="date" 
                          required
                          value={biodataForm.tanggalLahir || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, tanggalLahir: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Anak Ke</label>
                        <input 
                          type="number" 
                          required
                          min={1}
                          value={biodataForm.anakKe || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, anakKe: parseInt(e.target.value) || 1 })}
                          placeholder="Anak ke-..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Jumlah Saudara</label>
                        <input 
                          type="number" 
                          required
                          min={0}
                          value={biodataForm.jumlahSaudara !== undefined ? biodataForm.jumlahSaudara : ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, jumlahSaudara: parseInt(e.target.value) || 0 })}
                          placeholder="Jumlah saudara kandung..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Alamat Domisili */}
                  <div className="space-y-4 pt-2">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">III. Alamat Tempat Tinggal (Sesuai KK)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Alamat Lengkap Siswa (Jalan, No. Rumah, RT/RW)</label>
                        <textarea 
                          required
                          rows={2}
                          value={biodataForm.alamatSiswa || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, alamatSiswa: e.target.value })}
                          placeholder="Alamat lengkap domisili..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Desa / Kelurahan</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.desa || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, desa: e.target.value })}
                          placeholder="Nama desa..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Kecamatan</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.kecamatan || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, kecamatan: e.target.value })}
                          placeholder="Nama kecamatan..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor Kartu Keluarga (KK)</label>
                        <input 
                          type="text" 
                          maxLength={16}
                          required
                          value={biodataForm.noKK || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, noKK: e.target.value.replace(/\D/g, '') })}
                          placeholder="16 digit No. KK..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Data Orang Tua */}
                  <div className="space-y-4 pt-2">
                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">IV. Data Orang Tua Kandung</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Ayah Kandung (Sesuai Akte Lahir)</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.namaAyah || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, namaAyah: e.target.value })}
                          placeholder="Nama lengkap ayah..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Pekerjaan Ayah (Sesuai KK)</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.pekerjaanAyah || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, pekerjaanAyah: e.target.value })}
                          placeholder="Pekerjaan ayah saat ini..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Ibu Kandung (Sesuai Akte Lahir)</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.namaIbu || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, namaIbu: e.target.value })}
                          placeholder="Nama lengkap ibu..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Pekerjaan Ibu (Sesuai KK)</label>
                        <input 
                          type="text" 
                          required
                          value={biodataForm.pekerjaanIbu || ''} 
                          onChange={(e) => setBiodataForm({ ...biodataForm, pekerjaanIbu: e.target.value })}
                          placeholder="Pekerjaan ibu saat ini..." 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Warning & Confirmation */}
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3 mt-4">
                    <div className="flex gap-2.5 text-amber-800">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="text-xs font-bold leading-relaxed">
                        Pernyataan Konfirmasi Data:
                        <span className="font-semibold block text-slate-700 mt-1">
                          Harap periksa kembali semua data yang telah diisi. Pastikan kecocokan penulisan nama dan tempat tanggal lahir sesuai Akte Kelahiran, serta alamat dan nomor Kartu Keluarga yang valid. Pengisian data palsu atau salah sengaja dapat menghambat penerbitan laporan kelulusan dan sinkronisasi NISN nasional.
                        </span>
                      </div>
                    </div>
                    <label className="flex items-start gap-2.5 pt-2 text-slate-700 cursor-pointer select-none border-t border-amber-200/50">
                      <input 
                        type="checkbox" 
                        checked={isAgreed} 
                        onChange={(e) => setIsAgreed(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer" 
                      />
                      <span className="text-[11px] font-bold leading-normal text-slate-800">
                        Saya dengan kesadaran penuh menyatakan bahwa seluruh data yang diisikan di atas adalah benar, lengkap, akurat, dan dapat dipertanggungjawabkan keabsahannya berdasarkan dokumen resmi yang sah.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-2">
                    <button 
                      type="submit" 
                      disabled={!isAgreed}
                      className={`flex-1 py-3 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md ${
                        isAgreed 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-98 shadow-blue-600/10' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border'
                      }`}
                    >
                      <Save className="w-4 h-4" /> Simpan & Konfirmasi Biodata
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* CARD 3: CETAK KARTU NISN DIGITAL */}
            {selectedFeature === 'cetak_kartu' && (
              <div className="bg-white border border-slate-200 shadow-xl rounded-3xl overflow-hidden p-6 md:p-8">
                <div className="space-y-6 animate-fade-in text-center">
                  <div className="border-b pb-3 text-left print:hidden">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <Award className="w-4.5 h-4.5 text-blue-600" /> Cetak Kartu NISN Digital Siswa
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Unduh atau cetak kartu NISN resmi Anda secara mandiri. Anda juga dapat mengoreksi data profil langsung melalui form editor di samping kartu.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT COLUMN: EDIT DATA FORM */}
                    <div className="lg:col-span-5 text-left bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 print:hidden">
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600" /> Fasilitas Edit Data Siswa
                      </h5>
                      <form onSubmit={handleSaveCardData} className="space-y-3">
                        {/* Compact Photo upload field */}
                        <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                          <div className="w-10 h-12 bg-slate-50 rounded border border-slate-200 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                            {biodataForm.photo ? (
                              <img src={biodataForm.photo} alt={biodataForm.nama || ''} className="w-full h-full object-cover" />
                            ) : (
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${biodataForm.nisn}`} alt={biodataForm.nama || ''} className="w-8 h-8" />
                            )}
                          </div>
                          <div className="flex-grow">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Camera className="w-3 h-3 text-indigo-600" /> Ganti Foto Profil
                            </label>
                            <input 
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    setBiodataForm({ ...biodataForm, photo: base64 });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="block w-full text-[9px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Nama Lengkap</label>
                          <input 
                            type="text" 
                            required
                            value={biodataForm.nama || ''} 
                            onChange={(e) => setBiodataForm({ ...biodataForm, nama: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">NISN (Kunci Utama)</label>
                          <input 
                            type="text" 
                            disabled
                            value={biodataForm.nisn || ''} 
                            className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs font-mono outline-none cursor-not-allowed"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Tempat Lahir</label>
                            <input 
                              type="text" 
                              value={biodataForm.tempatLahir || ''} 
                              onChange={(e) => setBiodataForm({ ...biodataForm, tempatLahir: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none font-semibold text-slate-800"
                              placeholder="Kota/Kab"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Tanggal Lahir</label>
                            <input 
                              type="text" 
                              value={biodataForm.tanggalLahir || ''} 
                              onChange={(e) => setBiodataForm({ ...biodataForm, tanggalLahir: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none font-semibold text-slate-800"
                              placeholder="Format: Tgl-Bln-Thn"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Jenis Kelamin</label>
                          <select 
                            value={biodataForm.lp || 'L'} 
                            onChange={(e) => setBiodataForm({ ...biodataForm, lp: e.target.value as 'L' | 'P' })}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none font-semibold text-slate-800"
                          >
                            <option value="L">Laki-laki (L)</option>
                            <option value="P">Perempuan (P)</option>
                          </select>
                        </div>

                        <button 
                          type="submit"
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Simpan Perubahan Data
                        </button>
                      </form>
                    </div>

                    {/* RIGHT COLUMN: KARTU PREVIEW & ACTIONS */}
                    <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-6">
                      
                      <div className="text-center print:hidden">
                        <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Pratinjau Kartu NISN Resmi</p>
                        <p className="text-[10.5px] text-slate-400 font-semibold mt-1">Bagian Depan & Belakang (Siap Cetak / Unduh PDF)</p>
                      </div>

                      {/* KARTU NISN CONTAINER (BOTH SIDES) */}
                      <div id="nisn-card" className="flex flex-col gap-6 w-full max-w-md items-center print:fixed print:inset-0 print:m-auto print:flex print:flex-col print:gap-10 print:items-center print:justify-center">
                        
                        {/* 1. BAGIAN DEPAN (FRONT CARD) */}
                        <div className="relative w-full max-w-[390px] aspect-[1.586/1] rounded-2xl shadow-xl border border-slate-200 bg-gradient-to-br from-[#e0f4ff] via-white to-[#caefff] flex flex-row p-4 text-left select-none gap-3 print:w-[350px] print:h-[220px] print:shadow-none print:border print:border-black/20 print:rounded-2xl shrink-0">
                          
                          {/* Decorative subtle background watermark */}
                          <div className="absolute right-12 top-6 text-slate-400/5 pointer-events-none transform rotate-45 scale-110">
                            <TutWuriSvg className="w-40 h-40" />
                          </div>

                          {/* Left Column: Badge and Photo */}
                          <div className="flex flex-col items-center justify-start flex-shrink-0 relative w-[95px] mt-1">
                            {/* Main Badge Container */}
                            <div className="w-full bg-[#dbf5ff]/90 border-[1.5px] border-white rounded-xl shadow-md flex flex-col items-center pt-8 pb-1.5 px-1 relative h-[115px] overflow-visible">
                              
                              {/* Rounded Top Tab of the badge */}
                              <div className="absolute -top-6 w-12 h-12 rounded-full bg-white border-[1.5px] border-[#cbefff] flex items-center justify-center shadow-sm overflow-visible">
                                {/* Circular Blue background inside the tab */}
                                <div className="w-[40px] h-[40px] rounded-full bg-[#1da0ce] flex items-center justify-center relative overflow-hidden">
                                  {/* Tut Wuri handayani logo behind characters */}
                                  <div className="absolute inset-0 text-white/10 scale-90 flex items-center justify-center">
                                    <TutWuriSvg className="w-8 h-8" />
                                  </div>
                                  
                                  {/* The three holding-hands figures */}
                                  <ThreePeopleSvg className="w-8 h-8 z-10" />
                                </div>
                              </div>

                              {/* NISN label below the characters */}
                              <div className="absolute top-7 z-10 bg-[#1e4a77] text-white text-[8px] font-black px-2.5 py-0.5 rounded-full shadow-sm border border-white tracking-widest">
                                NISN
                              </div>

                              {/* Student Photo Container */}
                              <div className="w-[75px] h-[85px] bg-sky-50 border border-[#1da0ce]/40 rounded-lg overflow-hidden flex items-center justify-center shadow-inner mt-4 relative">
                                {biodataForm.photo ? (
                                  <img src={biodataForm.photo} alt={biodataForm.nama} className="w-full h-full object-cover" />
                                ) : (
                                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${biodataForm.nisn || 'avatar'}`} alt={biodataForm.nama} className="w-full h-full object-cover p-1" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Information fields & Logo & QR Code */}
                          <div className="flex flex-col justify-between flex-grow mt-0.5">
                            {/* Top logo header */}
                            <div className="flex justify-between items-start">
                              <div className="text-left">
                                {/* DAPODIK Title */}
                                <div className="flex items-center gap-0.5">
                                  <h1 className="text-[#0e4975] text-[15px] font-black tracking-tight leading-none uppercase">
                                    DAPODIK
                                  </h1>
                                  <span className="text-[10px] leading-none" title="Dapodik Official">💿</span>
                                </div>
                                {/* Dapodik subtitle */}
                                <p className="text-[5px] font-black text-slate-500 tracking-wider uppercase mt-0.5 leading-none">
                                  DATA POKOK PENDIDIKAN INDONESIA
                                </p>
                              </div>
                              
                              {/* Mini circular blue education emblem on the right */}
                              <div className="w-6 h-6 rounded-full bg-[#1da0ce] flex items-center justify-center border border-white shadow-sm text-white scale-90">
                                <TutWuriSvg className="w-4 h-4 text-white" />
                              </div>
                            </div>

                            {/* Information Fields */}
                            <div className="space-y-1 my-1.5">
                              {/* Field: NISN */}
                              <div>
                                <p className="text-[6.5px] italic font-extrabold text-slate-500 leading-none">NISN</p>
                                <p className="text-[10px] font-black text-slate-800 font-mono tracking-wider leading-none mt-0.5">
                                  {biodataForm.nisn || '-'}
                                </p>
                              </div>

                              {/* Field: Nama Siswa */}
                              <div>
                                <p className="text-[6.5px] italic font-extrabold text-slate-500 leading-none">Nama Siswa</p>
                                <p className="text-[9px] font-black text-slate-800 uppercase tracking-wide leading-none mt-0.5 truncate max-w-[170px]">
                                  {biodataForm.nama || '-'}
                                </p>
                              </div>

                              {/* Field: Tempat Tanggal Lahir */}
                              <div>
                                <p className="text-[6.5px] italic font-extrabold text-slate-500 leading-none">Tempat Tanggal Lahir</p>
                                <p className="text-[8.5px] font-black text-slate-800 leading-none mt-0.5 truncate max-w-[170px]">
                                  {biodataForm.tempatLahir || '-'}{biodataForm.tanggalLahir ? `, ${biodataForm.tanggalLahir}` : ''}
                                </p>
                              </div>

                              {/* Field: Jenis Kelamin */}
                              <div>
                                <p className="text-[6.5px] italic font-extrabold text-slate-500 leading-none">Jenis Kelamin</p>
                                <p className="text-[8.5px] font-black text-slate-800 leading-none mt-0.5">
                                  {biodataForm.lp === 'L' ? 'Laki-laki' : biodataForm.lp === 'P' ? 'Perempuan' : '-'}
                                </p>
                              </div>
                            </div>

                            {/* Bottom right QR code container */}
                            <div className="absolute right-4 bottom-4 print:right-3 print:bottom-3 shrink-0">
                              <div className="bg-white border border-slate-200/60 p-1 rounded-lg shadow-sm">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${biodataForm.nisn || 'NISN'}`} 
                                  alt="QR Code" 
                                  className="w-10 h-10"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* 2. BAGIAN BELAKANG (BACK CARD) */}
                        <div className="relative w-full max-w-[390px] aspect-[1.586/1] rounded-2xl shadow-xl overflow-hidden border border-slate-300 bg-gradient-to-b from-[#dbf2ff] to-[#f4faff] flex flex-col justify-between p-4 text-left select-none print:w-[350px] print:h-[220px] print:shadow-none print:border print:border-black/20 print:rounded-2xl shrink-0">
                          
                          {/* Top wave (dark teal) */}
                          <div className="absolute top-0 left-0 right-0 h-10 bg-[#053637] overflow-hidden">
                            <div className="absolute -bottom-5 left-0 right-0 h-8 bg-[#008283] opacity-35 rounded-[50%] transform scale-x-125"></div>
                            <div className="absolute -bottom-7 left-0 right-0 h-8 bg-sky-200/40 rounded-[50%] transform scale-x-110"></div>
                          </div>

                          {/* Tut Wuri Watermark background */}
                          <div className="absolute right-3 bottom-3 text-[#053637]/5 pointer-events-none transform rotate-12 scale-125">
                            <TutWuriSvg className="w-44 h-44" />
                          </div>

                          {/* Left aligned title text */}
                          <div className="z-10 mt-9 space-y-1.5 pl-2">
                            <div className="space-y-0 leading-none">
                              <h2 className="text-[#053637] text-[15px] font-black tracking-wide uppercase leading-tight font-sans">
                                Kartu
                              </h2>
                              <h2 className="text-[#053637] text-[15px] font-black tracking-wide uppercase leading-tight font-sans">
                                Nomor Induk
                              </h2>
                              <h2 className="text-[#053637] text-[15px] font-black tracking-wide uppercase leading-tight font-sans">
                                Siswa Nasional
                              </h2>
                            </div>

                            {/* Line Separator */}
                            <div className="w-[140px] h-[1.5px] bg-[#053637]/75"></div>

                            {/* Ministry details */}
                            <div className="space-y-0.5 text-[#053637] font-extrabold text-[7.5px] tracking-wider uppercase leading-tight">
                              <p>Department Pendidikan Nasional</p>
                              <p>Republik Indonesia</p>
                            </div>
                          </div>

                          {/* Bottom wave (dark teal) */}
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#053637] flex items-center justify-center px-4 overflow-hidden">
                            <div className="absolute -top-5 left-0 right-0 h-8 bg-[#008283] opacity-25 rounded-[50%] transform scale-x-125"></div>
                            
                            {/* Footer disclaimer text */}
                            <p className="z-10 text-white/95 text-[6.5px] font-bold tracking-widest uppercase text-center font-sans">
                              Hanya berlaku selama pemegang menjadi siswa
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 justify-center w-full print:hidden">
                        <button 
                          type="button"
                          onClick={() => {
                            onAddAccessLog?.(biodataForm.nama || '', biodataForm.nisn || '', 'siswa', 'Mencetak Kartu Tanda NISN Mandiri');
                            window.print();
                          }}
                          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.5 w-full max-w-sm font-sans"
                        >
                          <Printer className="w-4 h-4" /> Cetak Kartu NISN / Unduh PDF
                        </button>
                      </div>

                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Keluar & Kembali ke Menu Layanan Siswa Button */}
            <div className="flex justify-center pt-2 print:hidden">
              <button
                type="button"
                onClick={() => {
                  setSelectedFeature('menu');
                  setFoundStudent(null);
                  setSearchNisn('');
                  setSearched(false);
                  setErrorMsg('');
                }}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <ArrowLeft className="w-4 h-4" /> Keluar & Kembali ke Menu Layanan Siswa
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
