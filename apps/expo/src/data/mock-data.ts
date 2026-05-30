import type { CyclePhase } from "./cycle-utils";
import { getPhaseForDay } from "./cycle-utils";

// Reference: today is May 29, 2026
// Cycle started May 9, 2026 => Day 21 of a 28-day cycle
export const MOCK_USER = {
  name: "Sofia",
  age: 26,
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStart: new Date(2026, 4, 9), // May 9, 2026
};

export const MOCK_CURRENT_CYCLE = {
  dayOfCycle: 21,
  phase: getPhaseForDay(21, 28, 5),
  daysUntilNextPeriod: 7,
  daysUntilOvulation: 22,
  nextPeriodDate: new Date(2026, 5, 6),
  nextOvulationDate: new Date(2026, 5, 20),
  cycleProgress: 21 / 28,
};

export const PAST_CYCLES = [
  {
    id: "1",
    start: new Date(2026, 4, 9),
    end: new Date(2026, 4, 13),
    length: 28,
    symptoms: ["Colicas", "Cansaco"],
  },
  {
    id: "2",
    start: new Date(2026, 3, 11),
    end: new Date(2026, 3, 15),
    length: 28,
    symptoms: ["Dor de cabeca", "Inchaço"],
  },
  {
    id: "3",
    start: new Date(2026, 2, 14),
    end: new Date(2026, 2, 18),
    length: 27,
    symptoms: ["Colicas", "Acne"],
  },
  {
    id: "4",
    start: new Date(2026, 1, 15),
    end: new Date(2026, 1, 19),
    length: 28,
    symptoms: ["Cansaco", "Inchaço"],
  },
  {
    id: "5",
    start: new Date(2026, 0, 18),
    end: new Date(2026, 0, 22),
    length: 28,
    symptoms: ["Colicas", "Dor de cabeca"],
  },
];

export const MOCK_LOGGED_DAYS: Record<
  string,
  { flow?: string; mood?: string; symptoms: string[]; notes?: string }
> = {
  "2026-05-09": {
    flow: "Forte",
    mood: "Cansada",
    symptoms: ["Colicas", "Dor de cabeca"],
    notes: "",
  },
  "2026-05-10": { flow: "Forte", mood: "Cansada", symptoms: ["Colicas"] },
  "2026-05-11": {
    flow: "Medio",
    mood: "Triste",
    symptoms: ["Colicas", "Cansaco"],
  },
  "2026-05-12": { flow: "Leve", mood: "Ok", symptoms: ["Cansaco"] },
  "2026-05-13": { flow: "Leve", mood: "Ok", symptoms: [] },
  "2026-05-14": { flow: undefined, mood: "Bem", symptoms: [] },
  "2026-05-20": { flow: undefined, mood: "Animada", symptoms: [] },
  "2026-05-23": { flow: undefined, mood: "Feliz", symptoms: [] },
  "2026-05-25": { flow: undefined, mood: "Energizada", symptoms: [] },
  "2026-05-27": { flow: undefined, mood: "Sensivel", symptoms: ["Inchaço"] },
  "2026-05-28": { flow: undefined, mood: "Cansada", symptoms: ["Cansaco"] },
};

export const MOCK_INSIGHTS = {
  avgCycleLength: 27.8,
  avgPeriodLength: 5,
  longestCycle: 29,
  shortestCycle: 27,
  mostCommonSymptoms: [
    { name: "Colicas", count: 4, percentage: 80 },
    { name: "Cansaco", count: 4, percentage: 80 },
    { name: "Inchaço", count: 3, percentage: 60 },
    { name: "Dor de cabeca", count: 2, percentage: 40 },
    { name: "Acne", count: 1, percentage: 20 },
  ],
  moodsByPhase: {
    menstrual: 42,
    follicular: 71,
    ovulation: 89,
    luteal: 55,
  },
};

