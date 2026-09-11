import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const sheet = read("src/components/team/RematchSheet.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

/**
 * The rematch used to be two sheets that shared nothing: the match summary
 * in a "rematch dress" asked the question — a buzzer, the rounds, the stake
 * — and a second sheet appeared afterwards with the faces and the answers.
 * So the people being asked were absent from the ask, and what they would
 * play was absent from the wait (owner: "instead what we show on rematch
 * flow we should show like on screenshot 2 than show waiting (players
 * deciding) ... and when i or more players would confirm to play new game
 * we show start game button").
 */
describe("one sheet, three states", () => {
  it("the table, the rounds and the stake are on it throughout", () => {
    expect(sheet).toMatch(/export type RematchPhase = "ask" \| "asked";/);
    expect(sheet).toMatch(/const asked = phase === "asked";/);
    // The faces first, then the title, then what is being played.
    expect(sheet.indexOf("<RematchFace")).toBeLessThan(sheet.indexOf("lobby.summaryRounds"));
    expect(sheet).toMatch(/\{t\("lobby\.summaryRounds"\)\} · \{rounds\.length\}/);
    expect(sheet).toMatch(/<CategoryArtwork categoryId=\{round\.categoryId \?\? undefined\}/);
    expect(sheet).toMatch(/\{t\("lobby\.uQuestionsPerRound"\)\}/);
  });

  it("asks in the winner's name, then says it has asked", () => {
    expect(sheet).toMatch(/asked\s*\n\s*\? t\("extra\.rematchWaitTitle"\)\s*\n\s*: winnerName\s*\n\s*\? t\("extra\.rematchWonTitle", \{ name: winnerName \}\)\s*\n\s*: t\("lobby\.summaryRematchTitle"\)/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/\n\s+rematchWonTitle: "[^"]*\{name\}[^"]*",/);
      expect(src, lang).toMatch(/\n\s+rematchWaiting: "[^"]+",/);
    }
  });

  it("the one button asks, then waits, then starts", () => {
    expect(sheet).toMatch(/onClick=\{asked \? onStart : onAsk\}/);
    expect(sheet).toMatch(/disabled=\{starting \|\| \(asked && ready === 0\)\}/);
    expect(sheet).toMatch(/: !asked \? \(\s*\n\s*t\("lobby\.summaryAskTable"\)\s*\n\s*\) : ready === 0 \? \(\s*\n\s*t\("extra\.rematchWaiting"\)/);
    expect(sheet).toMatch(/\{t\("extra\.rematchWaitStart", \{ count: playing \}\)\}/);
  });

  it("the stake tile becomes the pot only once somebody is in it", () => {
    expect(sheet).toMatch(/const showsPot = asked && ready > 0;/);
    expect(sheet).toMatch(/\{showsPot \? t\("lobby\.winnerTakes"\) : t\("lobby\.summaryStake"\)\}/);
    expect(sheet).toMatch(/\{\(showsPot \? \(firstPlaceShare\(playing, stake\) \?\? 0\) : stake\)\.toLocaleString\(\)\}/);
  });

  it("a face carries an answer only after the table has been asked", () => {
    expect(sheet).toMatch(/const dimmed = asked && said !== "ready";/);
    expect(sheet).toMatch(/\{asked \? \(/);
    expect(sheet).toMatch(/seat\.online && \(/);
    expect(sheet).toMatch(/seat\.isWinner\s*\n\s*\? "shadow-\[0px_0px_0px_3px_rgba\(252,211,77,0\.95\)\]"/);
  });
});

describe("the lobby drives it", () => {
  it("Start on a later match opens the ask; asking moves it on in place", () => {
    expect(lobby).toMatch(/setRematchAsked\(false\);\s*\n\s*setShowRematch\(true\);/);
    expect(lobby).toMatch(/phase=\{rematchAsked \? "asked" : "ask"\}/);
    expect(lobby).toMatch(/seats=\{rematchAsked \? rematchSeats : tableSeats\}/);
    expect(lobby).toMatch(/onAsk=\{\(\) => void askTableForRematch\(\)\}/);
    expect(lobby).toMatch(/onStart=\{\(\) => void startWithWhoSaidYes\(\)\}/);
    // askTableForRematch no longer opens a second sheet.
    expect(lobby).toMatch(/setRematchAsked\(true\);/);
    expect(lobby).not.toMatch(/setShowRematchWait/);
  });

  it("names the winner of the last round, or nobody at all", () => {
    expect(lobby).toMatch(/const lastWinner = \(\(\) => \{/);
    expect(lobby).toMatch(/\.filter\(\(p\) => \(p\.score \?\? 0\) > 0\)/);
    // A tie names nobody: the sheet asks its plain question instead.
    expect(lobby).toMatch(/if \(scored\.length > 1 && \(scored\[0\]\.score \?\? 0\) === \(scored\[1\]\.score \?\? 0\)\) return null;/);
    expect(lobby).toMatch(/winnerName=\{lastWinner \? \(lastWinner\.user_id === user\?\.id \? t\("game\.you"\) : lastWinner\.nickname\) : null\}/);
  });
});
