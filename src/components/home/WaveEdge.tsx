import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The wavy edge the home frame draws along the top and bottom of its
 * surfaces (Figma "Hom" 1076:1881): a flat-based band whose free edge rolls
 * in gentle hills. Laid just outside a surface's straight edge in the
 * surface's own colour, it turns that edge into a wave.
 *
 * Three shapes, each the frame's own path at its own size:
 *   feed — 500×16, the feed panel's top (node 1076:3281)
 *   card — 427×16, the profile card's top and bottom (1076:3700 / 3697)
 *   room — 243×10, a room card's top and bottom (1076:3672 – 3676)
 *
 * The base sits along the bottom of the box with the hills rising from it,
 * so a top edge takes it as is and a bottom edge takes it flipped. The
 * viewBox stretches to whatever width the surface has on the phone.
 */
export type WaveShape = "feed" | "card" | "room";

const SHAPES: Record<WaveShape, { w: number; h: number; d: string }> = {
  feed: {
    w: 500,
    h: 16,
    d: "M0 14C62.5 4 125 16 187.5 8C250 0 312.5 16 375 10C437.5 4 479.167 14 500 6V16H0V14Z",
  },
  card: {
    w: 427,
    h: 16,
    d: "M0 14C53.375 4 106.75 16 160.125 8C213.5 0 266.875 16 320.25 10C373.625 4 409 0 422 10L427 16H0V14Z",
  },
  room: {
    w: 243,
    h: 10,
    d: "M0 8.05654C30.375 -1.66074 60.75 10 91.125 2.22617C121.5 -5.54765 151.875 10 182.25 4.16963C206.608 -0.505724 224.454 6.06638 235.791 4.84519C238.95 4.50482 243 6.82211 243 10H0V8.05654Z",
  },
};

interface WaveEdgeProps {
  shape: WaveShape;
  /** The surface's colour, so the hills read as part of it. */
  color: string;
  /** Turn it over for a bottom edge. */
  flip?: boolean;
  /** Placement — the caller positions it absolutely against the edge. */
  className?: string;
  style?: CSSProperties;
}

export function WaveEdge({ shape, color, flip = false, className, style }: WaveEdgeProps) {
  const s = SHAPES[shape];
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${s.w} ${s.h}`}
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute block", className)}
      style={{ ...style, transform: flip ? "rotate(180deg)" : undefined }}
    >
      <path d={s.d} fill={color} />
    </svg>
  );
}
