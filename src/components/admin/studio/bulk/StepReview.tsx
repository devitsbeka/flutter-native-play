import { useState } from 'react';
import { ArrowLeft, Check, X, Image, Volume2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { GeneratedQuestion } from './StepProcessing';
import { CategoryWithCounts } from '@/hooks/useQuestionStudio';

interface StepReviewProps {
  questions: GeneratedQuestion[];
  categories: CategoryWithCounts[];
  onBack: () => void;
  onImport: (questions: GeneratedQuestion[], categoryId: string) => void;
  importing: boolean;
}

export function StepReview({ questions, categories, onBack, onImport, importing }: StepReviewProps) {
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(
    new Set(questions.map((_, i) => i))
  );
  const [categoryId, setCategoryId] = useState<string>('');

  const toggleQuestion = (index: number) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(questions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const handleImport = () => {
    const selected = questions.filter((_, i) => selectedQuestions.has(i));
    onImport(selected, categoryId);
  };

  const getQuestionIcon = (q: GeneratedQuestion) => {
    if (q.video_url) return <Video className="h-4 w-4 text-blue-500" />;
    if (q.audio_url) return <Volume2 className="h-4 w-4 text-green-500" />;
    if (q.image_url) return <Image className="h-4 w-4 text-purple-500" />;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{questions.length} კითხვა მზადაა</h3>
          <p className="text-sm text-muted-foreground">
            გადახედეთ და აირჩიეთ რომლები დაემატოს
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            ყველა
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            არცერთი
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <ScrollArea className="h-[350px] border rounded-lg">
        <div className="p-2 space-y-2">
          {questions.map((q, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-lg border transition-colors cursor-pointer",
                selectedQuestions.has(index)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => toggleQuestion(index)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedQuestions.has(index)}
                  onCheckedChange={() => toggleQuestion(index)}
                  className="mt-1"
                />

                {/* Image Preview */}
                {q.image_url && (
                  <img
                    src={q.image_url}
                    alt={q.subject}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Question */}
                  <div className="flex items-center gap-2">
                    {getQuestionIcon(q)}
                    <span className="font-medium text-sm">{q.question_text}</span>
                  </div>

                  {/* Answers */}
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="h-3 w-3" />
                      <span className="truncate">{q.correct_answer}</span>
                    </div>
                    {q.incorrect_answers.map((ans, i) => (
                      <div key={i} className="flex items-center gap-1 text-muted-foreground">
                        <X className="h-3 w-3" />
                        <span className="truncate">{ans}</span>
                      </div>
                    ))}
                  </div>

                  {/* Difficulty Badge */}
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded text-xs",
                    q.difficulty === 'easy' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    q.difficulty === 'medium' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                    q.difficulty === 'hard' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {q.difficulty === 'easy' && 'მარტივი'}
                    {q.difficulty === 'medium' && 'საშუალო'}
                    {q.difficulty === 'hard' && 'რთული'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Category Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">კატეგორია</label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="აირჩიეთ კატეგორია" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onBack} disabled={importing}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          უკან
        </Button>
        <div className="text-sm text-muted-foreground">
          არჩეულია: <span className="font-medium text-foreground">{selectedQuestions.size}</span> / {questions.length}
        </div>
        <Button 
          onClick={handleImport}
          disabled={selectedQuestions.size === 0 || !categoryId || importing}
        >
          {importing ? 'იტვირთება...' : `ბიბლიოთეკაში დამატება (${selectedQuestions.size})`}
        </Button>
      </div>
    </div>
  );
}
