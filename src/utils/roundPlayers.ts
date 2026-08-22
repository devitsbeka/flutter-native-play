/**
 * Who a round is actually waiting on.
 *
 * Anything that waits for "all players" has to agree on who those are, and
 * getting it wrong hangs the round rather than failing visibly. Two seats
 * are in room_participants but cannot answer anything:
 *
 *   invited       a seat reserved for someone who never arrived. Its
 *                 current_question sits at 0 for the whole game.
 *   disconnected  someone who left mid-round. Theirs stops wherever they
 *                 stopped.
 *
 * The observer host is excluded too — they are watching, not answering, so a
 * check that includes them waits for a player who never will.
 *
 * MultiplayerContextV2 learned this the hard way and carries the note in its
 * own filter: "Skip players who left mid-round - waiting on them blocks
 * completion forever". The observer screen had no equivalent, so a single
 * invited seat or one player closing the app left the observer pinned on
 * question one while everybody else played the round out. The rule lives
 * here now so the two cannot drift apart again.
 */
export interface RoundPlayerLike {
  user_id: string;
  status?: string | null;
  current_question?: number | null;
}

export interface RoundContext {
  /** The host is watching rather than playing. */
  hostIsObserver?: boolean | null;
  hostUserId?: string | null;
  /** Exclude this user as well — the observer excluding themselves. */
  excludeUserId?: string | null;
}

/** A seat that can still answer the question on screen. */
export function isActiveRoundPlayer(p: RoundPlayerLike, ctx: RoundContext = {}): boolean {
  if (ctx.excludeUserId && p.user_id === ctx.excludeUserId) return false;
  if (ctx.hostIsObserver && ctx.hostUserId && p.user_id === ctx.hostUserId) return false;
  if (p.status === "disconnected") return false;
  if (p.status === "invited") return false;
  return true;
}

export function activeRoundPlayers<T extends RoundPlayerLike>(
  participants: readonly T[],
  ctx: RoundContext = {}
): T[] {
  return participants.filter((p) => isActiveRoundPlayer(p, ctx));
}

/**
 * Have all the players still in the round moved past this question?
 *
 * False when nobody is left, which is the case that matters: `[].every()` is
 * true, so an emptied room would otherwise read as "everyone advanced" and
 * march the observer through the rest of the questions on its own.
 */
export function allActivePlayersPast(
  participants: readonly RoundPlayerLike[],
  questionIndex: number,
  ctx: RoundContext = {}
): boolean {
  const active = activeRoundPlayers(participants, ctx);
  if (active.length === 0) return false;
  return active.every((p) => (p.current_question || 0) > questionIndex);
}
