import { useState } from "react";
import enginePy from "../../eclipse.py?raw";
import mapPy from "../../eclipse_map.py?raw";
import requirements from "../../requirements.txt?raw";
import { DownloadIcon, CloseIcon, AstrolabeIcon } from "./icons";

const FILES = [
  {
    name: "eclipse.py",
    blurb: "Astronomical engine — pure Skyfield / JPL DE421 ephemeris, zero UI dependencies.",
    src: enginePy,
  },
  {
    name: "eclipse_map.py",
    blurb: "Streamlit + Folium interface glue — thin rendering wrapper.",
    src: mapPy,
  },
  {
    name: "requirements.txt",
    blurb: "Python dependency manifest for deployment.",
    src: requirements,
  },
];

function formatLine(line: string) {
  if (/^\s*#/.test(line) || /^\s*"""/.test(line)) {
    return <span className="text-[#8a734b] font-serif italic">{line}</span>;
  }
  if (/\b(def|class|import|from|return|if|else|elif|for|in|while|as|with)\b/.test(line)) {
    return <span className="text-[#ebd08b] font-semibold">{line}</span>;
  }
  return <span className="text-[#f5eedf]">{line}</span>;
}

export default function CodePanel({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(0);
  const file = FILES[active];

  function download() {
    const blob = new Blob([file.src], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#0a0908]/90 p-4 backdrop-blur-md">
      <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[4px] border border-[#8a734b]/40 bg-[#1a1714] shadow-[0_24px_70px_rgba(0,0,0,0.95)]">
        {/* Modal Header / Treatise Folio Title */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#8a734b]/30 bg-[#221e1a] px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 mr-2">
            <AstrolabeIcon size={18} className="text-[#ebd08b]" />
            <span className="font-display text-[12.5px] font-bold text-[#ebd08b] uppercase tracking-[0.16em] hidden sm:inline">
              ASTRONOMICAL EPHEMERIS FOLIO
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {FILES.map((f, i) => (
              <button
                key={f.name}
                onClick={() => setActive(i)}
                className={`map-view-tab px-3 py-1 font-typewriter text-[11px] ${
                  i === active ? "active !bg-[#c4a35a] !text-[#12100e] font-bold" : ""
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <span className="ml-3 hidden text-xs font-serif italic text-[#a69885] lg:inline truncate max-w-sm">
            {file.blurb}
          </span>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              onClick={download}
              className="btn-brass-primary flex items-center gap-1.5 px-3 py-1 text-[11px]"
            >
              <DownloadIcon size={12} />
              <span>Export Script</span>
            </button>
            <button
              onClick={onClose}
              className="btn-brass-secondary size-7 !p-0"
              aria-label="Close folio"
            >
              <CloseIcon size={13} />
            </button>
          </div>
        </div>

        {/* Code Content in IBM Plex / JetBrains Mono */}
        <div className="flex-1 overflow-auto bg-[#100e0c] p-4">
          <pre
            className="font-mono text-[12px]"
            style={{
              lineHeight: 1.75,
              fontVariantLigatures: "none",
            }}
          >
            {file.src.split("\n").map((line, i) => (
              <div key={i} className="whitespace-pre flex">
                <span className="mr-5 inline-block w-8 select-none text-right font-mono text-[11px] text-[#4d4031] opacity-75">
                  {i + 1}
                </span>
                <span className="flex-1">{formatLine(line)}</span>
              </div>
            ))}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#8a734b]/25 bg-[#171513] px-4 py-2 text-xs text-[#a69885]">
          <span className="font-typewriter text-[11px] text-[#ebd08b]">{file.name}</span>
          <span className="font-serif italic text-[12px]">
            {file.src.split("\n").length} lines · Mathematical Tractate UTF-8
          </span>
        </div>
      </div>
    </div>
  );
}
