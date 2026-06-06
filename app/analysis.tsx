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
      const isT = r.peluang === "Tinggi", isS = r.peluang === "Sedang";
      const accentColor = isT ? "#059669" : isS ? "#d97706" : "#dc2626";
      const scoreBg    = isT ? "#059669" : isS ? "#d97706" : "#dc2626";
      const peluangBg  = isT ? "#d1fae5" : isS ? "#fef3c7" : "#fee2e2";
      const peluangFg  = isT ? "#065f46" : isS ? "#92400e" : "#991b1b";

      const ptnLogoUrl = getLogoUrl(r.universitas);
      const ptnLogoHtml = ptnLogoUrl
        ? `<img class="pil-logo" src="${ptnLogoUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="pil-logo-fb" style="display:none;">&#127963;</div>`
        : `<div class="pil-logo-fb">&#127963;</div>`;

      const data = r.pilihan <= selections.length ? selections[r.pilihan - 1]?.programStudiData : null;
      const metaChips = [
        data?.tingkat ? `<span class="pil-chip" style="background:#eff6ff;color:#1d4ed8;">${data.tingkat}</span>` : "",
        data?.jurusanSekolah ? `<span class="pil-chip" style="background:#f0fdf4;color:#166534;">${data.jurusanSekolah}</span>` : "",
        data?.dayaTampungSekarang ? `<span class="pil-chip" style="background:#f8fafc;color:#475569;">DT: ${data.dayaTampungSekarang}</span>` : "",
        data?.peminatSebelumnya ? `<span class="pil-chip" style="background:#f8fafc;color:#475569;">Peminat: ${data.peminatSebelumnya}</span>` : "",
      ].filter(Boolean).join("");

      const scores = [
        { name: "Nilai Rapor",    val: r.details.nilaiScore,        max: 30, color: "#3b82f6" },
        { name: "Daya Tampung",   val: r.details.dayaTampungScore,  max: 15, color: "#8b5cf6" },
        { name: "Rasio Peminat",  val: r.details.peminatScore,      max: 20, color: "#06b6d4" },
        { name: "Prestasi",       val: r.details.prestasiScore,     max: 20, color: "#f59e0b" },
        { name: "Akreditasi",     val: r.details.akreditasiScore,   max: 15, color: "#10b981" },
      ];
      const scoreRows = scores.map((s) => {
        const pct = Math.round((s.val / s.max) * 100);
        return `<div class="score-row">
          <div class="score-name">${s.name}</div>
          <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${pct}%;background:${s.color};"></div></div>
          <div class="score-nums">${s.val}<span class="score-max">/${s.max}</span></div>
        </div>`;
      }).join("");

      const mismatchHtml = r.jurusanMismatch
        ? `<div class="mismatch-tag">&#9888; Lintas Jurusan: skor dikurangi 13 poin</div>` : "";

      return `<div class="pil-card">
        <div class="pil-header">
          <div class="pil-color-bar" style="background:${accentColor};"></div>
          <div class="pil-main">
            ${ptnLogoHtml}
            <div class="pil-info">
              <div class="pil-tag" style="color:${accentColor};">&#9679; Pilihan ${r.pilihan}</div>
              <div class="pil-prodi">${r.programStudi}</div>
              <div class="pil-univ">${r.universitas}</div>
              ${metaChips ? `<div class="pil-meta">${metaChips}</div>` : ""}
            </div>
            <div class="pil-score-box" style="background:${scoreBg};">
              <div class="pil-pct">${r.persentase}%</div>
              <div class="pil-pct-lbl">${r.peluang}</div>
            </div>
          </div>
        </div>
        <div class="score-strip">
          <div class="score-strip-title">Rincian Penilaian &mdash; Total ${r.persentase} / 100 poin</div>
          ${scoreRows}
          ${mismatchHtml}
        </div>
      </div>`;
    }).join("");

    const achievementRows = achievements.map((a, i) => {
      const t = (a.tingkat || "").toLowerCase();
      const badgeCls = t.includes("internasional") ? "p-intl"
        : t.includes("nasional") ? "p-nas"
        : t.includes("provinsi") ? "p-prov"
        : "p-other";
      return `<tr>
        <td style="width:28px;text-align:center;">${i + 1}</td>
        <td>${a.namaPrestasi}</td>
        <td style="text-align:center;"><span class="p-badge ${badgeCls}">${a.tingkat}</span></td>
        <td style="text-align:center;font-weight:600;">${a.juara}</td>
      </tr>`;
    }).join("");

    const peluangEmoji = (p: string) => p === "Tinggi" ? "🟢" : p === "Sedang" ? "🟡" : "🔴";

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',Arial,sans-serif;font-size:11px;color:#1a2332;background:#fff;line-height:1.5;}
.page{max-width:794px;margin:0 auto;background:#fff;}

/* ══ HEADER ══ */
.hdr{background:linear-gradient(135deg,#6b0000 0%,#9b0000 40%,#c0392b 100%);padding:0;}
.hdr-top{display:flex;align-items:center;padding:18px 28px 14px;gap:18px;}
.hdr-logo-wrap{background:rgba(255,255,255,0.12);border-radius:50%;padding:4px;border:2.5px solid rgba(255,255,255,0.35);}
.hdr-logo{width:72px;height:72px;border-radius:50%;object-fit:cover;display:block;}
.hdr-logo-fallback{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:28px;}
.hdr-info{flex:1;}
.hdr-org{font-size:24px;font-weight:900;color:#fff;letter-spacing:1px;text-transform:uppercase;line-height:1;}
.hdr-tagline{font-size:9.5px;color:rgba(255,255,255,0.75);margin-top:4px;letter-spacing:0.4px;}
.hdr-right{text-align:right;}
.hdr-doc-box{background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.3);border-radius:8px;padding:10px 16px;}
.hdr-doc-title{font-size:10px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1.5px;}
.hdr-doc-no{font-size:13px;font-weight:700;color:#fff;margin-top:3px;}
.hdr-doc-date{font-size:9.5px;color:rgba(255,255,255,0.7);margin-top:2px;}
.hdr-divider{height:1px;background:rgba(255,255,255,0.15);margin:0 28px;}
.hdr-title-band{padding:12px 28px 16px;display:flex;align-items:center;justify-content:center;flex-direction:column;}
.hdr-title{font-size:17px;font-weight:800;color:#fff;letter-spacing:2px;text-transform:uppercase;}
.hdr-subtitle{font-size:9.5px;color:rgba(255,255,255,0.65);margin-top:4px;letter-spacing:0.5px;}
.hdr-accent-bar{height:4px;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.6) 30%,rgba(255,255,255,0.6) 70%,rgba(255,255,255,0) 100%);width:220px;margin-top:8px;border-radius:2px;}

/* ══ BODY ══ */
.body{padding:20px 28px 16px;}

/* ── section header ── */
.sec{margin-bottom:16px;}
.sec-hdr{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.sec-bar{width:5px;height:22px;background:linear-gradient(180deg,#c0392b,#8b0000);border-radius:3px;flex-shrink:0;}
.sec-title{font-size:10px;font-weight:800;color:#1a2332;text-transform:uppercase;letter-spacing:1.2px;}
.sec-line{flex:1;height:1px;background:linear-gradient(90deg,#d1d5db,transparent);}

/* ── student card ── */
.stu-card{border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;}
.stu-row{display:flex;border-bottom:1px solid #e2e8f0;}
.stu-row:last-of-type{border-bottom:none;}
.stu-cell{flex:1;padding:9px 13px;border-right:1px solid #e2e8f0;}
.stu-cell:last-child{border-right:none;}
.stu-lbl{font-size:8.5px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:2px;}
.stu-val{font-size:11.5px;font-weight:600;color:#1a2332;}
.avg-strip{background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:11px 16px;display:flex;align-items:center;justify-content:space-between;}
.avg-lbl{font-size:9.5px;color:rgba(255,255,255,0.8);font-weight:500;}
.avg-num{font-size:28px;font-weight:900;color:#fff;line-height:1;}
.avg-unit{font-size:9px;color:rgba(255,255,255,0.6);margin-top:1px;}

/* ── prestasi table ── */
.ptab{width:100%;border-collapse:collapse;}
.ptab thead tr{background:#f8fafc;}
.ptab th{padding:7px 10px;font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;border-bottom:2px solid #e2e8f0;text-align:left;}
.ptab td{padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#374151;font-size:10px;}
.ptab tbody tr:last-child td{border-bottom:none;}
.ptab tbody tr:nth-child(even){background:#fafafa;}
.p-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:8.5px;font-weight:600;}
.p-intl{background:#fef3c7;color:#92400e;}
.p-nas{background:#dbeafe;color:#1e40af;}
.p-prov{background:#d1fae5;color:#065f46;}
.p-other{background:#f3f4f6;color:#374151;}

/* ── pilihan card ── */
.pil-card{margin-bottom:14px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
.pil-header{display:flex;align-items:stretch;}
.pil-color-bar{width:8px;flex-shrink:0;}
.pil-main{flex:1;padding:14px 16px;background:#fff;display:flex;align-items:center;gap:14px;}
.pil-logo{width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;flex-shrink:0;}
.pil-logo-fb{width:52px;height:52px;border-radius:50%;background:#f1f5f9;border:2px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.pil-info{flex:1;min-width:0;}
.pil-tag{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:3px;}
.pil-prodi{font-size:14.5px;font-weight:800;color:#111827;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pil-univ{font-size:10px;color:#6b7280;margin-top:3px;font-weight:500;}
.pil-meta{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;}
.pil-chip{font-size:8.5px;padding:2px 8px;border-radius:10px;font-weight:600;}
.pil-score-box{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 20px;min-width:88px;text-align:center;}
.pil-pct{font-size:30px;font-weight:900;line-height:1;color:#fff;}
.pil-pct-lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,0.8);letter-spacing:0.8px;text-transform:uppercase;margin-top:3px;}

/* ── score detail strip ── */
.score-strip{background:#f8fafc;border-top:1px solid #e5e7eb;padding:12px 16px;}
.score-strip-title{font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;}
.score-row{display:flex;align-items:center;gap:10px;margin-bottom:5px;}
.score-row:last-child{margin-bottom:0;}
.score-name{font-size:9.5px;color:#374151;font-weight:500;width:90px;flex-shrink:0;}
.score-bar-wrap{flex:1;height:7px;background:#e5e7eb;border-radius:4px;overflow:hidden;}
.score-bar-fill{height:100%;border-radius:4px;}
.score-nums{font-size:9.5px;font-weight:700;color:#1a2332;width:36px;text-align:right;flex-shrink:0;}
.score-max{font-size:8.5px;color:#9ca3af;font-weight:400;}
.mismatch-tag{background:#fffbeb;border-left:3px solid #f59e0b;padding:5px 10px;font-size:9px;color:#92400e;font-weight:600;margin-top:8px;border-radius:0 4px 4px 0;}

/* ── catatan ── */
.catatan{border:1.5px dashed #cbd5e1;border-radius:8px;padding:12px 14px;min-height:88px;background:#fafcff;}
.catatan-line{border-bottom:1px solid #e2e8f0;height:24px;}

/* ── tanda tangan ── */
.ttd-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:16px;}
.ttd-box{text-align:center;padding:0 8px;}
.ttd-city{font-size:9.5px;color:#6b7280;margin-bottom:1px;}
.ttd-role{font-size:10.5px;font-weight:700;color:#374151;margin-bottom:54px;}
.ttd-line{border-top:1.5px solid #9ca3af;padding-top:6px;}
.ttd-name{font-size:10.5px;font-weight:700;color:#1a2332;}

/* ══ FOOTER ══ */
.ftr-wrap{margin-top:20px;border-top:3px solid #c0392b;}
.ftr{background:#1a2332;padding:12px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
.ftr-brand{display:flex;align-items:center;gap:10px;}
.ftr-logo{width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,0.3);}
.ftr-text-main{font-size:10px;font-weight:700;color:#fff;}
.ftr-text-sub{font-size:8.5px;color:rgba(255,255,255,0.55);margin-top:1px;}
.ftr-center{text-align:center;}
.ftr-doc{font-size:9px;color:rgba(255,255,255,0.5);}
.ftr-right{text-align:right;}
.ftr-copy{font-size:8.5px;color:rgba(255,255,255,0.4);}
.ftr-powered{font-size:8px;color:rgba(255,255,255,0.3);margin-top:2px;}

/* ══ PRINT ══ */
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{max-width:100%;}
}
@page{margin:0;size:A4;}
</style>
</head>
<body>
<div class="page">

<!-- ══════════════ HEADER ══════════════ -->
<div class="hdr">
  <div class="hdr-top">
    <div class="hdr-logo-wrap">
      <img class="hdr-logo" src="${logoUrl}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="hdr-logo-fallback" style="display:none;">&#127979;</div>
    </div>
    <div class="hdr-info">
      <div class="hdr-org">Bimbel Attin</div>
      <div class="hdr-tagline">Bimbingan Belajar Profesional &nbsp;&bull;&nbsp; Konsultasi SNBP Terpercaya</div>
    </div>
    <div class="hdr-right">
      <div class="hdr-doc-box">
        <div class="hdr-doc-title">No. Dokumen</div>
        <div class="hdr-doc-no">${docNumber}</div>
        <div class="hdr-doc-date">${dateStr}</div>
      </div>
    </div>
  </div>
  <div class="hdr-divider"></div>
  <div class="hdr-title-band">
    <div class="hdr-title">Laporan Analisis Peluang SNBP ${year}</div>
    <div class="hdr-subtitle">Seleksi Nasional Berdasarkan Prestasi &mdash; Hasil Konsultasi Penerimaan PTN</div>
    <div class="hdr-accent-bar"></div>
  </div>
</div>

<!-- ══════════════ BODY ══════════════ -->
<div class="body">

  <!-- ── DATA SISWA ── -->
  <div class="sec">
    <div class="sec-hdr">
      <div class="sec-bar"></div>
      <div class="sec-title">Identitas Siswa</div>
      <div class="sec-line"></div>
    </div>
    <div class="stu-card">
      <div class="stu-row">
        <div class="stu-cell">
          <div class="stu-lbl">Nama Lengkap</div>
          <div class="stu-val">${studentData.nama || '&mdash;'}</div>
        </div>
        <div class="stu-cell">
          <div class="stu-lbl">Asal Sekolah</div>
          <div class="stu-val">${studentData.asalSekolah || '&mdash;'}</div>
        </div>
      </div>
      <div class="stu-row">
        <div class="stu-cell">
          <div class="stu-lbl">Jurusan di Sekolah</div>
          <div class="stu-val">${studentData.jurusanSekolah || '&mdash;'}</div>
        </div>
        <div class="stu-cell">
          <div class="stu-lbl">Akreditasi Sekolah</div>
          <div class="stu-val">${studentData.akreditasi || '&mdash;'} &nbsp;&bull;&nbsp; ${studentData.tipeSekolah || '&mdash;'}</div>
        </div>
      </div>
      <div class="avg-strip">
        <div>
          <div class="avg-lbl">Rata-rata Nilai Rapor Semester 1 &ndash; 5</div>
          <div class="avg-unit">Skala 0 &ndash; 100</div>
        </div>
        <div class="avg-num">${averageGrade.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <!-- ── PRESTASI ── -->
  ${achievements.length > 0 ? `
  <div class="sec">
    <div class="sec-hdr">
      <div class="sec-bar"></div>
      <div class="sec-title">Prestasi Akademik &amp; Non-Akademik</div>
      <div class="sec-line"></div>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <table class="ptab">
        <thead>
          <tr>
            <th style="width:28px;">No</th>
            <th>Nama Prestasi / Kejuaraan</th>
            <th style="width:100px;text-align:center;">Tingkat</th>
            <th style="width:65px;text-align:center;">Juara</th>
          </tr>
        </thead>
        <tbody>${achievementRows}</tbody>
      </table>
    </div>
  </div>
  ` : ""}

  <!-- ── ANALISIS PELUANG ── -->
  <div class="sec">
    <div class="sec-hdr">
      <div class="sec-bar"></div>
      <div class="sec-title">Analisis Peluang Penerimaan SNBP</div>
      <div class="sec-line"></div>
    </div>
    ${pilihanCards || '<p style="color:#9ca3af;font-size:11px;padding:12px 0;">Belum ada pilihan jurusan yang dianalisis.</p>'}
  </div>

  <!-- ── CATATAN ── -->
  <div class="sec">
    <div class="sec-hdr">
      <div class="sec-bar"></div>
      <div class="sec-title">Catatan &amp; Rekomendasi Tim Konsultan</div>
      <div class="sec-line"></div>
    </div>
    <div class="catatan">
      <div class="catatan-line"></div>
      <div class="catatan-line"></div>
      <div class="catatan-line"></div>
      <div class="catatan-line"></div>
    </div>
  </div>

  <!-- ── TANDA TANGAN ── -->
  <div class="ttd-grid">
    <div class="ttd-box">
      <div class="ttd-city">............., ${dateStr}</div>
      <div class="ttd-role">Siswa / Wali Murid</div>
      <div class="ttd-line">
        <div class="ttd-name">( ${studentData.nama || '....................................'} )</div>
      </div>
    </div>
    <div class="ttd-box">
      <div class="ttd-city">............., ${dateStr}</div>
      <div class="ttd-role">Tim Konsultan SNBP Bimbel Attin</div>
      <div class="ttd-line">
        <div class="ttd-name">( ................................................ )</div>
      </div>
    </div>
  </div>

</div><!-- /body -->

<!-- ══════════════ FOOTER ══════════════ -->
<div class="ftr-wrap">
  <div class="ftr">
    <div class="ftr-brand">
      <img class="ftr-logo" src="${logoUrl}" onerror="this.style.display='none';" />
      <div>
        <div class="ftr-text-main">Bimbel Attin</div>
        <div class="ftr-text-sub">Bimbingan Belajar &amp; Konsultasi SNBP Terpercaya</div>
      </div>
    </div>
    <div class="ftr-center">
      <div class="ftr-doc">${docNumber}</div>
      <div class="ftr-doc" style="margin-top:2px;">${dateStr}</div>
    </div>
    <div class="ftr-right">
      <div class="ftr-copy">&copy; ${year} Bimbel Attin</div>
      <div class="ftr-powered">Dokumen Rahasia &mdash; Hanya untuk Internal</div>
    </div>
  </div>
</div>

</div><!-- /page -->
</body>
</html>`;
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
