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
  it("the host pressing Create — a draft they are still building is not settled", () => {
    // "+ Room" publishes on creation, so a room is public long before it is
    // finished. Locking on "public and has a round" took the category and
    // the name away from a host who had not said they were done (owner: "i
    // didn't clicked create yet but can't add categories or change icon or
    // room name, enable it before i click create").
    // ...while there is something to play: an emptied, played-out room
    // unlocks so its host can set the next game (endedPublicRoomsHidden.test).
    expect(lobby).toMatch(/const publishedRoom = isPublicRoom && roomCreated && !needsCategorySelection;/);
    expect(lobby).not.toMatch(/const publishedRoom = isPublicRoom && !needsCategorySelection;/);
  });

  it("and Create can always be reached, which is what makes that safe", () => {
    // Keying it on the tap failed once, because Create was only offered
    // while the room was short of players: a room somebody joined first
    // could never be created and so never locked. It depends on the round
    // now, not on the seats, so every public room with something to play
    // can reach it.
    expect(lobby).toMatch(/const offerCreate = !needsCategorySelection && !isStarting && !roomCreated;/);
    expect(lobby).toMatch(/const needsCategorySelection = !hasContent;/);
    expect(lobby).toMatch(
      /const hasContent = queue\.length > 0 \|\| currentRoom\.category_id \|\| currentRoom\.user_trivia_id;/,
    );
  });

  it("and it shares the live match's lock rather than adding a second one", () => {
    expect(lobby).toMatch(/const rulesLocked = matchLive \|\| publishedRoom;/);
  });

  it("reads the room's own column — and nothing in the lobby writes it any more", () => {
    // The tab the room was made from decided (roomVisibilityFromTheTab
    // .test.ts); the lock lifts when there is nothing left to play.
    // ...plus a public draft's intent and a publish that has just happened
    // (draftIsPrivateUntilCreate.test.ts); the row's column is still the
    // truth once it has caught up.
    expect(lobby).toMatch(/const isPublicRoom =\s*\n\s*Boolean\(\(currentRoom as \{ is_public\?: boolean \}\)\.is_public\) \|\|\s*\n\s*publishedNow \|\|\s*\n\s*draftWantsPublic\(currentRoom\.id\);/);
    expect(lobby).not.toMatch(/roomVisibilityFields/);
  });
});

describe("the chip keeps its inset whether or not it has a +", () => {
  it("carries the + button's own margin when there is no + to carry it", () => {
    // The + sits inside the pill's right edge with mr-[20px]; the label
    // half only reserves the 8px gap before it. With the + gone — a guest,
    // or a settled room — the "+N" pill inherited that 8px and read as
    // touching the edge.
    const universal = read("src/components/lobby/UniversalLobby.tsx");
    expect(universal).toMatch(/action \? "pr-\[8px\]" : "pr-\[20px\]",/);
    expect(universal).toMatch(/className="mr-\[20px\] flex size-\[40px\] shrink-0/);
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
    expect(writes, "a new game_rooms write needs a lock decision").toBe(8);
  });
});

describe("what it still lets the host do", () => {
  it("not make the room private — that switch is gone; the lock lifts when there is nothing to play", () => {
    // roomVisibilityFromTheTab.test.ts: the tab the room was made from
    // decided, and the lobby does not offer to change it.
    expect(lobby).not.toMatch(/setVisibility/);
    expect(lobby).toMatch(/const publishedRoom = isPublicRoom && roomCreated && !needsCategorySelection;/);
  });

  it("answer the door, on a room that asks", () => {
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
    expect(lobby).toMatch(/const offerCreate = !needsCategorySelection && !isStarting && !roomCreated;/);
    expect(lobby).toMatch(/const needsCategorySelection = !hasContent;/);
    expect(lobby).toMatch(
      /const hasContent = queue\.length > 0 \|\| currentRoom\.category_id \|\| currentRoom\.user_trivia_id;/,
    );
  });

  it("and an empty room's button says so instead", () => {
    expect(lobby).toMatch(/needsCategorySelection\s*\n\s*\? t\("extra\.rlChooseCategory"\)/);
  });
});
