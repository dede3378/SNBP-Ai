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
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useConsultation } from "@/lib/consultation-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
}

function FormattedText({ text, style }: { text: string; style?: any }) {
  const lines = text.split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = boldParts.map((part, j) =>
          j % 2 === 1
            ? <Text key={j} style={[style, { fontFamily: "Inter_700Bold" }]}>{part}</Text>
            : <Text key={j} style={style}>{part}</Text>
        );
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

async function imageUriToBase64(uri: string, mimeType: string): Promise<string> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error("Gagal membaca gambar"));
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = () => reject(new Error("Gagal mengambil gambar"));
      xhr.open('GET', uri);
      xhr.responseType = 'blob';
      xhr.send();
    });
  } else {
    const FileSystem = await import("expo-file-system/legacy");
    return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
}

export default function ConsultationScreen() {
  const insets = useSafeAreaInsets();
  const { studentData, averageGrade, selections, masterData } = useConsultation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Halo${studentData.nama ? ` **${studentData.nama}**` : ""}! 👋 Saya Konselor SNBP AI dari Bimbel Attin.\n\nSaya siap membantu Anda menganalisis peluang SNBP, memilih jurusan terbaik, dan memberikan strategi yang tepat berdasarkan nilai rapor dan data Anda.\n\nAnda juga bisa **kirim foto** (rapor, pengumuman, soal, dll.) dan saya akan membacanya!\n\nAda yang ingin Anda tanyakan?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert("Izin akses galeri diperlukan untuk memilih foto.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';

      let base64 = asset.base64 || '';
      if (!base64 && asset.uri) {
        base64 = await imageUriToBase64(asset.uri, mimeType);
      }

      setSelectedImage({ uri: asset.uri, base64, mimeType });
    } catch (err: any) {
      console.error("Image pick error:", err);
      alert("Gagal memilih gambar: " + err.message);
    }
  };

  const removeImage = () => setSelectedImage(null);

  const sendMessage = async () => {
    const hasText = input.trim().length > 0;
    const hasImage = !!selectedImage;
    if ((!hasText && !hasImage) || loading) return;

    const messageText = hasText ? input.trim() : (hasImage ? "Tolong baca dan analisis gambar ini." : "");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      imageUri: selectedImage?.uri,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setLoading(true);

    const domain = (process.env.EXPO_PUBLIC_DOMAIN || '').replace(/:5000$/, '');
    const chatUrl = Platform.OS === 'web'
      ? '/api/chat'
      : `https://${domain}/api/chat`;

    try {
      const history = updatedMessages
        .filter(m => m.id !== "1")
        .slice(0, -1)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          message: messageText,
          imageBase64: imageToSend?.base64 || null,
          imageMimeType: imageToSend?.mimeType || null,
          history,
          context: {
            studentData,
            averageGrade,
            masterData: masterData.slice(0, 50),
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
    } catch (error: any) {
      console.error("Chat error:", error, "URL:", chatUrl);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `Gagal terhubung ke server AI.\n\nDetail: ${error?.message || String(error)}\n\nPastikan koneksi internet stabil lalu coba lagi.`,
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

  const canSend = (input.trim().length > 0 || !!selectedImage) && !loading;
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
        <View style={styles.onlineDot} />
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
              {msg.imageUri && (
                <Image
                  source={{ uri: msg.imageUri }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              )}
              {msg.content ? (
                <FormattedText
                  text={msg.content}
                  style={[
                    styles.messageText,
                    msg.role === "user" ? styles.userText : styles.aiText,
                    !!msg.imageUri && { marginTop: 6 },
                  ]}
                />
              ) : null}
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
              <Text style={styles.loadingText}>Sedang membaca...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} resizeMode="cover" />
            <Pressable onPress={removeImage} style={styles.imageRemoveBtn}>
              <Ionicons name="close-circle" size={22} color={Colors.danger} />
            </Pressable>
            <Text style={styles.imagePreviewLabel}>Foto siap dikirim</Text>
          </View>
        )}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable onPress={pickImage} style={styles.imageBtn} disabled={loading}>
            <Ionicons name="image-outline" size={22} color={selectedImage ? Colors.primary : Colors.textMuted} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder={selectedImage ? "Tambahkan pesan (opsional)..." : "Tanya atau kirim foto..."}
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onKeyPress={handleKeyPress}
          />
          <Pressable
            onPress={sendMessage}
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            disabled={!canSend}
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
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center", marginBottom: 2,
  },
  avatarText: { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.white },
  messageBubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: Colors.white, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  loadingBubble: { flexDirection: "row", gap: 8, alignItems: "center" },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  messageText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  userText: { color: Colors.white },
  aiText: { color: Colors.text },
  messageImage: {
    width: 200, height: 150, borderRadius: 10,
    marginBottom: 2,
  },
  imagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  imagePreview: { width: 48, height: 48, borderRadius: 8 },
  imageRemoveBtn: { padding: 2 },
  imagePreviewLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, flex: 1 },
  inputContainer: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  imageBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  input: {
    flex: 1, backgroundColor: "#F5F7FA", borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 120,
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  sendBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
});
