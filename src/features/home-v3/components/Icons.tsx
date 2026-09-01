import type { CSSProperties } from "react";

/**
 * The header's three marks, drawn the way the reference draws them: a solid
 * glyph with a white outline around it (`paint-order: stroke` puts the
 * stroke behind the fill, so the outline grows outward and the shape keeps
 * its measured size).
 */
const outlined: CSSProperties = { paintOrder: "stroke" };

/** 18 × 24. Grey when the streak is cold — the reference's state at 0. */
export function FlameIcon({ lit = false }: { lit?: boolean }) {
  return (
    <svg width="17" height="23" viewBox="-2 -2 22 28" aria-hidden>
      <path
        d="M9 0c.4 4.2-2.2 6.4-4.4 9.1C2.9 11.2 1.5 13.4 1.5 16a7.5 7.5 0 0 0 15 0c0-2.8-1.4-5-2.6-6.6-.5 1.2-1.3 2.2-2.4 2.9.2-2.9-.3-6.7-2.5-12.3Z"
        fill={lit ? "#ee7a3a" : "#898989"}
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinejoin="round"
        style={outlined}
      />
      <path
        d="M9 12.4c.2 2.2-1.6 3.1-2.6 4.6-.6.9-.9 1.7-.9 2.6a3.5 3.5 0 0 0 7 0c0-1.5-.9-2.7-1.7-3.9-.4.6-1 1.2-1.8 1.4.2-1.4 0-3-.0-4.7Z"
        fill={lit ? "#ffb15c" : "#b9b9b9"}
      />
    </svg>
  );
}

/** 24 × 20. */
export function HeartIcon() {
  return (
    <svg width="23" height="19" viewBox="-2 -2 28 24" aria-hidden>
      <path
        d="M12 19.5C7.3 15.7 1 11.3 1 6.2A5.2 5.2 0 0 1 12 3.6 5.2 5.2 0 0 1 23 6.2c0 5.1-6.3 9.5-11 13.3Z"
        fill="#c64b44"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinejoin="round"
        style={outlined}
      />
    </svg>
  );
}

/** 21 × 21, navy with the same white halo. */
export function SearchIcon({ color = "#21324c" }: { color?: string }) {
  return (
    <svg width="21" height="21" viewBox="-2 -2 25 25" aria-hidden>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8.5" cy="8.5" r="6" stroke="#ffffff" strokeWidth="6.6" />
        <path d="M13.5 13.5 19.5 19.5" stroke="#ffffff" strokeWidth="7.2" />
        <circle cx="8.5" cy="8.5" r="6" stroke={color} strokeWidth="3.6" />
        <path d="M13.5 13.5 19.5 19.5" stroke={color} strokeWidth="4.2" />
      </g>
    </svg>
  );
}

/** The thin arrow the reference puts before "View collection" and after "View". */
export function ArrowRightIcon({ size = 24, color = "currentColor", strokeWidth = 2 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The heavy chevron on the detail page. */
export function ChevronLeftIcon({ color = "#1f1f1f" }: { color?: string }) {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden>
      <path d="M11 2 3 10l8 8" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
