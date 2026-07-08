"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl, { Map as MLMap, Popup, Marker, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";

import type { Outbreak, OutbreakDataset, DiseaseProfile } from "@/types/domain";
import { diseaseColor } from "@/lib/colors";
import { DISEASE_PROFILES_BY_KEY } from "@/data/disease-profiles";
import { REGION_PROPERTIES } from "@/data/regions";
import { speciesRu, sourceRu } from "@/lib/i18n-species";

const basePath = "";

// Russia bounds: [[west, south], [east, north]]
const RUSSIA_BOUNDS: LngLatBoundsLike = [[19, 41], [180, 82]];

interface OutbreakMapProps {
  outbreaks: Outbreak[];
  geo: GeoJSON.FeatureCollection | null;
  /** Show risk-zone circles around ongoing outbreaks (3/10/30 km). */
  showRiskZones: boolean;
  /** Show choropleth (density) layer. */
  showChoropleth: boolean;
  /** Show livestock density heatmap (pigs/cattle/poultry per km²). */
  densityLayer: "none" | "pigs" | "cattle" | "poultry";
  /** Show outbreak heatmap (replaces markers with density heatmap). */
  showHeatmap?: boolean;
  /** Optional: municipalities GeoJSON (GADM level 2). If provided, shows boundaries colored by danger level. */
  municipalities?: GeoJSON.FeatureCollection | null;
  /** Show enterprises (farms/plants) as markers on the map */
  showEnterprises?: boolean;
  /** Enterprise data */
  enterprises?: Array<{ id: string; name: string; type: string; lat: number; lon: number; region?: string; capacity?: number; capacity_unit?: string }>;
  /** Called when user clicks an outbreak marker. */
  onSelectOutbreak?: (o: Outbreak) => void;
  /** Called when user clicks a region. */
  onSelectRegion?: (region: string) => void;
}

