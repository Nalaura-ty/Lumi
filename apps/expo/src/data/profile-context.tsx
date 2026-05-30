import { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CyclePhase } from "./cycle-utils";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { getPhaseForDay } from "./cycle-utils";

export type ProfileMode = "cycle" | "perimenopause";

export interface CycleData {
  dayOfCycle: number;
  phase: CyclePhase;
  daysUntilNextPeriod: number;
  daysUntilOvulation: number;
  cycleLength: number;
  periodLength: number;
  lastPeriodStart: Date;
}

export interface UserProfileData {
  name: string;
  cycleLength: number;
  periodLength: number;
  lastPeriodStart: string;
  mode: string;
  birthYear?: number | null;
}

interface ProfileContextValue {
  mode: ProfileMode;
  setMode: (mode: ProfileMode) => void;
  profile: UserProfileData | null | undefined;
  cycleData: CycleData;
  hasRealCycleData: boolean;
  hasCurrentPhaseData: boolean;
  hasCyclePrediction: boolean;
  isLoading: boolean;
}

const _today = new Date();
const DEFAULT_CYCLE: CycleData = {
  dayOfCycle: 7,
  phase: "follicular" satisfies CyclePhase,
  daysUntilNextPeriod: 21,
  daysUntilOvulation: 7,
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStart: new Date(
    _today.getFullYear(),
    _today.getMonth(),
    _today.getDate() - 7,
  ),
};

const ProfileContext = createContext<ProfileContextValue>({
  mode: "cycle",
  setMode: (_mode: ProfileMode) => {
    /* noop */
  },
  profile: null,
  cycleData: DEFAULT_CYCLE,
  hasRealCycleData: false,
  hasCurrentPhaseData: false,
  hasCyclePrediction: false,
  isLoading: false,
});

