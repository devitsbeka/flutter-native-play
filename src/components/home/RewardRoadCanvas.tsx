import { useMemo } from "react";
import {
  ROAD,
  roadPath,
  scenery,
  travelledPath,
  type RoadNode,
  type SceneryItem,
} from "./rewardRoad";

/**
 * The drawing half of the rewards road: the ground, the road itself, and the
 * things growing beside it.
 *
 * One `<svg>` for the lot, sized in real pixels — width and height are the
 * measured size of the map, and the viewBox matches them one to one. Nothing
 * here is scaled by the browser, which is the point: a viewBox stretched to
 * fit would distort the stroke widths and, worse, the dash patterns, and the
 * dashes ARE the road's outline.
 *
 * THE PALETTE IS THE APP'S, and that is not decoration. The first cut was a
 * green meadow with flat cartoon trees and toadstools on it — a competent
 * illustration of a different product. This app is lavender and violet with
 * saturated brand gradients on everything, so the ground is the same
 * #FDFAFF -> #F4EEFB the modals are built on, the road is white with the
 * chip-border violet as its edge, and every plant is filled with a gradient
 * from the same seven pairs the day medallions use. Nothing here introduces
 * a colour the rest of the app does not already speak.
 *
 * Everything that moves is a CSS animation on an inner `<g>`, never on the
 * `<g>` carrying the placement transform — a CSS transform replaces the
 * transform attribute rather than composing with it, so a swaying plant would
 * sway at the origin of the map. The loops stop under Reduce Motion; see
 * index.css, where the keyframes and the guard live together.
 */

interface RewardRoadCanvasProps {
  width: number;
  height: number;
  nodes: RoadNode[];
  /** The last stop already reached — the road is gold up to it, plain after. */
  travelledThrough: number;
}

/**
 * The brand's gradient pairs, as gradient ids.
 *
 * The same seven the medallions run through (DailyRewardsModal's
 * DAY_GRADIENTS) plus the two the app uses for its own currencies, so a
 * flower beside the road is painted out of the same box as the gift on it.
 */
const GRADIENTS: [string, string, string][] = [
  ["g-mint", "#6EE7B7", "#10B981"],
  ["g-violet", "#C4B5FD", "#8B5CF6"],
  ["g-amber", "#FDE68A", "#F59E0B"],
  ["g-pink", "#FDA4D3", "#EC4899"],
  ["g-sky", "#A5E4FB", "#3B82F6"],
  ["g-indigo", "#B4B8FD", "#7126D5"],
  ["g-fuchsia", "#F0ABFC", "#D946EF"],
];

/** A stable index into the palette from a scenery id — same plant, same colour, always. */
const hue = (id: string, length: number) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % length;
};

/** The blossom palette: everything except the greens the leaves are drawn in. */
const BLOOMS = GRADIENTS.slice(1).map(([id]) => id);

/**
 * Each piece is drawn standing on the origin: the ground is y = 0 and the
 * plant grows up into negative y, roughly 24 units tall and 24 wide. That is
 * what lets `scenery` place them all with one translate and treat their size
 * as a single scale.
 *
 * Gradient fills and a lighter cap on top of each mass, rather than flat
 * colour: the app draws every card, button and badge that way, and a flat
 * shape beside them reads as a placeholder.
 */
