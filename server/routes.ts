import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as XLSX from "xlsx";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/upload-excel", (req, res) => {
    try {
      const { data, filename } = req.body;

      if (!data) {
        return res.status(400).json({ error: "Data file tidak ditemukan" });
      }

      const buffer = Buffer.from(data, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

      if (jsonData.length === 0) {
        return res.status(400).json({ error: "File Excel kosong" });
      }

      const requiredCols = [
        "PROGRAM STUDI", "UNIVERSITAS", "TINGKAT", "JURUSAN DI SEKOLAH",
        "DAYA TAMPUNG SEKARANG", "DAYA TAMPUNG SEBELUMNYA", "PEMINAT SEBELUMNYA", "NILAI",
      ];

      const firstRow = jsonData[0];
      const keys = Object.keys(firstRow);
      const upperKeys = keys.map(k => k.toUpperCase().trim());

      const findKey = (target: string) => {
        const idx = upperKeys.findIndex(k => k === target || k.includes(target));
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

      const passingGradeKey = findKey("PASSINGGRADE") || findKey("PASSING GRADE");

      const parsed = jsonData.map((row, idx) => ({
        id: `prodi_${idx}_${Date.now()}`,
        programStudi: String(row[colMap["PROGRAM STUDI"]!] || "").trim(),
        universitas: String(row[colMap["UNIVERSITAS"]!] || "").trim(),
        tingkat: String(row[colMap["TINGKAT"]!] || "").trim(),
        jurusanSekolah: String(row[colMap["JURUSAN DI SEKOLAH"]!] || "").trim(),
        dayaTampungSekarang: Number(row[colMap["DAYA TAMPUNG SEKARANG"]!]) || 0,
        dayaTampungSebelumnya: Number(row[colMap["DAYA TAMPUNG SEBELUMNYA"]!]) || 0,
        peminatSebelumnya: Number(row[colMap["PEMINAT SEBELUMNYA"]!]) || 0,
        nilai: Math.round((Number(row[colMap["NILAI"]!]) || 0) * 100) / 100,
        passingGrade: passingGradeKey ? (Number(row[passingGradeKey]) || 0) : 0,
      })).filter(item => item.programStudi && item.universitas);

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
