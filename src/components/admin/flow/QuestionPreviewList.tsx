import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, X, CheckCheck, XCircle, AlertTriangle, Search, Edit2 } from 'lucide-react';
import { GeneratedQuestion, Category } from '@/pages/admin/Flow';
import { QUALITY_CONSTANTS } from '@/constants/questionQuality';
import { cn } from '@/lib/utils';
import { FlowIconPicker } from './FlowIconPicker';

const { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } = QUALITY_CONSTANTS;

interface Props {
  questions: GeneratedQuestion[];
  categories: Category[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkReject: (ids: string[]) => void;
  onUpdateQuestion: (id: string, updates: Partial<GeneratedQuestion>) => void;
  languages: { code: string; name: string; flag: string }[];
  focusedQuestionId: string | null;
  onFocusChange: (id: string | null) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function QuestionPreviewList({
  questions,
  categories,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  onUpdateQuestion,
  languages,
  focusedQuestionId,
  onFocusChange,
  onEditStart,
  onEditEnd,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Get unique categories from questions
  const uniqueCategories = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string }>();
    questions.forEach(q => {
      if (!catMap.has(q.categoryId)) {
        catMap.set(q.categoryId, { id: q.categoryId, name: q.categoryName });
      }
    });
    return Array.from(catMap.values());
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    let result = questions;
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(q => q.status === statusFilter);
    }

    // Filter by category
    if (categoryFilter.size > 0) {
      result = result.filter(q => categoryFilter.has(q.categoryId));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(q => 
        q.questionText?.toLowerCase().includes(query) ||
        q.categoryName?.toLowerCase().includes(query) ||
        q.correctAnswer?.toLowerCase().includes(query) ||
        q.iconSlug?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [questions, statusFilter, categoryFilter, searchQuery]);

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

  const toggleCategoryFilter = (catId: string) => {
    setCategoryFilter(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const getFlag = (langCode: string) => {
    return languages.find(l => l.code === langCode)?.flag || '🌐';
  };

  const statusFilters: { value: FilterStatus; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: questions.length },
    { value: 'pending', label: 'Pending', count: questions.filter(q => q.status === 'pending').length },
    { value: 'approved', label: 'Approved', count: questions.filter(q => q.status === 'approved').length },
    { value: 'rejected', label: 'Rejected', count: questions.filter(q => q.status === 'rejected').length },
  ];

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 mx-auto">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg">No questions yet</p>
          <p className="text-sm">Generate or parse questions from the left panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 space-y-2 bg-card/30">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions, categories, icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Status Filter - Inline Circles */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Status:</span>
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs transition-all",
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Category Filter - Inline Circles */}
        {uniqueCategories.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Category:</span>
            <button
              onClick={() => setCategoryFilter(new Set())}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs transition-all",
                categoryFilter.size === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              All
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategoryFilter(cat.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs transition-all truncate max-w-32",
                  categoryFilter.has(cat.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Selection Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {pendingQuestions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={selectedIds.size === pendingQuestions.length ? deselectAll : selectAll}
                className="text-xs h-8"
              >
                {selectedIds.size === pendingQuestions.length ? 'Deselect All' : `Select All (${pendingQuestions.length})`}
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
      </div>

      {/* Questions List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isSelected={selectedIds.has(q.id)}
              isEditing={editingId === q.id}
              isFocused={focusedQuestionId === q.id}
              onToggleSelect={() => toggleSelect(q.id)}
              onApprove={() => onApprove(q.id)}
              onReject={() => onReject(q.id)}
              onStartEdit={() => {
                setEditingId(q.id);
                onEditStart?.();
              }}
              onEndEdit={() => {
                setEditingId(null);
                onEditEnd?.();
              }}
              onUpdate={(updates) => onUpdateQuestion(q.id, updates)}
              onFocus={() => onFocusChange(q.id)}
              flag={getFlag(q.language)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface QuestionCardProps {
  question: GeneratedQuestion;
  isSelected: boolean;
  isEditing: boolean;
  isFocused: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onUpdate: (updates: Partial<GeneratedQuestion>) => void;
  onFocus: () => void;
  flag: string;
}

const QuestionCard = React.memo(function QuestionCard({
  question,
  isSelected,
  isEditing,
  isFocused,
  onToggleSelect,
  onApprove,
  onReject,
  onStartEdit,
  onEndEdit,
  onUpdate,
  onFocus,
  flag,
}: QuestionCardProps) {
  const [editedQuestion, setEditedQuestion] = useState(question.questionText);
  const [editedCorrect, setEditedCorrect] = useState(question.correctAnswer);
  const [editedIncorrect, setEditedIncorrect] = useState([...question.incorrectAnswers]);
  const cardRef = useRef<HTMLDivElement>(null);

  const questionLength = (isEditing ? editedQuestion : question.questionText)?.length || 0;
  const isQuestionOverLimit = questionLength > QUESTION_MAX_LENGTH;

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isFocused]);

  const handleSave = useCallback(() => {
    const newWarnings: string[] = [];
    
    if (editedQuestion.length > QUESTION_MAX_LENGTH) {
      newWarnings.push(`Question exceeds ${QUESTION_MAX_LENGTH} characters`);
    }
    if (editedCorrect.length > ANSWER_MAX_LENGTH) {
      newWarnings.push(`Correct answer exceeds ${ANSWER_MAX_LENGTH} characters`);
    }
    editedIncorrect.forEach((ans, i) => {
      if (ans.length > ANSWER_MAX_LENGTH) {
        newWarnings.push(`Answer ${i + 1} exceeds ${ANSWER_MAX_LENGTH} characters`);
      }
    });

    onUpdate({
      questionText: editedQuestion,
      correctAnswer: editedCorrect,
      incorrectAnswers: editedIncorrect,
      warnings: newWarnings,
      isValid: newWarnings.length === 0 && !question.isDuplicate,
    });
    onEndEdit();
  }, [editedQuestion, editedCorrect, editedIncorrect, question.isDuplicate, onUpdate, onEndEdit]);

  const handleCancel = () => {
    setEditedQuestion(question.questionText);
    setEditedCorrect(question.correctAnswer);
    setEditedIncorrect([...question.incorrectAnswers]);
    onEndEdit();
  };

  return (
    <div
      ref={cardRef}
      onClick={onFocus}
      className={cn(
        "p-3 rounded-lg border transition-all cursor-pointer",
        question.status === 'approved' && "border-green-500/50 bg-green-500/5",
        question.status === 'rejected' && "border-destructive/50 bg-destructive/5 opacity-60",
        question.status === 'pending' && "border-border bg-card/50",
        question.isDuplicate && "border-orange-500/50 bg-orange-500/5",
        isSelected && question.status === 'pending' && "ring-2 ring-primary",
        isFocused && question.status === 'pending' && "ring-2 ring-blue-500 shadow-lg"
      )}
    >
      <div className="flex items-start gap-3">
        {question.status === 'pending' && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
        )}

        {/* Icon Picker */}
        <FlowIconPicker
          currentIconSlug={question.iconSlug}
          suggestedSlugs={question.suggestedIconSlugs || []}
          onSelect={(slug) => onUpdate({ iconSlug: slug })}
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-lg">{flag}</span>
            <Badge variant="secondary" className="text-xs">
              {question.categoryName}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {question.difficulty}
            </Badge>
            {question.isDuplicate && (
              <Badge variant="destructive" className="text-xs">
                Duplicate
              </Badge>
            )}
            {!question.isValid && !question.isDuplicate && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>

          {/* Question Text */}
          {isEditing ? (
            <div className="space-y-1 mb-2">
              <Input
                value={editedQuestion}
                onChange={(e) => setEditedQuestion(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "font-medium",
                  editedQuestion.length > QUESTION_MAX_LENGTH && "border-destructive focus-visible:ring-destructive"
                )}
                autoFocus
              />
              <span className={cn(
                "text-xs",
                isQuestionOverLimit ? "text-destructive" : "text-muted-foreground"
              )}>
                {editedQuestion.length}/{QUESTION_MAX_LENGTH}
              </span>
            </div>
          ) : (
            <div 
              className="group cursor-pointer mb-2"
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
            >
              <p className="font-medium text-sm group-hover:text-primary transition-colors">
                {question.questionText}
                <Edit2 className="w-3 h-3 inline ml-2 opacity-0 group-hover:opacity-50" />
              </p>
              <span className={cn(
                "text-xs",
                isQuestionOverLimit ? "text-destructive" : "text-muted-foreground"
              )}>
                ({questionLength}/{QUESTION_MAX_LENGTH})
              </span>
            </div>
          )}

          {/* Answers */}
          <div className="grid grid-cols-2 gap-1.5">
            {isEditing ? (
              <>
                <AnswerInput
                  value={editedCorrect}
                  onChange={setEditedCorrect}
                  isCorrect
                />
                {editedIncorrect.map((answer, index) => (
                  <AnswerInput
                    key={index}
                    value={answer}
                    onChange={(val) => {
                      const updated = [...editedIncorrect];
                      updated[index] = val;
                      setEditedIncorrect(updated);
                    }}
                  />
                ))}
              </>
            ) : (
              <>
                <AnswerChip answer={question.correctAnswer} isCorrect />
                {question.incorrectAnswers.map((a, i) => (
                  <AnswerChip key={i} answer={a} />
                ))}
              </>
            )}
          </div>

          {/* Warnings */}
          {question.warnings.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {question.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-500">⚠️ {w}</p>
              ))}
            </div>
          )}

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleCancel(); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSave(); }}>
                Save
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        {question.status === 'pending' && !isEditing && (
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onReject(); }}
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
});

function AnswerChip({ answer, isCorrect = false }: { answer: string; isCorrect?: boolean }) {
  const length = answer?.length || 0;
  const isOverLimit = length > ANSWER_MAX_LENGTH;

  return (
    <div
      className={cn(
        "px-2 py-1 rounded text-xs truncate flex items-center justify-between gap-1",
        isCorrect
          ? "bg-green-500/20 text-green-500 border border-green-500/30"
          : "bg-muted/50 text-muted-foreground"
      )}
    >
      <span className="flex items-center gap-1 truncate">
        {isCorrect && <Check className="h-3 w-3 shrink-0" />}
        <span className="truncate">{answer}</span>
      </span>
      <span className={cn("text-xs shrink-0", isOverLimit && "text-destructive")}>
        {length}
      </span>
    </div>
  );
}

function AnswerInput({ value, onChange, isCorrect = false }: { value: string; onChange: (val: string) => void; isCorrect?: boolean }) {
  const isOverLimit = value.length > ANSWER_MAX_LENGTH;

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "pr-10 text-xs h-8",
          isCorrect && "border-green-500/50 focus-visible:ring-green-500",
          isOverLimit && "border-destructive focus-visible:ring-destructive"
        )}
      />
      <span className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 text-xs",
        isOverLimit ? "text-destructive" : "text-muted-foreground"
      )}>
        {value.length}
      </span>
    </div>
  );
}
