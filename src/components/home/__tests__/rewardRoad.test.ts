import { describe, it, expect } from "vitest";
import {
  ROAD,
  STOP_CLEARANCE,
  clampChipX,
  overlapsStop,
  roadHeight,
  roadNodes,
  roadPath,
  roadXAt,
  scenery,
  travelledPath,
} from "@/components/home/rewardRoad";

/**
 * The rewards road is drawn at whatever width the device gives it.
 *
 * The modal is 80% of the viewport, floored at 280px and capped at 420, so
 * there is no single layout to eyeball in a browser and call done — the same
 * numbers have to hold on a small phone, on a tablet in portrait, and after a
 * rotation. These are the properties that must be true at every one of those
 * widths, which is the part that cannot be checked by looking.
 *
 * The widths below are the real ends of the range: 280 is the modal's own
 * min-width and 420 its cap, with the common phone sizes in between.
 */
const WIDTHS = [280, 300, 312, 340, 384, 420];
const DAYS = 7;

describe("where the stops are", () => {
  it("spaces them evenly down the map, inside it", () => {
    const nodes = roadNodes(DAYS, 320);
    expect(nodes).toHaveLength(DAYS);
    expect(nodes[0].y).toBe(ROAD.head);
    for (let i = 1; i < nodes.length; i++) {
      expect(nodes[i].y - nodes[i - 1].y).toBe(ROAD.step);
    }
    expect(nodes[DAYS - 1].y + ROAD.tail).toBe(roadHeight(DAYS));
  });

  it("alternates sides of the centre line", () => {
    // A road that wandered at random put two stops nearly above one another
    // and the segment between them read as a straight line.
    for (const width of WIDTHS) {
      const nodes = roadNodes(DAYS, width);
      const sides = nodes.map((n) => Math.sign(n.x - width / 2));
      expect(sides, `width ${width}`).toEqual([-1, 1, -1, 1, -1, 1, -1]);
    }
  });

  it("keeps the whole road — beads included — inside the map at every width", () => {
    // The dotted outline is drawn as a stroke WIDER than the surface, so the
    // edge of the road is half the band out, not half the surface.
    const margin = ROAD.band / 2;
    for (const width of WIDTHS) {
      const nodes = roadNodes(DAYS, width);
      for (let y = 0; y <= roadHeight(DAYS); y += 8) {
        const x = roadXAt(nodes, y);
        expect(x - margin, `width ${width} at y ${y}`).toBeGreaterThanOrEqual(0);
        expect(x + margin, `width ${width} at y ${y}`).toBeLessThanOrEqual(width);
      }
    }
  });
});

describe("the road passes through its stops", () => {
  // The medallions are absolutely positioned HTML over an SVG; nothing makes
  // them meet except these two agreeing about the same curve.
  it("puts the curve exactly under every medallion", () => {
    for (const width of WIDTHS) {
      const nodes = roadNodes(DAYS, width);
      for (const node of nodes) {
        expect(roadXAt(nodes, node.y), `width ${width}, stop ${node.index}`).toBeCloseTo(node.x, 3);
      }
    }
  });

  it("never overshoots between two stops", () => {
    // The control points sit above and below the midpoint, so a segment is a
    // smoothstep from one stop to the next: it cannot bulge outside the pair
    // it joins, whatever the swing.
    const nodes = roadNodes(DAYS, 320);
    for (let i = 1; i < nodes.length; i++) {
      const lo = Math.min(nodes[i - 1].x, nodes[i].x);
      const hi = Math.max(nodes[i - 1].x, nodes[i].x);
      for (let y = nodes[i - 1].y; y <= nodes[i].y; y += 4) {
        const x = roadXAt(nodes, y);
        expect(x).toBeGreaterThanOrEqual(lo - 0.001);
        expect(x).toBeLessThanOrEqual(hi + 0.001);
      }
    }
  });

  it("runs on past both ends", () => {
    // A road that started at the first gift and stopped at the last would
    // read as a diagram of seven days rather than as a road.
    const nodes = roadNodes(DAYS, 320);
    const d = roadPath(nodes);
    expect(d.startsWith(`M ${nodes[0].x} ${nodes[0].y - ROAD.head}`)).toBe(true);
    expect(d.endsWith(`L ${nodes[6].x} ${nodes[6].y + ROAD.tail}`)).toBe(true);
    expect(roadXAt(nodes, -50)).toBe(nodes[0].x);
    expect(roadXAt(nodes, roadHeight(DAYS) + 50)).toBe(nodes[6].x);
  });
});

