import { cn } from '@/lib/utils';
import { Library, Rocket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProductionStatus } from '@/hooks/useQuestionStudio';

interface StudioTabsProps {
  activeTab: ProductionStatus;
  onTabChange: (tab: ProductionStatus) => void;
  libraryCount: number;
  productionCount: number;
}

export function StudioTabs({ activeTab, onTabChange, libraryCount, productionCount }: StudioTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      <button
        onClick={() => onTabChange('library')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          activeTab === 'library'
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Library className="h-4 w-4" />
        <span>Library</span>
        <Badge variant="secondary" className="ml-1 text-xs">
          {libraryCount.toLocaleString()}
        </Badge>
      </button>
      
      <button
        onClick={() => onTabChange('production')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          activeTab === 'production'
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Rocket className="h-4 w-4" />
        <span>Production</span>
        <Badge variant="secondary" className="ml-1 text-xs bg-green-500/20 text-green-700">
          {productionCount.toLocaleString()}
        </Badge>
      </button>
    </div>
  );
}
