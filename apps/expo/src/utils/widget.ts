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
}) {
  if (Platform.OS !== "android") return;
  NativeModules.LumiWidget?.updateWidget(
    params.phase,
    params.phaseName,
    params.dayOfCycle,
    params.daysUntilPeriod,
  );
}
