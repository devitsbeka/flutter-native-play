import { motion } from "framer-motion";
import { SamplePost } from "@/data/samplePosts";
import { FeedPost } from "./FeedPost";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { Loader2 } from "lucide-react";

interface SocialFeedProps {
  onPlayQuiz?: (post: SamplePost) => void;
}

export function SocialFeed({ onPlayQuiz }: SocialFeedProps) {
  const { posts, isLoading } = useSocialFeed();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col"
    >
      {posts.map((post, index) => (
        <FeedPost 
          key={post.id} 
          post={post} 
          index={index}
          onPlay={onPlayQuiz}
        />
      ))}
    </motion.div>
  );
}
