import { describe, it, expect } from "vitest";
import { buildLayout, canSpell, cellsOf, cellKey } from "@/features/words/layout";
import { LEVELS_PER_SCENE, SCENES, WORDS_LANGUAGES, buildLevels, sceneOf, type RawLevel } from "@/features/words/levels";
import { RAW_LEVELS as en } from "@/features/words/levels.en.generated";
import { RAW_LEVELS as ka } from "@/features/words/levels.ka.generated";
import { RAW_LEVELS as es } from "@/features/words/levels.es.generated";
import { RAW_LEVELS as fr } from "@/features/words/levels.fr.generated";
import { RAW_LEVELS as de } from "@/features/words/levels.de.generated";
import { RAW_LEVELS as it_ } from "@/features/words/levels.it.generated";
import { RAW_LEVELS as pt } from "@/features/words/levels.pt.generated";

/**
 * Every Words level, in every language, has to be playable before it ships.
 *
 * The banks are generated (scripts/words-levels) and each can be wrong in a
 * way nothing else would catch: a board word the wheel cannot spell is a
 * level that can never be finished, and a word the layout cannot cross into
 * the board is a word the player is asked for and never shown. Both would
 * surface as a stuck player, not as an error.
 *
 * Spelling and duplicates are checked for all 4,200 levels. Laying a board
 * out is the slow part (a backtracking search per level), so it runs on a
 * fixed sample across each bank — the generator already laid every board
 * out with the same rules before writing it.
 */
const BANKS: Record<string, RawLevel[]> = { en, ka, es, fr, de, it: it_, pt };
const LAYOUT_SAMPLE_EVERY = 8;

describe("words banks", () => {
  it("has a bank for each of the app's languages", () => {
    expect(Object.keys(BANKS).sort()).toEqual([...WORDS_LANGUAGES].sort());
  });

  for (const lang of WORDS_LANGUAGES) {
    const LEVELS = buildLevels(BANKS[lang]);

    describe(`bank ${lang}`, () => {
      it("has at least 500 levels in whole packs, cycling through the scenes", () => {
        expect(LEVELS.length).toBeGreaterThanOrEqual(500);
        expect(LEVELS.length % LEVELS_PER_SCENE).toBe(0);
        LEVELS.forEach((level, i) => expect(level.number).toBe(i + 1));
        for (const level of LEVELS) expect(sceneOf(level).id).toBe(level.sceneId);
        const firstPack = LEVELS.slice(0, LEVELS_PER_SCENE * SCENES.length).map((l) => l.sceneId);
        expect(new Set(firstPack).size).toBe(SCENES.length);
      });

      it("never repeats a wheel", () => {
        const wheels = LEVELS.map((l) => [...l.letters].sort().join(""));
        expect(new Set(wheels).size).toBe(wheels.length);
      });

      it("spells every board and bonus word from the wheel, in board form", () => {
        for (const level of LEVELS) {
          expect(level.letters.length).toBeGreaterThanOrEqual(4);
          expect(level.letters.length).toBeLessThanOrEqual(8);
          const all = [...level.words, ...level.bonus];
          expect(new Set(all).size, `${lang} ${level.letters}: duplicate word`).toBe(all.length);
          for (const word of all) {
            expect(word.length).toBeGreaterThanOrEqual(3);
            // Board form: no lower case Latin, no Mtavruli Georgian capitals.
            expect(word, `${lang} ${word}: not in board form`).not.toMatch(/[a-z\u1C90-\u1CBF]/);
            expect(canSpell(level.letters, word), `${lang}: ${word} is not spellable from ${level.letters}`).toBe(true);
          }
          const longest = [...level.words].sort((a, b) => b.length - a.length)[0];
          expect([...longest].sort().join("")).toBe([...level.letters].sort().join(""));
        }
      });

      it("lays a sample of boards out with only real words on them", () => {
        for (let i = 0; i < LEVELS.length; i += LAYOUT_SAMPLE_EVERY) {
          const level = LEVELS[i];
          const layout = buildLayout(level.words);
          expect(layout.unplaced, `${lang} ${level.letters}: could not place ${layout.unplaced.join(", ")}`).toEqual([]);
          expect(layout.rows).toBeLessThanOrEqual(9);
          expect(layout.cols).toBeLessThanOrEqual(9);

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
          for (const p of layout.words) {
            for (const { row, col, letter } of cellsOf(p)) {
              expect(layout.cells.get(cellKey(row, col))).toBe(letter);
            }
          }
        }
      }, 60_000);
    });
  }
});
