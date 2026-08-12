import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Panel({ children, className = "", elevated = false }: PanelProps) {
  return (
    <div
      className={`rounded-lg border border-white/[0.08] bg-[#0e1017] ${
        elevated ? "shadow-[0_12px_40px_rgba(0,0,0,0.6)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

