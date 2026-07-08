"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express = __toESM(require("express"));
var import_http_proxy_middleware = require("http-proxy-middleware");

// server/routes.ts
var import_node_http = require("node:http");
var XLSX = __toESM(require("xlsx"));
var import_openai = __toESM(require("openai"));
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));

// server/storage.ts
var import_crypto = require("crypto");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var USERS_FILE = path.join(process.cwd(), "data", "users.json");
var DEFAULT_ADMIN = {
  id: "admin-1",
  username: "attin",
  password: "snbp2026",
  role: "admin",
  nama: "Admin Attin"
};
function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
      fs.writeFileSync(USERS_FILE, JSON.stringify([DEFAULT_ADMIN], null, 2));
      return [DEFAULT_ADMIN];
    }
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    const arr = JSON.parse(raw);
    if (arr.length === 0) {
      arr.push(DEFAULT_ADMIN);
      writeUsers(arr);
    }
    return arr;
  } catch {
    return [DEFAULT_ADMIN];
  }
}
function writeUsers(users) {
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Failed to write users:", e);
  }
}
var storage = {
  getAllUsers() {
    return readUsers();
  },
  getUserByUsername(username) {
    return readUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
  },
  createUser(data) {
    const users = readUsers();
    const newUser = { ...data, id: (0, import_crypto.randomUUID)() };
    users.push(newUser);
    writeUsers(users);
    return newUser;
  },
  updateUser(id, updates) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    writeUsers(users);
    return users[idx];
  },
  deleteUser(id) {
    const users = readUsers();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    writeUsers(filtered);
    return true;
  }
};

