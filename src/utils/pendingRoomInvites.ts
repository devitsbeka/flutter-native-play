import { supabase } from "@/integrations/supabase/client";
import { markNotificationActioned } from "@/utils/notificationActions";
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
  /** The newest of the invite's notifications — the one the card names. */
  notificationId: string;
  /**
   * EVERY unread invite for this room. A host who taps "invite" twice, or
   * "invite back" from a player's row, writes a fresh room_invite each
   * time — and answering one of them left the next still unread, so the
   * card went on asking however many times it was answered (owner: "i
   * can't click cancel and when i click confirm sometimes i still see it,
   * feels like it never disappears"). An answer is to the room, so it is
   * given to all of them.
   */
  notificationIds: string[];
}

interface InviteNotification {
  id: string;
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
    if (!data?.room_id) continue;
    const known = byRoom.get(data.room_id);
    if (known) {
      known.notificationIds.push(n.id);
    } else {
      byRoom.set(data.room_id, {
        nickname: data.sender_nickname ?? null,
        avatar_url: data.sender_avatar ?? null,
        notificationId: n.id,
        notificationIds: [n.id],
      });
    }
  }
  return byRoom;
}

/**
 * Yes, from the card.
 *
 * Confirm used to only open the room, and nothing marked the invite's
 * notification read — so the card still said Confirm, in green, after the
 * seat had been taken and the room played (owner: "when i confirm once on
 * room invitation and i enter the room, do not show confirm button again,
 * i should be in a room after confirmation"). Answering it is what
 * retires the invite everywhere: the badge, the grey face, the button.
 * Fire-and-forget: the seat is already the player's, and the tap that
 * takes them into the room must not wait on a bookkeeping write.
 */
export function acceptRoomInvite(notificationIds: readonly string[]): void {
  for (const id of notificationIds) {
    void markNotificationActioned(id, "accepted").catch((error) => {
      console.error("[pendingRoomInvites] accept failed:", error);
    });
  }
}

/**
 * No, from the card.
 *
 * The seat the host reserved is given up — a seat that stays at the table
 * is staked when a round settles — and the invite's notification is marked
 * declined, which is what takes the grey face and the buttons off the card.
 */
export async function declineRoomInvite(roomId: string, userId: string, notificationIds: readonly string[]): Promise<void> {
  // Three rows, none of which depends on another: written together rather
  // than one round trip after the next. Four in a row was a second or two
  // of nothing happening after the tap, which read as a button that did
  // not work (owner: "i can't click cancel").
  await Promise.all([
    supabase.from("room_participants").delete().eq("room_id", roomId).eq("user_id", userId),
    // An ask of the player's own on the same room goes with it. A player
    // who knocked and was then invited held both, and the card drew a
    // cross for each; "no" to the invite is "no" to the room, and leaving
    // the ask pending kept the card waiting on a host who had already
    // answered.
    supabase.from("room_join_requests").delete().eq("room_id", roomId).eq("user_id", userId).eq("status", "pending"),
    // The invitation row as well: it is what lets an invitee past an "Ask
    // me" door and what the global invite modal lists as pending. Left
    // "pending", a declined invite still opened the door and could be
    // raised again.
    supabase
      .from("game_invitations")
      .update({ status: "declined" })
      .eq("room_id", roomId)
      .eq("receiver_id", userId)
      .eq("status", "pending"),
  ]);
  await Promise.all(notificationIds.map((id) => markNotificationActioned(id, "declined")));
}
