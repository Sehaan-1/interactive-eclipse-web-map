/*
 * eclipse.ts — the engine. Mirrors the public contract of eclipse.py:
 *
 *   computeEclipse(lat, lon) -> EclipseResult   (pure function, no UI, no I/O)
 *   CITIES                                       (featured markers)
 *   formatDuration(seconds) -> string
 *
 * Event: total solar eclipse of 12 August 2026.
 */

import { geometryAt, type Geometry } from './astro';

export const EVENT_NAME = 'Total Solar Eclipse — 12 August 2026';
/** Instant of greatest eclipse (UTC). */
export const GREATEST_ECLIPSE_UTC = Date.UTC(2026, 7, 12, 17, 46, 0);

/** Global search window for the event (UTC ms). */
const WINDOW_START = Date.UTC(2026, 7, 12, 14, 30, 0);
const WINDOW_END = Date.UTC(2026, 7, 12, 21, 30, 0);
const COARSE_STEP = 60_000; // 1 minute

export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  { name: 'Reykjavík', country: 'Iceland', lat: 64.1466, lon: -21.9426 },
  { name: 'Akureyri', country: 'Iceland', lat: 65.6885, lon: -18.1262 },
  { name: 'Nuuk', country: 'Greenland', lat: 64.1836, lon: -51.7214 },
  { name: 'Longyearbyen', country: 'Svalbard', lat: 78.2232, lon: 15.6469 },
  { name: 'Tórshavn', country: 'Faroe Is.', lat: 62.0079, lon: -6.7908 },
  { name: 'A Coruña', country: 'Spain', lat: 43.3623, lon: -8.4115 },
  { name: 'Oviedo', country: 'Spain', lat: 43.3619, lon: -5.8494 },
  { name: 'Bilbao', country: 'Spain', lat: 43.263, lon: -2.935 },
  { name: 'Zaragoza', country: 'Spain', lat: 41.6488, lon: -0.8891 },
  { name: 'Valencia', country: 'Spain', lat: 39.4699, lon: -0.3763 },
  { name: 'Palma', country: 'Spain', lat: 39.5696, lon: 2.6502 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3874, lon: 2.1686 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lon: -9.1393 },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { name: 'London', country: 'UK', lat: 51.5072, lon: -0.1276 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lon: -6.2603 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lon: 13.405 },
  { name: 'Reykjahlíð', country: 'Iceland', lat: 65.6417, lon: -16.9167 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964 },
  { name: 'New York', country: 'USA', lat: 40.7128, lon: -74.006 },
];

/**
 * Approximate centre line of the path of totality (lat, lon), running
 * Siberia → Arctic Ocean → Greenland → Iceland → Atlantic → northern Spain
 * → Balearic Sea. Precomputed offline, baked in as a static constant so the
 * map costs nothing at runtime and works offline.
 */
export const CENTERLINE: [number, number][] = [
  [66.5, 158.0],
  [71.4, 148.5],
  [75.8, 137.0],
  [79.6, 121.5],
  [82.7, 99.0],
  [84.9, 68.0],
  [86.0, 28.0],
  [85.8, -12.0],
  [84.4, -41.0],
  [82.0, -58.0],
  [78.9, -66.0],
  [75.4, -68.0],
  [71.9, -64.5],
  [68.7, -57.5],
  [66.4, -47.0],
  [65.4, -35.0],
  [65.2, -25.2],
  [64.4, -18.0],
  [62.5, -11.5],
  [59.9, -7.0],
  [56.8, -4.0],
  [53.3, -2.0],
  [49.5, -1.0],
  [45.6, -1.5],
  [43.4, -3.4],
  [42.6, -1.4],
  [41.6, 0.7],
  [40.4, 2.6],
  [39.3, 4.2],
];

/** Rough umbral path edges (± half-width) for a shaded band. */
export function pathBand(halfWidthKm = 145): [number, number][] {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < CENTERLINE.length; i++) {
    const [lat, lon] = CENTERLINE[i];
    const [latA, lonA] = CENTERLINE[Math.max(0, i - 1)];
    const [latB, lonB] = CENTERLINE[Math.min(CENTERLINE.length - 1, i + 1)];
    const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
    let dx = (lonB - lonA) * cosLat;
    const dy = latB - latA;
    if (Math.abs(dx) > 180 * cosLat) dx -= Math.sign(dx) * 360 * cosLat;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const dDeg = halfWidthKm / 111.2;
    left.push([lat + ny * dDeg, lon + (nx * dDeg) / cosLat]);
    right.push([lat - ny * dDeg, lon - (nx * dDeg) / cosLat]);
  }
  return [...left, ...right.reverse()];
}

export interface EclipseResult {
  lat: number;
  lon: number;
  visible: boolean;
  anyContact: boolean;
  inTotality: boolean;
  maxObscuration: number;
  magnitude: number;
  totalitySeconds: number;
  startUTC: number | null;
  maxUTC: number | null;
  endUTC: number | null;
  totalityStartUTC: number | null;
  totalityEndUTC: number | null;
  sunAltitude: number;
  sunAzimuth: number;
  geometryAtMax: Geometry | null;
  /** obscuration samples through the event, for the sparkline */
  profile: { t: number; obs: number }[];
}

