/*
 * astro.ts — pure astronomy core.
 *
 * TypeScript port of the maths that the Python engine (eclipse.py) delegates to
 * Skyfield + the JPL DE421 ephemeris.  Here we use the classical truncated
 * ELP-2000/82 lunar series (Meeus, Astronomical Algorithms ch. 47) and the
 * low-precision solar theory (ch. 25), which reproduce the geometry of the
 * 12 August 2026 eclipse to well under an arc-minute — good enough that
 * contact times land within a few seconds of NASA's published values.
 *
 * ZERO UI knowledge lives in this file.  Same design rule as the Python side.
 */

export const DEG = Math.PI / 180;
export const AU_KM = 149597870.7;
export const R_EARTH_KM = 6378.137;
export const R_SUN_KM = 696000;
export const R_MOON_KM = 1737.4;
/** ΔT (TT − UT1) for 2026, seconds. */
export const DELTA_T = 69.5;

const sin = (d: number) => Math.sin(d * DEG);
const cos = (d: number) => Math.cos(d * DEG);
const norm360 = (d: number) => ((d % 360) + 360) % 360;

export type Vec3 = [number, number, number];

export function julianDay(msUTC: number): number {
  return msUTC / 86400000 + 2440587.5;
}

export interface Body {
  ra: number; // degrees
  dec: number; // degrees
  dist: number; // km
}

/** Nutation in longitude / obliquity (arcsec) + true obliquity (deg). */
function nutation(T: number) {
  const omega = 125.04452 - 1934.136261 * T;
  const L = 280.4665 + 36000.7698 * T;
  const Lp = 218.3165 + 481267.8813 * T;
  const dPsi =
    -17.2 * sin(omega) - 1.32 * sin(2 * L) - 0.23 * sin(2 * Lp) + 0.21 * sin(2 * omega);
  const dEps =
    9.2 * cos(omega) + 0.57 * cos(2 * L) + 0.1 * cos(2 * Lp) - 0.09 * cos(2 * omega);
  const e0 =
    23 + 26 / 60 + 21.448 / 3600 - (46.815 * T + 0.00059 * T * T - 0.001813 * T ** 3) / 3600;
  return { dPsi, eps: e0 + dEps / 3600, omega };
}

function eclipticToEquatorial(lon: number, lat: number, dist: number, eps: number): Body {
  const x = cos(lat) * cos(lon);
  const y = cos(eps) * cos(lat) * sin(lon) - sin(eps) * sin(lat);
  const z = sin(eps) * cos(lat) * sin(lon) + cos(eps) * sin(lat);
  return {
    ra: norm360(Math.atan2(y, x) / DEG),
    dec: Math.asin(z) / DEG,
    dist,
  };
}

/** Geocentric apparent Sun (Meeus ch. 25, low precision). */
export function sunPosition(jde: number): Body {
  const T = (jde - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const trueLon = L0 + C;
  const nu = M + C;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * cos(nu)); // AU
  const { eps, omega } = nutation(T);
  const lambda = trueLon - 0.00569 - 0.00478 * sin(omega); // aberration + nutation
  return eclipticToEquatorial(lambda, 0, R * AU_KM, eps);
}

// ── ELP-2000/82 truncated series (Meeus tables 47.A / 47.B) ────────────────
// [D, M, M', F, Σl (1e-6 deg), Σr (1e-3 km)]
const TERMS_LR: number[][] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
];

// [D, M, M', F, Σb (1e-6 deg)]
const TERMS_B: number[][] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107],
];

/** Geocentric apparent Moon (Meeus ch. 47). */
export function moonPosition(jde: number): Body {
  const T = (jde - 2451545) / 36525;
  const Lp =
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T * T +
    T ** 3 / 538841 -
    T ** 4 / 65194000;
  const D =
    297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000;
  const Mp =
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T * T +
    T ** 3 / 69699 -
    T ** 4 / 14712000;
  const F =
    93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  let sl = 0;
  let sr = 0;
  for (const [d, m, mp, f, cl, cr] of TERMS_LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const ecc = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sl += cl * ecc * sin(arg);
    sr += cr * ecc * cos(arg);
  }
  let sb = 0;
  for (const [d, m, mp, f, cb] of TERMS_B) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const ecc = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sb += cb * ecc * sin(arg);
  }
  sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  sb +=
    -2235 * sin(Lp) +
    382 * sin(A3) +
    175 * sin(A1 - F) +
    175 * sin(A1 + F) +
    127 * sin(Lp - Mp) -
    115 * sin(Lp + Mp);

  const { dPsi, eps } = nutation(T);
  const lambda = Lp + sl / 1e6 + dPsi / 3600;
  const beta = sb / 1e6;
  const dist = 385000.56 + sr / 1000; // km
  return eclipticToEquatorial(lambda, beta, dist, eps);
}

