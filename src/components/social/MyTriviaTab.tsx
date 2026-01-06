import { motion } from "framer-motion";
import { Plus, Gamepad2, Heart, Play, Loader2 } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMyQuizPosts } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

interface MyTriviaTabProps {
  onCreateQuiz?: () => void;
}

export function MyTriviaTab({ onCreateQuiz }: MyTriviaTabProps) {
  const { data: myPosts, isLoading } = useMyQuizPosts();

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
        
        <ChunkyButton onClick={onCreateQuiz} className="gap-2">
          <Plus className="w-5 h-5" />
          შექმენი Trivia
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
        <ChunkyButton size="sm" onClick={onCreateQuiz} className="gap-1">
          <Plus className="w-4 h-4" />
          ახალი
        </ChunkyButton>
      </div>

      <div className="space-y-3">
        {myPosts.map((post) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{post.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {post.question_count} კითხვა • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ka })}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${post.cover_gradient} flex items-center justify-center`}>
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Heart className="w-4 h-4" />
                {post.likes_count}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Play className="w-4 h-4" />
                {post.plays_count}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
