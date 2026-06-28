import { GASFile } from '../types';

export const gasFiles: GASFile[] = [
  {
    name: "Code.gs",
    type: "gs",
    content: `/**
 * Sistem Informasi Nilai Siswa (SINS)
 * Google Apps Script - Main Controller
 * 
 * Project Name: SINS
 * Author: Senior Google Apps Script Developer & UI/UX Designer
 */

function doGet(e) {
  // Inisialisasi database saat pertama dibuka
  initDatabase();
  
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Sistem Informasi Nilai Siswa (SINS)')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Fungsi pembantu untuk menginklusi template HTML lain
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
`
  },
  {
    name: "Auth.gs",
    type: "gs",
    content: `/**
 * Sistem Informasi Nilai Siswa (SINS)
 * Google Apps Script - Authentication Module
 */

// Kredensial Akun Guru (Dapat diubah sesuai keinginan)
const ADMIN_USER = "admin";
const ADMIN_PASS = "123456";

/**
 * Melakukan verifikasi login guru
 * @param {string} username Username yang diinput
 * @param {string} password Password yang diinput
 * @return {object} Status login berupa objek {success, username, token, message}
 */
function loginGuru(username, password) {
  // Sanitasi input
  username = String(username).trim();
  password = String(password).trim();
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // Generate token acak sederhana sebagai session token
    const timestamp = new Date().getTime();
    const token = Utilities.base64Encode(username + ":" + timestamp);
    
    // Menyimpan token di properti pengguna (user properties) atau cache jika ingin divalidasi berkala
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('session_token', token);
    userProperties.setProperty('session_expiry', String(timestamp + 3600000)); // Aktif 1 jam
    
    return {
      success: true,
      username: username,
      token: token,
      message: "Login berhasil! Selamat datang di Dashboard SINS."
    };
  }
  
  return {
    success: false,
    message: "Username atau password salah!"
  };
}

/**
 * Keluar dari sesi guru
 */
function logout() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('session_token');
  userProperties.deleteProperty('session_expiry');
  return {
    success: true,
    message: "Logout berhasil!"
  };
}

/**
 * Validasi apakah session token masih aktif (keamanan API)
 * @param {string} token Token sesi klien
 * @return {boolean} Valid atau tidak
 */
function validateSession(token) {
  if (!token) return false;
  const userProperties = PropertiesService.getUserProperties();
  const savedToken = userProperties.getProperty('session_token');
  const expiry = userProperties.getProperty('session_expiry');
  
  if (savedToken === token) {
    const now = new Date().getTime();
    if (expiry && now < Number(expiry)) {
      return true;
    }
  }
  return false;
}
`
  },
  {
    name: "Database.gs",
    type: "gs",
    content: `/**
 * Sistem Informasi Nilai Siswa (SINS)
 * Google Apps Script - Database & Spreadsheet Helper
 */

const SHEET_NAME = "Data Nilai";
const CACHE_EXPIRY = 600; // 10 menit caching

/**
 * Memperoleh spreadsheet aktif atau membuat yang baru jika dijalankan terpisah
 */
function getSpreadsheet() {
  let ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Tidak ada spreadsheet aktif.");
  } catch (e) {
    // Menggunakan file di Drive jika spreadsheet tidak terikat langsung (Standalone)
    const files = DriveApp.getFilesByName("SINS Database Nilai");
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create("SINS Database Nilai");
    }
  }
  return ss;
}

/**
 * Menginisialisasi spreadsheet dan membuat header "Data Nilai" jika belum ada
 */
function initDatabase() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    
    // Header Kolom Database SINS
    const headers = [
      "No", "NISN", "Nama", "Kelas", 
      "Nilai Tugas", "Nilai UH", "Nilai PTS", "Nilai PAS", 
      "Nilai Akhir", "Ranking"
    ];
    
    sheet.appendRow(headers);
    
    // Gaya Header
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1976D2"); // Biru SINS
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    headerRange.setFontFamily("Poppins");
    
    // Tambahkan Data Contoh Awal
    const dummyData = [
      [1, "0091234561", "Ahmad Fauzi", "XI IPA 1", 85, 80, 78, 82, 81, 4],
      [2, "0091234562", "Budi Santoso", "XI IPA 1", 90, 92, 88, 90, 90, 1],
      [3, "0091234563", "Citra Lestari", "XI IPA 2", 78, 75, 70, 72, 74, 5],
      [4, "0091234564", "Dedi Prasetyo", "XI IPA 1", 88, 85, 82, 84, 85, 3],
      [5, "0091234565", "Eka Rahmawati", "XI IPA 2", 92, 88, 85, 89, 89, 2]
    ];
    
    dummyData.forEach(row => sheet.appendRow(row));
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

/**
 * Menyimpan KKM Global sekolah di variabel script
 */
function getSchoolKKM() {
  const scriptProperties = PropertiesService.getScriptProperties();
  let kkm = scriptProperties.getProperty('KKM');
  if (!kkm) {
    kkm = "75"; // Default KKM
    scriptProperties.setProperty('KKM', kkm);
  }
  return Number(kkm);
}

function updateSchoolKKM(kkmValue) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('KKM', String(kkmValue));
  return { success: true, kkm: kkmValue };
}
`
  },
  {
    name: "Guru.gs",
    type: "gs",
    content: `/**
 * Sistem Informasi Nilai Siswa (SINS)
 * Google Apps Script - Teacher Dashboard Operations
 */

/**
 * Mendapatkan seluruh data siswa dari Spreadsheet
 * Menggunakan CacheService untuk optimasi kecepatan akses
 */
function getAllData() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("all_student_data");
  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const students = values.map((row, index) => {
    return {
      no: index + 1,
      nisn: String(row[1]),
      nama: String(row[2]),
      kelas: String(row[3]),
      nilaiTugas: Number(row[4]) || 0,
      nilaiUH: Number(row[5]) || 0,
      nilaiPTS: Number(row[6]) || 0,
      nilaiPAS: Number(row[7]) || 0,
      nilaiAkhir: Number(row[8]) || 0,
      ranking: Number(row[9]) || 0
    };
  });
  
  // Cache data selama 5 menit
  cache.put("all_student_data", JSON.stringify(students), 300);
  return students;
}

/**
 * Tambah data siswa baru
 */
function tambahData(student, token) {
  if (!validateSession(token)) {
    throw new Error("Akses ditolak: Sesi tidak valid atau telah berakhir.");
  }
  
  // Validasi NISN ganda
  const students = getAllData();
  const duplicate = students.some(s => s.nisn === student.nisn);
  if (duplicate) {
    return { success: false, message: "NISN " + student.nisn + " sudah terdaftar di sistem!" };
  }
  
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
  const nextNo = sheet.getLastRow(); // No baris baru
  
  const rTugas = Number(student.nilaiTugas) || 0;
  const rUH = Number(student.nilaiUH) || 0;
  const rPTS = Number(student.nilaiPTS) || 0;
  const rPAS = Number(student.nilaiPAS) || 0;
  
  // Nilai akhir dihitung otomatis atau bisa diinput manual
  let rAkhir = Number(student.nilaiAkhir);
  if (isNaN(rAkhir) || rAkhir === 0) {
    rAkhir = Math.round((rTugas + rUH + rPTS + rPAS) / 4);
  }
  
  const newRow = [
    nextNo,
    String(student.nisn).trim(),
    String(student.nama).trim(),
    String(student.kelas).trim(),
    rTugas,
    rUH,
    rPTS,
    rPAS,
    rAkhir,
    0 // Ranking dihitung otomatis setelah penambahan
  ];
  
  sheet.appendRow(newRow);
  
  // Hapus cache karena database berubah
  clearDBCache();
  
  // Rekalkulasi ranking
  recalculateRankings();
  
  return { success: true, message: "Siswa " + student.nama + " berhasil ditambahkan!" };
}

/**
 * Edit/Update data siswa berdasarkan NISN
 */
function updateData(nisn, updatedStudent, token) {
  if (!validateSession(token)) {
    throw new Error("Akses ditolak: Sesi tidak valid atau telah berakhir.");
  }
  
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(2, 2, lastRow - 1, 1); // Kolom NISN
  const nisnValues = range.getValues();
  
  let targetRowIndex = -1;
  for (let i = 0; i < nisnValues.length; i++) {
    if (String(nisnValues[i][0]) === String(nisn)) {
      targetRowIndex = i + 2; // +2 karena offset baris header (1) dan index 0
      break;
    }
  }
  
  if (targetRowIndex === -1) {
    return { success: false, message: "Data siswa tidak ditemukan!" };
  }
  
  const rTugas = Number(updatedStudent.nilaiTugas) || 0;
  const rUH = Number(updatedStudent.nilaiUH) || 0;
  const rPTS = Number(updatedStudent.nilaiPTS) || 0;
  const rPAS = Number(updatedStudent.nilaiPAS) || 0;
  
  let rAkhir = Number(updatedStudent.nilaiAkhir);
  if (isNaN(rAkhir) || rAkhir === 0) {
    rAkhir = Math.round((rTugas + rUH + rPTS + rPAS) / 4);
  }
  
  // Update baris spreadsheet secara spesifik
  sheet.getRange(targetRowIndex, 3).setValue(String(updatedStudent.nama).trim()); // Nama
  sheet.getRange(targetRowIndex, 4).setValue(String(updatedStudent.kelas).trim()); // Kelas
  sheet.getRange(targetRowIndex, 5).setValue(rTugas);
  sheet.getRange(targetRowIndex, 6).setValue(rUH);
  sheet.getRange(targetRowIndex, 7).setValue(rPTS);
  sheet.getRange(targetRowIndex, 8).setValue(rPAS);
  sheet.getRange(targetRowIndex, 9).setValue(rAkhir);
  sheet.getRange(targetRowIndex, 10).setValue(Number(updatedStudent.ranking) || 0); // Diisi manual atau otomatis
  
  clearDBCache();
  
  // Jika ranking tidak diinput manual (0), hitung ulang otomatis
  if (!updatedStudent.ranking || Number(updatedStudent.ranking) === 0) {
    recalculateRankings();
  }
  
  return { success: true, message: "Data siswa " + updatedStudent.nama + " berhasil diperbarui!" };
}

/**
 * Menghapus data siswa berdasarkan NISN
 */
function hapusData(nisn, token) {
  if (!validateSession(token)) {
    throw new Error("Akses ditolak: Sesi tidak valid atau telah berakhir.");
  }
  
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, message: "Tidak ada data untuk dihapus." };
  
  const range = sheet.getRange(2, 2, lastRow - 1, 1);
  const nisnValues = range.getValues();
  
  let targetRowIndex = -1;
  for (let i = 0; i < nisnValues.length; i++) {
    if (String(nisnValues[i][0]) === String(nisn)) {
      targetRowIndex = i + 2;
      break;
    }
  }
  
  if (targetRowIndex === -1) {
    return { success: false, message: "Data siswa tidak ditemukan!" };
  }
  
  sheet.deleteRow(targetRowIndex);
  
  // Perbaiki penomoran kolom 'No'
  const newLastRow = sheet.getLastRow();
  if (newLastRow >= 2) {
    for (let i = 2; i <= newLastRow; i++) {
      sheet.getRange(i, 1).setValue(i - 1);
    }
  }
  
  clearDBCache();
  recalculateRankings();
  
  return { success: true, message: "Data siswa dengan NISN " + nisn + " berhasil dihapus!" };
}

/**
 * Impor data siswa massal dari CSV/JSON (Array data)
 */
function importSiswaMassal(studentsArray, token) {
  if (!validateSession(token)) {
    throw new Error("Akses ditolak!");
  }
  
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
  const existing = getAllData();
  let count = 0;
  
  studentsArray.forEach(student => {
    // Validasi NISN terisi dan tidak duplikat
    if (!student.nisn) return;
    const isDup = existing.some(s => s.nisn === String(student.nisn));
    if (isDup) return;
    
    const rTugas = Number(student.nilaiTugas) || 0;
    const rUH = Number(student.nilaiUH) || 0;
    const rPTS = Number(student.nilaiPTS) || 0;
    const rPAS = Number(student.nilaiPAS) || 0;
    const rAkhir = Number(student.nilaiAkhir) || Math.round((rTugas + rUH + rPTS + rPAS) / 4);
    
    const nextNo = sheet.getLastRow();
    const row = [
      nextNo,
      String(student.nisn).trim(),
      String(student.nama).trim(),
      String(student.kelas).trim(),
      rTugas,
      rUH,
      rPTS,
      rPAS,
      rAkhir,
      0
    ];
    sheet.appendRow(row);
    count++;
  });
  
  clearDBCache();
  recalculateRankings();
  
  return { success: true, message: "Berhasil mengimpor " + count + " data siswa baru!" };
}
`
  },
  {
    name: "Siswa.gs",
    type: "gs",
    content: `/**
 * Sistem Informasi Nilai Siswa (SINS)
 * Google Apps Script - Student Grade Access Module
 */

/**
 * Mencari nilai siswa berdasarkan NISN (Akses Siswa)
 * @param {string} nisn NISN siswa
 * @return {object} Objek data siswa, KKM, status kelulusan, dan statistik
 */
function getDataByNISN(nisn) {
  nisn = String(nisn).trim();
  if (!nisn) {
    return { success: false, message: "Harap masukkan NISN Anda!" };
  }
  
  const students = getAllData();
  const student = students.find(s => s.nisn === nisn);
  
  if (!student) {
    return { success: false, message: "NISN " + nisn + " tidak ditemukan di sistem. Harap hubungi wali kelas Anda." };
  }
  
  const kkm = getSchoolKKM();
  const status = student.nilaiAkhir >= kkm ? "LULUS" : "PERLU BIMBINGAN";
  
  // Dapatkan statistik distribusi untuk melengkapi halaman siswa
  const totalSiswa = students.length;
  const higherScores = students.filter(s => s.nilaiAkhir > student.nilaiAkhir).length;
  const percentile = totalSiswa > 1 ? Math.round(((totalSiswa - higherScores) / totalSiswa) * 100) : 100;
  
  return {
    success: true,
    student: student,
    kkm: kkm,
    status: status,
    percentile: percentile,
    lastUpdated: Utilities.formatDate(new Date(), "Asia/Jakarta", "dd MMMM yyyy HH:mm")
  };
}
`
  },
  {
    name: "Utils.gs",
    type: "gs",
    content: `/**
 * Sistem Informasi Nilai Siswa (SINS)
 * Google Apps Script - Utilities, Caching, and Calculations
 */

/**
 * Rekalkulasi rangking berdasarkan Nilai Akhir (descending)
 */
function recalculateRankings() {
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  // Ambil semua data kecuali header
  const range = sheet.getRange(2, 1, lastRow - 1, 10);
  const values = range.getValues();
  
  // Buat array indeks terurut berdasarkan Nilai Akhir (kolom ke-9, indeks 8) menurun
  // Jika nilai akhir sama, urutkan berdasarkan Nilai PAS (kolom ke-8, indeks 7)
  const sortedIndices = values
    .map((row, index) => {
      return { 
        index: index, 
        nilaiAkhir: Number(row[8]) || 0,
        nilaiPAS: Number(row[7]) || 0
      };
    })
    .sort((a, b) => {
      if (b.nilaiAkhir !== a.nilaiAkhir) {
        return b.nilaiAkhir - a.nilaiAkhir;
      }
      return b.nilaiPAS - a.nilaiPAS;
    });
  
  // Tentukan ranking dengan penanganan nilai seri (joint ranking)
  let currentRank = 1;
  for (let i = 0; i < sortedIndices.length; i++) {
    if (i > 0) {
      const current = sortedIndices[i];
      const prev = sortedIndices[i - 1];
      if (current.nilaiAkhir < prev.nilaiAkhir) {
        currentRank = i + 1;
      }
    }
    // Update kolom ranking (kolom ke-10, indeks 9 di values)
    values[sortedIndices[i].index][9] = currentRank;
  }
  
  // Tulis kembali data ranking ke spreadsheet
  range.setValues(values);
  clearDBCache();
}

/**
 * Mendapatkan ringkasan data statistik untuk Dashboard
 */
function getDashboard(token) {
  if (token && !validateSession(token)) {
    throw new Error("Akses ditolak: Sesi tidak valid atau telah berakhir.");
  }

  const students = getAllData();
  const kkm = getSchoolKKM();
  
  if (students.length === 0) {
    return {
      totalSiswa: 0,
      rataRata: 0,
      nilaiTertinggi: 0,
      nilaiTerendah: 0,
      totalKelas: 0,
      kkm: kkm,
      kelasDistribution: {},
      lulusDistribution: { LULUS: 0, BIMBINGAN: 0 },
      lastUpdated: Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm")
    };
  }
  
  const totalSiswa = students.length;
  const sum = students.reduce((acc, s) => acc + s.nilaiAkhir, 0);
  const rataRata = Math.round((sum / totalSiswa) * 10) / 10;
  
  const scores = students.map(s => s.nilaiAkhir);
  const nilaiTertinggi = Math.max(...scores);
  const nilaiTerendah = Math.min(...scores);
  
  // Distribusi kelas
  const kelasSet = new Set(students.map(s => s.kelas));
  const totalKelas = kelasSet.size;
  
  const kelasDistribution = {};
  const lulusDistribution = { LULUS: 0, BIMBINGAN: 0 };
  
  students.forEach(s => {
    kelasDistribution[s.kelas] = (kelasDistribution[s.kelas] || 0) + 1;
    if (s.nilaiAkhir >= kkm) {
      lulusDistribution.LULUS++;
    } else {
      lulusDistribution.BIMBINGAN++;
    }
  });
  
  // Menyiapkan data histogram nilai (0-59, 60-69, 70-79, 80-89, 90-100)
  const rangeDistribution = {
    "A (90-100)": students.filter(s => s.nilaiAkhir >= 90).length,
    "B (80-89)": students.filter(s => s.nilaiAkhir >= 80 && s.nilaiAkhir < 90).length,
    "C (70-79)": students.filter(s => s.nilaiAkhir >= 70 && s.nilaiAkhir < 80).length,
    "D (60-69)": students.filter(s => s.nilaiAkhir >= 60 && s.nilaiAkhir < 70).length,
    "E (< 60)": students.filter(s => s.nilaiAkhir < 60).length
  };
  
  return {
    totalSiswa,
    rataRata,
    nilaiTertinggi,
    nilaiTerendah,
    totalKelas,
    kkm,
    kelasDistribution,
    lulusDistribution,
    rangeDistribution,
    lastUpdated: Utilities.formatDate(new Date(), "Asia/Jakarta", "dd MMMM yyyy HH:mm:ss")
  };
}

/**
 * Menghapus cache script
 */
function clearDBCache() {
  const cache = CacheService.getScriptCache();
  cache.remove("all_student_data");
}
`
  },
  {
    name: "Index.html",
    type: "html",
    content: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistem Informasi Nilai Siswa (SINS)</title>
  
  <!-- Font Poppins & Google Material Symbols -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  
  <!-- SweetAlert2 -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  
  <!-- SheetJS (Excel Export & Import) -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  
  <!-- html2pdf.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

  <?!= include('Style'); ?>
</head>
<body class="bg-slate-50 font-sans text-slate-800 flex flex-col min-h-screen">

  <!-- Spinner Loading Global -->
  <div id="loadingSpinner" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center hidden">
    <div class="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
      <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="font-medium text-slate-700 animate-pulse text-sm">Menghubungkan ke Spreadsheet...</p>
    </div>
  </div>

  <!-- Container Halaman Utama -->
  <div id="appContainer" class="flex-grow flex flex-col w-full">
    <!-- Diisi secara dinamis oleh Script.html -->
  </div>

  <!-- Footer -->
  <footer class="bg-slate-900 text-slate-400 py-6 px-4 mt-auto border-t border-slate-800">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left text-xs">
      <div>
        <p class="font-semibold text-slate-200 text-sm flex items-center gap-1 justify-center md:justify-start">
          <span class="material-symbols-rounded text-blue-500 text-lg">school</span>
          Sistem Informasi Nilai Siswa (SINS)
        </p>
        <p class="mt-1">Dirancang untuk memudahkan pengelolaan nilai & transparansi informasi siswa.</p>
      </div>
      <div>
        <p>© 2026 SMA SINS Mandiri. Hak Cipta Dilindungi.</p>
        <p class="text-[10px] mt-1 text-slate-500">Koneksi Database: Google Sheets (Data Nilai)</p>
      </div>
    </div>
  </footer>

  <!-- File-file Sub-Template (Di-inject di sini) -->
  <div style="display:none;">
    <template id="tpl-login"><?!= include('Login'); ?></template>
    <template id="tpl-guru"><?!= include('Guru'); ?></template>
    <template id="tpl-siswa"><?!= include('Siswa'); ?></template>
  </div>

  <?!= include('Script'); ?>
</body>
</html>
`
  },
  {
    name: "Style.html",
    type: "html",
    content: `<style>
  /* Custom SINS Styles */
  :root {
    --font-sans: 'Poppins', sans-serif;
  }

  body {
    font-family: var(--font-sans);
  }

  /* Glassmorphism Classes */
  .glass-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.4);
  }

  .glass-dark {
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Animation */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fadeIn 0.4s ease forwards;
  }
  
  /* Active Link Sidebar */
  .sidebar-link.active {
    background-color: #1e40af;
    color: #ffffff;
    box-shadow: 0 4px 12px -2px rgba(30, 64, 175, 0.3);
  }

  /* Material Symbol Align */
  .material-symbols-rounded {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
  }
