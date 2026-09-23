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
    // Only that: a later match asks the table on the rematch's own sheet
    // (rematchIsOneSheet.test), so this confirm has one job again.
    expect(lobby).toMatch(
      /onConfirm=\{\(\) => \{\s*setShowMatchSummary\(false\);\s*handleDoneCreating\(\);\s*\}\}/,
    );
    // Change closes it and leaves the host in the lobby, still editable.
    expect(lobby).toMatch(/onChange=\{\(\) => setShowMatchSummary\(false\)\}/);
  });

  it("and a player arriving first cannot rob the host of it", () => {
    // A public room is listed the moment it exists, so somebody can walk in
    // before the host has pressed anything. While Create required
    // `awaitingPlayers` that filled the room, skipped the button straight to
    // Start, and the summary was never shown — on a room that was already
    // settled by being listed. Create depends on the ROUND being decided
    // now, not on the seats being empty.
    expect(lobby).toMatch(/const offerCreate = !needsCategorySelection && !isStarting && !roomCreated;/);
    expect(lobby).not.toMatch(/const offerCreate = awaitingPlayers && !roomCreated;/);
  });

  it("and confirming it only walks the host out when there is nobody to walk out on", () => {
    // The trip to the rooms list is for finding a second player. With one
    // already here it would carry the host out of a room that is ready to
    // start, past the person waiting in it.
    // And staying put says so now — the room was made, and a button that
    // only changed a word was the whole confirmation the host got.
    expect(lobby).toMatch(
      /if \(enoughPlayersRef\.current\) \{\s*\n\s*toast\.success\(t\("extra\.roomCreatedToast"\)\);\s*\n\s*return;\s*\n\s*\}\s*\n\s*exitRoom\(\);/,
    );
  });

  it("Start no longer detours through it on the first match — and asks for no balance", () => {
    const gate = lobby.slice(lobby.indexOf("const handleStartOrPick = () => {"), lobby.indexOf("const summaryRounds = ["));
    // Nothing is staked (20261108100000_no_wagering), so Start checks no coins.
    expect(gate).not.toMatch(/canCoverStake|setShowNoStake|coins/);
    expect(gate).toMatch(/void handleStartGame\(\);/);
    // The one detour left is a later match with people at the table, and it
    // goes to the rematch's own sheet (rematchAskedAtStart.test) — this
    // summary belongs to Create, and Start never opens it at all.
    expect(gate).not.toMatch(/setShowMatchSummary\(true\)/);
    expect(gate).toMatch(/if \(asksTable\) \{[\s\S]*?setShowRematch\(true\);/);
  });

  it("lists the rounds in play order, the held round first", () => {
    expect(lobby).toMatch(/const summaryRounds = \[\s*\.\.\.\(heldRound \? \[\{ name: heldRound\.name, iconSlug: heldRound\.iconSlug \?\? null, categoryId: heldRound\.categoryId \}\] : \[\]\),\s*\.\.\.queue\.map/);
  });

  it("carries the question count, and no price", () => {
    expect(lobby).toMatch(/questionsPerRound=\{playsUserTrivia \? null : questionsPerRound\(currentRoom\.total_questions\)\}/);
    expect(lobby).not.toMatch(/stake=\{|soloFree=/);
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
    expect(lobby).toMatch(/onAdd: canPickCategory \? \(\) => \{ setStartAfterPick\(false\); setShowCategoryPicker\(true\); \} : undefined,/);
    // `canPickCategory` is `isHost && !rulesLocked`, named so the chip's
    // label, its tap and its "+" cannot drift apart. Asserted here too,
    // because the rule this test is about now lives in that definition.
    expect(lobby).toMatch(/const canPickCategory = isHost && !rulesLocked;/);
    expect(lobby).toMatch(/canEdit=\{isHost && !rulesLocked\}/);
  });

  it("but the door stays the host's to answer", () => {
    // Visibility is no longer a row at all (roomVisibilityFromTheTab.test.ts),
    // and the door row is drawn for the host alone (joiningRowIsTheHosts).
    expect(lobby).toMatch(/\.\.\.\(isHost && isPublicRoom && hasApprovalColumn && !playsOwnTrivia/);
    expect(lobby).toMatch(/onChange: \(v: string\) => void setApproval\(v\),/);
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

  it("quotes the prizes, with free to play under them", () => {
    // See "what a room pays" below.
    expect(sheet).toMatch(/\{t\("playRewards\.prizesLabel"\)\}/);
    expect(sheet).toMatch(/<PrizeLadder t=\{t\} \/>/);
    expect(sheet).toMatch(/<p [^>]*>\{t\("playRewards\.freeToPlay"\)\}<\/p>/);
  });

  it("its confirm says Create, which is the tap that opened it", () => {
    expect(sheet).toMatch(/t\("extra\.createBtn"\)/);
    expect(sheet).not.toMatch(/t\("lobby\.uStartGame"\)/);
  });
});

describe("what a room pays, and what it costs", () => {
  it("the prizes are shown whether or not anybody has sat down yet", () => {
    // A room is created for people to join, so the sheet quotes a full
    // table's ladder (roomPrizes.test.ts): first, second and third, paid by
    // the house. It used to quote a stake every seat paid into a pot, which
    // App Review rejected as simulated gambling.
    expect(sheet).not.toMatch(/stake|soloFree/);
  });

  it("and it costs nobody anything — PRO or not, seated or not", () => {
    const noWager = read("supabase/migrations/20261108100000_no_wagering.sql");
    const settle = noWager.slice(noWager.indexOf("FUNCTION public.settle_room_round"));
    expect(settle.slice(0, settle.indexOf("$$;"))).not.toMatch(/coins - /);
    // And nothing on the way in asks for a balance or a subscription.
    const gate = lobby.slice(lobby.indexOf("const handleStartOrPick = () => {"), lobby.indexOf("const summaryRounds = ["));
    expect(gate).not.toMatch(/isVip|coins/);
  });
});

describe("the sheet is written in every language", () => {
  it("all six strings, all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      for (const key of ["summaryTitle", "summaryHint", "summaryRounds", "summaryStake", "summaryFree", "summaryChange"]) {
        expect(locale, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
      // The hint is one sentence that fits three lines of the sheet. It was
      // two, and four lines in Georgian, and its second half — "visibility
      // can change any time" — was no longer true: the tab a room is made
      // from decides that, for good (owner: "this Georgian text is so bad,
      // grammar is incorrect, text is too long, shorten text").
      const hint = locale.match(/\n\s+summaryHint: "([^"]+)",/)![1];
      expect(hint.length, `${lang}.summaryHint`).toBeLessThanOrEqual(75);
      expect(hint, `${lang}.summaryHint`).not.toMatch(/—/);
    }
  });
});
