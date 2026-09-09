/**
 * The rooms somebody has asked this player into and not been answered yet,
 * keyed by room, with who asked.
 *
 * Read off the notifications already in memory rather than queried: the
 * context holds every notification this user has, realtime keeps it
 * current, and "pending" is exactly "its notification is still unread" — so
 * opening the room, which marks the notification read, retires the invite
 * without a second source of truth to keep in step.
 *
 * Shared by both tabs. A room you were asked into can be on either: a
 * private one lists under Private, a published one under Public (the
 * Private tab hides published rooms you do not host) — and the badge and
 * the Confirm button have to be the same wherever the room is.
 */

export interface PendingInviteFrom {
  nickname: string | null;
  avatar_url: string | null;
}

interface InviteNotification {
  type: string;
  read_at: string | null;
  data: unknown;
}

export function pendingRoomInvites(notifications: readonly InviteNotification[]): Map<string, PendingInviteFrom> {
  const byRoom = new Map<string, PendingInviteFrom>();
  for (const n of notifications) {
    if (n.type !== "room_invite" || n.read_at) continue;
    const data = n.data as {
      room_id?: string;
      sender_nickname?: string | null;
      sender_avatar?: string | null;
    } | null;
    if (data?.room_id && !byRoom.has(data.room_id)) {
      byRoom.set(data.room_id, {
        nickname: data.sender_nickname ?? null,
        avatar_url: data.sender_avatar ?? null,
      });
    }
  }
  return byRoom;
}
