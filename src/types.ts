export interface Student {
  no?: number;
  nisn: string;
  nama: string;
  lp: 'L' | 'P';
  pai?: number;
  pkn?: number;
  bInd?: number;
  mtk?: number;
  ipas?: number;
  seni?: number;
  pjok?: number;
  bIng?: number;
  bSnd?: number;
  nilaiAkhir?: number; // Rata-rata S1
  ranking?: number; // Ranking S1
  keteranganRanking?: string; // Keterangan ranking / catatan prestasi
  kelas?: string;
  prestasi?: string; // Catatan Prestasi Siswa
  prestasiS1?: string[]; // Multiple achievements for S1
  prestasiS2?: string[]; // Multiple achievements for S2

  // Semester 2 (Optional, auto-generated / editable)
  pai_s2?: number;
  pkn_s2?: number;
  bInd_s2?: number;
  mtk_s2?: number;
  ipas_s2?: number;
  seni_s2?: number;
  pjok_s2?: number;
  bIng_s2?: number;
  bSnd_s2?: number;
  nilaiAkhir_s2?: number; // Rata-rata S2
  ranking_s2?: number; // Ranking S2
  photo?: string; // Base64 data or URL for student photo

  // Biodata fields filled by student or guru
  noInduk?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  anakKe?: number;
  jumlahSaudara?: number;
  alamatSiswa?: string;
  desa?: string;
  kecamatan?: string;
  agama?: string;
  namaAyah?: string;
  pekerjaanAyah?: string;
  namaIbu?: string;
  pekerjaanIbu?: string;
  noKK?: string;
  isBiodataConfirmed?: boolean;
}

export interface SchoolSettings {
  namaSekolah: string;
  npsn: string;
  alamatSekolah: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  namaWali: string;
  nipWali: string;
  pangkatWali: string;
  logoSekolah?: string; // base64
  logoKabupaten?: string; // base64
  photoWali?: string; // base64
  showRaporCard?: boolean;
  showBiodataCard?: boolean;
  showNisnCard?: boolean;
}

export interface DashboardStats {
  totalSiswa: number;
  rataRata: number;
  nilaiTertinggi: number;
  nilaiTerendah: number;
  totalKelas: number;
  kkm: number;
  lastUpdated: string;
}

export interface GASFile {
  name: string;
  type: 'gs' | 'html';
  content: string;
}

export interface AccessLog {
  id: string;
  name: string;
  nisn: string;
  role: 'guru' | 'siswa' | 'tamu';
  timestamp: string;
  activity: string;
}


