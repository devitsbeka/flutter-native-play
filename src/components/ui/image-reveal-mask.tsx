import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A cover over a picture that opens a tile at a time as the timer runs down.
 *
 * Guess-the-logo has a problem the content cannot fix: a great many real
 * brand marks ARE the company's name set in a typeface. Wikidata hands back
 * "Yandex" written in Yandex's font, and the card asks which brand that is
 * with the answer printed across it. Filtering those out would throw away
 * most of the well-known brands in the bank.
 *
 * So the picture is covered instead, and uncovered in pieces while the clock
 * runs. Answering early means recognising a corner of the mark; waiting means
 * seeing more and scoring less. That turns the wordmarks from the weakest
 * cards in the category into ordinary ones, and makes the symbol marks
 * genuinely hard.
 *
 * The order is SEEDED, not random. Two players in the same room must be
 * shown the same pieces at the same moment or the round is not a fair race,
 * and the seed has to be something both devices already agree on without
 * talking to each other -- the picture's own URL.
 */

const COLS = 6;
const ROWS = 4;
const TILES = COLS * ROWS;

/** Tiles open at the start: enough to be a clue, not enough to be an answer. */
const START_VISIBLE = 3;

/**
 * How far into the question everything is open. At 0.85 the last tile lifts
 * with about two seconds left on a fifteen-second timer, so a player who
 * knows it late can still answer, and nobody is asked to name a picture they
 * were never shown.
 */
const FULLY_OPEN_AT = 0.85;

function hashSeed(value: string): number {
  // FNV-1a. Small, stable, and identical in every JS engine -- which is the
  // whole requirement here, since two phones must derive the same order.
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rank[tileIndex] = its position in the reveal order. */
function revealRanks(seed: number): number[] {
  const order = Array.from({ length: TILES }, (_, i) => i);
  const rnd = mulberry32(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const rank = new Array<number>(TILES);
  order.forEach((tile, position) => {
    rank[tile] = position;
  });
  return rank;
}

interface ImageRevealMaskProps {
  /** Anything stable and unique to this question. The image URL is both. */
  seed: string;
  /** 100 at the start of the question, 0 when time is up. */
  progressPercent: number;
  /** Lift the whole cover: the answer is in, so show what it was. */
  revealAll?: boolean;
  className?: string;
}

export const ImageRevealMask: React.FC<ImageRevealMaskProps> = ({
  seed,
  progressPercent,
  revealAll = false,
  className,
}) => {
  const ranks = React.useMemo(() => revealRanks(hashSeed(seed)), [seed]);

  const elapsed = 1 - Math.max(0, Math.min(100, progressPercent)) / 100;
  const opened = revealAll
    ? TILES
    : Math.min(
        TILES,
        START_VISIBLE + Math.round((elapsed / FULLY_OPEN_AT) * (TILES - START_VISIBLE)),
      );

  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 grid pointer-events-none", className)}
      style={{
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      }}
    >
      {ranks.map((rank, tile) => (
        <div
          key={tile}
          // The white line is drawn INSIDE the tile rather than as a grid gap.
          // A gap would let a hairline of the picture through every seam, and
          // on a wordmark those hairlines are enough to read the name.
          style={{ boxShadow: "inset 0 0 0 1px #FFFFFF" }}
          className={cn(
            "bg-slate-200 transition-opacity duration-500 ease-out",
            rank < opened && "opacity-0",
          )}
        />
      ))}
    </div>
  );
};
