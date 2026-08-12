import type { ReactNode } from "react";

interface StatProps {
  label: string;
  value: ReactNode;
  subvalue?: ReactNode;
  highlight?: boolean;
}

export function Stat({ label, value, subvalue, highlight = false }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-eyebrow ink-muted uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={`font-display italic text-h1 tracking-tight ${
            highlight ? "text-gold" : "ink"
          }`}
        >
          {value}
        </span>
        {subvalue && (
          <span className="font-mono text-xs ink-subtle">{subvalue}</span>
        )}
      </div>
    </div>
  );
}
