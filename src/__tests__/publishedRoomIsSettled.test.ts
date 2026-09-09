/**
 * A published room is played as it was listed.
 *
 * The Public tab tells a stranger what a room plays before they ask to come
 * in, and that card is all they have to go on. A host who could still swap
 * the category and the question count afterwards would be answering a
 * different question than the one people joined for (owner: "players
 * entering public room they should have info what they are playing and if
 * host could modify room after players joined that would be confusing and
 * unfair").
 *
 * So Create settles a public room, exactly as Start settles a live match —
 * one lock, two reasons, because two locks would eventually disagree about
 * what "settled" means.
 *
 * What is left is the visibility row. A host who wants their room back makes
 * it private, and everything is editable again the moment they do (owner:
 * "we let hosts switch public/private, only that option ... i can modify if
 * i switch to private but not on public").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("what settles a room", () => {
  it("being published and created — not merely being published", () => {
    // A room still being built is public from the moment it exists (that is
    // what "+ Room" makes), so publishing alone cannot be the lock or the
    // host could never configure it in the first place.
    expect(lobby).toMatch(/const publishedRoom = isPublicRoom && roomCreated;/);
  });

  it("and it shares the live match's lock rather than adding a second one", () => {
    expect(lobby).toMatch(/const rulesLocked = matchLive \|\| publishedRoom;/);
  });

  it("switching to private unlocks everything again, by construction", () => {
    // `isPublicRoom` reads the room's own column, which the visibility row
    // writes — so the unlock needs no separate path to keep in step.
    expect(lobby).toMatch(/const isPublicRoom = Boolean\(\(currentRoom as \{ is_public\?: boolean \}\)\.is_public\);/);
    expect(lobby).toMatch(/roomVisibilityFields\(value === "public"\)/);
  });
});

describe("what a settled public room will not let the host do", () => {
  it("change the question count — the row is gone, not greyed", () => {
    // A dead control invites a tap that does nothing. A LIVE match keeps
    // the row (it comes back when the round ends); a published room does
    // not (owner: "we don't show other 5,10,20 questions tabs").
    expect(lobby).toMatch(/\.\.\.\(playsUserTrivia \|\| publishedRoom \? \[\] : \[\{\s*\n\s*key: "questions",/);
    expect(lobby).toMatch(/onChange: isHost && !rulesLocked \? \(v: string\) => void setQuestions\(v\) : undefined,/);
  });

  it("add another round", () => {
    expect(lobby).toMatch(
      /onAdd: isHost && !rulesLocked \? \(\) => \{ setStartAfterPick\(false\); setShowCategoryPicker\(true\); \} : undefined,/,
    );
  });

  it("or swap the one it has, from the chip or the round list", () => {
    expect(lobby).toMatch(/: isHost && !rulesLocked\n/);
    expect(lobby).toMatch(/canEdit=\{isHost && !rulesLocked\}/);
  });

  it("or rename it, or change its face", () => {
    // The card somebody tapped is the room they get. On publishedRoom
    // rather than rulesLocked: a live match may still be renamed, which
    // was never part of what a stranger was shown before joining.
    expect(lobby).toMatch(/const canRename = isHost && !publishedRoom;/);
    expect(lobby).toMatch(/onRename=\{canRename \? \(\) => setShowIconPicker\(true\) : undefined\}/);
  });

  it("and there is no other way in — every room write is behind one of these", () => {
    // The picker writes the category (handleSelectCategory / Random /
    // Trivia / AddToQueue) and it is unreachable while locked; the rename
    // sheet writes the name and icon and is behind canRename; visibility
    // and approval are the two that stay open on purpose. The gradient
    // picker is mounted but nothing opens it.
    expect(lobby).not.toMatch(/setShowGradientPicker\(true\)/);
    const writes = (lobby.match(/\.from\("game_rooms"\)\s*\n\s*\.update\(/g) ?? []).length;
    expect(writes, "a new game_rooms write needs a lock decision").toBe(9);
  });
});

describe("what it still lets the host do", () => {
  it("make the room private — the one control that survives", () => {
    expect(lobby).toMatch(/onChange: isHost \? \(v: string\) => void setVisibility\(v\) : undefined,/);
    // Not gated on the lock, unlike every row above.
    expect(lobby).not.toMatch(/rulesLocked \? \(v: string\) => void setVisibility/);
  });

  it("and answer the door, on a room that asks", () => {
    expect(lobby).toMatch(/onChange: isHost \? \(v: string\) => void setApproval\(v\) : undefined,/);
  });
});

describe("a public room cannot be created without something to play", () => {
  it("because Create is only offered once the round is decided", () => {
    // `awaitingPlayers` requires !needsCategorySelection, so an empty room's
    // button is "Choose Category" — the way to fix it — and never Create
    // (owner: "if i didn't picked category for match i shouldn't be able to
    // click create"). A private room may sit empty as long as the host
    // likes; the button just keeps asking for a category.
    expect(lobby).toMatch(
      /const awaitingPlayers = !needsCategorySelection && !enoughPlayers && !isStarting;/,
    );
    expect(lobby).toMatch(/const offerCreate = awaitingPlayers && !roomCreated;/);
    expect(lobby).toMatch(/const needsCategorySelection = !hasContent;/);
    expect(lobby).toMatch(
      /const hasContent = queue\.length > 0 \|\| currentRoom\.category_id \|\| currentRoom\.user_trivia_id;/,
    );
  });

  it("and an empty room's button says so instead", () => {
    expect(lobby).toMatch(/needsCategorySelection\s*\n\s*\? t\("extra\.rlChooseCategory"\)/);
  });
});
