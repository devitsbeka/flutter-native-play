import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, X } from 'lucide-react';
import { StudioFilters, QuestionType } from '@/hooks/useQuestionStudio';
import { Badge } from '@/components/ui/badge';

interface QuestionFiltersProps {
  filters: StudioFilters;
  onFiltersChange: (filters: StudioFilters) => void;
}

export function QuestionFilters({ filters, onFiltersChange }: QuestionFiltersProps) {
  const activeFilterCount = [
    filters.questionType,
    filters.difficulty,
    filters.hasIcon,
  ].filter(f => f !== null).length;

  const clearFilters = () => {
    onFiltersChange({
      questionType: null,
      difficulty: null,
      hasIcon: null,
      sortBy: 'newest',
    });
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>ფილტრი</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover max-h-[70vh] overflow-y-auto">
          <DropdownMenuLabel>ტიპი</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.questionType || 'all'}
            onValueChange={(v) => onFiltersChange({ 
              ...filters, 
              questionType: v === 'all' ? null : v as QuestionType 
            })}
          >
            <DropdownMenuRadioItem value="all">ყველა</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="text">📝 ტექსტი</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="image">🖼️ სურათი</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="video">🎬 ვიდეო</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="audio">🎧 აუდიო</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>სირთულე</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.difficulty || 'all'}
            onValueChange={(v) => onFiltersChange({ 
              ...filters, 
              difficulty: v === 'all' ? null : v as 'easy' | 'medium' | 'hard' 
            })}
          >
            <DropdownMenuRadioItem value="all">ყველა</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="easy">მარტივი</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="medium">საშუალო</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="hard">რთული</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>აიკონი</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.hasIcon === null ? 'all' : filters.hasIcon ? 'with' : 'without'}
            onValueChange={(v) => onFiltersChange({ 
              ...filters, 
              hasIcon: v === 'all' ? null : v === 'with' 
            })}
          >
            <DropdownMenuRadioItem value="all">ყველა</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="with">აიკონით</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="without">აიკონის გარეშე</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel>სორტირება</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.sortBy}
            onValueChange={(v) => onFiltersChange({ 
              ...filters, 
              sortBy: v as StudioFilters['sortBy']
            })}
          >
            <DropdownMenuRadioItem value="longest_question">📏 გრძელი კითხვები</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="longest_answer">📏 გრძელი პასუხები</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="newest">უახლესი</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="oldest">უძველესი</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="alphabetical">ანბანით</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
