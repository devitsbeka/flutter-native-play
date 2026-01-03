import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PlayerScore {
  user_id: string;
  nickname: string;
  score: number;
}

export interface MatchHistoryEntry {
  id: string;
  room_id: string;
  winner_user_id: string | null;
  played_at: string;
  player_scores: PlayerScore[];
}

export function useRoomMatchHistory(roomId: string | null) {
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatches = useCallback(async () => {
    if (!roomId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("room_match_history")
      .select("*")
      .eq("room_id", roomId)
      .order("played_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      const typedMatches = data.map(d => ({
        ...d,
        player_scores: (d.player_scores || []) as unknown as PlayerScore[],
      }));
      setMatches(typedMatches);
    }
    setLoading(false);
  }, [roomId]);

  const addMatch = useCallback(async (
    winnerId: string | null,
    playerScores: PlayerScore[]
  ) => {
    if (!roomId) return;

    const { error } = await supabase
      .from("room_match_history")
      .insert([{
        room_id: roomId,
        winner_user_id: winnerId,
        player_scores: JSON.parse(JSON.stringify(playerScores)),
      }]);

    if (!error) {
      fetchMatches();
    }
  }, [roomId, fetchMatches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Subscribe to new matches
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-match-history-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_match_history",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchMatches]);

  return {
    matches,
    loading,
    addMatch,
    refetch: fetchMatches,
  };
}
