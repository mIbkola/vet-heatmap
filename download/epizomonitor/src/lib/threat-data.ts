export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Статус вспышки. Определяет текущее эпизоотическое состояние очага:
 * - 'active'     — активная вспышка, карантинные мероприятия ongoing
 * - 'monitoring' — вспышка локализована, ведётся наблюдение (последние 60 дней после ликвидации)
 * - 'resolved'   — вспышка погашена, карантин снят (>60 дней после последнего случая)
 *
 * Если поле не задано явно, статус вычисляется автоматически из lastUpdate и isRealData.
 */
export type OutbreakStatus = 'active' | 'monitoring' | 'resolved';

export interface ThreatZone {
  id: string;
  disease: string;
  diseaseShort: string;
  region: string;
  district: string;
  threatLevel: ThreatLevel;
  lat: number;
  lng: number;
  radius: number; // in km
  description: string;
  affectedAnimals: string[];
  season: string;
  lastUpdate: string;
  isRealData: boolean;
  outbreakStatus?: OutbreakStatus;
  dataSources: DataSource[];
  recommendations: Recommendation[];
  preventionSteps: string[];
  vaccines: VaccineInfo[];
  sources: string[];
}

export interface DataSource {
  name: string;
  url: string;
  date: string;
  type: 'official' | 'media' | 'scientific';
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'immediate' | 'urgent' | 'planned';
}

export interface VaccineInfo {
  name: string;
  manufacturer: string;
  schedule: string;
  note: string;
}

export const threatLevelConfig: Record<ThreatLevel, { label: string; color: string; bgColor: string; borderColor: string; mapColor: string }> = {
  critical: {
    label: 'Критический',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-500',
    mapColor: '#dc2626',
  },
  high: {
    label: 'Высокий',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-500',
    mapColor: '#ea580c',
  },
  medium: {
    label: 'Средний',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-500',
    mapColor: '#ca8a04',
  },
  low: {
    label: 'Низкий',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500',
    mapColor: '#16a34a',
  },
};

export const diseaseIcons: Record<string, string> = {
  'Ящур': '🦠',
  'АЧС': '🐷',
  'Бруцеллёз': '🐄',
  'Нодулярный дерматит': '🫓',
  'Птичий грипп': '🦅',
  'Сибирская язва': '☠️',
  'Лептоспироз': '🔬',
  'Бешенство': '🐕',
  'Лейкоз КРС': '🩺',
  'Блютанг': '🦟',
  'Болезнь Ньюкасла': '🐔',
  'Эмкар': '🩸',
  'Чума КРС': '🔥',
  'Классическая чума свиней': '🐷',
  'Высокопатогенный грипп птиц': '🦅',
  'Заразный узелковый дерматит КРС': '🫓',
  'Туберкулёз КРС': '🫁',
  'Пастереллёз': '😷',
  'ИРТ': '👃',
  'Вирусная диарея': '💩',
  'Парагрипп-3': '🤧',
  'Сальмонеллёз': '🦠',
  'Листериоз': '🐀',
  'РРСС': '🐖',
  'Рожа свиней': '🔴',
  'Паратуберкулёз': '🔬',
  'Эшерихиоз': '👶',
  'Хламидиоз': '⚠️',
  'Микоплазмоз': '🦠',
  'Болезнь Марека': '🐔',
  'Инфекционный бурсит': '🪶',
  'Оспа овец и коз': '🐑',
  'Энтеротоксемия': '⚡',
  'Эхинококкоз': '🐕',
  'Трихинеллёз': '🪱',
  'Токсоплазмоз': '🐈',
  'Пироплазмоз': '🕷️',
  'Анаплазмоз': '🪲',
  'Тейлериоз': '🐞',
  'Варроатоз': '🐝',
  'Нозематоз': '🍯',
  'Гиподерматоз': '🪰',
  'Цистицеркозы': '🥩',
  'Трихомоноз': '🔬',
  'Туляремия': '🐁',
  'Лихорадка Ку': '🌡️',
};

// ==========================================
// АВТО-РАСЧЁТ УРОВНЯ УГРОЗЫ ИЗ СТАТУСА ВСПЫШКИ
// ==========================================

export const PARTICULAR_DANGEROUS_DISEASES = new Set<string>([
  'Ящур',
  'АЧС',
  'Африканская чума свиней',
  'Птичий грипп',
  'Высокопатогенный грипп птиц',
  'Бешенство',
  'Нодулярный дерматит',
  'Заразный узелковый дерматит КРС',
  'Сибирская язва',
  'Блютанг',
  'Болезнь Ньюкасла',
  'Эмкар',
  'Чума КРС',
  'Классическая чума свиней',
  'Оспа овец и коз',
]);

export const outbreakStatusConfig: Record<OutbreakStatus, {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  pulse: boolean;
}> = {
  active: {
    label: 'Активная вспышка',
    shortLabel: 'Активна',
    description: 'Вспышка подтверждена, проводятся противоэпизоотические мероприятия',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    dotColor: '#dc2626',
    pulse: true,
  },
  monitoring: {
    label: 'Под наблюдением',
    shortLabel: 'Наблюдение',
    description: 'Вспышка локализована, ведётся эпизоотический мониторинг',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    dotColor: '#f59e0b',
    pulse: false,
  },
  resolved: {
    label: 'Погашена',
    shortLabel: 'Погашена',
    description: 'Очаг ликвидирован, карантин снят, угроза минимальна',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    dotColor: '#16a34a',
    pulse: false,
  },
};

/** Текущая "сегодняшняя" дата для расчёта давности. Берётся из последнего обновления данных. */
const TODAY_REFERENCE = new Date('2026-06-17');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ACTIVE_DAYS = 30;
const MONITORING_DAYS = 60;

export function getOutbreakStatus(t: ThreatZone): OutbreakStatus {
  if (t.outbreakStatus) return t.outbreakStatus;
  if (!t.isRealData) return 'resolved';

  const last = new Date(t.lastUpdate);
  const diffDays = Math.floor((TODAY_REFERENCE.getTime() - last.getTime()) / MS_PER_DAY);

  if (diffDays <= ACTIVE_DAYS) return 'active';
  if (diffDays <= MONITORING_DAYS) return 'monitoring';
  return 'resolved';
}

export function getEffectiveThreatLevel(t: ThreatZone): ThreatLevel {
  if (!t.isRealData) return t.threatLevel;
  const status = getOutbreakStatus(t);

  switch (status) {
    case 'active':
      return PARTICULAR_DANGEROUS_DISEASES.has(t.disease) ? 'critical' : 'high';
    case 'monitoring':
      return 'medium';
    case 'resolved':
      return 'low';
  }
}

export function getDaysSinceUpdate(t: ThreatZone): number {
  const last = new Date(t.lastUpdate);
  return Math.max(0, Math.floor((TODAY_REFERENCE.getTime() - last.getTime()) / MS_PER_DAY));
}

export const regionCenters = {
  rostov: { lat: 47.25, lng: 40.18, zoom: 8 },
  krasnodar: { lat: 45.35, lng: 38.85, zoom: 8 },
  adygea: { lat: 44.60, lng: 40.10, zoom: 9 },
  crimea: { lat: 45.00, lng: 34.30, zoom: 8 },
  sevastopol: { lat: 44.62, lng: 33.52, zoom: 10 },
  all: { lat: 46.50, lng: 38.50, zoom: 6 },
};
