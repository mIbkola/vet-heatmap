'use client';

import {
  threatLevelConfig,
  diseaseIcons,
  getEffectiveThreatLevel,
  getOutbreakStatus,
  outbreakStatusConfig,
  type ThreatZone,
  type ThreatLevel,
} from '@/lib/threat-data';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, MapPin, Clock, Filter, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateRangeFilter, { type DateRange } from '@/components/date-range-filter';

interface ThreatSidebarProps {
  threats: ThreatZone[];
  selectedThreat: ThreatZone | null;
  onSelectThreat: (threat: ThreatZone) => void;
  filterLevel: string;
  setFilterLevel: (v: string) => void;
  filterDisease: string;
  setFilterDisease: (v: string) => void;
  filterReal?: 'all' | 'real' | 'reference';
  setFilterReal?: (v: 'all' | 'real' | 'reference') => void;
  filterDateRange?: DateRange;
  setFilterDateRange?: (range: DateRange) => void;
}

export default function ThreatSidebar({
  threats,
  selectedThreat,
  onSelectThreat,
  filterLevel,
  setFilterLevel,
  filterDisease,
  setFilterDisease,
  filterReal = 'all',
  setFilterReal,
  filterDateRange = { start: null, end: null },
  setFilterDateRange,
}: ThreatSidebarProps) {
  // Parse ISO date string to a Date at local midnight. Returns null on invalid input.
  const parseDate = (s: string | null | undefined): Date | null => {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  };

  const rangeStart = parseDate(filterDateRange.start);
  const rangeEnd = parseDate(filterDateRange.end);

  const filtered = threats.filter(t => {
    // Используем ЭФФЕКТИВНЫЙ уровень (авто-расчёт из статуса вспышки)
    const effectiveLevel = getEffectiveThreatLevel(t);
    if (filterLevel !== 'all' && effectiveLevel !== filterLevel) return false;
    if (filterDisease !== 'all' && t.disease !== filterDisease) return false;
    if (filterReal === 'real' && t.isRealData !== true) return false;
    if (filterReal === 'reference' && t.isRealData === true) return false;

    // Date range filter — based on lastUpdate field
    if (rangeStart || rangeEnd) {
      const threatDate = parseDate(t.lastUpdate);
      if (!threatDate) return false; // exclude undated threats when a filter is active
      if (rangeStart && threatDate < rangeStart) return false;
      if (rangeEnd && threatDate > rangeEnd) return false;
    }
    return true;
  });

  // Get unique diseases
  const diseases = [...new Set(threats.map(t => t.disease))];

  // Count real outbreaks
  const realCount = threats.filter(t => t.isRealData === true).length;

  // Sort: real outbreaks first (by effective level), then reference (by effective level)
  const levelOrder: Record<ThreatLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...filtered].sort((a, b) => {
    // Real outbreaks come first
    if (a.isRealData !== b.isRealData) {
      return a.isRealData ? -1 : 1;
    }
    return levelOrder[getEffectiveThreatLevel(a)] - levelOrder[getEffectiveThreatLevel(b)];
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-bold">Угрозы</h2>
          <Badge variant="secondary" className="ml-auto">{sorted.length}</Badge>
        </div>

        {/* Real outbreaks counter */}
        {realCount > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-2.5 py-1.5">
            <Zap className="h-3.5 w-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">
              Подтверждённых вспышек: {realCount}
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Фильтры</span>
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Уровень угрозы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все уровни</SelectItem>
              <SelectItem value="critical">🔴 Критический</SelectItem>
              <SelectItem value="high">🟠 Высокий</SelectItem>
              <SelectItem value="medium">🟡 Средний</SelectItem>
              <SelectItem value="low">🟢 Низкий</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDisease} onValueChange={setFilterDisease}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Болезнь" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все болезни</SelectItem>
              {diseases.map(d => (
                <SelectItem key={d} value={d}>{diseaseIcons[d] || '🔬'} {d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {setFilterReal && (
            <Select value={filterReal} onValueChange={(v) => setFilterReal(v as 'all' | 'real' | 'reference')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Тип данных" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все данные</SelectItem>
                <SelectItem value="real">⚡ Только реальные вспышки</SelectItem>
                <SelectItem value="reference">📚 Только справочные</SelectItem>
              </SelectContent>
            </Select>
          )}
          {setFilterDateRange && (
            <DateRangeFilter
              value={filterDateRange}
              onChange={setFilterDateRange}
            />
          )}
        </div>
      </div>

      {/* Threat List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Нет угроз по выбранным фильтрам
            </div>
          ) : (
            sorted.map(threat => {
              // Эффективный уровень рассчитывается автоматически из статуса вспышки
              const effectiveLevel = getEffectiveThreatLevel(threat);
              const config = threatLevelConfig[effectiveLevel];
              const isSelected = selectedThreat?.id === threat.id;
              const isReal = threat.isRealData === true;
              const status = isReal ? getOutbreakStatus(threat) : null;
              const statusCfg = status ? outbreakStatusConfig[status] : null;
              return (
                <button
                  key={threat.id}
                  onClick={() => onSelectThreat(threat)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md relative ${
                    isSelected
                      ? `${config.bgColor} ${config.borderColor} border-2 shadow-md`
                      : isReal
                        ? 'bg-card border-border hover:border-muted-foreground/30 ring-1 ring-red-200/60 dark:ring-red-900/40'
                        : 'bg-card border-border hover:border-muted-foreground/30'
                  }`}
                >
                  {isReal && statusCfg && (
                    <span
                      className={`absolute top-2 right-2 flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.borderColor}`}
                    >
                      {statusCfg.pulse && (
                        <span
                          className="relative flex h-1.5 w-1.5"
                        >
                          <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                            style={{ background: statusCfg.dotColor }}
                          />
                          <span
                            className="relative inline-flex rounded-full h-1.5 w-1.5"
                            style={{ background: statusCfg.dotColor }}
                          />
                        </span>
                      )}
                      {statusCfg.shortLabel}
                    </span>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5">{diseaseIcons[threat.disease] || '🔬'}</span>
                    <div className="flex-1 min-w-0 pr-16">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{threat.disease}</span>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 h-5 ${config.bgColor} ${config.color}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{threat.district}, {threat.region}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{isReal ? 'Вспышка: ' : 'Обновлено: '}{threat.lastUpdate}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
