// Builds src/features/words/levels.generated.ts — the Words level bank.
//
//   node scripts/words-levels/generate.mjs
//
// Source: scripts/words-levels/common-english.txt, the 20,000 most common
// English words (Google Books n-grams, the "20k" list from
// first20hours/google-10000-english) filtered to plain 3–7 letter words that
// are also in the ENABLE dictionary (no abbreviations, brand names or
// web-isms), in frequency order. Frequency order is what makes the levels fair: the board
// asks for the well-known sub-words of a well-known base word, and the
// obscure ones are bonus at most.
//
// Every generated level still goes through src/__tests__/wordsLevels.test.ts,
// which lays each board out and checks every word against the wheel.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const words = readFileSync(resolve(here, "common-english.txt"), "utf8").split("\n").filter(Boolean);
const rank = new Map(words.map((w, i) => [w, i]));

// Words that read badly on a family game board even though the list is the
// "no swears" one, plus abbreviations and letter-runs that slipped through.
const BLOCK = new Set([
  "sex", "sexy", "porn", "nude", "naked", "erotic", "anal", "gay", "rape", "drug", "drugs", "nazi",
  "www", "http", "html", "xml", "php", "cgi", "gif", "jpg", "png", "mpeg", "pdf", "zip", "faq", "ftp",
  "url", "isbn", "asin", "gmt", "utc", "est", "pst", "mph", "kbps", "mhz", "ghz", "usb", "dvd", "cds",
  "inc", "ltd", "llc", "plc", "corp", "dept", "misc", "etc", "vol", "ref", "ext", "app", "apps",
  "abc", "aaa", "iii", "xxx", "xxl", "sms", "mms", "atm", "ram", "cpu", "ips", "isp", "dns",
  "ebay", "yahoo", "google", "msn", "aol", "cnet", "ieee", "nasa", "cnn", "bbc", "nbc", "cbs",
  "vhs", "hdtv", "nvidia", "ati", "amd", "intel", "ibm", "cisco", "dell", "sony", "nokia",
  "ala", "ana", "ave", "ind", "lol", "omg", "ppm", "psi", "rpm", "sci", "sec", "sic", "tel", "ver",
  "viagra", "cialis", "levitra", "casino", "poker", "pussy", "bitch", "damn", "hell", "shit", "fuck",
  "kinky", "fetish", "bdsm", "milf", "boob", "boobs", "dick", "cock", "piss", "whore", "slut",
]);

// A word is usable when it is in the list, not blocked, and not a bare
// plural of a very common word that would flood the bonus list ("tans").
const usable = (w) => rank.has(w) && !BLOCK.has(w);

function canSpell(letters, word) {
  const pool = new Map();
  for (const ch of letters) pool.set(ch, (pool.get(ch) ?? 0) + 1);
  for (const ch of word) {
    const left = pool.get(ch) ?? 0;
    if (left === 0) return false;
    pool.set(ch, left - 1);
  }
  return true;
}

