import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Crown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChallengeAttempt {
  id: string;
  player_name: string;
  player_score: number;
  created_at: string;
  challenger_nickname: string;
  challenger_score: number;
  total_questions: number;
}

interface ChallengeResultsSectionProps {
  roomId: string;
}

export function ChallengeResultsSection({ roomId }: ChallengeResultsSectionProps) {
  const { t } = useLanguage();
  const [attempts, setAttempts] = useState<ChallengeAttempt[]>([]);

  useEffect(() => {
    const fetchAttempts = async () => {
      const { data: links } = await supabase
        .from("challenge_links")
        .select("id, challenger_nickname, challenger_score, total_questions")
        .eq("room_id", roomId);

      if (!links || links.length === 0) return;

      const linkIds = links.map((l) => l.id);
      const { data: rawAttempts } = await supabase
        .from("challenge_attempts")
        .select("id, player_name, player_score, created_at, challenge_link_id")
        .in("challenge_link_id", linkIds)
        .order("created_at", { ascending: false });

      if (!rawAttempts || rawAttempts.length === 0) return;

      const linkMap = new Map(links.map((l) => [l.id, l]));
      const mapped: ChallengeAttempt[] = rawAttempts.map((a) => {
        const link = linkMap.get(a.challenge_link_id)!;
        return {
          id: a.id,
          player_name: a.player_name,
          player_score: a.player_score,
          created_at: a.created_at,
          challenger_nickname: link.challenger_nickname,
          challenger_score: link.challenger_score,
          total_questions: link.total_questions,
        };
      });

      setAttempts(mapped);
    };

    fetchAttempts();
  }, [roomId]);

  if (attempts.length === 0) return null;

  return (
    <div className="w-full mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-bold text-sm">{t("extra.challengeResults")}</h3>
      </div>
      <div className="space-y-2">
        {attempts.map((attempt) => {
          const won = attempt.player_score > attempt.challenger_score;
          const tied = attempt.player_score === attempt.challenger_score;

          return (
            <div
              key={attempt.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/10"
            >
              <div className="flex items-center gap-2 min-w-0">
                {won && <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                <span className="text-white text-sm font-medium truncate">
                  {attempt.player_name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-sm font-bold ${won ? "text-emerald-400" : tied ? "text-white/70" : "text-red-400"}`}>
                  {attempt.player_score}
                </span>
                <span className="text-white/40 text-xs">vs</span>
                <span className="text-white/70 text-sm font-bold">
                  {attempt.challenger_score}
                </span>
                <span className="text-white/40 text-xs">/{attempt.total_questions}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
