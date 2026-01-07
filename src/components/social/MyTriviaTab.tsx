import { motion } from "framer-motion";
import { Plus, Gamepad2, Heart, Play, Loader2, Globe, Lock } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { AvatarWithFrame } from "@/components/shared/AvatarWithFrame";

interface MyTriviaTabProps {
  onCreateQuiz?: () => void;
}

export function MyTriviaTab({ onCreateQuiz }: MyTriviaTabProps) {
  const { data: myPosts, isLoading } = useMyQuizPosts();
  const { profile } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!myPosts || myPosts.length === 0) {
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
        
        <ChunkyButton onClick={onCreateQuiz} className="whitespace-nowrap flex-row">
          <Plus className="w-5 h-5 flex-shrink-0" />
          <span>შექმენი Trivia</span>
        </ChunkyButton>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">შენი Trivia-ები ({myPosts.length})</h3>
        <ChunkyButton size="sm" onClick={onCreateQuiz} className="whitespace-nowrap flex-row">
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span>ახალი</span>
        </ChunkyButton>
      </div>

      <div className="space-y-4">
        {myPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative bg-card rounded-2xl border-2 border-primary/30 overflow-hidden shadow-lg"
          >
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
            <div className={`h-32 bg-gradient-to-br ${post.cover_gradient} relative`}>
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
        ))}
      </div>
    </motion.div>
  );
}
