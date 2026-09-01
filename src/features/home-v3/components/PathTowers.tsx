/**
 * The little route in the corner of a path card: two tower markers on
 * isometric discs, joined by a dashed trail that runs on off the card's
 * bottom edge. 134 × 152 in the reference; drawn in the card's own hue so
 * the same art serves every path.
 */
export function PathTowers({ color }: { color: string }) {
  return (
    <svg width="134" height="152" viewBox="0 0 134 152" aria-hidden style={{ display: "block" }}>
      <defs>
        <clipPath id="v3-towers-clip">
          <rect width="134" height="152" />
        </clipPath>
      </defs>
      <g clipPath="url(#v3-towers-clip)">
        {/* The trail */}
        <path
          d="M104 42 C 70 70, 54 78, 42 112"
          fill="none"
          stroke={color}
          strokeOpacity="0.45"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="9 11"
        />
        <path
          d="M40 122 C 34 140, 44 150, 60 158"
          fill="none"
          stroke={color}
          strokeOpacity="0.28"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="9 11"
        />
        <Tower cx={104} cy={40} color={color} />
        <Tower cx={40} cy={118} color={color} />
      </g>
    </svg>
  );
}

function Tower({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`} style={{ color }}>
      {/* Disc: side, then top */}
      <ellipse cx="0" cy="6" rx="26" ry="11" fill="currentColor" style={{ filter: "brightness(0.55)" }} />
      <ellipse cx="0" cy="0" rx="26" ry="11" fill="currentColor" style={{ filter: "brightness(0.8)" }} />
      <ellipse cx="0" cy="0" rx="19" ry="7.5" fill="currentColor" style={{ filter: "brightness(0.66)" }} />
      {/* Body */}
      <rect x="-11" y="-38" width="22" height="40" rx="3" fill="currentColor" style={{ filter: "brightness(0.9)" }} />
      <rect x="1" y="-38" width="10" height="40" rx="3" fill="currentColor" style={{ filter: "brightness(0.72)" }} />
      {/* Crenellations */}
      <rect x="-13" y="-46" width="6" height="10" rx="1.5" fill="currentColor" style={{ filter: "brightness(0.95)" }} />
      <rect x="-3" y="-46" width="6" height="10" rx="1.5" fill="currentColor" style={{ filter: "brightness(0.95)" }} />
      <rect x="7" y="-46" width="6" height="10" rx="1.5" fill="currentColor" style={{ filter: "brightness(0.8)" }} />
      {/* Door */}
      <path d="M-4 0v-9a4 4 0 0 1 8 0v9z" fill="currentColor" style={{ filter: "brightness(0.4)" }} />
    </g>
  );
}
