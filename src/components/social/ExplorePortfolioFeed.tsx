import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Users } from "lucide-react";
import { useExploreCreators, Creator } from "@/hooks/useExploreCreators";
import { CreatorPortfolioCard } from "./CreatorPortfolioCard";
import { QuickProfileModal } from "./QuickProfileModal";
import { SamplePost } from "@/data/samplePosts";

interface ExplorePortfolioFeedProps {
  searchQuery?: string;
  onPlayQuiz: (post: SamplePost, collectionPosts?: SamplePost[]) => void;
}

export function ExplorePortfolioFeed({ searchQuery = "", onPlayQuiz }: ExplorePortfolioFeedProps) {
  const { data: creators = [], isLoading } = useExploreCreators(searchQuery);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  const handlePlayTrivia = (trivia: SamplePost) => {
    onPlayQuiz(trivia);
  };

  const handleViewProfile = (creator: Creator) => {
    setSelectedCreator(creator);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">იტვირთება...</p>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">შემქმნელები ვერ მოიძებნა</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "სცადეთ სხვა საძიებო სიტყვა" : "ჯერ არავის არ აქვს გამოქვეყნებული ტრივია"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {creators.map((creator, index) => (
        <motion.div
          key={creator.user_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <CreatorPortfolioCard
            creator={creator}
            onPlayTrivia={handlePlayTrivia}
            onViewProfile={handleViewProfile}
          />
        </motion.div>
      ))}

      {/* Quick Profile Modal */}
      <QuickProfileModal
        creator={selectedCreator}
        isOpen={!!selectedCreator}
        onClose={() => setSelectedCreator(null)}
      />
    </div>
  );
}
