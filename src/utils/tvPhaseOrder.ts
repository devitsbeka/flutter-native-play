/**
 * A TV round only ever moves forward, and the screen should too.
 *
 * The session's phase reaches every device through Supabase realtime, and the
 * subscription applied `phase` from every payload it received, unconditionally.
 * Realtime does not promise ordering between rapid updates, and a 1-second
 * resync poll refetches the row alongside it — so a payload written before the
 * transition could land after it. The phase went forward, then back, then
 * forward again, and the controller drew the previous screen for about a
 * second on the way past. That is the "glitch" on the round-intro and
 * game-over screens: not a transition effect, an out-of-order write.
 *
 * The rule this encodes is the one already written down inside the resync
 * poll: "within the SAME question, phases only ever move forward
 * (question -> reveal -> results)". It was used there to decide when the host
 * was BEHIND the database. The same fact decides when a payload is STALE.
 */

/**
 * Where each phase sits in a round. Unranked phases — lobby, pairing, the
 * poll screens, category-select — are deliberately absent: they are entered
 * and left in orders this rule cannot speak for, so they are never blocked.
 */
export const TV_PHASE_RANK: Record<string, number> = {
  'round-intro': 0,
  countdown: 1,
  question: 2,
  playing: 2,
  reveal: 3,
  results: 4,
  completed: 4,
};

export interface PhaseSnapshot {
  phase: string;
  roundNumber: number;
  questionIndex: number;
}

/**
 * Whether an arriving update should be allowed to set the phase.
 *
 * Two ways to be stale, and both were seen:
 *
 *   - it belongs to an earlier ROUND. Round numbers never go down in a
 *     session, so a payload from round 1 arriving after round 2 has begun is
 *     unambiguously late. This is the round-intro flash: "Round 2" drawn,
 *     then round 1's results for a beat, then "Round 2" again.
 *
 *   - it is EARLIER IN THE SAME question. reveal arriving after results, on
 *     the same round and the same question, can only be a late delivery —
 *     nothing walks a question backwards. This is the game-over flash.
 *
 * Everything else is allowed through unchanged, including every move between
 * unranked phases and every legitimate step back to the lobby: this is a
 * staleness filter, not a state machine.
 */
export function shouldApplyPhase(local: PhaseSnapshot, incoming: PhaseSnapshot): boolean {
  if (incoming.roundNumber < local.roundNumber) return false;
  if (incoming.roundNumber > local.roundNumber) return true;

  // Same round. A later question is always newer; an earlier one is a late
  // delivery from a question already finished.
  if (incoming.questionIndex < local.questionIndex) return false;
  if (incoming.questionIndex > local.questionIndex) return true;

  const localRank = TV_PHASE_RANK[local.phase];
  const incomingRank = TV_PHASE_RANK[incoming.phase];
  // One of them is a phase this rule has no opinion about — let it through.
  if (localRank === undefined || incomingRank === undefined) return true;

  return incomingRank >= localRank;
}
