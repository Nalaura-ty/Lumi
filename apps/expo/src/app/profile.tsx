import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  PeriodReminderSettings,
  PillReminderSettings,
  ReminderSettings,
} from "~/utils/notifications";
import { useProfile } from "~/data/profile-context";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import {
  CONTRACEPTIVE_MED_IDS,
  getHealthPrefs,
  getPeriodReminderSettings,
  getPillReminderSettings,
  getReminderSettings,
  requestNotificationPermission,
  saveHealthPrefs,
  savePeriodReminderSettings,
  savePillReminderSettings,
  saveReminderSettings,
} from "~/utils/notifications";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.[0] ?? "").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ProfileAvatar() {
  const { profile } = useProfile();
  const initials = getInitials(profile?.name ?? "");
  return (
    <View style={{ alignItems: "center", paddingVertical: 32 }}>
      <View
        style={{
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: "#8B7EC8",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
          borderWidth: 3,
          borderColor: "#C4B8F0",
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: "800",
            color: "white",
            letterSpacing: 1,
          }}
        >
          {initials}
        </Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#1E1830" }}>
        {profile?.name ?? ""}
      </Text>
      {profile?.birthYear ? (
        <Text style={{ fontSize: 13, color: "#9088A8", marginTop: 2 }}>
          {new Date().getFullYear() - profile.birthYear} anos
        </Text>
      ) : null}
    </View>
  );
}

function CycleSummaryRow() {
  const { cycleData } = useProfile();
  const items = [
    { label: "Ciclo", value: `${cycleData.cycleLength}d`, color: "#9B8FCA" },
    {
      label: "Menstruação",
      value: `${cycleData.periodLength}d`,
      color: "#8B7EC8",
    },
    {
      label: "Dia do\nciclo",
      value: `${cycleData.dayOfCycle}`,
      color: "#7AAEC4",
    },
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {items.map((item, i) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            alignItems: "center",
            borderRightWidth: i < items.length - 1 ? 1 : 0,
            borderRightColor: "#F3E0E8",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800", color: item.color }}>
            {item.value}
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: "#9088A8",
              textAlign: "center",
              marginTop: 2,
            }}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#F0EBFD",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="remove" size={18} color="#8B7EC8" />
      </Pressable>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: "#1E1830",
          minWidth: 36,
          textAlign: "center",
        }}
      >
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#F0EBFD",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="add" size={18} color="#8B7EC8" />
      </Pressable>
    </View>
  );
}

// ─── Edit Cycle Modal ────────────────────────────────────────────────────────

function EditCycleModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { profile, cycleData } = useProfile();
  const queryClient = useQueryClient();
  const [name, setName] = useState(profile?.name ?? "");
  const [cycleLength, setCycleLength] = useState(cycleData.cycleLength);
  const [periodLength, setPeriodLength] = useState(
    profile?.periodLength ?? cycleData.periodLength,
  );
  const [lastPeriodStart, setLastPeriodStart] = useState(
    profile?.lastPeriodStart && profile.lastPeriodStart !== "2000-01-01"
      ? profile.lastPeriodStart
      : "",
  );

  const upsertMutation = useMutation({
    ...trpc.profile.upsert.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trpc.profile.get.queryKey(),
      });
      onClose();
    },
  });

  const handleSave = () => {
    if (lastPeriodStart && !/^\d{4}-\d{2}-\d{2}$/.test(lastPeriodStart)) {
      Alert.alert("Data inválida", "Use o formato AAAA-MM-DD (ex: 2025-05-01)");
      return;
    }
    upsertMutation.mutate({
      name: name.trim() || undefined,
      cycleLength,
      periodLength,
      lastPeriodStart: lastPeriodStart || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
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
            paddingBottom: 44,
            gap: 20,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D0C8E8",
              alignSelf: "center",
              marginBottom: 4,
            }}
          />
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#1E1830" }}>
            Editar perfil
          </Text>

          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#9088A8",
                letterSpacing: 0.8,
              }}
            >
              NOME
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              style={{
                backgroundColor: "#F8F4FE",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: "#1E1830",
                borderWidth: 1,
                borderColor: "#E8E2F5",
              }}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#1E1830" }}
              >
                Duração do ciclo
              </Text>
              <Text style={{ fontSize: 12, color: "#9088A8" }}>
                Entre 21 e 45 dias
              </Text>
            </View>
            <Stepper
              value={cycleLength}
              min={21}
              max={45}
              onChange={setCycleLength}
            />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#1E1830" }}
              >
                Duração da menstruação
              </Text>
              <Text style={{ fontSize: 12, color: "#9088A8" }}>
                Entre 1 e 10 dias
              </Text>
            </View>
            <Stepper
              value={periodLength}
              min={1}
              max={10}
              onChange={setPeriodLength}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: "#9088A8",
                letterSpacing: 0.8,
              }}
            >
              INÍCIO DA ÚLTIMA MENSTRUAÇÃO
            </Text>
            <TextInput
              value={lastPeriodStart}
              onChangeText={setLastPeriodStart}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#B0A8C8"
              style={{
                backgroundColor: "#F8F4FE",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: "#1E1830",
                borderWidth: 1,
                borderColor: "#E8E2F5",
              }}
            />
          </View>

          <Pressable
            onPress={handleSave}
            disabled={upsertMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor:
                pressed || upsertMutation.isPending ? "#A098D8" : "#8B7EC8",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 4,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>
              {upsertMutation.isPending ? "Salvando..." : "Salvar"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Reminders Modal ─────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7–21h

function HourPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (h: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {HOURS.map((h) => (
        <Pressable
          key={h}
          onPress={() => onChange(h)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: value === h ? "#8B7EC8" : "#F0EBFD",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: value === h ? "white" : "#8B7EC8",
            }}
          >
            {pad(h)}:00
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ReminderRow({
  title,
  subtitle,
  enabled,
  onToggle,
  hour,
  onHourChange,
  message,
  onMessageChange,
  messagePlaceholder,
  hideHour,
  hideMessage,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => Promise<void>;
  hour: number;
  onHourChange: (h: number) => void;
  message?: string;
  onMessageChange?: (t: string) => void;
  messagePlaceholder?: string;
  hideHour?: boolean;
  hideMessage?: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#F8F4FE",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View style={{ gap: 2, flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E1830" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 12, color: "#9088A8" }}>{subtitle}</Text>
          ) : null}
        </View>
        <Switch
          value={enabled}
          onValueChange={(v) => {
            void onToggle(v);
          }}
          trackColor={{ false: "#E8E2F5", true: "#8B7EC8" }}
          thumbColor="white"
        />
      </View>
      {enabled && (
        <>
          {!hideHour && (
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#9088A8",
                  letterSpacing: 0.8,
                }}
              >
                HORÁRIO
              </Text>
              <HourPicker value={hour} onChange={onHourChange} />
            </View>
          )}
          {!hideMessage && onMessageChange && (
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#9088A8",
                  letterSpacing: 0.8,
                }}
              >
                MENSAGEM
              </Text>
              <TextInput
                value={message ?? ""}
                onChangeText={onMessageChange}
                placeholder={messagePlaceholder}
                placeholderTextColor="#B0A8C8"
                style={{
                  backgroundColor: "#F8F4FE",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 14,
                  color: "#1E1830",
                  borderWidth: 1,
                  borderColor: "#E8E2F5",
                }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function RemindersSection() {
  const { cycleData, hasCurrentPhaseData } = useProfile();
  const [daily, setDaily] = useState<ReminderSettings>({
    enabled: false,
    hour: 20,
    minute: 0,
  });
  const [pill, setPill] = useState<PillReminderSettings>({
    enabled: false,
    hour: 8,
    minute: 0,
  });
  const [period, setPeriod] = useState<PeriodReminderSettings>({
    enabled: false,
    hour: 8,
    minute: 0,
  });
  const [hasContraceptive, setHasContraceptive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getReminderSettings().then(setDaily);
    void getPillReminderSettings().then(setPill);
    void getPeriodReminderSettings().then(setPeriod);
    void getHealthPrefs().then((prefs) => {
      setHasContraceptive(
        prefs.medications.some((m) => CONTRACEPTIVE_MED_IDS.includes(m)),
      );
    });
  }, []);

  const requirePermission = async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    if (!granted)
      Alert.alert(
        "Permissão negada",
        "Ative as notificações nas configurações do dispositivo.",
      );
    return granted;
  };

  const toggleDaily = async (value: boolean) => {
    if (value && !(await requirePermission())) return;
    setDaily((s) => ({ ...s, enabled: value }));
  };
  const togglePill = async (value: boolean) => {
    if (value && !(await requirePermission())) return;
    setPill((s) => ({ ...s, enabled: value }));
  };
  const togglePeriod = async (value: boolean) => {
    if (value && !(await requirePermission())) return;
    setPeriod((s) => ({ ...s, enabled: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await saveReminderSettings(daily);
    await savePillReminderSettings(pill);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + cycleData.daysUntilNextPeriod);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
    await savePeriodReminderSettings(period, nextStr);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: "#9088A8",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        LEMBRETES
      </Text>
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 20,
          padding: 18,
          gap: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <ReminderRow
          title="Registro diário"
          subtitle=""
          enabled={daily.enabled}
          onToggle={toggleDaily}
          hour={daily.hour}
          onHourChange={(h) => setDaily((s) => ({ ...s, hour: h }))}
          hideHour
          hideMessage
        />

        {hasCurrentPhaseData && (
          <>
            <View style={{ height: 1, backgroundColor: "#EDE8F6" }} />
            <ReminderRow
              title="Menstruação"
              subtitle={`Prevista em ${cycleData.daysUntilNextPeriod} dia${cycleData.daysUntilNextPeriod !== 1 ? "s" : ""}`}
              enabled={period.enabled}
              onToggle={togglePeriod}
              hour={period.hour}
              onHourChange={(h) => setPeriod((s) => ({ ...s, hour: h }))}
              message={period.message ?? ""}
              onMessageChange={(t) => setPeriod((s) => ({ ...s, message: t }))}
              messagePlaceholder="Sua menstruação está prevista para hoje 🌸"
            />
          </>
        )}

        {hasContraceptive && (
          <>
            <View style={{ height: 1, backgroundColor: "#EDE8F6" }} />
            <ReminderRow
              title="Anticoncepcional"
              subtitle="Lembrete para tomar o anticoncepcional"
              enabled={pill.enabled}
              onToggle={togglePill}
              hour={pill.hour}
              onHourChange={(h) => setPill((s) => ({ ...s, hour: h }))}
              message={pill.message ?? ""}
              onMessageChange={(t) => setPill((s) => ({ ...s, message: t }))}
              messagePlaceholder="Hora de tomar o anticoncepcional 💊"
            />
          </>
        )}

        <Pressable
          onPress={() => {
            void handleSave();
          }}
          disabled={saving}
          style={({ pressed }) => ({
            backgroundColor:
              pressed || saving ? "#A098D8" : saved ? "#6BBF8A" : "#8B7EC8",
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: "center",
            marginTop: 4,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "white" }}>
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar lembretes"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Health Conditions Modal ──────────────────────────────────────────────────

const HEALTH_CONDITIONS = [
  { id: "sop", label: "SOP (Síndrome do ovário policístico)" },
  { id: "endometriose", label: "Endometriose" },
  { id: "mioma", label: "Mioma uterino" },
  { id: "tireoide", label: "Problema de tireoide" },
  { id: "diabetes", label: "Diabetes" },
  { id: "hipertensao", label: "Hipertensão" },
  { id: "depressao", label: "Depressão" },
  { id: "ansiedade", label: "Transtorno de ansiedade" },
  { id: "tpm", label: "TPM intensa (TDPM)" },
  { id: "adenomiose", label: "Adenomiose" },
];

function HealthConditionsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      void getHealthPrefs().then((p) => setSelected(p.conditions));
    }
  }, [visible]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSave = async () => {
    setSaving(true);
    const prefs = await getHealthPrefs();
    await saveHealthPrefs({ ...prefs, conditions: selected });
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
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
            paddingBottom: 44,
            gap: 16,
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D0C8E8",
              alignSelf: "center",
              marginBottom: 4,
            }}
          />
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#1E1830" }}>
            Condições de saúde
          </Text>
          <Text style={{ fontSize: 13, color: "#9088A8", lineHeight: 18 }}>
            Selecione as condições que se aplicam a você. Isso ajuda o app a
            personalizar recomendações.
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 340 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {HEALTH_CONDITIONS.map((c) => {
              const active = selected.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggle(c.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: active ? "#F0EBFD" : "#FAFAFA",
                    borderWidth: 1,
                    borderColor: active ? "#8B7EC8" : "#EDE8F6",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: active ? "#8B7EC8" : "#C0B8D8",
                      backgroundColor: active ? "#8B7EC8" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active && (
                      <Ionicons name="checkmark" size={13} color="white" />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: active ? "600" : "400",
                      color: active ? "#1E1830" : "#5E5878",
                      flex: 1,
                    }}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({
              backgroundColor: pressed || saving ? "#A098D8" : "#8B7EC8",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>
              {saving ? "Salvando..." : "Salvar"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Medications Modal ───────────────────────────────────────────────────────

const MEDICATIONS = [
  { id: "pilula", label: "Pílula anticoncepcional" },
  { id: "diu_hormonal", label: "DIU hormonal (Mirena)" },
  { id: "diu_cobre", label: "DIU de cobre" },
  { id: "implante", label: "Implante subdérmico" },
  { id: "injecao", label: "Injeção anticoncepcional" },
  { id: "adesivo", label: "Adesivo contraceptivo" },
  { id: "anel", label: "Anel vaginal" },
  { id: "antidepressivo", label: "Antidepressivo" },
  { id: "ansiolítico", label: "Ansiolítico" },
  { id: "tireoide_med", label: "Medicamento para tireoide" },
  { id: "terapia_hormonal", label: "Terapia hormonal (TH)" },
  { id: "outro", label: "Outro medicamento" },
];

function MedicationsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      void getHealthPrefs().then((p) => setSelected(p.medications));
    }
  }, [visible]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSave = async () => {
    setSaving(true);
    const prefs = await getHealthPrefs();
    await saveHealthPrefs({ ...prefs, medications: selected });
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
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
            paddingBottom: 44,
            gap: 16,
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D0C8E8",
              alignSelf: "center",
              marginBottom: 4,
            }}
          />
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#1E1830" }}>
            Medicamentos
          </Text>
          <Text style={{ fontSize: 13, color: "#9088A8", lineHeight: 18 }}>
            Selecione os medicamentos que você usa regularmente.
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 340 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {MEDICATIONS.map((m) => {
              const active = selected.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => toggle(m.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: active ? "#F0EBFD" : "#FAFAFA",
                    borderWidth: 1,
                    borderColor: active ? "#8B7EC8" : "#EDE8F6",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: active ? "#8B7EC8" : "#C0B8D8",
                      backgroundColor: active ? "#8B7EC8" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active && (
                      <Ionicons name="checkmark" size={13} color="white" />
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: active ? "600" : "400",
                      color: active ? "#1E1830" : "#5E5878",
                      flex: 1,
                    }}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({
              backgroundColor: pressed || saving ? "#A098D8" : "#8B7EC8",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>
              {saving ? "Salvando..." : "Salvar"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [editModal, setEditModal] = useState(false);
  const [healthModal, setHealthModal] = useState(false);
  const [medsModal, setMedsModal] = useState(false);
  const logsQuery = useQuery(trpc.log.history.queryOptions({ days: 365 }));
  const { profile, cycleData } = useProfile();

  const clearAllMutation = useMutation({
    ...trpc.log.clearAll.mutationOptions(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.log.history.queryKey({ days: 365 }),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.log.history.queryKey({ days: 180 }),
        }),
      ]);
    },
  });

  const deleteAccountMutation = useMutation({
    ...trpc.profile.deleteAccount.mutationOptions(),
    onSuccess: async () => {
      await authClient.signOut();
      void queryClient.clear();
      router.replace("/login");
    },
  });

  const handleLogout = async () => {
    await authClient.signOut();
    void queryClient.clear();
    router.replace("/login");
  };

  const handleClearData = () => {
    Alert.alert(
      "Limpar todos os dados",
      "Isso vai apagar todos os seus registros permanentemente. Essa ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar tudo",
          style: "destructive",
          onPress: () => clearAllMutation.mutate(),
        },
      ],
    );
  };

  const _handleExportPDF = async () => {
    const logs = logsQuery.data ?? [];
    if (logs.length === 0) {
      Alert.alert("Sem dados", "Você não possui registros para exportar.");
      return;
    }

    const today = new Date();
    const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    const FLOW_PT: Record<string, string> = {
      light: "Leve",
      medium: "Moderado",
      heavy: "Intenso",
      spotting: "Manchas",
      none: "—",
    };
    const VITALITY_PT: Record<string, string> = {
      high: "Alta",
      good: "Boa",
      normal: "Normal",
      low: "Baixa",
      exhausted: "Exausta",
    };

    const rows = [...logs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 90)
      .map((l) => {
        const moods = (l.moods ?? []).join(", ");
        const symptoms = [...(l.pains ?? []), ...(l.pms ?? [])].join(", ");
        return `<tr>
          <td>${l.date}</td>
          <td>${FLOW_PT[l.flow ?? ""] ?? "—"}</td>
          <td>${VITALITY_PT[l.vitality ?? ""] ?? "—"}</td>
          <td style="font-size:11px">${moods || "—"}</td>
          <td style="font-size:11px">${symptoms || "—"}</td>
          <td style="font-size:11px">${l.notes ?? "—"}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; color: #1E1830; padding: 24px; font-size: 13px; }
  h1 { color: #8B7EC8; margin-bottom: 4px; }
  .sub { color: #9088A8; font-size: 12px; margin-bottom: 24px; }
  .info { display: flex; gap: 32px; margin-bottom: 24px; }
  .info-item { }
  .info-label { font-size: 11px; color: #9088A8; }
  .info-value { font-size: 16px; font-weight: bold; color: #1E1830; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #EDE8FB; color: #8B7EC8; padding: 8px 6px; text-align: left; font-size: 11px; }
  td { padding: 7px 6px; border-bottom: 1px solid #EDE8F6; vertical-align: top; }
  tr:nth-child(even) td { background: #F8F7FD; }
</style></head><body>
  <h1>Lumi — Relatório do Ciclo</h1>
  <p class="sub">Gerado em ${todayStr} · ${profile?.name ?? ""}</p>
  <div class="info">
    <div class="info-item">
      <div class="info-label">Duração do ciclo</div>
      <div class="info-value">${cycleData.cycleLength} dias</div>
    </div>
    <div class="info-item">
      <div class="info-label">Duração da menstruação</div>
      <div class="info-value">${cycleData.periodLength} dias</div>
    </div>
    <div class="info-item">
      <div class="info-label">Dia atual do ciclo</div>
      <div class="info-value">${cycleData.dayOfCycle}º dia</div>
    </div>
    <div class="info-item">
      <div class="info-label">Total de registros</div>
      <div class="info-value">${logs.length}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Data</th><th>Fluxo</th><th>Energia</th><th>Humores</th><th>Sintomas</th><th>Notas</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:24px;font-size:11px;color:#9088A8">Exportado pelo app Lumi · últimos 90 registros</p>
</body></html>`;

    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) throw new Error("cacheDirectory indisponível");
      const path = `${cacheDir}lumi-relatorio.html`;
      await FileSystem.writeAsStringAsync(path, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: "text/html",
          dialogTitle: "Exportar relatório Lumi",
          UTI: "public.html",
        });
      } else {
        Alert.alert("Relatório salvo", `Arquivo em:\n${path}`);
      }
    } catch (e) {
      Alert.alert(
        "Erro ao exportar",
        e instanceof Error ? e.message : String(e),
      );
    }
  };

  const _handleExportData = async () => {
    const logs = logsQuery.data ?? [];
    if (logs.length === 0) {
      Alert.alert("Sem dados", "Você não possui registros para exportar.");
      return;
    }
    const headers = [
      "Data",
      "Fluxo",
      "Humores",
      "Dores",
      "TPM",
      "Corrimento",
      "Sono (qualidade)",
      "Sono (horas)",
      "Vitalidade",
      "Sexo",
      "Pele",
      "Digestão",
      "Exercício",
      "Social",
      "Saúde",
      "Anticoncepção",
      "Menopausa",
      "Gravidez",
      "Peso",
      "Notas",
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = logs.map((l) =>
      [
        l.date,
        l.flow ?? "",
        (l.moods ?? []).join(";"),
        (l.pains ?? []).join(";"),
        (l.pms ?? []).join(";"),
        l.discharge ?? "",
        l.sleepQuality ?? "",
        l.sleepHours?.toString() ?? "",
        l.vitality ?? "",
        (l.sex ?? []).join(";"),
        (l.skin ?? []).join(";"),
        (l.digestion ?? []).join(";"),
        (l.exercise ?? []).join(";"),
        (l.social ?? []).join(";"),
        (l.health ?? []).join(";"),
        (l.contraception ?? []).join(";"),
        (l.menopause ?? []).join(";"),
        (l.pregnancy ?? []).join(";"),
        l.weight?.toString() ?? "",
        l.notes ?? "",
      ]
        .map(escape)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    await Share.share({ message: csv, title: "lumi_dados.csv" });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Excluir conta",
      "Isso vai apagar sua conta e todos os dados permanentemente. Essa ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir conta",
          style: "destructive",
          onPress: () => deleteAccountMutation.mutate(),
        },
      ],
    );
  };

  interface SettingsItem {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    sublabel?: string;
    color: string;
    danger?: boolean;
    soon?: boolean;
    onPress?: () => void;
  }

  const SETTINGS_GROUPS: { title: string; items: SettingsItem[] }[] = [
    {
      title: "Meu ciclo",
      items: [
        {
          icon: "calendar-outline",
          label: "Editar ciclo",
          sublabel: "Duração e menstruação",
          color: "#8B7EC8",
          onPress: () => setEditModal(true),
        },
      ],
    },
    {
      title: "Saúde",
      items: [
        {
          icon: "body-outline",
          label: "Condições de saúde",
          sublabel: "SOP, endometriose e outras",
          color: "#7AAEC4",
          onPress: () => setHealthModal(true),
        },
        {
          icon: "medkit-outline",
          label: "Medicamentos",
          sublabel: "Anticoncepcional e outros",
          color: "#9B8FCA",
          onPress: () => setMedsModal(true),
        },
      ],
    },

    {
      title: "",
      items: [
        {
          icon: "trash-outline",
          label: "Limpar todos os dados",
          color: "#E05C7A",
          danger: true,
          onPress: handleClearData,
        },
        {
          icon: "person-remove-outline",
          label: "Excluir conta",
          color: "#C0392B",
          danger: true,
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FDF8FA" }}
      edges={["bottom"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileAvatar />
        <CycleSummaryRow />

        {SETTINGS_GROUPS.map((group, gi) => (
          <View key={gi} style={{ marginBottom: 24, paddingHorizontal: 20 }}>
            {group.title ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#9088A8",
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                {group.title.toUpperCase()}
              </Text>
            ) : null}
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 20,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {group.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={item.soon ? undefined : item.onPress}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor:
                      pressed && !item.soon ? "#FDF0F4" : "white",
                    borderBottomWidth: i < group.items.length - 1 ? 1 : 0,
                    borderBottomColor: "#EDE8F6",
                    opacity: item.soon ? 0.55 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: item.danger
                        ? "#FDE8EF"
                        : `${item.color}18`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: item.danger ? item.color : "#1E1830",
                        }}
                      >
                        {item.label}
                      </Text>
                      {item.soon && (
                        <View
                          style={{
                            backgroundColor: "#EDE8F6",
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: "#9088A8",
                              letterSpacing: 0.5,
                            }}
                          >
                            EM BREVE
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.sublabel && (
                      <Text style={{ fontSize: 12, color: "#9088A8" }}>
                        {item.sublabel}
                      </Text>
                    )}
                  </View>
                  {!item.soon && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#B0A8C8"
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <RemindersSection />

        {/* Widget info card */}
        <View
          style={{
            marginHorizontal: 20,
            marginBottom: 24,
            backgroundColor: "#F0EBFD",
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: "#8B7EC820",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#8B7EC8",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="apps-outline" size={18} color="white" />
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: "#1E1830",
                flex: 1,
              }}
            >
              Widget para tela inicial
            </Text>
            <View
              style={{
                backgroundColor: "#EDE8F6",
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: "#9088A8",
                  letterSpacing: 0.5,
                }}
              >
                EM BREVE
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: "#7060B8", lineHeight: 18 }}>
            Widgets para a tela inicial exigem uma build nativa publicada via
            EAS Build. Não estão disponíveis na versão de desenvolvimento.
          </Text>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 20,
            marginBottom: 8,
            padding: 16,
            backgroundColor: pressed ? "#FDF0F4" : "white",
            borderRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          })}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#FDE8EF",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#B57BAC" />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#B57BAC",
              flex: 1,
            }}
          >
            Sair da conta
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#B0A8C8" />
        </Pressable>

        <View style={{ height: 20 }} />
      </ScrollView>

      <EditCycleModal visible={editModal} onClose={() => setEditModal(false)} />
      <HealthConditionsModal
        visible={healthModal}
        onClose={() => setHealthModal(false)}
      />
      <MedicationsModal
        visible={medsModal}
        onClose={() => setMedsModal(false)}
      />
    </SafeAreaView>
  );
}
