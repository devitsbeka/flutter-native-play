import { Star, TrendingUp, Hash, ChevronDown, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type PopularityFilter = "all" | "low" | "medium" | "high";

interface FilterBarProps {
  selectedHashtag: string | null;
  onSelectHashtag: (tag: string | null) => void;
  showSavedOnly: boolean;
  onToggleSaved: () => void;
  popularityFilter: PopularityFilter;
  onPopularityChange: (filter: PopularityFilter) => void;
  hashtags: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function FilterBar({
  selectedHashtag,
  onSelectHashtag,
  showSavedOnly,
  onToggleSaved,
  popularityFilter,
  onPopularityChange,
  hashtags,
  hasActiveFilters,
  onClearFilters,
}: FilterBarProps) {
  const { t } = useLanguage();
  const cyclePopularity = () => {
    const next: PopularityFilter[] = ["all", "low", "medium", "high"];
    const currentIndex = next.indexOf(popularityFilter);
    onPopularityChange(next[(currentIndex + 1) % next.length]);
  };

  return (
    <div className="border-b border-border/50">
      <div className="px-4 py-3">
        <div 
          className="flex items-center gap-2 overflow-x-auto" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Saved Filter */}
          <button
            onClick={onToggleSaved}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              showSavedOnly
                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                : "bg-muted/80 text-foreground hover:bg-muted"
            }`}
          >
            <Star className={`w-4 h-4 ${showSavedOnly ? "fill-current" : ""}`} />
            {t("extra.filterSaved")}
          </button>
          
          {/* Popularity Filter */}
          <button
            onClick={cyclePopularity}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              popularityFilter !== "all"
                ? "bg-primary/10 text-primary"
                : "bg-muted/80 text-foreground hover:bg-muted"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {popularityFilter === "all" && t("extra.filterPopularity")}
            {popularityFilter === "low" && t("extra.filterLow")}
            {popularityFilter === "medium" && t("extra.filterMedium")}
            {popularityFilter === "high" && t("extra.filterHigh")}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          
          {/* Divider */}
          <div className="flex-shrink-0 w-px h-6 bg-border mx-1" />
          
          {/* Hash Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Hash className="w-4 h-4 text-muted-foreground" />
          </div>
          
          {/* Hashtag Chips */}
          {hashtags.slice(0, 5).map(tag => (
            <button
              key={tag}
              onClick={() => onSelectHashtag(selectedHashtag === tag ? null : tag)}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedHashtag === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/80 text-foreground hover:bg-muted"
              }`}
            >
              #{tag}
            </button>
          ))}
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="flex-shrink-0 p-2 rounded-full text-destructive hover:bg-destructive/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
