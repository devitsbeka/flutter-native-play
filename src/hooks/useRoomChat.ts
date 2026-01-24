import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RoomChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  message: string;
  created_at: string;
}

export function useRoomChat(roomId: string | null) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!roomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("room_chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages((data as RoomChatMessage[]) || []);
    } catch (error) {
      console.error("Error fetching room messages:", error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-chat-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as RoomChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!roomId || !user || !profile || !text.trim()) return false;

      try {
        const { error } = await supabase.from("room_chat_messages").insert({
          room_id: roomId,
          user_id: user.id,
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
          message: text.trim(),
        });

        if (error) throw error;
        return true;
      } catch (error) {
        console.error("Error sending message:", error);
        return false;
      }
    },
    [roomId, user, profile]
  );

  return {
    messages,
    loading,
    sendMessage,
  };
}