</style>
`
  },
  {
    name: "Login.html",
    type: "html",
    content: `<div class="flex-grow flex items-center justify-center px-4 py-16 bg-gradient-to-tr from-blue-500/10 via-slate-50 to-green-500/10">
  <div class="w-full max-w-4xl grid md:grid-cols-12 gap-8 items-center animate-fade-in">
    
    <!-- Bagian Kiri: Info SINS -->
    <div class="md:col-span-6 space-y-6 text-center md:text-left pr-4">
      <div class="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
        <span class="material-symbols-rounded text-4xl">school</span>
      </div>
      <div>
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
          Sistem Informasi <span class="text-blue-600">Nilai Siswa</span> (SINS)
        </h1>
        <p class="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
          Portal monitoring dan pelaporan nilai akademik siswa secara real-time, transparan, dan terintegrasi langsung dengan database sekolah.
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-500 font-medium">
        <span class="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-full shadow-sm">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Google Sheets Database
        </span>
        <span class="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-full shadow-sm">
          <span class="material-symbols-rounded text-blue-500 text-sm">bolt</span> Caching Aktif
        </span>
      </div>
    </div>

    <!-- Bagian Kanan: Menu Portal -->
    <div id="loginPortalContent" class="md:col-span-6 space-y-6">
      
      <!-- Halaman Awal Pemilihan Peran -->
      <div id="roleSelectorCard" class="bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
        <div class="text-center">
          <h2 class="text-xl font-bold text-slate-800">Pilih Akses Masuk</h2>
          <p class="text-xs text-slate-500 mt-1">Gunakan salah satu opsi akses di bawah ini</p>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <!-- Tombol Guru -->
          <button onclick="switchLoginMode('guru')" class="group p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-300 rounded-2xl flex items-center justify-between transition-all duration-300 hover:scale-[1.02] text-left hover:shadow-md cursor-pointer">
            <div class="flex items-center gap-4">
              <div class="p-3.5 bg-blue-600 text-white rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <span class="material-symbols-rounded text-2xl">admin_panel_settings</span>
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-sm">Login Guru</h3>
                <p class="text-xs text-slate-500 mt-0.5">Kelola data nilai, kelas, & analisis akademik</p>
              </div>
            </div>
            <span class="material-symbols-rounded text-blue-600 group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>

          <!-- Tombol Siswa -->
          <button onclick="switchLoginMode('siswa')" class="group p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 hover:border-green-300 rounded-2xl flex items-center justify-between transition-all duration-300 hover:scale-[1.02] text-left hover:shadow-md cursor-pointer">
            <div class="flex items-center gap-4">
              <div class="p-3.5 bg-green-600 text-white rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <span class="material-symbols-rounded text-2xl">person_search</span>
              </div>
              <div>
                <h3 class="font-bold text-slate-800 text-sm">Akses Siswa</h3>
                <p class="text-xs text-slate-500 mt-0.5">Cek nilai akhir & kelulusan siswa mandiri</p>
              </div>
            </div>
            <span class="material-symbols-rounded text-green-600 group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>

      <!-- Form Login Guru (Tersembunyi Awalnya) -->
      <div id="guruFormCard" class="hidden bg-white p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
        <div class="flex items-center justify-between">
          <button onclick="switchLoginMode('role')" class="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer">
            <span class="material-symbols-rounded text-base">arrow_back</span> Kembali
          </button>
          <span class="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Guru Portal</span>
        </div>

        <div>
          <h2 class="text-xl font-bold text-slate-800">Login Pendidik</h2>
          <p class="text-xs text-slate-500 mt-1">Masukkan username & password akun SINS Anda</p>
        </div>

        <form id="guruLoginForm" onsubmit="handleGuruSubmit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
            <div class="relative">
              <span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person</span>
              <input type="text" id="guruUsername" required placeholder="Contoh: admin" class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-sm transition-all font-medium">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
            <div class="relative">
              <span class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
              <input type="password" id="guruPassword" required placeholder="******" class="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-sm transition-all font-medium">
              <button type="button" onclick="togglePasswordVisibility('guruPassword')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span class="material-symbols-rounded text-lg" id="guruPasswordIcon">visibility</span>
              </button>
            </div>
          </div>

          <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-600/10 cursor-pointer">
            Masuk ke Dashboard
          </button>
        </form>
      </div>

    </div>
  </div>
