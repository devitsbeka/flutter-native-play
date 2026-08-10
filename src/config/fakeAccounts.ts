// User ids of the seeded "fake" profiles that populate the app.
//
// These accounts never sign in, so a friend request sent to one would sit
// pending forever. FakeFriendRequestAutoAccept accepts those requests from
// the requester's own client after a delay, so they behave like real people
// who happened to be away for a while.
//
// To add an account: copy its user_id (profiles.user_id) and paste it here.
// Anything not listed is treated as a real person and is never auto-accepted.
export const FAKE_ACCOUNT_USER_IDS: string[] = [];

// A pending request to a fake account is accepted somewhere in this window,
// never instantly — the exact moment is derived from the friendship row id,
// so it stays stable across reloads instead of re-rolling each time.
export const FAKE_ACCEPT_MIN_HOURS = 4;
export const FAKE_ACCEPT_MAX_HOURS = 48;

// Stable 0..1 value from a row id — same id always yields the same delay.
function hashToUnitInterval(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 10_000) / 10_000;
}

/** Milliseconds after the request was sent before this fake account replies. */
export function fakeAcceptDelayMs(friendshipId: string): number {
  const span = FAKE_ACCEPT_MAX_HOURS - FAKE_ACCEPT_MIN_HOURS;
  const hours = FAKE_ACCEPT_MIN_HOURS + hashToUnitInterval(friendshipId) * span;
  return hours * 60 * 60 * 1000;
}
