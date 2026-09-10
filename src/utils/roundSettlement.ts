import { activeRoundPlayers, type RoundContext, type RoundPlayerLike } from "@/utils/roundPlayers";

/**
 * When a round's pot is allowed to settle.
 *
 * A PUBLIC room is played through: everyone is in the app, answering now,
 * and the results screen names a winner while they are all still looking at
 * it. It used to settle the moment the FIRST player's round ended — and
 * that player arrived at the results with a scoreboard of one, so the pot
 * was ranked on whoever answered fastest while the others were still on
 * question four. Now it waits for every seat that can still answer, like a
 * private round does, with a much shorter deadline: a public round is
 * minutes long, so the wait for a player who closed the app is too.
 *
 * A PRIVATE room is not that. It is invited friends playing "at different
 * times" — one on the bus, one after dinner — and settling on the first
 * player to finish would rank a full room against one score and pay out on
 * it (owner: "private rooms can be played in different times and when all
 * invited players play the round we give rewards after that").
 *
 * So a private round waits for everyone who can still answer. `settle` is
 * held, nobody is charged a stake, and the early finishers see the scores so
 * far with a line saying the rewards come when everyone has played.
 *
 * The wait cannot be unbounded — somebody always forgets — so a deadline
 * ends it and the round settles with whoever actually played. There is no
 * job watching the clock; like the room-retirement rule (migration
 * 20261013100000), it holds at READ time: the next device to open the
 * results screen after the deadline is the one that settles. Nothing is lost
 * while nobody looks, because the stakes are collected by the settlement
 * itself — an unsettled round has taken no money from anyone.
 */

/**
 * How long a private round waits for the players who have not got to it.
 *
 * A day: long enough for "after work", short enough that a round cannot be
 * still open when the people in it have forgotten they were playing.
 */
export const PRIVATE_ROUND_DEADLINE_MS = 24 * 60 * 60 * 1000;

/**
 * How long a public round waits for a seat that went quiet.
 *
 * A public round is a few minutes of questions played together; a player
 * whose app went to sleep mid-round is out of it after this, and the table
 * settles with whoever played. Long enough for a slow last question and a
 * phone call, short enough that nobody stares at "waiting" for an evening.
 */
export const PUBLIC_ROUND_DEADLINE_MS = 15 * 60 * 1000;

/**
 * Has this seat played the round out?
 *
 * Two ways to have finished, because the two are written at different
 * moments: `status` flips when the player leaves the last question, and
 * `current_question` passes the count as they answer it. A player whose
 * status update was lost still counts as done on the question index.
 */
export function hasFinishedRound(p: RoundPlayerLike, totalQuestions: number | null | undefined): boolean {
  if (p.status === "finished") return true;
  const answered = p.current_question ?? 0;
  return totalQuestions != null && totalQuestions > 0 && answered >= totalQuestions;
}

/** Everyone who can still answer has answered. */
export function allRoundPlayersFinished(
  participants: readonly RoundPlayerLike[],
  ctx: RoundContext,
  totalQuestions: number | null | undefined,
): boolean {
  return activeRoundPlayers(participants, ctx).every((p) => hasFinishedRound(p, totalQuestions));
}

/**
 * The wait has run out.
 *
 * Absolute, so a device whose clock is hours fast cannot settle a round that
 * started ten minutes ago — the same reasoning as isFreshOwnRoom's window.
 * An unparseable or missing start time is NOT a passed deadline: a round
 * that cannot say when it began should wait for its players, not pay out on
 * a bad read.
 */
export function roundDeadlinePassed(
  startedAt: string | null | undefined,
  now: number = Date.now(),
  deadlineMs: number = PRIVATE_ROUND_DEADLINE_MS,
): boolean {
  const at = startedAt ? Date.parse(startedAt) : NaN;
  if (!Number.isFinite(at)) return false;
  return now - at > deadlineMs;
}

export type SettleHold = "ready" | "waiting_for_players";

export interface SettleTimingInput {
  /** A published room waits minutes for its players; a private one, a day. */
  isPublic: boolean;
  participants: readonly RoundPlayerLike[];
  ctx: RoundContext;
  totalQuestions: number | null | undefined;
  /** `game_rooms.started_at` — written by every path that begins a round. */
  startedAt: string | null | undefined;
  now?: number;
}

/**
 * May this device settle the round now, and if not, why it is holding.
 *
 * One answer for the whole chain — the round snapshot, the stats and the pot
 * are settled together or not at all, so anything that gates one has to gate
 * all three.
 */
export function roundSettleTiming(input: SettleTimingInput): SettleHold {
  const { isPublic, participants, ctx, totalQuestions, startedAt, now } = input;
  if (allRoundPlayersFinished(participants, ctx, totalQuestions)) return "ready";
  const deadline = isPublic ? PUBLIC_ROUND_DEADLINE_MS : PRIVATE_ROUND_DEADLINE_MS;
  if (roundDeadlinePassed(startedAt, now, deadline)) return "ready";
  return "waiting_for_players";
}

/** Seats the round is still waiting on, for the line that says so. */
export function playersStillOut(
  participants: readonly RoundPlayerLike[],
  ctx: RoundContext,
  totalQuestions: number | null | undefined,
): RoundPlayerLike[] {
  return activeRoundPlayers(participants, ctx).filter((p) => !hasFinishedRound(p, totalQuestions));
}
