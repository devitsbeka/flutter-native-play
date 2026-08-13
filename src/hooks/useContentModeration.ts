import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
 * "blocker no longer sees blocked". Feeds filter on it client-side via
 * `isBlocked`, and RLS lets a user read rows naming them so the block cannot
 * be worked around by simply not asking.
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

export function useContentModeration() {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refreshBlocks = useCallback(async () => {
    if (!user) {
      setBlockedIds(new Set());
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id);

    if (error) {
      console.error("[moderation] Could not load blocks:", error);
    } else {
      setBlockedIds(new Set((data ?? []).map((row) => row.blocked_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshBlocks();
  }, [refreshBlocks]);

  /** True when the signed-in user has blocked this person. */
  const isBlocked = useCallback(
    (userId: string | null | undefined) => !!userId && blockedIds.has(userId),
    [blockedIds],
  );

  const blockUser = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!user || userId === user.id) return false;

      // Optimistic: the point of blocking is that the content goes away now.
      setBlockedIds((prev) => new Set(prev).add(userId));

      const { error } = await supabase
        .from("user_blocks")
        .upsert(
          { blocker_id: user.id, blocked_id: userId },
          { onConflict: "blocker_id,blocked_id" },
        );

      if (error) {
        console.error("[moderation] Block failed:", error);
        setBlockedIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        toast.error(t("moderation.blockFailed"));
        return false;
      }

      toast.success(t("moderation.blocked"));
      return true;
    },
    [user],
  );

  const unblockUser = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!user) return false;

      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", userId);

      if (error) {
        console.error("[moderation] Unblock failed:", error);
        toast.error(t("moderation.blockFailed"));
        return false;
      }

      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.success(t("moderation.unblocked"));
      return true;
    },
    [user],
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
      if (!user || reportedUserId === user.id) return false;

      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id,
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
    [user],
  );

  /** Drop anything authored by a blocked user. */
  const filterBlocked = useCallback(
    <T,>(items: T[], getAuthorId: (item: T) => string | null | undefined): T[] =>
      items.filter((item) => !isBlocked(getAuthorId(item))),
    [isBlocked],
  );

  return {
    loading,
    blockedIds,
    isBlocked,
    blockUser,
    unblockUser,
    reportUser,
    filterBlocked,
    refreshBlocks,
  };
}
