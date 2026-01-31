import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Loader2, Globe, Lock, ChevronDown, ChevronUp, Layers, Pencil, FileEdit, Trash2, Check, PartyPopper } from "lucide-react";
import glitchIcon from "@/assets/glitch.png";
import purpleHeart3d from "@/assets/icons/purple-heart-3d.png";
import bookmark3d from "@/assets/icons/bookmark-3d-orange.png";
import pushButton3d from "@/assets/icons/push-button-3d.png";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections, useCollectionQuizzes } from "@/hooks/useCollections";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";

import { EditQuizModal } from "./EditQuizModal";
import { EditRoundModal } from "./EditRoundModal";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { AddRoundToCollectionModal } from "./AddRoundToCollectionModal";
import { useDrafts } from "@/hooks/useDrafts";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Georgian time format helper
function formatGeorgianTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return "ახლახანს";
  if (diffMins < 60) return `${diffMins} წთ წინ`;
  if (diffHours < 24) return `${diffHours} სთ წინ`;
  if (diffDays === 1) return "გუშინ";
  if (diffDays < 7) return `${diffDays} დღის წინ`;
  
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
      icon_slug: q.icon_slug || null,
    })),
    isUserPost: true,
  };
}

import { SortFilter } from "./FeedFiltersBar";

interface MyTriviaTabProps {
  onCreateQuiz?: () => void;
  onCreateCollection?: () => void;
  onContinueDraft?: (draftId: string) => void;
  searchQuery?: string;
  sortFilter?: SortFilter;
  onPlay?: (post: any, collectionPosts?: any[]) => void;
  onEditingRoundChange?: (isEditing: boolean) => void;
}

