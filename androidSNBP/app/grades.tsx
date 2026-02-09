import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useConsultation, GradeEntry } from "@/lib/consultation-context";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const emptyGrade: Omit<GradeEntry, "id"> = {
  mataPelajaran: "",
  semester1: 0,
  semester2: 0,
  semester3: 0,
  semester4: 0,
  semester5: 0,
};

export default function GradesScreen() {
  const insets = useSafeAreaInsets();
  const { grades, setGrades, averageGrade } = useConsultation();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<GradeEntry, "id">>(emptyGrade);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyGrade });
    setModalVisible(true);
  };

  const openEdit = (grade: GradeEntry) => {
    setEditingId(grade.id);
    setForm({
      mataPelajaran: grade.mataPelajaran,
      semester1: grade.semester1,
      semester2: grade.semester2,
      semester3: grade.semester3,
      semester4: grade.semester4,
      semester5: grade.semester5,
    });
    setModalVisible(true);
  };

  const handleSaveGrade = () => {
    if (!form.mataPelajaran.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (editingId) {
      setGrades(grades.map(g => g.id === editingId ? { ...form, id: editingId } : g));
    } else {
      setGrades([...grades, { ...form, id: generateId() }]);
    }
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      setGrades(grades.filter(g => g.id !== id));
    } else {
      Alert.alert("Hapus", "Hapus mata pelajaran ini?", [
        { text: "Batal", style: "cancel" },
        { text: "Hapus", style: "destructive", onPress: () => setGrades(grades.filter(g => g.id !== id)) },
      ]);
    }
  };

  const getRowAvg = (g: GradeEntry) => {
    const vals = [g.semester1, g.semester2, g.semester3, g.semester4, g.semester5].filter(v => v > 0);
    if (vals.length === 0) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  };

  const updateSemester = (key: string, val: string) => {
    const num = parseFloat(val) || 0;
    setForm(prev => ({ ...prev, [key]: Math.min(100, Math.max(0, num)) }));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Nilai Rapor</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>2/5</Text>
        </View>
      </View>

      <View style={styles.avgCard}>
        <Text style={styles.avgLabel}>Rata-rata Nilai</Text>
        <Text style={styles.avgValue}>{averageGrade.toFixed(2)}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {grades.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Belum ada nilai</Text>
            <Text style={styles.emptyDesc}>Tambahkan mata pelajaran dan nilai rapor semester 1-5</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tCell, styles.tCellH, { width: 140 }]}>Mata Pelajaran</Text>
                <Text style={[styles.tCell, styles.tCellH, { width: 55 }]}>Sem 1</Text>
                <Text style={[styles.tCell, styles.tCellH, { width: 55 }]}>Sem 2</Text>
                <Text style={[styles.tCell, styles.tCellH, { width: 55 }]}>Sem 3</Text>
                <Text style={[styles.tCell, styles.tCellH, { width: 55 }]}>Sem 4</Text>
                <Text style={[styles.tCell, styles.tCellH, { width: 55 }]}>Sem 5</Text>
                <Text style={[styles.tCell, styles.tCellH, { width: 55 }]}>Avg</Text>
                <Text style={[styles.tCell, styles.tCellH, { width: 70 }]}>Aksi</Text>
              </View>
              {grades.map((g, idx) => (
                <View key={g.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tCell, { width: 140 }]} numberOfLines={1}>{g.mataPelajaran}</Text>
                  <Text style={[styles.tCell, { width: 55 }]}>{g.semester1 || "-"}</Text>
                  <Text style={[styles.tCell, { width: 55 }]}>{g.semester2 || "-"}</Text>
                  <Text style={[styles.tCell, { width: 55 }]}>{g.semester3 || "-"}</Text>
                  <Text style={[styles.tCell, { width: 55 }]}>{g.semester4 || "-"}</Text>
                  <Text style={[styles.tCell, { width: 55 }]}>{g.semester5 || "-"}</Text>
                  <Text style={[styles.tCell, styles.tCellAvg, { width: 55 }]}>{getRowAvg(g)}</Text>
                  <View style={[styles.tCellActions, { width: 70 }]}>
                    <Pressable onPress={() => openEdit(g)} style={styles.tActionBtn}>
                      <Feather name="edit-2" size={14} color={Colors.info} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(g.id)} style={styles.tActionBtn}>
                      <Feather name="trash-2" size={14} color={Colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}
          onPress={openAdd}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.addBtnText}>Tambah Mapel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push("/achievements")}
        >
          <Text style={styles.nextBtnText}>Lanjut</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </Pressable>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edit Nilai" : "Tambah Mata Pelajaran"}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalBody}>
                <Text style={styles.label}>Mata Pelajaran</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Matematika"
                  placeholderTextColor={Colors.textMuted}
                  value={form.mataPelajaran}
                  onChangeText={v => setForm(prev => ({ ...prev, mataPelajaran: v }))}
                />

                {(["semester1", "semester2", "semester3", "semester4", "semester5"] as const).map((key, i) => (
                  <View key={key}>
                    <Text style={styles.label}>Semester {i + 1}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                      value={form[key] ? String(form[key]) : ""}
                      onChangeText={v => updateSemester(key, v)}
                      keyboardType="numeric"
                    />
                  </View>
                ))}

                <Pressable
                  style={({ pressed }) => [
                    styles.modalSaveBtn,
                    !form.mataPelajaran.trim() && { opacity: 0.5 },
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={handleSaveGrade}
                  disabled={!form.mataPelajaran.trim()}
                >
                  <Text style={styles.modalSaveBtnText}>
                    {editingId ? "Simpan Perubahan" : "Tambah"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  stepBadge: { backgroundColor: Colors.primary + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stepText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  avgCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avgLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  avgValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableRowAlt: { backgroundColor: Colors.surfaceElevated },
  tCell: { paddingHorizontal: 6, paddingVertical: 10, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text, textAlign: "center" },
  tCellH: { fontFamily: "Inter_600SemiBold", color: Colors.white, fontSize: 11 },
  tCellAvg: { fontFamily: "Inter_600SemiBold", color: Colors.primary },
  tCellActions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  tActionBtn: { width: 28, height: 28, borderRadius: 6, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  nextBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  modalBody: { padding: 20, gap: 12 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  modalSaveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
