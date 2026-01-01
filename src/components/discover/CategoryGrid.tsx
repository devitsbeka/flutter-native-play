import { AirbnbCategoryCard } from "./AirbnbCategoryCard";

interface Category {
  id: string;
  uuid?: string; // The actual UUID from database
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
  onCategoryClick: (categoryId: string) => void;
  onFavoriteToggle: (categoryUuid: string) => void;
  getBadge?: (category: Category, index: number) => string | undefined;
}

export function CategoryGrid({
  categories,
  progress,
  favorites,
  onCategoryClick,
  onFavoriteToggle,
  getBadge,
}: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <div 
      className="flex flex-col gap-4"
      style={{ paddingLeft: 20, paddingRight: 20 }}
    >
      {categories.map((category, index) => {
        // Use uuid for favorites if available, fallback to id
        const favoriteId = category.uuid || category.id;
        
        return (
          <AirbnbCategoryCard
            key={category.id}
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
            onFavoriteClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(favoriteId);
            }}
            onClick={() => onCategoryClick(category.id)}
            variant="full"
          />
        );
      })}
    </div>
  );
}
