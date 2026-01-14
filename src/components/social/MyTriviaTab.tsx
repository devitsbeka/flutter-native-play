import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gamepad2, Heart, Play, Loader2, Globe, Lock, ChevronDown, ChevronUp, Layers, Pencil, Bookmark, FileEdit, Trash2 } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections, useCollectionQuizzes } from "@/hooks/useCollections";
import { useAuth } from "@/contexts/AuthContext";

import { EditQuizModal } from "./EditQuizModal";
import { EditRoundModal } from "./EditRoundModal";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { AddRoundToCollectionModal } from "./AddRoundToCollectionModal";
import { useDrafts } from "@/hooks/useDrafts";
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
}

// Compact quiz card for inside collections
function CollectionQuizCard({ quiz, profile, onEdit, onPlay }: { quiz: any; profile: any; onEdit: (quiz: any) => void; onPlay?: (quiz: any) => void }) {
  // Get icon from quiz's icon_slug or first question's icon
  const iconSlug = quiz.icon_slug || (Array.isArray(quiz.questions) ? quiz.questions[0]?.icon_slug : null);
  
  // Helper to get gradient style
  const gradientStyle = quiz.cover_gradient?.includes('gradient') || quiz.cover_gradient?.includes('#') || quiz.cover_gradient?.includes('rgb')
    ? { background: quiz.cover_gradient }
    : undefined;
  const gradientClass = gradientStyle ? '' : `bg-gradient-to-br ${quiz.cover_gradient || 'from-purple-500 to-pink-500'}`;

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
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
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{quiz.title}</p>
        <p className="text-xs text-muted-foreground">{quiz.question_count} კითხვა</p>
      </div>
      
      <div className="flex items-center gap-2 text-muted-foreground">
        {/* Edit button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(quiz); }}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 text-xs">
          <Heart className="w-3 h-3" />
          <span>{quiz.likes_count || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Bookmark className="w-3 h-3" />
          <span>{quiz.saves_count || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <Play className="w-3 h-3" />
          <span>{quiz.plays_count || 0}</span>
        </div>
        <ChunkyButton 
          size="sm" 
          variant="secondary" 
          className="text-xs px-2 py-1 h-7"
          onClick={() => onPlay?.(convertQuizToSamplePost(quiz, null))}
        >
          <Play className="w-3 h-3" />
        </ChunkyButton>
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
          <div className="absolute top-3 left-14 flex items-center gap-1.5 bg-purple-600/90 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
            <Layers className="w-3.5 h-3.5" />
            <span>კოლექცია</span>
          </div>

          {/* Visibility Badge - Icon Only */}
          <div className="absolute top-3 right-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
              collection.is_public 
                ? 'bg-green-500/90 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {collection.is_public ? (
                <Globe className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </div>
          </div>

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
              <Heart className="w-3.5 h-3.5" />
              <span>{collection.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bookmark className="w-3.5 h-3.5" />
              <span>{collection.saves_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Play className="w-3.5 h-3.5" />
              <span>{collection.plays_count || 0}</span>
            </div>
          </div>
          
          {/* Buttons Row */}
          {collection.is_public === false && (
            <div className="flex items-center justify-end mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); onPost?.(collection); }}
                disabled={isPosting}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPosting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
                <span>Post</span>
              </button>
            </div>
          )}
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

// Standalone quiz card (not in a collection)
function StandaloneQuizCard({ post, profile, index, onEdit, onPlay, onPost, isNew, isPosting }: { post: any; profile: any; index: number; onEdit: (post: any) => void; onPlay?: (post: any) => void; onPost?: (post: any) => void; isNew?: boolean; isPosting?: boolean }) {
  const gradientProps = getGradientProps(post.cover_gradient);

  // Tilt animation for new items - random left or right tilt
  const tiltDirection = post.id.charCodeAt(0) % 2 === 0 ? 15 : -15;

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, rotate: tiltDirection } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={isNew ? { type: "spring", stiffness: 300, damping: 20, delay: index * 0.05 } : { delay: index * 0.05 }}
      className="relative bg-card rounded-2xl border-2 border-primary/30 overflow-hidden shadow-lg"
    >
      {/* Edit Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onEdit(post); }}
        className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
      >
        <Pencil className="w-4 h-4 text-white" />
      </button>

      {/* Visibility Badge - Icon Only */}
      <div className="absolute top-3 right-3 z-10">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
          post.is_public !== false 
            ? 'bg-green-500/90 text-white' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {post.is_public !== false ? (
            <Globe className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
        </div>
      </div>

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
        <div className="absolute inset-0 flex items-center justify-center">
          <h4 className="text-xl font-bold text-white text-center px-4 drop-shadow-lg">
            {post.title}
          </h4>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
          {post.question_count} კითხვა
        </div>
      </div>

      {/* Author Info & Stats */}
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
            <Heart className="w-4 h-4" />
            <span>{post.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Bookmark className="w-4 h-4" />
            <span>{post.saves_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Play className="w-4 h-4" />
            <span>{post.plays_count || 0}</span>
          </div>
        </div>
        
        {/* Buttons Row */}
        <div className="flex items-center justify-end gap-2 mt-3">
          {/* Post button - only show for private content */}
          {post.is_public === false && (
            <ChunkyButton 
              size="sm" 
              variant="primary" 
              className="text-xs"
              onClick={() => onPost?.(post)}
              disabled={isPosting}
            >
              {isPosting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
              <span>Post</span>
            </ChunkyButton>
          )}
          <ChunkyButton 
            size="sm" 
            variant="secondary" 
            className="text-xs"
            onClick={() => onPlay?.(convertQuizToSamplePost(post, profile))}
          >
            <Play className="w-3.5 h-3.5" />
            <span>თამაში</span>
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  );
}
export function MyTriviaTab({ onCreateQuiz, onCreateCollection, onContinueDraft, searchQuery = "", sortFilter = "all", onPlay }: MyTriviaTabProps) {
  const queryClient = useQueryClient();
  const { data: myPosts, isLoading: postsLoading } = useMyQuizPosts();
  const { data: myCollections, isLoading: collectionsLoading } = useMyCollections();
  const { drafts, isLoading: draftsLoading, deleteDraft } = useDrafts();
  const { profile } = useAuth();
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [editingRound, setEditingRound] = useState<any>(null);
  const [addingToCollection, setAddingToCollection] = useState<{
    collectionId: string;
    roundNumber: number;
  } | null>(null);
  const [postingItemId, setPostingItemId] = useState<string | null>(null);

  // Mutation to publish content (make it public)
  const postMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'quiz' | 'collection' }) => {
      setPostingItemId(id);
      
      if (type === 'collection') {
        // Update collection
        const { error: collectionError } = await supabase
          .from('quiz_collections')
          .update({ is_public: true })
          .eq('id', id);
        
        if (collectionError) throw collectionError;
        
        // Also update all rounds in the collection
        const { error: roundsError } = await supabase
          .from('user_quiz_posts')
          .update({ is_public: true })
          .eq('collection_id', id);
        
        if (roundsError) throw roundsError;
      } else {
        // Update standalone quiz
        const { error } = await supabase
          .from('user_quiz_posts')
          .update({ is_public: true })
          .eq('id', id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-quiz-posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-collections'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-posts-with-profiles'] });
      toast.success('კონტენტი გამოქვეყნდა! 🎉');
      setPostingItemId(null);
    },
    onError: (error) => {
      console.error('Error publishing content:', error);
      toast.error('გამოქვეყნება ვერ მოხერხდა');
      setPostingItemId(null);
    }
  });

  const handlePostQuiz = (post: any) => {
    postMutation.mutate({ id: post.id, type: 'quiz' });
  };

  const handlePostCollection = (collection: any) => {
    postMutation.mutate({ id: collection.id, type: 'collection' });
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

  // Apply type filter first - "trivias" shows only standalone, "collections" shows only collections
  let standalonePosts = sortFilter === "collections" ? [] : [...searchFilteredPosts];
  let filteredCollections = sortFilter === "trivias" ? [] : [...(searchFilteredCollections || [])];
  
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
    case "popular":
      standalonePosts = standalonePosts.sort((a, b) => getEngagementScore(b) - getEngagementScore(a));
      filteredCollections = filteredCollections.sort((a, b) => getEngagementScore(b) - getEngagementScore(a));
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
  } else if (sortFilter === "popular") {
    unifiedFeed = unifiedFeed.sort((a, b) => getEngagementScore(b.data) - getEngagementScore(a.data));
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
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-6"
      >
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Gamepad2 className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          შენი Trivia-ები
        </h3>
        
        <p className="text-muted-foreground text-center text-sm mb-6 max-w-xs">
          შექმენი შენი საკუთარი ქვიზები და გაუზიარე მეგობრებს!
        </p>
        
        <div className="flex gap-3">
          <ChunkyButton onClick={onCreateQuiz} className="whitespace-nowrap flex-row">
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>შექმენი Trivia</span>
          </ChunkyButton>
          <ChunkyButton onClick={onCreateCollection} variant="secondary" className="whitespace-nowrap flex-row">
            <Layers className="w-5 h-5 flex-shrink-0" />
            <span>კოლექცია</span>
          </ChunkyButton>
        </div>
      </motion.div>
    );
  }

  const totalCount = unifiedFeed.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-4 space-y-4"
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

      {/* Content Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">შენი კონტენტი ({totalCount})</h3>
      </div>

      <div className="space-y-4">
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
              onPost={handlePostCollection}
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
              onPost={handlePostQuiz}
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
