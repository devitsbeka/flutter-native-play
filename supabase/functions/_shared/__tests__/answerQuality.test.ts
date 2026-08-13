import { describe, it, expect } from "vitest";
import { rejectAnswerSet } from "../answerQuality";

/**
 * Every rejected case below is real output this bank already contains, or the
 * shape of it. The accepted cases are the ones a stricter gate would wrongly
 * throw away — mostly names, which cannot be shortened without becoming wrong.
 */

const accept = (
  originalCorrect: string,
  originalIncorrect: string[],
  newCorrect: string,
  newIncorrect: string[],
) => rejectAnswerSet(originalCorrect, originalIncorrect, newCorrect, newIncorrect);

describe("rejectAnswerSet", () => {
  describe("rejects", () => {
    it("an invented abbreviation, which is what the first shortening pass produced", () => {
      expect(
        accept("Pritzker Prize Foundation", ["a", "b", "c"], "Pritzker Prize Fdn", [
          "Global Arch. Board",
          "Intl. Design Comm.",
          "World Bldg Awards",
        ]),
      ).toMatch(/invented abbreviation/);
    });

    it("a clipped phrase left as dangling initials", () => {
      expect(
        accept("Noise-induced hearing loss", ["a", "b", "c"], "Noise-induced H.L.", [
          "Strobe epilepsy",
          "Stage dust allergy",
          "Mic feedback burns",
        ]),
      ).toMatch(/clipped phrase/);
    });

    it("a word chopped with a full stop mid-label", () => {
      expect(
        accept("Global Architecture Board", ["a", "b", "c"], "Global Arch. Board", [
          "Alpha",
          "Beta",
          "Gamma",
        ]),
      ).toMatch(/invented abbreviation/);
    });

    it("a proper noun renamed to make it fit", () => {
      // Philosophical Investigations is a real book; Philosophical Studies is not.
      expect(
        accept("Philosophical Investigations", ["a", "b", "c"], "Philosophical Studies", [
          "Tractatus",
          "On Certainty",
          "Blue Book",
        ]),
      ).toBeTruthy();
    });

    it("a set where the correct answer is left as the longest", () => {
      expect(
        accept(
          "Humans have a low fat-to-muscle ratio",
          ["a", "b", "c"],
          "Humans have too little body fat to be worth eating",
          ["Blood repels", "Skin is toxic", "Poor eyesight"],
        ),
      ).toMatch(/guessable/);
    });

    it("a set where two options collapsed into the same text", () => {
      expect(
        accept("Igneous rock", ["Sedimentary", "Metamorphic", "Limestone"], "Igneous", [
          "Igneous",
          "Metamorphic",
          "Limestone",
        ]),
      ).toMatch(/the same/);
    });

    it("a no-op dressed up as a success", () => {
      expect(
        accept("Four", ["Three", "Two", "Six"], "Four", ["Three", "Two", "Six"]),
      ).toMatch(/no change/);
    });

    it("an answer still long enough to ellipsize", () => {
      const long = "A".repeat(60);
      expect(accept("orig", ["a", "b", "c"], long, [long + "b", long + "c", long + "d"])).toMatch(
        /ellipsizes/,
      );
    });
  });

  describe("accepts", () => {
    it("dropping the noun the question already supplied", () => {
      expect(
        accept(
          "Four chambers",
          ["Three chambers", "Two chambers", "Six chambers"],
          "Four",
          ["Three", "Two", "Six"],
        ),
      ).toBeNull();
    });

    it("collapsing a name to its own initials", () => {
      // Every key token disappears, but as a letter each — a shortening, not a rename.
      expect(
        accept(
          "World Health Organization",
          ["UNICEF", "UNESCO", "UNHCR"],
          "WHO",
          ["UNICEF", "UNESCO", "UNHCR"],
        ),
      ).toBeNull();
    });

    it("a proper noun kept over the limit rather than renamed", () => {
      expect(
        accept(
          "Philosophical Investigations (1953)",
          ["a", "b", "c"],
          "Philosophical Investigations",
          [
            "Tractatus Logico-Philosophicus",
            "On Certainty",
            "The Blue and Brown Books",
          ],
        ),
      ).toBeNull();
    });

    it("initials that introduce a surname", () => {
      expect(
        accept(
          "William Butler Yeats",
          ["Thomas Stearns Eliot", "Robert Lee Frost", "Ezra Weston Pound"],
          "W.B. Yeats",
          ["T.S. Eliot", "Robert Frost", "Ezra Pound"],
        ),
      ).toBeNull();
    });

    it("lengthening the distractors to match an unshortenable correct answer", () => {
      // The balance rule must not force the name to be wrong; matching the
      // distractors to it is the fix.
      expect(
        accept(
          "William Butler Yeats",
          ["T.S. Eliot", "Robert Frost", "Ezra Pound"],
          "William Butler Yeats",
          ["Thomas Stearns Eliot", "Robert Lee Frost", "Ezra Weston Pound"],
        ),
      ).toBeNull();
    });

    it("an abbreviation the reader already knows", () => {
      expect(
        accept(
          "United States of America",
          ["Canada", "Mexico", "Brazil"],
          "USA",
          ["Canada", "Mexico", "Brazil"],
        ),
      ).toBeNull();
    });
  });
});
