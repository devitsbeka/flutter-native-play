import { motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { usePlayerFeedItems } from "@/hooks/usePlayerFeedItems";
import { PlayerFeedItem } from "./PlayerFeedItem";
import { SamplePost } from "@/data/samplePosts";
import { useSocialFeed } from "@/hooks/useSocialFeed";

interface ExplorePortfolioFeedProps {
  searchQuery?: string;
  onPlayQuiz: (post: SamplePost, collectionPosts?: SamplePost[]) => void;
}

export function ExplorePortfolioFeed({ searchQuery = "", onPlayQuiz }: ExplorePortfolioFeedProps) {
  const { data: feedItems = [], isLoading } = usePlayerFeedItems(searchQuery);
  const { userLikes, userSaves, toggleLike, toggleSave } = useSocialFeed();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">იტვირთება...</p>
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">პოსტები ვერ მოიძებნა</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "სცადეთ სხვა საძიებო სიტყვა" : "ჯერ არავის არ აქვს გამოქვეყნებული ტრივია"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedItems.map((feedItem, index) => (
        <motion.div
          key={feedItem.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <PlayerFeedItem
            player={feedItem.player}
            item={feedItem.item}
            itemType={feedItem.itemType}
            onPlayTrivia={feedItem.itemType === 'trivia' ? onPlayQuiz : undefined}
            onLike={toggleLike}
            onSave={toggleSave}
            isLiked={userLikes.includes(feedItem.item.id)}
            isSaved={userSaves.includes(feedItem.item.id)}
          />
        </motion.div>
      ))}
    </div>
  );
}