export function OutbreakMap({
  outbreaks,
  geo,
  showRiskZones,
  showChoropleth,
  densityLayer,
  showHeatmap = false,
  municipalities = null,
  showEnterprises = false,
  enterprises = [],
  onSelectOutbreak,
  onSelectRegion,
}: OutbreakMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const popupsRef = useRef<Record<string, Popup>>({});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);

  // ─── Init map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const isDark = resolvedTheme === "dark";

    const map = new maplibregl.Map({
      container: mapContainer.current,
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
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          },
          "osm-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: '&copy; OSM &copy; CARTO',
          },
          "satellite": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "&copy; Esri",
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
      center: [55, 60], // geographic center of Russia-ish
      zoom: 2.5,
      minZoom: 2,
      maxZoom: 12,
      maxBounds: RUSSIA_BOUNDS,
      attributionControl: { compact: true },
    });

    map.on("load", () => {
      setReady(true);
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    mapRef.current = map;

    // Resize observer — handles mobile URL bar show/hide + viewport changes
    if (mapContainer.current && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        mapRef.current?.resize();
      });
      ro.observe(mapContainer.current);
      // Store for cleanup
      resizeObserverRef.current = ro;
    }

    // Also resize on window resize (mobile URL bar toggle, orientation change)
    const onWindowResize = () => mapRef.current?.resize();
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", onWindowResize);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onWindowResize);
      resizeObserverRef.current?.disconnect();
      // cleanup markers
      Object.values(markersRef.current).forEach((m) => m.remove());
      Object.values(popupsRef.current).forEach((p) => p.remove());
      markersRef.current = {};
      popupsRef.current = {};
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []); // init once

  // ─── Switch base layer on theme change ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const isDark = resolvedTheme === "dark";
    if (map.getLayer("background-tiles")) {
      map.removeLayer("background-tiles");
    }
    map.addLayer(
      {
        id: "background-tiles",
        type: "raster",
        source: isDark ? "osm-dark" : "osm-light",
        minzoom: 0,
        maxzoom: 19,
      },
      // insert before any other layers if they exist
      map.getStyle().layers.find((l) => l.id.startsWith("choropleth") || l.id.startsWith("risk") || l.id.startsWith("outbreak"))?.id,
    );
  }, [resolvedTheme, ready]);

  // ─── Choropleth layer ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !geo) return;

    // Add source if missing
    if (!map.getSource("regions")) {
      map.addSource("regions", { type: "geojson", data: geo, promoteId: "shapeName" });
    } else {
      (map.getSource("regions") as maplibregl.GeoJSONSource).setData(geo);
    }

    // Compute outbreak density per region
    const density = new Map<string, number>();
    for (const o of outbreaks) {
      if (!o.region_geo) continue;
      density.set(o.region_geo, (density.get(o.region_geo) ?? 0) + 1);
    }
    const maxCount = Math.max(1, ...density.values());

    // Color stops (YlOrRd-ish)
    const stops: [number, string][] = [
      [0, "#ffffff00"],
      [1 / maxCount, "#fff5eb"],
      [Math.max(0.25, 1 / maxCount), "#fd8d3c"],
      [Math.max(0.5, 1 / maxCount), "#e6550d"],
      [1, "#a63603"],
    ];

    if (map.getLayer("choropleth-fill")) {
      map.removeLayer("choropleth-fill");
    }
    if (map.getLayer("choropleth-line")) {
      map.removeLayer("choropleth-line");
    }
    if (map.getLayer("choropleth-fill-ti")) {
      map.removeLayer("choropleth-fill-ti");
    }
    if (map.getLayer("choropleth-line-ti")) {
      map.removeLayer("choropleth-line-ti");
    }
    if (map.getLayer("choropleth-hover")) {
      map.removeLayer("choropleth-hover");
    }

    if (showChoropleth) {
      // Terra incognita — серая заливка + пунктирная граница
      map.addLayer({
        id: "choropleth-fill-ti",
        type: "fill",
        source: "regions",
        layout: {},
        filter: ["==", ["get", "terra_incognita"], true],
        paint: {
          "fill-color": "#6b7280",
          "fill-opacity": 0.35,
          "fill-pattern": "", // без паттерна
        },
      });
      map.addLayer({
        id: "choropleth-line-ti",
        type: "line",
        source: "regions",
        layout: {},
        filter: ["==", ["get", "terra_incognita"], true],
        paint: {
          "line-color": "#374151",
          "line-width": 1.5,
          "line-dasharray": [4, 3],
          "line-opacity": 0.8,
        },
      });

      // Обычные регионы
      map.addLayer({
        id: "choropleth-fill",
        type: "fill",
        source: "regions",
        layout: {},
        filter: ["!=", ["get", "terra_incognita"], true],
        paint: {
          "fill-color": {
            property: "shapeName",
            type: "interval",
            stops: stops.map(([t, c]) => [t * maxCount, c]),
            default: "#ffffff00",
          },
          "fill-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "choropleth-line",
        type: "line",
        source: "regions",
        layout: {},
        filter: ["!=", ["get", "terra_incognita"], true],
        paint: {
          "line-color": resolvedTheme === "dark" ? "#555" : "#888",
          "line-width": 0.5,
          "line-opacity": 0.4,
        },
      });
      // Hover highlight
      map.addLayer({
        id: "choropleth-hover",
        type: "line",
        source: "regions",
        layout: {},
        paint: {
          "line-color": "#1B5E20",
          "line-width": 2,
          "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0],
        },
      });
    }

    // Region click → fly to region and callback
    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties as Record<string, unknown>;
      const name = props.shapeName as string;
      const isTI = props.terra_incognita === true;

      // Terra incognita — отдельный popup, без drill-down
      if (isTI) {
        const nameRu = (props.name_ru as string) || name;
        new Popup({ closeButton: true, maxWidth: "260px" })
          .setHTML(`
            <div style="font-family: system-ui, sans-serif; padding: 4px;">
              <div style="font-weight: 700; font-size: 13px; color: #374151; margin-bottom: 4px;">
                ${nameRu}
              </div>
              <div style="display: inline-block; background: #6b7280; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-bottom: 6px;">
                TERRA INCOGNITA
              </div>
              <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
                Территория без официальной привязки к государству.
                Данные по вспышкам не собираются.
              </div>
            </div>
          `)
          .setLngLat(e.lngLat)
          .addTo(map);
        return;
      }

      // Compute bbox of clicked region for fly-to
      const geom = f.geometry;
      if (geom) {
        let west = 180, south = 90, east = -180, north = -90;
        const collect = (coords: number[][]) => {
          for (const [lng, lat] of coords) {
            if (lng < west) west = lng;
            if (lat < south) south = lat;
            if (lng > east) east = lng;
            if (lat > north) north = lat;
          }
        };
        if (geom.type === "Polygon") {
          for (const ring of geom.coordinates as number[][][]) collect(ring);
        } else if (geom.type === "MultiPolygon") {
          for (const poly of geom.coordinates as number[][][]) for (const ring of poly) collect(ring);
        }
        // Only fly if bbox is valid (not whole country)
        if (west < east - 0.5 && south < north - 0.5) {
          map.fitBounds([[west, south], [east, north]], { padding: 60, duration: 800, maxZoom: 8 });
        }
      }
      onSelectRegion?.(name);
    };
    map.on("click", "choropleth-fill", onClick);
    map.on("click", "choropleth-line", onClick);
    map.on("click", "choropleth-fill-ti", onClick);
    map.on("click", "choropleth-line-ti", onClick);

    // Cursor pointer on hover
    const onEnter = () => (map.getCanvas().style.cursor = "pointer");
    const onLeave = () => (map.getCanvas().style.cursor = "");
    map.on("mouseenter", "choropleth-fill", onEnter);
    map.on("mouseleave", "choropleth-fill", onLeave);

    return () => {
      map.off("click", "choropleth-fill", onClick);
      map.off("click", "choropleth-line", onClick);
      map.off("click", "choropleth-fill-ti", onClick);
      map.off("click", "choropleth-line-ti", onClick);
      map.off("mouseenter", "choropleth-fill", onEnter);
      map.off("mouseleave", "choropleth-fill", onLeave);
    };
  }, [geo, outbreaks, showChoropleth, ready, resolvedTheme, onSelectRegion]);

  // ─── Municipalities layer (GADM level 2) — colored by danger level ───
  // Spatial join: для каждого муниципалитета считаем вспышки внутри его полигона.
  // Уровень опасности:
  //   - critical (5): есть активная вспышка (status=Ongoing)
  //   - high (4):    есть вспышка за последние 12 месяцев
  //   - medium (3):  есть вспышка за последние 36 месяцев
  //   - low (2):     есть вспышка (старая)
  //   - none (1):    нет вспышек (серый)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Cleanup old
    ["muni-fill", "muni-line", "muni-hover"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource("municipalities")) map.removeSource("municipalities");
    if (!municipalities || municipalities.features.length === 0) return;

    // ─── Spatial join через point-in-polygon ──────────────────────────
    // Для каждого муниципалитета проверяем, попадают ли вспышки в его полигон.
    const now = Date.now();
    const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

    // Сначала соберём bbox каждого муниципалитета для быстрого reject'а
    type MuniMeta = {
      polygons: number[][][]; // массив колец (внешнее + дыры)
      bbox: [number, number, number, number]; // west, south, east, north
      name: string;
      region: string;
      gid: string;
    };

    const metas: MuniMeta[] = [];
    for (const f of municipalities.features) {
      if (!f.geometry) continue;
      const props = f.properties as Record<string, unknown>;
      const name = (props.NAME_2 as string) || (props.NL_NAME_2 as string) || "?";
      const region = (props.NAME_1 as string) || (props.NL_NAME_1 as string) || "?";
      const gid = (props.GID_2 as string) || name;

      let polys: number[][][] = [];
      if (f.geometry.type === "Polygon") {
        polys = [f.geometry.coordinates as number[][][]];
      } else if (f.geometry.type === "MultiPolygon") {
        polys = f.geometry.coordinates as number[][][];
      }

      // Compute bbox
      let west = 180, south = 90, east = -180, north = -90;
      for (const ring of polys.flat()) {
        for (const [lng, lat] of ring) {
          if (lng < west) west = lng;
          if (lat < south) south = lat;
          if (lng > east) east = lng;
          if (lat > north) north = lat;
        }
      }
      metas.push({ polygons: polys, bbox: [west, south, east, north], name, region, gid });
    }

    // Point-in-polygon test (ray casting)
    const pointInRing = (lng: number, lat: number, ring: number[][]): boolean => {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersect =
          yi > lat !== yj > lat &&
          lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const pointInPolygon = (lng: number, lat: number, polys: number[][][]): boolean => {
      for (const poly of polys) {
        if (!pointInRing(lng, lat, poly[0])) continue;
        // Проверяем дыры (inner rings)
        let inHole = false;
        for (let k = 1; k < poly.length; k++) {
          if (pointInRing(lng, lat, poly[k])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
      return false;
    };

    // Считаем опасность каждого муниципалитета
    const dangerByGid = new Map<string, { level: number; count: number; ongoing: number }>();
    for (const m of metas) {
      dangerByGid.set(m.gid, { level: 1, count: 0, ongoing: 0 });
    }

    for (const o of outbreaks) {
      const lng = typeof o.lon === "number" ? o.lon : null;
      const lat = typeof o.lat === "number" ? o.lat : null;
      if (lng === null || lat === null) continue;

      const outbreakTime = new Date(o.date).getTime();
      const isOngoing = o.status === "Ongoing";
      const monthsAgo = (now - outbreakTime) / YEAR_MS;

      for (const m of metas) {
        // BBox reject
        if (lng < m.bbox[0] || lng > m.bbox[2] || lat < m.bbox[1] || lat > m.bbox[3]) continue;
        if (!pointInPolygon(lng, lat, m.polygons)) continue;

        const d = dangerByGid.get(m.gid)!;
        d.count += 1;
        if (isOngoing) {
          d.ongoing += 1;
          if (d.level < 5) d.level = 5;
        } else if (monthsAgo <= 1) {
          if (d.level < 4) d.level = 4;
        } else if (monthsAgo <= 3) {
          if (d.level < 3) d.level = 3;
        } else if (d.level < 2) {
          d.level = 2;
        }
        break; // вспышка попала в один муниципалитет — переходим к следующей
      }
    }

    // Обогащаем GeoJSON полями опасности
    const enriched: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: municipalities.features.map((f) => {
        const props = f.properties as Record<string, unknown>;
        const gid = (props.GID_2 as string) || (props.NAME_2 as string) || "?";
        const d = dangerByGid.get(gid) ?? { level: 1, count: 0, ongoing: 0 };
        return {
          ...f,
          properties: {
            ...props,
            danger_level: d.level,
            outbreak_count: d.count,
            ongoing_count: d.ongoing,
          },
        };
      }),
    };

    // Добавляем source
    map.addSource("municipalities", {
      type: "geojson",
      data: enriched,
      promoteId: "GID_2",
    });

    // Заливка муниципалитета — показывается ТОЛЬКО когда выбран (feature-state: selected)
    map.addLayer({
      id: "muni-fill",
      type: "fill",
      source: "municipalities",
      layout: {},
      paint: {
        "fill-color": [
          "case",
          ["==", ["get", "danger_level"], 5], "#dc2626", // critical — красный
          ["==", ["get", "danger_level"], 4], "#ea580c", // high — оранжевый
          ["==", ["get", "danger_level"], 3], "#ca8a04", // medium — жёлтый
          ["==", ["get", "danger_level"], 2], "#16a34a", // low — зелёный
          "#3b82f6", // none — синий (выбранный, но без вспышек)
        ],
        // Заливка видна только когда муниципалитет выбран (clicked)
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          [
            "case",
            ["==", ["get", "danger_level"], 5], 0.50,
            ["==", ["get", "danger_level"], 4], 0.45,
            ["==", ["get", "danger_level"], 3], 0.40,
            ["==", ["get", "danger_level"], 2], 0.30,
            0.20, // none — лёгкая синяя заливка
          ],
          0, // по умолчанию — без заливки
        ],
      },
    });

    // Границы муниципалитетов — цвет по уровню опасности (для всех!)
    // Выбранный муниципалитет — толстая граница, остальные — тонкая
    map.addLayer({
      id: "muni-line",
      type: "line",
      source: "municipalities",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": [
          "case",
          ["==", ["get", "danger_level"], 5], "#dc2626",
          ["==", ["get", "danger_level"], 4], "#ea580c",
          ["==", ["get", "danger_level"], 3], "#ca8a04",
          ["==", ["get", "danger_level"], 2], "#16a34a",
          resolvedTheme === "dark" ? "#4b5563" : "#9ca3af", // серый для безопасных
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false], 5,
          [">=", ["get", "danger_level"], 3], 2.5,
          0.7,
        ],
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false], 1.0,
          [">=", ["get", "danger_level"], 3], 0.95,
          0.5,
        ],
      },
    });

    // Hover highlight
    let hoveredGid: string | null = null;
    let selectedGid: string | null = null;
    map.addLayer({
      id: "muni-hover",
      type: "line",
      source: "municipalities",
      layout: {},
      paint: {
        "line-color": "#1d4ed8",
        "line-width": 3,
        "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0],
      },
    });

    const onMuniMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      const gid = (f.properties as { GID_2?: string }).GID_2;
      if (hoveredGid !== null) {
        map.setFeatureState({ source: "municipalities", id: hoveredGid }, { hover: false });
      }
      hoveredGid = gid ?? null;
      if (hoveredGid !== null) {
        map.setFeatureState({ source: "municipalities", id: hoveredGid }, { hover: true });
      }
      map.getCanvas().style.cursor = "pointer";
    };
    const onMuniMouseLeave = () => {
      if (hoveredGid !== null) {
        map.setFeatureState({ source: "municipalities", id: hoveredGid }, { hover: false });
      }
      hoveredGid = null;
      map.getCanvas().style.cursor = "";
    };
    const onMuniClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      const props = f.properties as Record<string, unknown>;
      const gid = (props.GID_2 as string) || (props.NAME_2 as string) || "";
      const name = (props.NL_NAME_2 as string) || (props.NAME_2 as string) || "";
      const region = (props.NL_NAME_1 as string) || (props.NAME_1 as string) || "";
      const level = props.danger_level as number;
      const count = props.outbreak_count as number;
      const ongoing = props.ongoing_count as number;

      // Снимаем выделение с предыдущего муниципалитета
      if (selectedGid !== null && selectedGid !== gid) {
        map.setFeatureState({ source: "municipalities", id: selectedGid }, { selected: false });
      }
      // Если клик на уже выбранном — снимаем выделение (toggle)
      if (selectedGid === gid) {
        map.setFeatureState({ source: "municipalities", id: gid }, { selected: false });
        selectedGid = null;
      } else {
        map.setFeatureState({ source: "municipalities", id: gid }, { selected: true });
        selectedGid = gid;
      }

      // Если муниципалитет снят — не показываем popup
      if (selectedGid === null) return;

      const levelLabel = level === 5 ? "Критический" : level === 4 ? "Высокий" : level === 3 ? "Средний" : level === 2 ? "Низкий" : "Нет вспышек";
      const levelColor = level === 5 ? "#dc2626" : level === 4 ? "#ea580c" : level === 3 ? "#ca8a04" : level === 2 ? "#16a34a" : "#3b82f6";

      new Popup({ closeButton: true, maxWidth: "300px", closeOnClick: false })
        .setHTML(`
          <div style="font-family: system-ui, sans-serif; padding: 4px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #111827;">${name}</div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">${region}</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; margin-bottom: 8px;">
              <span style="background: ${levelColor}; color: white; padding: 3px 8px; border-radius: 4px; font-weight: 500;">
                ${levelLabel}
              </span>
              ${count > 0 ? `<span style="background: #f3f4f6; padding: 3px 8px; border-radius: 4px;">Вспышек: ${count}</span>` : ""}
              ${ongoing > 0 ? `<span style="background: #fef2f2; color: #dc2626; padding: 3px 8px; border-radius: 4px;">Активных: ${ongoing}</span>` : ""}
            </div>
            ${count === 0 ? '<div style="font-size: 10px; color: #9ca3af; padding-top: 4px; border-top: 1px solid #f3f4f6;">Вспышек не зарегистрировано</div>' : ''}
          </div>
        `)
        .setLngLat(e.lngLat)
        .addTo(map);
    };
    map.on("mousemove", "muni-fill", onMuniMouseMove);
    map.on("mouseleave", "muni-fill", onMuniMouseLeave);
    map.on("click", "muni-fill", onMuniClick);

    return () => {
      map.off("mousemove", "muni-fill", onMuniMouseMove);
      map.off("mouseleave", "muni-fill", onMuniMouseLeave);
      map.off("click", "muni-fill", onMuniClick);
      ["muni-fill", "muni-line", "muni-hover"].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource("municipalities")) map.removeSource("municipalities");
    };
  }, [municipalities, outbreaks, ready, resolvedTheme]);

  // ─── Outbreak markers ──────────────────────────────────────────────
  // Use MapLibre circle layers for performance (HTML markers lag on mobile).
  // Only use HTML markers for desktop (hover-capable devices) where popups are better.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!geo) return;

    // Detect mobile (no hover, coarse pointer)
    const isMobile = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    // Remove old HTML markers if any
    Object.values(markersRef.current).forEach((m) => m.remove());
    Object.values(popupsRef.current).forEach((p) => p.remove());
    markersRef.current = {};
    popupsRef.current = {};

    // Remove old circle layers if switching from mobile to desktop or vice versa
    const layers = map.getStyle()?.layers ?? [];
    for (const l of layers) {
      if (l.id === "outbreaks-circle" || l.id === "outbreaks-circle-active" || l.id === "outbreaks-cluster" || l.id === "outbreaks-cluster-count") {
        map.removeLayer(l.id);
      }
    }
    if (map.getSource("outbreaks-points")) {
      map.removeSource("outbreaks-points");
    }

    if (outbreaks.length === 0) return;

    // Compute centroids
    const centroids = new Map<string, [number, number]>();
    for (const f of geo.features) {
      const name = (f.properties as { shapeName: string }).shapeName;
      if (!name) continue;
      const bbox = computeBBox(f.geometry);
      if (bbox) centroids.set(name, [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]);
    }

    // Build GeoJSON points for all outbreaks
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (const o of outbreaks) {
      let lngLat: [number, number] | null = null;
      if (typeof o.lon === "number" && typeof o.lat === "number"
          && Number.isFinite(o.lon) && Number.isFinite(o.lat)
          && !(o.lon === 0 && o.lat === 0)) {
        lngLat = [o.lon, o.lat];
      } else if (o.region_geo) {
        const c = centroids.get(o.region_geo);
        if (c && Number.isFinite(c[0]) && Number.isFinite(c[1]) && c[0] !== 0) {
          lngLat = c;
        }
      }
      if (!lngLat) continue;

      const color = diseaseColor(o.disease_key, o.disease_group);
      const isOngoing = o.status === "Ongoing";
      const size = 8 + Math.min(Math.sqrt(o.cases || 1) / 2, 18);

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: lngLat },
        properties: {
          id: o.id,
          disease: o.disease,
          disease_key: o.disease_key,
          region: o.region,
          date: o.date,
          status: o.status,
          cases: o.cases,
          deaths: o.deaths,
          species: o.species,
          color,
          isOngoing,
          size,
        },
      });
    }

    if (features.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };

    if (isMobile) {
      // ─── Mobile: use native MapLibre circle layers with clustering (fast!) ────────
      map.addSource("outbreaks-points", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 40,
      });

      // Cluster count labels (number inside cluster circle)
      map.addLayer({
        id: "outbreaks-cluster-count",
        type: "symbol",
        source: "outbreaks-points",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.3)",
          "text-halo-width": 1,
        },
      });

      // Cluster circles (background)
      map.addLayer({
        id: "outbreaks-cluster",
        type: "circle",
        source: "outbreaks-points",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 18, 50, 28, 200, 38],
          "circle-color": ["interpolate", ["linear"], ["get", "point_count"], 2, "#f59e0b", 50, "#ef4444", 200, "#b91c1c"],
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 1,
        },
      });

      // Resolved outbreaks (smaller, dimmer) — only unclustered
      map.addLayer({
        id: "outbreaks-circle",
        type: "circle",
        source: "outbreaks-points",
        filter: ["all", ["!", ["has", "point_count"]], ["!", ["get", "isOngoing"]]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "size"], 0, 4, 30, 12],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.7,
          "circle-stroke-width": 1,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": 0.9,
        },
      });

      // Ongoing outbreaks (bigger, brighter) — only unclustered
      map.addLayer({
        id: "outbreaks-circle-active",
        type: "circle",
        source: "outbreaks-points",
        filter: ["all", ["!", ["has", "point_count"]], ["get", "isOngoing"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "size"], 0, 6, 30, 16],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 1,
        },
      });

      // Click on cluster → zoom in
      const onClusterClick = (e: maplibregl.MapMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const clusterId = (f.properties as { cluster_id?: number }).cluster_id;
        if (clusterId === undefined) return;
        const source = map.getSource("outbreaks-points") as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
          map.flyTo({ center: f.geometry && 'coordinates' in f.geometry ? f.geometry.coordinates as [number, number] : e.lngLat, zoom: zoom + 0.5, duration: 400 });
        });
      };
      map.on("click", "outbreaks-cluster", onClusterClick);

      // Popup on tap for individual markers
      const popup = new Popup({ closeButton: true, maxWidth: "300px" });
      const onMobileClick = (e: maplibregl.MapMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        const html = buildPopupHTML({
          id: p.id as number,
          disease: p.disease as string,
          region: p.region as string,
          date: p.date as string,
          status: p.status as Outbreak["status"],
          cases: p.cases as number,
          deaths: p.deaths as number,
          species: p.species as string,
          disease_key: p.disease_key as Outbreak["disease_key"],
          disease_group: "Multi-species" as Outbreak["disease_group"],
          region_geo: "",
          source: "fsvps" as Outbreak["source"],
          notes: "",
        } as Outbreak);
        popup.setHTML(html).setLngLat(e.lngLat).addTo(map);
      };
      map.on("click", "outbreaks-circle", onMobileClick);
      map.on("click", "outbreaks-circle-active", onMobileClick);

      return () => {
        map.off("click", "outbreaks-cluster", onClusterClick);
        map.off("click", "outbreaks-circle", onMobileClick);
        map.off("click", "outbreaks-circle-active", onMobileClick);
        popup.remove();
      };
    }

    // ─── Desktop: use cluster + circle layers (better performance than HTML markers) ──────────────
    map.addSource("outbreaks-points", {
      type: "geojson",
      data: geojson,
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 45,
    });

    // Cluster count labels
    map.addLayer({
      id: "outbreaks-cluster-count",
      type: "symbol",
      source: "outbreaks-points",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Noto Sans Regular"],
        "text-size": 13,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0,0,0,0.4)",
        "text-halo-width": 1,
      },
    });

    // Cluster circles
    map.addLayer({
      id: "outbreaks-cluster",
      type: "circle",
      source: "outbreaks-points",
      filter: ["has", "point_count"],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 20, 50, 30, 200, 42],
        "circle-color": ["interpolate", ["linear"], ["get", "point_count"], 2, "#f59e0b", 50, "#ef4444", 200, "#b91c1c"],
        "circle-opacity": 0.85,
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 1,
      },
    });

    // Resolved outbreaks (smaller, dimmer) — only unclustered
    map.addLayer({
      id: "outbreaks-circle",
      type: "circle",
      source: "outbreaks-points",
      filter: ["all", ["!", ["has", "point_count"]], ["!", ["get", "isOngoing"]]],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "size"], 0, 5, 30, 14],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.75,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": ["get", "color"],
        "circle-stroke-opacity": 0.9,
      },
    });

    // Ongoing outbreaks (bigger, brighter, white halo) — only unclustered
    map.addLayer({
      id: "outbreaks-circle-active",
      type: "circle",
      source: "outbreaks-points",
      filter: ["all", ["!", ["has", "point_count"]], ["get", "isOngoing"]],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "size"], 0, 7, 30, 18],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.95,
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 1,
        "circle-blur": 0.1,
      },
    });

    // Hover cursor
    map.on("mouseenter", "outbreaks-cluster", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "outbreaks-cluster", () => (map.getCanvas().style.cursor = ""));
    map.on("mouseenter", "outbreaks-circle", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "outbreaks-circle", () => (map.getCanvas().style.cursor = ""));
    map.on("mouseenter", "outbreaks-circle-active", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "outbreaks-circle-active", () => (map.getCanvas().style.cursor = ""));

    // Click on cluster → zoom in
    const onClusterClick = (e: maplibregl.MapMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const clusterId = (f.properties as { cluster_id?: number }).cluster_id;
      if (clusterId === undefined) return;
      const source = map.getSource("outbreaks-points") as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId).then((zoom: number) => {
        map.flyTo({ center: f.geometry && 'coordinates' in f.geometry ? f.geometry.coordinates as [number, number] : e.lngLat, zoom: zoom + 0.5, duration: 400 });
      });
    };
    map.on("click", "outbreaks-cluster", onClusterClick);

    // Hover popup for individual markers
    const popup = new Popup({ closeButton: true, maxWidth: "320px", offset: 14 });
    const onMouseEnterCircle = (e: maplibregl.MapMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      const html = buildPopupHTML({
        id: p.id as number,
        disease: p.disease as string,
        region: p.region as string,
        date: p.date as string,
        status: p.status as Outbreak["status"],
        cases: p.cases as number,
        deaths: p.deaths as number,
        species: p.species as string,
        disease_key: p.disease_key as Outbreak["disease_key"],
        disease_group: "Multi-species" as Outbreak["disease_group"],
        region_geo: "",
        source: "fsvps" as Outbreak["source"],
        notes: "",
      } as Outbreak);
      popup.setHTML(html).setLngLat(e.lngLat).addTo(map);
    };
    const onClickCircle = (e: maplibregl.MapMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      const o = outbreaks.find((x) => x.id === p.id);
      if (o) onSelectOutbreak?.(o);
    };
    map.on("click", "outbreaks-circle", onClickCircle);
    map.on("click", "outbreaks-circle-active", onClickCircle);
    map.on("mouseenter", "outbreaks-circle", onMouseEnterCircle);
    map.on("mouseenter", "outbreaks-circle-active", onMouseEnterCircle);
    map.on("mouseleave", "outbreaks-circle", () => popup.remove());
    map.on("mouseleave", "outbreaks-circle-active", () => popup.remove());

    return () => {
      map.off("click", "outbreaks-cluster", onClusterClick);
      map.off("click", "outbreaks-circle", onClickCircle);
      map.off("click", "outbreaks-circle-active", onClickCircle);
      map.off("mouseenter", "outbreaks-circle", onMouseEnterCircle);
      map.off("mouseenter", "outbreaks-circle-active", onMouseEnterCircle);
      map.off("mouseleave", "outbreaks-circle", () => popup.remove());
      map.off("mouseleave", "outbreaks-circle-active", () => popup.remove());
      popup.remove();
    };
  }, [outbreaks, geo, ready, onSelectOutbreak]);

  // ─── Risk zones (3/10/30 km DASHED circles around ongoing outbreaks) ───
  // Зоны риски по WOAH Terrestrial Code:
  //   - protection (3 км): полный запрет перемещения всех восприимчивых животных
  //   - surveillance (10 км): перемещение только с ветсертификатом
  //   - restriction (30 км): ограничение, мониторинг
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Remove existing risk zone layers (fill + line + labels)
    const layers = map.getStyle()?.layers ?? [];
    for (const l of layers) {
      if (l.id.startsWith("risk-zone-")) {
        map.removeLayer(l.id);
      }
    }
    if (map.getSource("risk-zones")) {
      map.removeSource("risk-zones");
    }
    if (map.getSource("risk-zone-labels")) {
      map.removeSource("risk-zone-labels");
    }

    if (!showRiskZones) return;

    // Build circles for ongoing outbreaks
    const ongoing = outbreaks.filter((o) => o.status === "Ongoing");
    if (ongoing.length === 0) return;

    // Zone definitions with WOAH-compliant restrictions (RU labels)
    const ZONE_DEFS = [
      {
        label: "protection",
        defaultRadius: 3,
        color: "#dc2626",      // красный
        dashArray: [2, 1],     // мелкий пунктир
        width: 2.5,
        radiusLabel: "3 км",
        title: "Зона защиты",
        restriction: "Полный запрет перемещения животных",
      },
      {
        label: "surveillance",
        defaultRadius: 10,
        color: "#f59e0b",      // оранжевый
        dashArray: [6, 3],     // средний пунктир
        width: 2,
        radiusLabel: "10 км",
        title: "Зона наблюдения",
        restriction: "Перемещение только с ветсертификатом",
      },
      {
        label: "restriction",
        defaultRadius: 30,
        color: "#3b82f6",      // синий
        dashArray: [12, 4],    // крупный пунктир
        width: 1.5,
        radiusLabel: "30 км",
        title: "Зона ограничения",
        restriction: "Ограничение + мониторинг",
      },
    ];

    const features: GeoJSON.Feature[] = [];
    const labelFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];

    for (const o of ongoing) {
      const center = getOutbreakCenter(o, geo);
      if (!center) continue;
      const profile = DISEASE_PROFILES_BY_KEY[o.disease_key];

      for (const def of ZONE_DEFS) {
        const radius = profile
          ? (def.label === "protection" ? profile.protection_zone_km
            : def.label === "surveillance" ? profile.surveillance_zone_km
            : profile.restriction_zone_km)
          : def.defaultRadius;

        features.push({
          type: "Feature",
          properties: {
            outbreak_id: o.id,
            label: def.label,
            color: def.color,
            dashArray: def.dashArray.join(","),
            width: def.width,
            radius_km: radius,
            radius_label: `${radius} км`,
            zone_title: def.title,
            restriction: def.restriction,
            disease: o.disease,
            date: o.date,
          },
          geometry: {
            type: "Polygon",
            coordinates: [makeCircle(center, radius)],
          },
        });

        // Label position — справа от центра зоны (на границе круга)
        const angle = Math.PI / 4; // 45° — справа-сверху
        const latOffset = (radius / 111) * Math.sin(angle);
        const lngOffset = (radius / (111 * Math.cos((center[1] * Math.PI) / 180))) * Math.cos(angle);
        labelFeatures.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [center[0] + lngOffset, center[1] + latOffset],
          },
          properties: {
            label: `${radius} км`,
            zone_title: def.title,
            color: def.color,
          },
        });
      }
    }

    map.addSource("risk-zones", { type: "geojson", data: { type: "FeatureCollection", features } });
    map.addSource("risk-zone-labels", { type: "geojson", data: { type: "FeatureCollection", features: labelFeatures } });

    // Three LINE layers with different dash patterns (dashed borders, no fill)
    // Order: restriction (biggest, drawn first) → surveillance → protection (top)
    const layerOrder = ["restriction", "surveillance", "protection"];
    for (const def of ZONE_DEFS) {
      map.addLayer({
        id: `risk-zone-${def.label}`,
        type: "line",
        source: "risk-zones",
        filter: ["==", ["get", "label"], def.label],
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["get", "width"],
          "line-dasharray": def.dashArray,
          "line-opacity": 0.95,
        },
      });

      // Click handler → popup with restriction info
      const onZoneClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        const disease = p.disease as string;
        const date = p.date as string;
        const radiusLabel = p.radius_label as string;
        const zoneTitle = p.zone_title as string;
        const restriction = p.restriction as string;
        const color = p.color as string;

        new Popup({ closeButton: true, maxWidth: "280px", offset: 8 })
          .setHTML(`
            <div style="font-family: system-ui, sans-serif; padding: 4px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="width: 12px; height: 0; border-top: 3px dashed ${color}; flex-shrink: 0;"></span>
                <strong style="font-size: 13px; color: ${color};">${zoneTitle}</strong>
                <span style="background: ${color}; color: white; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">${radiusLabel}</span>
              </div>
              <div style="font-size: 11px; color: #374151; margin-bottom: 6px;">
                <strong>${disease}</strong> · ${new Date(date).toLocaleDateString("ru-RU")}
              </div>
              <div style="background: #fef3c7; border-left: 3px solid ${color}; padding: 6px 8px; font-size: 11px; border-radius: 0 4px 4px 0;">
                <div style="font-weight: 600; margin-bottom: 2px; color: #92400e;">⚠ Запрет:</div>
                <div style="color: #374151;">${restriction}</div>
              </div>
              <div style="font-size: 9px; color: #9ca3af; margin-top: 6px; padding-top: 4px; border-top: 1px solid #f3f4f6;">
                Согласно WOAH Terrestrial Code
              </div>
            </div>
          `)
          .setLngLat(e.lngLat)
          .addTo(map);
      };
      map.on("click", `risk-zone-${def.label}`, onZoneClick);

      // Cursor pointer on hover
      map.on("mouseenter", `risk-zone-${def.label}`, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", `risk-zone-${def.label}`, () => (map.getCanvas().style.cursor = ""));
    }

    // Symbol layer — подписи радиусов (3 км / 10 км / 30 км)
    map.addLayer({
      id: "risk-zone-labels",
      type: "symbol",
      source: "risk-zone-labels",
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-offset": [0, 0],
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  }, [outbreaks, geo, showRiskZones, ready]);

  // ─── Enterprises layer (farms, plants) ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Cleanup
    if (map.getLayer("enterprises-symbol")) map.removeLayer("enterprises-symbol");
    if (map.getLayer("enterprises-circle")) map.removeLayer("enterprises-circle");
    if (map.getSource("enterprises")) map.removeSource("enterprises");

    if (!showEnterprises || enterprises.length === 0) return;

    const TYPE_COLORS: Record<string, string> = {
      pig_farm: "#7B1FA2",
      poultry_farm: "#E65100",
      dairy_farm: "#1565C0",
      meat_plant: "#3E2723",
      farm: "#558B2F",
      dairy: "#1565C0",
      meat_plant_old: "#3E2723",
      market: "#757575",
    };

    const TYPE_ICONS: Record<string, string> = {
      pig_farm: "🐷",
      poultry_farm: "🐔",
      dairy_farm: "🐄",
      meat_plant: "🏭",
      farm: "🌾",
      dairy: "🐄",
      market: "🏪",
    };

    const features: GeoJSON.Feature<GeoJSON.Point>[] = enterprises.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [e.lon, e.lat] },
      properties: {
        id: e.id,
        name: e.name,
        type: e.type,
        region: e.region || "",
        capacity: e.capacity || 0,
        capacity_unit: e.capacity_unit || "",
        color: TYPE_COLORS[e.type] || "#757575",
        icon: TYPE_ICONS[e.type] || "🏭",
      },
    }));

    map.addSource("enterprises", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    // Circle markers for enterprises
    map.addLayer({
      id: "enterprises-circle",
      type: "circle",
      source: "enterprises",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 6, 12, 10],
        "circle-color": ["get", "color"],
        "circle-opacity": 0.8,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 1,
      },
    });

    // Symbol labels (emoji icon)
    map.addLayer({
      id: "enterprises-symbol",
      type: "symbol",
      source: "enterprises",
      layout: {
        "text-field": ["get", "icon"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 3, 8, 8, 14, 12, 18],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#ffffff",
      },
    });

    // Hover popup
    const popup = new Popup({ closeButton: true, maxWidth: "280px", offset: 12 });
    const onEnter = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      map.getCanvas().style.cursor = "pointer";
      const capacity = p.capacity as number;
      const unit = p.capacity_unit as string;
      popup.setHTML(`
        <div style="font-family: system-ui, sans-serif; padding: 4px;">
          <div style="font-weight: 600; font-size: 12px; color: ${p.color}; margin-bottom: 2px;">
            ${p.icon} ${p.name}
          </div>
          <div style="font-size: 10px; color: #6b7280; margin-bottom: 4px;">
            ${p.region}
          </div>
          ${capacity > 0 ? `<div style="font-size: 11px; color: #374151;">Мощность: <strong>${capacity.toLocaleString("ru-RU")} ${unit}</strong></div>` : ""}
        </div>
      `).setLngLat(e.lngLat).addTo(map);
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };
    map.on("mouseenter", "enterprises-circle", onEnter);
    map.on("mouseleave", "enterprises-circle", onLeave);

    return () => {
      map.off("mouseenter", "enterprises-circle", onEnter);
      map.off("mouseleave", "enterprises-circle", onLeave);
      popup.remove();
      if (map.getLayer("enterprises-symbol")) map.removeLayer("enterprises-symbol");
      if (map.getLayer("enterprises-circle")) map.removeLayer("enterprises-circle");
      if (map.getSource("enterprises")) map.removeSource("enterprises");
    };
  }, [enterprises, showEnterprises, ready]);

  // ─── Livestock density layer ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !geo) return;

    // Remove old density layer
    if (map.getLayer("density-fill")) map.removeLayer("density-fill");
    if (map.getSource("density-data")) map.removeSource("density-data");

    if (densityLayer === "none" || !showChoropleth) return;

    // Build GeoJSON with density values
    const densityField = densityLayer === "pigs" ? "pigs_per_km2" : densityLayer === "cattle" ? "cattle_per_km2" : "poultry_per_km2";
    const maxDensity = Math.max(...Object.values(REGION_PROPERTIES).map(p => p[densityField] as number), 1);

    const features = geo.features.map((f) => {
      const name = (f.properties as { shapeName?: string }).shapeName;
      const props = name ? REGION_PROPERTIES[name] : undefined;
      const density = props ? (props[densityField] as number) : 0;
      return {
        ...f,
        properties: {
          ...f.properties,
          density,
          densityPercent: (density / maxDensity) * 100,
        },
      };
    });

    map.addSource("density-data", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    const colors = densityLayer === "pigs"
      ? ["#fff5f0", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#a50f15"]
      : densityLayer === "cattle"
        ? ["#f7fcf5", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45"]
        : ["#fffbeb", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02"];

    map.addLayer({
      id: "density-fill",
      type: "fill",
      source: "density-data",
      layout: {},
      paint: {
        "fill-color": {
          property: "densityPercent",
          type: "interval",
          stops: [
            [0, colors[0]],
            [5, colors[1]],
            [15, colors[2]],
            [30, colors[3]],
            [50, colors[4]],
            [75, colors[5]],
          ],
          default: colors[0],
        },
        "fill-opacity": 0.6,
      },
    }, "choropleth-line" in map.getStyle()?.layers?.map(l => l.id) ?? [] ? "choropleth-line" : undefined);
  }, [densityLayer, showChoropleth, geo, ready]);

  // ─── Outbreak heatmap layer ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !geo) return;

    // Remove existing heatmap
    if (map.getLayer("outbreak-heat")) map.removeLayer("outbreak-heat");
    if (map.getSource("outbreak-heat-data")) map.removeSource("outbreak-heat-data");

    if (!showHeatmap) return;

    // Build point GeoJSON from outbreaks
    const centroids = new Map<string, [number, number]>();
    for (const f of geo.features) {
      const name = (f.properties as { shapeName?: string }).shapeName;
      if (!name) continue;
      const bbox = computeBBox(f.geometry);
      if (bbox) centroids.set(name, [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]);
    }

    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (const o of outbreaks) {
      let lngLat: [number, number] | null = null;
      if (typeof o.lon === "number" && typeof o.lat === "number"
          && Number.isFinite(o.lon) && Number.isFinite(o.lat)
          && !(o.lon === 0 && o.lat === 0)) {
        lngLat = [o.lon, o.lat];
      } else if (o.region_geo) {
        const c = centroids.get(o.region_geo);
        if (c && c[0] !== 0) lngLat = c;
      }
      if (!lngLat) continue;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: lngLat },
        properties: {
          weight: Math.max(0.1, Math.min(1, (o.cases || 1) / 100)),
          active: o.status === "Ongoing" ? 1 : 0.3,
        },
      });
    }

    if (features.length === 0) return;

    map.addSource("outbreak-heat-data", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    map.addLayer({
      id: "outbreak-heat",
      type: "heatmap",
      source: "outbreak-heat-data",
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 3],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.2, "rgba(33,102,172,0.4)",
          0.4, "rgba(103,169,207,0.6)",
          0.6, "rgba(209,229,240,0.7)",
          0.8, "rgba(253,219,199,0.8)",
          1, "rgba(239,138,98,0.9)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 6, 60],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 9, 0],
      },
    });
  }, [showHeatmap, outbreaks, geo, ready]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-muted-foreground">Загрузка карты…</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function buildPopupHTML(o: Outbreak): string {
  const color = diseaseColor(o.disease_key, o.disease_group);
  const statusBadge =
    o.status === "Ongoing"
      ? '<span style="background:#D32F2F;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">АКТИВНО</span>'
      : o.status === "Resolved"
        ? '<span style="background:#2E7D32;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">ЗАВЕРШЕНО</span>'
        : '<span style="background:#757575;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">НЕИЗВЕСТНО</span>';

  return `
    <div style="font-family: inherit; padding: 4px 0;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>
        <strong style="font-size:14px;">${escapeHTML(o.disease)}</strong>
      </div>
      <div style="margin-bottom:8px;">${statusBadge}</div>
      <table style="font-size:12px;width:100%;border-spacing:0;">
        <tr><td style="color:#888;padding:2px 8px 2px 0;">Регион:</td><td style="font-weight:500;">${escapeHTML(o.region === 'Russia' || o.region === 'Russian Federation' ? 'Россия (без региона)' : o.region)}</td></tr>
        <tr><td style="color:#888;padding:2px 8px 2px 0;">Дата:</td><td>${formatDate(o.date)}</td></tr>
        <tr><td style="color:#888;padding:2px 8px 2px 0;">Вид:</td><td>${escapeHTML(speciesRu(o.species))}</td></tr>
        <tr><td style="color:#888;padding:2px 8px 2px 0;">Случаи:</td><td><strong>${o.cases.toLocaleString("ru-RU")}</strong></td></tr>
        <tr><td style="color:#888;padding:2px 8px 2px 0;">Пало:</td><td><strong style="color:#D32F2F;">${o.deaths.toLocaleString("ru-RU")}</strong></td></tr>
        <tr><td style="color:#888;padding:2px 8px 2px 0;">Источник:</td><td style="font-size:11px;">${sourceRu(o.source)}</td></tr>
      </table>
    </div>
  `;
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

