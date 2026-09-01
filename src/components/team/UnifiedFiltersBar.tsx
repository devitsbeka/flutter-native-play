import { useState } from "react";
import { ChevronDown, Filter, Search, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { instantTouchProps } from "@/utils/instantTouch";
import { PUBLIC_SHARING_ENABLED } from "@/config/features";

export interface FilterOption<T extends string> {
  value: T;
  labelKey: string;
}

export interface SortOption<T extends string> {
  value: T;
  labelKey: string;
}

interface UnifiedFiltersBarProps<F extends string, S extends string> {
  filter: F;
  onFilterChange: (filter: F) => void;
  filterOptions: FilterOption<F>[];
  sort?: S;
  onSortChange?: (sort: S) => void;
  sortOptions?: SortOption<S>[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onAddClick?: () => void;
  addButtonText?: string;
  /** Inline variant for embedding in the tab row (no outer padding/width,
      fixed-width search input, no add button). */
  compact?: boolean;
}

export function UnifiedFiltersBar<F extends string, S extends string>({
  filter,
  onFilterChange,
  filterOptions,
  sort,
  onSortChange,
  sortOptions,
  searchQuery,
  onSearchQueryChange,
  onAddClick,
  addButtonText,
  compact = false,
}: UnifiedFiltersBarProps<F, S>) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { t } = useLanguage();

  const defaultAddText = addButtonText || t("extra.addNewDefault");

  const scrollToTop = () => {
    const container = document.getElementById('main-scroll-container');
    const filterBar = document.getElementById('sticky-filter-bar');
    if (container && filterBar) {
      container.scrollTo({ top: filterBar.offsetTop, behavior: 'smooth' });
    } else {
      container?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentFilterLabel = filterOptions.find((opt) => opt.value === filter)?.labelKey 
    ? t(filterOptions.find((opt) => opt.value === filter)!.labelKey)
    : t("extra.filterAll");
  const currentSortLabel = sortOptions?.find((opt) => opt.value === sort)?.labelKey
    ? t(sortOptions.find((opt) => opt.value === sort)!.labelKey)
    : undefined;

  return (
    <div className={compact ? "" : "px-4 py-2 w-full max-w-full overflow-visible box-border"}>
      <div className="flex items-center gap-1.5 w-full max-w-full">
        {/* Search button - left side */}
        <div className={isSearchOpen ? "flex-1" : "flex-shrink-0"}>
          <AnimatePresence mode="wait">
            {isSearchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: compact ? 240 : "100%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-2 w-full"
              >
                <Input
                  type="text"
                  placeholder={t("extra.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => { if (!searchQuery && e.target.value) scrollToTop(); onSearchQueryChange(e.target.value); }}
                  className="h-9 flex-1 rounded-full bg-card/50 border-border/30 text-base md:text-sm"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    onSearchQueryChange("");
                  }}
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                {...instantTouchProps(() => { setIsSearchOpen(true); scrollToTop(); })}
                className="h-9 w-9 rounded-full bg-white/80 dark:bg-card/50 border border-border/30 flex items-center justify-center"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Combined Filter & Sort Dropdown - hidden when search is open */}
        {!isSearchOpen && (
          <>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 dark:bg-card/50 border border-border/30 min-w-0 flex-shrink">
                  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {currentFilterLabel}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 py-2">
                <DropdownMenuLabel className="text-[13px] text-muted-foreground pt-1 pb-1">{t("extra.filterLabel")}</DropdownMenuLabel>
                {filterOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => { scrollToTop(); onFilterChange(option.value); }}
                    className={`py-3 text-[15px] ${filter === option.value ? "bg-primary/20 text-primary font-bold focus:bg-primary/20" : ""}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {filter === option.value && <Check className="h-4 w-4" />}
                      <span className={filter !== option.value ? "pl-6" : ""}>{t(option.labelKey)}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                
                {sortOptions && sortOptions.length > 0 && onSortChange && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[13px] text-muted-foreground pt-1 pb-1">{t("extra.sortLabel")}</DropdownMenuLabel>
                    {sortOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => { scrollToTop(); onSortChange(option.value); }}
                        className={`py-3 text-[15px] ${sort === option.value ? "bg-primary/20 text-primary font-bold focus:bg-primary/20" : ""}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {sort === option.value && <Check className="h-4 w-4" />}
                          <span className={sort !== option.value ? "pl-6" : ""}>{t(option.labelKey)}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 min-w-0" />

            {/* Add button - right side (mobile only; on md+ the create button
                lives in the tab row, aligned to the tabs) */}
            {onAddClick && !compact && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                {...instantTouchProps(onAddClick)}
                className="flex md:hidden items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-sm flex-shrink-0"
              >
                <span className="text-[13px] font-bold">{defaultAddText}</span>
              </motion.button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The Private tab's one filter, across two kinds of thing.
 *
 * That tab holds a person's rooms AND their trivias, because both are "mine
 * and not published" and splitting them into two tabs made the second one
 * hard to find. So the filter spans both: the first four chips choose which
 * rooms, the last three choose which trivias, and each of those hides the
 * other list entirely — asking for collections and getting a wall of rooms
 * above them is not a filter.
 */
export const privateFilterOptions: FilterOption<PrivateFilter>[] = [
  { value: "all", labelKey: "extra.filterAll" },
  { value: "my_rooms", labelKey: "extra.filterMyRooms" },
  { value: "friends_rooms", labelKey: "extra.filterFriendsRooms" },
  { value: "king", labelKey: "lobby.vkTitle" },
  { value: "team_battle", labelKey: "teamBattle.title" },
  { value: "trivias", labelKey: "extra.filterTrivias" },
  { value: "collections", labelKey: "extra.filterCollections" },
  { value: "personal", labelKey: "extra.myTriviaPartyLabel" },
];

/** The Public tab: everything, or one kind of game. */
export const publicRoomFilterOptions: FilterOption<PublicRoomsFilter>[] = [
  { value: "all", labelKey: "extra.filterAll" },
  { value: "classic", labelKey: "extra.tabRooms" },
  { value: "king", labelKey: "lobby.vkTitle" },
  { value: "team_battle", labelKey: "teamBattle.title" },
];

// Pre-defined filter options for rooms
export const roomFilterOptions: FilterOption<RoomFilter>[] = [
  { value: "all", labelKey: "extra.filterAll" },
  { value: "my_rooms", labelKey: "extra.filterMyRooms" },
  { value: "friends_rooms", labelKey: "extra.filterFriendsRooms" },
  { value: "king", labelKey: "lobby.vkTitle" },
  { value: "team_battle", labelKey: "teamBattle.title" },
];

// Room sort options removed - always sort by last activity

// Pre-defined filter options for my trivia content
export const myTriviaFilterOptions: FilterOption<MyTriviaFilter>[] = [
  { value: "all", labelKey: "extra.filterAll" },
  // Visibility chips only mean something while public sharing is on.
  ...(PUBLIC_SHARING_ENABLED
    ? ([
        { value: "private", labelKey: "extra.filterPrivate" },
        { value: "published", labelKey: "extra.filterPublic" },
      ] as FilterOption<MyTriviaFilter>[])
    : []),
  { value: "trivias", labelKey: "extra.filterTrivias" },
  { value: "collections", labelKey: "extra.filterCollections" },
  { value: "personal", labelKey: "extra.myTriviaPartyLabel" },
  { value: "most_played", labelKey: "extra.filterMostPlayed" },
];

// Pre-defined filter options for explore/discover tab
export const exploreFilterOptions: FilterOption<ExploreFilter>[] = [
  { value: "all", labelKey: "extra.filterAll" },
  { value: "friends", labelKey: "extra.filterFriendsRooms" },
  { value: "trivias", labelKey: "extra.filterTrivias" },
  { value: "collections", labelKey: "extra.filterCollections" },
];

export const exploreSortOptions: SortOption<ExploreSort>[] = [
  { value: "recent", labelKey: "extra.sortRecent" },
  { value: "most_played", labelKey: "extra.filterMostPlayed" },
  { value: "most_liked", labelKey: "extra.filterMostLiked" },
];

// Type exports
export type RoomFilter = "all" | "my_rooms" | "friends_rooms" | "king" | "team_battle";
export type PrivateFilter =
  | "all"
  | "my_rooms"
  | "friends_rooms"
  | "king"
  | "team_battle"
  | "trivias"
  | "collections"
  | "personal";
export type PublicRoomsFilter = "all" | "classic" | "king" | "team_battle";
export type MyTriviaFilter =
  | "all"
  | "private"
  | "published"
  | "trivias"
  | "collections"
  | "most_played"
  | "personal";
export type ExploreFilter = "all" | "friends" | "trivias" | "collections";
export type ExploreSort = "recent" | "most_played" | "most_liked";
