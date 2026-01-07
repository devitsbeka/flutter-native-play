import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gamepad2, Heart, Play, Loader2, Globe, Lock, ChevronDown, ChevronRight, Layers, Bookmark, Edit3, MessageCircle } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections, useCollectionQuizzes } from "@/hooks/useCollections";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";

// Helper to handle both Tailwind class gradients and CSS linear-gradient strings
function getGradientStyle(gradient: string): { style?: React.CSSProperties; className?: string } {
  if (!gradient) return { className: 'from-primary to-primary/60' };
  if (gradient.startsWith('linear-gradient') || gradient.startsWith('radial-gradient')) {
    return { style: { background: gradient } };
  }
  return { className: gradient };
}

interface MyTriviaTabProps {
  onCreateQuiz?: () => void;
  onCreateCollection?: () => void;
  onEditQuiz?: (quiz: any) => void;
  onPlayQuiz?: (quiz: any) => void;
}

// Compact quiz card for inside collections
function CollectionQuizCard({ quiz, profile }: { quiz: any; profile: any }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
      {/* Mini gradient thumbnail */}
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${quiz.cover_gradient} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white text-xs font-bold">R{quiz.round_number || 1}</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{quiz.title}</p>
        <p className="text-xs text-muted-foreground">{quiz.question_count} კითხვა</p>
      </div>
      
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="flex items-center gap-1 text-xs">
          <Heart className="w-3 h-3" />
          <span>{quiz.likes_count || 0}</span>
        </div>
        <ChunkyButton size="sm" variant="secondary" className="text-xs px-2 py-1 h-7">
          <Play className="w-3 h-3" />
        </ChunkyButton>
      </div>
    </div>
  );
}

// Expandable collection card
function CollectionCard({ collection, profile }: { collection: any; profile: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: quizzes, isLoading } = useCollectionQuizzes(isExpanded ? collection.id : null);

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
        <div className={`h-24 bg-gradient-to-br ${collection.cover_gradient} relative`}>
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Collection Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-purple-600/90 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
            <Layers className="w-3.5 h-3.5" />
            <span>კოლექცია</span>
          </div>

          {/* Visibility Badge */}
          <div className="absolute top-3 right-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-md ${
              collection.is_public 
                ? 'bg-green-500/90 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {collection.is_public ? (
                <>
                  <Globe className="w-3 h-3" />
                  <span>საჯარო</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>პირადი</span>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h4 className="text-lg font-bold text-white text-center px-4 drop-shadow-lg">
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
                {formatDistanceToNow(new Date(collection.created_at), { addSuffix: true, locale: ka })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Round count badge */}
            <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
              რაუნდები
            </div>
            
            {/* Expand/Collapse icon */}
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
                  <CollectionQuizCard key={quiz.id} quiz={quiz} profile={profile} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ამ კოლექციაში ჯერ არ არის ქვიზები
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Standalone quiz card (not in a collection)
function StandaloneQuizCard({ 
  post, 
  profile, 
  index,
  onEdit,
  onPlay 
}: { 
  post: any; 
  profile: any; 
  index: number;
  onEdit?: (post: any) => void;
  onPlay?: (post: any) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative w-full max-w-full bg-card rounded-2xl border-2 border-primary/30 overflow-hidden shadow-lg"
    >
      {/* Top Right Badges */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {/* Edit Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit?.(post);
          }}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Edit3 className="w-4 h-4 text-white" />
        </button>
        
        {/* Visibility Badge - Clickable to open edit */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit?.(post);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-md hover:opacity-90 transition-opacity ${
            post.is_public !== false 
              ? 'bg-green-500/90 text-white' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {post.is_public !== false ? (
            <>
              <Globe className="w-3 h-3" />
              <span>საჯარო</span>
            </>
          ) : (
            <>
              <Lock className="w-3 h-3" />
              <span>პირადი</span>
            </>
          )}
        </button>
      </div>

      {/* Gradient Thumbnail */}
      {(() => {
        const gradientProps = getGradientStyle(post.cover_gradient);
        return (
          <div 
            className={`h-32 relative cursor-pointer bg-gradient-to-br from-primary to-primary/60 ${gradientProps.className || ''}`}
            style={gradientProps.style}
            onClick={() => onPlay?.(post)}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <h4 className="text-xl font-bold text-white text-center px-4 drop-shadow-lg">
                {post.title}
              </h4>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
              {post.question_count} კითხვა
            </div>
          </div>
        );
      })()}

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
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ka })}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Heart className="w-4 h-4" />
              <span>{post.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Bookmark className="w-4 h-4" />
              <span>{post.saves_count || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
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

export function MyTriviaTab({ onCreateQuiz, onCreateCollection, onEditQuiz, onPlayQuiz }: MyTriviaTabProps) {
  const { data: myPosts, isLoading: postsLoading } = useMyQuizPosts();
  const { data: myCollections, isLoading: collectionsLoading } = useMyCollections();
  const { profile } = useAuth();

  const isLoading = postsLoading || collectionsLoading;

  // Filter standalone posts (not in any collection)
  const standalonePosts = myPosts?.filter(post => !post.collection_id) || [];
  const hasContent = (myCollections && myCollections.length > 0) || standalonePosts.length > 0;

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

  const totalCount = (myCollections?.length || 0) + standalonePosts.length;

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
        {myCollections?.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} profile={profile} />
        ))}

        {/* Standalone quizzes */}
        {standalonePosts.map((post, index) => (
          <StandaloneQuizCard 
            key={post.id} 
            post={post} 
            profile={profile} 
            index={index}
            onEdit={onEditQuiz}
            onPlay={onPlayQuiz}
          />
        ))}
      </div>
    </motion.div>
  );
}
