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
 * The drawing half of the rewards road: the meadow, the road itself, and the
 * things growing beside it.
 *
 * One `<svg>` for the lot, sized in real pixels — width and height are the
 * measured size of the map, and the viewBox matches them one to one. Nothing
 * here is scaled by the browser, which is the point: a viewBox stretched to
 * fit would distort the stroke widths and, worse, the dash patterns, and the
 * dashes ARE the road's outline.
 *
 * Everything that moves is a CSS animation on an inner `<g>`, never on the
 * `<g>` carrying the placement transform — a CSS transform replaces the
 * transform attribute rather than composing with it, so a swaying bush would
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

/** Petals, picked per plant so a meadow of one flower does not read as wallpaper. */
const PETALS = ["#F9A8D4", "#FCA5A5", "#FDE047", "#C4B5FD", "#93C5FD", "#FDBA74"];

/** A stable index into a palette from a scenery id — same plant, same colour, always. */
const hue = (id: string, length: number) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % length;
};

/**
 * Each piece is drawn standing on the origin: the ground is y = 0 and the
 * plant grows up into negative y, roughly 24 units tall and 24 wide. That is
 * what lets `scenery` place them all with one translate and treat their size
 * as a single scale.
 */
function Plant({ item }: { item: SceneryItem }) {
  switch (item.kind) {
    case "tree":
      return (
        <>
          <path d="M -1.7 0 L -1.1 -9 L 1.1 -9 L 1.7 0 Z" fill="#B98A63" />
          <circle cx="-4.6" cy="-10.4" r="5.1" fill="#7FC08A" />
          <circle cx="4.6" cy="-10.8" r="5.3" fill="#7FC08A" />
          <circle cx="0" cy="-14.4" r="7.2" fill="#8ED09A" />
          <circle cx="-2.2" cy="-15.6" r="3.4" fill="#A8DEAF" opacity="0.75" />
        </>
      );
    case "bush":
      return (
        <>
          <circle cx="-4.8" cy="-3.4" r="4.4" fill="#7FC98A" />
          <circle cx="4.8" cy="-3.6" r="4.2" fill="#7FC98A" />
          <circle cx="0" cy="-5.4" r="6" fill="#93D69C" />
          <circle cx="-1.6" cy="-6.6" r="2.4" fill="#B3E6B8" opacity="0.7" />
        </>
      );
    case "flower": {
      const petal = PETALS[hue(item.id, PETALS.length)];
      return (
        <>
          <path d="M 0 0 C 0.4 -4 -1.2 -6.4 0 -9.4" stroke="#6FB97C" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <ellipse cx="-2.6" cy="-4.6" rx="2.6" ry="1.3" fill="#7FC98A" transform="rotate(-18 -2.6 -4.6)" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={2.9 * Math.cos((a * Math.PI) / 180)}
              cy={-10.6 + 2.9 * Math.sin((a * Math.PI) / 180)}
              r="2.3"
              fill={petal}
            />
          ))}
          <circle cx="0" cy="-10.6" r="1.6" fill="#FDE68A" />
        </>
      );
    }
    case "grass":
      // Five blades, not three: three drew a "V" small enough to read as a
      // tick on the meadow, which on a screen full of claimed days is the one
      // shape it must not borrow.
      return (
        <g stroke="#7FC98A" strokeWidth="1.4" fill="none" strokeLinecap="round">
          <path d="M 0 0 C -1.2 -3.4 -3.4 -5.6 -5.6 -7" />
          <path d="M 0 0 C -0.8 -4 -1.6 -6.6 -2.6 -9" />
          <path d="M 0 0 C 0.2 -4.4 0.2 -7.4 0 -10.2" />
          <path d="M 0 0 C 1 -4 1.9 -6.6 2.9 -9.2" />
          <path d="M 0 0 C 1.4 -3.4 3.6 -5.6 5.8 -7.2" />
        </g>
      );
    case "rock":
      return (
        <>
          <path d="M -5.4 0 C -6 -3.2 -3.6 -5.6 -0.6 -5.6 C 2.8 -5.6 5.6 -3.4 5.2 0 Z" fill="#CFC9DB" />
          <path d="M -2.6 -4.6 C -1 -5.4 1 -5.2 2.2 -4.2 C 0.6 -3.6 -1.2 -3.8 -2.6 -4.6 Z" fill="#E4E0EE" />
        </>
      );
    case "mushroom":
      return (
        <>
          <path d="M -1.4 0 L -1.1 -4.2 L 1.1 -4.2 L 1.4 0 Z" fill="#F5EAD8" />
          <path d="M -5 -4.2 C -5 -8.2 5 -8.2 5 -4.2 Z" fill="#F87171" />
          <circle cx="-1.8" cy="-5.6" r="0.9" fill="#FFF1F1" />
          <circle cx="1.9" cy="-6" r="0.8" fill="#FFF1F1" />
        </>
      );
    case "cloud":
      // Wider than it is tall and fully opaque white: the first cut was a
      // small translucent lump that read as fog, or worse, as another rock.
      return (
        <g fill="#FFFFFF">
          <circle cx="-7.4" cy="0.4" r="4.2" />
          <circle cx="-1.6" cy="-2.2" r="5.8" />
          <circle cx="4.4" cy="-0.6" r="4.8" />
          <circle cx="8.4" cy="1" r="3.4" />
          <rect x="-7.6" y="0" width="16.2" height="4.6" rx="2.3" />
        </g>
      );
    case "butterfly":
      return (
        <>
          <g className="reward-road__wing" style={{ animationDuration: "0.6s", animationDelay: `${item.delay}s` }}>
            <ellipse cx="-3.4" cy="-1.2" rx="3.4" ry="4.2" fill={PETALS[hue(item.id, PETALS.length)]} />
            <ellipse cx="3.4" cy="-1.2" rx="3.4" ry="4.2" fill={PETALS[hue(item.id, PETALS.length)]} />
          </g>
          <ellipse cx="0" cy="-1.2" rx="0.8" ry="3.2" fill="#5B4B7A" />
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
  mushroom: "reward-road__sway",
  rock: "", // a rock that swayed would be the one thing anybody noticed
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
        <linearGradient id="road-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4FBEE" />
          <stop offset="55%" stopColor="#EAF6E8" />
          <stop offset="100%" stopColor="#E4F2E6" />
        </linearGradient>
        <linearGradient id="road-walked" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9AE" />
          <stop offset="100%" stopColor="#FFC875" />
        </linearGradient>
        {/* Dapple: the meadow is one flat colour without it, and a flat green
            behind a white road reads as a placeholder. Two circles per 72px
            tile, both nearly transparent — texture you notice only if you
            look for it. */}
        <pattern id="road-dapple" width="86" height="86" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="22" r="13" fill="#FFFFFF" opacity="0.22" />
          <circle cx="62" cy="60" r="9" fill="#8ED09A" opacity="0.1" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill="url(#road-meadow)" />
      <rect x="0" y="0" width={width} height={height} fill="url(#road-dapple)" />

      <Scenery items={ground} />

      {/* The road's dotted outline. Not two lines either side of it — offsetting
          a curve is not a translation, and faking it with a second path drifts
          wherever the road bends hardest. This is one stroke, wider than the
          surface and dashed to nothing with round caps, so what it leaves is a
          row of beads on BOTH edges at once, exactly parallel by construction. */}
      <path
        d={path}
        fill="none"
        stroke="rgba(64,38,102,0.16)"
        strokeWidth={ROAD.band}
        strokeLinecap="round"
        strokeDasharray="0.5 11"
      />
      <path d={path} fill="none" stroke="#FFFDF7" strokeWidth={ROAD.surface} strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke="rgba(64,38,102,0.17)"
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
