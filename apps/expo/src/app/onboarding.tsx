import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ProfileMode } from "~/data/profile-context";
import { trpc } from "~/utils/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingData {
  mode: ProfileMode | null;
  name: string;
  birthYear: string;
  lastPeriodMonth: number | null;
  lastPeriodDay: number | null;
  cycleLength: number;
  periodLength: number;
  healthConditions: Set<string>;
  contraception: Set<string>;
  goals: Set<string>;
}

const TOTAL_STEPS = 8;

// ── Data ─────────────────────────────────────────────────────────────────────

const HEALTH_CONDITIONS = [
  { id: "sop", label: "SOP / PCOS", icon: "ellipse-outline" },
  { id: "endometriosis", label: "Endometriose", icon: "body-outline" },
  { id: "fibroid", label: "Mioma", icon: "ellipse" },
  { id: "hypothyroid", label: "Hipotireoidismo", icon: "thermometer-outline" },
  { id: "hyperthyroid", label: "Hipertireoidismo", icon: "flash-outline" },
  { id: "anemia", label: "Anemia", icon: "water-outline" },
  { id: "migraine", label: "Enxaqueca", icon: "medical-outline" },
  { id: "anxiety", label: "Ansiedade", icon: "alert-circle-outline" },
  { id: "depression", label: "Depressao", icon: "sad-outline" },
  { id: "diabetes", label: "Diabetes", icon: "nutrition-outline" },
  { id: "hypertension", label: "Hipertensao", icon: "pulse-outline" },
  { id: "fibromyalgia", label: "Fibromialgia", icon: "body-outline" },
  { id: "osteoporosis", label: "Osteoporose", icon: "fitness-outline" },
  { id: "lupus", label: "Lupus", icon: "shield-outline" },
  { id: "none", label: "Nenhuma", icon: "checkmark-circle-outline" },
];

const CONTRACEPTION_OPTIONS = [
  { id: "pill_combo", label: "Pilula combinada", icon: "ellipse-outline" },
  { id: "pill_prog", label: "Pilula s/ estrogênio", icon: "ellipse-outline" },
  { id: "iud_copper", label: "DIU de cobre", icon: "medical-outline" },
  { id: "iud_hormonal", label: "DIU hormonal", icon: "medical-outline" },
  { id: "implant", label: "Implante", icon: "hardware-chip-outline" },
  { id: "injection", label: "Injecao", icon: "fitness-outline" },
  { id: "ring", label: "Anel vaginal", icon: "radio-button-off-outline" },
  { id: "patch", label: "Adesivo", icon: "square-outline" },
  { id: "condom", label: "Camisinha", icon: "shield-checkmark-outline" },
  { id: "natural", label: "Metodo natural", icon: "leaf-outline" },
  { id: "none", label: "Nenhum", icon: "close-circle-outline" },
];

const GOALS = [
  { id: "cycle", label: "Acompanhar ciclo", icon: "refresh-outline" },
  { id: "symptoms", label: "Sintomas e dores", icon: "body-outline" },
  { id: "mood", label: "Humor e emoções", icon: "happy-outline" },
  { id: "fertility", label: "Fertilidade", icon: "star-outline" },
  { id: "sleep", label: "Qualidade do sono", icon: "moon-outline" },
  { id: "exercise", label: "Exercicio", icon: "fitness-outline" },
  { id: "weight", label: "Peso e nutrição", icon: "scale-outline" },
  { id: "sex", label: "Vida sexual", icon: "heart-outline" },
  { id: "medication", label: "Medicamentos", icon: "medkit-outline" },
  { id: "menopause", label: "Transicao hormonal", icon: "flame-outline" },
];

// ── Shared UI ─────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  // dots for steps 1-6 (skip welcome=0 and done=7)
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: 6 }, (_, i) => {
        const idx = i + 1;
        const active = idx === current;
        const past = idx < current;
        return (
          <View
            key={idx}
            style={{
              width: active ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: active ? "#8B7EC8" : past ? "#C4B8E8" : "#E5E0F5",
            }}
          />
        );
      })}
    </View>
  );
}

function StepHeader({
  step,
  onBack,
}: {
  step: number;
  onBack: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 32,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "white",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#E8E2F5",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Ionicons name="arrow-back" size={18} color="#8B7EC8" />
      </Pressable>
      <StepDots current={step} />
      <View style={{ width: 40 }} />
    </View>
  );
}

