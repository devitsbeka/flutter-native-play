import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RoomFilter = "all" | "my_rooms" | "friends_rooms" | "active" | "completed";
export type RoomSort = "recent" | "created_date";

export interface MyRoom {
  id: string;
  room_code: string;
  room_name: string | null;
  room_icon: string | null;
  category_name: string | null;
  category_id: string | null;
  status: string;
  created_at: string;
  is_host: boolean;
  game_type: string;
  has_unread_activity: boolean;
  cover_image: string | null;
  background_gradient: string | null;
  host_user_id: string;
  last_activity_at: string | null;
  participants: {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    is_host: boolean;
  }[];
}

interface UseMyRoomsOptions {
  filter?: RoomFilter;
  sort?: RoomSort;
  searchQuery?: string;
}

export function useMyRooms(options?: UseMyRoomsOptions) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  const { filter = "all", sort = "recent", searchQuery = "" } = options || {};

  // Fetch friend IDs for filtering
  useEffect(() => {
    const fetchFriends = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (data) {
        const ids = data.map((f) =>
          f.user_id === user.id ? f.friend_id : f.user_id
        );
        setFriendIds(ids);
      }
    };

    fetchFriends();
  }, [user]);

  const fetchMyRooms = useCallback(async () => {
    if (!user) {
      setRooms([]);
      setLoading(false);
      return;
    }

    try {
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

      const orderColumn = sort === "created_date" ? "created_at" : "last_activity_at";

      const { data: roomsData, error: roomsError } = await supabase
        .from("game_rooms")
        .select("*")
        .in("id", roomIds)
        .neq("status", "cancelled")
        .order(orderColumn, { ascending: false, nullsFirst: false });

      if (roomsError) throw roomsError;

      const activeRoomIds = (roomsData || []).map((r) => r.id);

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

      const participantsByRoom = new Map<string, typeof allParticipants>();
      allParticipants?.forEach((p) => {
        const existing = participantsByRoom.get(p.room_id) || [];
        existing.push(p);
        participantsByRoom.set(p.room_id, existing);
      });

      const myRooms: MyRoom[] = (roomsData || []).map((room: any) => {
        const participants = participantsByRoom.get(room.id) || [];

        return {
          id: room.id,
          room_code: room.room_code,
          room_name: room.room_name,
          room_icon: room.room_icon || null,
          category_name: room.category_name,
          category_id: room.category_id,
          status: room.status || "waiting",
          created_at: room.created_at || "",
          is_host: hostMap.get(room.id) || false,
          game_type: room.game_type,
          has_unread_activity: room.has_unread_activity || false,
          cover_image: room.cover_image || null,
          background_gradient: room.background_gradient || null,
          host_user_id: room.host_user_id,
          last_activity_at: room.last_activity_at,
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
  }, [user, sort]);

  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("my-rooms-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
        },
        () => {
          fetchMyRooms();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
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

  // Apply client-side filtering and sorting
  const filteredRooms = useMemo(() => {
    let result = rooms;

    // Apply filter
    switch (filter) {
      case "my_rooms":
        result = result.filter((room) => room.is_host);
        break;
      case "friends_rooms":
        result = result.filter(
          (room) => !room.is_host && friendIds.includes(room.host_user_id)
        );
        break;
      case "active":
        result = result.filter(
          (room) => room.status === "waiting" || room.status === "playing"
        );
        break;
      case "completed":
        result = result.filter((room) => room.status === "completed");
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (room) =>
          room.room_name?.toLowerCase().includes(query) ||
          room.category_name?.toLowerCase().includes(query) ||
          room.room_code.toLowerCase().includes(query)
      );
    }

    // Sort: LIVE/playing rooms first, then waiting, then by activity
    result = [...result].sort((a, b) => {
      // Playing rooms first
      if (a.status === "playing" && b.status !== "playing") return -1;
      if (b.status === "playing" && a.status !== "playing") return 1;
      
      // Then waiting rooms
      if (a.status === "waiting" && b.status === "completed") return -1;
      if (b.status === "waiting" && a.status === "completed") return 1;
      
      // Then by last activity (most recent first)
      const aTime = new Date(a.last_activity_at || a.created_at).getTime();
      const bTime = new Date(b.last_activity_at || b.created_at).getTime();
      return bTime - aTime;
    });

    return result;
  }, [rooms, filter, friendIds, searchQuery]);

  return {
    rooms: filteredRooms,
    loading,
    refreshRooms: fetchMyRooms,
    filter,
  };
}
