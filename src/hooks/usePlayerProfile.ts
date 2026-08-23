import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_SELECT_COLUMNS } from "@/integrations/supabase/profileColumns";
import { localizeCategoryNames } from "@/utils/localizeCategories";
import { useAuth } from "@/contexts/AuthContext";

export interface InteractionLogItem {
  id: string;
  type: 'invitation_sent' | 'invitation_received' | 'room_together' | 'chat';
  message: string;
  details?: string;
  timestamp: string;
  roomId?: string;
  categoryName?: string;
}

export interface HeadToHead {
  matchesTogether: number;
  myWins: number;
  theirWins: number;
  draws: number;
}

export interface Specialty {
  categoryId: string;
  slug: string;
  /** Already in the reader's language. */
  name: string;
  iconSlug: string | null;
  totalAnswers: number;
  /** 0–1. */
  accuracy: number;
}

/** The three things the Info tab says about a player. */
export interface PlayerFacts {
  /** Questions answered across every category. */
  answered: number;
  correct: number;
  /** 0–1 across everything, or null for a player who has answered nothing. */
  accuracy: number | null;
  /** Their strongest category, over enough answers to mean something. */
  specialty: Specialty | null;
}

export interface PlayerProfileData {
  profile: {
    id: string;
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    animated_avatar_url: string | null;
    country_code: string | null;
    total_points: number | null;
    games_played: number | null;
    games_won: number | null;
    best_streak: number | null;
    current_streak: number | null;
    coins: number;
    gems: number;
  } | null;
  achievements: Array<{
    id: string;
    achievement_id: string;
    unlocked_at: string;
  }>;
  trivias: Array<{
    id: string;
    title: string;
    description: string | null;
    cover_image: string | null;
    icon_slug: string | null;
    plays_count: number | null;
    likes_count: number | null;
    created_at: string | null;
  }>;
  collections: Array<{
    id: string;
    title: string;
    description: string | null;
    cover_image: string | null;
    cover_gradient: string;
    plays_count: number | null;
    likes_count: number | null;
  }>;
  interactions: InteractionLogItem[];
  /**
   * The record between the viewer and this player.
   *
   * A win is the higher score in a match you both played — the same rule for
   * a duel and for a room of eight, because placing above someone is beating
   * them. Null while it loads, and on your own profile, where there is no
   * "against".
   */
  headToHead: HeadToHead | null;
  /** Questions answered, success rate, and what they are best at. */
  facts: PlayerFacts | null;
  stats: {
    totalPoints: number;
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    bestStreak: number;
  };
  isFriend: boolean;
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'sent';
  friendshipId: string | null;
  isCurrentUser: boolean;
}

type CoreProfile = Pick<PlayerProfileData, "profile" | "stats">;
type ProfileExtras = Pick<
  PlayerProfileData,
  "achievements" | "trivias" | "collections" | "interactions" | "isFriend" | "friendshipStatus" | "friendshipId"
>;

const EMPTY_EXTRAS: ProfileExtras = {
  achievements: [],
  trivias: [],
  collections: [],
  interactions: [],
  isFriend: false,
  friendshipStatus: 'none',
  friendshipId: null,
};

// ---- Phase 1: the profile row. One round-trip, renders the whole header ----
async function fetchCore(userId: string): Promise<CoreProfile> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("user_id", userId)
    .single();

  if (error) throw error;

  // Explicit-column select degrades the inferred type to a generic
  const profileTyped = profile as unknown as PlayerProfileData["profile"] & {
    games_played?: number; games_won?: number; total_points?: number; best_streak?: number;
  };

  const gamesPlayed = profileTyped?.games_played || 0;
  const gamesWon = profileTyped?.games_won || 0;

  return {
    profile: profileTyped,
    stats: {
      totalPoints: profileTyped?.total_points || 0,
      gamesPlayed,
      gamesWon,
      winRate: gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0,
      bestStreak: profileTyped?.best_streak || 0,
    },
  };
}

/**
 * The functions behind the Info tab. Called through a cast because they are
 * not in the generated types — those are regenerated from a database, and
 * doing that here is how six other functions once vanished (CLAUDE.md rule 1).
 * Both are SECURITY DEFINER and read rows that are not the caller's own;
 * head_to_head_record takes only the other player, never both sides, so the
 * "me" half is always auth.uid().
 */
