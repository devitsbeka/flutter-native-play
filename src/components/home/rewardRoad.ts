/**
 * The geometry of the daily-rewards road.
 *
 * The rewards used to be a horizontal row of seven cards. They are a path
 * now — a road that snakes down the screen with a stop on it for each day of
 * the week — and everything about where that road goes lives here rather
 * than in the component, for two reasons.
 *
 * The first is that the scenery has to know where the road is. A bush is
 * placed by asking "how far is the road at this height", and the answer has
 * to be the same number the road is actually drawn with, not an
 * approximation of it that drifts as the curve is tuned.
 *
 * The second is that none of it can be eyeballed in a browser and left at
 * that: the modal is 80% of the viewport, so the road is drawn at whatever
 * width the device gives it, from a 256px phone to a 420px cap. The numbers
 * below are ratios with pixel caps for that reason, and the tests pin the
 * properties that must hold at every width — the road stays inside the map,
 * the stops stay on the road, and a chip hung under a stop never hangs off
 * the edge.
 */

export interface RoadNode {
  index: number;
  x: number;
  y: number;
}

export const ROAD = {
  /** Empty road above the first stop, so the map starts as a road and not as a gift. */
  head: 96,
  /** Distance between stops. Holds a medallion, its weekday and its chip with room to spare. */
  step: 176,
  /** Road below the last stop — it carries on out of the frame rather than stopping dead. */
  tail: 128,
  /** How far a stop swings from the centre line: a share of the width, capped. */
  swayRatio: 0.2,
  swayMax: 56,
  /** The width of the road surface, and of the dotted band drawn under it. */
  surface: 30,
  band: 38,
  /**
   * The widest a chip under a stop is expected to get — a receipt with coins,
   * gems and a power-up on it. Chips are content-sized, so this is not their
   * width; it is the clearance clampChipX keeps at both edges so that the
   * widest of them still has both ends on screen.
   */
  chipWidth: 216,
  /** Clear space kept between the scenery and the edge of the road surface. */
  verge: 16,
} as const;

/** How tall the whole map is for `count` stops. */
export const roadHeight = (count: number): number =>
  ROAD.head + Math.max(0, count - 1) * ROAD.step + ROAD.tail;

/** Half the width of the snake at this map width. */
export const roadSway = (width: number): number =>
  Math.min(width * ROAD.swayRatio, ROAD.swayMax);

/**
 * Where each stop sits.
 *
 * Strictly alternating sides — a road that wandered randomly put two stops
 * nearly above one another and the segment between them read as a straight
 * line — with the swing itself varied by a smooth function of the index so
 * the alternation does not read as a zigzag stencil.
 */
export function roadNodes(count: number, width: number): RoadNode[] {
  const centre = width / 2;
  const sway = roadSway(width);
  return Array.from({ length: count }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const swing = 0.62 + 0.38 * Math.abs(Math.sin(index * 1.7));
    return {
      index,
      x: centre + side * sway * swing,
      y: ROAD.head + index * ROAD.step,
    };
  });
}

/**
 * The road as one cubic path through the stops, plus the run-in above the
 * first and the run-out below the last.
 *
 * Each segment's control points sit directly above and below the midpoint of
 * the two stops it joins, which is what makes the joins smooth without any
 * tangent bookkeeping: the curve leaves every stop vertically and arrives at
 * the next one vertically, so two segments meeting at a stop always agree.
 * `roadXAt` inverts exactly this, so the two cannot drift apart.
 */
export function roadPath(
  nodes: RoadNode[],
  { head = ROAD.head, tail = ROAD.tail }: { head?: number; tail?: number } = {}
): string {
  if (nodes.length === 0) return "";
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const parts = [`M ${first.x} ${first.y - head}`];
  // A zero run-in or run-out is left out rather than drawn as a line of no
  // length: it keeps the walked stretch a literal prefix of the road under
  // it, which is the cheapest way to be sure the gold lies ON the road.
  if (head !== 0) parts.push(`L ${first.x} ${first.y}`);
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1];
    const b = nodes[i];
    const mid = (a.y + b.y) / 2;
    parts.push(`C ${a.x} ${mid} ${b.x} ${mid} ${b.x} ${b.y}`);
  }
  if (tail !== 0) parts.push(`L ${last.x} ${last.y + tail}`);
  return parts.join(" ");
}

