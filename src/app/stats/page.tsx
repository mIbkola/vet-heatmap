'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { threatLevelConfig, diseaseIcons, getEffectiveThreatLevel, getOutbreakStatus, outbreakStatusConfig, type ThreatLevel, type OutbreakStatus } from '@/lib/threat-data';
import { useThreats } from '@/hooks/use-threats';
import DistributionCharts from '@/components/distribution-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  ArrowLeft,
  Zap,
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  Microscope,
} from 'lucide-react';

const LEVEL_ORDER: ThreatLevel[] = ['critical', 'high', 'medium', 'low'];

export default function StatsPage() {
  const [filterReal, setFilterReal] = useState<'all' | 'real' | 'reference'>('all');
  const { threats, loading, error } = useThreats();

  const stats = useMemo(() => {
    const filtered = threats.filter(t => {
      if (filterReal === 'real' && t.isRealData !== true) return false;
      if (filterReal === 'reference' && t.isRealData === true) return false;
      return true;
    });

    // By disease
    const byDisease = new Map<string, { total: number; real: number; levels: Record<ThreatLevel, number> }>();
    for (const t of filtered) {
      if (!byDisease.has(t.disease)) {
        byDisease.set(t.disease, { total: 0, real: 0, levels: { critical: 0, high: 0, medium: 0, low: 0 } });
      }
      const entry = byDisease.get(t.disease)!;
      entry.total += 1;
      if (t.isRealData) entry.real += 1;
      entry.levels[getEffectiveThreatLevel(t)] += 1;
    }
    const diseaseList = Array.from(byDisease.entries())
      .map(([disease, data]) => ({ disease, ...data }))
      .sort((a, b) => b.total - a.total || b.real - a.real);

    // By region
    const regions = [...new Set(threats.map(t => t.region))];
    const byRegion = regions.map(region => {
      const items = filtered.filter(t => t.region === region);
      return {
        region,
        total: items.length,
        real: items.filter(t => t.isRealData).length,
        levels: {
          critical: items.filter(t => getEffectiveThreatLevel(t) === 'critical').length,
          high: items.filter(t => getEffectiveThreatLevel(t) === 'high').length,
          medium: items.filter(t => getEffectiveThreatLevel(t) === 'medium').length,
          low: items.filter(t => getEffectiveThreatLevel(t) === 'low').length,
        },
      };
    });

    // By month (lastUpdate)
    const byMonth = new Map<string, { total: number; real: number }>();
    for (const t of filtered) {
      if (!t.lastUpdate) continue;
      const month = t.lastUpdate.slice(0, 7); // YYYY-MM
      if (!byMonth.has(month)) {
        byMonth.set(month, { total: 0, real: 0 });
      }
      const entry = byMonth.get(month)!;
      entry.total += 1;
      if (t.isRealData) entry.real += 1;
    }
    const monthList = Array.from(byMonth.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Cross-tab: level × real/reference (используем эффективный уровень)
    const crossLevelReal = LEVEL_ORDER.map(level => ({
      level,
      real: filtered.filter(t => getEffectiveThreatLevel(t) === level && t.isRealData).length,
      reference: filtered.filter(t => getEffectiveThreatLevel(t) === level && !t.isRealData).length,
    }));

    // Status breakdown для реальных вспышек
    const STATUS_ORDER: OutbreakStatus[] = ['active', 'monitoring', 'resolved'];
    const realItems = filtered.filter(t => t.isRealData);
    const byStatus = STATUS_ORDER.map(s => ({
      status: s,
      label: outbreakStatusConfig[s].label,
      shortLabel: outbreakStatusConfig[s].shortLabel,
      color: outbreakStatusConfig[s].color,
      bgColor: outbreakStatusConfig[s].bgColor,
      borderColor: outbreakStatusConfig[s].borderColor,
      dotColor: outbreakStatusConfig[s].dotColor,
      pulse: outbreakStatusConfig[s].pulse,
      description: outbreakStatusConfig[s].description,
      count: realItems.filter(t => getOutbreakStatus(t) === s).length,
      // Какой эффективный уровень соответствует этому статусу
      effectiveLevels: {
        critical: s === 'active' ? realItems.filter(t => getOutbreakStatus(t) === s && getEffectiveThreatLevel(t) === 'critical').length : 0,
        high: s === 'active' ? realItems.filter(t => getOutbreakStatus(t) === s && getEffectiveThreatLevel(t) === 'high').length : 0,
        medium: s === 'monitoring' ? realItems.filter(t => getOutbreakStatus(t) === s).length : 0,
        low: s === 'resolved' ? realItems.filter(t => getOutbreakStatus(t) === s).length : 0,
      },
    }));

    // Real outbreaks detailed list
    const realList = filtered
      .filter(t => t.isRealData)
      .sort((a, b) => (b.lastUpdate || '').localeCompare(a.lastUpdate || ''));

    return {
      total: filtered.length,
      diseaseCount: byDisease.size,
      realCount: filtered.filter(t => t.isRealData).length,
      regionCount: regions.length,
      diseaseList,
      byRegion,
      monthList,
      crossLevelReal,
      byStatus,
      realList,
    };
  }, [filterReal, threats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-2">Ошибка загрузки</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">На карту</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Статистика и распределение</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Анализ эпизоотических угроз по уровням, регионам и болезням
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Tabs value={filterReal} onValueChange={(v) => setFilterReal(v as 'all' | 'real' | 'reference')}>
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs">Все</TabsTrigger>
                <TabsTrigger value="real" className="text-xs gap-1">
                  <Zap className="h-3 w-3" />
                  Реальные
                </TabsTrigger>
                <TabsTrigger value="reference" className="text-xs">Справочные</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Top KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            icon={<Activity className="h-4 w-4" />}
            label="Всего угроз"
            value={stats.total}
            sub={`в ${stats.regionCount} регионах`}
            accent="text-slate-700 dark:text-slate-200"
          />
          <KpiCard
            icon={<Zap className="h-4 w-4" />}
            label="Реальные вспышки"
            value={stats.realCount}
            sub={`${((stats.realCount / Math.max(stats.total, 1)) * 100).toFixed(1)}% от всех`}
            accent="text-red-600"
          />
          <KpiCard
            icon={<Microscope className="h-4 w-4" />}
            label="Уникальных болезней"
            value={stats.diseaseCount}
            sub="в базе данных"
            accent="text-blue-600"
          />
          <KpiCard
            icon={<MapPin className="h-4 w-4" />}
            label="Регионов ЮФО"
            value={stats.regionCount}
            sub="под мониторингом"
            accent="text-emerald-600"
          />
        </div>

        {/* Charts section */}
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Визуализация распределения
          </h2>
          <DistributionCharts filterReal={filterReal} threats={threats} />
        </section>

        {/* Cross-tab: level × real/reference */}
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-base font-semibold mb-3">Уровень угрозы × тип данных</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium">Уровень</th>
                  <th className="text-right py-2 px-2 font-medium">⚡ Реальные</th>
                  <th className="text-right py-2 px-2 font-medium">📚 Справочные</th>
                  <th className="text-right py-2 px-2 font-medium">Всего</th>
                  <th className="text-right py-2 px-2 font-medium">Доля реальных</th>
                </tr>
              </thead>
              <tbody>
                {stats.crossLevelReal.map(row => {
                  const total = row.real + row.reference;
                  const pctReal = total > 0 ? (row.real / total) * 100 : 0;
                  const cfg = threatLevelConfig[row.level];
                  return (
                    <tr key={row.level} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: cfg.mapColor }} />
                          <span className="font-medium">{cfg.label}</span>
                        </span>
                      </td>
                      <td className="text-right py-2 px-2 text-red-600 font-medium">{row.real}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">{row.reference}</td>
                      <td className="text-right py-2 px-2 font-semibold">{total}</td>
                      <td className="text-right py-2 px-2">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${pctReal}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {pctReal.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td className="py-2 px-2 font-semibold">ИТОГО</td>
                  <td className="text-right py-2 px-2 text-red-600 font-bold">{stats.crossLevelReal.reduce((s, r) => s + r.real, 0)}</td>
                  <td className="text-right py-2 px-2 font-bold">{stats.crossLevelReal.reduce((s, r) => s + r.reference, 0)}</td>
                  <td className="text-right py-2 px-2 font-bold">{stats.total}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            <strong>Авто-расчёт уровня:</strong> эффективный уровень угрозы вычисляется автоматически из статуса вспышки —
            активная вспышка даёт <span className="text-red-700 font-medium">критический/высокий</span> уровень,
            под наблюдением — <span className="text-amber-700 font-medium">средний</span>,
            погашенная — <span className="text-green-700 font-medium">низкий</span>.
            Справочные данные сохраняют статичный уровень из конфигурации.
          </p>
        </section>

        {/* Авто-расчёт уровня из статуса вспышки */}
        {stats.realCount > 0 && (
          <section className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-600" />
              Авто-расчёт уровня из статуса вспышки
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Как статус подтверждённой вспышки автоматически определяет её уровень угрозы
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stats.byStatus.map(row => (
                <div
                  key={row.status}
                  className={`rounded-lg border p-3 ${row.bgColor} ${row.borderColor}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`relative flex h-2.5 w-2.5 ${row.pulse ? 'animate-pulse' : ''}`}
                      >
                        <span
                          className="inline-flex rounded-full h-2.5 w-2.5"
                          style={{ background: row.dotColor }}
                        />
                      </span>
                      <span className={`text-sm font-semibold ${row.color}`}>{row.label}</span>
                    </div>
                    <span className={`text-2xl font-bold ${row.color}`}>{row.count}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
                    {row.description}
                  </p>
                  <div className="text-[11px] space-y-0.5 border-t border-current/10 pt-2">
                    {row.status === 'active' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-red-700">→ Критический</span>
                          <span className="font-semibold text-red-700">{row.effectiveLevels.critical}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-700">→ Высокий</span>
                          <span className="font-semibold text-orange-700">{row.effectiveLevels.high}</span>
                        </div>
                      </>
                    )}
                    {row.status === 'monitoring' && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">→ Средний</span>
                        <span className="font-semibold text-amber-700">{row.effectiveLevels.medium}</span>
                      </div>
                    )}
                    {row.status === 'resolved' && (
                      <div className="flex justify-between">
                        <span className="text-green-700">→ Низкий</span>
                        <span className="font-semibold text-green-700">{row.effectiveLevels.low}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* By region table */}
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Распределение по регионам ЮФО
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium">Регион</th>
                  <th className="text-right py-2 px-2 font-medium">🔴</th>
                  <th className="text-right py-2 px-2 font-medium">🟠</th>
                  <th className="text-right py-2 px-2 font-medium">🟡</th>
                  <th className="text-right py-2 px-2 font-medium">🟢</th>
                  <th className="text-right py-2 px-2 font-medium">⚡</th>
                  <th className="text-right py-2 px-2 font-medium">Всего</th>
                </tr>
              </thead>
              <tbody>
                {stats.byRegion.map(row => (
                  <tr key={row.region} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{row.region}</td>
                    <td className="text-right py-2 px-2 text-red-600">{row.levels.critical}</td>
                    <td className="text-right py-2 px-2 text-orange-600">{row.levels.high}</td>
                    <td className="text-right py-2 px-2 text-yellow-700">{row.levels.medium}</td>
                    <td className="text-right py-2 px-2 text-green-600">{row.levels.low}</td>
                    <td className="text-right py-2 px-2 text-red-600 font-medium">{row.real}</td>
                    <td className="text-right py-2 px-2 font-semibold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* By month timeline */}
        {stats.monthList.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Распределение по месяцам (по дате обновления/вспышки)
            </h2>
            <div className="space-y-1">
              {stats.monthList.map(m => {
                const maxTotal = Math.max(...stats.monthList.map(x => x.total), 1);
                const widthTotal = (m.total / maxTotal) * 100;
                const widthReal = m.real > 0 ? (m.real / maxTotal) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-muted-foreground font-mono">{m.month}</span>
                    <div className="flex-1 h-5 bg-muted rounded relative overflow-hidden">
                      <div
                        className="absolute h-full bg-blue-200 dark:bg-blue-900/40"
                        style={{ width: `${widthTotal}%` }}
                      />
                      <div
                        className="absolute h-full bg-red-500"
                        style={{ width: `${widthReal}%` }}
                      />
                    </div>
                    <span className="w-24 text-right">
                      <span className="text-red-600 font-medium">{m.real}</span>
                      <span className="text-muted-foreground"> / {m.total}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-sm align-middle mr-1" /> реальные вспышки
              <span className="inline-block w-3 h-3 bg-blue-200 dark:bg-blue-900/40 rounded-sm align-middle ml-3 mr-1" /> справочные данные
            </p>
          </section>
        )}

        {/* Top diseases table */}
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Microscope className="h-4 w-4 text-purple-600" />
            Все болезни ({stats.diseaseList.length})
          </h2>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium">#</th>
                  <th className="text-left py-2 px-2 font-medium">Болезнь</th>
                  <th className="text-right py-2 px-2 font-medium">Записей</th>
                  <th className="text-right py-2 px-2 font-medium">⚡ Реальные</th>
                  <th className="text-left py-2 px-2 font-medium">Уровни</th>
                </tr>
              </thead>
              <tbody>
                {stats.diseaseList.map((d, i) => (
                  <tr key={d.disease} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="py-2 px-2">
                      <span className="mr-1">{diseaseIcons[d.disease] || '🔬'}</span>
                      <span className="font-medium">{d.disease}</span>
                    </td>
                    <td className="text-right py-2 px-2 font-semibold">{d.total}</td>
                    <td className="text-right py-2 px-2">
                      {d.real > 0 ? (
                        <Badge variant="destructive" className="text-[10px] h-5 gap-0.5">
                          <Zap className="h-2.5 w-2.5" />
                          {d.real}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-0.5">
                        {LEVEL_ORDER.map(level => (
                          d.levels[level] > 0 && (
                            <span
                              key={level}
                              className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium"
                              style={{ background: threatLevelConfig[level].mapColor }}
                              title={`${threatLevelConfig[level].label}: ${d.levels[level]}`}
                            >
                              {d.levels[level]}
                            </span>
                          )
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Real outbreaks list */}
        {stats.realList.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-600" />
              Реальные вспышки ({stats.realList.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stats.realList.map(t => {
                const effectiveLevel = getEffectiveThreatLevel(t);
                const cfg = threatLevelConfig[effectiveLevel];
                const status = getOutbreakStatus(t);
                const statusCfg = outbreakStatusConfig[status];
                return (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded-md border ${cfg.borderColor} ${cfg.bgColor} flex items-start gap-2`}
                  >
                    <span className="text-lg">{diseaseIcons[t.disease] || '🔬'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{t.disease}</span>
                        <Badge className={`text-[9px] h-4 px-1 ${cfg.bgColor} ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                        <Badge
                          className={`text-[9px] h-4 px-1 border ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.borderColor}`}
                        >
                          {statusCfg.shortLabel}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t.district}, {t.region}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {t.lastUpdate}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer note */}
        <footer className="text-xs text-muted-foreground text-center py-4 border-t border-border">
          ЭпизоМонитор — {threats.length} угроз в {stats.regionCount} регионах ЮФО ·
          обновлено {new Date().toLocaleDateString('ru-RU')}
        </footer>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
