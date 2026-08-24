import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A player on another screen must see the count, not just arrive after it.
 *
 * RoundStartWatcher used to navigate and nothing else, leaving the 3-2-1 to
 * TeamV2. But TeamV2 can only draw it once its provider has loaded the room,
 * and a cold mount — provider, room, participants, questions — routinely
 * outlasts three seconds. So a player who was on Discover when the host
 * pressed start was delivered to question one with the count already spent.
 *
 * Measured in a browser, a round starting while the player sat on Discover:
 *
 *   old   1.5s no countdown   3s no countdown   5s no countdown
 *   new   1.5s "2"            3s "1"            5s holding   9s handed back
 *
 * Note the "2": the watcher joins the count where the room's clock actually
 * is, rather than starting a fresh three. That is the same rule as everywhere
 * else, and it is why this draws RoundCountdown rather than a timer of its
 * own.
 */
const source = readFileSync(
  join(process.cwd(), "src/components/system/RoundStartWatcher.tsx"),
  "utf8"
);

describe("the round-start watcher", () => {
  it("draws the countdown itself", () => {
    expect(source, "navigating alone loses the count to TeamV2's cold mount")
      .toMatch(/<RoundCountdown/);
  });

  it("reads the digit from the room's clock, not a local timer", () => {
    expect(source).toMatch(/useRoundCountdown\(/);
    expect(source, "a setInterval here would count from mount and disagree with everyone else")
      .not.toMatch(/setInterval/);
  });

  it("fetches what the countdown needs", () => {
    // started_at is the clock; the category is what the screen names. A select
    // that omits them renders a countdown with no number and no title.
    const select = source.match(/\.select\("id, status[^"]*"\)/);
    expect(select, "expected the game_rooms select").not.toBeNull();
    for (const column of ["started_at", "category_id", "category_name"]) {
      expect(select![0], `the countdown needs ${column}`).toContain(column);
    }
  });

  it("still navigates, so the player lands in the game", () => {
    expect(source).toMatch(/navigate\("\/team"\)/);
  });

  it("hands the screen back when the count is spent", () => {
    // Bounded by useRoundStartHold. Without this the overlay would sit over
    // the game for the rest of the round.
    expect(source).toMatch(/useRoundStartHold\(/);
    expect(source, "the overlay must clear itself once the window closes")
      .toMatch(/if \(startedRound && !withinRoundStart\) setStartedRound\(null\)/);
  });

  it("leaves a player already in the room alone", () => {
    // TeamV2 is drawing the count for them; two overlays would double-animate.
    expect(source).toMatch(/isInterruptible\(pathRef\.current\)/);
  });
});
