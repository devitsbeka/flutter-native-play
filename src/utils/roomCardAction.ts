import { isRoomLive } from "@/hooks/useMyRooms";

/**
 * What a room card offers the person looking at it.
 *
 *   "live"   a round is running in there right now
 *   "start"  you host it, and somebody is online to play with
 *   "enter"  the room is yours to walk into — a seat you hold, whether or
 *            not anybody else is online right now
 *
 * There used to be a fourth answer, null: nobody else online, so no button
 * at all. It made the list quieter and it made a private room unenterable.
 * A room's host alone at their table had no way back into it — no way to
 * add a round, change the question count, or put it on the TV — because
 * the card only ever offered anything once somebody else was awake. The
 * lobby is where a room is edited, and a room you hold a seat in is one
 * you may always walk into (owner: "users should be able enter private
 * rooms and if they are host they should be able to modify room, add
 * categories, change questions count in rounds, use TV mode").
 *
 * Which word the button carries says whose move it is: the host starts a
 * round when there is somebody to play it with; everyone, host included,
 * otherwise goes in.
 *
 * "Online" here means online in the app, not sitting in this room. That is
 * deliberate and it is what makes the feature work: a round now reaches
 * players wherever they are — RoundStartWatcher counts them in and brings
 * them over — so a friend reading Discover is someone this room can be
 * played with, and refusing to offer the host a button until that friend
 * navigates into the lobby would be waiting for something that no longer has
 * to happen.
 */
export type RoomCardAction = "live" | "start" | "enter";

export function roomCardAction(room: {
  status: string;
  tv_status: string | null;
  is_host: boolean;
  has_others_online: boolean;
  /** Somebody asked this player into this room and they have not been yet. */
  has_pending_invite?: boolean;
}): RoomCardAction {
  // A live round outranks everything: it is the one state where a second
  // costs scoring. It also outranks "start" for the host, who cannot start a
  // round that is already running.
  if (isRoomLive(room)) return "live";

  // Being asked is its own reason to go in, whether or not the person who
  // asked is still at their phone. Without this the invite arrives, the
  // notification is tapped, and the card it leads to is the same silent card
  // as every other — the one place where "nobody is online" is the wrong
  // answer, because somebody wanted you there specifically.
  if (room.has_pending_invite) return "enter";

  // Nobody else online: the room is still yours to enter — the host to
  // set it up, a guest to wait at the table — just not, yet, to start.
  if (!room.has_others_online) return "enter";
  return room.is_host ? "start" : "enter";
}
