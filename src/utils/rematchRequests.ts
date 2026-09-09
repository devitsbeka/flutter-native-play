import { supabase } from "@/integrations/supabase/client";
import { markNotificationActioned } from "@/utils/notificationActions";

/**
 * A rematch, asked and answered.
 *
 * A round used to roll straight into the next: the host picked a category on
 * the results screen and every other player was pulled into it by the room's
 * realtime status, whether they were still looking or not — and, since a
 * room is played for a pot now, staked for it. The owner's rule is that a new
 * game is ASKED: the host presses New Game, the room goes back to its lobby,
 * and everyone at the table is told "do you want a rematch?" with the host's
 * name on it, to accept or decline. And a PRO player who is not the host can
 * ask the same question the other way round — with their own rules: the
 * category they want, not the host's.
 *
 * It rides on the notifications table, which every signed-in user may write
 * to and which already carries a knock-on-the-door with accept/decline
 * (room_join_request). No new table, no new function: the request is a row
 * per recipient, and the answer is what the recipient does about it.
 *
 * Who may write what stays where the database put it. The ROOM is the
 * host's: only the host's accept applies a requester's category to it, and a
 * requester's own tap writes nothing but notifications.
 */

export type RematchPick = {
  source_type: "category" | "random" | "user_trivia";
  category_id?: string | null;
  category_name?: string | null;
  user_trivia_id?: string | null;
  icon_slug?: string | null;
};

/** Why the row exists: the host starting over, or a player asking to. */
export type RematchKind = "host_new_game" | "player_ask";

export interface RematchRequestData {
  kind: RematchKind;
  room_id: string;
  room_code: string;
  room_name: string | null;
  room_icon: string | null;
  host_user_id: string;
  requester_id: string;
  sender_nickname: string | null;
  sender_avatar: string | null;
  /** The category the asker wants — the room's, once the host says yes. */
  source_type: RematchPick["source_type"];
  category_id: string | null;
  category_name: string | null;
  icon_slug: string | null;
  user_trivia_id: string | null;
  /** True on the host's copy of a player's ask; the host's yes reshapes the room. */
  for_host: boolean;
  action_taken?: "accepted" | "declined";
  /**
   * What the table is being asked to play, when the ask comes from the
   * lobby's Start: the rounds in order, the question count and the stake.
   * Absent on a player's own ask, which names one pick.
   */
  rounds?: { name: string; icon_slug: string | null }[];
  questions_per_round?: number | null;
  stake?: number | null;
}

export type RematchMatch = Pick<RematchRequestData, "rounds" | "questions_per_round" | "stake">;

interface SendArgs {
  room: {
    id: string;
    room_code: string;
    room_name: string | null;
    room_icon: string | null;
    host_user_id: string;
  };
  requester: { id: string; nickname: string | null; avatar_url: string | null };
  pick: RematchPick;
  kind: RematchKind;
  /** Everyone at the table; the requester's own id is skipped. */
  recipientIds: string[];
  /** The stored title and message, in the sender's language (the card retranslates the title). */
  title: string;
  message: string;
  /** The match on the card, when the host is starting one. */
  match?: RematchMatch;
}

/** One notification per seat at the table; how many were written. */
export async function sendRematchRequest({ room, requester, pick, kind, recipientIds, title, message, match }: SendArgs): Promise<number> {
  const recipients = Array.from(new Set(recipientIds.filter((id) => id && id !== requester.id)));
  if (recipients.length === 0) return 0;

  const data: RematchRequestData = {
    kind,
    room_id: room.id,
    room_code: room.room_code,
    room_name: room.room_name,
    room_icon: room.room_icon,
    host_user_id: room.host_user_id,
    requester_id: requester.id,
    sender_nickname: requester.nickname,
    sender_avatar: requester.avatar_url,
    source_type: pick.source_type,
    category_id: pick.category_id ?? null,
    category_name: pick.category_name ?? null,
    icon_slug: pick.icon_slug ?? null,
    user_trivia_id: pick.user_trivia_id ?? null,
    for_host: false,
    ...(match ?? {}),
  };

  const rows = recipients.map((userId) => ({
    user_id: userId,
    type: "rematch_request",
    title,
    message,
    data: { ...data, for_host: userId === room.host_user_id && requester.id !== room.host_user_id },
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) throw error;
  return rows.length;
}

/**
 * Point the room at the pick and send it back to its lobby.
 *
 * Host-only by policy (game_rooms updates), so the host calls this — for
 * their own New Game, and when saying yes to a player's ask. Never over a
 * live round: another player may already be in one, and this write would
 * derail it.
 */
export async function applyRematchPick(roomId: string, pick: RematchPick): Promise<boolean> {
  const { data: fresh } = await supabase.from("game_rooms").select("status").eq("id", roomId).single();
  if (fresh?.status === "playing") return false;
  const { error } = await supabase
    .from("game_rooms")
    .update({
      status: "waiting",
      category_id: pick.source_type === "user_trivia" ? null : pick.category_id ?? null,
      category_name: pick.category_name ?? null,
      user_trivia_id: pick.source_type === "user_trivia" ? pick.user_trivia_id ?? null : null,
    })
    .eq("id", roomId);
  if (error) throw error;
  return true;
}

/**
 * The answer.
 *
 * Yes from the host to a player's ask: the room takes the player's pick and
 * goes back to its lobby. Yes from anyone: the card settles and they go to
 * the room. No from a player: their seat is given up — a seat that stays at
 * the table is STAKED when the round settles (settle_room_round counts every
 * non-invited participant), so declining and staying would mean paying for a
 * game they said no to. No from the host: nothing moves but the card.
 */
export async function answerRematchRequest(
  notification: { id: string; data: Record<string, unknown> },
  userId: string,
  accept: boolean,
): Promise<{ roomCode: string | null }> {
  const data = notification.data as unknown as RematchRequestData;
  const isHost = userId === data.host_user_id;

  if (accept) {
    if (isHost && data.requester_id !== userId) {
      await applyRematchPick(data.room_id, {
        source_type: data.source_type,
        category_id: data.category_id,
        category_name: data.category_name,
        user_trivia_id: data.user_trivia_id,
        icon_slug: data.icon_slug,
      });
    }
    await markNotificationActioned(notification.id, "accepted");
    if (!isHost) {
      // The host's table shows a tick against a seat that said yes. "ready"
      // is written on the player's own row - the one row they may write -
      // and the game's start overwrites it like every other status.
      await supabase
        .from("room_participants")
        .update({ status: "ready" })
        .eq("room_id", data.room_id)
        .eq("user_id", userId);
    }
    return { roomCode: data.room_code ?? null };
  }

  await markNotificationActioned(notification.id, "declined");
  if (!isHost) {
    await supabase.from("room_participants").delete().eq("room_id", data.room_id).eq("user_id", userId);
  }
  return { roomCode: null };
}
