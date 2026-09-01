import { motion } from "framer-motion";
import type { Layout, PlacedWord } from "./layout";
import { cellKey, cellsOf } from "./layout";

/**
 * The crossword board. Unfilled cells are dark tiles; a found word's cells
 * turn the scene's accent colour and show their letters, popping in one
 * after another along the word.
 */
interface Props {
  layout: Layout;
  /** Cells whose letter is showing, "row,col" → letter. */
  revealed: Map<string, string>;
  /** Cells of the word just found, in order, so they pop in a wave. */
  wave: string[];
  /** The cell a hint just revealed — it gets the sparkle. */
  hintKey?: string | null;
  /** Words whose every cell is showing; tapping one asks what it means. */
  onWordTap?: (word: PlacedWord) => void;
  cellSize: number;
  gap: number;
  accent: string;
  tile: string;
}

const SPARKS = [0, 60, 120, 180, 240, 300];

export function Board({ layout, revealed, wave, hintKey, onWordTap, cellSize, gap, accent, tile }: Props) {
  const width = layout.cols * cellSize + (layout.cols - 1) * gap;
  const height = layout.rows * cellSize + (layout.rows - 1) * gap;

  // Which word to open when a cell is tapped: the first fully-revealed word
  // through that cell (a crossing cell belongs to two).
  const wordAt = (key: string): PlacedWord | undefined =>
    layout.words.find(
      (p) => cellsOf(p).some((c) => cellKey(c.row, c.col) === key) && cellsOf(p).every((c) => revealed.has(cellKey(c.row, c.col))),
    );

  const cells: JSX.Element[] = [];
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const key = cellKey(r, c);
      if (!layout.cells.has(key)) continue;
      const letter = revealed.get(key);
      const waveIndex = wave.indexOf(key);
      const sparkle = hintKey === key;
      const tappable = !!letter && !!onWordTap && !!wordAt(key);
      cells.push(
        <div
          key={key}
          className="absolute"
          style={{
            left: c * (cellSize + gap),
            top: r * (cellSize + gap),
            width: cellSize,
            height: cellSize,
          }}
          onClick={() => {
            if (!tappable) return;
            const w = wordAt(key);
            if (w) onWordTap?.(w);
          }}
          role={tappable ? "button" : undefined}
        >
          <div
            className="absolute inset-0 rounded-[6px]"
            style={{ background: tile, boxShadow: "0 2px 4px rgba(0,0,0,0.25)" }}
          />
          {letter && (
            <motion.div
              key={`${key}-${letter}`}
              initial={waveIndex >= 0 ? { scale: 0.3, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 26,
                delay: waveIndex >= 0 ? waveIndex * 0.06 : 0,
              }}
              className="absolute inset-0 flex items-center justify-center rounded-[6px] font-extrabold text-white"
              style={{
                background: accent,
                fontSize: cellSize * 0.62,
                lineHeight: 1,
                boxShadow: "0 3px 0 rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.25)",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {letter}
            </motion.div>
          )}
          {sparkle && letter && (
            // A hint lands like a little spell: a gold ring breathes out,
            // six sparks fly, and the tile itself flashes bright.
            <div className="pointer-events-none absolute inset-0 overflow-visible" key={`spark-${key}`}>
              <motion.div
                className="absolute inset-0 rounded-[6px]"
                initial={{ opacity: 0.9, boxShadow: "0 0 0 0 rgba(255,216,77,0.9)" }}
                animate={{ opacity: 0, boxShadow: "0 0 0 18px rgba(255,216,77,0)" }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-[6px] bg-white"
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
              />
              {SPARKS.map((deg) => (
                <motion.span
                  key={deg}
                  className="absolute left-1/2 top-1/2 text-[#FFD84D]"
                  style={{ fontSize: cellSize * 0.42, lineHeight: 1, textShadow: "0 0 6px rgba(255,216,77,0.9)" }}
                  initial={{ x: "-50%", y: "-50%", scale: 0.2, opacity: 1, rotate: deg }}
                  animate={{
                    x: `calc(-50% + ${Math.cos((deg * Math.PI) / 180) * cellSize * 0.95}px)`,
                    y: `calc(-50% + ${Math.sin((deg * Math.PI) / 180) * cellSize * 0.95}px)`,
                    scale: [0.2, 1.1, 0.6],
                    opacity: [1, 1, 0],
                    rotate: deg + 90,
                  }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                >
                  ✦
                </motion.span>
              ))}
            </div>
          )}
        </div>,
      );
    }
  }

  return (
    <div className="relative" style={{ width, height }} role="grid" aria-label="Crossword">
      {cells}
    </div>
  );
}
