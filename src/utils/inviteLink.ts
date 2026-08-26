/**
 * What a shared invite link is FOR, written into the link itself.
 *
 * Every share button in the app sends the same personal link — /i/<code>,
 * sixteen characters only its owner can mint — and until recently that link
 * said nothing about why it was sent. The destination was worked out entirely
 * at the far end, by invite_preview, as "the most recent waiting room the
 * sender is a participant of".
 *
 * That guess was wrong in a new way every time somebody tested it:
 *
 *   - Pressing "+" on the friends strip is a FRIEND REQUEST, and the link went
 *     out as an invitation to a lobby the sender had left open days earlier.
 *   - Inviting from a lobby means THIS lobby, and the guess could land on a
 *     different room the sender happened to touch more recently.
 *   - Sharing from Create Room, where the room does not exist yet, resolved
 *     the room the sender made two hours ago — the same trap wearing the one
 *     costume that looked legitimate.
 *
 * So a link now says what it is, chosen where we still know what the person
 * meant, and NOTHING is resolved late. A room is named or there is no room.
 */

/** Friend request: no room, ever. Also what a link with no marker means. */
const FRIEND_ONLY_PARAM = "f";
/** This exact room, by its six-character code. */
const ROOM_PARAM = "r";

export type InviteIntent =
  /**
   * Add me as a friend. The friends strip sends this, and so does Create Room
   * — where there is no room yet to name, and guessing one is what produced
   * every wrong-room report. The people picked on that screen are added to the
   * room when it is actually made, which is the path that has always worked.
   */
  | { kind: "friend" }
  /** A lobby: this room, named here rather than guessed later. */
  | { kind: "room"; roomCode: string };

/** The link to send, given a personal invite code and what it is for. */
export function inviteLinkPath(code: string, intent: InviteIntent): string {
  const base = `/i/${code}`;
  if (intent.kind === "room") {
    return `${base}?${ROOM_PARAM}=${encodeURIComponent(intent.roomCode)}`;
  }
  return `${base}?${FRIEND_ONLY_PARAM}=1`;
}

/**
 * Reading it back at the far end.
 *
 * Takes the query string rather than a URLSearchParams so the caller can pass
 * `location.search` straight in, and so this is testable without a DOM.
 *
 * A link with no marker — every link sent before any of this existed, and
 * every link a chat app has mangled past recognition — is a friend request.
 * That is the outcome those links could always still deliver, and it is never
 * the wrong room.
 */
export function readInviteIntent(search: string | URLSearchParams): InviteIntent {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const roomCode = firstWord(params.get(ROOM_PARAM));
  if (roomCode && firstWord(params.get(FRIEND_ONLY_PARAM)) !== "1") {
    return { kind: "room", roomCode };
  }
  return { kind: "friend" };
}

/**
 * The code out of the path, because links do not arrive clean.
 *
 * A share sheet hands the messaging app a title, a message and a URL as three
 * separate fields, and what the app does with them is its own business. Pick
 * "Copy" on the macOS sheet and the clipboard holds all of it run together;
 * paste that into a browser and it is one URL with %20 where the spaces were.
 * Both halves of that have now been seen in the wild:
 *
 *   /i/g6krdvgpx4zqm4n3?f=1%20მოგიწვიე%20MyTrivia-ში…   message in the query
 *   /i/g6krdvgpx4zqm4n3%20Trivia%20-%20მოდი%20ითამაშე…  message in the PATH
 *
 * The second one is worse: the code itself becomes
 * "g6krdvgpx4zqm4n3 Trivia - მოდი…", matches no row, and the person who was
 * invited is told their invitation is no longer valid.
 *
 * An invite code is sixteen characters of abcdefghjkmnpqrstuvwxyz23456789 and
 * a room code is six of ABCDEFGHJKLMNPQRSTUVWXYZ23456789. Neither can contain
 * a space or punctuation, so everything from the first one is somebody else's
 * text and is dropped.
 */
export function cleanInviteCode(code: string | undefined): string | undefined {
  const first = firstWord(code ?? null);
  const stripped = first?.replace(/[^A-Za-z0-9]/g, "");
  return stripped || undefined;
}

/** The first whitespace-delimited token, or undefined when there is none. */
function firstWord(value: string | null | undefined): string | undefined {
  const first = value?.trim().split(/\s+/)[0];
  return first || undefined;
}
