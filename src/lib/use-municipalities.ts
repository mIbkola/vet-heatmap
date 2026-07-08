"use client";

import { useEffect, useState } from "react";

const basePath = process.env.NODE_ENV === "production" ? "/vet-heatmap" : "";

export interface MunicipalitiesState {
  geo: GeoJSON.FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

/**
 * Загружает GeoJSON с муниципальными границами РФ (2445 районов из GADM).
 * Не хардкод — открытые данные geodata.ucdavis.edu (GADM v4.1).
 */
export function useMunicipalities(): MunicipalitiesState {
  const [state, setState] = useState<MunicipalitiesState>({
    geo: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${basePath}/data/russia_municipalities.geojson`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const geo: GeoJSON.FeatureCollection = await res.json();
        if (!cancelled) setState({ geo, loading: false, error: null });
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
  }, []);

  return state;
}
