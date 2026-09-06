import { useMemo, useState, type CSSProperties } from "react";

/**
 * Wavy edges for the home's surfaces (Figma "Hom" 1076:1881): the feed
 * panel's top, the profile card's top and bottom, a room card's top and
 * bottom all roll in gentle hills rather than ending in a straight line.
 *
 * The frame drew each as a separate band in a hand-picked colour. Here the
 * wave is a CSS mask on the surface itself, so whatever the surface is made
 * of — a flat colour, a radial gradient, frosted glass over a scene — simply
 * continues into the hills. There is no colour to guess and no seam to hide.
 *
 * A card that carries a border needs its outline to follow the same edge, or
 * the stroke survives only on the straight sides and the wave reads as torn
 * rather than drawn. So a card is ONE closed silhouette — rounded sides,
 * wavy top and bottom — and the caller both masks with it and strokes it.
 *
 * Every mount deals its own curve from a random seed, so no two cards roll
 * alike and a reload rolls them all again, while a re-render leaves a card's
 * curve exactly where it was.
 */

/** mulberry32 — one seed, one curve. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const px = (n: number) => Math.round(n * 100) / 100;

type Rand = () => number;
type Point = [number, number];

/** One hill about every 110px, so the hills stay long and the curve gentle. */
const HILL_SPACING = 110;

/**
 * Points for one wavy edge, from `xStart` to `xEnd` (either direction),
 * rising and falling by at most `band`/2 either side of `yMid` and meeting
 * both ends exactly on `yMid` so it joins the corners cleanly.
 */
function wavePoints(rand: Rand, xStart: number, xEnd: number, yMid: number, band: number): Point[] {
  const span = xEnd - xStart;
  const hills = Math.max(2, Math.round(Math.abs(span) / HILL_SPACING));
  const pts: Point[] = [[xStart, yMid]];
  for (let i = 1; i < hills; i++) {
    // Nudge each crest off its even spacing, and vary how high it reaches,
    // so the curve reads as drawn rather than stamped.
    const t = i / hills + (rand() - 0.5) * 0.12;
    const dir = i % 2 === 0 ? -1 : 1;
    pts.push([xStart + span * t, yMid + dir * (band / 2) * (0.7 + rand() * 0.3)]);
  }
  pts.push([xEnd, yMid]);
  return pts;
}

/** Catmull-Rom through the points, written as cubic Béziers. */
function curveThrough(pts: Point[]): string {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${px(c1x)} ${px(c1y)} ${px(c2x)} ${px(c2y)} ${px(p2[0])} ${px(p2[1])}`;
  }
  return d;
}

export interface WavyRect {
  width: number;
  height: number;
  /** The rounded corners on the straight left and right sides. */
  radius: number;
  /** Peak-to-trough height of the top edge's wave; 0 leaves it straight. */
  top?: number;
  bottom?: number;
}

/**
 * A card's whole outline: rounded left and right sides, a wavy top and a
 * wavy bottom. Each wave is centred on the edge it replaces, so the card
 * keeps its size and the crests reach `top`/2 and `bottom`/2 beyond it —
 * the box this is drawn in has to be that much taller at either end.
 */
export function wavyRectPath(seed: number, { width, height, radius, top = 0, bottom = 0 }: WavyRect): string {
  const rand = seeded(seed);
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const yTop = top / 2;
  const yBottom = height - bottom / 2;
  let d = `M0 ${px(yTop + r)}`;
  d += `Q0 ${px(yTop)} ${px(r)} ${px(yTop)}`;
  d += top > 0 ? curveThrough(wavePoints(rand, r, width - r, yTop, top)) : `L${px(width - r)} ${px(yTop)}`;
  d += `Q${px(width)} ${px(yTop)} ${px(width)} ${px(yTop + r)}`;
  d += `L${px(width)} ${px(yBottom - r)}`;
  d += `Q${px(width)} ${px(yBottom)} ${px(width - r)} ${px(yBottom)}`;
  d += bottom > 0 ? curveThrough(wavePoints(rand, width - r, r, yBottom, bottom)) : `L${px(r)} ${px(yBottom)}`;
  d += `Q0 ${px(yBottom)} 0 ${px(yBottom - r)}`;
  return `${d}Z`;
}

/**
 * The path of a wavy strip `band` px tall: the curve runs along the middle
 * of the strip and the fill hangs below it (a top edge) or above it (a
 * bottom edge). For a surface whose own box cannot carry the wave — one of
 * unknown height, say — laid over its straight edge with half the strip
 * either side of it.
 */
/**
 * A strip whose one edge is a wave and whose other edge is straight.
 *
 * `depth` is solid body past the wave — the strip is `band + depth` tall,
 * the wave lives in the `band` at the wavy edge, and the rest is filled.
 * A lip laid over another element's straight edge needs that body: with
 * the wave alone, every trough left the element's own edge uncovered, and
 * an antialiased edge showed through as a hairline (the home feed's).
 */
export function waveStripPath(
  seed: number,
  width: number,
  band: number,
  edge: "top" | "bottom",
  depth = 0,
): string {
  const rand = seeded(seed);
  const yMid = edge === "top" ? band / 2 : depth + band / 2;
  const pts = wavePoints(rand, 0, width, yMid, band);
  const d = `M0 ${px(yMid)}${curveThrough(pts)}`;
  const h = band + depth;
  return edge === "top" ? `${d}L${px(width)} ${px(h)}L0 ${px(h)}Z` : `${d}L${px(width)} 0L0 0Z`;
}

/** A path as a mask that stretches to whatever box it is put on. */
export function maskFromPath(d: string, width: number, height: number): CSSProperties {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${px(width)} ${px(height)}' ` +
    `preserveAspectRatio='none'><path d='${d}' fill='black'/></svg>`;
  const image = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
}

/** A seed dealt once per mount: random on arrival, then held still. */
function useSeed(): number {
  const [seed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  return seed;
}

export interface WavyRectShape {
  /** The outline, for both the mask and a stroke that follows it exactly. */
  path: string;
  /** `viewBox` for an SVG drawn over the same box. */
  viewBox: string;
  mask: CSSProperties;
}

/** A card's wavy silhouette, dealt once per mount. */
export function useWavyRect(rect: WavyRect): WavyRectShape {
  const seed = useSeed();
  const { width, height, radius, top = 0, bottom = 0 } = rect;
  return useMemo(() => {
    const path = wavyRectPath(seed, { width, height, radius, top, bottom });
    return { path, viewBox: `0 0 ${px(width)} ${px(height)}`, mask: maskFromPath(path, width, height) };
  }, [seed, width, height, radius, top, bottom]);
}

/** A wavy strip's mask, dealt once per mount. */
export function useWaveStrip(
  width: number,
  band: number,
  edge: "top" | "bottom",
  depth = 0,
): CSSProperties {
  const seed = useSeed();
  return useMemo(
    () => maskFromPath(waveStripPath(seed, width, band, edge, depth), width, band + depth),
    [seed, width, band, edge, depth],
  );
}
