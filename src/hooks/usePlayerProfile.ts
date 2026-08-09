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
  // Results are stored together with the user they belong to. Plain state
  // kept the previous player's profile after the modal closed, and effects
  // run only AFTER paint — so reopening the modal for someone else painted
  // the old profile for a frame (the "ghost profile"). Deriving both data
  // and loading from this key makes a stale render impossible.
  const [entry, setEntry] = useState<{ userId: string; data: PlayerProfileData } | null>(null);
  const [errorEntry, setErrorEntry] = useState<{ userId: string; error: Error } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const data = entry && entry.userId === userId ? entry.data : null;
  const error = errorEntry && errorEntry.userId === userId ? errorEntry.error : null;
  const loading = !!userId && !data && !error;

  const refetch = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    if (!userId) return;

    // Ignore results that land after the modal switched to another user
    let cancelled = false;

    async function fetchProfile() {
      setErrorEntry(null);

      try {
        // Phase 1 — the profile row alone. The header (avatar, name, score)
        // renders from this immediately; the old flow chained up to eight
        // round-trips before showing anything.
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

        const gamesPlayed = profileTyped?.games_played || 0;
        const gamesWon = profileTyped?.games_won || 0;

        const base: PlayerProfileData = {
          profile: profileTyped,
          achievements: [],
          trivias: [],
          collections: [],
          interactions: [],
          stats: {
            totalPoints: profileTyped?.total_points || 0,
            gamesPlayed,
            gamesWon,
            winRate: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
            bestStreak: profileTyped?.best_streak || 0,
          },
          isFriend: false,
          friendshipStatus: 'none',
          friendshipId: null,
          isCurrentUser: user?.id === userId,
        };

        if (cancelled) return;
        setEntry({ userId: userId!, data: base });

        // Phase 2 — everything else in parallel, merged in when it arrives
        const achievementsQ = supabase
          .from("user_achievements")
          .select("*")
          .eq("user_id", userId)
          .order("unlocked_at", { ascending: false });

        const triviasQ = supabase
          .from("user_quiz_posts")
          .select("id, title, description, cover_image, icon_slug, plays_count, likes_count, created_at")
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(10);

        const collectionsQ = supabase
          .from("quiz_collections")
          .select("id, title, description, cover_image, cover_gradient, plays_count, likes_count")
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(10);

        const friendshipP = (async () => {
          if (!user || user.id === userId) return null;
          const { data: friendship } = await supabase
            .from("friendships")
            .select("*")
            .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
            .maybeSingle();
          return friendship;
        })();

        const interactionsP = (async (): Promise<InteractionLogItem[]> => {
          if (!user || user.id === userId) return [];
          const interactions: InteractionLogItem[] = [];

          // Invitations and shared rooms are independent — run both at once
          const [{ data: invitations }, { data: sharedRooms }] = await Promise.all([
            supabase
              .from("game_invitations")
              .select("id, sender_id, receiver_id, status, created_at, room:game_rooms(category_name)")
              .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
              .order("created_at", { ascending: false })
              .limit(10),
            supabase
              .from("room_participants")
              .select("room_id, joined_at")
              .eq("user_id", userId),
          ]);

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

          interactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          return interactions;
        })();

        const [
          { data: achievements },
          { data: trivias },
          { data: collections },
          friendship,
          interactions,
        ] = await Promise.all([achievementsQ, triviasQ, collectionsQ, friendshipP, interactionsP]);

        let friendshipStatus: 'none' | 'pending' | 'accepted' | 'sent' = 'none';
        let friendshipId: string | null = null;
        let isFriend = false;
        if (friendship) {
          friendshipId = friendship.id;
          if (friendship.status === 'accepted') {
            friendshipStatus = 'accepted';
            isFriend = true;
          } else if (friendship.status === 'pending') {
            friendshipStatus = friendship.user_id === user!.id ? 'sent' : 'pending';
          }
        }

        if (cancelled) return;
        setEntry({ userId: userId!, data: {
          ...base,
          achievements: achievements || [],
          trivias: trivias || [],
          collections: collections || [],
          interactions: interactions.slice(0, 10),
          isFriend,
          friendshipStatus,
          friendshipId,
        } });
      } catch (err) {
        if (cancelled) return;
        setErrorEntry({
          userId: userId!,
          error: err instanceof Error ? err : new Error("Failed to fetch profile"),
        });
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId, user?.id, refreshKey]);

  return { data, loading, error, refetch };
}
