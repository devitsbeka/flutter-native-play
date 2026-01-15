import { useState } from "react";
import { ChevronDown, Filter, Search, X, Check, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";

export type RoomFilter = "all" | "my_rooms" | "friends_rooms" | "active" | "completed";
export type RoomSort = "recent" | "created_date";

interface RoomFiltersBarProps {
  filter: RoomFilter;
  onFilterChange: (filter: RoomFilter) => void;
  sort: RoomSort;
  onSortChange: (sort: RoomSort) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onAddClick?: () => void;
  addButtonText?: string;
  addButtonDescription?: string;
}

const filterOptions: { value: RoomFilter; label: string }[] = [
  { value: "all", label: "ყველა" },
  { value: "my_rooms", label: "ჩემი შექმნილი" },
  { value: "friends_rooms", label: "მეგობრების" },
  { value: "active", label: "აქტიური" },
  { value: "completed", label: "დასრულებული" },
];

const sortOptions: { value: RoomSort; label: string }[] = [
  { value: "recent", label: "ბოლო აქტივობით" },
  { value: "created_date", label: "თარიღით" },
];

export function RoomFiltersBar({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  searchQuery,
  onSearchQueryChange,
  onAddClick,
  addButtonText = "+ ოთახი",
}: RoomFiltersBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentFilterLabel = filterOptions.find((opt) => opt.value === filter)?.label || "ყველა";
  const currentSortLabel = sortOptions.find((opt) => opt.value === sort)?.label || "ბოლო აქტივობით";

  return (
    <div className="flex items-center gap-2 px-4 py-2">
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
                className="h-9 flex-1 rounded-full bg-card/50 border-border/30"
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
          <DropdownMenu>
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
              <span className="text-sm font-bold">{addButtonText}</span>
            </motion.button>
          )}
        </>
      )}
    </div>
  );
}
