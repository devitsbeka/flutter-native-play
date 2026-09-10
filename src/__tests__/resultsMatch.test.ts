/**
 * The results screens match.
 *
 * Three of them — the quick game's, the duel's, the room's podium — had
 * three coin pills, two "Play again" buttons in two colours, and a way
 * out drawn as a purple outline on a purple screen. The owner's rules
 * (owner: "we need to match results pages, i like red -500 and green +500
 * badges, use them everywhere on results pages, also make sure buttons
 * are visible and they are same styled (i like green button saying play
 * again)"):
 *
 *   the pill     CoinDeltaPill, green up / red down / quiet at zero, on
 *                all three, and on every row of the room's lists;
 *   the button   the mint "Play again" on the quick game and the duel;
 *                the room's own mint "New game" was already that;
 *   the way out  a text button, never an outline.
 *
 * And the room's round-by-round detail — which sat under the podium and
 * had no room left once ten seats were listed — is a text button that
 * says what it opens, and a sheet (owner: "let's show it as a button
 * (text-button) and clicking on it user can see details").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const pill = read("src/components/game/CoinDeltaPill.tsx");
const quick = read("src/components/game/MatchResultScreen.tsx");
const duel = read("src/components/game/DuelResult.tsx");
const room = read("src/components/team/GameResultsScreenV2.tsx");

describe("one pill", () => {
  it("is green up, red down, quiet at zero", () => {
    expect(pill).toMatch(/up \? "bg-emerald-500" : down \? "bg-red-500" : "bg-white\/25"/);
    expect(pill).toMatch(/\{up \? `\+\$\{delta\}` : delta\}/);
  });

  it("is the one every results screen wears", () => {
    expect(quick).toMatch(/<CoinDeltaPill delta=\{coinChange\} delay=\{0\.6\} \/>/);
    expect(quick).not.toMatch(/"bg-emerald-500"\s*\n\s*: "bg-red-500"/);
    expect(duel).toMatch(/<CoinDeltaPill delta=\{delta\} \/>/);
    expect(duel).not.toMatch(/bg-\[#ffbb00\]/);
    expect(room).toMatch(/return <CoinDeltaPill delta=\{net\} size=\{compact \? "sm" : "md"\}/);
    expect(room).not.toMatch(/POT_TONES|PotTone/);
    expect(room).toMatch(/<PotLine net=\{netFor\(p\)\} \/>/);
    expect(room).toMatch(/<PotLine net=\{net\} compact \/>/);
    expect(room).toMatch(/<PotLine net=\{seat\.net\} compact \/>/);
  });
});

describe("the same buttons", () => {
  it("green Play again on the quick game and the duel, and a text button for the way out", () => {
    expect(quick).toMatch(/<ChunkyButton\s*\n\s*variant="mint"\s*\n\s*size="lg"\s*\n\s*onClick=\{handlePlayAgain\}[\s\S]*?\{t\("game\.playAgain"\)\}/);
    expect(quick).not.toMatch(/variant="white"/);
    expect(duel).toMatch(/<ChunkyButton variant="mint" size="lg" className="w-full" onClick=\{onPlayAgain\}[\s\S]*?>\s*\n\s*\{t\("game\.playAgain"\)\}/);
    expect(duel).not.toMatch(/variant="outline"/);
    expect(duel).toMatch(/<button\s*\n\s*type="button"\s*\n\s*onClick=\{onBack\}[\s\S]*?\{t\("extra\.duelBackToGuess"\)\}/);
    expect(room).toMatch(/\{queue\.length === 0 && \(\s*<ChunkyButton\s*variant="mint"/);
  });
});

describe("round by round, behind a button", () => {
  it("a text button that says what it opens, only when there is more than the podium", () => {
    expect(room).toMatch(/\{roomRounds && roomRounds\.length >= 2 && \(\s*\n\s*<button\s*\n\s*type="button"\s*\n\s*onClick=\{\(\) => setShowRounds\(true\)\}[\s\S]*?\{t\("extra\.resultsRoundByRoundCta"\)\}/);
    expect(room).toMatch(/const \[showRounds, setShowRounds\] = useState\(false\);/);
  });

  it("the sheet holds the rounds and the totals, unchanged, and closes on the backdrop", () => {
    const sheet = room.slice(room.indexOf("{showRounds && ("), room.indexOf("</AnimatePresence>"));
    expect(sheet).toMatch(/onClick=\{\(\) => setShowRounds\(false\)\}/);
    expect(sheet).toMatch(/onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
    expect(sheet).toMatch(/\{roomRounds && roomRounds\.length >= 2 && roomGames\.map\(\(\[game, rounds\]\) => \(/);
    expect(sheet).toMatch(/\{roomTotals && \(\s*\n\s*<StandingsCard title=\{t\("extra\.resultsAllGamesTitle"/);
    // Not under the podium any more.
    const column = room.slice(room.indexOf('<div className="space-y-[17px]">'), room.indexOf("<AnimatePresence>"));
    expect(column).not.toMatch(/roomGames\.map/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+resultsRoundByRoundCta: "[^"]+",/);
    }
  });
});
