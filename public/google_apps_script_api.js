/**
 * Sistem Informasi Nilai Siswa (SINS)
 * Google Apps Script - API Web App Backend
 * 
 * Skenario Penggunaan:
 * 1. Deploy script ini sebagai Web App di Google Apps Script (script.google.com)
 * 2. Setel "Execute as" ke "Me" (Saya sendiri)
 * 3. Setel "Who has access" ke "Anyone" (Semua orang)
 * 4. Ambil URL Web App hasil deploy (akhiran /exec) dan tempel di Pengaturan Portal SINS Anda.
 */

const SPREADSHEET_NAME = "SINS Database Nilai";
const SHEET_SISWA = "Siswa";
const SHEET_PENGATURAN = "Pengaturan";
const SHEET_LOGS = "Log Akses";

// Header Kolom untuk Sheet Siswa (Mencakup seluruh field profil dan nilai rapor)
const SISWA_HEADERS = [
  "NISN", "Nama", "LP", "Kelas", "No Induk", "Tempat Lahir", "Tanggal Lahir",
  "Anak Ke", "Jumlah Saudara", "Alamat Siswa", "Desa", "Kecamatan", "Agama",
  "Nama Ayah", "Pekerjaan Ayah", "Nama Ibu", "Pekerjaan Ibu", "No KK",
  "Is Biodata Confirmed", "Catatan Prestasi",
  "PAI S1", "PKN S1", "B Ind S1", "MTK S1", "IPAS S1", "Seni S1", "PJOK S1", "B Ing S1", "B Snd S1", "Nilai Akhir S1", "Ranking S1",
  "PAI S2", "PKN S2", "B Ind S2", "MTK S2", "IPAS S2", "Seni S2", "PJOK S2", "B Ing S2", "B Snd S2", "Nilai Akhir S2", "Ranking S2",
  "Foto Siswa"
];

// Header Kolom untuk Sheet Log Akses
const LOGS_HEADERS = ["ID", "Nama", "NISN", "Role", "Timestamp", "Aktivitas"];

// Header Kolom untuk Sheet Pengaturan (Key-Value)
const PENGATURAN_HEADERS = ["Kunci (Key)", "Nilai (Value)"];

/**
 * Endpoint GET: Membaca data dari Google Sheets
 */
function doGet(e) {
  // Pastikan database telah diinisialisasi
  initDatabase();
  
  var action = e.parameter.action;
  
  if (action === "read_all") {
    try {
      var data = readAllData();
      return contentResponse({ success: true, data: data });
    } catch (err) {
      return contentResponse({ success: false, message: err.toString() });
    }
  }
  
  return contentResponse({ 
    success: true, 
    message: "SINS API Web App aktif! Gunakan parameter ?action=read_all untuk membaca data." 
  });
}

/**
 * Endpoint POST: Menulis atau memperbarui data ke Google Sheets
 */
function doPost(e) {
  initDatabase();
  
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var payload = postData.payload;
    
    if (action === "sync_all") {
      syncAllData(payload);
      return contentResponse({ success: true, message: "Sinkronisasi database berhasil diselesaikan!" });
    } else if (action === "add_log") {
      addAccessLog(payload);
      return contentResponse({ success: true, message: "Log akses berhasil ditambahkan!" });
    } else {
      return contentResponse({ success: false, message: "Aksi '" + action + "' tidak dikenal." });
    }
  } catch (err) {
    return contentResponse({ success: false, message: err.toString() });
  }
}

/**
 * Helper untuk merespons dengan JSON dan CORS Header
 */
function contentResponse(obj) {
  return HtmlService.createHtmlOutput(JSON.stringify(obj))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Memperoleh file Spreadsheet aktif atau stand-alone baru
 */
function getSpreadsheet() {
  var ss;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Standalone script");
  } catch (e) {
    var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    }
  }
  return ss;
}

/**
 * Menginisialisasi spreadsheet & sheets beserta struktur kolom apabila belum ada
 */
