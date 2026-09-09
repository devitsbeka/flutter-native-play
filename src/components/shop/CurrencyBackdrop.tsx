import { useId } from "react";
import { motion } from "framer-motion";

/**
 * The animated scene behind a currency shelf — SVG, moved by framer-motion.
 *
 * The shapes are the shop's own icons redrawn as vectors: icon-coin's tilted
 * gold token, rim and raised inner ring and the little emblem over its
 * lettering; icon-gem's brilliant cut, table and crown and pavilion, lit from
 * the left exactly as the art is. Close enough that the drifting pieces read
 * as more of the same currency rather than as generic decoration.
 *
 * Everything is weighted into the TOP RIGHT. That is the only part of the
 * card with nothing in it — the identity row runs along the top left and the
 * four tiles fill the body — so it is where motion can be lively without
 * ever competing with a price.
 *
 * Not a video, deliberately. The section config carries a `videoSrc` for
 * both shelves and it is a dead end: nothing has ever rendered that field,
 * /videos/gems.mp4 does not exist, and coins.mp4 is 3.5MB — a third of the
 * shop's weight for one background, decoded on a phone, and still running
 * for someone who asked for less motion. This is markup, scales to any card
 * size, and stops when it should.
 *
 * Reduce Motion is free: MotionConfig reducedMotion="user" in App.tsx drops
 * these transforms and leaves the still scene, so there is no guard here.
 *
 * Positions and timings are fixed, not random, so a remount mid-scroll does
 * not reshuffle the scene under the reader.
 */

// Coins rise through the top-right corner. x/y are the 320x200 viewBox.
const COINS = [
  { x: 268, y: 104, r: 15, rise: 92, dur: 9.4, delay: 0.0, spin: 3.6, tilt: -14 },
  { x: 216, y: 118, r: 10, rise: 78, dur: 11.8, delay: 2.2, spin: 4.8, tilt: -22 },
  { x: 302, y: 126, r: 12, rise: 104, dur: 10.6, delay: 4.1, spin: 3.1, tilt: -8 },
  { x: 244, y: 96, r: 8, rise: 70, dur: 13.2, delay: 6.0, spin: 5.4, tilt: -30 },
  { x: 186, y: 88, r: 7, rise: 62, dur: 12.4, delay: 1.2, spin: 4.2, tilt: -18 },
];

// Gems hang in the same corner and turn slowly in place.
const GEMS = [
  { x: 272, y: 44, s: 21, dur: 19, delay: 0.0, dir: 1, drift: 8 },
  { x: 214, y: 74, s: 13, dur: 24, delay: 2.6, dir: -1, drift: 6 },
  { x: 306, y: 96, s: 11, dur: 21, delay: 4.4, dir: 1, drift: 7 },
  { x: 178, y: 34, s: 9, dur: 27, delay: 1.4, dir: -1, drift: 5 },
];

const SPARKLES = [
  { x: 240, y: 26, s: 8, dur: 3.4, delay: 0.0 },
  { x: 300, y: 66, s: 6, dur: 4.2, delay: 1.1 },
  { x: 196, y: 104, s: 7, dur: 4.9, delay: 2.4 },
  { x: 258, y: 88, s: 5, dur: 3.8, delay: 3.3 },
  { x: 314, y: 22, s: 6, dur: 5.4, delay: 1.8 },
];

/** A four-point star with concave sides, so it reads as a glint not a plus. */
function sparklePath(x: number, y: number, s: number) {
  const w = s * 0.32;
  return `M${x} ${y - s} Q${x + w} ${y - w} ${x + s} ${y} Q${x + w} ${y + w} ${x} ${y + s} Q${x - w} ${y + w} ${x - s} ${y} Q${x - w} ${y - w} ${x} ${y - s} Z`;
}

/**
 * icon-gem redrawn: a flat table, a crown flaring to the girdle, a long
 * pavilion to the point — lit from the left, darkest facet on the right.
 * Coordinates are fractions of `s`, the half-width at the girdle.
 */
function Gem({ x, y, s, uid }: { x: number; y: number; s: number; uid: string }) {
  const p = (fx: number, fy: number) => `${x + fx * s} ${y + fy * s}`;
  const TABLE_L = [-0.52, -0.66] as const;
  const TABLE_R = [0.52, -0.66] as const;
  const GIRDLE_L = [-1, -0.2] as const;
  const GIRDLE_R = [1, -0.2] as const;
  const INNER_L = [-0.3, -0.2] as const;
  const INNER_R = [0.3, -0.2] as const;
  const TIP = [0, 1] as const;

  return (
    <g>
      {/* table */}
      <path d={`M${p(...TABLE_L)} L${p(...TABLE_R)} L${p(...INNER_R)} L${p(...INNER_L)} Z`} fill="#c9a6e8" />
      {/* crown, left then right */}
      <path d={`M${p(...TABLE_L)} L${p(...INNER_L)} L${p(...GIRDLE_L)} Z`} fill="#b98fd8" />
      <path d={`M${p(...TABLE_R)} L${p(...GIRDLE_R)} L${p(...INNER_R)} Z`} fill="#8a56b0" />
      {/* pavilion: three facets, lightest on the left */}
      <path d={`M${p(...GIRDLE_L)} L${p(...INNER_L)} L${p(...TIP)} Z`} fill="#9b6dc9" />
      <path d={`M${p(...INNER_L)} L${p(...INNER_R)} L${p(...TIP)} Z`} fill="#8f60ba" />
      <path d={`M${p(...INNER_R)} L${p(...GIRDLE_R)} L${p(...TIP)} Z`} fill="#7a4aa0" />
      {/* the icon's own highlight, top-left of the table */}
      <path
        d={`M${p(-0.42, -0.6)} L${p(-0.05, -0.6)} L${p(-0.2, -0.26)} L${p(-0.5, -0.26)} Z`}
        fill="#ffffff"
        opacity="0.35"
      />
      <path d={sparklePath(x - s * 0.1, y - s * 0.05, s * 0.3)} fill="#ffffff" opacity="0.9" />
    </g>
  );
}

