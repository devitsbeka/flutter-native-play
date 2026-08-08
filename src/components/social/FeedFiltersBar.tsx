import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search, Filter, ChevronDown, X, Hash, Lock, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortFilter = 
  | "all" 
  | "private" 
  | "published" 
  | "trivias" 
  | "collections" 
  | "most_liked" 
  | "most_saved" 
  | "most_played"
  | "personal";

interface FeedFiltersBarProps {
  sortFilter: SortFilter;
  onSortFilterChange: (filter: SortFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedHashtag?: string | null;
  onClearHashtag?: () => void;
  onAddClick?: () => void;
  addButtonText?: string;
  addButtonDescription?: string;
}

const getFilterOptions = (t: (k: string) => string): { value: SortFilter; label: string }[] => [
  { value: "all", label: t("extra.filterAll") },
  { value: "private", label: t("extra.filterPrivate") },
  { value: "published", label: t("extra.filterPublic") },
  { value: "trivias", label: t("extra.filterTrivias") },
  { value: "collections", label: t("extra.filterCollections") },
  { value: "personal", label: "MyTrivia Party" },
  { value: "most_liked", label: t("extra.feedFilterLiked") },
  { value: "most_saved", label: t("extra.feedFilterSaved") },
  { value: "most_played", label: t("extra.feedFilterPlayed") },
];

export function FeedFiltersBar({
  sortFilter,
  onSortFilterChange,
  searchQuery,
  onSearchQueryChange,
  selectedHashtag,
  onClearHashtag,
  onAddClick,
  addButtonText,
}: FeedFiltersBarProps) {
  const { t } = useLanguage();
  const filterOptions = getFilterOptions(t);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const scrollToTop = () => {
    const container = document.getElementById('main-scroll-container');
    const filterBar = document.getElementById('sticky-filter-bar');
    if (container && filterBar) {
      container.scrollTo({ top: filterBar.offsetTop, behavior: 'smooth' });
    } else {
      container?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentLabel = filterOptions.find(opt => opt.value === sortFilter)?.label || t("extra.filterAll");

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-1.5">
        {/* Search button - left side */}
        <AnimatePresence mode="wait">
          {isSearchOpen ? (
            <motion.div
              key="search-input"
              initial={{ width: 40, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              exit={{ width: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted min-w-0">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { if (!searchQuery && e.target.value) scrollToTop(); onSearchQueryChange(e.target.value); }}
                  placeholder={t("extra.feedSearchPlaceholder")}
                  autoFocus
                  className="flex-1 bg-transparent text-base md:text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0 w-full"
                />
                {searchQuery && (
                  <button 
                    onClick={() => onSearchQueryChange("")}
                    className="p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  onSearchQueryChange("");
                }}
                className="p-2 rounded-xl bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </motion.div>
          ) : (
            <>
              {/* Search button */}
              <motion.button
                key="search-button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setIsSearchOpen(true); scrollToTop(); }}
                className="h-9 w-9 rounded-full bg-white/80 dark:bg-card/50 border border-border/30 flex items-center justify-center flex-shrink-0"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </motion.button>

              {/* Active Hashtag Chip */}
              {selectedHashtag && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium text-primary">{selectedHashtag}</span>
                  <button 
                    onClick={onClearHashtag}
                    className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              )}

              {/* Filter Dropdown - hide when hashtag active to save space */}
              {!selectedHashtag && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 dark:bg-card/50 border border-border/30">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground whitespace-nowrap">{currentLabel}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="w-48 bg-popover border border-border shadow-lg z-50"
                  >
                    <DropdownMenuRadioGroup value={sortFilter} onValueChange={(v) => { scrollToTop(); onSortFilterChange(v as SortFilter); }}>
                      {filterOptions.map((option) => (
                        <DropdownMenuRadioItem 
                          key={option.value} 
                          value={option.value}
                          className="cursor-pointer"
                        >
                          {option.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="flex-1" />

              {/* Add button - right side */}
              {onAddClick && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={onAddClick}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-sm flex-shrink-0"
                >
                  <span className="text-sm font-bold">{addButtonText}</span>
                </motion.button>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