// server/routes.ts
async function registerRoutes(app2) {
  const openai = new import_openai.default({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
  });
  app2.get("/api/logo/attin", (req, res) => {
    const logoPath = path2.join(process.cwd(), "assets", "images", "attin-logo.jpg");
    if (fs2.existsSync(logoPath)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.sendFile(logoPath);
    } else {
      res.status(404).send("Not found");
    }
  });
  app2.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password harus diisi" });
    }
    const user = storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Username atau password salah" });
    }
    return res.json({ success: true, role: user.role, username: user.username, nama: user.nama, id: user.id });
  });
  app2.get("/api/users", (req, res) => {
    const users = storage.getAllUsers().map((u) => ({ id: u.id, username: u.username, role: u.role, nama: u.nama }));
    res.json(users);
  });
  app2.post("/api/users", (req, res) => {
    const { username, password, role, nama } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi" });
    }
    const existing = storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username sudah digunakan" });
    }
    const user = storage.createUser({
      username: username.trim(),
      password,
      role: role === "admin" ? "admin" : "user",
      nama: (nama || username).trim()
    });
    res.json({ id: user.id, username: user.username, role: user.role, nama: user.nama });
  });
  app2.patch("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { password, nama, role } = req.body;
    const updates = {};
    if (password) updates.password = password;
    if (nama) updates.nama = nama;
    if (role) updates.role = role;
    const updated = storage.updateUser(id, updates);
    if (!updated) return res.status(404).json({ error: "User tidak ditemukan" });
    res.json({ id: updated.id, username: updated.username, role: updated.role, nama: updated.nama });
  });
  app2.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    if (id === "admin-1") {
      return res.status(403).json({ error: "Admin utama tidak bisa dihapus" });
    }
    const ok = storage.deleteUser(id);
    if (!ok) return res.status(404).json({ error: "User tidak ditemukan" });
    res.json({ success: true });
  });
  app2.post("/api/chat", async (req, res) => {
    try {
      const { message, context, history, imageBase64, imageMimeType } = req.body;
      let relevantPrograms = "";
      if (context.masterData && Array.isArray(context.masterData) && context.masterData.length > 0) {
        const keywords = message.toLowerCase().split(/\s+/).filter((k) => k.length > 3);
        const matches = context.masterData.filter(
          (p) => keywords.some(
            (k) => p.programStudi?.toLowerCase().includes(k) || p.universitas?.toLowerCase().includes(k)
          )
        ).slice(0, 8);
        if (matches.length > 0) {
          relevantPrograms = `

Data Program Studi yang Relevan dari Database:
${matches.map(
            (p) => `- ${p.programStudi} | ${p.universitas} | Daya Tampung: ${p.dayaTampungSekarang} | Peminat: ${p.peminatSebelumnya} | Nilai Min: ${p.nilai} | Passing Grade: ${p.passingGrade} | Jurusan Sekolah: ${p.jurusanSekolah}`
          ).join("\n")}`;
        }
      }
      const selectionDetails = (context.selections || []).filter((s) => s?.programStudi).map((s, i) => {
        const data = s.programStudiData;
        return `Pilihan ${i + 1}: ${s.programStudi} - ${s.universitas}${data ? ` (DT: ${data.dayaTampungSekarang}, Peminat: ${data.peminatSebelumnya}, Nilai: ${data.nilai}, PG: ${data.passingGrade}, Jurusan: ${data.jurusanSekolah})` : ""}`;
      }).join("\n");
      const systemPrompt = `Kamu adalah **Konselor SNBP AI** dari Bimbel Attin \u2014 ahli terpercaya dalam Seleksi Nasional Berdasarkan Prestasi (SNBP) untuk perguruan tinggi negeri Indonesia.

## PROFIL SISWA
- **Nama**: ${context.studentData?.nama || "Siswa"}
- **Sekolah**: ${context.studentData?.asalSekolah || "Belum diisi"} (Akreditasi: ${context.studentData?.akreditasi || "Belum diisi"})
- **Jurusan di Sekolah**: ${context.studentData?.jurusanSekolah || "Belum diisi"}
- **Rata-rata Nilai Rapor (Sem 1-5)**: ${context.averageGrade || 0}
${selectionDetails ? `- **Pilihan Jurusan**:
${selectionDetails}` : ""}${relevantPrograms}

## ATURAN ANALISIS SNBP
1. **Lintas Jurusan**: Jika siswa dari jurusan IPA memilih prodi IPS/Soshum (atau sebaliknya), nilai akhir dikurangi 13 poin.
2. **Perbandingan Nilai**: Bandingkan rata-rata nilai siswa dengan nilai minimum (passing grade) prodi yang dipilih.
3. **Rasio Keketatan**: Pertimbangkan rasio daya tampung vs peminat.
4. **Akreditasi**: Akreditasi A memberi keuntungan lebih besar dibanding B atau C.
5. **Prestasi**: Prestasi akademik/non-akademik tingkat nasional atau internasional meningkatkan peluang signifikan.

## GAYA MENJAWAB
- Gunakan bahasa Indonesia yang hangat, santun, dan memotivasi.
- Berikan jawaban yang terstruktur, detail, dan actionable.
- Gunakan angka dan data konkret jika tersedia.
- Format jawaban dengan poin-poin jelas dan mudah dibaca.`;
      const messages = [
        { role: "system", content: systemPrompt }
      ];
      if (history && Array.isArray(history)) {
        const recent = history.slice(-10);
        for (const msg of recent) {
          if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }
      if (imageBase64 && imageMimeType) {
        const mime = imageMimeType.startsWith("image/") ? imageMimeType : "image/jpeg";
        messages.push({
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}`, detail: "high" } },
            { type: "text", text: message || "Tolong baca dan analisis gambar ini." }
          ]
        });
      } else {
        messages.push({ role: "user", content: message });
      }
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1500
      });
      const reply = response.choices[0].message.content || "Maaf, saya tidak dapat memberikan jawaban saat ini.";
      res.json({ reply });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ reply: "Maaf, asisten AI sedang sibuk. Silakan coba lagi nanti." });
    }
  });
  app2.post("/api/upload-excel", (req, res) => {
    try {
      const { data, filename } = req.body;
      if (!data) return res.status(400).json({ error: "Data file tidak ditemukan" });
      let buffer;
      try {
        buffer = Buffer.from(data, "base64");
      } catch {
        return res.status(400).json({ error: "Format data tidak valid" });
      }
      let workbook;
      try {
        workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      } catch {
        return res.status(400).json({ error: "Gagal membaca file Excel." });
      }
      let bestSheet = workbook.Sheets[workbook.SheetNames[0]];
      let bestRowCount = 0;
      for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(s, { header: 1, defval: "" });
        if (rows.length > bestRowCount) {
          bestRowCount = rows.length;
          bestSheet = s;
        }
      }
      const sheet = bestSheet;
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const clean = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
      const COL_ALIASES = {
        PROGRAMSTUDI: [
          "PROGRAMSTUDI",
          "PRODI",
          "JURUSAN",
          "NAMAJURUSAN",
          "NAMAPRODI",
          "PROGRAMSTUDI1",
          "NAMAPROGRAMSTUDI",
          "STUDY",
          "STUDYPROGRAM",
          "STUDI",
          "MAJOR",
          "DEPARTMENT"
        ],
        UNIVERSITAS: [
          "UNIVERSITAS",
          "PTN",
          "KAMPUS",
          "INSTITUSI",
          "UNIV",
          "NAMAPT",
          "NAMAPERGURUANTINGGI",
          "PERGURUANTINGGI",
          "COLLEGE",
          "UNIVERSITY",
          "INSTITUTION",
          "NAMAUNIV",
          "NAMAKAMPUS"
        ],
        TINGKAT: ["TINGKAT", "JENJANG", "LEVEL", "STRATA", "DEGREE", "PROGRAM"],
        JURUSANSEKOLAH: [
          "JURUSANSEKOLAH",
          "JURUSANDISEKOLAH",
          "JURUSANSMA",
          "JALUR",
          "KELOMPOK",
          "KELOMPOKUJIAN",
          "JURUSANSMK",
          "RUMPUN",
          "PROGRAM",
          "LINTAS",
          "SOSHUM",
          "SAINTEK",
          "IPA",
          "IPS"
        ],
        DAYATAMPUNG: [
          "DAYATAMPUNG",
          "DAYATAMPUNG2025",
          "DAYATAMPUNG2024",
          "DAYATAMPUNG2026",
          "KUOTA",
          "TAMPUNG",
          "KUOTA2025",
          "KUOTA2024",
          "DAYA",
          "SEAT",
          "KAPASITAS",
          "JUMLAHKURSI",
          "KURSI"
        ],
        DAYATAMPUNGSEB: [
          "DAYATAMPUNGSEBELUMNYA",
          "DAYATAMPUNG2023",
          "DAYATAMPUNG2024",
          "TAMPUNGSEBELUMNYA",
          "TAMPUNGLALU",
          "KUOTASEBELUMNYA"
        ],
        PEMINAT: [
          "PEMINAT",
          "PEMINATSEBELUMNYA",
          "PEMINAT2024",
          "PEMINAT2023",
          "PEMINAT2025",
          "PENDAFTAR",
          "PESERTA",
          "APPLICANT",
          "PENDAFTARSEBELUMNYA"
        ],
        NILAI: [
          "NILAI",
          "NILAIRATA",
          "NILAIMINIMUM",
          "RATARATA",
          "AVERAGE",
          "NILAIMIN",
          "SKOR",
          "SCORE",
          "NILAIUJIAN",
          "NILAIAKHIR",
          "NILAIPATOKAN",
          "BATASNILAI"
        ],
        PASSINGGRADE: [
          "PASSINGGRADE",
          "PG",
          "PASSING",
          "SKORMIN",
          "NILAIPATOKAN",
          "PGSNBP",
          "PGSNBT",
          "PGSBMPTN",
          "NILAIBATAS"
        ]
      };
      const findCol = (key, headerRow2, headerCleaned2) => {
        const aliases = COL_ALIASES[key] || [key];
        for (const alias of aliases) {
          const idx = headerCleaned2.indexOf(clean(alias));
          if (idx !== -1) return headerRow2[idx];
        }
        const keyWords = aliases.map((a) => clean(a));
        for (let i = 0; i < headerCleaned2.length; i++) {
          const h = headerCleaned2[i];
          if (!h || h.length < 2) continue;
          if (keyWords.some((kw) => kw.length >= 4 && (h.includes(kw) || kw.includes(h)))) {
            return headerRow2[i];
          }
        }
        return null;
      };
      const HEADER_SIGNALS = [
        "PROGRAMSTUDI",
        "PRODI",
        "JURUSAN",
        "NAMAPRODI",
        "UNIVERSITAS",
        "PTN",
        "NAMAPT",
        "KAMPUS"
      ];
      let headerRowIndex = -1;
      let headerRow = [];
      let headerCleaned = [];
      for (let i = 0; i < Math.min(25, rawRows.length); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        const rowStr = row.map((v) => String(v ?? "").trim());
        const rowClean = rowStr.map(clean);
        const hitCount = HEADER_SIGNALS.filter((sig) => rowClean.includes(clean(sig))).length;
        if (hitCount >= 1) {
          headerRowIndex = i;
          headerRow = rowStr;
          headerCleaned = rowClean;
          break;
        }
      }
      const parseNum = (val) => {
        if (val === void 0 || val === null || val === "") return 0;
        if (typeof val === "number") return isNaN(val) ? 0 : val;
        let s = String(val).replace(/%/g, "").trim();
        if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
        const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
      };
      const parsed = [];
      const now = Date.now();
      if (headerRowIndex === -1) {
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;
          const programStudi = String(row[0] ?? "").trim();
          if (!programStudi || programStudi.length < 2) continue;
          parsed.push({
            id: `prodi_${i}_${now}`,
            programStudi,
            universitas: String(row[1] ?? "").trim(),
            tingkat: String(row[2] ?? "S-1").trim() || "S-1",
            jurusanSekolah: String(row[3] ?? "").trim(),
            dayaTampungSekarang: parseNum(row[4]),
            dayaTampungSebelumnya: parseNum(row[5]),
            peminatSebelumnya: parseNum(row[6]),
            nilai: Math.round(parseNum(row[7]) * 100) / 100,
            passingGrade: parseNum(row[8])
          });
        }
      } else {
        const colProdi = findCol("PROGRAMSTUDI", headerRow, headerCleaned) || headerRow[0];
        const colUniv = findCol("UNIVERSITAS", headerRow, headerCleaned) || headerRow[1] || null;
        const colTingkat = findCol("TINGKAT", headerRow, headerCleaned);
        const colJurusan = findCol("JURUSANSEKOLAH", headerRow, headerCleaned);
        const colDT = findCol("DAYATAMPUNG", headerRow, headerCleaned);
        const colDTSeb = findCol("DAYATAMPUNGSEB", headerRow, headerCleaned);
        const colPeminat = findCol("PEMINAT", headerRow, headerCleaned);
        const colNilai = findCol("NILAI", headerRow, headerCleaned);
        const colPG = findCol("PASSINGGRADE", headerRow, headerCleaned);
        const dataRows = XLSX.utils.sheet_to_json(
          sheet,
          { range: headerRowIndex, defval: "", raw: true }
        );
        const resolveCol = (col, row) => {
          if (!col) return void 0;
          if (col in row) return row[col];
          if (col + "__1" in row) return row[col + "__1"];
          return void 0;
        };
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const programStudi = String(resolveCol(colProdi, row) ?? "").trim();
          const universitas = String(resolveCol(colUniv, row) ?? "").trim();
          if (!programStudi || programStudi.length < 2) continue;
          const cleanProdi = clean(programStudi);
          if (cleanProdi === "PROGRAMSTUDI" || cleanProdi === "PRODI" || cleanProdi === "NAMAPRODI" || cleanProdi === "JURUSAN") continue;
          let jurusanSekolah = colJurusan ? String(resolveCol(colJurusan, row) ?? "").trim() : "";
          if (!jurusanSekolah) {
            const prodiUp = programStudi.toUpperCase();
            if (/(TEKNIK|FISIKA|KIMIA|BIOLOGI|MATEMATIKA|FARMASI|KEDOKTERAN|STATISTIK|INFORMATIKA|KOMPUTER|GEOGRAFI|GEOLOGI|ASTRONOMI|PERTANIAN|PETERNAKAN|KELAUTAN)/i.test(prodiUp)) {
              jurusanSekolah = "IPA";
            } else if (/(HUKUM|EKONOMI|MANAJEMEN|AKUNTANSI|SOSIOLOGI|KOMUNIKASI|PSIKOLOGI|BISNIS|ADMINISTRASI|POLITIK|HUBUNGAN)/i.test(prodiUp)) {
              jurusanSekolah = "IPS";
            }
          }
          parsed.push({
            id: `prodi_${i}_${now}`,
            programStudi,
            universitas,
            tingkat: colTingkat ? String(resolveCol(colTingkat, row) ?? "S-1").trim() || "S-1" : "S-1",
            jurusanSekolah,
            dayaTampungSekarang: parseNum(resolveCol(colDT, row)),
            dayaTampungSebelumnya: parseNum(resolveCol(colDTSeb, row)),
            peminatSebelumnya: parseNum(resolveCol(colPeminat, row)),
            nilai: Math.round(parseNum(resolveCol(colNilai, row)) * 100) / 100,
            passingGrade: parseNum(resolveCol(colPG, row))
          });
        }
      }
      if (parsed.length === 0) {
        return res.status(400).json({ error: "Tidak ada data program studi yang berhasil dibaca. Pastikan file memiliki kolom Program Studi dan Universitas." });
      }
      return res.json({ data: parsed, count: parsed.length });
    } catch (error) {
      return res.status(500).json({ error: `Gagal memproses file: ${error.message}` });
    }
  });
  const httpServer = (0, import_node_http.createServer)(app2);
  return httpServer;
}

// server/index.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var app = (0, import_express.default)();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Accept, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    import_express.default.json({
      limit: "100mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(import_express.default.urlencoded({ extended: true, limit: "100mb" }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path4 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path4.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const stringified = JSON.stringify(capturedJsonResponse);
        if (stringified.length > 500) {
          logLine += ` :: ${stringified.slice(0, 500)}\u2026 [truncated]`;
        } else {
          logLine += ` :: ${stringified}`;
        }
      }
      if (logLine.length > 800) {
        logLine = logLine.slice(0, 799) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function serveExpoManifest(platform, res) {
  const manifestPath = path3.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs3.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs3.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function configureExpoAndLanding(app2) {
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      if (req.path === "/" || req.path === "/manifest") {
        return serveExpoManifest(platform, res);
      }
    }
    next();
  });
  app2.use("/assets", import_express.default.static(path3.resolve(process.cwd(), "assets")));
  app2.use(import_express.default.static(path3.resolve(process.cwd(), "static-build")));
  if (process.env.NODE_ENV === "production") {
    const distPath = path3.resolve(process.cwd(), "dist");
    if (fs3.existsSync(distPath)) {
      app2.use(import_express.default.static(distPath));
      app2.use((req, res, next) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/assets")) {
          return next();
        }
        const indexPath = path3.join(distPath, "index.html");
        if (fs3.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        }
        next();
      });
    }
  }
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupMetroProxy(app2) {
  if (process.env.NODE_ENV !== "production") {
    const metroProxy = (0, import_http_proxy_middleware.createProxyMiddleware)({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      on: {
        error: (err, req, res) => {
          if (res && !res.headersSent) {
            res.status(502).send(
              "<html><body><h2>Aplikasi sedang dimuat...</h2><p>Metro bundler belum siap. Tunggu beberapa detik lalu refresh halaman ini.</p><script>setTimeout(()=>location.reload(),3000)</script></body></html>"
            );
          }
        }
      }
    });
    app2.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      const platform = req.header("expo-platform");
      if (platform === "ios" || platform === "android") return next();
      metroProxy(req, res, next);
    });
  }
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupMetroProxy(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
