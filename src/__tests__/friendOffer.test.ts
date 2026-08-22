import { describe, it, expect } from "vitest";
import { shouldOfferFriendRequest } from "@/utils/friendOffer";

/**
 * Who gets an "add friend" button in the room lobby.
 *
 * The lobby is where players meet, and it offered no way to add any of them.
 * The rules that keep the button off the wrong rows are here rather than in
 * the JSX, because a signed-out viewer and your own row both render exactly
 * like everyone else's.
 */
describe("offering a friend request from the lobby", () => {
  const FRIENDS = ["friend-1", "friend-2"];

  it("offers for another player who is not a friend", () => {
    expect(shouldOfferFriendRequest("me", "stranger", FRIENDS)).toBe(true);
  });

  it("never offers on your own row", () => {
    expect(shouldOfferFriendRequest("me", "me", FRIENDS)).toBe(false);
  });

  it("does not offer someone already on the friends list", () => {
    expect(shouldOfferFriendRequest("me", "friend-1", FRIENDS)).toBe(false);
  });

  it("offers nothing to a signed-out viewer", () => {
    expect(shouldOfferFriendRequest(null, "stranger", FRIENDS)).toBe(false);
    expect(shouldOfferFriendRequest(undefined, "stranger", FRIENDS)).toBe(false);
  });

  it("handles a row with no user id rather than offering a broken request", () => {
    expect(shouldOfferFriendRequest("me", null, FRIENDS)).toBe(false);
    expect(shouldOfferFriendRequest("me", "", FRIENDS)).toBe(false);
  });

  it("offers when the friends list is empty", () => {
    expect(shouldOfferFriendRequest("me", "stranger", [])).toBe(true);
  });
});
