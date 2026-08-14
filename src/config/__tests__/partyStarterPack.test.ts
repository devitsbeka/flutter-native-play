import { describe, it, expect } from "vitest";
import {
  PARTY_STARTER_COUNT,
  PARTY_STARTER_PACK,
  partyStarterPack,
  partyStarterPool,
  pickStarterQuestions,
  type StarterQuestion,
} from "@/config/partyStarterPack";

// The editor's own limits, from GameStylePersonalTrivia.
const QUESTION_MAX = 65;
const ANSWER_MAX = 25;

const LANGUAGES = Object.keys(PARTY_STARTER_PACK);
const GEORGIAN = /[Ⴀ-ჿ]/;
const LATIN = /[A-Za-z]/;

describe("the party starter pool", () => {
  it("holds far more than a party is seeded with", () => {
    // The point of the pool: two parties made the same evening are not the
    // same ten cards.
    for (const lang of LANGUAGES) {
      expect(PARTY_STARTER_PACK[lang].length, lang).toBeGreaterThanOrEqual(PARTY_STARTER_COUNT * 3);
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

  it("never asks the same thing twice", () => {
    for (const lang of LANGUAGES) {
      const questions = PARTY_STARTER_PACK[lang].map((q) => q.question);
      expect(new Set(questions).size, lang).toBe(questions.length);
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

  it("asks the same things in every language", () => {
    // Same order, same icons: a player switching language gets the same pool,
    // not a different game.
    const slugs = (pool: StarterQuestion[]) => pool.map((q) => q.iconSlug);
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

  it("falls back to English for a language with no pool of its own", () => {
    // de/es/fr/it/pt spread English translations; they get the English pool.
    expect(partyStarterPool("de")).toBe(PARTY_STARTER_PACK.en);
    expect(partyStarterPool("")).toBe(PARTY_STARTER_PACK.en);
    expect(partyStarterPool("ka")).toBe(PARTY_STARTER_PACK.ka);
  });
});

describe("drawing a party from the pool", () => {
  const pool = PARTY_STARTER_PACK.ka;

  it("deals ten", () => {
    expect(partyStarterPack("ka")).toHaveLength(PARTY_STARTER_COUNT);
  });

  it("never deals the same question twice", () => {
    // A shuffle that samples with replacement would show a card twice in one
    // party, which is the one thing a player would notice immediately.
    for (let attempt = 0; attempt < 200; attempt++) {
      const drawn = partyStarterPack("ka");
      expect(new Set(drawn.map((q) => q.question)).size).toBe(PARTY_STARTER_COUNT);
    }
  });

  it("deals a different hand next time", () => {
    // Ten from 36 twice over: identical hands are possible in principle and
    // vanishingly unlikely, so twenty draws all agreeing means it is not
    // shuffling at all.
    const hands = new Set(
      Array.from({ length: 20 }, () => partyStarterPack("ka").map((q) => q.question).join("|")),
    );
    expect(hands.size).toBeGreaterThan(1);
  });

  it("can reach every question in the pool", () => {
    // A shuffle that only ever touches the front of the deck would leave the
    // back half of the pool unseen forever.
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      for (const q of partyStarterPack("ka")) seen.add(q.question);
    }
    expect(seen.size).toBe(pool.length);
  });

  it("is a shuffle of the pool, not new questions", () => {
    const known = new Set(pool.map((q) => q.question));
    for (const q of partyStarterPack("ka")) {
      expect(known.has(q.question), q.question).toBe(true);
    }
  });

  it("deals the whole pool and no more when asked for too many", () => {
    const drawn = pickStarterQuestions(pool, pool.length + 50);
    expect(drawn).toHaveLength(pool.length);
    expect(new Set(drawn.map((q) => q.question)).size).toBe(pool.length);
  });

  it("takes its randomness from the caller", () => {
    // rng() === 0 always picks the first of what is left, so the deck comes
    // back in the order it was written. Fixes the hand for a test that needs
    // to know what it is going to get.
    const drawn = pickStarterQuestions(pool, 3, () => 0);
    expect(drawn.map((q) => q.question)).toEqual(pool.slice(0, 3).map((q) => q.question));
  });
});
