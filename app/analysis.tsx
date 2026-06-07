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

  const generateHTML = (logoDataUrl: string) => {
    const logoUrl = logoDataUrl || "";

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
        ? `<img src="${ptnLogoUrl}" width="48" height="48" style="border-radius:50%;object-fit:cover;border:2px solid #e5e7eb;display:block;" />`
        : `<div style="width:48px;height:48px;border-radius:50%;background:#f1f5f9;border:2px solid #e5e7eb;text-align:center;line-height:48px;font-size:20px;">&#127963;</div>`;

      const data = r.pilihan <= selections.length ? selections[r.pilihan - 1]?.programStudiData : null;
      const chipStyle = (bg: string, fg: string) => `display:inline-block;padding:2px 8px;border-radius:10px;font-size:8.5px;font-weight:600;background:${bg};color:${fg};margin-right:4px;margin-bottom:2px;`;
      const metaChips = [
        data?.tingkat ? `<span style="${chipStyle('#eff6ff','#1d4ed8')}">${data.tingkat}</span>` : "",
        data?.jurusanSekolah ? `<span style="${chipStyle('#f0fdf4','#166534')}">${data.jurusanSekolah}</span>` : "",
        data?.dayaTampungSekarang ? `<span style="${chipStyle('#f8fafc','#475569')}">DT: ${data.dayaTampungSekarang}</span>` : "",
        data?.peminatSebelumnya ? `<span style="${chipStyle('#f8fafc','#475569')}">Peminat: ${data.peminatSebelumnya}</span>` : "",
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
        return `<tr>
          <td width="90" style="font-size:9.5px;color:#374151;font-weight:500;padding:3px 0;">${s.name}</td>
          <td style="padding:3px 8px;"><div style="background:#e5e7eb;border-radius:4px;height:7px;overflow:hidden;"><div style="background:${s.color};width:${pct}%;height:7px;border-radius:4px;"></div></div></td>
          <td width="40" align="right" style="font-size:9.5px;font-weight:700;color:#1a2332;padding:3px 0;">${s.val}<span style="font-size:8.5px;color:#9ca3af;font-weight:400;">/${s.max}</span></td>
        </tr>`;
      }).join("");

      const mismatchHtml = r.jurusanMismatch
        ? `<tr><td colspan="3"><div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:5px 10px;font-size:9px;color:#92400e;font-weight:600;margin-top:6px;border-radius:0 4px 4px 0;">&#9888; Lintas Jurusan: skor dikurangi 13 poin</div></td></tr>` : "";

      return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- card header -->
        <tr>
          <td width="7" style="background:${accentColor};">&nbsp;</td>
          <td style="background:#fff;padding:13px 14px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="60" valign="middle">${ptnLogoHtml}</td>
                <td width="10"></td>
                <td valign="middle">
                  <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:${accentColor};margin-bottom:3px;">&#9679; Pilihan ${r.pilihan}</div>
                  <div style="font-size:14px;font-weight:800;color:#111827;line-height:1.2;">${r.programStudi}</div>
                  <div style="font-size:10px;color:#6b7280;margin-top:3px;font-weight:500;">${r.universitas}</div>
                  ${metaChips ? `<div style="margin-top:5px;">${metaChips}</div>` : ""}
                </td>
                <td width="10"></td>
                <td width="90" align="center" valign="middle" style="background:${scoreBg};border-radius:8px;padding:10px 14px;">
                  <div style="font-size:28px;font-weight:900;color:#fff;line-height:1;">${r.persentase}%</div>
                  <div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px;margin-top:3px;">${r.peluang}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- score detail -->
        <tr>
          <td width="7" style="background:${accentColor};">&nbsp;</td>
          <td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:10px 14px;">
            <div style="font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Rincian Penilaian &mdash; Total ${r.persentase} / 100 poin</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${scoreRows}
              ${mismatchHtml}
            </table>
          </td>
        </tr>
      </table>`;
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

    const logoImg = logoUrl
      ? `<img src="${logoUrl}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.5);display:block;" />`
      : `<div style="width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.25);border:3px solid rgba(255,255,255,0.5);display:table-cell;vertical-align:middle;text-align:center;font-size:28px;">&#127979;</div>`;

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1a2332;background:#fff;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
table{border-collapse:collapse;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
@page{margin:0;size:A4;}
</style>
</head>
<body>
<table width="794" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;">

<!-- ═══════════════════ HEADER ═══════════════════ -->
<tr>
  <td style="background:#8b0000;padding:0;">

    <!-- Baris logo + nama + nomor dokumen -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="20" style="background:#8b0000;"></td>
        <td width="84" valign="middle" style="background:#8b0000;padding:18px 0 14px;">
          <div style="background:rgba(255,255,255,0.15);border-radius:50%;padding:5px;border:2.5px solid rgba(255,255,255,0.4);display:inline-block;">
            ${logoImg}
          </div>
        </td>
        <td width="16" style="background:#8b0000;"></td>
        <td valign="middle" style="background:#8b0000;padding:18px 0 14px;">
          <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:1px;text-transform:uppercase;line-height:1.1;">BIMBEL ATTIN</div>
          <div style="font-size:9.5px;color:rgba(255,255,255,0.75);margin-top:5px;letter-spacing:0.4px;">Bimbingan Belajar Profesional &nbsp;&bull;&nbsp; Konsultasi SNBP Terpercaya</div>
        </td>
        <td width="16" style="background:#8b0000;"></td>
        <td width="170" valign="middle" align="right" style="background:#8b0000;padding:18px 20px 14px 0;">
          <table cellpadding="0" cellspacing="0" style="border:1.5px solid rgba(255,255,255,0.35);border-radius:8px;background:rgba(255,255,255,0.1);margin-left:auto;">
            <tr><td style="padding:10px 16px;">
              <div style="font-size:8.5px;font-weight:700;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1.5px;">No. Dokumen</div>
              <div style="font-size:12px;font-weight:700;color:#fff;margin-top:4px;">${docNumber}</div>
              <div style="font-size:9px;color:rgba(255,255,255,0.7);margin-top:3px;">${dateStr}</div>
            </td></tr>
          </table>
        </td>
        <td width="20" style="background:#8b0000;"></td>
      </tr>
    </table>

    <!-- Garis divider -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:rgba(255,255,255,0.15);height:1px;padding:0 24px;"></td></tr>
    </table>

    <!-- Title band -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="background:#8b0000;padding:14px 24px 18px;">
          <div style="font-size:17px;font-weight:900;color:#fff;letter-spacing:2.5px;text-transform:uppercase;">LAPORAN ANALISIS PELUANG SNBP ${year}</div>
          <div style="font-size:9.5px;color:rgba(255,255,255,0.65);margin-top:5px;letter-spacing:0.5px;">Seleksi Nasional Berdasarkan Prestasi &mdash; Hasil Konsultasi Penerimaan PTN</div>
          <div style="width:200px;height:3px;background:rgba(255,255,255,0.5);border-radius:2px;margin:10px auto 0;"></div>
        </td>
      </tr>
    </table>

  </td>
</tr>

<!-- ═══════════════════ BODY ═══════════════════ -->
<tr>
  <td style="padding:20px 24px 12px;">

    <!-- ── IDENTITAS SISWA ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td>
          <!-- Section header -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
            <tr>
              <td width="5" style="background:#8b0000;border-radius:3px;">&nbsp;</td>
              <td width="8">&nbsp;</td>
              <td style="font-size:10px;font-weight:700;color:#1a2332;text-transform:uppercase;letter-spacing:1.2px;">Identitas Siswa</td>
              <td style="border-bottom:1px solid #e2e8f0;">&nbsp;</td>
            </tr>
          </table>
          <!-- Student data table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr>
              <td width="50%" valign="top" style="padding:9px 13px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
                <div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">Nama Lengkap</div>
                <div style="font-size:12px;font-weight:700;color:#1a2332;">${studentData.nama || '&mdash;'}</div>
              </td>
              <td width="50%" valign="top" style="padding:9px 13px;border-bottom:1px solid #e2e8f0;">
                <div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">Asal Sekolah</div>
                <div style="font-size:12px;font-weight:700;color:#1a2332;">${studentData.asalSekolah || '&mdash;'}</div>
              </td>
            </tr>
            <tr>
              <td valign="top" style="padding:9px 13px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
                <div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">Jurusan di Sekolah</div>
                <div style="font-size:12px;font-weight:700;color:#1a2332;">${studentData.jurusanSekolah || '&mdash;'}</div>
              </td>
              <td valign="top" style="padding:9px 13px;border-bottom:1px solid #e2e8f0;">
                <div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">Akreditasi &amp; Tipe Sekolah</div>
                <div style="font-size:12px;font-weight:700;color:#1a2332;">${studentData.akreditasi || '&mdash;'} &nbsp;&bull;&nbsp; ${studentData.tipeSekolah || '&mdash;'}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="background:#1e3a5f;padding:11px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:9.5px;color:rgba(255,255,255,0.8);">Rata-rata Nilai Rapor Semester 1 &ndash; 5 &nbsp;<span style="font-size:8.5px;color:rgba(255,255,255,0.5);">(Skala 0&ndash;100)</span></td>
                    <td align="right" style="font-size:28px;font-weight:900;color:#fff;line-height:1;">${averageGrade.toFixed(2)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- ── PRESTASI ── -->
    ${achievements.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
          <tr>
            <td width="5" style="background:#8b0000;border-radius:3px;">&nbsp;</td>
            <td width="8">&nbsp;</td>
            <td style="font-size:10px;font-weight:700;color:#1a2332;text-transform:uppercase;letter-spacing:1.2px;">Prestasi Akademik &amp; Non-Akademik</td>
            <td style="border-bottom:1px solid #e2e8f0;">&nbsp;</td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f8fafc;">
              <th width="28" style="padding:7px 10px;font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;text-align:center;">No</th>
              <th style="padding:7px 10px;font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;text-align:left;">Nama Prestasi / Kejuaraan</th>
              <th width="100" style="padding:7px 10px;font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;text-align:center;">Tingkat</th>
              <th width="65" style="padding:7px 10px;font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;text-align:center;">Juara</th>
            </tr>
          </thead>
          <tbody>${achievementRows}</tbody>
        </table>
      </td></tr>
    </table>
    ` : ""}

    <!-- ── ANALISIS PELUANG ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
          <tr>
            <td width="5" style="background:#8b0000;border-radius:3px;">&nbsp;</td>
            <td width="8">&nbsp;</td>
            <td style="font-size:10px;font-weight:700;color:#1a2332;text-transform:uppercase;letter-spacing:1.2px;">Analisis Peluang Penerimaan SNBP</td>
            <td style="border-bottom:1px solid #e2e8f0;">&nbsp;</td>
          </tr>
        </table>
        ${pilihanCards || '<p style="color:#9ca3af;font-size:11px;padding:8px 0;">Belum ada pilihan jurusan.</p>'}
      </td></tr>
    </table>

    <!-- ── CATATAN ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
          <tr>
            <td width="5" style="background:#8b0000;border-radius:3px;">&nbsp;</td>
            <td width="8">&nbsp;</td>
            <td style="font-size:10px;font-weight:700;color:#1a2332;text-transform:uppercase;letter-spacing:1.2px;">Catatan &amp; Rekomendasi Tim Konsultan</td>
            <td style="border-bottom:1px solid #e2e8f0;">&nbsp;</td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px dashed #cbd5e1;border-radius:8px;background:#fafcff;">
          <tr><td style="padding:10px 14px;">
            <div style="border-bottom:1px solid #e2e8f0;height:22px;margin-bottom:2px;"></div>
            <div style="border-bottom:1px solid #e2e8f0;height:22px;margin-bottom:2px;"></div>
            <div style="border-bottom:1px solid #e2e8f0;height:22px;margin-bottom:2px;"></div>
            <div style="height:22px;"></div>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <!-- ── TANDA TANGAN ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td width="50%" align="center" style="padding:0 20px 0 0;">
          <div style="font-size:9.5px;color:#6b7280;margin-bottom:2px;">............., ${dateStr}</div>
          <div style="font-size:10.5px;font-weight:700;color:#374151;margin-bottom:52px;">Siswa / Wali Murid</div>
          <div style="border-top:1.5px solid #9ca3af;padding-top:6px;">
            <div style="font-size:10.5px;font-weight:700;color:#1a2332;">( ${studentData.nama || '....................................'} )</div>
          </div>
        </td>
        <td width="50%" align="center" style="padding:0 0 0 20px;">
          <div style="font-size:9.5px;color:#6b7280;margin-bottom:2px;">............., ${dateStr}</div>
          <div style="font-size:10.5px;font-weight:700;color:#374151;margin-bottom:52px;">Tim Konsultan SNBP Bimbel Attin</div>
          <div style="border-top:1.5px solid #9ca3af;padding-top:6px;">
            <div style="font-size:10.5px;font-weight:700;color:#1a2332;">( ................................................ )</div>
          </div>
        </td>
      </tr>
    </table>

  </td>
</tr>

<!-- ═══════════════════ FOOTER ═══════════════════ -->
<tr>
  <td style="border-top:3px solid #c0392b;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2332;">
      <tr>
        <td width="20">&nbsp;</td>
        <td valign="middle" style="padding:11px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td valign="middle">
                ${logoUrl ? `<img src="${logoUrl}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,255,255,0.3);display:block;" />` : ""}
              </td>
              <td width="10">&nbsp;</td>
              <td valign="middle">
                <div style="font-size:10.5px;font-weight:700;color:#fff;">BIMBEL ATTIN</div>
                <div style="font-size:8.5px;color:rgba(255,255,255,0.5);margin-top:1px;">Bimbingan Belajar &amp; Konsultasi SNBP Terpercaya</div>
              </td>
            </tr>
          </table>
        </td>
        <td align="center" valign="middle" style="padding:11px 0;">
          <div style="font-size:9px;color:rgba(255,255,255,0.5);">${docNumber}</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:2px;">${dateStr}</div>
        </td>
        <td align="right" valign="middle" style="padding:11px 0;">
          <div style="font-size:8.5px;color:rgba(255,255,255,0.4);">&copy; ${year} Bimbel Attin</div>
          <div style="font-size:8px;color:rgba(255,255,255,0.3);margin-top:2px;">Dokumen Rahasia &mdash; Hanya untuk Internal</div>
        </td>
        <td width="20">&nbsp;</td>
      </tr>
    </table>
  </td>
</tr>

</table><!-- /page -->
</body>
</html>`;
  };

  const getWebLogoUrl = (): string => {
    try {
      const apiUrl = getApiUrl();
      return `${apiUrl}api/logo/attin`;
    } catch {
      return "";
    }
  };

  const loadLogoBase64Native = async (): Promise<string> => {
    try {
      const { Asset } = await import("expo-asset");
      const FileSystem = await import("expo-file-system");
      const asset = Asset.fromModule(require("../assets/images/attin-logo.jpg"));
      await asset.downloadAsync();
      if (asset.localUri) {
        const b64 = await (FileSystem as any).readAsStringAsync(asset.localUri, {
          encoding: "base64",
        });
        return `data:image/jpeg;base64,${b64}`;
      }
      return "";
    } catch (e) {
      console.warn("Logo load error:", e);
      return "";
    }
  };

  const handlePrint = async () => {
    try {
      // On web: gunakan URL langsung (sinkron) agar browser tidak memblokir print dialog
      // On native: konversi ke base64 karena WebView tidak bisa akses URL server
      let logoSrc = "";
      if (Platform.OS === "web") {
        logoSrc = getWebLogoUrl();
      } else {
        logoSrc = await loadLogoBase64Native();
      }
      await Print.printAsync({ html: generateHTML(logoSrc) });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Gagal Print", e?.message || "Terjadi kesalahan saat membuka print.");
    }
  };

  const handleExportPDF = async () => {
    try {
      let logoSrc = "";
      if (Platform.OS === "web") {
        logoSrc = getWebLogoUrl();
      } else {
        logoSrc = await loadLogoBase64Native();
      }
      const { uri } = await Print.printToFileAsync({ html: generateHTML(logoSrc) });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else if (Platform.OS !== "web") {
        Alert.alert("PDF Tersimpan", `File tersimpan di: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert("Gagal Export PDF", e?.message || "Terjadi kesalahan saat export PDF.");
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