function computeCycleData(
  lastPeriodStartStr: string,
  cycleLength: number,
  periodLength: number,
): CycleData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastPeriodStart = new Date(lastPeriodStartStr + "T00:00:00");
  const daysSinceStart = Math.floor(
    (today.getTime() - lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dayOfCycle = Math.max(1, (daysSinceStart % cycleLength) + 1);
  const phase = getPhaseForDay(dayOfCycle, cycleLength, periodLength);
  const daysUntilNextPeriod = cycleLength - dayOfCycle + 1;
  const ovulationDay = cycleLength - 14;
  const daysUntilOvulation =
    dayOfCycle > ovulationDay
      ? cycleLength - dayOfCycle + ovulationDay
      : ovulationDay - dayOfCycle;

  return {
    dayOfCycle,
    phase,
    daysUntilNextPeriod,
    daysUntilOvulation,
    cycleLength,
    periodLength,
    lastPeriodStart,
  };
}

// Returns all detected period start dates (ascending), each being the first
// day of a consecutive group of flow-logged days.
function detectAllPeriodStarts(
  logs: { date: string; flow?: string | null }[],
): string[] {
  const flowDates = logs
    .filter((l) => l.flow && l.flow !== "none" && l.flow !== "")
    .map((l) => l.date)
    .sort();
  if (flowDates.length === 0) return [];

  const starts: string[] = [];
  let groupStart = flowDates[0] ?? "";

  for (let i = 1; i < flowDates.length; i++) {
    const prev = new Date((flowDates[i - 1] ?? "") + "T00:00:00");
    const curr = new Date((flowDates[i] ?? "") + "T00:00:00");
    if (curr.getTime() - prev.getTime() > 2 * 86400000) {
      // gap bigger than 2 days → new period group
      starts.push(groupStart);
      groupStart = flowDates[i] ?? "";
    }
  }
  starts.push(groupStart);
  return starts;
}

function detectFirstFlowDate(
  logs: { date: string; flow?: string | null }[],
): string | null {
  const starts = detectAllPeriodStarts(logs);
  // Return start of the most recent period
  return starts.length > 0 ? (starts[starts.length - 1] ?? null) : null;
}

// Derive average cycle length from gaps between detected period starts.
// Returns null if fewer than 2 periods found (not enough data).
function detectAvgCycleLength(
  logs: { date: string; flow?: string | null }[],
): number | null {
  const starts = detectAllPeriodStarts(logs);
  if (starts.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const a = new Date((starts[i - 1] ?? "") + "T00:00:00");
    const b = new Date((starts[i] ?? "") + "T00:00:00");
    const days = Math.round((b.getTime() - a.getTime()) / 86400000);
    if (days >= 18 && days <= 60) gaps.push(days); // sanity filter
  }
  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}

// Detect the actual period length from consecutive flow-logged days starting at periodStart.
// Returns null if the period hasn't ended yet (no confirmed non-flow day after the start),
// to avoid cutting the period short while it's still ongoing.
function detectActualPeriodLength(
  logs: { date: string; flow?: string | null }[],
  periodStart: string,
  todayStr: string,
): number | null {
  const logMap = new Map(logs.map((l) => [l.date, l.flow]));
  let length = 0;
  const start = new Date(periodStart + "T00:00:00");
  for (let i = 0; i < 20; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dateStr > todayStr) break; // don't look into future
    const flow = logMap.get(dateStr);
    if (flow && flow !== "none" && flow !== "") {
      length++;
    } else if (length > 0) {
      // Period ended — confirmed by a non-flow day after start
      return length;
    }
  }
  // Period hasn't ended yet (or no flow found) — don't override profile default
  return null;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [, forceUpdate] = useState(0);
  const { data: session, isPending } = authClient.useSession();
  const isAuthenticated = !isPending && !!session;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") forceUpdate((n) => n + 1);
    });
    return () => sub.remove();
  }, []);
  const profileQuery = useQuery({
    ...trpc.profile.get.queryOptions(),
    enabled: isAuthenticated,
  });
  const logsQuery = useQuery({
    ...trpc.log.history.queryOptions({ days: 365 }),
    enabled: isAuthenticated,
  });
  const upsertMutation = useMutation({
    ...trpc.profile.upsert.mutationOptions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trpc.profile.get.queryKey(),
      });
    },
  });

  const profile = profileQuery.data ?? null;
  const mode: ProfileMode =
    profile?.mode === "perimenopause" ? "perimenopause" : "cycle";

  const setMode = (newMode: ProfileMode) => {
    upsertMutation.mutate({ mode: newMode });
  };

  const profileHasRealDate = !!(
    profile?.lastPeriodStart && profile.lastPeriodStart !== "2000-01-01"
  );

  // Derive period start from logged flow data (most recent period start)
  const logs = logsQuery.data ?? [];
  const typedLogs = logs as { date: string; flow?: string | null }[];
  const loggedPeriodStart = detectFirstFlowDate(typedLogs);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Show cycle ring as soon as the user has any log, even without flow data
  const hasAnyLogs = logs.length > 0;
  const hasRealCycleData =
    profileHasRealDate || !!loggedPeriodStart || hasAnyLogs;

  // We know today's actual phase only when there's flow data or a real profile date
  const hasCurrentPhaseData = profileHasRealDate || !!loggedPeriodStart;

  // hasCyclePrediction: true only when we have enough history to predict future phases
  // Requires either a manually-set profile date OR flow data from before today
  const hasCyclePrediction =
    profileHasRealDate || (!!loggedPeriodStart && loggedPeriodStart < todayStr);

  const effectiveLastPeriodStart =
    loggedPeriodStart ??
    (profileHasRealDate ? profile.lastPeriodStart : todayStr);

  // Use detected period length from consecutive logged flow days when available
  const detectedPeriodLength = loggedPeriodStart
    ? detectActualPeriodLength(typedLogs, loggedPeriodStart, todayStr)
    : null;
  const effectivePeriodLength =
    detectedPeriodLength ?? profile?.periodLength ?? 5;

  // Derive cycle length from logged history (average gap between detected periods).
  // Falls back to the manually-set profile value so single-cycle users still get a prediction.
  const detectedCycleLength = detectAvgCycleLength(typedLogs);
  const effectiveCycleLength =
    detectedCycleLength ?? profile?.cycleLength ?? 28;

  const cycleData = profile
    ? computeCycleData(
        effectiveLastPeriodStart,
        effectiveCycleLength,
        effectivePeriodLength,
      )
    : DEFAULT_CYCLE;

  return (
    <ProfileContext.Provider
      value={{
        mode,
        setMode,
        profile,
        cycleData,
        hasRealCycleData,
        hasCurrentPhaseData,
        hasCyclePrediction,
        isLoading: profileQuery.isLoading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}

export const PROFILE_MODE_INFO: Record<
  ProfileMode,
  { label: string; icon: string; description: string; color: string }
> = {
  cycle: {
    label: "Ciclo Menstrual",
    icon: "water-outline",
    description: "Acompanhe seu ciclo, ovulação e bem-estar.",
    color: "#9B8FCA",
  },
  perimenopause: {
    label: "Perimenopausa",
    icon: "flame-outline",
    description: "Suporte para perimenopausa e transição hormonal.",
    color: "#B57BAC",
  },
};