/**
 * The stretch already walked: the same path, built from the stops up to and
 * including `throughIndex`, and stopped dead there rather than running on.
 *
 * Drawn as its own path rather than as a dash offset along the whole one.
 * A fraction of the total length would have to be guessed — the curve is
 * longer than the drop it covers, by an amount that changes with the width —
 * and a guess puts the end of the gold slightly short of or past the stop it
 * is meant to reach, which is exactly the sort of thing that reads as broken.
 * Sharing the segment code makes the two paths identical where they overlap.
 */
export const travelledPath = (nodes: RoadNode[], throughIndex: number): string =>
  throughIndex < 0 ? "" : roadPath(nodes.slice(0, throughIndex + 1), { tail: 0 });

/** The x of the segment's curve at parameter t — a smoothstep between the two stops. */
const segmentX = (x0: number, x1: number, t: number): number =>
  x0 * (1 - t) * (1 - t) * (1 + 2 * t) + x1 * t * t * (3 - 2 * t);

/** And its y, which is monotonic in t and therefore invertible. */
const segmentY = (y0: number, dy: number, t: number): number =>
  y0 + dy * (1.5 * t * (1 - t) + t * t * t);

/**
 * Where the centre of the road is at a given height.
 *
 * This is what the scenery is placed against. Bisection rather than algebra:
 * y(t) is a cubic with no useful closed form, it is monotonic (its derivative
 * 3t² - 3t + 1.5 has no real root), and twenty halvings settle it to well
 * under a pixel.
 */
export function roadXAt(nodes: RoadNode[], y: number): number {
  if (nodes.length === 0) return 0;
  if (y <= nodes[0].y) return nodes[0].x;
  const last = nodes[nodes.length - 1];
  if (y >= last.y) return last.x;

  let i = 1;
  while (i < nodes.length - 1 && nodes[i].y < y) i++;
  const a = nodes[i - 1];
  const b = nodes[i];
  const dy = b.y - a.y;

  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 20; step++) {
    const mid = (lo + hi) / 2;
    if (segmentY(a.y, dy, mid) < y) lo = mid;
    else hi = mid;
  }
  return segmentX(a.x, b.x, (lo + hi) / 2);
}

/**
 * Where to hang a stop's chip.
 *
 * The chip is centred under its stop, and a stop at the outside of a swing
 * plus half a receipt is wider than a narrow phone. Pulling the chip back
 * inside costs a few pixels of alignment with the medallion above it and
 * saves a receipt with its last digit off the screen.
 */
export function clampChipX(x: number, width: number): number {
  const half = Math.min(ROAD.chipWidth, width) / 2;
  return Math.max(half, Math.min(width - half, x));
}

export type SceneryKind =
  | "tree"
  | "bush"
  | "flower"
  | "grass"
  | "rock"
  | "mushroom"
  | "cloud"
  | "butterfly";

export interface SceneryItem {
  id: string;
  kind: SceneryKind;
  x: number;
  y: number;
  /** Multiplies the 24x24 box every piece of scenery is drawn in. */
  scale: number;
  /** Mirrored, so the same six drawings do not read as six drawings. */
  flip: boolean;
  /** Seconds, to stagger the loops — a meadow that sways in unison is a curtain. */
  delay: number;
  duration: number;
}

/**
 * A seeded PRNG (mulberry32), because the meadow must not reshuffle.
 *
 * `Math.random()` here would give every stop a new set of plants on every
 * render — and this component re-renders on the claim, on the countdown tick
 * and on every scroll-driven state change. Seeded from the row index, the
 * scatter is arbitrary-looking and identical each time.
 */
