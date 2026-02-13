import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClipboard } from "@/hooks/use-clipboard";
import { toast } from "sonner";
import { Share2, Copy, Check, Loader2, Link } from "lucide-react";

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

      const url = `https://mytrivia.io/challenge/${data.code}`;
      setChallengeUrl(url);
    } catch (err) {
      console.error("Failed to create challenge link:", err);
      toast.error("ბმულის შექმნა ვერ მოხერხდა");
    } finally {
      setIsCreating(false);
    }
  };

  const handleShare = async () => {
    if (!challengeUrl) return;

    const shareData = {
      title: "🎯 შეგიძლია დამამარცხო?",
      text: `${profile?.nickname || "მოთამაშემ"} მოაგროვა ${score}/${totalQuestions} ქულა${categoryName ? ` - ${categoryName}` : ""}. შეგიძლია დაამარცხო?`,
      url: challengeUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled share - not an error
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      await copy(challengeUrl);
      toast.success("ბმული დაკოპირდა!");
    }
  };

  const handleCopy = async () => {
    if (!challengeUrl) return;
    await copy(challengeUrl);
    toast.success("ბმული დაკოპირდა!");
  };

  // Auto-create when modal opens
  useEffect(() => {
    if (open && !challengeUrl && !isCreating && questions.length > 0) {
      createChallengeLink();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-foreground">
            🎯 გამოწვიე მეგობარი
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Score display */}
          <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">შენი შედეგი</p>
            <p className="text-3xl font-bold text-primary">{score} ქულა</p>
            {correctAnswers !== undefined && (
              <p className="text-sm text-muted-foreground mt-1">({correctAnswers} სწორი პასუხი)</p>
            )}
            {categoryName && (
              <p className="text-sm text-muted-foreground mt-1">{categoryName}</p>
            )}
          </div>

          {isCreating ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">ბმული იქმნება...</span>
            </div>
          ) : challengeUrl ? (
            <>
              {/* Link display */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
                <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{challengeUrl}</span>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <ChunkyButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleShare}
                  icon={<Share2 className="w-5 h-5" />}
                >
                  გაუზიარე მეგობრებს
                </ChunkyButton>

                <ChunkyButton
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={handleCopy}
                  icon={copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                >
                  {copied ? "დაკოპირდა!" : "ბმულის კოპირება"}
                </ChunkyButton>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
