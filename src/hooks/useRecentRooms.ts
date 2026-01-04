import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecentRoom {
  id: string;
  room_id: string;
  room_code: string;
  category_id: string | null;
  category_name: string | null;
  category_icon_slug: string | null;
  played_at: string;
  my_score: number;
  my_placement: number;
  total_players: number;
  won: boolean;
  participants: {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    score: number;
  }[];
}

interface PlayerScore {
  user_id: string;
  nickname: string;
  score: number;
  avatar_url?: string | null;
}

export function useRecentRooms(limit: number = 10) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentRooms = useCallback(async () => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch from room_match_history - this includes individual rounds
      const { data: matchHistory, error: matchError } = await supabase
        .from("room_match_history")
        .select("*")
        .order("played_at", { ascending: false })
        .limit(limit * 2); // Fetch more to filter by user participation

      if (matchError) throw matchError;

      if (!matchHistory || matchHistory.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      // Filter matches where user participated
      const userMatches = matchHistory.filter((match) => {
        const playerScores = match.player_scores as unknown as PlayerScore[];
        return Array.isArray(playerScores) && playerScores.some((p) => p.user_id === user.id);
      }).slice(0, limit);

      if (userMatches.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      // Get unique room IDs
      const roomIds = [...new Set(userMatches.map((m) => m.room_id))];

      // Fetch room details
      const { data: roomsData, error: roomsError } = await supabase
        .from("game_rooms")
        .select("id, room_code, category_id, category_name")
        .in("id", roomIds);

      if (roomsError) throw roomsError;

      const roomMap = new Map(
        (roomsData || []).map((r) => [r.id, r])
      );

      // Fetch category icon_slugs
      const categoryIds = [...new Set(roomsData?.map(r => r.category_id).filter(Boolean) || [])];
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("category_id, icon_slug")
        .in("category_id", categoryIds);
      
      const categoryIconMap = new Map(
        (categoriesData || []).map(c => [c.category_id, c.icon_slug])
      );

      // Build recent rooms from match history
      const recentRooms: RecentRoom[] = userMatches.map((match) => {
        const room = roomMap.get(match.room_id);
        const playerScores = match.player_scores as unknown as PlayerScore[];
        
        // Sort by score to determine placement
        const sortedScores = [...playerScores].sort((a, b) => (b.score || 0) - (a.score || 0));
        
        const myScore = playerScores.find((p) => p.user_id === user.id)?.score || 0;
        const myPlacement = sortedScores.findIndex((p) => p.user_id === user.id) + 1;
        const winnerId = match.winner_user_id;
        
        return {
          id: match.id,
          room_id: match.room_id,
          room_code: room?.room_code || "????",
          category_id: room?.category_id || null,
          category_name: room?.category_name || null,
          category_icon_slug: room?.category_id ? categoryIconMap.get(room.category_id) || null : null,
          played_at: match.played_at || "",
          my_score: myScore,
          my_placement: myPlacement,
          total_players: playerScores.length,
          won: winnerId === user.id,
          participants: sortedScores.map((p) => ({
            user_id: p.user_id,
            nickname: p.nickname || "Player",
            avatar_url: p.avatar_url || null,
            score: p.score || 0,
          })),
        };
      });

      setRooms(recentRooms);
    } catch (error) {
      console.error("Error fetching recent rooms:", error);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchRecentRooms();
  }, [fetchRecentRooms]);

  return {
    rooms,
    loading,
    refreshRooms: fetchRecentRooms,
  };
}
