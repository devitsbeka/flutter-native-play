/**
 * A room built on your own trivia is yours, and it looks like it.
 *
 * Two things follow from a round being the player's own writing rather than
 * a category out of the library, and the lobby was doing neither.
 *
 * ## It has a face
 *
 * A queued round carries the icon of the category behind it, and a trivia is
 * not a category — so a round picked from My Trivias was queued with no
 * `icon_slug` at all and every screen fell back to its own placeholder: a
 * red question mark on the round chip, a mystery box in the round list. The
 * owner's note is that there was nothing to pick here in the first place:
 * "my trivia party don't need icon, it has one".
 *
 * ## It is not public
 *
 * "trivias created by me or my trivia parties are private and we shouldn't
 * show public/private or open/ask me rows, host invites friends to join or
 * plays solo." So both rows stand down.
 *
 * With one exception, which is the whole reason the rule is not simply "any
 * own-trivia round": a room CREATED from a trivia is private by
 * construction (`canPublish` has never included My Trivia), but a trivia
 * QUEUED into a room that is already public is not. Hiding the row there
 * would leave the host on the public list with the switch taken away.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  OWN_TRIVIA_ICON_SLUG,
  roomPlaysOwnTrivia,
  roundIconSlug,
  roundIsOwnTrivia,
} from "@/utils/ownTriviaRound";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const picker = read("src/components/team/CategoryPickerModal.tsx");

describe("a round that is the player's own trivia", () => {
  it("is recognised by how it was stored, either way round", () => {
    expect(roundIsOwnTrivia({ source_type: "user_trivia" })).toBe(true);
    expect(roundIsOwnTrivia({ user_trivia_id: "abc" })).toBe(true);
    expect(roundIsOwnTrivia({ source_type: "category", category_id: "x" } as never)).toBe(false);
    expect(roundIsOwnTrivia({ source_type: "random" })).toBe(false);
    expect(roundIsOwnTrivia(null)).toBe(false);
  });

  it("wears the MyTrivia face when it has none of its own", () => {
    expect(roundIconSlug({ source_type: "user_trivia" })).toBe(OWN_TRIVIA_ICON_SLUG);
    // The catalogue's own name for it — the same art the create menu shows.
    // Its own face, not the one the Family PRO plan and the invite-a-friend
    // benefits wear: those keep group-of-people, this is "House Party".
    expect(OWN_TRIVIA_ICON_SLUG).toBe("house-party");
  });

  it("but never overrides an icon it was given", () => {
    expect(roundIconSlug({ source_type: "user_trivia", icon_slug: "rocket" })).toBe("rocket");
  });

  it("and a round that is genuinely iconless keeps the caller's placeholder", () => {
    // A category with no icon is a different problem and still falls
    // through. A round with no category yet — random or mixed — is not
    // iconless: it wears the box, the one face the whole app draws for it.
    expect(roundIconSlug({ source_type: "category" })).toBeUndefined();
    expect(roundIconSlug({ source_type: "random" })).toBe("mystery-box");
    expect(roundIconSlug({ source_type: "category", category_id: "__mixed__" })).toBe("mystery-box");
  });
});

describe("the icon is both written and resolved", () => {
  it("written when the round is queued", () => {
    expect(picker).toMatch(/source_type: "user_trivia",[\s\S]*?icon_slug: OWN_TRIVIA_ICON_SLUG,/);
  });

  it("and resolved on the way out, for the rounds queued before that", () => {
    // Existing rows carry no icon_slug; writing it only at the picker would
    // leave every room made so far showing a question mark.
    expect(lobby).toMatch(/: roundIconSlug\(firstQueue\)/);
  });

  it("and the room's own held round gets it too", () => {
    expect(lobby).toMatch(/\|\| \(currentRoom\.user_trivia_id \? OWN_TRIVIA_ICON_SLUG : null\)/);
  });
});

describe("the rows a private room does not have", () => {
  it("there is no visibility row for any room now (roomVisibilityFromTheTab.test.ts)", () => {
    expect(lobby).not.toMatch(/key: "visibility"/);
  });

  it("and joining stands down for an own-trivia room", () => {
    expect(lobby).toMatch(/isPublicRoom && hasApprovalColumn && !playsOwnTrivia/);
  });

  it("the rule itself: a room made from a trivia hides them, public or not", () => {
    // It cannot BE public — canPublish excludes My Trivia — but the rule
    // does not lean on that.
    expect(roomPlaysOwnTrivia({ user_trivia_id: "t1" }, false, [])).toBe(true);
    expect(roomPlaysOwnTrivia({ user_trivia_id: "t1" }, true, [])).toBe(true);
  });

  it("a private room with a queued trivia hides them too", () => {
    expect(roomPlaysOwnTrivia({}, false, [{ source_type: "user_trivia" }])).toBe(true);
  });

  it("but a PUBLIC room keeps its switch, so nobody is stranded on the list", () => {
    // The host queued their own trivia into a room already on the public
    // list. Taking the row away would leave them listed with no way off.
    expect(roomPlaysOwnTrivia({}, true, [{ source_type: "user_trivia" }])).toBe(false);
  });

  it("and an ordinary room is untouched", () => {
    expect(roomPlaysOwnTrivia({}, false, [{ source_type: "category" }])).toBe(false);
    expect(roomPlaysOwnTrivia({}, true, [])).toBe(false);
    expect(roomPlaysOwnTrivia(null, false)).toBe(false);
  });

  it("and the lobby asks it rather than re-deriving it", () => {
    expect(lobby).toMatch(
      /const playsOwnTrivia = roomPlaysOwnTrivia\(currentRoom, isPublicRoom, queue\);/,
    );
  });

  it("and the create screen still routes every write through the guarded value", () => {
    // A room made from a trivia is already private there — canPublish has
    // never included My Trivia — so nothing here needed a second, unguarded
    // `false`. That invariant is asserted in publicRooms.test.ts and this
    // is the note not to break it while fixing the lobby.
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create).toMatch(/const publishRoom = canPublish && isPublic;/);
    expect((create.match(/roomVisibilityFields\(publishRoom\)/g) ?? []).length).toBe(2);
  });
});
