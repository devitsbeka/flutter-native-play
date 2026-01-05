import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TypingUser {
  id: string;
  nickname: string;
}

export function useTypingIndicator(roomId: string | null) {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!roomId || !user || !profile) {
      setTypingUsers([]);
      return;
    }

    const channel = supabase.channel(`typing-${roomId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: TypingUser[] = [];

        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== user.id) {
            const presence = presences[0] as { is_typing?: boolean; nickname?: string };
            if (presence?.is_typing) {
              typing.push({
                id: userId,
                nickname: presence.nickname || "Unknown",
              });
            }
          }
        });

        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            is_typing: false,
            nickname: profile.nickname,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, user, profile]);

  const setIsTyping = useCallback(
    async (isTyping: boolean) => {
      if (!channelRef.current || !profile) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      await channelRef.current.track({
        is_typing: isTyping,
        nickname: profile.nickname,
      });

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(async () => {
          if (channelRef.current) {
            await channelRef.current.track({
              is_typing: false,
              nickname: profile.nickname,
            });
          }
        }, 3000);
      }
    },
    [profile]
  );

  return {
    typingUsers,
    setIsTyping,
  };
}
