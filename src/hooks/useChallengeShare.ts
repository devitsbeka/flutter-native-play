import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { shareOrCopy } from "@/utils/shareLink";
import { toast } from "@/lib/toast";
import { siteUrl } from "@/config/site";

export interface ChallengeQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  icon_slug?: string | null;
}

export interface ChallengeShareInput {
  score: number;
  totalQuestions: number;
  categoryName?: string | null;
  categoryIconSlug?: string | null;
  roomId?: string | null;
  questions: ChallengeQuestion[];
}

/**
 * Make a challenge link and hand it to the share sheet.
 *
 * This was the whole body of ChallengeShareModal, which opened on top of the
 * results screen to show the score and the category — both of which the
 * results screen behind it was already showing — before offering the same
 * share. One step, no dialog: the button creates the link and shares it.
 *
 * Falls back to the clipboard where the Web Share API is unavailable, which
 * is what the dialog's second button did.
 */
export function useChallengeShare() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [sharing, setSharing] = useState(false);

  const share = useCallback(
    async ({
      score,
      totalQuestions,
      categoryName,
      categoryIconSlug,
      roomId,
      questions,
    }: ChallengeShareInput) => {
      if (!user || !profile || sharing) return;
      setSharing(true);

      try {
        const { data, error } = await supabase
          .from("challenge_links")
          .insert({
            challenger_id: user.id,
            challenger_nickname: profile.nickname,
            challenger_avatar_url: profile.avatar_url,
            challenger_score: score,
            total_questions: totalQuestions,
            category_name: categoryName,
            category_icon_slug: categoryIconSlug,
            questions: questions as never,
            room_id: roomId,
          })
          .select("code")
          .single();

        if (error) throw error;

        const url = siteUrl(`challenge/${data.code}`);
        const shareData = {
          title: t("extra.challengeBeatMe"),
          text: t("extra.challengeShareText", {
            player: profile?.nickname || t("extra.player"),
            score: String(score),
            total: String(totalQuestions),
            category: categoryName ? ` - ${categoryName}` : "",
          }),
          url,
        };

        // Dismissing the sheet is not a failure and must not raise a toast.
        const outcome = await shareOrCopy(shareData);
        if (outcome === "copied") toast.success(t("extra.challengeLinkCopied"));
        if (outcome === "failed") toast.error(t("team.shareFailed"));
      } catch (err) {
        console.error("Failed to create challenge link:", err);
        toast.error(t("extra.linkCreateFailed"));
      } finally {
        setSharing(false);
      }
    },
    [user, profile, sharing, t],
  );

  return { share, sharing };
}
