import { useState } from "react";
import {
  CITIES,
  cachedEclipse,
  fmtLocal,
  fmtSolar,
  fmtUTC,
  formatDuration,
  statusOf,
  type City,
} from "../lib/eclipse";
import { EclipseSim, ObscurationChart } from "./Visuals";
import type { Selection } from "./MapPanel";
import { DataRow } from "./ui/DataRow";
import {
  SearchIcon,
  TotalityIcon,
  PartialIcon,
  AlertIcon,
  MoonIcon,
  AstrolabeIcon,
} from "./icons";

const QUICK_STATIONS = [
  { name: "Reykjavík", country: "Iceland", lat: 64.147, lon: -21.943, rot: "-1.2deg" },
  { name: "A Coruña", country: "Spain", lat: 43.362, lon: -8.411, rot: "0.8deg" },
  { name: "Palma", country: "Spain", lat: 39.569, lon: 2.650, rot: "-0.5deg" },
  { name: "Nuuk", country: "Greenland", lat: 64.175, lon: -51.738, rot: "1.4deg" },
  { name: "Valladolid", country: "Spain", lat: 41.652, lon: -4.724, rot: "-0.7deg" },
];

function SearchBox({
  onPick,
}: {
  onPick: (lat: number, lon: number, label: string) => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setErr(null);
    const local = CITIES.find((c) =>
      c.name.toLowerCase().startsWith(query.toLowerCase())
    );
    if (local) {
      onPick(local.lat, local.lon, `${local.name}, ${local.country}`);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          query
        )}`,
        { headers: { Accept: "application/json" } }
      );
      const j = (await r.json()) as {
        lat: string;
        lon: string;
        display_name: string;
      }[];
      if (!j.length) setErr("Coordinates not resolved for this query.");
      else {
        const parts = j[0].display_name.split(",");
        const label = parts.slice(0, Math.min(2, parts.length)).join(",").trim();
        onPick(
          parseFloat(j[0].lat),
          parseFloat(j[0].lon),
          label
        );
      }
    } catch {
      setErr("Gazetteer lookup offline — choose from station catalog.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2.5 border-b border-[#8a734b]/30 p-3.5 bg-[#1a1714] shadow-[inset_0_-1px_0_rgba(0,0,0,0.6)]">
      <form onSubmit={search} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              id="search-station"
              name="search-station"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search station, port, coordinate or island…"
              className="w-full rounded-[3px] border border-[#8a734b]/40 bg-[#12100e] py-1.5 pr-2.5 pl-8 font-typewriter text-[11.5px] text-[#f5eedf] placeholder-[#6e6456] shadow-[inset_0_1px_3px_rgba(0,0,0,0.85)] focus:border-[#c4a35a] focus:outline-none focus:ring-1 focus:ring-[#c4a35a]"
            />
            <SearchIcon
              size={13}
              className="pointer-events-none text-[#8a734b] absolute left-2.5 top-1/2 -translate-y-1/2"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="btn-brass-primary h-8 px-3 text-[11px]"
          >
            {busy ? "…" : "Locate"}
          </button>
        </div>
        {err && (
          <p className="flex items-center gap-1 font-typewriter text-[10px] text-[#b84323] pt-0.5">
            <AlertIcon size={11} />
            <span>{err}</span>
          </p>
        )}
      </form>

      {/* Stamped paper specimen tags at irregular natural angles */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="font-display text-[9px] uppercase tracking-[0.14em] text-[#8a734b] mr-0.5 flex items-center gap-1">
          <span>STATIONS</span>
          <span className="font-script text-[13px] text-[#c4a35a] lowercase tracking-normal">(tags):</span>
        </span>
        {QUICK_STATIONS.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onPick(s.lat, s.lon, `${s.name}, ${s.country}`)}
            style={{ transform: `rotate(${s.rot})` }}
            className="tag-parchment rounded-[2px] px-2 py-0.5 font-typewriter text-[10px] text-[#dfd4be] transition-transform hover:z-10 hover:scale-105"
            title={`${s.name}, ${s.country}`}
          >
            <span className="text-[#8a734b] mr-1 text-[8.5px]">✦</span>
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({
  selected,
  onPick,
}: {
  selected: Selection | null;
  onPick: (lat: number, lon: number, label?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"totality" | "all">("totality");
  const res = selected ? cachedEclipse(selected.lat, selected.lon) : null;
  const st = res ? statusOf(res) : null;

  const totalityCities = CITIES.filter((c) => {
    const r = cachedEclipse(c.lat, c.lon);
    return r.inTotality;
  });

  const displayCities = activeTab === "totality" ? totalityCities : CITIES;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#1c1917] text-[#e6dcce]">
      <SearchBox onPick={onPick} />

      {!selected || !res || !st ? (
        <div className="p-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-[#8a734b]/40 bg-[#141210] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <AstrolabeIcon size={22} className="text-[#ebd08b]" />
          </div>
          <span className="font-display text-[9px] uppercase tracking-[0.2em] text-[#ebd08b] font-semibold">
            ✦ CELESTIAL TARGETING ✦
          </span>
          <h2 className="mt-1 font-display text-xl font-bold text-[#f5eedf]">
            Select an Observation Station
          </h2>
          <p className="mt-2 text-[13px] font-serif italic leading-relaxed text-[#a69885]">
            Click any coordinate along Earth's globe or choose from the expedition logbook below to compute topocentric solar occultation circumstances.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Observation Locus Block (Styled as Pinned Field Note with Archival Tape & Rotation) */}
          <div className="p-3.5 bg-[#171513]">
            <div className="field-journal-card relative rounded-[3px] p-4 shadow-xl -rotate-[0.4deg] transition-transform hover:rotate-0">
              {/* Archival mounting tape at top corner */}
              <div className="archival-tape archival-tape-top-left" />
              <div className="brass-tack top-2 right-2" />

              <div className="flex items-center justify-between font-display text-[9.5px] tracking-wider text-[#ebd08b] uppercase">
                <div className="flex items-center gap-1.5">
                  <span>☉</span>
                  <span className="font-bold tracking-[0.16em]">OBSERVATION LOCUS</span>
                </div>
                <span className="font-typewriter text-[10px] text-[#a69885] font-semibold">
                  {selected.lat >= 0 ? `${selected.lat.toFixed(3)}°N` : `${Math.abs(selected.lat).toFixed(3)}°S`}
                  {" · "}
                  {selected.lon >= 0 ? `${selected.lon.toFixed(3)}°E` : `${Math.abs(selected.lon).toFixed(3)}°W`}
                </span>
              </div>

              <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-[#f5eedf] leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {selected.label}
              </h2>

              {/* Handwritten Field Note Margin */}
              <div className="mt-1 flex items-center gap-2">
                <span className="font-script text-[14px] text-[#c4a35a] -rotate-1">
                  Target verified for Topocentric Parallax (12 Aug 2026)
                </span>
              </div>

              {/* Status Callout Banner */}
              <div className="mt-3">
                {!res.anyContact || !res.visible ? (
                  <div className="rounded-[3px] border border-[#9c3b1e]/50 bg-[#9c3b1e]/15 p-2.5 text-[#ebd08b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-2">
                      <MoonIcon size={15} className="shrink-0 text-[#9c3b1e]" />
                      <span className="font-serif text-[12.5px] italic text-[#dfd4be]">
                        {res.anyContact
                          ? "Sun below horizon at maximum contact (Nocturnal occultation)."
                          : "Locus outside umbral and penumbral track."}
                      </span>
                    </div>
                  </div>
                ) : res.inTotality ? (
                  <div className="rounded-[3px] border-2 border-dashed border-[#4a8264]/70 bg-[#4a8264]/15 p-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TotalityIcon size={19} className="text-[#5ca07b] shrink-0" />
                        <div>
                          <div className="font-display text-[12px] font-bold text-[#5ca07b] tracking-wider uppercase">
                            TOTAL ECLIPSE OCCURRING
                          </div>
                          <div className="font-serif italic text-[11.5px] text-[#a69885]">
                            Umbral totality corridor · 100% occultation
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-typewriter">
                        <span className="text-[14px] font-bold text-[#ebd08b] drop-shadow-[0_0_6px_rgba(196,163,90,0.4)]">
                          {formatDuration(res.totalitySeconds)}
                        </span>
                        <span className="block text-[8.5px] text-[#8a734b] uppercase tracking-wider font-semibold font-display">
                          Duration
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[3px] border border-[#c4a35a]/50 bg-[#c4a35a]/10 p-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PartialIcon size={17} className="text-[#c4a35a] shrink-0" />
                        <div>
                          <div className="font-display text-[12px] font-bold text-[#c4a35a] tracking-wider uppercase">
                            {(res.maxObscuration * 100).toFixed(1)}% PARTIAL OCCULTATION
                          </div>
                          <div className="font-serif italic text-[11.5px] text-[#a69885]">
                            Penumbral shadow corridor
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-typewriter">
                        <span className="text-[13px] font-bold text-[#f5eedf]">
                          mag {res.magnitude.toFixed(3)}
                        </span>
                        <span className="block text-[8.5px] text-[#8a734b] uppercase tracking-wider font-semibold font-display">
                          Magnitude
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Occultation Collimator Scope */}
          {res.anyContact && (
            <div className="border-b border-[#8a734b]/25 p-3.5 bg-[#171513]/90">
              <EclipseSim res={res} />
            </div>
          )}

          {/* Contact Chronology Timeline (Ruled Field Journal) */}
          {res.anyContact && (
            <div className="border-b border-[#8a734b]/25 p-4 bg-[#201c19]">
              <div className="mb-3 flex items-center justify-between font-display text-[9.5px] tracking-[0.16em] text-[#ebd08b] uppercase font-semibold">
                <div className="flex items-center gap-1.5">
                  <span>✦ 01 //</span>
                  <span>CHRONOLOGY OF CONTACTS</span>
                </div>
                <span className="font-script text-[13px] text-[#c4a35a] lowercase tracking-normal -rotate-1">
                  utc ephemeris
                </span>
              </div>

              <div className="relative pl-3.5 space-y-2.5 border-l-2 border-[#8a734b]/35 ml-2">
                {/* C1 Contact */}
                <div className="relative flex items-center justify-between text-xs">
                  <span className="absolute -left-[19px] size-2 rounded-full border-2 border-[#201c19] bg-[#c4a35a]" />
                  <div>
                    <span className="font-chrono font-bold text-[#f5eedf] text-[13px]">I (C₁)</span>
                    <span className="ml-1.5 font-serif italic text-[11.5px] text-[#a69885]">First Contact (Ingress)</span>
                  </div>
                  <span className="font-typewriter text-[12px] font-medium text-[#f5eedf]">
                    {fmtUTC(res.startUTC)}
                  </span>
                </div>

                {/* C2 Contact (if in totality) */}
                {res.inTotality && (
                  <div className="relative flex items-center justify-between text-xs">
                    <span className="absolute -left-[19px] size-2 rounded-full border-2 border-[#201c19] bg-[#4a8264]" />
                    <div>
                      <span className="font-chrono font-bold text-[#5ca07b] text-[13px]">II (C₂)</span>
                      <span className="ml-1.5 font-serif italic text-[11.5px] text-[#a69885]">Totality Begins</span>
                    </div>
                    <span className="font-typewriter text-[12px] font-semibold text-[#5ca07b]">
                      {fmtUTC(res.totalityStartUTC)}
                    </span>
                  </div>
                )}

                {/* MAX Eclipse */}
                <div className="relative flex items-center justify-between text-xs py-0.5">
                  <span className="absolute -left-[20px] size-2.5 rounded-full border-2 border-[#201c19] bg-[#ebd08b] shadow-[0_0_8px_#c4a35a]" />
                  <div>
                    <span className="font-display font-bold text-[#ebd08b]">MAX</span>
                    <span className="ml-1.5 font-serif font-medium text-[12px] text-[#f5eedf]">
                      {res.inTotality ? "Greatest Totality" : "Maximum Occultation"}
                    </span>
                  </div>
                  <span className="font-typewriter text-[13px] font-bold text-[#ebd08b]">
                    {fmtUTC(res.maxUTC)}
                  </span>
                </div>

                {/* C3 Contact (if in totality) */}
                {res.inTotality && (
                  <div className="relative flex items-center justify-between text-xs">
                    <span className="absolute -left-[19px] size-2 rounded-full border-2 border-[#201c19] bg-[#4a8264]" />
                    <div>
                      <span className="font-chrono font-bold text-[#5ca07b] text-[13px]">III (C₃)</span>
                      <span className="ml-1.5 font-serif italic text-[11.5px] text-[#a69885]">Totality Ends</span>
                    </div>
                    <span className="font-typewriter text-[12px] font-semibold text-[#5ca07b]">
                      {fmtUTC(res.totalityEndUTC)}
                    </span>
                  </div>
                )}

                {/* C4 Contact */}
                <div className="relative flex items-center justify-between text-xs">
                  <span className="absolute -left-[19px] size-2 rounded-full border-2 border-[#201c19] bg-[#c4a35a]" />
                  <div>
                    <span className="font-chrono font-bold text-[#f5eedf] text-[13px]">IV (C₄)</span>
                    <span className="ml-1.5 font-serif italic text-[11.5px] text-[#a69885]">Fourth Contact (Egress)</span>
                  </div>
                  <span className="font-typewriter text-[12px] font-medium text-[#f5eedf]">
                    {fmtUTC(res.endUTC)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-dashed border-[#8a734b]/20 flex items-center justify-between font-script text-[12.5px] text-[#8a734b]">
                <span>* Optical filtration recommended at all partial stages</span>
                <span>(Fig. 1)</span>
              </div>
            </div>
          )}

          {/* Ephemeris Circumstances Table */}
          {res.anyContact && (
            <div className="border-b border-[#8a734b]/25 p-4 bg-[#1a1714]">
              <div className="mb-2.5 flex items-center justify-between font-display text-[9.5px] tracking-[0.16em] text-[#ebd08b] uppercase font-semibold">
                <div className="flex items-center gap-1.5">
                  <span>✦ 02 //</span>
                  <span>EXPEDITION FIELD CIRCUMSTANCES</span>
                </div>
                <span className="font-script text-[13px] text-[#c4a35a] lowercase tracking-normal -rotate-1">
                  topocentric
                </span>
              </div>

              <div className="space-y-0.5">
                <DataRow
                  ornament="☉"
                  label="Maximum Obscuration"
                  value={`${(res.maxObscuration * 100).toFixed(2)}%`}
                  highlight
                />
                <DataRow
                  ornament="☽"
                  label="Eclipse Magnitude"
                  value={res.magnitude.toFixed(4)}
                />
                {res.inTotality && (
                  <DataRow
                    ornament="⏱"
                    label="Totality Duration"
                    value={formatDuration(res.totalitySeconds)}
                    highlight
                  />
                )}
                <DataRow
                  ornament="∡"
                  label="Solar Altitude at Peak"
                  value={`${res.sunAltitude.toFixed(1)}°`}
                  subValue={res.sunAltitude > 10 ? "Clear Horizon" : "Low Horizon"}
                />
                <DataRow
                  ornament="🧭"
                  label="Solar Azimuth Angle"
                  value={`${res.sunAzimuth.toFixed(1)}°`}
                  unit={res.sunAzimuth > 180 ? "WSW" : "ESE"}
                />
                <DataRow
                  ornament="⌛"
                  label="Local Solar Apparent Time"
                  value={fmtSolar(res.maxUTC, res.lon)}
                  unit="LST"
                />
                <DataRow
                  ornament="⌚"
                  label="Observer Standard Time"
                  value={fmtLocal(res.maxUTC)}
                  border={false}
                />
              </div>
            </div>
          )}

          {/* Photometric Light Curve */}
          {res.anyContact && (
            <div className="border-b border-[#8a734b]/25 p-4 bg-[#181513]">
              <ObscurationChart res={res} />
            </div>
          )}
        </div>
      )}

      {/* Expedition Station Catalog (Logbook) */}
      <div className="p-4 bg-[#1c1917]">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-display text-[9.5px] font-semibold tracking-[0.16em] text-[#ebd08b] uppercase flex items-center gap-1.5">
            <span>✦ 03 //</span>
            <span>EXPEDITION LOGBOOK</span>
          </span>

          <div className="flex rounded-[3px] border border-[#8a734b]/35 bg-[#12100e] p-0.5 text-[9.5px] font-display shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]">
            <button
              onClick={() => setActiveTab("totality")}
              className={`px-2 py-0.5 rounded-[2px] transition-all ${
                activeTab === "totality"
                  ? "bg-[#c4a35a] text-[#12100e] font-bold shadow-sm"
                  : "text-[#a69885] hover:text-[#f5eedf]"
              }`}
            >
              Totality ({totalityCities.length})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2 py-0.5 rounded-[2px] transition-all ${
                activeTab === "all"
                  ? "bg-[#c4a35a] text-[#12100e] font-bold shadow-sm"
                  : "text-[#a69885] hover:text-[#f5eedf]"
              }`}
            >
              All Loci ({CITIES.length})
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {displayCities.map((c: City) => {
            const r = cachedEclipse(c.lat, c.lon);
            const isSelected =
              selected &&
              Math.abs(selected.lat - c.lat) < 0.05 &&
              Math.abs(selected.lon - c.lon) < 0.05;

            return (
              <button
                key={c.name}
                onClick={() =>
                  onPick(c.lat, c.lon, `${c.name}, ${c.country}`)
                }
                className={`group flex w-full items-center justify-between rounded-[3px] border px-2.5 py-1.5 text-left text-xs transition-all ${
                  isSelected
                    ? "border-[#ebd08b] bg-[#2d251e] text-[#f5eedf] shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                    : "border-[#8a734b]/20 bg-[#161412] text-[#a69885] hover:border-[#8a734b]/50 hover:bg-[#221e1a] hover:text-[#f5eedf]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      r.inTotality
                        ? "bg-[#4a8264] shadow-[0_0_4px_#4a8264]"
                        : r.visible
                        ? "bg-[#c4a35a]"
                        : "bg-[#6e6456]"
                    }`}
                  />
                  <div className="truncate">
                    <span className="font-serif font-medium text-[13.5px] text-[#f5eedf]">{c.name}</span>
                    <span className="font-serif italic text-[11.5px] text-[#8a734b]"> · {c.country}</span>
                  </div>
                </div>

                <div className="font-typewriter text-[10.5px] shrink-0 text-right ml-2">
                  {r.inTotality ? (
                    <span className="font-bold text-[#ebd08b]">
                      {formatDuration(r.totalitySeconds)}
                    </span>
                  ) : r.visible ? (
                    <span className="text-[#c4a35a]">
                      {(r.maxObscuration * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-[#6e6456] italic font-serif">Nocturnal</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ephemeris Provenance Footer */}
      <div className="mt-auto border-t border-[#8a734b]/30 p-3 text-center bg-[#13110f]">
        <p className="font-display text-[9.5px] text-[#8a734b] tracking-wider uppercase font-semibold">
          ✦ JPL DE421 Ephemeris · Besselian Elements · Topocentric Parallax ✦
        </p>
      </div>
    </div>
  );
}
