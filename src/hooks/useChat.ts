import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export function useChat(friendId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch messages between current user and friend
  const fetchMessages = useCallback(async () => {
    if (!user || !friendId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, friendId]);

  // Send a message
  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!user || !friendId || !messageText.trim()) return false;

      setSending(true);
      try {
        const { error } = await supabase.from("chat_messages").insert({
          sender_id: user.id,
          receiver_id: friendId,
          message: messageText.trim(),
        });

        if (error) throw error;
        return true;
      } catch (error) {
        console.error("Error sending message:", error);
        return false;
      } finally {
        setSending(false);
      }
    },
    [user, friendId]
  );

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!user || !friendId) return;

    try {
      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", friendId)
        .eq("receiver_id", user.id)
        .is("read_at", null);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [user, friendId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user || !friendId) return;

    fetchMessages();

    // Subscribe to new messages - listen to messages TO current user FROM friend
    const channelIncoming = supabase
      .channel(`chat-incoming-${user.id}-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          // Only add if it's from this friend
          if (newMessage.sender_id === friendId) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            markAsRead();
          }
        }
      )
      .subscribe();

    // Subscribe to messages FROM current user TO friend (to show sent messages immediately)
    const channelOutgoing = supabase
      .channel(`chat-outgoing-${user.id}-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          // Only add if it's to this friend
          if (newMessage.receiver_id === friendId) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelIncoming);
      supabase.removeChannel(channelOutgoing);
    };
  }, [user, friendId, fetchMessages, markAsRead]);

  // Mark messages as read when opening chat
  useEffect(() => {
    if (friendId) {
      markAsRead();
    }
  }, [friendId, markAsRead]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
    refreshMessages: fetchMessages,
  };
}

// Hook to get unread message counts
export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCounts = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("sender_id")
          .eq("receiver_id", user.id)
          .is("read_at", null);

        if (error) throw error;

        // Count unread per sender
        const counts: Record<string, number> = {};
        data?.forEach((msg) => {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        });
        setUnreadCounts(counts);
      } catch (error) {
        console.error("Error fetching unread counts:", error);
      }
    };

    fetchUnreadCounts();

    // Subscribe to new messages
    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setUnreadCounts((prev) => ({
            ...prev,
            [newMessage.sender_id]: (prev[newMessage.sender_id] || 0) + 1,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          if (updated.read_at) {
            setUnreadCounts((prev) => {
              const newCounts = { ...prev };
              if (newCounts[updated.sender_id]) {
                newCounts[updated.sender_id] = Math.max(0, newCounts[updated.sender_id] - 1);
              }
              return newCounts;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Clear unread count for a specific friend (call after marking as read)
  const clearUnreadForFriend = (friendId: string) => {
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[friendId];
      return newCounts;
    });
  };

  return { unreadCounts, clearUnreadForFriend };
}
