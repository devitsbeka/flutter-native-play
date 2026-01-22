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

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export interface SortOption<T extends string> {
  value: T;
  label: string;
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
  addButtonText = "+ ახალი",
}: UnifiedFiltersBarProps<F, S>) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentFilterLabel = filterOptions.find((opt) => opt.value === filter)?.label || filterOptions[0]?.label || "ყველა";
  const currentSortLabel = sortOptions?.find((opt) => opt.value === sort)?.label;

  return (
    <div className="px-4 py-2 w-full max-w-full overflow-hidden box-border">
      <div className="flex items-center gap-1.5 w-full max-w-full overflow-hidden">
        {/* Search button - left side */}
        <div className={isSearchOpen ? "flex-1" : "flex-shrink-0"}>
          <AnimatePresence mode="wait">
            {isSearchOpen ? (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center gap-2 w-full"
              >
                <Input
                  type="text"
                  placeholder="ძიება..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
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
                onClick={() => setIsSearchOpen(true)}
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
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">ფილტრი</DropdownMenuLabel>
                {filterOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onFilterChange(option.value)}
                    className={filter === option.value ? "bg-primary/10 text-primary" : ""}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {filter === option.value && <Check className="h-4 w-4" />}
                      <span className={filter !== option.value ? "pl-6" : ""}>{option.label}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
                
                {sortOptions && sortOptions.length > 0 && onSortChange && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">დალაგება</DropdownMenuLabel>
                    {sortOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => onSortChange(option.value)}
                        className={sort === option.value ? "bg-primary/10 text-primary" : ""}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {sort === option.value && <Check className="h-4 w-4" />}
                          <span className={sort !== option.value ? "pl-6" : ""}>{option.label}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 min-w-0" />

            {/* Add button - right side */}
            {onAddClick && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onAddClick}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-sm flex-shrink-0"
              >
                <span className="text-[13px] font-bold">{addButtonText}</span>
              </motion.button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Pre-defined filter options for rooms
export const roomFilterOptions: FilterOption<RoomFilter>[] = [
  { value: "all", label: "ყველა" },
  { value: "my_rooms", label: "ჩემი შექმნილი" },
  { value: "friends_rooms", label: "მეგობრების" },
  { value: "active", label: "აქტიური" },
  { value: "completed", label: "დასრულებული" },
];

export const roomSortOptions: SortOption<RoomSort>[] = [
  { value: "recent", label: "ბოლო აქტივობით" },
  { value: "created_date", label: "თარიღით" },
];

// Pre-defined filter options for my trivia content
export const myTriviaFilterOptions: FilterOption<MyTriviaFilter>[] = [
  { value: "all", label: "ყველა" },
  { value: "private", label: "პირადი" },
  { value: "published", label: "საჯარო" },
  { value: "trivias", label: "ტრივიები" },
  { value: "collections", label: "კოლექციები" },
  { value: "personal", label: "MyTrivia Party" },
  { value: "most_liked", label: "მოწონებული" },
  { value: "most_saved", label: "შენახული" },
  { value: "most_played", label: "ნათამაშები" },
];

// Pre-defined filter options for explore/discover tab
export const exploreFilterOptions: FilterOption<ExploreFilter>[] = [
  { value: "all", label: "ყველა" },
  { value: "friends", label: "მეგობრების" },
  { value: "trivias", label: "ტრივიები" },
  { value: "collections", label: "კოლექციები" },
];

export const exploreSortOptions: SortOption<ExploreSort>[] = [
  { value: "recent", label: "უახლესი" },
  { value: "most_played", label: "ნათამაშები" },
  { value: "most_liked", label: "მოწონებული" },
];

// Type exports
export type RoomFilter = "all" | "my_rooms" | "friends_rooms" | "active" | "completed";
export type RoomSort = "recent" | "created_date";
export type MyTriviaFilter =
  | "all"
  | "private"
  | "published"
  | "trivias"
  | "collections"
  | "most_liked"
  | "most_saved"
  | "most_played"
  | "personal";
export type ExploreFilter = "all" | "friends" | "trivias" | "collections";
export type ExploreSort = "recent" | "most_played" | "most_liked";
