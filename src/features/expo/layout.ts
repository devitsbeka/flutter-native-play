/**
 * Crossword layout for the Expo word-wheel mode.
 *
 * A level is a handful of words that all come from the same few letters. The
 * board shows them interlocked, the way a crossword does, and the player fills
 * them in by dragging across the letter wheel. This file turns the word list
 * into that board.
 *
 * Deterministic on purpose: the same word list always yields the same board,
 * so a level looks the same on every device and a saved game can be restored
 * by word alone. `src/__tests__/expoLevels.test.ts` runs every level through
 * this and fails if one cannot be laid out, so a bad word list is caught
 * before it ships rather than by a player staring at a missing word.
 */

export type Direction = "across" | "down";

export interface PlacedWord {
  word: string;
  row: number;
  col: number;
  dir: Direction;
}

export interface Layout {
  rows: number;
  cols: number;
  words: PlacedWord[];
  /** Every cell that belongs to some word, keyed "row,col" → letter. */
  cells: Map<string, string>;
}

export const cellKey = (row: number, col: number) => `${row},${col}`;

/** The cells a placement would occupy, in word order. */
export function cellsOf(p: PlacedWord): Array<{ row: number; col: number; letter: string }> {
  return Array.from(p.word).map((letter, i) => ({
    row: p.dir === "down" ? p.row + i : p.row,
    col: p.dir === "across" ? p.col + i : p.col,
    letter,
  }));
}

/**
 * Can `candidate` go on the board without touching anything it should not?
 *
 * A word may share cells with words it crosses, and nothing else. Two words
 * running side by side would read as a third, unintended word, so every
 * non-crossing cell of the new word needs empty cells on both flanks, and the
 * cells just before its first letter and just after its last must be empty.
 * Returns the number of crossings, or null when the word does not fit.
 */
interface Cell {
  letter: string;
  /** The directions of the words running through this cell. */
  dirs: Set<Direction>;
}

function fits(cells: Map<string, Cell>, candidate: PlacedWord): number | null {
  const placed = cellsOf(candidate);
  const across = candidate.dir === "across";
  let crossings = 0;

  const before = across
    ? cellKey(candidate.row, candidate.col - 1)
    : cellKey(candidate.row - 1, candidate.col);
  const after = across
    ? cellKey(candidate.row, candidate.col + candidate.word.length)
    : cellKey(candidate.row + candidate.word.length, candidate.col);
  if (cells.has(before) || cells.has(after)) return null;

  for (const { row, col, letter } of placed) {
    const existing = cells.get(cellKey(row, col));
    if (existing !== undefined) {
      // Sharing a cell is a crossing only when the other word runs the
      // other way; along the same axis it would be one word lying on top
      // of another (RUN inside RUNT), which reads as a single run.
      if (existing.letter !== letter || existing.dirs.has(candidate.dir)) return null;
      crossings += 1;
      continue;
    }
    const flankA = across ? cellKey(row - 1, col) : cellKey(row, col - 1);
    const flankB = across ? cellKey(row + 1, col) : cellKey(row, col + 1);
    if (cells.has(flankA) || cells.has(flankB)) return null;
  }

  return crossings > 0 ? crossings : null;
}

interface Bounds {
  minR: number;
  minC: number;
  maxR: number;
  maxC: number;
}

function extend(b: Bounds, p: PlacedWord): Bounds {
  const out = { ...b };
  for (const { row, col } of cellsOf(p)) {
    out.minR = Math.min(out.minR, row);
    out.maxR = Math.max(out.maxR, row);
    out.minC = Math.min(out.minC, col);
    out.maxC = Math.max(out.maxC, col);
  }
  return out;
}

const NODE_BUDGET = 60_000;

/**
 * Place every word, or as many as possible.
 *
 * The longest word goes across at the origin. From there it is a search: at
 * each step any remaining word may be placed wherever it crosses something
 * already on the board, and the search backs out of dead ends. The board is
 * kept inside a square of side `maxDim`; the caller grows that from small to
 * large, so the first full solution found is also the most compact one.
 */
