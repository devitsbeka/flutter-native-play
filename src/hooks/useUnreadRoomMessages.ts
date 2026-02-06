import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UnreadCounts {
  [roomId: string]: number;
}

const QUERY_KEY = "unread-room-messages";

// ── Ref-counted singleton realtime subscription ──
let realtimeChannel: RealtimeChannel | null = null;
let subscriberCount = 0;
let currentUserId: string | null = null;

function subscribeRealtime(
  userId: string,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  subscriberCount++;
  if (realtimeChannel && currentUserId === userId) return;

  // Tear down stale channel if user changed
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  currentUserId = userId;
  realtimeChannel = supabase
    .channel("unread-room-messages-shared")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "room_chat_messages",
      },
      (payload) => {
        const msg = payload.new as { room_id: string; user_id: string };
        if (msg.user_id === userId) return;

        // Increment unread count in the shared cache
        queryClient.setQueryData<UnreadCounts>([QUERY_KEY, userId], (prev) => {
          if (!prev) return { [msg.room_id]: 1 };
          return { ...prev, [msg.room_id]: (prev[msg.room_id] || 0) + 1 };
        });
      },
    )
    .subscribe();
}

function unsubscribeRealtime() {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount === 0 && realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    currentUserId = null;
  }
}

// ── Fetch function ──
async function fetchUnreadCounts(userId: string): Promise<UnreadCounts> {
  const { data: participations, error: partError } = await supabase
    .from("room_participants")
    .select("room_id, last_read_at")
    .eq("user_id", userId);

  if (partError) throw partError;
  if (!participations || participations.length === 0) return {};

  const roomsParam = (participations as unknown as { room_id: string; last_read_at: string | null }[]).map((p) => ({
    room_id: p.room_id,
    last_read_at: p.last_read_at || new Date(0).toISOString(),
  }));

  const { data: unreadData, error: rpcError } = await supabase.rpc(
    "get_unread_counts_by_room",
    { p_user_id: userId, p_rooms: roomsParam },
  );

  if (rpcError) throw rpcError;

  const counts: UnreadCounts = {};
  if (unreadData) {
    for (const row of unreadData as { room_id: string; unread_count: number }[]) {
      counts[row.room_id] = row.unread_count;
    }
  }
  return counts;
}

// ── Hook ──
export function useUnreadRoomMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCounts = {}, isLoading: loading } = useQuery<UnreadCounts>({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: () => fetchUnreadCounts(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000, // 1 min
    gcTime: 10 * 60 * 1000,
  });

  // Manage singleton realtime subscription
  useEffect(() => {
    if (!user) return;
    subscribeRealtime(user.id, queryClient);
    return () => unsubscribeRealtime();
  }, [user, queryClient]);

  const markRoomAsRead = useCallback(
    async (roomId: string) => {
      if (!user || !roomId) return;

      try {
        const { error } = await supabase
          .from("room_participants")
          .update({ last_read_at: new Date().toISOString() } as any)
          .eq("room_id", roomId)
          .eq("user_id", user.id);

        if (error) throw error;

        // Optimistic update
        queryClient.setQueryData<UnreadCounts>([QUERY_KEY, user.id], (prev) => {
          if (!prev) return {};
          return { ...prev, [roomId]: 0 };
        });
      } catch (error) {
        console.error("Error marking room as read:", error);
      }
    },
    [user, queryClient],
  );

  const markAllRoomsAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const roomIds = Object.keys(unreadCounts).filter((id) => unreadCounts[id] > 0);
      if (roomIds.length === 0) return;

      const { error } = await supabase
        .from("room_participants")
        .update({ last_read_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .in("room_id", roomIds);

      if (error) throw error;

      // Optimistic update
      queryClient.setQueryData<UnreadCounts>([QUERY_KEY, user.id], () => ({}));
    } catch (error) {
      console.error("Error marking all rooms as read:", error);
    }
  }, [user, unreadCounts, queryClient]);

  const totalUnread = useMemo(
    () => Object.values(unreadCounts).reduce((sum, count) => sum + count, 0),
    [unreadCounts],
  );

  const refreshUnreadCounts = useCallback(
    () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] }),
    [queryClient, user?.id],
  );

  return {
    unreadCounts,
    totalUnread,
    loading,
    markRoomAsRead,
    markAllRoomsAsRead,
    refreshUnreadCounts,
  };
}
