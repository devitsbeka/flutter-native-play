import { useRef, useCallback } from "react";
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
  const velocityRef = useRef(0);
  const lastTouchRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationRef = useRef<number>();

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 180;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Momentum animation
  const animateMomentum = useCallback(() => {
    const slider = scrollRef.current;
    if (!slider) return;

    if (Math.abs(velocityRef.current) > 0.5) {
      slider.scrollLeft += velocityRef.current;
      velocityRef.current *= 0.95; // Friction
      animationRef.current = requestAnimationFrame(animateMomentum);
    }
  }, []);

  // Touch handlers for mobile momentum
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    velocityRef.current = 0;
    lastTouchRef.current = e.touches[0].clientX;
    lastTimeRef.current = Date.now();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0].clientX;
    const time = Date.now();
    const deltaX = lastTouchRef.current - touch;
    const deltaTime = time - lastTimeRef.current;

    if (deltaTime > 0) {
      velocityRef.current = deltaX / deltaTime * 15; // Scale velocity
    }

    lastTouchRef.current = touch;
    lastTimeRef.current = time;
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Apply momentum after touch ends
    if (Math.abs(velocityRef.current) > 1) {
      animationRef.current = requestAnimationFrame(animateMomentum);
    }
  }, [animateMomentum]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const slider = scrollRef.current;
    if (!slider) return;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    let isDown = true;
    let startX = e.pageX - slider.offsetLeft;
    let scrollLeft = slider.scrollLeft;
    let lastX = e.pageX;
    let lastTime = Date.now();
    
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
      
      // Track velocity
      const time = Date.now();
      const deltaTime = time - lastTime;
      if (deltaTime > 0) {
        velocityRef.current = (lastX - e.pageX) / deltaTime * 15;
      }
      lastX = e.pageX;
      lastTime = time;
    };
    
    const onMouseUp = () => {
      isDown = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Apply momentum
      if (Math.abs(velocityRef.current) > 1) {
        animationRef.current = requestAnimationFrame(animateMomentum);
      }
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [animateMomentum]);

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

      {/* Scrollable Container - Draggable with momentum */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-4 cursor-grab active:cursor-grabbing select-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
                videoUrl={CATEGORY_VIDEOS[category.category_id || category.id]}
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
