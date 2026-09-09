/**
 * Is a room stale — nothing has happened in it for an hour?
 *
 * The answer used to be read off `last_activity_at` alone, falling back to
 * the room's creation. But `last_activity_at` was only ever written when
 * the room was made (and by this reset), so a room made two hours ago and
 * being PLAYED right now counted as stale — and the next rejoin (the phone
 * slept, the webview reloaded, the player came back through the room's
 * URL) reset it to the lobby mid-round, with the category cleared (owner:
 * "when we were playing ... i was kicked out and i see lobby to choose
 * category ... if phone goes sleep, come back should be smooth, landing
 * where i was before, no kick out").
 *
 * A round that started, or finished, is activity. The reference is the
 * latest of everything the row records, and round starts now stamp
 * `last_activity_at` too, so the two agree.
 */
export const isRoomStale = (
  room: {
    last_activity_at?: string | null;
    created_at: string;
    started_at?: string | null;
    completed_at?: string | null;
  },
  now: number = Date.now(),
): boolean => {
  const oneHourAgo = now - 60 * 60 * 1000; // 1 hour in ms
  const stamps = [room.last_activity_at, room.created_at, room.started_at, room.completed_at]
    .map((t) => (t ? new Date(t).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  if (stamps.length === 0) return false;
  return Math.max(...stamps) < oneHourAgo;
};