/**
 * Two things here are easy to get wrong, and both fail silently.
 *
 * `.bind(supabase)`: SupabaseClient.rpc runs `this.rest.rpc(...)`, so a bare
 * `const rpc = supabase.rpc` loses its receiver and throws "Cannot read
 * properties of undefined (reading 'rest')" on every call. The inline
 * `(supabase.rpc as ...)(args)` used elsewhere in this codebase keeps the
 * receiver — parenthesising a member expression does not detach it — which is
 * why only this copy was broken.
 *
 * `PromiseLike`, not `Promise`: a PostgrestBuilder defines `then` and nothing
 * else, so `.catch()` on the result is "not a function" rather than a
 * fallback. Typing it as a Promise made that compile.
 *
 * Between them the panel rendered nothing on a profile with 170 shared
 * matches behind it — and because both throw before any await, it looked
 * exactly like having no record rather than like an error.
 */
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: unknown }>;

/** One row set, or null if the call failed for any reason. */
async function rpcRows<T>(fn: string, args: Record<string, unknown>): Promise<T[] | null> {
  try {
    const { data, error } = await rpc(fn, args);
    if (error) {
      console.warn(`[profile] ${fn} failed`, error);
      return null;
    }
    return (data as T[] | null) ?? null;
  } catch (err) {
    console.warn(`[profile] ${fn} threw`, err);
    return null;
  }
}

interface HeadToHeadRow {
  matches_together: number | string;
  my_wins: number | string;
  their_wins: number | string;
  draws: number | string;
}

interface FactsRow {
  answered: number | string;
  correct: number | string;
  accuracy: number | string | null;
  best_category_id: string | null;
  best_category_slug: string | null;
  best_category_name: string | null;
  best_icon_slug: string | null;
  best_answered: number | null;
  best_accuracy: number | string | null;
}

/** Postgres bigint and numeric arrive as strings over PostgREST. */
const num = (v: number | string | null | undefined): number => Number(v ?? 0) || 0;

async function fetchVersus(
  userId: string,
  viewerId: string | undefined,
): Promise<{ headToHead: HeadToHead | null; facts: PlayerFacts | null }> {
  const isOther = !!viewerId && viewerId !== userId;

  const [h2hRows, factsRows] = await Promise.all([
    isOther
      ? rpcRows<HeadToHeadRow>("head_to_head_record", { p_other_user_id: userId })
      : Promise.resolve(null),
    rpcRows<FactsRow>("player_profile_facts", { p_user_id: userId }),
  ]);

  // Both return SETOF, so a row array — empty when there is nothing to say.
  const h2hRow = h2hRows?.[0];
  const factsRow = factsRows?.[0];

  const headToHead: HeadToHead | null = h2hRow
    ? {
        matchesTogether: num(h2hRow.matches_together),
        myWins: num(h2hRow.my_wins),
        theirWins: num(h2hRow.their_wins),
        draws: num(h2hRow.draws),
      }
    : null;

  let facts: PlayerFacts | null = null;
  if (factsRow) {
    let specialty: Specialty | null = null;
    if (factsRow.best_category_id && factsRow.best_category_name) {
      // categories.name is Georgian for every row; the reader's language
      // lives in category_translations, keyed by the category UUID.
      const [localized] = await localizeCategoryNames([
        { id: factsRow.best_category_id, name: factsRow.best_category_name },
      ]);
      specialty = {
        categoryId: factsRow.best_category_id,
        slug: factsRow.best_category_slug ?? "",
        name: localized?.name ?? factsRow.best_category_name,
        iconSlug: factsRow.best_icon_slug,
        totalAnswers: num(factsRow.best_answered),
        accuracy: num(factsRow.best_accuracy),
      };
    }
    facts = {
      answered: num(factsRow.answered),
      correct: num(factsRow.correct),
      // null, not 0: "no rate yet" and "gets everything wrong" are different.
      accuracy: factsRow.accuracy === null ? null : num(factsRow.accuracy),
      specialty,
    };
  }

  return { headToHead, facts };
}

