import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useConsultation } from "@/lib/consultation-context";

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  onPress: () => void;
  badge?: string;
}

function MenuItem({ icon, title, desc, color, onPress, badge }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
        Platform.OS === 'web' && { cursor: 'pointer' }
      ]}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
    >
      <View style={[styles.menuIcon, { backgroundColor: color + "15" }]}>
        {icon}
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDesc}>{desc}</Text>
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { logout, masterData, studentData, grades, achievements, resetConsultation } = useConsultation();
  const webTopInset = Platform.OS === "web" ? 20 : 0;
  const webBottomInset = Platform.OS === "web" ? 20 : 0;

  const isDesktop = Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth > 768;
  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      window.location.replace('/');
    } else {
      Alert.alert("Keluar", "Apakah Anda yakin ingin keluar?", [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/");
          },
        },
      ]);
    }
  };

  const handleReset = () => {
    if (Platform.OS === "web") {
      resetConsultation();
    } else {
      Alert.alert("Reset Data", "Hapus semua data konsultasi siswa?", [
        { text: "Batal", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: resetConsultation,
        },
      ]);
    }
  };

  const hasStudentData = !!studentData.nama;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Konsultasi SNBP</Text>
          <Text style={styles.subGreeting}>Bimbel Attin</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={handleReset} style={[styles.logoutBtn, { backgroundColor: Colors.warningLight }]}>
            <Feather name="refresh-cw" size={20} color={Colors.warning} />
          </Pressable>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + webBottomInset + 20 },
          isDesktop && styles.desktopGrid
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statsRow, isDesktop && styles.desktopFullWidth]}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{masterData.length}</Text>
            <Text style={styles.statLabel}>Program Studi</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{grades.length}</Text>
            <Text style={styles.statLabel}>Mata Pelajaran</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{achievements.length}</Text>
            <Text style={styles.statLabel}>Prestasi</Text>
          </View>
        </View>

        <View style={isDesktop ? styles.gridContainer : null}>
          <View style={isDesktop ? styles.gridItem : null}>
            <Text style={styles.sectionTitle}>Data Master</Text>
            <MenuItem
              icon={<MaterialCommunityIcons name="file-upload-outline" size={24} color={Colors.info} />}
              title="Upload Data Master"
              desc="Upload file Excel Program Studi & Passing Grade"
              color={Colors.info}
              onPress={() => router.push("/upload")}
              badge={masterData.length > 0 ? `${masterData.length}` : undefined}
            />
          </View>

          <View style={isDesktop ? styles.gridItem : null}>
            <Text style={styles.sectionTitle}>Langkah Konsultasi</Text>
            <MenuItem
              icon={<Ionicons name="person-outline" size={24} color={Colors.primary} />}
              title="1. Data Siswa"
              desc="Input data diri siswa"
              color={Colors.primary}
              onPress={() => router.push("/student")}
              badge={hasStudentData ? "OK" : undefined}
            />
          </View>

          <View style={isDesktop ? styles.gridItem : null}>
            <MenuItem
              icon={<MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color={Colors.secondary} />}
              title="2. Nilai Rapor"
              desc="Input nilai semester 1-5"
              color="#62B6CB"
              onPress={() => router.push("/grades")}
              badge={grades.length > 0 ? `${grades.length}` : undefined}
            />
          </View>

          <View style={isDesktop ? styles.gridItem : null}>
            <MenuItem
              icon={<Ionicons name="trophy-outline" size={24} color={Colors.warning} />}
              title="3. Prestasi"
              desc="Input prestasi siswa"
              color={Colors.warning}
              onPress={() => router.push("/achievements")}
              badge={achievements.length > 0 ? `${achievements.length}` : undefined}
            />
          </View>

          <View style={isDesktop ? styles.gridItem : null}>
            <MenuItem
              icon={<Ionicons name="school-outline" size={24} color={Colors.success} />}
              title="4. Pilih Jurusan"
              desc="Pilih PTN dan program studi"
              color={Colors.success}
              onPress={() => router.push("/selection")}
            />
          </View>

          <View style={isDesktop ? styles.gridItem : null}>
            <MenuItem
              icon={<Feather name="bar-chart-2" size={24} color="#8B5CF6" />}
              title="5. Analisis Peluang"
              desc="Lihat hasil analisis SNBP"
              color="#8B5CF6"
              onPress={() => router.push("/analysis")}
            />
          </View>

          <View style={isDesktop ? styles.gridItem : null}>
            <MenuItem
              icon={<Ionicons name="chatbubbles-outline" size={24} color="#EC4899" />}
              title="Konsultasi AI"
              desc="Tanya asisten AI Bimbel Attin"
              color="#EC4899"
              onPress={() => router.push("/consultation")}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  greeting: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dangerLight,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  desktopGrid: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 10,
  },
  desktopFullWidth: {
    width: '100%',
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
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
  menuItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  menuDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  resetText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.danger,
  },
});
