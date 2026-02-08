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
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useConsultation, Achievement } from "@/lib/consultation-context";

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const TINGKAT_OPTIONS = ["Internasional", "Nasional", "Provinsi", "Kota/Kabupaten"];
const JUARA_OPTIONS = ["Juara 1", "Juara 2", "Juara 3"];

const emptyAchievement = {
  namaPrestasi: "",
  tingkat: "",
  juara: "",
};

function AchievementCard({ item, onEdit, onDelete }: { item: Achievement; onEdit: () => void; onDelete: () => void }) {
  const tingkatColor = item.tingkat === "Internasional" ? "#8B5CF6" :
    item.tingkat === "Nasional" ? Colors.info :
    item.tingkat === "Provinsi" ? Colors.success : Colors.warning;

  return (
    <View style={aStyles.card}>
      <View style={aStyles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={aStyles.cardTitle}>{item.namaPrestasi}</Text>
          <View style={aStyles.cardTags}>
            <View style={[aStyles.tag, { backgroundColor: tingkatColor + "15" }]}>
              <Text style={[aStyles.tagText, { color: tingkatColor }]}>{item.tingkat}</Text>
            </View>
            <View style={[aStyles.tag, { backgroundColor: Colors.warningLight }]}>
              <Text style={[aStyles.tagText, { color: Colors.warning }]}>{item.juara}</Text>
            </View>
          </View>
        </View>
        <View style={aStyles.cardActions}>
          <Pressable onPress={onEdit} style={aStyles.cardActionBtn}>
            <Feather name="edit-2" size={16} color={Colors.info} />
          </Pressable>
          <Pressable onPress={onDelete} style={aStyles.cardActionBtn}>
            <Feather name="trash-2" size={16} color={Colors.danger} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const aStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 8 },
  cardTags: { flexDirection: "row", gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardActions: { flexDirection: "row", gap: 6 },
  cardActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
});

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const { achievements, setAchievements } = useConsultation();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAchievement);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyAchievement });
    setModalVisible(true);
  };

  const openEdit = (a: Achievement) => {
    setEditingId(a.id);
    setForm({ namaPrestasi: a.namaPrestasi, tingkat: a.tingkat, juara: a.juara });
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!form.namaPrestasi.trim() || !form.tingkat || !form.juara) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (editingId) {
      setAchievements(achievements.map(a => a.id === editingId ? { ...form, id: editingId } : a));
    } else {
      setAchievements([...achievements, { ...form, id: generateId() }]);
    }
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      setAchievements(achievements.filter(a => a.id !== id));
    } else {
      Alert.alert("Hapus", "Hapus prestasi ini?", [
        { text: "Batal", style: "cancel" },
        { text: "Hapus", style: "destructive", onPress: () => setAchievements(achievements.filter(a => a.id !== id)) },
      ]);
    }
  };

  const isValid = form.namaPrestasi.trim() && form.tingkat && form.juara;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Prestasi Siswa</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>3/5</Text>
        </View>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AchievementCard item={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item.id)} />
        )}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 100 }]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Belum ada prestasi</Text>
            <Text style={styles.emptyDesc}>Tambahkan prestasi siswa untuk meningkatkan peluang SNBP</Text>
          </View>
        }
        scrollEnabled={achievements.length > 0}
      />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}
          onPress={openAdd}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.addBtnText}>Tambah Prestasi</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.9 }]}
          onPress={() => router.push("/selection")}
        >
          <Text style={styles.nextBtnText}>Lanjut</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </Pressable>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Prestasi" : "Tambah Prestasi"}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalBody}>
                <Text style={styles.label}>Nama Prestasi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Olimpiade Matematika"
                  placeholderTextColor={Colors.textMuted}
                  value={form.namaPrestasi}
                  onChangeText={v => setForm(p => ({ ...p, namaPrestasi: v }))}
                />

                <Text style={styles.label}>Tingkat Prestasi</Text>
                <View style={styles.optionRow}>
                  {TINGKAT_OPTIONS.map(opt => (
                    <Pressable
                      key={opt}
                      style={[styles.optionBtn, form.tingkat === opt && styles.optionBtnActive]}
                      onPress={() => { Haptics.selectionAsync(); setForm(p => ({ ...p, tingkat: opt })); }}
                    >
                      <Text style={[styles.optionText, form.tingkat === opt && styles.optionTextActive]}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Juara</Text>
                <View style={styles.optionRow}>
                  {JUARA_OPTIONS.map(opt => (
                    <Pressable
                      key={opt}
                      style={[styles.optionBtn, form.juara === opt && styles.optionBtnActive]}
                      onPress={() => { Haptics.selectionAsync(); setForm(p => ({ ...p, juara: opt })); }}
                    >
                      <Text style={[styles.optionText, form.juara === opt && styles.optionTextActive]}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [styles.modalSaveBtn, !isValid && { opacity: 0.5 }, pressed && { opacity: 0.9 }]}
                  onPress={handleSave}
                  disabled={!isValid}
                >
                  <Text style={styles.modalSaveBtnText}>{editingId ? "Simpan Perubahan" : "Tambah"}</Text>
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  stepBadge: { backgroundColor: Colors.primary + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stepText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  scrollContent: { padding: 20 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12,
    flexDirection: "row", gap: 10,
  },
  addBtn: {
    flex: 1, flexDirection: "row", backgroundColor: Colors.secondary, borderRadius: 12,
    paddingVertical: 14, alignItems: "center", justifyContent: "center", gap: 6,
  },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  nextBtn: {
    flex: 1, flexDirection: "row", backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: "center", justifyContent: "center", gap: 6,
  },
  nextBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: "flex-end" },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%" },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  modalBody: { padding: 20, gap: 12 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  optionBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "10" },
  optionText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  optionTextActive: { color: Colors.primary },
  modalSaveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  modalSaveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