// ---- Phase 2: content, friendship and shared history, all concurrent ----
async function fetchExtras(userId: string, viewerId: string | undefined): Promise<ProfileExtras> {
  const achievementsQ = supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  const triviasQ = supabase
    .from("user_quiz_posts")
    .select("id, title, description, cover_image, icon_slug, plays_count, likes_count, created_at")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(10);

  const collectionsQ = supabase
    .from("quiz_collections")
    .select("id, title, description, cover_image, cover_gradient, plays_count, likes_count")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(10);

  const friendshipP = (async () => {
    if (!viewerId || viewerId === userId) return null;
    const { data: friendship } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(user_id.eq.${viewerId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${viewerId})`)
      .maybeSingle();
    return friendship;
  })();

  const interactionsP = (async (): Promise<InteractionLogItem[]> => {
    if (!viewerId || viewerId === userId) return [];
    const interactions: InteractionLogItem[] = [];

    // Invitations and shared rooms are independent — run both at once
    const [{ data: invitations }, { data: sharedRooms }] = await Promise.all([
      supabase
        .from("game_invitations")
        .select("id, sender_id, receiver_id, status, created_at, room:game_rooms(category_name)")
        .or(`and(sender_id.eq.${viewerId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${viewerId})`)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("room_participants")
        .select("room_id, joined_at")
        .eq("user_id", userId),
    ]);

    if (invitations) {
      for (const inv of invitations) {
        const isSender = inv.sender_id === viewerId;
        const categoryName = (inv.room as any)?.category_name;
        interactions.push({
          id: inv.id,
          type: isSender ? 'invitation_sent' : 'invitation_received',
          message: isSender ? 'activityYouInvited' : 'activityInvitedToGame',
          details: categoryName || undefined,
          timestamp: inv.created_at,
          categoryName,
        });
      }
    }

    if (sharedRooms && sharedRooms.length > 0) {
      const roomIds = sharedRooms.map(r => r.room_id);
      const { data: myRooms } = await supabase
        .from("room_participants")
        .select("room_id, joined_at, room:game_rooms(category_name, room_name)")
        .eq("user_id", viewerId)
        .in("room_id", roomIds)
        .order("joined_at", { ascending: false })
        .limit(5);

      if (myRooms) {
        for (const r of myRooms) {
          const room = r.room as any;
          interactions.push({
            id: `room-${r.room_id}`,
            type: 'room_together',
            message: 'activityPlayedTogether',
            details: room?.category_name || room?.room_name || undefined,
            timestamp: r.joined_at,
            roomId: r.room_id,
            categoryName: room?.category_name,
          });
        }
      }
    }

    interactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return interactions;
  })();

  const [{ data: achievements }, { data: trivias }, { data: collections }, friendship, interactions] =
    await Promise.all([achievementsQ, triviasQ, collectionsQ, friendshipP, interactionsP]);

  let friendshipStatus: PlayerProfileData["friendshipStatus"] = 'none';
  let friendshipId: string | null = null;
  let isFriend = false;
  if (friendship) {
    friendshipId = friendship.id;
    if (friendship.status === 'accepted') {
      friendshipStatus = 'accepted';
      isFriend = true;
    } else if (friendship.status === 'pending') {
      friendshipStatus = friendship.user_id === viewerId ? 'sent' : 'pending';
    }
  }

  return {
    achievements: achievements || [],
    trivias: trivias || [],
    collections: collections || [],
    interactions: interactions.slice(0, 10),
    isFriend,
    friendshipStatus,
    friendshipId,
  };
}

/**
 * Profile data for the player-profile modal.
 *
 * Cached per user through React Query, so reopening a profile paints from
 * cache with no loading state at all — the skeleton only ever appears the
 * first time a given player is opened. Splitting core (the profile row,
 * one round-trip) from extras (content + friendship + shared history, all
 * concurrent) means the header shows as soon as the fast query lands.
 * Keys include the user id, so one player's data can never render under
 * another's name.
 */
export function usePlayerProfile(userId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const viewerId = user?.id;

  const coreQuery = useQuery({
    queryKey: ["player-profile-core", userId],
    queryFn: () => fetchCore(userId!),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });

  // Friendship and shared history depend on who is looking
  const extrasQuery = useQuery({
    queryKey: ["player-profile-extras", userId, viewerId ?? null],
    queryFn: () => fetchExtras(userId!, viewerId),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });

  // The record between the two of you, and what they are best at. Its own
  // query so the header and content never wait on it — it is the slowest of
  // the three (two functions, one of which scans the shared match history).
  const versusQuery = useQuery({
    queryKey: ["player-profile-versus", userId, viewerId ?? null],
    queryFn: () => fetchVersus(userId!, viewerId),
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  });

  const core = coreQuery.data;
  const data: PlayerProfileData | null = core
    ? {
        ...core,
        ...(extrasQuery.data ?? EMPTY_EXTRAS),
        headToHead: versusQuery.data?.headToHead ?? null,
        facts: versusQuery.data?.facts ?? null,
        isCurrentUser: !!viewerId && viewerId === userId,
      }
    : null;

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["player-profile-core", userId] });
    queryClient.invalidateQueries({ queryKey: ["player-profile-extras", userId] });
    queryClient.invalidateQueries({ queryKey: ["player-profile-versus", userId] });
  }, [queryClient, userId]);

  return {
    data,
    // isLoading is false whenever cached data exists, so a revisit never
    // flashes the skeleton
    loading: !!userId && coreQuery.isLoading,
    error: (coreQuery.error as Error | null) ?? null,
    refetch,
  };
}
