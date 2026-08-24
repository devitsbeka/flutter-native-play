/**
 * The 3-2-1 before a room's round.
 *
 * Derived from the room's `started_at` rather than counted down locally, and
 * that is the whole point of it. A player who was on another screen when the
 * host pressed start is navigated to the room and joins the count already in
 * progress — they see "2", not a fresh "3" that would put them a second
 * behind everyone else. Same reason the question clock reads elapsed time
 * instead of counting ticks: a count that starts when a component mounts
 * gives every player a different game.
 *
 * It also self-limits. Somebody who opens the room four seconds late gets no
 * countdown at all and goes straight to the question, because delaying them
 * further is exactly the thing this is meant to prevent.
 */

/** How long the count runs. Three numbers, one second each. */
export const COUNTDOWN_MS = 3000;

/**
 * The number to show, or null when there is nothing to show — the count is
 * over, or the room never recorded a start.
 *
 * A missing `started_at` deliberately yields null rather than a full count:
 * an unknown start time must never hold a player out of a question that is
 * already running.
 */
export function countdownNumberAt(
  startedAt: string | null | undefined,
  now: number,
): number | null {
  if (!startedAt) return null;

  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return null;

  const elapsed = now - start;

  // A clock that is behind the server's shows the whole count rather than a
  // number above 3.
  if (elapsed < 0) return 3;
  if (elapsed >= COUNTDOWN_MS) return null;

  return Math.ceil((COUNTDOWN_MS - elapsed) / 1000);
}

/**
 * How long the round-start screen may stay up after the digits run out, for a
 * player whose questions have not arrived yet.
 *
 * It is a bound, not a target. `enterRoom` has a branch that parks a client in
 * the lobby when a "playing" room yields no questions, and a room can sit in
 * that state indefinitely — so a hold with no deadline is a screen with no way
 * out. Five seconds covers a slow fetch and its retries; past that the player
 * gets the room back, even if the room is wrong.
 */
export const ROUND_START_GRACE_MS = 5000;

/**
 * Whether the round-start screen should still be shown, counting the grace.
 * Null `startedAt` is false: an unknown start can never justify a hold.
 */
export function isWithinRoundStart(
  startedAt: string | null | undefined,
  now: number,
): boolean {
  if (!startedAt) return false;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return false;
  return now - start < COUNTDOWN_MS + ROUND_START_GRACE_MS;
}

/** Milliseconds until the number would change, for scheduling a re-render. */
export function msUntilNextTick(
  startedAt: string | null | undefined,
  now: number,
): number | null {
  if (countdownNumberAt(startedAt, now) === null) return null;
  const start = Date.parse(startedAt as string);
  const elapsed = Math.max(0, now - start);
  return 1000 - (elapsed % 1000);
}