function Plant({ item }: { item: SceneryItem }) {
  const bloom = BLOOMS[hue(item.id, BLOOMS.length)];
  switch (item.kind) {
    case "tree":
      return (
        <>
          <path d="M -1.7 0 L -1.1 -9 L 1.1 -9 L 1.7 0 Z" fill="#C9A98C" />
          <circle cx="-4.6" cy="-10.4" r="5.1" fill="url(#g-mint)" />
          <circle cx="4.6" cy="-10.8" r="5.3" fill="url(#g-mint)" />
          <circle cx="0" cy="-14.4" r="7.2" fill="url(#g-mint)" />
          <circle cx="-2.4" cy="-16.4" r="3.2" fill="#FFFFFF" opacity="0.4" />
        </>
      );
    case "bush":
      return (
        <>
          <circle cx="-4.8" cy="-3.4" r="4.4" fill="url(#g-mint)" />
          <circle cx="4.8" cy="-3.6" r="4.2" fill="url(#g-mint)" />
          <circle cx="0" cy="-5.4" r="6" fill="url(#g-mint)" />
          <circle cx="-1.8" cy="-7.4" r="2.2" fill="#FFFFFF" opacity="0.42" />
        </>
      );
    case "flower":
      return (
        <>
          <path d="M 0 0 C 0.4 -4 -1.2 -6.4 0 -9.4" stroke="#34D399" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <ellipse cx="-2.6" cy="-4.6" rx="2.6" ry="1.3" fill="url(#g-mint)" transform="rotate(-18 -2.6 -4.6)" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={2.9 * Math.cos((a * Math.PI) / 180)}
              cy={-10.6 + 2.9 * Math.sin((a * Math.PI) / 180)}
              r="2.4"
              fill={`url(#${bloom})`}
            />
          ))}
          <circle cx="0" cy="-10.6" r="1.7" fill="#FFF7E0" />
        </>
      );
    case "grass":
      // Five blades, not three: three drew a "V" small enough to read as a
      // tick on the ground, which on a screen full of claimed days is the one
      // shape it must not borrow.
      return (
        <g stroke="#5DD6A4" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M 0 0 C -1.2 -3.4 -3.4 -5.6 -5.6 -7" />
          <path d="M 0 0 C -0.8 -4 -1.6 -6.6 -2.6 -9" />
          <path d="M 0 0 C 0.2 -4.4 0.2 -7.4 0 -10.2" />
          <path d="M 0 0 C 1 -4 1.9 -6.6 2.9 -9.2" />
          <path d="M 0 0 C 1.4 -3.4 3.6 -5.6 5.8 -7.2" />
        </g>
      );
    case "crystal":
      // A gem growing out of the ground, cut like the gem in the wallet —
      // where a grey rock used to sit, which was the one object in the scene
      // that belonged to no part of this app.
      return (
        <>
          <path d="M -4.6 -4.4 L -2.4 -9.8 L 2.4 -9.8 L 4.6 -4.4 L 0 0 Z" fill={`url(#${bloom})`} />
          <path d="M -2.4 -9.8 L 2.4 -9.8 L 0 -5.6 Z" fill="#FFFFFF" opacity="0.45" />
          <path d="M -4.6 -4.4 L 0 -5.6 L 0 0 Z" fill="#FFFFFF" opacity="0.18" />
        </>
      );
    case "sparkle":
      // The four-point star the app puts on anything that just paid out.
      return (
        <path
          d="M 0 -12 C 0.7 -8.2 1.9 -7 5.6 -6.2 C 1.9 -5.5 0.7 -4.3 0 -0.5 C -0.7 -4.3 -1.9 -5.5 -5.6 -6.2 C -1.9 -7 -0.7 -8.2 0 -12 Z"
          fill="url(#g-amber)"
        />
      );
    case "cloud":
      // White with the ground's own lavender underneath it, so it sits in
      // this scene rather than on top of it.
      return (
        <g fill="url(#g-cloud)">
          <circle cx="-7.4" cy="0.4" r="4.2" />
          <circle cx="-1.6" cy="-2.2" r="5.8" />
          <circle cx="4.4" cy="-0.6" r="4.8" />
          <circle cx="8.4" cy="1" r="3.4" />
          <rect x="-7.6" y="0" width="16.2" height="4.6" rx="2.3" />
        </g>
      );
    case "butterfly":
      // Two ellipses and nothing else read as a pair of coloured dots at this
      // size. A butterfly is a big upper wing, a small lower one, a body
      // between them and two antennae — that is the whole silhouette, and
      // without it there is no reason to draw one.
      return (
        <>
          <g className="reward-road__wing" style={{ animationDuration: "0.6s", animationDelay: `${item.delay}s` }}>
            <ellipse cx="-3.6" cy="-4.4" rx="3.6" ry="3" fill={`url(#${bloom})`} transform="rotate(-18 -3.6 -4.4)" />
            <ellipse cx="3.6" cy="-4.4" rx="3.6" ry="3" fill={`url(#${bloom})`} transform="rotate(18 3.6 -4.4)" />
            <ellipse cx="-2.6" cy="-0.9" rx="2.4" ry="2" fill={`url(#${bloom})`} opacity="0.85" />
            <ellipse cx="2.6" cy="-0.9" rx="2.4" ry="2" fill={`url(#${bloom})`} opacity="0.85" />
          </g>
          <path d="M -1.2 -8.6 C -0.9 -7.6 -0.5 -7.2 -0.3 -6.8 M 1.2 -8.6 C 0.9 -7.6 0.5 -7.2 0.3 -6.8"
            stroke="#5B4B7A" strokeWidth="0.6" fill="none" strokeLinecap="round" />
          <ellipse cx="0" cy="-3.4" rx="0.85" ry="3.4" fill="#5B4B7A" />
        </>
      );
    default:
      return null;
  }
}

