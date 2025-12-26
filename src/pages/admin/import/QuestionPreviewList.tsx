import { ParsedQuestion, CHAR_LIMITS } from '@/hooks/useQuestionParser';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionPreviewListProps {
  questions: ParsedQuestion[];
}

function CharLimitIndicator({ length, limit }: { length: number; limit: { max: number; warn: number } }) {
  const isError = length > limit.max;
  const isWarning = length > limit.warn && length <= limit.max;

  return (
    <span
      className={cn(
        'text-xs',
        isError && 'text-destructive font-medium',
        isWarning && 'text-yellow-500',
        !isError && !isWarning && 'text-muted-foreground'
      )}
    >
      {length}/{limit.max}
    </span>
  );
}

export function QuestionPreviewList({ questions }: QuestionPreviewListProps) {
  if (questions.length === 0) return null;

  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <div className="p-4 space-y-4">
        {questions.map((q, idx) => (
          <div
            key={idx}
            className={cn(
              'p-4 rounded-lg border',
              q.isValid ? 'bg-card' : 'bg-destructive/5 border-destructive/20'
            )}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                {q.isValid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className="text-sm font-medium">#{idx + 1}</span>
                <Badge variant="outline" className="text-xs">
                  {q.difficulty === 'easy' ? 'მარტივი' : q.difficulty === 'hard' ? 'რთული' : 'საშუალო'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  დონე {q.level_number}
                </Badge>
              </div>
              <CharLimitIndicator length={q.question_text?.length || 0} limit={CHAR_LIMITS.question} />
            </div>

            <p className="font-medium mb-3">{q.question_text}</p>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                <span className="text-green-600 dark:text-green-400">✓ {q.correct_answer}</span>
                <CharLimitIndicator length={q.correct_answer?.length || 0} limit={CHAR_LIMITS.answer} />
              </div>
              {q.incorrect_answers?.map((ans, ansIdx) => (
                <div key={ansIdx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">{ans}</span>
                  <CharLimitIndicator length={ans?.length || 0} limit={CHAR_LIMITS.answer} />
                </div>
              ))}
            </div>

            {q.warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {q.warnings.map((warning, wIdx) => (
                  <div key={wIdx} className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500">
                    <AlertTriangle className="h-3 w-3" />
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
