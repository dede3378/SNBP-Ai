import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as XLSX from "xlsx";
import OpenAI from "openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Replit AI Integration client for OpenAI (GPT-4o)
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context, history, imageBase64, imageMimeType } = req.body;

      // Find relevant programs from masterData for keyword context
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

      // Format selections detail
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
1. **Lintas Jurusan**: Jika siswa dari jurusan IPA memilih prodi IPS/Soshum (atau sebaliknya), nilai akhir dikurangi 13 poin. Selalu sebutkan ini dan hitung ulang peluangnya.
2. **Perbandingan Nilai**: Bandingkan rata-rata nilai siswa dengan nilai minimum (passing grade) prodi yang dipilih. Sertakan selisihnya secara eksplisit.
3. **Rasio Keketatan**: Pertimbangkan rasio daya tampung vs peminat. Semakin kecil rasio, semakin ketat persaingan.
4. **Akreditasi**: Akreditasi A memberi keuntungan lebih besar dibanding B atau C dalam seleksi.
5. **Prestasi**: Prestasi akademik/non-akademik tingkat nasional atau internasional meningkatkan peluang signifikan.

## GAYA MENJAWAB
- Gunakan **bahasa Indonesia yang hangat, santun, dan memotivasi**.
- Berikan jawaban yang **terstruktur, detail, dan actionable** — seperti konselor berpengalaman.
- Gunakan **angka dan data konkret** jika tersedia.
- Jika ada risiko, sampaikan dengan **jujur tapi empatik** disertai saran alternatif.
- Format jawaban dengan poin-poin jelas dan mudah dibaca.
- Jika pertanyaan di luar SNBP, arahkan kembali ke topik konsultasi pendidikan dengan sopan.`;

      // Build conversation history for multi-turn context
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];

      // Include recent conversation history (last 10 messages)
      if (history && Array.isArray(history)) {
        const recent = history.slice(-10);
        for (const msg of recent) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
      }

      // Build user message — include image if provided (GPT-4o Vision)
      if (imageBase64 && imageMimeType) {
        const mime = imageMimeType.startsWith("image/") ? imageMimeType : "image/jpeg";
        messages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${imageBase64}`, detail: "high" },
            },
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

  app.post("/api/upload-excel", (req, res) => {
    try {
      const { data, filename } = req.body;

      if (!data) {
        return res.status(400).json({ error: "Data file tidak ditemukan" });
      }

      console.log(`Upload: ${filename} (length: ${data.length})`);

      let buffer: Buffer;
      try {
        buffer = Buffer.from(data, "base64");
      } catch (err: any) {
        return res.status(400).json({ error: "Format data tidak valid (Gagal decode base64)" });
      }

      let workbook: XLSX.WorkBook;
      try {
        workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      } catch (err: any) {
        console.error("XLSX read error:", err);
        return res.status(400).json({ error: "Gagal membaca file Excel. Pastikan file tidak rusak." });
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Parse all rows as raw arrays to find header row
      const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

      const clean = (s: any) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();

      // Column aliases for flexible matching
      const ALIASES: Record<string, string[]> = {
        "PROGRAMSTUDI": ["PRODI", "JURUSAN", "PROGRAMSTUDI", "NAMAJURUSAN", "NAMAPRODI"],
        "UNIVERSITAS": ["PTN", "KAMPUS", "UNIVERSITAS", "INSTITUSI", "UNIV", "NAMAPT"],
        "TINGKAT": ["TINGKAT", "JENJANG", "LEVEL"],
        "JURUSANDISEKOLAH": ["JURUSANDISEKOLAH", "JURUSANSMA", "JURUSANSEKOLAH", "JALUR", "KELOMPOK"],
        "DAYATAMPUNGSEKARANG": ["DAYATAMPUNG2024", "DAYATAMPUNG2025", "DAYATAMPUNG", "KUOTA", "TAMPUNG"],
        "DAYATAMPUNGSEBELUMNYA": ["DAYATAMPUNG2023", "DAYATAMPUNGSEBELUMNYA", "TAMPUNGSEBELUMNYA"],
        "PEMINATSEBELUMNYA": ["PEMINAT2023", "PEMINAT2024", "PEMINAT", "PENDAFTAR"],
        "NILAI": ["SKOR", "NILAI", "NILAIRATA", "RATARATA", "AVERAGE", "NILAIMIN", "MINVLUE"],
        "PASSINGGRADE": ["PG", "PASSINGGRADE", "PASSING", "SKORMIN", "MINSKOR", "NILAIPATOKAN"],
      };

      const findColKey = (target: string, headerRow: string[], headerRowCleaned: string[]): string | null => {
        const targetClean = clean(target);
        // Direct exact match
        const exactIdx = headerRowCleaned.indexOf(targetClean);
        if (exactIdx !== -1) return headerRow[exactIdx];

        // Alias match
        const aliasList = ALIASES[targetClean] || [];
        for (const alias of aliasList) {
          const aliasClean = clean(alias);
          const aIdx = headerRowCleaned.indexOf(aliasClean);
          if (aIdx !== -1) return headerRow[aIdx];
        }

        // Partial match (header contains target or target contains header)
        const partIdx = headerRowCleaned.findIndex(h => h.includes(targetClean) || targetClean.includes(h));
        if (partIdx !== -1) return headerRow[partIdx];

        return null;
      };

      // Find header row — require at least "program studi" OR "universitas" column
      let headerRowIndex = 0;
      let headerRow: string[] = [];
      let headerRowCleaned: string[] = [];
      let usePositionalFallback = false;

      for (let i = 0; i < Math.min(20, rawRows.length); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        const rowStr = row.map(v => String(v ?? "").trim());
        const rowClean = rowStr.map(clean);

        const hasProdi = findColKey("PROGRAMSTUDI", rowStr, rowClean);
        const hasUniv = findColKey("UNIVERSITAS", rowStr, rowClean);

        if (hasProdi || hasUniv) {
          headerRowIndex = i;
          headerRow = rowStr;
          headerRowCleaned = rowClean;
          console.log(`Header found at row ${i}: ${rowStr.join(" | ")}`);
          break;
        }
      }

      // Positional fallback: treat row 0 as header if no named header found
      if (headerRow.length === 0) {
        const firstRow = rawRows[0];
        if (Array.isArray(firstRow) && firstRow.length >= 2) {
          // Build synthetic header: col0=PROGRAM STUDI, col1=UNIVERSITAS, rest=positional
          headerRowIndex = 0;
          headerRow = firstRow.map((_, idx) => {
            if (idx === 0) return "PROGRAM STUDI";
            if (idx === 1) return "UNIVERSITAS";
            return `COL${idx}`;
          });
          headerRowCleaned = headerRow.map(clean);
          usePositionalFallback = true;
          console.log(`No named header found. Using positional fallback: col0=PROGRAM STUDI, col1=UNIVERSITAS`);
        } else {
          return res.status(400).json({
            error: "Tidak dapat mendeteksi format file. Pastikan kolom minimal berisi 'Program Studi' dan data baris pertama tidak kosong.",
          });
        }
      }

      // Map all needed columns
      const colProdi = findColKey("PROGRAMSTUDI", headerRow, headerRowCleaned) || headerRow[0];
      const colUniv = findColKey("UNIVERSITAS", headerRow, headerRowCleaned) || headerRow[1] || null;
      const colTingkat = findColKey("TINGKAT", headerRow, headerRowCleaned);
      const colJurusan = findColKey("JURUSANDISEKOLAH", headerRow, headerRowCleaned);
      const colDT = findColKey("DAYATAMPUNGSEKARANG", headerRow, headerRowCleaned);
      const colDTSeb = findColKey("DAYATAMPUNGSEBELUMNYA", headerRow, headerRowCleaned);
      const colPeminat = findColKey("PEMINATSEBELUMNYA", headerRow, headerRowCleaned);
      const colNilai = findColKey("NILAI", headerRow, headerRowCleaned);
      const colPG = findColKey("PASSINGGRADE", headerRow, headerRowCleaned);

      console.log(`Column map: prodi=${colProdi}, univ=${colUniv}, tingkat=${colTingkat}, jurusan=${colJurusan}, dt=${colDT}, peminat=${colPeminat}, nilai=${colNilai}, pg=${colPG}, positionalFallback=${usePositionalFallback}`);

      const parseNum = (val: any): number => {
        if (val === undefined || val === null || val === "") return 0;
        if (typeof val === "number") return val;
        let s = String(val).replace(/%/g, "").trim();
        if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
        else if (s.includes(",") && s.includes(".")) {
          if (s.lastIndexOf(".") < s.lastIndexOf(",")) {
            s = s.replace(/\./g, "").replace(",", ".");
          } else {
            s = s.replace(/,/g, "");
          }
        }
        const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
        return isNaN(n) ? 0 : n;
      };

      const parsed: any[] = [];
      const now = Date.now();

      if (usePositionalFallback) {
        // No named header — parse all rows using positional indices (0=prodi, 1=univ, ...)
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!Array.isArray(row)) continue;
          const programStudi = String(row[0] ?? "").trim();
          const universitas = String(row[1] ?? "").trim();
          if (!programStudi) continue;
          parsed.push({
            id: `prodi_${i}_${now}`,
            programStudi,
            universitas: universitas || "",
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
        // Named header — re-parse from header row using actual column keys
        const dataRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
          range: headerRowIndex,
          defval: "",
          raw: true,
        });

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const programStudi = String(row[colProdi] ?? "").trim();
          const universitas = colUniv ? String(row[colUniv] ?? "").trim() : "";

          // Skip empty rows or rows that are actually the header again
          if (!programStudi) continue;
          if (clean(programStudi) === "PROGRAMSTUDI") continue;

          parsed.push({
            id: `prodi_${i}_${now}`,
            programStudi,
            universitas,
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

      console.log(`Parsed ${parsed.length} program studi from ${filename}`);
      return res.json({ data: parsed, count: parsed.length });
    } catch (error: any) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: `Gagal memproses file: ${error.message}` });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "attin" && password === "snbp2026") {
      return res.json({ success: true });
    }
    return res.status(401).json({ error: "Username atau password salah" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
