import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  stats: {
    totalPoints: number;
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    bestStreak: number;
  };
  isFriend: boolean;
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'sent';
  isCurrentUser: boolean;
}

export function usePlayerProfile(userId: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
          .select("*")
          .eq("user_id", userId)
          .single();

        if (profileError) throw profileError;

        // Fetch achievements
        const { data: achievements } = await supabase
          .from("user_achievements")
          .select("*")
          .eq("user_id", userId)
          .order("unlocked_at", { ascending: false });

        // Fetch public trivias
        const { data: trivias } = await supabase
          .from("user_quiz_posts")
          .select("id, title, description, cover_image, plays_count, likes_count, created_at")
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
        let isFriend = false;

        if (user && user.id !== userId) {
          const { data: friendship } = await supabase
            .from("friendships")
            .select("*")
            .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
            .maybeSingle();

          if (friendship) {
            if (friendship.status === 'accepted') {
              friendshipStatus = 'accepted';
              isFriend = true;
            } else if (friendship.status === 'pending') {
              friendshipStatus = friendship.user_id === user.id ? 'sent' : 'pending';
            }
          }
        }

        const gamesPlayed = profile?.games_played || 0;
        const gamesWon = profile?.games_won || 0;

        setData({
          profile,
          achievements: achievements || [],
          trivias: trivias || [],
          collections: collections || [],
          stats: {
            totalPoints: profile?.total_points || 0,
            gamesPlayed,
            gamesWon,
            winRate: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
            bestStreak: profile?.best_streak || 0,
          },
          isFriend,
          friendshipStatus,
          isCurrentUser: user?.id === userId,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch profile"));
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId, user?.id]);

  return { data, loading, error };
}
