import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { router, useLocalSearchParams } from "expo-router";

import { formatDate, getPhaseInfo } from "~/data/cycle-utils";
import { useProfile } from "~/data/profile-context";
import { trpc } from "~/utils/api";

const TODAY = new Date();

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

type ChipOpt = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
};

// ── Data ─────────────────────────────────────────────────────────────────────

const FLOW_OPTIONS: ChipOpt[] = [
  { id: "none", label: "Nenhum", icon: "remove-outline", color: "#A098C0" },
  { id: "spotting", label: "Manchas", icon: "ellipse-outline", color: "#C4B8E8" },
  { id: "light", label: "Leve", icon: "water-outline", color: "#A898D8" },
  { id: "medium", label: "Medio", icon: "water", color: "#9080C8" },
  { id: "heavy", label: "Intenso", icon: "water", color: "#7060B8" },
];

const MOOD_OPTIONS: ChipOpt[] = [
  { id: "happy", label: "Feliz", icon: "happy-outline", color: "#7AAEC4" },
  { id: "calm", label: "Calma", icon: "leaf-outline", color: "#9B8FCA" },
  { id: "neutral", label: "Ok", icon: "remove-circle-outline", color: "#A098C0" },
  { id: "sad", label: "Triste", icon: "sad-outline", color: "#9B8FCA" },
  { id: "anxious", label: "Ansiosa", icon: "alert-circle-outline", color: "#7B9ECA" },
  { id: "irritated", label: "Irritada", icon: "flash-outline", color: "#8B7EC8" },
  { id: "tired", label: "Cansada", icon: "moon-outline", color: "#9088A8" },
  { id: "energized", label: "Energizada", icon: "sunny-outline", color: "#C4A840" },
  { id: "romantic", label: "Romantica", icon: "heart-outline", color: "#B57BAC" },
  { id: "focused", label: "Focada", icon: "eye-outline", color: "#7060B8" },
];

const PAIN_OPTIONS: ChipOpt[] = [
  { id: "cramps", label: "Colicas", icon: "body-outline", color: "#B57BAC" },
  { id: "headache", label: "Dor de cabeca", icon: "medical-outline", color: "#9B8FCA" },
  { id: "backpain", label: "Dor nas costas", icon: "accessibility-outline", color: "#8B7EC8" },
  { id: "bloating", label: "Inchaco", icon: "ellipse-outline", color: "#A898D8" },
  { id: "nausea", label: "Nausea", icon: "thermometer-outline", color: "#9080C8" },
  { id: "vomiting", label: "Vomito", icon: "alert-circle-outline", color: "#7A6EB8" },
  { id: "dizziness", label: "Tontura", icon: "sync-outline", color: "#B0A0C0" },
  { id: "tender_breasts", label: "Seios sensiveis", icon: "heart-circle-outline", color: "#B57BAC" },
  { id: "pelvic", label: "Dor pelvica", icon: "ellipse-outline", color: "#9B8FCA" },
  { id: "insomnia", label: "Insônia", icon: "moon-outline", color: "#9088A8" },
  { id: "fatigue", label: "Cansaco", icon: "battery-half-outline", color: "#A098C0" },
];

const PMS_OPTIONS: ChipOpt[] = [
  { id: "irritability", label: "Irritabilidade", icon: "flash-outline", color: "#9B8FCA" },
  { id: "crying", label: "Choro facil", icon: "water-outline", color: "#B57BAC" },
  { id: "sweet_cravings", label: "Desejo por doces", icon: "cafe-outline", color: "#C4A840" },
  { id: "food_cravings", label: "Desejos alimentares", icon: "restaurant-outline", color: "#9B8FCA" },
  { id: "concentration", label: "Dif. de foco", icon: "eye-off-outline", color: "#A098C0" },
  { id: "sensitivity", label: "Sensibilidade", icon: "hand-left-outline", color: "#B57BAC" },
  { id: "anxiety_pms", label: "Ansiedade", icon: "alert-circle-outline", color: "#8B7EC8" },
  { id: "retention", label: "Retencao de liquido", icon: "water", color: "#9088A8" },
];

