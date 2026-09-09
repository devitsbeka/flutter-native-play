/**
 * A match is one game, however many rounds it has.
 *
 * Five categories picked at Create are five rounds of ONE game, and the
 * table wants to know, at the end, who won the most coins over all of them
 * (owner's ask). Three things follow:
 *
 *  - every round writes which game it belongs to (room_games.game_number,
 *    which every round used to write as 1): a round continued from the
 *    results screen keeps its match's number, a round started from the
 *    lobby opens the next;
 *  - the results screen says which round of which game it is, above the
 *    category, and shows New Game only once the match is over - while
 *    rounds are queued, Continue is the one way on;
 *  - and when the last round is in, the match's standings: every seat's
 *    coins over all of its rounds, summed from each round's settled pot.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");
const results = read("src/components/team/GameResultsScreenV2.tsx");

describe("every round knows its game", () => {
  it("one helper reads the number off the room's last round", () => {
    expect(ctx).toMatch(/const nextGameNumber = async \(roomId: string, continuesMatch: boolean\): Promise<number> => \{/);
    expect(ctx).toMatch(/return continuesMatch && last > 0 \? last : last \+ 1;/);
  });

  it("and every start path uses it - none writes game 1 any more", () => {
    expect(ctx).not.toMatch(/game_number: 1,/);
    const uses = ctx.match(/game_number: await nextGameNumber\(roomId, phaseRef\.current === "results"\),/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(6);
  });
});

describe("the results screen", () => {
  it("says which round of which game, inside the category pill under its name", () => {
    // It stood above the pill; the design (Figma 1157:10058) sets it under
    // the category's name inside the pill (resultsScreenFigma.test.ts).
    // The reading lives in useMatchInfo now, shared with the countdown.
    const hook = read("src/hooks/useMatchInfo.ts");
    expect(hook).toMatch(/\.from\("room_games"\)\s*\.select\("id, game_number, created_at"\)/);
    expect(hook).toMatch(/round: rounds\.findIndex\(\(g\) => g\.id === gameId\) \+ 1,/);
    expect(results).toMatch(/const matchInfo = useMatchInfo\(currentRoom\?\.id, currentRoom\?\.current_game_id\);/);
    const chip = results.indexOf("rounded-full bg-white/15 backdrop-blur-sm");
    const name = results.indexOf("{localizeCategory(currentRoom.category_name)}");
    const label = results.indexOf('t("extra.matchRoundLabel", { game: matchInfo.game, round: matchInfo.round })');
    expect(chip).toBeGreaterThan(-1);
    expect(name).toBeGreaterThan(chip);
    expect(label).toBeGreaterThan(name);
  });

  it("offers New Game only once the match is over", () => {
    expect(results).toMatch(/\{queue\.length === 0 && \(\s*<ChunkyButton\s*variant="mint"/);
  });

  it("sums every round's settled pot into the match's standings", () => {
    expect(results).toMatch(/const matchOver = queue\.length === 0 && !waitingForPlayers;/);
    expect(results).toMatch(/matchInfo\.roundIds\.length < 2 \|\| !matchOver \|\| !hasPotLines/);
    expect(results).toMatch(/for \(const id of matchInfo\.roundIds\) \{\s*const \{ lines \} = await settleRoomRound\(roomId, id\);/);
    expect(results).toMatch(/\.sort\(\(a, b\) => b\.net - a\.net\)/);
    expect(results).toMatch(/t\("extra\.matchStandingsTitle", \{ game: matchInfo\.game, rounds: matchInfo\.roundIds\.length \}\)/);
  });
});

describe("the words, in every language", () => {
  it("both keys, with their placeholders", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/matchRoundLabel: "[^"]*\{game\}[^"]*\{round\}[^"]*",/);
      expect(src, lang).toMatch(/matchStandingsTitle: "[^"]*\{game\}[^"]*\{rounds\}[^"]*",/);
    }
  });
});
