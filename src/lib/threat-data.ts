
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
  /**
   * Статус вспышки. Для reference-данных (isRealData=false) всегда 'resolved'.
   * Если не задано — вычисляется через getOutbreakStatus() по давности lastUpdate.
   */
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
  'Лейкоз КРС': '🩸',
  'Пастереллёз': '😷',
  'ИРТ': '👃',
  'Вирусная диарея': '💩',
  'Парагрипп-3': '🤧',
  'Лептоспироз': '🌊',
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

/**
 * Список особо опасных болезней (Приказ МСХ РФ №62, категория 1).
 * Для них активная вспышка автоматически → critical.
 */
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
const ACTIVE_DAYS = 30;      // <30 дней с lastUpdate → active
const MONITORING_DAYS = 60;  // 30-60 дней → monitoring; >60 дней → resolved

/**
 * Возвращает статус вспышки. Приоритет:
 * 1) Явно заданное поле outbreakStatus
 * 2) Reference-данные (isRealData=false) → всегда 'resolved'
 * 3) Авто-расчёт по давности lastUpdate
 */
export function getOutbreakStatus(t: ThreatZone): OutbreakStatus {
  if (t.outbreakStatus) return t.outbreakStatus;
  if (!t.isRealData) return 'resolved';

  const last = new Date(t.lastUpdate);
  const diffDays = Math.floor((TODAY_REFERENCE.getTime() - last.getTime()) / MS_PER_DAY);

  if (diffDays <= ACTIVE_DAYS) return 'active';
  if (diffDays <= MONITORING_DAYS) return 'monitoring';
  return 'resolved';
}

/**
 * Автоматически вычисляет ЭФФЕКТИВНЫЙ уровень угрозы из статуса вспышки.
 *
 * Правило:
 * - Reference-данные → статичный threatLevel (из конфигурации)
 * - Активная вспышка + особо опасная болезнь → critical
 * - Активная вспышка + другая болезнь → high
 * - Monitoring → medium
 * - Resolved (real) → low
 *
 * Это обеспечивает автоматическое повышение уровня при появлении вспышки
 * и автоматическое понижение после её погашения.
 */
