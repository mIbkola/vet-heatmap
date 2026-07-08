'use client';

import { useState, useEffect } from 'react';
import { type ThreatZone } from '@/lib/threat-data';

let globalCache: ThreatZone[] | null = null;
let globalPromise: Promise<ThreatZone[]> | null = null;

async function fetchThreats(): Promise<ThreatZone[]> {
  if (globalCache) return globalCache;

  if (globalPromise) return globalPromise;

  // Load from static JSON file — faster than API, no server load
  globalPromise = fetch('/data/threats.json')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data: ThreatZone[]) => {
      globalCache = data;
      globalPromise = null;
      return data;
    })
    .catch(err => {
      globalPromise = null;
      console.error('Failed to fetch threats:', err);
      return [] as ThreatZone[];
    });

  return globalPromise;
}

export function useThreats(): { threats: ThreatZone[]; loading: boolean; error: string | null } {
  const [threats, setThreats] = useState<ThreatZone[]>(globalCache ?? []);
  const [loading, setLoading] = useState(!globalCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (globalCache) {
      setThreats(globalCache);
      setLoading(false);
      return;
    }

    fetchThreats()
      .then(data => {
        setThreats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { threats, loading, error };
}
