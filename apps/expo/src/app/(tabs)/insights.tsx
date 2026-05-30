import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import type { CyclePhase } from "~/data/cycle-utils";
import { getPhaseForDay, getPhaseInfo } from "~/data/cycle-utils";
import { useProfile } from "~/data/profile-context";
import { trpc } from "~/utils/api";

// ─── Labels ─────────────────────────────────────────────────────────────────

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

const FLOW_LABELS: Record<string, string> = {
  light: "Leve",
  medium: "Moderado",
  heavy: "Intenso",
  spotting: "Manchas",
};

const SLEEP_SCORE: Record<string, number> = {
  great: 100,
  good: 75,
  ok: 50,
  bad: 25,
  terrible: 0,
};

const VITALITY_SCORE: Record<string, number> = {
  high: 100,
  good: 80,
  normal: 60,
  low: 35,
  exhausted: 10,
};

const PHASES: CyclePhase[] = ["menstrual", "follicular", "ovulation", "luteal"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcStreak(logDates: string[]): number {
  const dateSet = new Set(logDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);
  const yesterday = new Date(today.getTime() - 86400000);
  const start = dateSet.has(todayStr)
    ? today
    : dateSet.has(toDateStr(yesterday))
      ? yesterday
      : null;
  if (!start) return 0;
  let streak = 0;
  const cur = new Date(start);
  while (dateSet.has(toDateStr(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function calcAvgFlowDays(
  logs: { date: string; flow?: string | null }[],
): number | null {
  const flowDates = logs
    .filter((l) => l.flow && l.flow !== "none" && l.flow !== "")
    .map((l) => l.date)
    .sort();
  if (flowDates.length === 0) return null;
  const periods: string[][] = [];
  let cur: string[] = [flowDates[0] ?? ""];
  for (let i = 1; i < flowDates.length; i++) {
    const curr = flowDates[i] ?? "";
    const prev = flowDates[i - 1] ?? "";
    const diff =
      (new Date(curr + "T00:00:00").getTime() -
        new Date(prev + "T00:00:00").getTime()) /
      86400000;
    if (diff <= 2) cur.push(curr);
    else {
      periods.push(cur);
      cur = [curr];
    }
  }
  periods.push(cur);
  if (periods.length === 0) return null;
  return Math.round(periods.reduce((s, p) => s + p.length, 0) / periods.length);
}

// ─── Components ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: 18,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: `${color}20`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: "800", color: "#1E1830" }}>
        {value}
        {unit && (
          <Text style={{ fontSize: 13, fontWeight: "500", color: "#9088A8" }}>
            {" "}
            {unit}
          </Text>
        )}
      </Text>
      <Text style={{ fontSize: 12, color: "#9088A8", marginTop: 2 }}>
        {label}
      </Text>
      {sub && (
        <Text style={{ fontSize: 11, color: "#B0A8C8", marginTop: 1 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 15,
        fontWeight: "700",
        color: "#1E1830",
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: "white",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: 20, alignItems: "center", gap: 8 }}>
      <Ionicons name="bar-chart-outline" size={28} color="#D0C8E8" />
      <Text
        style={{
          fontSize: 13,
          color: "#9088A8",
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

// Vitalidade por fase
function VitalityByPhase({
  logs,
}: {
  logs: { date: string; vitality: unknown }[];
}) {
  const { cycleData } = useProfile();
  const { lastPeriodStart, cycleLength, periodLength } = cycleData;

  const scores = useMemo(() => {
    const buckets: Record<CyclePhase, number[]> = {
      menstrual: [],
      follicular: [],
      ovulation: [],
      luteal: [],
    };
    for (const log of logs) {
      if (!log.vitality) continue;
      const diff = Math.floor(
        (new Date(log.date + "T00:00:00").getTime() -
          lastPeriodStart.getTime()) /
          86400000,
      );
      if (diff < 0) continue;
      const phase = getPhaseForDay(
        (diff % cycleLength) + 1,
        cycleLength,
        periodLength,
      );
      const score = VITALITY_SCORE[log.vitality as string];
      if (score !== undefined) buckets[phase].push(score);
    }
    return Object.fromEntries(
      PHASES.map((p) => [
        p,
        buckets[p].length > 0
          ? Math.round(
              buckets[p].reduce((a, b) => a + b, 0) / buckets[p].length,
            )
          : null,
      ]),
    ) as Record<CyclePhase, number | null>;
  }, [logs, lastPeriodStart, cycleLength, periodLength]);

  const hasData = PHASES.some((p) => scores[p] !== null);
  const maxVal = hasData
    ? Math.max(...PHASES.map((p) => scores[p] ?? 0), 1)
    : 1;

  return (
    <Card>
      <SectionTitle>Energia por fase</SectionTitle>
      <Text style={{ fontSize: 12, color: "#9088A8", marginBottom: 14 }}>
        Média da sua vitalidade registrada em cada fase
      </Text>
      {!hasData ? (
        <EmptyState
          text={"Registre sua vitalidade ao longo\ndo ciclo para ver padrões."}
        />
      ) : (
        <View style={{ gap: 14 }}>
          {PHASES.map((phase) => {
            const info = getPhaseInfo(phase);
            const val = scores[phase];
            const pct = val !== null ? (val / maxVal) * 100 : 0;
            return (
              <View key={phase}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name={
                        info.iconName as React.ComponentProps<
                          typeof Ionicons
                        >["name"]
                      }
                      size={14}
                      color={info.color}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: "#2E2848",
                      }}
                    >
                      {info.name}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: val !== null ? info.color : "#C0B8D8",
                    }}
                  >
                    {val !== null ? `${val}%` : "—"}
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#E8E2F5",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${pct}%`,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: val !== null ? info.color : "#E8E2F5",
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

// Humores mais frequentes
function TopMoods({ logs }: { logs: { moods: unknown }[] }) {
  const topMoods = useMemo(() => {
    const count: Record<string, number> = {};
    for (const log of logs) {
      for (const m of (log.moods as string[] | null) ?? []) {
        count[m] = (count[m] ?? 0) + 1;
      }
    }
    const total = logs.length || 1;
    return Object.entries(count)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, n]) => ({
        id,
        label: MOOD_LABELS[id] ?? id,
        count: n,
        pct: Math.round((n / total) * 100),
      }));
  }, [logs]);

  return (
    <Card>
      <SectionTitle>Humores mais frequentes</SectionTitle>
      <Text style={{ fontSize: 12, color: "#9088A8", marginBottom: 14 }}>
        Como você se sentiu na maioria dos dias
      </Text>
      {topMoods.length === 0 ? (
        <EmptyState
          text={"Registre seu humor para\nver padrões ao longo do ciclo."}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {topMoods.map((m, i) => (
            <View
              key={m.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: "#B0A0AA",
                  width: 18,
                }}
              >
                {i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#1E1830",
                    }}
                  >
                    {m.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9088A8" }}>
                    {m.count}x
                  </Text>
                </View>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#E8E2F5",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${m.pct}%`,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "#9B8FCA",
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

// Sintomas mais frequentes com fase predominante
function TopSymptoms({
  logs,
}: {
  logs: { date: string; pains: unknown; pms: unknown }[];
}) {
  const { cycleData } = useProfile();
  const { lastPeriodStart, cycleLength, periodLength } = cycleData;

  const data = useMemo(() => {
    const count: Record<string, number> = {};
    const phaseCount: Record<string, Record<CyclePhase, number>> = {};
    for (const log of logs) {
      const diff = Math.floor(
        (new Date(log.date + "T00:00:00").getTime() -
          lastPeriodStart.getTime()) /
          86400000,
      );
      const phase =
        diff >= 0
          ? getPhaseForDay((diff % cycleLength) + 1, cycleLength, periodLength)
          : null;
      const symptoms = [
        ...((log.pains as string[] | null) ?? []),
        ...((log.pms as string[] | null) ?? []),
      ];
      for (const s of symptoms) {
        count[s] = (count[s] ?? 0) + 1;
        if (phase) {
          const entry = (phaseCount[s] ??= {
            menstrual: 0,
            follicular: 0,
            ovulation: 0,
            luteal: 0,
          });
          entry[phase]++;
        }
      }
    }
    const total = logs.length || 1;
    return Object.entries(count)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, n]) => {
        const pc = phaseCount[id] ?? {
          menstrual: 0,
          follicular: 0,
          ovulation: 0,
          luteal: 0,
        };
        const topPhase = (Object.entries(pc) as [CyclePhase, number][]).sort(
          ([, a], [, b]) => b - a,
        )[0];
        return {
          id,
          label: SYMPTOM_LABELS[id] ?? id,
          count: n,
          pct: Math.round((n / total) * 100),
          topPhase: topPhase && topPhase[1] > 0 ? topPhase[0] : null,
        };
      });
  }, [logs, lastPeriodStart, cycleLength, periodLength]);

  return (
    <Card>
      <SectionTitle>Sintomas mais frequentes</SectionTitle>
      <Text style={{ fontSize: 12, color: "#9088A8", marginBottom: 14 }}>
        Com qual fase cada sintoma mais aparece
      </Text>
      {data.length === 0 ? (
        <EmptyState
          text={
            "Registre seus sintomas para\nver os padrões ao longo do ciclo."
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          {data.map((s, i) => {
            const phaseInfo = s.topPhase ? getPhaseInfo(s.topPhase) : null;
            return (
              <View
                key={s.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#B0A0AA",
                    width: 18,
                  }}
                >
                  {i + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#1E1830",
                      }}
                    >
                      {s.label}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {phaseInfo && (
                        <View
                          style={{
                            backgroundColor: `${phaseInfo.color}20`,
                            borderRadius: 8,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: phaseInfo.color,
                            }}
                          >
                            {phaseInfo.name}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 12, color: "#9088A8" }}>
                        {s.count}x
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "#E8E2F5",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${s.pct}%`,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: phaseInfo?.color ?? "#8B7EC8",
                      }}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

// Padrão de sono
function SleepPattern({
  logs,
}: {
  logs: { sleepHours?: number | null; sleepQuality?: string | null }[];
}) {
  const { avgHours, avgQuality, qualityDist } = useMemo(() => {
    const withHours = logs.filter((l) => l.sleepHours);
    const avg =
      withHours.length > 0
        ? Math.round(
            (withHours.reduce((s, l) => s + (l.sleepHours ?? 0), 0) /
              withHours.length) *
              10,
          ) / 10
        : null;

    const scores = logs
      .map((l) =>
        l.sleepQuality ? (SLEEP_SCORE[l.sleepQuality] ?? null) : null,
      )
      .filter((s) => s !== null);
    const avgQ =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    const dist: Record<string, number> = {};
    for (const l of logs) {
      if (l.sleepQuality)
        dist[l.sleepQuality] = (dist[l.sleepQuality] ?? 0) + 1;
    }

    return { avgHours: avg, avgQuality: avgQ, qualityDist: dist };
  }, [logs]);

  const hasData = avgHours !== null || avgQuality !== null;

  const qualityItems = [
    { id: "great", label: "Ótimo", color: "#7AAEC4" },
    { id: "good", label: "Bom", color: "#9B8FCA" },
    { id: "ok", label: "Ok", color: "#B0A8C8" },
    { id: "bad", label: "Ruim", color: "#C4A840" },
    { id: "terrible", label: "Péssimo", color: "#B57BAC" },
  ];

  const totalQuality =
    Object.values(qualityDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <Card>
      <SectionTitle>Padrão de sono</SectionTitle>
      <Text style={{ fontSize: 12, color: "#9088A8", marginBottom: 14 }}>
        Qualidade e duração do seu sono
      </Text>
      {!hasData ? (
        <EmptyState
          text={"Registre seu sono para\nver padrões ao longo do ciclo."}
        />
      ) : (
        <View style={{ gap: 14 }}>
          {avgHours !== null && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#EDE8FB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="moon-outline" size={18} color="#9B8FCA" />
              </View>
              <View>
                <Text
                  style={{ fontSize: 20, fontWeight: "800", color: "#1E1830" }}
                >
                  {avgHours}h{" "}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: "#9088A8",
                    }}
                  >
                    em média
                  </Text>
                </Text>
                <Text style={{ fontSize: 12, color: "#9088A8" }}>
                  Duração do sono
                </Text>
              </View>
            </View>
          )}
          {Object.keys(qualityDist).length > 0 && (
            <View style={{ gap: 8 }}>
              {qualityItems
                .filter((q) => qualityDist[q.id])
                .map((q) => {
                  const pct = Math.round(
                    ((qualityDist[q.id] ?? 0) / totalQuality) * 100,
                  );
                  return (
                    <View key={q.id}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: "#2E2848",
                          }}
                        >
                          {q.label}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#9088A8" }}>
                          {pct}%
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#E8E2F5",
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            width: `${pct}%`,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: q.color,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

// Fluxo registrado
function FlowPattern({ logs }: { logs: { flow?: string | null }[] }) {
  const data = useMemo(() => {
    const count: Record<string, number> = {};
    for (const l of logs) {
      if (l.flow && l.flow !== "none" && l.flow !== "") {
        count[l.flow] = (count[l.flow] ?? 0) + 1;
      }
    }
    const total = Object.values(count).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(count)
      .sort(([, a], [, b]) => b - a)
      .map(([id, n]) => ({
        id,
        label: FLOW_LABELS[id] ?? id,
        count: n,
        pct: Math.round((n / total) * 100),
      }));
  }, [logs]);

  if (data.length === 0) return null;

  const colors: Record<string, string> = {
    light: "#B57BAC",
    medium: "#9B8FCA",
    heavy: "#7060B8",
    spotting: "#D4A0C8",
  };

  return (
    <Card>
      <SectionTitle>Padrão de fluxo</SectionTitle>
      <Text style={{ fontSize: 12, color: "#9088A8", marginBottom: 14 }}>
        Intensidade do fluxo nos dias registrados
      </Text>
      <View style={{ gap: 10 }}>
        {data.map((f) => (
          <View key={f.id}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#1E1830" }}
              >
                {f.label}
              </Text>
              <Text style={{ fontSize: 12, color: "#9088A8" }}>
                {f.count} dias
              </Text>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "#E8E2F5",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${f.pct}%`,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors[f.id] ?? "#B57BAC",
                }}
              />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

// Skeleton
function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius,
          backgroundColor: "#E8E2F5",
        },
        style,
      ]}
    />
  );
}

function InsightsSkeleton() {
  return (
    <>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: "white",
              borderRadius: 18,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <SkeletonBox
              width={36}
              height={36}
              borderRadius={18}
              style={{ marginBottom: 10 }}
            />
            <SkeletonBox
              width={60}
              height={24}
              borderRadius={6}
              style={{ marginBottom: 6 }}
            />
            <SkeletonBox width={80} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: "white",
              borderRadius: 18,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <SkeletonBox
              width={36}
              height={36}
              borderRadius={18}
              style={{ marginBottom: 10 }}
            />
            <SkeletonBox
              width={60}
              height={24}
              borderRadius={6}
              style={{ marginBottom: 6 }}
            />
            <SkeletonBox width={80} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
      {[140, 180, 160, 140].map((h, i) => (
        <View
          key={i}
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <SkeletonBox
            width={160}
            height={16}
            borderRadius={6}
            style={{ marginBottom: 12 }}
          />
          <SkeletonBox height={h} borderRadius={8} />
        </View>
      ))}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function thirtyDaysAgoStr(): string {
  const d = new Date(Date.now() - 30 * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const THIRTY_DAYS_AGO = thirtyDaysAgoStr();

export default function InsightsScreen() {
  const { cycleData } = useProfile();
  const logsQuery = useQuery(trpc.log.history.queryOptions({ days: 180 }));
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const streak = useMemo(() => calcStreak(logs.map((l) => l.date)), [logs]);
  const avgFlowDays = useMemo(
    () => calcAvgFlowDays(logs as { date: string; flow?: string | null }[]),
    [logs],
  );

  const consistencyPct = useMemo(() => {
    if (logs.length === 0) return 0;
    const recent = logs.filter((l) => l.date >= THIRTY_DAYS_AGO);
    return Math.round((recent.length / 30) * 100);
  }, [logs]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F7FD" }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#1E1830",
            paddingTop: 16,
            marginBottom: 20,
          }}
        >
          Meus Insights
        </Text>

        {logsQuery.isLoading ? (
          <InsightsSkeleton />
        ) : (
          <>
            {/* Stats row 1 */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <StatCard
                label="Ciclo médio"
                value={cycleData.cycleLength}
                unit="dias"
                icon="refresh-outline"
                color="#9B8FCA"
              />
              <StatCard
                label="Duração da menstruação"
                value={avgFlowDays ?? cycleData.periodLength}
                unit="dias"
                sub={avgFlowDays ? "real (seus registros)" : "do perfil"}
                icon="water"
                color="#B57BAC"
              />
            </View>

            {/* Stats row 2 */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <StatCard
                label="Sequência atual"
                value={streak}
                unit={streak === 1 ? "dia" : "dias"}
                sub="dias seguidos registrados"
                icon="flame-outline"
                color="#C4A840"
              />
              <StatCard
                label="Consistência"
                value={`${consistencyPct}%`}
                sub="dos últimos 30 dias"
                icon="checkmark-circle-outline"
                color="#7AAEC4"
              />
            </View>

            <VitalityByPhase logs={logs} />
            <TopMoods logs={logs} />
            <FlowPattern logs={logs as { flow?: string | null }[]} />
            <TopSymptoms
              logs={logs as { date: string; pains: unknown; pms: unknown }[]}
            />
            <SleepPattern
              logs={
                logs as {
                  sleepHours?: number | null;
                  sleepQuality?: string | null;
                }[]
              }
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
