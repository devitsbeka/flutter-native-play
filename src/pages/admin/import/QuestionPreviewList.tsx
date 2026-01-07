import { useState } from 'react';
import { ParsedQuestion, CHAR_LIMITS } from '@/hooks/useQuestionParser';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CheckCircle2, XCircle, Pencil, Trash2, ChevronDown, ChevronUp, Save, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionMockupPreview } from '@/components/admin/QuestionMockupPreview';

export interface SelectableParsedQuestion extends ParsedQuestion {
  selected?: boolean;
  icon_keyword?: string | null;
}

interface QuestionPreviewListProps {
  questions: SelectableParsedQuestion[];
  onUpdate?: (index: number, updates: Partial<SelectableParsedQuestion>) => void;
  onRemove?: (index: number) => void;
  onSelectionChange?: (index: number, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  showSelection?: boolean;
}

const DIFFICULTIES = [
  { value: 'easy', label: 'მარტივი' },
  { value: 'medium', label: 'საშუალო' },
  { value: 'hard', label: 'რთული' },
];

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

export function QuestionPreviewList({ questions, onUpdate, onRemove, onSelectionChange, onSelectAll, showSelection = false }: QuestionPreviewListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ParsedQuestion>>({});

  if (questions.length === 0) return null;

  const validQuestions = questions.filter(q => q.isValid);
  const selectedCount = questions.filter(q => q.selected && q.isValid).length;
  const allValidSelected = validQuestions.length > 0 && validQuestions.every(q => q.selected);

  const startEdit = (idx: number) => {
    const q = questions[idx];
    setEditForm({
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      incorrect_answers: [...q.incorrect_answers],
      difficulty: q.difficulty,
      level_number: q.level_number,
    });
    setEditingIndex(idx);
    setExpandedIndex(idx);
  };

  const saveEdit = () => {
    if (editingIndex !== null && onUpdate) {
      onUpdate(editingIndex, editForm);
    }
    setEditingIndex(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const toggleExpand = (idx: number) => {
    if (editingIndex === idx) return;
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Questions List */}
      <ScrollArea className="h-[500px] rounded-md border">
        <div className="p-4 space-y-3">
          {/* Select All Header */}
          {showSelection && validQuestions.length > 0 && (
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={allValidSelected}
                onCheckedChange={(checked) => onSelectAll?.(!!checked)}
              />
              <span className="text-sm text-muted-foreground">
                ყველას მონიშვნა ({selectedCount}/{validQuestions.length} არჩეულია)
              </span>
            </div>
          )}

          {questions.map((q, idx) => {
            const isExpanded = expandedIndex === idx;
            const isEditing = editingIndex === idx;

            return (
              <div
                key={idx}
                className={cn(
                  'rounded-lg border transition-all',
                  q.isValid ? 'bg-card' : 'bg-destructive/5 border-destructive/20',
                  isExpanded && 'ring-2 ring-primary',
                  showSelection && q.selected && q.isValid && 'ring-2 ring-green-500/50 bg-green-500/5'
                )}
              >
                {/* Header - always visible */}
                <div 
                  className="p-3 flex items-start justify-between gap-2 cursor-pointer"
                  onClick={() => toggleExpand(idx)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {showSelection && q.isValid ? (
                      <Checkbox
                        checked={q.selected || false}
                        onCheckedChange={(checked) => {
                          onSelectionChange?.(idx, !!checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : q.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="text-sm font-medium">#{idx + 1}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {q.difficulty === 'easy' ? 'მარტივი' : q.difficulty === 'hard' ? 'რთული' : 'საშუალო'}
                    </Badge>
                    {(q as SelectableParsedQuestion).icon_keyword && (
                      <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                        <Tag className="h-2.5 w-2.5" />
                        {(q as SelectableParsedQuestion).icon_keyword}
                      </Badge>
                    )}
                    <p className="text-sm truncate flex-1">{q.question_text || <span className="text-destructive italic">კითხვა ცარიელია</span>}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isEditing && onUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(idx);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {onRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(idx);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t">
                    {isEditing ? (
                      /* Edit Form */
                      <div className="space-y-3 pt-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium">კითხვა</label>
                            <CharLimitIndicator 
                              length={editForm.question_text?.length || 0} 
                              limit={CHAR_LIMITS.question} 
                            />
                          </div>
                          <Textarea
                            value={editForm.question_text || ''}
                            onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-green-600">სწორი პასუხი</label>
                            <CharLimitIndicator 
                              length={editForm.correct_answer?.length || 0} 
                              limit={CHAR_LIMITS.answer} 
                            />
                          </div>
                          <Input
                            value={editForm.correct_answer || ''}
                            onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-medium">არასწორი პასუხები</label>
                          {(editForm.incorrect_answers || []).map((ans, ansIdx) => (
                            <div key={ansIdx} className="flex items-center gap-2">
                              <Input
                                value={ans}
                                onChange={(e) => {
                                  const newAnswers = [...(editForm.incorrect_answers || [])];
                                  newAnswers[ansIdx] = e.target.value;
                                  setEditForm({ ...editForm, incorrect_answers: newAnswers });
                                }}
                                className="text-sm"
                                placeholder={`პასუხი ${ansIdx + 1}`}
                              />
                              <CharLimitIndicator 
                                length={ans?.length || 0} 
                                limit={CHAR_LIMITS.answer} 
                              />
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium mb-1 block">სირთულე</label>
                            <Select 
                              value={editForm.difficulty} 
                              onValueChange={(v) => setEditForm({ ...editForm, difficulty: v as any })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DIFFICULTIES.map((d) => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">დონე</label>
                            <Input
                              type="number"
                              value={editForm.level_number || 1}
                              onChange={(e) => setEditForm({ ...editForm, level_number: parseInt(e.target.value) || 1 })}
                              className="h-8 text-sm"
                              min={1}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="h-3 w-3 mr-1" />
                            შენახვა
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-3 w-3 mr-1" />
                            გაუქმება
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="pt-3 space-y-2">
                        <p className="font-medium text-sm">{q.question_text}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                            <span className="text-green-600 dark:text-green-400 truncate">✓ {q.correct_answer}</span>
                            <CharLimitIndicator length={q.correct_answer?.length || 0} limit={CHAR_LIMITS.answer} />
                          </div>
                          {q.incorrect_answers?.map((ans, ansIdx) => (
                            <div key={ansIdx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                              <span className="text-muted-foreground truncate">{ans}</span>
                              <CharLimitIndicator length={ans?.length || 0} limit={CHAR_LIMITS.answer} />
                            </div>
                          ))}
                        </div>

                        {q.warnings.length > 0 && (
                          <div className="space-y-1 pt-2">
                            {q.warnings.map((warning, wIdx) => (
                              <div key={wIdx} className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-500">
                                <AlertTriangle className="h-3 w-3" />
                                {warning}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Preview Panel */}
      <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
        {expandedIndex !== null ? (
          <QuestionMockupPreview
            question={editingIndex === expandedIndex ? (editForm.question_text || '') : questions[expandedIndex].question_text}
            correctAnswer={editingIndex === expandedIndex ? (editForm.correct_answer || '') : questions[expandedIndex].correct_answer}
            incorrectAnswers={editingIndex === expandedIndex ? (editForm.incorrect_answers || []) : questions[expandedIndex].incorrect_answers}
            difficulty={editingIndex === expandedIndex ? (editForm.difficulty as any) : questions[expandedIndex].difficulty}
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-sm">აირჩიეთ კითხვა პრევიუსთვის</p>
          </div>
        )}
      </div>
    </div>
  );
}