</div>
`
  },
  {
    name: "Guru.html",
    type: "html",
    content: `<div class="flex-grow flex flex-col md:flex-row min-h-screen">
  
  <!-- Sidebar Kiri -->
  <aside class="w-full md:w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
    <!-- Header Sidebar -->
    <div class="p-6 border-b border-slate-800 flex items-center gap-3">
      <div class="p-2 bg-blue-600 text-white rounded-lg">
        <span class="material-symbols-rounded text-xl">school</span>
      </div>
      <div>
        <h2 class="font-bold text-sm tracking-wide">SINS GURU</h2>
        <p class="text-[10px] text-slate-400">Database Live Connected</p>
      </div>
    </div>

    <!-- Info Profil Pendidik -->
    <div class="p-4 mx-4 my-3 bg-slate-800/40 rounded-xl flex items-center gap-3 border border-slate-800">
      <div class="w-9 h-9 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center font-bold text-sm border border-blue-500/20">
        G
      </div>
      <div class="overflow-hidden">
        <h4 class="font-bold text-xs text-slate-200 truncate" id="teacherProfileName">Guru Pendidik</h4>
        <p class="text-[9px] text-green-400 flex items-center gap-1 mt-0.5 font-medium">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Online
        </p>
      </div>
    </div>

    <!-- Daftar Menu -->
    <nav class="flex-grow px-4 py-2 space-y-1">
      <button onclick="setGuruView('dashboard')" id="btn-menu-dashboard" class="sidebar-link w-full px-4 py-3 text-slate-300 hover:text-white rounded-xl flex items-center gap-3 transition-all text-xs font-semibold hover:bg-slate-800 cursor-pointer">
        <span class="material-symbols-rounded text-lg">dashboard</span> Dashboard
      </button>

      <button onclick="setGuruView('nilai')" id="btn-menu-nilai" class="sidebar-link w-full px-4 py-3 text-slate-300 hover:text-white rounded-xl flex items-center gap-3 transition-all text-xs font-semibold hover:bg-slate-800 cursor-pointer">
        <span class="material-symbols-rounded text-lg">table_rows</span> Data Nilai
      </button>

      <button onclick="setGuruView('tambah')" id="btn-menu-tambah" class="sidebar-link w-full px-4 py-3 text-slate-300 hover:text-white rounded-xl flex items-center gap-3 transition-all text-xs font-semibold hover:bg-slate-800 cursor-pointer">
        <span class="material-symbols-rounded text-lg">person_add</span> Tambah Data
      </button>

      <button onclick="setGuruView('kkm')" id="btn-menu-kkm" class="sidebar-link w-full px-4 py-3 text-slate-300 hover:text-white rounded-xl flex items-center gap-3 transition-all text-xs font-semibold hover:bg-slate-800 cursor-pointer">
        <span class="material-symbols-rounded text-lg">tune</span> Pengaturan KKM
      </button>
    </nav>

    <!-- Tombol Logout -->
    <div class="p-4 border-t border-slate-800 mt-auto">
      <button onclick="triggerLogout()" class="w-full px-4 py-3 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-xl flex items-center justify-center gap-2.5 transition-all text-xs font-bold border border-red-500/20 shadow-md cursor-pointer">
        <span class="material-symbols-rounded text-base">logout</span> Keluar Portal
      </button>
    </div>
  </aside>

  <!-- Konten Utama Halaman Guru -->
  <main class="flex-grow p-6 md:p-8 space-y-6 overflow-x-hidden bg-slate-50/50">
    
    <!-- Top Header Bar -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
      <div>
        <h1 class="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight" id="guruPageTitle">Dashboard</h1>
        <p class="text-xs text-slate-500 mt-1" id="guruPageSubtitle">Overview dan analisis statistik nilai siswa.</p>
      </div>
      <div class="flex items-center gap-2.5 bg-white px-4 py-2 border rounded-full shadow-sm text-xs text-slate-600 font-semibold">
        <span class="material-symbols-rounded text-blue-600 text-base">schedule</span>
        <span id="lastUpdatedText">Memuat pembaruan...</span>
      </div>
    </div>

    <!-- SUB VIEW 1: DASHBOARD STATS & ANALYTICS -->
    <section id="view-guru-dashboard" class="space-y-6 animate-fade-in">
      <!-- Grid Kartu Statistik Modern -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Siswa -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <span class="material-symbols-rounded text-2xl">group</span>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Siswa</p>
            <h3 class="text-xl font-bold text-slate-800 mt-0.5" id="stat-totalSiswa">0</h3>
          </div>
        </div>
        <!-- Rata-rata -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <span class="material-symbols-rounded text-2xl">analytics</span>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Kelas</p>
            <h3 class="text-xl font-bold text-slate-800 mt-0.5" id="stat-rataRata">0</h3>
          </div>
        </div>
        <!-- Tertinggi -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="p-3 bg-green-50 text-green-600 rounded-xl">
            <span class="material-symbols-rounded text-2xl">trending_up</span>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai Tertinggi</p>
            <h3 class="text-xl font-bold text-slate-800 mt-0.5" id="stat-nilaiTertinggi">0</h3>
          </div>
        </div>
        <!-- Terendah -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="p-3 bg-red-50 text-red-600 rounded-xl">
            <span class="material-symbols-rounded text-2xl">trending_down</span>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nilai Terendah</p>
            <h3 class="text-xl font-bold text-slate-800 mt-0.5" id="stat-nilaiTerendah">0</h3>
          </div>
        </div>
        <!-- Kelas -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
          <div class="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <span class="material-symbols-rounded text-2xl">domain</span>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Kelas</p>
            <h3 class="text-xl font-bold text-slate-800 mt-0.5" id="stat-totalKelas">0</h3>
          </div>
        </div>
      </div>

      <!-- Grid Visualisasi Data (Chart.js) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Grafik Distribusi Rentang Nilai -->
        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-8 flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 class="font-bold text-sm text-slate-800">Distribusi Predikat Nilai</h3>
            <p class="text-[10px] text-slate-400 mt-0.5">Rentang nilai kelulusan siswa berdasarkan kategori huruf mutu.</p>
          </div>
          <div class="flex-grow mt-4 max-h-[250px] relative">
            <canvas id="chartPredikatNilai"></canvas>
          </div>
        </div>

        <!-- Donut Chart Lulus vs Bimbingan -->
        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-4 flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 class="font-bold text-sm text-slate-800">Tingkat Kelulusan</h3>
            <p class="text-[10px] text-slate-400 mt-0.5">Persentase siswa yang lulus (>= KKM) vs Perlu Bimbingan.</p>
          </div>
          <div class="flex-grow mt-4 max-h-[180px] relative flex justify-center">
            <canvas id="chartKelulusan"></canvas>
          </div>
          <div class="mt-4 flex items-center justify-around text-xs font-semibold">
            <span class="flex items-center gap-1.5 text-green-600">
              <span class="w-3 h-3 rounded-full bg-green-500"></span> Lulus: <span id="donut-lulus-count">0</span>
            </span>
            <span class="flex items-center gap-1.5 text-red-500">
              <span class="w-3 h-3 rounded-full bg-red-500"></span> Bimbingan: <span id="donut-bimbingan-count">0</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- SUB VIEW 2: DATA TABEL NILAI -->
    <section id="view-guru-nilai" class="hidden space-y-6 animate-fade-in">
      <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        
        <!-- Header Tabel & Tools -->
        <div class="p-6 border-b border-slate-100 flex flex-col gap-4">
          <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 class="font-bold text-sm text-slate-800">Daftar Nilai Siswa</h3>
              <p class="text-[10px] text-slate-400 mt-0.5">Gunakan filter pencarian dan tools ekspor data di bawah ini.</p>
            </div>
            
            <!-- Ekspor & Impor Buttons -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <button onclick="exportToExcel()" class="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-green-600/10 cursor-pointer">
                <span class="material-symbols-rounded text-sm">download</span> Excel
              </button>
              <button onclick="exportToPDF()" class="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-red-600/10 cursor-pointer">
                <span class="material-symbols-rounded text-sm">picture_as_pdf</span> PDF
              </button>
              <button onclick="window.print()" class="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer">
                <span class="material-symbols-rounded text-sm">print</span> Print
              </button>
              <button onclick="document.getElementById('importExcelInput').click()" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/10 cursor-pointer">
                <span class="material-symbols-rounded text-sm">publish</span> Impor Excel
              </button>
              <input type="file" id="importExcelInput" accept=".xlsx, .xls, .csv" onchange="handleExcelImport(event)" class="hidden">
            </div>
          </div>

          <!-- Filter & Search Bar -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div class="md:col-span-6 relative">
              <span class="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input type="text" id="nilaiSearchInput" oninput="handleSearchTable()" placeholder="Cari nama siswa atau NISN..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
            </div>
            
            <div class="md:col-span-3">
              <select id="filterKelasSelect" onchange="handleSearchTable()" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs transition-all font-medium">
                <option value="">Semua Kelas</option>
              </select>
            </div>

            <div class="md:col-span-3">
              <select id="filterStatusSelect" onchange="handleSearchTable()" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs transition-all font-medium">
                <option value="">Semua Kelulusan</option>
                <option value="LULUS">LULUS</option>
                <option value="BIMBINGAN">PERLU BIMBINGAN</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tabel Container (Scrollable) -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse" id="mainSINSGrid">
            <thead>
              <tr class="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-wider">
                <th class="py-3.5 px-6 font-bold cursor-pointer hover:bg-slate-100/80 transition-colors" onclick="sortTable(0)">No <span class="text-[8px] font-mono">▲▼</span></th>
                <th class="py-3.5 px-4 font-bold cursor-pointer hover:bg-slate-100/80 transition-colors" onclick="sortTable(1)">NISN <span class="text-[8px] font-mono">▲▼</span></th>
                <th class="py-3.5 px-4 font-bold cursor-pointer hover:bg-slate-100/80 transition-colors" onclick="sortTable(2)">Nama <span class="text-[8px] font-mono">▲▼</span></th>
                <th class="py-3.5 px-4 font-bold cursor-pointer hover:bg-slate-100/80 transition-colors" onclick="sortTable(3)">Kelas <span class="text-[8px] font-mono">▲▼</span></th>
                <th class="py-3.5 px-4 font-bold text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onclick="sortTable(4)">Tugas</th>
                <th class="py-3.5 px-4 font-bold text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onclick="sortTable(5)">UH</th>
                <th class="py-3.5 px-4 font-bold text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onclick="sortTable(6)">PTS</th>
                <th class="py-3.5 px-4 font-bold text-center cursor-pointer hover:bg-slate-100/80 transition-colors" onclick="sortTable(7)">PAS</th>
                <th class="py-3.5 px-4 font-bold text-center cursor-pointer hover:bg-slate-100/80 transition-colors bg-blue-50/20" onclick="sortTable(8)">Akhir</th>
                <th class="py-3.5 px-4 font-bold text-center cursor-pointer hover:bg-slate-100/80 transition-colors bg-indigo-50/20" onclick="sortTable(9)">Ranking</th>
                <th class="py-3.5 px-6 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100" id="studentTableBody">
              <!-- Baris data diisi oleh javascript -->
            </tbody>
          </table>
        </div>

        <!-- Footer Tabel: Pagination Info -->
        <div class="p-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold">
          <p class="text-slate-500">Menampilkan <span id="paginatedInfoStart">0</span> - <span id="paginatedInfoEnd">0</span> dari <span id="paginatedInfoTotal">0</span> siswa</p>
          <div class="flex items-center gap-1.5" id="paginationControls">
            <!-- Tombol halaman di-render dinamis -->
          </div>
        </div>

      </div>
    </section>

    <!-- SUB VIEW 3: TAMBAH DATA / EDIT DATA (Dynamic Form) -->
    <section id="view-guru-tambah" class="hidden space-y-6 animate-fade-in">
      <div class="max-w-3xl bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        <div class="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-600/5 to-transparent">
          <h3 class="font-bold text-sm text-slate-800" id="formSectionTitle">Form Input Data Nilai</h3>
          <p class="text-[10px] text-slate-500 mt-0.5">Pastikan NISN siswa unik dan seluruh field bernilai 0 hingga 100.</p>
        </div>

        <form id="studentDataForm" onsubmit="handleFormSubmit(event)" class="p-6 space-y-6">
          <input type="hidden" id="formMode" value="add"> <!-- 'add' atau 'edit' -->
          <input type="hidden" id="originalNISN"> <!-- untuk edit key -->

          <!-- Identitas Siswa -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">NISN (10 Digit)*</label>
              <input type="text" id="inputNISN" required maxlength="10" placeholder="0091234567" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Nama Lengkap Siswa*</label>
              <input type="text" id="inputNama" required placeholder="Ahmad Sanusi" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Kelas / Rombel*</label>
              <input type="text" id="inputKelas" required placeholder="XI IPA 1" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Nilai Akhir (Guru)*</label>
              <input type="number" id="inputNilaiAkhir" min="0" max="100" placeholder="Opsional (Dihitung Rata-rata)" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-600 mb-1.5">Ranking (Manual)*</label>
              <input type="number" id="inputRanking" min="0" placeholder="Opsional (Auto Urut)" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
            </div>
          </div>

          <!-- Komponen Nilai Akademik -->
          <div class="border-t pt-4">
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span class="material-symbols-rounded text-blue-600 text-base">analytics</span> Komponen Nilai
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 mb-1.5">NILAI TUGAS (25%)</label>
                <input type="number" id="inputTugas" min="0" max="100" value="0" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 mb-1.5">NILAI UH (25%)</label>
                <input type="number" id="inputUH" min="0" max="100" value="0" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 mb-1.5">NILAI PTS (25%)</label>
                <input type="number" id="inputPTS" min="0" max="100" value="0" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-600 mb-1.5">NILAI PAS (25%)</label>
                <input type="number" id="inputPAS" min="0" max="100" value="0" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t">
            <button type="button" onclick="resetStudentForm()" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer">
              Reset Input
            </button>
            <button type="submit" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer">
              Simpan Data
            </button>
          </div>
        </form>

      </div>
    </section>

    <!-- SUB VIEW 4: PENGATURAN KKM -->
    <section id="view-guru-kkm" class="hidden space-y-6 animate-fade-in">
      <div class="max-w-md bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 bg-gradient-to-r from-green-500/5 to-transparent">
          <h3 class="font-bold text-sm text-slate-800">Ubah Batas KKM Global</h3>
          <p class="text-[10px] text-slate-500 mt-0.5">Siswa dengan Nilai Akhir kurang dari nilai KKM dinyatakan PERLU BIMBINGAN.</p>
        </div>
        <form id="kkmUpdateForm" onsubmit="handleKKMSubmit(event)" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-600 mb-1.5">Nilai KKM (Kriteria Ketuntasan Minimal)*</label>
            <input type="number" id="inputKKM" required min="10" max="95" class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-medium">
          </div>
          <button type="submit" class="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-green-600/10 cursor-pointer">
            Perbarui KKM Sekolah
          </button>
        </form>
      </div>
    </section>

  </main>
