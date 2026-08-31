import { useState, useRef, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FeatureOnboardingCarousel, hasSeenFeatureOnboarding } from "@/components/team/FeatureOnboardingCarousel";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Loader2, Globe, Lock, ChevronDown, ChevronUp, Layers, Pencil, FileEdit, Trash2, Check, PartyPopper } from "lucide-react";
import triviaBuzzerIcon from "@/assets/trivia-buzzer.png";
import purpleHeart3d from "@/assets/icons/purple-heart-3d.png";
import bookmark3d from "@/assets/icons/bookmark-3d-orange.png";
import pushButton3d from "@/assets/icons/push-button-3d.png";
import collectionMagnetIcon from "@/assets/fridge-magnet-collection-2.png";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections, useCollectionQuizzes } from "@/hooks/useCollections";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";

import { EditQuizModal } from "./EditQuizModal";
import { EditRoundModal } from "./EditRoundModal";
import { TriviaPlayModeModal } from "./TriviaPlayModeModal";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { AddRoundToCollectionModal } from "./AddRoundToCollectionModal";
import { useDrafts } from "@/hooks/useDrafts";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { PUBLIC_SHARING_ENABLED } from "@/config/features";

// Localized time format helper
function formatLocalTimeAgo(date: Date, t: (key: string, params?: Record<string, string | number>) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return t("extra.timeJustNow");
  if (diffMins < 60) return t("extra.timeMinutesAgo", { count: diffMins });
  if (diffHours < 24) return t("extra.timeHoursAgo", { count: diffHours });
  if (diffDays === 1) return t("extra.timeYesterday");
  if (diffDays < 7) return t("extra.timeDaysAgo", { count: diffDays });
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Convert raw database quiz to SamplePost format for QuizPlayModal
function convertQuizToSamplePost(quiz: any, profile: any) {
  return {
    id: quiz.id,
    username: profile?.nickname || "user",
    displayName: profile?.nickname || "User",
    avatarUrl: profile?.avatar_url || "",
    verified: false,
    createdAt: quiz.created_at,
    title: quiz.title,
    description: quiz.description || "",
    subject: quiz.subject || "",
    hashtags: quiz.hashtags || [],
    coverGradient: quiz.cover_gradient || "",
    coverImage: quiz.cover_image,
    questionCount: quiz.question_count,
    answerFormat: quiz.answer_format,
    likesCount: quiz.likes_count || 0,
    playsCount: quiz.plays_count || 0,
    savesCount: quiz.saves_count || 0,
    commentsCount: 0,
    // Convert question_text to question
    questions: (quiz.questions || []).map((q: any) => ({
      question: q.question_text || q.question,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers || [],
      icon_slug: q.icon_slug || q.iconSlug || null,
    })),
    isUserPost: true,
  };
}

import { SortFilter } from "./FeedFiltersBar";
import { matchesQuery } from "@/utils/searchMatch";

interface MyTriviaTabProps {
  onCreateQuiz?: () => void;
  onCreateCollection?: () => void;
  onContinueDraft?: (draftId: string) => void;
  searchQuery?: string;
  sortFilter?: SortFilter;
  onPlay?: (post: any, collectionPosts?: any[]) => void;
  onEditingRoundChange?: (isEditing: boolean) => void;
  onNavigateToTab?: (tab: string) => void;
}

// Compact quiz card for inside collections
function CollectionQuizCard({ quiz, profile, onEdit, onPlay }: { quiz: any; profile: any; onEdit: (quiz: any) => void; onPlay?: (quiz: any) => void }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  // Get icon from quiz's icon_slug or first question's icon
  const iconSlug = quiz.icon_slug || (Array.isArray(quiz.questions) ? quiz.questions[0]?.icon_slug : null);
  
  // Helper to get gradient style
  const gradientStyle = quiz.cover_gradient?.includes('gradient') || quiz.cover_gradient?.includes('#') || quiz.cover_gradient?.includes('rgb')
    ? { background: quiz.cover_gradient }
    : undefined;
  const gradientClass = gradientStyle ? '' : `bg-gradient-to-br ${quiz.cover_gradient || 'from-purple-500 to-pink-500'}`;

  return (
    <div 
      className="flex gap-3 p-4 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted/70 transition-colors"
      onClick={() => onEdit(quiz)}
    >
      {/* Round icon - shows cover image, icon, or fallback to round number */}
      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden relative">
        {quiz.cover_image ? (
          <img src={quiz.cover_image} alt="" className="w-full h-full object-cover" />
        ) : iconSlug ? (
          <div className={`w-full h-full flex items-center justify-center ${gradientClass}`} style={gradientStyle}>
            <DynamicIcon slug={iconSlug} size={32} className="object-contain" />
          </div>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${gradientClass}`} style={gradientStyle}>
            <span className="text-white text-xs font-bold">R{quiz.round_number || 1}</span>
          </div>
        )}
      </div>

      {/* 3-row layout */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 relative">
        {/* 1) Trivia name */}
        <p className="font-medium text-foreground text-sm truncate pr-16">{quiz.title}</p>

        {/* Edit button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(quiz);
          }}
          className="absolute top-0 right-8 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Edit trivia"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Play button (purple) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay?.(quiz);
          }}
          className="absolute top-0 right-0 p-2 rounded-full hover:bg-muted transition-colors text-purple-500"
          aria-label="Play trivia"
        >
          <Play className="w-4 h-4 fill-current" />
        </button>

        {/* 2) X questions + Edit */}
        <div className="flex items-center justify-between gap-2 -mt-2.5">
          <p className="text-xs text-muted-foreground">
            {t("extra.questionsCount", { count: quiz.question_count })}
          </p>
          <span aria-hidden className="w-9" />
        </div>

        {/* 3) likes/saves/plays — social counters, hidden with public sharing */}
        {PUBLIC_SHARING_ENABLED && (
        <div className="flex items-center gap-6 text-[17px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <img src={purpleHeart3d} alt="Likes" className="w-[26px] h-[26px] object-contain" />
            <span>{quiz.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={bookmark3d} alt="Saves" className="w-[26px] h-[26px] object-contain" />
            <span>{quiz.saves_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={pushButton3d} alt="Plays" className="w-[26px] h-[26px] object-contain" />
            <span>{quiz.plays_count || 0}</span>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Helper to get gradient style (handles both CSS strings and Tailwind classes)
function getGradientProps(gradient: string) {
  if (gradient?.includes('gradient') || gradient?.includes('#') || gradient?.includes('rgb')) {
    return { style: { background: gradient }, className: '' };
  }
  return { style: undefined, className: `bg-gradient-to-br ${gradient}` };
}

// Expandable collection card
function CollectionCard({ 
  collection, 
  profile, 
  onEditCollection, 
  onEditRound, 
  onAddRound, 
  onPlay, 
  onPost, 
  isNew, 
  isPosting,
  isExpanded: isExpandedProp,
  onExpandChange,
  isMobile
}: { 
  collection: any; 
  profile: any; 
  onEditCollection: (item: any) => void; 
  onEditRound: (quiz: any) => void; 
  onAddRound: (collectionId: string, nextRoundNumber: number) => void; 
  onPlay?: (quiz: any, allQuizzes?: any[]) => void; 
  onPost?: (collection: any) => void; 
  isNew?: boolean; 
  isPosting?: boolean;
  isExpanded?: boolean;
  onExpandChange?: (collectionId: string | null) => void;
  isMobile?: boolean;
}) {
  const { t } = useLanguage();
  const isExpanded = isExpandedProp ?? false;
  
  const handleToggleExpand = () => {
    const newExpandedState = !isExpanded;
    onExpandChange?.(newExpandedState ? collection.id : null);
  };

  const handlePlayCollection = () => {
    if (quizzes && quizzes.length > 0) {
      const allPosts = quizzes.map(q => convertQuizToSamplePost(q, profile));
      onPlay?.(allPosts[0], allPosts);
    }
  };

  const { data: quizzes, isLoading } = useCollectionQuizzes(isExpanded ? collection.id : null);

  const roundsCount =
    (Array.isArray(collection?.rounds) && typeof collection.rounds?.[0]?.count === "number"
      ? collection.rounds[0].count
      : undefined) ??
    (typeof collection?.rounds_count === "number" ? collection.rounds_count : undefined) ??
    0;

  const gradientProps = getGradientProps(collection.cover_gradient);

  // Tilt animation for new items - random left or right tilt
  const tiltDirection = collection.id.charCodeAt(0) % 2 === 0 ? 15 : -15;

  // Desktop: Render as fixed centered modal when expanded
  if (isExpanded && !isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))]"
          onClick={(e) => { 
            if (e.target === e.currentTarget) onExpandChange?.(null);
          }}
        >
          <motion.div 
            className="bg-card rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-2xl 
                       w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrollable content container */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Header with image/gradient */}
              <div className="h-40 relative overflow-hidden flex-shrink-0">
                {collection.cover_image ? (
                  <>
                    <img src={collection.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30" />
                  </>
                ) : (
                  <>
                    <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
                    <div className="absolute inset-0 bg-black/20" />
                  </>
                )}
                
                {/* Close Button */}
                <button 
                  onClick={() => onExpandChange?.(null)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <ChevronUp className="w-5 h-5 text-white" />
                </button>
                
                {/* Edit Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); onEditCollection(collection); }}
                  className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-white" />
                </button>
                

                {/* Title */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <h4 className={`${
                    collection.title.length > 60 ? 'text-xs' :
                    collection.title.length > 45 ? 'text-sm' :
                    collection.title.length > 30 ? 'text-base' : 'text-lg'
                  } font-bold text-white text-center px-4 drop-shadow-lg line-clamp-2`}>
                    {collection.title}
                  </h4>
                </div>
              </div>

              {/* Collection Info */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  {/* Collection Badge */}
                  <div 
                    className="flex items-center gap-2 text-white rounded-full px-3 py-1.5"
                    style={{ background: "linear-gradient(135deg, #F97316 0%, #8B5CF6 50%, #3B82F6 100%)" }}
                  >
                    <Layers className="w-4 h-4" />
                    <span className="text-sm font-medium">{t("extra.collectionLabel")}</span>
                  </div>
                  {/* Visibility badge */}
                  <div className="bg-muted rounded-full h-8 px-3 text-xs text-muted-foreground flex items-center gap-1.5">
                    {PUBLIC_SHARING_ENABLED && collection.is_public && (
                      <Globe className="w-3.5 h-3.5" aria-hidden />
                    )}
                    <span>{t("extra.roundsBadge", { count: roundsCount })}</span>
                  </div>
                </div>
              </div>

              {/* Rounds List */}
              <div className="p-4 space-y-2">
                {/* Add Round Button - At Top */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRoundNumber = (quizzes?.length || 0) + 1;
                    onAddRound(collection.id, nextRoundNumber);
                  }}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-muted-foreground/30 
                             bg-muted/30 hover:bg-muted/50 transition-colors 
                             flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("extra.addRoundLabel")}</span>
                </button>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : quizzes && quizzes.length > 0 ? (
                  quizzes.map((quiz) => (
                    <CollectionQuizCard 
                      key={quiz.id} 
                      quiz={quiz} 
                      profile={profile}
                      onEdit={onEditRound}
                      onPlay={(q) => onPlay?.(convertQuizToSamplePost(q, profile), quizzes?.map(qz => convertQuizToSamplePost(qz, profile)))}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("extra.noQuizzesInCollection")}
                  </p>
                )}
              </div>
            </div>
            
            {/* Fixed Play Button at bottom */}
            <div className="p-4 border-t border-border bg-card flex-shrink-0">
              <ChunkyButton 
                variant="primary" 
                size="lg" 
                className="w-full gap-2"
                onClick={handlePlayCollection}
                disabled={!quizzes || quizzes.length === 0}
              >
                <Play className="w-5 h-5 fill-current" />
                {t("common.play")}
              </ChunkyButton>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Mobile / collapsed: Render normal in-grid card
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, rotate: tiltDirection } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={isNew ? { type: "spring", stiffness: 300, damping: 20 } : undefined}
      className={cn(
        "bg-card rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-lg",
        // z-10, not z-50: lifts the expanded card above its sibling cards
        // (z-auto) but keeps it UNDER the page's sticky header stack (z-20),
        // so scrolling slides it beneath the tabs instead of over them.
        isExpanded && "relative z-10"
      )}
    >
      {/* Collection Header - Clickable */}
      <button
        onClick={handleToggleExpand}
        className="w-full text-left"
      >
        {/* Gradient Banner */}
        <div className="h-32 relative overflow-hidden">
          {collection.cover_image ? (
            <>
              <img src={collection.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30" />
            </>
          ) : (
            <>
              <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
              <div className="absolute inset-0 bg-black/20" />
            </>
          )}
          
          {/* Edit Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onEditCollection(collection); }}
            className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <Pencil className="w-4 h-4 text-white" />
          </button>
          

          {/* Visibility + rounds count (single pill like trivia cards) */}
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full h-8 px-3 text-xs text-white flex items-center gap-1.5">
            {PUBLIC_SHARING_ENABLED && collection.is_public && (
              <Globe className="w-3.5 h-3.5" aria-hidden />
            )}
            <span>{t("extra.roundsBadge", { count: roundsCount })}</span>
          </div>

          {/* Title */}
          <div className="absolute inset-0 flex items-center justify-center translate-y-5">
            <h4 className={`${
              collection.title.length > 60 ? 'text-xs' :
              collection.title.length > 45 ? 'text-sm' :
              collection.title.length > 30 ? 'text-base' : 'text-lg'
            } font-bold text-white text-center px-4 drop-shadow-lg line-clamp-2`}>
              {collection.title}
            </h4>
          </div>
        </div>

        {/* Info Row */}
        <div className="p-4">
          {/* Author Info + Collection Badge Row */}
          <div className="flex items-center justify-between">
            {/* Left: the collection's own face (not the author's avatar) */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <img src={collectionMagnetIcon} alt="" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate text-sm">
                  {t("extra.collectionLabel")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatLocalTimeAgo(new Date(collection.created_at), t)}
                </p>
              </div>
            </div>

            {/* Right: Collection Badge with Dropdown */}
            <div 
              className="flex items-center gap-2 text-white rounded-full pl-3 pr-2 py-1.5"
              style={{ background: "linear-gradient(135deg, #F97316 0%, #8B5CF6 50%, #3B82F6 100%)" }}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">{t("extra.collectionLabel")}</span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center ml-1">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-white" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
          </div>
          
          {/* Buttons Row — the row only holds the publish toggle, so it
              disappears entirely while public sharing is hidden. */}
          {PUBLIC_SHARING_ENABLED && (
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); onPost?.(collection); }}
              disabled={isPosting}
              className={`flex-1 h-10 flex items-center justify-center gap-2 px-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                collection.is_public === false
                  ? 'bg-transparent border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500/10'
                  : 'bg-green-500/20 text-green-600 hover:bg-green-500/30'
              }`}
            >
              {isPosting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : collection.is_public === false ? (
                <>
                  <Globe className="w-4 h-4 text-emerald-500" />
                   <span>{t("extra.publishBtn")}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                   <span>{t("extra.publishedLabel")}</span>
                </>
              )}
            </button>
          </div>
          )}
        </div>
      </button>

      {/* Expanded Quizzes - Mobile Only */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
              {/* Add Round Button - At Top */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextRoundNumber = (quizzes?.length || 0) + 1;
                  onAddRound(collection.id, nextRoundNumber);
                }}
                className="w-full py-3 rounded-xl border-2 border-dashed border-muted-foreground/30 
                           bg-muted/30 hover:bg-muted/50 transition-colors 
                           flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">{t("extra.addRoundLabel")}</span>
              </button>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : quizzes && quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <CollectionQuizCard 
                    key={quiz.id} 
                    quiz={quiz} 
                    profile={profile}
                    onEdit={onEditRound}
                    onPlay={(q) => onPlay?.(convertQuizToSamplePost(q, profile), quizzes?.map(qz => convertQuizToSamplePost(qz, profile)))}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("extra.noQuizzesInCollection")}
                </p>
              )}
              
              {/* Play All Button - Mobile */}
              <ChunkyButton 
                variant="primary" 
                size="lg" 
                className="w-full gap-2 mt-3"
                onClick={handlePlayCollection}
                disabled={!quizzes || quizzes.length === 0}
              >
                <Play className="w-5 h-5 fill-current" />
                {t("common.play")}
              </ChunkyButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Personal trivia card with distinct styling
function PersonalTriviaCard({ post, profile, index, onEdit, onPlay, onPost, isNew, isPosting }: { post: any; profile: any; index: number; onEdit: (post: any) => void; onPlay?: (post: any) => void; onPost?: (post: any) => void; isNew?: boolean; isPosting?: boolean }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { createRoom } = useMultiplayerV2();
  const [isStartingTV, setIsStartingTV] = useState(false);
  const gradientProps = getGradientProps(post.cover_gradient);
  const tiltDirection = post.id.charCodeAt(0) % 2 === 0 ? 15 : -15;

  const handlePlayOnTV = async () => {
    if (isStartingTV) return;
    await (async () => {
      setIsStartingTV(true);
      try {
        const { data, error } = await supabase
          .from("user_quiz_posts")
          .select("questions, title, cover_image")
          .eq("id", post.id)
          .single();

        if (error || !data?.questions) {
          toast.error(t("extra.triviaQuestionsNotFound"));
          return;
        }

        const customQuestions = (data.questions as any[]) || [];
        if (!customQuestions.length) {
          toast.error(t("extra.triviaQuestionsNotFound"));
          return;
        }

        // Create room with "My Trivia Party" as default room name, trivia title as category
        const room = await createRoom(
          "custom",
          data.title || post.title || "My Trivia Party", // category_name (what's being played)
          customQuestions,
          "My Trivia Party", // room_name (always "My Trivia Party")
          (data.cover_image as string | null) || null
        );

        if (room?.id && room?.room_code) {
          // Update the game_rooms table with user_trivia_id for reference
          // No need to add to room_category_queue - the room's category_name serves as round 1
          await supabase
            .from("game_rooms")
            .update({ user_trivia_id: post.id })
            .eq("id", room.id);

          navigate(`/team?join=${room.room_code}&tvMode=true`);
        }
      } catch (e) {
        console.error("Play on TV error:", e);
        toast.error(t("extra.tvModeStartError"));
      } finally {
        setIsStartingTV(false);
      }
    })();
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, rotate: tiltDirection } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={isNew ? { type: "spring", stiffness: 300, damping: 20, delay: index * 0.05 } : { delay: index * 0.05 }}
      onClick={() => onEdit(post)}
      className="relative bg-card rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
      style={{ border: "2px solid rgba(236, 72, 153, 0.5)" }}
    >
      {/* Party Badge */}
      <div className="absolute top-3 left-14 z-10 flex h-8 items-center bg-pink-500/90 text-white px-3 rounded-full text-xs font-semibold shadow-md">
        <span>My Trivia Party</span>
      </div>

      {/* Edit Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onEdit(post); }}
        className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
      >
        <Pencil className="w-4 h-4 text-white" />
      </button>


      {/* Cover Image or Gradient Thumbnail */}
      <div className="h-32 relative overflow-hidden">
        {post.cover_image ? (
          <>
            <img src={post.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          <>
            <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
            <div className="absolute inset-0 bg-black/20" />
          </>
        )}
        <div className="absolute inset-0 flex items-center justify-center translate-y-5">
          <h4 className="text-xl font-bold text-white text-center px-4 drop-shadow-lg">
            {post.title}
          </h4>
        </div>
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full h-8 px-3 text-xs text-white flex items-center gap-1.5">
          {PUBLIC_SHARING_ENABLED && post.is_public !== false && (
            <Globe className="w-3.5 h-3.5" aria-hidden />
          )}
          <span>{t("extra.questionsCount", { count: (Array.isArray(post.questions) ? post.questions.length : post.question_count) || 0 })}</span>
        </div>
      </div>

      {/* Author Info & Stats */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* the party's own face, not the host's avatar */}
          <div className="w-10 h-10 rounded-lg bg-pink-500/15 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-6 h-6 text-pink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {t("extra.myTriviaPartyLabel")}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatLocalTimeAgo(new Date(post.created_at), t)}
            </p>
          </div>
        </div>

        {/* Stats Row — social counters, hidden with public sharing */}
        {PUBLIC_SHARING_ENABLED && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <img src={purpleHeart3d} alt="Likes" className="w-5 h-5 object-contain" />
            <span>{post.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <img src={bookmark3d} alt="Saves" className="w-5 h-5 object-contain" />
            <span>{post.saves_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <img src={pushButton3d} alt="Plays" className="w-5 h-5 object-contain" />
            <span>{post.plays_count || 0}</span>
          </div>
        </div>
        )}
        
        {/* Buttons Row */}
        <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
          <ChunkyButton
            size="sm"
            variant="primary"
            className="flex-1 h-10 text-sm"
            onClick={handlePlayOnTV}
            disabled={isStartingTV}
            icon={
              isStartingTV ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )
            }
          >
            {t("extra.playWithFriendsBtn")}
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  );
}

// Standalone quiz card (not in a collection)
function StandaloneQuizCard({ 
  post, 
  profile, 
  index, 
  onEdit, 
  onPlay, 
  onPost, 
  isNew, 
  isPosting,
  onPlayModeSelect
}: { 
  post: any; 
  profile: any; 
  index: number; 
  onEdit: (post: any) => void; 
  onPlay?: (post: any) => void; 
  onPost?: (post: any) => void; 
  isNew?: boolean; 
  isPosting?: boolean;
  onPlayModeSelect?: (post: any) => void;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const gradientProps = getGradientProps(post.cover_gradient);

  // Tilt animation for new items - random left or right tilt
  const tiltDirection = post.id.charCodeAt(0) % 2 === 0 ? 15 : -15;

  // One play per person: once the owner has played their blind trivia the
  // button turns into a challenge — friends can still be invited to beat
  // the score, but a second solo run would be an open-book exam.
  const alreadyPlayedByMe = !!post.is_blind && (post.plays_count || 0) > 0;

  const handlePlayClick = () => {
    // If trivia is "blind" (locked/დახურული), show play mode selection
    if (post.is_blind) {
      onPlayModeSelect?.(post);
    } else {
      // Open trivia - navigate directly
      navigate(`/trivia/${post.id}`);
    }
  };

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, rotate: tiltDirection } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={isNew ? { type: "spring", stiffness: 300, damping: 20, delay: index * 0.05 } : { delay: index * 0.05 }}
      onClick={() => onEdit(post)}
      className="relative bg-card rounded-2xl border-2 border-primary/30 overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
    >
      {/* Edit Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onEdit(post); }}
        className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
      >
        <Pencil className="w-4 h-4 text-white" />
      </button>


      {/* Cover Image or Gradient Thumbnail */}
      <div className="h-32 relative overflow-hidden">
        {post.cover_image ? (
          <>
            <img src={post.cover_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
          </>
        ) : (
          <>
            <div className={`absolute inset-0 ${gradientProps.className}`} style={gradientProps.style} />
            <div className="absolute inset-0 bg-black/20" />
          </>
        )}
        <div className="absolute inset-0 flex items-center justify-center translate-y-5">
          <h4 className="text-xl font-bold text-white text-center px-4 drop-shadow-lg">
            {post.title}
          </h4>
        </div>
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full h-8 px-3 text-xs text-white flex items-center gap-1.5">
          {PUBLIC_SHARING_ENABLED && post.is_public !== false && (
            <Globe className="w-3.5 h-3.5" aria-hidden />
          )}
          <span>{t("extra.questionsCount", { count: (Array.isArray(post.questions) ? post.questions.length : post.question_count) || 0 })}</span>
        </div>
      </div>

      {/* Author Info & Stats */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* the trivia's own face — the buzzer — not the author's avatar */}
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <img src={triviaBuzzerIcon} alt="" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {t("extra.triviaLabel")}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatLocalTimeAgo(new Date(post.created_at), t)}
            </p>
          </div>
          {/* With the social row gone the card is just author + Play, so the
              button rides the author row instead of a row of its own. */}
          {!PUBLIC_SHARING_ENABLED && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <ChunkyButton
                size="sm"
                variant="outline"
                className="h-10 text-sm"
                onClick={handlePlayClick}
              >
                {alreadyPlayedByMe ? (
                  <span>{t("extra.challengeFriendBtn")}</span>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>{t("extra.playBtn")}</span>
                  </>
                )}
              </ChunkyButton>
            </div>
          )}
        </div>

        {/* Stats Row — social counters, hidden with public sharing */}
        {PUBLIC_SHARING_ENABLED && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <img src={purpleHeart3d} alt="Likes" className="w-5 h-5 object-contain" />
            <span>{post.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <img src={bookmark3d} alt="Saves" className="w-5 h-5 object-contain" />
            <span>{post.saves_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <img src={pushButton3d} alt="Plays" className="w-5 h-5 object-contain" />
            <span>{post.plays_count || 0}</span>
          </div>
        </div>
        )}

        {/* Buttons Row — publish + play, only while public sharing is on */}
        {PUBLIC_SHARING_ENABLED && (
        <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onPost?.(post)}
            disabled={isPosting}
            className={`flex-1 h-10 flex items-center justify-center gap-2 px-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              post.is_public === false
                ? 'bg-transparent border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500/10'
                : 'bg-green-500/20 text-green-600 hover:bg-green-500/30'
            }`}
          >
            {isPosting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : post.is_public === false ? (
              <>
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>{t("extra.publishBtn")}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{t("extra.publishedLabel")}</span>
              </>
            )}
          </button>
          <ChunkyButton
            size="sm"
            variant="outline"
            className="flex-1 h-10 text-sm"
            onClick={handlePlayClick}
          >
            <Play className="w-4 h-4" />
            <span>{t("extra.playBtn")}</span>
          </ChunkyButton>
        </div>
        )}
      </div>
    </motion.div>
  );
}
export function MyTriviaTab({ onCreateQuiz, onCreateCollection, onContinueDraft, searchQuery = "", sortFilter = "all", onPlay, onEditingRoundChange, onNavigateToTab }: MyTriviaTabProps) {
  const queryClient = useQueryClient();
  const { data: myPosts, isLoading: postsLoading } = useMyQuizPosts();
  const { data: myCollections, isLoading: collectionsLoading } = useMyCollections();
  const { drafts, isLoading: draftsLoading, deleteDraft } = useDrafts();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { createRoom } = useMultiplayerV2();
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [editingRound, setEditingRound] = useState<any>(null);
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Feature onboarding state
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => hasSeenFeatureOnboarding());
  
  // Play mode modal state for locked trivias
  const [playModeTrivia, setPlayModeTrivia] = useState<any>(null);
  const [isStartingRoom, setIsStartingRoom] = useState(false);
  
  // Notify parent when editing round state changes
  useEffect(() => {
    onEditingRoundChange?.(!!editingRound);
  }, [editingRound, onEditingRoundChange]);
  const [addingToCollection, setAddingToCollection] = useState<{
    collectionId: string;
    roundNumber: number;
  } | null>(null);
  const [postingItemId, setPostingItemId] = useState<string | null>(null);

  // Mutation to toggle visibility (private ↔ public)
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, type, newPublicState }: { id: string; type: 'quiz' | 'collection'; newPublicState: boolean }) => {
      setPostingItemId(id);
      
      if (type === 'collection') {
        // Update collection
        const { error: collectionError } = await supabase
          .from('quiz_collections')
          .update({ is_public: newPublicState })
          .eq('id', id);
        
        if (collectionError) throw collectionError;
        
        // Also update all rounds in the collection
        const { error: roundsError } = await supabase
          .from('user_quiz_posts')
          .update({ is_public: newPublicState })
          .eq('collection_id', id);
        
        if (roundsError) throw roundsError;
      } else {
        // Update standalone quiz
        const { error } = await supabase
          .from('user_quiz_posts')
          .update({ is_public: newPublicState })
          .eq('id', id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-quiz-posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-collections'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-posts-with-profiles'] });
      
      if (variables.newPublicState) {
        toast.success(t("extra.visibilityPublicToast"));
      } else {
        toast.success(t("extra.visibilityPrivateToast"));
      }
      setPostingItemId(null);
    },
    onError: (error) => {
      console.error('Error toggling visibility:', error);
      toast.error(t("extra.visibilityChangeFailed"));
      setPostingItemId(null);
    }
  });

  const handleToggleQuizVisibility = (post: any) => {
    const currentlyPublic = post.is_public !== false;
    toggleVisibilityMutation.mutate({ id: post.id, type: 'quiz', newPublicState: !currentlyPublic });
  };

  const handleToggleCollectionVisibility = (collection: any) => {
    const currentlyPublic = collection.is_public !== false;
    toggleVisibilityMutation.mutate({ id: collection.id, type: 'collection', newPublicState: !currentlyPublic });
  };

  // Play mode handlers for locked trivias
  const handlePlaySolo = () => {
    if (!playModeTrivia) return;
    navigate(`/trivia/${playModeTrivia.id}`);
    setPlayModeTrivia(null);
  };

  const handleCreateRoom = async () => {
    if (!playModeTrivia || isStartingRoom) return;
    await (async () => {
      if (!playModeTrivia) return;
      setIsStartingRoom(true);
      try {
        const { data, error } = await supabase
          .from("user_quiz_posts")
          .select("questions, title, cover_image")
          .eq("id", playModeTrivia.id)
          .single();

        if (error || !data?.questions) {
          toast.error(t("extra.triviaQuestionsNotFound"));
          return;
        }

        const customQuestions = (data.questions as any[]) || [];
        if (!customQuestions.length) {
          toast.error(t("extra.triviaQuestionsNotFound"));
          return;
        }

        const room = await createRoom(
          "custom",
          data.title || playModeTrivia.title || "My Trivia",
          customQuestions,
          "Trivia Room",
          (data.cover_image as string | null) || null
        );

        if (room?.id && room?.room_code) {
          await supabase
            .from("game_rooms")
            .update({ user_trivia_id: playModeTrivia.id })
            .eq("id", room.id);

          navigate(`/team?join=${room.room_code}`);
        }
      } catch (e) {
        console.error("Create room error:", e);
        toast.error(t("extra.roomCreateFailed"));
      } finally {
        setIsStartingRoom(false);
        setPlayModeTrivia(null);
      }
    })();
  };

  const handlePlayTV = async () => {
    if (!playModeTrivia || isStartingRoom) return;
    await (async () => {
      if (!playModeTrivia) return;
      setIsStartingRoom(true);
      try {
        const { data, error } = await supabase
          .from("user_quiz_posts")
          .select("questions, title, cover_image")
          .eq("id", playModeTrivia.id)
          .single();

        if (error || !data?.questions) {
          toast.error(t("extra.triviaQuestionsNotFound"));
          return;
        }

        const customQuestions = (data.questions as any[]) || [];
        if (!customQuestions.length) {
          toast.error(t("extra.triviaQuestionsNotFound"));
          return;
        }

        const room = await createRoom(
          "custom",
          data.title || playModeTrivia.title || "My Trivia",
          customQuestions,
          "TV Trivia",
          (data.cover_image as string | null) || null
        );

        if (room?.id && room?.room_code) {
          await supabase
            .from("game_rooms")
            .update({ user_trivia_id: playModeTrivia.id })
            .eq("id", room.id);

          navigate(`/team?join=${room.room_code}&tvMode=true`);
        }
      } catch (e) {
        console.error("TV mode error:", e);
        toast.error(t("extra.tvModeStartError"));
      } finally {
        setIsStartingRoom(false);
        setPlayModeTrivia(null);
      }
    })();
  };

  // Track known item IDs to detect new items for tilt animation
  const knownItemIdsRef = useRef<Set<string>>(new Set());
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  // Update known items when data changes - detect newly added items
  useEffect(() => {
    if (!myPosts && !myCollections) return;
    
    const allCurrentIds = new Set<string>();
    myPosts?.forEach(post => allCurrentIds.add(post.id));
    myCollections?.forEach(col => allCurrentIds.add(col.id));
    
    // Find items that are new (not in our known set)
    const newIds = new Set<string>();
    allCurrentIds.forEach(id => {
      if (!knownItemIdsRef.current.has(id)) {
        newIds.add(id);
      }
    });
    
    // Update new items state if we found any
    if (newIds.size > 0) {
      setNewItemIds(newIds);
      
      // Clear "new" status after animation completes
      const timer = setTimeout(() => {
        setNewItemIds(new Set());
      }, 1000);
      
      // Update known items
      allCurrentIds.forEach(id => knownItemIdsRef.current.add(id));
      
      return () => clearTimeout(timer);
    }
    
    // Update known items on first load
    if (knownItemIdsRef.current.size === 0) {
      allCurrentIds.forEach(id => knownItemIdsRef.current.add(id));
    }
  }, [myPosts, myCollections]);

  const isLoading = postsLoading || collectionsLoading || draftsLoading;

  // Filter standalone posts (not in any collection)
  const allStandalonePosts = myPosts?.filter(post => !post.collection_id) || [];
  
  // Apply search filter
  //
  // matchesQuery rather than a raw includes, so a Georgian title answers to a
  // Latin keyboard the same way the rooms list does — "ზეიმის მოედანი" from
  // `zeimis`, or from `ze`.
  const searchLower = searchQuery.toLowerCase().trim();
  const searchFilteredPosts = searchLower
    ? allStandalonePosts.filter(post =>
        matchesQuery(searchQuery, [post.title, post.subject, ...(post.hashtags ?? [])])
      )
    : allStandalonePosts;

  const searchFilteredCollections = searchLower
    ? myCollections?.filter(col =>
        matchesQuery(searchQuery, [col.title, col.description, ...(col.hashtags ?? [])])
      )
    : myCollections;

  // "collections" shows only collections, "personal" narrows to MyTrivia
  // Party, and "trivias" shows every standalone trivia — parties included.
  // It used to exclude them, so a party you had just made and named was
  // nowhere on the one list called "trivias", and the only way to see it was
  // to know about a filter you had never picked.
  let standalonePosts = sortFilter === "collections"
    ? []
    : sortFilter === "personal"
      ? searchFilteredPosts.filter(p => p.subject === "personal")
      : [...searchFilteredPosts];
  let filteredCollections = sortFilter === "trivias" || sortFilter === "personal" ? [] : [...(searchFilteredCollections || [])];
  
  // Apply visibility filter
  if (sortFilter === "private") {
    standalonePosts = standalonePosts.filter(p => p.is_public === false);
    filteredCollections = filteredCollections.filter(c => c.is_public === false);
  } else if (sortFilter === "published") {
    standalonePosts = standalonePosts.filter(p => p.is_public === true);
    filteredCollections = filteredCollections.filter(c => c.is_public === true);
  }
  
  // Apply sorting based on sortFilter
  const getEngagementScore = (item: any) => 
    (item.likes_count || 0) + (item.saves_count || 0) + (item.plays_count || 0);

  switch (sortFilter) {
    case "most_played":
      standalonePosts = standalonePosts.sort((a, b) => (b.plays_count || 0) - (a.plays_count || 0));
      filteredCollections = filteredCollections.sort((a, b) => (b.plays_count || 0) - (a.plays_count || 0));
      break;
    default:
      // "all", "trivias", "collections" - sort by date, newest first
      standalonePosts = standalonePosts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      filteredCollections = filteredCollections.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
  }
  
  // Merge collections and standalone posts into a unified sorted list
  type FeedItem = { type: 'collection'; data: any } | { type: 'standalone'; data: any };
  
  let unifiedFeed: FeedItem[] = [
    ...filteredCollections.map(c => ({ type: 'collection' as const, data: c })),
    ...standalonePosts.map(p => ({ type: 'standalone' as const, data: p })),
  ];
  
  // Newest first unless an engagement sort was asked for. Written as an
  // exclusion rather than a list of filters so a new filter is date-sorted by
  // default instead of coming out in whatever order the arrays were built —
  // which is what "personal", "private" and "published" used to do.
  if (sortFilter === "most_played") {
    unifiedFeed = unifiedFeed.sort((a, b) => (b.data.plays_count || 0) - (a.data.plays_count || 0));
  } else {
    unifiedFeed = unifiedFeed.sort(
      (a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime(),
    );
  }
  
  const hasContent = unifiedFeed.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasContent) {
    // An active search with no hits says "no trivia found" — it must not
    // fall through to the onboarding carousel or the "create your first
    // trivia" card, both of which read as answers to a different question.
    if (searchLower) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4"
        >
          <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-12 px-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4">
              <img src={triviaBuzzerIcon} alt="" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              {t("extra.searchTriviaNotFound")}
            </h3>
            <p className="text-muted-foreground text-center text-xs max-w-xs">
              {t("extra.searchTryDifferent")}
            </p>
          </div>
        </motion.div>
      );
    }

    // Dynamic empty state message based on filter
    const getEmptyStateMessage = () => {
      switch (sortFilter) {
        case "personal":
          return {
            title: "MyTrivia Party",
            description: t("extra.createPersonalParty")
          };
        case "trivias":
          return {
            title: "Trivia",
            description: t("extra.createFirstTriviaDesc")
          };
        case "collections":
          return {
            title: t("extra.collectionsTabLabel"),
            description: t("extra.createCollectionDesc")
          };
        default:
          return {
            title: t("extra.yourTrivias"),
            description: t("extra.createOwnQuizzes")
          };
      }
    };

    const { title, description } = getEmptyStateMessage();

    // Show onboarding carousel for new users who haven't seen it
    if (!hasSeenOnboarding && sortFilter === "all") {
      return (
        <FeatureOnboardingCarousel
          onNavigateToTab={onNavigateToTab}
          onComplete={() => setHasSeenOnboarding(true)}
          onCreateTrivia={onCreateQuiz}
          contextTab="my-content"
        />
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-12 px-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4">
            <img src={triviaBuzzerIcon} alt="" className="w-full h-full object-contain" />
          </div>
          
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            {sortFilter === "all" ? t("extra.noTriviasYet") : title}
          </h3>
          
          <p className="text-muted-foreground text-center text-xs max-w-xs mb-5">
            {sortFilter === "all" ? t("extra.createFirstTrivia") : description}
          </p>
          
          {onCreateQuiz && sortFilter === "all" && (
            <ChunkyButton onClick={onCreateQuiz} size="sm">{t("extra.feedCreateTriviaBtn")}</ChunkyButton>
          )}
        </div>
      </motion.div>
    );
  }

  const totalCount = unifiedFeed.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Drafts Section */}
      {drafts && drafts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">{t("extra.draftsLabel")} ({drafts.length})</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {drafts.map((draft) => (
              <div 
                key={draft.id}
                className="min-w-[180px] max-w-[180px] bg-card rounded-xl border-2 border-dashed border-primary/30 p-3 space-y-2 flex-shrink-0"
              >
                {/* Draft cover preview or placeholder */}
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {draft.cover_image ? (
                    <img src={draft.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileEdit className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                
                {/* Title */}
                <div>
                  <p className="font-medium text-sm truncate text-foreground">
                    {draft.title || t("extra.untitledDraft")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatLocalTimeAgo(new Date(draft.updated_at), t)}
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <ChunkyButton 
                    size="sm" 
                    onClick={() => onContinueDraft?.(draft.id)}
                    className="flex-1 text-xs"
                  >
                    {t("extra.continueLabel")}
                  </ChunkyButton>
                  <button 
                    onClick={() => deleteDraft(draft.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Section - header hidden per user request */}

      {/* Dark blur overlay when collection is expanded (md+ only) */}
      <AnimatePresence>
        {expandedCollectionId && !isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setExpandedCollectionId(null)}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unified feed - sorted by date, newest first */}
        {unifiedFeed.map((item, index) => (
          item.type === 'collection' ? (
            <CollectionCard 
              key={item.data.id} 
              collection={item.data} 
              profile={profile} 
              onEditCollection={(data) => setEditingQuiz(data)}
              onEditRound={(quiz) => setEditingRound(quiz)}
              onAddRound={(collectionId, roundNumber) => 
                setAddingToCollection({ collectionId, roundNumber })
              }
              onPlay={onPlay}
              onPost={handleToggleCollectionVisibility}
              isNew={newItemIds.has(item.data.id)}
              isPosting={postingItemId === item.data.id}
              isExpanded={expandedCollectionId === item.data.id}
              onExpandChange={setExpandedCollectionId}
              isMobile={isMobile}
            />
          ) : item.data.subject === 'personal' ? (
            <PersonalTriviaCard 
              key={item.data.id} 
              post={item.data} 
              profile={profile} 
              index={index} 
              onEdit={(post) => setEditingRound(post)}
              onPlay={onPlay}
              onPost={handleToggleQuizVisibility}
              isNew={newItemIds.has(item.data.id)}
              isPosting={postingItemId === item.data.id}
            />
          ) : (
            <StandaloneQuizCard 
              key={item.data.id} 
              post={item.data} 
              profile={profile} 
              index={index} 
              onEdit={(post) => setEditingRound(post)}
              onPlay={onPlay}
              onPost={handleToggleQuizVisibility}
              isNew={newItemIds.has(item.data.id)}
              isPosting={postingItemId === item.data.id}
              onPlayModeSelect={setPlayModeTrivia}
            />
          )
        ))}
      </div>

      {/* Edit Modal for Collections and Standalone Quizzes */}
      <EditQuizModal 
        quiz={editingQuiz} 
        isOpen={!!editingQuiz} 
        onClose={() => setEditingQuiz(null)} 
      />

      {/* Edit Modal for Collection Rounds */}
      <EditRoundModal
        round={editingRound}
        isOpen={!!editingRound}
        onClose={() => setEditingRound(null)}
        onAddRound={(collectionId, roundNumber) => {
          setEditingRound(null);
          setAddingToCollection({ collectionId, roundNumber });
        }}
      />

      {/* Add Round to Collection Modal */}
      <AddRoundToCollectionModal
        open={!!addingToCollection}
        onOpenChange={(open) => !open && setAddingToCollection(null)}
        collectionId={addingToCollection?.collectionId || ""}
        roundNumber={addingToCollection?.roundNumber || 1}
        onRoundCreated={() => setAddingToCollection(null)}
      />

      {/* Play Mode Selection Modal for Locked Trivias */}
      <TriviaPlayModeModal
        isOpen={!!playModeTrivia}
        onClose={() => setPlayModeTrivia(null)}
        trivia={playModeTrivia ? {
          id: playModeTrivia.id,
          title: playModeTrivia.title,
          questionCount: Array.isArray(playModeTrivia.questions) ? playModeTrivia.questions.length : (playModeTrivia.question_count || 0),
          coverImage: playModeTrivia.cover_image,
          coverGradient: playModeTrivia.cover_gradient,
          isBlind: playModeTrivia.is_blind,
        } : null}
        onPlaySolo={handlePlaySolo}
        onCreateRoom={handleCreateRoom}
        onPlayTV={handlePlayTV}
        alreadyPlayed={!!playModeTrivia?.is_blind && (playModeTrivia?.plays_count || 0) > 0}
      />
    </motion.div>
  );
}
