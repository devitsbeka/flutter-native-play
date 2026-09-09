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
 * The drawing half of the rewards road: the ground, the road, and the quiet
 * planting either side of it.
 *
 * One `<svg>` for the lot, sized in real pixels — width and height are the
 * measured size of the map, and the viewBox matches them one to one. Nothing
 * here is scaled by the browser, which is the point: a viewBox stretched to
 * fit would distort the stroke widths and, worse, the dash patterns, and the
 * dashes ARE the road's outline.
 *
 * IT IS ALL ONE COLOUR, and that is the whole design. This scene has been
 * wrong twice. First it was a green meadow with cartoon toadstools on it — an
 * illustration of a different product. Then it was the same meadow painted in
 * the app's seven brand gradients, which fixed the palette and made it worse:
 * violet gems, amber stars and mint trees glittering around a road, on a sheet
 * whose one job is to show you which day you are on.
 *
 * So the planting is a watermark. Three tints of the sheet's own lavender,
 * no gradients, no glitter, nothing that moves except a slow sway. The only
 * saturated object anywhere on this screen is today's medallion, drawn by the
 * modal on top of this — and it is legible from across the room because
 * nothing here is arguing with it.
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
  /** The last stop already reached — the road is filled in up to it, pale after. */
  travelledThrough: number;
}

/**
 * The planting's three tints, light to dark, all of them the sheet's lavender.
 *
 * A plant is drawn from two of them — a mass and a slightly deeper mass
 * behind it — which is enough to read as a shape at this size and not enough
 * to read as a colour.
 */
const LEAF = "#EFE9F9";
const LEAF_DEEP = "#E5DCF4";
const STEM = "#DFD4F0";

/** A stable pick from a small set, so the same plant is the same plant always. */
const hash = (id: string, length: number) => {
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
          <path d="M -1.5 0 L -1 -9 L 1 -9 L 1.5 0 Z" fill={STEM} />
          <circle cx="-4.4" cy="-10.2" r="4.8" fill={LEAF_DEEP} />
          <circle cx="4.4" cy="-10.6" r="5" fill={LEAF_DEEP} />
          <circle cx="0" cy="-14.2" r="7" fill={LEAF} />
        </>
      );
    case "bush":
      return (
        <>
          <circle cx="-4.6" cy="-3.3" r="4.2" fill={LEAF_DEEP} />
          <circle cx="4.6" cy="-3.5" r="4" fill={LEAF_DEEP} />
          <circle cx="0" cy="-5.2" r="5.8" fill={LEAF} />
        </>
      );
    case "flower": {
      // The one place a second value is allowed: the bloom is a shade deeper
      // than its leaves, so a flower is not just a taller blade of grass.
      const head = hash(item.id, 2) === 0 ? LEAF_DEEP : STEM;
      return (
        <>
          <path d="M 0 0 C 0.4 -4 -1.2 -6.4 0 -9.4" stroke={STEM} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <ellipse cx="-2.6" cy="-4.6" rx="2.6" ry="1.3" fill={LEAF} transform="rotate(-18 -2.6 -4.6)" />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={2.7 * Math.cos((a * Math.PI) / 180)}
              cy={-10.4 + 2.7 * Math.sin((a * Math.PI) / 180)}
              r="2.3"
              fill={head}
            />
          ))}
          <circle cx="0" cy="-10.4" r="1.6" fill="#FFFFFF" />
        </>
      );
    }
    case "grass":
      // Five blades, not three: three drew a "V" small enough to read as a
      // tick on the ground, which on a screen full of claimed days is the one
      // shape it must not borrow.
      return (
        <g stroke={LEAF_DEEP} strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M 0 0 C -1.2 -3.4 -3.4 -5.6 -5.6 -7" />
          <path d="M 0 0 C -0.8 -4 -1.6 -6.6 -2.6 -9" />
          <path d="M 0 0 C 0.2 -4.4 0.2 -7.4 0 -10.2" />
          <path d="M 0 0 C 1 -4 1.9 -6.6 2.9 -9.2" />
          <path d="M 0 0 C 1.4 -3.4 3.6 -5.6 5.8 -7.2" />
        </g>
      );
    default:
      return null;
  }
}

export function RewardRoadCanvas({ width, height, nodes, travelledThrough }: RewardRoadCanvasProps) {
  const items = useMemo(() => scenery(nodes, width, height), [nodes, width, height]);
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
        <linearGradient id="road-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDFAFF" />
          <stop offset="100%" stopColor="#F6F1FC" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill="url(#road-ground)" />

      {/* The planting, all of it behind the road. */}
      {items.map((item) => (
        <g
          key={item.id}
          transform={`translate(${item.x} ${item.y}) scale(${item.flip ? -item.scale : item.scale} ${item.scale})`}
        >
          <g
            className="reward-road__sway"
            style={{ animationDuration: `${item.duration}s`, animationDelay: `${item.delay}s` }}
          >
            <Plant item={item} />
          </g>
        </g>
      ))}

      {/* The road's dotted outline. Not two lines either side of it — offsetting
          a curve is not a translation, and faking it with a second path drifts
          wherever the road bends hardest. This is one stroke, wider than the
          surface and dashed to nothing with round caps, so what it leaves is a
          row of beads on BOTH edges at once, exactly parallel by construction. */}
      <path
        d={path}
        fill="none"
        stroke="#E7DFF5"
        strokeWidth={ROAD.band}
        strokeLinecap="round"
        strokeDasharray="0.5 11"
      />
      <path d={path} fill="none" stroke="#FFFFFF" strokeWidth={ROAD.surface} strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke="#EDE6F8"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray="0 12"
      />

      {/* The stretch already walked. Progress is told by weight, not by hue:
          the same road, filled in, rather than a gold ribbon running up the
          middle of a lavender sheet. */}
      {walked && (
        <>
          <path d={walked} fill="none" stroke="#DCCFF3" strokeWidth={ROAD.surface} strokeLinecap="round" />
          <path
            d={walked}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="0 12"
            opacity="0.75"
          />
        </>
      )}
    </svg>
  );
}

export default RewardRoadCanvas;
