import { useMemo, useEffect, useRef } from "react";
import { compareRooms } from "@/utils/roomOrder";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { matchesQuery } from "@/utils/searchMatch";

export type RoomFilter = "all" | "my_rooms" | "friends_rooms" | "active" | "completed";

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
  // Online presence data (online in app, not necessarily in this room)
  online_participants: {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
  }[];
  has_others_online: boolean;
  // Players actually INSIDE this room (current_page = /room/<id>)
  in_room_participants: {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
  }[];
  has_players_in_room: boolean;
  // Has at least one participant (excluding self) active in last 10 minutes
  has_recent_activity: boolean;
}

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

/**
 * Check if a room has been active recently (within 3 hours)
 * Used to distinguish "active" rooms from "stale/inactive" rooms
 */
export function isRoomActive(lastActivityAt: string | null, createdAt: string): boolean {
  const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
  const activityTime = new Date(lastActivityAt || createdAt).getTime();
  return activityTime > threeHoursAgo;
}

// ─── Standalone fetch functions (used by React Query) ───────────────────

async function fetchFriendIdsForUser(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (!data) return [];
  return data.map((f) => (f.user_id === userId ? f.friend_id : f.user_id));
}

interface FetchRoomsOptions {
  includeArchived?: boolean;
  maxLimit?: number;
}

