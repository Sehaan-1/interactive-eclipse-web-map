import { useEffect, useMemo, useRef, useState } from "react";
import { geometryAt } from "../lib/astro";
import { fmtUTC, type EclipseResult } from "../lib/eclipse";
import { PlayIcon, PauseIcon } from "./icons";

// Deterministic pseudorandom generator for celestial starfield
function pseudoRandom(seed: number) {
  let s = Math.sin(seed) * 10000;
  return s - Math.floor(s);
}

/** Animated optical collimator: the Moon's disk crossing the Sun for the chosen spot. */
export function EclipseSim({ res }: { res: EclipseResult }) {
  const start = res.startUTC ?? res.maxUTC ?? 0;
  const end = res.endUTC ?? res.maxUTC ?? 0;
  const maxTime = res.maxUTC ?? start;
  const [t, setT] = useState(maxTime);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(60); // 60x real time default
  const raf = useRef<number | null>(null);

  useEffect(() => {
    setT(res.maxUTC ?? start);
    setPlaying(false);
  }, [res.lat, res.lon, res.maxUTC, start]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      setT((prev) => {
        const next = prev + dt * speed;
        if (next >= end) {
          setPlaying(false);
          return end;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, end, speed]);

  const g = useMemo(() => geometryAt(t, res.lat, res.lon), [t, res.lat, res.lon]);

  const S = 140; // svg half-size
  const scale = 44 / g.rSun; // px per degree
  const rSun = g.rSun * scale;
  const rMoon = g.rMoon * scale;
  const d = g.sep * scale;
  const pa = (g.posAngle - 90) * (Math.PI / 180);
  const mx = S + d * Math.cos(pa);
  const my = S + d * Math.sin(pa);
  const totalNow = g.sep <= g.rMoon - g.rSun;
  const showBeads = !totalNow && g.obscuration > 0.88;

  // Generate 24 deterministic stars based on coordinates
  const stars = useMemo(() => {
    const seed = Math.abs(res.lat * 100 + res.lon);
    return Array.from({ length: 24 }).map((_, i) => ({
      x: 22 + pseudoRandom(seed + i * 11) * (S * 2 - 44),
      y: 22 + pseudoRandom(seed + i * 17) * (S * 2 - 44),
      r: 0.6 + pseudoRandom(seed + i * 23) * 0.8,
      opacity: 0.2 + pseudoRandom(seed + i * 31) * 0.6,
    }));
  }, [res.lat, res.lon]);

  // Generate Baily's beads angles along the lunar limb
  const beads = useMemo(() => {
    if (!showBeads) return [];
    const beadCount = 7;
    return Array.from({ length: beadCount }).map((_, i) => {
      const angle = pa + Math.PI + (i - beadCount / 2) * 0.1;
      return {
        cx: mx + rMoon * Math.cos(angle),
        cy: my + rMoon * Math.sin(angle),
      };
    });
  }, [showBeads, mx, my, rMoon, pa]);

  // Contact phase markers on timeline
  const phasePoints = useMemo(() => {
    const totalDuration = Math.max(1, end - start);
    const getPercent = (time?: number) => {
      if (!time) return null;
      return Math.min(100, Math.max(0, ((time - start) / totalDuration) * 100));
    };

    return [
      { name: "I", pct: 0, label: "First Contact (C1)" },
      ...(res.inTotality && res.totalityStartUTC
        ? [{ name: "II", pct: getPercent(res.totalityStartUTC), label: "Totality Ingress (C2)" }]
        : []),
      ...(res.maxUTC
        ? [{ name: "MAX", pct: getPercent(res.maxUTC), label: "Maximum Obscuration" }]
        : []),
      ...(res.inTotality && res.totalityEndUTC
        ? [{ name: "III", pct: getPercent(res.totalityEndUTC), label: "Totality Egress (C3)" }]
        : []),
      { name: "IV", pct: 100, label: "Fourth Contact (C4)" },
    ];
  }, [start, end, res.inTotality, res.totalityStartUTC, res.totalityEndUTC, res.maxUTC]);

  const progressPercent = end > start ? Math.min(100, Math.max(0, ((t - start) / (end - start)) * 100)) : 0;

  // Generate circular engraved degree tick marks (every 10 deg, longer at 30 deg)
  const dialTicks = useMemo(() => {
    const ticks = [];
    for (let deg = 0; deg < 360; deg += 10) {
      const rad = (deg - 90) * (Math.PI / 180);
      const isMajor = deg % 30 === 0;
      const isCard = deg % 90 === 0;
      const rOuter = S - 4;
      const rInner = isCard ? S - 12 : isMajor ? S - 9 : S - 6;
      ticks.push({
        deg,
        x1: S + rOuter * Math.cos(rad),
        y1: S + rOuter * Math.sin(rad),
        x2: S + rInner * Math.cos(rad),
        y2: S + rInner * Math.sin(rad),
        isMajor,
        isCard,
      });
    }
    return ticks;
  }, []);

  return (
    <div className="rounded-[4px] border border-[#8a734b]/35 bg-[#171513] p-3.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.85)]">
      {/* Reticle Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[#ebd08b] text-xs">✦</span>
          <span className="font-display text-[11px] font-bold tracking-[0.14em] text-[#ebd08b] uppercase">
            OPTICAL COLLIMATOR EYEPIECE
          </span>
        </div>
        <div className="font-typewriter text-[11px] text-[#a69885]">
          {g.altitude > 0 ? (
            <span>
              ALT: <span className="text-[#f5eedf] font-semibold">{g.altitude.toFixed(1)}°</span>
            </span>
          ) : (
            <span className="text-[#b84323] font-serif italic">Sub-horizon ({g.altitude.toFixed(1)}°)</span>
          )}
        </div>
      </div>

      {/* Optical Reticle Scope with Heavy Tarnished Brass Ring */}
      <div className="relative mx-auto flex items-center justify-center py-1">
        <svg viewBox={`0 0 ${S * 2} ${S * 2}`} className="h-56 w-56 overflow-visible select-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)]">
          <defs>
            {/* Tarnished Brass Eyepiece Ring Gradient */}
            <radialGradient id="brassEyepieceRing" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#fae4a8" />
              <stop offset="25%" stopColor="#d4af37" />
              <stop offset="60%" stopColor="#8a734b" />
              <stop offset="85%" stopColor="#544327" />
              <stop offset="100%" stopColor="#241c10" />
            </radialGradient>

            {/* Brass Inset Bezel */}
            <radialGradient id="brassInnerBezel" cx="65%" cy="65%">
              <stop offset="0%" stopColor="#241c10" />
              <stop offset="70%" stopColor="#5c4b2e" />
              <stop offset="100%" stopColor="#caa457" />
            </radialGradient>

            {/* Chromatic aberration multi-stop corona for realistic 19th-century totality glow */}
            <radialGradient id="chromaticCoronaOuter" cx="50%" cy="50%">
              <stop offset="28%" stopColor="#e8b96b" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#b84323" stopOpacity="0.22" />
              <stop offset="65%" stopColor="#487294" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0a0908" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="chromaticCoronaInner" cx="50%" cy="50%">
              <stop offset="38%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#fff8db" stopOpacity="0.85" />
              <stop offset="65%" stopColor="#f3d489" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#b84323" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#e8b96b" stopOpacity="0" />
            </radialGradient>
            
            {/* Solar photosphere with limb darkening */}
            <radialGradient id="photosphereLimb" cx="44%" cy="40%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#fff9e6" />
              <stop offset="80%" stopColor="#ffd269" />
              <stop offset="96%" stopColor="#e27c1d" />
              <stop offset="100%" stopColor="#872909" />
            </radialGradient>

            {/* Deep optical barrel vignette */}
            <radialGradient id="barrelVignette" cx="50%" cy="50%">
              <stop offset="65%" stopColor="#0a0908" stopOpacity="0" />
              <stop offset="88%" stopColor="#0a0908" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
            </radialGradient>

            {/* Optical lens glare highlight */}
            <linearGradient id="lensReflection" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <filter id="opticalGlow" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <clipPath id="eyepieceClip">
              <circle cx={S} cy={S} r={S - 14} />
            </clipPath>
          </defs>

          {/* Heavy Tarnished Brass Outer Ring */}
          <circle
            cx={S}
            cy={S}
            r={S - 1}
            fill="url(#brassEyepieceRing)"
            stroke="#241c10"
            strokeWidth="1.5"
          />

          {/* Brass Inner Rim / Knurled Track */}
          <circle
            cx={S}
            cy={S}
            r={S - 5}
            fill="none"
            stroke="#17120a"
            strokeWidth="1"
          />
          <circle
            cx={S}
            cy={S}
            r={S - 13}
            fill="#100e0c"
            stroke="#8a734b"
            strokeWidth="1"
          />

          {/* Engraved Dial Tick Marks */}
          {dialTicks.map((tk) => (
            <line
              key={tk.deg}
              x1={tk.x1}
              y1={tk.y1}
              x2={tk.x2}
              y2={tk.y2}
              stroke={tk.isCard ? "#fae4a8" : tk.isMajor ? "#ebd08b" : "rgba(196,163,90,0.4)"}
              strokeWidth={tk.isCard ? 1.25 : tk.isMajor ? 0.9 : 0.6}
            />
          ))}

          {/* Optical Interior */}
          <g clipPath="url(#eyepieceClip)">
            {/* Dark Celestial Sky Void */}
            <circle cx={S} cy={S} r={S - 14} fill="#080706" />

            {/* Background Starfield */}
            {stars.map((s, idx) => (
              <circle
                key={idx}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#f5eedf"
                opacity={totalNow ? s.opacity * 2.2 : s.opacity * 0.35}
              />
            ))}

            {/* Hairline Observatory Reticle Crosshairs */}
            <line
              x1={S}
              y1={16}
              x2={S}
              y2={S * 2 - 16}
              stroke="rgba(196,163,90,0.18)"
              strokeWidth="0.75"
              strokeDasharray="3 3"
            />
            <line
              x1={16}
              y1={S}
              x2={S * 2 - 16}
              y2={S}
              stroke="rgba(196,163,90,0.18)"
              strokeWidth="0.75"
              strokeDasharray="3 3"
            />

            {/* Micrometer target ring */}
            <circle
              cx={S}
              cy={S}
              r={16}
              fill="none"
              stroke="rgba(196,163,90,0.22)"
              strokeWidth="0.75"
              strokeDasharray="1 3"
            />

            {/* Totality Chromatic Corona Layers */}
            {totalNow && (
              <>
                <circle cx={S} cy={S} r={rSun * 3.5} fill="url(#chromaticCoronaOuter)" />
                <circle
                  cx={S}
                  cy={S}
                  r={rSun * 2.3}
                  fill="url(#chromaticCoronaInner)"
                  filter="url(#opticalGlow)"
                />
              </>
            )}

            {/* Solar Photosphere */}
            <circle
              cx={S}
              cy={S}
              r={rSun}
              fill="url(#photosphereLimb)"
              filter={!totalNow && g.obscuration > 0.6 ? "drop-shadow(0 0 10px rgba(250,228,168,0.6))" : undefined}
            />

            {/* Lunar Occulting Disk */}
            <circle
              cx={mx}
              cy={my}
              r={rMoon}
              fill="#060505"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.8"
            />

            {/* Baily's Beads */}
            {showBeads &&
              beads.map((b, i) => (
                <circle
                  key={i}
                  cx={b.cx}
                  cy={b.cy}
                  r={1.35}
                  fill="#ffffff"
                  filter="drop-shadow(0 0 3px #fae4a8)"
                />
              ))}

            {/* Lens Reflection Glass Sheen */}
            <circle cx={S} cy={S} r={S - 14} fill="url(#lensReflection)" pointerEvents="none" />

            {/* Barrel Vignette */}
            <circle cx={S} cy={S} r={S - 14} fill="url(#barrelVignette)" pointerEvents="none" />
          </g>

          {/* Azimuth Compass Points on Brass Rim */}
          <text x={S} y={23} textAnchor="middle" className="font-display text-[8px] font-bold fill-[#fae4a8]">N</text>
          <text x={S * 2 - 20} y={S + 3} textAnchor="middle" className="font-display text-[8px] font-bold fill-[#fae4a8]">E</text>
          <text x={S} y={S * 2 - 16} textAnchor="middle" className="font-display text-[8px] font-bold fill-[#fae4a8]">S</text>
          <text x={20} y={S + 3} textAnchor="middle" className="font-display text-[8px] font-bold fill-[#fae4a8]">W</text>

          {/* Realtime Status Badge in Scope */}
          <g transform={`translate(${S}, 48)`}>
            <rect
              x="-54"
              y="-10"
              width="108"
              height="18"
              rx="2"
              fill="#141210"
              fillOpacity="0.9"
              stroke="#8a734b"
              strokeWidth="0.8"
            />
            <text
              x="0"
              y="2.5"
              textAnchor="middle"
              className="font-display text-[9.5px] font-bold tracking-wider"
              fill={totalNow ? "#ebd08b" : "#f5eedf"}
            >
              {totalNow ? "100.0% TOTALITY" : `${(g.obscuration * 100).toFixed(1)}% OCCULTED`}
            </text>
          </g>
        </svg>
      </div>

      {/* Scrubber Timeline with Contact Phase Notches */}
      <div className="mt-2.5 space-y-2">
        <div className="relative pt-1">
          {/* Phase notch flags */}
          <div className="relative h-4 w-full">
            {phasePoints.map(
              (p, idx) =>
                p.pct !== null && (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      const target =
                        p.name === "I"
                          ? start
                          : p.name === "IV"
                          ? end
                          : p.name === "II"
                          ? res.totalityStartUTC!
                          : p.name === "III"
                          ? res.totalityEndUTC!
                          : res.maxUTC!;
                      setT(target);
                    }}
                    style={{ left: `${p.pct}%` }}
                    title={`${p.name}: ${p.label}`}
                    className="group absolute top-0 -translate-x-1/2 flex flex-col items-center cursor-pointer"
                  >
                    <span className="font-chrono text-[9px] font-bold text-[#8a734b] transition-colors group-hover:text-[#ebd08b]">
                      {p.name}
                    </span>
                    <span className="size-1 rounded-full bg-[#8a734b]/60 group-hover:bg-[#ebd08b]" />
                  </button>
                )
            )}
          </div>

          {/* Interactive Range Scrubber */}
          <input
            type="range"
            min={start}
            max={end}
            step={1000}
            value={t}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            className="astro-scrubber w-full"
          />
        </div>

        {/* Chronological Readout & Mechanical Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (t >= end) setT(start);
                setPlaying((p) => !p);
              }}
              className="btn-brass-primary h-7 px-2.5 text-[11px]"
            >
              {playing ? <PauseIcon size={11} /> : <PlayIcon size={11} />}
              <span className="ml-1 font-display tracking-wider">{playing ? "Halt" : "Track"}</span>
            </button>

            <button
              onClick={() => {
                setPlaying(false);
                setT(maxTime);
              }}
              className="btn-brass-secondary h-7 px-2 font-display font-semibold text-[10px]"
              title="Jump to Maximum Occultation"
            >
              MAX
            </button>

            {/* Speed Multiplier Pill */}
            <div className="flex rounded-[3px] border border-[#8a734b]/30 bg-[#12100e] p-0.5 text-[9.5px] font-display shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              {[10, 60, 240].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-1.5 py-0.5 rounded-[2px] transition-colors ${
                    speed === s
                      ? "bg-[#c4a35a] text-[#12100e] font-bold"
                      : "text-[#a69885] hover:text-[#f5eedf]"
                  }`}
                >
                  {s === 10 ? "10×" : s === 60 ? "60×" : "240×"}
                </button>
              ))}
            </div>
          </div>

          <div className="text-right">
            <div className="font-typewriter text-[12px] font-bold text-[#f5eedf] tabular-nums">
              {fmtUTC(Math.round(t / 1000) * 1000)}
            </div>
            <div className="font-script text-[12px] text-[#c4a35a] -rotate-1">
              {progressPercent.toFixed(0)}% Occultation Cycle
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Obscuration versus time sparkline with peak indicator and phase brackets. */
export function ObscurationChart({ res }: { res: EclipseResult }) {
  if (!res.profile.length) return null;
  const W = 290;
  const H = 56;

  let maxIdx = 0;
  let maxVal = -1;

  const pts = res.profile.map((p, i) => {
    if (p.obs > maxVal) {
      maxVal = p.obs;
      maxIdx = i;
    }
    const x = (i / (res.profile.length - 1)) * W;
    const y = H - p.obs * (H - 12) - 4;
    return { x, y, str: `${x.toFixed(1)},${y.toFixed(1)}` };
  });

  const maxPt = pts[maxIdx];

  return (
    <div className="rounded-[4px] border border-[#8a734b]/30 bg-[#161412] p-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-[9.5px] font-semibold tracking-[0.16em] text-[#ebd08b] uppercase flex items-center gap-1">
          <span>✦</span>
          <span>PHOTOMETRIC LIGHT CURVE</span>
        </span>
        <span className="font-typewriter text-[11px] font-bold text-[#ebd08b]">
          {(res.maxObscuration * 100).toFixed(1)}% PEAK
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full overflow-visible">
        <defs>
          <linearGradient id="curveSepiaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ebd08b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8a734b" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Baseline Hand-Drawn Axis */}
        <line
          x1={0}
          y1={H - 4}
          x2={W}
          y2={H - 4}
          stroke="rgba(196,163,90,0.25)"
          strokeWidth={0.8}
        />

        {/* Fill */}
        <polygon
          points={`0,${H - 4} ${pts.map((p) => p.str).join(" ")} ${W},${H - 4}`}
          fill="url(#curveSepiaGradient)"
        />

        {/* Stroke */}
        <polyline
          points={pts.map((p) => p.str).join(" ")}
          fill="none"
          stroke="#c4a35a"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Max eclipse indicator */}
        {maxPt && (
          <>
            <line
              x1={maxPt.x}
              y1={maxPt.y}
              x2={maxPt.x}
              y2={H - 4}
              stroke="#ebd08b"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.8}
            />
            <circle
              cx={maxPt.x}
              cy={maxPt.y}
              r={2.5}
              fill="#ebd08b"
              stroke="#12100e"
              strokeWidth={1}
            />
          </>
        )}
      </svg>

      <div className="mt-1 flex justify-between font-typewriter text-[9.5px] text-[#8a734b]">
        <span>Ingress I: {fmtUTC(res.startUTC)}</span>
        <span>Egress IV: {fmtUTC(res.endUTC)}</span>
      </div>
    </div>
  );
}
