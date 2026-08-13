/**
 * How the rooms list is ordered.
 *
 * One rule: whatever happened most recently is first, and creating a room is
 * the most recent thing that can happen to one — so a room you just made is
 * always at the top and never drifts down the list while you look for it.
 *
 * A live TV session is pinned above that, and only because its row's activity
 * timestamp does not tick while the TV plays; without the pin it would sink
 * during the very session it is running.
 */
export interface OrderableRoom {
  created_at?: string | null;
  last_activity_at?: string | null;
  hasLiveTV?: boolean;
}

export function roomRecency(room: OrderableRoom): number {
  const created = new Date(room.created_at || 0).getTime();
  const active = new Date(room.last_activity_at || room.created_at || 0).getTime();
  return Math.max(Number.isNaN(created) ? 0 : created, Number.isNaN(active) ? 0 : active);
}

export function compareRooms(a: OrderableRoom, b: OrderableRoom): number {
  if (!!a.hasLiveTV !== !!b.hasLiveTV) return a.hasLiveTV ? -1 : 1;
  return roomRecency(b) - roomRecency(a);
}
