import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drawStarterQuestion, partyStarterPool, PARTY_STARTER_PACK } from "@/config/partyStarterPack";

/**
 * Change-question draws from the library, it does not generate.
 *
 * The button on a My Trivia Party card called `generate-single-question`:
 * a round trip to a model, a spinner, and a failure mode, for a card the
 * party already opens on ten of. It was also the screen that went dark when
 * the model's project was blocked — the press did nothing at all, in any
 * language (owner: "replace it with new question from our questions library
 * ... no Ai generation would be needed").
 *
 * config/partyStarterPack is written for exactly this game and is bigger
 * than a party can be, so the draw is instant, works with no network, costs
 * nothing, and is in the reader's language by construction rather than by a
 * parameter the function might default away from.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const party = read("src/components/team/GameStylePersonalTrivia.tsx");
const quizEditor = read("src/components/social/GameStyleQuestionEditor.tsx");

describe("drawing one from the pool", () => {
  const pool = partyStarterPool("en");

  it("never hands back a question already on the board", () => {
    const taken = pool.slice(0, 5).map((q) => q.question);
    // Every draw, not just the one a lucky seed gives: walk the whole range.
    for (let i = 0; i < pool.length; i++) {
      const rng = () => i / pool.length;
      const drawn = drawStarterQuestion(pool, taken, rng);
      expect(drawn).not.toBeNull();
      expect(taken).not.toContain(drawn!.question);
    }
  });

  it("including the card being replaced, so the press always shows something new", () => {
    // The caller passes the whole board, the pressed card included. A draw
    // that could return it would look like the button did nothing.
    const current = pool[3].question;
    const drawn = drawStarterQuestion(pool, [current], () => 0);
    expect(drawn!.question).not.toBe(current);
  });

  it("matches on what a question reads as, not on its identity", () => {
    // The cards have been through the editor and carry their own ids; only
    // the text can be compared. Case and stray spacing are not a difference.
    const messy = `  ${pool[0].question.toUpperCase()}  `;
    for (let i = 0; i < pool.length; i++) {
      const drawn = drawStarterQuestion(pool, [messy], () => i / pool.length);
      expect(drawn!.question).not.toBe(pool[0].question);
    }
  });

  it("says nothing rather than repeating itself when the pool is spent", () => {
    expect(drawStarterQuestion(pool, pool.map((q) => q.question))).toBeNull();
    expect(drawStarterQuestion([], [])).toBeNull();
  });

  it("stays in range even for an rng that returns 1", () => {
    // Math.random never does, but a test seam can, and an off-the-end index
    // would hand the caller undefined rather than a question.
    expect(drawStarterQuestion(pool, [], () => 1)).not.toBeUndefined();
    expect(drawStarterQuestion(pool, [], () => 1)!.question).toBeTruthy();
  });

  it("has more questions than a party has cards, in every language", () => {
    // Which is what makes "always something left to draw" true rather than
    // hopeful: a full board can still be replaced card by card. Read from
    // the editor's own constant, so raising the cap past the pool fails
    // here rather than on somebody's phone.
    const cap = Number(party.match(/const MAX_QUESTIONS = (\d+);/)?.[1]);
    expect(cap).toBeGreaterThan(0);
    for (const lang of Object.keys(PARTY_STARTER_PACK)) {
      expect(PARTY_STARTER_PACK[lang].length, lang).toBeGreaterThan(cap);
    }
  });
});

describe("what the party editor does with it", () => {
  it("replaces from the pool in the language being read", () => {
    expect(party).toMatch(/const next = drawStarterQuestion\(\s*\n\s*partyStarterPool\(language\),/);
    expect(party).toMatch(/questions\.map\(\(q\) => q\.question\),/);
  });

  it("keeps the pack's first answer correct, as the seeded cards do", () => {
    expect(party).toMatch(/isCorrect: i === 0,/);
    expect(party).toMatch(/iconSlug: next\.iconSlug,/);
  });

  it("and says so when there is nothing left to draw", () => {
    expect(party).toMatch(/if \(!next\) \{\s*\n\s*toast\(\{ title: t\("extra\.ptNoMoreLibrary"\)/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/ptNoMoreLibrary: "[^"]+",/);
    }
  });

  it("asks no model, and carries nothing left over from when it did", () => {
    // The call, not the name: the comment above the replace handler says
    // what this button used to do, and should keep saying it.
    expect(party).not.toMatch(/functions\.invoke/);
    expect(party).not.toMatch(/handleGenerateAI/);
    expect(party).not.toMatch(/isGeneratingAI|generatingIndex/);
    // No network, so no spinner: one for something already done reads as a
    // stall.
    expect(party).toMatch(/onClick=\{\(e\) => \{\s*\n\s*e\.stopPropagation\(\);\s*\n\s*handleReplaceQuestion\(index\);/);
    expect(party).not.toMatch(/from "@\/integrations\/supabase\/client"/);
  });

  it("and the party still opens on ten drawn from the same pool", () => {
    // Unchanged, and named here so a later edit cannot quietly seed the
    // board from somewhere the replace button does not draw from.
    expect(party).toMatch(/return partyStarterPack\(language\)\.map\(/);
  });
});

describe("the trivia editor is a different job and keeps its model", () => {
  it("because its questions are about a subject, not about the people in the room", () => {
    // GameStyleQuestionEditor builds quizzes and collections — factual
    // questions on whatever the author typed, which no fixed pool can hold.
    expect(quizEditor).toMatch(/invoke\('generate-single-question'/);
    expect(quizEditor).toMatch(/mode: 'trivia'/);
  });
});