const DISCHARGE_OPTIONS: ChipOpt[] = [
  { id: "none", label: "Nenhum", icon: "remove-outline", color: "#A098C0" },
  { id: "normal", label: "Normal", icon: "checkmark-circle-outline", color: "#7AAEC4" },
  { id: "sticky", label: "Pegajoso", icon: "ellipse", color: "#9B8FCA" },
  { id: "watery", label: "Aquoso", icon: "water-outline", color: "#7AAEC4" },
  { id: "creamy", label: "Cremoso", icon: "ellipse-outline", color: "#A898D8" },
  { id: "ovulation", label: "Ovulação", icon: "star-outline", color: "#7060B8" },
  { id: "unusual", label: "Incomum", icon: "alert-outline", color: "#B57BAC" },
];

const SLEEP_QUALITY: ChipOpt[] = [
  { id: "great", label: "Otimo", icon: "star", color: "#7AAEC4" },
  { id: "good", label: "Bom", icon: "thumbs-up-outline", color: "#9B8FCA" },
  { id: "fair", label: "Regular", icon: "remove-circle-outline", color: "#A098C0" },
  { id: "poor", label: "Ruim", icon: "thumbs-down-outline", color: "#B57BAC" },
];

const VITALITY_OPTIONS: ChipOpt[] = [
  { id: "high", label: "Alta", icon: "flash", color: "#C4A840" },
  { id: "good", label: "Boa", icon: "sunny-outline", color: "#7AAEC4" },
  { id: "normal", label: "Normal", icon: "remove-circle-outline", color: "#9B8FCA" },
  { id: "low", label: "Baixa", icon: "battery-half-outline", color: "#A098C0" },
  { id: "exhausted", label: "Exausta", icon: "battery-dead-outline", color: "#B57BAC" },
];

const SEX_OPTIONS: ChipOpt[] = [
  { id: "protected", label: "Protegida", icon: "shield-checkmark-outline", color: "#7AAEC4" },
  { id: "unprotected", label: "Sem protecao", icon: "shield-outline", color: "#B57BAC" },
  { id: "masturbation", label: "Masturbacao", icon: "heart-outline", color: "#9B8FCA" },
  { id: "high_desire", label: "Alto desejo", icon: "flame-outline", color: "#C4A840" },
  { id: "low_desire", label: "Baixo desejo", icon: "remove-circle-outline", color: "#A098C0" },
  { id: "none", label: "Nenhuma", icon: "close-circle-outline", color: "#A098C0" },
];

const SKIN_OPTIONS: ChipOpt[] = [
  { id: "good", label: "Pele boa", icon: "happy-outline", color: "#7AAEC4" },
  { id: "oily", label: "Oleosa", icon: "water", color: "#9B8FCA" },
  { id: "dry", label: "Seca", icon: "leaf-outline", color: "#A898D8" },
  { id: "acne_mild", label: "Acne leve", icon: "ellipse-outline", color: "#B57BAC" },
  { id: "acne_severe", label: "Acne intensa", icon: "ellipse", color: "#8B7EC8" },
  { id: "hair_loss", label: "Queda capilar", icon: "cut-outline", color: "#A098C0" },
  { id: "hair_shine", label: "Cabelo bonito", icon: "star-outline", color: "#7AAEC4" },
  { id: "sensitive_skin", label: "Pele sensivel", icon: "hand-right-outline", color: "#B57BAC" },
];

