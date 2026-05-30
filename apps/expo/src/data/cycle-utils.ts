export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

export interface PhaseInfo {
  name: string;
  iconName: string;
  color: string;
  bgColor: string;
  darkColor: string;
  description: string;
  energy: string;
  mood: string;
  affirmation: string;
}

export function getPhaseForDay(
  dayOfCycle: number,
  cycleLength: number,
  periodLength: number,
): CyclePhase {
  if (dayOfCycle <= periodLength) return "menstrual";
  const ovulationDay = cycleLength - 14;
  if (dayOfCycle < ovulationDay - 1) return "follicular";
  if (dayOfCycle <= ovulationDay + 1) return "ovulation";
  return "luteal";
}

export function getPhaseInfo(phase: CyclePhase): PhaseInfo {
  const info: Record<CyclePhase, PhaseInfo> = {
    menstrual: {
      name: "Menstrual",
      iconName: "water",
      color: "#B57BAC",
      bgColor: "#F5EBF8",
      darkColor: "#9060A0",
      description:
        "Seu corpo descansa e renova. Priorize o autocuidado e ouça o que você precisa.",
      energy: "Baixa",
      mood: "Introspectiva",
      affirmation: "Descansar é um ato de amor próprio. Você merece cuidado.",
    },
    follicular: {
      name: "Folicular",
      iconName: "leaf",
      color: "#7AAEC4",
      bgColor: "#E8F4FA",
      darkColor: "#5A96B2",
      description:
        "Sua energia está crescendo. É o momento ideal para novos começos e projetos.",
      energy: "Crescente",
      mood: "Otimista",
      affirmation: "Você está florescendo. O mundo espera o seu melhor.",
    },
    ovulation: {
      name: "Ovulação",
      iconName: "star",
      color: "#7060B8",
      bgColor: "#EDE8FB",
      darkColor: "#5A50A4",
      description:
        "Pico de energia e fertilidade. Você está no seu auge — brilhe!",
      energy: "Alta",
      mood: "Sociável",
      affirmation: "Você irradia luz. Confie no seu poder.",
    },
    luteal: {
      name: "Lútea",
      iconName: "moon",
      color: "#9B8FCA",
      bgColor: "#F0EDFB",
      darkColor: "#7A70B8",
      description:
        "Fase de reflexão e introspecção. Cuide-se com gentileza e atenção.",
      energy: "Decrescente",
      mood: "Sensível",
      affirmation: "Sua sensibilidade é força. Tudo bem desacelerar.",
    },
  };
  return info[phase];
}

export function getDaysUntilNextPeriod(
  dayOfCycle: number,
  cycleLength: number,
): number {
  return cycleLength - dayOfCycle;
}

export type CalendarDay =
  | { empty: true }
  | {
      empty: false;
      day: number;
      date: Date;
      dayOfCycle: number;
      phase: CyclePhase;
      isPeriod: boolean;
      isOvulation: boolean;
      isFertile: boolean;
      isToday: boolean;
    };

export function getCalendarDays(
  year: number,
  month: number,
  lastPeriodStart: Date,
  cycleLength: number,
  periodLength: number,
): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ empty: true });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    const periodStart = new Date(lastPeriodStart);
    periodStart.setHours(0, 0, 0, 0);

    const diffMs = date.getTime() - periodStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const dayOfCycle =
      (((diffDays % cycleLength) + cycleLength) % cycleLength) + 1;

    const ovulationDay = cycleLength - 14;
    const phase = getPhaseForDay(dayOfCycle, cycleLength, periodLength);

    days.push({
      empty: false,
      day,
      date,
      dayOfCycle,
      phase,
      isPeriod: dayOfCycle <= periodLength,
      isOvulation: dayOfCycle === ovulationDay,
      isFertile:
        dayOfCycle >= ovulationDay - 1 && dayOfCycle <= ovulationDay + 1,
      isToday: date.getTime() === today.getTime(),
    });
  }

  return days;
}

export function formatDate(date: Date): string {
  const months = [
    "janeiro",
    "fevereiro",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const days = [
    "domingo",
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
  ];
  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
}

export function formatMonthYear(year: number, month: number): string {
  const months = [
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
  return `${months[month]} ${year}`;
}
