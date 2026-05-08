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

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

      const clean = (s: any) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();

      const ALIASES: Record<string, string[]> = {
        "PROGRAMSTUDI": ["PRODI", "JURUSAN", "PROGRAMSTUDI", "NAMAJURUSAN", "NAMAPRODI"],
        "UNIVERSITAS": ["PTN", "KAMPUS", "UNIVERSITAS", "INSTITUSI", "UNIV", "NAMAPT"],
        "TINGKAT": ["TINGKAT", "JENJANG", "LEVEL"],
        "JURUSANDISEKOLAH": ["JURUSANDISEKOLAH", "JURUSANSMA", "JURUSANSEKOLAH", "JALUR", "KELOMPOK"],
        "DAYATAMPUNGSEKARANG": ["DAYATAMPUNG2024", "DAYATAMPUNG2025", "DAYATAMPUNG", "KUOTA", "TAMPUNG"],
        "DAYATAMPUNGSEBELUMNYA": ["DAYATAMPUNG2023", "DAYATAMPUNGSEBELUMNYA", "TAMPUNGSEBELUMNYA"],
        "PEMINATSEBELUMNYA": ["PEMINAT2023", "PEMINAT2024", "PEMINAT", "PENDAFTAR"],
        "NILAI": ["SKOR", "NILAI", "NILAIRATA", "RATARATA", "AVERAGE", "NILAIMIN"],
        "PASSINGGRADE": ["PG", "PASSINGGRADE", "PASSING", "SKORMIN", "NILAIPATOKAN"],
      };

      const findColKey = (target: string, headerRow: string[], headerRowCleaned: string[]): string | null => {
        const targetClean = clean(target);
        const exactIdx = headerRowCleaned.indexOf(targetClean);
        if (exactIdx !== -1) return headerRow[exactIdx];
        const aliasList = ALIASES[targetClean] || [];
        for (const alias of aliasList) {
          const aIdx = headerRowCleaned.indexOf(clean(alias));
          if (aIdx !== -1) return headerRow[aIdx];
        }
        const partIdx = headerRowCleaned.findIndex(h => h.includes(targetClean) || targetClean.includes(h));
        if (partIdx !== -1) return headerRow[partIdx];
        return null;
      };

      let headerRowIndex = 0;
      let headerRow: string[] = [];
      let headerRowCleaned: string[] = [];
      let usePositionalFallback = false;

      for (let i = 0; i < Math.min(20, rawRows.length); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        const rowStr = row.map(v => String(v ?? "").trim());
        const rowClean = rowStr.map(clean);
        if (findColKey("PROGRAMSTUDI", rowStr, rowClean) || findColKey("UNIVERSITAS", rowStr, rowClean)) {
          headerRowIndex = i; headerRow = rowStr; headerRowCleaned = rowClean; break;
        }
      }

      if (headerRow.length === 0) {
        const firstRow = rawRows[0];
        if (Array.isArray(firstRow) && firstRow.length >= 2) {
          headerRowIndex = 0;
          headerRow = firstRow.map((_, idx) => idx === 0 ? "PROGRAM STUDI" : idx === 1 ? "UNIVERSITAS" : `COL${idx}`);
          headerRowCleaned = headerRow.map(clean);
          usePositionalFallback = true;
        } else {
          return res.status(400).json({ error: "Tidak dapat mendeteksi format file." });
        }
      }

      const colProdi = findColKey("PROGRAMSTUDI", headerRow, headerRowCleaned) || headerRow[0];
      const colUniv = findColKey("UNIVERSITAS", headerRow, headerRowCleaned) || headerRow[1] || null;
      const colTingkat = findColKey("TINGKAT", headerRow, headerRowCleaned);
      const colJurusan = findColKey("JURUSANDISEKOLAH", headerRow, headerRowCleaned);
      const colDT = findColKey("DAYATAMPUNGSEKARANG", headerRow, headerRowCleaned);
      const colDTSeb = findColKey("DAYATAMPUNGSEBELUMNYA", headerRow, headerRowCleaned);
      const colPeminat = findColKey("PEMINATSEBELUMNYA", headerRow, headerRowCleaned);
      const colNilai = findColKey("NILAI", headerRow, headerRowCleaned);
      const colPG = findColKey("PASSINGGRADE", headerRow, headerRowCleaned);

      const parseNum = (val: any): number => {
        if (val === undefined || val === null || val === "") return 0;
        if (typeof val === "number") return val;
        let s = String(val).replace(/%/g, "").trim();
        if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
        const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
      };

      const parsed: any[] = [];
      const now = Date.now();

      if (usePositionalFallback) {
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;
          const programStudi = String(row[0] ?? "").trim();
          if (!programStudi) continue;
          parsed.push({
            id: `prodi_${i}_${now}`, programStudi,
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
        const dataRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: headerRowIndex, defval: "", raw: true });
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const programStudi = String(row[colProdi] ?? "").trim();
          const universitas = colUniv ? String(row[colUniv] ?? "").trim() : "";
          if (!programStudi || clean(programStudi) === "PROGRAMSTUDI") continue;
          parsed.push({
            id: `prodi_${i}_${now}`, programStudi, universitas,
            tingkat: colTingkat ? String(row[colTingkat] ?? "S-1").trim() || "S-1" : "S-1",
            jurusanSekolah: colJurusan ? String(row[colJurusan] ?? "").trim() : "",
            dayaTampungSekarang: colDT ? parseNum(row[colDT]) : 0,
            dayaTampungSebelumnya: colDTSeb ? parseNum(row[colDTSeb]) : 0,
            peminatSebelumnya: colPeminat ? parseNum(row[colPeminat]) : 0,
            nilai: colNilai ? Math.round(parseNum(row[colNilai]) * 100) / 100 : 0,
            passingGrade: colPG ? parseNum(row[colPG]) : 0,
          });
        }
      }

      return res.json({ data: parsed, count: parsed.length });
    } catch (error: any) {
      return res.status(500).json({ error: `Gagal memproses file: ${error.message}` });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
