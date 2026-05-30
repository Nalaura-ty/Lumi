import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";

import { authClient } from "~/utils/auth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        Alert.alert("Erro ao entrar", error.message ?? "Tente novamente.");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email.length > 0 && password.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F7FD" }} edges={[]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#16112E",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                shadowColor: "#16112E",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Ionicons name="moon" size={32} color="#9B8FCA" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: "900", color: "#1E1830", letterSpacing: -0.5 }}>
              Bem-vinda de volta
            </Text>
            <Text style={{ fontSize: 15, color: "#9088A8", marginTop: 6 }}>
              Entre na sua conta Lumi
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 14, marginBottom: 24 }}>
            {/* Email */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#9088A8", letterSpacing: 0.8, marginBottom: 8 }}>
                E-MAIL
              </Text>
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: email ? "#8B7EC8" : "#E8E2F5",
                  paddingHorizontal: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Ionicons name="mail-outline" size={18} color={email ? "#8B7EC8" : "#C0B8D8"} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  placeholderTextColor="#C0B8D8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ flex: 1, fontSize: 16, color: "#1E1830", paddingVertical: 15 }}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#9088A8", letterSpacing: 0.8, marginBottom: 8 }}>
                SENHA
              </Text>
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: password ? "#8B7EC8" : "#E8E2F5",
                  paddingHorizontal: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Ionicons name="lock-closed-outline" size={18} color={password ? "#8B7EC8" : "#C0B8D8"} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Sua senha"
                  placeholderTextColor="#C0B8D8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={{ flex: 1, fontSize: 16, color: "#1E1830", paddingVertical: 15 }}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#C0B8D8"
                  />
                </Pressable>
              </View>
            </View>

            {/* Forgot password */}
            <Pressable style={{ alignSelf: "flex-end" }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#8B7EC8" }}>
                Esqueceu sua senha?
              </Text>
            </Pressable>
          </View>

          {/* Login button */}
          <Pressable
            onPress={handleLogin}
            disabled={!canSubmit || loading}
            style={{
              backgroundColor: canSubmit && !loading ? "#8B7EC8" : "#D4CCF0",
              borderRadius: 18,
              paddingVertical: 17,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginBottom: 32,
              shadowColor: canSubmit ? "#8B7EC8" : "transparent",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: canSubmit ? 8 : 0,
            }}
          >
            {loading ? (
              <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Entrando...</Text>
            ) : (
              <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Entrar</Text>
            )}
          </Pressable>

          {/* Sign up link */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
            <Text style={{ fontSize: 14, color: "#9088A8" }}>Nao tem uma conta?</Text>
            <Link href="/register" asChild>
              <Pressable>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#8B7EC8" }}>Criar conta</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
