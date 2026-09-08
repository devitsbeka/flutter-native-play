/**
 * The state two players share on one Words board, and how two copies of it
 * are reconciled.
 *
 * There is no server half: the board is decided by the level number, so the
 * only thing the two devices have to agree on is what has been found and
 * which level they are on. Everything in here is grow-only within a level —
 * a word found stays found, a hint revealed stays revealed — which makes the
 * merge a union with no coordination, and a newer level simply replaces an
 * older one. Either device can hold the newer copy at any moment; whichever
 * receives an older one answers with its own, so a reload or a late join
 * catches up on the next exchange.
 */

import { isWordsLanguage, type WordsLanguage } from "./levels";

export interface SharedState {
  /** The bank the board comes from — the host's language, for both. */
  lang: WordsLanguage;
  /** 1-based level number, the same for both players. */
  level: number;
  /** Board word → id of the player who found it. */
  found: Record<string, string>;
  /** Bonus word → id of the player who found it. */
  bonus: Record<string, string>;
  /** Cells revealed by hints, "row,col". */
  hinted: string[];
  /** Monotonic on each device; the tie-breaker for identical levels. */
  rev: number;
}

export const emptyShared = (level = 1, lang: WordsLanguage = "en"): SharedState => ({
  lang,
  level,
  found: {},
  bonus: {},
  hinted: [],
  rev: 0,
});

/** True when `incoming` carries something `local` does not. */
export function hasNews(local: SharedState, incoming: SharedState): boolean {
  // A different bank is a different board; the host's wins (see merge).
  if (incoming.lang !== local.lang) return true;
  if (incoming.level > local.level) return true;
  if (incoming.level < local.level) return false;
  if (Object.keys(incoming.found).some((w) => !(w in local.found))) return true;
  if (Object.keys(incoming.bonus).some((w) => !(w in local.bonus))) return true;
  if (incoming.hinted.some((c) => !local.hinted.includes(c))) return true;
  return false;
}

/**
 * The union of two credit maps (`found` or `bonus`), with a same-word
 * conflict resolved the same way on both sides.
 *
 * Two devices can each commit a find before hearing the other's broadcast,
 * so the same word can arrive with two different finders. There is no
 * shared clock to say who was first, so the tie is broken on something both
 * copies already agree on regardless of which one is "local" for this
 * merge: the lower player id. That makes the merge commutative — whichever
 * side runs it lands on the same winner — which a plain object spread
 * (last writer, i.e. whichever side is merging, wins) does not.
 */
function mergeCredit(local: Record<string, string>, incoming: Record<string, string>): Record<string, string> {
  const merged: Record<string, string> = { ...incoming, ...local };
  for (const word of Object.keys(merged)) {
    const a = local[word];
    const b = incoming[word];
    if (a !== undefined && b !== undefined && a !== b) merged[word] = a < b ? a : b;
  }
  return merged;
}

/** The union of two copies of the same level, or the newer level outright. */
export function mergeShared(local: SharedState, incoming: SharedState): SharedState {
  // Two banks cannot be added up. The incoming copy is the room's (the
  // joiner asks, the room answers), so it decides the language.
  if (incoming.lang !== local.lang) return { ...incoming, rev: Math.max(local.rev, incoming.rev) + 1 };
  if (incoming.level > local.level) return { ...incoming, rev: Math.max(local.rev, incoming.rev) + 1 };
  if (incoming.level < local.level) return local;
  return {
    lang: local.lang,
    level: local.level,
    // A word (or bonus word) found by both before either heard the other's
    // broadcast: the lower player id wins on every device, so the two
    // friends' scores converge instead of each keeping its own credit.
    found: mergeCredit(local.found, incoming.found),
    bonus: mergeCredit(local.bonus, incoming.bonus),
    hinted: Array.from(new Set([...local.hinted, ...incoming.hinted])),
    rev: Math.max(local.rev, incoming.rev) + 1,
  };
}

export const isSharedState = (v: unknown): v is SharedState => {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<SharedState>;
  return (
    isWordsLanguage(s.lang) &&
    typeof s.level === "number" &&
    typeof s.found === "object" &&
    s.found !== null &&
    typeof s.bonus === "object" &&
    s.bonus !== null &&
    Array.isArray(s.hinted) &&
    typeof s.rev === "number"
  );
};