export const SELF_CARE_BY_PHASE = {
  menstrual: {
    exercises: [
      {
        name: "Yoga restaurativa",
        duration: "20 min",
        icon: "fitness-outline",
      },
      { name: "Caminhada leve", duration: "30 min", icon: "walk-outline" },
      { name: "Alongamento", duration: "15 min", icon: "body-outline" },
    ],
    nutrition: [
      "Cha de gengibre com mel",
      "Alimentos ricos em ferro (espinafre, feijão)",
      "Chocolate amargo 70%+",
      "Caldo quente e reconfortante",
    ],
    sleep: "Durma 8-9 horas. Seu corpo está trabalhando muito agora.",
    ritual: "Banho quente com sal e lavanda. Bolsa de água quente na barriga.",
    mindfulness: "Meditação de 10 min focada em aceitação e gratidão.",
  },
  follicular: {
    exercises: [
      { name: "Pilates", duration: "45 min", icon: "fitness-outline" },
      { name: "Corrida leve", duration: "30 min", icon: "walk-outline" },
      { name: "Dança", duration: "30 min", icon: "musical-notes-outline" },
    ],
    nutrition: [
      "Proteínas magras (frango, peixe)",
      "Legumes frescos e coloridos",
      "Sementes de linhaça",
      "Smoothie verde vitaminado",
    ],
    sleep: "7-8 horas. Sua energia está se renovando naturalmente.",
    ritual: "Esfoliação corporal + hidratação profunda. Pele nova!",
    mindfulness: "Journaling de metas e intenções para o ciclo.",
  },
  ovulation: {
    exercises: [
      { name: "HIIT", duration: "30 min", icon: "flame-outline" },
      { name: "Musculação", duration: "50 min", icon: "barbell-outline" },
      { name: "Esporte em grupo", duration: "60 min", icon: "people-outline" },
    ],
    nutrition: [
      "Frutas antioxidantes (mirtilo, romã)",
      "Vegetais coloridos",
      "Agua com limão e chia",
      "Proteínas para sustentar o treino",
    ],
    sleep: "7 horas. Você está no pico — aproveite a energia!",
    ritual: "Skin care completo + seu perfume favorito. Você merece.",
    mindfulness: "Gratidão pelas conquistas. Visualização positiva.",
  },
  luteal: {
    exercises: [
      { name: "Yoga", duration: "40 min", icon: "fitness-outline" },
      { name: "Pilates", duration: "45 min", icon: "body-outline" },
      { name: "Natação", duration: "30 min", icon: "water-outline" },
    ],
    nutrition: [
      "Magnésio (banana, nozes, aveia)",
      "Cha de camomila antes de dormir",
      "Evite cafeína e açúcar refinado",
      "Agua e mais agua",
    ],
    sleep: "8-9 horas. Reduza telas 1h antes de dormir.",
    ritual: "Compressa quente + meias quentinhas. Silêncio e conforto.",
    mindfulness: "Journaling de emoções. Deixe tudo fluir sem julgamento.",
  },
};

export const AFFIRMATIONS: Record<string, string[]> = {
  menstrual: [],
  follicular: [],
  ovulation: [],
  luteal: [],
};

export const MOCK_PERIMENOPAUSE = {
  daysSinceLastPeriod: 42,
  lastPeriodDate: new Date(2026, 3, 17), // April 17
  hotFlashesToday: 2,
  hotFlashesThisWeek: 9,
  averageCycleVariation: 14, // days variation
  mainSymptoms: ["Ondas de calor", "Insônia", "Humor instável"],
};

export const PERIMENOPAUSE_AFFIRMATIONS: string[] = [];

export interface Article {
  id: string;
  title: string;
  description: string;
  readTime: string;
  category: string;
  phase: CyclePhase | "all" | "perimenopause";
  color: string;
  icon: string;
}

