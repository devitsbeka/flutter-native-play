import { useState } from "react";
import { Search, Filter, ChevronDown, X } from "lucide-react";
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
  | "popular" 
  | "trivias" 
  | "collections" 
  | "most_liked" 
  | "most_saved" 
  | "most_played";

interface FeedFiltersBarProps {
  sortFilter: SortFilter;
  onSortFilterChange: (filter: SortFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

const filterOptions: { value: SortFilter; label: string }[] = [
  { value: "all", label: "ყველა" },
  { value: "popular", label: "პოპულარული" },
  { value: "trivias", label: "ტრივიები" },
  { value: "collections", label: "კოლექციები" },
  { value: "most_liked", label: "მოწონებული" },
  { value: "most_saved", label: "შენახული" },
  { value: "most_played", label: "ნათამაშები" },
];

export function FeedFiltersBar({
  sortFilter,
  onSortFilterChange,
  searchQuery,
  onSearchQueryChange,
}: FeedFiltersBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentLabel = filterOptions.find(opt => opt.value === sortFilter)?.label || "ყველა";

  return (
    <div className="px-4 pt-0 pb-2">
      <div className="flex items-center justify-between gap-3">
        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{currentLabel}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-48 bg-popover border border-border shadow-lg z-50"
          >
            <DropdownMenuRadioGroup value={sortFilter} onValueChange={(v) => onSortFilterChange(v as SortFilter)}>
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

        {/* Search Section */}
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
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="ძიება..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0 w-full"
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
            <motion.button
              key="search-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-xl bg-muted"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
