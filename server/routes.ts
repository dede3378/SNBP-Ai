import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as XLSX from "xlsx";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  // Serve Attin logo for print
  app.get("/api/logo/attin", (req, res) => {
    const logoPath = path.join(process.cwd(), "assets", "images", "attin-logo.jpg");
    if (fs.existsSync(logoPath)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.sendFile(logoPath);
    } else {
      res.status(404).send("Not found");
    }
  });

  // Auth
  app.post("/api/login", (req, res) => {
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

  // User management (admin only — trust checked on client for simplicity)
  app.get("/api/users", (req, res) => {
    const users = storage.getAllUsers().map(u => ({ id: u.id, username: u.username, role: u.role, nama: u.nama }));
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
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
      nama: (nama || username).trim(),
    });
    res.json({ id: user.id, username: user.username, role: user.role, nama: user.nama });
  });

  app.patch("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { password, nama, role } = req.body;
    const updates: any = {};
    if (password) updates.password = password;
    if (nama) updates.nama = nama;
    if (role) updates.role = role;
    const updated = storage.updateUser(id, updates);
    if (!updated) return res.status(404).json({ error: "User tidak ditemukan" });
    res.json({ id: updated.id, username: updated.username, role: updated.role, nama: updated.nama });
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    if (id === "admin-1") {
      return res.status(403).json({ error: "Admin utama tidak bisa dihapus" });
    }
    const ok = storage.deleteUser(id);
    if (!ok) return res.status(404).json({ error: "User tidak ditemukan" });
    res.json({ success: true });
  });

  // AI Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context, history, imageBase64, imageMimeType } = req.body;

      let relevantPrograms = "";
      if (context.masterData && Array.isArray(context.masterData) && context.masterData.length > 0) {
        const keywords = message.toLowerCase().split(/\s+/).filter((k: string) => k.length > 3);
        const matches = context.masterData.filter((p: any) =>
          keywords.some((k: string) =>
            p.programStudi?.toLowerCase().includes(k) ||
            p.universitas?.toLowerCase().includes(k)
          )
        ).slice(0, 8);
        if (matches.length > 0) {
          relevantPrograms = `\n\nData Program Studi yang Relevan dari Database:\n${matches.map((p: any) =>
            `- ${p.programStudi} | ${p.universitas} | Daya Tampung: ${p.dayaTampungSekarang} | Peminat: ${p.peminatSebelumnya} | Nilai Min: ${p.nilai} | Passing Grade: ${p.passingGrade} | Jurusan Sekolah: ${p.jurusanSekolah}`
          ).join('\n')}`;
        }
      }

      const selectionDetails = (context.selections || [])
        .filter((s: any) => s?.programStudi)
        .map((s: any, i: number) => {
          const data = s.programStudiData;
          return `Pilihan ${i + 1}: ${s.programStudi} - ${s.universitas}${data ? ` (DT: ${data.dayaTampungSekarang}, Peminat: ${data.peminatSebelumnya}, Nilai: ${data.nilai}, PG: ${data.passingGrade}, Jurusan: ${data.jurusanSekolah})` : ''}`;
        }).join('\n');

      const systemPrompt = `Kamu adalah **Konselor SNBP AI** dari Bimbel Attin — ahli terpercaya dalam Seleksi Nasional Berdasarkan Prestasi (SNBP) untuk perguruan tinggi negeri Indonesia.

## PROFIL SISWA
- **Nama**: ${context.studentData?.nama || "Siswa"}
- **Sekolah**: ${context.studentData?.asalSekolah || "Belum diisi"} (Akreditasi: ${context.studentData?.akreditasi || "Belum diisi"})
- **Jurusan di Sekolah**: ${context.studentData?.jurusanSekolah || "Belum diisi"}
- **Rata-rata Nilai Rapor (Sem 1-5)**: ${context.averageGrade || 0}
${selectionDetails ? `- **Pilihan Jurusan**:\n${selectionDetails}` : ""}${relevantPrograms}

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

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];

      if (history && Array.isArray(history)) {
        const recent = history.slice(-10);
        for (const msg of recent) {
          if (msg.role === 'user' || msg.role === 'assistant') {
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
            { type: "text", text: message || "Tolong baca dan analisis gambar ini." },
          ],
        });
      } else {
        messages.push({ role: "user", content: message });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      });

      const reply = response.choices[0].message.content || "Maaf, saya tidak dapat memberikan jawaban saat ini.";
      res.json({ reply });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ reply: "Maaf, asisten AI sedang sibuk. Silakan coba lagi nanti." });
    }
  });

  // Excel Upload
  app.post("/api/upload-excel", (req, res) => {
    try {
      const { data, filename } = req.body;
      if (!data) return res.status(400).json({ error: "Data file tidak ditemukan" });

      let buffer: Buffer;
      try { buffer = Buffer.from(data, "base64"); }
      catch { return res.status(400).json({ error: "Format data tidak valid" }); }

      let workbook: XLSX.WorkBook;
      try { workbook = XLSX.read(buffer, { type: "buffer", cellDates: true }); }
      catch { return res.status(400).json({ error: "Gagal membaca file Excel." }); }

      // Coba semua sheet, ambil yang paling banyak datanya
      let bestSheet: XLSX.WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
      let bestRowCount = 0;
      for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json<any[]>(s, { header: 1, defval: "" });
        if (rows.length > bestRowCount) { bestRowCount = rows.length; bestSheet = s; }
      }
      const sheet = bestSheet;
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

      // Normalisasi header: hapus semua non-alfanumerik, uppercase
      const clean = (s: any) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();

      // Semua kemungkinan alias kolom (lebih lengkap)
      const COL_ALIASES: Record<string, string[]> = {
        PROGRAMSTUDI: ["PROGRAMSTUDI", "PRODI", "JURUSAN", "NAMAJURUSAN", "NAMAPRODI",
                       "PROGRAMSTUDI1", "NAMAPROGRAMSTUDI", "STUDY", "STUDYPROGRAM",
                       "STUDI", "MAJOR", "DEPARTMENT"],
        UNIVERSITAS:  ["UNIVERSITAS", "PTN", "KAMPUS", "INSTITUSI", "UNIV", "NAMAPT",
                       "NAMAPERGURUANTINGGI", "PERGURUANTINGGI", "COLLEGE", "UNIVERSITY",
                       "INSTITUTION", "NAMAUNIV", "NAMAKAMPUS"],
        TINGKAT:      ["TINGKAT", "JENJANG", "LEVEL", "STRATA", "DEGREE", "PROGRAM"],
        JURUSANSEKOLAH: ["JURUSANSEKOLAH", "JURUSANDISEKOLAH", "JURUSANSMA", "JALUR",
                         "KELOMPOK", "KELOMPOKUJIAN", "JURUSANSMK", "RUMPUN", "PROGRAM",
                         "LINTAS", "SOSHUM", "SAINTEK", "IPA", "IPS"],
        DAYATAMPUNG:  ["DAYATAMPUNG", "DAYATAMPUNG2025", "DAYATAMPUNG2024", "DAYATAMPUNG2026",
                       "KUOTA", "TAMPUNG", "KUOTA2025", "KUOTA2024", "DAYA", "SEAT",
                       "KAPASITAS", "JUMLAHKURSI", "KURSI"],
        DAYATAMPUNGSEB: ["DAYATAMPUNGSEBELUMNYA", "DAYATAMPUNG2023", "DAYATAMPUNG2024",
                         "TAMPUNGSEBELUMNYA", "TAMPUNGLALU", "KUOTASEBELUMNYA"],
        PEMINAT:      ["PEMINAT", "PEMINATSEBELUMNYA", "PEMINAT2024", "PEMINAT2023",
                       "PEMINAT2025", "PENDAFTAR", "PESERTA", "APPLICANT", "PENDAFTARSEBELUMNYA"],
        NILAI:        ["NILAI", "NILAIRATA", "NILAIMINIMUM", "RATARATA", "AVERAGE",
                       "NILAIMIN", "SKOR", "SCORE", "NILAIUJIAN", "NILAIAKHIR",
                       "NILAIPATOKAN", "BATASNILAI"],
        PASSINGGRADE: ["PASSINGGRADE", "PG", "PASSING", "SKORMIN", "NILAIPATOKAN",
                       "PGSNBP", "PGSNBT", "PGSBMPTN", "NILAIBATAS"],
      };

      // Cari kolom berdasarkan daftar alias, partial match sebagai fallback
      const findCol = (key: string, headerRow: string[], headerCleaned: string[]): string | null => {
        const aliases = COL_ALIASES[key] || [key];
        for (const alias of aliases) {
          const idx = headerCleaned.indexOf(clean(alias));
          if (idx !== -1) return headerRow[idx];
        }
        // Partial match: header mengandung alias atau alias mengandung header
        const keyWords = aliases.map(a => clean(a));
        for (let i = 0; i < headerCleaned.length; i++) {
          const h = headerCleaned[i];
          if (!h || h.length < 2) continue;
          if (keyWords.some(kw => kw.length >= 4 && (h.includes(kw) || kw.includes(h)))) {
            return headerRow[i];
          }
        }
        return null;
      };

      // Deteksi baris header (cari di 25 baris pertama)
      const HEADER_SIGNALS = ["PROGRAMSTUDI", "PRODI", "JURUSAN", "NAMAPRODI",
                               "UNIVERSITAS", "PTN", "NAMAPT", "KAMPUS"];
      let headerRowIndex = -1;
      let headerRow: string[] = [];
      let headerCleaned: string[] = [];

      for (let i = 0; i < Math.min(25, rawRows.length); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        const rowStr = row.map(v => String(v ?? "").trim());
        const rowClean = rowStr.map(clean);
        const hitCount = HEADER_SIGNALS.filter(sig => rowClean.includes(clean(sig))).length;
        if (hitCount >= 1) {
          headerRowIndex = i;
          headerRow = rowStr;
          headerCleaned = rowClean;
          break;
        }
      }

      const parseNum = (val: any): number => {
        if (val === undefined || val === null || val === "") return 0;
        if (typeof val === "number") return isNaN(val) ? 0 : val;
        let s = String(val).replace(/%/g, "").trim();
        if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
        const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
      };

      const parsed: any[] = [];
      const now = Date.now();

      if (headerRowIndex === -1) {
        // Fallback: anggap baris pertama adalah data, posisional
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
            passingGrade: parseNum(row[8]),
          });
        }
      } else {
        const colProdi    = findCol("PROGRAMSTUDI",  headerRow, headerCleaned) || headerRow[0];
        const colUniv     = findCol("UNIVERSITAS",   headerRow, headerCleaned) || headerRow[1] || null;
        const colTingkat  = findCol("TINGKAT",        headerRow, headerCleaned);
        const colJurusan  = findCol("JURUSANSEKOLAH", headerRow, headerCleaned);
        const colDT       = findCol("DAYATAMPUNG",    headerRow, headerCleaned);
        const colDTSeb    = findCol("DAYATAMPUNGSEB", headerRow, headerCleaned);
        const colPeminat  = findCol("PEMINAT",        headerRow, headerCleaned);
        const colNilai    = findCol("NILAI",          headerRow, headerCleaned);
        const colPG       = findCol("PASSINGGRADE",   headerRow, headerCleaned);

        const dataRows = XLSX.utils.sheet_to_json<Record<string, any>>(
          sheet, { range: headerRowIndex, defval: "", raw: true }
        );

        // Deduplikasi header jika ada nama kolom sama (XLSX kadang suffix __1, __2)
        const resolveCol = (col: string | null, row: Record<string, any>): any => {
          if (!col) return undefined;
          if (col in row) return row[col];
          // Coba dengan suffix __1
          if ((col + "__1") in row) return row[col + "__1"];
          return undefined;
        };

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const programStudi = String(resolveCol(colProdi, row) ?? "").trim();
          const universitas  = String(resolveCol(colUniv, row) ?? "").trim();

          // Skip baris kosong atau yang isinya header ulang
          if (!programStudi || programStudi.length < 2) continue;
          const cleanProdi = clean(programStudi);
          if (cleanProdi === "PROGRAMSTUDI" || cleanProdi === "PRODI" ||
              cleanProdi === "NAMAPRODI" || cleanProdi === "JURUSAN") continue;

          // Deteksi otomatis jurusan sekolah dari nama prodi jika kolom tidak ada
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
            tingkat:              colTingkat ? String(resolveCol(colTingkat, row) ?? "S-1").trim() || "S-1" : "S-1",
            jurusanSekolah,
            dayaTampungSekarang:  parseNum(resolveCol(colDT, row)),
            dayaTampungSebelumnya: parseNum(resolveCol(colDTSeb, row)),
            peminatSebelumnya:    parseNum(resolveCol(colPeminat, row)),
            nilai:                Math.round(parseNum(resolveCol(colNilai, row)) * 100) / 100,
            passingGrade:         parseNum(resolveCol(colPG, row)),
          });
        }
      }

      if (parsed.length === 0) {
        return res.status(400).json({ error: "Tidak ada data program studi yang berhasil dibaca. Pastikan file memiliki kolom Program Studi dan Universitas." });
      }

      return res.json({ data: parsed, count: parsed.length });
    } catch (error: any) {
      return res.status(500).json({ error: `Gagal memproses file: ${error.message}` });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
