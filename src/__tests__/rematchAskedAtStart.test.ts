/**
 * A later match is asked at Start, with the match on the card.
 *
 * The first match starts on the host's Start. Once the table has played,
 * Start on the next one asks everyone seated - the rounds in order, the
 * question count, the stake - and the host starts with whoever said yes.
 * A seat that declines is given up; one still deciding when the host
 * starts is removed, because every seat that stays is staked (owner:
 * "ask other players if they want rematch or not, show that it is a
 * rematch, show new match categories and rules... who accepts plays the
 * match, who do not leaves the room, and pot changes based on players
 * count").
 *
 * The ask is the same rematch_request the results screen used to send,
 * carrying the match now, and answered from a card in place rather than
 * from the bell.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const util = read("src/utils/rematchRequests.ts");
const gate = read("src/components/team/RematchGate.tsx");
const wait = read("src/components/team/RematchSheet.tsx");
const results = read("src/components/team/GameResultsScreenV2.tsx");

describe("the lobby's Start asks the table on a later match", () => {
  it("a rematch is a table that has played, with somebody else seated", () => {
    expect(lobby).toMatch(/const roomHasPlayed = participants\.some\(\(p\) => \(p\.total_rounds_played \?\? 0\) > 0\);/);
    expect(lobby).toMatch(/const isRematch = roomHasPlayed;/);
    expect(lobby).toMatch(/const asksTable = isRematch && tableToAsk\.length > 0;/);
    expect(lobby).toMatch(/\(p\) => p\.user_id !== user\?\.id && \(p\.status as string\) !== "invited",/);
  });

  it("with the rounds, the question count and the stake on the ask", () => {
    const ask = lobby.slice(lobby.indexOf("const askTableForRematch"), lobby.indexOf("const startWithWhoSaidYes"));
    expect(ask).toMatch(/kind: "host_new_game",/);
    expect(ask).toMatch(/rounds: summaryRounds\.map\(\(r\) => \(\{ name: r\.name, icon_slug: r\.iconSlug \}\)\),/);
    expect(ask).toMatch(/questions_per_round: playsUserTrivia \? null : questionsPerRound\(currentRoom\.total_questions\),/);
    expect(ask).toMatch(/stake: REWARDS\.GAME_STAKE,/);
    expect(ask).toMatch(/setRematchAsked\(true\);/);
    // The card carries them.
    expect(util).toMatch(/rounds\?: \{ name: string; icon_slug: string \| null \}\[\];/);
    expect(util).toMatch(/\.\.\.\(match \?\? \{\}\),/);
  });

  it("Start opens the rematch's own sheet, which asks before it starts", () => {
    // It used to dress the match summary up as a rematch, which could show
    // neither the table nor its answers. One sheet for the whole thing now
    // (rematchIsOneSheet.test.ts); Create's summary is Create's alone.
    expect(lobby).toMatch(/if \(asksTable\) \{[\s\S]*?setRematchAsked\(false\);\s*\n\s*setShowRematch\(true\);\s*\n\s*return;\s*\n\s*\}/);
    expect(lobby).toMatch(/onAsk=\{\(\) => void askTableForRematch\(\)\}/);
    expect(lobby).not.toMatch(/askingTable/);
    const sheet = read("src/components/team/MatchSummarySheet.tsx");
    expect(sheet).not.toMatch(/rematch\?: boolean/);
    expect(sheet).not.toMatch(/t\("lobby\.summaryRematchTitle"\)/);
    expect(sheet).toMatch(/\{t\("lobby\.summaryTitle"\)\}/);
  });

  it("the results screen no longer asks", () => {
    expect(results).not.toMatch(/askRematch\([^)]*"host_new_game"\)/);
  });
});

describe("the answer", () => {
  it("yes marks the seat ready, on the player's own row", () => {
    expect(util).toMatch(/\.update\(\{ status: "ready" \}\)\s*\.eq\("room_id", data\.room_id\)\s*\.eq\("user_id", userId\);/);
  });

  it("is a card in place: the host's face, the room, the match, play or leave", () => {
    expect(gate).toMatch(/export function GlobalRematchGate\(/);
    expect(gate).toMatch(/n\.type === "rematch_request"/);
    expect(gate).toMatch(/<JoinRequestRoomCard/);
    expect(gate).toMatch(/<RematchMatchCard/);
    expect(gate).toMatch(/acceptLabel=\{amHost \? t\("extra\.joinRequestAccept"\) : t\("extra\.rematchGatePlay"\)\}/);
    expect(gate).toMatch(/declineLabel=\{amHost \? t\("extra\.joinRequestDecline"\) : t\("extra\.rematchGateLeave"\)\}/);
    // No walks a player out of the room they are standing in.
    expect(gate).toMatch(/else if \(!accept && inRoom && !amHost\) \{\s*[^}]*navigate\("\/team", \{ replace: true \}\);/);
  });
});

describe("the host starts with whoever said yes", () => {
  it("the wait sheet shows the table's answers and the pot for those in", () => {
    expect(wait).toMatch(/const ready = seats\.filter\(\(s\) => s\.answer === "ready"\)\.length;/);
    // First place's share of the table's pot, not the pot (roomPot.test.ts).
    expect(wait).toMatch(/showsPot \? \(firstPlaceShare\(playing, stake\) \?\? 0\) : stake/);
    expect(wait).toMatch(/disabled=\{starting \|\| \(asked && ready === 0\)\}/);
    // Who said what: see rematchAnswersAreShown.test.ts.
    expect(lobby).toMatch(/answer: !seated \? "declined" : \(seated\.status as string\) === "ready" \? "ready" : "waiting",/);
  });

  it("and the undecided leave the table before the stake is taken", () => {
    const start = lobby.slice(lobby.indexOf("const startWithWhoSaidYes"), lobby.indexOf("return (\n    <UniversalLobby"));
    // Only the seats that were ASKED: somebody who sat down during the ask
    // never got a card (roundsThatCannotHang.test.ts).
    expect(start).toMatch(/const asked = new Set\(askedSeats\.map\(\(s\) => s\.user_id\)\);/);
    expect(start).toMatch(/const undecided = tableToAsk\.filter\(\(p\) => asked\.has\(p\.user_id\) && \(p\.status as string\) !== "ready"\);/);
    expect(start).toMatch(/\.from\("room_participants"\)\.delete\(\)\.in\("id", undecided\.map\(\(p\) => p\.id\)\)/);
    expect(start).toMatch(/void handleStartGame\(\);/);
  });
});

describe("two players sit centred on the podium", () => {
  it("two columns, not three with an empty step", () => {
    expect(results).toMatch(/const TWO_UP_ORDER = \[0, 1\] as const;/);
    expect(results).toMatch(/rankedParticipants\.length === 2 \? "max-w-\[260px\] grid-cols-2 gap-6" : "max-w-\[362px\] grid-cols-3 gap-2"/);
    expect(results).toMatch(/\(rankedParticipants\.length === 2 \? TWO_UP_ORDER : PODIUM_ORDER\)\.map/);
  });
});

describe("the words, in every language", () => {
  it("all seven carry the fourteen keys", () => {
    const keys = [
      "rematchGateHostBody", "rematchGateAskBody", "rematchGatePlay", "rematchGateLeave",
      "rematchWaitTitle", "rematchWaitHint", "rematchWaitReady", "rematchWaitPending", "rematchWaitDeclined",
      "rematchWaitStart", "rematchWaitUndecided",
      "summaryRematchTitle", "summaryRematchHint", "summaryAskTable",
    ];
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of keys) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
      expect(src, `${lang} count placeholder`).toMatch(/rematchWaitStart: "[^"]*\{count\}[^"]*",/);
    }
  });
});
