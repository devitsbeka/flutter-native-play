import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Users } from "lucide-react";
import { usePlayerFeedItems } from "@/hooks/usePlayerFeedItems";
import { useExploreCreators } from "@/hooks/useExploreCreators";
import { PlayerFeedItem } from "./PlayerFeedItem";
import { CreatorPortfolioCard } from "./CreatorPortfolioCard";
import { SamplePost } from "@/data/samplePosts";
import { useSocialFeed } from "@/hooks/useSocialFeed";
import { useFriends } from "@/hooks/useFriends";
import { useAdminRole } from "@/hooks/useAdminRole";
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { ExploreFilter, ExploreSort } from "@/components/team/UnifiedFiltersBar";

interface ExplorePortfolioFeedProps {
  searchQuery?: string;
  filter?: ExploreFilter;
  sort?: ExploreSort;
  onPlayQuiz: (post: SamplePost, collectionPosts?: SamplePost[]) => void;
}

const INITIAL_RENDER_COUNT = 20;
const RENDER_BATCH_SIZE = 20;

// JS breakpoint matching Tailwind's md: - mount only one feed tree
function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

export function ExplorePortfolioFeed({
  searchQuery = "",
  filter = "all",
  sort = "recent",
  onPlayQuiz,
}: ExplorePortfolioFeedProps) {
  const { t } = useLanguage();
  const isMobile = useIsMobileViewport();

  // Only fetch the feed shape that will actually be rendered
  const { data: feedItems = [], isLoading: isFlatLoading } = usePlayerFeedItems(
    searchQuery,
    filter,
    sort,
    isMobile
  );
  const { data: creators = [], isLoading: isGroupedLoading } = useExploreCreators(
    searchQuery,
    filter,
    sort,
    !isMobile
  );
  const { userLikes, userSaves, userPlays, toggleLike, toggleSave } = useSocialFeed();

  // Hoisted from per-card hooks - one subscription/interval for the whole feed
  const { sendFriendRequest, acceptFriendRequest } = useFriends();
  const { isAdmin } = useAdminRole();
  const {
    isVip,
    loading: vipLoading,
    regenPlayAvailable,
    timeUntilNextPlay,
    useRegenPlay,
  } = usePlayLimit();

  // Cap initial render; grow when the sentinel scrolls into view
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }, [searchQuery, filter, sort, isMobile]);

  const totalCount = isMobile ? feedItems.length : creators.length;
  const hasMore = visibleCount < totalCount;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => count + RENDER_BATCH_SIZE);
        }
      },
      { rootMargin: "600px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const isLoading = isMobile ? isFlatLoading : isGroupedLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (totalCount === 0) {
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
      {isMobile ? (
        /* Mobile: Flattened feed - one player + one item per card */
        <div className="space-y-4">
          {feedItems.slice(0, visibleCount).map((feedItem) => (
            <div key={feedItem.id}>
              <PlayerFeedItem
                player={feedItem.player}
                item={feedItem.item}
                itemType={feedItem.itemType}
                onPlayTrivia={feedItem.itemType === 'trivia' ? onPlayQuiz : undefined}
                onLike={toggleLike}
                onSave={toggleSave}
                isLiked={userLikes.includes(feedItem.item.id)}
                isSaved={userSaves.includes(feedItem.item.id)}
                isPlayed={userPlays.includes(feedItem.item.id)}
                isAdmin={isAdmin}
                isVip={isVip}
                vipLoading={vipLoading}
                regenPlayAvailable={regenPlayAvailable}
                timeUntilNextPlay={timeUntilNextPlay}
                useRegenPlay={useRegenPlay}
                sendFriendRequest={sendFriendRequest}
                acceptFriendRequest={acceptFriendRequest}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Desktop/Tablet: Grouped feed - player + horizontal carousel */
        <div className="space-y-6 overflow-hidden w-full max-w-full">
          {creators.slice(0, visibleCount).map((creator) => (
            <CreatorPortfolioCard
              key={creator.user_id}
              creator={creator}
              onPlayTrivia={onPlayQuiz}
              onViewProfile={() => {}}
              onLikeTrivia={(trivia) => toggleLike(trivia.id)}
              onSaveTrivia={(trivia) => toggleSave(trivia.id)}
              userLikes={userLikes}
              userSaves={userSaves}
              userPlays={userPlays}
              sendFriendRequest={sendFriendRequest}
              acceptFriendRequest={acceptFriendRequest}
            />
          ))}
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
