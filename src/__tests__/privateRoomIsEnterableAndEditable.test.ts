import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A private room is reused, not replaced.
 *
 * Once a public room has played its round it is private for good
 * (publicRoomIsPublicOnce.test.ts), and from then on it is an ordinary
 * private room: its people come back to it, and its host changes it
 * between games — another round, a different question count, the TV.
 *
 * Two things had to be true for that, and one of them was not. The card
 * has to let you in (roomCardAction.test.ts — it did not, with nobody else
 * online), and the lobby has to unlock for a private room's host. This
 * file pins the second: every edit gate in the lobby closes on the room
 * being PUBLIC, never on its having played (owner: "users should be able
 * enter private rooms and if they are host they should be able to modify
 * room, add categories, change questions count in rounds, use TV mode ...
 * private rooms can be reused, never goes public again but re-use same
 * room to play private is available").
 */
const lobby = readFileSync(join(process.cwd(), "src/components/team/RoomLobbyV2.tsx"), "utf8");

describe("a private room's host can still change it", () => {
  it("locks rules on a published PUBLIC room or a live match, nothing else", () => {
    expect(lobby).toMatch(/const publishedRoom = isPublicRoom && roomCreated && !needsCategorySelection;/);
    expect(lobby).toMatch(/const rulesLocked = matchLive \|\| publishedRoom;/);
    // Having played is a rematch ask, not a lock.
    expect(lobby).not.toMatch(/rulesLocked = [^;]*roomHasPlayed/);
  });

  it("lets the host add rounds and change the question count while unlocked", () => {
    expect(lobby).toMatch(/onAdd: isHost && !rulesLocked \? \(\) => \{ setStartAfterPick\(false\); setShowCategoryPicker\(true\); \} : undefined/);
    expect(lobby).toMatch(/onChange: isHost && !rulesLocked \? \(v: string\) => void setQuestions\(v\) : undefined/);
    expect(lobby).toMatch(/canEdit=\{isHost && !rulesLocked\}/);
  });

  it("offers the TV to a private room's host", () => {
    expect(lobby).toMatch(/tv=\{isHost && !isPublicRoom \? \{ label: t\("lobby\.uPlayOnTv"\)/);
  });

  it("never offers to make it public again", () => {
    // No Visibility row and no setter for it: the tab that made the room
    // decided, and a once-public room's flip to private is one way.
    expect(lobby).not.toMatch(/setVisibility/);
    expect(lobby).not.toMatch(/key: "visibility"/);
  });
});
