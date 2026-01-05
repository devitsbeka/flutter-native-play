import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, CheckCheck, XCircle, AlertTriangle } from 'lucide-react';
import { GeneratedQuestion } from '@/pages/admin/Flow';
import { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } from '@/utils/questionValidation';
import { cn } from '@/lib/utils';

interface Props {
  questions: GeneratedQuestion[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkReject: (ids: string[]) => void;
  languages: { code: string; name: string; flag: string }[];
}

export function QuestionPreviewList({
  questions,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  languages,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredQuestions = questions.filter(q => {
    if (filter === 'all') return true;
    return q.status === filter;
  });

  const pendingQuestions = filteredQuestions.filter(q => q.status === 'pending');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(pendingQuestions.map(q => q.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkApprove = () => {
    onBulkApprove(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    onBulkReject(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const getFlag = (langCode: string) => {
    return languages.find(l => l.code === langCode)?.flag || '🌐';
  };

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">No questions yet</p>
          <p className="text-sm">Generate or parse questions from the left panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between gap-3 bg-card/30">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({questions.length})</SelectItem>
              <SelectItem value="pending">Pending ({questions.filter(q => q.status === 'pending').length})</SelectItem>
              <SelectItem value="approved">Approved ({questions.filter(q => q.status === 'approved').length})</SelectItem>
              <SelectItem value="rejected">Rejected ({questions.filter(q => q.status === 'rejected').length})</SelectItem>
            </SelectContent>
          </Select>

          {pendingQuestions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={selectedIds.size === pendingQuestions.length ? deselectAll : selectAll}
              className="text-xs h-8"
            >
              {selectedIds.size === pendingQuestions.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Button
              variant="default"
              size="sm"
              onClick={handleBulkApprove}
              className="gap-1 h-8"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkReject}
              className="gap-1 h-8"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Questions List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isSelected={selectedIds.has(q.id)}
              onToggleSelect={() => toggleSelect(q.id)}
              onApprove={() => onApprove(q.id)}
              onReject={() => onReject(q.id)}
              flag={getFlag(q.language)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function QuestionCard({
  question,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  flag,
}: {
  question: GeneratedQuestion;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  flag: string;
}) {
  const questionLength = question.questionText?.length || 0;
  const isQuestionOverLimit = questionLength > QUESTION_MAX_LENGTH;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-all",
        question.status === 'approved' && "border-green-500/50 bg-green-500/5",
        question.status === 'rejected' && "border-destructive/50 bg-destructive/5 opacity-60",
        question.status === 'pending' && "border-border bg-card/50",
        isSelected && question.status === 'pending' && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start gap-3">
        {question.status === 'pending' && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{flag}</span>
            <Badge variant="secondary" className="text-xs">
              {question.categoryName}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {question.difficulty}
            </Badge>
            {question.iconSlug && (
              <Badge variant="outline" className="text-xs">
                🎨 {question.iconSlug}
              </Badge>
            )}
            {!question.isValid && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>

          {/* Question Text */}
          <p className="font-medium text-sm mb-2">
            {question.questionText}
            <span className={cn(
              "ml-2 text-xs",
              isQuestionOverLimit ? "text-destructive" : "text-muted-foreground"
            )}>
              ({questionLength}/{QUESTION_MAX_LENGTH})
            </span>
          </p>

          {/* Answers */}
          <div className="grid grid-cols-2 gap-1.5">
            <AnswerChip answer={question.correctAnswer} isCorrect />
            {question.incorrectAnswers.map((a, i) => (
              <AnswerChip key={i} answer={a} />
            ))}
          </div>

          {/* Warnings */}
          {question.warnings.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {question.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-500">⚠️ {w}</p>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {question.status === 'pending' && (
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onApprove}
              className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onReject}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {question.status === 'approved' && (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            Approved
          </Badge>
        )}

        {question.status === 'rejected' && (
          <Badge variant="destructive" className="opacity-80">
            Rejected
          </Badge>
        )}
      </div>
    </div>
  );
}

function AnswerChip({ answer, isCorrect = false }: { answer: string; isCorrect?: boolean }) {
  const length = answer?.length || 0;
  const isOverLimit = length > ANSWER_MAX_LENGTH;

  return (
    <div
      className={cn(
        "px-2 py-1 rounded text-xs truncate flex items-center gap-1",
        isCorrect
          ? "bg-green-500/20 text-green-500 border border-green-500/30"
          : "bg-muted/50 text-muted-foreground"
      )}
    >
      {isCorrect && <Check className="h-3 w-3 shrink-0" />}
      <span className="truncate">{answer}</span>
      {isOverLimit && (
        <span className="text-destructive shrink-0">({length})</span>
      )}
    </div>
  );
}