function bisect(
  f: (t: number) => number,
  lo: number,
  hi: number,
  iterations = 26,
): number {
  let a = lo;
  let b = hi;
  const fa = f(a);
  for (let i = 0; i < iterations; i++) {
    const mid = (a + b) / 2;
    if (Math.sign(f(mid)) === Math.sign(fa)) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

/**
 * Pure function: local circumstances of the eclipse at (lat, lon).
 * No printing, no globals mutated, no framework imports. Import it from a web
 * app, a REST API, or a Discord bot without modification.
 */
export function computeEclipse(lat: number, lon: number): EclipseResult {
  // — coarse scan of the global event window —
  let bestT = WINDOW_START;
  let bestGap = Infinity;
  const profile: { t: number; obs: number }[] = [];

  for (let t = WINDOW_START; t <= WINDOW_END; t += COARSE_STEP) {
    const g = geometryAt(t, lat, lon);
    const gap = g.sep - (g.rSun + g.rMoon);
    if (gap < bestGap) {
      bestGap = gap;
      bestT = t;
    }
  }

  // — refine the maximum (ternary search on separation) —
  let lo = bestT - COARSE_STEP;
  let hi = bestT + COARSE_STEP;
  const sepAt = (t: number) => geometryAt(t, lat, lon).sep;
  for (let i = 0; i < 40; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (sepAt(m1) < sepAt(m2)) hi = m2;
    else lo = m1;
  }
  const maxT = Math.round((lo + hi) / 2 / 1000) * 1000;
  const gMax = geometryAt(maxT, lat, lon);

  const anyContact = gMax.obscuration > 0;
  const visible = anyContact && gMax.altitude > 0;

  const result: EclipseResult = {
    lat,
    lon,
    visible,
    anyContact,
    inTotality: false,
    maxObscuration: gMax.obscuration,
    magnitude: gMax.magnitude,
    totalitySeconds: 0,
    startUTC: null,
    maxUTC: anyContact ? maxT : null,
    endUTC: null,
    totalityStartUTC: null,
    totalityEndUTC: null,
    sunAltitude: gMax.altitude,
    sunAzimuth: gMax.azimuth,
    geometryAtMax: gMax,
    profile,
  };

  if (!anyContact) return result;

  // — contacts: sep − (rSun + rMoon) = 0 either side of maximum —
  const touch = (t: number) => {
    const g = geometryAt(t, lat, lon);
    return g.sep - (g.rSun + g.rMoon);
  };
  const searchEdge = (dir: 1 | -1) => {
    let t = maxT;
    for (let i = 0; i < 400; i++) {
      const next = t + dir * 30_000;
      if (next < WINDOW_START - 3600_000 || next > WINDOW_END + 3600_000) return null;
      if (touch(next) > 0) return bisect(touch, t, next);
      t = next;
    }
    return null;
  };
  result.startUTC = searchEdge(-1);
  result.endUTC = searchEdge(1);

  // — totality: sep − (rMoon − rSun) = 0 —
  const umbra = (t: number) => {
    const g = geometryAt(t, lat, lon);
    return g.sep - (g.rMoon - g.rSun);
  };
  if (gMax.rMoon > gMax.rSun && umbra(maxT) < 0) {
    result.inTotality = true;
    const edge = (dir: 1 | -1) => {
      let t = maxT;
      for (let i = 0; i < 200; i++) {
        const next = t + dir * 10_000;
        if (umbra(next) > 0) return bisect(umbra, t, next);
        t = next;
      }
      return null;
    };
    const a = edge(-1);
    const b = edge(1);
    if (a !== null && b !== null) {
      result.totalityStartUTC = a;
      result.totalityEndUTC = b;
      result.totalitySeconds = Math.round((b - a) / 1000);
    }
  }

  // — sample profile for the chart —
  const s = result.startUTC ?? maxT - 3600_000;
  const e = result.endUTC ?? maxT + 3600_000;
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const t = s + ((e - s) * i) / n;
    profile.push({ t, obs: geometryAt(t, lat, lon).obscuration });
  }

  return result;
}

// ── caching layer (equivalent of @st.cache_data on the Python side) ─────────
const cache = new Map<string, EclipseResult>();

/** Round to ~100 m so tiny map movements reuse the cached computation. */
export function cachedEclipse(lat: number, lon: number): EclipseResult {
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  const rlat = Math.round(lat * 1000) / 1000;
  const rlon3 = Math.round(wrapped * 1000) / 1000;
  const key = `${rlat},${rlon3}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = computeEclipse(rlat, rlon3);
  cache.set(key, res);
  return res;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function fmtUTC(ms: number | null): string {
  if (ms === null) return '—';
  const d = new Date(ms);
  return (
    `${d.getUTCHours().toString().padStart(2, '0')}:` +
    `${d.getUTCMinutes().toString().padStart(2, '0')}:` +
    `${d.getUTCSeconds().toString().padStart(2, '0')} UTC`
  );
}

export function fmtLocal(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Longitude-based "sun clock" time — a decent stand-in for the local zone. */
export function fmtSolar(ms: number | null, lon: number): string {
  if (ms === null) return '—';
  const offset = Math.round(lon / 15) * 3600000;
  const d = new Date(ms + offset);
  const sign = offset >= 0 ? '+' : '−';
  return (
    `${d.getUTCHours().toString().padStart(2, '0')}:` +
    `${d.getUTCMinutes().toString().padStart(2, '0')}:` +
    `${d.getUTCSeconds().toString().padStart(2, '0')} (UTC${sign}${Math.abs(offset / 3600000)})`
  );
}

export function statusOf(res: EclipseResult): {
  label: string;
  tone: 'total' | 'deep' | 'partial' | 'slight' | 'none';
  color: string;
} {
  if (!res.anyContact || !res.visible)
    return { label: 'Not visible', tone: 'none', color: '#64748b' };
  if (res.inTotality) return { label: 'TOTAL', tone: 'total', color: '#22c55e' };
  const pct = res.maxObscuration * 100;
  if (pct >= 90) return { label: 'Deep partial', tone: 'deep', color: '#f59e0b' };
  if (pct >= 40) return { label: 'Partial', tone: 'partial', color: '#3b82f6' };
  return { label: 'Slight partial', tone: 'slight', color: '#6366f1' };
}
