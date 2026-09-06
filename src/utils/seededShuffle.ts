/**
 * Deterministic shuffling: one seed, one order.
 *
 * The category rails deal their cards in a random order on every visit, so
 * a player who never scrolls still meets more of the catalogue than the same
 * first three — but the order must not change under a finger. React
 * re-renders a rail many times while it is being browsed (a favourite
 * toggled, a translation arriving), and `Math.random()` in the render would
 * reshuffle on each. A seed fixed for the mount (see useMountSeed) makes the
 * order a pure function of the list, stable until the page is opened again.
 */

/** mulberry32 — a tiny, fast seeded PRNG. Returns floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates over a copy, driven by the seed. The input is not touched. */
export function seededShuffle<T>(list: readonly T[], seed: number): T[] {
  const rand = seededRandom(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A fresh seed, for the moment a page is opened. */
export function newSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
