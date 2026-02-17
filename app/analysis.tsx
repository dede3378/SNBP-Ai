import React, { useMemo, useState } from "react";
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
    nilaiScore = avgGrade >= 85 ? 25 : avgGrade >= 80 ? 20 : avgGrade >= 75 ? 15 : 10;
  }

  let dayaTampungScore = 0;
  const dtNow = data.dayaTampungSekarang;
  const dtPrev = data.dayaTampungSebelumnya;
  if (dtNow > 0) {
    if (dtNow >= dtPrev) dayaTampungScore = 15;
    else if (dtNow >= dtPrev * 0.8) dayaTampungScore = 12;
    else dayaTampungScore = 8;
  } else {
    dayaTampungScore = 10;
  }

  let peminatScore = 0;
  const peminat = data.peminatSebelumnya;
  if (dtNow > 0 && peminat > 0) {
    const rasio = peminat / dtNow;
    if (rasio <= 2) peminatScore = 20;
    else if (rasio <= 4) peminatScore = 15;
    else if (rasio <= 6) peminatScore = 10;
    else if (rasio <= 10) peminatScore = 7;
    else peminatScore = 4;
  } else {
    peminatScore = 10;
  }

  let prestasiScore = 0;
  achievements.forEach(a => {
    let base = 0;
    if (a.tingkat === "Internasional") base = 10;
    else if (a.tingkat === "Nasional") base = 7;
    else if (a.tingkat === "Provinsi") base = 5;
    else base = 3;

    if (a.juara === "Juara 1") base *= 1;
    else if (a.juara === "Juara 2") base *= 0.8;
    else base *= 0.6;

    prestasiScore += base;
  });
  prestasiScore = Math.min(prestasiScore, 20);

  let akreditasiScore = 0;
  if (akreditasi === "A") akreditasiScore = 15;
  else if (akreditasi === "B") akreditasiScore = 10;
  else akreditasiScore = 5;

  const totalScore = nilaiScore + dayaTampungScore + peminatScore + prestasiScore + akreditasiScore;
  const maxScore = 100;
  let basePercentage = Math.min(Math.round((totalScore / maxScore) * 100), 99);

  const mismatch = isJurusanMismatch(studentJurusan, data.jurusanSekolah);
  let finalPercentage = basePercentage;
  if (mismatch) {
    finalPercentage = Math.max(0, basePercentage - 13);
  }

  let category = "Rendah";
  if (finalPercentage >= 70) category = "Tinggi";
  else if (finalPercentage >= 45) category = "Sedang";

  return {
    pilihan: 0,
    universitas: selection.universitas,
    programStudi: selection.programStudi,
    peluang: category,
    persentase: finalPercentage,
    jurusanMismatch: mismatch,
    details: {
      nilaiScore,
      dayaTampungScore,
      peminatScore,
      prestasiScore,
      akreditasiScore,
    },
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
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: Colors.primary + "12",
        justifyContent: "center", alignItems: "center",
      }}>
        <Ionicons name="school" size={size * 0.5} color={Colors.primary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: logoUrl }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
    />
  );
}

