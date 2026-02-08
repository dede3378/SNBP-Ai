import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useConsultation, JurusanSelection, ProgramStudi } from "@/lib/consultation-context";
import { useUniversityLogos } from "@/lib/university-logos";

type PickerType = "ptn" | "prodi";

interface PickerState {
  visible: boolean;
  type: PickerType;
  pilihanIdx: number;
}

function UniversityLogo({ name, size = 36 }: { name: string; size?: number }) {
  const { getLogoUrl } = useUniversityLogos();
  const logoUrl = getLogoUrl(name);

  if (!logoUrl) {
    return (
      <View style={[logoStyles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
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

const logoStyles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function SelectionScreen() {
  const insets = useSafeAreaInsets();
  const { masterData, selections, setSelections, studentData } = useConsultation();
  const { fetchLogos } = useUniversityLogos();
  const [picker, setPicker] = useState<PickerState>({ visible: false, type: "ptn", pilihanIdx: 0 });
  const [search, setSearch] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("");
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const uniquePTN = useMemo(() => {
    const set = new Set<string>();
    masterData.forEach(d => set.add(d.universitas));
    return Array.from(set).sort();
  }, [masterData]);

  useEffect(() => {
    if (uniquePTN.length > 0) {
      fetchLogos(uniquePTN);
    }
  }, [uniquePTN]);

  const tingkatOptions = useMemo(() => {
    const set = new Set<string>();
    masterData.forEach(d => { if (d.tingkat) set.add(d.tingkat); });
    return Array.from(set).sort();
  }, [masterData]);

  const isJurusanMismatch = (prodiJurusan: string): boolean => {
    if (!studentData.jurusanSekolah || !prodiJurusan) return false;
    const sj = studentData.jurusanSekolah.toLowerCase();
    const dj = prodiJurusan.toLowerCase();
    if (sj === "campuran" || dj === "campuran") return false;
    const studentBase = sj.split("/")[0];
    return !dj.includes(studentBase);
  };

  const getProdiForPTN = (ptn: string) => {
    return masterData.filter(d => {
      if (d.universitas !== ptn) return false;
      if (filterTingkat && d.tingkat !== filterTingkat) return false;
      return true;
    });
  };

  const openPicker = (pilihanIdx: number, type: PickerType) => {
    setSearch("");
    setPicker({ visible: true, type, pilihanIdx });
  };

  const handleSelectPTN = (ptn: string) => {
    const newSelections: [JurusanSelection | null, JurusanSelection | null] = [...selections];
    newSelections[picker.pilihanIdx] = { universitas: ptn, programStudi: "" };
    setSelections(newSelections);
    setPicker(p => ({ ...p, visible: false }));
    Haptics.selectionAsync();
  };

  const handleSelectProdi = (prodi: ProgramStudi) => {
    const newSelections: [JurusanSelection | null, JurusanSelection | null] = [...selections];
    newSelections[picker.pilihanIdx] = {
      universitas: selections[picker.pilihanIdx]?.universitas || prodi.universitas,
      programStudi: prodi.programStudi,
      programStudiData: prodi,
    };
    setSelections(newSelections);
    setPicker(p => ({ ...p, visible: false }));
    Haptics.selectionAsync();
  };

  const clearSelection = (idx: number) => {
    const newSelections: [JurusanSelection | null, JurusanSelection | null] = [...selections];
    newSelections[idx] = null;
    setSelections(newSelections);
  };

  const filteredPTN = useMemo(() => {
    if (!search) return uniquePTN;
    const s = search.toLowerCase();
    return uniquePTN.filter(p => p.toLowerCase().includes(s));
  }, [uniquePTN, search]);

  const filteredProdi = useMemo(() => {
    const sel = selections[picker.pilihanIdx];
    if (!sel?.universitas) return [];
    const prodiList = getProdiForPTN(sel.universitas);
    if (!search) return prodiList;
    const s = search.toLowerCase();
    return prodiList.filter(p => p.programStudi.toLowerCase().includes(s));
  }, [selections, picker.pilihanIdx, search, masterData, filterTingkat]);

  const canAnalyze = !!(selections[0]?.programStudi || selections[1]?.programStudi);

  const renderSelectionCard = (idx: number) => {
    const sel = selections[idx];
    return (
      <View style={styles.selCard}>
        <View style={styles.selCardHeader}>
          <Text style={styles.selCardTitle}>Pilihan {idx + 1}</Text>
          {sel && (
            <Pressable onPress={() => clearSelection(idx)}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.dropdownBtn, sel?.universitas && styles.dropdownBtnFilled]}
          onPress={() => openPicker(idx, "ptn")}
        >
          {sel?.universitas ? (
            <UniversityLogo name={sel.universitas} size={24} />
          ) : (
            <Ionicons name="business-outline" size={18} color={Colors.textMuted} />
          )}
          <Text style={[styles.dropdownText, sel?.universitas && styles.dropdownTextFilled]} numberOfLines={1}>
            {sel?.universitas || "Pilih Universitas/PTN"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </Pressable>

        <Pressable
          style={[styles.dropdownBtn, sel?.programStudi && styles.dropdownBtnFilled, !sel?.universitas && { opacity: 0.5 }]}
          onPress={() => sel?.universitas && openPicker(idx, "prodi")}
          disabled={!sel?.universitas}
        >
          <Ionicons name="school-outline" size={18} color={sel?.programStudi ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.dropdownText, sel?.programStudi && styles.dropdownTextFilled]} numberOfLines={1}>
            {sel?.programStudi || "Pilih Program Studi"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </Pressable>

        {sel?.programStudiData && (
          <>
            {isJurusanMismatch(sel.programStudiData.jurusanSekolah) && (
              <View style={styles.mismatchWarning}>
                <Ionicons name="warning" size={16} color={Colors.warning} />
                <Text style={styles.mismatchText}>
                  Jurusan sekolah Anda ({studentData.jurusanSekolah}) berbeda dengan rumpun prodi ini ({sel.programStudiData.jurusanSekolah}). Poin analisis akan berkurang.
                </Text>
              </View>
            )}
            <View style={styles.prodiInfo}>
              <View style={styles.prodiInfoRow}>
                <Text style={styles.prodiInfoLabel}>Jenjang</Text>
                <Text style={styles.prodiInfoValue}>{sel.programStudiData.tingkat}</Text>
              </View>
              <View style={styles.prodiInfoRow}>
                <Text style={styles.prodiInfoLabel}>Rumpun</Text>
                <Text style={[styles.prodiInfoValue, isJurusanMismatch(sel.programStudiData.jurusanSekolah) && { color: Colors.danger }]}>
                  {sel.programStudiData.jurusanSekolah}
                  {isJurusanMismatch(sel.programStudiData.jurusanSekolah) ? " (Tidak Sesuai)" : ""}
                </Text>
              </View>
              <View style={styles.prodiInfoRow}>
                <Text style={styles.prodiInfoLabel}>Daya Tampung</Text>
                <Text style={styles.prodiInfoValue}>{sel.programStudiData.dayaTampungSekarang}</Text>
              </View>
              <View style={styles.prodiInfoRow}>
                <Text style={styles.prodiInfoLabel}>Peminat Sebelumnya</Text>
                <Text style={styles.prodiInfoValue}>{sel.programStudiData.peminatSebelumnya}</Text>
              </View>
              <View style={styles.prodiInfoRow}>
                <Text style={styles.prodiInfoLabel}>Nilai Min</Text>
                <Text style={styles.prodiInfoValue}>{sel.programStudiData.nilai}</Text>
              </View>
              {sel.programStudiData.passingGrade > 0 && (
                <View style={styles.prodiInfoRow}>
                  <Text style={styles.prodiInfoLabel}>Passing Grade</Text>
                  <Text style={styles.prodiInfoValue}>{sel.programStudiData.passingGrade}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Pilih Jurusan</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>4/5</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {masterData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.warning} />
            <Text style={styles.emptyTitle}>Data Master Belum Ada</Text>
            <Text style={styles.emptyDesc}>Upload data program studi terlebih dahulu melalui halaman Upload Data Master</Text>
            <Pressable
              style={({ pressed }) => [styles.uploadLink, pressed && { opacity: 0.8 }]}
              onPress={() => router.push("/upload")}
            >
              <Text style={styles.uploadLinkText}>Upload Sekarang</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {filterTingkat ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>Filter: {filterTingkat}</Text>
                <Pressable onPress={() => setFilterTingkat("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.primary} />
                </Pressable>
              </View>
            ) : null}

            {tingkatOptions.length > 0 && !filterTingkat && (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Filter Jenjang:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterChips}>
                    {tingkatOptions.map(opt => (
                      <Pressable
                        key={opt}
                        style={styles.filterChip}
                        onPress={() => setFilterTingkat(opt)}
                      >
                        <Text style={styles.filterChipText}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {renderSelectionCard(0)}
            {renderSelectionCard(1)}
          </>
        )}
      </ScrollView>

      {masterData.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 12 }]}>
          <Pressable
            style={({ pressed }) => [styles.analyzeBtn, !canAnalyze && { opacity: 0.5 }, pressed && canAnalyze && { opacity: 0.9 }]}
            onPress={() => router.push("/analysis")}
            disabled={!canAnalyze}
          >
            <Ionicons name="analytics" size={20} color={Colors.white} />
            <Text style={styles.analyzeBtnText}>Analisis Peluang</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={picker.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {picker.type === "ptn" ? "Pilih Universitas" : "Pilih Program Studi"}
              </Text>
              <Pressable onPress={() => setPicker(p => ({ ...p, visible: false }))}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari..."
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <FlatList
              data={picker.type === "ptn" ? filteredPTN.map(p => ({ id: p, label: p })) : filteredProdi.map(p => ({ id: p.id, label: p.programStudi, data: p, mismatch: isJurusanMismatch(p.jurusanSekolah) }))}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isMismatch = (item as any).mismatch;
                return (
                  <Pressable
                    style={({ pressed }) => [styles.pickerItem, pressed && { backgroundColor: Colors.background }, isMismatch && styles.pickerItemMismatch]}
                    onPress={() => {
                      if (picker.type === "ptn") {
                        handleSelectPTN(item.label);
                      } else {
                        handleSelectProdi((item as any).data);
                      }
                    }}
                  >
                    <View style={styles.pickerItemRow}>
                      {picker.type === "ptn" && (
                        <UniversityLogo name={item.label} size={32} />
                      )}
                      <View style={styles.pickerItemContent}>
                        <Text style={styles.pickerItemText}>{item.label}</Text>
                        {picker.type === "prodi" && (item as any).data && (
                          <View>
                            <Text style={styles.pickerItemSub}>
                              {(item as any).data.tingkat} | {(item as any).data.jurusanSekolah} | DT: {(item as any).data.dayaTampungSekarang} | Peminat: {(item as any).data.peminatSebelumnya}
                            </Text>
                            {isMismatch && (
                              <View style={styles.pickerMismatchBadge}>
                                <Ionicons name="warning" size={12} color={Colors.warning} />
                                <Text style={styles.pickerMismatchText}>Beda jurusan - poin berkurang</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Tidak ada data ditemukan</Text>
                </View>
              }
              scrollEnabled={true}
            />
          </View>
        </View>
      </Modal>
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
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
  uploadLink: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  uploadLinkText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  filterRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8 },
  filterLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  filterChips: { flexDirection: "row", gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.primary + "12", borderWidth: 1, borderColor: Colors.primary + "30" },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.primary },
  filterBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.primary + "12",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 16, alignSelf: "flex-start",
  },
  filterBadgeText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.primary },
  selCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  selCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  selCardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  dropdownBtn: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.background,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  dropdownBtnFilled: { borderColor: Colors.primary + "40", backgroundColor: Colors.primary + "06" },
  dropdownText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  dropdownTextFilled: { color: Colors.text, fontFamily: "Inter_500Medium" },
  prodiInfo: { backgroundColor: Colors.accentSoft, borderRadius: 10, padding: 12, marginTop: 4 },
  prodiInfoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  prodiInfoLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  prodiInfoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12,
  },
  analyzeBtn: {
    flexDirection: "row", backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: "center", justifyContent: "center", gap: 8,
  },
  analyzeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.background,
    borderRadius: 10, margin: 16, paddingHorizontal: 12, gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text },
  pickerItem: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  pickerItemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pickerItemContent: { flex: 1 },
  pickerItemText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  pickerItemSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  emptyList: { padding: 40, alignItems: "center" },
  emptyListText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
});
