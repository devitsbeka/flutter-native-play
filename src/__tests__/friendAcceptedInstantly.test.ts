/**
 * A request that has been accepted stops reading as a request.
 *
 * The invite screen splits search results into "Your Friends" and "Other
 * Players" off the live friends list, so someone who accepts moves into the
 * friends half straight away. Their BUTTON did not move with them: it was
 * driven by `sentRequests`, a set this screen writes when you tap Add and
 * clears only when the screen closes. So the row said "Sent" and stayed
 * disabled under a heading that called them a friend — shown as a friend,
 * impossible to invite, which is the one thing the row is there for.
 *
 * It needs no second device to hit: `sendFriendRequest` accepts outright when
 * the other player had already asked you, so a single tap could hand you a
 * friendship and a dead button in the same moment.
 *
 * Underneath it, the friendships realtime channel was being torn down and
 * resubscribed on every presence change — `fetchFriends` listed `onlineUsers`
 * as a dependency and the subscription depends on `fetchFriends`. An
 * acceptance landing in one of those gaps raised no event, and the new friend
 * did not appear until the app was backgrounded and brought back.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const modal = read("src/components/team/InviteFriendsModal.tsx");
const ctx = read("src/contexts/FriendsContext.tsx");

describe("a friend is never also 'waiting on them'", () => {
  it("both waiting states are read as false once they are a friend", () => {
    expect(modal).toMatch(/const isSent = !isFriend && sentRequests\.has\(result\.user_id\);/);
    expect(modal).toMatch(
      /const isPendingOutgoing =\s*\n\s*!isFriend && pendingOutgoingIds\.has\(result\.user_id\);/,
    );
    // The old readings, which is what made the row lie.
    expect(modal).not.toMatch(/const isSent = sentRequests\.has\(result\.user_id\);/);
    expect(modal).not.toMatch(/const isPendingOutgoing = pendingOutgoingIds\.has\(result\.user_id\);/);
  });

  it("so the button is live for them rather than held down", () => {
    // `isDisabled` is the gate the row was stuck behind.
    expect(modal).toMatch(
      /const isDisabled = isSent \|\| isLoading \|\| isSeated \|\| \(!isFriend && isPendingOutgoing\);/,
    );
    // And the handler's own early return keys off the same value.
    expect(modal).toMatch(/if \(isFriend\) \{\s*\n\s*if \(isSent \|\| isLoading\) return;/);
  });

  it("and it reads as an invite, in whichever sense this screen means", () => {
    // Browse mode starts a room with them; the room modes pick them for one.
    expect(modal).toMatch(/isFriend && isBrowseMode \? \(/);
    expect(modal).toMatch(/navigate\(`\/team\?challenge=\$\{result\.user_id\}&type=create-room`\)/);
  });

  it("the stale ids are dropped afterwards too, not just ignored", () => {
    // Otherwise removing the friendship later, with this screen still open,
    // would bring "Sent" back for a request that no longer exists.
    expect(modal).toMatch(/const drop = \(prev: Set<string>\) => \{/);
    expect(modal).toMatch(/setSentRequests\(drop\);\s*\n\s*setPendingOutgoingIds\(drop\);/);
    // Same-set identity when nothing changed, so this cannot loop.
    expect(modal).toMatch(/return next\.size === prev\.size \? prev : next;/);
  });
});

describe("the acceptance actually reaches this device", () => {
  it("the friendships channel no longer resubscribes on every presence change", () => {
    expect(ctx).toMatch(/\}, \[user, navigate\]\);/);
    expect(ctx).not.toMatch(/\}, \[user, onlineUsers\]\);/);
    expect(ctx).toMatch(/isOnline: onlineUsersRef\.current\.has\(friendId\),/);
  });

  it("and who is online is still marked, from the effect that owns it", () => {
    // The ref only removes the dependency; the mapping itself is unchanged.
    expect(ctx).toMatch(/onlineUsersRef\.current = onlineUsers;/);
    expect(ctx).toMatch(/isOnline: onlineUsers\.has\(friend\.friendId\),/);
  });

  it("accepting refetches before it returns, on every path", () => {
    // The screens that accept — notifications, the reel, this modal — all go
    // through these, so none of them has to refresh a list of its own:
    // the auto-accept inside sendFriendRequest, accept, decline, remove.
    expect(ctx.match(/await fetchFriends\(\);/g) ?? []).toHaveLength(4);
  });
});
