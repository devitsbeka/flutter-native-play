/**
 * Create shows the host what it commits to before it does.
 *
 * The tap used to start the match outright. What it locked in - the rounds,
 * the question count, the stake every seat pays - was spread over the rules
 * tab, the category chip and the pot line, and none of it could be changed
 * once the round was under way. So the tap opens a summary first, with a way
 * back, and the sheet's own Start is what was Create (owner's ask).
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

describe("Create opens the summary, not the match", () => {
  it("the start gate ends in the sheet, after the stake check", () => {
    const gate = lobby.slice(lobby.indexOf("const handleStartOrPick = () => {"), lobby.indexOf("const summaryRounds = ["));
    expect(gate).toMatch(/if \(seatedPlayers >= 2 && !hasEnoughCoins\) \{\s*setShowNoStake\(true\);\s*return;\s*\}/);
    expect(gate).toMatch(/setShowMatchSummary\(true\);/);
    expect(gate).not.toMatch(/handleStartGame\(\)/);
  });

  it("the sheet's Start is the old Create", () => {
    expect(lobby).toMatch(/onConfirm=\{\(\) => \{\s*setShowMatchSummary\(false\);\s*void handleStartGame\(\);\s*\}\}/);
    expect(lobby).toMatch(/onChange=\{\(\) => setShowMatchSummary\(false\)\}/);
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
    expect(lobby).toMatch(/const matchLive = currentRoom\.status === "playing";/);
    expect(lobby).toMatch(/onChange: isHost && !matchLive \? \(v: string\) => void setQuestions\(v\) : undefined,/);
    expect(lobby).toMatch(/onAdd: isHost && !matchLive \? \(\) => \{ setStartAfterPick\(false\); setShowCategoryPicker\(true\); \} : undefined,/);
    expect(lobby).toMatch(/canEdit=\{isHost && !matchLive\}/);
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

  it("its Start says what the lobby's button says", () => {
    expect(sheet).toMatch(/t\("lobby\.uStartGame"\)/);
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
