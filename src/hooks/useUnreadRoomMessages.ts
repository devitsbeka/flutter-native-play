import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UnreadCounts {
  [roomId: string]: number;
}

export function useUnreadRoomMessages() {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) {
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    try {
      // Get user's room participations with last_read_at
      const { data: participations, error: partError } = await supabase
        .from("room_participants")
        .select("room_id, last_read_at")
        .eq("user_id", user.id);

      if (partError) throw partError;
      if (!participations || participations.length === 0) {
        if (isMountedRef.current) {
          setUnreadCounts({});
          setLoading(false);
        }
        return;
      }

      // Build rooms array for RPC call - single query instead of N queries
      const roomsParam = (participations as unknown as { room_id: string; last_read_at: string | null }[]).map(p => ({
        room_id: p.room_id,
        last_read_at: p.last_read_at || new Date(0).toISOString()
      }));

      // Single RPC call to get all unread counts
      const { data: unreadData, error: rpcError } = await supabase
        .rpc('get_unread_counts_by_room', {
          p_user_id: user.id,
          p_rooms: roomsParam
        });

      if (rpcError) throw rpcError;

      // Map results to counts object
      const counts: UnreadCounts = {};
      if (unreadData) {
        for (const row of unreadData as { room_id: string; unread_count: number }[]) {
          counts[row.room_id] = row.unread_count;
        }
      }

      if (isMountedRef.current) {
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchUnreadCounts();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchUnreadCounts]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_chat_messages",
        },
        (payload) => {
          const newMessage = payload.new as { room_id: string; user_id: string };
          // Only increment if it's not our own message
          if (newMessage.user_id !== user.id) {
            setUnreadCounts((prev) => ({
              ...prev,
              [newMessage.room_id]: (prev[newMessage.room_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

        // Clear unread count for this room
        setUnreadCounts((prev) => ({
          ...prev,
          [roomId]: 0,
        }));
      } catch (error) {
        console.error("Error marking room as read:", error);
      }
    },
    [user]
  );

  const markAllRoomsAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const roomIds = Object.keys(unreadCounts).filter(id => unreadCounts[id] > 0);
      if (roomIds.length === 0) return;

      const { error } = await supabase
        .from("room_participants")
        .update({ last_read_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .in("room_id", roomIds);

      if (error) throw error;

      // Clear all unread counts
      setUnreadCounts({});
    } catch (error) {
      console.error("Error marking all rooms as read:", error);
    }
  }, [user, unreadCounts]);

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return {
    unreadCounts,
    totalUnread,
    loading,
    markRoomAsRead,
    markAllRoomsAsRead,
    refreshUnreadCounts: fetchUnreadCounts,
  };
}
