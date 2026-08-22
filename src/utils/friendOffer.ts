/**
 * Whether to offer "add friend" for a player you are looking at.
 *
 * The room lobby is where players actually meet — several of them on one
 * scoreboard, having just played a stack of rounds together — and there was
 * no way to add any of them from there. Adding someone meant already knowing
 * their name and going elsewhere to search for it.
 *
 * Three cases must not show the button, and they are easy to get wrong in
 * JSX, so the decision lives here where it can be tested:
 *
 *   - yourself, which is the row the lobby highlights and the one most
 *     likely to be tapped by accident;
 *   - someone already on your friends list;
 *   - nobody, i.e. a signed-out viewer, who has no list to add to.
 */
export function shouldOfferFriendRequest(
  viewerId: string | null | undefined,
  targetUserId: string | null | undefined,
  friendIds: readonly string[]
): boolean {
  if (!viewerId || !targetUserId) return false;
  if (viewerId === targetUserId) return false;
  return !friendIds.includes(targetUserId);
}
