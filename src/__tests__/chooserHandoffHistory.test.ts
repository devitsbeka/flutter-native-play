/**
 * Back goes where you tapped, not to the chooser you passed through.
 *
 * A card on the home's Play rail navigates to `/create-room?mode=…`, and
 * the chooser runs that mode on mount as if the card had been tapped there.
 * For a mode that starts something — Quick, the lounges, Words, or any room
 * the Library and My Trivia cards create — the chooser is a step the player
 * passes through in a fraction of a second.
 *
 * It was PUSHED onto the history stack all the same, so:
 *
 *   /  →  /create-room?mode=quick  →  /game
 *
 * and Back from the game landed on the chooser rather than the rail (owner:
 * "back should strictly take us where we clicked"). Arriving there ran the
 * seeded mode a second time and threw the player straight back into the
 * game, which made Back impossible to escape and flashed the chooser
 * showing its first card rather than the one that had been tapped.
 *
 * Replacing the entry on handoff makes the journey `/ → /game`, so Back is
 * the rail. A chooser opened deliberately, with no `?mode=`, still pushes:
 * that one is a place the player chose, and going back to it is right.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src/components/team/CreateRoomPage.tsx"), "utf8");

describe("the chooser hands off without staying behind", () => {
  it("replaces its history entry only when a rail sent it here", () => {
    expect(page).toMatch(/const cameFromRail = Boolean\(initialMode\);/);
    expect(page).toMatch(
      /const handoff = \(to: string, options\?: \{ state\?: unknown \}\) =>\s*\n\s*navigate\(to, \{ \.\.\.options, replace: cameFromRail \}\);/,
    );
  });

  it("and every way out of it goes through that", () => {
    // Quick, the two lounges, Words, and the three room creations.
    expect(page).toMatch(/handoff\("\/game"\)/);
    expect(page).toMatch(/handoff\(gameChoice === "king" \? "\/king" : "\/team-battle"/);
    expect(page).toMatch(/handoff\("\/words", \{ state: \{ invite \} \}\)/);
    expect(page.match(/handoff\(`\/team\?join=\$\{roomCode\}`/g) ?? []).toHaveLength(2);
    expect(page).toMatch(/handoff\(`\/team\?join=\$\{walkInCode\}`/);

    // Nothing hands off with a raw push any more. The header's back arrow
    // and the notification bell still navigate directly, and should: they
    // are not handoffs.
    expect(page).not.toMatch(/navigate\("\/game"\)/);
    expect(page).not.toMatch(/navigate\("\/words", \{ state/);
    expect(page).not.toMatch(/navigate\(`\/team\?join=/);
  });
});

describe("the rail offers every mode the chooser can start", () => {
  const feed = readFileSync(join(process.cwd(), "src/components/home/MobileHomeFeed.tsx"), "utf8");

  it("so no card on it can land on a chooser that ignores it", () => {
    // The rail deep-links by key; CreateRoom validates the param against
    // GAME_CHOICES and drops anything else, which would leave the player on
    // the chooser with nothing started.
    const keys = [...feed.matchAll(/\{ key: "([a-z]+)"(?: as const)?, art: featured/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThanOrEqual(5);
    const choices = page.match(/export const GAME_CHOICES: readonly GameChoice\[\] = \[([^\]]+)\]/);
    expect(choices).toBeTruthy();
    for (const key of keys) {
      expect(choices![1]).toContain(`"${key}"`);
    }
  });

  it("and startMode has a branch for each of them", () => {
    // Every choice either starts a game, opens a picker, or unfolds — none
    // may fall through and leave the card looking dead.
    for (const key of ["words", "guess", "library", "mytrivias"]) {
      expect(page).toMatch(new RegExp(`key === "${key}"`));
    }
    // quick, king and battle are the auto-start set.
    expect(page).toMatch(/gameChoice === "quick" \|\| gameChoice === "king" \|\| gameChoice === "battle"/);
  });
});
