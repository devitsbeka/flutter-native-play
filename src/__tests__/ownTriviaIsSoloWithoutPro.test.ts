/**
 * A room is a PRO feature, even for the player's own trivia — and the
 * room says which of their things it plays.
 *
 * A player without PRO could still make a room from their own trivia,
 * collection or party: the My Trivia tab's play sheet offered "Create
 * room" and "Play on TV" to everyone, the party card's Play went straight
 * to a TV room, and the chooser's My Trivias pick made a room. Without PRO
 * all three play solo now, and the room options wear a padlock that opens
 * the PRO wall (owner: "if player has trivia created and is not pro ...
 * they should play it solo, if they are pro they can create room").
 *
 * And the lobby's chip drew the party house for every own-content room,
 * because the room said only user_trivia_id. game_mode names the kind now
 * (party: / trivia: / collection:), each with its own face; an uploaded
 * cover is drawn in a 20px-rounded frame rather than floated like an icon.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ownTriviaKind } from "@/utils/ownTriviaRound";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const tab = read("src/components/social/MyTriviaTab.tsx");
const sheet = read("src/components/social/TriviaPlayModeModal.tsx");
const hub = read("src/pages/TeamV2.tsx");
const chooser = read("src/components/team/CreateRoomPage.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const universal = read("src/components/lobby/UniversalLobby.tsx");

describe("without PRO, own content is played solo", () => {
  it("the hub tells the tab whether rooms are open", () => {
    expect(hub).toMatch(/<MyTriviaTab\s*\n\s*onCreateQuiz=\{[^}]*\}\s*\n\s*canHostRoom=\{!roomsLocked\}\s*\n\s*onRoomsLocked=\{\(\) => setShowRoomsWall\(true\)\}/);
  });

  it("the play sheet locks its room and TV options and opens the wall", () => {
    expect(sheet).toMatch(/canHostRoom\?: boolean;\s*\n\s*onRoomsLocked\?: \(\) => void;/);
    expect(sheet).toMatch(/const handleCreateRoom = \(\) => \{\s*\n\s*if \(!canHostRoom\) \{\s*\n\s*onClose\(\);\s*\n\s*onRoomsLocked\?\.\(\);\s*\n\s*return;/);
    expect(sheet).toMatch(/const handlePlayTV = \(\) => \{\s*\n\s*if \(!canHostRoom\) \{\s*\n\s*onClose\(\);\s*\n\s*onRoomsLocked\?\.\(\);\s*\n\s*return;/);
    expect((sheet.match(/\{lock\}/g) ?? []).length).toBe(2);
    expect(tab).toMatch(/canHostRoom=\{canHostRoom\}\s*\n\s*onRoomsLocked=\{onRoomsLocked\}/);
  });

  it("the party card's Play goes to the party's own page", () => {
    expect(tab).toMatch(/if \(!canHostRoom\) \{\s*\n\s*navigate\(`\/trivia\/\$\{post\.id\}`\);\s*\n\s*return;\s*\n\s*\}/);
    expect(tab).toMatch(/<PersonalTriviaCard\s*\n\s*canHostRoom=\{canHostRoom\}/);
  });

  it("the chooser's My Trivias pick is played on its own page", () => {
    expect(chooser).toMatch(/if \(selectionMode === "my-trivias" && challengeTrivia && !isVip\) \{\s*\n\s*onClose\(\);\s*\n\s*handoff\(challengeTrivia\.type === "collection" \? `\/collection\/\$\{challengeTrivia\.id\}` : `\/trivia\/\$\{challengeTrivia\.id\}`\);\s*\n\s*return;/);
  });
});

describe("the room says which of the player's things it plays", () => {
  it("every path that makes such a room tags game_mode", () => {
    expect(tab).toMatch(/update\(\{ user_trivia_id: post\.id, game_mode: `party:\$\{post\.id\}` \}\)/);
    expect((tab.match(/game_mode: `trivia:\$\{playModeTrivia\.id\}`/g) ?? []).length).toBe(2);
    expect(chooser).toMatch(/game_mode: challengeTrivia\.type === "collection" \? `collection:\$\{challengeTrivia\.id\}` : `trivia:\$\{challengeTrivia\.id\}`,/);
  });

  it("and the kind is read off it, a bare user_trivia_id reading as a party", () => {
    expect(ownTriviaKind({ game_mode: "party:abc", user_trivia_id: "abc" })).toBe("party");
    expect(ownTriviaKind({ game_mode: "trivia:abc", user_trivia_id: "abc" })).toBe("trivia");
    expect(ownTriviaKind({ game_mode: "collection:abc", user_trivia_id: null })).toBe("collection");
    expect(ownTriviaKind({ game_mode: null, user_trivia_id: "abc" })).toBe("party");
    expect(ownTriviaKind({ game_mode: "classic", user_trivia_id: null })).toBeNull();
    expect(ownTriviaKind(null)).toBeNull();
  });

  it("the lobby's chip wears that face, as an image", () => {
    expect(lobby).toMatch(/const kind = ownTriviaKind\(currentRoom\);\s*\n\s*return kind \? ownTriviaIconSrc\(kind\) : null;/);
    expect(lobby).toMatch(/iconSrc: freshStart \? undefined : \(heldRound\?\.iconSrc \?\? undefined\),/);
    expect(universal).toMatch(/\{iconSrc \? \(\s*\n\s*<span className="pointer-events-none shrink-0">\s*\n\s*<img alt="" src=\{iconSrc\} className="h-8 w-8 object-contain" \/>/);
  });
});

describe("an uploaded face is framed", () => {
  it("a face outside the catalogue is a picture, drawn in a 20px frame", () => {
    expect(lobby).toMatch(/const iconFramed = !!currentRoom\.room_icon && iconPool\.length > 0 && !iconPool\.includes\(currentRoom\.room_icon\);/);
    expect(lobby).toMatch(/icon=\{roomFace\}\s*\n\s*iconFramed=\{iconFramed\}/);
    expect(universal).toMatch(/iconFramed \? "rounded-\[20px\] object-cover" : "object-contain",/);
  });
});
