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
  /** Whether a knock waits on the host (Ask-me) or seats at once. Absent
   *  until 20261106100000 is applied; the card then cannot tell. */
  requires_approval?: boolean;
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
  /**
   * Every round the room plays, in order — what the card's "+2" counts and
   * what tapping it lists.
   *
   * Comes from the RPC rather than from room_category_queue, whose only
   * SELECT policy is "Participants can view queue": a stranger reading the
   * Public tab cannot see the table, and public_rooms is SECURITY DEFINER so
   * that it can answer for a room that advertises itself.
   */
  rounds: RoomRound[];
  /** Questions in each of them. Null on a room that brings its own trivia. */
  total_questions: number | null;
}

/** One round on a room card: what it plays and the face it wears. */
export interface RoomRound {
  name: string | null;
  icon_slug: string | null;
  source_type: string;
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
  /** Rooms somebody asked this player into and has not been answered. */
  invitedIds?: ReadonlySet<string>;
}

export const PUBLIC_ROOMS_KEY = ["public-rooms"] as const;

/**
 * Ask the database to close every public room that is over (the rule is
 * `public_room_is_over`, 20261102130000). Returns how many it closed.
 *
 * Typed by hand rather than through the generated types, as the pot RPC
 * is: the migration reaches the project by hand after the merge, and until
 * it does PostgREST answers PGRST202, which is nothing to do — the listing
 * still filters what it can and the client rules still hold.
 */
export async function sweepEndedPublicRooms(): Promise<number> {
  const client = supabase as unknown as {
    rpc: (fn: string) => Promise<{ data: number | null; error: { message: string; code?: string } | null }>;
  };
  try {
    const { data, error } = await client.rpc("sweep_ended_public_rooms");
    if (error) return 0;
    return data ?? 0;
  } catch {
    return 0;
  }
}

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
      // Close what is over before reading what is open. A public room is
      // made for one play; an hour after its last round with nobody back
      // for a rematch it is closed — cancelled and archived — by the
      // database, and this tab is where that is asked for, so the list is
      // swept as often as it is read. Fire-and-forget would race the read
      // below; awaited, the list that follows is already clean.
      await sweepEndedPublicRooms();
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
      // `rounds` arrives as jsonb and is absent entirely until the
      // migration that adds it is applied by hand (CLAUDE.md 4a). Until
      // then the row still names its FIRST round (first_category_name, the
      // one the card has always shown), so that is the list: one round,
      // rather than a sheet that says the host picked nothing under a card
      // that says "Random" (owner: "why modal shows host didn't pick
      // anything - when host picked 5 random categories").
      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        rounds: Array.isArray(row.rounds)
          ? (row.rounds as RoomRound[])
          : row.first_category_name
            ? [{ name: row.first_category_name as string, icon_slug: (row.first_category_icon as string | null) ?? null, source_type: "category" }]
            : [],
        total_questions: typeof row.total_questions === "number" ? row.total_questions : null,
      })) as unknown as PublicRoom[];
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

/**
 * A room I made that nothing has happened in.
 *
 * You can reach the online page having created a room without meaning to:
 * tap a game, back out before inviting anyone or picking a category, and the
 * room exists. It should lead the list while it is warm — you may be about to
 * go back to it, and it is the one card on the page you can do anything with.
 *
 * But only while it is warm. The owner's rule: if nothing happens in it in
 * ten minutes, other rooms are the better cards and it stops leading. Not
 * hidden — it drops to just above the rooms whose couch has closed the app,
 * where a room nobody has touched belongs.
 *
 * "Touched" is somebody other than me being in it. Not the category: a host
 * who picked one and then left is exactly the case this is for.
 */
export const isFreshOwnRoom = (room: PublicRoom, now = Date.now()): boolean =>
  room.my_state === "host" && isRoomStampFresh(room.last_activity_at ?? room.created_at, now);

/**
 * How long the ring on a room you just made stays up.
 *
 * It is a greeting, not a status. Long enough to catch the eye of somebody
 * who has just pressed back and is looking for their room; short enough that
 * it never becomes part of how the card looks (owner's ask). The card keeps
 * its place at the top of the list for the full ten minutes either way — the
 * ring answers "which one", the position answers "what should I do next",
 * and they are different questions with different lifespans.
 *
 * Here rather than in either section because both tabs ring the same room:
 * a host sent back from the lobby lands on whichever tab their room is
 * listed under, and a ring that outlasted the other one on the tab next
 * door would just be a bug nobody could see twice.
 */
