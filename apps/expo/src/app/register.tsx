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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { authClient } from "~/utils/auth";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    name.length > 0 &&
    email.length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
      });
      if (error) {
        Alert.alert("Erro ao criar conta", error.message ?? "Tente novamente.");
      } else {
        router.replace("/onboarding");
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F8F7FD" }}
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
        <View style={{ alignItems: "center", marginBottom: 36 }}>
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
            <Ionicons name="sparkles" size={32} color="#9B8FCA" />
          </View>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "900",
              color: "#1E1830",
              letterSpacing: -0.5,
            }}
          >
            Criar conta
          </Text>
          <Text style={{ fontSize: 15, color: "#9088A8", marginTop: 6 }}>
            Comece sua jornada com a Lumi
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 14, marginBottom: 24 }}>
          {/* Name */}
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#9088A8",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              NOME
            </Text>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: name ? "#8B7EC8" : "#E8E2F5",
                paddingHorizontal: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={name ? "#8B7EC8" : "#C0B8D8"}
              />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor="#C0B8D8"
                autoCapitalize="words"
                autoCorrect={false}
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#1E1830",
                  paddingVertical: 15,
                }}
              />
            </View>
          </View>

          {/* Email */}
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#9088A8",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
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
              <Ionicons
                name="mail-outline"
                size={18}
                color={email ? "#8B7EC8" : "#C0B8D8"}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor="#C0B8D8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#1E1830",
                  paddingVertical: 15,
                }}
              />
            </View>
          </View>

          {/* Password */}
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#9088A8",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
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
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={password ? "#8B7EC8" : "#C0B8D8"}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#C0B8D8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#1E1830",
                  paddingVertical: 15,
                }}
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

          {/* Confirm Password */}
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#9088A8",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              CONFIRMAR SENHA
            </Text>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: confirmPassword
                  ? confirmPassword === password
                    ? "#8B7EC8"
                    : "#E8608A"
                  : "#E8E2F5",
                paddingHorizontal: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={
                  confirmPassword
                    ? confirmPassword === password
                      ? "#8B7EC8"
                      : "#E8608A"
                    : "#C0B8D8"
                }
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repita a senha"
                placeholderTextColor="#C0B8D8"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#1E1830",
                  paddingVertical: 15,
                }}
              />
              <Pressable
                onPress={() => setShowConfirmPassword((v) => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#C0B8D8"
                />
              </Pressable>
            </View>
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <Text
                style={{
                  fontSize: 12,
                  color: "#E8608A",
                  marginTop: 6,
                  marginLeft: 4,
                }}
              >
                As senhas não coincidem
              </Text>
            )}
          </View>
        </View>

        {/* Register button */}
        <Pressable
          onPress={handleRegister}
          disabled={!canSubmit || loading || confirmPassword !== password}
          style={{
            backgroundColor:
              canSubmit && !loading && confirmPassword === password
                ? "#8B7EC8"
                : "#D4CCF0",
            borderRadius: 18,
            paddingVertical: 17,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            marginBottom: 24,
            shadowColor:
              canSubmit && confirmPassword === password
                ? "#8B7EC8"
                : "transparent",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: canSubmit && confirmPassword === password ? 8 : 0,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
            {loading ? "Criando conta..." : "Criar conta"}
          </Text>
        </Pressable>

        {/* Login link */}
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}
        >
          <Text style={{ fontSize: 14, color: "#9088A8" }}>
            Já tem uma conta?
          </Text>
          <Link href="/login" asChild>
            <Pressable>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#8B7EC8" }}
              >
                Entrar
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
