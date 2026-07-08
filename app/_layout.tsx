import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { ConsultationProvider, useConsultation } from "@/lib/consultation-context";
import { UniversityLogoProvider } from "@/lib/university-logos";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { View, Pressable, Text, StyleSheet, Alert, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function GlobalHeader() {
  const { resetConsultation, isLoggedIn, logout, currentUser } = useConsultation();
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;

  if (!isLoggedIn) return null;

  const handleNew = () => {
    if (Platform.OS === 'web') {
      const ok = (window as any).confirm("Semua data yang telah dimasukkan akan dihapus. Lanjutkan?");
      if (!ok) return;
      if (resetConsultation) resetConsultation();
      router.replace("/student");
    } else {
      Alert.alert(
        "Konsultasi Baru",
        "Semua data yang telah dimasukkan akan dihapus. Lanjutkan?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Ya, Mulai Baru",
            onPress: () => {
              if (resetConsultation) resetConsultation();
              router.replace("/student");
            },
          },
        ]
      );
    }
  };

  const handleExit = async () => {
    if (Platform.OS === 'web') {
      const ok = (window as any).confirm("Apakah Anda yakin ingin keluar?");
      if (!ok) return;
      await logout();
      window.location.href = '/';
    } else {
      Alert.alert(
        "Keluar",
        "Apakah Anda yakin ingin keluar?",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Keluar",
            style: "destructive",
            onPress: async () => {
              await logout();
              router.replace("/");
            },
          },
        ]
      );
    }
  };

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.leftGroup}>
        {currentUser && !isNarrow && (
          <Text style={headerStyles.userLabel}>
            {currentUser.role === "admin" ? "👤 " : ""}{currentUser.nama || currentUser.username}
          </Text>
        )}
      </View>
      <View style={headerStyles.rightGroup}>
        {currentUser?.role === "admin" && (
          <Pressable onPress={() => router.push("/admin")} style={headerStyles.btn}>
            <Ionicons name="people" size={16} color="#C00000" />
            {!isNarrow && <Text style={[headerStyles.btnText, { color: "#C00000" }]}>Admin</Text>}
          </Pressable>
        )}
        <Pressable onPress={handleNew} style={headerStyles.btn}>
          <Ionicons name="refresh" size={16} color={Colors.primary} />
          {!isNarrow && <Text style={headerStyles.btnText}>Baru</Text>}
        </Pressable>
        <Pressable onPress={handleExit} style={headerStyles.btn}>
          <Ionicons name="log-out-outline" size={16} color={Colors.danger} />
          {!isNarrow && <Text style={[headerStyles.btnText, { color: Colors.danger }]}>Exit</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginTop: Platform.OS === 'web' ? 0 : 40,
  },
  leftGroup: {
    flex: 1,
  },
  rightGroup: {
    flexDirection: "row",
    gap: 8,
  },
  userLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  btnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});

function RootLayoutNav() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <View style={isDesktop ? layoutStyles.desktopOuter : layoutStyles.mobileOuter}>
      <View style={isDesktop ? layoutStyles.desktopInner : layoutStyles.mobileInner}>
        <GlobalHeader />
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="upload" />
          <Stack.Screen name="student" />
          <Stack.Screen name="grades" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="selection" />
          <Stack.Screen name="analysis" />
          <Stack.Screen name="consultation" />
        </Stack>
      </View>
    </View>
  );
}

const layoutStyles = StyleSheet.create({
  mobileOuter: { flex: 1 },
  mobileInner: { flex: 1 },
  desktopOuter: {
    flex: 1,
    backgroundColor: "#e8edf3",
    alignItems: "center",
  },
  desktopInner: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <ConsultationProvider>
              <UniversityLogoProvider>
                <StatusBar style="dark" />
                <RootLayoutNav />
              </UniversityLogoProvider>
            </ConsultationProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
