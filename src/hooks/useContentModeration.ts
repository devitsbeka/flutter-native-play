import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { t } from "@/utils/standaloneTranslation";

/**
 * Reporting and blocking for user-generated content.
 *
 * `user_reports` and `user_blocks` have existed in the schema, with correct
 * RLS and an admin review path, since early on. Nothing in the app ever wrote
 * to either — the same shape as the push tokens table: a complete backend
 * with no client.
 *
 * That is a submission blocker, not a nice-to-have. **App Store Guideline
 * 1.2 requires apps with user-generated content to provide a way to report
 * offensive content and to block abusive users**, and this app has a public
 * feed of player-made quizzes, creator profiles and comments. Reviewers look
 * for it specifically.
 *
 * Blocking is symmetric in effect but one-directional in storage: a row means
 * "blocker no longer sees blocked". RLS lets a user read rows naming them in
 * either column, so the app can also hide someone who blocked *them* —
 * without that, a block is only half a block: the blocker stops seeing the
 * abuser, and the abuser carries on inviting, friending and pushing.
 *
 * ## Why the block list lives in a module, not in each hook instance
 *
 * Every list that shows another player needs this, and each one calling
 * `useContentModeration()` used to mean its own query, its own `loading`
 * flag, and its own window in which the list renders unfiltered. The set is
 * one small row-per-block table read once per session, so it is fetched once
 * into a module-level store that every consumer subscribes to. Blocking
 * someone therefore removes them from every open list at once, and
 * `ensureBlocksLoaded()` gives non-React callers (the invitation hook, the
 * friend-request path) something to await before they decide.
 */

export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "cheating"
  | "other";

export const REPORT_REASONS: ReportReason[] = [
  "inappropriate",
  "harassment",
  "spam",
  "cheating",
  "other",
];

export interface BlockSnapshot {
  /** People the signed-in user has blocked. */
  blockedIds: Set<string>;
  /** People who have blocked the signed-in user. */
  blockedByIds: Set<string>;
  /** Either direction. This is the set every list should hide. */
  hiddenIds: Set<string>;
  /** True once a fetch has come back **successfully** for the current user. */
  loaded: boolean;
  loading: boolean;
}

/* -------------------------------------------------------------------------
 * Module-level store
 * ---------------------------------------------------------------------- */

const EMPTY = (): Set<string> => new Set<string>();

/** Nobody is signed in: nothing to load, and nothing to hide. */
const SIGNED_OUT: BlockSnapshot = {
  blockedIds: EMPTY(),
  blockedByIds: EMPTY(),
  hiddenIds: EMPTY(),
  loaded: true,
  loading: false,
};

let activeUserId: string | null = null;
let snapshot: BlockSnapshot = SIGNED_OUT;
let inflight: Promise<BlockSnapshot> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The current block state. Safe to call from anywhere, React or not. */
export function getBlockSnapshot(): BlockSnapshot {
  return snapshot;
}

function publish(next: {
  blockedIds: Set<string>;
  blockedByIds: Set<string>;
  loaded: boolean;
  loading: boolean;
}) {
  snapshot = {
    ...next,
    hiddenIds: new Set<string>([...next.blockedIds, ...next.blockedByIds]),
  };
  emit();
}

async function fetchBlocks(userId: string): Promise<BlockSnapshot> {
  // Both directions in one read: "Users can manage their blocks" covers the
  // rows where this user is the blocker, "Users can check if they are
  // blocked" covers the rows where they are the blocked. Both policies are
  // permissive, so the OR below returns exactly the union of the two.
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  // Somebody signed out (or in as someone else) while this was in flight.
  if (activeUserId !== userId) return snapshot;

  if (error) {
    console.error("[moderation] Could not load blocks:", error);
    // `loaded` deliberately stays false: callers that must fail closed need
    // to be able to tell "no blocks" from "we do not know yet".
    publish({
      blockedIds: snapshot.blockedIds,
      blockedByIds: snapshot.blockedByIds,
      loaded: snapshot.loaded,
      loading: false,
    });
    return snapshot;
  }

  const blockedIds = EMPTY();
  const blockedByIds = EMPTY();
  for (const row of data ?? []) {
    if (row.blocker_id === userId) blockedIds.add(row.blocked_id);
    if (row.blocked_id === userId) blockedByIds.add(row.blocker_id);
  }
  publish({ blockedIds, blockedByIds, loaded: true, loading: false });
  return snapshot;
}

function startLoad(userId: string): Promise<BlockSnapshot> {
  if (!inflight) {
    inflight = fetchBlocks(userId)
      .catch((error) => {
        console.error("[moderation] Block load failed:", error);
        return snapshot;
      })
      .then((result) => {
        inflight = null;
        return result;
      });
  }
  return inflight;
}

/**
 * Point the store at a user. Idempotent — every mounted consumer calls this.
 */
