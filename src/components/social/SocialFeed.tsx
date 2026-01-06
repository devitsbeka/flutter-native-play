import { useState } from "react";
import { motion } from "framer-motion";
import { samplePosts, SamplePost } from "@/data/samplePosts";
import { FeedPost } from "./FeedPost";

interface SocialFeedProps {
  onPlayQuiz?: (post: SamplePost) => void;
}

export function SocialFeed({ onPlayQuiz }: SocialFeedProps) {
  const [posts] = useState<SamplePost[]>(samplePosts);

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
