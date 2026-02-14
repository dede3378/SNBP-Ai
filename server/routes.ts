import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function registerRoutes(app: Express): Promise<Server> {
  const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!genAI) {
        return res.json({ reply: "Fitur AI belum dikonfigurasi (GEMINI_API_KEY kosong)." });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Anda adalah asisten ahli konsultasi SNBP (Seleksi Nasional Berdasarkan Prestasi) untuk Bimbel Attin.
      Gunakan data berikut untuk memberikan saran yang personal dan akurat:
      Nama: ${context.studentData.nama}
      Sekolah: ${context.studentData.asalSekolah} (Akreditasi: ${context.studentData.akreditasi})
      Jurusan Sekolah: ${context.studentData.jurusanSekolah}
      Rata-rata Nilai: ${context.averageGrade}
      Pilihan Jurusan & Passing Grade: ${JSON.stringify(context.passingGrades)}

      Aturan:
      1. Jika lintas jurusan, ingatkan ada pengurangan poin 13%.
      2. Bandingkan nilai rata-rata siswa dengan passing grade jurusan yang dipilih.
      3. Berikan saran realistis berdasarkan nilai dan passing grade.
      4. Gunakan bahasa Indonesia yang santun dan memotivasi.
      5. Jawab pertanyaan user: ${message}`;

      const result = await model.generateContent(prompt);
      const reply = result.response.text();
      res.json({ reply });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ reply: "Maaf, asisten AI sedang sibuk." });
    }
  });

  app.post("/api/upload-excel", (req, res) => {
    try {
      const { data, filename } = req.body;

      if (!data) {
        console.error("Upload error: No data received");
        return res.status(400).json({ error: "Data file tidak ditemukan" });
      }

      console.log(`Receiving upload: ${filename} (${Math.round(data.length / 1024)} KB)`);

      const buffer = Buffer.from(data, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: false, cellText: false });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { 
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd"
      });

      if (jsonData.length === 0) {
        return res.status(400).json({ error: "File Excel kosong atau tidak terbaca sebagai tabel" });
      }

      const requiredCols = [
        "PROGRAM STUDI", "UNIVERSITAS", "TINGKAT", "JURUSAN DI SEKOLAH",
        "DAYA TAMPUNG SEKARANG", "DAYA TAMPUNG SEBELUMNYA", "PEMINAT SEBELUMNYA", "NILAI",
      ];

      const firstRow = jsonData[0];
      const keys = Object.keys(firstRow);
      // Log headers for debugging
      console.log(`Detected headers: ${keys.join(", ")}`);
      
      const upperKeys = keys.map(k => k.toUpperCase().replace(/\s/g, '').trim());

      const findKey = (target: string) => {
        const normalizedTarget = target.toUpperCase().replace(/\s/g, '').trim();
        const idx = upperKeys.findIndex(k => {
          return k === normalizedTarget || k.includes(normalizedTarget) || normalizedTarget.includes(k);
        });
        return idx >= 0 ? keys[idx] : null;
      };

      const colMap: Record<string, string | null> = {};
      for (const col of requiredCols) {
        colMap[col] = findKey(col);
      }

      const missingCols = requiredCols.filter(col => !colMap[col]);
      if (missingCols.length > 0) {
        return res.status(400).json({
          error: `Kolom tidak ditemukan: ${missingCols.join(", ")}. Kolom yang tersedia: ${keys.join(", ")}`,
        });
      }

      const passingGradeKey = findKey("PASSINGGRADE") || findKey("PASSING GRADE") || findKey("PASSING_GRADE") || findKey("PG");

      // Simplified number parsing for better performance and reliability
      const parseNum = (val: any) => {
        if (typeof val === 'number') return val;
        if (val === undefined || val === null || val === '') return 0;
        // Clean up the string: remove percentages and non-numeric chars except . , and -
        const cleaned = String(val).replace(/%/g, '').replace(/[^0-9.,-]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const parsed = [];
      const len = jsonData.length;
      const prodiCol = colMap["PROGRAM STUDI"]!;
      const univCol = colMap["UNIVERSITAS"]!;
      const tingkatCol = colMap["TINGKAT"]!;
      const jurusanCol = colMap["JURUSAN DI SEKOLAH"]!;
      const dtNowCol = colMap["DAYA TAMPUNG SEKARANG"]!;
      const dtPrevCol = colMap["DAYA TAMPUNG SEBELUMNYA"]!;
      const peminatCol = colMap["PEMINAT SEBELUMNYA"]!;
      const nilaiCol = colMap["NILAI"]!;
      const now = Date.now();

      for (let i = 0; i < len; i++) {
        const row = jsonData[i];
        const programStudi = String(row[prodiCol] || "").trim();
        const universitas = String(row[univCol] || "").trim();

        if (programStudi && universitas) {
          parsed.push({
            id: `prodi_${i}_${now}`,
            programStudi,
            universitas,
            tingkat: String(row[tingkatCol] || "").trim(),
            jurusanSekolah: String(row[jurusanCol] || "").trim(),
            dayaTampungSekarang: parseNum(row[dtNowCol]),
            dayaTampungSebelumnya: parseNum(row[dtPrevCol]),
            peminatSebelumnya: parseNum(row[peminatCol]),
            nilai: Math.round(parseNum(row[nilaiCol]) * 100) / 100,
            passingGrade: passingGradeKey ? parseNum(row[passingGradeKey]) : 0,
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
