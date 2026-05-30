import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { CalendarDay, CyclePhase } from "~/data/cycle-utils";
import {
  formatMonthYear,
  getCalendarDays,
  getPhaseInfo,
} from "~/data/cycle-utils";
import { useProfile } from "~/data/profile-context";
import { trpc } from "~/utils/api";

const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const PHASE_LEGEND = [
  { phase: "menstrual" as CyclePhase, label: "Menstruação" },
  { phase: "follicular" as CyclePhase, label: "Folicular" },
  { phase: "ovulation" as CyclePhase, label: "Ovulação" },
  { phase: "luteal" as CyclePhase, label: "Lutea" },
];

function DayCell({
  day,
  hasLog,
  hasFlow,
  showPhase,
  onPress,
}: {
  day: CalendarDay;
  hasLog: boolean;
  hasFlow: boolean;
  showPhase: boolean;
  onPress?: () => void;
}) {
  if (day.empty) {
    return <View style={{ flex: 1 }} />;
  }

  const info = getPhaseInfo(day.phase);

  let bg = "transparent";
  if (hasFlow) {
    bg = info.color;
  } else if (hasLog) {
    bg = `${info.color}18`;
  } else if (showPhase) {
    if (day.isPeriod) bg = `${info.color}40`;
    else if (day.isOvulation) bg = "#7060B8";
    else if (day.isFertile) bg = `${info.color}50`;
    else if (day.phase === "follicular" || day.phase === "luteal")
      bg = `${info.color}25`;
  }

  const textColor =
    hasFlow || (showPhase && day.isOvulation && !hasLog) ? "white" : "#1E1830";

  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, alignItems: "center", paddingVertical: 3 }}
    >
      <View style={{ width: 36, height: 36 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: day.isToday ? 2 : 0,
            borderColor: day.isToday ? "#8B7EC8" : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: day.isToday ? "800" : "500",
              color: day.isToday && !hasFlow ? "#8B7EC8" : textColor,
            }}
          >
            {day.day}
          </Text>
        </View>
        {hasLog && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: info.color,
              borderWidth: 1.5,
              borderColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark" size={8} color="white" />
          </View>
        )}
      </View>
      {showPhase && day.isOvulation && !hasLog && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#7060B8",
            marginTop: 2,
          }}
        />
      )}
      {/* Gotinha vermelha nos dias com fluxo registrado */}
      {hasFlow && (
        <Ionicons
          name="water"
          size={11}
          color="#E05C7A"
          style={{ marginTop: 1 }}
        />
      )}
    </Pressable>
  );
}

function Legend() {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 24,
      }}
    >
      {PHASE_LEGEND.map(({ phase, label }) => {
        const info = getPhaseInfo(phase);
        return (
          <View
            key={phase}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: info.color,
              }}
            />
            <Text style={{ fontSize: 12, color: "#5A5278" }}>{label}</Text>
          </View>
        );
      })}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: "#8B7EC8",
          }}
        />
        <Text style={{ fontSize: 12, color: "#5A5278" }}>Hoje</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: "#9B8FCA20",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="checkmark" size={9} color="#8B7EC8" />
        </View>
        <Text style={{ fontSize: 12, color: "#5A5278" }}>Registrado</Text>
      </View>
    </View>
  );
}

