import { describe, it, expect } from "vitest";
import { buildLayout, canSpell, cellsOf, cellKey } from "@/features/words/layout";
import { LEVELS, SCENES, LEVELS_PER_SCENE, sceneOf } from "@/features/words/levels";

/**
 * Every Words level has to be playable before it ships.
 *
 * The level data is hand-written — a wheel of letters, the words on the
 * board, the bonus words — and each of those can be wrong in a way nothing
 * else would catch: a board word the wheel cannot spell is a level that can
 * never be finished, and a word the layout cannot cross into the board is a
 * word the player is asked for and never shown. Both would surface as a
 * stuck player, not as an error.
 */
describe("words levels", () => {
  it("has whole packs, one scene each", () => {
    expect(LEVELS.length % LEVELS_PER_SCENE).toBe(0);
    expect(LEVELS.length / LEVELS_PER_SCENE).toBeLessThanOrEqual(SCENES.length);
    for (const level of LEVELS) expect(sceneOf(level).id).toBe(level.sceneId);
  });

  it("numbers levels from one, in order", () => {
    LEVELS.forEach((level, i) => expect(level.number).toBe(i + 1));
  });

  for (const level of LEVELS) {
    describe(`level ${level.number} (${level.letters})`, () => {
      it("spells every board and bonus word from the wheel", () => {
        for (const word of [...level.words, ...level.bonus]) {
          expect(canSpell(level.letters, word), `${word} is not spellable from ${level.letters}`).toBe(true);
        }
      });

      it("keeps the wheel to at most seven letters", () => {
        expect(level.letters.length).toBeGreaterThanOrEqual(4);
        expect(level.letters.length).toBeLessThanOrEqual(7);
      });

      it("uses every wheel letter in the longest word", () => {
        // The wheel is the longest word's letters, so the board's biggest
        // word always uses the whole wheel — that is the level's "answer".
        const longest = [...level.words].sort((a, b) => b.length - a.length)[0];
        expect([...longest].sort().join("")).toBe([...level.letters].sort().join(""));
      });

      it("has no duplicate words and no bonus word on the board", () => {
        const all = [...level.words, ...level.bonus];
        expect(new Set(all).size).toBe(all.length);
        for (const word of all) expect(word.length).toBeGreaterThanOrEqual(3);
      });

      it("lays every word out on a board that fits a phone", () => {
        const layout = buildLayout(level.words);
        expect(layout.unplaced, `could not place: ${layout.unplaced.join(", ")}`).toEqual([]);
        expect(layout.words.length).toBe(level.words.length);
        expect(layout.rows).toBeLessThanOrEqual(9);
        expect(layout.cols).toBeLessThanOrEqual(9);
      });

      it("reads only real words in every run of the board", () => {
        // A word placed beside another would create a run of letters that
        // is not on the list; the layout rules forbid it, this proves it.
        const layout = buildLayout(level.words);
        const runs: string[] = [];
        for (let r = 0; r < layout.rows; r++) {
          let run = "";
          for (let c = 0; c <= layout.cols; c++) {
            const ch = layout.cells.get(cellKey(r, c));
            if (ch) run += ch;
            else {
              if (run.length > 1) runs.push(run);
              run = "";
            }
          }
        }
        for (let c = 0; c < layout.cols; c++) {
          let run = "";
          for (let r = 0; r <= layout.rows; r++) {
            const ch = layout.cells.get(cellKey(r, c));
            if (ch) run += ch;
            else {
              if (run.length > 1) runs.push(run);
              run = "";
            }
          }
        }
        expect(runs.sort()).toEqual([...level.words].sort());
        // And each placed word occupies exactly the cells its letters say.
        for (const p of layout.words) {
          for (const { row, col, letter } of cellsOf(p)) {
            expect(layout.cells.get(cellKey(row, col))).toBe(letter);
          }
        }
      });
    });
  }
});
