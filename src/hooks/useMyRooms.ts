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
  // TV session data
  tv_session_id: string | null;
  tv_status: string | null;
  tv_active_players: number;
  // TV players data for accurate avatar display
  tv_players: {
    user_id: string | null;
    nickname: string;
    avatar_url: string | null;
  }[];
  participants: {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    is_host: boolean;
  }[];
  // Online presence data
  online_participants: {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
  }[];
  has_others_online: boolean;
}

// Active TV session statuses that indicate a "LIVE" game
// Active TV session statuses that indicate a "LIVE" game - paired means TV is connected and waiting for host
const ACTIVE_TV_STATUSES = ['waiting', 'paired', 'lobby', 'countdown', 'question', 'playing', 'reveal', 'round-intro', 'poll-suggest', 'poll-voting', 'poll-results', 'category-select'];

// Statuses that are truly "live" - game is in progress, not just waiting
const LIVE_TV_STATUSES = ['countdown', 'question', 'playing', 'reveal', 'round-intro'];

export function isActiveTVSession(tvStatus: string | null): boolean {
  return tvStatus !== null && ACTIVE_TV_STATUSES.includes(tvStatus);
}

/**
 * Check if TV session is truly "live" (game in progress, not just waiting/paired)
 * Used for LIVE badge display - only shows when there's actual gameplay happening
 */
export function isLiveTVSession(tvStatus: string | null): boolean {
  return tvStatus !== null && LIVE_TV_STATUSES.includes(tvStatus);
}

/**
 * Check if a room was created recently (within 5 minutes)
 * Used to prioritize newly created rooms in sorting and show "ახალი" badge
 */
