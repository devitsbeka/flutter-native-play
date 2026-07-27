import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_SELECT_COLUMNS } from "@/integrations/supabase/profileColumns";
import { useAuth } from "@/contexts/AuthContext";

export interface InteractionLogItem {
  id: string;
  type: 'invitation_sent' | 'invitation_received' | 'room_together' | 'chat';
  message: string;
  details?: string;
  timestamp: string;
  roomId?: string;
  categoryName?: string;
}

export interface PlayerProfileData {
  profile: {
    id: string;
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    animated_avatar_url: string | null;
    country_code: string | null;
    total_points: number | null;
    games_played: number | null;
    games_won: number | null;
    best_streak: number | null;
    current_streak: number | null;
    coins: number;
    gems: number;
  } | null;
  achievements: Array<{
    id: string;
    achievement_id: string;
    unlocked_at: string;
  }>;
  trivias: Array<{
    id: string;
    title: string;
    description: string | null;
    cover_image: string | null;
    icon_slug: string | null;
    plays_count: number | null;
    likes_count: number | null;
    created_at: string | null;
  }>;
  collections: Array<{
    id: string;
    title: string;
    description: string | null;
    cover_image: string | null;
    cover_gradient: string;
    plays_count: number | null;
    likes_count: number | null;
  }>;
  interactions: InteractionLogItem[];
  stats: {
    totalPoints: number;
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    bestStreak: number;
  };
  isFriend: boolean;
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'sent';
  friendshipId: string | null;
  isCurrentUser: boolean;
}

export function usePlayerProfile(userId: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      setLoading(true);
      setError(null);

      try {
        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(PROFILE_SELECT_COLUMNS)
          .eq("user_id", userId)
          .single();

        if (profileError) throw profileError;
        // Explicit-column select degrades the inferred type to a generic
        const profileTyped = profile as unknown as PlayerProfileData["profile"] & {
          games_played?: number; games_won?: number; total_points?: number; best_streak?: number;
        };

        // Fetch achievements
        const { data: achievements } = await supabase
          .from("user_achievements")
          .select("*")
          .eq("user_id", userId)
          .order("unlocked_at", { ascending: false });

        // Fetch public trivias
        const { data: trivias } = await supabase
          .from("user_quiz_posts")
          .select("id, title, description, cover_image, icon_slug, plays_count, likes_count, created_at")
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(10);

        // Fetch collections
        const { data: collections } = await supabase
          .from("quiz_collections")
          .select("id, title, description, cover_image, cover_gradient, plays_count, likes_count")
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(10);

        // Check friendship status
        let friendshipStatus: 'none' | 'pending' | 'accepted' | 'sent' = 'none';
        let friendshipId: string | null = null;
        let isFriend = false;

        if (user && user.id !== userId) {
          const { data: friendship } = await supabase
            .from("friendships")
            .select("*")
            .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
            .maybeSingle();

          if (friendship) {
            friendshipId = friendship.id;
            if (friendship.status === 'accepted') {
              friendshipStatus = 'accepted';
              isFriend = true;
            } else if (friendship.status === 'pending') {
              friendshipStatus = friendship.user_id === user.id ? 'sent' : 'pending';
            }
          }
        }

        // Fetch interaction history between current user and profile user
        const interactions: InteractionLogItem[] = [];
        
        if (user && user.id !== userId) {
          // Fetch game invitations between the two users
          const { data: invitations } = await supabase
            .from("game_invitations")
            .select("id, sender_id, receiver_id, status, created_at, room:game_rooms(category_name)")
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
            .order("created_at", { ascending: false })
            .limit(10);

          if (invitations) {
            for (const inv of invitations) {
              const isSender = inv.sender_id === user.id;
              const categoryName = (inv.room as any)?.category_name;
              interactions.push({
                id: inv.id,
                type: isSender ? 'invitation_sent' : 'invitation_received',
                message: isSender ? 'activityYouInvited' : 'activityInvitedToGame',
                details: categoryName || undefined,
                timestamp: inv.created_at,
                categoryName,
              });
            }
          }

          // Fetch rooms where both users are participants
          const { data: sharedRooms } = await supabase
            .from("room_participants")
            .select("room_id, joined_at")
            .eq("user_id", userId);

          if (sharedRooms && sharedRooms.length > 0) {
            const roomIds = sharedRooms.map(r => r.room_id);
            const { data: myRooms } = await supabase
              .from("room_participants")
              .select("room_id, joined_at, room:game_rooms(category_name, room_name)")
              .eq("user_id", user.id)
              .in("room_id", roomIds)
              .order("joined_at", { ascending: false })
              .limit(5);

            if (myRooms) {
              for (const r of myRooms) {
                const room = r.room as any;
                interactions.push({
                  id: `room-${r.room_id}`,
                  type: 'room_together',
                  message: 'activityPlayedTogether',
                  details: room?.category_name || room?.room_name || undefined,
                  timestamp: r.joined_at,
                  roomId: r.room_id,
                  categoryName: room?.category_name,
                });
              }
            }
          }

          // Sort by timestamp descending
          interactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }

        const gamesPlayed = profileTyped?.games_played || 0;
        const gamesWon = profileTyped?.games_won || 0;

        setData({
          profile: profileTyped,
          achievements: achievements || [],
          trivias: trivias || [],
          collections: collections || [],
          interactions: interactions.slice(0, 10), // Limit to 10 most recent
          stats: {
            totalPoints: profileTyped?.total_points || 0,
            gamesPlayed,
            gamesWon,
            winRate: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
            bestStreak: profileTyped?.best_streak || 0,
          },
          isFriend,
          friendshipStatus,
          friendshipId,
          isCurrentUser: user?.id === userId,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch profile"));
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId, user?.id, refreshKey]);

  return { data, loading, error, refetch };
}
