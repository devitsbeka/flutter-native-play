import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MyRoom {
  id: string;
  room_code: string;
  room_name: string | null;
  category_name: string | null;
  category_id: string | null;
  status: string;
  created_at: string;
  is_host: boolean;
  game_type: string;
  has_unread_activity: boolean;
  cover_image: string | null;
  background_gradient: string | null;
  participants: {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    is_host: boolean;
  }[];
}

export function useMyRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyRooms = useCallback(async () => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    try {
      // Get rooms where user is host or participant with active statuses
      const { data: participations, error: partError } = await supabase
        .from("room_participants")
        .select("room_id, is_host")
        .eq("user_id", user.id);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const roomIds = participations.map((p) => p.room_id);
      const hostMap = new Map(participations.map((p) => [p.room_id, p.is_host || false]));

      // Fetch ALL room details - show all rooms user is part of (permanent rooms)
      // Only exclude cancelled rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from("game_rooms")
        .select("*")
        .in("id", roomIds)
        .neq("status", "cancelled")
        .order("last_activity_at", { ascending: false, nullsFirst: false });

      if (roomsError) throw roomsError;

      // Fetch all participants for these rooms
      const activeRoomIds = (roomsData || []).map(r => r.id);
      
      if (activeRoomIds.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const { data: allParticipants, error: allPartError } = await supabase
        .from("room_participants")
        .select("room_id, user_id, nickname, avatar_url, is_host")
        .in("room_id", activeRoomIds);

      if (allPartError) throw allPartError;

      // Group participants by room
      const participantsByRoom = new Map<string, typeof allParticipants>();
      allParticipants?.forEach((p) => {
        const existing = participantsByRoom.get(p.room_id) || [];
        existing.push(p);
        participantsByRoom.set(p.room_id, existing);
      });

      // Build my rooms with all data
      const myRooms: MyRoom[] = (roomsData || []).map((room: any) => {
        const participants = participantsByRoom.get(room.id) || [];
        
        return {
          id: room.id,
          room_code: room.room_code,
          room_name: room.room_name,
          category_name: room.category_name,
          category_id: room.category_id,
          status: room.status || "waiting",
          created_at: room.created_at || "",
          is_host: hostMap.get(room.id) || false,
          game_type: room.game_type,
          has_unread_activity: room.has_unread_activity || false,
          cover_image: room.cover_image || null,
          background_gradient: room.background_gradient || null,
          participants: participants.map((p) => ({
            user_id: p.user_id,
            nickname: p.nickname,
            avatar_url: p.avatar_url,
            is_host: p.is_host || false,
          })),
        };
      });

      setRooms(myRooms);
    } catch (error) {
      console.error("Error fetching my rooms:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('my-rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
        },
        () => {
          fetchMyRooms();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
        },
        () => {
          fetchMyRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMyRooms]);

  return {
    rooms,
    loading,
    refreshRooms: fetchMyRooms,
  };
}
