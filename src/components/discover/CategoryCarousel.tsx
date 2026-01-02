import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AirbnbCategoryCard } from "./AirbnbCategoryCard";

// Map category IDs to their video URLs
const CATEGORY_VIDEOS: Record<string, string> = {
  "art": "/videos/painting.mp4",
  "georgian_history": "/videos/geo-battle-2.mp4",
};

interface Category {
  id: string;
  uuid?: string; // The actual UUID from database
  category_id?: string; // ASCII slug like 'world_history'
  name: string;
  icon: string;
  icon_slug?: string | null; // Direct icon slug from database
  color: string;
  description?: string;
  image_url?: string;
  type?: string;
}

interface CategoryCarouselProps {
  categories: Category[];
  progress: Record<string, number>;
  favorites: Set<string>;
  leaderboardRanks?: Record<string, number>;
  onCategoryClick: (categoryId: string) => void;
  onFavoriteToggle: (categoryUuid: string) => void;
  getBadge?: (category: Category, index: number) => string | undefined;
}

export function CategoryCarousel({
  categories,
  progress,
  favorites,
  leaderboardRanks = {},
  onCategoryClick,
  onFavoriteToggle,
  getBadge,
}: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 180;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (categories.length === 0) return null;

  return (
    <div className="relative group">
      {/* Scroll Buttons - Hidden on mobile, visible on hover for desktop */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", paddingLeft: "20px", paddingRight: "16px" }}
      >
        {categories.map((category, index) => {
          // Use uuid for favorites if available, fallback to id
          const favoriteId = category.uuid || category.id;
          
          return (
            <div key={category.id} className="flex-shrink-0" style={{ width: 'calc(80vw - 24px)', maxWidth: '320px' }}>
              <AirbnbCategoryCard
                id={category.id}
                categoryId={category.category_id || category.id}
                iconSlug={category.icon_slug}
                name={category.name}
                icon={category.icon}
                color={category.color}
                description={category.description}
                categoryType={category.type}
                progress={progress[category.id] || 0}
                totalLevels={20}
                badge={getBadge?.(category, index)}
                imageUrl={category.image_url}
                isFavorite={favorites.has(favoriteId)}
                leaderboardRank={leaderboardRanks[category.id]}
                videoUrl={CATEGORY_VIDEOS[category.id]}
                onFavoriteClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle(favoriteId);
                }}
                onClick={() => onCategoryClick(category.id)}
                variant="compact"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
