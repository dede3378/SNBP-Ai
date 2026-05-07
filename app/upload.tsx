import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useConsultation, ProgramStudi } from "@/lib/consultation-context";
import { getApiUrl } from "@/lib/query-client";

function readFileAsBase64Web(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("Gagal konversi file ke base64"));
        }
      };
      reader.onerror = () => reject(new Error("Gagal membaca file"));
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = () => reject(new Error("Gagal mengambil file"));
    xhr.open("GET", uri);
    xhr.responseType = "blob";
    xhr.send();
  });
}

async function readFileAsBase64Native(uri: string): Promise<string> {
  const FileSystem = await import("expo-file-system/legacy");
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) throw new Error("File tidak ditemukan");
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const { masterData, setMasterData } = useConsultation();
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<ProgramStudi[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const pickAndUpload = async () => {
    try {
      setError("");
      setSaved(false);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file || !file.uri) {
        setError("File tidak valid");
        return;
      }

      // Log file details for debugging
      console.log(`Uploading file: ${file.name}, size: ${file.size}, uri: ${file.uri}`);
      
      setFileName(file.name);
      setUploading(true);

      let base64Data = "";
      try {
        if (Platform.OS === "web") {
          base64Data = await readFileAsBase64Web(file.uri);
        } else {
          base64Data = await readFileAsBase64Native(file.uri);
        }
      } catch (readError: any) {
        console.error("Read file error:", readError);
        throw new Error(`Gagal membaca file: ${readError.message}`);
      }

      if (!base64Data) {
        throw new Error("Gagal membaca file, data kosong");
      }

      console.log(`Base64 data length: ${base64Data.length}`);

      // Use relative URL on web (Replit proxy handles routing), absolute on native
      const uploadUrl = Platform.OS === 'web'
        ? '/api/upload-excel'
        : new URL("/api/upload-excel", getApiUrl()).toString();

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          data: base64Data,
          filename: file.name,
        }),
      });

      if (!res.ok) {
        let errText = `Server error (${res.status})`;
        try {
          const errBody = await res.json();
          errText = errBody?.error || errText;
        } catch (e) {
          try {
            const rawText = await res.text();
            if (rawText) errText = `${errText}: ${rawText.slice(0, 100)}`;
          } catch (inner) {}
        }
        throw new Error(errText);
      }

      const parsed = await res.json();

      if (!parsed.data || parsed.data.length === 0) {
        throw new Error("Tidak ada data program studi yang valid dalam file");
      }

      setPreviewData(parsed.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("Upload error:", e);
      setError(e.message || "Upload gagal, silakan coba lagi");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploading(false);
    }
  };

  const saveData = () => {
    setMasterData(previewData);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === "web") {
      router.back();
    } else {
      Alert.alert("Berhasil", `${previewData.length} program studi tersimpan`, [
        { text: "Kembali", onPress: () => router.back() },
      ]);
    }
  };

  const uniqueUniversities = new Set(previewData.map(p => p.universitas)).size;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Upload Data Master</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>Data</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {masterData.length > 0 && !previewData.length && (
          <View style={styles.currentDataCard}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.currentDataText}>
              {masterData.length} program studi sudah dimuat
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.uploadArea, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
          onPress={pickAndUpload}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.uploadingState}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.uploadingText}>Memproses file...</Text>
              <Text style={styles.uploadingSubText}>Mohon tunggu sebentar</Text>
            </View>
          ) : (
            <>
              <View style={styles.uploadIconCircle}>
                <MaterialCommunityIcons name="file-excel-outline" size={36} color={Colors.success} />
              </View>
              <Text style={styles.uploadTitle}>
                {fileName || "Pilih File Excel"}
              </Text>
              <Text style={styles.uploadSubtitle}>
                Format: .xlsx atau .xls
              </Text>
              <View style={styles.uploadHint}>
                <Feather name="upload" size={14} color={Colors.primary} />
                <Text style={styles.uploadHintText}>Ketuk untuk memilih file</Text>
              </View>
            </>
          )}
        </Pressable>

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => setError("")}>
              <Ionicons name="close" size={16} color={Colors.danger} />
            </Pressable>
          </View>
        )}

        {previewData.length > 0 && (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <Text style={styles.previewTitle}>Data Berhasil Dibaca</Text>
            </View>

            <View style={styles.previewStats}>
              <View style={styles.previewStat}>
                <Text style={styles.previewStatValue}>{previewData.length}</Text>
                <Text style={styles.previewStatLabel}>Program Studi</Text>
              </View>
              <View style={styles.previewStatDivider} />
              <View style={styles.previewStat}>
                <Text style={styles.previewStatValue}>{uniqueUniversities}</Text>
                <Text style={styles.previewStatLabel}>Universitas</Text>
              </View>
            </View>

            <Text style={styles.previewSampleTitle}>Contoh Data:</Text>
            {previewData.slice(0, 5).map((item, idx) => (
              <View key={idx} style={styles.previewItem}>
                <Text style={styles.previewItemProdi} numberOfLines={1}>{item.programStudi}</Text>
                <Text style={styles.previewItemPTN} numberOfLines={1}>{item.universitas}</Text>
                <View style={styles.previewItemMeta}>
                  <Text style={styles.previewItemMetaText}>DT: {item.dayaTampungSekarang}</Text>
                  <Text style={styles.previewItemMetaText}>Peminat: {item.peminatSebelumnya}</Text>
                  <Text style={styles.previewItemMetaText}>Nilai: {item.nilai}</Text>
                </View>
              </View>
            ))}
            {previewData.length > 5 && (
              <Text style={styles.previewMore}>... dan {previewData.length - 5} program studi lainnya</Text>
            )}
          </View>
        )}
      </ScrollView>

      {previewData.length > 0 && !saved && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 12 }]}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
            onPress={saveData}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            <Text style={styles.saveBtnText}>Simpan {previewData.length} Program Studi</Text>
          </Pressable>
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
  currentDataCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.successLight, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  currentDataText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.success },
  uploadArea: {
    borderWidth: 2, borderStyle: "dashed", borderColor: Colors.border, borderRadius: 16,
    padding: 32, alignItems: "center", backgroundColor: Colors.white, marginBottom: 16,
  },
  uploadingState: { alignItems: "center", gap: 10 },
  uploadingText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  uploadingSubText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  uploadIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.successLight,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  uploadTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 4 },
  uploadSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 12 },
  uploadHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.primary + "10", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  uploadHintText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dangerLight, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.danger },
  previewSection: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  previewTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  previewStats: {
    flexDirection: "row", backgroundColor: Colors.primary + "08", borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  previewStat: { flex: 1, alignItems: "center" },
  previewStatValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.primary },
  previewStatLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  previewStatDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  previewSampleTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginBottom: 8 },
  previewItem: {
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight, paddingVertical: 10,
  },
  previewItemProdi: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  previewItemPTN: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  previewItemMeta: { flexDirection: "row", gap: 12, marginTop: 4 },
  previewItemMetaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  previewMore: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", paddingTop: 10 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12,
  },
  saveBtn: {
    flexDirection: "row", backgroundColor: Colors.success, borderRadius: 12,
    paddingVertical: 16, alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
