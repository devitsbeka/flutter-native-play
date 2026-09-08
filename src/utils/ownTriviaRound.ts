/**
 * A round built on one of the player's own trivias.
 *
 * Two things follow from a round being the player's own writing rather than
 * a category out of the library, and both were missing.
 *
 * ## It has a face
 *
 * A queued round carries the icon of the category behind it, and a category
 * is where that icon comes from — so a round picked from My Trivias was
 * queued with no `icon_slug` at all (CategoryPickerModal only sets one for
 * `source_type: "category"`). Every screen then fell back to its own
 * placeholder: a red question mark on the lobby's round chip, a mystery box
 * in the round list. The owner's note is that there was nothing to choose
 * here in the first place — "my trivia party don't need icon, it has one".
 * It does, and this is it: the same face the create menu and the trivia
 * lists already give it.
 *
 * ## It is not public
 *
 * A trivia the player wrote is theirs. The room that plays it is for the
 * friends they invite, or for nobody at all — so the lobby's Visibility and
 * Joining rows are not choices it has (owner: "trivias created by me or my
 * trivia parties are private... host invites friends to join or plays
 * solo"). {@link roundIsOwnTrivia} is what those screens ask.
 */

/**
 * The MyTrivia Party face, as a slug in the icon catalogue.
 *
 * It was "group-of-people", which is also what the Family PRO plan and
 * the invite-a-friend benefits wear — so the party had no face of its
 * own, it borrowed one (owner: "i noticed we use my trivia party icon as
 * friends pro icon, so we need to replace my trivia party icon"). The
 * catalogue already had the right one, filed under Events and titled
 * "House Party".
 */
export const OWN_TRIVIA_ICON_SLUG = "house-party";

/** The `source_type` a round picked from My Trivias is stored with. */
export const OWN_TRIVIA_SOURCE = "user_trivia";

export interface RoundLike {
  source_type?: string | null;
  icon_slug?: string | null;
  user_trivia_id?: string | null;
}

/** Is this round one of the player's own trivias? */
export function roundIsOwnTrivia(round: RoundLike | null | undefined): boolean {
  if (!round) return false;
  return round.source_type === OWN_TRIVIA_SOURCE || !!round.user_trivia_id;
}

/**
 * The icon a round should wear: its own when it has one, the MyTrivia face
 * when it is the player's own writing, and nothing when neither — so the
 * caller's placeholder still stands for a round that genuinely has no icon.
 *
 * Rounds queued before this existed carry no `icon_slug`, so the fallback
 * has to be resolved on the way out rather than only written on the way in.
 */
export function roundIconSlug(round: RoundLike | null | undefined): string | undefined {
  if (!round) return undefined;
  if (round.icon_slug) return round.icon_slug;
  return roundIsOwnTrivia(round) ? OWN_TRIVIA_ICON_SLUG : undefined;
}

/**
 * Does this room's lobby hide its Visibility and Joining rows?
 *
 * A room CREATED from a trivia is private by construction — `canPublish` in
 * the create screen has never included My Trivia, so `publishRoom` is false
 * on that path — and its rows go outright.
 *
 * A trivia merely QUEUED into a room only hides them while the room is
 * private. Hiding them on a public room would leave the host on the public
 * list with the switch taken away, which is worse than the row.
 */
export function roomPlaysOwnTrivia(
  room: { user_trivia_id?: string | null } | null | undefined,
  isPublic: boolean,
  queue: readonly RoundLike[] = [],
): boolean {
  if (room?.user_trivia_id) return true;
  return !isPublic && queue.some(roundIsOwnTrivia);
}
