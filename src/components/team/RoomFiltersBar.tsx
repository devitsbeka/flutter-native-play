import { useState } from "react";
import { ChevronDown, Filter, Search, SortAsc, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
}: RoomFiltersBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentFilterLabel = filterOptions.find((opt) => opt.value === filter)?.label || "ყველა";
  const currentSortLabel = sortOptions.find((opt) => opt.value === sort)?.label || "ბოლო აქტივობით";

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/50 border border-border/30 hover:bg-card/80"
          >
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{currentFilterLabel}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {filterOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={filter === option.value ? "bg-primary/10 text-primary" : ""}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-card/50 border border-border/30 hover:bg-card/80"
          >
            <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{currentSortLabel}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={sort === option.value ? "bg-primary/10 text-primary" : ""}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* Search */}
      <AnimatePresence>
        {isSearchOpen ? (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <Input
              type="text"
              placeholder="ძიება..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="h-9 w-40 rounded-full bg-card/50 border-border/30"
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsSearchOpen(false);
                onSearchQueryChange("");
              }}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              className="h-9 w-9 rounded-full bg-card/50 border border-border/30 hover:bg-card/80"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
