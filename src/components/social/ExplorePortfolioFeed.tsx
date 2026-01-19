import { motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { usePlayerFeedItems } from "@/hooks/usePlayerFeedItems";
import { useExploreCreators } from "@/hooks/useExploreCreators";
import { PlayerFeedItem } from "./PlayerFeedItem";
import { CreatorPortfolioCard } from "./CreatorPortfolioCard";
import { SamplePost } from "@/data/samplePosts";
import { useSocialFeed } from "@/hooks/useSocialFeed";

interface ExplorePortfolioFeedProps {
  searchQuery?: string;
  onPlayQuiz: (post: SamplePost, collectionPosts?: SamplePost[]) => void;
}

export function ExplorePortfolioFeed({ searchQuery = "", onPlayQuiz }: ExplorePortfolioFeedProps) {
  // Flattened feed for mobile
  const { data: feedItems = [], isLoading: isFlatLoading } = usePlayerFeedItems(searchQuery);
  // Grouped feed for desktop/tablet
  const { data: creators = [], isLoading: isGroupedLoading } = useExploreCreators(searchQuery);
  const { userLikes, userSaves, toggleLike, toggleSave } = useSocialFeed();

  const isLoading = isFlatLoading || isGroupedLoading;

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
    <>
      {/* Mobile: Flattened feed - one player + one item per card */}
      <div className="md:hidden space-y-4">
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

      {/* Desktop/Tablet: Grouped feed - player + horizontal carousel */}
      <div className="hidden md:block space-y-6">
        {creators.map((creator, index) => (
          <motion.div
            key={creator.user_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
          <CreatorPortfolioCard
              creator={creator}
              onPlayTrivia={onPlayQuiz}
              onViewProfile={() => {}}
              onLikeTrivia={(trivia) => toggleLike(trivia.id)}
              onSaveTrivia={(trivia) => toggleSave(trivia.id)}
              userLikes={userLikes}
              userSaves={userSaves}
            />
          </motion.div>
        ))}
      </div>
    </>
  );
}