export const FRESH_RING_MS = 3000;

/**
 * The clock half of the rule above, on its own.
 *
 * The Private tab tells "mine" apart by `is_host` rather than `my_state`, so
 * it cannot call isFreshOwnRoom — but the room it rings is the same room, and
 * a second copy of this arithmetic would be a second answer to "how new is
 * new" waiting to drift from this one.
 */
export const isRoomStampFresh = (stamp: string | null | undefined, now = Date.now()): boolean => {
  const at = stamp ? Date.parse(stamp) : NaN;
  if (!Number.isFinite(at)) return false;
  // Absolute, so a device clock ahead of the server's cannot keep a
  // week-old room pinned to the top of somebody's page forever.
  return Math.abs(now - at) < JUST_CREATED_MS;
};

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
  /** Mine, made minutes ago, and still nobody in it but me. */
  const freshEmptyOwn = (r: PublicRoom) => r.player_count <= 1 && isFreshOwnRoom(r);
  /** Mine, nobody ever came, and it has gone cold. */
  const staleEmptyOwn = (r: PublicRoom) =>
    r.my_state === "host" && r.player_count <= 1 && !isFreshOwnRoom(r);
  const tier = (r: PublicRoom) =>
    // An invitation first: somebody is waiting on this player's answer,
    // and a card that scrolls away is an answer that never comes (owner:
    // "show rooms with invitation first to see and don't lose in scroll").
    ctx?.invitedIds?.has(r.id)
      ? -1
      : // Checked before `dead`: my own ask stays the first card even if the
        // room's couch stepped away while I was waiting on the answer.
        r.my_state === "pending"
      ? 0
      : dead(r)
        ? 9
        : // A room I just made and nobody has walked into yet: the card I am
          // most likely to be looking for, and the only one on the page I can
          // do anything with. It wears the ring that says so.
          freshEmptyOwn(r)
          ? 1
          : // The same room once it has gone cold. Other rooms are better
            // cards than an empty one nobody came to (owner's rule), so it
            // sinks below all of them — but stays above the ones whose couch
            // has closed the app.
            staleEmptyOwn(r)
            ? 8
            : mine(r) && full(r)
              ? 2
              : mine(r)
                ? 3
                : justCreated(r)
                  ? 4
                  : r.player_count > 0
                    ? 5
                    : friendIds.has(r.host_user_id)
                      ? 6
                      : 7;
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
    // Tiers renumbered when my own fresh room took the top: the "just
    // created" band is 4 and the filling one 5.
    if (tier(a) === 4) {
      const d = born(b) - born(a);
      if (d !== 0) return d;
    }
    if (tier(a) === 5) {
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

/**
 * A public room whose game is over and nothing is queued to play next.
 *
 * Every path that ends a round hands the room back to "waiting" — the way
 * the lobby is reached again — and a public room in "waiting" is listed.
 * So a room that had just been played sat on the Public tab looking like
 * an open game, and whoever walked in found an empty, locked lobby with
 * nothing to play (owner: "after game ends we show ended public game room
 * in list and when players re-enter they see empty room with no ability
 * to be modified ... remove and don't show ended games room on public
 * list, leave in private though").
 *
 * The listing carries no round history, so "played" is read off the two
 * stamps it does carry: a round's start and its end write last_activity_at
 * (roomStale), and a room that was never played still has it at creation.
 * A room with a category, or a queued round, is a room with something to
 * play and stays — that is what a rematch looks like.
 */
export function isEndedPublicRoom(room: {
  status: string;
  first_category_name: string | null;
  created_at: string | null;
  last_activity_at: string | null;
}): boolean {
  if (room.status !== "waiting") return false;
  if (room.first_category_name) return false;
  if (!room.created_at || !room.last_activity_at) return false;
  const born = Date.parse(room.created_at);
  const touched = Date.parse(room.last_activity_at);
  if (Number.isNaN(born) || Number.isNaN(touched)) return false;
  return touched - born > 60_000;
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
    // Played, and nothing left to play: over, whatever its status says.
    if (isEndedPublicRoom(room)) return false;
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
