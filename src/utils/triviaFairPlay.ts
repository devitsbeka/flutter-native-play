/**
 * Whether the owner of a trivia can still play it as a game.
 *
 * A trivia is only a fair contest for the person who owns it while they have
 * not seen the answers. Three things end that, and the app kept disagreeing
 * with itself about which counted:
 *
 *  - it was never blind to begin with — they wrote or reviewed the questions
 *    when they made it;
 *  - they have already played it once;
 *  - they opened it in the editor, which lists every question beside its
 *    correct answer. That one used to leave `is_blind` set, so a trivia the
 *    owner had just read through still offered them "play".
 *
 * The room picker had this right (it greys out anything not blind or already
 * played) while the card offered "play" on the same trivia. One function now,
 * so the two cannot drift again.
 */

export interface TriviaFairPlayFields {
  is_blind?: boolean | null;
  plays_count?: number | null;
}

/** True once the owner knows what is in it — offer a challenge, not a game. */
export function ownerHasSeenTrivia(trivia: TriviaFairPlayFields | null | undefined): boolean {
  if (!trivia) return false;
  return !trivia.is_blind || (trivia.plays_count || 0) > 0;
}

/** The inverse, for the places that ask the question the other way round. */
export function ownerCanPlayTrivia(trivia: TriviaFairPlayFields | null | undefined): boolean {
  return !!trivia && !ownerHasSeenTrivia(trivia);
}
