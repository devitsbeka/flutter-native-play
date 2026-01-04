import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RoomParticipant, ParticipantStatus } from "./useGameRoom";

export function useRoomParticipants(roomId: string | null) {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch participants with fresh profile data
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (!error && data) {
      // Fetch fresh profile data for all participants
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, avatar_url, nickname")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const typedParticipants: RoomParticipant[] = data.map(p => {
        const profile = profileMap.get(p.user_id);
        return {
          id: p.id,
          room_id: p.room_id,
          user_id: p.user_id,
          nickname: p.nickname,
          // Use fresh avatar_url from profiles, fallback to stored one
          avatar_url: profile?.avatar_url || p.avatar_url,
          country_code: p.country_code || "GE",
          joined_at: p.joined_at,
          status: p.status as ParticipantStatus,
          score: p.score || 0,
          current_question: p.current_question || 0,
          is_host: p.is_host || false,
          total_wins: (p as any).total_wins || 0,
          total_rounds_played: (p as any).total_rounds_played || 0,
        };
      });
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

    // Subscribe to room_participants changes
    const participantsChannel = supabase
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

    // Subscribe to profiles changes to update avatars in real-time
    const profilesChannel = supabase
      .channel(`profiles-avatars-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const updatedProfile = payload.new as { user_id: string; avatar_url: string | null };
          console.log("Profile avatar change:", updatedProfile);
          
          // Update avatar for matching participant
          setParticipants(prev =>
            prev.map(p => p.user_id === updatedProfile.user_id 
              ? { ...p, avatar_url: updatedProfile.avatar_url }
              : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(profilesChannel);
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
