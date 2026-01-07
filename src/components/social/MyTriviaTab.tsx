import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gamepad2, Heart, Play, Loader2, Globe, Lock, ChevronDown, ChevronRight, Layers, Pencil } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useMyCollections, useCollectionQuizzes } from "@/hooks/useCollections";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";
import { EditQuizModal } from "./EditQuizModal";

interface MyTriviaTabProps {
  onCreateQuiz?: () => void;
  onCreateCollection?: () => void;
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

// Helper to get gradient style (handles both CSS strings and Tailwind classes)
function getGradientProps(gradient: string) {
  if (gradient?.includes('gradient') || gradient?.includes('#') || gradient?.includes('rgb')) {
    return { style: { background: gradient }, className: '' };
  }
  return { style: undefined, className: `bg-gradient-to-br ${gradient}` };
}

// Expandable collection card
function CollectionCard({ collection, profile, onEdit }: { collection: any; profile: any; onEdit: (item: any) => void }) {
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
        <div 
          className={`h-32 relative ${gradientProps.className}`}
          style={gradientProps.style}
        >
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Edit Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(collection); }}
            className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <Pencil className="w-4 h-4 text-white" />
          </button>
          
          {/* Collection Badge */}
          <div className="absolute top-3 left-14 flex items-center gap-1.5 bg-purple-600/90 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
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
function StandaloneQuizCard({ post, profile, index, onEdit }: { post: any; profile: any; index: number; onEdit: (post: any) => void }) {
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

      {/* Visibility Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shadow-md ${
          post.is_public !== false 
            ? 'bg-green-500/90 text-white' 
            : 'bg-muted text-muted-foreground'
        }`}>
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
        </div>
      </div>

      {/* Gradient Thumbnail */}
      <div 
        className={`h-32 relative ${gradientProps.className}`}
        style={gradientProps.style}
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Heart className="w-4 h-4" />
              <span>{post.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Play className="w-4 h-4" />
              <span>{post.plays_count || 0}</span>
            </div>
          </div>
          
          <ChunkyButton size="sm" variant="secondary" className="text-xs">
            <Play className="w-3.5 h-3.5" />
            <span>თამაში</span>
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  );
}

export function MyTriviaTab({ onCreateQuiz, onCreateCollection }: MyTriviaTabProps) {
  const { data: myPosts, isLoading: postsLoading } = useMyQuizPosts();
  const { data: myCollections, isLoading: collectionsLoading } = useMyCollections();
  const { profile } = useAuth();
  const [editingQuiz, setEditingQuiz] = useState<any>(null);

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
          <CollectionCard key={collection.id} collection={collection} profile={profile} onEdit={(item) => setEditingQuiz(item)} />
        ))}

        {/* Standalone quizzes */}
        {standalonePosts.map((post, index) => (
          <StandaloneQuizCard 
            key={post.id} 
            post={post} 
            profile={profile} 
            index={index} 
            onEdit={(post) => setEditingQuiz(post)}
          />
        ))}
      </div>

      {/* Edit Modal */}
      <EditQuizModal 
        quiz={editingQuiz} 
        isOpen={!!editingQuiz} 
        onClose={() => setEditingQuiz(null)} 
      />
    </motion.div>
  );
}