export function getEffectiveThreatLevel(t: ThreatZone): ThreatLevel {
  // Reference-данные: используем статичный уровень из конфигурации
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

/**
 * Количество дней с последнего обновления записи.
 */
export function getDaysSinceUpdate(t: ThreatZone): number {
  const last = new Date(t.lastUpdate);
  return Math.max(0, Math.floor((TODAY_REFERENCE.getTime() - last.getTime()) / MS_PER_DAY));
}

// ==========================================
// REAL DATA based on official sources:
// - Россельхознадзор (fsvps.gov.ru)
// - Управление ветеринарии Ростовской области
// - Управление ветеринарии Краснодарского края
// - СМИ с подтверждёнными данными
// ==========================================

// ──────────────────────────────────────────────────────────────────
// Данные угроз выгружены в /public/data/threats.json (3915 записей).
// Загружаются через fetch() в хуке useThreats().
// См. /src/hooks/use-threats.ts
// ──────────────────────────────────────────────────────────────────

// Пустой массив — данные грузятся асинхронно из JSON.
// Оставлен для обратной совместимости с кодом, который импортирует `threats` напрямую.
// Для актуальных данных используйте хук useThreats().
const _baseThreats: ThreatZone[] = [];


// Экспорт синхронной версии threats — теперь содержит только _baseThreats (пусто).
// Для загрузки реальных данных используйте хук useThreats().
export const threats: ThreatZone[] = _baseThreats;

/**
 * Маппинг названий регионов (из поля ThreatZone.region) → код федерального округа.
 * По Указу Президента РФ №141 (26.02.2024) ДНР, ЛНР, Запорожская и Херсонская
 * области включены в ЮФО (НЕ в ЦФО).
 * По Указу от 03.11.2018 Бурятия и Забайкальский край переведены из СФО в ДФО.
 */
export const regionToFO: Record<string, string> = {
  // ═══ ЦФО (18) ═══
  'Белгородская область': 'ЦФО',
  'Брянская область': 'ЦФО',
  'Владимирская область': 'ЦФО',
  'Воронежская область': 'ЦФО',
  'Ивановская область': 'ЦФО',
  'Калужская область': 'ЦФО',
  'Костромская область': 'ЦФО',
  'Курская область': 'ЦФО',
  'Липецкая область': 'ЦФО',
  'г. Москва': 'ЦФО',
  'Московская область': 'ЦФО',
  'Орловская область': 'ЦФО',
  'Рязанская область': 'ЦФО',
  'Смоленская область': 'ЦФО',
  'Тамбовская область': 'ЦФО',
  'Тверская область': 'ЦФО',
  'Тульская область': 'ЦФО',
  'Ярославская область': 'ЦФО',

  // ═══ ПФО (14) ═══
  'Республика Башкортостан': 'ПФО',
  'Республика Марий Эл': 'ПФО',
  'Республика Мордовия': 'ПФО',
  'Республика Татарстан': 'ПФО',
  'Удмуртская Республика': 'ПФО',
  'Чувашская Республика': 'ПФО',
  'Пермский край': 'ПФО',
  'Кировская область': 'ПФО',
  'Нижегородская область': 'ПФО',
  'Оренбургская область': 'ПФО',
  'Пензенская область': 'ПФО',
  'Самарская область': 'ПФО',
  'Саратовская область': 'ПФО',
  'Ульяновская область': 'ПФО',

  // ═══ ЮФО (12: 8 + 4 новых per Указ №141) ═══
  'Республика Адыгея': 'ЮФО',
  'Республика Калмыкия': 'ЮФО',
  'Краснодарский край': 'ЮФО',
  'Республика Крым': 'ЮФО',
  'Астраханская область': 'ЮФО',
  'Волгоградская область': 'ЮФО',
  'Ростовская область': 'ЮФО',
  'Севастополь': 'ЮФО',
  'Донецкая Народная Республика': 'ЮФО',
  'Луганская Народная Республика': 'ЮФО',
  'Запорожская область': 'ЮФО',
  'Херсонская область': 'ЮФО',

  // ═══ СКФО (7) ═══
  'Республика Дагестан': 'СКФО',
  'Республика Ингушетия': 'СКФО',
  'Кабардино-Балкарская Республика': 'СКФО',
  'Карачаево-Черкесская Республика': 'СКФО',
  'Республика Северная Осетия-Алания': 'СКФО',
  'Чеченская Республика': 'СКФО',
  'Ставропольский край': 'СКФО',

  // ═══ СЗФО (11) ═══
  'Республика Карелия': 'СЗФО',
  'Республика Коми': 'СЗФО',
  'Ненецкий АО': 'СЗФО',
  'Архангельская область': 'СЗФО',
  'Вологодская область': 'СЗФО',
  'Калининградская область': 'СЗФО',
  'Ленинградская область': 'СЗФО',
  'Мурманская область': 'СЗФО',
  'Новгородская область': 'СЗФО',
  'Псковская область': 'СЗФО',
  'г. Санкт-Петербург': 'СЗФО',

  // ═══ УрФО (6) ═══
  'Курганская область': 'УрФО',
  'Свердловская область': 'УрФО',
  'Тюменская область': 'УрФО',
  'Ханты-Мансийский АО — Югра': 'УрФО',
  'Челябинская область': 'УрФО',
  'Ямало-Ненецкий АО': 'УрФО',

  // ═══ СФО (10) ═══
  'Республика Алтай': 'СФО',
  'Республика Тыва': 'СФО',
  'Республика Хакасия': 'СФО',
  'Алтайский край': 'СФО',
  'Красноярский край': 'СФО',
  'Иркутская область': 'СФО',
  'Кемеровская область': 'СФО',
  'Новосибирская область': 'СФО',
  'Омская область': 'СФО',
  'Томская область': 'СФО',

  // ═══ ДФО (11) ═══
  'Республика Саха (Якутия)': 'ДФО',
  'Республика Бурятия': 'ДФО',
  'Камчатский край': 'ДФО',
  'Приморский край': 'ДФО',
  'Хабаровский край': 'ДФО',
  'Забайкальский край': 'ДФО',
  'Амурская область': 'ДФО',
  'Магаданская область': 'ДФО',
  'Сахалинская область': 'ДФО',
  'Еврейская автономная область': 'ДФО',
  'Чукотский автономный округ': 'ДФО',
};

/**
 * Конфигурация федеральных округов: название, цвет, центр карты.
 */
export const foConfig: Record<string, { label: string; color: string; lat: number; lng: number; zoom: number }> = {
  'ЦФО':  { label: 'Центральный ФО',   color: '#6366f1', lat: 54.8, lng: 38.5,  zoom: 5 },
  'ПФО':  { label: 'Приволжский ФО',    color: '#8b5cf6', lat: 54.3, lng: 50.3,  zoom: 5 },
  'ЮФО':  { label: 'Южный ФО',          color: '#ef4444', lat: 46.5, lng: 38.5,  zoom: 6 },
  'СКФО': { label: 'Северо-Кавказский ФО', color: '#f59e0b', lat: 43.5, lng: 44.0, zoom: 6 },
  'СЗФО': { label: 'Северо-Западный ФО', color: '#3b82f6', lat: 61.5, lng: 42.0,  zoom: 4 },
  'УрФО': { label: 'Уральский ФО',      color: '#10b981', lat: 58.0, lng: 62.0,  zoom: 5 },
  'СФО':  { label: 'Сибирский ФО',      color: '#f97316', lat: 55.0, lng: 83.0,  zoom: 4 },
  'ДФО':  { label: 'Дальневосточный ФО', color: '#06b6d4', lat: 55.0, lng: 133.0, zoom: 3 },
};

export const regionCenters = {
  rostov: { lat: 47.25, lng: 40.18, zoom: 8 },
  krasnodar: { lat: 45.35, lng: 38.85, zoom: 8 },
  adygea: { lat: 44.60, lng: 40.10, zoom: 9 },
  crimea: { lat: 45.00, lng: 34.30, zoom: 8 },
  sevastopol: { lat: 44.62, lng: 33.52, zoom: 10 },
  all: { lat: 46.50, lng: 38.50, zoom: 6 },
};


// ==========================================
// АСИНХРОННАЯ ЗАГРУЗКА ДАННЫХ ИЗ JSON
// ==========================================

let _cachedThreats: ThreatZone[] | null = null;
let _loadingPromise: Promise<ThreatZone[]> | null = null;

/**
 * Загружает все угрозы из /data/threats.json.
 * Кеширует результат — повторные вызовы возвращают тот же Promise.
 *
 * Используйте хук useThreats() в React-компонентах.
 * Для не-React кода (сервер, скрипты) можно вызвать напрямую.
 */
export async function loadThreats(): Promise<ThreatZone[]> {
  if (_cachedThreats) return _cachedThreats;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = fetch('/data/threats.json')
    .then(r => {
      if (!r.ok) throw new Error(`Failed to load threats.json: ${r.status}`);
      return r.json();
    })
    .then((data: ThreatZone[]) => {
      _cachedThreats = data;
      return data;
    })
    .finally(() => {
      _loadingPromise = null;
    });

  return _loadingPromise;
}

/**
 * Сбросить кеш (для тестов или принудительного обновления).
 */
export function resetThreatsCache(): void {
  _cachedThreats = null;
  _loadingPromise = null;
}
