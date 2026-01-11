import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MyRoom } from "@/hooks/useMyRooms";
import { Friend } from "@/hooks/useFriends";

export interface ConversationPreview {
  id: string;
  type: "room" | "friend";
  name: string;
  avatarUrl?: string | null;
  roomIcon?: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: number;
  unreadCount: number;
  isOnline?: boolean;
  roomParticipantCount?: number;
  // Keep original data for navigation
  room?: MyRoom;
  friend?: Friend;
}

interface LastMessage {
  message: string;
  created_at: string;
}

export function useConversationPreviews(
  rooms: MyRoom[],
  friends: Friend[],
  roomUnreadCounts: Record<string, number>,
  friendUnreadCounts: Record<string, number>
) {
  const { user } = useAuth();
  const [roomLastMessages, setRoomLastMessages] = useState<Record<string, LastMessage>>({});
  const [friendLastMessages, setFriendLastMessages] = useState<Record<string, LastMessage>>({});
  const [loading, setLoading] = useState(true);

  const fetchLastMessages = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch last messages for rooms
      if (rooms.length > 0) {
        const roomIds = rooms.map(r => r.id);
        
        // Get the latest message for each room using a subquery approach
        const { data: roomMessages } = await supabase
          .from("room_chat_messages")
          .select("room_id, message, created_at")
          .in("room_id", roomIds)
          .order("created_at", { ascending: false });

        if (roomMessages) {
          const lastByRoom: Record<string, LastMessage> = {};
          roomMessages.forEach(msg => {
            if (!lastByRoom[msg.room_id]) {
              lastByRoom[msg.room_id] = {
                message: msg.message,
                created_at: msg.created_at,
              };
            }
          });
          setRoomLastMessages(lastByRoom);
        }
      }

      // Fetch last messages for friends
      if (friends.length > 0) {
        const friendIds = friends.map(f => f.friendId);
        
        const { data: chatMessages } = await supabase
          .from("chat_messages")
          .select("sender_id, receiver_id, message, created_at")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (chatMessages) {
          const lastByFriend: Record<string, LastMessage> = {};
          chatMessages.forEach(msg => {
            const friendId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            if (friendIds.includes(friendId) && !lastByFriend[friendId]) {
              lastByFriend[friendId] = {
                message: msg.message,
                created_at: msg.created_at,
              };
            }
          });
          setFriendLastMessages(lastByFriend);
        }
      }
    } catch (error) {
      console.error("Error fetching last messages:", error);
    } finally {
      setLoading(false);
    }
  }, [user, rooms, friends]);

  useEffect(() => {
    fetchLastMessages();
  }, [fetchLastMessages]);

  // Subscribe to realtime updates for new messages
  useEffect(() => {
    if (!user) return;

    const roomChannel = supabase
      .channel("conversation-room-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as { room_id: string; message: string; created_at: string };
          setRoomLastMessages(prev => ({
            ...prev,
            [newMsg.room_id]: {
              message: newMsg.message,
              created_at: newMsg.created_at,
            },
          }));
        }
      )
      .subscribe();

    const chatChannel = supabase
      .channel("conversation-chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string; receiver_id: string; message: string; created_at: string };
          const friendId = newMsg.sender_id === user.id ? newMsg.receiver_id : newMsg.sender_id;
          setFriendLastMessages(prev => ({
            ...prev,
            [friendId]: {
              message: newMsg.message,
              created_at: newMsg.created_at,
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [user]);

  // Build conversation previews
  const conversations: ConversationPreview[] = [
    // Map rooms to conversations
    ...rooms.map((room): ConversationPreview => {
      const lastMsg = roomLastMessages[room.id];
      return {
        id: room.id,
        type: "room",
        name: room.room_name || room.category_name || "თამაშის ოთახი",
        avatarUrl: null,
        roomIcon: room.room_icon,
        lastMessage: lastMsg?.message,
        lastMessageTime: lastMsg ? formatRelativeTime(lastMsg.created_at) : undefined,
        lastMessageTimestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
        unreadCount: roomUnreadCounts[room.id] || 0,
        roomParticipantCount: room.participants.length,
        room,
      };
    }),
    // Map friends to conversations
    ...friends.map((friend): ConversationPreview => {
      const lastMsg = friendLastMessages[friend.friendId];
      return {
        id: friend.friendId,
        type: "friend",
        name: friend.nickname,
        avatarUrl: friend.avatarUrl,
        lastMessage: lastMsg?.message,
        lastMessageTime: lastMsg ? formatRelativeTime(lastMsg.created_at) : undefined,
        lastMessageTimestamp: lastMsg ? new Date(lastMsg.created_at).getTime() : 0,
        unreadCount: friendUnreadCounts[friend.friendId] || 0,
        isOnline: friend.isOnline,
        friend,
      };
    }),
  ].sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));

  return {
    conversations,
    loading,
    refresh: fetchLastMessages,
  };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "ახლა";
  if (diffMins < 60) return `${diffMins} წთ`;
  if (diffHours < 24) return date.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "გუშინ";
  if (diffDays < 7) return date.toLocaleDateString("ka-GE", { weekday: "short" });
  return date.toLocaleDateString("ka-GE", { day: "numeric", month: "short" });
}