function initDatabase() {
  var ss = getSpreadsheet();
  
  // 1. Inisialisasi Sheet Siswa
  var sheetSiswa = ss.getSheetByName(SHEET_SISWA);
  if (!sheetSiswa) {
    sheetSiswa = ss.insertSheet(SHEET_SISWA);
    sheetSiswa.appendRow(SISWA_HEADERS);
    formatHeader(sheetSiswa, SISWA_HEADERS.length, "#1B4332"); // Deep Green
    
    // Tambahkan data dummy contoh awal
    var dummySiswa = [
      ["0091234561", "Ahmad Fauzi", "L", "XI IPA 1", "220101", "Bandung", "12/03/2012", 1, 2, "Jl. Melati No. 10", "Sukaasih", "Sukasari", "Islam", "Herman", "PNS", "Siti", "Ibu Rumah Tangga", "320102030405", true, "Juara 2 Lomba Pidato Bahasa Sunda", 85, 80, 78, 82, 81, 80, 85, 80, 85, 81.7, 4, 88, 82, 80, 84, 83, 82, 86, 82, 87, 83.7, 3, ""],
      ["0091234562", "Budi Santoso", "L", "XI IPA 1", "220102", "Jakarta", "15/07/2012", 2, 3, "Jl. Mawar No. 15", "Sukaasih", "Sukasari", "Islam", "Sugeng", "Wiraswasta", "Yanti", "Pedagang", "320102030406", true, "Juara 1 Turnamen Catur Sekolah", 90, 92, 88, 90, 90, 95, 92, 90, 88, 90.6, 1, 92, 94, 90, 92, 91, 96, 94, 92, 90, 92.3, 1, ""]
    ];
    dummySiswa.forEach(function(row) {
      sheetSiswa.appendRow(row);
    });
    sheetSiswa.autoResizeColumns(1, SISWA_HEADERS.length);
  }
  
  // 2. Inisialisasi Sheet Pengaturan
  var sheetPengaturan = ss.getSheetByName(SHEET_PENGATURAN);
  if (!sheetPengaturan) {
    sheetPengaturan = ss.insertSheet(SHEET_PENGATURAN);
    sheetPengaturan.appendRow(PENGATURAN_HEADERS);
    formatHeader(sheetPengaturan, PENGATURAN_HEADERS.length, "#1E3A8A"); // Deep Blue
    
    var defaultSettings = [
      ["KKM", "75"],
      ["NamaSekolah", "SD Negeri SukaMaju 1"],
      ["NPSN", "20261234"],
      ["AlamatSekolah", "Jl. Raya Pendidikan No. 45"],
      ["Kecamatan", "Sukasari"],
      ["Kabupaten", "Bandung"],
      ["Provinsi", "Jawa Barat"],
      ["NamaWali", "Asep Sunandar, S.Pd."],
      ["NIPWali", "198712122010121001"],
      ["PangkatWali", "Penata Muda / IIIa"],
      ["AppName", "Sistem Informasi Nilai Siswa (SINS)"],
      ["AppLogo", "🎓"]
    ];
    defaultSettings.forEach(function(row) {
      sheetPengaturan.appendRow(row);
    });
    sheetPengaturan.autoResizeColumns(1, PENGATURAN_HEADERS.length);
  }
  
  // 3. Inisialisasi Sheet Log Akses
  var sheetLogs = ss.getSheetByName(SHEET_LOGS);
  if (!sheetLogs) {
    sheetLogs = ss.insertSheet(SHEET_LOGS);
    sheetLogs.appendRow(LOGS_HEADERS);
    formatHeader(sheetLogs, LOGS_HEADERS.length, "#374151"); // Charcoal Gray
    
    var defaultLogs = [
      ["log_init", "Sistem", "admin", "guru", new Date().toLocaleString("id-ID"), "Menginisialisasi Database SINS via Cloud API"]
    ];
    defaultLogs.forEach(function(row) {
      sheetLogs.appendRow(row);
    });
    sheetLogs.autoResizeColumns(1, LOGS_HEADERS.length);
  }
  
  // Rapikan sheet bawaan default 'Sheet1' / 'Sheet 1' jika kosong agar bersih
  var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Sheet 1");
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }
}

/**
 * Memberikan format styling pada header baris pertama
 */
