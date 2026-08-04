import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClipboard } from "@/hooks/use-clipboard";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import danceFloorIcon from "@/assets/dance-floor-3.png";
import { siteUrl } from "@/config/site";

interface ChallengeQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  icon_slug?: string | null;
}

interface ChallengeShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  totalQuestions: number;
  correctAnswers?: number;
  categoryName?: string | null;
  categoryIconSlug?: string | null;
  roomId?: string | null;
  questions: ChallengeQuestion[];
}

export function ChallengeShareModal({
  open,
  onOpenChange,
  score,
  totalQuestions,
  correctAnswers,
  categoryName,
  categoryIconSlug,
  roomId,
  questions,
}: ChallengeShareModalProps) {
  const { user, profile } = useAuth();
  const { copy, copied } = useClipboard({ timeout: 3000 });
  const { t } = useLanguage();
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createChallengeLink = async () => {
    if (!user || !profile) return;
    setIsCreating(true);

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
          questions: questions as any,
          room_id: roomId,
        })
        .select("code")
        .single();

      if (error) throw error;

      const url = siteUrl(`challenge/${data.code}`);
      setChallengeUrl(url);
    } catch (err) {
      console.error("Failed to create challenge link:", err);
      toast.error(t("extra.linkCreateFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleShare = async () => {
    if (!challengeUrl) return;

    const shareData = {
      title: t("extra.challengeBeatMe"),
      text: t("extra.challengeShareText", {
        player: profile?.nickname || t("extra.player"),
        score: String(score),
        total: String(totalQuestions),
        category: categoryName ? ` - ${categoryName}` : "",
      }),
      url: challengeUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      await copy(challengeUrl);
      toast.success(t("extra.challengeLinkCopied"));
    }
  };

  const handleCopy = async () => {
    if (!challengeUrl) return;
    await copy(challengeUrl);
    toast.success(t("extra.challengeLinkCopied"));
  };

  useEffect(() => {
    if (open && !challengeUrl && !isCreating && questions.length > 0) {
      createChallengeLink();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-gradient-to-b from-[#7E7ADB] to-[#C471ED] border-none rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 justify-center">
              <img src={danceFloorIcon} alt="" className="w-10 h-10" />
              <DialogTitle className="text-xl font-bold text-white">
                {t("extra.challengeFriendsTitle")}
              </DialogTitle>
            </div>
            <p className="text-sm text-white/70">{t("extra.challengeSubtitle")}</p>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Score display */}
          <div className="text-center p-4 rounded-xl bg-white/15 border border-white/20">
            <p className="text-sm text-white/70 mb-1">{t("extra.yourResult")}</p>
            <p className="text-3xl font-bold text-white">{score} {t("extra.gamePointsLabel")}</p>
            {correctAnswers !== undefined && (
              <p className="text-sm text-white/70 mt-1">{t("extra.correctAnswersCount", { count: correctAnswers })}</p>
            )}
            {categoryName && (
              <p className="text-sm text-white/70 mt-1">{categoryName}</p>
            )}
          </div>

          {isCreating ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <span className="ml-2 text-white/70">{t("extra.linkCreating")}</span>
            </div>
          ) : challengeUrl ? (
            <div className="space-y-2">
              <ChunkyButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleShare}
                icon={<Share2 className="w-5 h-5" />}
              >
                {t("extra.shareWithFriends")}
              </ChunkyButton>

              <ChunkyButton
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={handleCopy}
                icon={copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              >
                {copied ? t("extra.copied") : t("extra.gameCopyLink")}
              </ChunkyButton>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