describe("the stretch already walked", () => {
  const nodes = roadNodes(DAYS, 320);

  it("stops dead at the stop it names", () => {
    // Drawn as its own path rather than as a fraction of the whole one: a
    // fraction has to be guessed, and a guess ends the gold short of the stop
    // it is meant to reach.
    for (let i = 0; i < DAYS; i++) {
      expect(travelledPath(nodes, i).endsWith(`${nodes[i].x} ${nodes[i].y}`), `through ${i}`).toBe(true);
    }
  });

  it("shares the curve with the road under it", () => {
    // Same segment code, so the gold lies exactly on the road rather than
    // beside it.
    const walked = travelledPath(nodes, 3);
    const full = roadPath(nodes);
    expect(full.startsWith(walked)).toBe(true);
  });

  it("is nothing at all before the first stop is reached", () => {
    expect(travelledPath(nodes, -1)).toBe("");
  });
});

describe("a chip hanging under a stop", () => {
  it("is pulled back inside a narrow map", () => {
    // The receipt is the widest thing on the road and a stop at the outside
    // of a swing plus half a receipt is wider than a small phone. A few
    // pixels of misalignment with the medallion beats a receipt with its last
    // digit off the screen.
    for (const width of WIDTHS) {
      const nodes = roadNodes(DAYS, width);
      for (const node of nodes) {
        const x = clampChipX(node.x, width);
        const half = Math.min(ROAD.chipWidth, width) / 2;
        expect(x - half, `width ${width}`).toBeGreaterThanOrEqual(-0.001);
        expect(x + half, `width ${width}`).toBeLessThanOrEqual(width + 0.001);
      }
    }
  });

  it("leaves a stop that already fits exactly where it is", () => {
    expect(clampChipX(210, 420)).toBe(210);
  });
});

describe("the planting", () => {
  const nodes = roadNodes(DAYS, 320);
  const height = roadHeight(DAYS);
  const items = scenery(nodes, 320, height);

  it("plants something", () => {
    // Sparse on purpose — the road and its captions are the middle of a 312px
    // phone, and what is left is a verge, not a field. Bare would be a bug
    // all the same.
    expect(items.length).toBeGreaterThan(6);
  });

  it("is the same planting every render", () => {
    // Seeded, not random: this component re-renders on the claim, on every
    // countdown tick and on every scroll-driven state change, and planting
    // that reshuffled on each of those would be a flicker, not scenery.
    expect(scenery(nodes, 320, height)).toEqual(items);
  });

  it("never grows on the road", () => {
    for (const item of items) {
      const gap = Math.abs(item.x - roadXAt(nodes, item.y)) - (24 * item.scale) / 2;
      expect(gap, `${item.id} on the road`).toBeGreaterThanOrEqual(ROAD.surface / 2 + ROAD.verge - 0.001);
    }
  });

  it("never grows over a stop or the caption under it", () => {
    // The caption is a WIDE, SHORT band below each stop holding the weekday
    // and what the day paid, and it is the part that was being planted over —
    // a flower drawn across "50" is not a flower, it is a smudge on a number.
    // Asserted through the same predicate the placement uses, so the two
    // cannot drift apart.
    for (const item of items) {
      for (const node of nodes) {
        expect(overlapsStop(node, item.x, item.y), `${item.id} over stop ${node.index}`).toBe(false);
      }
    }
  });

  it("keeps the caption band clear across its full width", () => {
    // Spot-check the predicate itself, or the test above passes by agreeing
    // with a bug.
    const node = nodes[2];
    expect(overlapsStop(node, node.x, node.y)).toBe(true);
    expect(overlapsStop(node, node.x + STOP_CLEARANCE.captionX - 2, node.y + 60)).toBe(true);
    expect(overlapsStop(node, node.x + STOP_CLEARANCE.captionX + 2, node.y + 60)).toBe(false);
    // Above a stop only the medallion is in the way — that is where the road
    // comes in, and there is nothing written there.
    expect(overlapsStop(node, node.x, node.y - STOP_CLEARANCE.faceY - 2)).toBe(false);
  });

  it("stays inside the map", () => {
    for (const item of items) {
      expect(item.x, item.id).toBeGreaterThan(0);
      expect(item.x, item.id).toBeLessThan(320);
      expect(item.y, item.id).toBeGreaterThan(0);
      expect(item.y, item.id).toBeLessThan(height);
    }
  });

  it("gives every piece its own timing", () => {
    // Planting that swayed in unison is a curtain.
    const delays = new Set(items.map((i) => i.delay));
    expect(delays.size).toBeGreaterThan(items.length / 2);
  });
});
