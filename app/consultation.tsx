import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useConsultation } from "@/lib/consultation-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ConsultationScreen() {
  const insets = useSafeAreaInsets();
  const { studentData, averageGrade, selections, masterData } = useConsultation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Halo ${studentData.nama || "Siswa"}! Saya asisten AI Konsultasi SNBP. Ada yang bisa saya bantu terkait pilihan jurusan atau strategi SNBP Anda?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Use absolute URL for Replit environment
      const apiUrl = Platform.OS === "web" ? "/api/chat" : "https://" + process.env.EXPO_PUBLIC_DOMAIN + "/api/chat";
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            studentData,
            averageGrade,
            masterData: masterData || [], // Include master data for server-side context
            selections: selections.filter(s => s?.programStudi),
            passingGrades: selections.filter(s => s?.programStudi).map(s => ({
              prodi: s.programStudi,
              pg: s.passingGrade
            }))
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error detail:", errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("JSON Parse error. Raw response:", text);
        throw new Error("Format respon server tidak valid (Bukan JSON)");
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "Maaf, saya tidak dapat memberikan jawaban saat ini.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Maaf, terjadi kesalahan saat menghubungi asisten AI. Pastikan server berjalan dan coba lagi.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Konsultasi AI</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === "user" ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === "user" ? styles.userText : styles.aiText,
              ]}
            >
              {msg.content}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            style={styles.input}
            placeholder="Tanyakan sesuatu..."
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            onPress={sendMessage}
            style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  chatArea: { flex: 1 },
  chatContent: { padding: 16, gap: 12 },
  messageBubble: { maxWidth: "80%", padding: 12, borderRadius: 16 },
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.primary },
  aiBubble: { alignSelf: "flex-start", backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  messageText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userText: { color: Colors.white },
  aiText: { color: Colors.text },
  inputContainer: {
    flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  input: {
    flex: 1, backgroundColor: Colors.background, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center",
  },
});
