'use client';

import { useEffect, useRef, useState } from 'react';
// Динамический импорт leaflet — загружается только на клиенте
let L: typeof import('leaflet');
const loadLeaflet = async () => {
  if (!L) {
    const mod = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    L = mod;
  }
  return L;
};
import { threatLevelConfig, getEffectiveThreatLevel, getOutbreakStatus, outbreakStatusConfig, type ThreatZone } from '@/lib/threat-data';
import { type DateRange } from '@/components/date-range-filter';

interface ThreatMapProps {
  selectedThreat: ThreatZone | null;
  onSelectThreat: (threat: ThreatZone) => void;
  filterLevel: string;
  filterDisease: string;
  filterReal?: 'all' | 'real' | 'reference';
  filterDateRange?: DateRange;
  threats: ThreatZone[];
}

interface RegionProperties {
  iso: string;
  name_ru: string;
  is_active: boolean;
}

/**
 * Generate an organic blob-like polygon around a center point.
 * Uses layered noise to create irregular, natural-looking zones.
 * The shape is deterministic based on the threat id (seeded random).
 */
function generateBlobPolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  seed: string,
  points: number = 24
): [number, number][] {
  // Simple seeded random number generator
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const seededRandom = () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash % 10000) / 10000;
  };

  // Pre-generate random offsets so they stay consistent
  const offsets: number[] = [];
  for (let i = 0; i < points; i++) {
    offsets.push(0.6 + seededRandom() * 0.8); // 0.6 to 1.4
  }

  // Smooth offsets twice (moving average) for organic feel
  const smooth = (arr: number[], w: number) => {
    return arr.map((_, i) => {
      let sum = 0;
      let count = 0;
      for (let j = -w; j <= w; j++) {
        const idx = (i + j + arr.length) % arr.length;
        sum += arr[idx];
        count++;
      }
      return sum / count;
    });
  };

  const smoothed = smooth(smooth(offsets, 2), 2);

  // Approx km to degrees
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((centerLat * Math.PI) / 180);

  const coords: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (2 * Math.PI * i) / points;
    const r = radiusKm * smoothed[i];

    const lat = centerLat + (r * Math.cos(angle)) / kmPerDegLat;
    const lng = centerLng + (r * Math.sin(angle)) / kmPerDegLng;
    coords.push([lat, lng]);
  }

  return coords;
}

/**
 * Build a pulsing Leaflet divIcon for real outbreak centers.
 * Uses the threat level color so the pulse matches the zone color.
 */
