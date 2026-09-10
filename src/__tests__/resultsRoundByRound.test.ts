import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { matchTotals, type MatchRound } from "@/hooks/useMatchRounds";

/**
 * The results screen tells the match round by round.
 *
 * It said what THIS round paid, under the podium, and — once the last
 * round was in — one total per seat over the match. Between the two there
 * was nothing: a match of three rounds ended on a screen that could not
 * say what happened in round two, or what any round's pot was (owner:
 * "show what happened in rounds, per match has its pot - we need to show
 * it clear who won who lose per round").
 *
 * Now every round of the match is a row: its category and its pot, and
 * under it every seat with what the round paid them — the winner first,
 * wearing the medal, the rest in the grey a place that did not pay wears.
 * The money is the ledger's, READ through room_round_ledger for each
 * round — nothing settles on a look; the client still names no amounts.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hook = read("src/hooks/useMatchRounds.ts");
const results = read("src/components/team/GameResultsScreenV2.tsx");

describe("what a round is made of", () => {
  it("reads the round rows and the ledger together, once per round of the match", () => {
    expect(hook).toMatch(/\.from\("room_games"\)\s*\.select\("id, questions_data, player_scores"\)\s*\.in\("id", ids\)/);
    expect(hook).toMatch(/Promise\.all\(ids\.map\(\(id\) => readRoomRound\(id\)\)\)/);
    expect(hook).not.toMatch(/settleRoomRound\(/);
  });

  it("names the round by the category its questions were played in", () => {
    expect(hook).toMatch(/categoryName: first\?\.category \?\? null/);
    expect(hook).toMatch(/iconSlug: first\?\.categoryIconSlug \?\? first\?\.iconSlug \?\? first\?\.questionIconSlug \?\? null/);
  });

  it("puts the round's winner first: by what they took, then by score", () => {
    expect(hook).toMatch(/seats\.sort\(\(a, b\) => b\.net - a\.net \|\| \(b\.score \?\? 0\) - \(a\.score \?\? 0\)\)/);
  });

  it("waits for the current round's own lines before reading any", () => {
    // The money is still settling until then; reading earlier would draw
    // the current round with nobody in it.
    // useMatchRounds keeps its guard; the screen reads the ROOM's rounds
    // now (useRoomRounds), which waits the same way on the current round's
    // lines being in.
    expect(hook).toMatch(/if \(!roomId \|\| !matchInfo \|\| !ready \|\| matchInfo\.roundIds\.length === 0\)/);
    const room = read("src/hooks/useRoomRounds.ts");
    expect(room).toMatch(/if \(!roomId \|\| !ready\) \{\s*\n\s*setRounds\(null\);/);
    expect(results).toMatch(/useRoomRounds\(currentRoom\?\.id, hasPotLines, readRoomRound\)/);
    // And reads them through the ledger; nothing settles on a look.
    expect(room).toMatch(/Promise\.all\(rows\.map\(\(r\) => readRoomRound\(r\.id\)\)\)/);
    expect(room).not.toMatch(/settleRoomRound\(/);
  });
});

describe("the match's totals", () => {
  const round = (n: number, seats: [string, number][]): MatchRound => ({
    id: `r${n}`, number: n, categoryName: null, iconSlug: null, pot: 1000,
    seats: seats.map(([user_id, net]) => ({ user_id, net, score: null })),
  });

  it("sum every seat over every round, most first", () => {
    expect(matchTotals([round(1, [["a", 500], ["b", -500]]), round(2, [["b", 500], ["a", -500]]), round(3, [["a", 500], ["b", -500]])]))
      .toEqual([{ user_id: "a", net: 500 }, { user_id: "b", net: -500 }]);
  });

  it("are only drawn once the last round of a match of two or more is in", () => {
    // Over the whole room now, not one match, and shown from the second
    // round on (owner: "show all coins users won or lose, like summery of
    // the all games"). A room that has played one round is its podium.
    expect(results).toMatch(/const roomTotals = roomRounds && roomRounds\.length >= 2 \? matchTotals\(roomRounds\) : null;/);
  });
});

describe("the card", () => {
  it("sits in the list under the podium, in the list's own tile shape", () => {
    // One tile per GAME the room has played, newest first, each in the
    // list's shape; from the second round on.
    expect(results).toMatch(/\{roomRounds && roomRounds\.length >= 2 && roomGames\.map\(\(\[game, rounds\]\) => \(/);
    expect(results).toMatch(/<motion\.section[\s\S]*?className=\{TILE\}/);
    expect(results).toMatch(/const TILE =\s*\n\s*"rounded-\[24px\] border-2 border-\[rgba\(255,217,217,0\.1\)\] bg-\[rgba\(255,222,222,0\.2\)\] px-3 py-3/);
    // Not in the footer any more: the footer floats over the list and a
    // block there hid the tiles behind it.
    expect(results).not.toMatch(/className="relative p-4 pb-5 space-y-3"\s*>\s*\{\/\*[\s\S]*?\{matchStandings && matchInfo && \(/);
  });

  it("names each round, its category in the reader's language, and its pot", () => {
    expect(results).toMatch(/t\("extra\.matchRoundsTitle", \{ game \}\)/);
    expect(results).toMatch(/\{localizeCategory\(round\.categoryName\) \|\| t\("extra\.categoryFallback"\)\}/);
    expect(results).toMatch(/t\("lobby\.uRoundLabel", \{ count: round\.number \}\)/);
    expect(results).toMatch(/\{round\.pot > 0 && <PotPill amount=\{round\.pot\} \/>\}/);
    expect(results).toMatch(/t\("extra\.roundPotLabel", \{ amount: amount\.toLocaleString\(\) \}\)/);
  });

  it("says who won and who lost it: every seat, the winner first with the medal", () => {
    expect(results).toMatch(/\{round\.seats\.map\(\(seat, i\) => \{/);
    expect(results).toMatch(/\{placeMark\(i, i \+ 1\)\}/);
    expect(results).toMatch(/<PotLine net=\{seat\.net\} compact \/>/);
  });

  it("a random or mixed round wears the box; a round whose questions carried no icon takes its category's", () => {
    expect(results).toMatch(/const undecided = isUndecidedRound\(null, round\.categoryName\);/);
    expect(results).toMatch(/round\.iconSlug \?\? iconForCategoryName\(round\.categoryName\) \?\? UNDECIDED_ICON_SLUG/);
  });
});

describe("the words, in every language", () => {
  it("all three keys, with their placeholders", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/matchRoundsTitle: "[^"]*\{game\}[^"]*",/);
      expect(src, lang).toMatch(/roundPotLabel: "[^"]*\{amount\}[^"]*",/);
      expect(src, lang).toMatch(/matchTotalsLabel: "[^"]+",/);
    }
  });
});
