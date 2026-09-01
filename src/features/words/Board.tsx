import { motion } from "framer-motion";
import type { Layout } from "./layout";
import { cellKey } from "./layout";

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
  cellSize: number;
  gap: number;
  accent: string;
  tile: string;
}

export function Board({ layout, revealed, wave, cellSize, gap, accent, tile }: Props) {
  const width = layout.cols * cellSize + (layout.cols - 1) * gap;
  const height = layout.rows * cellSize + (layout.rows - 1) * gap;

  const cells: JSX.Element[] = [];
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const key = cellKey(r, c);
      if (!layout.cells.has(key)) continue;
      const letter = revealed.get(key);
      const waveIndex = wave.indexOf(key);
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
