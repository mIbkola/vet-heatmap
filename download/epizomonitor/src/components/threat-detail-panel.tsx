'use client';

import {
  threatLevelConfig,
  diseaseIcons,
  getEffectiveThreatLevel,
  getOutbreakStatus,
  outbreakStatusConfig,
  getDaysSinceUpdate,
  type ThreatZone,
} from '@/lib/threat-data';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  MapPin,
  Clock,
  Calendar,
  Shield,
  Syringe,
  BookOpen,
  ChevronRight,
  X,
  ExternalLink,
  Zap,
  Activity,
  CheckCircle2,
  Eye,
} from 'lucide-react';

interface ThreatDetailPanelProps {
  threat: ThreatZone;
  onClose: () => void;
}

const priorityConfig = {
  immediate: { label: 'Немедленно', color: 'bg-red-100 text-red-700 border-red-300' },
  urgent: { label: 'Срочно', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  planned: { label: 'Планово', color: 'bg-blue-100 text-blue-700 border-blue-300' },
};

export default function ThreatDetailPanel({ threat, onClose }: ThreatDetailPanelProps) {
  // Эффективный уровень рассчитывается автоматически из статуса вспышки
  const effectiveLevel = getEffectiveThreatLevel(threat);
  const config = threatLevelConfig[effectiveLevel];
  const isReal = threat.isRealData;
  const status = isReal ? getOutbreakStatus(threat) : null;
  const statusCfg = status ? outbreakStatusConfig[status] : null;
  const daysSince = getDaysSinceUpdate(threat);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className={`p-4 ${config.bgColor} border-b ${config.borderColor}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{diseaseIcons[threat.disease] || '🔬'}</span>
            <div>
              <h2 className="text-lg font-bold">{threat.disease}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge className={`${config.bgColor} ${config.color} border ${config.borderColor}`}>
                  {config.label}
                </Badge>
                {isReal && statusCfg ? (
                  <Badge
                    className={`text-white border-0 gap-1 ${statusCfg.pulse ? 'animate-pulse' : ''}`}
                    style={{ background: statusCfg.dotColor }}
                  >
                    {status === 'active' && <Zap className="h-3 w-3" />}
                    {status === 'monitoring' && <Eye className="h-3 w-3" />}
                    {status === 'resolved' && <CheckCircle2 className="h-3 w-3" />}
                    {statusCfg.label}
                  </Badge>
                ) : !isReal ? (
                  <Badge variant="outline" className="text-xs">
                    Справочные данные
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{threat.district}, {threat.region}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Сезон: {threat.season}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{isReal ? 'Дата вспышки' : 'Обновлено'}: {threat.lastUpdate}</span>
            {isReal && (
              <span className="text-xs text-muted-foreground">· {daysSince} дн. назад</span>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Статус вспышки — объясняет, почему уровень именно такой */}
          {isReal && statusCfg && (
            <div className={`rounded-lg border p-3 ${statusCfg.bgColor} ${statusCfg.borderColor}`}>
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  {status === 'active' && <Activity className={`h-4 w-4 ${statusCfg.color}`} />}
                  {status === 'monitoring' && <Eye className={`h-4 w-4 ${statusCfg.color}`} />}
                  {status === 'resolved' && <CheckCircle2 className={`h-4 w-4 ${statusCfg.color}`} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 h-4 ${statusCfg.color}`}>
                      {daysSince} дн. назад
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {statusCfg.description}
                  </p>
                  <div className="mt-2 text-[11px] text-muted-foreground border-t border-current/10 pt-2">
                    <span className="font-medium">Уровень угрозы определён автоматически: </span>
                    {status === 'active' && ("активная вспышка → критический/высокий уровень")}
                    {status === 'monitoring' && ("вспышка под наблюдением → средний уровень")}
                    {status === 'resolved' && ("вспышка погашена → низкий уровень")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Описание угрозы
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {threat.description}
            </p>
          </div>

          {/* Affected Animals */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <span className="text-base">🐄</span>
              Подверженные животные
            </h3>
            <div className="flex flex-wrap gap-2">
              {threat.affectedAnimals.map(animal => (
                <Badge key={animal} variant="outline" className="text-xs">
                  {animal}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Recommendations */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-green-600" />
              Рекомендации по устранению
            </h3>
            <div className="space-y-3">
              {threat.recommendations.map((rec, i) => {
                const pConfig = priorityConfig[rec.priority];
                return (
                  <div key={i} className="border rounded-lg p-3 bg-background">
                    <div className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{rec.title}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${pConfig.color}`}>
                            {pConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {rec.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Prevention Steps */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Шаги по предотвращению
            </h3>
            <ol className="space-y-2">
              {threat.preventionSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <Separator />

          {/* Vaccines */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Syringe className="h-4 w-4 text-purple-600" />
              Рекомендуемые вакцины
            </h3>
            <div className="space-y-3">
              {threat.vaccines.map((vax, i) => (
                <div key={i} className="border rounded-lg p-3 bg-background">
                  <p className="font-medium text-sm">{vax.name}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <p><span className="font-medium">Производитель:</span> {vax.manufacturer}</p>
                    <p><span className="font-medium">Схема:</span> {vax.schedule}</p>
                    <p><span className="font-medium">Примечание:</span> {vax.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Data Sources — Real verified links */}
          {threat.isRealData && threat.dataSources && threat.dataSources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ExternalLink className="h-4 w-4 text-green-600" />
                Подтверждённые источники
                <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 h-5">
                  ✓ Проверено
                </Badge>
              </h3>
              <div className="space-y-2">
                {threat.dataSources.map((ds, i) => {
                  const typeConfig = {
                    official: { label: 'Официальный', color: 'bg-blue-100 text-blue-700' },
                    media: { label: 'СМИ', color: 'bg-amber-100 text-amber-700' },
                    scientific: { label: 'Научный', color: 'bg-purple-100 text-purple-700' },
                  };
                  const tc = typeConfig[ds.type];
                  return (
                    <div key={i} className="border rounded-lg p-2.5 bg-background flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <a
                          href={ds.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:underline leading-tight"
                        >
                          {ds.name}
                        </a>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[10px] px-1.5 py-0 h-4 ${tc.color}`}>
                            {tc.label}
                          </Badge>
                          {ds.date && (
                            <span className="text-[10px] text-muted-foreground">{ds.date}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* General Sources */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Общие источники
            </h3>
            <div className="space-y-1">
              {threat.sources.map((source, i) => (
                <p key={i} className="text-xs text-muted-foreground">{source}</p>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
