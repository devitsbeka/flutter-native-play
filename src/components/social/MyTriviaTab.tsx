import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gamepad2, Heart, Play, Loader2, Globe, Lock, ChevronDown, ChevronUp, Layers, Pencil, MessageCircle } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections, useCollectionQuizzes } from "@/hooks/useCollections";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";
import { EditQuizModal } from "./EditQuizModal";
import { EditRoundModal } from "./EditRoundModal";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { AddRoundToCollectionModal } from "./AddRoundToCollectionModal";

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

interface MyTriviaTabProps {
  onCreateQuiz?: () => void;
  onCreateCollection?: () => void;
  searchQuery?: string;
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
          <Play className="w-3 h-3" />
          <span>{quiz.plays_count || 0}</span>
        </div>
        <ChunkyButton 
          size="sm" 
          variant="secondary" 
          className="text-xs px-2 py-1 h-7"
          onClick={() => onPlay?.(quiz)}
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
function CollectionCard({ collection, profile, onEditCollection, onEditRound, onAddRound, onPlay }: { collection: any; profile: any; onEditCollection: (item: any) => void; onEditRound: (quiz: any) => void; onAddRound: (collectionId: string, nextRoundNumber: number) => void; onPlay?: (quiz: any, allQuizzes?: any[]) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: quizzes, isLoading } = useCollectionQuizzes(isExpanded ? collection.id : null);

  const gradientProps = getGradientProps(collection.cover_gradient);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarWithFrame
              imageUrl={profile?.avatar_url || undefined}
              size="sm"
              showVipBadge={false}
            />
            <div>
              <p className="font-semibold text-foreground text-sm">{profile?.nickname || 'შენ'}</p>
              <p className="text-xs text-muted-foreground">
                {formatGeorgianTimeAgo(new Date(collection.created_at))}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Stats */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="w-3.5 h-3.5" />
              <span>{collection.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{collection.comments_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Play className="w-3.5 h-3.5" />
              <span>{collection.plays_count || 0}</span>
            </div>
            
            {/* Expand/Collapse icon - Up when open, Down when closed */}
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
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
                    onPlay={(q) => onPlay?.(q, quizzes)}
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
function StandaloneQuizCard({ post, profile, index, onEdit, onPlay }: { post: any; profile: any; index: number; onEdit: (post: any) => void; onPlay?: (post: any) => void }) {
  const gradientProps = getGradientProps(post.cover_gradient);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
          <AvatarWithFrame
            imageUrl={profile?.avatar_url || undefined}
            size="sm"
            showVipBadge={false}
          />
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
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Heart className="w-4 h-4" />
              <span>{post.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments_count || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Play className="w-4 h-4" />
              <span>{post.plays_count || 0}</span>
            </div>
          </div>
          
          <ChunkyButton 
            size="sm" 
            variant="secondary" 
            className="text-xs"
            onClick={() => onPlay?.(post)}
          >
            <Play className="w-3.5 h-3.5" />
            <span>თამაში</span>
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  );
}

export function MyTriviaTab({ onCreateQuiz, onCreateCollection, searchQuery = "", onPlay }: MyTriviaTabProps) {
  const { data: myPosts, isLoading: postsLoading } = useMyQuizPosts();
  const { data: myCollections, isLoading: collectionsLoading } = useMyCollections();
  const { profile } = useAuth();
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [editingRound, setEditingRound] = useState<any>(null);
  const [addingToCollection, setAddingToCollection] = useState<{
    collectionId: string;
    roundNumber: number;
  } | null>(null);

  const isLoading = postsLoading || collectionsLoading;

  // Filter standalone posts (not in any collection)
  const allStandalonePosts = myPosts?.filter(post => !post.collection_id) || [];
  
  // Apply search filter
  const searchLower = searchQuery.toLowerCase().trim();
  const standalonePosts = searchLower 
    ? allStandalonePosts.filter(post => 
        post.title?.toLowerCase().includes(searchLower) ||
        post.subject?.toLowerCase().includes(searchLower) ||
        post.hashtags?.some((h: string) => h.toLowerCase().includes(searchLower))
      )
    : allStandalonePosts;
  
  const filteredCollections = searchLower 
    ? myCollections?.filter(col => 
        col.title?.toLowerCase().includes(searchLower) ||
        col.description?.toLowerCase().includes(searchLower) ||
        col.hashtags?.some((h: string) => h.toLowerCase().includes(searchLower))
      )
    : myCollections;
  
  const hasContent = (filteredCollections && filteredCollections.length > 0) || standalonePosts.length > 0;

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

  const totalCount = (filteredCollections?.length || 0) + standalonePosts.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">შენი კონტენტი ({totalCount})</h3>
      </div>

      <div className="space-y-4">
        {/* Collections first */}
        {filteredCollections?.map((collection) => (
          <CollectionCard 
            key={collection.id} 
            collection={collection} 
            profile={profile} 
            onEditCollection={(item) => setEditingQuiz(item)}
            onEditRound={(quiz) => setEditingRound(quiz)}
            onAddRound={(collectionId, roundNumber) => 
              setAddingToCollection({ collectionId, roundNumber })
            }
            onPlay={onPlay}
          />
        ))}

        {/* Standalone quizzes */}
        {standalonePosts.map((post, index) => (
          <StandaloneQuizCard 
            key={post.id} 
            post={post} 
            profile={profile} 
            index={index} 
            onEdit={(post) => setEditingQuiz(post)}
            onPlay={onPlay}
          />
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