const DIGESTION_OPTIONS: ChipOpt[] = [
  { id: "normal", label: "Normal", icon: "checkmark-circle-outline", color: "#7AAEC4" },
  { id: "constipation", label: "Prisao de ventre", icon: "hourglass-outline", color: "#9B8FCA" },
  { id: "diarrhea", label: "Diarreia", icon: "arrow-down-outline", color: "#B57BAC" },
  { id: "gas", label: "Gases", icon: "cloud-outline", color: "#A098C0" },
  { id: "appetite_up", label: "Apetite aumentado", icon: "add-circle-outline", color: "#7AAEC4" },
  { id: "appetite_down", label: "Apetite reduzido", icon: "remove-circle-outline", color: "#A098C0" },
  { id: "heartburn", label: "Azia", icon: "flame-outline", color: "#C4A840" },
];

const EXERCISE_OPTIONS: ChipOpt[] = [
  { id: "gym", label: "Academia", icon: "barbell-outline", color: "#9B8FCA" },
  { id: "running", label: "Corrida", icon: "walk-outline", color: "#7AAEC4" },
  { id: "yoga", label: "Yoga", icon: "body-outline", color: "#B57BAC" },
  { id: "pilates", label: "Pilates", icon: "fitness-outline", color: "#A898D8" },
  { id: "walk", label: "Caminhada", icon: "footsteps-outline", color: "#7AAEC4" },
  { id: "swim", label: "Natacao", icon: "water-outline", color: "#7060B8" },
  { id: "dance", label: "Danca", icon: "musical-notes-outline", color: "#C4A840" },
  { id: "rest", label: "Descanso", icon: "moon-outline", color: "#9088A8" },
];

const SOCIAL_OPTIONS: ChipOpt[] = [
  { id: "social", label: "Social", icon: "people-outline", color: "#7AAEC4" },
  { id: "homebody", label: "Em casa", icon: "home-outline", color: "#9B8FCA" },
  { id: "work", label: "Trabalho intenso", icon: "briefcase-outline", color: "#8B7EC8" },
  { id: "party", label: "Festa", icon: "beer-outline", color: "#C4A840" },
  { id: "travel", label: "Viagem", icon: "airplane-outline", color: "#7AAEC4" },
  { id: "leisure", label: "Lazer", icon: "game-controller-outline", color: "#9B8FCA" },
  { id: "stress", label: "Estresse", icon: "alert-outline", color: "#B57BAC" },
];

const HEALTH_OPTIONS: ChipOpt[] = [
  { id: "appointment", label: "Consulta medica", icon: "medical-outline", color: "#9B8FCA" },
  { id: "exam", label: "Exame", icon: "document-text-outline", color: "#7AAEC4" },
  { id: "medication", label: "Medicacao", icon: "medkit-outline", color: "#B57BAC" },
  { id: "sick", label: "Doente", icon: "bandage-outline", color: "#A098C0" },
  { id: "pregnancy_test", label: "Teste de gravidez", icon: "flask-outline", color: "#7060B8" },
  { id: "supplement", label: "Suplemento", icon: "nutrition-outline", color: "#7AAEC4" },
  { id: "vaccine", label: "Vacina", icon: "shield-outline", color: "#9B8FCA" },
];

const CONTRACEPTION_OPTIONS: ChipOpt[] = [
  { id: "pill", label: "Pilula", icon: "ellipse-outline", color: "#9B8FCA" },
  { id: "iud", label: "DIU", icon: "medical-outline", color: "#7AAEC4" },
  { id: "injection", label: "Injecao", icon: "fitness-outline", color: "#B57BAC" },
  { id: "implant", label: "Implante", icon: "hardware-chip-outline", color: "#8B7EC8" },
  { id: "patch", label: "Adesivo", icon: "square-outline", color: "#A898D8" },
  { id: "ring", label: "Anel vaginal", icon: "radio-button-off-outline", color: "#9B8FCA" },
  { id: "condom", label: "Preservativo", icon: "shield-checkmark-outline", color: "#7AAEC4" },
  { id: "none", label: "Nenhum", icon: "close-circle-outline", color: "#A098C0" },
];

