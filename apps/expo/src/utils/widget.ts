import { NativeModules, Platform } from "react-native";

/**
 * Atualiza o widget Android com os dados do ciclo atual.
 * No-op em iOS e quando nenhum widget estiver instalado.
 */
export function updateAndroidWidget(params: {
  phase: "menstrual" | "follicular" | "ovulation" | "luteal";
  phaseName: string;
  dayOfCycle: number;
  daysUntilPeriod: number;
  mode: "cycle" | "perimenopause";
  daysSinceLastPeriod: number;
}) {
  if (Platform.OS !== "android") return;
  const lumiWidget = NativeModules.LumiWidget as
    | {
        updateWidget?: (
          phase: string,
          phaseName: string,
          day: number,
          daysUntil: number,
          mode: string,
          daysSinceLastPeriod: number,
        ) => void;
      }
    | undefined;
  lumiWidget?.updateWidget?.(
    params.phase,
    params.phaseName,
    params.dayOfCycle,
    params.daysUntilPeriod,
    params.mode,
    params.daysSinceLastPeriod,
  );
}
