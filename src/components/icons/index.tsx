import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.35,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Vintage Astronomical Sun Glyph (☉) */
export function SunIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M12 2v2.5M12 19.5v2.5M2 12h2.5M19.5 12h2.5M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

/** Engraved Crescent Moon Glyph (☽) */
export function MoonIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

/** Vintage Total Occultation Seal / Eclipse Emblem */
export function EclipseIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeDasharray="1.5 2.5" />
      <circle cx="12" cy="12" r="7.5" fill="#141210" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 4.5a7.5 7.5 0 0 0 0 15 5.5 5.5 0 0 1 0-15z" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="#c4a35a" />
    </svg>
  );
}

/** Astronomical Totality Glyph with Corona Rays */
export function TotalityIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeDasharray="2 2" opacity="0.8" />
      <circle cx="12" cy="12" r="5.5" fill="currentColor" />
      <path d="M12 1v2M12 21v2M1 12h2M21 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" opacity="0.5" />
    </svg>
  );
}

/** Partial Solar Occultation Ring */
export function PartialIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" />
      <path d="M12 4a8 8 0 0 1 0 16 6 6 0 0 0 0-16z" fill="currentColor" />
    </svg>
  );
}

export function SearchIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export function PlayIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <polygon points="7 4 19 12 7 20 7 4" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}

export function PauseIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <rect x="6" y="4" width="3.5" height="16" rx="0.5" fill="currentColor" stroke="currentColor" />
      <rect x="14.5" y="4" width="3.5" height="16" rx="0.5" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}

export function DownloadIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
    </svg>
  );
}

export function CloseIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function PinIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

/** Astrolabe / Armillary Reticle */
export function ReticleIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" strokeDasharray="2 2" />
      <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function AlertIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <polygon points="12 2 22 20 2 20 12 2" />
      <path d="M12 9v5M12 17v.5" />
    </svg>
  );
}

export function ClockIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function CodeIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

export function MenuIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function GlobeIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18" />
    </svg>
  );
}

/** 16-Point Cartographic Compass Rose */
export function CompassIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1" />
      <polygon points="12 3 14 10 12 12 10 10" fill="currentColor" />
      <polygon points="12 21 14 14 12 12 10 14" fill="currentColor" opacity="0.4" />
      <polygon points="21 12 14 14 12 12 14 10" fill="currentColor" />
      <polygon points="3 12 10 14 12 12 10 10" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/** Astrolabe / Armillary Sphere */
export function AstrolabeIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Quill / Field Journal Icon */
export function QuillIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base} width={size} height={size} {...rest}>
      <path d="M20.24 3.76a6 6 0 0 0-8.49 0L3 12.5V17h4.5l8.74-8.74a6 6 0 0 0 0-8.5z" />
      <path d="M16 8 2 22" />
      <path d="M17.5 15H9" />
    </svg>
  );
}
