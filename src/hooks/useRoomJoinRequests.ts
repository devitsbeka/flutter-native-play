import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The people asking to come into a room you host.
 *
 * A published room is listed for everyone, so the host is the door. This
 * watches their own room's requests — the first read for anything that
 * arrived while they were elsewhere, then realtime for the rest — and hands
 * back one answer function. The row is written only by respond_room_join;
 * the table has no client write policy at all, which is what stops an asker
 * approving themselves.
 */
export interface PendingJoinRequest {
  id: string;
  room_id: string;
  user_id: string;
  created_at: string;
  nickname: string;
  avatar_url: string | null;
}

export function useRoomJoinRequests(roomId: string | null | undefined, amHost: boolean) {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingJoinRequest[]>([]);
  const active = !!roomId && amHost && !!user;

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from("room_join_requests")
      .select("id, room_id, user_id, created_at")
      .eq("room_id", roomId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error || !data || data.length === 0) {
      setPending([]);
      return;
    }
    // The request carries a user id and nothing else — a host deciding
    // whether to let someone in needs at least their face and their name.
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url")
      .in("user_id", data.map((r) => r.user_id));
    const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    setPending(
      data.map((r) => ({
        id: r.id,
        room_id: r.room_id,
        user_id: r.user_id,
        created_at: r.created_at,
        nickname: byId.get(r.user_id)?.nickname ?? "Player",
        avatar_url: byId.get(r.user_id)?.avatar_url ?? null,
      })),
    );
  }, [roomId]);

  useEffect(() => {
    if (!active) {
      setPending([]);
      return;
    }
    void load();
    const channel = supabase
      .channel(`join-requests-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_join_requests",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [active, roomId, load]);

  /**
   * Shut the door for good.
   *
   * A decline answers this one knock; some people knock again. A block
   * takes the room off their Public tab entirely, refuses a fresh ask, and
   * empties their seat if they were already in — see block_room_join.
   */
  const block = useCallback(
    async (requestId: string) => {
      setPending((list) => list.filter((r) => r.id !== requestId));
      const { error } = await supabase.rpc("block_room_join", { p_request_id: requestId });
      if (error) {
        console.error("[joinRequests] block failed", error);
        void load();
        return false;
      }
      return true;
    },
    [load],
  );

  const respond = useCallback(
    /**
     * @param team  For the arena: which side an approved player lands on.
     *              Left out everywhere else — the classic lobby and the
     *              King's couch have no sides.
     */
    async (requestId: string, approve: boolean, team?: "a" | "b") => {
      // Drop it locally first: the round-trip plus the realtime echo is long
      // enough for a second tap to land on a decision already made.
      setPending((list) => list.filter((r) => r.id !== requestId));
      const { error } = await supabase.rpc("respond_room_join", {
        p_request_id: requestId,
        p_approve: approve,
        ...(approve && team ? { p_team: team } : {}),
      });
      if (error) {
        console.error("[joinRequests] respond failed", error);
        void load();
        return false;
      }
      return true;
    },
    [load],
  );

  return { pending, respond, block, reload: load };
}
