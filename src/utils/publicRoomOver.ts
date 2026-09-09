import { isRoomStale } from "@/utils/roomStale";

/**
 * Is a public room OVER — played, and an hour past anyone coming back?
 *
 * A public room is made for one play: a match of one round or many, then
 * only as many rematches as the table accepts (owner: "hosts are creating
 * public rooms for one play ... after all ends room should be deleted").
 * This is the client's copy of `public_room_is_over` in
 * 20261102130000_public_rooms_end.sql, and the two must agree: the database
 * closes such rooms when the Public tab is read, and the client uses the
 * same rule to keep them off the host's own list in the meantime, and to
 * close one it is asked into rather than revive it.
 *
 * Over means public, not already closed, quiet for an hour by every stamp
 * the row carries (`isRoomStale`), and either mid-round or finished — or
 * back in `waiting` with nothing to play after having been played, which
 * is what a rematch nobody took looks like. A waiting room with a category,
 * a trivia or a queue is the next game and stays. A private room is never
 * over.
 *
 * Whether rounds are queued is not on the room row. A caller that does not
 * know passes nothing, and the waiting case is then left alone: a wrong
 * "over" closes somebody's next game, a wrong "not over" is a room the
 * sweep takes on the next read.
 */
export interface PublicRoomOverInput {
  is_public?: boolean | null;
  status: string;
  created_at: string | null;
  last_activity_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  category_id?: string | null;
  user_trivia_id?: string | null;
  /** Rounds queued behind the room's own — undefined when unknown. */
  has_queue?: boolean;
}

const PLAYED_MS = 60_000;

export function isPublicRoomOver(room: PublicRoomOverInput, now: number = Date.now()): boolean {
  if (!room.is_public) return false;
  if (room.status === "cancelled") return false;
  if (!room.created_at) return false;
  if (!isRoomStale({ ...room, created_at: room.created_at }, now)) return false;
  if (room.status === "playing" || room.status === "completed") return true;
  if (room.status !== "waiting") return false;
  if (room.has_queue !== false) return false;
  if (room.category_id || room.user_trivia_id) return false;
  const born = Date.parse(room.created_at);
  const touched = room.last_activity_at ? Date.parse(room.last_activity_at) : NaN;
  if (Number.isNaN(born) || Number.isNaN(touched)) return false;
  return touched - born > PLAYED_MS;
}
