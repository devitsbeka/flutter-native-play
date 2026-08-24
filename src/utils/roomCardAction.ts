import { isRoomLive } from "@/hooks/useMyRooms";

/**
 * What a room card offers the person looking at it.
 *
 *   "live"   a round is running in there right now
 *   "start"  you host it, and somebody is online to play with
 *   "enter"  somebody is online in a room you have a seat in
 *   null     nobody else is online — there is nothing to offer
 *
 * The null is the point of this. Most rooms on the list are old ones with
 * nobody in them, and a button on every card is a button that says nothing
 * about any of them. One appears when there is actually somebody to play
 * with, and which one says whose move it is: the host starts the round,
 * everyone else goes in and waits for it.
 *
 * "Online" here means online in the app, not sitting in this room. That is
 * deliberate and it is what makes the feature work: a round now reaches
 * players wherever they are — RoundStartWatcher counts them in and brings
 * them over — so a friend reading Discover is someone this room can be
 * played with, and refusing to offer the host a button until that friend
 * navigates into the lobby would be waiting for something that no longer has
 * to happen.
 */
export type RoomCardAction = "live" | "start" | "enter" | null;

export function roomCardAction(room: {
  status: string;
  tv_status: string | null;
  is_host: boolean;
  has_others_online: boolean;
}): RoomCardAction {
  // A live round outranks everything: it is the one state where a second
  // costs scoring. It also outranks "start" for the host, who cannot start a
  // round that is already running.
  if (isRoomLive(room)) return "live";
  if (!room.has_others_online) return null;
  return room.is_host ? "start" : "enter";
}