function PrimaryButton({
  label = "Continuar",
  onPress,
  disabled = false,
}: {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? "#D4CCF0" : "#8B7EC8",
        borderRadius: 18,
        paddingVertical: 17,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        shadowColor: disabled ? "transparent" : "#8B7EC8",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: disabled ? 0 : 8,
      }}
    >
      <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>{label}</Text>
     
    </Pressable>
  );
}

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  maxLength,
  autoCapitalize = "none",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  maxLength?: number;
  autoCapitalize?: "none" | "words" | "sentences";
}) {
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#9088A8", letterSpacing: 0.8, marginBottom: 8 }}>
        {label.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: value ? "#8B7EC8" : "#E8E2F5",
          paddingHorizontal: 18,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C0B8D8"
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          style={{ fontSize: 17, color: "#1E1830", paddingVertical: 15 }}
        />
      </View>
    </View>
  );
}

// ── Step 0: Welcome ───────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      {/* Dark hero */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#16112E",
          paddingHorizontal: 32,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          overflow: "hidden",
        }}
      >
        {/* Background accent circles */}
        <View
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "#9B8FCA",
            opacity: 0.08,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 40,
            left: -40,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: "#B57BAC",
            opacity: 0.07,
          }}
        />

        {/* Logo area */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: "rgba(155,143,202,0.15)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(155,143,202,0.25)",
            }}
          >
            <Ionicons name="moon" size={40} color="#9B8FCA" />
          </View>

          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={{ color: "white", fontSize: 44, fontWeight: "900", letterSpacing: -1.5 }}>
              Lumi
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 16, textAlign: "center", lineHeight: 24 }}>
              Sua saúde feminina,{"\n"}com cuidado e inteligência
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={{ gap: 12, marginBottom: 24 }}>
          {[
            { icon: "water-outline" as const, label: "Ciclo menstrual", desc: "Previsões e acompanhamento" },
            { icon: "heart-outline" as const, label: "Bem-estar", desc: "Humor, sono e sintomas" },
            { icon: "leaf-outline" as const, label: "Autocuidado", desc: "Rituais e afirmações" },
          ].map((f) => (
            <View
              key={f.icon}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(155,143,202,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={f.icon} size={17} color="#9B8FCA" />
              </View>
              <View>
                <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>{f.label}</Text>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 }}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <PrimaryButton label="Comecar agora" onPress={onNext} />
      </View>
    </View>
  );
}

// ── Step 1: Mode ──────────────────────────────────────────────────────────────

function StepMode({
  value,
  onChange,
  onNext,
}: {
  value: ProfileMode | null;
  onChange: (m: ProfileMode) => void;
  onNext: () => void;
}) {
  const MODES: {
    id: ProfileMode;
    label: string;
    description: string;
    detail: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    bg: string;
  }[] = [
    {
      id: "cycle",
      label: "Ciclo Menstrual",
      description: "Acompanhe e preveja seu ciclo",
      detail: "Ideal para quem quer entender melhor seu corpo, fertilidade e bem-estar ao longo do mês.",
      icon: "water-outline",
      color: "#9B8FCA",
      bg: "#F0EDFB",
    },
    {
      id: "perimenopause",
      label: "Perimenopausa",
      description: "Suporte para a transicao hormonal",
      detail: "Para quem está vivenciando mudanças no ciclo, ondas de calor e outras transformações do corpo.",
      icon: "flame-outline",
      color: "#B57BAC",
      bg: "#F9EEF7",
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ marginBottom: 28 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: "#1E1830", lineHeight: 34 }}>
          Como podemos{"\n"}te ajudar?
        </Text>
        <Text style={{ fontSize: 15, color: "#9088A8", marginTop: 8 }}>
          Escolha o modo que melhor descreve seu momento agora.
        </Text>
      </View>

      <View style={{ gap: 14, flex: 1 }}>
        {MODES.map((m) => {
          const active = value === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => onChange(m.id)}
              style={{
                borderRadius: 22,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: active ? m.color : "#EDE8F6",
                shadowColor: active ? m.color : "#000",
                shadowOffset: { width: 0, height: active ? 10 : 2 },
                shadowOpacity: active ? 0.25 : 0.04,
                shadowRadius: active ? 20 : 6,
                elevation: active ? 8 : 1,
              }}
            >
              {/* Colored top strip */}
              <View style={{ height: 4, backgroundColor: active ? m.color : "#EDE8F6" }} />

              <View
                style={{
                  backgroundColor: active ? m.color : "white",
                  padding: 20,
                  flexDirection: "row",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: active ? "rgba(255,255,255,0.2)" : m.bg,
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name={m.icon} size={24} color={active ? "white" : m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: active ? "white" : "#1E1830" }}>
                      {m.label}
                    </Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color="rgba(255,255,255,0.9)" />}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "rgba(255,255,255,0.8)" : m.color, marginBottom: 6 }}>
                    {m.description}
                  </Text>
                  <Text style={{ fontSize: 12, color: active ? "rgba(255,255,255,0.6)" : "#9088A8", lineHeight: 18 }}>
                    {m.detail}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 24 }}>
        <PrimaryButton onPress={onNext} disabled={!value} />
      </View>
    </View>
  );
}

