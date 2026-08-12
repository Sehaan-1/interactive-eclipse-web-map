"""
eclipse.py — the engine.

Local circumstances of the total solar eclipse of 12 August 2026, computed with
Skyfield and the JPL DE421 ephemeris.

Design rule: this module is *pure astronomy*. `compute_eclipse()` has no
knowledge of Streamlit, Folium, argparse or stdout, so the same function can be
imported by a web app, a REST API or a Discord bot without modification.
The CLI lives in `main()` and is the only place that prints.

    pip install skyfield skyfield-data rich geopy timezonefinder numpy
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from math import acos, degrees, pi, radians, sqrt

import numpy as np
from skyfield.api import Loader, wgs84

# ── ephemeris: loaded ONCE at module level, never per call ─────────────────
_load = Loader("~/.skyfield-data", verbose=False)
TS = _load.timescale()
EPH = _load("de421.bsp")
EARTH, SUN, MOON = EPH["earth"], EPH["sun"], EPH["moon"]

# Physical constants (km)
R_SUN_KM = 696_000.0
R_MOON_KM = 1_737.4

# Global window of the event, UTC
EVENT_NAME = "Total Solar Eclipse — 12 August 2026"
GREATEST_ECLIPSE_UTC = datetime(2026, 8, 12, 17, 46, tzinfo=timezone.utc)
WINDOW_START = datetime(2026, 8, 12, 14, 30, tzinfo=timezone.utc)
WINDOW_END = datetime(2026, 8, 12, 21, 30, tzinfo=timezone.utc)
COARSE_STEP = timedelta(minutes=1)


@dataclass(frozen=True)
class City:
    name: str
    country: str
    lat: float
    lon: float


CITIES: list[City] = [
    City("Reykjavík", "Iceland", 64.1466, -21.9426),
    City("Akureyri", "Iceland", 65.6885, -18.1262),
    City("Nuuk", "Greenland", 64.1836, -51.7214),
    City("Longyearbyen", "Svalbard", 78.2232, 15.6469),
    City("Tórshavn", "Faroe Is.", 62.0079, -6.7908),
    City("A Coruña", "Spain", 43.3623, -8.4115),
    City("Oviedo", "Spain", 43.3619, -5.8494),
    City("Bilbao", "Spain", 43.2630, -2.9350),
    City("Zaragoza", "Spain", 41.6488, -0.8891),
    City("Valencia", "Spain", 39.4699, -0.3763),
    City("Palma", "Spain", 39.5696, 2.6502),
    City("Madrid", "Spain", 40.4168, -3.7038),
    City("Barcelona", "Spain", 41.3874, 2.1686),
    City("Lisbon", "Portugal", 38.7223, -9.1393),
    City("Paris", "France", 48.8566, 2.3522),
    City("London", "UK", 51.5072, -0.1276),
    City("Dublin", "Ireland", 53.3498, -6.2603),
    City("Berlin", "Germany", 52.5200, 13.4050),
    City("Moscow", "Russia", 55.7558, 37.6173),
    City("Rome", "Italy", 41.9028, 12.4964),
    City("New York", "USA", 40.7128, -74.0060),
]


# ── geometry helpers ───────────────────────────────────────────────────────
def _obscuration(sep: float, r_sun: float, r_moon: float) -> float:
    """Fraction of the solar disk area hidden by the lunar disk (all degrees)."""
    if sep >= r_sun + r_moon:
        return 0.0
    if sep <= abs(r_moon - r_sun):
        return 1.0 if r_moon >= r_sun else (r_moon / r_sun) ** 2
    d2, r1, r2 = sep * sep, r_sun, r_moon
    a1 = r1 * r1 * acos((d2 + r1 * r1 - r2 * r2) / (2 * sep * r1))
    a2 = r2 * r2 * acos((d2 + r2 * r2 - r1 * r1) / (2 * sep * r2))
    a3 = 0.5 * sqrt(
        max(0.0, (-sep + r1 + r2) * (sep + r1 - r2) * (sep - r1 + r2) * (sep + r1 + r2))
    )
    return (a1 + a2 - a3) / (pi * r1 * r1)


def _geometry(observer, t):
    """Topocentric Sun/Moon geometry at time `t`: (sep, r_sun, r_moon, alt)."""
    astro_sun = observer.at(t).observe(SUN).apparent()
    astro_moon = observer.at(t).observe(MOON).apparent()
    sep = astro_sun.separation_from(astro_moon).degrees
    d_sun = astro_sun.distance().km
    d_moon = astro_moon.distance().km
    r_sun = degrees(np.arcsin(R_SUN_KM / d_sun))
    r_moon = degrees(np.arcsin(R_MOON_KM / d_moon))
    alt = astro_sun.altaz()[0].degrees
    return float(sep), float(r_sun), float(r_moon), float(alt)


def _bisect(f, lo: float, hi: float, iterations: int = 26) -> float:
    """Root of `f` (unix seconds domain) bracketed by lo/hi."""
    f_lo = f(lo)
    for _ in range(iterations):
        mid = (lo + hi) / 2
        if (f(mid) >= 0) == (f_lo >= 0):
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def _dt(unix_seconds: float) -> datetime:
    return datetime.fromtimestamp(unix_seconds, tz=timezone.utc)


# ── the public, pure function ──────────────────────────────────────────────
def compute_eclipse(lat: float, lon: float) -> dict:
    """Local circumstances of the 2026-08-12 eclipse at (lat, lon).

    Returns a plain dict — no printing, no globals mutated, no side effects.
    Keys: visible, in_totality, max_obscuration, magnitude, totality_seconds,
    start, maximum, end, totality_start, totality_end, sun_altitude,
    sun_azimuth, profile.
    """
    observer = EARTH + wgs84.latlon(lat, lon)

    # coarse 1-minute scan for the moment of closest approach
    n = int((WINDOW_END - WINDOW_START) / COARSE_STEP) + 1
    times = [WINDOW_START + i * COARSE_STEP for i in range(n)]
    best_t, best_gap = times[0], float("inf")
    for moment in times:
        sep, r_s, r_m, _ = _geometry(observer, TS.from_datetime(moment))
        gap = sep - (r_s + r_m)
        if gap < best_gap:
            best_gap, best_t = gap, moment

    sep_at = lambda u: _geometry(observer, TS.from_datetime(_dt(u)))[0]  # noqa: E731
    lo = (best_t - COARSE_STEP).timestamp()
    hi = (best_t + COARSE_STEP).timestamp()
    for _ in range(40):  # ternary search on separation
        m1, m2 = lo + (hi - lo) / 3, hi - (hi - lo) / 3
        if sep_at(m1) < sep_at(m2):
            hi = m2
        else:
            lo = m1
    t_max = round((lo + hi) / 2)

    sep, r_sun, r_moon, alt = _geometry(observer, TS.from_datetime(_dt(t_max)))
    obsc = _obscuration(sep, r_sun, r_moon)
    result = {
        "lat": lat,
        "lon": lon,
        "any_contact": obsc > 0,
        "visible": obsc > 0 and alt > 0,
        "in_totality": False,
        "max_obscuration": obsc,
        "magnitude": max(0.0, (r_sun + r_moon - sep) / (2 * r_sun)),
        "totality_seconds": 0,
        "start": None,
        "maximum": _dt(t_max) if obsc > 0 else None,
        "end": None,
        "totality_start": None,
        "totality_end": None,
        "sun_altitude": alt,
        "sun_azimuth": 0.0,
        "profile": [],
    }
    if obsc <= 0:
        return result

    def touch(u: float) -> float:
        s, rs, rm, _ = _geometry(observer, TS.from_datetime(_dt(u)))
        return s - (rs + rm)

    def umbra(u: float) -> float:
        s, rs, rm, _ = _geometry(observer, TS.from_datetime(_dt(u)))
        return s - (rm - rs)

    def edge(f, direction: int, step: float, limit: int):
        u = float(t_max)
        for _ in range(limit):
            nxt = u + direction * step
            if f(nxt) > 0:
                return _bisect(f, u, nxt)
            u = nxt
        return None

    c1 = edge(touch, -1, 30.0, 400)
    c4 = edge(touch, +1, 30.0, 400)
    result["start"] = _dt(c1) if c1 else None
    result["end"] = _dt(c4) if c4 else None

    if r_moon > r_sun and umbra(t_max) < 0:
        t2 = edge(umbra, -1, 10.0, 200)
        t3 = edge(umbra, +1, 10.0, 200)
        if t2 and t3:
            result["in_totality"] = True
            result["totality_start"] = _dt(t2)
            result["totality_end"] = _dt(t3)
            result["totality_seconds"] = int(round(t3 - t2))

    if c1 and c4:
        result["profile"] = [
            (
                _dt(c1 + (c4 - c1) * i / 60),
                _obscuration(*_geometry(observer, TS.from_datetime(_dt(c1 + (c4 - c1) * i / 60)))[:3]),
            )
            for i in range(61)
        ]
    return result


def format_duration(seconds: int | float | None) -> str:
    """Human-readable duration: 214 -> '3m 34s'."""
    if not seconds or seconds <= 0:
        return "—"
    minutes, secs = divmod(int(round(seconds)), 60)
    return f"{secs}s" if minutes == 0 else f"{minutes}m {secs:02d}s"


def local_time(moment: datetime | None, lat: float, lon: float) -> str:
    """Format a UTC datetime in the local zone of (lat, lon)."""
    if moment is None:
        return "—"
    try:
        from timezonefinder import TimezoneFinder
        from zoneinfo import ZoneInfo

        name = TimezoneFinder().timezone_at(lat=lat, lng=lon)
        if name:
            return moment.astimezone(ZoneInfo(name)).strftime("%H:%M:%S %Z")
    except Exception:  # pragma: no cover - optional dependency
        pass
    return moment.strftime("%H:%M:%S UTC")


# ── CLI wrapper: the ONLY place with I/O ───────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description=EVENT_NAME)
    parser.add_argument("lat", type=float, nargs="?", help="latitude, degrees north")
    parser.add_argument("lon", type=float, nargs="?", help="longitude, degrees east")
    parser.add_argument("--city", help="name of a featured city")
    args = parser.parse_args()

    if args.city:
        match = next((c for c in CITIES if c.name.lower() == args.city.lower()), None)
        if match is None:
            raise SystemExit(f"Unknown city: {args.city}")
        lat, lon, label = match.lat, match.lon, f"{match.name}, {match.country}"
    elif args.lat is not None and args.lon is not None:
        lat, lon, label = args.lat, args.lon, f"({args.lat:.3f}, {args.lon:.3f})"
    else:
        raise SystemExit("Give LAT LON or --city NAME")

    res = compute_eclipse(lat, lon)
    print(f"\n{EVENT_NAME}\n{label}  [{lat:.3f}, {lon:.3f}]")
    if not res["visible"]:
        print("  No eclipse visible — Sun below the horizon (or outside the shadow).")
        return
    if res["in_totality"]:
        print(f"  TOTAL ECLIPSE — {format_duration(res['totality_seconds'])} of totality")
        print(f"  totality: {local_time(res['totality_start'], lat, lon)}"
              f" → {local_time(res['totality_end'], lat, lon)}")
    else:
        print(f"  Partial eclipse — {res['max_obscuration'] * 100:.2f}% obscured")
    print(f"  first contact : {local_time(res['start'], lat, lon)}")
    print(f"  maximum       : {local_time(res['maximum'], lat, lon)}")
    print(f"  last contact  : {local_time(res['end'], lat, lon)}")
    print(f"  sun altitude  : {res['sun_altitude']:.1f}°  magnitude {res['magnitude']:.4f}\n")


if __name__ == "__main__":
    main()
