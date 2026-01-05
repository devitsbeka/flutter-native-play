import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UnreadCounts {
  [roomId: string]: number;
}

export function useUnreadRoomMessages() {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [loading, setLoading] = useState(true);

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
        setUnreadCounts({});
        setLoading(false);
        return;
      }

      // Count unread messages for each room
      const counts: UnreadCounts = {};
      
      for (const participation of participations as unknown as { room_id: string; last_read_at: string | null }[]) {
        const lastReadAt = participation.last_read_at || new Date(0).toISOString();
        
        const { count, error: countError } = await supabase
          .from("room_chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", participation.room_id)
          .gt("created_at", lastReadAt)
          .neq("user_id", user.id); // Don't count own messages

        if (!countError && count !== null) {
          counts[participation.room_id] = count;
        }
      }

      setUnreadCounts(counts);
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCounts();
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

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return {
    unreadCounts,
    totalUnread,
    loading,
    markRoomAsRead,
    refreshUnreadCounts: fetchUnreadCounts,
  };
}