const PRINT_SCALES = [70, 80, 90, 100, 110, 120];

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { selections, averageGrade, achievements, studentData, grades } = useConsultation();
  const { getLogoUrl } = useUniversityLogos();
  const [printScale, setPrintScale] = useState(100);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

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

  const getRowAvg = (g: GradeEntry) => {
    const vals = [g.semester1, g.semester2, g.semester3, g.semester4, g.semester5].filter(v => v > 0);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  };

  const generateHTML = () => {
    const achievementsRows = achievements.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${a.namaPrestasi}</td>
        <td>${a.tingkat}</td>
        <td>${a.juara}</td>
      </tr>
    `).join("");

    const analysisCards = results.map((r, idx) => {
      if (!r) return "";
      const color = r.peluang === "Tinggi" ? "#10B981" : r.peluang === "Sedang" ? "#F59E0B" : "#EF4444";
      const bgColor = r.peluang === "Tinggi" ? "#ECFDF5" : r.peluang === "Sedang" ? "#FFFBEB" : "#FEF2F2";
      const logoUrl = getLogoUrl(r.universitas);
      const logoHtml = logoUrl
        ? `<img src="${logoUrl}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
        : `<div style="width:64px;height:64px;border-radius:50%;background:#E0F2FE;display:flex;align-items:center;justify-content:center;font-size:24px;color:#0EA5E9;flex-shrink:0;">&#127979;</div>`;
      const mismatchHtml = r.jurusanMismatch
        ? `<p style="background:#FEF3C7;color:#D97706;padding:6px 10px;border-radius:6px;font-size:11px;margin:8px 0 0 0;">Lintas Jurusan: Persentase dikurangi 13%</p>`
        : "";
      return `
        <div style="border:2px solid ${color};border-radius:12px;padding:16px;margin-bottom:16px;background:${bgColor};">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
            ${logoHtml}
            <div style="flex:1;">
              <div style="font-size:11px;color:#6B7280;margin-bottom:2px;">Pilihan ${r.pilihan}</div>
              <div style="font-size:16px;font-weight:700;color:#1A1A2E;margin-bottom:2px;">${r.programStudi}</div>
              <div style="font-size:13px;color:#6B7280;">${r.universitas}</div>
            </div>
            <div style="text-align:center;background:${color};color:white;border-radius:10px;padding:8px 12px;min-width:70px;">
              <div style="font-size:18px;font-weight:700;">${r.persentase}%</div>
              <div style="font-size:10px;">${r.peluang}</div>
            </div>
          </div>
          ${mismatchHtml}
          <table style="width:100%;margin-top:10px;font-size:12px;">
            <tr><td>Skor Nilai Rapor</td><td style="text-align:right;">${r.details.nilaiScore}/30</td></tr>
            <tr><td>Skor Daya Tampung</td><td style="text-align:right;">${r.details.dayaTampungScore}/15</td></tr>
            <tr><td>Skor Rasio Peminat</td><td style="text-align:right;">${r.details.peminatScore}/20</td></tr>
            <tr><td>Skor Prestasi</td><td style="text-align:right;">${r.details.prestasiScore}/20</td></tr>
            <tr><td>Skor Akreditasi</td><td style="text-align:right;">${r.details.akreditasiScore}/15</td></tr>
          </table>
        </div>
      `;
    }).join("");

    const scaleFactor = printScale / 100;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 24px; color: #1A1A2E; font-size: ${13 * scaleFactor}px; }
          h1 { text-align: center; color: #0EA5E9; font-size: ${18 * scaleFactor}px; margin-bottom: 4px; }
          h2 { color: #0EA5E9; font-size: ${15 * scaleFactor}px; border-bottom: 2px solid #0EA5E9; padding-bottom: 4px; margin-top: 20px; }
          .subtitle { text-align: center; color: #6B7280; font-size: ${12 * scaleFactor}px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { border: 1px solid #E5E7EB; padding: ${6 * scaleFactor}px ${8 * scaleFactor}px; text-align: left; font-size: ${12 * scaleFactor}px; }
          th { background-color: #0EA5E9; color: white; }
          .info-table td { border: none; padding: ${4 * scaleFactor}px ${8 * scaleFactor}px; }
          .info-table td:first-child { font-weight: 600; width: 40%; color: #6B7280; }
        </style>
      </head>
      <body>
        <h1>HASIL KONSULTASI SNBP</h1>
        <p class="subtitle">BIMBEL ATTIN</p>

        <h2>Data Siswa</h2>
        <table class="info-table">
          <tr><td>Nama</td><td>${studentData.nama || '-'}</td></tr>
          <tr><td>Asal Sekolah</td><td>${studentData.asalSekolah || '-'}</td></tr>
          <tr><td>Akreditasi</td><td>${studentData.akreditasi || '-'}</td></tr>
          <tr><td>Tipe Sekolah</td><td>${studentData.tipeSekolah || '-'}</td></tr>
          <tr><td>Jurusan</td><td>${studentData.jurusanSekolah || '-'}</td></tr>
          <tr><td>Rata-rata Rapor</td><td><strong>${averageGrade.toFixed(2)}</strong></td></tr>
        </table>

        <h2>Prestasi</h2>
        <table>
          <thead><tr><th>No</th><th>Nama Prestasi</th><th>Tingkat</th><th>Juara</th></tr></thead>
          <tbody>${achievementsRows || '<tr><td colspan="4" style="text-align:center;">Belum ada data</td></tr>'}</tbody>
        </table>

        <h2>Analisis Peluang SNBP</h2>
        ${analysisCards || '<p>Belum ada pilihan jurusan</p>'}

        <p style="text-align:center;color:#9CA3AF;font-size:${10 * scaleFactor}px;margin-top:30px;">
          Dokumen ini digenerate oleh Aplikasi Konsultasi SNBP - Bimbel Attin<br/>
          Tanggal: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: generateHTML() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Print error:", e);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: generateHTML() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        if (Platform.OS !== "web") {
          Alert.alert("PDF Tersimpan", `File tersimpan di: ${uri}`);
        }
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 140 }]}
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
                      <Text style={styles.mismatchBannerText}>
                        Lintas Jurusan: Persentase dikurangi 13%
                      </Text>
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
          <View style={styles.scaleRow}>
            <Feather name="zoom-in" size={14} color={Colors.textSecondary} />
            <Text style={styles.scaleLabel}>Ukuran:</Text>
            {PRINT_SCALES.map(s => (
              <Pressable
                key={s}
                style={[styles.scaleChip, printScale === s && styles.scaleChipActive]}
                onPress={() => setPrintScale(s)}
              >
                <Text style={[styles.scaleChipText, printScale === s && styles.scaleChipTextActive]}>{s}%</Text>
              </Pressable>
            ))}
          </View>
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
    backgroundColor: Colors.warningLight, borderRadius: 8,
    padding: 10, marginBottom: 14,
  },
  mismatchBannerText: {
    fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.warning, flex: 1,
  },
  scoresSection: { gap: 10 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreLabel: { width: 90, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  scoreBarBg: { flex: 1, height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 4 },
  scoreValue: { width: 40, fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.text, textAlign: "right" },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 16, paddingTop: 10,
    gap: 8,
  },
  scaleRow: {
    flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap",
  },
  scaleLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  scaleChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  scaleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scaleChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  scaleChipTextActive: { color: Colors.white },
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
