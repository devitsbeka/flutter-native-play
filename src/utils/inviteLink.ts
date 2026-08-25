/**
 * What a shared invite link is FOR, written into the link itself.
 *
 * Every share button in the app sends the same personal link — /i/<code>,
 * sixteen characters only its owner can mint — and until now that link said
 * nothing about why it was sent. The destination was worked out entirely at
 * the far end, by invite_preview, as "the most recent waiting room the sender
 * is a participant of".
 *
 * That rule is right for exactly one of the three screens that send it.
 *
 *   - Pressing "+" on the friends strip is a FRIEND REQUEST. There is no room
 *     in sight and none was offered. But the sender is usually still sitting
 *     in some lobby they opened days ago and never closed, so the link went
 *     out as an invitation to that: a room the sender had forgotten, with
 *     other people's names on it, sent to someone who was only being added as
 *     a friend.
 *   - Inviting from a lobby means THIS lobby, the one on screen. Resolving it
 *     again at the far end can land on a different room — any other waiting
 *     room the sender is in that has been touched more recently wins.
 *   - Only Create Room genuinely needs the late lookup, because the room does
 *     not exist yet when the link is shared. That case keeps it.
 *
 * So the intent travels with the link. One extra query parameter, chosen when
 * the link is created — when we still know what the person meant.
 */

/** Friend request only: never offer a room, whatever the sender is in. */
const FRIEND_ONLY_PARAM = "f";
/** This exact room, by its six-character code. */
const ROOM_PARAM = "r";

export type InviteIntent =
  /** The friends strip: add me, that is all. */
  | { kind: "friend" }
  /** A lobby: this room, named here rather than guessed later. */
  | { kind: "room"; roomCode: string }
  /**
   * Create Room: there is no room yet, so the far end resolves whatever the
   * sender is in when the link is OPENED. The one case the late lookup is for.
   */
  | { kind: "pending" };

/** The link to send, given a personal invite code and what it is for. */
export function inviteLinkPath(code: string, intent: InviteIntent): string {
  const base = `/i/${code}`;
  if (intent.kind === "friend") return `${base}?${FRIEND_ONLY_PARAM}=1`;
  if (intent.kind === "room") {
    return `${base}?${ROOM_PARAM}=${encodeURIComponent(intent.roomCode)}`;
  }
  return base;
}

/**
 * Reading it back at the far end.
 *
 * Takes the query string rather than a URLSearchParams so the caller can pass
 * `location.search` straight in, and so this is testable without a DOM.
 *
 * An unrecognised or absent parameter means "pending", which is what every
 * link sent before this existed carries — those keep working exactly as they
 * did.
 */
export function readInviteIntent(search: string | URLSearchParams): InviteIntent {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  if (params.get(FRIEND_ONLY_PARAM) === "1") return { kind: "friend" };
  const roomCode = params.get(ROOM_PARAM)?.trim();
  if (roomCode) return { kind: "room", roomCode };
  return { kind: "pending" };
}

/**
 * How long a waiting room stays worth offering to someone who was not told
 * about it.
 *
 * Only the "pending" links reach this: the sender named no room, so the far
 * end picks one, and the pick is only as good as its freshness. A lobby left
 * open on Tuesday is still `status = 'waiting'` and still un-archived on
 * Friday — it is a real row, and it is not what anyone is being invited to.
 *
 * Three hours is longer than any session of this game and shorter than
 * "yesterday". A link shared from Create Room is opened within minutes in the
 * case it exists for; past this, the friendship is the honest outcome and the
 * screen offers that instead of a stranger's abandoned lobby.
 */
export const STALE_ROOM_AFTER_MS = 3 * 60 * 60 * 1000;

/**
 * Whether a resolved-at-open-time room is recent enough to offer.
 *
 * `now` is a parameter so this is a pure function; the caller passes
 * Date.now().
 */
export function roomIsFreshEnoughToOffer(
  lastActivityAt: string | null | undefined,
  createdAt: string | null | undefined,
  now: number,
): boolean {
  const when = lastActivityAt || createdAt;
  // Nothing to judge it by. The room row exists and invite_preview already
  // held it to `waiting` and not archived, so this errs towards offering it
  // rather than hiding a room that is genuinely open.
  if (!when) return true;
  const at = new Date(when).getTime();
  if (Number.isNaN(at)) return true;
  return now - at <= STALE_ROOM_AFTER_MS;
}