/** Which loop a piece of scenery runs — the ground sways, the air drifts. */
const LOOP: Record<SceneryItem["kind"], string> = {
  tree: "reward-road__sway",
  bush: "reward-road__sway",
  flower: "reward-road__sway",
  grass: "reward-road__sway",
  crystal: "reward-road__bob",
  sparkle: "reward-road__twinkle",
  cloud: "reward-road__drift",
  butterfly: "reward-road__flutter",
};

function Scenery({ items }: { items: SceneryItem[] }) {
  return (
    <>
      {items.map((item) => (
        <g key={item.id} transform={`translate(${item.x} ${item.y}) scale(${item.flip ? -item.scale : item.scale} ${item.scale})`}>
          <g
            className={LOOP[item.kind]}
            style={{ animationDuration: `${item.duration}s`, animationDelay: `${item.delay}s` }}
          >
            <Plant item={item} />
          </g>
        </g>
      ))}
    </>
  );
}

export function RewardRoadCanvas({ width, height, nodes, travelledThrough }: RewardRoadCanvasProps) {
  const items = useMemo(() => scenery(nodes, width, height), [nodes, width, height]);
  const ground = useMemo(() => items.filter((i) => i.kind !== "cloud" && i.kind !== "butterfly"), [items]);
  const air = useMemo(() => items.filter((i) => i.kind === "cloud" || i.kind === "butterfly"), [items]);
  const path = useMemo(() => roadPath(nodes), [nodes]);
  const walked = useMemo(() => travelledPath(nodes, travelledThrough), [nodes, travelledThrough]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute left-0 top-0"
      aria-hidden="true"
    >
      <defs>
        {GRADIENTS.map(([id, from, to]) => (
          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        ))}
        <linearGradient id="g-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1E9FD" />
        </linearGradient>
        <linearGradient id="road-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDFAFF" />
          <stop offset="100%" stopColor="#F1E8FC" />
        </linearGradient>
        <linearGradient id="road-walked" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        {/* The ambient blobs the rest of the app floats behind its modals —
            purple, emerald, pink, all barely there. Radial stops rather than
            a blur filter: this layer is inside a scroller, and a
            feGaussianBlur over the full map repaints on every frame of it.

            Barely there is the whole specification. At the strength these
            first went in (0.3 at the centre) the emerald one read as a green
            stain across the corner of a lavender sheet, which is the opposite
            of ambient — they are meant to be felt and not seen. */}
        {[
          ["blob-purple", "#A78BFA"],
          ["blob-emerald", "#6EE7B7"],
          ["blob-pink", "#F9A8D4"],
        ].map(([id, color]) => (
          <radialGradient key={id} id={id}>
            <stop offset="0%" stopColor={color} stopOpacity="0.13" />
            <stop offset="60%" stopColor={color} stopOpacity="0.04" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      <rect x="0" y="0" width={width} height={height} fill="url(#road-ground)" />
      {/* Placed off the geometry rather than at random: one blob per pair of
          stops, alternating sides, so they land in the empty half of the map
          instead of behind the gifts. */}
      {nodes.map((node, i) =>
        i % 2 === 0 ? (
          <circle
            key={`blob-${node.index}`}
            cx={i % 4 === 0 ? width * 0.06 : width * 0.94}
            cy={node.y + ROAD.step / 2}
            r={width * 0.5}
            fill={`url(#${["blob-purple", "blob-emerald", "blob-pink"][(i / 2) % 3]})`}
          />
        ) : null
      )}

      <Scenery items={ground} />

      {/* The road's dotted outline. Not two lines either side of it — offsetting
          a curve is not a translation, and faking it with a second path drifts
          wherever the road bends hardest. This is one stroke, wider than the
          surface and dashed to nothing with round caps, so what it leaves is a
          row of beads on BOTH edges at once, exactly parallel by construction.

          The colour is the border every chip in this app is drawn with (see
          MissionsModal's chipStyle), a shade deeper: at the chip's own
          #E8E0F5 a white road on a lavender ground had no edge at all. */}
      <path
        d={path}
        fill="none"
        stroke="#E1D6F3"
        strokeWidth={ROAD.band}
        strokeLinecap="round"
        strokeDasharray="0.5 11"
      />
      <path d={path} fill="none" stroke="#FFFFFF" strokeWidth={ROAD.surface} strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke="#DACDF0"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray="0 12"
      />

      {walked && (
        <>
          <path d={walked} fill="none" stroke="url(#road-walked)" strokeWidth={ROAD.surface} strokeLinecap="round" />
          <path
            d={walked}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeDasharray="0 12"
          />
        </>
      )}

      <Scenery items={air} />
    </svg>
  );
}

export default RewardRoadCanvas;
