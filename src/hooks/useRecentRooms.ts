import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecentRoom {
  id: string;
  room_code: string;
  category_id: string | null;
  category_name: string | null;
  category_icon_slug: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  total_questions: number;
  my_score: number;
  my_placement: number;
  total_players: number;
  won: boolean;
  correct_count: number;
  wrong_count: number;
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

      // Fetch category icon_slugs
      const categoryIds = [...new Set(roomsData?.map(r => r.category_id).filter(Boolean) || [])];
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("category_id, icon_slug")
        .in("category_id", categoryIds);
      
      const categoryIconMap = new Map(
        (categoriesData || []).map(c => [c.category_id, c.icon_slug])
      );

      // Fetch all participants for these rooms
      const { data: allParticipants, error: allPartError } = await supabase
        .from("room_participants")
        .select("room_id, user_id, nickname, avatar_url, score")
        .in("room_id", roomIds);

      if (allPartError) throw allPartError;

      // Fetch my answers to get correct/wrong counts
      const { data: myAnswers, error: answersError } = await supabase
        .from("player_answers")
        .select("room_id, is_correct")
        .eq("user_id", user.id)
        .in("room_id", roomIds);

      if (answersError) throw answersError;

      // Group answers by room
      const answersByRoom = new Map<string, { correct: number; wrong: number }>();
      myAnswers?.forEach((a) => {
        const existing = answersByRoom.get(a.room_id) || { correct: 0, wrong: 0 };
        if (a.is_correct) existing.correct++;
        else existing.wrong++;
        answersByRoom.set(a.room_id, existing);
      });

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

        const myAnswerStats = answersByRoom.get(room.id) || { correct: 0, wrong: 0 };
        
        return {
          id: room.id,
          room_code: room.room_code,
          category_id: room.category_id,
          category_name: room.category_name,
          category_icon_slug: room.category_id ? categoryIconMap.get(room.category_id) || null : null,
          status: room.status || "completed",
          created_at: room.created_at || "",
          completed_at: room.completed_at,
          total_questions: room.total_questions || 5,
          my_score: myScore,
          my_placement: myPlacement,
          total_players: participants.length,
          won: myPlacement === 1,
          correct_count: myAnswerStats.correct,
          wrong_count: myAnswerStats.wrong,
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