// ── Step 2: Personal ──────────────────────────────────────────────────────────

function StepPersonal({
  name,
  birthYear,
  onNameChange,
  onBirthYearChange,
  onNext,
}: {
  name: string;
  birthYear: string;
  onNameChange: (v: string) => void;
  onBirthYearChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: "#1E1830", lineHeight: 34 }}>
          Sobre voce
        </Text>
        <Text style={{ fontSize: 15, color: "#9088A8", marginTop: 8 }}>
          Vamos personalizar sua experiencia no Lumi.
        </Text>
      </View>

      <View style={{ gap: 20, flex: 1 }}>
        <FieldInput
          label="Como podemos te chamar?"
          value={name}
          onChangeText={onNameChange}
          placeholder="Seu nome"
          autoCapitalize="words"
        />
        <FieldInput
          label="Ano de nascimento"
          value={birthYear}
          onChangeText={onBirthYearChange}
          placeholder="Ex: 1995"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      <PrimaryButton onPress={onNext} disabled={!name.trim() || birthYear.length < 4} />
    </View>
  );
}

// ── Step 3: Cycle info ────────────────────────────────────────────────────────

function StepCycleInfo({
  mode,
  lastPeriodMonth,
  lastPeriodDay,
  cycleLength,
  periodLength,
  onMonthChange,
  onDayChange,
  onCycleLengthChange,
  onPeriodLengthChange,
  onNext,
}: {
  mode: ProfileMode | null;
  lastPeriodMonth: number | null;
  lastPeriodDay: number | null;
  cycleLength: number;
  periodLength: number;
  onMonthChange: (m: number) => void;
  onDayChange: (d: number) => void;
  onCycleLengthChange: (n: number) => void;
  onPeriodLengthChange: (n: number) => void;
  onNext: () => void;
}) {
  const isPeri = mode === "perimenopause";
  const [periStatus, setPeriStatus] = useState<string | null>(null);
  const [periSymptoms, setPeriSymptoms] = useState<Set<string>>(new Set());
  const dontRemember = lastPeriodMonth === -1 && lastPeriodDay === 0;
  const canContinue = isPeri
    ? (dontRemember || (lastPeriodMonth !== null && lastPeriodMonth >= 0 && lastPeriodDay !== null && lastPeriodDay > 0))
    : (dontRemember || (lastPeriodMonth !== null && lastPeriodMonth >= 0 && lastPeriodDay !== null && lastPeriodDay > 0));

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ marginBottom: 28 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: "#1E1830", lineHeight: 34 }}>
          {isPeri ? "Historico menstrual" : "Seu ciclo"}
        </Text>
        <Text style={{ fontSize: 15, color: "#9088A8", marginTop: 8 }}>
          {isPeri
            ? "Isso nos ajuda a entender sua transicao hormonal."
            : "Vamos configurar as previsões do seu ciclo."}
        </Text>
      </View>

      <View style={{ gap: 24 }}>
        {/* Last period section */}
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            padding: 20,
            borderWidth: 1.5,
            borderColor: "#EDE8F6",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E1830" }}>
              {isPeri ? "Última menstruação (aprox.)" : "Início do último período"}
            </Text>
            <Pressable
              onPress={() => { onMonthChange(-1); onDayChange(0); }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: dontRemember ? "#8B7EC8" : "#F0EDFB",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: dontRemember ? "white" : "#8B7EC8" }}>
                Nao lembro
              </Text>
            </Pressable>
          </View>

          {dontRemember ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color="#8B7EC8" />
              <Text style={{ fontSize: 14, color: "#8B7EC8", fontWeight: "600" }}>
                Sem problema, podemos ajustar depois.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#9088A8", letterSpacing: 0.5, marginBottom: 8 }}>
                  MES (1–12)
                </Text>
                <View
                  style={{
                    backgroundColor: "#F8F7FD",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: lastPeriodMonth !== null && lastPeriodMonth >= 0 ? "#8B7EC8" : "#E8E2F5",
                    paddingHorizontal: 14,
                  }}
                >
                  <TextInput
                    value={lastPeriodMonth !== null && lastPeriodMonth >= 0 ? String(lastPeriodMonth + 1) : ""}
                    onChangeText={(v) => {
                      if (v === "") { onMonthChange(-2); return; }
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n >= 1 && n <= 12) onMonthChange(n - 1);
                    }}
                    placeholder="Ex: 5"
                    placeholderTextColor="#C0B8D8"
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{ fontSize: 17, color: "#1E1830", paddingVertical: 13 }}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#9088A8", letterSpacing: 0.5, marginBottom: 8 }}>
                  DIA (1–31)
                </Text>
                <View
                  style={{
                    backgroundColor: "#F8F7FD",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: lastPeriodDay !== null && lastPeriodDay > 0 ? "#8B7EC8" : "#E8E2F5",
                    paddingHorizontal: 14,
                  }}
                >
                  <TextInput
                    value={lastPeriodDay !== null && lastPeriodDay > 0 ? String(lastPeriodDay) : ""}
                    onChangeText={(v) => {
                      if (v === "") { onDayChange(-1); return; }
                      const n = parseInt(v, 10);
                      if (!isNaN(n) && n >= 1 && n <= 31) onDayChange(n);
                    }}
                    placeholder="Ex: 9"
                    placeholderTextColor="#C0B8D8"
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{ fontSize: 17, color: "#1E1830", paddingVertical: 13 }}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {isPeri && (
          <>
            {/* How are cycles now */}
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1.5,
                borderColor: "#EDE8F6",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E1830", marginBottom: 14 }}>
                Como estao seus ciclos atualmente?
              </Text>
              <View style={{ gap: 10 }}>
                {[
                  { id: "irregular", label: "Irregulares (adiantam ou atrasam muito)", icon: "shuffle-outline" as const },
                  { id: "spaced", label: "Muito espacados (a cada 2–3 meses)", icon: "calendar-outline" as const },
                  { id: "stopped_less1", label: "Parei ha menos de 1 ano", icon: "pause-circle-outline" as const },
                  { id: "stopped_more1", label: "Parei ha mais de 1 ano", icon: "stop-circle-outline" as const },
                ].map((opt) => {
                  const active = periStatus === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setPeriStatus(opt.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: active ? "#B57BAC" : "#F8F7FD",
                        borderWidth: 1.5,
                        borderColor: active ? "#B57BAC" : "#E8E2F5",
                      }}
                    >
                      <Ionicons name={opt.icon} size={18} color={active ? "white" : "#B57BAC"} />
                      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "white" : "#2E2848", flex: 1 }}>
                        {opt.label}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={18} color="white" />}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Main peri symptoms */}
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1.5,
                borderColor: "#EDE8F6",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E1830", marginBottom: 4 }}>
                Quais sintomas você tem sentido?
              </Text>
              <Text style={{ fontSize: 12, color: "#9088A8", marginBottom: 14 }}>
                Selecione todos que se aplicam.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  "Ondas de calor", "Suor noturno", "Insônia",
                  "Humor instável", "Ansiedade", "Secura vaginal",
                  "Neblina mental", "Palpitações", "Dor articular",
                ].map((s) => {
                  const active = periSymptoms.has(s);
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setPeriSymptoms(prev => {
                        const next = new Set(prev);
                        if (next.has(s)) next.delete(s); else next.add(s);
                        return next;
                      })}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: active ? "#B57BAC" : "#F8F7FD",
                        borderWidth: 1.5,
                        borderColor: active ? "#B57BAC" : "#E8E2F5",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "white" : "#5A5278" }}>
                        {s}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {!isPeri && (
          <>
            {/* Cycle length + Period length */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "white",
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: "#EDE8F6",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#1E1830", marginBottom: 4 }}>
                  Duração do ciclo
                </Text>
                <Text style={{ fontSize: 11, color: "#9088A8", marginBottom: 14, lineHeight: 16 }}>
                  Do 1° dia até o início do próximo.
                </Text>
                <View
                  style={{
                    backgroundColor: "#F8F7FD",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: cycleLength !== 28 ? "#9B8FCA" : "#E8E2F5",
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <TextInput
                    value={String(cycleLength)}
                    onChangeText={(v) => {
                      const n = parseInt(v, 10);
                      if (v === "") { onCycleLengthChange(0); return; }
                      if (!isNaN(n) && n >= 15 && n <= 60) onCycleLengthChange(n);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{ flex: 1, fontSize: 20, fontWeight: "700", color: "#1E1830", paddingVertical: 12 }}
                  />
                  <Text style={{ fontSize: 13, color: "#9088A8", fontWeight: "600" }}>dias</Text>
                </View>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: "white",
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: "#EDE8F6",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#1E1830", marginBottom: 4 }}>
                  Duração da menstruação
                </Text>
                <Text style={{ fontSize: 11, color: "#9088A8", marginBottom: 14, lineHeight: 16 }}>
                  Por quantos dias você menstrua?
                </Text>
                <View
                  style={{
                    backgroundColor: "#F8F7FD",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: periodLength !== 5 ? "#B57BAC" : "#E8E2F5",
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <TextInput
                    value={String(periodLength)}
                    onChangeText={(v) => {
                      const n = parseInt(v, 10);
                      if (v === "") { onPeriodLengthChange(0); return; }
                      if (!isNaN(n) && n >= 1 && n <= 14) onPeriodLengthChange(n);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{ flex: 1, fontSize: 20, fontWeight: "700", color: "#1E1830", paddingVertical: 12 }}
                  />
                  <Text style={{ fontSize: 13, color: "#9088A8", fontWeight: "600" }}>dias</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={{ marginTop: 28, marginBottom: 20 }}>
        <PrimaryButton onPress={onNext} disabled={!canContinue} />
      </View>
    </ScrollView>
  );
}

// ── Step 4–6: Grid selection ──────────────────────────────────────────────────

function GridSelect({
  title,
  subtitle,
  items,
  selected,
  onToggle,
  color,
  onNext,
  minSelection,
}: {
  title: string;
  subtitle: string;
  items: { id: string; label: string; icon: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  color: string;
  onNext: () => void;
  minSelection?: number;
}) {
  const canContinue = minSelection === undefined || selected.size >= minSelection;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: "#1E1830", lineHeight: 34 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 15, color: "#9088A8", marginTop: 8 }}>{subtitle}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingBottom: 20 }}>
          {items.map((item) => {
            const active = selected.has(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => onToggle(item.id)}
                style={{
                  width: "47%",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: active ? color : "white",
                  borderWidth: 1.5,
                  borderColor: active ? color : "#EDE8F6",
                  shadowColor: active ? color : "#000",
                  shadowOffset: { width: 0, height: active ? 4 : 1 },
                  shadowOpacity: active ? 0.2 : 0.04,
                  shadowRadius: active ? 8 : 3,
                  elevation: active ? 4 : 1,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: active ? "rgba(255,255,255,0.2)" : `${color}15`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                    size={15}
                    color={active ? "white" : color}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? "white" : "#2E2848",
                    flex: 1,
                    lineHeight: 16,
                  }}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <PrimaryButton onPress={onNext} disabled={!canContinue} />
    </View>
  );
}

// ── Step 7: Done ──────────────────────────────────────────────────────────────

function StepDone({
  name,
  mode,
  onComplete,
}: {
  name: string;
  mode: ProfileMode | null;
  onComplete?: () => void;
}) {
  const isPeri = mode === "perimenopause";
  const modeColor = isPeri ? "#B57BAC" : "#9B8FCA";

  return (
    <View style={{ flex: 1 }}>
      {/* Hero card */}
      <View
        style={{
          backgroundColor: "#16112E",
          borderRadius: 32,
          padding: 32,
          alignItems: "center",
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: modeColor,
            opacity: 0.1,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -20,
            left: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "#7AAEC4",
            opacity: 0.08,
          }}
        />

        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: `${modeColor}25`,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: `${modeColor}40`,
            marginBottom: 16,
          }}
        >
          <Ionicons name="checkmark-circle" size={42} color={modeColor} />
        </View>

        <Text style={{ color: "white", fontSize: 26, fontWeight: "900", textAlign: "center" }}>
          Tudo pronto{name ? `,\n${name}!` : "!"}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            textAlign: "center",
            marginTop: 10,
            lineHeight: 22,
          }}
        >
          {isPeri
            ? "O Lumi está pronto para te apoiar\nnessa fase de transformação."
            : "O Lumi está pronto para te ajudar\na conhecer melhor seu ciclo e corpo."}
        </Text>
      </View>

      {/* What you can do */}
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 22,
          padding: 20,
          gap: 14,
          flex: 1,
          borderWidth: 1.5,
          borderColor: "#EDE8F6",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#9088A8", letterSpacing: 0.8 }}>
          O QUE VOCÊ PODE FAZER
        </Text>
        {[
          { icon: "calendar-outline" as const, text: "Ver previsões no calendário", color: "#9B8FCA" },
          { icon: "create-outline" as const, text: "Registrar sintomas diariamente", color: "#7AAEC4" },
          { icon: "bar-chart-outline" as const, text: "Acompanhar seus insights", color: "#B57BAC" },
          { icon: "leaf-outline" as const, text: "Autocuidado personalizado por fase", color: "#9B8FCA" },
        ].map((item) => (
          <View key={item.icon} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: `${item.color}15`,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={item.icon} size={17} color={item.color} />
            </View>
            <Text style={{ fontSize: 14, color: "#2E2848", fontWeight: "500", flex: 1 }}>{item.text}</Text>
            <Ionicons name="chevron-forward" size={14} color="#C0B8D8" />
          </View>
        ))}
      </View>

      <View style={{ marginTop: 20 }}>
        <PrimaryButton
          label="Comecar a usar o Lumi"
          onPress={onComplete ?? (() => router.replace("/(tabs)"))}
        />
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();
  const saveProfile = useMutation(trpc.profile.upsert.mutationOptions());

  const [data, setData] = useState<OnboardingData>({
    mode: null,
    name: "",
    birthYear: "",
    lastPeriodMonth: null,
    lastPeriodDay: null,
    cycleLength: 28,
    periodLength: 5,
    healthConditions: new Set(),
    contraception: new Set(),
    goals: new Set(),
  });

  const animateStep = (next: number) => {
    const forward = next > step;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: forward ? -20 : 20, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(forward ? 20 : -20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => animateStep(step + 1);
  const goBack = () => animateStep(step - 1);

  const handleComplete = async () => {
    const today = new Date();
    let lastPeriodStart = "2000-01-01"; // sentinel: não sabe a data
    if (
      data.lastPeriodMonth !== null &&
      data.lastPeriodMonth >= 0 &&
      data.lastPeriodDay !== null &&
      data.lastPeriodDay > 0
    ) {
      const d = new Date(
        today.getFullYear(),
        data.lastPeriodMonth,
        data.lastPeriodDay,
      );
      if (d > today) d.setFullYear(today.getFullYear() - 1);
      lastPeriodStart = d.toISOString().slice(0, 10);
    }
    try {
      await saveProfile.mutateAsync({
        name: data.name,
        cycleLength: data.cycleLength,
        periodLength: data.periodLength,
        lastPeriodStart,
        mode: data.mode ?? "cycle",
        birthYear: data.birthYear ? parseInt(data.birthYear) : undefined,
      });
      await queryClient.invalidateQueries({
        queryKey: trpc.profile.get.queryKey(),
      });
    } catch {
      // profile save failed but don't block navigation
    }
    router.replace("/(tabs)");
  };

  const toggleSet = (key: "healthConditions" | "contraception" | "goals", id: string) => {
    setData((prev) => {
      const next = new Set(prev[key]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [key]: next };
    });
  };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: step === 0 ? "#16112E" : "#F8F7FD" }} edges={[]}>
      <View style={{
        flex: 1,
        paddingHorizontal: step === 0 ? 0 : 24,
        paddingTop: step === 0 ? 0 : insets.top + 16,
        paddingBottom: step === 0 ? 0 : insets.bottom + 16,
      }}>
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <StepHeader step={step} onBack={goBack} />
        )}

        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {step === 0 && <StepWelcome onNext={goNext} />}

          {step === 1 && (
            <StepMode
              value={data.mode}
              onChange={(m) => setData((p) => ({ ...p, mode: m }))}
              onNext={goNext}
            />
          )}

          {step === 2 && (
            <StepPersonal
              name={data.name}
              birthYear={data.birthYear}
              onNameChange={(v) => setData((p) => ({ ...p, name: v }))}
              onBirthYearChange={(v) => setData((p) => ({ ...p, birthYear: v }))}
              onNext={goNext}
            />
          )}

          {step === 3 && (
            <StepCycleInfo
              mode={data.mode}
              lastPeriodMonth={data.lastPeriodMonth}
              lastPeriodDay={data.lastPeriodDay}
              cycleLength={data.cycleLength}
              periodLength={data.periodLength}
              onMonthChange={(m) => setData((p) => ({ ...p, lastPeriodMonth: m }))}
              onDayChange={(d) => setData((p) => ({ ...p, lastPeriodDay: d }))}
              onCycleLengthChange={(n) => setData((p) => ({ ...p, cycleLength: n }))}
              onPeriodLengthChange={(n) => setData((p) => ({ ...p, periodLength: n }))}
              onNext={goNext}
            />
          )}

          {step === 4 && (
            <GridSelect
              title="Condições de saúde"
              subtitle="Selecione se você tem alguma dessas condições."
              items={
                data.mode === "perimenopause"
                  ? [...HEALTH_CONDITIONS].sort((a, b) => {
                      const periFirst = ["osteoporosis", "hypothyroid", "anxiety", "depression", "hypertension"];
                      return (periFirst.includes(b.id) ? 1 : 0) - (periFirst.includes(a.id) ? 1 : 0);
                    })
                  : [...HEALTH_CONDITIONS].sort((a, b) => {
                      const cycleFirst = ["sop", "endometriosis", "fibroid", "anemia", "migraine"];
                      return (cycleFirst.includes(b.id) ? 1 : 0) - (cycleFirst.includes(a.id) ? 1 : 0);
                    })
              }
              selected={data.healthConditions}
              onToggle={(id) => toggleSet("healthConditions", id)}
              color="#9B8FCA"
              onNext={goNext}
            />
          )}

          {step === 5 && (
            <GridSelect
              title="Anticoncepção"
              subtitle={
                data.mode === "perimenopause"
                  ? "Você usa algum método ou terapia hormonal?"
                  : "Qual método você usa? Pode selecionar mais de um."
              }
              items={CONTRACEPTION_OPTIONS}
              selected={data.contraception}
              onToggle={(id) => toggleSet("contraception", id)}
              color="#7AAEC4"
              onNext={goNext}
            />
          )}

          {step === 6 && (
            <GridSelect
              title="Seus objetivos"
              subtitle="O que você quer acompanhar com o Lumi?"
              items={
                data.mode === "perimenopause"
                  ? [...GOALS].sort((a, b) => {
                      const periFirst = ["menopause", "sleep", "symptoms", "mood", "exercise"];
                      return (periFirst.includes(b.id) ? 1 : 0) - (periFirst.includes(a.id) ? 1 : 0);
                    })
                  : [...GOALS].sort((a, b) => {
                      const cycleFirst = ["cycle", "symptoms", "mood", "fertility", "sleep"];
                      return (cycleFirst.includes(b.id) ? 1 : 0) - (cycleFirst.includes(a.id) ? 1 : 0);
                    })
              }
              selected={data.goals}
              onToggle={(id) => toggleSet("goals", id)}
              color="#B57BAC"
              onNext={goNext}
              minSelection={1}
            />
          )}

          {step === 7 && (
            <StepDone
              name={data.name}
              mode={data.mode}
              onComplete={handleComplete}
            />
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
