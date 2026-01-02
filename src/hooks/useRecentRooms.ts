import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecentRoom {
  id: string;
  room_code: string;
  category_id: string | null;
  category_name: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_questions: number;
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
      // Get rooms where user participated
      const { data: participations, error: partError } = await supabase
        .from("room_participants")
        .select("room_id, score")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(limit);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const roomIds = participations.map((p) => p.room_id);
      const myScores = new Map(participations.map((p) => [p.room_id, p.score || 0]));

      // Fetch room details
      const { data: roomsData, error: roomsError } = await supabase
        .from("game_rooms")
        .select("*")
        .in("id", roomIds)
        .in("status", ["completed", "cancelled"])
        .order("completed_at", { ascending: false });

      if (roomsError) throw roomsError;

      // Fetch all participants for these rooms
      const { data: allParticipants, error: allPartError } = await supabase
        .from("room_participants")
        .select("room_id, user_id, nickname, avatar_url, score")
        .in("room_id", roomIds);

      if (allPartError) throw allPartError;

      // Group participants by room
      const participantsByRoom = new Map<string, typeof allParticipants>();
      allParticipants?.forEach((p) => {
        const existing = participantsByRoom.get(p.room_id) || [];
        existing.push(p);
        participantsByRoom.set(p.room_id, existing);
      });

      // Build recent rooms with all data
      const recentRooms: RecentRoom[] = (roomsData || []).map((room) => {
        const participants = participantsByRoom.get(room.id) || [];
        const myScore = myScores.get(room.id) || 0;
        
        // Sort participants by score to determine placement
        const sortedParticipants = [...participants].sort(
          (a, b) => (b.score || 0) - (a.score || 0)
        );
        
        const myPlacement =
          sortedParticipants.findIndex((p) => p.user_id === user.id) + 1;
        
        return {
          id: room.id,
          room_code: room.room_code,
          category_id: room.category_id,
          category_name: room.category_name,
          status: room.status || "completed",
          created_at: room.created_at || "",
          completed_at: room.completed_at,
          total_questions: room.total_questions || 5,
          my_score: myScore,
          my_placement: myPlacement,
          total_players: participants.length,
          won: myPlacement === 1,
          participants: sortedParticipants.map((p) => ({
            user_id: p.user_id,
            nickname: p.nickname,
            avatar_url: p.avatar_url,
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