function search(
  words: string[],
  maxDim: number,
): { placed: PlacedWord[]; cells: Map<string, string>; complete: boolean } {
  const first = words[0];
  const start: PlacedWord = { word: first, row: 0, col: 0, dir: "across" };
  const placed: PlacedWord[] = [start];
  const cells = new Map<string, Cell>();
  for (const { row, col, letter } of cellsOf(start)) {
    cells.set(cellKey(row, col), { letter, dirs: new Set([start.dir]) });
  }
  let bounds = extend({ minR: 0, minC: 0, maxR: 0, maxC: 0 }, start);

  const remaining = new Set(words.slice(1));
  let nodes = 0;
  let best: PlacedWord[] = [...placed];

  const candidatesFor = (word: string) => {
    const out: Array<{ p: PlacedWord; score: number; b: Bounds }> = [];
    for (const anchor of placed) {
      const dir: Direction = anchor.dir === "across" ? "down" : "across";
      const anchorCells = cellsOf(anchor);
      for (let ai = 0; ai < anchorCells.length; ai++) {
        for (let wi = 0; wi < word.length; wi++) {
          if (anchorCells[ai].letter !== word[wi]) continue;
          const p: PlacedWord = {
            word,
            dir,
            row: dir === "down" ? anchorCells[ai].row - wi : anchorCells[ai].row,
            col: dir === "across" ? anchorCells[ai].col - wi : anchorCells[ai].col,
          };
          const crossings = fits(cells, p);
          if (crossings === null) continue;
          const b = extend(bounds, p);
          const h = b.maxR - b.minR + 1;
          const w = b.maxC - b.minC + 1;
          if (h > maxDim || w > maxDim) continue;
          // Compact first, squarer second, better-knit third.
          out.push({ p, b, score: w * h * 10 + Math.abs(w - h) * 3 - crossings });
        }
      }
    }
    return out.sort((a, b) => a.score - b.score);
  };

  const commit = (p: PlacedWord) => {
    placed.push(p);
    for (const { row, col, letter } of cellsOf(p)) {
      const key = cellKey(row, col);
      const cell = cells.get(key);
      if (cell) cell.dirs.add(p.dir);
      else cells.set(key, { letter, dirs: new Set([p.dir]) });
    }
  };
  const uncommit = (p: PlacedWord) => {
    placed.pop();
    // Only this word's claim on each cell goes; a crossing word keeps its own.
    for (const { row, col } of cellsOf(p)) {
      const key = cellKey(row, col);
      const cell = cells.get(key);
      if (!cell) continue;
      cell.dirs.delete(p.dir);
      if (cell.dirs.size === 0) cells.delete(key);
    }
  };

  const dfs = (): boolean => {
    if (remaining.size === 0) return true;
    if (nodes++ > NODE_BUDGET) return false;
    if (placed.length > best.length) best = [...placed];

    for (const word of Array.from(remaining)) {
      for (const { p, b } of candidatesFor(word)) {
        const savedBounds = bounds;
        remaining.delete(word);
        commit(p);
        bounds = b;
        if (dfs()) return true;
        uncommit(p);
        bounds = savedBounds;
        remaining.add(word);
        if (nodes > NODE_BUDGET) return false;
      }
    }
    return false;
  };

  const complete = dfs();
  const result = complete ? placed : best;
  const resultCells = new Map<string, string>();
  for (const p of result) {
    for (const { row, col, letter } of cellsOf(p)) resultCells.set(cellKey(row, col), letter);
  }
  return { placed: result, cells: resultCells, complete };
}

/**
 * Lay the words out. Tries the tightest square first and widens until every
 * word fits; if none does, returns the fullest board found and names the
 * words it could not place.
 */
export function buildLayout(wordList: string[], maxDim = 9): Layout & { unplaced: string[] } {
  const words = wordList.map((w) => w.toUpperCase());
  // Longest first, then stable by the order the level author gave, so the
  // author can nudge the board by reordering equal-length words.
  const order = words
    .map((word, i) => ({ word, i }))
    .sort((a, b) => b.word.length - a.word.length || a.i - b.i)
    .map((x) => x.word);

  if (order.length === 0) return { rows: 0, cols: 0, words: [], cells: new Map(), unplaced: [] };

  let result = search(order, order[0].length);
  for (let dim = order[0].length + 1; dim <= maxDim && !result.complete; dim++) {
    result = search(order, dim);
  }

  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const p of result.placed) {
    for (const { row, col } of cellsOf(p)) {
      minR = Math.min(minR, row);
      maxR = Math.max(maxR, row);
      minC = Math.min(minC, col);
      maxC = Math.max(maxC, col);
    }
  }

  const shifted = result.placed.map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }));
  const cells = new Map<string, string>();
  for (const p of shifted) {
    for (const { row, col, letter } of cellsOf(p)) cells.set(cellKey(row, col), letter);
  }
  const placedWords = new Set(shifted.map((p) => p.word));

  return {
    rows: maxR - minR + 1,
    cols: maxC - minC + 1,
    words: shifted,
    cells,
    unplaced: order.filter((w) => !placedWords.has(w)),
  };
}

/**
 * Is `word` spellable from `letters`, using each wheel letter at most once?
 * The wheel is a multiset: HEAVEN offers two E's, so EVE is fine and EEE is
 * not.
 */
export function canSpell(letters: string, word: string): boolean {
  const pool = new Map<string, number>();
  for (const ch of letters.toUpperCase()) pool.set(ch, (pool.get(ch) ?? 0) + 1);
  for (const ch of word.toUpperCase()) {
    const left = pool.get(ch) ?? 0;
    if (left === 0) return false;
    pool.set(ch, left - 1);
  }
  return true;
}
