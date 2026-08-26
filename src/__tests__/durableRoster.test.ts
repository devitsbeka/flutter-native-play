import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mergeRoster } from "@/hooks/useDurableRoster";

/**
 * "When the round is over I still see the previous screen for a second."
 *
 * It was not the previous screen. It was the right screen with the wrong
 * roster: the controller's game-over drew a leaderboard with one player on
 * zero points while the TV three feet away showed two players and their real
 * scores, then corrected itself once presence recovered.
 *
 * Presence is volatile — a socket that goes stale during the round leaves the
 * list empty or frozen. `tv_players` is the durable record, written on every
 * answer. TVResultsScreen had worked that out and carried the whole merge
 * inline; the controller had not, which is why one was right and one was not.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const presence = (nickname: string, score: number, extra = {}) => ({
  id: `presence-${nickname}`,
  nickname,
  score,
  ...extra,
});

const dbRow = (nickname: string, score: number | null, extra = {}) => ({
  player_id: `db-${nickname}`,
  nickname,
  avatar_url: null,
  is_host: false,
  current_round_score: score,
  ...extra,
});

describe("merging presence with the durable record", () => {
  it("keeps presence when it is alive and ahead", () => {
    const out = mergeRoster([presence("Gloria", 1070)], [dbRow("Gloria", 900)]);
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(1070);
  });

  it("takes the table's score when presence is behind", () => {
    // A score only ever goes up, so the larger number is the later one.
    const out = mergeRoster([presence("Gloria", 0)], [dbRow("Gloria", 1070)]);
    expect(out[0].score).toBe(1070);
  });

  it("brings back somebody presence has lost entirely", () => {
    // The reported bug: the host alone in the list, everyone else dropped.
    const out = mergeRoster([presence("TriviaMaste", 400)], [dbRow("Gloria", 1070)]);
    expect(out.map((p) => p.nickname).sort()).toEqual(["Gloria", "TriviaMaste"]);
    expect(out.find((p) => p.nickname === "Gloria")!.score).toBe(1070);
  });

  it("rebuilds the whole game from the table when presence is empty", () => {
    const out = mergeRoster([], [dbRow("Gloria", 1070), dbRow("TriviaMaste", 400)]);
    expect(out).toHaveLength(2);
    expect(out.map((p) => p.score).sort((a, b) => b - a)).toEqual([1070, 400]);
  });

  it("falls back to presence alone when the table has nothing", () => {
    const out = mergeRoster([presence("Gloria", 1070)], []);
    expect(out).toEqual([expect.objectContaining({ nickname: "Gloria", score: 1070 })]);
  });

  it("gives one person one row, however many devices they bound", () => {
    // A re-bound phone leaves a second presence entry and a second tv_players
    // row for the same human. The same face twice on a podium is worse than a
    // missing one.
    const out = mergeRoster(
      [presence("Gloria", 300), presence("gloria ", 0)],
      [dbRow("GLORIA", 1070), dbRow("Gloria", 500)],
    );
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(1070);
  });

  it("matches nicknames regardless of case or stray spaces", () => {
    const out = mergeRoster([presence("  Gloria ", 0)], [dbRow("gloria", 1070)]);
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(1070);
  });

  it("treats a null score as zero rather than dropping the row", () => {
    const out = mergeRoster([], [dbRow("Gloria", null)]);
    expect(out).toEqual([expect.objectContaining({ nickname: "Gloria", score: 0 })]);
  });

  it("carries the host flag through from the table", () => {
    const out = mergeRoster([], [dbRow("TriviaMaste", 400, { is_host: true })]);
    expect(out[0].isHost).toBe(true);
  });

  it("never invents anybody", () => {
    expect(mergeRoster([], [])).toEqual([]);
  });
});

describe("the two screens share it", () => {
  it("the TV results screen no longer carries its own copy", () => {
    const tv = read("src/components/tv/TVResultsScreen.tsx");
    expect(tv).toMatch(/useDurableRoster\(sessionId, players\)/);
    expect(tv, "the inline merge should be gone, not duplicated")
      .not.toMatch(/bestDbScoreByNickname/);
  });

  it("the controller's game-over uses it too", () => {
    const host = read("src/pages/TVHostController.tsx");
    expect(host).toMatch(/const durableRoster = useDurableRoster\(contextSessionId, players\);/);
    expect(host).toMatch(/const allPlayers = durableRoster\.map/);
    expect(host, "mapping raw presence is the bug being fixed")
      .not.toMatch(/const allPlayers = players\.map/);
  });

  it("calls the hook at the top level, not inside the phase branch", () => {
    // The game-over screen renders from inside a phase branch. A hook called
    // there runs on some renders and not others, which is React error #310 —
    // a fault this file has hit before.
    const host = read("src/pages/TVHostController.tsx");
    const hookAt = host.indexOf("const durableRoster = useDurableRoster(");
    const branchAt = host.indexOf("if (localPhase === 'completed')");
    expect(hookAt).toBeGreaterThan(-1);
    expect(branchAt).toBeGreaterThan(-1);
    expect(hookAt, "the hook must come before any phase branch").toBeLessThan(branchAt);
  });

  it("leaves the system devices out of the game", () => {
    const hook = read("src/hooks/useDurableRoster.ts");
    expect(hook).toMatch(/SYSTEM_IDS = \["TV_DISPLAY", "TV_MIRROR"\]/);
  });

  it("does not query for the showcase's stand-in session", () => {
    const hook = read("src/hooks/useDurableRoster.ts");
    expect(hook).toMatch(/sessionId === "mock-session-id"/);
  });
});

describe("the trophies on the podium", () => {
  const tv = read("src/components/tv/TVResultsScreen.tsx");

  it("sit above the avatar, clear of it", () => {
    // They used to hang off the bottom edge, overlapping the face and the
    // ring — a medal worn rather than awarded.
    expect(tv).toMatch(/bottom-full mb-3 z-10/);
    expect(tv).not.toMatch(/-translate-x-1\/2 -bottom-4/);
  });

  it("leaves room above for them to float into", () => {
    expect(tv).toMatch(/className="relative mt-16 mb-3"/);
  });

  it("drifts left and right, on a four-second cycle", () => {
    expect(tv).toMatch(/x: \[0, -7, 0, 7, 0\]/);
    expect(tv).toMatch(/duration: 4,\s*\n\s*repeat: Infinity/);
  });

  it("staggers the three so they do not march in step", () => {
    expect(tv).toMatch(/delay: 1\.2 \+ displayIndex \* 0\.6/);
  });

  it("holds still for anyone who asked motion to stop", () => {
    expect(tv).toMatch(/const swaying = !useReducedMotion\(\);/);
    expect(tv).toMatch(/animate=\{swaying \? \{ x: \[/);
  });

  it("keeps the centring on a different element from the animation", () => {
    // framer-motion writes its own `transform`, which silently overwrites
    // Tailwind's -translate-x-1/2. Three things want that property here:
    // centring, the drift, and the arrival pop — so they get three elements.
    const block = tv.match(/<div className="absolute left-1\/2 -translate-x-1\/2 bottom-full[\s\S]*?<\/div>/)![0];
    expect(block).toMatch(/<motion\.div/);
    expect(block).toMatch(/<motion\.img/);
  });
});
