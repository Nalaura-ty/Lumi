import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { formatDate, getPhaseForDay, getPhaseInfo } from "~/data/cycle-utils";
import { useProfile } from "~/data/profile-context";
import { queryClient, trpc } from "~/utils/api";
import { updateAndroidWidget } from "~/utils/widget";

const TODAY = new Date();

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Dense arc ring with interactive day scrubbing
function CycleRing({
  dayOfCycle,
  cycleLength,
  periodLength,
  daysUntilNextPeriod,
  hasCurrentPhaseData,
  hasCyclePrediction,
  flowDaysThisPeriod,
  onInteractionStart,
  onInteractionEnd,
  size = 290,
}: {
  dayOfCycle: number;
  cycleLength: number;
  periodLength: number;
  daysUntilNextPeriod: number;
  hasCurrentPhaseData: boolean;
  hasCyclePrediction: boolean;
  flowDaysThisPeriod: number;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  size?: number;
}) {
  const [selectedDay, setSelectedDay] = useState(dayOfCycle);
  const [animDay] = useState(() => new Animated.Value(dayOfCycle));

  // Sync when dayOfCycle changes (e.g. after logging a past day)
  useEffect(() => {
    setSelectedDay(dayOfCycle);
    animDay.setValue(dayOfCycle);
  }, [dayOfCycle, animDay]);

  const animateToDay = (day: number) => {
    setSelectedDay(day);
    Animated.spring(animDay, {
      toValue: day,
      useNativeDriver: false,
      speed: 28,
      bounciness: 4,
    }).start();
  };
  const viewRef = useRef<View>(null);
  const layoutRef = useRef<{ pageX: number; pageY: number } | null>(null);

  const center = size / 2;
  const ringR = center - 26;
  const HIT = 40; // px tolerance on each side of ring radius
  const SEGMENTS = 120;

  // Mutable refs so PanResponder (created once) always calls latest logic
  const onStartRef = useRef(onInteractionStart);
  const onEndRef = useRef(onInteractionEnd);

  useEffect(() => {
    onStartRef.current = onInteractionStart;
    onEndRef.current = onInteractionEnd;
  });

  // Re-assigned every render → PanResponder always calls the current version
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const resolveDayRef = useRef((_px: number, _py: number) => {});
  const isNearRingRef = useRef((_px: number, _py: number): boolean => false);

  useEffect(() => {
    resolveDayRef.current = (pageX: number, pageY: number) => {
      if (!layoutRef.current) return;
      const dx = pageX - (layoutRef.current.pageX + center);
      const dy = pageY - (layoutRef.current.pageY + center);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ringR - HIT || dist > ringR + HIT) return;
      const angle = Math.atan2(dy, dx);
      const frac = ((angle + Math.PI / 2) / (2 * Math.PI) + 1) % 1;
      const day = Math.max(
        1,
        Math.min(cycleLength, Math.round(frac * cycleLength) || cycleLength),
      );
      animateToDay(day);
    };

    isNearRingRef.current = (pageX: number, pageY: number): boolean => {
      if (!layoutRef.current) return false;
      const dx = pageX - (layoutRef.current.pageX + center);
      const dy = pageY - (layoutRef.current.pageY + center);
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist >= ringR - HIT && dist <= ringR + HIT;
    };
  });

  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
      // Only capture when touch STARTS near the ring — centre taps pass through
      onStartShouldSetPanResponder: (e) =>
        isNearRingRef.current(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onMoveShouldSetPanResponder: (e) =>
        isNearRingRef.current(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderGrant: (e) => {
        onStartRef.current?.();
        resolveDayRef.current(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },
      onPanResponderMove: (e) =>
        resolveDayRef.current(e.nativeEvent.pageX, e.nativeEvent.pageY),
      onPanResponderRelease: () => onEndRef.current?.(),
      onPanResponderTerminate: () => onEndRef.current?.(),
    }),
  );

  const displayPhase = getPhaseForDay(selectedDay, cycleLength, periodLength);
  const displayInfo = getPhaseInfo(displayPhase);
  const isToday = selectedDay === dayOfCycle;

  // Badge position for selected day — animated
  const badgeSize = 50;
  const badgeDays = Array.from({ length: cycleLength }, (_, i) => i + 1);
  const badgeLeftVals = badgeDays.map((d) => {
    const a = ((d - 0.5) / cycleLength) * 2 * Math.PI - Math.PI / 2;
    return center + ringR * Math.cos(a) - badgeSize / 2;
  });
  const badgeTopVals = badgeDays.map((d) => {
    const a = ((d - 0.5) / cycleLength) * 2 * Math.PI - Math.PI / 2;
    return center + ringR * Math.sin(a) - badgeSize / 2;
  });
  const badgeLeft = animDay.interpolate({
    inputRange: badgeDays,
    outputRange: badgeLeftVals,
    extrapolate: "clamp",
  });
  const badgeTop = animDay.interpolate({
    inputRange: badgeDays,
    outputRange: badgeTopVals,
    extrapolate: "clamp",
  });

  // Status text in center
  const diffDays = selectedDay - dayOfCycle;
  const statusText = isToday
    ? "Hoje"
    : diffDays > 0
      ? `Daqui a ${diffDays} dia${diffDays > 1 ? "s" : ""}`
      : `Ha ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? "s" : ""}`;

  // Arc length per segment — slightly oversized so adjacent segments overlap
  const arcStep = (2 * Math.PI * ringR) / SEGMENTS;
  const segW = arcStep * 1.45; // overlap for seamless line
  const segH = 11; // ring stroke width

  const segments = Array.from({ length: SEGMENTS }, (_, i) => {
    const frac = i / SEGMENTS;
    const angle = frac * 2 * Math.PI - Math.PI / 2;
    const x = center + ringR * Math.cos(angle);
    const y = center + ringR * Math.sin(angle);

    const dayFrac = frac * cycleLength;
    const dayNum = Math.max(1, Math.ceil(dayFrac));
    const phase = getPhaseForDay(dayNum, cycleLength, periodLength);
    const phaseColor = getPhaseInfo(phase).color;

    const isPast = dayFrac <= selectedDay;
    const badgeFrac = (selectedDay - 0.5) / cycleLength;
    const angleDiff = Math.abs(frac - badgeFrac);
    const nearBadge = angleDiff < 0.038 || angleDiff > 0.962;

    // When no prediction data, future segments are greyed out instead of phase-coloured
    const futureColor = hasCyclePrediction
      ? "rgba(255,255,255,0.09)"
      : "rgba(255,255,255,0.04)";
    const bg = isPast ? phaseColor : futureColor;
    const rotDeg = frac * 360; // tangential rotation

    return { x, y, segW, segH, bg, nearBadge, rotDeg };
  });

  return (
    <View
      ref={viewRef}
      style={{ width: size, height: size }}
      onLayout={() => {
        viewRef.current?.measure((_, __, ___, ____, pageX, pageY) => {
          layoutRef.current = { pageX, pageY };
        });
      }}
      {...panResponder.panHandlers}
    >
      {segments.map((s, i) =>
        s.nearBadge ? null : (
          <View
            key={i}
            style={{
              position: "absolute",
              left: s.x - s.segW / 2,
              top: s.y - s.segH / 2,
              width: s.segW,
              height: s.segH,
              borderRadius: 2,
              backgroundColor: s.bg,
              transform: [{ rotate: `${s.rotDeg}deg` }],
            }}
          />
        ),
      )}

      {/* Scrubbing badge */}
      <Animated.View
        style={{
          position: "absolute",
          left: badgeLeft,
          top: badgeTop,
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: displayInfo.color,
          borderWidth: isToday ? 2.5 : 1.5,
          borderColor: isToday
            ? "rgba(255,255,255,0.9)"
            : "rgba(255,255,255,0.4)",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: displayInfo.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isToday ? 0.7 : 0.3,
          shadowRadius: 10,
          elevation: 10,
          zIndex: 10,
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 7,
            fontWeight: "700",
            letterSpacing: 0.8,
          }}
        >
          DIA
        </Text>
        <Text
          style={{
            color: "white",
            fontSize: 18,
            fontWeight: "900",
            lineHeight: 20,
          }}
        >
          {selectedDay}
        </Text>
      </Animated.View>

      {/* Center content — updates as user scrubs */}
      <View
        style={{
          position: "absolute",
          left: center - ringR + 30,
          right: center - ringR + 30,
          top: center - ringR + 30,
          bottom: center - ringR + 30,
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {hasCurrentPhaseData ? (
          <>
            <Ionicons
              name={
                displayInfo.iconName as React.ComponentProps<
                  typeof Ionicons
                >["name"]
              }
              size={20}
              color={displayInfo.color}
            />
            <Text
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 8,
                fontWeight: "700",
                letterSpacing: 1.6,
                marginTop: 1,
              }}
            >
              {statusText.toUpperCase()}
            </Text>
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              {displayInfo.name}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 10,
                textAlign: "center",
                lineHeight: 14,
                marginTop: 1,
              }}
              numberOfLines={2}
            >
              {displayInfo.description.split(".")[0]}.
            </Text>
            {isToday &&
              displayPhase === "menstrual" &&
              (() => {
                const remaining = Math.max(
                  0,
                  periodLength - flowDaysThisPeriod,
                );
                return (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: "rgba(224,92,122,0.18)",
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: "rgba(224,92,122,0.35)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#F0A0B8",
                        fontSize: 10,
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                    >
                      {remaining > 0
                        ? `+${remaining} dia${remaining > 1 ? "s" : ""} previstos`
                        : "Último dia previsto"}
                    </Text>
                  </View>
                );
              })()}
            {isToday && hasCyclePrediction && displayPhase !== "menstrual" && (
              <View
                style={{
                  marginTop: 6,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  Menstruação em {daysUntilNextPeriod}d
                </Text>
              </View>
            )}
            {isToday && !hasCyclePrediction && (
              <View
                style={{
                  marginTop: 6,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 10,
                    fontWeight: "500",
                    textAlign: "center",
                  }}
                >
                  Continue registrando
                </Text>
              </View>
            )}
            {!isToday && (
              <View
                style={{
                  marginTop: 6,
                  backgroundColor: `${displayInfo.color}22`,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: `${displayInfo.color}44`,
                }}
              >
                <Text
                  style={{
                    color: displayInfo.color,
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                >
                  Fase {displayInfo.name}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Ionicons
              name="water-outline"
              size={26}
              color="rgba(255,255,255,0.2)"
            />
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                fontWeight: "800",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              Fase em definição
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 11,
                textAlign: "center",
                lineHeight: 17,
                marginTop: 4,
                paddingHorizontal: 8,
              }}
            >
              Registre os dias{"\n"}com fluxo para ativar
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function NoDataHeroCard() {
  return (
    <View
      style={{
        backgroundColor: "#16112E",
        borderRadius: 28,
        padding: 28,
        marginBottom: 16,
        alignItems: "center",
        gap: 14,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: "rgba(155,143,202,0.15)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="moon-outline" size={28} color="#9B8FCA" />
      </View>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ color: "white", fontSize: 17, fontWeight: "800" }}>
          Defina sua fase
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Comece registrando seus dias. Ao marcar o fluxo menstrual, o app
          identifica sua fase do ciclo automaticamente.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push("/(tabs)/log")}
        style={{
          backgroundColor: "#8B7EC8",
          borderRadius: 14,
          paddingVertical: 11,
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
          Fazer primeiro registro
        </Text>
      </Pressable>
    </View>
  );
}

function PhaseHeroCard({
  onInteractionStart,
  onInteractionEnd,
}: {
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}) {
  const {
    cycleData,
    hasRealCycleData,
    hasCurrentPhaseData,
    hasCyclePrediction,
  } = useProfile();
  const {
    dayOfCycle,
    daysUntilNextPeriod,
    phase,
    cycleLength,
    periodLength,
    lastPeriodStart,
  } = cycleData;
  const info = getPhaseInfo(phase);

  useEffect(() => {
    updateAndroidWidget({
      phase,
      phaseName: info.name,
      dayOfCycle,
      daysUntilPeriod: daysUntilNextPeriod,
    });
  }, [phase, info.name, dayOfCycle, daysUntilNextPeriod]);

  const todayStr = localDateStr();
  const { data: todayLog } = useQuery(
    trpc.log.today.queryOptions({ date: todayStr }),
  );
  const { data: recentLogs } = useQuery(
    trpc.log.history.queryOptions({ days: 10 }),
  );
  const hasLogToday = !!todayLog;

  // Count flow days logged since the current period start
  const periodStartStr = `${lastPeriodStart.getFullYear()}-${String(lastPeriodStart.getMonth() + 1).padStart(2, "0")}-${String(lastPeriodStart.getDate()).padStart(2, "0")}`;
  const flowDaysThisPeriod = (recentLogs ?? []).filter(
    (l) =>
      l.date >= periodStartStr && l.flow && l.flow !== "none" && l.flow !== "",
  ).length;

  if (!hasRealCycleData) {
    return <NoDataHeroCard />;
  }

  return (
    <View
      style={{
        backgroundColor: "#16112E",
        borderRadius: 28,
        paddingVertical: 24,
        paddingHorizontal: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          paddingHorizontal: 8,
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 1.8,
          }}
        >
          SEU CICLO ATUAL
        </Text>
      </View>

      {/* The ring */}
      <View style={{ alignItems: "center" }}>
        <CycleRing
          dayOfCycle={dayOfCycle}
          cycleLength={cycleLength}
          periodLength={periodLength}
          daysUntilNextPeriod={daysUntilNextPeriod}
          hasCurrentPhaseData={hasCurrentPhaseData}
          hasCyclePrediction={hasCyclePrediction}
          flowDaysThisPeriod={flowDaysThisPeriod}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          size={330}
        />
      </View>

      {/* Tap to log */}
      <Pressable
        onPress={() => router.push("/(tabs)/log")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 16,
          marginHorizontal: 8,
          paddingVertical: 10,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <Ionicons
          name={hasLogToday ? "checkmark-circle-outline" : "add-circle-outline"}
          size={15}
          color="rgba(255,255,255,0.7)"
        />
        <Text
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 13,
            fontWeight: "600",
          }}
        >
          {hasLogToday ? "Ver registro de hoje" : `Registrar dia ${dayOfCycle}`}
        </Text>
      </Pressable>

      {/* Phase hint — shown when phase is not yet known */}
      {!hasCurrentPhaseData && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            marginHorizontal: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: "rgba(139,126,200,0.12)",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "rgba(139,126,200,0.2)",
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="rgba(155,143,202,0.8)"
          />
          <Text
            style={{
              color: "rgba(155,143,202,0.8)",
              fontSize: 11,
              flex: 1,
              lineHeight: 16,
            }}
          >
            Sua fase é identificada automaticamente conforme você registra o
            fluxo menstrual.
          </Text>
        </View>
      )}

      {/* Phase chips — only when we have real predictions */}
      {hasCyclePrediction && (
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 12,
            paddingHorizontal: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <Ionicons name="flash-outline" size={16} color={info.color} />
            <View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 9,
                  fontWeight: "600",
                }}
              >
                ENERGIA PREVISTA
              </Text>
              <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>
                {info.energy}
              </Text>
            </View>
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <Ionicons name="heart-outline" size={16} color={info.color} />
            <View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 9,
                  fontWeight: "600",
                }}
              >
                HUMOR PREVISTO
              </Text>
              <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>
                {info.mood}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function PerimenopauseHeroCard() {
  const { cycleData } = useProfile();
  const today = new Date();
  const daysSinceLastPeriod = Math.floor(
    (today.getTime() - cycleData.lastPeriodStart.getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const hotFlashesToday = 0;
  const hotFlashesThisWeek = 0;
  const mainSymptoms = ["Ondas de calor", "Insônia", "Humor instável"];

  return (
    <View
      style={{
        backgroundColor: "#16112E",
        borderRadius: 28,
        padding: 24,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      <Text
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 1.8,
          marginBottom: 20,
        }}
      >
        SUA SAUDE HOJE
      </Text>

      {/* Main stats */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.07)",
            borderRadius: 18,
            padding: 16,
            alignItems: "center",
            gap: 6,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#B57BAC30",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="calendar-outline" size={20} color="#B57BAC" />
          </View>
          <Text style={{ color: "white", fontSize: 26, fontWeight: "900" }}>
            {daysSinceLastPeriod}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 10,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            DIAS SEM{"\n"}MENSTRUACAO
          </Text>
        </View>

        <View style={{ flex: 1, gap: 10 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#C4A84030",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="flame-outline" size={16} color="#C4A840" />
            </View>
            <View>
              <Text style={{ color: "white", fontSize: 20, fontWeight: "800" }}>
                {hotFlashesToday}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 9,
                  fontWeight: "600",
                }}
              >
                HOJE
              </Text>
            </View>
            <Text
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 10,
                marginLeft: "auto",
              }}
            >
              {hotFlashesThisWeek} na semana
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#9B8FCA30",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="heart-outline" size={16} color="#9B8FCA" />
            </View>
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                fontWeight: "600",
                flex: 1,
              }}
            >
              Ciclo irregular
            </Text>
          </View>
        </View>
      </View>

      {/* Symptoms */}
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          SINTOMAS FREQUENTES
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {mainSymptoms.map((s) => (
            <View
              key={s}
              style={{
                backgroundColor: "#B57BAC25",
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: "#B57BAC40",
              }}
            >
              <Text
                style={{ color: "#D4A0C8", fontSize: 11, fontWeight: "600" }}
              >
                {s}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function QuickLogSection() {
  const todayStr = localDateStr();
  const { data: todayLog } = useQuery(
    trpc.log.today.queryOptions({ date: todayStr }),
  );

  const hasLog = !!todayLog;
  const loggedItems = todayLog
    ? [
        todayLog.flow && "Fluxo",
        todayLog.moods?.length && "Humor",
        todayLog.pains?.length && "Dores",
        todayLog.sleepQuality && "Sono",
        todayLog.vitality && "Vitalidade",
      ].filter(Boolean)
    : [];

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/log")}
      style={{
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1.5,
        borderColor: hasLog ? "#C8BFF0" : "#E5E0F5",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: hasLog ? "#8B7EC8" : "#EEEAF8",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={hasLog ? "checkmark-circle" : "add-circle-outline"}
          size={22}
          color={hasLog ? "white" : "#8B7EC8"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E1830" }}>
          {hasLog ? "Registro de hoje" : "Registrar hoje"}
        </Text>
        <Text style={{ fontSize: 12, color: "#9088A8", marginTop: 2 }}>
          {hasLog
            ? loggedItems.length > 0
              ? loggedItems.join(" · ")
              : "Registro salvo"
            : "Toque para registrar humor, sintomas e mais"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#C0B8D8" />
    </Pressable>
  );
}

function NextEventsSection() {
  const { cycleData } = useProfile();
  const { daysUntilNextPeriod, daysUntilOvulation } = cycleData;

  const events = [
    {
      icon: "ellipse" as const,
      color: "#8B7EC8",
      label: "Menstruação",
      days: daysUntilNextPeriod,
      sublabel: "Previsão",
    },
    {
      icon: "star-outline" as const,
      color: "#9B8FCA",
      label: "Ovulação",
      days: daysUntilOvulation,
      sublabel: "Próximo ciclo",
    },
  ];

  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#1E1830",
          marginBottom: 12,
        }}
      >
        Próximos eventos
      </Text>
      <View style={{ gap: 8 }}>
        {events.map((event) => (
          <View
            key={event.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "white",
              borderRadius: 16,
              padding: 14,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: `${event.color}20`,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name={event.icon} size={18} color={event.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#1E1830" }}
              >
                {event.label}
              </Text>
              <Text style={{ fontSize: 12, color: "#9088A8" }}>
                {event.sublabel}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: `${event.color}15`,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: event.color,
                }}
              >
                {event.days}d
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { mode, profile, hasRealCycleData } = useProfile();
  const isPeri = mode === "perimenopause";

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.profile.get.queryKey() }),
      queryClient.invalidateQueries({
        queryKey: trpc.log.history.queryKey({ days: 365 }),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.log.history.queryKey({ days: 10 }),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.log.today.queryKey({ date: localDateStr() }),
      }),
    ]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F7FD" }}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 16,
            marginBottom: 16,
          }}
        >
          <View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#1E1830" }}>
              Ola, {profile?.name ?? ""}
            </Text>
            <Text style={{ fontSize: 13, color: "#9088A8", marginTop: 2 }}>
              {formatDate(TODAY)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={onRefresh}
              hitSlop={8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#E5E0F5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#8B7EC8" />
              ) : (
                <Ionicons name="refresh" size={17} color="#8B7EC8" />
              )}
            </Pressable>
            <Link href="/profile" asChild>
              <Pressable
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "#E5E0F5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person-outline" size={20} color="#8B7EC8" />
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Hero card — switches by mode */}
        {isPeri ? (
          <PerimenopauseHeroCard />
        ) : (
          <PhaseHeroCard
            onInteractionStart={() => setScrollEnabled(false)}
            onInteractionEnd={() => setScrollEnabled(true)}
          />
        )}

        <QuickLogSection />

        {!isPeri && hasRealCycleData && <NextEventsSection />}
      </ScrollView>
    </SafeAreaView>
  );
}
