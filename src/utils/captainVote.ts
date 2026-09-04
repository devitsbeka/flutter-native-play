/**
 * When the arena elects a captain, and for how long.
 *
 * The decisions live here rather than inline in the lobby so they can be
 * executed in a test instead of read: everything below is a pure function of
 * numbers, and the lobby is left holding only the timers and the broadcast.
 *
 * The election itself is the server's (tb_vote_captain) — plurality inside
 * one bench, earliest joiner breaking ties, no votes once the match starts.
 * This file is about the WINDOW.
 */

/** How long the room has to vote, once the window opens. */
export const CAPTAIN_VOTE_MS = 10_000;

/**
 * How long the host has to open it themselves before it opens anyway.
 *
 * Long enough to be a choice, short enough that a host who has put their
 * phone down does not hold a full room.
 */
export const CAPTAIN_VOTE_GRACE_MS = 5_000;

/** Below this, a bench is too small for a vote to mean anything. */
export const MIN_TEAM_FOR_VOTE = 3;

/**
 * Is the armband voted for, or rolled?
 *
 * At 2-2 a vote between two people is a staring contest — the host's device
 * rolls one captain per bench instead, and the winner is simply told.
 */
export function captainIsVoted(perSide: number): boolean {
  return perSide >= MIN_TEAM_FOR_VOTE;
}

/**
 * Whole seconds left on the window, 0 once it has closed.
 *
 * Rounded UP, so a window with 200ms left still reads "1" rather than
 * flashing 0 while the sheet is still open — the number and the sheet have
 * to disappear together.
 */
export function captainVoteSecondsLeft(openedAt: number | null, now: number): number {
  if (openedAt == null) return 0;
  const left = CAPTAIN_VOTE_MS - (now - openedAt);
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

/** Is the window open right now? */
export function captainVoteIsOpen(openedAt: number | null, now: number): boolean {
  return openedAt != null && now - openedAt < CAPTAIN_VOTE_MS;
}
