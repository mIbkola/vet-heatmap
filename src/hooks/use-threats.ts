'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadThreats, type ThreatZone, type ThreatLevel, type OutbreakStatus } from '@/lib/threat-data';

export interface UseThreatsResult {
  threats: ThreatZone[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Хук для асинхронной загрузки угроз из /data/threats.json.
 *
 * Данные кешируются на уровне модуля (loadThreats) — повторные монтирования
 * компонента не вызовут повторный fetch.
 *
 * @returns { threats, loading, error, refetch }
 */
export function useThreats(): UseThreatsResult {
  const [threats, setThreats] = useState<ThreatZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadThreats()
      .then((data) => {
        if (!cancelled) {
          setThreats(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refetch = useMemo(() => () => setReloadKey((k) => k + 1), []);

  return { threats, loading, error, refetch };
}

export type { ThreatZone, ThreatLevel, OutbreakStatus };
