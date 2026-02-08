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
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useConsultation, StudentData } from "@/lib/consultation-context";

const AKREDITASI_OPTIONS = ["A", "B", "C"];
const TIPE_OPTIONS = ["SMA", "MA", "SMK"];
const JURUSAN_OPTIONS = ["IPA/Saintek", "IPS/Soshum", "Campuran"];

function DropdownPicker({ label, options, value, placeholder, onChange }: {
  label: string;
  options: string[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.dropdownBtn, !!value && styles.dropdownBtnFilled]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.dropdownText, !!value && styles.dropdownTextFilled]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={item => item}
              scrollEnabled={options.length > 6}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.modalItem,
                    value === item && styles.modalItemActive,
                    pressed && { backgroundColor: Colors.background },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onChange(item);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, value === item && styles.modalItemTextActive]}>
                    {item}
                  </Text>
                  {value === item && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function StudentScreen() {
  const insets = useSafeAreaInsets();
  const { studentData, setStudentData } = useConsultation();
  const [form, setForm] = useState<StudentData>({ ...studentData });
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const updateField = (key: keyof StudentData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const isValid = form.nama.trim() && form.asalSekolah.trim() && form.akreditasi && form.tipeSekolah && (form.tipeSekolah === "SMK" || form.jurusanSekolah);

  const handleSave = () => {
    if (!isValid) return;
    setStudentData(form);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === "web") {
      router.push("/grades");
    } else {
      Alert.alert("Tersimpan", "Data siswa berhasil disimpan", [
        { text: "Lanjut ke Nilai Rapor", onPress: () => router.push("/grades") },
        { text: "Kembali", onPress: () => router.back() },
      ]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Data Siswa</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>1/5</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nama Siswa</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan nama lengkap"
            placeholderTextColor={Colors.textMuted}
            value={form.nama}
            onChangeText={v => updateField("nama", v)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Asal Sekolah</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan nama sekolah"
            placeholderTextColor={Colors.textMuted}
            value={form.asalSekolah}
            onChangeText={v => updateField("asalSekolah", v)}
          />
        </View>

        <DropdownPicker
          label="Akreditasi Sekolah"
          options={AKREDITASI_OPTIONS}
          value={form.akreditasi}
          placeholder="Pilih akreditasi"
          onChange={v => updateField("akreditasi", v)}
        />

        <DropdownPicker
          label="Tipe Sekolah"
          options={TIPE_OPTIONS}
          value={form.tipeSekolah}
          placeholder="Pilih tipe sekolah"
          onChange={v => {
            setForm(prev => ({
              ...prev,
              tipeSekolah: v,
              jurusanSekolah: v === "SMK" ? "" : prev.jurusanSekolah
            }));
          }}
        />

        {(form.tipeSekolah === "SMA" || form.tipeSekolah === "MA") && (
          <DropdownPicker
            label="Jurusan Sekolah"
            options={JURUSAN_OPTIONS}
            value={form.jurusanSekolah}
            placeholder="Pilih jurusan"
            onChange={v => updateField("jurusanSekolah", v)}
          />
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 12 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            !isValid && styles.saveBtnDisabled,
            pressed && isValid && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleSave}
          disabled={!isValid}
        >
          <Text style={styles.saveBtnText}>Simpan & Lanjut</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.white} />
        </Pressable>
      </View>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  stepBadge: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stepText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownBtnFilled: {
    borderColor: Colors.primary + "40",
    backgroundColor: Colors.primary + "06",
  },
  dropdownText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  dropdownTextFilled: {
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "50%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalItemActive: {
    backgroundColor: Colors.primary + "08",
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  modalItemTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
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
  },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