function UpcomingCycles({
  baseYear,
  baseMonth,
  lastPeriodStart,
  cycleLength,
  periodLength,
}: {
  baseYear: number;
  baseMonth: number;
  lastPeriodStart: Date;
  cycleLength: number;
  periodLength: number;
}) {
  const upcoming = [];
  let periodStart = new Date(lastPeriodStart);

  while (
    periodStart.getFullYear() * 12 + periodStart.getMonth() <=
    baseYear * 12 + baseMonth
  ) {
    periodStart = new Date(
      periodStart.getTime() + cycleLength * 24 * 60 * 60 * 1000,
    );
  }

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Marco",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  for (let i = 0; i < 3; i++) {
    const end = new Date(
      periodStart.getTime() + (periodLength - 1) * 24 * 60 * 60 * 1000,
    );
    upcoming.push({
      id: i,
      month: monthNames[periodStart.getMonth()],
      startDay: periodStart.getDate(),
      endDay: end.getDate(),
    });
    periodStart = new Date(
      periodStart.getTime() + cycleLength * 24 * 60 * 60 * 1000,
    );
  }

  return (
    <View>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#1E1830",
          marginBottom: 12,
        }}
      >
        Previsao de ciclos
      </Text>
      <View style={{ gap: 8 }}>
        {upcoming.map((c) => (
          <View
            key={c.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "white",
              borderRadius: 14,
              padding: 14,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#EDE8FB",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="ellipse" size={14} color="#8B7EC8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#1E1830" }}
              >
                {c.month}
              </Text>
              <Text style={{ fontSize: 12, color: "#9088A8" }}>
                Dias {c.startDay} a {c.endDay}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: "#A098C0" }}>previsão</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const FLOW_LABELS: Record<string, string> = {
  light: "Leve",
  medium: "Moderado",
  heavy: "Intenso",
  spotting: "Manchas",
};
const VITALITY_LABELS: Record<string, string> = {
  high: "Alta",
  good: "Boa",
  normal: "Normal",
  low: "Baixa",
  exhausted: "Exausta",
};
const MOOD_LABELS: Record<string, string> = {
  happy: "Feliz",
  calm: "Calma",
  neutral: "Ok",
  grateful: "Grata",
  confident: "Confiante",
  motivated: "Motivada",
  creative: "Criativa",
  romantic: "Romântica",
  sad: "Triste",
  anxious: "Ansiosa",
  irritated: "Irritada",
  overwhelmed: "Sobrecarregada",
  tired: "Cansada",
  energized: "Energizada",
  focused: "Focada",
  lonely: "Solitária",
  insecure: "Insegura",
  angry: "Com raiva",
  apathetic: "Apática",
  emotional: "Emotiva",
  stressed: "Estressada",
  unfocused: "Dispersa",
};
const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "Cólicas",
  headache: "Dor de cabeça",
  backpain: "Dor nas costas",
  bloating: "Inchaço",
  nausea: "Náusea",
  vomiting: "Vômito",
  dizziness: "Tontura",
  tender_breasts: "Seios sensíveis",
  pelvic: "Dor pélvica",
  insomnia: "Insônia",
  fatigue: "Cansaço",
  irritability: "Irritabilidade",
  crying: "Choro fácil",
  sweet_cravings: "Desejo por doces",
  food_cravings: "Desejos alimentares",
  concentration: "Dif. de foco",
  sensitivity: "Sensibilidade",
  anxiety_pms: "Ansiedade",
  retention: "Retenção de líquido",
  hot_flash: "Onda de calor",
  night_sweat: "Suor noturno",
  vaginal_dry: "Secura vaginal",
  mood_swing: "Humor instável",
  irregular: "Ciclo irregular",
  palpitation: "Palpitação",
  joint_pain: "Dor articular",
  brain_fog: "Névoa mental",
};
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function DayDetailModal({
  date,
  onClose,
}: {
  date: string | null;
  onClose: () => void;
}) {
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
  const isToday = date === today;
  const isPast = !!date && date < today;

  const { data: log, isLoading } = useQuery({
    ...trpc.log.byDate.queryOptions({ date: date ?? "" }),
    enabled: !!date,
  });

  if (!date) return null;

  const d = new Date(date + "T00:00:00");
  const dateLabel = `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES_SHORT[d.getMonth()]}`;

  const pains = (log?.pains as string[] | null) ?? [];
  const moods = (log?.moods as string[] | null) ?? [];
  const pms = (log?.pms as string[] | null) ?? [];
  const allSymptoms = [...pains, ...pms];

  return (
    <Modal
      visible={!!date}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 40,
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D0C8E8",
              alignSelf: "center",
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#1E1830",
              marginBottom: 16,
            }}
          >
            {isToday ? "Hoje · " : ""}
            {dateLabel}
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#8B7EC8" style={{ marginVertical: 24 }} />
          ) : log ? (
            <View style={{ gap: 12 }}>
              {log.flow && log.flow !== "none" && log.flow !== "" && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#F0EBFD",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="water" size={16} color="#8B7EC8" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: "#9088A8" }}>
                      Fluxo
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#1E1830",
                      }}
                    >
                      {FLOW_LABELS[log.flow] ?? log.flow}
                    </Text>
                  </View>
                </View>
              )}

              {log.vitality && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#F0EBFD",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="flash" size={16} color="#9B8FCA" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: "#9088A8" }}>
                      Energia
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#1E1830",
                      }}
                    >
                      {VITALITY_LABELS[log.vitality] ?? log.vitality}
                    </Text>
                  </View>
                </View>
              )}

              {moods.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#F0EBFD",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="happy-outline" size={16} color="#9B8FCA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#9088A8" }}>
                      Humor
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#1E1830",
                      }}
                    >
                      {moods
                        .slice(0, 3)
                        .map((id) => MOOD_LABELS[id] ?? id)
                        .join(", ")}
                    </Text>
                  </View>
                </View>
              )}

              {allSymptoms.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#F0EBFD",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="body-outline" size={16} color="#9B8FCA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#9088A8" }}>
                      Sintomas
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#1E1830",
                      }}
                    >
                      {allSymptoms
                        .slice(0, 3)
                        .map((id) => SYMPTOM_LABELS[id] ?? id)
                        .join(", ")}
                    </Text>
                  </View>
                </View>
              )}

              {log.notes ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#F0EBFD",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color="#9B8FCA"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#9088A8" }}>
                      Notas
                    </Text>
                    <Text
                      style={{ fontSize: 13, color: "#1E1830" }}
                      numberOfLines={3}
                    >
                      {log.notes}
                    </Text>
                  </View>
                </View>
              ) : null}

              {(isToday || isPast) && (
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push("/(tabs)/log");
                  }}
                  style={{
                    marginTop: 8,
                    backgroundColor: "#8B7EC8",
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: "700", color: "white" }}
                  >
                    Editar registro
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View
              style={{ alignItems: "center", gap: 12, paddingVertical: 16 }}
            >
              <Ionicons name="document-outline" size={36} color="#D0C8E8" />
              <Text
                style={{ fontSize: 14, color: "#9088A8", textAlign: "center" }}
              >
                {isToday
                  ? "Nada registrado ainda hoje."
                  : "Nenhum registro neste dia."}
              </Text>
              {(isToday || isPast) && (
                <Pressable
                  onPress={() => {
                    onClose();
                    if (isToday) {
                      router.push("/(tabs)/log");
                    } else {
                      router.push({
                        pathname: "/(tabs)/log",
                        params: { date },
                      });
                    }
                  }}
                  style={{
                    backgroundColor: "#8B7EC8",
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 32,
                  }}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: "700", color: "white" }}
                  >
                    {isToday ? "Registrar agora" : "Registrar este dia"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function detectPeriodStarts(flowDatesSorted: string[]): string[] {
  // Group consecutive flow dates → each group's first date is a period start
  if (flowDatesSorted.length === 0) return [];
  const starts: string[] = [];
  let prev: Date | null = null;
  for (const ds of flowDatesSorted) {
    const d = new Date(ds + "T00:00:00");
    if (!prev || d.getTime() - prev.getTime() > 2 * 86400000) {
      starts.push(ds);
    }
    prev = d;
  }
  return starts;
}

export default function CalendarScreen() {
  const { cycleData, hasRealCycleData } = useProfile();
  const {
    lastPeriodStart: profileLastPeriod,
    cycleLength,
    periodLength,
  } = cycleData;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefreshManual = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({
      queryKey: trpc.log.history.queryKey({ days: 365 }),
    });
    setRefreshing(false);
  };

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: logs } = useQuery(trpc.log.history.queryOptions({ days: 365 }));

  // Build lookup maps for O(1) access
  const loggedDates = new Set(logs?.map((l) => l.date) ?? []);
  const flowDatesSorted = (logs ?? [])
    .filter((l) => l.flow && l.flow !== "none" && l.flow !== "")
    .map((l) => l.date)
    .sort();
  const flowDates = new Set(flowDatesSorted);

  // First date the user ever logged anything — phases don't show before this
  const firstLoggedDate =
    logs && logs.length > 0
      ? ([...logs].map((l) => l.date).sort()[0] ?? null)
      : null;

  // Derive actual period starts from logged flow data
  const periodStarts = detectPeriodStarts(flowDatesSorted);
  const lastRealPeriodStart = periodStarts.at(-1);

  // Use the most recent real logged period start if available, otherwise fall back to profile
  const effectiveLastPeriod = lastRealPeriodStart
    ? new Date(lastRealPeriodStart + "T00:00:00")
    : profileLastPeriod;

  const days = getCalendarDays(
    year,
    month,
    effectiveLastPeriod,
    cycleLength,
    periodLength,
  );

  const rows: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  const goToPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Format day date as YYYY-MM-DD for lookup
  const dayKey = (d: CalendarDay) => {
    if (d.empty || !d.day) return "";
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d.day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F7FD" }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#1E1830" }}>
            Meu Ciclo
          </Text>
          <Pressable
            onPress={onRefreshManual}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#EDE8FB",
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={8}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#8B7EC8" />
            ) : (
              <Ionicons name="refresh" size={18} color="#8B7EC8" />
            )}
          </Pressable>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
          }}
        >
          <Ionicons
            name={
              lastRealPeriodStart
                ? "checkmark-circle"
                : "information-circle-outline"
            }
            size={14}
            color={lastRealPeriodStart ? "#8B7EC8" : "#B0A8C8"}
          />
          <Text
            style={{
              fontSize: 12,
              color: lastRealPeriodStart ? "#8B7EC8" : "#B0A8C8",
            }}
          >
            {lastRealPeriodStart
              ? "Baseado nos seus registros reais"
              : hasRealCycleData
                ? "Baseado na data informada no perfil"
                : "Registre seu ciclo para ver previsões"}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 20,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <Pressable
              onPress={goToPrev}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#F3E0E8",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-back" size={18} color="#8B7EC8" />
            </Pressable>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E1830" }}>
              {formatMonthYear(year, month)}
            </Text>
            <Pressable
              onPress={goToNext}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#F3E0E8",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-forward" size={18} color="#8B7EC8" />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            {WEEK_DAYS.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{ fontSize: 11, fontWeight: "600", color: "#A098C0" }}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row" }}>
              {row.map((day, di) => {
                const key = dayKey(day);
                const dayDate = !day.empty ? day.date : null;
                const isPast = !!dayDate && dayDate <= today;
                const isFuture = !!dayDate && dayDate > today;
                // Mostrar fase: apenas se depois do início conhecido
                // E para dias futuros: só se houver fluxo real registrado
                const showPhase =
                  !!dayDate &&
                  dayDate >= effectiveLastPeriod &&
                  (!firstLoggedDate || key >= firstLoggedDate) &&
                  (isPast || (isFuture && !!lastRealPeriodStart));
                return (
                  <DayCell
                    key={di}
                    day={day}
                    hasLog={loggedDates.has(key)}
                    hasFlow={flowDates.has(key)}
                    showPhase={showPhase}
                    onPress={key ? () => setSelectedDate(key) : undefined}
                  />
                );
              })}
              {row.length < 7 &&
                Array.from({ length: 7 - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={{ flex: 1 }} />
                ))}
            </View>
          ))}
        </View>

        <Legend />
        {(hasRealCycleData || !!lastRealPeriodStart) && (
          <UpcomingCycles
            baseYear={year}
            baseMonth={month}
            lastPeriodStart={effectiveLastPeriod}
            cycleLength={cycleLength}
            periodLength={periodLength}
          />
        )}
      </ScrollView>
      <DayDetailModal
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
      />
    </SafeAreaView>
  );
}