function formatHeader(sheet, numColumns, colorHex) {
  var range = sheet.getRange(1, 1, 1, numColumns);
  range.setFontWeight("bold");
  range.setBackground(colorHex);
  range.setFontColor("#FFFFFF");
  range.setHorizontalAlignment("center");
  range.setFontFamily("Arial");
}

/**
 * Membaca seluruh data dari 3 sheet dan menggabungkannya dalam format JSON
 */
function readAllData() {
  var ss = getSpreadsheet();
  
  // 1. Membaca Siswa
  var sheetSiswa = ss.getSheetByName(SHEET_SISWA);
  var students = [];
  if (sheetSiswa && sheetSiswa.getLastRow() >= 2) {
    var rawStudents = sheetSiswa.getRange(2, 1, sheetSiswa.getLastRow() - 1, SISWA_HEADERS.length).getValues();
    students = rawStudents.map(function(row) {
      return rowToStudent(row, SISWA_HEADERS);
    });
  }
  
  // 2. Membaca Pengaturan & KKM
  var sheetPengaturan = ss.getSheetByName(SHEET_PENGATURAN);
  var schoolSettings = {};
  var kkm = 75;
  if (sheetPengaturan && sheetPengaturan.getLastRow() >= 2) {
    var rawSettings = sheetPengaturan.getRange(2, 1, sheetPengaturan.getLastRow() - 1, 2).getValues();
    rawSettings.forEach(function(row) {
      var key = row[0];
      var val = row[1];
      
      if (key === "KKM") {
        kkm = Number(val) || 75;
      } else {
        // Map keys to camelCase SchoolSettings
        var mappedKey = key.charAt(0).toLowerCase() + key.slice(1);
        schoolSettings[mappedKey] = val;
      }
    });
  }
  
  // 3. Membaca Logs (Maksimum 50 baris terbaru)
  var sheetLogs = ss.getSheetByName(SHEET_LOGS);
  var accessLogs = [];
  if (sheetLogs && sheetLogs.getLastRow() >= 2) {
    var totalLogs = sheetLogs.getLastRow() - 1;
    var startRow = Math.max(2, sheetLogs.getLastRow() - 49); // Batasi 50 log terakhir
    var numRows = sheetLogs.getLastRow() - startRow + 1;
    
    var rawLogs = sheetLogs.getRange(startRow, 1, numRows, LOGS_HEADERS.length).getValues();
    accessLogs = rawLogs.map(function(row) {
      return {
        id: String(row[0]),
        name: String(row[1]),
        nisn: String(row[2]),
        role: String(row[3]),
        timestamp: String(row[4]),
        activity: String(row[5])
      };
    });
    // Balik urutan agar log terbaru tampil di atas
    accessLogs.reverse();
  }
  
  return {
    students: students,
    schoolSettings: schoolSettings,
    kkm: kkm,
    accessLogs: accessLogs
  };
}

/**
 * Menyinkronkan seluruh data dari client ke Google Sheets (Timpa/Overwrites)
 */