function seeded(seed: number): () => number {
  let a = seed + 0x6d2b79f5;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ground cover, in the order it is drawn — trees behind, small things in front. */
const GROUND: { kind: SceneryKind; weight: number; scale: [number, number] }[] = [
  { kind: "tree", weight: 3, scale: [1.5, 2.2] },
  { kind: "bush", weight: 3, scale: [1.0, 1.5] },
  { kind: "flower", weight: 4, scale: [0.7, 1.0] },
  { kind: "grass", weight: 4, scale: [0.7, 1.1] },
  { kind: "rock", weight: 1, scale: [0.7, 1.1] },
  // Mushrooms are drawn small inside their box, so they need a larger scale
  // than the rest to read as a mushroom rather than as a red speck.
  { kind: "mushroom", weight: 1, scale: [0.9, 1.2] },
];

const pickKind = (r: number) => {
  const total = GROUND.reduce((sum, g) => sum + g.weight, 0);
  let n = r * total;
  for (const g of GROUND) {
    n -= g.weight;
    if (n <= 0) return g;
  }
  return GROUND[GROUND.length - 1];
};

/**
 * The meadow either side of the road.
 *
 * One candidate every ROW pixels down each side, kept only if it clears both
 * the road surface and the stop medallions. Rejecting rather than shuffling
 * is deliberate: it leaves the ground around a stop clear, which is where the
 * gift, the weekday and the chip are, and it thins the planting exactly where
 * the road bends towards that side — which is what a verge does.
 */
export function scenery(nodes: RoadNode[], width: number, height: number): SceneryItem[] {
  const ROW = 44;
  /** Clearance around a stop's medallion and the chip hanging under it. */
  const NODE_CLEAR_X = 62;
  const NODE_CLEAR_Y = 74;
  const items: SceneryItem[] = [];
  const rand = seeded(Math.round(width));

  for (let y = 26, row = 0; y < height - 20; y += ROW, row++) {
    for (const side of [-1, 1] as const) {
      if (rand() < 0.24) continue; // a gap now and then, or it reads as a hedge
      const edge = roadXAt(nodes, y) + side * (ROAD.surface / 2 + ROAD.verge);
      const room = side < 0 ? edge - 8 : width - 8 - edge;
      if (room < 18) continue;

      const g = pickKind(rand());
      const scale = g.scale[0] + rand() * (g.scale[1] - g.scale[0]);
      const half = (24 * scale) / 2;
      if (room < half * 1.4) continue;

      const x = edge + side * (half + rand() * Math.max(0, room - half * 1.4));
      const tooCloseToStop = nodes.some(
        (n) => Math.abs(n.y - y) < NODE_CLEAR_Y && Math.abs(n.x - x) < NODE_CLEAR_X
      );
      if (tooCloseToStop) continue;

      items.push({
        id: `${g.kind}-${row}-${side}`,
        kind: g.kind,
        x,
        y,
        scale,
        flip: rand() < 0.5,
        delay: rand() * 4,
        duration: 4.4 + rand() * 3.2,
      });
    }
  }

  // Air traffic: a few clouds, a couple of butterflies. Placed over the whole
  // map including the road, because they are above it.
  const air = Math.max(2, Math.round(height / 420));
  for (let i = 0; i < air; i++) {
    items.push({
      id: `cloud-${i}`,
      kind: "cloud",
      x: 18 + rand() * Math.max(1, width - 36),
      y: 40 + rand() * Math.max(1, height - 80),
      scale: 2.2 + rand() * 1.3,
      flip: rand() < 0.5,
      delay: rand() * 6,
      duration: 16 + rand() * 10,
    });
    items.push({
      id: `butterfly-${i}`,
      kind: "butterfly",
      x: 24 + rand() * Math.max(1, width - 48),
      y: 60 + rand() * Math.max(1, height - 120),
      // Same reason as the mushrooms: a butterfly is two small wings, and
      // below about this size it is a coloured dot.
      scale: 0.95 + rand() * 0.4,
      flip: rand() < 0.5,
      delay: rand() * 5,
      duration: 5 + rand() * 3,
    });
  }

  return items;
}