const MENOPAUSE_OPTIONS: ChipOpt[] = [
  { id: "hot_flash", label: "Onda de calor", icon: "flame-outline", color: "#C4A840" },
  { id: "night_sweat", label: "Suor noturno", icon: "moon-outline", color: "#9B8FCA" },
  { id: "vaginal_dry", label: "Secura vaginal", icon: "leaf-outline", color: "#B57BAC" },
  { id: "mood_swing", label: "Humor instavel", icon: "swap-horizontal-outline", color: "#9B8FCA" },
  { id: "irregular", label: "Ciclo irregular", icon: "shuffle-outline", color: "#A098C0" },
  { id: "palpitation", label: "Palpitacao", icon: "heart-outline", color: "#B57BAC" },
  { id: "joint_pain", label: "Dor articular", icon: "body-outline", color: "#A098C0" },
  { id: "brain_fog", label: "Nevoa mental", icon: "cloud-outline", color: "#9088A8" },
];

const PREGNANCY_OPTIONS: ChipOpt[] = [
  { id: "morning_sick", label: "Enjoo matinal", icon: "thermometer-outline", color: "#9B8FCA" },
  { id: "fetal_movement", label: "Movimentos fetais", icon: "heart-outline", color: "#B57BAC" },
  { id: "backpain_preg", label: "Dor nas costas", icon: "body-outline", color: "#A898D8" },
  { id: "swelling", label: "Inchaco", icon: "ellipse-outline", color: "#9B8FCA" },
  { id: "heartburn_preg", label: "Azia", icon: "flame-outline", color: "#C4A840" },
  { id: "fatigue_preg", label: "Cansaco intenso", icon: "battery-dead-outline", color: "#B57BAC" },
  { id: "good_day", label: "Dia otimo", icon: "sunny-outline", color: "#7AAEC4" },
  { id: "braxton", label: "Contracao Braxton", icon: "pulse-outline", color: "#9B8FCA" },
];

// ── Reusable components ───────────────────────────────────────────────────────

function SectionHeader({
  title,
  icon,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
      }}
    >
      <Ionicons name={icon} size={17} color="#8B7EC8" />
      <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E1830" }}>
        {title}
      </Text>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {children}
    </View>
  );
}

