import type { ReactNode } from "react";

interface DataRowProps {
  label: string;
  value: ReactNode;
  unit?: string;
  subValue?: string;
  mono?: boolean;
  border?: boolean;
  highlight?: boolean;
  ornament?: string;
}

export function DataRow({
  label,
  value,
  unit,
  subValue,
  mono = true,
  border = true,
  highlight = false,
  ornament,
}: DataRowProps) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1.5 ${
        border ? "border-b border-dashed border-[#8a734b]/25" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {ornament && (
          <span className="text-[9px] text-[#c4a35a] opacity-85">{ornament}</span>
        )}
        <span className="text-[12.5px] font-serif text-[#a69885] truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 text-right shrink-0">
        <span
          className={`text-[12.5px] ${
            highlight
              ? "font-bold text-[#ebd08b] drop-shadow-[0_0_4px_rgba(196,163,90,0.3)]"
              : "text-[#f5eedf]"
          } ${mono ? "font-typewriter typewriter-ink tabular-nums text-[12px]" : "font-serif"}`}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[9px] text-[#8a734b] font-medium uppercase tracking-wider">
            {unit}
          </span>
        )}
        {subValue && (
          <span className="font-script text-[12px] text-[#8a734b] ml-1 -rotate-1">
            ({subValue})
          </span>
        )}
      </div>
    </div>
  );
}
