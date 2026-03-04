import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChevronLeft, ChevronRight, CheckSquare, Globe, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StudioQuestion, StudioFilters, getQuestionType } from '@/hooks/useQuestionStudio';
import { QuestionFilters } from './QuestionFilters';
import { QuestionTypeIndicator } from './QuestionTypeIndicator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuestionListProps {
  questions: StudioQuestion[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string, index: number, shiftKey: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  previewIndex: number;
  onPreviewChange: (index: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: StudioFilters;
  onFiltersChange: (filters: StudioFilters) => void;
  language: 'all' | 'en' | 'ka';
  onLanguageChange: (language: 'all' | 'en' | 'ka') => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  shortenedIds?: Set<string>;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

export function QuestionList({
  questions,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  previewIndex,
  onPreviewChange,
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  language,
  onLanguageChange,
  page,
  pageSize,
  totalCount,
  onPageChange,
  loading,
  shortenedIds,
}: QuestionListProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const allSelected = questions.length > 0 && questions.every(q => selectedIds.has(q.id));

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Search and Filters */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="კითხვის ძებნა..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <QuestionFilters filters={filters} onFiltersChange={onFiltersChange} />
          <Select value={language} onValueChange={(v) => onLanguageChange(v as 'all' | 'en' | 'ka')}>
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <Globe className="h-3.5 w-3.5 mr-1 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ka">🇬🇪 KA</SelectItem>
              <SelectItem value="en">🇬🇧 EN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Selection controls */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={allSelected ? onClearSelection : onSelectAll}
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              {allSelected ? 'გასუფთავება' : 'ყველას არჩევა'}
            </Button>
            {selectedIds.size > 0 && (
              <span className="text-primary font-medium">
                {selectedIds.size} არჩეული
              </span>
            )}
          </div>
          <span>{totalCount.toLocaleString()} კითხვა</span>
        </div>
      </div>

      {/* Questions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              კითხვები ვერ მოიძებნა
            </div>
          ) : (
            questions.map((question, index) => {
              const isSelected = selectedIds.has(question.id);
              const isPreview = index === previewIndex;
              const type = getQuestionType(question);

              const allAnswers = [question.correct_answer, ...question.incorrect_answers];
              const maxAnswerLen = Math.max(...allAnswers.map(a => (a || '').length));
              const showAnswerLen = filters.sortBy === 'longest_answer';

              return (
                <div
                  key={question.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                    isPreview && "bg-primary/10 ring-1 ring-primary/30",
                    !isPreview && "hover:bg-accent/50"
                  )}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-checkbox]')) return;
                    onPreviewChange(index);
                  }}
                >
                  <div
                    data-checkbox
                    className="pt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelection(question.id, index, e.shiftKey);
                    }}
                  >
                    <Checkbox checked={isSelected} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 leading-snug">
                      {question.image_url ? (
                        <span className="text-blue-600 italic">🖼 სურათი</span>
                      ) : (
                        question.question_text
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <QuestionTypeIndicator type={type} />
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                        difficultyColors[question.difficulty]
                      )}>
                        {question.difficulty === 'easy' ? 'მარტივი' : 
                         question.difficulty === 'medium' ? 'საშუალო' : 'რთული'}
                      </span>
                      {showAnswerLen && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5",
                          maxAnswerLen > 25 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                        )}>
                          {maxAnswerLen > 25 && <AlertTriangle className="h-2.5 w-2.5" />}
                          {maxAnswerLen}c
                        </span>
                      )}
                      {shortenedIds?.has(question.id) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary flex items-center gap-0.5">
                          ✂ შემოკლდა
                        </span>
                      )}
                      {question.icon_slug && (
                        <span className="text-[10px] text-muted-foreground">
                          🎨 {question.icon_slug}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Pagination */}
      <div className="p-2 border-t border-border flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          {page + 1} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