// Compact quiz card for inside collections
function CollectionQuizCard({ quiz, profile, onEdit, onPlay }: { quiz: any; profile: any; onEdit: (quiz: any) => void; onPlay?: (quiz: any) => void }) {
  const navigate = useNavigate();
  // Get icon from quiz's icon_slug or first question's icon
  const iconSlug = quiz.icon_slug || (Array.isArray(quiz.questions) ? quiz.questions[0]?.icon_slug : null);
  
  // Helper to get gradient style
  const gradientStyle = quiz.cover_gradient?.includes('gradient') || quiz.cover_gradient?.includes('#') || quiz.cover_gradient?.includes('rgb')
    ? { background: quiz.cover_gradient }
    : undefined;
  const gradientClass = gradientStyle ? '' : `bg-gradient-to-br ${quiz.cover_gradient || 'from-purple-500 to-pink-500'}`;

  return (
    <div className="flex gap-3 p-4 bg-muted/50 rounded-xl">
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
        <p className="font-medium text-foreground text-sm truncate pr-10">{quiz.title}</p>

        {/* Edit button (top-right) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(quiz);
          }}
          className="absolute top-0 right-0 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Edit trivia"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* 2) X questions + Edit */}
        <div className="flex items-center justify-between gap-2 -mt-2.5">
          <p className="text-xs text-muted-foreground">
            {quiz.question_count} questions
          </p>
          <span aria-hidden className="w-9" />
        </div>

        {/* 3) likes/saves/plays + Play button */}
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <div className="flex items-center gap-4 text-[13px]">
            <div className="flex items-center gap-1">
              <img src={purpleHeart3d} alt="Likes" className="w-[19px] h-[19px] object-contain" />
              <span>{quiz.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <img src={bookmark3d} alt="Saves" className="w-[19px] h-[19px] object-contain" />
              <span>{quiz.saves_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <img src={pushButton3d} alt="Plays" className="w-[19px] h-[19px] object-contain" />
              <span>{quiz.plays_count || 0}</span>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <ChunkyButton
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1 h-7"
              onClick={() => navigate(`/trivia/${quiz.id}`)}
            >
              <Play className="w-3 h-3" />
            </ChunkyButton>
          </div>
        </div>
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
function CollectionCard({ collection, profile, onEditCollection, onEditRound, onAddRound, onPlay, onPost, isNew, isPosting }: { collection: any; profile: any; onEditCollection: (item: any) => void; onEditRound: (quiz: any) => void; onAddRound: (collectionId: string, nextRoundNumber: number) => void; onPlay?: (quiz: any, allQuizzes?: any[]) => void; onPost?: (collection: any) => void; isNew?: boolean; isPosting?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, rotate: tiltDirection } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={isNew ? { type: "spring", stiffness: 300, damping: 20 } : undefined}
      className="bg-card rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-lg"
    >
      {/* Collection Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
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
          
          {/* Collection Badge */}
          <div className="absolute top-3 left-14 flex h-8 items-center gap-1.5 bg-purple-600/90 text-white px-3 rounded-full text-xs font-semibold shadow-md">
            <Layers className="w-3.5 h-3.5" />
            <span>კოლექცია</span>
          </div>

          {/* Visibility + rounds count (single pill like trivia cards) */}
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full h-8 px-3 text-xs text-white flex items-center gap-1.5">
            {collection.is_public ? (
              <Globe className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <Lock className="w-3.5 h-3.5" aria-hidden />
            )}
            <span>{roundsCount} რაუნდი</span>
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
          <div className="flex items-center gap-3">
            {/* Simple Avatar without frame effects */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center border-2 border-border flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">👤</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{profile?.nickname || 'შენ'}</p>
              <p className="text-xs text-muted-foreground">
                {formatGeorgianTimeAgo(new Date(collection.created_at))}
              </p>
            </div>
            {/* Expand/Collapse icon */}
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <img src={purpleHeart3d} alt="Likes" className="w-4 h-4 object-contain" />
              <span>{collection.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <img src={bookmark3d} alt="Saves" className="w-4 h-4 object-contain" />
              <span>{collection.saves_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <img src={pushButton3d} alt="Plays" className="w-4 h-4 object-contain" />
              <span>{collection.plays_count || 0}</span>
            </div>
          </div>
          
          {/* Buttons Row */}
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
                  <span>გამოაქვეყნე</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>გამოქვეყნებულია</span>
                </>
              )}
            </button>
          </div>
        </div>
      </button>

      {/* Expanded Quizzes */}
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
                  ამ კოლექციაში ჯერ არ არის ქვიზები
                </p>
              )}
              
              {/* Add More Button */}
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
                <span className="text-sm font-medium">კიდევ დამატება</span>
              </button>
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
  const { createRoom } = useMultiplayerV2();
  const [isStartingTV, setIsStartingTV] = useState(false);
  const gradientProps = getGradientProps(post.cover_gradient);
  const tiltDirection = post.id.charCodeAt(0) % 2 === 0 ? 15 : -15;

  const handlePlayOnTV = async () => {
    if (isStartingTV) return;
    setIsStartingTV(true);
    try {
      const { data, error } = await supabase
        .from("user_quiz_posts")
        .select("questions, title, cover_image")
        .eq("id", post.id)
        .single();

      if (error || !data?.questions) {
        toast.error("ტრივიის კითხვები ვერ მოიძებნა");
        return;
      }

      const customQuestions = (data.questions as any[]) || [];
      if (!customQuestions.length) {
        toast.error("ტრივიის კითხვები ვერ მოიძებნა");
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

        navigate(`/team?join=${room.room_code}&tv=1`);
      }
    } catch (e) {
      console.error("Play on TV error:", e);
      toast.error("ვერ მოხერხდა TV-ზე დაწყება");
    } finally {
      setIsStartingTV(false);
    }
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
          {post.is_public !== false ? (
            <Globe className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <Lock className="w-3.5 h-3.5" aria-hidden />
          )}
          <span>{(Array.isArray(post.questions) ? post.questions.length : post.question_count) || 0} კითხვა</span>
        </div>
      </div>

      {/* Author Info & Stats */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary border-2 border-border flex-shrink-0">
            <SafeAvatarImage 
              avatarUrl={profile?.avatar_url}
              fallback={profile?.nickname || 'U'}
              containerClassName="w-full h-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {profile?.nickname || 'შენ'}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatGeorgianTimeAgo(new Date(post.created_at))}
            </p>
          </div>
        </div>

        {/* Stats Row */}
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
            ითამაშე მეგობრებთან
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  );
}

// Standalone quiz card (not in a collection)
function StandaloneQuizCard({ post, profile, index, onEdit, onPlay, onPost, isNew, isPosting }: { post: any; profile: any; index: number; onEdit: (post: any) => void; onPlay?: (post: any) => void; onPost?: (post: any) => void; isNew?: boolean; isPosting?: boolean }) {
  const navigate = useNavigate();
  const gradientProps = getGradientProps(post.cover_gradient);

  // Tilt animation for new items - random left or right tilt
  const tiltDirection = post.id.charCodeAt(0) % 2 === 0 ? 15 : -15;

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
          {post.is_public !== false ? (
            <Globe className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <Lock className="w-3.5 h-3.5" aria-hidden />
          )}
          <span>{(Array.isArray(post.questions) ? post.questions.length : post.question_count) || 0} კითხვა</span>
        </div>
      </div>

      {/* Author Info & Stats */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar with SafeAvatarImage for robust fallback handling */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary border-2 border-border flex-shrink-0">
            <SafeAvatarImage 
              avatarUrl={profile?.avatar_url}
              fallback={profile?.nickname || 'U'}
              containerClassName="w-full h-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {profile?.nickname || 'შენ'}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatGeorgianTimeAgo(new Date(post.created_at))}
            </p>
          </div>
        </div>

        {/* Stats Row */}
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
        
        {/* Buttons Row */}
        <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
          {/* Toggle visibility button */}
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
                <span>გამოაქვეყნე</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>გამოქვეყნებულია</span>
              </>
            )}
          </button>
          <ChunkyButton 
            size="sm" 
            variant="outline" 
            className="flex-1 h-10 text-sm"
            onClick={() => navigate(`/trivia/${post.id}`)}
          >
            <Play className="w-4 h-4" />
            <span>ითამაშე</span>
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  );
}
export function MyTriviaTab({ onCreateQuiz, onCreateCollection, onContinueDraft, searchQuery = "", sortFilter = "all", onPlay, onEditingRoundChange }: MyTriviaTabProps) {
  const queryClient = useQueryClient();
  const { data: myPosts, isLoading: postsLoading } = useMyQuizPosts();
  const { data: myCollections, isLoading: collectionsLoading } = useMyCollections();
  const { drafts, isLoading: draftsLoading, deleteDraft } = useDrafts();
  const { profile } = useAuth();
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [editingRound, setEditingRound] = useState<any>(null);
  
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
        toast.success('კონტენტი გამოქვეყნდა! 🎉');
      } else {
        toast.success('კონტენტი პირადი გახდა 🔒');
      }
      setPostingItemId(null);
    },
    onError: (error) => {
      console.error('Error toggling visibility:', error);
      toast.error('ხილვადობის შეცვლა ვერ მოხერხდა');
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
  const searchLower = searchQuery.toLowerCase().trim();
  const searchFilteredPosts = searchLower 
    ? allStandalonePosts.filter(post => 
        post.title?.toLowerCase().includes(searchLower) ||
        post.subject?.toLowerCase().includes(searchLower) ||
        post.hashtags?.some((h: string) => h.toLowerCase().includes(searchLower))
      )
    : allStandalonePosts;
  
  const searchFilteredCollections = searchLower 
    ? myCollections?.filter(col => 
        col.title?.toLowerCase().includes(searchLower) ||
        col.description?.toLowerCase().includes(searchLower) ||
        col.hashtags?.some((h: string) => h.toLowerCase().includes(searchLower))
      )
    : myCollections;

  // Apply type filter first - "trivias" shows only standalone, "collections" shows only collections, "personal" shows MyTrivia Party
  let standalonePosts = sortFilter === "collections"
    ? []
    : sortFilter === "personal"
      ? searchFilteredPosts.filter(p => p.subject === "personal")
      : sortFilter === "trivias"
        ? searchFilteredPosts.filter(p => p.subject !== "personal")
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
    case "most_liked":
      standalonePosts = standalonePosts.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      filteredCollections = filteredCollections.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      break;
    case "most_saved":
      standalonePosts = standalonePosts.sort((a, b) => (b.saves_count || 0) - (a.saves_count || 0));
      filteredCollections = filteredCollections.sort((a, b) => (b.saves_count || 0) - (a.saves_count || 0));
      break;
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
  
  // Apply unified sorting for default case (newest first)
  if (sortFilter === "all" || sortFilter === "trivias" || sortFilter === "collections") {
    unifiedFeed = unifiedFeed.sort((a, b) => 
      new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
    );
  } else if (sortFilter === "most_liked") {
    unifiedFeed = unifiedFeed.sort((a, b) => (b.data.likes_count || 0) - (a.data.likes_count || 0));
  } else if (sortFilter === "most_saved") {
    unifiedFeed = unifiedFeed.sort((a, b) => (b.data.saves_count || 0) - (a.data.saves_count || 0));
  } else if (sortFilter === "most_played") {
    unifiedFeed = unifiedFeed.sort((a, b) => (b.data.plays_count || 0) - (a.data.plays_count || 0));
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
    // Dynamic empty state message based on filter
    const getEmptyStateMessage = () => {
      switch (sortFilter) {
        case "personal":
          return {
            title: "MyTrivia Party",
            description: "შექმენი პერსონალური MyTrivia Party და გაუზიარე მეგობრებს!"
          };
        case "trivias":
          return {
            title: "Trivia",
            description: "შექმენი შენი პირველი Trivia და გაუზიარე მეგობრებს!"
          };
        case "collections":
          return {
            title: "კოლექციები",
            description: "შექმენი კოლექცია და დაამატე მასში რაუნდები!"
          };
        default:
          return {
            title: "შენი Trivia-ები",
            description: "შექმენი შენი საკუთარი ქვიზები და გაუზიარე მეგობრებს!"
          };
      }
    };

    const { title, description } = getEmptyStateMessage();

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-6"
      >
        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4">
          <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        
        <p className="text-muted-foreground text-center text-sm max-w-xs">
          {description}
        </p>
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
          <h3 className="font-semibold text-foreground">დრაფტები ({drafts.length})</h3>
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
                    {draft.title || "უსათაურო დრაფტი"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatGeorgianTimeAgo(new Date(draft.updated_at))}
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <ChunkyButton 
                    size="sm" 
                    onClick={() => onContinueDraft?.(draft.id)}
                    className="flex-1 text-xs"
                  >
                    გაგრძელება
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
    </motion.div>
  );
}
