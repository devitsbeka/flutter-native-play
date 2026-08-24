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
 *
 * A room somebody has invited you to is pinned above even that. An invitation
 * is the one entry in this list that another person put there on purpose, and
 * it is worthless where it lands by default — invites tend to arrive for old
 * rooms, whose recency is months stale, so the room you were just asked into
 * sorted below every room you happened to open yesterday.
 */
export interface OrderableRoom {
  created_at?: string | null;
  last_activity_at?: string | null;
  hasLiveTV?: boolean;
  hasPendingInvite?: boolean;
}

export function roomRecency(room: OrderableRoom): number {
  const created = new Date(room.created_at || 0).getTime();
  const active = new Date(room.last_activity_at || room.created_at || 0).getTime();
  return Math.max(Number.isNaN(created) ? 0 : created, Number.isNaN(active) ? 0 : active);
}

export function compareRooms(a: OrderableRoom, b: OrderableRoom): number {
  if (!!a.hasPendingInvite !== !!b.hasPendingInvite) return a.hasPendingInvite ? -1 : 1;
  if (!!a.hasLiveTV !== !!b.hasLiveTV) return a.hasLiveTV ? -1 : 1;
  return roomRecency(b) - roomRecency(a);
}
