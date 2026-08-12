import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  CENTERLINE,
  CITIES,
  cachedEclipse,
  fmtUTC,
  formatDuration,
  pathBand,
  statusOf,
} from "../lib/eclipse";

export interface Selection {
  lat: number;
  lon: number;
  label: string;
}

function ClickAndHoverCapture({
  onPick,
  onHover,
}: {
  onPick: (lat: number, lon: number, label?: string) => void;
  onHover: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e) {
      onHover(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ target }: { target: Selection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 5), {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [target?.lat, target?.lon, map]);
  return null;
}

function RegionPresets({
  currentRegion,
  onSelectRegion,
}: {
  currentRegion: string;
  onSelectRegion: (label: string, lat: number, lon: number, zoom: number) => void;
}) {
  const map = useMap();
  const presets = [
    { label: "Corridor Arc", lat: 60, lon: -20, zoom: 3 },
    { label: "Iceland", lat: 64.5, lon: -20, zoom: 6 },
    { label: "Iberian Path", lat: 41.5, lon: -3.5, zoom: 6 },
    { label: "Greatest Peak", lat: 65.2, lon: -25.2, zoom: 5 },
  ];

  return (
    <div className="flex items-center gap-1 rounded-[3px] border border-[#8a734b]/40 bg-[#171513]/95 p-1 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
      <span className="px-1.5 font-display text-[8.5px] uppercase tracking-[0.18em] text-[#ebd08b] flex items-center gap-1 font-semibold">
        <span>VIEWS</span>
        <span className="font-script text-[12px] text-[#c4a35a] lowercase tracking-normal">(atlas):</span>
      </span>
      {presets.map((p) => {
        const isActive = currentRegion === p.label;
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              map.flyTo([p.lat, p.lon], p.zoom, { duration: 1 });
              onSelectRegion(p.label, p.lat, p.lon, p.zoom);
            }}
            className={`map-view-tab px-2.5 py-0.5 font-display text-[10.5px] ${isActive ? "active" : ""}`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// Hand-crafted antique brass telescope reticle DivIcon
const vintageReticleDivIcon = L.divIcon({
  className: "vintage-reticle-container",
  html: `
    <div style="position: relative; width: 44px; height: 44px; transform: translate(-50%, -50%); pointer-events: none;">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Outer knurled brass ring -->
        <circle cx="22" cy="22" r="14" stroke="#c4a35a" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.75" />
        <circle cx="22" cy="22" r="10" stroke="#ebd08b" stroke-width="1.4" fill="#c4a35a" fill-opacity="0.12" />
        <circle cx="22" cy="22" r="2.5" fill="#ebd08b" stroke="#12100e" stroke-width="0.8" />
        
        <!-- Hairline crosshairs with ticks -->
        <line x1="22" y1="2" x2="22" y2="9" stroke="#ebd08b" stroke-width="1.2" stroke-linecap="round" />
        <line x1="22" y1="35" x2="22" y2="42" stroke="#ebd08b" stroke-width="1.2" stroke-linecap="round" />
        <line x1="2" y1="22" x2="9" y2="22" stroke="#ebd08b" stroke-width="1.2" stroke-linecap="round" />
        <line x1="35" y1="22" x2="42" y2="22" stroke="#ebd08b" stroke-width="1.2" stroke-linecap="round" />
        
        <!-- Corner tick accents -->
        <line x1="10" y1="10" x2="13" y2="13" stroke="#8a734b" stroke-width="0.8" />
        <line x1="34" y1="10" x2="31" y2="13" stroke="#8a734b" stroke-width="0.8" />
        <line x1="10" y1="34" x2="13" y2="31" stroke="#8a734b" stroke-width="0.8" />
        <line x1="34" y1="34" x2="31" y2="31" stroke="#8a734b" stroke-width="0.8" />
      </svg>
    </div>
  `,
  iconSize: [0, 0],
});

export default function MapPanel({
  selected,
  flyTarget,
  onPick,
}: {
  selected: Selection | null;
  flyTarget: Selection | null;
  onPick: (lat: number, lon: number, label?: string) => void;
}) {
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [activeRegion, setActiveRegion] = useState("Corridor Arc");
  const band = useMemo(() => pathBand(), []);

  // Compute 15-min interval markers along the centerline
  const centerlineTicks = useMemo(() => {
    const ticks: {
      lat: number;
      lon: number;
      timeStr: string;
      durStr: string;
      isGreatest?: boolean;
    }[] = [];

    for (let i = 0; i < CENTERLINE.length; i += 2) {
      const [lat, lon] = CENTERLINE[i];
      const res = cachedEclipse(lat, lon);
      if (res.inTotality && res.maxUTC) {
        const isGreatest = Math.abs(lat - 65.2) < 1 && Math.abs(lon - -25.2) < 2;
        ticks.push({
          lat,
          lon,
          timeStr: fmtUTC(res.maxUTC),
          durStr: formatDuration(res.totalitySeconds),
          isGreatest,
        });
      }
    }
    return ticks;
  }, []);

  return (
    <div className="relative h-full w-full select-none">
      <MapContainer
        center={[55, -10]}
        zoom={3}
        minZoom={2}
        worldCopyJump
        className="h-full w-full"
        style={{ background: "#12100e" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · 19th-C. Celestial Atlas Tint'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        />

        {/* Path of totality shaded corridor (Deep burnt sienna & oxblood with hand-ruled border) */}
        <Polygon
          positions={band}
          pathOptions={{
            color: "#9c3b1e",
            weight: 1.5,
            opacity: 0.85,
            fillColor: "#631d10",
            fillOpacity: 0.32,
            dashArray: "4 6",
            lineCap: "round",
          }}
        >
          <Tooltip sticky className="font-typewriter text-xs">
            Umbral Totality Corridor (~290 km hand-ruled swath)
          </Tooltip>
        </Polygon>

        {/* Eclipse Centerline - Under-ink halo stroke */}
        <Polyline
          positions={CENTERLINE}
          pathOptions={{
            color: "#631d10",
            weight: 5,
            opacity: 0.45,
            lineCap: "round",
          }}
        />

        {/* Eclipse Centerline - Primary Oxblood Line */}
        <Polyline
          positions={CENTERLINE}
          pathOptions={{
            color: "#9c3b1e",
            weight: 2.2,
            opacity: 0.95,
            lineCap: "round",
          }}
        >
          <Tooltip sticky className="font-typewriter text-xs">
            Centerline of Maximum Totality · 12 August 2026
          </Tooltip>
        </Polyline>

        {/* Centerline Time Ticks with Astronomical Rings */}
        {centerlineTicks.map((tick, idx) => (
          <CircleMarker
            key={`tick-${idx}`}
            center={[tick.lat, tick.lon]}
            radius={tick.isGreatest ? 6 : 3.5}
            pathOptions={{
              color: tick.isGreatest ? "#ebd08b" : "#c4a35a",
              weight: tick.isGreatest ? 2 : 1.25,
              fillColor: tick.isGreatest ? "#9c3b1e" : "#1c1815",
              fillOpacity: 1,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onPick(
                  tick.lat,
                  tick.lon,
                  tick.isGreatest ? "Greatest Eclipse Peak (Locus Maxima)" : `Centerline Meridian (${tick.timeStr})`
                );
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -5]}>
              <div className="font-typewriter text-[11px]">
                <span className="font-display font-bold text-[#ebd08b]">
                  {tick.isGreatest ? "✦ Greatest Eclipse Peak: " : "Centerline: "}
                </span>
                <span className="text-[#f5eedf] font-semibold">{tick.timeStr}</span>
                <div className="font-serif italic text-[#a69885] text-[11px]">
                  Totality duration: {tick.durStr}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Featured Expedition Cities with Antique Astronomical Dots */}
        {CITIES.map((c) => {
          const res = cachedEclipse(c.lat, c.lon);
          const st = statusOf(res);
          const isTotality = res.inTotality;
          const markerColor = isTotality ? "#4a8264" : res.visible ? "#c4a35a" : "#6e6456";

          return (
            <CircleMarker
              key={c.name}
              center={[c.lat, c.lon]}
              radius={isTotality ? 5 : 4}
              pathOptions={{
                color: markerColor,
                weight: 1.5,
                fillColor: isTotality ? "#5ca07b" : "#241e1a",
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  onPick(c.lat, c.lon, `${c.name}, ${c.country}`);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <div className="text-xs">
                  <span className="font-serif font-bold text-[#f5eedf] text-[13.5px]">{c.name}</span>
                  <span className="font-serif italic text-[#8a734b]"> · {c.country}</span>
                  <div className="mt-0.5 font-typewriter text-[11px]" style={{ color: isTotality ? "#5ca07b" : "#c4a35a" }}>
                    {isTotality
                      ? `Totality: ${formatDuration(res.totalitySeconds)}`
                      : res.visible
                      ? `${(res.maxObscuration * 100).toFixed(1)}% partial`
                      : "Nocturnal / below horizon"}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Crosshair Telescope Reticle Marker for Selected Target */}
        {selected && (
          <Marker
            position={[selected.lat, selected.lon]}
            icon={vintageReticleDivIcon}
            interactive={false}
          />
        )}

        <ClickAndHoverCapture
          onPick={onPick}
          onHover={(lat, lon) => setHoverCoords({ lat, lon })}
        />
        <Recenter target={flyTarget} />

        {/* Top-Right Region Presets HUD (Map Index Tabs) */}
        <div className="leaflet-top leaflet-right !p-3">
          <RegionPresets
            currentRegion={activeRegion}
            onSelectRegion={(lbl) => setActiveRegion(lbl)}
          />
        </div>
      </MapContainer>

      {/* Decorative Vintage Compass Rose Watermark in Top-Left */}
      <div className="pointer-events-none absolute top-4 left-4 z-[900] opacity-40 transition-opacity hover:opacity-80">
        <svg width="78" height="78" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#c4a35a" strokeWidth="0.8" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="41" stroke="#8a734b" strokeWidth="0.6" />
          <circle cx="50" cy="50" r="29" stroke="#8a734b" strokeWidth="0.6" strokeDasharray="1 2" />
          {/* 16-point star */}
          <polygon points="50,5 54,42 50,50 46,42" fill="#ebd08b" />
          <polygon points="50,95 54,58 50,50 46,58" fill="#8a734b" />
          <polygon points="95,50 58,54 50,50 58,46" fill="#c4a35a" />
          <polygon points="5,50 42,54 50,50 42,46" fill="#8a734b" />
          <polygon points="82,18 56,44 50,50 44,44" fill="#a68440" opacity="0.65" />
          <polygon points="18,82 44,56 50,50 56,56" fill="#57462c" opacity="0.65" />
          <polygon points="82,82 56,56 50,50 56,44" fill="#57462c" opacity="0.65" />
          <polygon points="18,18 44,44 50,50 44,56" fill="#a68440" opacity="0.65" />
          <circle cx="50" cy="50" r="4" fill="#ebd08b" stroke="#12100e" strokeWidth="1" />
          <text x="50" y="15" textAnchor="middle" fontFamily="'IM Fell English', serif" fontSize="9.5" fontWeight="bold" fill="#fae4a8">N</text>
        </svg>
      </div>

      {/* Cartographic Marginalia Pinned Note (Top Middle / Floating) */}
      <div className="pointer-events-none absolute top-4 left-24 z-[850] hidden xl:block">
        <div className="rounded-[2px] border border-[#8a734b]/30 bg-[#191613]/85 px-2.5 py-1 backdrop-blur-sm -rotate-1 shadow-md">
          <span className="font-script text-[13px] text-[#ebd08b]">
            Plate IV: Arctic & Iberian Umbral Trajectory · Ref. Saros 126
          </span>
        </div>
      </div>

      {/* Cartographic HUD Bar */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-[1000] flex flex-wrap items-end justify-between gap-3 pointer-events-none">
        {/* Left: Folded Paper / Brass Plate Celestial Legend */}
        <div className="pointer-events-auto field-journal-card rounded-[4px] px-3.5 py-2 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.85)] max-w-lg -rotate-[0.3deg]">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-[#ebd08b] flex items-center gap-1.5 hover:text-[#fae4a8]"
            >
              <span>✦ CARTOGRAPHIC LEGEND</span>
              <span className="font-script text-[12px] text-[#c4a35a] lowercase tracking-normal -rotate-1">
                {legendOpen ? "(fold)" : "(unfold)"}
              </span>
            </button>
          </div>

          {legendOpen && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-serif text-[12.5px] text-[#dfd4be] pt-1 border-t border-[#8a734b]/20">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#9c3b1e] border border-[#ebd08b]" />
                <span>Umbral Corridor (~290 km)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#4a8264] border border-[#5ca07b]" />
                <span>100% Totality Station</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#c4a35a] border border-[#8a734b]" />
                <span>&gt;90% Partial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#487294] border border-[#6e6456]" />
                <span>Penumbra</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Surveyor's Registration Stamp (Live Coordinate Cartouche) */}
        <div className="pointer-events-auto surveyor-stamp rounded-[3px] px-3.5 py-1.5 backdrop-blur-md text-[#a69885] shadow-2xl rotate-[0.5deg]">
          <div className="flex items-center gap-2">
            <span className="font-display text-[9px] font-bold text-[#ebd08b] uppercase tracking-[0.16em]">
              SURVEYOR REGISTRY
            </span>
            <span className="text-[#8a734b] text-[9px]">|</span>
            {hoverCoords ? (
              <span className="font-typewriter text-[11px] tabular-nums">
                <span className="text-[#f5eedf] font-semibold">
                  {hoverCoords.lat >= 0 ? `${hoverCoords.lat.toFixed(3)}° N` : `${Math.abs(hoverCoords.lat).toFixed(3)}° S`}
                </span>
                {" · "}
                <span className="text-[#f5eedf] font-semibold">
                  {hoverCoords.lon >= 0 ? `${hoverCoords.lon.toFixed(3)}° E` : `${Math.abs(hoverCoords.lon).toFixed(3)}° W`}
                </span>
              </span>
            ) : (
              <span className="font-script text-[#c4a35a] text-[13.5px]">
                Click coordinates to measure topocentric locus
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
