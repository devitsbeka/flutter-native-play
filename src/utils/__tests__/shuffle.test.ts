import { describe, it, expect, afterEach, vi } from "vitest";
import { shuffleArray } from "@/utils/shuffle";

// Answer order is shuffled before every question. A biased shuffle means the
// correct answer sits in a predictable slot, which is a fairness bug nobody
// would ever notice by playing.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shuffleArray", () => {
  it("does not modify the array it was given", () => {
    const original = ["a", "b", "c", "d"];
    const snapshot = [...original];
    shuffleArray(original);
    expect(original).toEqual(snapshot);
  });

  it("returns a new array", () => {
    const original = ["a", "b", "c"];
    expect(shuffleArray(original)).not.toBe(original);
  });

  it("keeps every element exactly once", () => {
    const original = ["a", "b", "c", "d", "e", "f"];
    const shuffled = shuffleArray(original);
    expect(shuffled).toHaveLength(original.length);
    expect([...shuffled].sort()).toEqual([...original].sort());
  });

  it("handles empty and single-element arrays", () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray(["only"])).toEqual(["only"]);
  });

  it("preserves duplicate values rather than collapsing them", () => {
    const withDupes = ["a", "a", "b", "b"];
    expect([...shuffleArray(withDupes)].sort()).toEqual(["a", "a", "b", "b"]);
  });

  it("is uniform across all positions", () => {
    // The real check. `sort(() => Math.random() - 0.5)` passes every test
    // above and still leaves elements near where they started; only a
    // distribution check catches it.
    const items = ["a", "b", "c", "d"];
    const RUNS = 24_000;
    const counts: Record<string, number[]> = {
      a: [0, 0, 0, 0],
      b: [0, 0, 0, 0],
      c: [0, 0, 0, 0],
      d: [0, 0, 0, 0],
    };

    for (let i = 0; i < RUNS; i++) {
      shuffleArray(items).forEach((item, position) => {
        counts[item][position]++;
      });
    }

    // Each of the 4 items should land in each of the 4 slots ~1/4 of the
    // time. Allow a generous ±15% so this cannot flake, while still being
    // far tighter than a biased shuffle would ever manage.
    const expected = RUNS / items.length;
    for (const item of items) {
      for (let position = 0; position < items.length; position++) {
        const actual = counts[item][position];
        expect(
          Math.abs(actual - expected) / expected,
          `${item} in slot ${position}: ${actual} vs ~${expected}`
        ).toBeLessThan(0.15);
      }
    }
  });

  it("actually reorders, given a generator that says to", () => {
    // Math.random() = 0 makes every draw pick index 0, so the walk from the
    // end swaps (3,0), then (2,0), then (1,0):
    //   a b c d -> d b c a -> c b d a -> b c d a
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(shuffleArray(["a", "b", "c", "d"])).toEqual(["b", "c", "d", "a"]);
  });

  it("leaves the order untouched when every draw picks the current index", () => {
    // Math.random() just under 1 makes j === i on every step: no movement.
    vi.spyOn(Math, "random").mockReturnValue(0.9999999);
    expect(shuffleArray(["a", "b", "c", "d"])).toEqual(["a", "b", "c", "d"]);
  });

  it("works on objects, not just strings", () => {
    const answers = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const shuffled = shuffleArray(answers);
    expect(shuffled.map((a) => a.id).sort()).toEqual([1, 2, 3]);
    // Same object references, not copies.
    expect(shuffled).toContain(answers[0]);
  });
});