/**
 * icon-coin redrawn: a token tilted off vertical, a darker rim with the
 * thickness showing at the lower left, a raised inner ring, and the emblem —
 * a ball on a stem over a base — that sits above the word TOKEN. The
 * lettering itself is below the size this ever renders at, so the band it
 * sits in is suggested rather than spelled.
 */
function Coin({ r, uid }: { r: number; uid: string }) {
  return (
    <g>
      {/* edge thickness, offset down-left the way the art shows it */}
      <circle cx={-r * 0.13} cy={r * 0.15} r={r} fill="#b9781a" />
      <circle cx="0" cy="0" r={r} fill={`url(#coinFace-${uid})`} />
      {/* raised inner ring */}
      <circle cx="0" cy="0" r={r * 0.76} fill="none" stroke="#f7d774" strokeWidth={r * 0.1} opacity="0.85" />
      <circle cx="0" cy="0" r={r * 0.68} fill="#f0b93a" />
      {/* emblem: ball, stem, base */}
      <circle cx="0" cy={-r * 0.24} r={r * 0.16} fill="#b9781a" />
      <rect x={-r * 0.05} y={-r * 0.22} width={r * 0.1} height={r * 0.26} fill="#b9781a" />
      <rect x={-r * 0.22} y={r * 0.02} width={r * 0.44} height={r * 0.09} rx={r * 0.045} fill="#b9781a" />
      {/* the TOKEN band, suggested as a bar at this size */}
      <rect x={-r * 0.34} y={r * 0.22} width={r * 0.68} height={r * 0.13} rx={r * 0.065} fill="#b9781a" opacity="0.8" />
      {/* specular, upper left */}
      <ellipse cx={-r * 0.34} cy={-r * 0.44} rx={r * 0.26} ry={r * 0.15} fill="#fffdf5" opacity="0.75" transform={`rotate(-35 ${-r * 0.34} ${-r * 0.44})`} />
    </g>
  );
}

export function CurrencyBackdrop({ variant }: { variant: "coins" | "gems" }) {
  // Two shelves render on one page; without namespacing the second would
  // resolve to the first's defs and both would come out gold.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const isGems = variant === "gems";

  return (
    <svg
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id={`haze-${uid}`}>
          <stop offset="0%" stopColor={isGems ? "#c4b5fd" : "#fcd34d"} stopOpacity="0.6" />
          <stop offset="100%" stopColor={isGems ? "#c4b5fd" : "#fcd34d"} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`coinFace-${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#ffe9a3" />
          <stop offset="40%" stopColor="#f5c542" />
          <stop offset="100%" stopColor="#d9971f" />
        </linearGradient>
        <filter id={`soft-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* The pool of light sits in the same corner as the pieces, so the
          depth and the motion are one thing rather than two. */}
      <motion.ellipse
        cx="252"
        cy="46"
        rx="120"
        ry="82"
        fill={`url(#haze-${uid})`}
        filter={`url(#soft-${uid})`}
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.09, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "252px", originY: "46px" }}
      />

      {isGems ? (
        <>
          {GEMS.map((g, i) => (
            <motion.g
              key={i}
              animate={{ rotate: 360 * g.dir, y: [0, -g.drift, 0] }}
              transition={{
                rotate: { duration: g.dur, repeat: Infinity, ease: "linear", delay: g.delay },
                y: { duration: g.dur / 4, repeat: Infinity, ease: "easeInOut", delay: g.delay },
              }}
              style={{ originX: `${g.x}px`, originY: `${g.y}px` }}
              opacity={0.5}
            >
              <Gem x={g.x} y={g.y} s={g.s} uid={uid} />
            </motion.g>
          ))}

          {SPARKLES.map((s, i) => (
            <motion.path
              key={i}
              d={sparklePath(s.x, s.y, s.s)}
              fill="#ffffff"
              animate={{ opacity: [0.1, 0.9, 0.1], scale: [0.45, 1, 0.45] }}
              transition={{ duration: s.dur, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
              style={{ originX: `${s.x}px`, originY: `${s.y}px` }}
            />
          ))}
        </>
      ) : (
        COINS.map((c, i) => (
          <motion.g
            key={i}
            animate={{ y: [0, -c.rise], opacity: [0, 0.8, 0.6, 0] }}
            transition={{
              duration: c.dur,
              repeat: Infinity,
              ease: "easeOut",
              delay: c.delay,
              times: [0, 0.18, 0.72, 1],
            }}
          >
            {/* scaleX alone is what sells a spinning disc: the token turns
                edge-on and back rather than tumbling like a ball. The tilt
                is the icon's own, kept outside the spin so it stays put. */}
            <motion.g
              animate={{ scaleX: [1, 0.1, 1] }}
              transition={{ duration: c.spin, repeat: Infinity, ease: "easeInOut", delay: c.delay }}
              style={{ originX: `${c.x}px`, originY: `${c.y}px` }}
            >
              <g transform={`translate(${c.x} ${c.y}) rotate(${c.tilt})`}>
                <Coin r={c.r} uid={uid} />
              </g>
            </motion.g>
          </motion.g>
        ))
      )}
    </svg>
  );
}
