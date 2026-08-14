import { describe, it, expect } from "vitest";
import { PARTY_STARTER_PACK, partyStarterPack, type StarterQuestion } from "@/config/partyStarterPack";

// The editor's own limits, from GameStylePersonalTrivia.
const QUESTION_MAX = 65;
const ANSWER_MAX = 25;

const LANGUAGES = Object.keys(PARTY_STARTER_PACK);
const GEORGIAN = /[Ⴀ-ჿ]/;
const LATIN = /[A-Za-z]/;

describe("the party starter pack", () => {
  it("opens a new party on ten questions", () => {
    for (const lang of LANGUAGES) {
      expect(PARTY_STARTER_PACK[lang], lang).toHaveLength(10);
    }
  });

  it("fits the editor without being truncated", () => {
    // A seeded question longer than the field's own limit would arrive
    // already over budget, and the first edit would have to cut it.
    for (const lang of LANGUAGES) {
      for (const q of PARTY_STARTER_PACK[lang]) {
        expect(q.question.length, `${lang}: ${q.question}`).toBeLessThanOrEqual(QUESTION_MAX);
        for (const a of q.answers) {
          expect(a.length, `${lang}: ${a}`).toBeLessThanOrEqual(ANSWER_MAX);
        }
      }
    }
  });

  it("gives every card four answers, all different and none blank", () => {
    for (const lang of LANGUAGES) {
      for (const q of PARTY_STARTER_PACK[lang]) {
        expect(q.answers, q.question).toHaveLength(4);
        expect(q.answers.every((a) => a.trim().length > 0), q.question).toBe(true);
        expect(new Set(q.answers).size, `${q.question} repeats an answer`).toBe(4);
      }
    }
  });

  it("asks ten different things", () => {
    for (const lang of LANGUAGES) {
      const questions = PARTY_STARTER_PACK[lang].map((q) => q.question);
      expect(new Set(questions).size, lang).toBe(10);
    }
  });

  it("never puts an answer in the question's icon", () => {
    // An icon that names one of the answers gives the game away — the same
    // rule QuestionIconPicker enforces when a player picks one by hand.
    for (const lang of LANGUAGES) {
      for (const q of PARTY_STARTER_PACK[lang]) {
        const words = q.iconSlug.split("-");
        for (const answer of q.answers) {
          const a = answer.toLowerCase();
          expect(
            words.some((w) => w.length > 2 && a.includes(w)),
            `${q.iconSlug} points at "${answer}"`,
          ).toBe(false);
        }
      }
    }
  });

  it("asks the same ten things in every language", () => {
    // Same order, same icons: a player switching language should get the same
    // pack, not a different game.
    const slugs = (pack: StarterQuestion[]) => pack.map((q) => q.iconSlug);
    for (const lang of LANGUAGES) {
      expect(slugs(PARTY_STARTER_PACK[lang]), lang).toEqual(slugs(PARTY_STARTER_PACK.en));
    }
  });

  it("writes Georgian in Georgian", () => {
    // Half a card in each is the thing the app keeps getting wrong.
    for (const q of PARTY_STARTER_PACK.ka) {
      expect(GEORGIAN.test(q.question), q.question).toBe(true);
      expect(LATIN.test(q.question), `${q.question} has Latin letters in it`).toBe(false);
      for (const a of q.answers) {
        expect(LATIN.test(a), `${a} has Latin letters in it`).toBe(false);
      }
    }
  });

  it("falls back to English for a language with no pack of its own", () => {
    // de/es/fr/it/pt spread English translations; they get the English pack.
    expect(partyStarterPack("de")).toBe(PARTY_STARTER_PACK.en);
    expect(partyStarterPack("")).toBe(PARTY_STARTER_PACK.en);
    expect(partyStarterPack("ka")).toBe(PARTY_STARTER_PACK.ka);
  });
});
