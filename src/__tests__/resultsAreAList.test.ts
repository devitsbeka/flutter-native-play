/**
 * The results are a list.
 *
 * They were a podium: three faces side by side, the winner's bigger, a
 * medal hung off each ring and the coins under that; then everyone from
 * fourth down as tiles; then, under those, the match round by round with
 * every round's seats WRAPPED across the width in a row of 24px faces.
 * Three shapes for the same people. On two players the pair was drawn
 * twice — once large, once tiny — with "TriviaMas…" cut by a column a third
 * of the screen wide, and half the screen empty under it. On ten, the
 * wrapped row was a wall (owner: "looks awful how you handled this page ...
 * we need more clear and balanced results page, show players as list not
 * besides, what if there are 10 players, check and fix the layout
 * properly").
 *
 * One model now: a row per player — place, face, name, score, coins — in a
 * titled tile. This round is the first tile. The match's EARLIER rounds,
 * if any, are a second, each round's seats in a column. The match's final
 * standings, once it is over, are a third, in the same rows. Two players
 * are two rows; ten are ten; nothing is told twice.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const results = read("src/components/team/GameResultsScreenV2.tsx");

describe("one row per player", () => {
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

  it("at one fixed height, with a name that truncates rather than a column that does", () => {
    expect(results).toMatch(/"flex h-\[60px\] items-center gap-3 rounded-2xl px-2",/);
    expect(results).toMatch(/<p className="truncate font-display text-\[17px\] font-bold leading-5 tracking-\[-0\.16px\] text-white">/);
    // The face is a fixed 44px; a 110px face has no place in a row.
    expect(results).toMatch(/className=\{cn\("h-11 w-11 border-2", ring\)\}/);
    expect(results).not.toMatch(/w-\[110px\]|w-\[76px\]/);
  });

  it("yours wears the wash, so it can be found in a list of ten", () => {
    expect(results).toMatch(/isMe && "bg-white\/15",/);
  });

  it("a face opens its profile, except your own", () => {
    expect(results).toMatch(/onTap=\{!p\.isMe \? \(\) => openProfile\(p\.user_id\) : undefined\}/);
  });
});

describe("the tiles, top to bottom", () => {
  it("this round first, titled with the match and round, with its pot", () => {
    expect(results).toMatch(/<StandingsCard\s*\n\s*title=\{\s*\n\s*matchInfo\s*\n\s*\? t\("extra\.matchRoundLabel", \{ game: matchInfo\.game, round: matchInfo\.round \}\)\s*\n\s*: t\("extra\.resultsStandingsTitle"\)\s*\n\s*\}\s*\n\s*pot=\{thisRoundPot\}/);
    // The pot is what was actually staked, read from the ledger — not
    // worked out here from a head count (roomPot.test.ts).
    expect(results).toMatch(/const thisRoundPot = Object\.values\(potLines\)\.reduce\(\(sum, line\) => sum \+ line\.staked, 0\);/);
  });

  it("then the earlier rounds, never this one again", () => {
    expect(results).toMatch(/const earlierRounds = \(matchRounds \?\? \[\]\)\.filter\(\(r\) => r\.id !== currentRoom\?\.current_game_id\);/);
    expect(results).toMatch(/\{matchInfo && earlierRounds\.length > 0 && \(/);
  });

  it("then the match's final standings, in the same rows", () => {
    expect(results).toMatch(/\{matchStandings && matchInfo && \(\s*\n\s*<StandingsCard/);
    expect(results).toMatch(/\{matchStandings\.map\(\(row, i\) => \{[\s\S]*?<StandingRow/);
  });

  it("all in one column that scrolls, padded clear of the floating footer", () => {
    expect(results).toMatch(/className="w-full max-w-\[468px\] flex-1 min-h-0 overflow-y-auto"\s*\n\s*style=\{\{ paddingBottom: footerHeight \+ FOOTER_HAZE_PX \}\}/);
    expect(results).toMatch(/<div className="space-y-\[17px\]">/);
  });
});

describe("what is gone", () => {
  it("the podium and its two orders", () => {
    expect(results).not.toMatch(/PODIUM_ORDER|TWO_UP_ORDER/);
    expect(results).not.toMatch(/grid-cols-3 gap-2|grid-cols-2 gap-6/);
    expect(results).not.toMatch(/-bottom-\[32px\] text-\[46px\]/);
  });

  it("the tiles from fourth down — every seat is the same row now", () => {
    expect(results).not.toMatch(/rounded-br-\[54px\]/);
    expect(results).not.toMatch(/h-\[71px\]/);
  });

  it("and the seats wrapped across a round in a row", () => {
    expect(results).not.toMatch(/flex-wrap/);
  });
});

describe("the words", () => {
  it("both new strings, all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, `${lang}.resultsStandingsTitle`).toMatch(/\n\s+resultsStandingsTitle: "[^"]+",/);
      expect(locale, `${lang}.resultsPoints`).toMatch(/\n\s+resultsPoints: "[^"]*\{n\}[^"]*",/);
    }
  });
});