async function fetchRoomsForUser(userId: string, options?: FetchRoomsOptions): Promise<MyRoom[]> {
  const maxLimit = options?.maxLimit ?? 50;
  const includeArchived = options?.includeArchived ?? false;

  // 1. Get user's room participations
  const { data: participations, error: partError } = await supabase
    .from("room_participants")
    .select("room_id, is_host")
    .eq("user_id", userId);

  if (partError) throw partError;
  if (!participations || participations.length === 0) return [];

  const roomIds = participations.map((p) => p.room_id);
  const hostMap = new Map(participations.map((p) => [p.room_id, p.is_host || false]));

  // 2. Get room data
  let roomsQuery = supabase
    .from("game_rooms")
    .select("*")
    .in("id", roomIds)
    .neq("status", "cancelled")
    .order("last_activity_at", { ascending: false, nullsFirst: false });

  if (!includeArchived) {
    roomsQuery = roomsQuery.or("is_archived.is.null,is_archived.eq.false");
  }

  if (maxLimit > 0) {
    roomsQuery = roomsQuery.limit(maxLimit);
  }

  const { data: roomsData, error: roomsError } = await roomsQuery;
  if (roomsError) throw roomsError;

  const activeRoomIds = (roomsData || []).map((r) => r.id);
  if (activeRoomIds.length === 0) return [];

  // 3. Get all participants for active rooms
  const { data: allParticipants, error: allPartError } = await supabase
    .from("room_participants")
    .select("room_id, user_id, nickname, avatar_url, is_host")
    .in("room_id", activeRoomIds);

  if (allPartError) throw allPartError;

  // 4. Fetch fresh avatar URLs from profiles (room_participants stores stale snapshots)
  const allParticipantUserIds = [...new Set((allParticipants || []).map(p => p.user_id))];

  let profileAvatarMap = new Map<string, string | null>();
  if (allParticipantUserIds.length > 0) {
    const { data: freshProfiles } = await supabase
      .from("profiles")
      .select("user_id, avatar_url")
      .in("user_id", allParticipantUserIds);

    profileAvatarMap = new Map(freshProfiles?.map(p => [p.user_id, p.avatar_url]) || []);
  }

  // 5. Fetch presence data — single query for 10 min window, derive both online and recently active
  const onlineUserIds = new Set<string>();
  const presencePageMap = new Map<string, string>();
  const recentlyActiveUserIds = new Set<string>();

  if (allParticipantUserIds.length > 0) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: presenceData } = await supabase
      .from("user_presence")
      .select("user_id, status, last_seen, current_page")
      .in("user_id", allParticipantUserIds)
      .gte("last_seen", tenMinutesAgo);

    presenceData?.forEach(p => {
      recentlyActiveUserIds.add(p.user_id);
      if (p.status === 'online' && p.last_seen >= twoMinutesAgo) {
        onlineUserIds.add(p.user_id);
        if (p.current_page) {
          presencePageMap.set(p.user_id, p.current_page);
        }
      }
    });
  }

  // 6. Fetch TV session data
  const tvSessionIds = (roomsData || [])
    .map((r) => r.tv_session_id)
    .filter((id): id is string => id !== null);

  const tvSessionMap = new Map<string, { status: string | null; active_players: number; players?: { nickname: string; avatar_url: string | null; user_id: string | null }[] }>();

  if (tvSessionIds.length > 0) {
    const { data: tvSessions } = await supabase
      .from("tv_sessions")
      .select("id, status")
      .in("id", tvSessionIds);

    const { data: tvPlayers } = await supabase
      .from("tv_players")
      .select("tv_session_id, nickname, avatar_url, user_id")
      .in("tv_session_id", tvSessionIds)
      .eq("is_active", true);

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
  }

  // 7. Build MyRoom[]
  const participantsByRoom = new Map<string, typeof allParticipants>();
  allParticipants?.forEach((p) => {
    const existing = participantsByRoom.get(p.room_id) || [];
    existing.push(p);
    participantsByRoom.set(p.room_id, existing);
  });

  // Helper to get fresh avatar from profiles, falling back to room_participants snapshot
  const getFreshAvatar = (userIdVal: string, snapshotAvatar: string | null) =>
    profileAvatarMap.get(userIdVal) ?? snapshotAvatar;

  return (roomsData || []).map((room: any) => {
    const participants = participantsByRoom.get(room.id) || [];
    const tvData = room.tv_session_id ? tvSessionMap.get(room.tv_session_id) : null;

    // The viewer is online by definition — include them so their own avatar
    // ring and the all-online badge don't contradict the friends carousel
    const onlineParticipants = participants
      .filter(p => p.user_id === userId || onlineUserIds.has(p.user_id))
      .map(p => ({ user_id: p.user_id, nickname: p.nickname, avatar_url: getFreshAvatar(p.user_id, p.avatar_url) }));

    const roomPath = `/room/${room.id}`;
    const inRoomParticipants = participants
      .filter(p => {
        if (p.user_id === userId) return false;
        const currentPage = presencePageMap.get(p.user_id);
        return currentPage === roomPath;
      })
      .map(p => ({ user_id: p.user_id, nickname: p.nickname, avatar_url: getFreshAvatar(p.user_id, p.avatar_url) }));

    const hasRecentActivity = participants.some(
      p => p.user_id !== userId && recentlyActiveUserIds.has(p.user_id)
    );

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
        avatar_url: getFreshAvatar(p.user_id, p.avatar_url),
        is_host: p.is_host || false,
      })),
      online_participants: onlineParticipants,
      has_others_online: onlineParticipants.some(p => p.user_id !== userId),
      in_room_participants: inRoomParticipants,
      has_players_in_room: inRoomParticipants.length > 0,
      has_recent_activity: hasRecentActivity,
    };
  });
}

// ─── React Query keys ───────────────────────────────────────────────────

const MY_ROOMS_KEY = 'my-rooms' as const;
const MY_ROOMS_SEARCH_KEY = 'my-rooms-search' as const;
const FRIEND_IDS_KEY = 'friend-ids' as const;

// ─── Shared realtime subscription (ref-counted singleton) ───────────────

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeRefCount = 0;
let realtimeInvalidate: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function subscribeToRoomChanges(queryClient: ReturnType<typeof useQueryClient>) {
  realtimeRefCount++;

  if (realtimeRefCount === 1) {
    // First subscriber — create the shared channel
    realtimeInvalidate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [MY_ROOMS_KEY] });
        queryClient.invalidateQueries({ queryKey: [MY_ROOMS_SEARCH_KEY] });
      }, 1000);
    };

    realtimeChannel = supabase
      .channel('my-rooms-shared')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, () => realtimeInvalidate?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants' }, () => realtimeInvalidate?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tv_sessions' }, () => realtimeInvalidate?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tv_players' }, () => realtimeInvalidate?.())
      .subscribe();
  }
}