function MultiChips({
  options,
  selected,
  onToggle,
  accentColor = "#8B7EC8",
}: {
  options: ChipOpt[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  accentColor?: string;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = selected.has(opt.id);
        return (
          <Pressable
            key={opt.id}
            onPress={() => onToggle(opt.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: active ? opt.color : "white",
              borderWidth: 1.5,
              borderColor: active ? opt.color : "#E5E0F5",
            }}
          >
            <Ionicons
              name={opt.icon}
              size={13}
              color={active ? "white" : opt.color}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: active ? "white" : "#5A5278",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SingleChips({
  options,
  selected,
  onSelect,
}: {
  options: ChipOpt[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = selected === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(active ? null : opt.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 20,
              backgroundColor: active ? opt.color : "white",
              borderWidth: 1.5,
              borderColor: active ? opt.color : "#E5E0F5",
            }}
          >
            <Ionicons
              name={opt.icon}
              size={13}
              color={active ? "white" : opt.color}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: active ? "white" : "#5A5278",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

function makeSet() {
  return new Set<string>();
}

export default function LogScreen() {
  const { cycleData } = useProfile();
  const phaseInfo = getPhaseInfo(cycleData.phase);
  const queryClient = useQueryClient();

  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const todayStr = localDateStr();
  const effectiveDate = (typeof dateParam === "string" && dateParam) ? dateParam : todayStr;
  const isHistorical = effectiveDate !== todayStr;

  const logQuery = useQuery(trpc.log.byDate.queryOptions({ date: effectiveDate }));
  const isEditing = !!logQuery.data;

  const saveLogMutation = useMutation({
    ...trpc.log.save.mutationOptions(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.log.history.queryKey({ days: 365 }) }),
        queryClient.invalidateQueries({ queryKey: trpc.log.history.queryKey({ days: 180 }) }),
        ...(!isHistorical
          ? [queryClient.invalidateQueries({ queryKey: trpc.log.today.queryKey({ date: todayStr }) })]
          : []),
      ]);
      router.replace(isHistorical ? "/(tabs)/calendar" : "/(tabs)/");
    },
    onError: () => {
      Alert.alert("Erro", "Nao foi possivel salvar o registro.");
    },
  });

  // Selections
  const [flow, setFlow] = useState<string | null>(null);
  const [moods, setMoods] = useState(makeSet());
  const [pains, setPains] = useState(makeSet());
  const [pms, setPms] = useState(makeSet());
  const [discharge, setDischarge] = useState<string | null>(null);
  const [sleepQuality, setSleepQuality] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [vitality, setVitality] = useState<string | null>(null);
  const [sex, setSex] = useState(makeSet());
  const [skin, setSkin] = useState(makeSet());
  const [digestion, setDigestion] = useState(makeSet());
  const [exercise, setExercise] = useState(makeSet());
  const [social, setSocial] = useState(makeSet());
  const [health, setHealth] = useState(makeSet());
  const [contraception, setContraception] = useState(makeSet());
  const [menopause, setMenopause] = useState(makeSet());
  const [pregnancy, setPregnancy] = useState(makeSet());
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  // Load existing log for the effective date
  useEffect(() => {
    const d = logQuery.data;
    if (!d) return;
    if (d.flow) setFlow(d.flow);
    if (d.moods?.length) setMoods(new Set(d.moods as string[]));
    if (d.pains?.length) setPains(new Set(d.pains as string[]));
    if (d.pms?.length) setPms(new Set(d.pms as string[]));
    if (d.discharge) setDischarge(d.discharge);
    if (d.sleepQuality) setSleepQuality(d.sleepQuality);
    if (d.sleepHours) setSleepHours(d.sleepHours);
    if (d.vitality) setVitality(d.vitality);
    if (d.sex?.length) setSex(new Set(d.sex as string[]));
    if (d.skin?.length) setSkin(new Set(d.skin as string[]));
    if (d.digestion?.length) setDigestion(new Set(d.digestion as string[]));
    if (d.exercise?.length) setExercise(new Set(d.exercise as string[]));
    if (d.social?.length) setSocial(new Set(d.social as string[]));
    if (d.health?.length) setHealth(new Set(d.health as string[]));
    if (d.contraception?.length)
      setContraception(new Set(d.contraception as string[]));
    if (d.menopause?.length) setMenopause(new Set(d.menopause as string[]));
    if (d.pregnancy?.length) setPregnancy(new Set(d.pregnancy as string[]));
    if (d.weight) setWeight(String(d.weight));
    if (d.notes) setNotes(d.notes);
  }, [logQuery.data]);

  const toggleSet =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) =>
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });

  const handleSave = () => {
    saveLogMutation.mutate({
      date: effectiveDate,
      flow,
      moods: Array.from(moods),
      pains: Array.from(pains),
      pms: Array.from(pms),
      discharge,
      sleepQuality,
      sleepHours,
      vitality,
      sex: Array.from(sex),
      skin: Array.from(skin),
      digestion: Array.from(digestion),
      exercise: Array.from(exercise),
      social: Array.from(social),
      health: Array.from(health),
      contraception: Array.from(contraception),
      menopause: Array.from(menopause),
      pregnancy: Array.from(pregnancy),
      weight: weight ? parseFloat(weight) : null,
      notes: notes || null,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F7FD" }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#1E1830" }}>
              {isEditing ? "Editar registro" : isHistorical ? "Registrar dia" : "Registrar"}
            </Text>
            {isEditing && !isHistorical && (
              <View style={{ backgroundColor: "#EDE8FB", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#8B7EC8" }}>hoje</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 13, color: "#9088A8", marginTop: 2 }}>
            {isHistorical
              ? formatDate(new Date(effectiveDate + "T00:00:00"))
              : formatDate(TODAY)}
          </Text>
        </View>

        {/* Phase banner */}
        <View
          style={{
            backgroundColor: phaseInfo.bgColor,
            borderRadius: 16,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={phaseInfo.color}
          />
          <Text
            style={{
              fontSize: 13,
              color: phaseInfo.darkColor,
              marginLeft: 8,
              flex: 1,
            }}
          >
            {phaseInfo.description}
          </Text>
        </View>

        {/* ── Fluxo ── */}
        <SectionCard>
          <SectionHeader title="Fluxo" icon="water-outline" />
          <View style={{ flexDirection: "row", gap: 6 }}>
            {FLOW_OPTIONS.map((opt) => {
              const active = flow === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setFlow(active ? null : opt.id)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 12,
                    borderRadius: 14,
                    backgroundColor: active ? opt.color : "#F8F7FD",
                    borderWidth: 1.5,
                    borderColor: active ? opt.color : "#E5E0F5",
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={active ? "white" : opt.color}
                  />
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "600",
                      color: active ? "white" : "#5A5278",
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* ── Humor ── */}
        <SectionCard>
          <SectionHeader title="Humor" icon="happy-outline" />
          <MultiChips
            options={MOOD_OPTIONS}
            selected={moods}
            onToggle={toggleSet(setMoods)}
          />
        </SectionCard>

        {/* ── Sintomas e Dores ── */}
        <SectionCard>
          <SectionHeader title="Sintomas e Dores" icon="body-outline" />
          <MultiChips
            options={PAIN_OPTIONS}
            selected={pains}
            onToggle={toggleSet(setPains)}
          />
        </SectionCard>

        {/* ── TPM ── */}
        <SectionCard>
          <SectionHeader title="TPM" icon="flash-outline" />
          <MultiChips
            options={PMS_OPTIONS}
            selected={pms}
            onToggle={toggleSet(setPms)}
          />
        </SectionCard>

        {/* ── Corrimento ── */}
        <SectionCard>
          <SectionHeader title="Corrimento" icon="ellipse-outline" />
          <SingleChips
            options={DISCHARGE_OPTIONS}
            selected={discharge}
            onSelect={setDischarge}
          />
        </SectionCard>

        {/* ── Sono ── */}
        <SectionCard>
          <SectionHeader title="Sono" icon="moon-outline" />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#9088A8",
              marginBottom: 10,
            }}
          >
            Qualidade
          </Text>
          <SingleChips
            options={SLEEP_QUALITY}
            selected={sleepQuality}
            onSelect={setSleepQuality}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#9088A8",
              marginTop: 14,
              marginBottom: 10,
            }}
          >
            Horas de sono
          </Text>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
              const active = sleepHours === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => setSleepHours(active ? null : h)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? "#8B7EC8" : "#F8F7FD",
                    borderWidth: 1.5,
                    borderColor: active ? "#8B7EC8" : "#E5E0F5",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: active ? "white" : "#5A5278",
                    }}
                  >
                    {h}h
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* ── Vitalidade ── */}
        <SectionCard>
          <SectionHeader title="Vitalidade" icon="sunny-outline" />
          <SingleChips
            options={VITALITY_OPTIONS}
            selected={vitality}
            onSelect={setVitality}
          />
        </SectionCard>

        {/* ── Vida Sexual ── */}
        <SectionCard>
          <SectionHeader title="Vida Sexual" icon="heart-outline" />
          <MultiChips
            options={SEX_OPTIONS}
            selected={sex}
            onToggle={toggleSet(setSex)}
          />
        </SectionCard>

        {/* ── Pele & Cabelo ── */}
        <SectionCard>
          <SectionHeader title="Pele & Cabelo" icon="sparkles-outline" />
          <MultiChips
            options={SKIN_OPTIONS}
            selected={skin}
            onToggle={toggleSet(setSkin)}
          />
        </SectionCard>

        {/* ── Digestao ── */}
        <SectionCard>
          <SectionHeader title="Digestao & Banheiro" icon="nutrition-outline" />
          <MultiChips
            options={DIGESTION_OPTIONS}
            selected={digestion}
            onToggle={toggleSet(setDigestion)}
          />
        </SectionCard>

        {/* ── Exercicio ── */}
        <SectionCard>
          <SectionHeader title="Exercicio" icon="fitness-outline" />
          <MultiChips
            options={EXERCISE_OPTIONS}
            selected={exercise}
            onToggle={toggleSet(setExercise)}
          />
        </SectionCard>

        {/* ── Vida Social ── */}
        <SectionCard>
          <SectionHeader title="Vida Social & Lazer" icon="people-outline" />
          <MultiChips
            options={SOCIAL_OPTIONS}
            selected={social}
            onToggle={toggleSet(setSocial)}
          />
        </SectionCard>

        {/* ── Saúde ── */}
        <SectionCard>
          <SectionHeader title="Saúde" icon="medkit-outline" />
          <MultiChips
            options={HEALTH_OPTIONS}
            selected={health}
            onToggle={toggleSet(setHealth)}
          />
        </SectionCard>

        {/* ── Anticoncepcao ── */}
        <SectionCard>
          <SectionHeader title="Anticoncepcao" icon="shield-checkmark-outline" />
          <MultiChips
            options={CONTRACEPTION_OPTIONS}
            selected={contraception}
            onToggle={toggleSet(setContraception)}
          />
        </SectionCard>

        {/* ── Menopausa / Perimenopausa ── */}
        <SectionCard>
          <SectionHeader title="Menopausa & Perimenopausa" icon="flame-outline" />
          <MultiChips
            options={MENOPAUSE_OPTIONS}
            selected={menopause}
            onToggle={toggleSet(setMenopause)}
          />
        </SectionCard>

        {/* ── Gravidez ── */}
        <SectionCard>
          <SectionHeader title="Experiencias da Gravidez" icon="rose-outline" />
          <MultiChips
            options={PREGNANCY_OPTIONS}
            selected={pregnancy}
            onToggle={toggleSet(setPregnancy)}
          />
        </SectionCard>

        {/* ── Peso ── */}
        <SectionCard>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="scale-outline" size={17} color="#8B7EC8" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E1830", flex: 1 }}>
              Peso
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#F8F7FD",
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "#E5E0F5",
                paddingHorizontal: 12,
                paddingVertical: 6,
                gap: 4,
              }}
            >
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="--"
                placeholderTextColor="#B0A8C8"
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#1E1830",
                  minWidth: 40,
                  textAlign: "center",
                }}
              />
              <Text style={{ fontSize: 13, color: "#9088A8" }}>kg</Text>
            </View>
          </View>
        </SectionCard>

        {/* ── Notas ── */}
        <SectionCard>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Ionicons name="create-outline" size={17} color="#8B7EC8" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E1830" }}>
              Notas
            </Text>
          </View>
          <TextInput
            multiline
            numberOfLines={4}
            placeholder="Como foi seu dia? Algum pensamento, sensacao ou observacao..."
            placeholderTextColor="#B0A8C8"
            value={notes}
            onChangeText={setNotes}
            style={{
              fontSize: 14,
              color: "#1E1830",
              lineHeight: 22,
              minHeight: 90,
              textAlignVertical: "top",
            }}
          />
        </SectionCard>

        {/* ── Save ── */}
        <Pressable
          onPress={handleSave}
          disabled={saveLogMutation.isPending}
          style={{
            backgroundColor: saveLogMutation.isPending ? "#C4B8E8" : "#8B7EC8",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            marginTop: 8,
            shadowColor: "#8B7EC8",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
            {saveLogMutation.isPending ? "Salvando..." : isEditing ? "Atualizar registro" : "Salvar registro"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