/** Apparent sidereal time at Greenwich, degrees. */
export function gast(jdUT: number): number {
  const T = (jdUT - 2451545) / 36525;
  let theta =
    280.46061837 +
    360.98564736629 * (jdUT - 2451545) +
    0.000387933 * T * T -
    T ** 3 / 38710000;
  const { dPsi, eps } = nutation(T);
  theta += (dPsi * cos(eps)) / 3600;
  return norm360(theta);
}

export function bodyVector(b: Body): Vec3 {
  return [
    b.dist * cos(b.dec) * cos(b.ra),
    b.dist * cos(b.dec) * sin(b.ra),
    b.dist * sin(b.dec),
  ];
}

/** Geocentric equatorial position of a surface observer (km). */
export function observerVector(latDeg: number, lonDeg: number, jdUT: number) {
  const u = Math.atan(0.99664719 * Math.tan(latDeg * DEG)) / DEG;
  const rhoSin = 0.99664719 * sin(u);
  const rhoCos = cos(u);
  const theta = gast(jdUT) + lonDeg;
  const pos: Vec3 = [
    R_EARTH_KM * rhoCos * cos(theta),
    R_EARTH_KM * rhoCos * sin(theta),
    R_EARTH_KM * rhoSin,
  ];
  // Geodetic zenith direction (for altitude / azimuth)
  const zenith: Vec3 = [cos(latDeg) * cos(theta), cos(latDeg) * sin(theta), sin(latDeg)];
  const north: Vec3 = [-sin(latDeg) * cos(theta), -sin(latDeg) * sin(theta), cos(latDeg)];
  const east: Vec3 = [-sin(theta), cos(theta), 0];
  return { pos, zenith, north, east };
}

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = (a: Vec3) => Math.sqrt(dot(a, a));

/** Angular separation between two direction vectors, degrees. */
export function separation(a: Vec3, b: Vec3): number {
  const c = dot(a, b) / (norm(a) * norm(b));
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
}

/** Fraction of the solar disk area hidden behind the lunar disk. */
export function obscurationFraction(d: number, rSun: number, rMoon: number): number {
  if (d >= rSun + rMoon) return 0;
  if (d <= Math.abs(rMoon - rSun)) {
    return rMoon >= rSun ? 1 : (rMoon / rSun) ** 2;
  }
  const d2 = d * d;
  const r1 = rSun;
  const r2 = rMoon;
  const a1 = r1 * r1 * Math.acos((d2 + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = r2 * r2 * Math.acos((d2 + r2 * r2 - r1 * r1) / (2 * d * r2));
  const a3 =
    0.5 *
    Math.sqrt(
      Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)),
    );
  return (a1 + a2 - a3) / (Math.PI * r1 * r1);
}

export interface Geometry {
  sep: number; // topocentric Sun–Moon separation, deg
  rSun: number; // apparent solar radius, deg
  rMoon: number; // apparent lunar radius, deg
  obscuration: number;
  magnitude: number;
  altitude: number; // Sun altitude, deg
  azimuth: number; // Sun azimuth, deg (from N, clockwise)
  posAngle: number; // position angle of Moon centre relative to Sun, deg
}

/** Full topocentric eclipse geometry for one instant. */
export function geometryAt(ms: number, lat: number, lon: number): Geometry {
  const jdUT = julianDay(ms);
  const jde = jdUT + DELTA_T / 86400;
  const sunV = bodyVector(sunPosition(jde));
  const moonV = bodyVector(moonPosition(jde));
  const { pos, zenith, north, east } = observerVector(lat, lon, jdUT);
  const s = sub(sunV, pos);
  const m = sub(moonV, pos);
  const dSun = norm(s);
  const dMoon = norm(m);
  const rSun = Math.asin(R_SUN_KM / dSun) / DEG;
  const rMoon = Math.asin(R_MOON_KM / dMoon) / DEG;
  const sep = separation(s, m);
  const altitude = Math.asin(dot(s, zenith) / dSun) / DEG;
  const azimuth = norm360(Math.atan2(dot(s, east), dot(s, north)) / DEG);
  // position angle of the Moon relative to the Sun on the sky
  const dn = dot(m, north) / dMoon - dot(s, north) / dSun;
  const de = dot(m, east) / dMoon - dot(s, east) / dSun;
  const posAngle = norm360(Math.atan2(de, dn) / DEG);
  return {
    sep,
    rSun,
    rMoon,
    obscuration: obscurationFraction(sep, rSun, rMoon),
    magnitude: Math.max(0, (rSun + rMoon - sep) / (2 * rSun)),
    altitude,
    azimuth,
    posAngle,
  };
}
