import { useRef, useState, useEffect } from "react";
import { AirbnbCategoryCard } from "./AirbnbCategoryCard";

interface Category {
  id: string;
  uuid?: string;
  category_id?: string;
  name: string;
  icon: string;
  icon_slug?: string | null;
  color: string;
  description?: string;
  image_url?: string;
  type?: string;
}

interface CategoryGridProps {
  categories: Category[];
  progress: Record<string, number>;
  favorites: Set<string>;
  leaderboardRanks?: Record<string, number>;
  newCategories?: Set<string>;
  onCategoryClick: (categoryId: string) => void;
  onFavoriteToggle: (categoryUuid: string) => void;
  getBadge?: (category: Category, index: number) => string | undefined;
}

/** Wrapper that tracks viewport proximity for video activation */
function ViewportCard({
  children,
  rootMargin = "300px",
}: {
  children: (isNearViewport: boolean) => React.ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsNear(entry.isIntersecting),
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={ref}>{children(isNear)}</div>;
}

export function CategoryGrid({
  categories,
  progress,
  favorites,
  leaderboardRanks = {},
  newCategories,
  onCategoryClick,
  onFavoriteToggle,
  getBadge,
}: CategoryGridProps) {
  
  if (categories.length === 0) return null;

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-5"
    >
      {categories.map((category, index) => {
        const favoriteId = category.uuid || category.id;
        const categoryTotalLevels = (category as any).totalLevels || (category as any).total_levels || 20;
        
        return (
          <ViewportCard key={category.id}>
            {(isNearViewport) => (
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
                isNewCategory={newCategories?.has(category.uuid || category.id) ?? false}
                onFavoriteClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle(favoriteId);
                }}
                onClick={() => onCategoryClick(category.id)}
                variant="full"
              />
            )}
          </ViewportCard>
        );
      })}
    </div>
  );
}
