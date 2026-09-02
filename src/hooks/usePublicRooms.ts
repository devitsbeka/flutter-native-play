import { routeForRoom } from "@/utils/roomRoutes";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { matchesQuery } from "@/utils/searchMatch";

/**
 * The rooms anyone may find.
 *
 * One RPC for the whole tab rather than the four queries the games list
 * makes: the seat count and the first round's category are the two things a
 * card is really for, and assembled client-side they were the last two
 * things to arrive — a card that says "0 players" for half a second and then
 * corrects itself reads as a broken room, not a loading one.
 */
export interface PublicRoom {
  id: string;
  room_code: string;
  room_name: string | null;
  room_icon: string | null;
  game_type_key: string | null;
  /** Words rooms carry their kind here when the catalog key is not set. */
  game_mode: string | null;
  status: string;
  created_at: string | null;
  last_activity_at: string | null;
  host_user_id: string;
  host_nickname: string | null;
  host_avatar_url: string | null;
  player_count: number;
  max_players: number | null;
  /** The round this room plays next: the head of its queue, else its own. */
  first_category_name: string | null;
  first_category_icon: string | null;
  /** Where the viewer stands with this room. */
  my_state: "host" | "joined" | "pending" | "approved" | "declined" | "none";
}

/**
 * The Public tab's four filters — the owner's list, in the owner's order:
 * active (somebody in it is in the app right now), my rooms, my friends'
 * rooms, all. Not by game: which game a card plays is written on it.
 */
export type PublicRoomFilter = "all" | "active" | "my_rooms" | "friends_rooms";

/** What the filters need to know beyond the room row itself. */
export interface PublicRoomContext {
  /** Everyone seated in each room, keyed by room id. The host is a seat too. */
  seatedByRoom: ReadonlyMap<string, readonly string[]>;
  /** Who, of all those people, is in the app right now. */
  onlineIds: ReadonlySet<string>;
  friendIds: ReadonlySet<string>;
}

export const PUBLIC_ROOMS_KEY = ["public-rooms"] as const;

export function usePublicRooms(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = (options?.enabled ?? true) && !!user;

  const query = useQuery({
    queryKey: PUBLIC_ROOMS_KEY,
    enabled,
    // A public list is other people's activity: it is stale the moment it
    // lands, and nobody taps refresh on a room list.
    refetchInterval: enabled ? 25_000 : false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
    queryFn: async (): Promise<PublicRoom[]> => {
      const { data, error } = await supabase.rpc("public_rooms", { p_limit: 60 });
      if (error) {
        // The migration is applied by hand after the merge, so for a while
        // the app knows this function and the database does not. An empty
        // list reads as "nobody has published a room yet", which is both
        // true at that moment and the thing the empty state already
        // explains — better than a tab stuck on skeletons.
        if (error.code === "PGRST202" || /function .*public_rooms/i.test(error.message ?? "")) {
          return [];
        }
        throw error;
      }
      return (data ?? []) as unknown as PublicRoom[];
    },
  });

  /**
   * The host's answer, the moment they give it.
   *
   * Without this the card that said "waiting" kept saying it until the next
   * poll, so the approval arrived as a notification while the button in
   * front of the player still refused to move.
   */
  useEffect(() => {
    if (!user || !enabled) return;
    const channel = supabase
      .channel(`join-requests-mine-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_join_requests",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: PUBLIC_ROOMS_KEY });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, enabled, queryClient]);

  return query;
}

/** Where a room card leads, which is not the same route for every game. */
export function publicRoomPath(room: Pick<PublicRoom, "game_type_key" | "game_mode" | "room_code">): string {
  return routeForRoom(room);
}

/**
 * How many seats a room has.
 *
 * The lounges are the ones this matters for — their whole card is "is there
 * room for me on that couch" — and both were built around ten human seats
 * even though the King's row carries eleven (the King himself takes one).
 */
export function roomSeats(room: Pick<PublicRoom, "game_type_key" | "max_players">): number | null {
  if (room.game_type_key === "king") {
    return 10;
  }
  // Battle rooms come in sizes now (2-2 up to 5-5) — max_players carries it.
  if (room.game_type_key === "team_battle") {
    return room.max_players ?? 10;
  }
  return room.max_players ?? null;
}

/**
 * The Public tab's order — the owner's priorities: get people into a game
 * quickly, and lose no room.
 *
 * First, a room I'm in whose every seat is taken: it is ready to play and
 * I am one of the players, so nothing on this tab matters more. Then the
 * room I'm WAITING on (one game at a time — that ask is the thing I'm
 * doing), then my other rooms (hosted, and ones I sit in), then my
 * friends' rooms, then everyone else's. Within each group, the room
 * closest to filling comes first — a couch needing one more player starts
 * sooner than one waiting on eight — with full rooms (nothing to join) and
 * un-capped rooms after, newest first as the tie-break.
 */
export function sortPublicRooms(
  rooms: PublicRoom[],
  friendIds: ReadonlySet<string>,
): PublicRoom[] {
  const mine = (r: PublicRoom) => r.my_state === "host" || r.my_state === "joined";
  const full = (r: PublicRoom) => {
    const seats = roomSeats(r);
    return seats != null && r.player_count >= seats;
  };
  const tier = (r: PublicRoom) =>
    mine(r) && full(r)
      ? 0
      : r.my_state === "pending"
        ? 1
        : mine(r)
          ? 2
          : friendIds.has(r.host_user_id)
            ? 3
            : 4;
  const remaining = (r: PublicRoom) => {
    const seats = roomSeats(r);
    if (seats == null) return 98;
    const open = seats - r.player_count;
    return open > 0 ? open : 99;
  };
  const born = (r: PublicRoom) =>
    new Date(r.created_at ?? r.last_activity_at ?? 0).getTime();
  return [...rooms].sort(
    (a, b) => tier(a) - tier(b) || remaining(a) - remaining(b) || born(b) - born(a),
  );
}

export function filterPublicRooms(
  rooms: PublicRoom[],
  filter: PublicRoomFilter,
  searchQuery: string,
  ctx?: PublicRoomContext,
): PublicRoom[] {
  return rooms.filter((room) => {
    // Versus King is friends-only: its lounges are never listed, even when
    // an older build managed to publish one.
    if (room.game_type_key === "king") return false;
    // A game that has started is not a room to join: its card said
    // "waiting" over a match already running. Only rooms whose host has
    // not pressed Start are listed; a started room stays on the Private
    // tab for its own players — the replay, the scores.
    if (room.status !== "waiting") return false;
    // "My rooms" is the ones I created, as on the Private tab — a room I
    // merely sit in is somebody else's.
    if (filter === "my_rooms" && room.my_state !== "host") return false;
    if (filter === "friends_rooms" && !ctx?.friendIds.has(room.host_user_id)) return false;
    // "Active" is a room with a live person in it: the host or anyone seated
    // whose heartbeat is inside the online window. A room whose whole couch
    // has closed the app is a room you will wait in alone.
    if (filter === "active") {
      const seated = ctx?.seatedByRoom.get(room.id) ?? [];
      const people = seated.includes(room.host_user_id) ? seated : [room.host_user_id, ...seated];
      if (!people.some((id) => ctx?.onlineIds.has(id))) return false;
    }
    return matchesQuery(searchQuery, [
      room.room_name,
      room.first_category_name,
      room.host_nickname,
    ]);
  });
}
