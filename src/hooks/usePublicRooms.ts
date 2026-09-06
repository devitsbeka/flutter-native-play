import { routeForRoom } from "@/utils/roomRoutes";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { matchesQuery } from "@/utils/searchMatch";
import { isDeveloperOnlyGameType } from "@/game-types/registry";

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
export type PublicRoomFilter =
  | "all"
  | "active"
  | "my_rooms"
  | "friends_rooms"
  // By game (owner's ask): the Battle arenas, and the ordinary rooms.
  | "battles"
  | "rooms";

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
 * The room I ASKED to join is the first card, always: I am waiting on that
 * host's answer, it is the one thing I am doing on this tab, and the way
 * to take it back rides on that card. Then a room I'm in whose every seat
 * is taken (ready to play), my other rooms, my friends' rooms, everyone
 * else's — and a room whose whole couch has closed the app goes to the
 * very back whoever owns it. Within each group the room closest to filling
 * comes first: a couch needing one more player starts sooner than one
 * waiting on eight, with full rooms and un-capped rooms after, newest
 * first as the tie-break.
 */
/**
 * How new a room has to be to lead the list.
 *
 * Long enough to cover a host who made a room and is deciding on a category,
 * short enough that "just created" still means somebody is in there.
 */
export const JUST_CREATED_MS = 10 * 60 * 1000;

export function sortPublicRooms(
  rooms: PublicRoom[],
  friendIds: ReadonlySet<string>,
  ctx?: PublicRoomContext,
): PublicRoom[] {
  const mine = (r: PublicRoom) => r.my_state === "host" || r.my_state === "joined";
  const full = (r: PublicRoom) => {
    const seats = roomSeats(r);
    return seats != null && r.player_count >= seats;
  };
  // A room whose whole couch has closed the app is a room you will wait in
  // alone — it goes to the very back, never first (owner's rule: we need
  // ONLINE players in rooms to play). The viewer counts as online, so
  // their own rooms never sink on them.
  const dead = (r: PublicRoom) => {
    if (!ctx) return false;
    const seated = ctx.seatedByRoom.get(r.id) ?? [];
    const people = seated.includes(r.host_user_id) ? seated : [r.host_user_id, ...seated];
    return !people.some((id) => ctx.onlineIds.has(id));
  };
  /** New enough that its host is almost certainly still sitting in it. */
  const justCreated = (r: PublicRoom) => {
    const born = r.created_at ? Date.parse(r.created_at) : NaN;
    // Absolute, so a device clock that disagrees with the server's cannot
    // promote an old room to the top of the page.
    return Number.isFinite(born) && Math.abs(Date.now() - born) < JUST_CREATED_MS;
  };

  // The owner's order for somebody else's rooms: just created, then filling
  // up with a live person in it, then a friend's.
  //
  // Newest first because a room made a minute ago is a person waiting in it
  // right now — the most joinable thing on the page, and the host will still
  // be there when you arrive. Filling-and-live next because once a room is
  // no longer new, what makes it worth joining is that a game is about to
  // happen: seats taken AND somebody actually in the app, since four of ten
  // seats with nobody online is not close to starting. A friend's room sits
  // below both — an empty stale room is still empty even when a friend made
  // it — but above strangers', because who you play with matters more than
  // a stranger's fuller couch.
  const tier = (r: PublicRoom) =>
    // Checked before `dead`: my own ask stays the first card even if the
    // room's couch stepped away while I was waiting on the answer.
    r.my_state === "pending"
      ? 0
      : dead(r)
        ? 9
        : mine(r) && full(r)
          ? 1
          : mine(r)
            ? 2
            : justCreated(r)
              ? 3
              : r.player_count > 0
                ? 4
                : friendIds.has(r.host_user_id)
                  ? 5
                  : 6;
  const remaining = (r: PublicRoom) => {
    const seats = roomSeats(r);
    if (seats == null) return 98;
    const open = seats - r.player_count;
    return open > 0 ? open : 99;
  };
  const born = (r: PublicRoom) =>
    new Date(r.created_at ?? r.last_activity_at ?? 0).getTime();
  /** 0..1, so a 4/6 room outranks a 4/10 one. */
  const fullness = (r: PublicRoom) => {
    const seats = roomSeats(r);
    return seats && seats > 0 ? Math.min(1, r.player_count / seats) : 0;
  };
  return [...rooms].sort((a, b) => {
    const t = tier(a) - tier(b);
    if (t !== 0) return t;
    // The tie-break answers the same question the tier does: newest among
    // the new ones, fullest among the filling ones. Ordering the "just
    // created" band by open seats would have put a fresh empty room below a
    // fresh half-full one, which is the opposite of what that band is for.
    if (tier(a) === 3) {
      const d = born(b) - born(a);
      if (d !== 0) return d;
    }
    if (tier(a) === 4) {
      // A full couch has no seat for you, so "most full" stops one short of
      // full: joinable rooms first, fullest of those at the front, and a
      // 10/10 room behind all of them. Sorting on fullness alone would have
      // put the one room you cannot enter at the top of the band.
      const shut = Number(full(a)) - Number(full(b));
      if (shut !== 0) return shut;
      const d = fullness(b) - fullness(a);
      if (d !== 0) return d;
    }
    return remaining(a) - remaining(b) || born(b) - born(a);
  });
}

export function filterPublicRooms(
  rooms: PublicRoom[],
  filter: PublicRoomFilter,
  searchQuery: string,
  ctx?: PublicRoomContext,
  /**
   * An admin with developer mode on sees the unreleased modes' rooms. It
   * defaults to off, so a caller that forgets it hides them — the safe way
   * round for a mode that is not released.
   */
  developerMode = false,
): PublicRoom[] {
  return rooms.filter((room) => {
    // Versus King is friends-only: its lounges are never listed, even when
    // an older build managed to publish one.
    if (room.game_type_key === "king") return false;
    // Nor is an unreleased mode's arena, unless the viewer is the admin who
    // can see the mode at all. Hiding the filter chip is not enough on its
    // own: "all" would still list the rooms behind it.
    if (!developerMode && isDeveloperOnlyGameType(room.game_type_key)) return false;
    // A game that has started is not a room to join: its card said
    // "waiting" over a match already running. Only rooms whose host has
    // not pressed Start are listed; a started room stays on the Private
    // tab for its own players — the replay, the scores.
    if (room.status !== "waiting") return false;
    // "My rooms" is the ones I created, as on the Private tab — a room I
    // merely sit in is somebody else's.
    if (filter === "my_rooms" && room.my_state !== "host") return false;
    if (filter === "friends_rooms" && !ctx?.friendIds.has(room.host_user_id)) return false;
    // By game: "battles" is the Trivia Battle arenas; "rooms" is everything
    // that is not one — the classic rooms and the Words lounges.
    if (filter === "battles" && room.game_type_key !== "team_battle") return false;
    if (filter === "rooms" && room.game_type_key === "team_battle") return false;
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