function syncAllData(payload) {
  var ss = getSpreadsheet();
  
  // 1. Tulis ulang data Siswa
  var sheetSiswa = ss.getSheetByName(SHEET_SISWA);
  if (sheetSiswa) {
    sheetSiswa.clearContents();
    sheetSiswa.appendRow(SISWA_HEADERS);
    formatHeader(sheetSiswa, SISWA_HEADERS.length, "#1B4332");
    
    var students = payload.students || [];
    students.forEach(function(s) {
      var row = studentToRow(s, SISWA_HEADERS);
      sheetSiswa.appendRow(row);
    });
    sheetSiswa.autoResizeColumns(1, SISWA_HEADERS.length);
  }
  
  // 2. Tulis ulang Pengaturan
  var sheetPengaturan = ss.getSheetByName(SHEET_PENGATURAN);
  if (sheetPengaturan) {
    sheetPengaturan.clearContents();
    sheetPengaturan.appendRow(PENGATURAN_HEADERS);
    formatHeader(sheetPengaturan, PENGATURAN_HEADERS.length, "#1E3A8A");
    
    var settings = payload.schoolSettings || {};
    var kkmValue = payload.kkm || 75;
    
    sheetPengaturan.appendRow(["KKM", String(kkmValue)]);
    
    // Loop through settings and save keys
    Object.keys(settings).forEach(function(key) {
      // Don't save web app url or toggle to prevent loop, and keep it safe
      if (key !== "sheetsSyncEnabled" && key !== "sheetsWebAppUrl" && key !== "showRaporCard" && key !== "showBiodataCard" && key !== "showNisnCard") {
        var capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        sheetPengaturan.appendRow([capitalizedKey, String(settings[key] || "")]);
      }
    });
    sheetPengaturan.autoResizeColumns(1, PENGATURAN_HEADERS.length);
  }
  
  // 3. Tulis ulang Log Akses
  var sheetLogs = ss.getSheetByName(SHEET_LOGS);
  if (sheetLogs) {
    sheetLogs.clearContents();
    sheetLogs.appendRow(LOGS_HEADERS);
    formatHeader(sheetLogs, LOGS_HEADERS.length, "#374151");
    
    var logs = payload.accessLogs || [];
    // Batasi log maksimal 50 baris agar sheet tetap responsif dan cepat
    var truncatedLogs = logs.slice(0, 50);
    // Simpan dengan urutan kronologis asli di Sheet (log lama di atas, baru di bawah)
    truncatedLogs.reverse().forEach(function(log) {
      sheetLogs.appendRow([
        log.id,
        log.name,
        log.nisn,
        log.role,
        log.timestamp,
        log.activity
      ]);
    });
    sheetLogs.autoResizeColumns(1, LOGS_HEADERS.length);
  }
}

/**
 * Menambahkan satu baris log akses baru
 */
function addAccessLog(log) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LOGS);
  if (sheet) {
    sheet.appendRow([
      log.id,
      log.name,
      log.nisn,
      log.role,
      log.timestamp,
      log.activity
    ]);
  }
}

/**
 * Mapper: Mengubah Baris Array menjadi Objek Siswa
 */
function rowToStudent(row, headers) {
  var s = {};
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    var val = row[i];
    
    switch(header) {
      case "NISN": s.nisn = String(val || ""); break;
      case "Nama": s.nama = String(val || ""); break;
      case "LP": s.lp = String(val || "L"); break;
      case "Kelas": s.kelas = String(val || ""); break;
      case "No Induk": s.noInduk = String(val || ""); break;
      case "Tempat Lahir": s.tempatLahir = String(val || ""); break;
      case "Tanggal Lahir": s.tanggalLahir = String(val || ""); break;
      case "Anak Ke": s.anakKe = Number(val) || 0; break;
      case "Jumlah Saudara": s.jumlahSaudara = Number(val) || 0; break;
      case "Alamat Siswa": s.alamatSiswa = String(val || ""); break;
      case "Desa": s.desa = String(val || ""); break;
      case "Kecamatan": s.kecamatan = String(val || ""); break;
      case "Agama": s.agama = String(val || ""); break;
      case "Nama Ayah": s.namaAyah = String(val || ""); break;
      case "Pekerjaan Ayah": s.pekerjaanAyah = String(val || ""); break;
      case "Nama Ibu": s.namaIbu = String(val || ""); break;
      case "Pekerjaan Ibu": s.pekerjaanIbu = String(val || ""); break;
      case "No KK": s.noKK = String(val || ""); break;
      case "Is Biodata Confirmed": s.isBiodataConfirmed = (val === true || val === "TRUE" || val === 1); break;
      case "Catatan Prestasi": s.prestasi = String(val || ""); break;
      
      // Semester 1
      case "PAI S1": s.pai = Number(val) || 0; break;
      case "PKN S1": s.pkn = Number(val) || 0; break;
      case "B Ind S1": s.bInd = Number(val) || 0; break;
      case "MTK S1": s.mtk = Number(val) || 0; break;
      case "IPAS S1": s.ipas = Number(val) || 0; break;
      case "Seni S1": s.seni = Number(val) || 0; break;
      case "PJOK S1": s.pjok = Number(val) || 0; break;
      case "B Ing S1": s.bIng = Number(val) || 0; break;
      case "B Snd S1": s.bSnd = Number(val) || 0; break;
      case "Nilai Akhir S1": s.nilaiAkhir = Number(val) || 0; break;
      case "Ranking S1": s.ranking = Number(val) || 0; break;
      
      // Semester 2
      case "PAI S2": s.pai_s2 = Number(val) || 0; break;
      case "PKN S2": s.pkn_s2 = Number(val) || 0; break;
      case "B Ind S2": s.bInd_s2 = Number(val) || 0; break;
      case "MTK S2": s.mtk_s2 = Number(val) || 0; break;
      case "IPAS S2": s.ipas_s2 = Number(val) || 0; break;
      case "Seni S2": s.seni_s2 = Number(val) || 0; break;
      case "PJOK S2": s.pjok_s2 = Number(val) || 0; break;
      case "B Ing S2": s.bIng_s2 = Number(val) || 0; break;
      case "B Snd S2": s.bSnd_s2 = Number(val) || 0; break;
      case "Nilai Akhir S2": s.nilaiAkhir_s2 = Number(val) || 0; break;
      case "Ranking S2": s.ranking_s2 = Number(val) || 0; break;
      
      case "Foto Siswa": s.photo = String(val || ""); break;
    }
  }
  return s;
}

