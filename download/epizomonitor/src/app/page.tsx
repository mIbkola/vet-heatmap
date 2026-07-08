'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { type ThreatZone } from '@/lib/threat-data';
import { type Disease } from '@/lib/diseases-data';
import { useThreats } from '@/hooks/use-threats';
import ThreatSidebar from '@/components/threat-sidebar';
import ThreatDetailPanel from '@/components/threat-detail-panel';
import DiseaseHandbook from '@/components/disease-handbook';
import DiseaseDetail from '@/components/disease-detail';
import OutbreaksFeedWidget from '@/components/outbreaks-feed-widget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type DateRange } from '@/components/date-range-filter';
import {
  ShieldAlert,
  MapPin,
  Menu,
  Activity,
  BookOpen,
  Map as MapIcon,
  BarChart3,
} from 'lucide-react';

const ThreatMap = dynamic(() => import('@/components/threat-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg">
      <div className="text-center">
        <Activity className="h-8 w-8 animate-pulse text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    </div>
  ),
});

type ViewMode = 'map' | 'handbook';

export default function Home() {
  const { threats, loading } = useThreats();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectedThreat, setSelectedThreat] = useState<ThreatZone | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterDisease, setFilterDisease] = useState('all');
  const [filterReal, setFilterReal] = useState<'all' | 'real' | 'reference'>('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange>({ start: null, end: null });
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSelectThreat = (threat: ThreatZone) => {
    setSelectedThreat(threat);
  };

  const handleCloseThreatDetail = () => {
    setSelectedThreat(null);
  };

  const handleSelectDisease = (disease: Disease) => {
    setSelectedDisease(disease);
  };

  const handleCloseDiseaseDetail = () => {
    setSelectedDisease(null);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="border-b border-border bg-card px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-600" />
          <div>
            <h1 className="text-lg font-bold leading-tight">ЭпизоМонитор</h1>
            <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">
              Карта эпизоотических угроз и справочник болезней
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="ml-4">
          <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setSelectedThreat(null); setSelectedDisease(null); }}>
            <TabsList className="h-9">
              <TabsTrigger value="map" className="text-xs gap-1 px-3">
                <MapIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Карта угроз</span>
                <span className="sm:hidden">Карта</span>
              </TabsTrigger>
              <TabsTrigger value="handbook" className="text-xs gap-1 px-3">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Справочник</span>
                <span className="sm:hidden">Справка</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="ml-2 hidden md:block">
          <Link href="/stats">
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="text-xs">Статистика</span>
            </Button>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {viewMode === 'map' && (
            <OutbreaksFeedWidget />
          )}
          {viewMode === 'map' && (
            <Badge variant="outline" className="text-xs gap-1 hidden md:flex">
              <MapPin className="h-3 w-3" />
              ЮФО: 5 регионов
            </Badge>
          )}
          {viewMode === 'handbook' && (
            <Badge variant="outline" className="text-xs gap-1 hidden md:flex">
              <BookOpen className="h-3 w-3" />
              91 болезнь / 1718 препаратов
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs gap-1">
            <Activity className="h-3 w-3" />
            Прототип
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {loading && (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center">
              <Activity className="h-8 w-8 animate-pulse text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Загрузка данных...</p>
            </div>
          </div>
        )}
        {!loading && viewMode === 'map' && (
          <>
            {/* Sidebar - Desktop */}
            {!isMobile && (
              <div className="w-80 border-r border-border flex-shrink-0 bg-card">
                <ThreatSidebar
                  threats={threats}
                  selectedThreat={selectedThreat}
                  onSelectThreat={handleSelectThreat}
                  filterLevel={filterLevel}
                  setFilterLevel={setFilterLevel}
                  filterDisease={filterDisease}
                  setFilterDisease={setFilterDisease}
                  filterReal={filterReal}
                  setFilterReal={setFilterReal}
                  filterDateRange={filterDateRange}
                  setFilterDateRange={setFilterDateRange}
                />
              </div>
            )}

            {/* Map Area */}
            <div className="flex-1 relative">
              <ThreatMap
                threats={threats}
                selectedThreat={selectedThreat}
                onSelectThreat={handleSelectThreat}
                filterLevel={filterLevel}
                filterDisease={filterDisease}
                filterReal={filterReal}
                filterDateRange={filterDateRange}
              />

              {/* Mobile menu button */}
              {isMobile && !selectedThreat && (
                <div className="absolute top-3 left-3 z-[1000]">
                  <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                    <SheetTrigger asChild>
                      <Button size="icon" variant="secondary" className="shadow-lg">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0">
                      <SheetTitle className="sr-only">Список угроз</SheetTitle>
                      <ThreatSidebar
                        threats={threats}
                        selectedThreat={selectedThreat}
                        onSelectThreat={(t) => {
                          handleSelectThreat(t);
                          setSidebarOpen(false);
                        }}
                        filterLevel={filterLevel}
                        setFilterLevel={setFilterLevel}
                        filterDisease={filterDisease}
                        setFilterDisease={setFilterDisease}
                        filterReal={filterReal}
                        setFilterReal={setFilterReal}
                        filterDateRange={filterDateRange}
                        setFilterDateRange={setFilterDateRange}
                      />
                    </SheetContent>
                  </Sheet>
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-w-[240px]">
                <p className="text-xs font-semibold mb-2">Уровень угрозы</p>
                <div className="space-y-1">
                  {[
                    { label: 'Критический', color: 'bg-red-500' },
                    { label: 'Высокий', color: 'bg-orange-500' },
                    { label: 'Средний', color: 'bg-yellow-500' },
                    { label: 'Низкий', color: 'bg-green-500' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-xs">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-2 pt-2 space-y-1.5">
                  <p className="text-xs font-semibold">Тип данных</p>
                  <div className="flex items-center gap-2">
                    <div className="relative w-3 h-3 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-red-500 opacity-40 animate-ping" />
                      <div className="relative w-2 h-2 rounded-full bg-red-500 ring-1 ring-white" />
                    </div>
                    <span className="text-xs">⚡ Реальная вспышка</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm border-2 border-dashed border-slate-500 bg-slate-500/20" />
                    <span className="text-xs">Справочные данные</span>
                  </div>
                </div>
                <div className="border-t border-border mt-2 pt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500/60" />
                    <span className="text-xs">Активный регион</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-slate-800/60 border border-slate-600/40" />
                    <span className="text-xs">Пока не подключён</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detail Panel - Desktop */}
            {!isMobile && selectedThreat && (
              <div className="w-96 border-l border-border flex-shrink-0 bg-card">
                <ThreatDetailPanel threat={selectedThreat} onClose={handleCloseThreatDetail} />
              </div>
            )}

            {/* Detail Panel - Mobile */}
            {isMobile && selectedThreat && (
              <div className="absolute inset-0 z-[1001] bg-card">
                <ThreatDetailPanel threat={selectedThreat} onClose={handleCloseThreatDetail} />
              </div>
            )}
          </>
        )}

        {!loading && viewMode === 'handbook' && (
          <>
            {/* Handbook Sidebar - Desktop */}
            {!isMobile && (
              <div className="w-80 border-r border-border flex-shrink-0 bg-card">
                <DiseaseHandbook
                  selectedDisease={selectedDisease}
                  onSelectDisease={handleSelectDisease}
                />
              </div>
            )}

            {/* Center area - placeholder or info */}
            <div className="flex-1 bg-muted/30 flex items-center justify-center p-6">
              {!selectedDisease && !isMobile && (
                <div className="text-center max-w-md">
                  <BookOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                    Справочник болезней
                  </h2>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">
                    Выберите болезнь из списка слева для просмотра протокола лечения и списка препаратов.
                    Используйте поиск и фильтры для быстрого поиска.
                  </p>
                </div>
              )}
              {isMobile && !selectedDisease && (
                <DiseaseHandbook
                  selectedDisease={selectedDisease}
                  onSelectDisease={handleSelectDisease}
                />
              )}
            </div>

            {/* Disease Detail - Desktop */}
            {!isMobile && selectedDisease && (
              <div className="w-[420px] border-l border-border flex-shrink-0 bg-card">
                <DiseaseDetail disease={selectedDisease} onClose={handleCloseDiseaseDetail} />
              </div>
            )}

            {/* Disease Detail - Mobile */}
            {isMobile && selectedDisease && (
              <div className="absolute inset-0 z-[1001] bg-card">
                <DiseaseDetail disease={selectedDisease} onClose={handleCloseDiseaseDetail} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
