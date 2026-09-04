/**
 * A round nobody has picked a category for gets the mystery box, not a "?".
 *
 * "Mixed" and "Random" mean the same thing to a player about to play one, and
 * the app has always drawn that as the library's mystery box — the create
 * screen, the category picker, the round queue, the room card. The two
 * screens where a round is ANNOUNCED did not: the countdown and the results
 * header resolved their picture from the category's own `icon_slug`, and an
 * undecided round has no category, so both fell through to DynamicIcon's last
 * resort — a grey question mark. The one category with a well-known face was
 * the only one showing without it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isUndecidedRound, UNDECIDED_ICON_SLUG } from "@/utils/undecidedRound";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("spotting a round with no category yet", () => {
  it("knows the ids the pickers queue", () => {
    expect(isUndecidedRound("__mixed__", null)).toBe(true);
    expect(isUndecidedRound("__random__", null)).toBe(true);
  });

  it("and the words, because that is what actually gets stored", () => {
    // A queued round is denormalised as a NAME, written by whichever picker
    // queued it, in whatever language that player was using — there is no id
    // to match on.
    for (const name of ["Random", "შემთხვევითი", "Zufällig", "Aleatorio", "Aléatoire", "Casuale", "Aleatório"]) {
      expect(isUndecidedRound(null, name), name).toBe(true);
    }
    for (const name of ["Mixed", "სხვადასხვა", "შერეული", "Gemischt", "Mixto", "Mixte", "Misto"]) {
      expect(isUndecidedRound(null, name), name).toBe(true);
    }
    // Case and stray whitespace are the picker's, not the player's problem.
    expect(isUndecidedRound(null, "  random  ")).toBe(true);
  });

  it("and leaves real categories alone", () => {
    expect(isUndecidedRound("a3f1c2e4-0000-4000-8000-000000000000", "World History")).toBe(false);
    expect(isUndecidedRound("guess_logo", "Guess the Logo")).toBe(false);
    expect(isUndecidedRound(null, null)).toBe(false);
    expect(isUndecidedRound(null, "")).toBe(false);
    // "Randomised trivia" is a category name, not the random round.
    expect(isUndecidedRound(null, "Randomised trivia")).toBe(false);
  });
});

describe("the two screens that announce a round", () => {
  it("the countdown draws the box instead of falling through to a '?'", () => {
    const countdown = read("src/components/team/RoundCountdown.tsx");
    expect(countdown).toMatch(
      /const slug = isUndecidedRound\(categoryId, categoryName\)\s*\n\s*\? UNDECIDED_ICON_SLUG/,
    );
    // The real categories keep both slugs, best first — that is what stops a
    // uuid resolving to a random icon (a banana for "guess the city").
    expect(countdown).toMatch(/: \[iconSlug, mapSlug\]\.filter\(Boolean\)\.join\(","\) \|\| null;/);
  });

  it("and so does the results header", () => {
    const results = read("src/components/team/GameResultsScreenV2.tsx");
    expect(results).toMatch(
      /isUndecidedRound\(currentRoom\.category_id, currentRoom\.category_name\)\s*\n\s*\? UNDECIDED_ICON_SLUG\s*\n\s*: resultsCategory\.iconSlug/,
    );
  });

  it("with the slug the rest of the app already uses", () => {
    expect(UNDECIDED_ICON_SLUG).toBe("mystery-box");
    // The picker, the queue sheet and the create screen draw the same box.
    expect(read("src/components/team/CategoryPickerSection.tsx")).toMatch(/slug="mystery-box"/);
    expect(read("src/components/team/RoomQueueSheet.tsx")).toMatch(/slug="mystery-box"/);
  });
});
