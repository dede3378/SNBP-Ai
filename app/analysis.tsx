import React, { useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Colors from "@/constants/colors";
import { useConsultation, AnalysisResult, JurusanSelection, GradeEntry, Achievement } from "@/lib/consultation-context";
import { useUniversityLogos } from "@/lib/university-logos";
import { getApiUrl } from "@/lib/query-client";

function isJurusanMismatch(studentJurusan: string, prodiJurusan: string): boolean {
  if (!studentJurusan || !prodiJurusan) return false;
  const sj = studentJurusan.toLowerCase();
  const dj = prodiJurusan.toLowerCase();
  if (sj === "campuran" || dj === "campuran") return false;
  const studentBase = sj.split("/")[0];
  return !dj.includes(studentBase);
}

function calculateChance(
  selection: JurusanSelection,
  avgGrade: number,
  achievements: Achievement[],
  akreditasi: string,
  studentJurusan: string,
): AnalysisResult {
  const data = selection.programStudiData;
  if (!data) {
    return {
      pilihan: 0,
      universitas: selection.universitas,
      programStudi: selection.programStudi,
      peluang: "Rendah",
      persentase: 0,
      jurusanMismatch: false,
      details: { nilaiScore: 0, dayaTampungScore: 0, peminatScore: 0, prestasiScore: 0, akreditasiScore: 0 },
    };
  }

  let nilaiScore = 0;
  if (data.nilai > 0) {
    const ratio = avgGrade / data.nilai;
    if (ratio >= 1.1) nilaiScore = 30;
    else if (ratio >= 1.0) nilaiScore = 25;
    else if (ratio >= 0.95) nilaiScore = 20;
    else if (ratio >= 0.9) nilaiScore = 15;
    else if (ratio >= 0.85) nilaiScore = 10;
    else nilaiScore = 5;
  } else {
    nilaiScore = avgGrade >= 85 ? 22 : avgGrade >= 80 ? 18 : avgGrade >= 75 ? 14 : 8;
  }

  let dayaTampungScore = 0;
  if (data.dayaTampungSekarang > 0) {
    if (data.dayaTampungSekarang >= 100) dayaTampungScore = 15;
    else if (data.dayaTampungSekarang >= 50) dayaTampungScore = 12;
    else if (data.dayaTampungSekarang >= 20) dayaTampungScore = 8;
    else dayaTampungScore = 5;
  } else dayaTampungScore = 10;

  let peminatScore = 0;
  if (data.peminatSebelumnya > 0 && data.dayaTampungSekarang > 0) {
    const ratio = data.dayaTampungSekarang / data.peminatSebelumnya;
    if (ratio >= 0.3) peminatScore = 20;
    else if (ratio >= 0.2) peminatScore = 16;
    else if (ratio >= 0.1) peminatScore = 12;
    else if (ratio >= 0.05) peminatScore = 8;
    else peminatScore = 4;
  } else peminatScore = 10;

  let prestasiScore = 0;
  achievements.forEach(a => {
    const level = a.tingkat?.toLowerCase();
    const rank = a.juara?.toLowerCase();
    if (level?.includes("internasional")) prestasiScore += rank?.includes("1") ? 8 : rank?.includes("2") ? 6 : 4;
    else if (level?.includes("nasional")) prestasiScore += rank?.includes("1") ? 6 : rank?.includes("2") ? 4 : 3;
    else if (level?.includes("provinsi")) prestasiScore += rank?.includes("1") ? 4 : 2;
    else prestasiScore += 1;
  });
  prestasiScore = Math.min(prestasiScore, 20);

  let akreditasiScore = 0;
  const ak = akreditasi?.toUpperCase();
  if (ak === "A" || ak === "UNGGUL") akreditasiScore = 15;
  else if (ak === "B" || ak === "BAIK SEKALI") akreditasiScore = 11;
  else if (ak === "C" || ak === "BAIK") akreditasiScore = 7;
  else akreditasiScore = 5;

  const mismatch = isJurusanMismatch(studentJurusan, data.jurusanSekolah || "");

  let total = nilaiScore + dayaTampungScore + peminatScore + prestasiScore + akreditasiScore;
  if (mismatch) total = Math.max(0, total - 13);

  const peluang = total >= 70 ? "Tinggi" : total >= 45 ? "Sedang" : "Rendah";

  return {
    pilihan: 0,
    universitas: selection.universitas,
    programStudi: selection.programStudi,
    peluang,
    persentase: total,
    jurusanMismatch: mismatch,
    details: { nilaiScore, dayaTampungScore, peminatScore, prestasiScore, akreditasiScore },
  };
}

function PeluangBadge({ peluang, persentase }: { peluang: string; persentase: number }) {
  const color = peluang === "Tinggi" ? Colors.success : peluang === "Sedang" ? Colors.warning : Colors.danger;
  const bgColor = peluang === "Tinggi" ? Colors.successLight : peluang === "Sedang" ? Colors.warningLight : Colors.dangerLight;
  return (
    <View style={[bStyles.container, { backgroundColor: bgColor }]}>
      <Text style={[bStyles.percentage, { color }]}>{persentase}%</Text>
      <Text style={[bStyles.label, { color }]}>{peluang}</Text>
    </View>
  );
}

const bStyles = StyleSheet.create({
  container: { alignItems: "center", borderRadius: 12, padding: 16, minWidth: 80 },
  percentage: { fontSize: 28, fontFamily: "Inter_700Bold" },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
});

function UniversityLogo({ name, size = 36 }: { name: string; size?: number }) {
  const { getLogoUrl } = useUniversityLogos();
  const logoUrl = getLogoUrl(name);
  if (!logoUrl) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.primary + "12", justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="school" size={size * 0.5} color={Colors.primary} />
      </View>
    );
  }
  return <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
}

function generateDocNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `SNBP/${y}${m}${d}/${rand}`;
}

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { selections, averageGrade, achievements, studentData } = useConsultation();
  const { getLogoUrl } = useUniversityLogos();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const docNumber = useRef(generateDocNumber()).current;

  const results = useMemo(() => {
    const res: (AnalysisResult | null)[] = [null, null];
    selections.forEach((sel, idx) => {
      if (sel?.programStudi && sel.programStudiData) {
        const r = calculateChance(sel, averageGrade, achievements, studentData.akreditasi, studentData.jurusanSekolah);
        r.pilihan = idx + 1;
        res[idx] = r;
      }
    });
    return res;
  }, [selections, averageGrade, achievements, studentData.akreditasi, studentData.jurusanSekolah]);

  const hasResults = results[0] || results[1];

  const generateHTML = () => {
    const apiUrl = getApiUrl();
    const logoUrl = `${apiUrl}api/logo/attin`;

    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const year = now.getFullYear();

    const pilihanCards = results.map((r) => {
      if (!r) return "";
      const accentColor = r.peluang === "Tinggi" ? "#059669" : r.peluang === "Sedang" ? "#D97706" : "#DC2626";
      const scoreBg = r.peluang === "Tinggi" ? "#059669" : r.peluang === "Sedang" ? "#D97706" : "#DC2626";
      const ptnLogoUrl = getLogoUrl(r.universitas);
      const ptnLogoHtml = ptnLogoUrl
        ? `<img class="pilihan-logo" src="${ptnLogoUrl}" />`
        : `<div style="width:48px;height:48px;border-radius:50%;background:#E0F2FE;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;border:2px solid #E5E7EB;">&#127963;</div>`;

      const scores = [
        { name: "Nilai Rapor", val: r.details.nilaiScore, max: 30, color: "#3B82F6" },
        { name: "Daya Tampung", val: r.details.dayaTampungScore, max: 15, color: "#8B5CF6" },
        { name: "Rasio Peminat", val: r.details.peminatScore, max: 20, color: "#06B6D4" },
        { name: "Prestasi", val: r.details.prestasiScore, max: 20, color: "#F59E0B" },
        { name: "Akreditasi", val: r.details.akreditasiScore, max: 15, color: "#10B981" },
      ];
      const scoreBars = scores.map((s) => {
        const pct = Math.round((s.val / s.max) * 100);
        return `
          <div class="detail-item">
            <div class="detail-score">${s.val}<span class="detail-max">/${s.max}</span></div>
            <div class="detail-bar-wrap">
              <div class="detail-bar-fill" style="width:${pct}%;background:${s.color};"></div>
            </div>
            <div class="detail-name">${s.name}</div>
          </div>
        `;
      }).join("");

      const mismatchHtml = r.jurusanMismatch
        ? `<div class="mismatch-note">&#9888; Lintas Jurusan: skor dikurangi 13 poin</div>`
        : "";

      return `
        <div class="pilihan-card">
          <div class="pilihan-top">
            <div class="pilihan-accent" style="background:${accentColor};"></div>
            <div class="pilihan-info">
              ${ptnLogoHtml}
              <div class="pilihan-text">
                <div class="pilihan-num" style="color:${accentColor};">Pilihan ${r.pilihan}</div>
                <div class="pilihan-prodi">${r.programStudi}</div>
                <div class="pilihan-univ">${r.universitas}</div>
              </div>
              <div class="pilihan-score" style="background:${scoreBg};">
                <div class="score-pct" style="color:white;">${r.persentase}%</div>
                <div class="score-label" style="color:rgba(255,255,255,0.85);">${r.peluang}</div>
              </div>
            </div>
          </div>
          <div class="pilihan-detail">
            ${mismatchHtml}
            <div class="detail-grid">${scoreBars}</div>
          </div>
        </div>
      `;
    }).join("");

    const achievementRows = achievements.map((a, i) => {
      const rowBg = i % 2 === 0 ? "" : "background:#F9FAFB;";
      return `
      <tr style="${rowBg}">
        <td style="padding:5px 8px;border:1px solid #E5E7EB;">${i + 1}</td>
        <td style="padding:5px 8px;border:1px solid #E5E7EB;">${a.namaPrestasi}</td>
        <td style="padding:5px 8px;border:1px solid #E5E7EB;text-align:center;">${a.tingkat}</td>
        <td style="padding:5px 8px;border:1px solid #E5E7EB;text-align:center;">${a.juara}</td>
      </tr>
      `;
    }).join("");

    const peluangEmoji = (p: string) => p === "Tinggi" ? "🟢" : p === "Sedang" ? "🟡" : "🔴";

    return `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

          * { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: 'Inter', Arial, sans-serif;
            font-size: 11px;
            color: #1F2937;
            background: #fff;
            line-height: 1.6;
          }

          .page {
            max-width: 780px;
            margin: 0 auto;
            padding: 0;
          }

          /* ── HEADER ── */
          .doc-header {
            background: linear-gradient(135deg, #7F0000 0%, #B91C1C 50%, #DC2626 100%);
            padding: 20px 28px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          .header-brand {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .header-logo {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid rgba(255,255,255,0.5);
            background: white;
          }
          .header-brand-text .org-name {
            font-size: 22px;
            font-weight: 800;
            color: white;
            letter-spacing: 0.5px;
            line-height: 1.1;
          }
          .header-brand-text .org-sub {
            font-size: 10px;
            color: rgba(255,255,255,0.8);
            margin-top: 2px;
            letter-spacing: 0.3px;
          }
          .header-badge {
            text-align: right;
          }
          .badge-confidential {
            display: inline-block;
            background: rgba(255,255,255,0.15);
            border: 1.5px solid rgba(255,255,255,0.4);
            border-radius: 8px;
            padding: 8px 14px;
            backdrop-filter: blur(4px);
          }
          .badge-confidential .conf-label {
            font-size: 11px;
            font-weight: 700;
            color: #FEF2F2;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .badge-confidential .conf-no {
            font-size: 10px;
            color: rgba(255,255,255,0.85);
            margin-top: 4px;
          }

          /* ── TITLE BANNER ── */
          .title-banner {
            background: #1E3A5F;
            text-align: center;
            padding: 14px 20px;
            border-bottom: 4px solid #B91C1C;
          }
          .title-banner h1 {
            font-size: 18px;
            font-weight: 800;
            color: white;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .title-banner p {
            font-size: 10px;
            color: rgba(255,255,255,0.75);
            margin-top: 3px;
          }

          /* ── BODY CONTENT ── */
          .doc-body {
            padding: 20px 28px;
          }

          /* ── SECTION HEADER ── */
          .section {
            margin-bottom: 18px;
          }
          .section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
          }
          .section-bar {
            width: 4px;
            height: 18px;
            background: #B91C1C;
            border-radius: 2px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #1E3A5F;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .section-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(to right, #E5E7EB, transparent);
          }

          /* ── DATA SISWA ── */
          .student-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            overflow: hidden;
          }
          .student-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-collapse: collapse;
          }
          .student-cell {
            padding: 10px 14px;
            border-right: 1px solid #E2E8F0;
            border-bottom: 1px solid #E2E8F0;
          }
          .student-cell:nth-child(even) { border-right: none; }
          .student-cell:nth-last-child(-n+2) { border-bottom: none; }
          .cell-label {
            font-size: 9px;
            font-weight: 600;
            color: #94A3B8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
          }
          .cell-value {
            font-size: 12px;
            font-weight: 600;
            color: #1F2937;
          }
          .student-avg-bar {
            background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid #BFDBFE;
          }
          .avg-label { font-size: 10px; color: #1D4ED8; font-weight: 500; }
          .avg-value { font-size: 24px; font-weight: 800; color: #1D4ED8; }

          /* ── PRESTASI ── */
          .prestasi-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .prestasi-table thead tr {
            background: #F1F5F9;
          }
          .prestasi-table th {
            padding: 7px 10px;
            font-weight: 600;
            color: #64748B;
            text-align: left;
            border-bottom: 2px solid #E2E8F0;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
          }
          .prestasi-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #F1F5F9;
            color: #374151;
          }
          .prestasi-table tbody tr:last-child td { border-bottom: none; }
          .prestasi-table tbody tr:nth-child(odd) { background: #FAFAFA; }
          .badge-tingkat {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: 600;
          }

          /* ── PILIHAN CARDS ── */
          .pilihan-card {
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 14px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          }
          .pilihan-top {
            display: flex;
            align-items: stretch;
          }
          .pilihan-accent {
            width: 6px;
            flex-shrink: 0;
          }
          .pilihan-info {
            flex: 1;
            padding: 12px 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            background: white;
            border: 1px solid #E5E7EB;
            border-left: none;
          }
          .pilihan-logo {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #E5E7EB;
            flex-shrink: 0;
          }
          .pilihan-text { flex: 1; }
          .pilihan-num {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }
          .pilihan-prodi {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
            line-height: 1.2;
          }
          .pilihan-univ {
            font-size: 10px;
            color: #6B7280;
            margin-top: 2px;
          }
          .pilihan-score {
            text-align: center;
            padding: 10px 16px;
            min-width: 80px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .score-pct {
            font-size: 26px;
            font-weight: 800;
            line-height: 1;
          }
          .score-label {
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .pilihan-detail {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-top: none;
            padding: 10px 14px;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
          }
          .detail-item { text-align: center; }
          .detail-bar-wrap {
            height: 6px;
            background: #E5E7EB;
            border-radius: 3px;
            overflow: hidden;
            margin: 4px 0;
          }
          .detail-bar-fill {
            height: 100%;
            border-radius: 3px;
          }
          .detail-score {
            font-size: 11px;
            font-weight: 700;
            color: #1F2937;
          }
          .detail-max {
            font-size: 9px;
            color: #9CA3AF;
          }
          .detail-name {
            font-size: 8.5px;
            color: #6B7280;
            font-weight: 500;
          }
          .mismatch-note {
            background: #FFFBEB;
            border-left: 3px solid #F59E0B;
            padding: 5px 10px;
            font-size: 9.5px;
            color: #92400E;
            font-weight: 500;
            margin-top: 6px;
            border-radius: 0 4px 4px 0;
          }

          /* ── CATATAN ── */
          .catatan-box {
            border: 1.5px dashed #CBD5E1;
            border-radius: 8px;
            padding: 12px 14px;
            min-height: 80px;
            background: #FAFAFA;
          }
          .catatan-lines {
            color: #CBD5E1;
            font-size: 11px;
            line-height: 2.2;
            letter-spacing: 1px;
          }

          /* ── TANDA TANGAN ── */
          .sign-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 16px;
          }
          .sign-box {
            text-align: center;
          }
          .sign-city {
            font-size: 10px;
            color: #6B7280;
            margin-bottom: 2px;
          }
          .sign-role {
            font-size: 11px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 52px;
          }
          .sign-line {
            border-top: 1.5px solid #374151;
            padding-top: 6px;
          }
          .sign-name {
            font-size: 11px;
            font-weight: 600;
            color: #1F2937;
          }

          /* ── FOOTER ── */
          .doc-footer {
            background: #1E3A5F;
            padding: 10px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 24px;
          }
          .footer-left {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .footer-logo {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            object-fit: cover;
            opacity: 0.8;
          }
          .footer-text {
            font-size: 9px;
            color: rgba(255,255,255,0.75);
          }
          .footer-right {
            font-size: 9px;
            color: rgba(255,255,255,0.6);
            text-align: right;
          }

          /* ── PRINT ── */
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { max-width: 100%; }
            .doc-footer { margin-top: 12px; }
          }
          @page { margin: 0; size: A4; }
        </style>
      </head>
      <body>
      <div class="page">

        <!-- ══ HEADER ══ -->
        <div class="doc-header">
          <div class="header-brand">
            <img class="header-logo" src="${logoUrl}" />
            <div class="header-brand-text">
              <div class="org-name">BIMBEL ATTIN</div>
              <div class="org-sub">Bimbingan Belajar Profesional &nbsp;|&nbsp; Konsultasi SNBP</div>
            </div>
          </div>
          <div class="header-badge">
            <div class="badge-confidential">
              <div class="conf-label">&#128274; Dokumen Rahasia</div>
              <div class="conf-no">No: ${docNumber}</div>
              <div class="conf-no">Tanggal: ${dateStr}</div>
            </div>
          </div>
        </div>

        <!-- ══ TITLE BANNER ══ -->
        <div class="title-banner">
          <h1>Hasil Konsultasi SNBP ${year}</h1>
          <p>Seleksi Nasional Berdasarkan Prestasi &mdash; Laporan Analisis Peluang Masuk PTN</p>
        </div>

        <!-- ══ BODY ══ -->
        <div class="doc-body">

          <!-- Data Siswa -->
          <div class="section">
            <div class="section-header">
              <div class="section-bar"></div>
              <div class="section-title">Data Siswa</div>
              <div class="section-line"></div>
            </div>
            <div class="student-card">
              <div class="student-grid">
                <div class="student-cell">
                  <div class="cell-label">Nama Lengkap</div>
                  <div class="cell-value">${studentData.nama || '—'}</div>
                </div>
                <div class="student-cell">
                  <div class="cell-label">Asal Sekolah</div>
                  <div class="cell-value">${studentData.asalSekolah || '—'}</div>
                </div>
                <div class="student-cell">
                  <div class="cell-label">Jurusan Sekolah</div>
                  <div class="cell-value">${studentData.jurusanSekolah || '—'}</div>
                </div>
                <div class="student-cell">
                  <div class="cell-label">Akreditasi &amp; Tipe Sekolah</div>
                  <div class="cell-value">${studentData.akreditasi || '—'} &nbsp;&bull;&nbsp; ${studentData.tipeSekolah || '—'}</div>
                </div>
              </div>
              <div class="student-avg-bar">
                <div class="avg-label">Rata-rata Nilai Rapor (Semester 1 &ndash; 5)</div>
                <div class="avg-value">${averageGrade.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <!-- Prestasi -->
          ${achievements.length > 0 ? `
          <div class="section">
            <div class="section-header">
              <div class="section-bar"></div>
              <div class="section-title">Prestasi</div>
              <div class="section-line"></div>
            </div>
            <div style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;">
              <table class="prestasi-table">
                <thead>
                  <tr>
                    <th style="width:30px;">No</th>
                    <th>Nama Prestasi</th>
                    <th style="width:90px;">Tingkat</th>
                    <th style="width:60px;">Juara</th>
                  </tr>
                </thead>
                <tbody>${achievementRows}</tbody>
              </table>
            </div>
          </div>
          ` : ""}

          <!-- Analisis Peluang -->
          <div class="section">
            <div class="section-header">
              <div class="section-bar"></div>
              <div class="section-title">Analisis Peluang SNBP</div>
              <div class="section-line"></div>
            </div>
            ${pilihanCards || '<p style="color:#9CA3AF;font-size:11px;">Belum ada pilihan jurusan.</p>'}
          </div>

          <!-- Catatan -->
          <div class="section">
            <div class="section-header">
              <div class="section-bar"></div>
              <div class="section-title">Catatan Tim Konsultan</div>
              <div class="section-line"></div>
            </div>
            <div class="catatan-box">
              <div class="catatan-lines">
                .................................................................................................................<br/>
                .................................................................................................................<br/>
                .................................................................................................................<br/>
                .................................................................................................................
              </div>
            </div>
          </div>

          <!-- Tanda Tangan -->
          <div class="sign-grid">
            <div class="sign-box">
              <div class="sign-city">............., ${dateStr}</div>
              <div class="sign-role">Siswa</div>
              <div class="sign-line">
                <div class="sign-name">( ${studentData.nama || '......................................'} )</div>
              </div>
            </div>
            <div class="sign-box">
              <div class="sign-city">............., ${dateStr}</div>
              <div class="sign-role">Tim Konsultan Bimbel Attin</div>
              <div class="sign-line">
                <div class="sign-name">( .......................................... )</div>
              </div>
            </div>
          </div>

        </div><!-- /doc-body -->

        <!-- ══ FOOTER ══ -->
        <div class="doc-footer">
          <div class="footer-left">
            <img class="footer-logo" src="${logoUrl}" />
            <div class="footer-text">
              <strong style="color:white;">BIMBEL ATTIN</strong> &nbsp;&mdash;&nbsp; Aplikasi Konsultasi SNBP
            </div>
          </div>
          <div class="footer-right">
            ${docNumber} &nbsp;&bull;&nbsp; ${dateStr}
          </div>
        </div>

      </div><!-- /page -->
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: generateHTML() });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Print error:", e);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: generateHTML() });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else if (Platform.OS !== "web") {
        Alert.alert("PDF Tersimpan", `File tersimpan di: ${uri}`);
      }
    } catch (e) {
      console.error("Export PDF error:", e);
    }
  };

  const renderScoreBar = (label: string, score: number, max: number, color: string) => {
    const pct = max > 0 ? (score / max) * 100 : 0;
    return (
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
        <Text style={styles.scoreValue}>{score}/{max}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Analisis Peluang</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>5/5</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {!hasResults ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Belum Ada Analisis</Text>
            <Text style={styles.emptyDesc}>Pilih minimal satu jurusan SNBP terlebih dahulu</Text>
            <Pressable
              style={({ pressed }) => [styles.goBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.push("/selection")}
            >
              <Text style={styles.goBtnText}>Pilih Jurusan</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.studentSummary}>
              <Ionicons name="person-circle-outline" size={32} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{studentData.nama || "Siswa"}</Text>
                <Text style={styles.studentSchool}>{studentData.asalSekolah} | {studentData.tipeSekolah} - {studentData.jurusanSekolah}</Text>
              </View>
              <View style={styles.avgBadge}>
                <Text style={styles.avgBadgeValue}>{averageGrade.toFixed(1)}</Text>
                <Text style={styles.avgBadgeLabel}>Rata-rata</Text>
              </View>
            </View>

            {results.map((r, idx) => {
              if (!r) return null;
              return (
                <View key={idx} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <UniversityLogo name={r.universitas} size={56} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultPilihan}>Pilihan {r.pilihan}</Text>
                      <Text style={styles.resultProdi}>{r.programStudi}</Text>
                      <Text style={styles.resultPTN}>{r.universitas}</Text>
                    </View>
                    <PeluangBadge peluang={r.peluang} persentase={r.persentase} />
                  </View>

                  {r.jurusanMismatch && (
                    <View style={styles.mismatchBanner}>
                      <Ionicons name="warning" size={16} color={Colors.warning} />
                      <Text style={styles.mismatchBannerText}>Lintas Jurusan: Persentase dikurangi 13%</Text>
                    </View>
                  )}

                  <View style={styles.scoresSection}>
                    {renderScoreBar("Nilai Rapor", r.details.nilaiScore, 30, Colors.primary)}
                    {renderScoreBar("Daya Tampung", r.details.dayaTampungScore, 15, Colors.secondary)}
                    {renderScoreBar("Rasio Peminat", r.details.peminatScore, 20, Colors.info)}
                    {renderScoreBar("Prestasi", r.details.prestasiScore, 20, Colors.warning)}
                    {renderScoreBar("Akreditasi", r.details.akreditasiScore, 15, Colors.success)}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {hasResults && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 12 }]}>
          <View style={styles.btnRow}>
            <Pressable
              style={({ pressed }) => [styles.exportBtn, styles.printBtn, pressed && { opacity: 0.9 }]}
              onPress={handlePrint}
            >
              <Feather name="printer" size={18} color={Colors.primary} />
              <Text style={styles.printBtnText}>Print</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.exportBtn, styles.pdfBtn, pressed && { opacity: 0.9 }]}
              onPress={handleExportPDF}
            >
              <Feather name="download" size={18} color={Colors.white} />
              <Text style={styles.pdfBtnText}>Export PDF</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  stepBadge: { backgroundColor: Colors.primary + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stepText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  goBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  goBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  studentSummary: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.white,
    borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  studentName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  studentSchool: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  avgBadge: { alignItems: "center", backgroundColor: Colors.primary + "10", borderRadius: 10, padding: 8 },
  avgBadgeValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.primary },
  avgBadgeLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  resultCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  resultHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 20 },
  resultPilihan: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted, marginBottom: 4 },
  resultProdi: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 2 },
  resultPTN: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  mismatchBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.warningLight, borderRadius: 8, padding: 10, marginBottom: 14,
  },
  mismatchBannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.warning, flex: 1 },
  scoresSection: { gap: 10 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreLabel: { width: 90, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  scoreBarBg: { flex: 1, height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 4 },
  scoreValue: { width: 40, fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.text, textAlign: "right" },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 16, paddingTop: 12,
  },
  btnRow: { flexDirection: "row", gap: 10 },
  exportBtn: {
    flex: 1, flexDirection: "row", borderRadius: 12, paddingVertical: 14,
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  printBtn: { backgroundColor: Colors.primary + "12", borderWidth: 1, borderColor: Colors.primary + "30" },
  printBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  pdfBtn: { backgroundColor: Colors.primary },
  pdfBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
