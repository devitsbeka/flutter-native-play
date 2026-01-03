import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoomParticipant, ParticipantStatus } from "./useGameRoom";

export function useRoomParticipants(roomId: string | null) {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (!error && data) {
      const typedParticipants: RoomParticipant[] = data.map(p => ({
        id: p.id,
        room_id: p.room_id,
        user_id: p.user_id,
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        country_code: p.country_code || "GE",
        joined_at: p.joined_at,
        status: p.status as ParticipantStatus,
        score: p.score || 0,
        current_question: p.current_question || 0,
        is_host: p.is_host || false,
        total_wins: (p as any).total_wins || 0,
        total_rounds_played: (p as any).total_rounds_played || 0,
      }));
      setParticipants(typedParticipants);
    }
    setLoading(false);
  }, [roomId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!roomId) {
      setParticipants([]);
      return;
    }

    // Initial fetch
    fetchParticipants();

    // Subscribe to changes
    const channel = supabase
      .channel(`room-participants-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log("Participant change:", payload);
          
          if (payload.eventType === "INSERT") {
            const newParticipant = payload.new as RoomParticipant;
            setParticipants(prev => {
              // Avoid duplicates
              if (prev.some(p => p.id === newParticipant.id)) return prev;
              return [...prev, {
                ...newParticipant,
                status: newParticipant.status as ParticipantStatus,
                total_wins: (newParticipant as any).total_wins || 0,
                total_rounds_played: (newParticipant as any).total_rounds_played || 0,
              }];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as RoomParticipant;
            setParticipants(prev =>
              prev.map(p => p.id === updated.id ? {
                ...updated,
                status: updated.status as ParticipantStatus,
              } : p)
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setParticipants(prev => prev.filter(p => p.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchParticipants]);

  const allReady = participants.length >= 2 && participants.every(p => p.status === "ready");
  const hostParticipant = participants.find(p => p.is_host);
  const otherParticipants = participants.filter(p => !p.is_host);

  return {
    participants,
    loading,
    allReady,
    hostParticipant,
    otherParticipants,
    refetch: fetchParticipants,
  };
}
