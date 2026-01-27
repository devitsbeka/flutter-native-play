import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryWithCounts, ProductionStatus } from '@/hooks/useQuestionStudio';
import { Skeleton } from '@/components/ui/skeleton';

interface CategorySidebarProps {
  categories: CategoryWithCounts[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  productionStatus: ProductionStatus;
  loading: boolean;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  searchValue,
  onSearchChange,
  productionStatus,
  loading,
}: CategorySidebarProps) {
  const totalCount = categories.reduce(
    (sum, c) => sum + (productionStatus === 'production' ? c.productionCount : c.libraryCount),
    0
  );

  return (
    <div className="flex flex-col h-full border-r border-border bg-card/50">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
          Categories
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ძებნა..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Category List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* All Categories option */}
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
              selectedCategoryId === null
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent/50 text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <span className="font-medium">ყველა</span>
            </div>
            <span className="text-xs opacity-70">
              {totalCount}
            </span>
          </button>

          {loading ? (
            // Loading skeletons
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))
          ) : (
            categories.map((category) => {
              const count = productionStatus === 'production' 
                ? category.productionCount 
                : category.libraryCount;
              
              return (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedCategoryId === category.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent/50 text-foreground"
                  )}
                >
                  <span className="font-medium truncate">{category.name}</span>
                  <div className="flex items-center gap-1.5">
                    {productionStatus === 'library' && category.productionCount > 0 && (
                      <span className="text-[10px] text-green-600 bg-green-100 px-1 rounded">
                        {category.productionCount}
                      </span>
                    )}
                    <span className={cn(
                      "text-xs",
                      selectedCategoryId === category.id ? "opacity-70" : "text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
