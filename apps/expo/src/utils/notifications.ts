import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

// ─── Daily reminder ────────────────────────────────────────────────────────

const REMINDER_KEY = "lumi_reminder";

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  message?: string;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 20,
  minute: 0,
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const stored = await SecureStore.getItemAsync(REMINDER_KEY);
    return stored ? (JSON.parse(stored) as ReminderSettings) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === Notifications.PermissionStatus.GRANTED) return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === Notifications.PermissionStatus.GRANTED;
}

// Daily reminder fires every 3h: 9h, 12h, 15h, 18h, 21h
const DAILY_REMINDER_HOURS = [9, 12, 15, 18, 21];

const DAILY_REMINDER_MESSAGES = [
  "Como você está se sentindo agora? 🌸",
  "Algo para monitorar hoje? Registre aqui. ✍️",
  "Pause um momento — como está seu corpo hoje?",
  "Que tal registrar como foi sua manhã? ☀️",
  "Seu ciclo importa. Anote como você está! 💜",
  "Como está sua energia agora?",
  "Dores, humor, sono — tudo conta. Registre! 🌙",
  "Um minutinho para cuidar de você. 💛",
  "Como foi seu dia até agora?",
  "Checkin rápido: corpo e mente, como estão?",
  "Não esqueça de registrar seu dia! ✨",
  "Seus dados ajudam a entender seu ciclo. Registre! 📊",
  "Como está seu humor hoje?",
  "Você dormiu bem? Anote aqui. 😴",
  "Sentiu algum sintoma hoje? Registre agora.",
];

export async function saveReminderSettings(
  settings: ReminderSettings,
): Promise<void> {
  await SecureStore.setItemAsync(REMINDER_KEY, JSON.stringify(settings));
  // Cancel all previously scheduled slots
  await Promise.all(
    DAILY_REMINDER_HOURS.map((h) =>
      Notifications.cancelScheduledNotificationAsync(
        `daily-reminder-${h}`,
      ).catch(() => undefined),
    ),
  );
  if (settings.enabled) {
    const customMessage = settings.message?.trim();
    // Shuffle messages so each slot gets a different one
    const shuffled = [...DAILY_REMINDER_MESSAGES].sort(
      () => Math.random() - 0.5,
    );
    await Promise.all(
      DAILY_REMINDER_HOURS.map((h, i) =>
        Notifications.scheduleNotificationAsync({
          identifier: `daily-reminder-${h}`,
          content: {
            title: "Lumi",
            body: customMessage ?? shuffled[i % shuffled.length] ?? "",
            android: { channelId: "default" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: h,
            minute: 0,
          },
        }),
      ),
    );
  }
}

// ─── Pill reminder ─────────────────────────────────────────────────────────

const PILL_KEY = "lumi_pill_reminder";

export interface PillReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  message?: string;
}

const DEFAULT_PILL: PillReminderSettings = {
  enabled: false,
  hour: 8,
  minute: 0,
};

export async function getPillReminderSettings(): Promise<PillReminderSettings> {
  try {
    const stored = await SecureStore.getItemAsync(PILL_KEY);
    return stored ? (JSON.parse(stored) as PillReminderSettings) : DEFAULT_PILL;
  } catch {
    return DEFAULT_PILL;
  }
}

export async function savePillReminderSettings(
  settings: PillReminderSettings,
): Promise<void> {
  await SecureStore.setItemAsync(PILL_KEY, JSON.stringify(settings));
  await Notifications.cancelScheduledNotificationAsync("pill-reminder").catch(
    () => undefined,
  );
  if (settings.enabled) {
    await Notifications.scheduleNotificationAsync({
      identifier: "pill-reminder",
      content: {
        title: "Lumi",
        body: settings.message?.trim() ?? "Hora de tomar o anticoncepcional 💊",
        android: { channelId: "default" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
      },
    });
  }
}

// ─── Period reminder ───────────────────────────────────────────────────────

const PERIOD_KEY = "lumi_period_reminder";

export interface PeriodReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  message?: string;
}

const DEFAULT_PERIOD: PeriodReminderSettings = {
  enabled: false,
  hour: 8,
  minute: 0,
};

export async function getPeriodReminderSettings(): Promise<PeriodReminderSettings> {
  try {
    const stored = await SecureStore.getItemAsync(PERIOD_KEY);
    return stored
      ? (JSON.parse(stored) as PeriodReminderSettings)
      : DEFAULT_PERIOD;
  } catch {
    return DEFAULT_PERIOD;
  }
}

// nextPeriodDate: "YYYY-MM-DD" of predicted period start
export async function savePeriodReminderSettings(
  settings: PeriodReminderSettings,
  nextPeriodDate: string,
): Promise<void> {
  await SecureStore.setItemAsync(PERIOD_KEY, JSON.stringify(settings));
  await Notifications.cancelScheduledNotificationAsync("period-reminder").catch(
    () => undefined,
  );
  if (settings.enabled) {
    const triggerDate = new Date(
      `${nextPeriodDate}T${String(settings.hour).padStart(2, "0")}:${String(settings.minute).padStart(2, "0")}:00`,
    );
    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        identifier: "period-reminder",
        content: {
          title: "Lumi",
          body:
            settings.message?.trim() ??
            "Sua menstruação está prevista para hoje 🌸",
          android: { channelId: "default" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    }
  }
}

// ─── Health preferences ────────────────────────────────────────────────────

const HEALTH_KEY = "lumi_health_prefs";

export interface HealthPrefs {
  conditions: string[];
  medications: string[];
}

const DEFAULT_HEALTH: HealthPrefs = { conditions: [], medications: [] };

export async function getHealthPrefs(): Promise<HealthPrefs> {
  try {
    const stored = await SecureStore.getItemAsync(HEALTH_KEY);
    return stored ? (JSON.parse(stored) as HealthPrefs) : DEFAULT_HEALTH;
  } catch {
    return DEFAULT_HEALTH;
  }
}

export async function saveHealthPrefs(prefs: HealthPrefs): Promise<void> {
  await SecureStore.setItemAsync(HEALTH_KEY, JSON.stringify(prefs));
}

// IDs of contraceptive medications that warrant a daily pill reminder
export const CONTRACEPTIVE_MED_IDS = ["pilula", "adesivo", "anel", "injecao"];
