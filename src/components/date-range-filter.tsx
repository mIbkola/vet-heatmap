'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';

export interface DateRange {
  start: string | null; // ISO YYYY-MM-DD or null
  end: string | null;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = 'all' | '30d' | '90d' | '6m' | '1y' | '2024+' | 'custom';

interface Preset {
  key: PresetKey;
  label: string;
  getDescription: () => string;
}

const PRESETS: Preset[] = [
  {
    key: 'all',
    label: 'Всё время',
    getDescription: () => 'Все записи',
  },
  {
    key: '2024+',
    label: '2024-2026',
    getDescription: () => 'Только недавние вспышки',
  },
  {
    key: '1y',
    label: 'За год',
    getDescription: () => 'Последние 12 месяцев',
  },
  {
    key: '6m',
    label: '6 месяцев',
    getDescription: () => 'Последние 6 месяцев',
  },
  {
    key: '90d',
    label: '90 дней',
    getDescription: () => 'Последние 3 месяца',
  },
  {
    key: '30d',
    label: '30 дней',
    getDescription: () => 'Последний месяц',
  },
  {
    key: 'custom',
    label: 'Свой диапазон',
    getDescription: () => 'Задать вручную',
  },
];

/** Compute a date N days ago as YYYY-MM-DD. */
function daysAgoIso(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Compute a date N months ago as YYYY-MM-DD. */
function monthsAgoIso(months: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** Convert a preset key to a concrete DateRange. Returns null for "all" or "custom". */
export function presetToRange(key: PresetKey): DateRange | null {
  switch (key) {
    case 'all':
      return { start: null, end: null };
    case '30d':
      return { start: daysAgoIso(30), end: null };
    case '90d':
      return { start: daysAgoIso(90), end: null };
    case '6m':
      return { start: monthsAgoIso(6), end: null };
    case '1y':
      return { start: monthsAgoIso(12), end: null };
    case '2024+':
      return { start: '2024-01-01', end: null };
    case 'custom':
      return null; // caller manages
    default:
      return null;
  }
}

/** Detect the best matching preset key for a given range (for initial highlight). */
function rangeToPreset(range: DateRange): PresetKey {
  if (range.start === null && range.end === null) return 'all';
  if (range.start === '2024-01-01' && range.end === null) return '2024+';
  if (!range.start || range.end) return 'custom';
  const today = new Date();
  const start = new Date(range.start);
  const diffDays = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 29 && diffDays <= 31) return '30d';
  if (diffDays >= 89 && diffDays <= 91) return '90d';
  if (diffDays >= 178 && diffDays <= 186) return '6m';
  if (diffDays >= 360 && diffDays <= 370) return '1y';
  return 'custom';
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>('all');
  const [showCustom, setShowCustom] = useState(false);

  // Sync active preset from value
  useEffect(() => {
    const detected = rangeToPreset(value);
    setActivePreset(detected);
    setShowCustom(detected === 'custom');
  }, [value]);

  const applyPreset = (key: PresetKey) => {
    setActivePreset(key);
    if (key === 'custom') {
      setShowCustom(true);
      // Initialise custom inputs with current range if empty
      if (value.start === null && value.end === null) {
        onChange({ start: daysAgoIso(365), end: null });
      }
      return;
    }
    setShowCustom(false);
    const range = presetToRange(key);
    if (range) {
      onChange(range);
    }
  };

  const hasActiveFilter = value.start !== null || value.end !== null;

  const reset = () => {
    onChange({ start: null, end: null });
    setActivePreset('all');
    setShowCustom(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Дата вспышки</span>
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-5 px-1.5 text-[10px] text-muted-foreground"
            onClick={reset}
          >
            <X className="h-3 w-3" />
            Сбросить
          </Button>
        )}
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
              activePreset === p.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
            title={p.getDescription()}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range inputs */}
      {showCustom && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground">С</label>
            <Input
              type="date"
              value={value.start ?? ''}
              onChange={(e) => onChange({ ...value, start: e.target.value || null })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] text-muted-foreground">По</label>
            <Input
              type="date"
              value={value.end ?? ''}
              onChange={(e) => onChange({ ...value, end: e.target.value || null })}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Active range hint */}
      {hasActiveFilter && (
        <div className="text-[10px] text-muted-foreground leading-tight">
          {value.start && value.end
            ? `С ${value.start} по ${value.end}`
            : value.start
              ? `С ${value.start}`
              : `По ${value.end}`}
        </div>
      )}
    </div>
  );
}
