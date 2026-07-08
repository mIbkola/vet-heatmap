'use client';

import { useMemo } from 'react';
import {
  threatLevelConfig,
  getEffectiveThreatLevel,
  getOutbreakStatus,
  type ThreatLevel,
  type OutbreakStatus,
  type ThreatZone,
} from '@/lib/threat-data';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface DistributionChartsProps {
  threats: ThreatZone[];
  /** Optional filter to limit the dataset shown. */
  filterReal?: 'all' | 'real' | 'reference';
}

const LEVEL_ORDER: ThreatLevel[] = ['critical', 'high', 'medium', 'low'];
const LEVEL_HEX: Record<ThreatLevel, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
};

export default function DistributionCharts({ threats, filterReal = 'all' }: DistributionChartsProps) {
  const data = useMemo(() => {
    const filtered = threats.filter(t => {
      if (filterReal === 'real' && t.isRealData !== true) return false;
      if (filterReal === 'reference' && t.isRealData === true) return false;
      return true;
    });

    // 1. By threat level (используем ЭФФЕКТИВНЫЙ уровень)
    const byLevel = LEVEL_ORDER.map(level => ({
      name: threatLevelConfig[level].label,
      level,
      value: filtered.filter(t => getEffectiveThreatLevel(t) === level).length,
      color: LEVEL_HEX[level],
    }));

    // 2. Real vs reference
    const realCount = filtered.filter(t => t.isRealData === true).length;
    const refCount = filtered.length - realCount;
    const byReal = [
      { name: '⚡ Реальные вспышки', value: realCount, color: '#dc2626' },
      { name: '📚 Справочные', value: refCount, color: '#64748b' },
    ];

    // 2b. По статусу вспышки (только реальные)
    const STATUS_ORDER: OutbreakStatus[] = ['active', 'monitoring', 'resolved'];
    const STATUS_HEX: Record<OutbreakStatus, string> = {
      active: '#dc2626',
      monitoring: '#f59e0b',
      resolved: '#16a34a',
    };
    const STATUS_LABELS: Record<OutbreakStatus, string> = {
      active: '⚡ Активные',
      monitoring: '👁 Под наблюдением',
      resolved: '✓ Погашены',
    };
    const realThreats = filtered.filter(t => t.isRealData === true);
    const byStatus = STATUS_ORDER.map(s => ({
      name: STATUS_LABELS[s],
      status: s,
      value: realThreats.filter(t => getOutbreakStatus(t) === s).length,
      color: STATUS_HEX[s],
    }));

    // 3. By region × level (stacked bar) — используем эффективный уровень
    const regions = [...new Set(threats.map(t => t.region))];
    const byRegionLevel = regions.map(region => {
      const row: Record<string, number | string> = { region: region.replace(' область', '').replace(' край', '').replace('Республика ', '') };
      LEVEL_ORDER.forEach(level => {
        row[level] = filtered.filter(t => t.region === region && getEffectiveThreatLevel(t) === level).length;
      });
      return row;
    });

    return {
      total: filtered.length,
      byLevel,
      byReal,
      byStatus,
      byRegionLevel,
      regions,
    };
  }, [filterReal]);

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Всего записей" value={data.total} color="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
        <StatCard label="⚡ Реальные" value={data.byReal[0].value} color="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300" />
        <StatCard label="🔴 Критические" value={data.byLevel[0].value} color="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300" />
        <StatCard label="🟠 Высокие" value={data.byLevel[1].value} color="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart: by threat level */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">По уровню угрозы</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.byLevel}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={40}
                paddingAngle={2}
                label={(entry: { name?: string; value?: number }) => (entry.value ?? 0) > 0 ? `${entry.value}` : ''}
              >
                {data.byLevel.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${((value / data.total) * 100).toFixed(1)}%)`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart: real vs reference */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Реальные vs справочные</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.byReal}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={40}
                paddingAngle={2}
                label={(entry: { name?: string; value?: number }) => (entry.value ?? 0) > 0 ? `${entry.value}` : ''}
              >
                {data.byReal.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${((value / data.total) * 100).toFixed(1)}%)`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie chart: by outbreak status — ТОЛЬКО для реальных вспышек */}
      {data.byReal[0].value > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-1">Статус вспышек (реальные данные)</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Активные → критический/высокий · Под наблюдением → средний · Погашены → низкий
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.byStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={35}
                paddingAngle={2}
                label={(entry: { name?: string; value?: number }) => (entry.value ?? 0) > 0 ? `${entry.value}` : ''}
              >
                {data.byStatus.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => {
                  const total = data.byReal[0].value || 1;
                  return [`${value} (${((value / total) * 100).toFixed(1)}%)`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stacked bar: region × level */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Распределение по регионам и уровням</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.byRegionLevel} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
            <XAxis dataKey="region" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  critical: '🔴 Критический',
                  high: '🟠 Высокий',
                  medium: '🟡 Средний',
                  low: '🟢 Низкий',
                };
                return [value, labels[name] ?? name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value: string) => {
                const labels: Record<string, string> = {
                  critical: '🔴 Критический',
                  high: '🟠 Высокий',
                  medium: '🟡 Средний',
                  low: '🟢 Низкий',
                };
                return labels[value] ?? value;
              }}
            />
            <Bar dataKey="critical" stackId="a" fill={LEVEL_HEX.critical} />
            <Bar dataKey="high" stackId="a" fill={LEVEL_HEX.high} />
            <Bar dataKey="medium" stackId="a" fill={LEVEL_HEX.medium} />
            <Bar dataKey="low" stackId="a" fill={LEVEL_HEX.low} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${color}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
