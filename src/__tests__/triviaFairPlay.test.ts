/**
 * A trivia is a game for its owner only while they do not know the answers.
 *
 * The app used to hold two different opinions about that: the room picker
 * greyed out anything "not blind or already played", while the card on My
 * Trivia offered "play" on exactly the same quiz. Editing made it worse —
 * the editor lists every question next to its correct answer, and saving
 * left `is_blind` set, so a trivia the owner had just read through still
 * invited them to compete on it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ownerCanPlayTrivia, ownerHasSeenTrivia } from "@/utils/triviaFairPlay";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("who may still play their own trivia", () => {
  it("blind and unplayed is the one case that is still a game", () => {
    expect(ownerCanPlayTrivia({ is_blind: true, plays_count: 0 })).toBe(true);
    expect(ownerHasSeenTrivia({ is_blind: true, plays_count: 0 })).toBe(false);
  });

  it("playing it once ends it", () => {
    expect(ownerHasSeenTrivia({ is_blind: true, plays_count: 1 })).toBe(true);
  });

  it("a trivia that was never blind was seen when it was written", () => {
    expect(ownerHasSeenTrivia({ is_blind: false, plays_count: 0 })).toBe(true);
  });

  it("treats missing fields as seen rather than guessing in the owner's favour", () => {
    // An older row with no is_blind is one from before blind trivias existed.
    expect(ownerHasSeenTrivia({})).toBe(true);
    expect(ownerCanPlayTrivia(null)).toBe(false);
    expect(ownerHasSeenTrivia(null)).toBe(false); // nothing to judge
  });
});

describe("every screen asks the same question", () => {
  it("the card and its play-mode chooser use the shared rule", () => {
    const tab = read("src/components/social/MyTriviaTab.tsx");
    expect(tab).toContain('from "@/utils/triviaFairPlay"');
    expect(tab).toContain("ownerHasSeenTrivia(post)");
    expect(tab).toContain("ownerHasSeenTrivia(playModeTrivia)");
    // No local copy of the rule left to drift.
    expect(tab).not.toMatch(/is_blind && \(post\.plays_count/);
  });

  it("the room's picker uses it too", () => {
    const picker = read("src/components/team/MyTriviasPickerModal.tsx");
    expect(picker).toContain('from "@/utils/triviaFairPlay"');
    expect(picker).toContain("ownerHasSeenTrivia(trivia)");
  });

  it("saving an edit stops the trivia being blind", () => {
    // The editor shows the answers; whoever saved from it has read them.
    const editor = read("src/components/social/EditRoundModal.tsx");
    expect(editor).toMatch(/is_blind: false/);
  });

  it("the card sends a seen trivia to the chooser, not straight into play", () => {
    // The chooser hides the solo option once alreadyPlayed is set, which is
    // what stops a second, open-book run.
    const tab = read("src/components/social/MyTriviaTab.tsx");
    expect(tab).toMatch(/if \(onPlayModeSelect\) \{\s*\n\s*onPlayModeSelect\(post\);/);
    const modal = read("src/components/social/TriviaPlayModeModal.tsx");
    expect(modal).toContain("{!alreadyPlayed && (");
  });
});