export function setActiveModerationUser(userId: string | null) {
  if (userId === activeUserId) {
    // A previous attempt failed (or never ran): try again rather than sitting
    // on an empty set forever.
    if (userId && !snapshot.loaded && !inflight) void startLoad(userId);
    return;
  }

  activeUserId = userId;
  inflight = null;

  if (!userId) {
    snapshot = SIGNED_OUT;
    emit();
    return;
  }

  snapshot = {
    blockedIds: EMPTY(),
    blockedByIds: EMPTY(),
    hiddenIds: EMPTY(),
    loaded: false,
    loading: true,
  };
  emit();
  void startLoad(userId);
}

/**
 * Resolve once the block list for `userId` is known.
 *
 * Check `.loaded` on the result before trusting an empty set: a failed fetch
 * resolves too, and callers that must fail closed (invitations) treat
 * `loaded === false` as "cannot verify".
 */
export function ensureBlocksLoaded(
  userId: string | null | undefined,
): Promise<BlockSnapshot> {
  if (!userId) return Promise.resolve(SIGNED_OUT);
  if (userId !== activeUserId) setActiveModerationUser(userId);
  if (snapshot.loaded) return Promise.resolve(snapshot);
  if (inflight) return inflight;
  return startLoad(userId);
}

/** Force a re-read (after a block/unblock made elsewhere, say). */
export function reloadBlocks(userId: string | null | undefined): Promise<BlockSnapshot> {
  if (!userId) return Promise.resolve(SIGNED_OUT);
  if (userId !== activeUserId) {
    setActiveModerationUser(userId);
    return inflight ?? Promise.resolve(snapshot);
  }
  inflight = null;
  return startLoad(userId);
}

export type PairBlockState =
  /** No block in either direction. */
  | "clear"
  /** The caller blocked the other player. */
  | "blocked-by-you"
  /** The other player blocked the caller. */
  | "blocked-by-them"
  /** Could not be determined — treat as a refusal. */
  | "unknown";

/**
 * Authoritative, pair-scoped block lookup for **outbound** actions.
 *
 * The cached set is a read model for lists; a friend request or a game invite
 * asks the table directly so a block created thirty seconds ago still counts,
 * and so an error is distinguishable from an absence. RLS returns exactly the
 * two rows that could match, and nothing else.
 */
