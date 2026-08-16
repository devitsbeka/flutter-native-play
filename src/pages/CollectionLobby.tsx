import { useMemo, useState, lazy, Suspense } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Layers, Play, Users, HelpCircle, Heart, Pencil } from "lucide-react";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { SamplePost } from "@/data/samplePosts";
import { useCollectionLobby } from "@/hooks/useCollectionLobby";
import { useAuth } from "@/hooks/useAuth";

const QuizPlayModal = lazy(() =>
  import("@/components/social/QuizPlayModal").then((m) => ({ default: m.QuizPlayModal }))
);
const EditQuizModal = lazy(() =>
  import("@/components/social/EditQuizModal").then((m) => ({ default: m.EditQuizModal }))
);
const EditRoundModal = lazy(() =>
  import("@/components/social/EditRoundModal").then((m) => ({ default: m.EditRoundModal }))
);

function getGradientProps(gradient: string) {
  if (gradient?.includes("gradient") || gradient?.includes("#") || gradient?.includes("rgb")) {
    return { style: { background: gradient }, className: "" };
  }
  return { style: undefined, className: `bg-gradient-to-br ${gradient}` };
}

export default function CollectionLobby() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openProfile } = usePlayerProfile();
  const { user } = useAuth();
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);
  const [isEditCollectionOpen, setIsEditCollectionOpen] = useState(false);
  const [editingRoundIndex, setEditingRoundIndex] = useState<number | null>(null);


  const { data, isLoading } = useCollectionLobby(collectionId);
  const collection = data?.collection;
  const creator = data?.creator;
  const rounds = data?.rounds || [];
  
  const isOwner = user?.id === collection?.user_id;

  const posts: SamplePost[] = useMemo(() => {
    if (!collection || rounds.length === 0) return [];
    return rounds.map((r) => ({
      id: r.id,
      username: creator?.nickname || "user",
      displayName: creator?.nickname || t("extra.userFallback"),
      avatarUrl: creator?.avatar_url || "",
      verified: false,
      createdAt: r.created_at || new Date().toISOString(),
      title: r.title,
      description: r.description || "",
      subject: r.subject,
      hashtags: r.hashtags || [],
      coverGradient: r.cover_gradient,
      coverImage: r.cover_image || undefined,
      questionCount: r.question_count,
      answerFormat: r.answer_format as any,
      likesCount: r.likes_count || 0,
      playsCount: r.plays_count || 0,
      savesCount: r.saves_count || 0,
      commentsCount: 0,
      questions: ((r.questions as any[]) || []).map((q: any) => ({
        question: q.question_text || q.question || "",
        correct_answer: q.correct_answer || "",
        incorrect_answers: q.incorrect_answers || [],
        icon_slug: q.icon_slug || null,
      })),
      isPublic: r.is_public,
      roundNumber: r.round_number || undefined,
    }));
  }, [collection, rounds, creator?.nickname, creator?.avatar_url, t]);

  const totals = useMemo(() => {
    const totalQuestions = posts.reduce((sum, p) => sum + (p.questionCount || 0), 0);
    const totalPlays = posts.reduce((sum, p) => sum + (p.playsCount || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
    return { totalQuestions, totalPlays, totalLikes };
  }, [posts]);

  const handleBack = () => navigate(-1);
  const handlePlay = () => setIsPlayModalOpen(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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

  if (!collection || posts.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t("extra.collectionNotFound")}</p>
          <button onClick={handleBack} className="text-primary mt-2 underline">
            {t("extra.goBackLabel")}
          </button>
        </div>
      </div>
    );
  }

  const heroGradientProps = getGradientProps(collection.cover_gradient);

  // Scrolls itself — the document scroller is disabled on iOS (see
  // CategoryPage). The old pb-32 sat on the same element as safe-bleed,
  // whose doubled selector overrides padding-bottom, so the clearance for
  // the fixed CTA was silently discarded; it lives inside now.
  return (
    <div className="h-[100dvh] overflow-y-auto bg-gradient-to-b from-[#FDFAFF] to-[#F6E8FF] safe-bleed">
      <div className="pb-32">
      {/* Hero */}
      <div className="h-56 relative overflow-hidden">
        {collection.cover_image ? (
          <>
            <img
              src={collection.cover_image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
          </>
        ) : (
          <>
            <div
              className={`absolute inset-0 ${heroGradientProps.className}`}
              style={heroGradientProps.style}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />
          </>
        )}

        <button
          onClick={handleBack}
          className="absolute left-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors" style={{ top: "calc(1rem + var(--safe-top))" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="absolute right-4 z-10 flex items-center gap-2" style={{ top: "calc(1rem + var(--safe-top))" }}>
          {isOwner && (
            <button
              onClick={() => setIsEditCollectionOpen(true)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
          )}
          {creator && (
            <button onClick={() => openProfile(creator.user_id)}>
              <SafeAvatar 
                avatarUrl={creator.avatar_url}
                fallback={creator.nickname || "?"}
                className="w-9 h-9 border-2 border-white/40 shadow-lg"
                fallbackClassName="text-sm bg-white/20 text-white"
              />
            </button>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center p-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white drop-shadow-lg text-center"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
          >
            {collection.title}
          </motion.h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4 -mt-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-2 bg-card rounded-2xl border border-border p-3"
        >
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{totals.totalQuestions}</p>
            <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t("extra.questionsStatLabel")}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{totals.totalPlays}</p>
            <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{t("extra.playsStatLabel")}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{totals.totalLikes}</p>
            <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Heart className="w-3.5 h-3.5" />
              <span>{t("extra.likesStatLabel")}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <div className="flex items-center gap-2 p-4 border-b border-border">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">{t("extra.roundsTitle")}</h2>
            <span className="text-xs text-muted-foreground ml-auto">{posts.length}</span>
          </div>
          <div className="divide-y divide-border">
            {posts.map((p, idx) => (
              <div 
                key={p.id} 
                className={`flex items-center gap-3 p-3 ${isOwner ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
                onClick={isOwner ? () => setEditingRoundIndex(idx) : undefined}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  {p.coverImage ? (
                    <img src={p.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: p.coverGradient }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {idx + 1}. {p.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("extra.nQuestionsLabel", { count: p.questionCount })}</p>
                </div>
                {isOwner && (
                  <Pencil className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      </div>

      {/* Fixed Play */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1.5rem_+_var(--safe-bottom))] bg-gradient-to-t from-background via-background to-transparent">
        <motion.div
          className="mx-auto w-full max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
        >
          <ChunkyButton variant="primary" size="lg" className="w-full gap-2" onClick={handlePlay}>
            <Play className="w-5 h-5 fill-current" />
            {t("extra.playGame")}
          </ChunkyButton>
        </motion.div>
      </div>

      {isPlayModalOpen && (
        <Suspense fallback={null}>
          <QuizPlayModal
            open={isPlayModalOpen}
            onOpenChange={setIsPlayModalOpen}
            post={posts[0]}
            collectionPosts={posts}
          />
        </Suspense>
      )}

      {isEditCollectionOpen && collection && (
        <Suspense fallback={null}>
          <EditQuizModal
            isOpen={isEditCollectionOpen}
            onClose={() => setIsEditCollectionOpen(false)}
            quiz={{
              id: collection.id,
              title: collection.title,
              description: collection.description || "",
              cover_image: collection.cover_image || null,
              cover_gradient: collection.cover_gradient || "",
              is_public: collection.is_public,
              hashtags: collection.hashtags || [],
              questions: [],
            }}
          />
        </Suspense>
      )}

      {editingRoundIndex !== null && rounds[editingRoundIndex] && (
        <Suspense fallback={null}>
          <EditRoundModal
            isOpen={editingRoundIndex !== null}
            onClose={() => setEditingRoundIndex(null)}
            round={rounds[editingRoundIndex]}
          />
        </Suspense>
      )}
    </div>
  );
}
