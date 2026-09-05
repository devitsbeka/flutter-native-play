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

/**
 * How recently a round must have started for a page that is only NOW loading
 * to chase it.
 *
 * The watcher has two ways of hearing about a start: a live UPDATE on the
 * room, which is by definition happening right now, and a one-off read when
 * the component mounts. That read exists for a narrow race — the host presses
 * start while the player is mid-navigation, so no subscription is listening
 * yet — and it was written with no time bound at all: any room sitting in
 * `playing` matched it.
 *
 * A room can sit in `playing` indefinitely. An abandoned match, a game nobody
 * settled, a lobby left open a fortnight ago — all of them still say
 * "playing". So every single page load, on every page, read that row and
 * navigated the player into it. Refreshing the home page took you to the
 * online-game page, forever, and no amount of leaving fixed it because
 * leaving is not what clears the row.
 *
 * Fifteen seconds is the race this is meant to catch, plus room for a cold
 * mount on a phone: the 3s count, its 5s grace, and margin. Past that there
 * is nothing to join in progress — the count is long spent — so the player is
 * left where they are, and the room is still one tap away.
 */
export const ROUND_START_CATCHUP_MS = 15000;

/**
 * Did this round start recently enough to pull a just-loaded page into it?
 *
 * A missing or unparseable `started_at` is false: "playing since who knows
 * when" is exactly the state that must not navigate anybody.
 */
export function isFreshRoundStart(
  startedAt: string | null | undefined,
  now: number,
): boolean {
  if (!startedAt) return false;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return false;
  // A clock behind the server's yields a negative age; that is still a start
  // that just happened, so it counts.
  return now - start < ROUND_START_CATCHUP_MS;
}
