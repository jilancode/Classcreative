import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Student, AccessLog, SchoolSettings } from '../types';
import { 
  Users, Award, TrendingUp, TrendingDown, BookOpen, Search, Filter, 
  Download, FileSpreadsheet, Printer, Plus, Edit, Trash2, 
  RotateCcw, SlidersHorizontal, Check, CheckCircle2,
  AlertTriangle, Save, Upload, Terminal, Settings, Settings2,
  Calendar, History, UserCheck, ShieldAlert, Menu, X, Eye, Trophy, Camera, FileText
} from 'lucide-react';
import CodeCenter from './CodeCenter';

interface GuruDashboardProps {
  students: Student[];
  kkm: number;
  onUpdateStudents: (updated: Student[]) => void;
  onUpdateKkm: (kkm: number) => void;
  onLogout: () => void;
  username: string;
  appName: string;
  onUpdateAppName: (name: string) => void;
  appLogo: string;
  onUpdateAppLogo: (logo: string) => void;
  accessLogs?: AccessLog[];
  onAddAccessLog?: (name: string, nisn: string, role: 'guru' | 'siswa' | 'tamu', activity: string) => void;
  schoolSettings: SchoolSettings;
  onUpdateSchoolSettings: (updated: SchoolSettings) => void;
}

type ActiveTab = 'dashboard' | 'nilai' | 'kkm' | 'datasiswa';

