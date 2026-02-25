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
import { View, Pressable, Text, StyleSheet, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function GlobalHeader() {
  const { resetConsultation, isLoggedIn, logout } = useConsultation();

  if (!isLoggedIn) return null;

  const handleNew = () => {
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
          }
        }
      ]
    );
  };

  const handleExit = () => {
    Alert.alert(
      "Keluar",
      "Apakah Anda yakin ingin keluar?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Keluar", 
          onPress: () => {
            if (typeof logout === 'function') {
              logout();
            }
            if (Platform.OS === 'web') {
              // Redirecting to root and then using a clean state is safer
              router.replace("/");
              setTimeout(() => {
                window.location.reload();
              }, 100);
            } else {
              router.replace("/");
            }
          } 
        }
      ]
    );
  };

  return (
    <View style={headerStyles.container}>
      <Pressable onPress={handleNew} style={headerStyles.btn}>
        <Ionicons name="refresh" size={18} color={Colors.primary} />
        <Text style={headerStyles.btnText}>Baru</Text>
      </Pressable>
      <Pressable onPress={handleExit} style={headerStyles.btn}>
        <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
        <Text style={[headerStyles.btnText, { color: Colors.danger }]}>Exit</Text>
      </Pressable>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginTop: Platform.OS === 'web' ? 0 : 40,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
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
  return (
    <>
      <GlobalHeader />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="upload" />
        <Stack.Screen name="student" />
        <Stack.Screen name="grades" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="selection" />
        <Stack.Screen name="analysis" />
        <Stack.Screen name="consultation" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
