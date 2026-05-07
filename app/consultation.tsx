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
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useConsultation } from "@/lib/consultation-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Simple markdown-like text renderer
function FormattedText({ text, style }: { text: string; style?: any }) {
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        // Bold: **text**
        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = boldParts.map((part, j) =>
          j % 2 === 1
            ? <Text key={j} style={[style, { fontFamily: "Inter_700Bold" }]}>{part}</Text>
            : <Text key={j} style={style}>{part}</Text>
        );

        // Bullet / numbered list
        const isBullet = /^[-•]\s/.test(line);
        const isNumbered = /^\d+\.\s/.test(line);
        const isHeader = /^#+\s/.test(line);

        const cleanLine = isHeader ? line.replace(/^#+\s/, '') : line;

        return (
          <View key={i} style={isBullet || isNumbered ? { flexDirection: 'row', marginVertical: 1 } : { marginVertical: 1 }}>
            {(isBullet || isNumbered) && (
              <Text style={[style, { marginRight: 4, fontFamily: "Inter_600SemiBold" }]}>
                {isBullet ? '•' : line.match(/^\d+\./)?.[0]}
              </Text>
            )}
            <Text style={[
              style,
              isHeader && { fontFamily: "Inter_700Bold", fontSize: 15 },
              { flex: isBullet || isNumbered ? 1 : undefined }
            ]}>
              {(isBullet || isNumbered)
                ? boldParts.map((part, j) =>
                    j % 2 === 1
                      ? <Text key={j} style={{ fontFamily: "Inter_700Bold" }}>{part}</Text>
                      : <Text key={j}>{part.replace(/^[-•]\s/, '').replace(/^\d+\.\s/, '')}</Text>
                  )
                : isHeader ? cleanLine : rendered
              }
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ConsultationScreen() {
  const insets = useSafeAreaInsets();
  const { studentData, averageGrade, selections, masterData } = useConsultation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Halo${studentData.nama ? ` **${studentData.nama}**` : ""}! 👋 Saya Konselor SNBP AI dari Bimbel Attin.\n\nSaya siap membantu Anda menganalisis peluang SNBP, memilih jurusan terbaik, dan memberikan strategi yang tepat berdasarkan nilai rapor dan data Anda.\n\nAda yang ingin Anda tanyakan?`,
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

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Build history for multi-turn context (exclude the initial greeting)
      const history = updatedMessages
        .filter(m => m.id !== "1")
        .slice(0, -1) // exclude the latest user message (sent separately)
        .map(m => ({ role: m.role, content: m.content }));

      // Strip :5000 port — Replit proxy handles routing internally; external URLs don't use that port
      const domain = (process.env.EXPO_PUBLIC_DOMAIN || '').replace(/:5000$/, '');
      const chatUrl = Platform.OS === 'web'
        ? '/api/chat'
        : `https://${domain}/api/chat`;

      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history,
          context: {
            studentData,
            averageGrade,
            masterData: masterData.slice(0, 50), // send first 50 for context
            selections: selections.filter(s => s?.programStudi),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "Maaf, saya tidak dapat memberikan jawaban saat ini.",
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Maaf, terjadi kesalahan. Pastikan koneksi internet stabil dan coba lagi.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
      e.preventDefault?.();
      sendMessage();
    }
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Konselor SNBP AI</Text>
          <Text style={styles.headerSub}>Bimbel Attin</Text>
        </View>
        <View style={[styles.onlineDot]} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.role === "user" ? styles.messageRowUser : styles.messageRowAI,
            ]}
          >
            {msg.role === "assistant" && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AI</Text>
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                msg.role === "user" ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <FormattedText
                text={msg.content}
                style={[
                  styles.messageText,
                  msg.role === "user" ? styles.userText : styles.aiText,
                ]}
              />
            </View>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageRow, styles.messageRowAI]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AI</Text>
            </View>
            <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Sedang menulis...</Text>
            </View>
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
            placeholder="Tanya tentang jurusan, peluang SNBP..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onKeyPress={handleKeyPress}
          />
          <Pressable
            onPress={sendMessage}
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Ionicons name="send" size={18} color={Colors.white} />
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, gap: 12, paddingBottom: 24 },
  messageRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAI: { justifyContent: "flex-start" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  avatarText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.white },
  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  loadingBubble: { flexDirection: "row", gap: 8, alignItems: "center" },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  messageText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  userText: { color: Colors.white },
  aiText: { color: Colors.text },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
});
