import { useEffect, useMemo, useState } from "react";
import MapPanel, { type Selection } from "./components/MapPanel";
import Sidebar from "./components/Sidebar";
import CodePanel from "./components/CodePanel";
import {
  MenuIcon,
  CloseIcon,
  EclipseIcon,
  AstrolabeIcon,
} from "./components/icons";
import { GREATEST_ECLIPSE_UTC } from "./lib/eclipse";

function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    const delta = GREATEST_ECLIPSE_UTC - now;
    if (delta <= 0) return { done: true, parts: null };
    const s = Math.floor(delta / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return {
      done: false,
      parts: { days, hours, mins, secs },
    };
  }, [now]);
}

function Wordmark() {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Antique Wax Seal & Compass Emblem */}
      <div className="relative size-9 shrink-0 flex items-center justify-center rounded-full border border-[#c4a35a]/50 bg-[#1c1815] shadow-[0_2px_6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(235,208,139,0.3)]">
        <div className="absolute inset-0.5 rounded-full border border-dashed border-[#8a734b]/40 pointer-events-none" />
        <EclipseIcon size={20} className="text-[#ebd08b] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
        <span className="absolute -top-1 -right-1 text-[7px] text-[#ebd08b]">✦</span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h1 className="font-display font-bold text-[16px] sm:text-[18px] tracking-[0.06em] text-[#f5eedf] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            TOTAL SOLAR ECLIPSE ATLAS
          </h1>
          <span className="hidden sm:inline-block font-serif italic text-[11.5px] text-[#8a734b]">
            · Folio No. 128
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="font-mono text-[9px] text-[#c4a35a] tracking-[0.16em] uppercase font-semibold">
            12 AUGUST 2026
          </span>
          <span className="text-[#8a734b] text-[9px]">|</span>
          <span className="font-script text-[13px] text-[#dfd4be] -rotate-1 hidden sm:inline">
            Umbral Corridor & Topocentric Ephemeris
          </span>
        </div>
      </div>
    </div>
  );
}

/** Heavy Brushed Brass Chronometer Plate with Engraved Bevel & Rivets */
function CountdownPlaque() {
  const { done, parts } = useCountdown();
  if (done) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs text-[#a69885] brass-chrono-plate px-3.5 py-1.5 shadow-xl">
        <span className="inline-block size-2 rounded-full bg-[#4a8264] shadow-[0_0_8px_#4a8264]" />
        <span className="font-display uppercase tracking-wider text-[#f5eedf]">Occultation Completed</span>
      </div>
    );
  }
  return (
    <div className="brass-chrono-plate relative flex items-center gap-2 px-3 py-1 select-none">
      {/* Four Heavy Brass Corner Screws */}
      <div className="absolute top-1 left-1 brass-screw" />
      <div className="absolute top-1 right-1 brass-screw" />
      <div className="absolute bottom-1 left-1 brass-screw" />
      <div className="absolute bottom-1 right-1 brass-screw" />

      {/* Chronometer Label */}
      <div className="flex flex-col items-center pl-1.5 pr-0.5">
        <span className="font-display font-bold text-[8.5px] tracking-[0.18em] text-[#ebd08b] uppercase leading-none">
          CHRONO
        </span>
        <span className="font-script text-[12px] text-[#c4a35a] leading-none mt-0.5">
          T-minus
        </span>
      </div>

      {/* Digits in IM Fell DW Pica SC / Alegreya SC with Old-Style Figures */}
      <div className="flex items-center gap-1 font-chrono text-[#f5eedf]">
        <ClockDigit value={parts!.days} label="DAYS" />
        <span className="text-[#8a734b] font-display text-[12px] font-bold pb-2">:</span>
        <ClockDigit value={parts!.hours} label="HRS" />
        <span className="text-[#8a734b] font-display text-[12px] font-bold pb-2">:</span>
        <ClockDigit value={parts!.mins} label="MIN" />
        <span className="text-[#8a734b] font-display text-[12px] font-bold pb-2">:</span>
        <ClockDigit value={parts!.secs} label="SEC" pulse />
      </div>
    </div>
  );
}

function ClockDigit({
  value,
  label,
  pulse = false,
}: {
  value: number;
  label: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="brass-chrono-digit min-w-[28px] text-center">
        <span
          className={`font-chrono text-[15px] font-bold tabular-nums leading-none ${
            pulse ? "text-[#ebd08b]" : "text-[#f5eedf]"
          }`}
        >
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-[7.5px] font-display tracking-widest text-[#a69885] uppercase mt-0.5 font-semibold">
        {label}
      </span>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState<Selection | null>({
    lat: 64.147,
    lon: -21.943,
    label: "Reykjavík, Iceland",
  });
  const [flyTarget, setFlyTarget] = useState<Selection | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function pick(lat: number, lon: number, label?: string) {
    const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
    const sel: Selection = {
      lat: Math.round(lat * 1000) / 1000,
      lon: Math.round(wrapped * 1000) / 1000,
      label: label ?? `Observation Locus (${lat.toFixed(3)}°, ${wrapped.toFixed(3)}°)`,
    };
    setSelected(sel);
    if (label) setFlyTarget(sel);
    setSidebarOpen(true);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#12100e] text-[#e6dcce]">
      {/* Authentic Tactile Atlas Grain Overlay */}
      <div className="atlas-grain" />

      {/* 19th-Century Observatory Header Bar */}
      <header className="z-20 flex flex-wrap items-center justify-between border-b border-[#8a734b]/35 bg-[#1a1714] px-4 py-2 shadow-[0_4px_18px_rgba(0,0,0,0.75)]">
        <Wordmark />

        <div className="hidden md:flex flex-1 justify-center px-4">
          <CountdownPlaque />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCode(true)}
            className="btn-leather-tab"
            title="Inspect Astronomical Ephemeris Mathematical Folio"
          >
            <AstrolabeIcon size={14} className="text-[#ebd08b]" />
            <span className="hidden sm:inline font-display tracking-wider font-semibold">Ephemeris Folio</span>
            <span className="sm:hidden font-display">Folio</span>
          </button>

          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="btn-brass-secondary size-8 !p-0 lg:hidden"
            aria-label={sidebarOpen ? "Close panel" : "Open observation details"}
          >
            {sidebarOpen ? <CloseIcon size={14} /> : <MenuIcon size={14} />}
          </button>
        </div>

        {/* Mobile Countdown row */}
        <div className="md:hidden w-full flex justify-center pt-2 mt-2 border-t border-[#8a734b]/20">
          <CountdownPlaque />
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar Instrument Panel (Brass Bezel & Leather/Paper Finish) */}
        <aside
          className={`absolute inset-y-0 left-0 z-[1500] w-[400px] max-w-[94vw] brass-bezel-sidebar transition-transform duration-300 ease-out lg:static lg:z-auto lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar selected={selected} onPick={pick} />
        </aside>

        {/* Hero Interactive Atlas Map */}
        <main className="relative min-w-0 flex-1 bg-[#12100e]">
          <MapPanel selected={selected} flyTarget={flyTarget} onPick={pick} />
        </main>
      </div>

      {showCode && <CodePanel onClose={() => setShowCode(false)} />}
    </div>
  );
}
