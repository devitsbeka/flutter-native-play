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

/**
 * The path of one wavy strip, `width`×`height`: a smooth random curve with
 * hills roughly a hundred pixels apart, filled down to the strip's base for
 * a top edge or up to it for a bottom edge. The curve stays inside the
 * strip, so the surface's straight edge sits `height` px in from the crests.
 */
export function waveStripPath(seed: number, width: number, height: number, edge: "top" | "bottom"): string {
  const rand = seeded(seed);
  const hills = Math.max(2, Math.round(width / 100) + Math.floor(rand() * 2));
  const step = width / hills;
  const pts: [number, number][] = [];
  for (let i = 0; i <= hills; i++) {
    const x = i === 0 ? 0 : i === hills ? width : i * step + (rand() - 0.5) * step * 0.5;
    // Alternate high and low so it reads as hills rather than a drift, with
    // the heights themselves left to chance.
    const high = i % 2 === 0;
    const y = height * (high ? 0.1 + rand() * 0.3 : 0.6 + rand() * 0.3);
    pts.push([x, y]);
  }
  // Catmull-Rom through the points, written as cubic Béziers.
  let d = `M${px(pts[0][0])} ${px(pts[0][1])}`;
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
  d += edge === "top" ? `L${width} ${height}L0 ${height}Z` : `L${width} 0L0 0Z`;
  return d;
}

function stripUrl(d: string, width: number, height: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' preserveAspectRatio='none'><path d='${d}' fill='black'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

export interface WaveEdges {
  /** Height of the wavy strip along the top edge, in px; 0 or absent for a straight top. */
  top?: number;
  /** Height of the wavy strip along the bottom edge, in px. */
  bottom?: number;
  /** The surface's width in px, roughly — it sets how many hills there are. */
  width: number;
}

/**
 * The mask for a surface whose top and/or bottom edges roll: a wavy strip
 * at each edge and solid between, as layered mask images. The strips are
 * `top` and `bottom` px tall at any width, so the box the mask is put on
 * must already reach `top` px above and `bottom` px below the line where
 * the straight edge would have been.
 */
export function waveMaskStyle(seed: number, { top = 0, bottom = 0, width }: WaveEdges): CSSProperties {
  const images: string[] = [];
  const sizes: string[] = [];
  const positions: string[] = [];
  if (top > 0) {
    images.push(stripUrl(waveStripPath(seed, width, top, "top"), width, top));
    sizes.push(`100% ${top}px`);
    positions.push("0 0");
  }
  if (bottom > 0) {
    images.push(stripUrl(waveStripPath(seed ^ 0x9e3779b9, width, bottom, "bottom"), width, bottom));
    sizes.push(`100% ${bottom}px`);
    positions.push("0 100%");
  }
  // The solid middle, overlapping each strip's base by a pixel so no
  // hairline opens between the layers.
  const above = Math.max(0, top - 1);
  const below = Math.max(0, bottom - 1);
  images.push("linear-gradient(#000,#000)");
  sizes.push(`100% calc(100% - ${above + below}px)`);
  positions.push(`0 ${above}px`);
  const image = images.join(",");
  const size = sizes.join(",");
  const position = positions.join(",");
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: size,
    WebkitMaskSize: size,
    maskPosition: position,
    WebkitMaskPosition: position,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
}

/** A wave mask dealt once per mount: random on arrival, then held still. */
export function useWaveMask(edges: WaveEdges): CSSProperties {
  const [seed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
  return useMemo(() => waveMaskStyle(seed, edges), [seed, edges.top, edges.bottom, edges.width]); // eslint-disable-line react-hooks/exhaustive-deps
}
