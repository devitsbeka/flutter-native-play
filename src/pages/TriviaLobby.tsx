import { useState, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Users, BarChart3, HelpCircle, Info, Pencil } from "lucide-react";
import { useTriviaLobby } from "@/hooks/useTriviaLobby";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useAuth } from "@/hooks/useAuth";
import medalGold from "@/assets/icons/medal-gold.png";
import medalSilver from "@/assets/icons/medal-silver.png";
import medalBronze from "@/assets/icons/medal-bronze.png";
import purpleHeart3d from "@/assets/icons/purple-heart-3d.png";
import bookmark3d from "@/assets/icons/bookmark-3d-orange.png";
import pushButton3d from "@/assets/icons/push-button-3d.png";
import trophy3d from "@/assets/icons/trophy-3d.png";

// Lazy load modals
const QuizPlayModal = lazy(() => 
  import("@/components/social/QuizPlayModal").then(m => ({ default: m.QuizPlayModal }))
);
const EditQuizModal = lazy(() =>
  import("@/components/social/EditQuizModal").then(m => ({ default: m.EditQuizModal }))
);
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
  1: medalGold,
  2: medalSilver,
  3: medalBronze,
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
      icon_slug: q.icon_slug || q.iconSlug || null,
    })),
  };
}

export default function TriviaLobby() {
  const { triviaId } = useParams<{ triviaId: string }>();
  const navigate = useNavigate();
  const { openProfile } = usePlayerProfile();
  const { user } = useAuth();
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { trivia, creator, leaderboard, stats, userRank, isLoading, refetchLeaderboard, removeFromLeaderboard } = useTriviaLobby(triviaId);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const isOwner = user?.id === trivia?.user_id;

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
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background pointer-events-none" />
          </>
        ) : (
          <>
            <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background pointer-events-none" />
          </>
        )}

        {/* Back Button */}
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors safe-top-offset"
          style={{ marginTop: 'max(0px, env(safe-area-inset-top))' }}
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>

        {/* Header Right Side - Edit + Avatar */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {creator && (
            <button onClick={() => openProfile(creator.user_id)}>
              <SafeAvatar
                avatarUrl={creator.avatar_url}
                fallback={creator.nickname || 'U'}
                className="w-9 h-9 border-2 border-white/40 shadow-lg"
                fallbackClassName="text-sm bg-white/20 text-white"
              />
            </button>
          )}
        </div>

        {/* Title - Centered */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white drop-shadow-lg text-center"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
          >
            {trivia.title}
          </motion.h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 -mt-6 relative z-10 max-w-xl mx-auto">
        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-center gap-6 bg-card rounded-2xl border border-border p-4"
        >
          <div className="flex items-center gap-1.5">
            <img src={purpleHeart3d} alt="Likes" className="w-6 h-6 object-contain" />
            <span className="font-bold text-foreground">{trivia.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={bookmark3d} alt="Saves" className="w-6 h-6 object-contain" />
            <span className="font-bold text-foreground">{trivia.saves_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={pushButton3d} alt="Plays" className="w-6 h-6 object-contain" />
            <span className="font-bold text-foreground">{trivia.plays_count || 0}</span>
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
            <img src={trophy3d} alt="" className="w-5 h-5 object-contain" />
            <h2 className="font-bold text-foreground">ლიდერბორდი</h2>
            <span className="text-xs text-muted-foreground ml-auto">{leaderboard.length} მოთამაშე</span>
          </div>

          {/* Leaderboard List */}
          <div className="divide-y divide-border">
            {leaderboard.length === 0 ? (
              <div className="py-12 text-center">
                <img src={pushButton3d} alt="" className="w-10 h-10 object-contain grayscale opacity-50 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">ჯერ არავის უთამაშია</p>
                <p className="text-muted-foreground/70 text-xs mt-1">იყავი პირველი!</p>
              </div>
            ) : (
              leaderboard.map((entry, index) => {
                const isCurrentUser = user?.id === entry.user_id;
                const isExpanded = expandedUserId === entry.user_id;
                return (
                <motion.div
                  key={`${entry.user_id}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.03 }}
                  className={`flex items-center gap-3 p-3 ${
                    isCurrentUser ? "bg-primary/10" : ""
                  }`}
                  onClick={() => {
                    if (isCurrentUser) {
                      setExpandedUserId(isExpanded ? null : entry.user_id);
                    } else {
                      openProfile(entry.user_id);
                    }
                  }}
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
                  <SafeAvatar
                    avatarUrl={entry.avatar_url}
                    fallback={entry.nickname || 'U'}
                    className="w-9 h-9 border border-border"
                    fallbackClassName="text-xs bg-muted"
                  />

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{entry.nickname}</p>
                    <p className="text-xs text-muted-foreground">{formatGeorgianTimeAgo(new Date(entry.played_at))}</p>
                  </div>

                  {/* Score or Remove Button */}
                  <AnimatePresence mode="wait">
                    {isCurrentUser && isExpanded ? (
                      <motion.button
                        key="remove-btn"
                        initial={{ opacity: 0, x: 20, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        disabled={isRemoving}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsRemoving(true);
                          try {
                            await removeFromLeaderboard();
                          } finally {
                            setIsRemoving(false);
                            setExpandedUserId(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold whitespace-nowrap disabled:opacity-50"
                      >
                        {isRemoving ? "იშლება..." : "წაშლა"}
                      </motion.button>
                    ) : (
                      <motion.div
                        key="score"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-right"
                      >
                        <p className="font-bold text-foreground">
                          {entry.score}/{trivia.question_count}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                );
              })
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
            ქულა ავტომატურად აისახება ლიდერბორდზე.
          </p>
        </motion.div>
      </div>

      {/* Fixed Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background pb-6">
        <div className="max-w-xl mx-auto space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            className="space-y-2"
          >
            {isOwner && (
              <ChunkyButton 
                variant="secondary" 
                size="lg" 
                className="w-full gap-2" 
                onClick={() => setIsEditModalOpen(true)}
              >
                <Pencil className="w-5 h-5" />
                რედაქტირება
              </ChunkyButton>
            )}
            <ChunkyButton variant="primary" size="lg" className="w-full gap-2" onClick={handlePlay}>
              <Play className="w-5 h-5 fill-current" />
              ითამაშე
            </ChunkyButton>
          </motion.div>
        </div>
      </div>

      {/* Quiz Play Modal - Lazy loaded */}
      {isPlayModalOpen && (
        <Suspense fallback={null}>
          <QuizPlayModal
            open={isPlayModalOpen}
            onOpenChange={(open) => {
              if (!open) handlePlayComplete();
            }}
            post={samplePost}
          />
        </Suspense>
      )}




      {/* Edit Modal - Lazy loaded */}
      {isEditModalOpen && trivia && (
        <Suspense fallback={null}>
          <EditQuizModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            quiz={{
              id: trivia.id,
              title: trivia.title,
              description: trivia.description || "",
              subject: trivia.subject || "",
              hashtags: trivia.hashtags || [],
              cover_image: trivia.cover_image || null,
              cover_gradient: trivia.cover_gradient || "",
              questions: trivia.questions || [],
              is_public: trivia.is_public,
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
