/**
 * The podium on top; under it, the room's whole story as lists.
 *
 * The results were a podium (three faces, the winner's bigger, coins under
 * the medals), then tiles for fourth down, then every round's seats WRAPPED
 * across the width in 24px faces — three shapes for the same people, and a
 * wall at ten. They became one list (owner: "show players as list not
 * besides, what if there are 10 players"), and the podium went with it.
 *
 * The podium is back, by the same owner's next word: "show 1,2,3 places how
 * we had, besides in top, first player with bigger avatar in middle". What
 * the list was FOR stays under it — fourth down as rows, and the room's
 * whole history: "below show all rounds pot not only last game and show all
 * coins users won or lose, like summery of the all games".
 *
 *   podium              the three the round was about
 *   this round, 4th+    one row per seat (only when there are more than three)
 *   every game          each round's category, pot, and its seats in a column
 *   all games · totals  every seat's coins over the whole room
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const hook = read("src/hooks/useRoomRounds.ts");

describe("the podium, on top", () => {
  it("second on the left, first in the middle and bigger, third on the right", () => {
    expect(results).toMatch(/const PODIUM_ORDER = \[1, 0, 2\] as const;/);
    expect(results).toMatch(/const TWO_UP_ORDER = \[0, 1\] as const;/);
    expect(results).toMatch(/first \? "w-\[110px\] h-\[110px\]" : "w-\[76px\] h-\[76px\]"/);
  });

  it("comes before the scrolling column, not inside it", () => {
    const podium = results.indexOf("{(rankedParticipants.length === 2 ? TWO_UP_ORDER : PODIUM_ORDER).map((idx) => {");
    const column = results.indexOf('className="w-full max-w-[468px] flex-1 min-h-0 overflow-y-auto"');
    expect(podium).toBeGreaterThan(-1);
    expect(column).toBeGreaterThan(podium);
  });
});

describe("one row per player, from fourth down", () => {
  it("place, face, name, score, coins — left to right", () => {
    const row = results.slice(results.indexOf("function StandingRow("), results.indexOf("{/* Middle Section"));
    const place = row.indexOf("{placeMark(idx, rank)}");
    const face = row.indexOf("<SafeAvatar");
    const name = row.indexOf("{name}");
    const score = row.indexOf("{detail && <p");
    const coins = row.indexOf("<PotLine net={net} compact tone={tone} />");
    expect(place).toBeGreaterThan(-1);
    expect(face).toBeGreaterThan(place);
    expect(name).toBeGreaterThan(face);
    expect(score).toBeGreaterThan(name);
    expect(coins).toBeGreaterThan(score);
  });

  it("only when there are more than three — the podium has the rest", () => {
    expect(results).toMatch(/\{rankedParticipants\.length > PODIUM_ORDER\.length && \(/);
    expect(results).toMatch(/rankedParticipants\.slice\(PODIUM_ORDER\.length\)\.map\(\(p, i\) => \(\s*\n\s*<StandingRow/);
    // Their place index carries on from the podium: the first row is #4.
    expect(results).toMatch(/idx=\{i \+ PODIUM_ORDER\.length\}/);
  });

  it("at one fixed height, with a name that truncates and your row washed", () => {
    expect(results).toMatch(/"flex h-\[60px\] items-center gap-3 rounded-2xl px-2",/);
    expect(results).toMatch(/isMe && "bg-white\/15",/);
  });
});

describe("every game the room has played", () => {
  it("is read off room_games for the whole room, not one match's ids", () => {
    expect(hook).toMatch(/\.from\("room_games"\)\s*\n\s*\.select\("id, game_number, questions_data, player_scores, created_at"\)\s*\n\s*\.eq\("room_id", roomId\)/);
    // The money still comes off the ledger, one idempotent settle per round.
    expect(hook).toMatch(/const settlements = await Promise\.all\(rows\.map\(\(r\) => settleRoomRound\(roomId, r\.id\)\)\);/);
    // Round numbers restart with each game.
    expect(hook).toMatch(/const number = \(seenInGame\.get\(game\) \?\? 0\) \+ 1;/);
  });

  it("skips a round nobody played — a start that lost the race", () => {
    // RLS lets a participant insert a room_games row and not delete it, so
    // the loser of a double start leaves one behind. No seats, no round.
    expect(hook).toMatch(/if \(seats\.length === 0\) return;/);
  });

  it("is grouped by game, newest first, and drawn from the second round on", () => {
    expect(results).toMatch(/return \[\.\.\.byGame\.entries\(\)\]\.sort\(\(a, b\) => b\[0\] - a\[0\]\);/);
    expect(results).toMatch(/\{roomRounds && roomRounds\.length >= 2 && roomGames\.map\(\(\[game, rounds\]\) => \(/);
  });

  it("with each round's seats in a column, never wrapped", () => {
    expect(results).toMatch(/<ul className="mt-2 space-y-1">\s*\n\s*\{round\.seats\.map\(\(seat, i\) => \{/);
    expect(results).not.toMatch(/flex-wrap/);
  });
});

describe("all games, totals", () => {
  it("every seat's coins over every round of the room, in the same rows", () => {
    expect(results).toMatch(/const roomTotals = roomRounds && roomRounds\.length >= 2 \? matchTotals\(roomRounds\) : null;/);
    expect(results).toMatch(/\{roomTotals && \(\s*\n\s*<StandingsCard title=\{t\("extra\.resultsAllGamesTitle", \{ rounds: roomRounds!\.length \}\)\}/);
  });

  it("titled in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+resultsAllGamesTitle: "[^"]*\{rounds\}[^"]*",/);
    }
  });
});