function unsubscribeFromRoomChanges() {
  realtimeRefCount--;
  if (realtimeRefCount <= 0) {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeInvalidate = null;
    realtimeRefCount = 0;
  }
}

// ─── The hook ───────────────────────────────────────────────────────────

interface UseMyRoomsOptions {
  filter?: RoomFilter;
  searchQuery?: string;
  includeArchived?: boolean;
  limit?: number;
}

export function useMyRooms(options?: UseMyRoomsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    filter = "all",
    searchQuery = "",
    includeArchived = false,
    limit = 10,
  } = options || {};

  const isSearching = !!searchQuery.trim();

  // Shared query — all non-search callers share this cache
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: [MY_ROOMS_KEY, user?.id],
    queryFn: () => fetchRoomsForUser(user!.id),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  // Search query — separate cache, only active when searching
  const { data: searchRooms = [], isLoading: searchLoading } = useQuery({
    queryKey: [MY_ROOMS_SEARCH_KEY, user?.id],
    queryFn: () => fetchRoomsForUser(user!.id, { includeArchived: true, maxLimit: 200 }),
    enabled: !!user && isSearching,
    staleTime: 10_000,
  });

  // Friend IDs — shared across all hook instances
  const { data: friendIds = [] } = useQuery({
    queryKey: [FRIEND_IDS_KEY, user?.id],
    queryFn: () => fetchFriendIdsForUser(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const activeRooms = isSearching ? searchRooms : rooms;
  const loading = isSearching ? searchLoading : isLoading;

  // Shared realtime subscription (ref-counted singleton)
  const subscribedRef = useRef(false);
  useEffect(() => {
    if (!user) return;

    subscribeToRoomChanges(queryClient);
    subscribedRef.current = true;

    return () => {
      if (subscribedRef.current) {
        unsubscribeFromRoomChanges();
        subscribedRef.current = false;
      }
    };
  }, [user, queryClient]);

  // Client-side filtering and sorting
  const filteredRooms = useMemo(() => {
    let result = activeRooms;

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
        result = result.filter((room) => room.has_recent_activity);
        break;
      case "completed":
        result = result.filter((room) => room.status === "completed");
        break;
    }

    // Apply search
    //
    // Through matchesQuery, so a Georgian room name is reachable from a Latin
    // keyboard: "ზეიმის მოედანი" answers to `zeimis moedani` and to `ze`. This
    // was a raw `includes`, which meant the name had to be typed in the script
    // it was saved in — and most people search a Georgian name in Latin.
    if (searchQuery.trim()) {
      result = result.filter((room) =>
        matchesQuery(searchQuery, [room.room_name, room.category_name, room.room_code])
      );
    }

    // Newest first, full stop.
    //
    // This used to be five priority classes deep — my-new-room, LIVE, unread,
    // waiting-over-completed, then activity — and a room only counted as "my
    // new room" for five minutes. After that a freshly made room fell back
    // into the pile and any LIVE or unread room outranked it, so the room you
    // had just created moved somewhere down the list and looked lost. One rule
    // keeps it findable: whatever happened most recently sits at the top, and
    // creating a room is the most recent thing that can happen to one.
    //
    // A live TV session is the exception, and only because its row's activity
    // timestamp does not tick while the TV plays — without the pin it would
    // sink during the session it is running.
    result = [...result].sort((a, b) =>
      compareRooms(
        { ...a, hasLiveTV: isActiveTVSession(a.tv_status) },
        { ...b, hasLiveTV: isActiveTVSession(b.tv_status) }
      )
    );

    return result;
  }, [activeRooms, filter, friendIds, searchQuery]);

  return {
    rooms: filteredRooms.slice(0, limit),
    loading,
    refreshRooms: () => queryClient.invalidateQueries({ queryKey: [MY_ROOMS_KEY] }),
    filter,
  };
}
