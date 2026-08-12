# Celestial Atlas and Observatory (12 August 2026)

An interactive cartographic map and topocentric ephemeris calculator for the Total Solar Eclipse of 12 August 2026. This project pairs a 19th-century Victorian astronomical field journal interface with dual astrodynamics engines: an in-browser TypeScript solver for real-time visualization and an independent Python engine using NASA JPL DE421 ephemeris data.

---

## Table of Contents

- [Overview](#overview)
- [Capabilities and Design Goals](#capabilities-and-design-goals)
- [Technical Architecture](#technical-architecture)
  - [Dual-Engine Implementation](#dual-engine-implementation)
  - [Computational Accuracy and Comparison](#computational-accuracy-and-comparison)
  - [Mathematical Formulations](#mathematical-formulations)
  - [Directory Structure](#directory-structure)
  - [Data Flow Diagram](#data-flow-diagram)
- [Assumptions and Known Limitations](#assumptions-and-known-limitations)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Web Application (React + Vite)](#1-web-application-react--vite)
  - [2. Python Ephemeris Engine and Streamlit Map](#2-python-ephemeris-engine-and-streamlit-map)
- [Component Reference](#component-reference)
  - [Web Frontend Components](#web-frontend-components)
  - [Mathematical Libraries](#mathematical-libraries)
  - [Python Scripts](#python-scripts)
- [Available Scripts and Commands](#available-scripts-and-commands)
- [Verification and Benchmark Points](#verification-and-benchmark-points)
- [Deployment](#deployment)
  - [Single-File Production Bundle](#single-file-production-bundle)
  - [Docker Containerization](#docker-containerization)
  - [Streamlit Community Cloud](#streamlit-community-cloud)
- [Troubleshooting](#troubleshooting)
- [Astronomical Constants and References](#astronomical-constants-and-references)
- [License](#license)

---

## Overview

On 12 August 2026, a total solar eclipse (Solar Saros 126, Member 48 of 72) will cross the Arctic Ocean, northern Greenland, western Iceland, the North Atlantic Ocean, northern Spain, and conclude at sunset in the Balearic Sea.

This repository provides two complementary tools:

1. **An Interactive Web Observatory**: A browser application built with React 19, TypeScript, Leaflet, and Tailwind CSS v4. It calculates local topocentric eclipse circumstances on demand for any clicked location on Earth, presents contact timelines (C1 through C4), renders an optical collimator simulation of the occulting lunar disk, and graphs photometric light curves.
2. **A Standalone Python Engine and CLI**: A calculation module (`eclipse.py`) based on Skyfield and the NASA JPL DE421 ephemeris, accompanied by a Streamlit/Folium map (`eclipse_map.py`) for lightweight local inspection.

---

## Capabilities and Design Goals

- **Arbitrary Coordinate Solving**: Calculates topocentric solar and lunar coordinates, angular separation, apparent disk radii, obscuration fraction, eclipse magnitude, solar altitude, solar azimuth, and contact moments for any latitude and longitude.
- **Cartographic Visualization**: Leaflet-based map with a 29-waypoint piecewise umbral corridor, centerline markers, region zoom presets, and an interactive coordinate selector.
- **Topocentric Collimator Simulation**: Canvas visualization illustrating the relative movement of the Moon across the Sun based on calculated position angle, separation, and apparent radii, with an interactive time scrubber and speed multiplier.
- **Photometric Curve**: 61-point sample of obscuration versus time across the event window.
- **Expedition Catalog and Geocoding**: Database of preset reference stations with integrated OpenStreetMap Nominatim search fallback.
- **In-App Code Folio**: Built-in viewer allowing inspection and direct download of the Python calculation scripts (`eclipse.py`, `eclipse_map.py`, `requirements.txt`).

---

## Technical Architecture

### Dual-Engine Implementation

The repository contains two independent implementations of the eclipse geometry:

| Metric / Aspect | In-Browser TypeScript Engine (`src/lib/`) | Standalone Python Engine (`eclipse.py`) |
| :--- | :--- | :--- |
| **Primary Use Case** | Interactive 60 FPS web application, instant click response | Authoritative calculation, verification, batch scripting |
| **Ephemeris Source** | Truncated Jean Meeus ELP-2000/82 series (60 lunar terms) + low-precision solar theory | NASA JPL DE421 Ephemeris binary SPK (`de421.bsp`) via Skyfield |
| **Coordinate Reduction** | Geodetic observer vectors on WGS84, IAU nutation and aberration terms | Full IAU 2000/2006 reduction with precession, nutation, and stellar aberration |
| **Network Dependencies** | Zero (runs 100% offline in browser) | Initial one-time download of `de421.bsp` (~16 MB) |
| **Performance** | Sub-millisecond per coordinate evaluation with LRU coordinate cache | ~15-30 ms per coordinate evaluation |

### Computational Accuracy and Comparison

The TypeScript engine is an analytical approximation designed for responsive browser rendering. It achieves close alignment with official NASA / Five Millennium Canon of Solar Eclipses (Espenak & Meeus) tables:

- **Contact Times (C1, C4)**: Typically within 2 to 8 seconds of NASA published tables.
- **Totality Times (C2, C3)**: Typically within 1 to 4 seconds of JPL DE421 calculations.
- **Maximum Obscuration and Magnitude**: Matches within 0.001 (0.1%).
- **Solar Altitude and Azimuth**: Accurate to within 0.1 degrees.

For applications requiring sub-second precision, the Python engine (`eclipse.py`) with Skyfield and DE421 provides the definitive reference.

### Mathematical Formulations

#### 1. Time Scales and Epoch Conversion
```
JD_UT = (Epoch_ms / 86,400,000) + 2,440,587.5
Delta_T (TT - UT1) = 69.5 seconds (estimated for August 2026)
JDE = JD_UT + (Delta_T / 86,400)
```

#### 2. Topocentric Observer Position Vector
For geographic latitude `phi`, longitude `lambda`, on the WGS84 reference ellipsoid:
```
u = atan(0.99664719 * tan(phi))
rho * sin(phi') = 0.99664719 * sin(u)
rho * cos(phi') = cos(u)
theta = GAST(JD_UT) + lambda

Position_Observer = [
  R_EARTH * rho * cos(phi') * cos(theta),
  R_EARTH * rho * cos(phi') * sin(theta),
  R_EARTH * rho * sin(phi')
]
```

#### 3. Topocentric Separation and Apparent Radii
Subtracting the observer vector from geocentric solar and lunar vectors yields topocentric vectors `S` and `M`:
```
d_Sun  = ||S||,  d_Moon = ||M||
r_Sun  = asin(R_SUN_KM / d_Sun)
r_Moon = asin(R_MOON_KM / d_Moon)
sep    = acos((S . M) / (d_Sun * d_Moon))
```

#### 4. Obscuration Fraction (Circular Intersection Area)
```
d  = sep
r1 = r_Sun
r2 = r_Moon

If d >= r1 + r2: Obscuration = 0.0
If d <= |r2 - r1|: Obscuration = (r2 >= r1) ? 1.0 : (r2 / r1)^2

Otherwise:
a1 = r1^2 * acos((d^2 + r1^2 - r2^2) / (2 * d * r1))
a2 = r2^2 * acos((d^2 + r2^2 - r1^2) / (2 * d * r2))
a3 = 0.5 * sqrt(max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)))

Obscuration = (a1 + a2 - a3) / (pi * r1^2)
```

#### 5. Contact Finding via Root Solving
- **Coarse Scan**: 1-minute interval scan across the global event window (14:30 to 21:30 UTC) to locate minimum angular separation.
- **Ternary Search**: 40-iteration search on `sep(t)` to locate the precise instant of maximum eclipse (`t_max`).
- **Bisection (C1 / C4)**: Root finding for `f(t) = sep(t) - (r_Sun(t) + r_Moon(t)) = 0`.
- **Bisection (C2 / C3)**: Root finding for `g(t) = sep(t) - (r_Moon(t) - r_Sun(t)) = 0` when `r_Moon > r_Sun`.

### Directory Structure

```
interactive-eclipse-web-map/
|-- eclipse.py                 # Pure Python astronomical engine and CLI (Skyfield + DE421)
|-- eclipse_map.py             # Streamlit + Folium map interface
|-- index.html                 # HTML5 entry point and Google Font typography references
|-- package.json               # Node.js dependencies and build scripts
|-- package-lock.json          # Node dependency lockfile
|-- requirements.txt           # Python dependency specifications
|-- tsconfig.json              # TypeScript compiler configuration
|-- vite.config.ts             # Vite build pipeline and single-file bundling configuration
|-- src/
    |-- App.tsx                # Root React component, header chronometer, modal state
    |-- main.tsx               # Application DOM bootstrap
    |-- index.css              # Theme tokens, Victorian textures, brass bezels, font styles
    |-- vite-env.d.ts          # Vite client types and raw asset import declarations
    |-- components/
    |   |-- CodePanel.tsx      # In-app viewer and exporter for raw Python scripts
    |   |-- MapPanel.tsx       # Leaflet map, corridor polygon, centerline ticks, markers
    |   |-- Sidebar.tsx        # Observation details, contact timeline, circumstances table
    |   |-- Visuals.tsx        # Optical collimator canvas and photometric light curve
    |   |-- icons/
    |   |   |-- index.tsx      # SVG astronomical and navigational glyphs
    |   |-- ui/
    |       |-- DataRow.tsx    # Tabular parameter display row component
    |-- lib/
    |   |-- astro.ts           # Pure astronomy mathematics (Meeus series, topocentric vectors)
    |   |-- eclipse.ts         # Eclipse solver, contact root finding, city catalog, caching
    |-- utils/
        |-- cn.ts              # Utility for Tailwind class composition
```

### Data Flow Diagram

```
[User Action: Map Click / City Selection / Coordinate Search]
                              |
                              v
                [Latitude, Longitude Input]
                              |
                              v
                   [cachedEclipse(lat, lon)]
                              |
                              v
                   [computeEclipse(lat, lon)]
                     - 1-minute coarse scan
                     - 40-step ternary search for maximum
                     - Bisection root finding for C1..C4
                     - 61-point profile sampling
                              |
                              v
                     [EclipseResult State]
                    /          |          \
                   v           v           v
          [Sidebar Panel] [Collimator] [Photometric Chart]
          - Circumstances  - Moon/Sun   - Obscuration curve
          - Contact times    geometry   - Ingress/Egress
          - Station log    - Scrubber   - Peak marker
```

---

## Assumptions and Known Limitations

To ensure honest and realistic expectations, the following technical constraints apply:

1. **Spherical Body Assumption (No Topographical Limb Profiles)**:
   Calculations treat both the Sun and Moon as smooth spherical bodies with mean radii ($R_\odot = 696,000\text{ km}$, $R_M = 1,737.4\text{ km}$). The calculations do not incorporate digital elevation models of the lunar limb (such as NASA LRO LOLA or JAXA Kaguya terrain profiles). Consequently, local lunar valley variations (which can shift contact times by $\pm 1$ to $\pm 3$ seconds) are not modeled.
2. **Simplified Atmospheric Refraction**:
   Solar altitude values are geometric/topocentric apparent positions. Standard atmospheric refraction tables (which raise objects near the horizon by up to $\sim 0.5^\circ$) are omitted from the separation equations. Observers viewing the eclipse close to sunset (e.g., in central Spain) will see the Sun slightly higher than the geometric altitude displayed.
3. **Sea-Level Elevation ($h = 0$)**:
   Observer coordinates assume sea-level elevation on the WGS84 ellipsoid. High-altitude observation stations (e.g., mountain summits in Spain) will experience minor second-order contact shifts that are not modeled.
4. **Illustrative Visual Effects in Collimator**:
   The optical collimator accurately tracks topocentric separation, apparent radii, and position angle. However, the corona glow, starfield distribution, and Baily's beads are stylized illustrative representations intended for user feedback and visual demonstration, not physically rendered radiative transfer simulations.
5. **Map Centerline and Corridor Polyline**:
   The red centerline and umbral corridor on the map are rendered from a 29-waypoint piecewise linear approximation for fast rendering. The exact numerical circumstances in the sidebar are calculated independently for the specific point clicked.
6. **Online Geocoding**:
   Searching for arbitrary city names relies on the OpenStreetMap Nominatim public API. When offline, users should select from the built-in station list or click directly on the map.

---

## Tech Stack

### Web Application (Frontend)

- **Framework**: React 19.2.6, TypeScript 5.9.3
- **Build System**: Vite 7.3.2, `@vitejs/plugin-react` 5.1.1, `vite-plugin-singlefile` 2.3.0
- **CSS and Styling**: Tailwind CSS 4.1.17, `@tailwindcss/vite`
- **Mapping**: Leaflet 1.9.4, React-Leaflet 5.0.0
- **Typography**: Google Fonts (EB Garamond, IM Fell English, IM Fell DW Pica, Special Elite, Caveat, Homemade Apple)

### Python Engine (CLI and Streamlit)

- **Ephemeris and Astrodynamics**: Skyfield 1.49+, `skyfield-data` 6.0+, NASA JPL DE421 (`de421.bsp`)
- **Computation**: NumPy 1.26+
- **GIS and Map UI**: Streamlit 1.36+, Folium 0.16+, Streamlit-Folium 0.20+, GeoPy 2.4+, TimezoneFinder 6.5+

---

## Prerequisites

### For the Web Application
- **Node.js**: Version 20.0.0 or higher (Node 22 LTS recommended)
- **npm**: Version 10.0.0 or higher

### For the Python Engine
- **Python**: Version 3.10, 3.11, or 3.12
- **pip**: Standard package installer

---

## Getting Started

### 1. Web Application (React + Vite)

#### Clone and Install

```bash
git clone https://github.com/Sehaan-1/interactive-eclipse-web-map.git
cd interactive-eclipse-web-map
npm install
```

#### Start Local Development Server

```bash
npm run dev
```

Open `http://localhost:5173/` in your browser.

#### Build Production Bundle

```bash
npm run build
```

Generates a single self-contained HTML bundle in `dist/index.html`.

#### Preview Built Bundle

```bash
npm run preview
```

---

### 2. Python Ephemeris Engine and Streamlit Map

#### Set Up Python Environment

```bash
# Linux / macOS:
python3 -m venv .venv
source .venv/bin/activate

# Windows (PowerShell):
python -m venv .venv
.venv\Scripts\Activate.ps1
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Run CLI Ephemeris Calculations

```bash
# By city name:
python eclipse.py --city Reykjavik
python eclipse.py --city "A Coruna"
python eclipse.py --city Zaragoza

# By geographic coordinates (Latitude Longitude):
python eclipse.py 64.1466 -21.9426
python eclipse.py 40.4168 -3.7038
python eclipse.py 65.200 -25.200
```

Sample CLI output:
```
Total Solar Eclipse - 12 August 2026
Reykjavik, Iceland  [64.147, -21.943]
  TOTAL ECLIPSE - 1m 01s of totality
  totality: 17:48:12 GMT -> 17:49:13 GMT
  first contact : 16:47:08 GMT
  maximum       : 17:48:42 GMT
  last contact  : 18:47:34 GMT
  sun altitude  : 23.8 deg  magnitude 1.0068
```

#### Run Streamlit Web Map

```bash
streamlit run eclipse_map.py
```

Opens `http://localhost:8501` in your browser.

---

## Component Reference

### Web Frontend Components

| Component | File Path | Role |
| :--- | :--- | :--- |
| `App` | `src/App.tsx` | Root layout, header chronometer, modal controls, and state management. |
| `MapPanel` | `src/components/MapPanel.tsx` | Leaflet map container, umbral corridor overlay, centerline polyline, time ticks, and reticle marker. |
| `Sidebar` | `src/components/Sidebar.tsx` | Selected locus card, contact chronology list, circumstances table, and logbook catalog. |
| `EclipseSim` | `src/components/Visuals.tsx` | SVG optical collimator rendering the Moon crossing the Sun with time controls and scrubber. |
| `ObscurationChart` | `src/components/Visuals.tsx` | 61-point photometric light curve sparkline with maximum eclipse indicator. |
| `CodePanel` | `src/components/CodePanel.tsx` | Modal viewer for inspecting and exporting Python source files. |
| `DataRow` | `src/components/ui/DataRow.tsx` | Formatted row for numerical parameters with labels and units. |

### Mathematical Libraries

| Module | File Path | Role |
| :--- | :--- | :--- |
| `astro` | `src/lib/astro.ts` | Meeus ELP-2000/82 lunar series, solar theory, nutation, GAST, and topocentric coordinate geometry. |
| `eclipse` | `src/lib/eclipse.ts` | Eclipse solver orchestration, ternary search for maximum, bisection for contacts, and LRU calculation caching. |

### Python Scripts

| Script | File Path | Role |
| :--- | :--- | :--- |
| `eclipse.py` | `eclipse.py` | Pure calculation engine using Skyfield and NASA JPL DE421 ephemeris with CLI interface. |
| `eclipse_map.py` | `eclipse_map.py` | Interactive Streamlit + Folium map interface with city popups and geocoding. |

---

## Available Scripts and Commands

### Node.js / npm

| Command | Action | Output |
| :--- | :--- | :--- |
| `npm run dev` | Runs Vite development server with HMR. | `http://localhost:5173` |
| `npm run build` | Compiles TypeScript and creates single-file bundle. | `dist/index.html` |
| `npm run preview` | Serves `dist/` locally for testing. | `http://localhost:4173` |

### Python

| Command | Action | Output |
| :--- | :--- | :--- |
| `python eclipse.py LAT LON` | Computes circumstances for coordinates. | Text summary in console. |
| `python eclipse.py --city NAME` | Computes circumstances for named city. | Text summary in console. |
| `streamlit run eclipse_map.py` | Launches Streamlit web application. | `http://localhost:8501` |

---

## Verification and Benchmark Points

Reference values for cross-verifying calculation output across implementations:

| Location | Latitude / Longitude | Type | Totality Duration | Peak Obscuration | Solar Altitude |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Reykjavik, Iceland** | `64.147 N, 21.943 W` | Total | 1m 01s (~17:48 UTC) | 100.0% | ~23.8 deg |
| **Greatest Eclipse Point** | `65.200 N, 25.200 W` | Total (Max) | 2m 18s (~17:46 UTC) | 100.0% | ~25.4 deg |
| **A Coruna, Spain** | `43.362 N, 8.412 W` | Total | 1m 14s (~18:27 UTC) | 100.0% | ~11.5 deg |
| **Madrid, Spain** | `40.417 N, 3.704 W` | Deep Partial | 0s (Partial) | ~99.8% (~18:30 UTC) | ~8.2 deg |
| **London, United Kingdom** | `51.507 N, 0.128 W` | Partial | 0s (Partial) | ~90.8% (~18:13 UTC) | ~11.2 deg |
| **Paris, France** | `48.857 N, 2.352 E` | Partial | 0s (Partial) | ~92.2% (~18:19 UTC) | ~8.4 deg |

---

## Deployment

### Single-File Production Bundle

The web application compiles into a single HTML file with embedded scripts, styles, and SVG assets:

```bash
npm run build
```

Deploy the generated `dist/index.html` file to any static host (GitHub Pages, Cloudflare Pages, Netlify, Vercel, S3, or Nginx).

#### Example Nginx Configuration

```nginx
server {
    listen 80;
    server_name eclipse.example.com;
    root /var/www/interactive-eclipse-web-map/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

### Docker Containerization

#### Web App Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Streamlit Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY eclipse.py eclipse_map.py ./
EXPOSE 8501
CMD ["streamlit", "run", "eclipse_map.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

---

### Streamlit Community Cloud

1. Push this repository to GitHub.
2. Navigate to [Streamlit Community Cloud](https://share.streamlit.io/).
3. Create a **New App** pointing to `eclipse_map.py`.
4. Deploy. The service will install `requirements.txt` and cache the ephemeris file on startup.

---

## Troubleshooting

### Web Application

- **Map Tiles Not Loading**: Check network connectivity to `https://*.basemaps.cartocdn.com`. If using an ad-blocker or strict firewall, allow CartoDB tile requests.
- **Geocoding Search Errors**: The search bar queries OpenStreetMap Nominatim. If rate-limited or offline, click directly on the map or select a city from the logbook.
- **Offline Typography**: Google Fonts are loaded from Google CDN. In offline environments, the interface falls back to system serif and monospace fonts.

### Python Engine

- **Ephemeris Download Failure**: Skyfield automatically downloads `de421.bsp` (~16 MB) to `~/.skyfield-data/` on first run. If running in an air-gapped environment, pre-populate this directory with the file.
- **Timezone Lookup Warnings**: If `timezonefinder` is not installed or lacks C-compiler support, contact times will display in UTC.

---

## Astronomical Constants and References

- **Solar Radius ($R_\odot$)**: $696,000\text{ km}$
- **Lunar Radius ($R_M$)**: $1,737.4\text{ km}$
- **Earth Equatorial Radius ($a$)**: $6,378.137\text{ km}$ (WGS84)
- **Earth Flattening ($f$)**: $1 / 298.257223563$
- **Astronomical Unit ($\text{AU}$)**: $149,597,870.7\text{ km}$
- **$\Delta T$ (TT - UT1)**: $69.5\text{ s}$
- **Ephemeris Reference**: NASA JPL Development Ephemeris DE421
- **Lunar Theory Reference**: Jean Meeus, *Astronomical Algorithms* (2nd Ed., Willmann-Bell), Chapters 25 & 47 (truncated ELP-2000/82)
- **NASA Reference**: Espenak, F., & Meeus, J., *Five Millennium Canon of Solar Eclipses: -1999 to +3000*

---

## License

This project is licensed under the MIT License.
