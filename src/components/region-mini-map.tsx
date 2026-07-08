"use client";

import { useEffect, useRef, useMemo } from "react";
import maplibregl, { Popup, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import type { Outbreak } from "@/types/domain";
import { diseaseColor } from "@/lib/colors";
import { useRegionMunicipalities } from "@/lib/use-region-municipalities";

interface RegionMiniMapProps {
  /** GeoJSON feature collection of ALL regions (for the selected region outline) */
  regions: GeoJSON.FeatureCollection | null;
  /** Selected region shapeName (English) — e.g. "Krasnodar" */
  regionName: string | null;
  /** All outbreaks — will filter to this region */
  outbreaks: Outbreak[];
  /** Height of the minimap in pixels (default 280) */
  height?: number;
}

/**
 * Мини-карта региона с муниципалитетами и вспышками.
 *
 * Показывает:
 *   - Границы региона (толстая чёрная линия)
 *   - Все муниципалитеты этого региона (тонкие серые границы)
 *   - Маркеры вспышек (цветные точки, цвет по болезни)
 *   - Popup при клике на вспышку
 *
 * Используется в RegionDrillDown Sheet — слева от информации.
 */
export function RegionMiniMap({
  regions,
  regionName,
  outbreaks,
  height = 280,
}: RegionMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const popupsRef = useRef<Popup[]>([]);

  // Грузим муниципалитеты ТОЛЬКО для этого региона (3-200 KB вместо 39 MB)
  const { geo: regionMunis, loading: muniLoading } = useRegionMunicipalities(regionName);
  const { resolvedTheme } = useTheme();

  // regionMunis приходит из useRegionMunicipalities (уже отфильтрован по региону)
  // Если данные ещё грузятся — пустая коллекция
  const regionMunisData = regionMunis ?? { type: "FeatureCollection" as const, features: [] };

  // Filter region outline
  const regionFeature = useMemo(() => {
    if (!regions || !regionName) return null;
    return regions.features.find((f) => {
      const props = f.properties as Record<string, unknown>;
      return props.shapeName === regionName;
    });
  }, [regions, regionName]);

  // Filter outbreaks for this region
  const regionOutbreaks = useMemo(() => {
    if (!regionName) return [];
    return outbreaks.filter((o) => o.region_geo === regionName);
  }, [outbreaks, regionName]);

  // Initialize map — RECREATE on region change (полный пересчёт)
  useEffect(() => {
    if (!containerRef.current) return;
    if (!regionName) return;

    const isDark = resolvedTheme === "dark";

    // Полная зачистка старой карты ПЕРЕД созданием новой
    if (mapRef.current) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupsRef.current.forEach((p) => p.remove());
      popupsRef.current = [];
      try {
        mapRef.current.remove();
      } catch (e) {
        // ignore — уже удалена
      }
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-light": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "© CARTO © OpenStreetMap",
          },
          "osm-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: "© CARTO © OpenStreetMap",
          },
        },
        layers: [
          {
            id: "background-tiles",
            type: "raster",
            source: isDark ? "osm-dark" : "osm-light",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [40, 55],
      zoom: 4,
      minZoom: 2,
      maxZoom: 14,
      attributionControl: false,
    });

    mapRef.current = map;

    return () => {
      // Полная зачистка при unmount/смене региона
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupsRef.current.forEach((p) => p.remove());
      popupsRef.current = [];
      try {
        map.remove();
      } catch (e) {
        // ignore
      }
      mapRef.current = null;
    };
  }, [regionName, resolvedTheme]);

  // Update data when region/municipalities/outbreaks change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !regionName) return;

    const updateMap = () => {
      // Remove old layers/sources
      ["muni-fill", "muni-line", "region-outline"].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      ["muni-data", "region-outline-data"].forEach((id) => {
        if (map.getSource(id)) map.removeSource(id);
      });

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupsRef.current.forEach((p) => p.remove());
      popupsRef.current = [];

      // Add municipalities (this region only)
      if (regionMunisData.features.length > 0) {
        map.addSource("muni-data", { type: "geojson", data: regionMunis });

        // Municipality fill (very light)
        map.addLayer({
          id: "muni-fill",
          type: "fill",
          source: "muni-data",
          paint: {
            "fill-color": "#3b82f6",
            "fill-opacity": 0.06,
          },
        });

        // Municipality borders
        map.addLayer({
          id: "muni-line",
          type: "line",
          source: "muni-data",
          paint: {
            "line-color": resolvedTheme === "dark" ? "#6b7280" : "#9ca3af",
            "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 8, 1, 12, 1.5],
            "line-opacity": 0.7,
          },
        });
      }

      // Add region outline (thick black)
      if (regionFeature) {
        const regionFC: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: [regionFeature],
        };
        map.addSource("region-outline-data", { type: "geojson", data: regionFC });
        map.addLayer({
          id: "region-outline",
          type: "line",
          source: "region-outline-data",
          paint: {
            "line-color": "#111827",
            "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2, 8, 3, 12, 4],
            "line-opacity": 0.9,
          },
        });
      }

      // Add outbreak markers
      for (const o of regionOutbreaks) {
        if (typeof o.lat !== "number" || typeof o.lon !== "number") continue;
        if (!Number.isFinite(o.lat) || !Number.isFinite(o.lon)) continue;
        if (o.lat === 0 && o.lon === 0) continue;

        const color = diseaseColor(o.disease_key, o.disease_group);
        const isOngoing = o.status === "Ongoing";

        // Create HTML element for marker
        const el = document.createElement("div");
        el.style.cssText = `
          width: ${isOngoing ? 14 : 10}px;
          height: ${isOngoing ? 14 : 10}px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid ${isOngoing ? "#fff" : color};
          box-shadow: 0 0 0 ${isOngoing ? "2px" : "1px"} ${color}88;
          cursor: pointer;
        `;

        // Popup with outbreak info
        const popup = new Popup({ offset: 12, closeButton: true, maxWidth: "240px" }).setHTML(`
          <div style="font-family: system-ui, sans-serif; padding: 2px;">
            <div style="font-weight: 600; font-size: 12px; color: ${color}; margin-bottom: 2px;">
              ${o.disease}
            </div>
            <div style="font-size: 10px; color: #6b7280; margin-bottom: 4px;">
              ${new Date(o.date).toLocaleDateString("ru-RU")}
              ${o.species ? " · " + o.species : ""}
            </div>
            <div style="font-size: 10px;">
              ${o.status === "Ongoing"
                ? '<span style="color: #dc2626; font-weight: 600;">● Активная</span>'
                : '<span style="color: #6b7280;">○ Завершена</span>'}
              ${o.cases > 0 ? " · Случаев: " + o.cases : ""}
            </div>
          </div>
        `);
        popupsRef.current.push(popup);

        const marker = new Marker({ element: el })
          .setLngLat([o.lon, o.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      }

      // Fit bounds to region outline (or municipalities)
      const fitFeature = regionFeature || regionMunisData.features[0];
      if (fitFeature && fitFeature.geometry) {
        let west = 180, south = 90, east = -180, north = -90;
        const collect = (coords: number[][]) => {
          for (const [lng, lat] of coords) {
            if (lng < west) west = lng;
            if (lat < south) south = lat;
            if (lng > east) east = lng;
            if (lat > north) north = lat;
          }
        };
        const g = fitFeature.geometry;
        if (g.type === "Polygon") {
          for (const ring of g.coordinates as number[][][]) collect(ring);
        } else if (g.type === "MultiPolygon") {
          for (const poly of g.coordinates as number[][][]) for (const ring of poly) collect(ring);
        }
        if (west < east && south < north) {
          map.fitBounds([[west, south], [east, north]], { padding: 30, duration: 600, maxZoom: 9 });
        }
      }
    };

    if (map.loaded()) {
      updateMap();
    } else {
      map.once("load", updateMap);
    }
  }, [regionName, regionMunisData, regionFeature, regionOutbreaks, resolvedTheme]);

  if (!regionName) return null;

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-border bg-card"
      style={{ height: `${height}px` }}
    >
      <div ref={containerRef} className="w-full h-full" />
      {/* Loading overlay */}
      {muniLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-muted-foreground">Загрузка муниципалитетов…</span>
          </div>
        </div>
      )}
      {/* Legend overlay */}
      <div className="absolute bottom-2 left-2 rounded-md bg-card/80 backdrop-blur-sm px-2 py-1 text-[9px] border border-border/50 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-gray-900" />
          <span className="text-muted-foreground">регион</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="w-3 h-0.5 bg-gray-400" />
          <span className="text-muted-foreground">муниципалитеты ({regionMunisData.features.length})</span>
        </div>
        {regionOutbreaks.length > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-red-500 border border-white" />
            <span className="text-muted-foreground">вспышки ({regionOutbreaks.length})</span>
          </div>
        )}
      </div>
    </div>
  );
}
