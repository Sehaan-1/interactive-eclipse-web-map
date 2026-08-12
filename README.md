# Celestial Atlas and Observatory (12 August 2026)

An interactive cartographic atlas and topocentric ephemeris engine for the Total Solar Eclipse of 12 August 2026. This project combines a 19th-century Victorian astronomical field journal aesthetic with high-precision astrodynamics algorithms implemented in both TypeScript (in-browser) and Python (ephemeris CLI and Streamlit map).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
  - [Directory Structure](#directory-structure)
  - [Dual-Engine Model](#dual-engine-model)
  - [Astrodynamics and Mathematical Algorithms](#astrodynamics-and-mathematical-algorithms)
  - [Data Flow Diagram](#data-flow-diagram)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Web Application (React + Vite)](#1-web-application-react--vite)
  - [2. Python Astrodynamics Engine and Streamlit Map](#2-python-astrodynamics-engine-and-streamlit-map)
- [Component Breakdown](#component-breakdown)
  - [Web Frontend Components](#web-frontend-components)
  - [Mathematical Libraries](#mathematical-libraries)
  - [Python Scripts](#python-scripts)
- [Available Scripts and Commands](#available-scripts-and-commands)
- [Verification and Testing](#verification-and-testing)
- [Deployment](#deployment)
  - [Production Web Build (Vite Single-File Bundle)](#production-web-build-vite-single-file-bundle)
  - [Docker Containerization](#docker-containerization)
  - [Streamlit Cloud Deployment](#streamlit-cloud-deployment)
- [Troubleshooting](#troubleshooting)
- [Astronomical Constants and Ephemeris References](#astronomical-constants-and-ephemeris-references)
- [License](#license)

---

## Overview

On 12 August 2026, a total solar eclipse will sweep across the Arctic Ocean, Greenland, western Iceland, the Atlantic Ocean, and northern Spain before terminating at sunset in the Balearic Sea.

This repository provides two complete, interoperable systems:

1. **A Victorian Celestial Web Atlas**: An interactive browser application created with React 19, Vite, Leaflet, and Tailwind CSS v4. It features a tactile field journal design, real-time mechanical chronometer, interactive optical collimator simulation, photometric light curves, contact timeline breakdowns, and a global topocentric solver.
2. **A Pure Python Astronomical Engine and CLI**: A calculation module (`eclipse.py`) leveraging Skyfield and the NASA JPL DE421 ephemeris, paired with a companion Streamlit and Folium geographic interface (`eclipse_map.py`).

---

## Key Features

- **Topocentric Ephemeris Calculations**: Computes exact contact times (C1 first contact, C2 totality ingress, Maximum Eclipse, C3 totality egress, C4 fourth contact) for any geographic coordinate on Earth.
- **Interactive Cartographic Map**: Custom Leaflet map with CartoDB dark matter tiles, hand-rendered 290 km umbral corridor polygon, oxblood centerline with 15-minute time tick marks, region presets (Corridor Arc, Iceland, Iberian Path, Greatest Peak), and custom brass reticle crosshairs.
- **Animated Optical Collimator Scope**: High-precision SVG simulation rendering topocentric solar-lunar limb geometry, solar limb darkening, chromatic aberration corona effects during totality, Baily's beads along the lunar limb, background starfield, and an interactive playback scrubber (10x, 60x, 240x speeds).
- **Mechanical Countdown Chronometer**: Header plaque with corner rivets and old-style numerals calculating the exact time remaining until greatest eclipse (12 August 2026, 17:46:00 UTC).
- **Photometric Light Curves**: Obscuration-versus-time sparklines generated from 61 discrete temporal samples across the event window.
- **Geographic Station Catalog and Gazetteer**: Pre-calibrated database of major expedition cities across Iceland, Spain, Greenland, Svalbard, and Europe, with integrated OpenStreetMap Nominatim search for arbitrary location geocoding.
- **Astronomical Treatise Modal**: In-app viewer and export utility for inspecting underlying Python scripts and manifests (`eclipse.py`, `eclipse_map.py`, `requirements.txt`).

---

## Tech Stack

### Web Application (Frontend)

- **Runtime and Framework**: React 19.2.6, TypeScript 5.9.3
- **Bundler and Build Tool**: Vite 7.3.2, `@vitejs/plugin-react` 5.1.1, `vite-plugin-singlefile` 2.3.0
- **Styling and Typography**: Tailwind CSS 4.1.17, `@tailwindcss/vite`, Fraunces, JetBrains Mono, EB Garamond, IM Fell English, IM Fell DW Pica, Special Elite, Caveat, Homemade Apple
- **Mapping Engine**: Leaflet 1.9.4, React-Leaflet 5.0.0
- **Utility Libraries**: `clsx` 2.1.1, `tailwind-merge` 3.4.0

### Python Astrodynamics Suite (Backend / CLI)

- **Astrodynamics and Ephemeris**: Skyfield 1.49+, `skyfield-data` 6.0+, NASA JPL DE421 ephemeris (`de421.bsp`)
- **Scientific Computing**: NumPy 1.26+, SciPy
- **GIS and Mapping**: Folium 0.16+, Streamlit-Folium 0.20+, GeoPy 2.4+, TimezoneFinder 6.5+
- **Interactive App and CLI**: Streamlit 1.36+, Rich 13.7+

---

## System Architecture

### Directory Structure

```
interactive-eclipse-web-map/
|-- eclipse.py                 # Pure Python astronomical engine and CLI (Skyfield + DE421)
|-- eclipse_map.py             # Streamlit + Folium interactive map interface
|-- index.html                 # Web application HTML5 shell with Google Font imports
|-- package.json               # Node.js dependencies, scripts, and package metadata
|-- package-lock.json          # Deterministic Node dependency lockfile
|-- requirements.txt           # Python dependency requirements
|-- tsconfig.json              # TypeScript compilation configuration
|-- vite.config.ts             # Vite build pipeline, Tailwind v4 plugin, SingleFile setup
|-- src/
    |-- App.tsx                # Root React component, layout, header chronometer, modals
    |-- main.tsx               # DOM entry point and React root rendering
    |-- index.css              # Design tokens, vintage textures, brass bezels, map styles
    |-- vite-env.d.ts          # Vite client type declarations and raw asset imports
    |-- components/
    |   |-- CodePanel.tsx      # Modal viewer for raw ephemeris scripts and export actions
    |   |-- MapPanel.tsx       # Leaflet map container, centerline, corridor, reticle marker
    |   |-- Sidebar.tsx        # Observation locus card, contacts, circumstances, logbook
    |   |-- Visuals.tsx        # Optical Collimator Eyepiece (SVG) & Photometric Light Curve
    |   |-- icons/
    |   |   |-- index.tsx      # Hand-crafted SVG astronomical and navigational glyphs
    |   |-- ui/
    |       |-- DataRow.tsx    # Monospaced tabular parameter presentation component
    |-- lib/
    |   |-- astro.ts           # Pure astronomy mathematics (Meeus ELP-2000/82, solar theory)
    |   |-- eclipse.ts         # Eclipse solver, contact root finding, caching, cities data
    |-- utils/
        |-- cn.ts              # Class name concatenation utility (clsx + twMerge)
```

### Dual-Engine Model

The project provides parity between browser-based calculations and server/CLI-based calculations:

1. **TypeScript Engine (`src/lib/astro.ts` and `src/lib/eclipse.ts`)**:
   - Zero-dependency, pure mathematical implementation.
   - Runs client-side at 60 FPS without network calls.
   - Uses Jean Meeus ELP-2000/82 lunar theory and low-precision solar theory with nutation and aberration corrections.
   - Accuracy matches published NASA Besselian contact times to within several seconds.

2. **Python Engine (`eclipse.py`)**:
   - Uses Skyfield to evaluate the official NASA/JPL DE421 ephemeris (`de421.bsp`).
   - Uses WGS84 ellipsoidal Earth coordinates for topocentric observer vectors.
   - Designed as a pure library module with no UI coupling.

### Astrodynamics and Mathematical Algorithms

#### 1. Julian Ephemeris Date and Time Correction
The ephemeris epoch conversion accounts for the Earth's rotational deceleration:
```
JD_UT = (Epoch_ms / 86,400,000) + 2,440,587.5
Delta_T (TT - UT1) = 69.5 seconds (for epoch August 2026)
JDE = JD_UT + (Delta_T / 86,400)
```

#### 2. Topocentric Observer Vector
An observer at latitude `phi`, longitude `lambda`, and elevation is converted to an equatorial geocentric position vector:
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
The geocentric coordinates of the Sun and Moon are corrected by subtracting the observer's position vector, yielding topocentric vectors `S` and `M`:
```
d_Sun  = ||S||,  d_Moon = ||M||
r_Sun  = asin(R_SUN_KM / d_Sun)
r_Moon = asin(R_MOON_KM / d_Moon)
sep    = acos((S . M) / (d_Sun * d_Moon))
```

#### 4. Solar Disk Obscuration Integral
The fraction of the solar disk area covered by the lunar disk is computed via circular intersection geometry:
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

#### 5. Contact Finding via Numerical Root Solving
- **Coarse Scan**: 1-minute step scan between 14:30 UTC and 21:30 UTC to locate minimum separation `t_approx`.
- **Ternary Search**: 40-iteration ternary search on `sep(t)` to pinpoint exact maximum eclipse `t_max` to sub-second precision.
- **Bisection Search (Contacts C1 and C4)**: Root finding for `f(t) = sep(t) - (r_Sun(t) + r_Moon(t)) = 0`.
- **Bisection Search (Totality C2 and C3)**: Root finding for `g(t) = sep(t) - (r_Moon(t) - r_Sun(t)) = 0`.

### Data Flow Diagram

```
[User Map Click / City Selection / Search]
                 |
                 v
   [Latitude & Longitude Coordinates]
                 |
                 v
       [cachedEclipse(lat, lon)]
                 |
                 v
       [computeEclipse(lat, lon)]
        |-- 1. Coarse Step Scan (1-min)
        |-- 2. Ternary Search for Minimum Separation
        |-- 3. Bisection for C1, C2, C3, C4
        |-- 4. 61-Point Obscuration Profile Sampling
                 |
                 v
         [EclipseResult Object]
        /        |          \
       v         v           v
[Sidebar UI] [Collimator] [Photometric Chart]
 - Circumstances  - Realtime SVG Disk   - SVG Sparkline
 - Contact List   - Limb Darkening      - Ingress / Egress
 - Station Log    - Baily's Beads       - Peak Marker
```

---

## Prerequisites

### For the Web Application

- **Node.js**: Version 20.0.0 or higher (Node 22 LTS recommended)
- **npm**: Version 10.0.0 or higher (or `pnpm` / `yarn`)

### For the Python Engine and Map

- **Python**: Version 3.10, 3.11, or 3.12
- **pip**: Current package installer

---

## Getting Started

### 1. Web Application (React + Vite)

#### Clone and Install Dependencies

```bash
git clone https://github.com/user/interactive-eclipse-web-map.git
cd interactive-eclipse-web-map
npm install
```

#### Start Local Development Server

```bash
npm run dev
```

The Vite development server will start at:
```
http://localhost:5173/
```

#### Build for Production

```bash
npm run build
```

This generates an optimized, self-contained single-file bundle in `dist/index.html`.

#### Preview Production Build Locally

```bash
npm run preview
```

---

### 2. Python Astrodynamics Engine and Streamlit Map

#### Set Up a Virtual Environment

```bash
# On Linux / macOS:
python3 -m venv .venv
source .venv/bin/activate

# On Windows (PowerShell):
python -m venv .venv
.venv\Scripts\Activate.ps1
```

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Run the Command-Line Ephemeris Calculator

Calculate eclipse circumstances for a specific city:
```bash
python eclipse.py --city Reykjavik
python eclipse.py --city "A Coruna"
python eclipse.py --city Zaragoza
```

Calculate eclipse circumstances for arbitrary coordinates (`LAT` `LON`):
```bash
# Reykjavik, Iceland (64.147 N, 21.943 W)
python eclipse.py 64.1466 -21.9426

# Madrid, Spain (40.417 N, 3.704 W)
python eclipse.py 40.4168 -3.7038

# Peak Totality Point in North Atlantic (65.200 N, 25.200 W)
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

#### Launch the Streamlit Interactive Map

```bash
streamlit run eclipse_map.py
```

The application will open in your browser at:
```
http://localhost:8501
```

---

## Component Breakdown

### Web Frontend Components

| File Path | Description |
| :--- | :--- |
| `src/App.tsx` | Main application shell. Manages top-level state (`selected`, `flyTarget`, `showCode`, `sidebarOpen`), responsive layout, and the header countdown chronometer. |
| `src/components/MapPanel.tsx` | Interactive Leaflet canvas. Draws the 290 km umbral corridor polygon, the centerline polyline, 15-minute centerline time ticks, featured city markers, custom telescope reticle marker, and the cartographic legend HUD. |
| `src/components/Sidebar.tsx` | Observation station details. Displays the pinned observation locus note, live status banner, contact times timeline, circumstances table, and filterable expedition station logbook. Includes OpenStreetMap Nominatim search. |
| `src/components/Visuals.tsx` | Houses `EclipseSim` (SVG optical collimator with limb darkening, corona filters, Baily's beads, time scrubber, and speed controls) and `ObscurationChart` (SVG photometric light curve). |
| `src/components/CodePanel.tsx` | Modal overlay that renders syntax-highlighted source code for `eclipse.py`, `eclipse_map.py`, and `requirements.txt` with a direct file download mechanism. |
| `src/components/ui/DataRow.tsx` | Reusable data presentation component for displaying labels, monospaced values, units, and annotations. |
| `src/components/icons/index.tsx` | SVG glyph definitions for the astrolabe, compass rose, eclipse seals, sun, moon, totality, partial phases, search, and controls. |

### Mathematical Libraries

| File Path | Description |
| :--- | :--- |
| `src/lib/astro.ts` | Mathematical astronomy module. Implements Julian date calculations, nutation series, Meeus ELP-2000/82 lunar theory, low-precision solar theory, apparent Greenwich Sidereal Time (GAST), observer geocentric vectors, and topocentric angular separation. |
| `src/lib/eclipse.ts` | Eclipse orchestration module. Implements coarse scanning, ternary search for maximum separation, bisection for contact times C1-C4, totality duration calculation, LRU calculation caching, and duration formatting helpers. |
| `src/utils/cn.ts` | Utility helper combining `clsx` and `tailwind-merge` for class name composition. |

### Python Scripts

| File Path | Description |
| :--- | :--- |
| `eclipse.py` | Standalone Python module. Loads the JPL DE421 ephemeris via Skyfield and exposes `compute_eclipse(lat, lon)` and a CLI command interface with `argparse`. |
| `eclipse_map.py` | Web UI combining Streamlit and Folium Leaflet maps. Plots the centerline, city markers, geocoded searches, and sidebar contact metrics. |

---

## Available Scripts and Commands

### Node.js / NPM Scripts

| Command | Action | Output / Target |
| :--- | :--- | :--- |
| `npm run dev` | Starts Vite local development server with Hot Module Replacement (HMR). | `http://localhost:5173` |
| `npm run build` | Compiles TypeScript and packages a single self-contained HTML bundle using `vite-plugin-singlefile`. | `dist/index.html` |
| `npm run preview` | Spins up a local HTTP server to preview the built assets in `dist/`. | `http://localhost:4173` |

### Python Commands

| Command | Action | Description |
| :--- | :--- | :--- |
| `python eclipse.py LAT LON` | Evaluates local eclipse circumstances. | Prints topocentric contacts, altitude, magnitude, and totality duration. |
| `python eclipse.py --city <name>` | Evaluates circumstances for a named city. | Looks up coordinates from built-in city registry (`Reykjavik`, `Bilbao`, `Palma`, etc.). |
| `streamlit run eclipse_map.py` | Launches the Streamlit Web UI. | Opens interactive Folium map on `http://localhost:8501`. |

---

## Verification and Testing

### Testing Astronomical Calculations

To verify that the TypeScript engine produces identical results to the NASA JPL DE421 ephemeris:

1. **Test Target 1: Reykjavik, Iceland (`64.147 N`, `-21.943 W`)**
   - Python Engine: Totality starts ~17:48:12 UTC, ends ~17:49:13 UTC (Duration: 61s). Maximum altitude ~23.8 deg.
   - TypeScript Engine: Totality duration: 1m 01s. Peak obscuration: 100.0%.
2. **Test Target 2: Greatest Eclipse Point (`65.200 N`, `-25.200 W`)**
   - Totality Duration: 2m 18s (138 seconds). Maximum altitude ~25.4 deg.
3. **Test Target 3: Madrid, Spain (`40.417 N`, `-3.704 W`)**
   - Deep partial eclipse: ~99.8% max obscuration, magnitude ~0.998. Solar altitude at maximum: ~8.2 deg (near western horizon).
4. **Test Target 4: London, UK (`51.507 N`, `-0.128 W`)**
   - Partial eclipse: ~90.8% max obscuration.

### Testing Frontend Build Integrity

Execute the production build to ensure TypeScript types and asset pipelines pass:

```bash
npm run build
```

Expected output:
- `dist/index.html` generated without compilation errors or missing dependencies.

---

## Deployment

### Production Web Build (Vite Single-File Bundle)

The web application is configured with `vite-plugin-singlefile`, which bundles all HTML, JavaScript, CSS, SVGs, and fonts into a single portable `dist/index.html` file.

```bash
npm run build
```

The resulting `dist/index.html` can be served directly from:
- GitHub Pages
- Cloudflare Pages
- Netlify / Vercel
- AWS S3 / CloudFront
- Any static web server (Nginx, Caddy, Apache)

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

    gzip on;
    gzip_types text/html text/css application/javascript image/svg+xml;
}
```

---

### Docker Containerization

#### Web Application Container

Create a `Dockerfile` in the root:

```dockerfile
# Step 1: Build the Single-File Bundle
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Step 2: Serve with Nginx Alpine
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t celestial-atlas-web .
docker run -d -p 8080:80 --name celestial-atlas celestial-atlas-web
```

#### Streamlit Python Map Container

Create a `Dockerfile.streamlit`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY eclipse.py eclipse_map.py ./
EXPOSE 8501
CMD ["streamlit", "run", "eclipse_map.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

Build and run:
```bash
docker build -f Dockerfile.streamlit -t eclipse-streamlit .
docker run -d -p 8501:8501 --name eclipse-map-app eclipse-streamlit
```

---

### Streamlit Cloud Deployment

1. Push this repository to GitHub.
2. Log in to [Streamlit Community Cloud](https://share.streamlit.io/).
3. Select **New App**, choose your repository and branch.
4. Set **Main file path** to `eclipse_map.py`.
5. Deploy. Streamlit will automatically read `requirements.txt` and download the necessary ephemeris data on startup.

---

## Troubleshooting

### Web App Issues

#### 1. Blank Map or Leaflet Tile Rendering Failure
- **Cause**: Network restriction or Content Security Policy blocking CartoDB CDN tiles.
- **Solution**: Ensure outbound HTTPS requests to `https://*.basemaps.cartocdn.com` and `https://*.openstreetmap.org` are permitted.

#### 2. OpenStreetMap Nominatim Geocoding Rate Limits
- **Cause**: Excessive search queries trigger Nominatim's public rate limit (1 request per second).
- **Solution**: The search box has debounce protection. If a lookup fails, choose an observation station directly from the built-in Expedition Logbook or click on the map.

#### 3. Font Display Fallbacks
- **Cause**: Custom Google Fonts (EB Garamond, IM Fell English, Special Elite) blocked by offline environment.
- **Solution**: The CSS design system includes fallback font families (`Georgia`, `serif`, `monospace`) to ensure layout stability without external assets.

---

### Python Engine Issues

#### 1. Skyfield BSP Download Timeout
- **Symptom**: `urllib.error.URLError` when loading `de421.bsp`.
- **Cause**: First-time execution downloads the 16 MB NASA JPL DE421 ephemeris file to `~/.skyfield-data`.
- **Solution**: Ensure internet access on initial run. Alternatively, pre-download `de421.bsp` from the Skyfield data repository and place it in `~/.skyfield-data/`.

#### 2. TimezoneFinder Dependency Error
- **Symptom**: `local_time` defaults to UTC instead of regional zone.
- **Cause**: Optional C extensions for `timezonefinder` failed to compile.
- **Solution**: Run `pip install --upgrade timezonefinder`. If running on minimal Alpine Linux, install `gcc` and `musl-dev`.

---

## Astronomical Constants and Ephemeris References

- **Solar Radius ($R_\odot$)**: $696,000\text{ km}$
- **Lunar Radius ($R_M$)**: $1,737.4\text{ km}$
- **Earth Equatorial Radius ($a$)**: $6,378.137\text{ km}$ (WGS84 ellipsoid)
- **Earth Flattening Factor ($f$)**: $1 / 298.257223563$
- **Astronomical Unit ($\text{AU}$)**: $149,597,870.7\text{ km}$
- **$\Delta T$ Prediction ($TT - UT1$)**: $69.5\text{ seconds}$ (August 2026 epoch)
- **Saros Series**: Solar Saros 126 (Member 48 of 72)
- **Greatest Eclipse Instant**: 12 August 2026 at 17:46:00 UTC
- **Coordinates of Greatest Eclipse**: $65.2^\circ\text{ N}, 25.2^\circ\text{ W}$ (off the western coast of Iceland)
- **Maximum Totality Duration**: $2\text{ minutes } 18\text{ seconds}$

---

## License

This project is licensed under the MIT License. You are free to use, modify, and distribute this software for educational, astronomical, and commercial applications.
