import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as XLSX from "xlsx";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export async function registerRoutes(app: Express): Promise<Server> {
  const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
  
  // Replit AI Integration client for OpenAI (ChatGPT)
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      
      // Try to find relevant programs from context.masterData if available
      let relevantPrograms = "";
      if (context.masterData && Array.isArray(context.masterData)) {
        // Simple search for keywords in the message
        const keywords = message.toLowerCase().split(/\s+/);
        const matches = context.masterData.filter((p: any) => 
          keywords.some(k => 
            k.length > 3 && (
              p.programStudi.toLowerCase().includes(k) || 
              p.universitas.toLowerCase().includes(k)
            )
          )
        ).slice(0, 5);
        
        if (matches.length > 0) {
          relevantPrograms = `\nData Program Studi Terkait:\n${JSON.stringify(matches)}`;
        }
      }

      const systemPrompt = `Anda adalah asisten ahli konsultasi SNBP (Seleksi Nasional Berdasarkan Prestasi) untuk Bimbel Attin.
      Gunakan data berikut untuk memberikan saran yang personal dan akurat:
      Nama: ${context.studentData?.nama || "Siswa"}
      Sekolah: ${context.studentData?.asalSekolah || "-"} (Akreditasi: ${context.studentData?.akreditasi || "-"})
      Jurusan Sekolah: ${context.studentData?.jurusanSekolah || "-"}
      Rata-rata Nilai: ${context.averageGrade || 0}
      Pilihan Jurusan & Passing Grade: ${JSON.stringify(context.passingGrades || [])}${relevantPrograms}

      Aturan:
      1. Jika lintas jurusan (misal dari IPA ke Soshum atau sebaliknya), ingatkan ada pengurangan poin 13% (nilai akhir = persentase - 13).
      2. Bandingkan nilai rata-rata siswa dengan passing grade/skor minimum jurusan yang dipilih.
      3. Berikan saran realistis berdasarkan nilai dan data server yang tersedia.
      4. Gunakan bahasa Indonesia yang santun dan memotivasi.
      5. Jika ditanya di luar topik SNBP, tetap arahkan kembali ke konsultasi pendidikan.`;

      let reply = "";
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
        });
        reply = response.choices[0].message.content || "Maaf, saya tidak dapat memberikan jawaban saat ini.";
      } catch (openaiError) {
        console.error("OpenAI Error, falling back to Gemini:", openaiError);
        if (genAI) {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
          reply = result.response.text();
        } else {
          reply = "Maaf, asisten AI sedang tidak tersedia. Silakan coba lagi nanti.";
        }
      }

      res.json({ reply });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ reply: "Maaf, asisten AI sedang sibuk. Silakan coba lagi nanti." });
    }
  });

  app.post("/api/upload-excel", (req, res) => {
    try {
      const { data, filename } = req.body;

      if (!data) {
        console.error("Upload error: No data received");
        return res.status(400).json({ error: "Data file tidak ditemukan" });
      }

      // Log data length for debugging
      console.log(`Receiving upload: ${filename} (Raw string length: ${data.length})`);
      
      let buffer: Buffer;
      try {
        buffer = Buffer.from(data, "base64");
      } catch (err: any) {
        console.error("Base64 decode error:", err);
        return res.status(400).json({ error: "Format data tidak valid (Gagal decode base64)" });
      }
      
      let workbook: XLSX.WorkBook;
      try {
        // Use more robust read options and try to handle different formats
        workbook = XLSX.read(buffer, { 
          type: "buffer", 
          cellDates: true,
          cellNF: true,
          cellText: true,
          cellStyles: true
        });
      } catch (err: any) {
        console.error("XLSX read error:", err);
        return res.status(400).json({ error: "Gagal membaca file Excel. Pastikan file tidak rusak." });
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Improved header detection: look for required columns in any row
      const sheetJsonRaw = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
      
      const cleanSearch = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

      for (let i = 0; i < Math.min(50, sheetJsonRaw.length); i++) {
        const row = sheetJsonRaw[i];
        if (!row || !Array.isArray(row)) continue;
        
        const rowValues = row.map(v => String(v ?? "").trim()).filter(v => v.length > 0);
        if (rowValues.length < 2) continue;

        const rowCleaned = rowValues.map(cleanSearch);
        
        let foundCount = 0;
        for (const col of requiredCols) {
          if (findKey(col, rowValues, rowCleaned)) foundCount++;
        }
        
        // Match if at least 1 required column is found OR if the row looks like a header (mostly text)
        const looksLikeHeader = rowValues.length >= 4 && foundCount >= 1;

        if (looksLikeHeader) { 
          headerRowIndex = i;
          keys = rowValues;
          upperKeys = rowCleaned;
          console.log(`Found header at row ${i}: ${rowValues.join(", ")}`);
          break;
        }
      }

      // Aggressive fallback: use the first row that has 4+ columns if nothing found
      if (keys.length === 0) {
        for (let i = 0; i < Math.min(20, sheetJsonRaw.length); i++) {
          const row = sheetJsonRaw[i];
          if (row && Array.isArray(row) && row.filter(v => String(v ?? "").trim().length > 2).length >= 4) {
            headerRowIndex = i;
            keys = row.map(v => String(v ?? "").trim());
            upperKeys = keys.map(cleanSearch);
            console.log(`Aggressive fallback header at row ${i}: ${keys.join(", ")}`);
            break;
          }
        }
      }

      if (keys.length === 0) {
        // Fallback to first row
        const firstRowRaw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { range: 0, nRows: 1 })[0];
        if (firstRowRaw) {
          keys = Object.keys(firstRowRaw);
          upperKeys = keys.map(k => k.toUpperCase().replace(/[^A-Z0-9]/g, '').trim());
        }
      }

      console.log(`Detected headers at row ${headerRowIndex}: ${keys.join(", ")}`);

      for (const col of [...requiredCols, ...importantCols]) {
        colMap[col] = findKey(col, keys, upperKeys);
      }

      const missingCols = requiredCols.filter(col => !colMap[col]);
      if (missingCols.length > 0) {
        return res.status(400).json({
          error: `Kolom wajib tidak ditemukan: ${missingCols.join(", ")}. Pastikan file Excel memiliki header yang benar.`,
        });
      }

      // Re-parse data starting from header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { 
        range: headerRowIndex,
        defval: "",
        raw: true, // Use raw values to handle numbers better
      });

      const passingGradeKey = colMap["PASSINGGRADE"] || findKey("PG", keys, upperKeys) || findKey("PASSING GRADE", keys, upperKeys);

      // Improved number parsing for better performance and reliability
      const parseNum = (val: any) => {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        
        // Handle string formats like "1.234,56" or "1,234.56" or "85%"
        let cleaned = String(val).replace(/%/g, '').trim();
        
        // Detect if using comma as decimal separator (Indonesian style)
        if (cleaned.includes(',') && !cleaned.includes('.')) {
          cleaned = cleaned.replace(',', '.');
        } else if (cleaned.includes(',') && cleaned.includes('.')) {
          // Mixed separators: "1.234,56" -> remove thousands dot, then replace decimal comma
          if (cleaned.lastIndexOf('.') < cleaned.lastIndexOf(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else {
            // "1,234.56" -> remove thousands comma
            cleaned = cleaned.replace(/,/g, '');
          }
        }
        
        const num = parseFloat(cleaned.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      const parsed = [];
      const now = Date.now();

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const programStudi = String(row[colMap["PROGRAM STUDI"]!] || "").trim();
        const universitas = String(row[colMap["UNIVERSITAS"]!] || "").trim();

        if (programStudi && universitas && programStudi !== keys[0]) { // Avoid re-parsing header row
          parsed.push({
            id: `prodi_${i}_${now}`,
            programStudi,
            universitas,
            tingkat: colMap["TINGKAT"] ? String(row[colMap["TINGKAT"]!] || "").trim() : "S-1",
            jurusanSekolah: colMap["JURUSAN DI SEKOLAH"] ? String(row[colMap["JURUSAN DI SEKOLAH"]!] || "").trim() : "",
            dayaTampungSekarang: parseNum(row[colMap["DAYA TAMPUNG SEKARANG"]!]),
            dayaTampungSebelumnya: parseNum(row[colMap["DAYA TAMPUNG SEBELUMNYA"]!]),
            peminatSebelumnya: parseNum(row[colMap["PEMINAT SEBELUMNYA"]!]),
            nilai: Math.round(parseNum(row[colMap["NILAI"]!]) * 100) / 100,
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
