/**
 * Create shows the host what it commits to before it does.
 *
 * What the tap locks in — the rounds, the question count, the stake every
 * seat pays — is spread over the rules tab, the category chip and the pot
 * line, and the moment it is all settled would otherwise be the moment
 * nobody is looking at any of it. So Create opens a summary first, with a
 * way back, and the sheet's own button is what finishes the job.
 *
 * It spent a while in front of Start instead, where it asked the wrong
 * question: a host pressing Start has people waiting on them and nothing
 * left to decide, because a public room is settled once it is listed
 * (owner: "we don't need to show this modal after i click start game, we
 * need it after 'create' so host can be sure what kind of room was created
 * by them"). Start goes straight into the match now.
 *
 * And a match that has started is played as it was confirmed: the round and
 * question editors close while a round is live, and come back for the next
 * match. Visibility is not part of the match, so it stays open.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const sheet = read("src/components/team/MatchSummarySheet.tsx");

describe("Create opens the summary; Start opens the match", () => {
  it("Create is the tap that raises the sheet", () => {
    expect(lobby).toMatch(/const handleCreatePress = \(\) => setShowMatchSummary\(true\);/);
    expect(lobby).toMatch(/onPress: offerCreate \? handleCreatePress : handleStartOrPick,/);
  });

  it("and the sheet's own button finishes what Create began", () => {
    expect(lobby).toMatch(
      /onConfirm=\{\(\) => \{\s*setShowMatchSummary\(false\);\s*handleDoneCreating\(\);\s*\}\}/,
    );
    // Change closes it and leaves the host in the lobby, still editable.
    expect(lobby).toMatch(/onChange=\{\(\) => setShowMatchSummary\(false\)\}/);
  });

  it("Start no longer detours through it — the stake check still stands", () => {
    const gate = lobby.slice(lobby.indexOf("const handleStartOrPick = () => {"), lobby.indexOf("const summaryRounds = ["));
    expect(gate).toMatch(/if \(seatedPlayers >= 2 && !hasEnoughCoins\) \{\s*setShowNoStake\(true\);\s*return;\s*\}/);
    expect(gate).toMatch(/void handleStartGame\(\);/);
    expect(gate).not.toMatch(/setShowMatchSummary\(true\)/);
  });

  it("lists the rounds in play order, the held round first", () => {
    expect(lobby).toMatch(/const summaryRounds = \[\s*\.\.\.\(heldRound \? \[\{ name: heldRound\.name, iconSlug: heldRound\.iconSlug \?\? null \}\] : \[\]\),\s*\.\.\.queue\.map/);
  });

  it("carries the question count and the stake the pot line already shows", () => {
    expect(lobby).toMatch(/questionsPerRound=\{playsUserTrivia \? null : questionsPerRound\(currentRoom\.total_questions\)\}/);
    expect(lobby).toMatch(/stake=\{seatedPlayers >= 2 \? REWARDS\.GAME_STAKE : null\}/);
  });
});

describe("a started match is played as confirmed", () => {
  it("the question and round editors close while a round is live", () => {
    // A live match is one of two reasons the editors close; a published
    // room is the other (see publishedRoomIsSettled.test.ts). One lock, so
    // they cannot disagree about what "settled" means.
    expect(lobby).toMatch(/const matchLive = currentRoom\.status === "playing";/);
    expect(lobby).toMatch(/const rulesLocked = matchLive \|\| publishedRoom;/);
    expect(lobby).toMatch(/onChange: isHost && !rulesLocked \? \(v: string\) => void setQuestions\(v\) : undefined,/);
    expect(lobby).toMatch(/onAdd: isHost && !rulesLocked \? \(\) => \{ setStartAfterPick\(false\); setShowCategoryPicker\(true\); \} : undefined,/);
    expect(lobby).toMatch(/canEdit=\{isHost && !rulesLocked\}/);
  });

  it("but visibility stays the host's to change", () => {
    expect(lobby).toMatch(/onChange: isHost \? \(v: string\) => void setVisibility\(v\) : undefined,/);
  });
});

describe("the sheet is the lobby's own", () => {
  it("wears the Play-on-TV sheet's overlay and panel", () => {
    // Character for character, so the two sheets cannot drift apart.
    const overlay = /fixed inset-0 z-\[120\] flex items-end justify-center bg-\[rgba\(64,38,102,0\.35\)\] backdrop-blur-\[6px\] p-4 pt-\[calc\(1rem_\+_var\(--safe-top\)\)\]/;
    const panel = /w-full max-w-\[468px\] max-h-full overflow-y-auto rounded-\[24px\] border-2 border-white\/60 bg-\[rgba\(252,247,255,0\.92\)\] p-2 shadow-\[0px_8px_24px_0px_rgba\(102,51,153,0\.18\)\]/;
    expect(sheet).toMatch(overlay);
    expect(sheet).toMatch(panel);
    expect(lobby).toMatch(overlay);
    expect(lobby).toMatch(panel);
  });

  it("says free for a solo room and shows the coin for a table", () => {
    expect(sheet).toMatch(/stake === null \? \(/);
    expect(sheet).toMatch(/\{t\("lobby\.summaryFree"\)\}/);
    expect(sheet).toMatch(/\{stake\.toLocaleString\(\)\}/);
  });

  it("its confirm says Create, which is the tap that opened it", () => {
    expect(sheet).toMatch(/t\("extra\.createBtn"\)/);
    expect(sheet).not.toMatch(/t\("lobby\.uStartGame"\)/);
  });
});

describe("the sheet is written in every language", () => {
  it("all six strings, all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      for (const key of ["summaryTitle", "summaryHint", "summaryRounds", "summaryStake", "summaryFree", "summaryChange"]) {
        expect(locale, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
    }
  });
});