export async function checkBlockPair(
  userId: string | null | undefined,
  otherId: string | null | undefined,
): Promise<PairBlockState> {
  if (!userId || !otherId || userId === otherId) return "clear";

  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),` +
        `and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`,
    );

  if (error) {
    console.error("[moderation] Pair block check failed:", error);
    return "unknown";
  }

  const rows = data ?? [];
  if (rows.some((r) => r.blocker_id === userId)) return "blocked-by-you";
  if (rows.some((r) => r.blocker_id === otherId)) return "blocked-by-them";
  return "clear";
}

/**
 * The keys a `notifications.data` payload uses to name the other player.
 *
 * Notification rows are written by database triggers, and the payload is a
 * free-form jsonb — every trigger picks its own key. These are the ones in
 * use: `sender_id` (friend request, friend accepted, room invite),
 * `requester_id` (someone asking to join your room) and `recipient_id` (the
 * other half of a friendship event). Unknown keys are ignored, which is the
 * safe direction for a read-only list: a payload naming a player some other
 * way shows through rather than the whole list disappearing.
 */
export const NOTIFICATION_ACTOR_KEYS = [
  "sender_id",
  "requester_id",
  "recipient_id",
  "actor_id",
  "from_user_id",
  "inviter_id",
  "challenger_id",
] as const;

/** Every user id a notification payload names, in any of the known shapes. */
export function notificationActorIds(
  data: Record<string, unknown> | null | undefined,
): string[] {
  if (!data) return [];
  const ids: string[] = [];
  for (const key of NOTIFICATION_ACTOR_KEYS) {
    const value = data[key];
    if (typeof value === "string" && value) ids.push(value);
  }
  return ids;
}

/* -------------------------------------------------------------------------
 * The hook
 * ---------------------------------------------------------------------- */

export function useContentModeration() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const state = useSyncExternalStore(subscribe, getBlockSnapshot, getBlockSnapshot);

  useEffect(() => {
    setActiveModerationUser(userId);
  }, [userId]);

  const { blockedIds, blockedByIds, hiddenIds, loaded, loading } = state;

  const refreshBlocks = useCallback(async () => {
    await reloadBlocks(userId);
  }, [userId]);

  /** True when the signed-in user has blocked this person. */
  const isBlocked = useCallback(
    (id: string | null | undefined) => !!id && blockedIds.has(id),
    [blockedIds],
  );

  /** True when this person blocked the signed-in user. */
  const isBlockedBy = useCallback(
    (id: string | null | undefined) => !!id && blockedByIds.has(id),
    [blockedByIds],
  );

  /**
   * True when the pair is blocked in **either** direction — the question
   * every list should ask. Someone who blocked you does not get to keep
   * appearing in your search results and lobbies either.
   */
  const isHidden = useCallback(
    (id: string | null | undefined) => !!id && hiddenIds.has(id),
    [hiddenIds],
  );

  const blockUser = useCallback(
    async (targetId: string): Promise<boolean> => {
      if (!userId || targetId === userId) return false;

      // Optimistic: the point of blocking is that the content goes away now.
      const optimistic = new Set(snapshot.blockedIds);
      optimistic.add(targetId);
      publish({
        blockedIds: optimistic,
        blockedByIds: snapshot.blockedByIds,
        loaded: snapshot.loaded,
        loading: snapshot.loading,
      });

      const { error } = await supabase
        .from("user_blocks")
        .upsert(
          { blocker_id: userId, blocked_id: targetId },
          { onConflict: "blocker_id,blocked_id" },
        );

      if (error) {
        console.error("[moderation] Block failed:", error);
        const reverted = new Set(snapshot.blockedIds);
        reverted.delete(targetId);
        publish({
          blockedIds: reverted,
          blockedByIds: snapshot.blockedByIds,
          loaded: snapshot.loaded,
          loading: snapshot.loading,
        });
        toast.error(t("moderation.blockFailed"));
        return false;
      }

      toast.success(t("moderation.blocked"));
      return true;
    },
    [userId],
  );

  const unblockUser = useCallback(
    async (targetId: string): Promise<boolean> => {
      if (!userId) return false;

      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", targetId);

      if (error) {
        console.error("[moderation] Unblock failed:", error);
        toast.error(t("moderation.blockFailed"));
        return false;
      }

      const next = new Set(snapshot.blockedIds);
      next.delete(targetId);
      publish({
        blockedIds: next,
        blockedByIds: snapshot.blockedByIds,
        loaded: snapshot.loaded,
        loading: snapshot.loading,
      });
      toast.success(t("moderation.unblocked"));
      return true;
    },
    [userId],
  );

  /**
   * File a report against a user, optionally about a specific piece of
   * content.
   *
   * Reports land in the admin queue rather than taking action automatically.
   * The reporter gets confirmation either way — Guideline 1.2 asks that the
   * person reporting sees the report was received.
   */
  const reportUser = useCallback(
    async (
      reportedUserId: string,
      reason: ReportReason,
      description?: string,
      context?: { messageId?: string; roomId?: string },
    ): Promise<boolean> => {
      if (!userId || reportedUserId === userId) return false;

      const { error } = await supabase.from("user_reports").insert({
        reporter_id: userId,
        reported_user_id: reportedUserId,
        report_type: reason,
        description: description || null,
        message_id: context?.messageId ?? null,
        room_id: context?.roomId ?? null,
      });

      if (error) {
        console.error("[moderation] Report failed:", error);
        toast.error(t("moderation.reportFailed"));
        return false;
      }

      toast.success(t("moderation.reportReceived"));
      return true;
    },
    [userId],
  );

  /**
   * Drop anything authored by — or naming — a blocked player, in either
   * direction.
   *
   * Read-only lists fail **open**: while the set is still loading this
   * returns the list unchanged rather than blanking a leaderboard for the
   * first two hundred milliseconds of every session. The window is one
   * query wide, it closes by itself, and the cost of being wrong is that a
   * blocked name is briefly visible in a list — not that a blocked player
   * reaches the user. Anything a blocked player can *do* to the user
   * (invitations) is gated on `loaded` instead, and refuses until it knows.
   */
  const filterBlocked = useCallback(
    <T,>(items: T[], getAuthorId: (item: T) => string | null | undefined): T[] =>
      hiddenIds.size === 0 ? items : items.filter((item) => !isHidden(getAuthorId(item))),
    [hiddenIds, isHidden],
  );

  /**
   * True when a notification is about a blocked player — a friend request, a
   * "wants to join your room", an invitation. The card renders their
   * nickname and avatar and offers a button that acts on them, so the whole
   * row goes.
   */
  const isNotificationHidden = useCallback(
    (data: Record<string, unknown> | null | undefined) =>
      hiddenIds.size > 0 && notificationActorIds(data).some((id) => hiddenIds.has(id)),
    [hiddenIds],
  );

  const helpers = useMemo(
    () => ({ checkPair: (otherId: string) => checkBlockPair(userId, otherId) }),
    [userId],
  );

  return {
    loading,
    /** True once the set is known to be complete for this session. */
    loaded,
    blockedIds,
    blockedByIds,
    hiddenIds,
    isBlocked,
    isBlockedBy,
    isHidden,
    blockUser,
    unblockUser,
    reportUser,
    filterBlocked,
    isNotificationHidden,
    refreshBlocks,
    checkPair: helpers.checkPair,
  };
}