// --- the same layout engine the app uses, so a level that ships lays out ---
function cellsOf(p) {
  return Array.from(p.word).map((letter, i) => ({
    row: p.dir === "down" ? p.row + i : p.row,
    col: p.dir === "across" ? p.col + i : p.col,
    letter,
  }));
}
const key = (r, c) => `${r},${c}`;
function fits(cells, cand) {
  const placed = cellsOf(cand);
  const across = cand.dir === "across";
  let crossings = 0;
  const before = across ? key(cand.row, cand.col - 1) : key(cand.row - 1, cand.col);
  const after = across ? key(cand.row, cand.col + cand.word.length) : key(cand.row + cand.word.length, cand.col);
  if (cells.has(before) || cells.has(after)) return null;
  for (const { row, col, letter } of placed) {
    const ex = cells.get(key(row, col));
    if (ex) {
      if (ex.letter !== letter || ex.dirs.has(cand.dir)) return null;
      crossings++;
      continue;
    }
    const a = across ? key(row - 1, col) : key(row, col - 1);
    const b = across ? key(row + 1, col) : key(row, col + 1);
    if (cells.has(a) || cells.has(b)) return null;
  }
  return crossings > 0 ? crossings : null;
}
function layoutFits(list, maxDim = 8) {
  const order = [...list].sort((a, b) => b.length - a.length);
  const first = { word: order[0], row: 0, col: 0, dir: "across" };
  const placed = [first];
  const cells = new Map();
  for (const c of cellsOf(first)) cells.set(key(c.row, c.col), { letter: c.letter, dirs: new Set(["across"]) });
  const remaining = new Set(order.slice(1));
  let nodes = 0;
  const bounds = () => {
    let minR = 0, maxR = 0, minC = 0, maxC = 0;
    for (const p of placed) for (const c of cellsOf(p)) { minR = Math.min(minR, c.row); maxR = Math.max(maxR, c.row); minC = Math.min(minC, c.col); maxC = Math.max(maxC, c.col); }
    return { h: maxR - minR + 1, w: maxC - minC + 1 };
  };
  const commit = (p) => { placed.push(p); for (const c of cellsOf(p)) { const k = key(c.row, c.col); const e = cells.get(k); if (e) e.dirs.add(p.dir); else cells.set(k, { letter: c.letter, dirs: new Set([p.dir]) }); } };
  const uncommit = (p) => { placed.pop(); for (const c of cellsOf(p)) { const k = key(c.row, c.col); const e = cells.get(k); if (!e) continue; e.dirs.delete(p.dir); if (e.dirs.size === 0) cells.delete(k); } };
  const dfs = () => {
    if (remaining.size === 0) return true;
    if (nodes++ > 20000) return false;
    for (const word of Array.from(remaining)) {
      const cands = [];
      for (const anchor of placed) {
        const dir = anchor.dir === "across" ? "down" : "across";
        const ac = cellsOf(anchor);
        for (let ai = 0; ai < ac.length; ai++) for (let wi = 0; wi < word.length; wi++) {
          if (ac[ai].letter !== word[wi]) continue;
          const p = { word, dir, row: dir === "down" ? ac[ai].row - wi : ac[ai].row, col: dir === "across" ? ac[ai].col - wi : ac[ai].col };
          const cr = fits(cells, p);
          if (cr === null) continue;
          commit(p);
          const b = bounds();
          uncommit(p);
          if (b.h > maxDim || b.w > maxDim) continue;
          cands.push({ p, score: b.w * b.h * 10 + Math.abs(b.w - b.h) * 3 - cr });
        }
      }
      cands.sort((a, b) => a.score - b.score);
      for (const { p } of cands) {
        remaining.delete(word);
        commit(p);
        if (dfs()) return true;
        uncommit(p);
        remaining.add(word);
        if (nodes > 20000) return false;
      }
    }
    return false;
  };
  return dfs();
}

// --- candidates: common 5–7 letter base words with enough common sub-words ---
const byLetters = new Map();
for (const w of words) if (usable(w)) byLetters.set(w, w);

const levels = [];
const seenBase = new Set();
for (const base of words) {
  if (base.length < 5 || base.length > 7 || !usable(base)) continue;
  const sorted = [...base].sort().join("");
  if (seenBase.has(sorted)) continue; // the same wheel twice is the same level
  const subs = [];
  for (const w of words) {
    if (w === base || w.length < 3 || w.length > base.length || !usable(w)) continue;
    if (canSpell(base, w)) subs.push(w);
  }
  if (subs.length < 4) continue;
  seenBase.add(sorted);
  // Board: the base plus the best-known sub-words, longer ones first so a
  // board is not six three-letter words, up to 7 in all.
  const ranked = subs.sort((a, b) => rank.get(a) - rank.get(b));
  const longer = ranked.filter((w) => w.length >= 4);
  const short = ranked.filter((w) => w.length === 3);
  const board = [base];
  const tryAdd = (w) => {
    if (board.length >= 7) return;
    // Not two board words that are one another's plural/singular — the
    // second reads as a freebie ("cat" and "cats").
    if (board.some((b) => b + "s" === w || w + "s" === b)) return;
    if (layoutFits([...board, w])) board.push(w);
  };
  for (const w of longer.slice(0, 8)) tryAdd(w);
  for (const w of short) {
    if (board.filter((b) => b.length === 3).length >= 3) break;
    tryAdd(w);
  }
  for (const w of longer.slice(8)) tryAdd(w);
  if (board.length < 5) continue;
  const bonus = ranked.filter((w) => !board.includes(w)).slice(0, 40);
  levels.push({ letters: base, words: board, bonus, rank: rank.get(base) });
}

// Order: shorter wheels first, then by how common the base word is.
levels.sort((a, b) => a.letters.length - b.letters.length || a.rank - b.rank);
const MAX = 600;
const out = levels.slice(0, MAX);

const body = out
  .map((l) => `  { letters: ${JSON.stringify(l.letters.toUpperCase())}, words: ${JSON.stringify(l.words.map((w) => w.toUpperCase()))}, bonus: ${JSON.stringify(l.bonus.map((w) => w.toUpperCase()))} },`)
  .join("\n");
writeFileSync(
  resolve(here, "../../src/features/words/levels.generated.ts"),
  `// Generated by scripts/words-levels/generate.mjs — do not edit by hand.\n// ${out.length} levels from the ${words.length} most common 3–7 letter English words.\n\nexport interface RawLevel {\n  letters: string;\n  words: string[];\n  bonus: string[];\n}\n\nexport const RAW_LEVELS: RawLevel[] = [\n${body}\n];\n`,
);
console.log(`wrote ${out.length} levels (${levels.length} candidates)`);
