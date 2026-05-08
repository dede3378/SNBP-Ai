import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface AppUser {
  id: string;
  username: string;
  role: "admin" | "user";
  nama: string;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");

  const [editId, setEditId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editNama, setEditNama] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editSaving, setEditSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async () => {
    if (!formUsername.trim() || !formPassword.trim()) {
      alert("Username dan password wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formUsername.trim(), password: formPassword, nama: formNama.trim() || formUsername.trim(), role: formRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Gagal menambah user");
      } else {
        setFormUsername(""); setFormPassword(""); setFormNama(""); setFormRole("user");
        setShowForm(false);
        fetchUsers();
      }
    } catch {
      alert("Tidak dapat terhubung ke server");
    }
    setSaving(false);
  };

  const handleDelete = (user: AppUser) => {
    const doDelete = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/users/${user.id}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) { alert(json.error || "Gagal menghapus user"); return; }
        fetchUsers();
      } catch { alert("Tidak dapat terhubung ke server"); }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Hapus user "${user.username}"?`)) doDelete();
    } else {
      Alert.alert("Hapus User", `Hapus user "${user.username}"?`, [
        { text: "Batal", style: "cancel" },
        { text: "Hapus", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const startEdit = (user: AppUser) => {
    setEditId(user.id);
    setEditPassword("");
    setEditNama(user.nama);
    setEditRole(user.role);
  };

  const handleUpdate = async () => {
    if (!editId) return;
    setEditSaving(true);
    const updates: any = { nama: editNama, role: editRole };
    if (editPassword.trim()) updates.password = editPassword.trim();
    try {
      const res = await fetch(`${getApiUrl()}/api/users/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error || "Gagal mengubah user"); }
      else { setEditId(null); fetchUsers(); }
    } catch { alert("Tidak dapat terhubung ke server"); }
    setEditSaving(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Kelola User</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowForm(v => !v)}>
          <Ionicons name={showForm ? "close" : "person-add"} size={20} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + webBottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Tambah User Baru</Text>

            <Text style={styles.fieldLabel}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              placeholder="Nama lengkap"
              placeholderTextColor={Colors.textMuted}
              value={formNama}
              onChangeText={setFormNama}
            />

            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Username untuk login"
              placeholderTextColor={Colors.textMuted}
              value={formUsername}
              onChangeText={setFormUsername}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={formPassword}
              onChangeText={setFormPassword}
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              {(["user", "admin"] as const).map(r => (
                <Pressable
                  key={r}
                  style={[styles.roleChip, formRole === r && styles.roleChipActive]}
                  onPress={() => setFormRole(r)}
                >
                  <Text style={[styles.roleChipText, formRole === r && styles.roleChipTextActive]}>
                    {r === "admin" ? "Admin" : "User"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.saveBtnText}>Simpan User</Text>}
            </Pressable>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat data user...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Daftar User ({users.length})</Text>
            {users.map(user => (
              <View key={user.id} style={styles.userCard}>
                {editId === user.id ? (
                  <View>
                    <View style={styles.editHeader}>
                      <View style={styles.userAvatarSmall}>
                        <Ionicons name="person" size={16} color={Colors.white} />
                      </View>
                      <Text style={styles.editTitle}>Edit: {user.username}</Text>
                    </View>
                    <Text style={styles.fieldLabel}>Nama Lengkap</Text>
                    <TextInput style={styles.input} value={editNama} onChangeText={setEditNama} placeholder="Nama" placeholderTextColor={Colors.textMuted} />
                    <Text style={styles.fieldLabel}>Password Baru (kosongkan jika tidak diubah)</Text>
                    <TextInput style={styles.input} value={editPassword} onChangeText={setEditPassword} placeholder="Password baru" placeholderTextColor={Colors.textMuted} secureTextEntry />
                    <Text style={styles.fieldLabel}>Role</Text>
                    <View style={styles.roleRow}>
                      {(["user", "admin"] as const).map(r => (
                        <Pressable
                          key={r}
                          style={[styles.roleChip, editRole === r && styles.roleChipActive]}
                          onPress={() => setEditRole(r)}
                        >
                          <Text style={[styles.roleChipText, editRole === r && styles.roleChipTextActive]}>
                            {r === "admin" ? "Admin" : "User"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.editBtnRow}>
                      <Pressable style={[styles.editActionBtn, styles.cancelBtn]} onPress={() => setEditId(null)}>
                        <Text style={styles.cancelBtnText}>Batal</Text>
                      </Pressable>
                      <Pressable style={[styles.editActionBtn, styles.saveBtn, editSaving && { opacity: 0.6 }]} onPress={handleUpdate} disabled={editSaving}>
                        {editSaving ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.saveBtnText}>Simpan</Text>}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.userRow}>
                    <View style={[styles.userAvatar, { backgroundColor: user.role === "admin" ? "#C00000" : Colors.primary }]}>
                      <Ionicons name={user.role === "admin" ? "shield" : "person"} size={20} color={Colors.white} />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.nama}</Text>
                      <Text style={styles.userMeta}>@{user.username} · {user.role === "admin" ? "Admin" : "User"}</Text>
                    </View>
                    <View style={styles.userActions}>
                      <Pressable style={styles.iconBtn} onPress={() => startEdit(user)}>
                        <Ionicons name="pencil" size={16} color={Colors.primary} />
                      </Pressable>
                      {user.id !== "admin-1" && (
                        <Pressable style={[styles.iconBtn, styles.deleteBtn]} onPress={() => handleDelete(user)}>
                          <Ionicons name="trash" size={16} color={Colors.danger} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
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
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#C00000", justifyContent: "center", alignItems: "center",
  },
  scroll: { flex: 1 },
  content: { padding: 16 },
  formCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  formTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: Colors.background, borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  roleRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  roleChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: "center", backgroundColor: Colors.white,
  },
  roleChipActive: { borderColor: "#C00000", backgroundColor: "#FFF0F0" },
  roleChipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  roleChipTextActive: { color: "#C00000", fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    backgroundColor: "#C00000", borderRadius: 10, paddingVertical: 13, alignItems: "center",
    marginTop: 14,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  userCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  userAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  userAvatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#C00000", justifyContent: "center", alignItems: "center" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  userMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  userActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.primary + "15", justifyContent: "center", alignItems: "center" },
  deleteBtn: { backgroundColor: Colors.dangerLight },
  editHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  editTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  editBtnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  editActionBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtn: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
});
