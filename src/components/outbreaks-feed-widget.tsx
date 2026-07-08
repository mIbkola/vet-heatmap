'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Radio, RefreshCw, ExternalLink, Calendar, AlertCircle } from 'lucide-react';

interface FeedItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string;
  pubDateMs: number;
  source: 'fsvps_oper' | 'fsvps_south';
  description: string;
  categories: string[];
}

interface FeedResponse {
  fetchedAt: string;
  sources: Array<{ id: string; label: string; url: string; count: number }>;
  items: FeedItem[];
  errors: Array<{ source: string; error: string }>;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  fsvps_oper: { label: 'ФСВПС', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  fsvps_south: { label: 'Южное МУ', color: 'bg-amber-100 text-amber-700 border-amber-300' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(ms: number): string {
  const diffMs = Date.now() - ms;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} ч назад`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays} дн назад`;
  return new Date(ms).toLocaleDateString('ru-RU');
}

export default function OutbreaksFeedWidget() {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/outbreaks-feed.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FeedResponse = await res.json();
      setData(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Initial load + auto-refresh every 30 min
  useEffect(() => {
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Count unread (items from last 24h) for the badge
  const last24hCount = data
    ? data.items.filter(i => Date.now() - i.pubDateMs < 24 * 60 * 60 * 1000).length
    : 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 shadow-lg h-9"
        >
          <Radio className={`h-4 w-4 ${loading ? 'animate-pulse' : ''} ${last24hCount > 0 ? 'text-red-600' : 'text-blue-600'}`} />
          <span className="hidden sm:inline">Лента вспышек</span>
          <span className="sm:hidden">Лента</span>
          {last24hCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5 ml-1">
              {last24hCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-blue-600" />
              Лента вспышек
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={load}
              disabled={loading}
              title="Обновить"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {data && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data.sources.map(s => (
                <Badge key={s.id} variant="outline" className="text-[10px]">
                  {s.label}: {s.count}
                </Badge>
              ))}
              <span className="text-[10px] text-muted-foreground ml-auto">
                Обновлено: {formatDate(data.fetchedAt)}
              </span>
            </div>
          )}
        </SheetHeader>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/50">
            <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Ошибка загрузки ленты</p>
                <p className="opacity-80">{error}</p>
                <p className="opacity-70 mt-1">
                  Возможно, сайт fsvps.gov.ru недоступен или заблокирован. Попробуйте обновить позже.
                </p>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {!data && loading && (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-card animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}
            {data && data.items.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Нет записей в ленте
              </div>
            )}
            {data && data.items.map((item, idx) => {
              const src = SOURCE_LABELS[item.source] ?? { label: item.source, color: 'bg-slate-100 text-slate-700 border-slate-300' };
              return (
                <a
                  key={`${item.source}-${idx}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${src.color}`}>
                      {src.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {formatRelative(item.pubDateMs)}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </div>
                  <p className="text-sm font-medium leading-snug line-clamp-3">
                    {item.title}
                  </p>
                  {item.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.categories.slice(0, 4).map((c, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border text-[10px] text-muted-foreground">
          Источники: fsvps.gov.ru/oper/feed/ + 123.fsvps.gov.ru.
          Обновление каждые 30 мин. Данные предоставлены «как есть».
        </div>
      </SheetContent>
    </Sheet>
  );
}