function buildRealOutbreakMarkerIcon(color: string): any {
  const L = (window as any).__leaflet__;
  return L.divIcon({
    className: 'epizomonitor-real-outbreak-icon',
    html: `
      <div class="epizomonitor-real-marker" style="color:${color};">
        <div class="epizomonitor-real-marker-ring" style="background:${color};"></div>
        <div class="epizomonitor-real-marker-ring epizomonitor-real-marker-pulse" style="background:${color};"></div>
        <div class="epizomonitor-real-marker-core" style="background:${color}; box-shadow: 0 0 0 3px #fff, 0 0 0 5px ${color};"></div>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function ThreatMap({ selectedThreat, onSelectThreat, filterLevel, filterDisease, filterReal = 'all', filterDateRange = { start: null, end: null }, threats }: ThreatMapProps) {
  const mapRef = useRef<any>(null);
  const zonesRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const regionsLayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [geojsonLoaded, setGeojsonLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      (window as any).__leaflet__ = L;
      const map = L.map(containerRef.current, {
      center: [46.50, 38.50],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 3,
      maxZoom: 14,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 14,
    }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Load GeoJSON regions
  useEffect(() => {
    if (!mapReady || !mapRef.current || geojsonLoaded) return;
    const map = mapRef.current;
    const L = (window as any).__leaflet__;

    fetch('/russia_regions.geojson')
      .then(res => res.json())
      .then(data => {
        if (regionsLayerRef.current) {
          map.removeLayer(regionsLayerRef.current);
        }

        const L = (window as any).__leaflet__;
        const regionsLayer = L.geoJSON(data, {
          style: (feature) => {
            const isActive = feature?.properties?.is_active === true;
            if (isActive) {
              return {
                fillColor: '#3b82f6',
                fillOpacity: 0.08,
                color: '#3b82f6',
                weight: 2,
                opacity: 0.6,
                dashArray: undefined,
              };
            } else {
              return {
                fillColor: '#1e293b',
                fillOpacity: 0.55,
                color: '#334155',
                weight: 1,
                opacity: 0.4,
                dashArray: '4, 4',
              };
            }
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties as RegionProperties;
            if (!props) return;

            const isActive = props.is_active;
            const name = props.name_ru || 'Неизвестный регион';

            if (isActive) {
              layer.bindTooltip(
                `<div style="font-size:13px; line-height:1.4;">
                  <strong style="color:#3b82f6;">${name}</strong><br/>
                  <span style="color:#16a34a;">● Активный регион</span>
                </div>`,
                { sticky: true, direction: 'top', offset: [0, -10] }
              );
            } else {
              layer.bindTooltip(
                `<div style="font-size:12px; line-height:1.4; opacity:0.7;">
                  ${name}<br/>
                  <span style="color:#94a3b8;">Регион пока не подключён</span>
                </div>`,
                { sticky: true, direction: 'top', offset: [0, -10] }
              );
            }

            if (isActive) {
              layer.on('mouseover', () => {
                (layer as any).setStyle({
                  fillOpacity: 0.18,
                  weight: 3,
                  color: '#2563eb',
                  opacity: 0.8,
                });
              });
              layer.on('mouseout', () => {
                (layer as any).setStyle({
                  fillOpacity: 0.08,
                  weight: 2,
                  color: '#3b82f6',
                  opacity: 0.6,
                });
              });
            }
          },
        });

        regionsLayer.addTo(map);
        regionsLayerRef.current = regionsLayer;
        setGeojsonLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load regions GeoJSON:', err);
      });
  }, [mapReady, geojsonLoaded]);

  // Render threat zones as organic blobs
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear existing zones and markers
    zonesRef.current.forEach(zone => zone.remove());
    markersRef.current.forEach(m => m.remove());
    zonesRef.current = [];
    markersRef.current = [];
    // Filter threats
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
      if (rangeStart || rangeEnd) {
        const threatDate = parseDate(t.lastUpdate);
        if (!threatDate) return false;
        if (rangeStart && threatDate < rangeStart) return false;
        if (rangeEnd && threatDate > rangeEnd) return false;
      }
      return true;
    });

    filtered.forEach(threat => {
      const L = (window as any).__leaflet__;
      // Эффективный уровень рассчитывается автоматически из статуса вспышки
      const effectiveLevel = getEffectiveThreatLevel(threat);
      const config = threatLevelConfig[effectiveLevel];
      const isSelected = selectedThreat?.id === threat.id;
      const isReal = threat.isRealData === true;
      const status = isReal ? getOutbreakStatus(threat) : null;
      const statusCfg = status ? outbreakStatusConfig[status] : null;

      // Generate organic blob shape
      const blobCoords = generateBlobPolygon(
        threat.lat,
        threat.lng,
        threat.radius,
        threat.id,
        28 // more points = smoother blob
      );

      // Real outbreaks: solid fill + pulsing border + thicker outline
      // Reference data: dashed border + lower opacity (existing behaviour)
      const polygon = L.polygon(blobCoords, {
        color: isSelected ? '#1e293b' : config.mapColor,
        weight: isSelected ? 4 : (isReal ? 3 : 2),
        fillColor: config.mapColor,
        fillOpacity: isSelected
          ? 0.45
          : (isReal ? 0.38 : 0.22),
        dashArray: (isSelected || isReal) ? undefined : '8, 6',
        smoothFactor: 1.5,
        lineJoin: 'round',
        className: isReal
          ? 'epizomonitor-real-zone'
          : 'epizomonitor-reference-zone',
      }).addTo(map);

      // Tooltip — show real outbreak badge + status for real data
      const realBadge = isReal && statusCfg
        ? `<div style="margin-top:4px;"><span style="display:inline-block; padding:2px 6px; border-radius:4px; background:${statusCfg.dotColor}; color:#fff; font-size:10px; font-weight:700; letter-spacing:0.3px;">${statusCfg.pulse ? '⚡ ' : ''}${statusCfg.label.toUpperCase()}</span></div>`
        : `<div style="margin-top:4px;"><span style="display:inline-block; padding:2px 6px; border-radius:4px; background:#94a3b8; color:#fff; font-size:10px; font-weight:600;">Справочно</span></div>`;

      polygon.bindTooltip(
        `<div style="font-size:13px; line-height:1.4;">
          <strong>${threat.disease}</strong><br/>
          ${threat.region}<br/>
          ${threat.district}<br/>
          <span style="color:${config.mapColor}; font-weight:600;">Уровень: ${config.label}</span>
          ${realBadge}
        </div>`,
        { sticky: true, direction: 'top', offset: [0, -10] }
      );

      // Click handler
      polygon.on('click', () => {
        onSelectThreat(threat);
      });

      zonesRef.current.push(polygon);

      // For real outbreaks — add a marker at the exact center (pulsing if active)
      if (isReal) {
        const markerColor = statusCfg ? statusCfg.dotColor : config.mapColor;
        const marker = L.marker([threat.lat, threat.lng], {
          icon: buildRealOutbreakMarkerIcon(markerColor),
          interactive: true,
          zIndexOffset: 1000,
        }).addTo(map);

        const statusLine = statusCfg
          ? `<span style="font-size:11px; color:${statusCfg.dotColor}; font-weight:600;">${statusCfg.pulse ? '⚡ ' : ''}${statusCfg.label}</span><br/>`
          : '';
        marker.bindTooltip(
          `<div style="font-size:13px; line-height:1.4;">
            <strong>${threat.disease}</strong><br/>
            ${threat.district}<br/>
            <span style="color:${config.mapColor}; font-weight:600;">${config.label}</span><br/>
            ${statusLine}
            <span style="font-size:11px; color:#475569;">Обновлено: ${threat.lastUpdate}</span>
          </div>`,
          { direction: 'top', offset: [0, -8] }
        );

        marker.on('click', () => {
          onSelectThreat(threat);
        });

        markersRef.current.push(marker);
      }
    });

    // Ensure zones are above the regions layer
    if (regionsLayerRef.current) {
      regionsLayerRef.current.bringToBack();
    }

  }, [selectedThreat, onSelectThreat, filterLevel, filterDisease, filterReal, filterDateRange, threats, mapReady]);

  // Fly to selected threat
  useEffect(() => {
    if (selectedThreat && mapRef.current) {
      mapRef.current.flyTo([selectedThreat.lat, selectedThreat.lng], 9, {
        duration: 1,
      });
    }
  }, [selectedThreat]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden border border-border"
      style={{ minHeight: '500px' }}
    />
  );
}