export default function GuruDashboard({ 
  students, 
  kkm, 
  onUpdateStudents, 
  onUpdateKkm, 
  onLogout,
  username,
  appName,
  onUpdateAppName,
  appLogo,
  onUpdateAppLogo,
  accessLogs = [],
  onAddAccessLog,
  schoolSettings,
  onUpdateSchoolSettings
}: GuruDashboardProps) {
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Table Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(10);
  
  // Sorting Controls
  const [sortField, setSortField] = useState<keyof Student>('ranking');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Selection state for batch actions
  const [selectedNisns, setSelectedNisns] = useState<string[]>([]);

  // Mobile menu visibility toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Semester navigation for "Data Nilai"
  const [nilaiSemesterTab, setNilaiSemesterTab] = useState<'s1' | 's2' | 'rekap'>('s1');

  // New States for Custom Filters
  const [logFilterDate, setLogFilterDate] = useState<string>(() => {
    try {
      return new Date().toLocaleDateString('en-CA');
    } catch (e) {
      return '2026-06-27';
    }
  });
  const [logFilterHour, setLogFilterHour] = useState<string>('all');
  const [logFilterType, setLogFilterType] = useState<'today' | 'custom' | 'all'>('today');
  const [distFilterKelas, setDistFilterKelas] = useState<string>('all');
  const [distFilterKategori, setDistFilterKategori] = useState<string>('rata_rata');
  const [profilFilterKelas, setProfilFilterKelas] = useState<string>('all');

  // Custom confirmation modal for deletion to handle iframe context cleanly
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'batch', student?: Student } | null>(null);
  const [deleteTargetOption, setDeleteTargetOption] = useState<'only_nilai_s1' | 'only_nilai_s2' | 'only_nilai_both' | 'all'>('all');

  // States for handling Excel duplicate entries with a notification & action selection
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateList, setDuplicateList] = useState<Student[]>([]);
  const [tempUploadedList, setTempUploadedList] = useState<Student[]>([]);

  // File input ref for Excel upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Student Detail Modal
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [detailSemester, setDetailSemester] = useState<1 | 2>(1);
  const [newPrestasi, setNewPrestasi] = useState('');
  const detailPhotoInputRef = useRef<HTMLInputElement>(null);
  const logoSekolahRef = useRef<HTMLInputElement>(null);
  const logoKabupatenRef = useRef<HTMLInputElement>(null);
  const photoWaliRef = useRef<HTMLInputElement>(null);
  
  // States for editing student inside the detail modal
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editDetailFields, setEditDetailFields] = useState<Partial<Student>>({});
  const [newAchS1, setNewAchS1] = useState('');
  const [newAchS2, setNewAchS2] = useState('');

  // Form State (for both Add and Edit in a Modal Overlay)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editTargetNisn, setEditTargetNisn] = useState('');
  const [formData, setFormData] = useState({
    nisn: '',
    nama: '',
    lp: 'L' as 'L' | 'P',
    kelas: 'Kelas 6A',
    pai: 0,
    pkn: 0,
    bInd: 0,
    mtk: 0,
    ipas: 0,
    seni: 0,
    pjok: 0,
    bIng: 0,
    bSnd: 0,
    nilaiAkhir: 0,
    ranking: 0,
    keteranganRanking: '',
    prestasi: '',
    
    // Semester 2 fields
    pai_s2: 0,
    pkn_s2: 0,
    bInd_s2: 0,
    mtk_s2: 0,
    ipas_s2: 0,
    seni_s2: 0,
    pjok_s2: 0,
    bIng_s2: 0,
    bSnd_s2: 0,
    nilaiAkhir_s2: 0,
    ranking_s2: 0
  });

  // Modal / Toast emulation
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Recalculate Rankings Helper
  const recalculateAndSaveStudents = (list: Student[]) => {
    // 1. Calculate Semester 1 and Semester 2 Averages for everyone
    const withComputedAverages = list.map(student => {
      // Semester 1
      const hasS1 = student.pai !== undefined;
      const sum1 = 
        Number(student.pai || 0) + 
        Number(student.pkn || 0) + 
        Number(student.bInd || 0) + 
        Number(student.mtk || 0) + 
        Number(student.ipas || 0) + 
        Number(student.seni || 0) + 
        Number(student.pjok || 0) + 
        Number(student.bIng || 0) + 
        Number(student.bSnd || 0);
      const avg1 = hasS1 ? Math.round((sum1 / 9) * 10) / 10 : undefined;

      // Semester 2
      const hasS2 = student.pai_s2 !== undefined;
      const sum2 = 
        Number(student.pai_s2 || 0) + 
        Number(student.pkn_s2 || 0) + 
        Number(student.bInd_s2 || 0) + 
        Number(student.mtk_s2 || 0) + 
        Number(student.ipas_s2 || 0) + 
        Number(student.seni_s2 || 0) + 
        Number(student.pjok_s2 || 0) + 
        Number(student.bIng_s2 || 0) + 
        Number(student.bSnd_s2 || 0);
      const avg2 = hasS2 ? Math.round((sum2 / 9) * 10) / 10 : undefined;

      return {
        ...student,
        nilaiAkhir: avg1,
        nilaiAkhir_s2: avg2
      };
    });

    // 2. Sort S1 to find S1 Rankings (only for those who have S1)
    const sortedS1 = [...withComputedAverages]
      .filter(s => s.nilaiAkhir !== undefined)
      .sort((a, b) => (b.nilaiAkhir || 0) - (a.nilaiAkhir || 0));
    
    // 3. Sort S2 to find S2 Rankings (only for those who have S2)
    const sortedS2 = [...withComputedAverages]
      .filter(s => s.nilaiAkhir_s2 !== undefined)
      .sort((a, b) => (b.nilaiAkhir_s2 || 0) - (a.nilaiAkhir_s2 || 0));

    // 4. Assign both rankings
    const rankedList = withComputedAverages.map((student) => {
      const indexS1 = sortedS1.findIndex(s => s.nisn === student.nisn);
      const indexS2 = sortedS2.findIndex(s => s.nisn === student.nisn);
      return {
        ...student,
        ranking: indexS1 !== -1 ? indexS1 + 1 : undefined,
        ranking_s2: indexS2 !== -1 ? indexS2 + 1 : undefined
      };
    });

    onUpdateStudents(rankedList as Student[]);
  };

  // Compute Dashboard Statistics
  const stats = useMemo(() => {
    const isS2 = nilaiSemesterTab === 's2';
    // Filter out students who don't have grades for this semester
    const activeStudents = students.filter(s => {
      const avg = isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir;
      return avg !== undefined && avg !== null;
    });

    const totalSiswa = activeStudents.length;
    if (totalSiswa === 0) {
      return {
        totalSiswa: 0,
        rataRata: 0,
        nilaiTertinggi: 0,
        nilaiTerendah: 0,
        totalKelas: 0,
        lulus: 0,
        bimbingan: 0,
        distribution: { A: 0, B: 0, C: 0, D: 0, E: 0 }
      };
    }

    const sum = activeStudents.reduce((acc, s) => acc + Number(isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir), 0);
    const rataRata = Math.round((sum / totalSiswa) * 10) / 10;
    const scores = activeStudents.map(s => Number(isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir));
    const nilaiTertinggi = Math.max(...scores);
    const nilaiTerendah = Math.min(...scores);
    
    const kelasList = Array.from(new Set(activeStudents.map(s => s.kelas || 'Kelas 6A')));
    const totalKelas = kelasList.length;

    const lulusList = activeStudents.filter(s => Number(isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir) >= kkm);
    const lulus = lulusList.length;
    const bimbingan = totalSiswa - lulus;

    // Predicates A (>=90), B (80-89), C (70-79), D (60-69), E (< 60)
    const distribution = {
      A: activeStudents.filter(s => Number(isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir) >= 90).length,
      B: activeStudents.filter(s => {
        const avg = Number(isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir);
        return avg >= 80 && avg < 90;
      }).length,
      C: activeStudents.filter(s => {
        const avg = Number(isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir);
        return avg >= 70 && avg < 80;
      }).length,
      D: activeStudents.filter(s => {
        const avg = Number(isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir);
        return avg >= 60 && avg < 70;
      }).length,
      E: activeStudents.filter(s => Number(isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir) < 60).length
    };

    return {
      totalSiswa,
      rataRata,
      nilaiTertinggi,
      nilaiTerendah,
      totalKelas,
      lulus,
      bimbingan,
      distribution
    };
  }, [students, kkm, nilaiSemesterTab]);

  // Unique list of classes for filtration
  const classesList = useMemo(() => {
    return Array.from(new Set(students.map(s => s.kelas || 'Kelas 6A'))).sort();
  }, [students]);

  // Dynamic distribution of grade letters based on selected class and subject category
  const chartDistribution = useMemo(() => {
    const isS2 = nilaiSemesterTab === 's2';
    
    // Filter by class if selected class is not 'all'
    const classFilteredStudents = students.filter(s => {
      if (distFilterKelas !== 'all' && (s.kelas || 'Kelas 6A') !== distFilterKelas) {
        return false;
      }
      return true;
    });

    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    let totalSiswa = 0;

    classFilteredStudents.forEach(s => {
      let val: number | undefined;

      if (distFilterKategori === 'rata_rata') {
        val = isS2 ? s.nilaiAkhir_s2 : s.nilaiAkhir;
      } else {
        const fieldName = isS2 ? `${distFilterKategori}_s2` : distFilterKategori;
        val = s[fieldName as keyof Student] as number | undefined;
      }

      if (val !== undefined && val !== null) {
        totalSiswa++;
        const score = Number(val);
        if (score >= 90) counts.A++;
        else if (score >= 80) counts.B++;
        else if (score >= 70) counts.C++;
        else if (score >= 60) counts.D++;
        else counts.E++;
      }
    });

    return { counts, total: totalSiswa };
  }, [students, distFilterKelas, distFilterKategori, nilaiSemesterTab]);

  // Filtered & Sorted Student List
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchesSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
        const matchesKelas = !filterKelas || s.kelas === filterKelas;
        
        const avg = nilaiSemesterTab === 's2' ? s.nilaiAkhir_s2 : s.nilaiAkhir;
        const isLulus = avg !== undefined ? avg >= kkm : false;
        const matchesStatus = !filterStatus || (filterStatus === 'LULUS' ? isLulus : !isLulus);

        return matchesSearch && matchesKelas && matchesStatus;
      })
      .sort((a, b) => {
        let fieldToUse = sortField;
        if (nilaiSemesterTab === 's2') {
          if (sortField === 'ranking') fieldToUse = 'ranking_s2';
          else if (sortField === 'nilaiAkhir') fieldToUse = 'nilaiAkhir_s2';
          else if ([
            'pai', 'pkn', 'bInd', 'mtk', 'ipas', 'seni', 'pjok', 'bIng', 'bSnd'
          ].includes(sortField as string)) {
            fieldToUse = `${sortField}_s2` as keyof Student;
          }
        }

        const valA = a[fieldToUse] ?? a[sortField] ?? '';
        const valB = b[fieldToUse] ?? b[sortField] ?? '';
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        
        return sortAsc 
          ? String(valA).localeCompare(String(valB)) 
          : String(valB).localeCompare(String(valA));
      });
  }, [students, searchTerm, filterKelas, filterStatus, sortField, sortAsc, kkm, nilaiSemesterTab]);

  // Paginated View
  const paginatedStudents = useMemo(() => {
    if (rowsPerPage === 'all') return filteredStudents;
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredStudents.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredStudents, currentPage, rowsPerPage]);

  const totalPages = useMemo(() => {
    if (rowsPerPage === 'all') return 1;
    return Math.ceil(filteredStudents.length / rowsPerPage) || 1;
  }, [filteredStudents, rowsPerPage]);

  // Handle sorting trigger
  const handleSort = (field: keyof Student) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNisn = formData.nisn.trim();
    const cleanNama = formData.nama.trim();
    const cleanKelas = formData.kelas.trim();
    const cleanKeterangan = formData.keteranganRanking.trim();
    const cleanPrestasi = formData.prestasi ? formData.prestasi.trim() : '';

    if (!cleanNisn || cleanNisn.length !== 10) {
      showToast('error', 'NISN harus berisi tepat 10 digit angka!');
      return;
    }
    if (!cleanNama) {
      showToast('error', 'Nama siswa tidak boleh kosong!');
      return;
    }

    // Validate grades range (0 - 100)
    const gradesS1 = [
      formData.pai, formData.pkn, formData.bInd, formData.mtk, 
      formData.ipas, formData.seni, formData.pjok, formData.bIng, formData.bSnd
    ];
    const gradesS2 = [
      formData.pai_s2, formData.pkn_s2, formData.bInd_s2, formData.mtk_s2, 
      formData.ipas_s2, formData.seni_s2, formData.pjok_s2, formData.bIng_s2, formData.bSnd_s2
    ];

    if (gradesS1.some(g => g < 0 || g > 100) || gradesS2.some(g => g < 0 || g > 100)) {
      showToast('error', 'Semua mata pelajaran harus bernilai di antara 0 - 100!');
      return;
    }

    // Calculate Averages
    const totalSum1 = gradesS1.reduce((acc, score) => acc + score, 0);
    const calculatedAkhir = Math.round((totalSum1 / 9) * 10) / 10;

    const totalSum2 = gradesS2.reduce((acc, score) => acc + score, 0);
    const calculatedAkhir_s2 = Math.round((totalSum2 / 9) * 10) / 10;

    if (formMode === 'add') {
      const duplicate = students.some(s => s.nisn === cleanNisn);
      if (duplicate) {
        showToast('error', `Siswa dengan NISN ${cleanNisn} sudah terdaftar!`);
        return;
      }

      const newStudent: Student = {
        nisn: cleanNisn,
        nama: cleanNama,
        lp: formData.lp,
        kelas: cleanKelas,
        pai: formData.pai,
        pkn: formData.pkn,
        bInd: formData.bInd,
        mtk: formData.mtk,
        ipas: formData.ipas,
        seni: formData.seni,
        pjok: formData.pjok,
        bIng: formData.bIng,
        bSnd: formData.bSnd,
        nilaiAkhir: calculatedAkhir,
        ranking: 0,
        keteranganRanking: cleanKeterangan || undefined,
        prestasi: cleanPrestasi || undefined,
        
        // Semester 2
        pai_s2: formData.pai_s2,
        pkn_s2: formData.pkn_s2,
        bInd_s2: formData.bInd_s2,
        mtk_s2: formData.mtk_s2,
        ipas_s2: formData.ipas_s2,
        seni_s2: formData.seni_s2,
        pjok_s2: formData.pjok_s2,
        bIng_s2: formData.bIng_s2,
        bSnd_s2: formData.bSnd_s2,
        nilaiAkhir_s2: calculatedAkhir_s2,
        ranking_s2: 0
      };

      const newList = [...students, newStudent];
      recalculateAndSaveStudents(newList);
      showToast('success', `Berhasil menambahkan siswa baru: ${cleanNama}!`);
    } else {
      const updatedList = students.map(s => {
        if (s.nisn === editTargetNisn) {
          return {
            ...s,
            nama: cleanNama,
            lp: formData.lp,
            kelas: cleanKelas,
            pai: formData.pai,
            pkn: formData.pkn,
            bInd: formData.bInd,
            mtk: formData.mtk,
            ipas: formData.ipas,
            seni: formData.seni,
            pjok: formData.pjok,
            bIng: formData.bIng,
            bSnd: formData.bSnd,
            nilaiAkhir: calculatedAkhir,
            keteranganRanking: cleanKeterangan || undefined,
            prestasi: cleanPrestasi || undefined,

            // Semester 2
            pai_s2: formData.pai_s2,
            pkn_s2: formData.pkn_s2,
            bInd_s2: formData.bInd_s2,
            mtk_s2: formData.mtk_s2,
            ipas_s2: formData.ipas_s2,
            seni_s2: formData.seni_s2,
            pjok_s2: formData.pjok_s2,
            bIng_s2: formData.bIng_s2,
            bSnd_s2: formData.bSnd_s2,
            nilaiAkhir_s2: calculatedAkhir_s2
          };
        }
        return s;
      });

      recalculateAndSaveStudents(updatedList);
      showToast('success', `Data siswa ${cleanNama} berhasil diperbarui!`);
    }

    setIsFormModalOpen(false);
    resetForm();
  };

  const triggerEdit = (student: Student) => {
    setFormMode('edit');
    setEditTargetNisn(student.nisn);
    setFormData({
      nisn: student.nisn,
      nama: student.nama,
      lp: student.lp,
      kelas: student.kelas || 'Kelas 6A',
      pai: student.pai,
      pkn: student.pkn,
      bInd: student.bInd,
      mtk: student.mtk,
      ipas: student.ipas,
      seni: student.seni,
      pjok: student.pjok,
      bIng: student.bIng,
      bSnd: student.bSnd,
      nilaiAkhir: student.nilaiAkhir,
      ranking: student.ranking,
      keteranganRanking: student.keteranganRanking || '',
      prestasi: student.prestasi || '',

      // Semester 2
      pai_s2: student.pai_s2 !== undefined ? student.pai_s2 : student.pai,
      pkn_s2: student.pkn_s2 !== undefined ? student.pkn_s2 : student.pkn,
      bInd_s2: student.bInd_s2 !== undefined ? student.bInd_s2 : student.bInd,
      mtk_s2: student.mtk_s2 !== undefined ? student.mtk_s2 : student.mtk,
      ipas_s2: student.ipas_s2 !== undefined ? student.ipas_s2 : student.ipas,
      seni_s2: student.seni_s2 !== undefined ? student.seni_s2 : student.seni,
      pjok_s2: student.pjok_s2 !== undefined ? student.pjok_s2 : student.pjok,
      bIng_s2: student.bIng_s2 !== undefined ? student.bIng_s2 : student.bIng,
      bSnd_s2: student.bSnd_s2 !== undefined ? student.bSnd_s2 : student.bSnd,
      nilaiAkhir_s2: student.nilaiAkhir_s2 !== undefined ? student.nilaiAkhir_s2 : student.nilaiAkhir,
      ranking_s2: student.ranking_s2 !== undefined ? student.ranking_s2 : student.ranking
    });
    setIsFormModalOpen(true);
  };

  const triggerDelete = (student: Student) => {
    if (activeTab === 'nilai') {
      if (nilaiSemesterTab === 's1') {
        setDeleteTargetOption('only_nilai_s1');
      } else if (nilaiSemesterTab === 's2') {
        setDeleteTargetOption('only_nilai_s2');
      } else {
        setDeleteTargetOption('only_nilai_both');
      }
    } else {
      setDeleteTargetOption('all');
    }
    setDeleteConfirm({ type: 'single', student });
  };

  const handleToggleSelect = (nisn: string) => {
    setSelectedNisns(prev => 
      prev.includes(nisn) ? prev.filter(n => n !== nisn) : [...prev, nisn]
    );
  };

  const handleToggleSelectAll = () => {
    const filteredNisns = filteredStudents.map(s => s.nisn);
    const allSelected = filteredNisns.length > 0 && filteredNisns.every(nisn => selectedNisns.includes(nisn));
    if (allSelected) {
      // Unselect all filtered students
      setSelectedNisns(prev => prev.filter(nisn => !filteredNisns.includes(nisn)));
    } else {
      // Select all filtered students
      setSelectedNisns(prev => {
        const uniqueNisns = new Set([...prev, ...filteredNisns]);
        return Array.from(uniqueNisns);
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNisns.length === 0) return;
    if (activeTab === 'nilai') {
      if (nilaiSemesterTab === 's1') {
        setDeleteTargetOption('only_nilai_s1');
      } else if (nilaiSemesterTab === 's2') {
        setDeleteTargetOption('only_nilai_s2');
      } else {
        setDeleteTargetOption('only_nilai_both');
      }
    } else {
      setDeleteTargetOption('all');
    }
    setDeleteConfirm({ type: 'batch' });
  };

  const resetForm = () => {
    setFormMode('add');
    setEditTargetNisn('');
    setFormData({
      nisn: '',
      nama: '',
      lp: 'L',
      kelas: 'Kelas 6A',
      pai: 0,
      pkn: 0,
      bInd: 0,
      mtk: 0,
      ipas: 0,
      seni: 0,
      pjok: 0,
      bIng: 0,
      bSnd: 0,
      nilaiAkhir: 0,
      ranking: 0,
      keteranganRanking: '',
      prestasi: '',

      // Semester 2
      pai_s2: 0,
      pkn_s2: 0,
      bInd_s2: 0,
      mtk_s2: 0,
      ipas_s2: 0,
      seni_s2: 0,
      pjok_s2: 0,
      bIng_s2: 0,
      bSnd_s2: 0,
      nilaiAkhir_s2: 0,
      ranking_s2: 0
    });
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    resetForm();
  };

  // Downloader of the structured school list in Excel format
  const exportToExcel = () => {
    try {
      const isS2 = nilaiSemesterTab === 's2';
      const headers = [
        "No",
        "NISN",
        "Nama Siswa",
        "LP",
        "Kelas",
        "Semester", // Added Semester column
        "PAI",
        "PKN",
        "B. IND",
        "MTK",
        "IPAS",
        "SENI",
        "PJOK",
        "B. ING",
        "B.SND",
        "Rata-rata",
        "Ranking",
        "Keterangan Ranking"
      ];
      const rows = filteredStudents.map((s, idx) => [
        idx + 1,
        s.nisn,
        s.nama,
        s.lp,
        s.kelas || 'Kelas 6A',
        isS2 ? 2 : 1, // Added Semester column value
        isS2 ? (s.pai_s2 !== undefined ? s.pai_s2 : s.pai) : s.pai,
        isS2 ? (s.pkn_s2 !== undefined ? s.pkn_s2 : s.pkn) : s.pkn,
        isS2 ? (s.bInd_s2 !== undefined ? s.bInd_s2 : s.bInd) : s.bInd,
        isS2 ? (s.mtk_s2 !== undefined ? s.mtk_s2 : s.mtk) : s.mtk,
        isS2 ? (s.ipas_s2 !== undefined ? s.ipas_s2 : s.ipas) : s.ipas,
        isS2 ? (s.seni_s2 !== undefined ? s.seni_s2 : s.seni) : s.seni,
        isS2 ? (s.pjok_s2 !== undefined ? s.pjok_s2 : s.pjok) : s.pjok,
        isS2 ? (s.bIng_s2 !== undefined ? s.bIng_s2 : s.bIng) : s.bIng,
        isS2 ? (s.bSnd_s2 !== undefined ? s.bSnd_s2 : s.bSnd) : s.bSnd,
        isS2 ? (s.nilaiAkhir_s2 ?? s.nilaiAkhir) : s.nilaiAkhir,
        isS2 ? ((s.ranking_s2 ?? s.ranking) || '-') : (s.ranking || '-'),
        s.keteranganRanking || ''
      ]);

      const wsData = [headers, ...rows];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto-size columns to look nice
      const max_cols = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2);
      ws['!cols'] = max_cols.map(w => ({ wch: w }));

      XLSX.utils.book_append_sheet(wb, ws, "Daftar_Nilai_SINS");
      XLSX.writeFile(wb, `${appName.replace(/\s+/g, '_')}_Daftar_Nilai_Semester_${isS2 ? 2 : 1}.xlsx`);
      showToast('success', `Data Semester ${isS2 ? 2 : 1} berhasil diekspor ke Excel (.xlsx)!`);
    } catch (err) {
      showToast('error', 'Gagal mengekspor ke Excel: ' + (err as Error).message);
    }
  };

  // Downloads a blank or pre-seeded layout template in Excel format
  const handleDownloadTemplate = () => {
    try {
      const activeSemNum = nilaiSemesterTab === 's2' ? 2 : 1;
      const headers = [
        "NISN",
        "Nama Siswa",
        "LP",
        "Kelas",
        "Semester", // Added Semester column
        "PAI",
        "PKN",
        "B. IND",
        "MTK",
        "IPAS",
        "SENI",
        "PJOK",
        "B. ING",
        "B.SND",
        "Keterangan Ranking"
      ];
      const rows = [
        ["0091234561", "Ahmad Fauzi", "L", "Kelas 6A", activeSemNum, 85, 80, 88, 75, 82, 80, 85, 78, 80, "Peringkat 5 Umum"],
        ["0091234562", "Budi Santoso", "L", "Kelas 6A", activeSemNum, 90, 88, 92, 85, 90, 85, 90, 84, 88, "Bagus di semua pelajaran"],
        ["0091234563", "Citra Lestari", "P", "Kelas 6A", activeSemNum, 75, 72, 78, 70, 74, 80, 75, 72, 74, "Perlu bimbingan matematika"]
      ];
      
      const wsData = [headers, ...rows];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Auto-size columns to look nice
      const max_cols = headers.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2);
      ws['!cols'] = max_cols.map(w => ({ wch: w }));

      XLSX.utils.book_append_sheet(wb, ws, `Template_SINS_Smt_${activeSemNum}`);
      XLSX.writeFile(wb, `Template_SINS_Nilai_Semester_${activeSemNum}.xlsx`);
      showToast('success', `Template nilai Excel Semester ${activeSemNum} berhasil diunduh!`);
    } catch (err) {
      showToast('error', 'Gagal mengunduh template Excel: ' + (err as Error).message);
    }
  };

  // Duplicate strategies executor
  const performImport = (uploadedList: Student[], strategy: 'overwrite' | 'skip' | 'merge') => {
    const mergedList = [...students];
    let insCount = 0;
    let updCount = 0;
    let skipCount = 0;

    uploadedList.forEach(newS => {
      const idx = mergedList.findIndex(s => s.nisn === newS.nisn);
      if (idx !== -1) {
        if (strategy === 'overwrite') {
          // Replace completely
          mergedList[idx] = {
            ...mergedList[idx],
            ...newS,
            kelas: newS.kelas || mergedList[idx].kelas || 'Kelas 6A'
          };
          updCount++;
        } else if (strategy === 'merge') {
          // Keep old Semester 1 fields if the new one only specifies Semester 2, and vice versa
          const isUploadedS2 = newS.pai_s2 !== undefined;
          if (isUploadedS2) {
            mergedList[idx] = {
              ...mergedList[idx],
              pai_s2: newS.pai_s2,
              pkn_s2: newS.pkn_s2,
              bInd_s2: newS.bInd_s2,
              mtk_s2: newS.mtk_s2,
              ipas_s2: newS.ipas_s2,
              seni_s2: newS.seni_s2,
              pjok_s2: newS.pjok_s2,
              bIng_s2: newS.bIng_s2,
              bSnd_s2: newS.bSnd_s2,
              nilaiAkhir_s2: newS.nilaiAkhir_s2,
              ranking_s2: newS.ranking_s2 ?? mergedList[idx].ranking_s2,
              keteranganRanking: newS.keteranganRanking ?? mergedList[idx].keteranganRanking
            };
          } else {
            mergedList[idx] = {
              ...mergedList[idx],
              pai: newS.pai,
              pkn: newS.pkn,
              bInd: newS.bInd,
              mtk: newS.mtk,
              ipas: newS.ipas,
              seni: newS.seni,
              pjok: newS.pjok,
              bIng: newS.bIng,
              bSnd: newS.bSnd,
              nilaiAkhir: newS.nilaiAkhir,
              ranking: newS.ranking ?? mergedList[idx].ranking,
              keteranganRanking: newS.keteranganRanking ?? mergedList[idx].keteranganRanking
            };
          }
          updCount++;
        } else {
          // Skip
          skipCount++;
        }
      } else {
        mergedList.push(newS);
        insCount++;
      }
    });

    recalculateAndSaveStudents(mergedList);
    onAddAccessLog?.('Guru Wali Kelas', 'admin', 'guru', `Mengunggah daftar nilai Excel dengan strategi: ${strategy}`);
    
    if (strategy === 'skip') {
      showToast('success', `Sukses Impor: ${insCount} siswa baru berhasil ditambahkan, ${skipCount} data ganda dilewati.`);
    } else {
      showToast('success', `Sukses Impor: ${insCount} siswa baru berhasil ditambahkan, ${updCount} data ganda diperbarui.`);
    }

    setIsDuplicateModalOpen(false);
    setDuplicateList([]);
    setTempUploadedList([]);
  };

  // Robust Excel parser & state merger
  const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert worksheet to JSON (header rows)
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        if (jsonData.length < 2) {
          showToast('error', 'File Excel minimal harus memiliki baris header dan 1 baris data!');
          return;
        }

        const headers = (jsonData[0] as string[]).map(h => String(h || '').trim().toUpperCase());
        
        const idxNisn = headers.findIndex(h => h.includes('NISN'));
        const idxNama = headers.findIndex(h => h.includes('NAMA'));
        const idxLp = headers.findIndex(h => h === 'LP' || h.includes('KELAMIN') || h.includes('GENDER'));
        const idxKelas = headers.findIndex(h => h.includes('KELAS') || h.includes('ROMBEL'));
        const idxSemester = headers.findIndex(h => h.includes('SEMESTER') || h.includes('SMT')); // Added Semester column lookup
        const idxPai = headers.findIndex(h => h.includes('PAI') || h.includes('AGAMA'));
        const idxPkn = headers.findIndex(h => h.includes('PKN') || h.includes('PANCASILA'));
        const idxBind = headers.findIndex(h => h.includes('IND') || h.includes('B. IND') || h.includes('INDONESIA'));
        const idxMtk = headers.findIndex(h => h.includes('MTK') || h.includes('MATEMATIKA'));
        const idxIpas = headers.findIndex(h => h.includes('IPAS'));
        const idxSeni = headers.findIndex(h => h.includes('SENI') || h.includes('SBD') || h.includes('BUDAYA'));
        const idxPjok = headers.findIndex(h => h.includes('PJOK') || h.includes('PENJAS') || h.includes('OLAHRAGA'));
        const idxBing = headers.findIndex(h => h.includes('ING') || h.includes('B. ING') || h.includes('INGGRIS'));
        const idxBsnd = headers.findIndex(h => h.includes('SND') || h.includes('B.SND') || h.includes('SUNDA'));
        const idxKeterangan = headers.findIndex(h => h.includes('KETERANGAN') || h.includes('CATATAN') || h.includes('RANKING'));

        if (idxNisn === -1 || idxNama === -1) {
          showToast('error', 'Header Excel harus memiliki kolom "NISN" dan "Nama Siswa"!');
          return;
        }

        const uploadedStudents: Student[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length < 2) continue;

          const nisn = row[idxNisn] ? String(row[idxNisn]).trim() : '';
          const nama = row[idxNama] ? String(row[idxNama]).trim() : '';
          if (!nisn || !nama) continue;

          const lpRaw = idxLp !== -1 && row[idxLp] ? String(row[idxLp]).toUpperCase().trim() : 'L';
          const lp = (lpRaw.startsWith('P') || lpRaw === 'PEREMPUAN') ? 'P' : 'L';

          const kelasVal = idxKelas !== -1 && row[idxKelas] ? String(row[idxKelas]).trim() : 'Kelas 6A';
          const semesterVal = idxSemester !== -1 && row[idxSemester] !== undefined ? parseInt(String(row[idxSemester]).trim()) || 1 : 1;

          const pai = idxPai !== -1 && row[idxPai] !== undefined ? Number(row[idxPai]) || 0 : 0;
          const pkn = idxPkn !== -1 && row[idxPkn] !== undefined ? Number(row[idxPkn]) || 0 : 0;
          const bInd = idxBind !== -1 && row[idxBind] !== undefined ? Number(row[idxBind]) || 0 : 0;
          const mtk = idxMtk !== -1 && row[idxMtk] !== undefined ? Number(row[idxMtk]) || 0 : 0;
          const ipas = idxIpas !== -1 && row[idxIpas] !== undefined ? Number(row[idxIpas]) || 0 : 0;
          const seni = idxSeni !== -1 && row[idxSeni] !== undefined ? Number(row[idxSeni]) || 0 : 0;
          const pjok = idxPjok !== -1 && row[idxPjok] !== undefined ? Number(row[idxPjok]) || 0 : 0;
          const bIng = idxBing !== -1 && row[idxBing] !== undefined ? Number(row[idxBing]) || 0 : 0;
          const bSnd = idxBsnd !== -1 && row[idxBsnd] !== undefined ? Number(row[idxBsnd]) || 0 : 0;
          const keteranganRanking = idxKeterangan !== -1 && row[idxKeterangan] !== undefined ? String(row[idxKeterangan]).trim() : '';

          // Auto compute average of subjects
          const sumVal = pai + pkn + bInd + mtk + ipas + seni + pjok + bIng + bSnd;
          const avgScore = Math.round((sumVal / 9) * 10) / 10;

          if (semesterVal === 2) {
            uploadedStudents.push({
              nisn,
              nama,
              lp,
              kelas: kelasVal || 'Kelas 6A',
              pai_s2: pai,
              pkn_s2: pkn,
              bInd_s2: bInd,
              mtk_s2: mtk,
              ipas_s2: ipas,
              seni_s2: seni,
              pjok_s2: pjok,
              bIng_s2: bIng,
              bSnd_s2: bSnd,
              nilaiAkhir_s2: avgScore,
              ranking_s2: 0,
              keteranganRanking: keteranganRanking || undefined
            });
          } else {
            uploadedStudents.push({
              nisn,
              nama,
              lp,
              kelas: kelasVal || 'Kelas 6A',
              pai,
              pkn,
              bInd,
              mtk,
              ipas,
              seni,
              pjok,
              bIng,
              bSnd,
              nilaiAkhir: avgScore,
              ranking: 0,
              keteranganRanking: keteranganRanking || undefined
            });
          }
        }

        if (uploadedStudents.length === 0) {
          showToast('error', 'Tidak ditemukan baris nilai siswa yang valid!');
          return;
        }

        // Detect duplicates
        const duplicates = uploadedStudents.filter(newS => 
          students.some(s => s.nisn === newS.nisn)
        );

        if (duplicates.length > 0) {
          setTempUploadedList(uploadedStudents);
          setDuplicateList(duplicates);
          setIsDuplicateModalOpen(true);
        } else {
          // Direct import if no duplicates
          performImport(uploadedStudents, 'overwrite');
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        showToast('error', 'Gagal membaca file Excel: ' + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Live real-time average calculated on form input
  const liveAverage = useMemo(() => {
    const sum = 
      Number(formData.pai || 0) + 
      Number(formData.pkn || 0) + 
      Number(formData.bInd || 0) + 
      Number(formData.mtk || 0) + 
      Number(formData.ipas || 0) + 
      Number(formData.seni || 0) + 
      Number(formData.pjok || 0) + 
      Number(formData.bIng || 0) + 
      Number(formData.bSnd || 0);
    return Math.round((sum / 9) * 10) / 10;
  }, [formData]);

  // Recalculate ranks trigger
  const triggerAutoRankAll = () => {
    const zeroRanked = students.map(s => ({ ...s, ranking: 0 }));
    recalculateAndSaveStudents(zeroRanked);
    showToast('success', 'Urutan peringkat siswa berhasil diperbarui!');
  };

  // Helper to update a single student's data and save it
  const handleUpdateStudentDirectly = (updatedStudent: Student) => {
    const nextStudents = students.map(s => s.nisn === updatedStudent.nisn ? updatedStudent : s);
    onUpdateStudents(nextStudents);
    setDetailStudent(updatedStudent);
  };

  const handleSettingsImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldKey: 'logoSekolah' | 'logoKabupaten' | 'photoWali') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdateSchoolSettings({
        ...schoolSettings,
        [fieldKey]: base64
      });
      showToast('success', 'Aset gambar berhasil diunggah!');
    };
    reader.readAsDataURL(file);
  };

  const handleDetailPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detailStudent) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updated = { ...detailStudent, photo: base64 };
      handleUpdateStudentDirectly(updated);
      showToast('success', 'Foto siswa berhasil diperbarui!');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDetailPrestasi = () => {
    if (!detailStudent) return;
    const updated = { ...detailStudent, prestasi: newPrestasi };
    handleUpdateStudentDirectly(updated);
    showToast('success', 'Prestasi siswa berhasil diperbarui!');
  };

  // Trigger viewing student details
  const triggerDetail = (student: Student) => {
    setDetailStudent(student);
    setDetailSemester(1);
    setNewPrestasi(student.prestasi || '');
    setIsEditingDetail(false);
    setEditDetailFields({ ...student });
    setNewAchS1('');
    setNewAchS2('');
  };

  const handleSaveDetailEdits = () => {
    if (!detailStudent) return;
    
    if (!editDetailFields.nisn || editDetailFields.nisn.length !== 10) {
      showToast('error', 'NISN harus berisi tepat 10 digit angka!');
      return;
    }
    if (!editDetailFields.nama) {
      showToast('error', 'Nama siswa tidak boleh kosong!');
      return;
    }

    const nextStudent = { ...detailStudent, ...editDetailFields };

    // Calculate Semester 1 Average
    const sum1 = 
      Number(nextStudent.pai ?? 0) + 
      Number(nextStudent.pkn ?? 0) + 
      Number(nextStudent.bInd ?? 0) + 
      Number(nextStudent.mtk ?? 0) + 
      Number(nextStudent.ipas ?? 0) + 
      Number(nextStudent.seni ?? 0) + 
      Number(nextStudent.pjok ?? 0) + 
      Number(nextStudent.bIng ?? 0) + 
      Number(nextStudent.bSnd ?? 0);
    nextStudent.nilaiAkhir = Math.round((sum1 / 9) * 10) / 10;

    // Calculate Semester 2 Average
    const sum2 = 
      Number(nextStudent.pai_s2 ?? 0) + 
      Number(nextStudent.pkn_s2 ?? 0) + 
      Number(nextStudent.bInd_s2 ?? 0) + 
      Number(nextStudent.mtk_s2 ?? 0) + 
      Number(nextStudent.ipas_s2 ?? 0) + 
      Number(nextStudent.seni_s2 ?? 0) + 
      Number(nextStudent.pjok_s2 ?? 0) + 
      Number(nextStudent.bIng_s2 ?? 0) + 
      Number(nextStudent.bSnd_s2 ?? 0);
    nextStudent.nilaiAkhir_s2 = Math.round((sum2 / 9) * 10) / 10;

    const nextList = students.map(s => s.nisn === detailStudent.nisn ? nextStudent : s);
    recalculateAndSaveStudents(nextList);
    setDetailStudent(nextStudent);
    setIsEditingDetail(false);
    showToast('success', 'Perubahan data siswa berhasil disimpan!');
  };

  // Function to print details
  const handlePrintDetail = () => {
    window.print();
  };

  const downloadAsDoc = (student: Student) => {
    const sem1Subjects = [
      { label: 'Pendidikan Agama & Budi Pekerti (PAI)', value: student.pai ?? 0 },
      { label: 'Pendidikan Pancasila & Kewarganegaraan (PPKN)', value: student.pkn ?? 0 },
      { label: 'Bahasa Indonesia (B. IND)', value: student.bInd ?? 0 },
      { label: 'Matematika (MTK)', value: student.mtk ?? 0 },
      { label: 'Ilmu Pengetahuan Alam & Sosial (IPAS)', value: student.ipas ?? 0 },
      { label: 'Seni Budaya & Prakarya (SENI)', value: student.seni ?? 0 },
      { label: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)', value: student.pjok ?? 0 },
      { label: 'Bahasa Inggris (B. ING)', value: student.bIng ?? 0 },
      { label: 'Bahasa Sunda (B.SND)', value: student.bSnd ?? 0 },
    ];
    
    const sem2Subjects = [
      { label: 'Pendidikan Agama & Budi Pekerti (PAI)', value: student.pai_s2 ?? 0 },
      { label: 'Pendidikan Pancasila & Kewarganegaraan (PPKN)', value: student.pkn_s2 ?? 0 },
      { label: 'Bahasa Indonesia (B. IND)', value: student.bInd_s2 ?? 0 },
      { label: 'Matematika (MTK)', value: student.mtk_s2 ?? 0 },
      { label: 'Ilmu Pengetahuan Alam & Sosial (IPAS)', value: student.ipas_s2 ?? 0 },
      { label: 'Seni Budaya & Prakarya (SENI)', value: student.seni_s2 ?? 0 },
      { label: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)', value: student.pjok_s2 ?? 0 },
      { label: 'Bahasa Inggris (B. ING)', value: student.bIng_s2 ?? 0 },
      { label: 'Bahasa Sunda (B.SND)', value: student.bSnd_s2 ?? 0 },
    ];

    const currentSubjects = detailSemester === 1 ? sem1Subjects : sem2Subjects;
    const currentAverage = detailSemester === 1 ? (student.nilaiAkhir ?? 0) : (student.nilaiAkhir_s2 ?? 0);
    const currentRank = detailSemester === 1 ? (student.ranking ?? '-') : (student.ranking_s2 ?? '-');
    const currentAchievements = detailSemester === 1 
      ? (student.prestasiS1 || (student.prestasi ? [student.prestasi] : [])) 
      : (student.prestasiS2 || []);

    const docContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Detail Siswa - ${student.nama}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; padding: 20px; }
          .kop-table { width: 100%; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
          .kop-title { text-align: center; font-family: Arial, sans-serif; }
          .kop-title h1 { margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
          .kop-title h2 { margin: 2px 0; font-size: 11pt; font-weight: bold; }
          .kop-title p { margin: 0; font-size: 8.5pt; color: #555; }
          
          .info-table { width: 100%; margin-bottom: 20px; }
          .info-table td { padding: 4px; font-size: 10.5pt; vertical-align: top; }
          .info-label { width: 120px; font-weight: bold; }
          .info-colon { width: 15px; text-align: center; }
          
          .report-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; text-decoration: underline; }
          .report-semester { text-align: center; font-size: 10.5pt; font-weight: bold; margin-bottom: 15px; }

          .score-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .score-table th, .score-table td { border: 1px solid #000; padding: 8px; font-size: 10pt; }
          .score-table th { background-color: #f2f2f2; font-weight: bold; text-align: left; }
          .score-table td.center { text-align: center; }
          
          .prestasi-title { font-size: 10.5pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; text-transform: uppercase; }
          .prestasi-item { font-size: 10pt; margin-bottom: 4px; }
          
          .signature-table { width: 100%; margin-top: 35px; }
          .signature-table td { text-align: center; font-size: 10.5pt; }
        </style>
      </head>
      <body>
        <table class="kop-table">
          <tr>
            <td style="width: 15%; text-align: left; vertical-align: middle;">
              ${schoolSettings.logoKabupaten ? `<img src="${schoolSettings.logoKabupaten}" width="65" height="65" />` : ''}
            </td>
            <td style="width: 70%;" class="kop-title">
              <h1>PEMERINTAH KABUPATEN ${schoolSettings.kabupaten.toUpperCase()}</h1>
              <h2>DINAS PENDIDIKAN DAN KEBUDAYAAN</h2>
              <h2>${schoolSettings.namaSekolah.toUpperCase()}</h2>
              <p>${schoolSettings.alamatSekolah}, Kec. ${schoolSettings.kecamatan}, Kab. ${schoolSettings.kabupaten}, Provinsi ${schoolSettings.provinsi}</p>
              <p>NPSN: ${schoolSettings.npsn}</p>
            </td>
            <td style="width: 15%; text-align: right; vertical-align: middle;">
              ${schoolSettings.logoSekolah ? `<img src="${schoolSettings.logoSekolah}" width="65" height="65" />` : ''}
            </td>
          </tr>
        </table>

        <div class="report-title">RAPOR HASIL BELAJAR SISWA</div>
        <div class="report-semester">SEMESTER ${detailSemester} (TAHUN AJARAN 2026/2027)</div>

        <table class="info-table">
          <tr>
            <td class="info-label">Nama Siswa</td>
            <td class="info-colon">:</td>
            <td><strong>${student.nama}</strong></td>
            <td class="info-label">Kelas</td>
            <td class="info-colon">:</td>
            <td>${student.kelas || 'Kelas 6A'}</td>
          </tr>
          <tr>
            <td class="info-label">NISN</td>
            <td class="info-colon">:</td>
            <td>${student.nisn}</td>
            <td class="info-label">Jenis Kelamin</td>
            <td class="info-colon">:</td>
            <td>${student.lp === 'L' ? 'Laki-Laki' : 'Perempuan'}</td>
          </tr>
        </table>

        <table class="score-table">
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">No</th>
              <th style="width: 62%;">Mata Pelajaran</th>
              <th style="width: 15%; text-align: center;">KKM</th>
              <th style="width: 15%; text-align: center;">Nilai</th>
            </tr>
          </thead>
          <tbody>
            ${currentSubjects.map((sub, index) => `
              <tr>
                <td class="center">${index + 1}</td>
                <td>${sub.label}</td>
                <td class="center">${kkm}</td>
                <td class="center" style="font-weight: bold; ${sub.value < kkm ? 'color: red;' : ''}">${sub.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table style="width: 100%; border: 1px solid #000; margin-bottom: 20px;">
          <tr>
            <td style="width: 50%; padding: 8px; text-align: center; border-right: 1px solid #000;">
              <span style="font-size: 8.5pt; text-transform: uppercase; color: #555;">Rata-Rata Nilai</span><br/>
              <strong style="font-size: 16pt;">${currentAverage}</strong>
            </td>
            <td style="width: 50%; padding: 8px; text-align: center;">
              <span style="font-size: 8.5pt; text-transform: uppercase; color: #555;">Peringkat Kelas</span><br/>
              <strong style="font-size: 16pt;">${currentRank}</strong>
            </td>
          </tr>
        </table>

        <div class="prestasi-title">Prestasi & Penghargaan Siswa (Semester ${detailSemester})</div>
        <div style="border: 1px solid #ccc; padding: 10px; background-color: #fafafa; border-radius: 4px;">
          ${currentAchievements.length > 0 
            ? currentAchievements.map((item, index) => `<div class="prestasi-item">🏆 ${index + 1}. ${item}</div>`).join('')
            : '<div style="color: #777; font-style: italic;">Belum ada catatan prestasi untuk semester ini.</div>'
          }
        </div>

        <table class="signature-table">
          <tr>
            <td style="width: 45%;">
              Mengetahui,<br/>
              Orang Tua / Wali Siswa<br/><br/><br/><br/>
              .............................................
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%;">
              ${schoolSettings.kabupaten}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
              Wali Kelas / Guru Kelas<br/><br/><br/><br/>
              <strong>${schoolSettings.namaWali}</strong><br/>
              NIP. ${schoolSettings.nipWali || '-'}
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rapor_${student.nama}_Semester_${detailSemester}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'File .doc berhasil diunduh!');
  };

  return (
    <div className="flex-grow flex flex-col min-h-[calc(100vh-140px)] relative">
      
      {/* HEADER UTAMA STATIS (bg-slate-900) */}
      <header className="sticky top-0 z-40 text-white border-b border-slate-800 shadow-md px-6 py-3.5 flex items-center justify-between" style={{ backgroundColor: '#093f41' }}>
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-800 text-white rounded-lg text-sm font-black flex items-center justify-center overflow-hidden border border-slate-700" style={{ width: '50px', height: '50px', borderStyle: 'none', backgroundColor: '#093f41' }}>
            {schoolSettings?.logoSekolah ? (
              <img src={schoolSettings.logoSekolah} alt="Logo Sekolah" className="w-full h-full object-contain" />
            ) : (
              appLogo
            )}
          </div>
          <div>
            <h2 className="font-extrabold text-[11px] md:text-xs tracking-wider uppercase truncate max-w-[140px] md:max-w-[200px]">{appName}</h2>
            <p className="text-[8px] md:text-[9px] text-slate-400 font-semibold">Portal Guru & Wali Kelas</p>
          </div>
        </div>

        {/* Label Admin di Kanan Atas Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 pl-2.5 pr-4 py-1.5 rounded-full shadow-sm" style={{ borderStyle: 'solid', backgroundColor: '#093f41', borderColor: '#0f8587' }}>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-[10px] border border-blue-700 flex-shrink-0 overflow-hidden">
              {schoolSettings?.photoWali ? (
                <img src={schoolSettings.photoWali} alt="Foto Guru" className="w-full h-full object-cover" style={{ width: '32px', height: '32px' }} />
              ) : (
                username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-left leading-none">
              <h4 className="font-extrabold text-[10px] text-slate-200">{schoolSettings?.namaWali || username}</h4>
              <p className="text-[8px] text-green-400 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span> Guru SINS (Admin)
              </p>
            </div>
          </div>

          {/* Hamburger Menu Toggle on Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 text-slate-200" />
            ) : (
              <Menu className="w-4 h-4 text-slate-200" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container below Header */}
      <div className="flex-grow flex flex-col md:flex-row">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-xl border bg-white max-w-sm">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-700">{toast.message}</span>
        </div>
      )}

      {/* Hidden File Input for Excel Uploader */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleUploadTemplate}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* Sidebar Kiri */}
      <aside className={`w-full md:w-64 text-white flex-col border-r border-slate-800 ${
        isMobileMenuOpen ? 'flex' : 'hidden md:flex'
      }`} style={{ backgroundColor: '#093f41' }}>
        {/* Menu Links */}
        <nav className="flex-grow px-4 py-6 space-y-1" style={{ backgroundColor: '#093f41' }}>
          <button 
            onClick={() => { setActiveTab('dashboard'); resetForm(); setIsMobileMenuOpen(false); }}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-xs font-semibold cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-[#1da0ce] text-white shadow-lg shadow-[#1da0ce]/15 font-bold' 
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" /> Dashboard
          </button>

          <button 
            onClick={() => { setActiveTab('nilai'); resetForm(); setIsMobileMenuOpen(false); }}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-xs font-semibold cursor-pointer ${
              activeTab === 'nilai' 
                ? 'bg-[#1da0ce] text-white shadow-lg shadow-[#1da0ce]/15 font-bold' 
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Data Nilai
          </button>



          <button 
            onClick={() => { setActiveTab('kkm'); resetForm(); setIsMobileMenuOpen(false); }}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-xs font-semibold cursor-pointer ${
              activeTab === 'kkm' 
                ? 'bg-[#1da0ce] text-white shadow-lg shadow-[#1da0ce]/15 font-bold' 
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings2 className="w-4 h-4" /> Pengaturan Portal
          </button>

          <button 
            onClick={() => { setActiveTab('datasiswa'); resetForm(); setIsMobileMenuOpen(false); }}
            className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-xs font-semibold cursor-pointer ${
              activeTab === 'datasiswa' 
                ? 'bg-[#1da0ce] text-white shadow-lg shadow-[#1da0ce]/15 font-bold' 
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Data Siswa (Profil)
          </button>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800" style={{ backgroundColor: '#093f41' }}>
          <button 
            onClick={onLogout}
            className="w-full px-4 py-3 text-[#262121] rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-extrabold cursor-pointer hover:opacity-90"
            style={{ backgroundColor: '#ffc570', color: '#262121', borderStyle: 'none' }}
          >
            Keluar Portal
          </button>
        </div>
      </aside>

      {/* Konten Utama */}
      <main className="flex-grow p-6 md:p-8 space-y-6 overflow-x-hidden bg-slate-50/30">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard Analitik'}
              {activeTab === 'nilai' && 'Basis Data Nilai Kelas'}
              {activeTab === 'kkm' && 'Pengaturan dan KKM Portal'}
              {activeTab === 'datasiswa' && 'Data Profil Siswa Lengkap'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'dashboard' && 'Analisis visual performa hasil belajar dan sebaran huruf mutu.'}
              {activeTab === 'nilai' && 'Kelola daftar nilai, unduh atau unggah berkas Excel secara terpadu.'}
              {activeTab === 'kkm' && 'Konfigurasi batas kelulusan minimal, serta kustomisasi nama dan logo portal sekolah.'}
              {activeTab === 'datasiswa' && 'Tinjau informasi profil mandiri, nomor induk, NISN, data keluarga, dan konfirmasi biodata dari siswa.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm text-[10px] md:text-xs text-slate-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
              Database Lokal: {students.length} Siswa
            </div>
          </div>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Grid Statistik Kartu */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Siswa */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex-shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.totalSiswa}</h3>
                </div>
              </div>

              {/* Rata-rata */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl border border-green-100 flex-shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata Kelas</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.rataRata}</h3>
                </div>
              </div>

              {/* Tertinggi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 flex-shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai Max</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.nilaiTertinggi}</h3>
                </div>
              </div>

              {/* Terendah */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 flex-shrink-0">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai Min</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.nilaiTerendah}</h3>
                </div>
              </div>

              {/* Jumlah Kelas */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 flex-shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Rombel</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.totalKelas}</h3>
                </div>
              </div>
            </div>

            {/* Visualisasi Custom SVG Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Bar Chart Predikat (A-E) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-8 flex flex-col justify-between min-h-[350px]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-3.5">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Distribusi Huruf Mutu Nilai</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {distFilterKelas === 'all' ? 'Semua Kelas' : distFilterKelas} •{' '}
                      {distFilterKategori === 'rata_rata' ? 'Rata-rata Nilai' : 
                       distFilterKategori === 'pai' ? 'Pendidikan Agama' :
                       distFilterKategori === 'pkn' ? 'Pancasila / PPKn' :
                       distFilterKategori === 'bInd' ? 'Bahasa Indonesia' :
                       distFilterKategori === 'mtk' ? 'Matematika' :
                       distFilterKategori === 'ipas' ? 'IPAS' :
                       distFilterKategori === 'seni' ? 'Seni Rupa/Seni Musik' :
                       distFilterKategori === 'pjok' ? 'PJOK' :
                       distFilterKategori === 'bIng' ? 'Bahasa Inggris' :
                       distFilterKategori === 'bSnd' ? 'Bahasa Sunda' : distFilterKategori}
                    </p>
                  </div>

                  {/* Filter Controls for Chart */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Kelas Select */}
                    <select
                      value={distFilterKelas}
                      onChange={(e) => setDistFilterKelas(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Semua Kelas</option>
                      {classesList.map(kelas => (
                        <option key={kelas} value={kelas}>{kelas}</option>
                      ))}
                    </select>

                    {/* Kategori Select */}
                    <select
                      value={distFilterKategori}
                      onChange={(e) => setDistFilterKategori(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="rata_rata">Rata-rata Nilai</option>
                      <option value="pai">Pendidikan Agama</option>
                      <option value="pkn">Pancasila/PPKn</option>
                      <option value="bInd">Bahasa Indonesia</option>
                      <option value="mtk">Matematika</option>
                      <option value="ipas">IPAS</option>
                      <option value="seni">Seni Rupa/Seni Musik</option>
                      <option value="pjok">PJOK</option>
                      <option value="bIng">Bahasa Inggris</option>
                      <option value="bSnd">Bahasa Sunda</option>
                    </select>
                  </div>
                </div>
                
                {/* SVG Bar Chart */}
                <div className="flex-grow mt-6 flex items-end justify-between px-4 h-[180px] border-b border-slate-100 pb-2 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-x-0 bottom-2 top-0 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-t border-slate-100 w-full"></div>
                    <div className="border-t border-slate-100 w-full"></div>
                    <div className="border-t border-slate-100 w-full"></div>
                    <div className="border-t border-slate-100 w-full"></div>
                  </div>

                  {/* Bars */}
                  {Object.entries(chartDistribution.counts).map(([key, value]) => {
                    const valuesArray = Object.values(chartDistribution.counts) as number[];
                    const maxVal = Math.max(...valuesArray) || 1;
                    const heightPercent = ((value as number) / maxVal) * 100;
                    return (
                      <div key={key} className="flex flex-col items-center gap-2 w-12 group relative z-10">
                        {/* Value Hover Tooltip */}
                        <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-md whitespace-nowrap z-30">
                          {value as number} Siswa ({chartDistribution.total > 0 ? Math.round(((value as number) / chartDistribution.total) * 100) : 0}%)
                        </div>
                        {/* Column Bar */}
                        <div 
                          className="w-8 bg-blue-600 rounded-t-lg transition-all duration-700 hover:bg-blue-500 shadow-sm"
                          style={{ height: `${Math.max(heightPercent, 5)}%` }}
                        ></div>
                        <span className="text-xs font-bold text-slate-500">{key}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-between text-[10px] text-slate-400 font-semibold px-4">
                  <span>Rentang: A (≥90), B (80-89), C (70-79), D (60-69), E (&lt;60)</span>
                  <span>Total: {chartDistribution.total} Siswa Teranalisis</span>
                </div>
              </div>

              {/* Donut Chart Tingkat Kelulusan */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col justify-between min-h-[350px]">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Status Kelulusan Kelas</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Persentase ketuntasan belajar siswa berdasarkan target KKM ({kkm}).</p>
                </div>

                {/* SVG Donut Chart */}
                <div className="flex-grow mt-4 flex items-center justify-center relative">
                  {stats.totalSiswa > 0 ? (
                    (() => {
                      const percentLulus = Math.round((stats.lulus / stats.totalSiswa) * 100);
                      const radius = 50;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (percentLulus / 100) * circumference;

                      return (
                        <div className="relative flex items-center justify-center">
                          <svg width="140" height="140" className="transform -rotate-90">
                            {/* Background Track */}
                            <circle
                              cx="70"
                              cy="70"
                              r={radius}
                              stroke="#F1F5F9"
                              strokeWidth="12"
                              fill="transparent"
                            />
                            {/* Value Circle */}
                            <circle
                              cx="70"
                              cy="70"
                              r={radius}
                              stroke="#22C55E"
                              strokeWidth="12"
                              fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <h4 className="text-2xl font-black text-slate-800">{percentLulus}%</h4>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Tuntas</p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-slate-400">Tidak ada data</span>
                  )}
                </div>

                {/* Legend */}
                <div className="space-y-1.5 pt-4 border-t border-slate-100 text-[10px] text-slate-500 font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Tuntas (≥ {kkm})
                    </span>
                    <span className="font-bold text-slate-700">{stats.lulus} Siswa</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span> Remedial (&lt; {kkm})
                    </span>
                    <span className="font-bold text-slate-700">{stats.bimbingan} Siswa</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Siapa saja yang mengakses aplikasi ini */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-3">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    Log Akses Aplikasi Real-time
                  </h3>
                  <p className="text-[10px] text-slate-400">Daftar pengguna terbaru yang masuk atau mencari data nilai siswa.</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-200 self-start sm:self-auto">
                  {accessLogs.length} Aktivitas Tercatat
                </span>
              </div>
              
              {/* Filter Controls for Log Akses */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-semibold">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Tipe Filter Hari */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rentang Hari:</span>
                    <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => setLogFilterType('today')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          logFilterType === 'today' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilterType('custom')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          logFilterType === 'custom' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Pilih Tanggal
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilterType('all')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          logFilterType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Semua Hari
                      </button>
                    </div>
                  </div>

                  {/* Input Tanggal Khusus */}
                  {logFilterType === 'custom' && (
                    <div className="flex items-center gap-1.5 animate-fade-in">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tanggal:</span>
                      <input
                        type="date"
                        value={logFilterDate}
                        onChange={(e) => setLogFilterDate(e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg outline-none font-bold text-[11px] text-slate-700"
                      />
                    </div>
                  )}

                  {/* Filter Jam */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jam:</span>
                    <select
                      value={logFilterHour}
                      onChange={(e) => setLogFilterHour(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none font-bold text-[11px] text-slate-700 cursor-pointer"
                    >
                      <option value="all">Semua Jam</option>
                      {Array.from({ length: 24 }).map((_, i) => {
                        const h = String(i).padStart(2, '0');
                        return (
                          <option key={h} value={h}>
                            {h}:00 - {h}:59
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-extrabold bg-white px-2 py-1 rounded-md border border-slate-200">
                  {accessLogs.filter(log => {
                    const parts = log.timestamp.split(', ');
                    const datePart = parts[0] || '';
                    const timePart = parts[1] || '';
                    const hourPart = timePart.split(':')[0] || '';
                    
                    if (logFilterType === 'today') {
                      const todayDMY = (() => {
                        try {
                          const today = new Date();
                          const day = String(today.getDate()).padStart(2, '0');
                          const month = String(today.getMonth() + 1).padStart(2, '0');
                          const year = today.getFullYear();
                          return `${day}/${month}/${year}`;
                        } catch (e) {
                          return '27/06/2026';
                        }
                      })();
                      if (datePart !== todayDMY) return false;
                    } else if (logFilterType === 'custom') {
                      const customDMY = (() => {
                        const partsYMD = logFilterDate.split('-');
                        if (partsYMD.length !== 3) return '';
                        const [year, month, day] = partsYMD;
                        return `${day}/${month}/${year}`;
                      })();
                      if (datePart !== customDMY) return false;
                    }
                    if (logFilterHour !== 'all' && hourPart !== logFilterHour) return false;
                    return true;
                  }).length} dari {accessLogs.length} filter aktif
                </div>
              </div>
              
              {accessLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">Belum ada riwayat akses aplikasi.</div>
              ) : (
                (() => {
                  const items = accessLogs.filter(log => {
                    const parts = log.timestamp.split(', ');
                    const datePart = parts[0] || '';
                    const timePart = parts[1] || '';
                    const hourPart = timePart.split(':')[0] || '';
                    
                    if (logFilterType === 'today') {
                      const todayDMY = (() => {
                        try {
                          const today = new Date();
                          const day = String(today.getDate()).padStart(2, '0');
                          const month = String(today.getMonth() + 1).padStart(2, '0');
                          const year = today.getFullYear();
                          return `${day}/${month}/${year}`;
                        } catch (e) {
                          return '27/06/2026';
                        }
                      })();
                      if (datePart !== todayDMY) return false;
                    } else if (logFilterType === 'custom') {
                      const customDMY = (() => {
                        const partsYMD = logFilterDate.split('-');
                        if (partsYMD.length !== 3) return '';
                        const [year, month, day] = partsYMD;
                        return `${day}/${month}/${year}`;
                      })();
                      if (datePart !== customDMY) return false;
                    }
                    
                    if (logFilterHour !== 'all' && hourPart !== logFilterHour) return false;
                    return true;
                  });

                  if (items.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        Tidak ada riwayat akses yang cocok dengan filter tanggal/jam terpilih.
                        <button
                          type="button"
                          onClick={() => { setLogFilterType('all'); setLogFilterHour('all'); }}
                          className="mt-2 block mx-auto text-[10px] text-blue-600 font-extrabold underline cursor-pointer"
                        >
                          Tampilkan Semua Riwayat
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto overflow-y-auto max-h-96 border border-slate-100 rounded-2xl animate-fade-in pr-1">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="sticky top-0 bg-slate-50 shadow-sm z-20">
                          <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            <th className="px-3 py-2.5 font-extrabold">Nama / Pengguna</th>
                            <th className="px-3 py-2.5 font-extrabold">Identitas / NISN</th>
                            <th className="px-3 py-2.5 font-extrabold">Peran</th>
                            <th className="px-3 py-2.5 font-extrabold">Waktu Akses</th>
                            <th className="px-3 py-2.5 font-extrabold">Aktivitas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                          {items.map((log) => {
                            const roleColors = {
                              guru: 'bg-blue-50 text-blue-700 border-blue-200',
                              siswa: 'bg-green-50 text-green-700 border-green-200',
                              tamu: 'bg-amber-50 text-amber-700 border-amber-200'
                            };
                            const roleLabels = {
                              guru: 'Guru / Pendidik',
                              siswa: 'Siswa / Wali',
                              tamu: 'Tamu / Umum'
                            };
                            return (
                              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-3 py-3 flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                                    <img 
                                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${log.nisn}`} 
                                      alt={log.name} 
                                      className="w-7 h-7 object-cover animate-fade-in"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center font-bold text-slate-500 text-xs bg-slate-100 z-[-1]">
                                      {log.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-bold text-slate-800">{log.name}</span>
                                </td>
                                <td className="px-3 py-3 font-mono text-slate-500 text-[11px]">{log.nisn}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${roleColors[log.role] || roleColors.tamu}`}>
                                    {roleLabels[log.role] || log.role}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-slate-500 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                                <td className="px-3 py-3 font-semibold text-slate-600">{log.activity}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>

          </div>
        )}

        {/* TAB 2: DATA NILAI TABEL */}
        {activeTab === 'nilai' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Header and Controls */}
              <div className="p-6 border-b border-slate-200 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-slate-800">Tabel Basis Data SINS</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Seluruh data hasil belajar muatan kurikulum tercermin di bawah ini.</p>
                    
                    {/* Semester Navigation Sub-Tabs */}
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl mt-3 max-w-xs md:max-w-sm gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setNilaiSemesterTab('s1'); setCurrentPage(1); }}
                        className={`flex-grow sm:flex-1 py-2 px-3 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          nilaiSemesterTab === 's1'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15 font-black'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Semester 1</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNilaiSemesterTab('s2'); setCurrentPage(1); }}
                        className={`flex-grow sm:flex-1 py-2 px-3 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          nilaiSemesterTab === 's2'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15 font-black'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Semester 2</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setNilaiSemesterTab('rekap'); setCurrentPage(1); }}
                        className={`flex-grow sm:flex-1 py-2 px-3 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          nilaiSemesterTab === 'rekap'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/15 font-black'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Perbandingan</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Action Tools */}
                  <div className="flex flex-col gap-3 w-full lg:w-auto">
                    {selectedNisns.length > 0 && (
                      <div className="flex justify-start">
                        <button 
                          type="button"
                          onClick={handleDeleteSelected}
                          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black rounded-xl flex items-center gap-2 transition-all shadow-md shadow-red-600/20 cursor-pointer animate-pulse"
                          title={`Hapus ${selectedNisns.length} siswa terpilih secara massal`}
                        >
                          <Trash2 className="w-4 h-4" /> Hapus Terpilih ({selectedNisns.length} Siswa)
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs w-full lg:w-auto">
                      <button 
                        type="button"
                        onClick={() => { resetForm(); setIsFormModalOpen(true); }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/10 cursor-pointer h-10 flex-1 min-w-[120px] whitespace-nowrap"
                        title="Tambah data siswa baru secara manual"
                      >
                        <Plus className="w-4 h-4 flex-shrink-0" /> <span className="whitespace-nowrap">Tambah Siswa</span>
                      </button>
                      <button 
                        type="button"
                        onClick={exportToExcel}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-green-600/10 cursor-pointer h-10 flex-1 min-w-[120px] whitespace-nowrap"
                        title="Ekspor seluruh data ke file Excel (.xlsx)"
                      >
                        <FileSpreadsheet className="w-4 h-4 flex-shrink-0" /> <span className="whitespace-nowrap">Ekspor Data</span>
                      </button>
                      <button 
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-700/10 cursor-pointer h-10 flex-1 min-w-[120px] whitespace-nowrap"
                        title="Unduh template Excel kosong dengan format kurikulum"
                      >
                        <Download className="w-4 h-4 flex-shrink-0" /> <span className="whitespace-nowrap">Unduh Template</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer h-10 flex-1 min-w-[120px] whitespace-nowrap"
                        title="Unggah template daftar nilai Excel yang telah diisi"
                      >
                        <Upload className="w-4 h-4 flex-shrink-0" /> <span className="whitespace-nowrap">Unggah Nilai</span>
                      </button>
                      <button 
                        type="button"
                        onClick={triggerAutoRankAll}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-600/10 cursor-pointer h-10 flex-1 min-w-[120px] whitespace-nowrap"
                        title="Hitung ulang peringkat seluruh siswa secara berurutan"
                      >
                        <RotateCcw className="w-4 h-4 flex-shrink-0" /> <span className="whitespace-nowrap">Auto-Rank</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari NISN atau Nama Siswa..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <select
                      value={filterKelas}
                      onChange={(e) => { setFilterKelas(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs transition-all font-semibold"
                    >
                      <option value="">Semua Rombel / Kelas</option>
                      {classesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs transition-all font-semibold"
                    >
                      <option value="">Semua Status Kelulusan</option>
                      <option value="LULUS">TUNTAS (LULUS)</option>
                      <option value="BIMBINGAN">REMEDIAL (PERLU BIMBINGAN)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">No</th>
                      <th onClick={() => handleSort('nisn')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors">NISN</th>
                      <th onClick={() => handleSort('nama')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors">Nama Siswa</th>
                      <th className="py-3 px-2 text-center">LP</th>
                      
                      {nilaiSemesterTab !== 'rekap' ? (
                        <>
                          <th onClick={() => handleSort('pai')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">PAI</th>
                          <th onClick={() => handleSort('pkn')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">PKN</th>
                          <th onClick={() => handleSort('bInd')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">B.IND</th>
                          <th onClick={() => handleSort('mtk')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">MTK</th>
                          <th onClick={() => handleSort('ipas')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">IPAS</th>
                          <th onClick={() => handleSort('seni')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">SENI</th>
                          <th onClick={() => handleSort('pjok')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">PJOK</th>
                          <th onClick={() => handleSort('bIng')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">B.ING</th>
                          <th onClick={() => handleSort('bSnd')} className="py-3 px-1 text-center cursor-pointer hover:bg-slate-100 transition-colors">B.SND</th>
                          <th onClick={() => handleSort('nilaiAkhir')} className="py-3 px-2 text-center cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50/10 font-bold text-blue-600">Rata-rata</th>
                          <th onClick={() => handleSort('ranking')} className="py-3 px-2 text-center cursor-pointer hover:bg-indigo-50 transition-colors bg-indigo-50/10 font-bold text-indigo-700">Ranking</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-2 text-center bg-blue-50/20 font-bold text-blue-600">Rata-rata S1</th>
                          <th className="py-3 px-2 text-center bg-indigo-50/20 font-bold text-indigo-600">Rata-rata S2</th>
                          <th className="py-3 px-2 text-center font-bold text-emerald-600">Progres</th>
                          <th className="py-3 px-2 text-center font-bold text-slate-600">Rank S1</th>
                          <th className="py-3 px-2 text-center font-bold text-indigo-700">Rank S2</th>
                        </>
                      )}
                      
                      <th className="py-3 px-4 text-center select-none">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[10px] tracking-wider uppercase">Aksi</span>
                          <label className="inline-flex items-center gap-1 cursor-pointer font-bold text-[8px] text-slate-400 hover:text-slate-600 normal-case">
                            <input 
                              type="checkbox"
                              checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedNisns.includes(s.nisn))}
                              onChange={handleToggleSelectAll}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                            />
                            <span>Pilih Semua</span>
                          </label>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map((s, index) => {
                        const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;
                        return (
                          <tr key={s.nisn} className={`hover:bg-slate-50/50 transition-colors font-semibold text-slate-700 ${selectedNisns.includes(s.nisn) ? 'bg-indigo-50/20' : ''}`}>
                            <td className="py-3 px-4 font-bold text-slate-400">{globalIndex}</td>
                            <td className="py-3 px-3 font-bold text-slate-700">{s.nisn}</td>
                            <td className="py-3 px-3 font-bold text-slate-900 truncate max-w-[150px]" title={s.nama}>
                              <div className="text-slate-800 font-bold truncate">{s.nama}</div>
                              {s.keteranganRanking && (
                                <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5 truncate" title={s.keteranganRanking}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> {s.keteranganRanking}
                                </div>
                              )}
                              {s.prestasi && (
                                <div className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1 mt-0.5 truncate" title={s.prestasi}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> 🏆 {s.prestasi}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-500 font-bold">{s.lp}</td>
                            
                            {nilaiSemesterTab !== 'rekap' ? (
                              <>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.pai ?? '-') : (s.pai_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.pkn ?? '-') : (s.pkn_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.bInd ?? '-') : (s.bInd_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.mtk ?? '-') : (s.mtk_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.ipas ?? '-') : (s.ipas_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.seni ?? '-') : (s.seni_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.pjok ?? '-') : (s.pjok_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.bIng ?? '-') : (s.bIng_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-1 text-center text-slate-600">
                                  {nilaiSemesterTab === 's1' ? (s.bSnd ?? '-') : (s.bSnd_s2 ?? '-')}
                                </td>
                                <td className={`py-3 px-2 text-center font-bold bg-blue-50/20 text-blue-600`}>
                                  {nilaiSemesterTab === 's1' ? (s.nilaiAkhir ?? '-') : (s.nilaiAkhir_s2 ?? '-')}
                                </td>
                                <td className="py-3 px-2 text-center font-bold bg-indigo-50/20 text-indigo-950">
                                  {nilaiSemesterTab === 's1' ? (s.ranking ? `#${s.ranking}` : '-') : (s.ranking_s2 ? `#${s.ranking_s2}` : '-')}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-3 px-2 text-center font-semibold text-slate-700 bg-blue-50/10">
                                  {s.nilaiAkhir ?? '-'}
                                </td>
                                <td className="py-3 px-2 text-center font-semibold text-indigo-700 bg-indigo-50/10">
                                  {s.nilaiAkhir_s2 ?? '-'}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  {(() => {
                                    if (s.nilaiAkhir === undefined || s.nilaiAkhir_s2 === undefined) {
                                      return <span className="text-slate-400 font-bold">-</span>;
                                    }
                                    const diff = s.nilaiAkhir_s2 - s.nilaiAkhir;
                                    const rounded = Math.round(diff * 10) / 10;
                                    if (rounded > 0) {
                                      return <span className="text-emerald-600 font-extrabold">▲ +{rounded}</span>;
                                    } else if (rounded < 0) {
                                      return <span className="text-rose-600 font-extrabold">▼ {rounded}</span>;
                                    } else {
                                      return <span className="text-slate-400 font-bold">-</span>;
                                    }
                                  })()}
                                </td>
                                <td className="py-3 px-2 text-center text-slate-500 font-medium">
                                  {s.ranking ? `#${s.ranking}` : '-'}
                                </td>
                                <td className="py-3 px-2 text-center text-indigo-700 font-bold">
                                  {s.ranking_s2 ? `#${s.ranking_s2}` : '-'}
                                </td>
                              </>
                            )}
                            
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <label className="inline-flex items-center cursor-pointer p-1 rounded-md hover:bg-slate-100 transition-colors" title="Pilih Siswa">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedNisns.includes(s.nisn)}
                                    onChange={() => handleToggleSelect(s.nisn)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                </label>
                                <div className="w-px h-3.5 bg-slate-200"></div>
                                <button 
                                  type="button"
                                  onClick={() => triggerDetail(s)}
                                  className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                  title="Lihat Detail Siswa"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => triggerDelete(s)}
                                  className="p-1 hover:bg-red-50 text-red-600 rounded-lg transition-all cursor-pointer"
                                  title="Hapus Data"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={16} className="py-12 text-center text-slate-400 font-bold">
                          Tidak ada baris data yang cocok dengan kriteria pencarian Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-bold bg-slate-50/20">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <p>
                    {rowsPerPage === 'all' ? (
                      <span>Menampilkan seluruh {filteredStudents.length} Siswa</span>
                    ) : (
                      <span>
                        Menampilkan {filteredStudents.length > 0 ? (currentPage - 1) * (rowsPerPage as number) + 1 : 0} - {Math.min(currentPage * (rowsPerPage as number), filteredStudents.length)} dari {filteredStudents.length} Siswa
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (rowsPerPage === 'all') {
                        setRowsPerPage(10);
                        setCurrentPage(1);
                      } else {
                        setRowsPerPage('all');
                        setCurrentPage(1);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      rowsPerPage === 'all'
                        ? 'bg-blue-600 border-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/15'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    {rowsPerPage === 'all' ? 'Tampilkan Per Halaman (10)' : 'Tampilkan Seluruh Data'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1 || rowsPerPage === 'all'}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-3">Halaman {currentPage} dari {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages || rowsPerPage === 'all'}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}



        {/* TAB 4: PORTAL CONFIGURATION SETTINGS */}
        {activeTab === 'kkm' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* KKM Setting Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-500/5 to-transparent">
                  <h3 className="font-bold text-sm text-slate-800">Batas KKM Global Sekolah</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Atur target ketuntasan minimal untuk penentuan status kelulusan siswa.</p>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Kriteria Ketuntasan Minimal (KKM)</label>
                    <input 
                      type="number" 
                      min={10}
                      max={95}
                      value={kkm}
                      onChange={(e) => onUpdateKkm(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-3.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-semibold border border-blue-100">
                    <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
                    <span>Mengubah KKM akan langsung memperbarui status lulus/remedial di portal siswa secara real-time.</span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100">
                <button 
                  onClick={() => showToast('success', `KKM Global sekolah berhasil diperbarui ke ${kkm}!`)}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-green-600/10 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" /> Simpan Batas KKM
                </button>
              </div>
            </div>

            {/* Custom Branding & Student Feature Access Controls */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-500/5 to-transparent">
                  <h3 className="font-bold text-sm text-slate-800">Identitas Portal & Kontrol Akses Siswa</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Personalisasikan nama portal dan kelola akses fitur mandiri untuk siswa.</p>
                </div>
                
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Nama Aplikasi / Sekolah</label>
                    <input 
                      type="text" 
                      value={appName}
                      onChange={(e) => onUpdateAppName(e.target.value)}
                      placeholder="Masukkan nama aplikasi..."
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold text-slate-700"
                    />
                  </div>

                  {/* Kontrol Fitur Akses Siswa */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Pengaturan Akses Fitur Siswa
                    </label>
                    
                    <div className="space-y-2.5">
                      {/* Toggle Cek Nilai */}
                      <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={schoolSettings.showRaporCard !== false}
                          onChange={(e) => {
                            onUpdateSchoolSettings({
                              ...schoolSettings,
                              showRaporCard: e.target.checked
                            });
                          }}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                        />
                        <div className="flex-grow">
                          <span className="block text-xs font-extrabold text-slate-700">Aktifkan Cek Nilai</span>
                          <span className="block text-[10px] text-slate-400">Izinkan siswa untuk memeriksa nilai rapor semester.</span>
                        </div>
                      </label>

                      {/* Toggle Isian Data */}
                      <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={schoolSettings.showBiodataCard !== false}
                          onChange={(e) => {
                            onUpdateSchoolSettings({
                              ...schoolSettings,
                              showBiodataCard: e.target.checked
                            });
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                        />
                        <div className="flex-grow">
                          <span className="block text-xs font-extrabold text-slate-700">Aktifkan Isian Data</span>
                          <span className="block text-[10px] text-slate-400">Izinkan siswa melengkapi data profil & isian mandiri.</span>
                        </div>
                      </label>

                      {/* Toggle Cetak Kartu */}
                      <label className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={schoolSettings.showNisnCard !== false}
                          onChange={(e) => {
                            onUpdateSchoolSettings({
                              ...schoolSettings,
                              showNisnCard: e.target.checked
                            });
                          }}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                        />
                        <div className="flex-grow">
                          <span className="block text-xs font-extrabold text-slate-700">Aktifkan Cetak Kartu NISN</span>
                          <span className="block text-[10px] text-slate-400">Izinkan siswa mencetak kartu NISN digital mandiri.</span>
                        </div>
                      </label>
                    </div>

                    {/* Google Sheets Sync Integration Section */}
                    <div className="pt-4 border-t border-slate-100 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-emerald-600" /> Integrasi Google Sheets (Real-Time Sync)
                      </h4>
                      <p className="text-[10px] text-slate-500">Hubungkan portal ini dengan database Google Sheets Anda menggunakan Web App URL yang diperoleh saat mendeploy script.</p>
                      
                      <label className="flex items-center gap-3 p-3 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={!!schoolSettings.sheetsSyncEnabled}
                          onChange={(e) => {
                            onUpdateSchoolSettings({
                              ...schoolSettings,
                              sheetsSyncEnabled: e.target.checked
                            });
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                        />
                        <div className="flex-grow">
                          <span className="block text-xs font-extrabold text-slate-700 text-emerald-950">Aktifkan Sinkronisasi Otomatis</span>
                          <span className="block text-[10px] text-emerald-700">Kirim data & log secara otomatis ke spreadsheet.</span>
                        </div>
                      </label>

                      {schoolSettings.sheetsSyncEnabled && (
                        <div className="space-y-2 animate-fade-in">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Google Apps Script Web App URL</label>
                          <input 
                            type="text" 
                            value={schoolSettings.sheetsWebAppUrl || ''}
                            onChange={(e) => onUpdateSchoolSettings({
                              ...schoolSettings,
                              sheetsWebAppUrl: e.target.value
                            })}
                            placeholder="Contoh: https://script.google.com/macros/s/.../exec"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                          />
                          <p className="text-[9px] text-slate-400 font-medium">Buka menu <b>Script Code & Deploy Guide</b> untuk menyalin kode Apps Script Anda.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100">
                <button 
                  onClick={() => showToast('success', 'Pengaturan portal berhasil disimpan dan disinkronkan!')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" /> Simpan Pengaturan Portal
                </button>
              </div>
            </div>

            {/* School & Wali Kelas Details Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden md:col-span-2 animate-fade-in flex flex-col justify-between">
              <div>
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-500/5 to-transparent flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Informasi Sekolah, Guru Wali Kelas & Kop Surat</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Kelola identitas resmi sekolah dan wali kelas untuk keperluan kop surat rapor.</p>
                  </div>
                  <UserCheck className="w-5 h-5 text-emerald-500" />
                </div>

                <div className="p-6 space-y-6">
                  {/* Grid fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Section 1: Identitas Sekolah */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b pb-1">1. Identitas Sekolah</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Nama Sekolah</label>
                          <input 
                            type="text" 
                            value={schoolSettings.namaSekolah || ''}
                            onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, namaSekolah: e.target.value })}
                            placeholder="Contoh: SDN 1 Bojongkenyot"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase">NPSN</label>
                          <input 
                            type="text" 
                            value={schoolSettings.npsn || ''}
                            onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, npsn: e.target.value })}
                            placeholder="Contoh: 10234567"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Alamat Sekolah</label>
                          <textarea 
                            value={schoolSettings.alamatSekolah || ''}
                            onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, alamatSekolah: e.target.value })}
                            placeholder="Jl. Bojong No. 45"
                            rows={2}
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold resize-none outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Kecamatan</label>
                            <input 
                              type="text" 
                              value={schoolSettings.kecamatan || ''}
                              onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, kecamatan: e.target.value })}
                              placeholder="Kecamatan"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Kabupaten</label>
                            <input 
                              type="text" 
                              value={schoolSettings.kabupaten || ''}
                              onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, kabupaten: e.target.value })}
                              placeholder="Kabupaten"
                              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Provinsi</label>
                          <input 
                            type="text" 
                            value={schoolSettings.provinsi || ''}
                            onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, provinsi: e.target.value })}
                            placeholder="Provinsi"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Wali Kelas */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b pb-1">2. Wali Kelas (Guru Kelas)</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Nama Lengkap Wali Kelas</label>
                          <input 
                            type="text" 
                            value={schoolSettings.namaWali || ''}
                            onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, namaWali: e.target.value })}
                            placeholder="Contoh: Dra. Sri Wahyuni"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase">NIP Wali Kelas</label>
                          <input 
                            type="text" 
                            value={schoolSettings.nipWali || ''}
                            onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, nipWali: e.target.value })}
                            placeholder="NIP (18 digit)"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase">Pangkat / Golongan</label>
                          <input 
                            type="text" 
                            value={schoolSettings.pangkatWali || ''}
                            onChange={(e) => onUpdateSchoolSettings({ ...schoolSettings, pangkatWali: e.target.value })}
                            placeholder="Contoh: Pembina, IV/a"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Visual Aset / Uploads */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide border-b pb-1">3. Aset Kop & Foto</h4>
                      <div className="space-y-4">
                        {/* Logo Kabupaten */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
                            {schoolSettings.logoKabupaten ? (
                              <img src={schoolSettings.logoKabupaten} alt="Logo Kab" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[9px] text-slate-400 font-extrabold">Logo Kab</span>
                            )}
                          </div>
                          <div className="flex-grow">
                            <p className="text-[10px] font-extrabold text-slate-700">Logo Kabupaten</p>
                            <button
                              type="button"
                              onClick={() => logoKabupatenRef.current?.click()}
                              className="mt-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-black rounded-lg cursor-pointer transition-all"
                            >
                              Unggah Logo
                            </button>
                            <input 
                              type="file" 
                              ref={logoKabupatenRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => handleSettingsImageUpload(e, 'logoKabupaten')} 
                            />
                          </div>
                        </div>

                        {/* Logo Sekolah */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
                            {schoolSettings.logoSekolah ? (
                              <img src={schoolSettings.logoSekolah} alt="Logo Sekolah" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[9px] text-slate-400 font-extrabold">Logo Sekolah</span>
                            )}
                          </div>
                          <div className="flex-grow">
                            <p className="text-[10px] font-extrabold text-slate-700">Logo Sekolah</p>
                            <button
                              type="button"
                              onClick={() => logoSekolahRef.current?.click()}
                              className="mt-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-black rounded-lg cursor-pointer transition-all"
                            >
                              Unggah Logo
                            </button>
                            <input 
                              type="file" 
                              ref={logoSekolahRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => handleSettingsImageUpload(e, 'logoSekolah')} 
                            />
                          </div>
                        </div>

                        {/* Foto Guru */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
                            {schoolSettings.photoWali ? (
                              <img src={schoolSettings.photoWali} alt="Foto Wali" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-slate-400 font-extrabold">Foto Wali</span>
                            )}
                          </div>
                          <div className="flex-grow">
                            <p className="text-[10px] font-extrabold text-slate-700">Foto Wali Kelas</p>
                            <button
                              type="button"
                              onClick={() => photoWaliRef.current?.click()}
                              className="mt-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-black rounded-lg cursor-pointer transition-all"
                            >
                              Unggah Foto
                            </button>
                            <input 
                              type="file" 
                              ref={photoWaliRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => handleSettingsImageUpload(e, 'photoWali')} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  type="button"
                  onClick={() => showToast('success', 'Data Sekolah & Guru Kelas berhasil diperbarui!')}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Simpan Perubahan Data Sekolah
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DATA SISWA PROFILING DASHBOARD */}
        {activeTab === 'datasiswa' && (() => {
          const displayedStudents = students.filter(s => {
            const matchesSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
            const matchesClass = profilFilterKelas === 'all' || s.kelas === profilFilterKelas;
            return matchesSearch && matchesClass;
          });

          return (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Daftar Lengkap Profil & Biodata Mandiri Siswa</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Pantau data kartu keluarga, alamat, dan status konfirmasi isian mandiri siswa secara digital.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Select Class Filter */}
                  <select
                    value={profilFilterKelas}
                    onChange={(e) => setProfilFilterKelas(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">Semua Kelas</option>
                    {classesList.map(kelas => (
                      <option key={kelas} value={kelas}>{kelas}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Cari profil siswa..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  {selectedNisns.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-red-600/10 cursor-pointer animate-pulse"
                      title="Hapus siswa terpilih secara massal"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus ({selectedNisns.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 shadow-sm">
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold border-b border-slate-100 uppercase tracking-wider">
                      <th className="px-6 py-4 text-center">Siswa</th>
                      <th className="px-4 py-4 text-center">No. Induk / NISN</th>
                      <th className="px-4 py-4 text-center">Data Orang Tua</th>
                      <th className="px-4 py-4 text-center">Alamat & KK</th>
                      <th className="px-4 py-4 text-center">Status Konfirmasi</th>
                      <th className="px-6 py-4 text-center select-none">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span>Aksi / Pilih</span>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-[10px] text-blue-100 hover:text-white normal-case">
                            <input 
                              type="checkbox"
                              checked={displayedStudents.length > 0 && displayedStudents.every(s => selectedNisns.includes(s.nisn))}
                              onChange={() => {
                                const displayedNisns = displayedStudents.map(s => s.nisn);
                                const allSelected = displayedNisns.length > 0 && displayedNisns.every(nisn => selectedNisns.includes(nisn));
                                if (allSelected) {
                                  setSelectedNisns(prev => prev.filter(nisn => !displayedNisns.includes(nisn)));
                                } else {
                                  setSelectedNisns(prev => Array.from(new Set([...prev, ...displayedNisns])));
                                }
                              }}
                              className="rounded border-blue-400 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer bg-white"
                            />
                            <span>Pilih Semua</span>
                          </label>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {displayedStudents.map((s) => (
                      <tr key={s.nisn} className={`hover:bg-slate-50/50 transition-colors ${selectedNisns.includes(s.nisn) ? 'bg-indigo-50/20' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {/* Larger Photo Container */}
                            <div className="w-14 h-16 md:w-16 md:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white border-2 border-slate-200/80 shadow-sm flex items-center justify-center relative">
                              {s.photo ? (
                                <img src={s.photo} alt={s.nama} className="w-full h-full object-cover" />
                              ) : (
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.nisn}`} alt={s.nama} className="w-full h-full p-1" />
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-sm text-slate-800">{s.nama}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-bold">Kelas {s.kelas || '6A'} • JK: {s.lp}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-mono text-slate-800 font-bold">No. Induk: {s.noInduk || '-'}</p>
                          <p className="font-mono text-slate-400 text-[10px] mt-0.5">NISN: {s.nisn}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-600"><span className="text-[10px] text-slate-400 font-extrabold uppercase">Ayah:</span> {s.namaAyah || '-'}</p>
                          <p className="text-slate-600 mt-0.5"><span className="text-[10px] text-slate-400 font-extrabold uppercase">Ibu:</span> {s.namaIbu || '-'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-600 text-[10px] font-mono">KK: {s.noKK || '-'}</p>
                          <p className="text-slate-500 mt-1 text-[10px] truncate max-w-[200px]" title={s.alamatSiswa}>
                            {s.alamatSiswa || '-'}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = students.map(item => {
                                if (item.nisn === s.nisn) {
                                  return { ...item, isBiodataConfirmed: !item.isBiodataConfirmed };
                                }
                                return item;
                              });
                              onUpdateStudents(updated);
                              showToast('success', `Status konfirmasi ${s.nama} berhasil diubah!`);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase border cursor-pointer transition-all ${
                              s.isBiodataConfirmed 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {s.isBiodataConfirmed ? '✓ Terverifikasi' : '⚠ Belum Konfirmasi'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Checkbox to Select for Deletion */}
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-black text-slate-500 hover:text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300">
                              <input
                                type="checkbox"
                                checked={selectedNisns.includes(s.nisn)}
                                onChange={() => handleToggleSelect(s.nisn)}
                                className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                              />
                              <span>Pilih</span>
                            </label>
                            {/* Inline Delete Button */}
                            <button
                              type="button"
                              onClick={() => triggerDelete(s)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer transition-all border border-transparent hover:border-red-100"
                              title="Hapus Siswa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {/* Detail Button */}
                            <button
                              type="button"
                              onClick={() => triggerDetail(s)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-extrabold cursor-pointer transition-all"
                            >
                              Buka Profil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {displayedStudents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                          Tidak ditemukan data siswa untuk kriteria pencarian / kelas saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      </main>

      {/* STUDENT DETAIL MODAL OVERLAY */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:bg-white print:p-0 print:static">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:w-full">
            
            {/* Header (Hidden in Print) */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-500/5 to-transparent flex items-center justify-between flex-shrink-0 print:hidden">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">
                  {isEditingDetail ? 'Edit Data Nilai & Biodata Siswa' : 'Rapor & Detail Perkembangan Siswa'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {isEditingDetail ? 'Ubah informasi identitas dan nilai akademik siswa.' : 'Pantau hasil akademik, prestasi, dan identitas siswa secara detail.'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => { setDetailStudent(null); setIsEditingDetail(false); }}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content / Printable Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow print:p-0 print:overflow-visible print:h-auto print-area">
              
              {!isEditingDetail ? (
                // VIEW MODE
                <>
                  {/* Header Profile Section */}
                  <div className="flex flex-col sm:flex-row gap-5 items-center bg-slate-50 p-5 rounded-2xl border border-slate-100 print:bg-white print:border-none print:p-0">
                    {/* Photo Siswa Container */}
                    <div className="relative group w-24 h-24 rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden flex items-center justify-center bg-slate-100 flex-shrink-0">
                      {detailStudent.photo ? (
                        <img 
                          src={detailStudent.photo} 
                          alt={detailStudent.nama} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${detailStudent.nisn}`} 
                          alt={detailStudent.nama} 
                          className="w-20 h-20 object-cover"
                        />
                      )}
                      {/* Photo upload input & overlay (Hidden in Print) */}
                      <div 
                        onClick={() => detailPhotoInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[9px] text-white font-extrabold cursor-pointer print:hidden text-center p-1"
                      >
                        <Camera className="w-4 h-4 mb-1 mx-auto" />
                        Ubah Foto
                      </div>
                      <input 
                        type="file"
                        ref={detailPhotoInputRef}
                        onChange={handleDetailPhotoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    <div className="text-center sm:text-left space-y-1.5 flex-grow">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h4 className="text-lg font-extrabold text-slate-800">{detailStudent.nama}</h4>
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-full border border-indigo-100 w-fit mx-auto sm:mx-0">
                          {detailStudent.kelas || 'Kelas 6A'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-bold space-y-0.5">
                        <p>NISN: <span className="font-mono text-slate-700 font-bold">{detailStudent.nisn}</span></p>
                        <p>Jenis Kelamin: <span className="text-slate-700">{detailStudent.lp === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</span></p>
                        {detailStudent.noInduk && <p>No. Induk: <span className="text-slate-700 font-mono">{detailStudent.noInduk}</span></p>}
                      </div>
                    </div>
                  </div>

                  {/* Semester Switch Tab (Hidden in Print) */}
                  <div className="flex bg-slate-100 p-1 rounded-xl max-w-xs gap-1 print:hidden">
                    <button
                      type="button"
                      onClick={() => setDetailSemester(1)}
                      className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        detailSemester === 1
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Semester 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailSemester(2)}
                      className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        detailSemester === 2
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Semester 2
                    </button>
                  </div>

                  {/* Printable Header for print copies to indicate semester */}
                  <div className="hidden print:block border-b-2 border-slate-800 pb-2 mb-4">
                    <h3 className="text-center text-xl font-bold uppercase tracking-wide">Transkrip Hasil Belajar Siswa</h3>
                    <p className="text-center text-xs font-semibold text-slate-500 mt-1">
                      SEMESTER {detailSemester} - TAHUN AJARAN 2026/2027
                    </p>
                  </div>

                  {/* Detailed Academic Scores Table / Cards */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-slate-400" /> Rincian Nilai Mata Pelajaran (Semester {detailSemester})
                      </h5>
                      <div className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg text-slate-500 font-extrabold">
                        KKM Global: {kkm}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { label: 'Pendidikan Agama & Budi Pekerti (PAI)', value: detailSemester === 1 ? detailStudent.pai : detailStudent.pai_s2 },
                        { label: 'Pendidikan Pancasila & Kewarganegaraan (PPKN)', value: detailSemester === 1 ? detailStudent.pkn : detailStudent.pkn_s2 },
                        { label: 'Bahasa Indonesia (B. IND)', value: detailSemester === 1 ? detailStudent.bInd : detailStudent.bInd_s2 },
                        { label: 'Matematika (MTK)', value: detailSemester === 1 ? detailStudent.mtk : detailStudent.mtk_s2 },
                        { label: 'Ilmu Pengetahuan Alam & Sosial (IPAS)', value: detailSemester === 1 ? detailStudent.ipas : detailStudent.ipas_s2 },
                        { label: 'Seni Budaya & Prakarya (SENI)', value: detailSemester === 1 ? detailStudent.seni : detailStudent.seni_s2 },
                        { label: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)', value: detailSemester === 1 ? detailStudent.pjok : detailStudent.pjok_s2 },
                        { label: 'Bahasa Inggris (B. ING)', value: detailSemester === 1 ? detailStudent.bIng : detailStudent.bIng_s2 },
                        { label: 'Bahasa Sunda (B.SND)', value: detailSemester === 1 ? detailStudent.bSnd : detailStudent.bSnd_s2 },
                      ].map((subject, idx) => {
                        const score = subject.value ?? 0;
                        const isPassed = score >= kkm;
                        return (
                          <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors">
                            <div className="space-y-0.5 pr-2">
                              <p className="text-[11px] font-bold text-slate-700">{subject.label}</p>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                                isPassed ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                              }`}>
                                {isPassed ? 'Lulus KKM' : 'Perlu Bimbingan'}
                              </span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-lg font-black text-slate-800">{score}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Final Summary Card */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-indigo-100/40 mt-3">
                      <div className="text-center p-3 bg-white rounded-xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase">Rata-Rata Nilai</p>
                        <p className="text-xl font-black text-indigo-700 mt-1">
                          {detailSemester === 1 ? (detailStudent.nilaiAkhir ?? '-') : (detailStudent.nilaiAkhir_s2 ?? '-')}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase">Peringkat Kelas</p>
                        <p className="text-xl font-black text-amber-600 mt-1">
                          {detailSemester === 1 
                            ? (detailStudent.ranking ? `#${detailStudent.ranking}` : '-') 
                            : (detailStudent.ranking_s2 ? `#${detailStudent.ranking_s2}` : '-')
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Biodata Lengkap Section */}
                  {(detailStudent.noInduk || detailStudent.namaAyah || detailStudent.alamatSiswa || detailStudent.agama || detailStudent.tempatLahir || detailStudent.isBiodataConfirmed) && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-slate-400" /> Informasi Biodata Lengkap
                      </h5>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2 font-semibold">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <p><span className="text-slate-400">No. Induk:</span> {detailStudent.noInduk || '-'}</p>
                          <p><span className="text-slate-400">Agama:</span> {detailStudent.agama || '-'}</p>
                          <p><span className="text-slate-400">Tempat Lahir:</span> {detailStudent.tempatLahir || '-'}</p>
                          <p><span className="text-slate-400">Tanggal Lahir:</span> {detailStudent.tanggalLahir ? new Date(detailStudent.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                          <p><span className="text-slate-400">Anak Ke:</span> {detailStudent.anakKe || '-'}</p>
                          <p><span className="text-slate-400">Jumlah Saudara:</span> {detailStudent.jumlahSaudara || '-'}</p>
                          <p><span className="text-slate-400">Nama Ayah:</span> {detailStudent.namaAyah || '-'}</p>
                          <p><span className="text-slate-400">Pekerjaan Ayah:</span> {detailStudent.pekerjaanAyah || '-'}</p>
                          <p><span className="text-slate-400">Nama Ibu:</span> {detailStudent.namaIbu || '-'}</p>
                          <p><span className="text-slate-400">Pekerjaan Ibu:</span> {detailStudent.pekerjaanIbu || '-'}</p>
                        </div>
                        <p className="border-t pt-2 mt-2"><span className="text-slate-400">Nomor Kartu Keluarga:</span> {detailStudent.noKK || '-'}</p>
                        <p><span className="text-slate-400">Alamat Lengkap:</span> {detailStudent.alamatSiswa || '-'}, Desa {detailStudent.desa || '-'}, Kec. {detailStudent.kecamatan || '-'}</p>
                      </div>
                    </div>
                  )}

                  {/* Achievements Section */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-4.5 h-4.5 text-amber-500" /> Prestasi & Penghargaan Siswa (Semester {detailSemester})
                    </h5>
                    
                    {/* Multiple Achievements Display */}
                    {(() => {
                      const achievements = detailSemester === 1 
                        ? (detailStudent.prestasiS1 || (detailStudent.prestasi ? [detailStudent.prestasi] : []))
                        : (detailStudent.prestasiS2 || []);

                      return achievements.length > 0 ? (
                        <div className="space-y-2">
                          {achievements.map((item, index) => (
                            <div key={index} className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl text-xs font-semibold text-slate-700 flex items-start gap-2.5">
                              <span className="text-md">🏆</span>
                              <div>
                                <p className="font-extrabold text-amber-800 text-[10px] uppercase tracking-wide">Prestasi {index + 1}:</p>
                                <p className="mt-0.5 text-slate-700 leading-relaxed font-extrabold">{item}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          {detailSemester === 2 
                            ? 'Belum ada catatan prestasi di Semester 2.' 
                            : 'Belum ada catatan prestasi di Semester 1.'}
                        </p>
                      );
                    })()}
                  </div>
                </>
              ) : (
                // EDIT MODE
                <div className="space-y-6">
                  {/* Edit Biodata Fields */}
                  <div className="space-y-4">
                    <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider border-b pb-1.5">
                      1. Identitas & Biodata Siswa
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Nama Lengkap</label>
                        <input 
                          type="text"
                          required
                          value={editDetailFields.nama || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, nama: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">No. Induk Siswa</label>
                        <input 
                          type="text"
                          value={editDetailFields.noInduk || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, noInduk: e.target.value })}
                          placeholder="No. Induk"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Jenis Kelamin</label>
                        <select 
                          value={editDetailFields.lp || 'L'}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, lp: e.target.value as 'L' | 'P' })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        >
                          <option value="L">Laki-Laki (L)</option>
                          <option value="P">Perempuan (P)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Agama</label>
                        <input 
                          type="text"
                          value={editDetailFields.agama || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, agama: e.target.value })}
                          placeholder="Agama"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Tempat Lahir</label>
                        <input 
                          type="text"
                          value={editDetailFields.tempatLahir || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, tempatLahir: e.target.value })}
                          placeholder="Tempat Lahir"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal Lahir</label>
                        <input 
                          type="date"
                          value={editDetailFields.tanggalLahir || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, tanggalLahir: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Anak Ke</label>
                        <input 
                          type="number"
                          value={editDetailFields.anakKe || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, anakKe: Number(e.target.value) })}
                          placeholder="Anak Ke-"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Jumlah Saudara</label>
                        <input 
                          type="number"
                          value={editDetailFields.jumlahSaudara || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, jumlahSaudara: Number(e.target.value) })}
                          placeholder="Jumlah Saudara"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Nama Ayah</label>
                        <input 
                          type="text"
                          value={editDetailFields.namaAyah || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, namaAyah: e.target.value })}
                          placeholder="Nama Ayah"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Pekerjaan Ayah</label>
                        <input 
                          type="text"
                          value={editDetailFields.pekerjaanAyah || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, pekerjaanAyah: e.target.value })}
                          placeholder="Pekerjaan Ayah"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Nama Ibu</label>
                        <input 
                          type="text"
                          value={editDetailFields.namaIbu || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, namaIbu: e.target.value })}
                          placeholder="Nama Ibu"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Pekerjaan Ibu</label>
                        <input 
                          type="text"
                          value={editDetailFields.pekerjaanIbu || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, pekerjaanIbu: e.target.value })}
                          placeholder="Pekerjaan Ibu"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Nomor Kartu Keluarga (KK)</label>
                        <input 
                          type="text"
                          value={editDetailFields.noKK || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, noKK: e.target.value })}
                          placeholder="No. KK"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Alamat Lengkap (Sesuai KK)</label>
                        <input 
                          type="text"
                          value={editDetailFields.alamatSiswa || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, alamatSiswa: e.target.value })}
                          placeholder="Alamat"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Desa/Kelurahan</label>
                        <input 
                          type="text"
                          value={editDetailFields.desa || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, desa: e.target.value })}
                          placeholder="Desa"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Kecamatan</label>
                        <input 
                          type="text"
                          value={editDetailFields.kecamatan || ''}
                          onChange={(e) => setEditDetailFields({ ...editDetailFields, kecamatan: e.target.value })}
                          placeholder="Kecamatan"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Edit Academic Scores Section */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider border-b pb-1.5 flex justify-between items-center">
                      <span>2. Nilai Akademik (Semester {detailSemester})</span>
                      <span className="text-[10px] text-slate-400 capitalize">Pilih tab semester di view mode untuk mengedit semester lain</span>
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'pai', label: 'PAI' },
                        { key: 'pkn', label: 'PPKN' },
                        { key: 'bInd', label: 'Bahasa Indonesia' },
                        { key: 'mtk', label: 'Matematika' },
                        { key: 'ipas', label: 'IPAS' },
                        { key: 'seni', label: 'Seni Budaya' },
                        { key: 'pjok', label: 'PJOK' },
                        { key: 'bIng', label: 'Bahasa Inggris' },
                        { key: 'bSnd', label: 'Bahasa Sunda' },
                      ].map((sub) => {
                        const fieldKey = detailSemester === 1 ? sub.key : `${sub.key}_s2`;
                        const scoreVal = editDetailFields[fieldKey as keyof Student] ?? 0;
                        return (
                          <div key={sub.key} className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 truncate">{sub.label}</label>
                            <input 
                              type="number"
                              min={0}
                              max={100}
                              value={scoreVal}
                              onChange={(e) => {
                                const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                setEditDetailFields({ ...editDetailFields, [fieldKey]: val });
                              }}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 focus:bg-white font-black"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Achievements List Editor */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider border-b pb-1.5">
                      3. Prestasi & Penghargaan Siswa
                    </h5>
                    
                    {/* Semester 1 list */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase">Semester 1 (Ganjil)</label>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        {(() => {
                          const listS1 = editDetailFields.prestasiS1 || (editDetailFields.prestasi ? [editDetailFields.prestasi] : []);
                          return (
                            <>
                              {listS1.length > 0 ? (
                                <div className="space-y-1">
                                  {listS1.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-slate-700">
                                      <span>🏆 {item}</span>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          const filtered = listS1.filter((_, idx) => idx !== i);
                                          setEditDetailFields({ ...editDetailFields, prestasiS1: filtered, prestasi: filtered[0] || '' });
                                        }}
                                        className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">Belum ada prestasi di Semester 1.</p>
                              )}
                              <div className="flex gap-2 pt-1">
                                <input 
                                  type="text"
                                  value={newAchS1}
                                  onChange={(e) => setNewAchS1(e.target.value)}
                                  placeholder="Tulis prestasi baru untuk Semester 1..."
                                  className="flex-grow px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!newAchS1.trim()) return;
                                    const currentList = editDetailFields.prestasiS1 || (editDetailFields.prestasi ? [editDetailFields.prestasi] : []);
                                    const nextList = [...currentList, newAchS1.trim()];
                                    setEditDetailFields({ ...editDetailFields, prestasiS1: nextList, prestasi: nextList[0] || '' });
                                    setNewAchS1('');
                                  }}
                                  className="px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                                >
                                  Tambah
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Semester 2 list */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase">Semester 2 (Genap)</label>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        {(() => {
                          const listS2 = editDetailFields.prestasiS2 || [];
                          return (
                            <>
                              {listS2.length > 0 ? (
                                <div className="space-y-1">
                                  {listS2.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-slate-700">
                                      <span>🏆 {item}</span>
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          const filtered = listS2.filter((_, idx) => idx !== i);
                                          setEditDetailFields({ ...editDetailFields, prestasiS2: filtered });
                                        }}
                                        className="text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">Belum ada prestasi di Semester 2.</p>
                              )}
                              <div className="flex gap-2 pt-1">
                                <input 
                                  type="text"
                                  value={newAchS2}
                                  onChange={(e) => setNewAchS2(e.target.value)}
                                  placeholder="Tulis prestasi baru untuk Semester 2..."
                                  className="flex-grow px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!newAchS2.trim()) return;
                                    const currentList = editDetailFields.prestasiS2 || [];
                                    const nextList = [...currentList, newAchS2.trim()];
                                    setEditDetailFields({ ...editDetailFields, prestasiS2: nextList });
                                    setNewAchS2('');
                                  }}
                                  className="px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                                >
                                  Tambah
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer (Hidden in Print) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-row justify-between items-center flex-shrink-0 print:hidden">
              {!isEditingDetail ? (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingDetail(true);
                        setEditDetailFields({ ...detailStudent });
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      <Edit className="w-4 h-4" /> Edit Data
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAsDoc(detailStudent)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                      title="Ekspor rapor lengkap ke file Word (.doc)"
                    >
                      <FileText className="w-4 h-4" /> Unduh DOC Rapor
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePrintDetail}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      <Printer className="w-4 h-4" /> Cetak Rapor
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailStudent(null)}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-extrabold rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      Tutup
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditingDetail(false)}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-extrabold rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDetailEdits}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition-all"
                  >
                    <Save className="w-4 h-4" /> Simpan Perubahan
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FORM MODAL OVERLAY (TAMBAH / EDIT SISWA) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-500/5 to-transparent flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-extrabold text-base text-slate-800">
                  {formMode === 'add' ? 'Tambah Data Nilai Siswa Baru' : `Modifikasi Nilai Siswa: ${formData.nama}`}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Isi seluruh data profil, rincian nilai, dan keterangan ranking di form terpadu.</p>
              </div>
              <button 
                onClick={closeFormModal}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <form onSubmit={handleFormSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
              {/* Identitas Siswa */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Nomor Induk (NISN)</label>
                  <input 
                    type="text" 
                    required
                    maxLength={10}
                    disabled={formMode === 'edit'}
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '') })}
                    placeholder="Contoh: 0091234561" 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Nama Lengkap Siswa</label>
                  <input 
                    type="text" 
                    required
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Contoh: Ahmad Fauzi" 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Jenis Kelamin (LP)</label>
                  <select
                    value={formData.lp}
                    onChange={(e) => setFormData({ ...formData, lp: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs transition-all font-semibold"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* Rombel, Keterangan Ranking, & Rata-rata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Rombel / Kelas</label>
                  <input 
                    type="text" 
                    required
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    placeholder="Contoh: Kelas 6A" 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Keterangan Ranking / Catatan Prestasi</label>
                  <input 
                    type="text" 
                    value={formData.keteranganRanking}
                    onChange={(e) => setFormData({ ...formData, keteranganRanking: e.target.value })}
                    placeholder="Contoh: Peringkat 1 Umum, dll." 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Rata-rata Terkalkulasi (Otomatis)</label>
                  <div className="w-full px-4 py-2.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 font-black text-xs flex items-center justify-between">
                    <span>Rata-rata:</span>
                    <span className="text-sm bg-blue-600 text-white px-2.5 py-0.5 rounded-lg shadow-sm">{liveAverage}</span>
                  </div>
                </div>
              </div>

              {/* Prestasi Siswa */}
              <div className="grid grid-cols-1 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Prestasi Siswa (Jika ada)</label>
                  <input 
                    type="text" 
                    value={formData.prestasi}
                    onChange={(e) => setFormData({ ...formData, prestasi: e.target.value })}
                    placeholder="Contoh: Juara 1 Lomba Pidato Bahasa Sunda Kabupaten, Juara 2 OSN Matematika, dsb." 
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Nilai Mata Pelajaran SD */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-600" /> Rincian Nilai Sembilan Mata Pelajaran
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Agama */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">1. AGAMA ISLAM (PAI)</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.pai || ''}
                      onChange={(e) => setFormData({ ...formData, pai: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                  {/* PKN */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">2. PANCASILA (PKN)</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.pkn || ''}
                      onChange={(e) => setFormData({ ...formData, pkn: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                  {/* B Indonesia */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">3. B. INDONESIA (B. IND)</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.bInd || ''}
                      onChange={(e) => setFormData({ ...formData, bInd: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                  {/* MTK */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">4. MATEMATIKA (MTK)</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.mtk || ''}
                      onChange={(e) => setFormData({ ...formData, mtk: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                  {/* IPAS */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">5. IPAS</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.ipas || ''}
                      onChange={(e) => setFormData({ ...formData, ipas: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                  {/* Seni */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">6. SENI BUDAYA (SENI)</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.seni || ''}
                      onChange={(e) => setFormData({ ...formData, seni: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                  {/* PJOK */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">7. PENJASORKES (PJOK)</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.pjok || ''}
                      onChange={(e) => setFormData({ ...formData, pjok: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                  {/* B Inggris */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">8. B. INGGRIS (B. ING)</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.bIng || ''}
                      onChange={(e) => setFormData({ ...formData, bIng: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                  {/* B Sunda */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1.5">9. B. SUNDA (B.SND)</label>
                    <input 
                      type="number" min={0} max={100} required
                      value={formData.bSnd || ''}
                      onChange={(e) => setFormData({ ...formData, bSnd: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 flex-shrink-0">
                <button 
                  type="button" 
                  onClick={closeFormModal}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Batal / Tutup
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                >
                  Simpan Nilai Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-800">
                Pilihan Tindakan Hapus Data
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {deleteConfirm.type === 'single' ? (
                <span>Apakah Anda yakin ingin menghapus data untuk siswa bernama <strong className="text-slate-800 font-extrabold">{deleteConfirm.student?.nama}</strong>? Silakan tentukan bagian data yang ingin dihapus di bawah ini:</span>
              ) : (
                <span>Apakah Anda yakin ingin menghapus data untuk <strong className="text-slate-800 font-extrabold">{selectedNisns.length} siswa</strong> yang terpilih? Silakan tentukan tindakan penghapusan secara massal di bawah ini:</span>
              )}
            </p>

            {/* Pilihan Tindakan Penghapusan */}
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opsi Penghapusan</span>
              
              <div className="grid grid-cols-1 gap-2">
                {/* Opsi 1: Nilai S1 */}
                <button
                  type="button"
                  onClick={() => setDeleteTargetOption('only_nilai_s1')}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    deleteTargetOption === 'only_nilai_s1'
                      ? 'bg-red-50/70 border-red-200 text-red-950 font-extrabold shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-semibold'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    deleteTargetOption === 'only_nilai_s1' ? 'border-red-600 bg-red-600' : 'border-slate-300'
                  }`}>
                    {deleteTargetOption === 'only_nilai_s1' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="text-xs">
                    <span className="block font-bold">Hapus Nilai Semester 1 Saja</span>
                    <span className="block text-[10px] text-slate-400 font-medium">Hanya menghapus rekaman nilai rapor Semester 1. Profil biodata dan foto siswa tetap aman.</span>
                  </div>
                </button>

                {/* Opsi 2: Nilai S2 */}
                <button
                  type="button"
                  onClick={() => setDeleteTargetOption('only_nilai_s2')}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    deleteTargetOption === 'only_nilai_s2'
                      ? 'bg-red-50/70 border-red-200 text-red-950 font-extrabold shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-semibold'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    deleteTargetOption === 'only_nilai_s2' ? 'border-red-600 bg-red-600' : 'border-slate-300'
                  }`}>
                    {deleteTargetOption === 'only_nilai_s2' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="text-xs">
                    <span className="block font-bold">Hapus Nilai Semester 2 Saja</span>
                    <span className="block text-[10px] text-slate-400 font-medium">Hanya menghapus rekaman nilai rapor Semester 2. Profil biodata dan foto siswa tetap aman.</span>
                  </div>
                </button>

                {/* Opsi 3: Nilai S1 & S2 */}
                <button
                  type="button"
                  onClick={() => setDeleteTargetOption('only_nilai_both')}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    deleteTargetOption === 'only_nilai_both'
                      ? 'bg-red-50/70 border-red-200 text-red-950 font-extrabold shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-semibold'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    deleteTargetOption === 'only_nilai_both' ? 'border-red-600 bg-red-600' : 'border-slate-300'
                  }`}>
                    {deleteTargetOption === 'only_nilai_both' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="text-xs">
                    <span className="block font-bold">Hapus Nilai Kedua Semester (S1 & S2)</span>
                    <span className="block text-[10px] text-slate-400 font-medium">Menghapus seluruh nilai pelajaran di kedua semester. Profil biodata dan foto siswa tetap aman.</span>
                  </div>
                </button>

                {/* Opsi 4: Seluruh Profil & Nilai */}
                <button
                  type="button"
                  onClick={() => setDeleteTargetOption('all')}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    deleteTargetOption === 'all'
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-extrabold shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 font-semibold'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    deleteTargetOption === 'all' ? 'border-rose-600 bg-rose-600' : 'border-slate-300'
                  }`}>
                    {deleteTargetOption === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="text-xs">
                    <span className="block font-bold text-red-600">Hapus Seluruh Data Siswa (Hapus Permanen)</span>
                    <span className="block text-[10px] text-rose-700 font-bold">Menghapus profil biodata lengkap, kartu keluarga, foto siswa, dan seluruh nilai pelajaran secara total dari sistem.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'single' && deleteConfirm.student) {
                    const studentToDelete = deleteConfirm.student;
                    if (deleteTargetOption === 'only_nilai_s1') {
                      const updated = students.map(s => {
                        if (s.nisn === studentToDelete.nisn) {
                          return {
                            ...s,
                            pai: undefined, pkn: undefined, bInd: undefined, mtk: undefined,
                            ipas: undefined, seni: undefined, pjok: undefined, bIng: undefined,
                            bSnd: undefined, nilaiAkhir: undefined, ranking: undefined
                          };
                        }
                        return s;
                      });
                      recalculateAndSaveStudents(updated);
                      showToast('success', `Berhasil menghapus nilai Semester 1 untuk siswa ${studentToDelete.nama}!`);
                    } else if (deleteTargetOption === 'only_nilai_s2') {
                      const updated = students.map(s => {
                        if (s.nisn === studentToDelete.nisn) {
                          return {
                            ...s,
                            pai_s2: undefined, pkn_s2: undefined, bInd_s2: undefined, mtk_s2: undefined,
                            ipas_s2: undefined, seni_s2: undefined, pjok_s2: undefined, bIng_s2: undefined,
                            bSnd_s2: undefined, nilaiAkhir_s2: undefined, ranking_s2: undefined
                          };
                        }
                        return s;
                      });
                      recalculateAndSaveStudents(updated);
                      showToast('success', `Berhasil menghapus nilai Semester 2 untuk siswa ${studentToDelete.nama}!`);
                    } else if (deleteTargetOption === 'only_nilai_both') {
                      const updated = students.map(s => {
                        if (s.nisn === studentToDelete.nisn) {
                          return {
                            ...s,
                            pai: undefined, pkn: undefined, bInd: undefined, mtk: undefined,
                            ipas: undefined, seni: undefined, pjok: undefined, bIng: undefined,
                            bSnd: undefined, nilaiAkhir: undefined, ranking: undefined,
                            pai_s2: undefined, pkn_s2: undefined, bInd_s2: undefined, mtk_s2: undefined,
                            ipas_s2: undefined, seni_s2: undefined, pjok_s2: undefined, bIng_s2: undefined,
                            bSnd_s2: undefined, nilaiAkhir_s2: undefined, ranking_s2: undefined
                          };
                        }
                        return s;
                      });
                      recalculateAndSaveStudents(updated);
                      showToast('success', `Berhasil menghapus seluruh nilai Semester 1 & 2 untuk siswa ${studentToDelete.nama}!`);
                    } else {
                      const filtered = students.filter(s => s.nisn !== studentToDelete.nisn);
                      recalculateAndSaveStudents(filtered);
                      showToast('success', `Berhasil menghapus seluruh data siswa ${studentToDelete.nama}!`);
                      setSelectedNisns(prev => prev.filter(n => n !== studentToDelete.nisn));
                    }
                  } else if (deleteConfirm.type === 'batch') {
                    if (deleteTargetOption === 'only_nilai_s1') {
                      const updated = students.map(s => {
                        if (selectedNisns.includes(s.nisn)) {
                          return {
                            ...s,
                            pai: undefined, pkn: undefined, bInd: undefined, mtk: undefined,
                            ipas: undefined, seni: undefined, pjok: undefined, bIng: undefined,
                            bSnd: undefined, nilaiAkhir: undefined, ranking: undefined
                          };
                        }
                        return s;
                      });
                      recalculateAndSaveStudents(updated);
                      showToast('success', `Berhasil menghapus nilai Semester 1 dari ${selectedNisns.length} siswa terpilih!`);
                    } else if (deleteTargetOption === 'only_nilai_s2') {
                      const updated = students.map(s => {
                        if (selectedNisns.includes(s.nisn)) {
                          return {
                            ...s,
                            pai_s2: undefined, pkn_s2: undefined, bInd_s2: undefined, mtk_s2: undefined,
                            ipas_s2: undefined, seni_s2: undefined, pjok_s2: undefined, bIng_s2: undefined,
                            bSnd_s2: undefined, nilaiAkhir_s2: undefined, ranking_s2: undefined
                          };
                        }
                        return s;
                      });
                      recalculateAndSaveStudents(updated);
                      showToast('success', `Berhasil menghapus nilai Semester 2 dari ${selectedNisns.length} siswa terpilih!`);
                    } else if (deleteTargetOption === 'only_nilai_both') {
                      const updated = students.map(s => {
                        if (selectedNisns.includes(s.nisn)) {
                          return {
                            ...s,
                            pai: undefined, pkn: undefined, bInd: undefined, mtk: undefined,
                            ipas: undefined, seni: undefined, pjok: undefined, bIng: undefined,
                            bSnd: undefined, nilaiAkhir: undefined, ranking: undefined,
                            pai_s2: undefined, pkn_s2: undefined, bInd_s2: undefined, mtk_s2: undefined,
                            ipas_s2: undefined, seni_s2: undefined, pjok_s2: undefined, bIng_s2: undefined,
                            bSnd_s2: undefined, nilaiAkhir_s2: undefined, ranking_s2: undefined
                          };
                        }
                        return s;
                      });
                      recalculateAndSaveStudents(updated);
                      showToast('success', `Berhasil menghapus seluruh nilai dari ${selectedNisns.length} siswa terpilih!`);
                    } else {
                      const remaining = students.filter(s => !selectedNisns.includes(s.nisn));
                      recalculateAndSaveStudents(remaining);
                      showToast('success', `Berhasil menghapus seluruh data dari ${selectedNisns.length} siswa terpilih!`);
                    }
                    setSelectedNisns([]);
                  }
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-600/10 cursor-pointer"
              >
                Ya, Konfirmasi Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE DETECTION WARNING & STRATEGY RESOLVER MODAL */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden w-full max-w-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-amber-50/50 flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 flex-shrink-0 animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">
                  Data Ganda Terdeteksi ({duplicateList.length} Siswa)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">NISN berikut sudah terdaftar di sistem. Pilih tindakan untuk melanjutkan.</p>
              </div>
            </div>

            {/* List of Duplicates */}
            <div className="p-6 overflow-y-auto space-y-4 flex-grow bg-slate-50/50">
              <div className="text-xs text-slate-500 font-bold bg-amber-50 border border-amber-200/60 p-3 rounded-xl">
                Beberapa siswa dalam file Excel yang Anda unggah memiliki NISN yang sama dengan data di sistem. Silakan pilih salah satu opsi di bawah untuk menjaga keutuhan data.
              </div>

              <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs font-semibold text-slate-700 divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2 px-4">NISN</th>
                      <th className="py-2 px-4">Nama di File Excel</th>
                      <th className="py-2 px-4">Status / Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {duplicateList.map((d) => (
                      <tr key={d.nisn} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono text-indigo-600">{d.nisn}</td>
                        <td className="py-2.5 px-4 text-slate-800 font-bold">{d.nama}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-semibold text-[11px]">
                          Nilai Akhir: {d.nilaiAkhir_s2 !== undefined ? `${d.nilaiAkhir} (S1) / ${d.nilaiAkhir_s2} (S2)` : d.nilaiAkhir}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Cards & Buttons */}
            <div className="p-6 border-t border-slate-100 flex flex-col gap-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Option 1: Merge */}
                <button
                  type="button"
                  onClick={() => performImport(tempUploadedList, 'merge')}
                  className="p-4 border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 text-left rounded-2xl transition-all cursor-pointer group flex flex-col gap-1 active:scale-95"
                >
                  <span className="text-xs font-black text-emerald-800 group-hover:text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Gabungkan (Merge)
                  </span>
                  <span className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    Gabungkan data. Nilai semester 2 akan ditambahkan tanpa menimpa nilai semester 1 yang sudah ada.
                  </span>
                </button>

                {/* Option 2: Overwrite */}
                <button
                  type="button"
                  onClick={() => performImport(tempUploadedList, 'overwrite')}
                  className="p-4 border-2 border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 text-left rounded-2xl transition-all cursor-pointer group flex flex-col gap-1 active:scale-95"
                >
                  <span className="text-xs font-black text-blue-800 group-hover:text-blue-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Ganti Semua (Overwrite)
                  </span>
                  <span className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    Ganti data lama. Seluruh baris data siswa lama akan digantikan oleh baris baru dari file Excel.
                  </span>
                </button>

                {/* Option 3: Skip */}
                <button
                  type="button"
                  onClick={() => performImport(tempUploadedList, 'skip')}
                  className="p-4 border-2 border-slate-200 hover:border-slate-500 bg-slate-50/40 hover:bg-slate-50 text-left rounded-2xl transition-all cursor-pointer group flex flex-col gap-1 active:scale-95"
                >
                  <span className="text-xs font-black text-slate-800 group-hover:text-slate-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    Abaikan (Skip)
                  </span>
                  <span className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    Abaikan duplikat. Hanya impor baris siswa baru yang belum pernah terdaftar (NISN baru).
                  </span>
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsDuplicateModalOpen(false);
                    setDuplicateList([]);
                    setTempUploadedList([]);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Batal Impor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
  );
}