</div>
`
  },
  {
    name: "Siswa.html",
    type: "html",
    content: `<div class="flex-grow flex items-center justify-center px-4 py-12 bg-gradient-to-tr from-green-500/10 via-slate-50 to-blue-500/10">
  <div class="w-full max-w-2xl space-y-6 animate-fade-in">
    
    <!-- Header Siswa Portal -->
    <div class="flex items-center justify-between">
      <button onclick="switchLoginMode('role')" class="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer">
        <span class="material-symbols-rounded text-base">arrow_back</span> Portal Utama
      </button>
      <span class="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Akses Siswa</span>
    </div>

    <!-- Kotak Pencarian NISN -->
    <div class="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl space-y-6">
      <div class="text-center space-y-1.5">
        <div class="inline-flex p-3 bg-green-100 text-green-700 rounded-2xl mb-2">
          <span class="material-symbols-rounded text-3xl">school</span>
        </div>
        <h2 class="text-xl font-extrabold text-slate-800">Cek Nilai Siswa Mandiri</h2>
        <p class="text-xs text-slate-500">Masukkan Nomor Induk Siswa Nasional (NISN) untuk memantau nilai Anda</p>
      </div>

      <form id="siswaSearchForm" onsubmit="handleSiswaSearch(event)" class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-grow">
          <span class="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">badge</span>
          <input type="text" id="searchNISN" required maxlength="10" placeholder="Masukkan 10 digit NISN..." class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-green-500 focus:bg-white rounded-xl outline-none text-xs transition-all font-semibold">
        </div>
        <button type="submit" class="sm:w-40 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-green-600/10 cursor-pointer flex items-center justify-center gap-1.5">
          <span class="material-symbols-rounded text-sm">search</span> Cari Nilai
        </button>
      </form>
    </div>

    <!-- Card Hasil Pencarian (Tersembunyi awal) -->
    <div id="siswaResultContainer" class="hidden animate-fade-in bg-white border border-slate-100 shadow-xl rounded-3xl overflow-hidden">
      
      <!-- Banner Lulus / Bimbingan -->
      <div id="siswaResultHeader" class="p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white">
        <div class="space-y-1">
          <p class="text-[10px] uppercase font-bold tracking-wider opacity-90">Kartu Hasil Studi Siswa</p>
          <h3 class="text-xl md:text-2xl font-extrabold" id="res-nama">Ahmad Wijaya</h3>
          <p class="text-xs opacity-90 flex items-center gap-1.5 mt-0.5">
            <span class="material-symbols-rounded text-xs">domain</span> <span id="res-kelas">XI IPA 1</span>
            <span class="mx-1">•</span>
            <span class="material-symbols-rounded text-xs">badge</span> NISN: <span id="res-nisn">0091234567</span>
          </p>
        </div>
        <div class="px-5 py-2.5 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg" id="res-status-pill">
          <span class="text-[9px] uppercase tracking-wider opacity-80" id="res-status-label">STATUS KELULUSAN</span>
          <span class="text-lg" id="res-status">LULUS</span>
        </div>
      </div>

      <!-- Ringkasan Nilai Card -->
      <div class="p-6 md:p-8 space-y-6">
        
        <!-- Statistik Indikator -->
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-slate-50 p-4 rounded-2xl text-center">
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nilai Akhir</p>
            <h4 class="text-2xl font-black text-slate-800 mt-0.5" id="res-nilaiAkhir">0</h4>
          </div>
          <div class="bg-slate-50 p-4 rounded-2xl text-center">
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ranking Kelas</p>
            <h4 class="text-2xl font-black text-slate-800 mt-0.5" id="res-ranking">0</h4>
          </div>
          <div class="bg-slate-50 p-4 rounded-2xl text-center">
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">KKM Sekolah</p>
            <h4 class="text-2xl font-black text-slate-800 mt-0.5" id="res-kkm">0</h4>
          </div>
        </div>

        <!-- Detail Komponen Nilai (ProgressBar) -->
        <div class="space-y-4">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span class="material-symbols-rounded text-blue-600 text-base">bar_chart</span> Rincian Nilai Mata Pelajaran
          </h4>
          
          <div class="space-y-3.5">
            <!-- Tugas -->
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Nilai Tugas (25%)</span>
                <span id="res-nilaiTugas-text">85 / 100</span>
              </div>
              <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div id="res-nilaiTugas-bar" class="h-full bg-blue-500 rounded-full" style="width: 85%"></div>
              </div>
            </div>

            <!-- UH -->
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Nilai Ulangan Harian (25%)</span>
                <span id="res-nilaiUH-text">80 / 100</span>
              </div>
              <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div id="res-nilaiUH-bar" class="h-full bg-amber-500 rounded-full" style="width: 80%"></div>
              </div>
            </div>

            <!-- PTS -->
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Nilai Ujian Tengah Semester (25%)</span>
                <span id="res-nilaiPTS-text">78 / 100</span>
              </div>
              <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div id="res-nilaiPTS-bar" class="h-full bg-indigo-500 rounded-full" style="width: 78%"></div>
              </div>
            </div>

            <!-- PAS -->
            <div>
              <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Nilai Ujian Akhir Semester (25%)</span>
                <span id="res-nilaiPAS-text">82 / 100</span>
              </div>
              <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div id="res-nilaiPAS-bar" class="h-full bg-green-500 rounded-full" style="width: 82%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Hasil Card -->
        <div class="pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-slate-400 font-semibold">
          <p>Terakhir diperbarui: <span id="res-lastUpdated">Hari ini</span></p>
          <button onclick="window.print()" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer">
            <span class="material-symbols-rounded text-xs">print</span> Cetak Transkrip
          </button>
        </div>

      </div>

    </div>
  </div>
