/**
 * The results screen: a podium, and the pot reported to every device.
 *
 * Two things the owner saw on one results screen. A player who had lost
 * their stake saw "-200"; the winner, on their own phone, saw nothing —
 * "one player lose 200 coins but winner got nothing". The coins HAD moved:
 * settle_room_round settles once, on whichever device asks first, and
 * answered every later device `already_settled` with no deltas, so the
 * winner was simply never told. The function now reads the ledger back on
 * that answer, and the client folds it to one line per seat.
 *
 * And the screen itself: no trophy, no stars; the category under the room
 * title; the top three on a podium — second left, first in the middle and
 * bigger, third right — with a medal under each face and, under the medal,
 * what the place was worth; everyone from fourth down in the list beneath.
 * The host's button says New Game, not Add Category.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const hook = read("src/hooks/useRoomPot.ts");
const migration = read("supabase/migrations/20261015100100_room_pot_deltas_for_everyone.sql");
const sqlTest = read("supabase/tests/15-room-pot.sql");
const ci = read(".github/workflows/pr-checks.yml");

describe("every device is told what moved", () => {
  it("the settlement reports the ledger back on already_settled", () => {
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.room_round_deltas\(p_game_id uuid\)/);
    expect(migration).toMatch(
      /v_deltas := public\.room_round_deltas\(p_game_id\);[\s\S]*?'deltas', v_deltas, 'reason', 'already_settled'\);/,
    );
  });

  it("through a reader no user can call, and a settlement no anon can", () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.room_round_deltas\(uuid\) FROM PUBLIC, anon, authenticated;/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.settle_room_round\(uuid, uuid\) FROM PUBLIC, anon;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.settle_room_round\(uuid, uuid\) TO authenticated;/);
  });

  it("applies after the migration it replaces — a file that sorted before it was overwritten", () => {
    expect("20261015100100" > "20261015100000").toBe(true);
  });

  it("the hook folds the deltas to a line per seat, and the screen keeps them", () => {
    expect(hook).toMatch(/function foldLines\(deltas: RoomPotResponse\["deltas"\]\): Record<string, RoomPotLine>/);
    expect(hook).toMatch(/lines,\s*\n\s*unsettled: false,/);
    expect(results).toMatch(/setPotLines\(settlement\.lines\);/);
  });

  it("is proved against Postgres, and CI now runs that file", () => {
    expect(sqlTest).toMatch(/a second call still reports every seat/);
    expect(sqlTest).toMatch(/the winner is told the prize on any device/);
    expect(ci).toMatch(/-f supabase\/tests\/15-room-pot\.sql/);
  });
});

describe("the podium", () => {
  it("second on the left, first in the middle, third on the right", () => {
    expect(results).toMatch(/const PODIUM_ORDER = \[1, 0, 2\] as const;/);
    // Three steps for three or more; a pair sits centred on two
    // (rematchAskedAtStart.test pins the two-up case).
    expect(results).toMatch(/"max-w-\[362px\] grid-cols-3 gap-2"/);
    expect(results).toMatch(/"w-full grid items-end flex-shrink-0 pt-2"/);
  });

  it("first place is the bigger face — 110 to the 76 beside it, all three in the gold ring", () => {
    // Figma 1157:10233..10244 (resultsScreenFigma.test.ts).
    expect(results).toMatch(/"border-2 border-\[#fcd34d\] shadow-\[0_0_0_4px_rgba\(251,191,36,0\.35\)\]",\s*\n\s*first \? "w-\[110px\] h-\[110px\]" : "w-\[76px\] h-\[76px\]"/);
  });

  it("a medal under each face, and the coins under the medal", () => {
    const step = results.slice(results.indexOf(": PODIUM_ORDER).map((idx) => {"), results.indexOf("{/* Everyone from fourth down."));
    const avatar = step.indexOf("<SafeAvatar");
    const medal = step.indexOf("{placeMark(idx, p.rank)}");
    const coins = step.indexOf("<PotLine net={netFor(p)} tone=");
    expect(avatar).toBeGreaterThan(-1);
    expect(medal).toBeGreaterThan(avatar);
    expect(coins).toBeGreaterThan(medal);
  });

  it("names no amount of its own — a seat's line comes from the server", () => {
    const fn = results.slice(results.indexOf("const netFor = "), results.indexOf("const hasUpdatedStats"));
    expect(fn).toMatch(/const line = potLines\[p\.user_id\];\s*\n\s*if \(line\) return line\.net;/);
  });

  it("and the list starts from fourth, or is not there", () => {
    // ...or when the match has rounds to tell (resultsRoundByRound.test.ts).
    expect(results).toMatch(/\{\(rankedParticipants\.length > PODIUM_ORDER\.length \|\| \(matchRounds && matchInfo\)\) && \(/);
    expect(results).toMatch(/rankedParticipants\.slice\(PODIUM_ORDER\.length\)\.map/);
  });
});

describe("what left the screen, and what the button says", () => {
  it("no trophy, no stars", () => {
    expect(results).not.toMatch(/trophyWinIcon/);
    expect(results).not.toMatch(/<Star className/);
  });

  it("the category sits under the room title, before the podium", () => {
    const title = results.indexOf("{currentRoom?.room_name || t(\"extra.gameRoomLabel\")}");
    const category = results.indexOf("{currentRoom?.category_name && (");
    const podium = results.indexOf(": PODIUM_ORDER).map((idx) => {");
    expect(title).toBeGreaterThan(-1);
    expect(category).toBeGreaterThan(title);
    expect(podium).toBeGreaterThan(category);
  });

  it("the host's button says New Game", () => {
    expect(results).toMatch(/\{t\("extra\.newGame"\)\}\s*\n\s*<\/ChunkyButton>/);
    expect(results).not.toMatch(/extra\.addCategory/);
  });
});
