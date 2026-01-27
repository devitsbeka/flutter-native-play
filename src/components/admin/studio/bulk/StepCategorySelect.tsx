import { useState, useEffect } from 'react';
import { FileText, ImageIcon, X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { detectThemeFromCategoryName, getQuestionText, ThemeType } from './PresetCategories';
import { CategoryWithCounts } from '@/hooks/useQuestionStudio';
import { supabase } from '@/integrations/supabase/client';

type SimpleQuestionType = 'text' | 'image';

interface StepCategorySelectProps {
  categories: CategoryWithCounts[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  subjects: string[];
  onSubjectsChange: (subjects: string[]) => void;
  questionType: SimpleQuestionType;
  onQuestionTypeChange: (type: SimpleQuestionType) => void;
  onNext: () => void;
}

export function StepCategorySelect({
  categories,
  selectedCategoryId,
  onCategoryChange,
  subjects,
  onSubjectsChange,
  questionType,
  onQuestionTypeChange,
  onNext,
}: StepCategorySelectProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  // Fetch AI suggestions when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const { data, error } = await supabase.functions.invoke('generate-topic-suggestions', {
          body: { categoryName: selectedCategory.name }
        });
        
        if (error) throw error;
        setSuggestions(data?.suggestions || []);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [selectedCategory?.id]);

  // Detect theme for dynamic question text preview
  const theme: ThemeType = selectedCategory 
    ? detectThemeFromCategoryName(selectedCategory.name)
    : 'generic';
  
  const questionPreview = getQuestionText(theme, questionType);

  const addSubject = (subject: string) => {
    if (subject.trim() && !subjects.includes(subject.trim())) {
      onSubjectsChange([...subjects, subject.trim()]);
    }
  };

  const removeSubject = (subject: string) => {
    onSubjectsChange(subjects.filter(s => s !== subject));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addSubject(inputValue.trim());
      setInputValue('');
    }
  };

  const canProceed = selectedCategoryId && subjects.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Category Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">კატეგორია</Label>
        <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="აირჩიეთ კატეგორია" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border">
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. AI Suggestions (dynamic, fetched from AI) */}
      {selectedCategoryId && (
        <div className="space-y-3">
          <Label className="text-base font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI რეკომენდაციები
          </Label>
          {isLoadingSuggestions ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              იტვირთება რეკომენდაციები...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map(suggestion => {
                const isAdded = subjects.includes(suggestion);
                return (
                  <button
                    key={suggestion}
                    onClick={() => !isAdded && addSubject(suggestion)}
                    disabled={isAdded}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm transition-all",
                      isAdded
                        ? "border-primary/30 bg-primary/10 text-muted-foreground cursor-default"
                        : "border-border hover:border-primary hover:bg-primary/10 cursor-pointer"
                    )}
                  >
                    {isAdded ? '✓' : '+'} {suggestion}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              ვერ მოიძებნა რეკომენდაციები. დაამატეთ თემები ხელით ქვემოთ.
            </p>
          )}
        </div>
      )}

      {/* 3. Custom Subject Input with Chips */}
      <div className="space-y-3">
        <Label className="text-base font-medium">დაამატეთ თემები</Label>
        <div className="border border-border rounded-xl p-3 flex flex-wrap gap-2 min-h-[80px] bg-background focus-within:border-primary transition-colors">
          {subjects.map(subject => (
            <span 
              key={subject} 
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-sm border border-primary/20"
            >
              {subject}
              <button 
                onClick={() => removeSubject(subject)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={subjects.length === 0 ? "ჩაწერეთ თემა და დააჭირეთ Enter..." : "კიდევ დაამატეთ..."}
            className="flex-1 min-w-[150px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {subjects.length} თემა დამატებულია
        </p>
      </div>

      {/* 4. Question Type (Text or Image only) */}
      <div className="space-y-3">
        <Label className="text-base font-medium">კითხვის ტიპი</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onQuestionTypeChange('text')}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              questionType === 'text'
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              questionType === 'text' ? "bg-primary/20" : "bg-muted"
            )}>
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">ტექსტი</span>
          </button>
          <button
            onClick={() => onQuestionTypeChange('image')}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              questionType === 'image'
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              questionType === 'image' ? "bg-primary/20" : "bg-muted"
            )}>
              <ImageIcon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">სურათი</span>
          </button>
        </div>
      </div>

      {/* Question Preview */}
      {selectedCategoryId && subjects.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-1">კითხვის ფორმატი:</p>
          <p className="text-sm font-medium">{questionPreview}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          სულ: <span className="font-medium text-foreground">{subjects.length}</span> თემა
        </div>
        <Button onClick={onNext} disabled={!canProceed}>
          შემდეგი →
        </Button>
      </div>
    </div>
  );
}
