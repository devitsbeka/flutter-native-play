import { supabase } from "@/integrations/supabase/client";

/**
 * Seat people in a room as invited, and tell them about it.
 *
 * Both halves of "invite" in one place: the `room_participants` row, whose
 * insert rings the in-app bell through the `notify_room_invite` trigger, and
 * the `game_invitations` row that carries the push. They were written out
 * twice — once in the invite sheet, once nowhere else — and the second caller
 * this function now has (a draft room's queued invitations, flushed when the
 * host presses Create) would have been a third copy of a two-table write
 * whose halves must not drift.
 *
 * Already-seated people are skipped rather than re-invited: a second row for
 * the same person is a second notification for an invitation they already
 * have.
 *
 * The push is fire-and-forget and never fatal. `send-game-invite-push`
 * re-reads the invitation server-side and composes its own words, so nothing
 * from this side reaches a lock screen.
 */
export async function inviteUsersToRoom(opts: {
  roomId: string;
  userIds: string[];
  /** The host, for the game_invitations rows. Omitted, no push is sent. */
  senderId?: string | null;
  /**
   * How many people were actually invited, once that is known. The mission
   * counter lives on a hook (`useMissions`), which a plain function cannot
   * call, so the caller hands it down.
   */
  onInvited?: (count: number) => void;
}): Promise<{ invited: string[] }> {
  const { roomId, userIds, senderId, onInvited } = opts;
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return { invited: [] };

  const { data: existing } = await supabase
    .from("room_participants")
    .select("user_id")
    .eq("room_id", roomId)
    .in("user_id", ids);
  const already = new Set((existing ?? []).map((r) => r.user_id));
  const toInvite = ids.filter((id) => !already.has(id));
  if (toInvite.length === 0) return { invited: [] };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, nickname, avatar_url, country_code")
    .in("user_id", toInvite);
  const prof = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const { error } = await supabase.from("room_participants").insert(
    toInvite.map((id) => ({
      room_id: roomId,
      user_id: id,
      status: "invited" as const,
      nickname: prof.get(id)?.nickname || "Player",
      avatar_url: prof.get(id)?.avatar_url,
      country_code: prof.get(id)?.country_code || "GE",
      is_host: false,
    })),
  );
  if (error) throw error;

  // "მოიწვიე მეგობარი თამაშში" — every one of these is that.
  onInvited?.(toInvite.length);

  if (senderId) {
    void (async () => {
      const { data: invRows } = await supabase
        .from("game_invitations")
        .insert(toInvite.map((id) => ({ sender_id: senderId, receiver_id: id, room_id: roomId })))
        .select("id");
      for (const row of invRows ?? []) {
        void supabase.functions
          .invoke("send-game-invite-push", { body: { invitationId: row.id } })
          .catch((e) => console.warn("[invite] push failed:", e));
      }
    })().catch((e) => console.warn("[invite] push failed:", e));
  }

  return { invited: toInvite };
}
