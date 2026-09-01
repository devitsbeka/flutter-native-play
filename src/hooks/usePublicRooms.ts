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

export type PublicRoomFilter = "all" | "king" | "team_battle" | "classic";

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
  if (room.game_type_key === "king" || room.game_type_key === "team_battle") {
    return 10;
  }
  return room.max_players ?? null;
}

export function filterPublicRooms(
  rooms: PublicRoom[],
  filter: PublicRoomFilter,
  searchQuery: string,
): PublicRoom[] {
  return rooms.filter((room) => {
    // Versus King is friends-only: its lounges are never listed, even when
    // an older build managed to publish one. (The "king" chip is gone from
    // the filter bar; a stale value simply finds nothing.)
    if (room.game_type_key === "king" || filter === "king") return false;
    if (filter === "team_battle" && room.game_type_key !== "team_battle") return false;
    if (filter === "classic" && room.game_type_key) return false;
    return matchesQuery(searchQuery, [
      room.room_name,
      room.first_category_name,
      room.host_nickname,
    ]);
  });
}