export const ARTICLES: Article[] = [
  // Perimenopause
  {
    id: "p1",
    title: "O que é a perimenopausa?",
    description:
      "A transição para a menopausa pode durar anos. Entenda os sinais, os hormônios envolvidos e o que esperar.",
    readTime: "6 min",
    category: "Saúde",
    phase: "perimenopause",
    color: "#B57BAC",
    icon: "information-circle-outline",
  },
  {
    id: "p2",
    title: "Como gerenciar as ondas de calor",
    description:
      "Roupas em camadas, ventilação, técnicas de respiração e ajustes de dieta que realmente fazem diferença.",
    readTime: "5 min",
    category: "Bem-estar",
    phase: "perimenopause",
    color: "#C4A840",
    icon: "flame-outline",
  },
  {
    id: "p3",
    title: "Sono na perimenopausa: por que piora e o que fazer",
    description:
      "Suor noturno, variação hormonal e ansiedade afetam o sono. Estratégias de higiene do sono e suplementação.",
    readTime: "5 min",
    category: "Sono",
    phase: "perimenopause",
    color: "#9B8FCA",
    icon: "moon-outline",
  },
  {
    id: "p4",
    title: "Exercício físico na perimenopausa",
    description:
      "Musculação, yoga e caminhada ajudam a manter a densidade óssea, o humor e o peso. Saiba como adaptar.",
    readTime: "6 min",
    category: "Exercício",
    phase: "perimenopause",
    color: "#7AAEC4",
    icon: "fitness-outline",
  },
  {
    id: "p5",
    title: "Saúde mental na transição hormonal",
    description:
      "Ansiedade, irritabilidade e neblina mental são comuns. Terapia, mindfulness e rede de apoio fazem a diferença.",
    readTime: "7 min",
    category: "Mente",
    phase: "perimenopause",
    color: "#B57BAC",
    icon: "heart-outline",
  },

  // Menstrual
  {
    id: "a1",
    title: "Por que você sente mais dor na menstruação?",
    description:
      "Entenda o papel das prostaglandinas e como aliviar as cólicas naturalmente com calor, dieta e movimento suave.",
    readTime: "4 min",
    category: "Saúde",
    phase: "menstrual",
    color: "#B57BAC",
    icon: "water-outline",
  },
  {
    id: "a2",
    title: "Alimentos que aliviam a TPM",
    description:
      "Magnésio, vitamina B6 e ômega-3 podem transformar sua fase lútea. Veja o que colocar no prato.",
    readTime: "5 min",
    category: "Nutrição",
    phase: "menstrual",
    color: "#9B8FCA",
    icon: "nutrition-outline",
  },
  // Follicular
  {
    id: "a3",
    title: "Fase folicular: o momento de recomeçar",
    description:
      "Com o estrogênio subindo, sua criatividade e disposição aumentam. Saiba como aproveitar esse pico.",
    readTime: "3 min",
    category: "Ciclo",
    phase: "follicular",
    color: "#7AAEC4",
    icon: "leaf-outline",
  },
  {
    id: "a4",
    title: "Exercícios ideais para cada fase do ciclo",
    description:
      "Sincronize seu treino com seu ciclo e maximize resultados sem se esgotar.",
    readTime: "6 min",
    category: "Exercício",
    phase: "follicular",
    color: "#7AAEC4",
    icon: "fitness-outline",
  },
  // Ovulation
  {
    id: "a5",
    title: "Ovulação: entendendo seu pico de fertilidade",
    description:
      "Como identificar os sinais da ovulação, o papel do muco cervical e o que acontece no seu corpo.",
    readTime: "5 min",
    category: "Ciclo",
    phase: "ovulation",
    color: "#7060B8",
    icon: "star-outline",
  },
  {
    id: "a6",
    title: "Pele e cabelo na fase da ovulação",
    description:
      "Na ovulação você está no seu pico de estrogênio — sua pele agradece. Dicas para potencializar o brilho.",
    readTime: "3 min",
    category: "Beleza",
    phase: "ovulation",
    color: "#8B7EC8",
    icon: "sparkles-outline",
  },
  // Luteal
  {
    id: "a7",
    title: "Como lidar com a ansiedade pré-menstrual",
    description:
      "A queda de progesterona afeta o humor. Técnicas de respiração, rotinas e suplementos que realmente ajudam.",
    readTime: "5 min",
    category: "Mente",
    phase: "luteal",
    color: "#9B8FCA",
    icon: "heart-outline",
  },
  {
    id: "a8",
    title: "Sono profundo na fase luteal",
    description:
      "Por que é mais difícil dormir antes da menstruação e o que fazer para descansar de verdade.",
    readTime: "4 min",
    category: "Sono",
    phase: "luteal",
    color: "#B57BAC",
    icon: "moon-outline",
  },
  // General
  {
    id: "a9",
    title: "O que é a sincronização do ciclo?",
    description:
      "Adaptar alimentação, treinos e descanso ao ciclo menstrual pode melhorar sua qualidade de vida de forma significativa.",
    readTime: "6 min",
    category: "Bem-estar",
    phase: "all",
    color: "#9B8FCA",
    icon: "refresh-outline",
  },
  {
    id: "a10",
    title: "Hormônios femininos: guia completo",
    description:
      "Estrogênio, progesterona, FSH e LH — o que cada um faz e como eles moldam seu ciclo mês a mês.",
    readTime: "8 min",
    category: "Saúde",
    phase: "all",
    color: "#7AAEC4",
    icon: "flask-outline",
  },
  {
    id: "a11",
    title: "Meditação guiada para o ciclo menstrual",
    description:
      "Cinco práticas curtas de mindfulness adaptadas para cada fase, do descanso na menstruação ao pico de energia.",
    readTime: "4 min",
    category: "Mindfulness",
    phase: "all",
    color: "#B57BAC",
    icon: "leaf-outline",
  },
  {
    id: "a12",
    title: "Suplementos para saúde hormonal",
    description:
      "Vitamina D, magnésio, ômega-3 e zinco: o que a ciência diz sobre suplementação para mulheres.",
    readTime: "7 min",
    category: "Nutrição",
    phase: "all",
    color: "#7060B8",
    icon: "medkit-outline",
  },
];

export const REMINDERS = [
  {
    id: "1",
    title: "Tomar anticoncepcional",
    time: "21:00",
    active: true,
    icon: "medical-outline",
  },
  {
    id: "2",
    title: "Início da menstruação",
    time: "08:00",
    active: true,
    icon: "notifications-outline",
  },
  {
    id: "3",
    title: "Registro diário",
    time: "20:00",
    active: false,
    icon: "create-outline",
  },
];
