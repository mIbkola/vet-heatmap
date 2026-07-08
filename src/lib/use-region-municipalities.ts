"use client";

import { useEffect, useState, useCallback } from "react";
import * as topojsonClient from "topojson-client";

const basePath = process.env.NODE_ENV === "production" ? "/vet-heatmap" : "";

export interface RegionMunicipalitiesState {
  geo: GeoJSON.FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

/**
 * Загружает муниципалитеты ТОЛЬКО для выбранного региона.
 *
 * Файлы лежат в /data/muni/<region-slug>.topojson (3-200 KB каждый).
 * Конвертация TopoJSON → GeoJSON на клиенте через topojson-client.
 *
 * В отличие от useMunicipalities() (который грузит все 3 MB),
 * этот хук грузит только нужный регион — быстро.
 */
export function useRegionMunicipalities(regionName: string | null): RegionMunicipalitiesState {
  const [state, setState] = useState<RegionMunicipalitiesState>({
    geo: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!regionName) {
      setState({ geo: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ geo: null, loading: true, error: null });

    (async () => {
      try {
        // Slugify: "Rostov" → "rostov", "Khanty-Mansiy" → "khanty-mansiy"
        const slug = regionName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const url = `${basePath}/data/muni/${slug}.topojson`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${slug}`);
        }
        const topo = await res.json();

        // Конвертируем TopoJSON → GeoJSON FeatureCollection
        // topo.objects.muni — это TopoJSON GeometryCollection
        const fc = topojsonClient.feature(
          topo,
          topo.objects.muni
        ) as unknown as GeoJSON.FeatureCollection;

        if (!cancelled) {
          setState({ geo: fc, loading: false, error: null });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            geo: null,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [regionName]);

  return state;
}