export function isNewlyCreated(createdAt: string): boolean {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return new Date(createdAt).getTime() > fiveMinutesAgo;
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

      // Fetch online presence for all participants
      const allParticipantUserIds = [...new Set((allParticipants || []).map(p => p.user_id))];
      let onlineUserIds = new Set<string>();
      
      if (allParticipantUserIds.length > 0) {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: presenceData } = await supabase
          .from("user_presence")
          .select("user_id, status, last_seen")
          .in("user_id", allParticipantUserIds)
          .eq("status", "online")
          .gte("last_seen", twoMinutesAgo);
        
        presenceData?.forEach(p => onlineUserIds.add(p.user_id));
      }

      // Fetch TV session data for rooms that have tv_session_id
      const tvSessionIds = (roomsData || [])
        .map((r) => r.tv_session_id)
        .filter((id): id is string => id !== null);

      let tvSessionMap = new Map<string, { status: string | null; active_players: number; players?: { nickname: string; avatar_url: string | null; user_id: string | null }[] }>();
      
      if (tvSessionIds.length > 0) {
        const { data: tvSessions } = await supabase
          .from("tv_sessions")
          .select("id, status")
          .in("id", tvSessionIds);

        // Get active player counts and their avatars for each TV session
        const { data: tvPlayers } = await supabase
          .from("tv_players")
          .select("tv_session_id, nickname, avatar_url, user_id")
          .in("tv_session_id", tvSessionIds)
          .eq("is_active", true);

        // Group players per session with their data
        const playerDataMap = new Map<string, { nickname: string; avatar_url: string | null; user_id: string | null }[]>();
        tvPlayers?.forEach((p) => {
          const existing = playerDataMap.get(p.tv_session_id) || [];
          existing.push({ nickname: p.nickname, avatar_url: p.avatar_url, user_id: p.user_id });
          playerDataMap.set(p.tv_session_id, existing);
        });

        tvSessions?.forEach((session) => {
          const players = playerDataMap.get(session.id) || [];
          tvSessionMap.set(session.id, {
            status: session.status,
            active_players: players.length,
            players: players,
          });
        });

        // Debug log TV session data
        console.log('[useMyRooms] TV sessions loaded:', tvSessions?.map(s => ({ id: s.id, status: s.status })));
      }

      const participantsByRoom = new Map<string, typeof allParticipants>();
      allParticipants?.forEach((p) => {
        const existing = participantsByRoom.get(p.room_id) || [];
        existing.push(p);
        participantsByRoom.set(p.room_id, existing);
      });

      const myRooms: MyRoom[] = (roomsData || []).map((room: any) => {
        const participants = participantsByRoom.get(room.id) || [];
        const tvData = room.tv_session_id ? tvSessionMap.get(room.tv_session_id) : null;
        
        // Calculate online participants (excluding current user)
        const onlineParticipants = participants
          .filter(p => onlineUserIds.has(p.user_id) && p.user_id !== user.id)
          .map(p => ({
            user_id: p.user_id,
            nickname: p.nickname,
            avatar_url: p.avatar_url,
          }));

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
          tv_session_id: room.tv_session_id || null,
          tv_status: tvData?.status || null,
          tv_active_players: tvData?.active_players || 0,
          tv_players: (tvData?.players || []).map((p) => ({
            user_id: p.user_id,
            nickname: p.nickname,
            avatar_url: p.avatar_url,
          })),
          participants: participants.map((p) => ({
            user_id: p.user_id,
            nickname: p.nickname,
            avatar_url: p.avatar_url,
            is_host: p.is_host || false,
          })),
          online_participants: onlineParticipants,
          has_others_online: onlineParticipants.length > 0,
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tv_sessions",
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
          table: "tv_players",
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
          table: "user_presence",
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

    // Sort: TV sessions first, then my new rooms, then LIVE, then playing, then waiting, then unread, then by activity
    result = [...result].sort((a, b) => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      
      // Priority 0: Active TV sessions - HIGHEST PRIORITY (always show first)
      const aHasTV = isActiveTVSession(a.tv_status);
      const bHasTV = isActiveTVSession(b.tv_status);
      
      if (aHasTV && !bHasTV) return -1;
      if (bHasTV && !aHasTV) return 1;
      
      // Priority 1: MY recently created rooms (within 5 min)
      const aIsMyNew = a.is_host && a.status === "waiting" && 
        new Date(a.created_at).getTime() > fiveMinutesAgo;
      const bIsMyNew = b.is_host && b.status === "waiting" && 
        new Date(b.created_at).getTime() > fiveMinutesAgo;
      
      if (aIsMyNew && !bIsMyNew) return -1;
      if (bIsMyNew && !aIsMyNew) return 1;
      
      // Priority 2: LIVE rooms (playing or others online)
      const aIsLive = a.status === "playing" || a.has_others_online;
      const bIsLive = b.status === "playing" || b.has_others_online;
      
      if (aIsLive && !bIsLive) return -1;
      if (bIsLive && !aIsLive) return 1;
      
      // Priority 2: Rooms with unread activity
      if (a.has_unread_activity && !b.has_unread_activity) return -1;
      if (b.has_unread_activity && !a.has_unread_activity) return 1;
      
      // Priority 3: Waiting rooms over completed
      if (a.status === "waiting" && b.status === "completed") return -1;
      if (b.status === "waiting" && a.status === "completed") return 1;
      
      // Priority 4: By last activity (most recent first)
      const aTime = new Date(a.last_activity_at || a.created_at).getTime();
      const bTime = new Date(b.last_activity_at || b.created_at).getTime();
      return bTime - aTime;
    });

    // Debug log to verify sorting
    if (result.length > 0) {
      console.log('[useMyRooms] Sorted rooms:', result.slice(0, 3).map(r => ({
        name: r.room_name,
        tv_status: r.tv_status,
        tv_active_players: r.tv_active_players,
        isActiveTv: isActiveTVSession(r.tv_status),
        isMyNew: r.is_host && r.status === "waiting" && isNewlyCreated(r.created_at)
      })));
    }

    return result;
  }, [rooms, filter, friendIds, searchQuery]);

  return {
    rooms: filteredRooms,
    loading,
    refreshRooms: fetchMyRooms,
    filter,
  };
}