/**
 * Mapper: Mengubah Objek Siswa menjadi Baris Array
 */
function studentToRow(s, headers) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    var val = "";
    
    switch(header) {
      case "NISN": val = s.nisn || ""; break;
      case "Nama": val = s.nama || ""; break;
      case "LP": val = s.lp || "L"; break;
      case "Kelas": val = s.kelas || ""; break;
      case "No Induk": val = s.noInduk || ""; break;
      case "Tempat Lahir": val = s.tempatLahir || ""; break;
      case "Tanggal Lahir": val = s.tanggalLahir || ""; break;
      case "Anak Ke": val = s.anakKe || 0; break;
      case "Jumlah Saudara": val = s.jumlahSaudara || 0; break;
      case "Alamat Siswa": val = s.alamatSiswa || ""; break;
      case "Desa": val = s.desa || ""; break;
      case "Kecamatan": val = s.kecamatan || ""; break;
      case "Agama": val = s.agama || ""; break;
      case "Nama Ayah": val = s.namaAyah || ""; break;
      case "Pekerjaan Ayah": val = s.pekerjaanAyah || ""; break;
      case "Nama Ibu": val = s.namaIbu || ""; break;
      case "Pekerjaan Ibu": val = s.pekerjaanIbu || ""; break;
      case "No KK": val = s.noKK || ""; break;
      case "Is Biodata Confirmed": val = s.isBiodataConfirmed ? true : false; break;
      case "Catatan Prestasi": val = s.prestasi || ""; break;
      
      // Semester 1
      case "PAI S1": val = s.pai || 0; break;
      case "PKN S1": val = s.pkn || 0; break;
      case "B Ind S1": val = s.bInd || 0; break;
      case "MTK S1": val = s.mtk || 0; break;
      case "IPAS S1": val = s.ipas || 0; break;
      case "Seni S1": val = s.seni || 0; break;
      case "PJOK S1": val = s.pjok || 0; break;
      case "B Ing S1": val = s.bIng || 0; break;
      case "B Snd S1": val = s.bSnd || 0; break;
      case "Nilai Akhir S1": val = s.nilaiAkhir || 0; break;
      case "Ranking S1": val = s.ranking || 0; break;
      
      // Semester 2
      case "PAI S2": val = s.pai_s2 || 0; break;
      case "PKN S2": val = s.pkn_s2 || 0; break;
      case "B Ind S2": val = s.bInd_s2 || 0; break;
      case "MTK S2": val = s.mtk_s2 || 0; break;
      case "IPAS S2": val = s.ipas_s2 || 0; break;
      case "Seni S2": val = s.seni_s2 || 0; break;
      case "PJOK S2": val = s.pjok_s2 || 0; break;
      case "B Ing S2": val = s.bIng_s2 || 0; break;
      case "B Snd S2": val = s.bSnd_s2 || 0; break;
      case "Nilai Akhir S2": val = s.nilaiAkhir_s2 || 0; break;
      case "Ranking S2": val = s.ranking_s2 || 0; break;
      
      case "Foto Siswa": val = s.photo || ""; break;
    }
    row.push(val);
  }
  return row;
}
