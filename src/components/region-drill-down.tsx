"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Activity, AlertCircle } from "lucide-react";
import type { Outbreak, DiseaseKey } from "@/types/domain";
import { diseaseColor } from "@/lib/colors";
import { DISEASE_LABELS } from "@/data/diseases-normalize";
import { speciesRu, sourceRu } from "@/lib/i18n-species";
import { getRegionProperties } from "@/data/regions";
import { RegionMiniMap } from "@/components/region-mini-map";

interface RegionDrillDownProps {
  region: string | null;
  outbreaks: Outbreak[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectOutbreak?: (o: Outbreak) => void;
  /** Municipalities GeoJSON (GADM level 2) for mini-map */
  municipalities?: GeoJSON.FeatureCollection | null;
  /** Regions GeoJSON (level 1) for region outline */
  regionsGeo?: GeoJSON.FeatureCollection | null;
}

export function RegionDrillDown({
  region,
  outbreaks,
  open,
  onOpenChange,
  onSelectOutbreak,
  municipalities,
  regionsGeo,
}: RegionDrillDownProps) {
  // ВАЖНО: не делаем early return если !region — иначе Sheet размонтируется
  // до того, как успеет закрыться. Используем region только внутри контента.
  const props = region ? getRegionProperties(region) : null;
  const regionOutbreaks = region ? outbreaks.filter((o) => o.region_geo === region) : [];
  const ongoing = regionOutbreaks.filter((o) => o.status === "Ongoing");
  const diseases = new Set(regionOutbreaks.map((o) => o.disease_key));
  const totalCases = regionOutbreaks.reduce((s, o) => s + o.cases, 0);
  const totalDeaths = regionOutbreaks.reduce((s, o) => s + o.deaths, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl overflow-y-auto thin-scroll pb-safe"
      >
        {/* Sticky header with explicit Close button — всегда виден */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b pb-3 pt-2 px-1 -mx-1 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 pr-10">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <div>
                <SheetTitle className="text-base leading-tight">
                  {props?.name_ru ?? region ?? "Загрузка..."}
                </SheetTitle>
                <SheetDescription className="text-[11px] mt-0.5">
                  {props?.federal_district ? `Округ: ${props.federal_district} · ` : ""}
                  {props?.iso_code ?? ""}
                </SheetDescription>
              </div>
            </div>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 rounded-md p-1.5 hover:bg-accent transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {region ? (
          <>
            {/* Mini-map of region with municipalities and outbreaks */}
            {regionsGeo && (
              <div className="mb-4">
                <RegionMiniMap
                  regions={regionsGeo}
                  regionName={region}
                  outbreaks={outbreaks}
                  height={300}
                />
              </div>
            )}

            <div className="space-y-4">
              {/* Stats summary */}
              <div className="grid grid-cols-2 gap-2">
            <Card className="p-2.5 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="text-lg font-bold tabular-nums leading-none">
                  {regionOutbreaks.length}
                </div>
                <div className="text-[10px] text-muted-foreground">всего вспышек</div>
              </div>
            </Card>
            <Card className="p-2.5 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <div className="text-lg font-bold tabular-nums leading-none text-destructive">
                  {ongoing.length}
                </div>
                <div className="text-[10px] text-muted-foreground">активных</div>
              </div>
            </Card>
            <Card className="p-2.5 flex items-center gap-2">
              <div className="text-lg font-bold tabular-nums leading-none">
                {diseases.size}
              </div>
              <div className="text-[10px] text-muted-foreground">типов болезней</div>
            </Card>
            <Card className="p-2.5 flex items-center gap-2">
              <div className="text-lg font-bold tabular-nums leading-none text-destructive">
                {totalDeaths > 0 ? totalDeaths.toLocaleString("ru-RU") : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">пало</div>
            </Card>
          </div>

          {/* Region metadata */}
          {props && (
            <>
              <Separator />
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-muted-foreground">Население</div>
                  <div className="font-medium tabular-nums">
                    {props.population_mln > 0
                      ? `${props.population_mln} млн`
                      : "нет данных"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Свиней/км²</div>
                  <div className="font-medium tabular-nums">
                    {props.pigs_per_km2 > 0 ? props.pigs_per_km2 : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">КРС/км²</div>
                  <div className="font-medium tabular-nums">
                    {props.cattle_per_km2 > 0 ? props.cattle_per_km2 : "—"}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Outbreaks list */}
          <div>
            <h4 className="text-xs font-semibold mb-2">
              Вспышки в регионе ({regionOutbreaks.length})
            </h4>
            <div className="max-h-[40vh] overflow-y-auto thin-scroll">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-2 text-xs">Дата</TableHead>
                    <TableHead className="py-2 text-xs">Болезнь</TableHead>
                    <TableHead className="py-2 text-xs">Вид</TableHead>
                    <TableHead className="py-2 text-xs text-right">Случаи</TableHead>
                    <TableHead className="py-2 text-xs">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionOutbreaks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        Нет вспышек в этом регионе
                      </TableCell>
                    </TableRow>
                  ) : (
                    regionOutbreaks
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((o) => {
                        const labels = DISEASE_LABELS[o.disease_key as DiseaseKey];
                        const color = diseaseColor(o.disease_key, o.disease_group);
                        return (
                          <TableRow
                            key={o.id}
                            onClick={() => {
                              onSelectOutbreak?.(o);
                              onOpenChange(false);
                            }}
                            className="cursor-pointer hover:bg-accent/30 relative"
                            style={{ boxShadow: `inset 3px 0 0 0 ${color}` }}
                          >
                            <TableCell className="py-2 text-xs whitespace-nowrap tabular-nums">
                              {new Date(o.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                            </TableCell>
                            <TableCell className="py-2 text-xs">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                {labels?.short_ru ?? o.disease}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">
                              {speciesRu(o.species)}
                            </TableCell>
                            <TableCell className="py-2 text-xs text-right font-mono tabular-nums">
                              {o.cases > 0 ? o.cases.toLocaleString("ru-RU") : "—"}
                            </TableCell>
                            <TableCell className="py-2">
                              {o.status === "Ongoing" ? (
                                <Badge variant="destructive" className="text-[9px] py-0 h-4">Активна</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] py-0 h-4">Заверш.</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