</div>
`
  },
  {
    name: "Script.html",
    type: "html",
    content: `<script>
  /**
   * Sistem Informasi Nilai Siswa (SINS)
   * Google Apps Script - Client Side JavaScript Controller
   */

  // State Global Aplikasi
  let appState = {
    currentMode: 'role', // role, guru, siswa
    userToken: null,
    username: null,
    kkm: 75,
    students: [],
    stats: {},
    currentPage: 1,
    rowsPerPage: 5,
    currentSortCol: -1,
    sortAscending: true
  };

  // Objek Grafis Chart.js
  let predikatChart = null;
  let kelulusanChart = null;

  // Inisialisasi awal aplikasi saat file ter-load
  document.addEventListener("DOMContentLoaded", function() {
    renderApp();
  });

  // Me-render tampilan berdasarkan state.currentMode
  function renderApp() {
    const container = document.getElementById("appContainer");
    let templateId = '';
    
    if (appState.currentMode === 'role') {
      templateId = 'tpl-login';
    } else if (appState.currentMode === 'guru') {
      templateId = 'tpl-guru';
    } else if (appState.currentMode === 'siswa') {
      templateId = 'tpl-siswa';
    }
    
    const templateContent = document.getElementById(templateId).innerHTML;
    container.innerHTML = templateContent;
    
    // Inisialisasi spesifik halaman
    if (appState.currentMode === 'guru') {
      document.getElementById('teacherProfileName').innerText = appState.username || 'Guru SINS';
      loadGuruDashboard();
    }
  }

  // Beralih tampilan halaman login/portal
  function switchLoginMode(mode) {
    appState.currentMode = mode;
    renderApp();
  }

  // Tampilkan/Sembunyikan password
  function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = document.getElementById(fieldId + 'Icon');
    if (field.type === "password") {
      field.type = "text";
      icon.innerText = "visibility_off";
    } else {
      field.type = "password";
      icon.innerText = "visibility";
    }
  }

  // Loader Spinner Helper
  function showLoader(visible) {
    const spinner = document.getElementById("loadingSpinner");
    if (visible) {
      spinner.classList.remove("hidden");
    } else {
      spinner.classList.add("hidden");
    }
  }

  // TOAST NOTIFICATION UTILITY
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  });

  // --- CONTROLLER AKSES SISWA ---
  function handleSiswaSearch(e) {
    e.preventDefault();
    const nisn = document.getElementById("searchNISN").value.trim();
    if (!nisn) return;

    showLoader(true);
    google.script.run
      .withSuccessHandler(function(response) {
        showLoader(false);
        if (response.success) {
          document.getElementById("siswaResultContainer").classList.remove("hidden");
          document.getElementById("res-nama").innerText = response.student.nama;
          document.getElementById("res-kelas").innerText = response.student.kelas;
          document.getElementById("res-nisn").innerText = response.student.nisn;
          document.getElementById("res-nilaiAkhir").innerText = response.student.nilaiAkhir;
          document.getElementById("res-ranking").innerText = response.student.ranking || "-";
          document.getElementById("res-kkm").innerText = response.kkm;
          document.getElementById("res-status").innerText = response.status;
          document.getElementById("res-lastUpdated").innerText = response.lastUpdated;
          
          // Detail Komponen Nilai
          updateScoreBar("res-nilaiTugas", response.student.nilaiTugas);
          updateScoreBar("res-nilaiUH", response.student.nilaiUH);
          updateScoreBar("res-nilaiPTS", response.student.nilaiPTS);
          updateScoreBar("res-nilaiPAS", response.student.nilaiPAS);

          // Update warna banner berdasarkan kelulusan
          const banner = document.getElementById("siswaResultHeader");
          const pill = document.getElementById("res-status-pill");
          if (response.status === "LULUS") {
            banner.className = "p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white bg-gradient-to-r from-green-600 to-emerald-500";
            pill.className = "px-5 py-2.5 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg bg-green-700/60";
          } else {
            banner.className = "p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white bg-gradient-to-r from-red-600 to-rose-500";
            pill.className = "px-5 py-2.5 rounded-2xl flex flex-col items-center justify-center font-black shadow-lg bg-red-700/60";
          }

          Toast.fire({
            icon: 'success',
            title: 'Hasil nilai ditemukan!'
          });
        } else {
          document.getElementById("siswaResultContainer").classList.add("hidden");
          Swal.fire({
            icon: 'error',
            title: 'Siswa Tidak Ditemukan',
            text: response.message,
            confirmButtonColor: '#10B981'
          });
        }
      })
      .withFailureHandler(function(error) {
        showLoader(false);
        Swal.fire({
          icon: 'error',
          title: 'Kesalahan Sistem',
          text: error.message
        });
      })
      .getDataByNISN(nisn);
  }

  function updateScoreBar(prefix, value) {
    document.getElementById(prefix + "-text").innerText = value + " / 100";
    document.getElementById(prefix + "-bar").style.width = value + "%";
  }

  // --- CONTROLLER AUTH GURU ---
  function handleGuruSubmit(e) {
    e.preventDefault();
    const user = document.getElementById("guruUsername").value;
    const pass = document.getElementById("guruPassword").value;

    showLoader(true);
    google.script.run
      .withSuccessHandler(function(response) {
        showLoader(false);
        if (response.success) {
          appState.userToken = response.token;
          appState.username = response.username;
          appState.currentMode = 'guru';
          
          Toast.fire({
            icon: 'success',
            title: response.message
          });
          renderApp();
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Login Gagal',
            text: response.message,
            confirmButtonColor: '#3B82F6'
          });
        }
      })
      .withFailureHandler(function(error) {
        showLoader(false);
        Swal.fire({
          icon: 'error',
          title: 'Kesalahan Sistem',
          text: error.message
        });
      })
      .loginGuru(user, pass);
  }

  function triggerLogout() {
    Swal.fire({
      title: 'Keluar dari Portal?',
      text: "Anda akan keluar dari sesi guru.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Keluar!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        showLoader(true);
        google.script.run
          .withSuccessHandler(function(res) {
            showLoader(false);
            appState.userToken = null;
            appState.username = null;
            appState.currentMode = 'role';
            renderApp();
            Toast.fire({
              icon: 'success',
              title: res.message
            });
          })
          .withFailureHandler(function() {
            showLoader(false);
            appState.userToken = null;
            appState.username = null;
            appState.currentMode = 'role';
            renderApp();
          })
          .logout();
      }
    });
  }

  // --- CONTROLLER SIDEBAR & VIEW GURU ---
  function setGuruView(viewName) {
    // Sembunyikan semua sub-view
    document.getElementById('view-guru-dashboard').classList.add('hidden');
    document.getElementById('view-guru-nilai').classList.add('hidden');
    document.getElementById('view-guru-tambah').classList.add('hidden');
    document.getElementById('view-guru-kkm').classList.add('hidden');

    // Hapus kelas active dari seluruh link sidebar
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));

    // Tampilkan view yang dipilih
    document.getElementById('view-guru-' + viewName).classList.remove('hidden');
    document.getElementById('btn-menu-' + viewName).classList.add('active');

    // Ubah Header Bar Sesuai View
    const pageTitle = document.getElementById('guruPageTitle');
    const pageSubtitle = document.getElementById('guruPageSubtitle');

    if (viewName === 'dashboard') {
      pageTitle.innerText = 'Dashboard Analitik';
      pageSubtitle.innerText = 'Informasi performa akademik dan statistik kelulusan siswa.';
      loadGuruDashboard();
    } else if (viewName === 'nilai') {
      pageTitle.innerText = 'Basis Data Nilai';
      pageSubtitle.innerText = 'Kelola database siswa, ekspor laporan spreadsheet, & cetak nilai.';
      loadGuruStudentsTable();
    } else if (viewName === 'tambah') {
      document.getElementById('formMode').value = 'add';
      document.getElementById('formSectionTitle').innerText = 'Tambah Data Nilai Baru';
      resetStudentForm();
      document.getElementById('inputNISN').disabled = false;
      pageTitle.innerText = 'Pencatatan Siswa';
      pageSubtitle.innerText = 'Tambahkan siswa dan nilai komponen akademik secara manual.';
    } else if (viewName === 'kkm') {
      pageTitle.innerText = 'Kriteria Sekolah';
      pageSubtitle.innerText = 'Atur parameter kelulusan minimal (KKM) siswa.';
      document.getElementById('inputKKM').value = appState.kkm;
    }
  }

  // Memuat data ringkasan analitis guru
  function loadGuruDashboard() {
    showLoader(true);
    google.script.run
      .withSuccessHandler(function(response) {
        showLoader(false);
        appState.kkm = response.kkm;
        
        // Render statistik card
        document.getElementById("stat-totalSiswa").innerText = response.totalSiswa;
        document.getElementById("stat-rataRata").innerText = response.rataRata;
        document.getElementById("stat-nilaiTertinggi").innerText = response.nilaiTertinggi;
        document.getElementById("stat-nilaiTerendah").innerText = response.nilaiTerendah;
        document.getElementById("stat-totalKelas").innerText = response.totalKelas;
        document.getElementById("lastUpdatedText").innerText = "Update: " + response.lastUpdated;

        document.getElementById("donut-lulus-count").innerText = response.lulusDistribution.LULUS;
        document.getElementById("donut-bimbingan-count").innerText = response.lulusDistribution.BIMBINGAN;

        // Gambar Grafik Predikat & Kelulusan
        renderCharts(response.rangeDistribution, response.lulusDistribution);
      })
      .withFailureHandler(function(error) {
        showLoader(false);
        console.error(error);
      })
      .getDashboard(appState.userToken);
  }

  // Merender chart menggunakan Chart.js
  function renderCharts(rangeData, lulusData) {
    // Predikat Chart
    const ctxPredikat = document.getElementById('chartPredikatNilai').getContext('2d');
    if (predikatChart) predikatChart.destroy();
    
    predikatChart = new Chart(ctxPredikat, {
      type: 'bar',
      data: {
        labels: Object.keys(rangeData),
        datasets: [{
          label: 'Jumlah Siswa',
          data: Object.values(rangeData),
          backgroundColor: '#3B82F6',
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#94A3B8' },
            grid: { color: '#F1F5F9' }
          },
          x: {
            ticks: { color: '#94A3B8' },
            grid: { display: false }
          }
        }
      }
    });

    // Donut Chart Kelulusan
    const ctxKelulusan = document.getElementById('chartKelulusan').getContext('2d');
    if (kelulusanChart) kelulusanChart.destroy();

    kelulusanChart = new Chart(ctxKelulusan, {
      type: 'doughnut',
      data: {
        labels: ['Lulus', 'Bimbingan'],
        datasets: [{
          data: [lulusData.LULUS, lulusData.BIMBINGAN],
          backgroundColor: ['#10B981', '#EF4444'],
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        cutout: '70%'
      }
    });
  }

  // Memuat data siswa ke tabel
  function loadGuruStudentsTable() {
    showLoader(true);
    google.script.run
      .withSuccessHandler(function(students) {
        showLoader(false);
        appState.students = students;
        
        // Mengisi Filter Kelas Select
        const filterKelas = document.getElementById("filterKelasSelect");
        const currentSelected = filterKelas.value;
        filterKelas.innerHTML = '<option value="">Semua Kelas</option>';
        const kelasList = [...new Set(students.map(s => s.kelas))].sort();
        classList.forEach(k => {
          const opt = document.createElement("option");
          opt.value = k;
          opt.innerText = k;
          filterKelas.appendChild(opt);
        });
        filterKelas.value = currentSelected;

        renderTableRows();
      })
      .withFailureHandler(function(err) {
        showLoader(false);
        console.error(err);
      })
      .getAllData();
  }

  // Me-render baris-baris tabel
  function renderTableRows() {
    const tableBody = document.getElementById("studentTableBody");
    tableBody.innerHTML = '';

    const searchTerm = document.getElementById("nilaiSearchInput").value.toLowerCase().trim();
    const filterKelas = document.getElementById("filterKelasSelect").value;
    const filterStatus = document.getElementById("filterStatusSelect").value;

    // Filter Data
    let filtered = appState.students.filter(student => {
      const matchSearch = student.nama.toLowerCase().includes(searchTerm) || student.nisn.includes(searchTerm);
      const matchKelas = !filterKelas || student.kelas === filterKelas;
      
      const isLulus = student.nilaiAkhir >= appState.kkm;
      const matchStatus = !filterStatus || (filterStatus === 'LULUS' ? isLulus : !isLulus);

      return matchSearch && matchKelas && matchStatus;
    });

    // Urutkan Data (Sorting)
    if (appState.currentSortCol !== -1) {
      filtered.sort((a, b) => {
        let valA, valB;
        switch (appState.currentSortCol) {
          case 0: valA = a.no; valB = b.no; break;
          case 1: valA = a.nisn; valB = b.nisn; break;
          case 2: valA = a.nama.toLowerCase(); valB = b.nama.toLowerCase(); break;
          case 3: valA = a.kelas; valB = b.kelas; break;
          case 4: valA = a.nilaiTugas; valB = b.nilaiTugas; break;
          case 5: valA = a.nilaiUH; valB = b.nilaiUH; break;
          case 6: valA = a.nilaiPTS; valB = b.nilaiPTS; break;
          case 7: valA = a.nilaiPAS; valB = b.nilaiPAS; break;
          case 8: valA = a.nilaiAkhir; valB = b.nilaiAkhir; break;
          case 9: valA = a.ranking; valB = b.ranking; break;
        }

        if (valA < valB) return appState.sortAscending ? -1 : 1;
        if (valA > valB) return appState.sortAscending ? 1 : -1;
        return 0;
      });
    }

    // Pagination
    const totalRows = filtered.length;
    appState.currentPage = Math.min(appState.currentPage, Math.ceil(totalRows / appState.rowsPerPage) || 1);
    const startIdx = (appState.currentPage - 1) * appState.rowsPerPage;
    const endIdx = Math.min(startIdx + appState.rowsPerPage, totalRows);
    const paginated = filtered.slice(startIdx, endIdx);

    // Update info pagination
    document.getElementById("paginatedInfoStart").innerText = totalRows > 0 ? startIdx + 1 : 0;
    document.getElementById("paginatedInfoEnd").innerText = endIdx;
    document.getElementById("paginatedInfoTotal").innerText = totalRows;

    if (totalRows === 0) {
      tableBody.innerHTML = \`
        <tr>
          <td colspan="11" class="py-10 text-center font-semibold text-slate-400">
            <span class="material-symbols-rounded text-4xl block mb-2 text-slate-300">person_off</span>
            Tidak ada data siswa ditemukan
          </td>
        </tr>
      \`;
      renderPaginationButtons(0);
      return;
    }

    paginated.forEach((s) => {
      const isLulus = s.nilaiAkhir >= appState.kkm;
      const statusPill = isLulus 
        ? '<span class="px-2.5 py-1 bg-green-50 text-green-600 font-bold text-[10px] rounded-full">LULUS</span>'
        : '<span class="px-2.5 py-1 bg-red-50 text-red-500 font-bold text-[10px] rounded-full">BIMBINGAN</span>';

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50/50 transition-colors border-b border-slate-100 font-medium";
      tr.innerHTML = \`
        <td class="py-3 px-6 font-semibold text-slate-400">\${s.no}</td>
        <td class="py-3 px-4 font-bold text-slate-700">\${s.nisn}</td>
        <td class="py-3 px-4 text-slate-800 font-semibold">\${s.nama}</td>
        <td class="py-3 px-4 text-slate-600">\${s.kelas}</td>
        <td class="py-3 px-4 text-center text-slate-600">\${s.nilaiTugas}</td>
        <td class="py-3 px-4 text-center text-slate-600">\${s.nilaiUH}</td>
        <td class="py-3 px-4 text-center text-slate-600">\${s.nilaiPTS}</td>
        <td class="py-3 px-4 text-center text-slate-600">\${s.nilaiPAS}</td>
        <td class="py-3 px-4 text-center bg-blue-50/10 font-bold text-blue-600">\${s.nilaiAkhir}</td>
        <td class="py-3 px-4 text-center bg-indigo-50/10 font-bold text-slate-700">\${s.ranking || '-'}</td>
        <td class="py-3 px-6 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="triggerEditStudent('\${s.nisn}')" class="p-1.5 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg transition-colors cursor-pointer" title="Edit Data">
              <span class="material-symbols-rounded text-lg">edit</span>
            </button>
            <button onclick="triggerDeleteStudent('\${s.nisn}', '\${s.nama}')" class="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer" title="Hapus Siswa">
              <span class="material-symbols-rounded text-lg">delete</span>
            </button>
          </div>
        </td>
      \`;
      tableBody.appendChild(tr);
    });

    renderPaginationButtons(Math.ceil(totalRows / appState.rowsPerPage));
  }

  // Me-render tombol kontrol pagination
  function renderPaginationButtons(totalPages) {
    const container = document.getElementById("paginationControls");
    container.innerHTML = '';

    if (totalPages <= 1) return;

    // Button Prev
    const btnPrev = document.createElement("button");
    btnPrev.className = "p-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-all cursor-pointer " + (appState.currentPage === 1 ? "opacity-50 pointer-events-none" : "");
    btnPrev.innerHTML = '<span class="material-symbols-rounded text-base">chevron_left</span>';
    btnPrev.onclick = () => { appState.currentPage--; renderTableRows(); };
    container.appendChild(btnPrev);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.className = "w-7 h-7 font-bold text-[11px] rounded-lg transition-all cursor-pointer " + (appState.currentPage === i ? "bg-blue-600 text-white shadow-md shadow-blue-600/10" : "bg-slate-100 hover:bg-slate-200 text-slate-600");
      btn.innerText = i;
      btn.onclick = () => { appState.currentPage = i; renderTableRows(); };
      container.appendChild(btn);
    }

    // Button Next
    const btnNext = document.createElement("button");
    btnNext.className = "p-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-all cursor-pointer " + (appState.currentPage === totalPages ? "opacity-50 pointer-events-none" : "");
    btnNext.innerHTML = '<span class="material-symbols-rounded text-base">chevron_right</span>';
    btnNext.onclick = () => { appState.currentPage++; renderTableRows(); };
    container.appendChild(btnNext);
  }

  // Fungsi Sorting Tabel
  function sortTable(colIndex) {
    if (appState.currentSortCol === colIndex) {
      appState.sortAscending = !appState.sortAscending;
    } else {
      appState.currentSortCol = colIndex;
      appState.sortAscending = true;
    }
    renderTableRows();
  }

  // Event handler pencarian real-time tabel
  function handleSearchTable() {
    appState.currentPage = 1;
    renderTableRows();
  }

  // --- CONTROLLER FORM TAMBAH & EDIT SISWA ---
  function resetStudentForm() {
    document.getElementById("studentDataForm").reset();
    document.getElementById("inputTugas").value = 0;
    document.getElementById("inputUH").value = 0;
    document.getElementById("inputPTS").value = 0;
    document.getElementById("inputPAS").value = 0;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    
    const mode = document.getElementById("formMode").value;
    const studentObj = {
      nisn: document.getElementById("inputNISN").value.trim(),
      nama: document.getElementById("inputNama").value.trim(),
      kelas: document.getElementById("inputKelas").value.trim(),
      nilaiTugas: Number(document.getElementById("inputTugas").value) || 0,
      nilaiUH: Number(document.getElementById("inputUH").value) || 0,
      nilaiPTS: Number(document.getElementById("inputPTS").value) || 0,
      nilaiPAS: Number(document.getElementById("inputPAS").value) || 0,
      nilaiAkhir: Number(document.getElementById("inputNilaiAkhir").value) || 0,
      ranking: Number(document.getElementById("inputRanking").value) || 0
    };

    // Validasi input kisaran nilai
    const scores = [studentObj.nilaiTugas, studentObj.nilaiUH, studentObj.nilaiPTS, studentObj.nilaiPAS];
    if (scores.some(s => s < 0 || s > 100)) {
      Swal.fire({ icon: 'error', title: 'Nilai Tidak Valid', text: 'Semua komponen nilai harus berada di rentang 0-100.' });
      return;
    }

    showLoader(true);
    
    if (mode === 'add') {
      google.script.run
        .withSuccessHandler(function(response) {
          showLoader(false);
          if (response.success) {
            Swal.fire({ icon: 'success', title: 'Tersimpan', text: response.message });
            setGuruView('nilai');
          } else {
            Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: response.message });
          }
        })
        .withFailureHandler(function(error) {
          showLoader(false);
          Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        })
        .tambahData(studentObj, appState.userToken);
    } else {
      const originalNISN = document.getElementById("originalNISN").value;
      google.script.run
        .withSuccessHandler(function(response) {
          showLoader(false);
          if (response.success) {
            Swal.fire({ icon: 'success', title: 'Selesai', text: response.message });
            setGuruView('nilai');
          } else {
            Swal.fire({ icon: 'error', title: 'Gagal Memperbarui', text: response.message });
          }
        })
        .withFailureHandler(function(error) {
          showLoader(false);
          Swal.fire({ icon: 'error', title: 'Error', text: error.message });
        })
        .updateData(originalNISN, studentObj, appState.userToken);
    }
  }

  function triggerEditStudent(nisn) {
    const student = appState.students.find(s => s.nisn === nisn);
    if (!student) return;

    setGuruView('tambah');
    document.getElementById('formMode').value = 'edit';
    document.getElementById('originalNISN').value = nisn;
    document.getElementById('formSectionTitle').innerText = 'Edit Data Nilai Siswa: ' + student.nama;

    // Mengisi form
    const inputNISN = document.getElementById("inputNISN");
    inputNISN.value = student.nisn;
    inputNISN.disabled = true; // NISN tidak bisa diganti saat edit

    document.getElementById("inputNama").value = student.nama;
    document.getElementById("inputKelas").value = student.kelas;
    document.getElementById("inputTugas").value = student.nilaiTugas;
    document.getElementById("inputUH").value = student.nilaiUH;
    document.getElementById("inputPTS").value = student.nilaiPTS;
    document.getElementById("inputPAS").value = student.nilaiPAS;
    document.getElementById("inputNilaiAkhir").value = student.nilaiAkhir;
    document.getElementById("inputRanking").value = student.ranking;
  }

  function triggerDeleteStudent(nisn, nama) {
    Swal.fire({
      title: 'Hapus Data Siswa?',
      text: "Anda akan menghapus nilai siswa " + nama + " secara permanen dari spreadsheet.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        showLoader(true);
        google.script.run
          .withSuccessHandler(function(response) {
            showLoader(false);
            if (response.success) {
              Toast.fire({ icon: 'success', title: response.message });
              loadGuruStudentsTable();
            } else {
              Swal.fire({ icon: 'error', title: 'Gagal', text: response.message });
            }
          })
          .withFailureHandler(function(error) {
            showLoader(false);
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
          })
          .hapusData(nisn, appState.userToken);
      }
    });
  }

  // --- CONTROLLER KKM ---
  function handleKKMSubmit(e) {
    e.preventDefault();
    const kkmVal = Number(document.getElementById("inputKKM").value);
    
    showLoader(true);
    google.script.run
      .withSuccessHandler(function(response) {
        showLoader(false);
        if (response.success) {
          appState.kkm = response.kkm;
          Swal.fire({
            icon: 'success',
            title: 'KKM Diperbarui',
            text: 'Standar KKM baru sekolah berhasil diperbarui menjadi ' + response.kkm + '.',
            confirmButtonColor: '#10B981'
          });
        }
      })
      .withFailureHandler(function(error) {
        showLoader(false);
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
      })
      .updateSchoolKKM(kkmVal);
  }

  // --- EKSPOR / IMPOR EXCEL & PDF ---
  function exportToExcel() {
    const dataToExport = appState.students.map(s => {
      return {
        'No': s.no,
        'NISN': s.nisn,
        'Nama': s.nama,
        'Kelas': s.kelas,
        'Nilai Tugas': s.nilaiTugas,
        'Nilai UH': s.nilaiUH,
        'Nilai PTS': s.nilaiPTS,
        'Nilai PAS': s.nilaiPAS,
        'Nilai Akhir': s.nilaiAkhir,
        'Ranking': s.ranking || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Nilai");
    XLSX.writeFile(workbook, "SINS_Data_Nilai_Siswa.xlsx");
    
    Toast.fire({ icon: 'success', title: 'Laporan Excel berhasil diunduh!' });
  }

  function exportToPDF() {
    const element = document.getElementById('mainSINSGrid');
    const opt = {
      margin:       10,
      filename:     'SINS_Laporan_Nilai_Siswa.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    showLoader(true);
    html2pdf().set(opt).from(element).save().then(() => {
      showLoader(false);
      Toast.fire({ icon: 'success', title: 'Laporan PDF berhasil diunduh!' });
    });
  }

  function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      showLoader(true);
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Mapping row Excel ke format objek siswa
        const studentsToImport = rows.map(r => {
          return {
            nisn: String(r['NISN'] || r['nisn'] || '').trim(),
            nama: String(r['Nama'] || r['nama'] || r['NAMA'] || '').trim(),
            kelas: String(r['Kelas'] || r['kelas'] || r['KELAS'] || '').trim(),
            nilaiTugas: Number(r['Nilai Tugas'] || r['nilai_tugas'] || 0),
            nilaiUH: Number(r['Nilai UH'] || r['nilai_uh'] || 0),
            nilaiPTS: Number(r['Nilai PTS'] || r['nilai_pts'] || 0),
            nilaiPAS: Number(r['Nilai PAS'] || r['nilai_pas'] || 0),
            nilaiAkhir: Number(r['Nilai Akhir'] || r['nilai_akhir'] || 0)
          };
        }).filter(s => s.nisn && s.nama);

        if (studentsToImport.length === 0) {
          showLoader(false);
          Swal.fire({ icon: 'error', title: 'Data Kosong', text: 'Tidak ada baris data valid di file Excel Anda.' });
          return;
        }

        google.script.run
          .withSuccessHandler(function(response) {
            showLoader(false);
            Swal.fire({
              icon: 'success',
              title: 'Impor Berhasil',
              text: response.message
            });
            loadGuruStudentsTable();
          })
          .withFailureHandler(function(error) {
            showLoader(false);
            Swal.fire({ icon: 'error', title: 'Error', text: error.message });
          })
          .importSiswaMassal(studentsToImport, appState.userToken);

      } catch (err) {
        showLoader(false);
        Swal.fire({ icon: 'error', title: 'Gagal Membaca File', text: err.message });
      }
    };
    reader.readAsBinaryString(file);
  }
</script>
`
  }
];
