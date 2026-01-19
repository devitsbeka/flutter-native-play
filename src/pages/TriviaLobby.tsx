import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Users, BarChart3, HelpCircle, Trophy, Info, Heart } from "lucide-react";
import { useTriviaLobby } from "@/hooks/useTriviaLobby";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { QuizPlayModal } from "@/components/social/QuizPlayModal";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";

// Georgian time format helper
function formatGeorgianTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return "ახლახანს";
  if (diffMins < 60) return `${diffMins}წთ`;
  if (diffHours < 24) return `${diffHours}სთ`;
  if (diffDays === 1) return "გუშინ";
  if (diffDays < 7) return `${diffDays}დღე`;
  if (diffWeeks < 4) return `${diffWeeks}კვ`;

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

// Medal images for top 3
const MEDAL_ICONS = {
  1: "/lovable-uploads/2edc85b8-b43c-4e7e-9ec5-f7809840bdf8.png",
  2: "/lovable-uploads/fbb2e46a-7bf2-4a81-80a1-43d48a6bfb3a.png",
  3: "/lovable-uploads/69b62a5a-4178-4e78-a721-d50f9a1559f9.png",
};

// Helper to get gradient style
function getGradientProps(gradient: string) {
  if (gradient?.includes("gradient") || gradient?.includes("#") || gradient?.includes("rgb")) {
    return { style: { background: gradient }, className: "" };
  }
  return { style: undefined, className: `bg-gradient-to-br ${gradient}` };
}

// Convert trivia to SamplePost format for QuizPlayModal
function convertToSamplePost(trivia: any, creator: any) {
  return {
    id: trivia.id,
    username: creator?.nickname || "user",
    displayName: creator?.nickname || "User",
    avatarUrl: creator?.avatar_url || "",
    verified: false,
    createdAt: trivia.created_at,
    title: trivia.title,
    description: trivia.description || "",
    subject: trivia.subject || "",
    hashtags: trivia.hashtags || [],
    coverGradient: trivia.cover_gradient || "",
    coverImage: trivia.cover_image,
    questionCount: trivia.question_count,
    answerFormat: trivia.answer_format || "4-answers",
    likesCount: trivia.likes_count || 0,
    playsCount: trivia.plays_count || 0,
    savesCount: trivia.saves_count || 0,
    commentsCount: 0,
    questions: (trivia.questions || []).map((q: any) => ({
      question: q.question_text || q.question,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers || [],
      icon_slug: q.icon_slug || null,
    })),
  };
}

export default function TriviaLobby() {
  const { triviaId } = useParams<{ triviaId: string }>();
  const navigate = useNavigate();
  const { openProfile } = usePlayerProfile();
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);

  const { trivia, creator, leaderboard, stats, userRank, isLoading, refetchLeaderboard } = useTriviaLobby(triviaId);

  const handleBack = () => {
    navigate(-1);
  };

  const handlePlay = () => {
    setIsPlayModalOpen(true);
  };

  const handlePlayComplete = () => {
    setIsPlayModalOpen(false);
    // Refresh leaderboard after playing
    refetchLeaderboard();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <div className="h-56 relative">
          <Skeleton className="absolute inset-0" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!trivia) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">ტრივია ვერ მოიძებნა</p>
          <button onClick={handleBack} className="text-primary mt-2 underline">
            უკან დაბრუნება
          </button>
        </div>
      </div>
    );
  }

  const gradientProps = getGradientProps(trivia.cover_gradient);
  const samplePost = convertToSamplePost(trivia, creator);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Hero Section with Cover */}
      <div className="h-56 relative overflow-hidden">
        {trivia.cover_image ? (
          <>
            <img src={trivia.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
          </>
        ) : (
          <>
            <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
          </>
        )}

        {/* Back Button */}
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Title & Creator */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white drop-shadow-lg mb-2"
          >
            {trivia.title}
          </motion.h1>

          {/* Creator Info */}
          {creator && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => openProfile(creator.user_id)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Avatar className="w-6 h-6 border border-white/30">
                  <AvatarImage src={creator.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-white/20 text-white">
                    {creator.nickname?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-white/90 font-medium">{creator.nickname}</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 -mt-2">
        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-4 gap-2 bg-card rounded-2xl border border-border p-3"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-bold text-foreground">{stats.uniquePlayers}</p>
            <p className="text-[10px] text-muted-foreground">მოთამაშე</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-bold text-foreground">{stats.avgScore}/{trivia.question_count}</p>
            <p className="text-[10px] text-muted-foreground">საშუალო</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-bold text-foreground">{trivia.question_count}</p>
            <p className="text-[10px] text-muted-foreground">კითხვა</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Heart className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-bold text-foreground">{trivia.likes_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">მოწონება</p>
          </div>
        </motion.div>

        {/* Leaderboard Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          {/* Leaderboard Header */}
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold text-foreground">ლიდერბორდი</h2>
            <span className="text-xs text-muted-foreground ml-auto">{leaderboard.length} მოთამაშე</span>
          </div>

          {/* Leaderboard List */}
          <div className="divide-y divide-border">
            {leaderboard.length === 0 ? (
              <div className="py-12 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">ჯერ არავის უთამაშია</p>
                <p className="text-muted-foreground/70 text-xs mt-1">იყავი პირველი!</p>
              </div>
            ) : (
              leaderboard.map((entry, index) => (
                <motion.div
                  key={`${entry.user_id}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.03 }}
                  className={`flex items-center gap-3 p-3 ${
                    userRank?.user_id === entry.user_id ? "bg-primary/10" : ""
                  }`}
                  onClick={() => openProfile(entry.user_id)}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    {entry.rank <= 3 ? (
                      <img
                        src={MEDAL_ICONS[entry.rank as 1 | 2 | 3]}
                        alt={`Rank ${entry.rank}`}
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-9 h-9 border border-border">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {entry.nickname?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{entry.nickname}</p>
                    <p className="text-xs text-muted-foreground">{formatGeorgianTimeAgo(new Date(entry.played_at))}</p>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {entry.score}/{trivia.question_count}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-start gap-2 px-2 py-3"
        >
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            საჯარო ტრივიების თამაშისას შენი ქულა ავტომატურად აისახება ლიდერბორდზე და შენც მონაწილეობ რეიტინგში.
          </p>
        </motion.div>
      </div>

      {/* Fixed Play Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
        >
          <ChunkyButton variant="primary" size="lg" className="w-full gap-2" onClick={handlePlay}>
            <Play className="w-5 h-5 fill-current" />
            ითამაშე
          </ChunkyButton>
        </motion.div>
      </div>

      {/* Quiz Play Modal */}
      <QuizPlayModal
        open={isPlayModalOpen}
        onOpenChange={(open) => {
          if (!open) handlePlayComplete();
        }}
        post={samplePost}
      />
    </div>
  );
}
