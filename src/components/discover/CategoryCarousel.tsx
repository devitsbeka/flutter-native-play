import { useRef, useCallback, memo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AirbnbCategoryCard } from "./AirbnbCategoryCard";
import { CATEGORY_VIDEOS } from "@/config/videoConfig";

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
  newCategories?: Set<string>;
  onCategoryClick: (categoryId: string) => void;
  onFavoriteToggle: (categoryUuid: string) => void;
  getBadge?: (category: Category, index: number) => string | undefined;
}

/**
 * How many cards go into the DOM before the player has scrolled anywhere.
 *
 * A card is not cheap: a promoted media layer, a <video>, two gradient
 * overlays and an inset box-shadow. Mounting forty of them costs style
 * recalculation, layerization and paint, none of which React memoisation
 * touches — a trace of a four-character search spent 57ms in
 * UpdateLayoutTree and 39ms in Layerize against 60ms of JavaScript, on a
 * desktop.
 *
 * The search box is where that bites: one character matches most of the
 * catalogue, so every keystroke tore down and rebuilt the whole set. Twelve
 * is roughly ten screens of a carousel that shows 1.2 cards at a time, so
 * nobody reaches the end before the next batch is in.
 */
const CARD_PAGE = 12;
/** Extend once the player is within this many cards of the end. */
const EXTEND_WITHIN = 3;

function CategoryCarouselComponent({
  categories,
  progress,
  favorites,
  leaderboardRanks = {},
  newCategories,
  onCategoryClick,
  onFavoriteToggle,
  getBadge,
}: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Reset on every new list — a keystroke that narrows the search must not
  // leave the window open at whatever the previous query grew it to.
  const [visibleCount, setVisibleCount] = useState(CARD_PAGE);
  useEffect(() => {
    setVisibleCount(CARD_PAGE);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [categories]);

  const shown = categories.length <= CARD_PAGE ? categories : categories.slice(0, visibleCount);

  const extendIfNearEnd = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth * 0.8;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - cardWidth * EXTEND_WITHIN) {
      setVisibleCount((n) => n + CARD_PAGE);
    }
  }, []);

  // Track which card is most visible/centered using IntersectionObserver
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || categories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIndex = activeCardIndex;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute("data-card-index"));
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = idx;
          }
        });
        if (bestRatio > 0) {
          setActiveCardIndex(bestIndex);
        }
      },
      {
        root: scrollContainer,
        threshold: [0, 0.3, 0.5, 0.7, 1],
      }
    );

    cardRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [categories.length, shown.length]);

  const scroll = useCallback((direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 180;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  const handleScrollLeft = useCallback(() => scroll("left"), [scroll]);
  const handleScrollRight = useCallback(() => scroll("right"), [scroll]);

  if (categories.length === 0) return null;

  return (
    <div className="relative group">
      {/* Scroll Buttons - Hidden on mobile, visible on hover for desktop */}
      <button
        onClick={handleScrollLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={handleScrollRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background border border-border shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Scrollable Container - Native scroll only */}
      <div
        ref={scrollRef}
        onScroll={extendIfNearEnd}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-4 snap-x snap-mandatory"
        // No -webkit-overflow-scrolling: touch. It used to be how you got
        // momentum scrolling on iOS, and it did it by putting the scroller on
        // a legacy accelerated path where absolutely-positioned children are
        // rasterized separately — which is where content inside a scroller
        // flickers, vanishes, and reappears mid-scroll. iOS has had momentum
        // scrolling by default since 13, so the property buys nothing and
        // costs that.
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {shown.map((category, index) => {
          // Use uuid for favorites if available, fallback to id
          const favoriteId = category.uuid || category.id;
          // Get the category's actual total levels from database
          const categoryTotalLevels = (category as any).totalLevels || (category as any).total_levels || 20;
          
          return (
            <div
              key={category.id}
              ref={(el) => {
                if (el) cardRefs.current.set(index, el);
                else cardRefs.current.delete(index);
              }}
              data-card-index={index}
              className="flex-shrink-0 snap-center"
              style={{ width: 'calc(80vw - 24px)', maxWidth: '320px' }}
            >
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
                totalLevels={categoryTotalLevels}
                badge={getBadge?.(category, index)}
                imageUrl={category.image_url}
                isFavorite={favorites.has(favoriteId)}
                leaderboardRank={leaderboardRanks[category.id]}
                videoUrl={CATEGORY_VIDEOS[category.category_id || category.id]}
                isNewCategory={newCategories?.has(category.uuid || category.id) ?? false}
                isVideoActive={index >= activeCardIndex - 1 && index <= activeCardIndex + 1}
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

export const CategoryCarousel = memo(CategoryCarouselComponent);