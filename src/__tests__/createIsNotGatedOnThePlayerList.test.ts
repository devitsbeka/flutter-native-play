import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const lobby = readFileSync(join(process.cwd(), "src/components/team/RoomLobbyV2.tsx"), "utf8");
const context = readFileSync(join(process.cwd(), "src/contexts/MultiplayerContextV2.tsx"), "utf8");

/**
 * The host's Create button, and the one thing that must never gate it.
 *
 * Create and Start are the same slab in the lobby footer, and for a while
 * they shared one `disabled` expression — Start's. That expression counts
 * the room's players (`canStartGame` is `participants.length >= 1`), which
 * is right for Start and meaningless for Create: Create publishes the draft
 * and raises the summary, and the host is in the room by definition.
 *
 * It mattered because `participants` is not handed over with the room. It
 * arrives from its own fetch afterwards, and that fetch had no retry and no
 * error branch — one blip and the list stayed empty for the life of the
 * lobby. The host then saw a healthy violet Create that ate every tap and
 * explained nothing (owner: "i click create to create room - it does
 * nothing").
 */
describe("Create is the host's own button", () => {
  it("is not disabled by how many players have loaded", () => {
    const disabled = lobby.match(/disabled: offerCreate\s*\?([^:]*):/);
    expect(disabled, "the footer button no longer splits Create from Start").toBeTruthy();
    // The Create arm of the ternary — everything before the `:`.
    expect(disabled![1]).not.toContain("canStartGame");
    expect(disabled![1]).not.toContain("awaitingPlayers");
  });

  it("still counts people before it lets the game start", () => {
    expect(lobby).toMatch(/: !canStartGame \|\| isStarting \|\| loading \|\| awaitingPlayers/);
    expect(lobby).toContain("const canStartGame = participants.length >= 1;");
  });

  it("does not sit under a caption about a second player", () => {
    // "Waiting for a second player" contradicts a Create button that is
    // ready and needs nobody.
    expect(lobby).toContain("awaitingPlayers && !offerCreate");
  });

  it("never goes dead without saying anything while the context is busy", () => {
    // `loading` is shared with createRoom/enterRoom. It may spin the button;
    // it may not silently disable it.
    expect(lobby).toContain("loading: isStarting || (loading && !offerCreate)");
  });
});

/**
 * And the read that fills the list does not fail in silence.
 */
describe("the room's player list", () => {
  it("retries once and says so when it cannot be read", () => {
    const fn = context.slice(context.indexOf("const fetchParticipants ="));
    const body = fn.slice(0, fn.indexOf("}, []);"));
    expect(body).toContain("could not read the room's players");
    // Two reads of room_participants: the attempt and the retry.
    expect(body.match(/from\("room_participants"\)/g)?.length).toBe(2);
  });
});

/**
 * Publishing the draft is checked, not assumed.
 *
 * PostgREST answers an UPDATE that matched NO row with no error at all, so
 * `publishDraft` walked on as though it had settled a room it had not
 * touched. `.select("id")` is what turns that into the failure it is.
 */
describe("publishing the draft", () => {
  it("treats a write that changed nothing as a failure", () => {
    const fn = lobby.slice(lobby.indexOf("const publishDraft"));
    const body = fn.slice(0, fn.indexOf("\n  };"));
    expect(body).toContain('.select("id")');
    expect(body).toContain("!settled?.length");
  });

  it("says something when it throws instead of dropping the tap", () => {
    const fn = lobby.slice(lobby.indexOf("const handleDoneCreating"));
    const body = fn.slice(0, fn.indexOf("\n  };"));
    expect(body).toContain("catch");
    expect(body).toContain('toast.error(t("extra.errorOccurred"))');
  });

  it("says the room was made when it stays in it", () => {
    expect(lobby).toContain('toast.success(t("extra.roomCreatedToast"))');
  });
});

/**
 * And the list Create lands on is asked again — for BOTH kinds of room.
 *
 * The private half of Create navigated to /team?tab=private without
 * touching the my-rooms cache. That cache is 30s fresh and its realtime
 * subscription is ref-counted by mounted consumers, so it is unsubscribed
 * for the whole time the host is in the lobby: neither the room's INSERT
 * nor the `is_draft` UPDATE is heard. The tab remounted still fresh and
 * rendered the rooms from before the room existed — four real, correctly
 * settled rooms made and none of them visible, which reads exactly like
 * "create doesn't create a room".
 */
describe("the list Create lands on", () => {
  it("is invalidated for every room, not just a public one", () => {
    const create = lobby.slice(lobby.indexOf("const handleDoneCreating"));
    const body = create.slice(0, create.indexOf("\n  };"));
    const myRooms = body.indexOf("invalidateQueries({ queryKey: [MY_ROOMS_KEY] })");
    expect(myRooms, "the my-rooms cache is never refreshed on Create").toBeGreaterThan(-1);
    // Unconditional: not tucked behind `if (isPublic)` the way the public
    // one is. The Private tab keeps the rooms you host, whichever kind.
    const publicOnly = body.indexOf("if (isPublic) void queryClient.invalidateQueries");
    expect(publicOnly).toBeGreaterThan(myRooms);
  });

  it("refreshes before it navigates or stays", () => {
    const create = lobby.slice(lobby.indexOf("const handleDoneCreating"));
    const body = create.slice(0, create.indexOf("\n  };"));
    expect(body.indexOf("[MY_ROOMS_KEY]")).toBeLessThan(body.indexOf("enoughPlayersRef.current"));
  });
});