/** Compute bounding box of a geometry — used as rough centroid source. */
function computeBBox(geom: GeoJSON.Geometry): [number, number, number, number] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (coords: unknown) => {
    if (typeof (coords as number[])[0] === "number") {
      const [x, y] = coords as number[];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    } else if (Array.isArray(coords)) {
      for (const c of coords) visit(c);
    }
  };
  visit((geom as { coordinates: unknown }).coordinates);
  if (minX === Infinity) return null;
  return [minX, minY, maxX, maxY];
}

function getOutbreakCenter(o: Outbreak, geo: GeoJSON.FeatureCollection | null): [number, number] | null {
  if (typeof o.lon === "number" && typeof o.lat === "number"
      && Number.isFinite(o.lon) && Number.isFinite(o.lat)
      && !(o.lon === 0 && o.lat === 0)) {
    return [o.lon, o.lat];
  }
  if (geo && o.region_geo) {
    for (const f of geo.features) {
      if ((f.properties as { shapeName?: string }).shapeName === o.region_geo) {
        const bbox = computeBBox(f.geometry);
        if (bbox) {
          const cx = (bbox[0] + bbox[2]) / 2;
          const cy = (bbox[1] + bbox[3]) / 2;
          // For Russia, cx=0 always means anti-meridian wraparound bug
          // (Chukotka spans -180..+180, midpoint = 0 = Atlantic Ocean).
          // Filter these out — outbreak won't render, but won't appear in
          // the wrong place either.
          if (Number.isFinite(cx) && Number.isFinite(cy) && cx !== 0) {
            return [cx, cy];
          }
        }
      }
    }
  }
  return null;
}

/** Build a circle polygon (lat/lng, rough — uses spherical-to-planar approximation). */
function makeCircle(center: [number, number], radiusKm: number, segments = 64): [number, number][] {
  const [lng, lat] = center;
  const latRad = (lat * Math.PI) / 180;
  const radiusDeg = radiusKm / 111; // 1 deg ≈ 111km (rough, ignores lat)
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const dLng = (radiusDeg * Math.cos(angle)) / Math.cos(latRad || 0.0001);
    const dLat = radiusDeg * Math.sin(angle);
    points.push([lng + dLng, lat + dLat]);
  }
  return points;
}
