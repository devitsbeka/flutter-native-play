import { useState, useMemo } from 'react';
import { ParsedQuestion, CHAR_LIMITS } from '@/hooks/useQuestionParser';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CheckCircle2, XCircle, Pencil, Trash2, ChevronDown, ChevronUp, Save, X, Tag, ImagePlus, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameStyleQuestionPreview } from '@/components/admin/GameStyleQuestionPreview';
import { IconPickerModal } from '@/components/admin/IconPickerModal';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { KeywordSuggestions } from '@/components/admin/KeywordSuggestions';
import { validateIconKeyword } from '@/utils/iconAnswerValidation';
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ParsedQuestion>>({});
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  
  // Filter state
  const [searchFilter, setSearchFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null);

  // Get unique keywords
  const uniqueKeywords = useMemo(() => 
    [...new Set(questions.map(q => q.icon_keyword).filter(Boolean))] as string[]
  , [questions]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q, idx) => {
      if (searchFilter && !q.question_text.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
      if (keywordFilter && q.icon_keyword !== keywordFilter) return false;
      return true;
    });
  }, [questions, searchFilter, difficultyFilter, keywordFilter]);

  // Create index mapping for filtered questions
  const filteredWithIndex = useMemo(() => 
    questions.map((q, idx) => ({ ...q, originalIndex: idx }))
      .filter(q => {
        if (searchFilter && !q.question_text.toLowerCase().includes(searchFilter.toLowerCase())) return false;
        if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
        if (keywordFilter && q.icon_keyword !== keywordFilter) return false;
        return true;
      })
  , [questions, searchFilter, difficultyFilter, keywordFilter]);

  const clearFilters = () => {
    setSearchFilter('');
    setDifficultyFilter(null);
    setKeywordFilter(null);
  };

  const hasActiveFilters = searchFilter || difficultyFilter || keywordFilter;

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
    setExpandedIndex(idx);
  };

  const openIconPicker = (idx: number) => {
    setIconPickerIndex(idx);
    setIconPickerOpen(true);
  };

  const handleIconSelect = (slug: string) => {
    if (iconPickerIndex !== null && onUpdate) {
      onUpdate(iconPickerIndex, { icon_keyword: slug || null });
    }
  };

  const selectedQuestion = expandedIndex !== null ? questions[expandedIndex] : null;
  const editingQuestion = editingIndex !== null ? questions[editingIndex] : null;

  const updateKeyword = (idx: number, keyword: string) => {
    if (onUpdate) {
      onUpdate(idx, { icon_keyword: keyword || null });
    }
  };

  return (
    <>
      {/* Icon Picker Modal */}
      <IconPickerModal
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        currentSlug={iconPickerIndex !== null ? questions[iconPickerIndex]?.icon_keyword : null}
        currentKeyword={iconPickerIndex !== null ? questions[iconPickerIndex]?.icon_keyword : null}
        questionText={iconPickerIndex !== null ? questions[iconPickerIndex]?.question_text : undefined}
        correctAnswer={iconPickerIndex !== null ? questions[iconPickerIndex]?.correct_answer : undefined}
        onSelect={handleIconSelect}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Questions List - 3 columns */}
        <div className="lg:col-span-3">
          {/* Filter controls */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ძიება..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={difficultyFilter || ''} onValueChange={(v) => setDifficultyFilter(v || null)}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="სირთულე" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">მარტივი</SelectItem>
                <SelectItem value="medium">საშუალო</SelectItem>
                <SelectItem value="hard">რთული</SelectItem>
              </SelectContent>
            </Select>
            {uniqueKeywords.length > 0 && (
              <Select value={keywordFilter || ''} onValueChange={(v) => setKeywordFilter(v || null)}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Keyword" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueKeywords.map(kw => (
                    <SelectItem key={kw} value={kw}>{kw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="w-4 h-4 mr-1" />
                გასუფთავება
              </Button>
            )}
          </div>

          <ScrollArea className="h-[500px] rounded-md border">
            <div className="p-3 space-y-2">
              {/* Select All Header */}
              {showSelection && validQuestions.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b mb-2">
                  <Checkbox
                    checked={allValidSelected}
                    onCheckedChange={(checked) => onSelectAll?.(!!checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    ყველას მონიშვნა ({selectedCount}/{validQuestions.length} არჩეულია)
                    {hasActiveFilters && <span className="ml-2 text-primary">• {filteredWithIndex.length} ფილტრირებული</span>}
                  </span>
                </div>
              )}

              {filteredWithIndex.length === 0 && hasActiveFilters ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>კითხვა ვერ მოიძებნა</p>
                  <Button variant="link" onClick={clearFilters} className="mt-1">
                    ფილტრების გასუფთავება
                  </Button>
                </div>
              ) : null}

              {filteredWithIndex.map((q) => {
                const idx = q.originalIndex;
                const isExpanded = expandedIndex === idx;
                const isEditing = editingIndex === idx;

                return (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-lg border transition-all',
                      q.isValid ? 'bg-card' : 'bg-destructive/5 border-destructive/20',
                      isExpanded && 'ring-2 ring-primary bg-primary/5',
                      showSelection && q.selected && q.isValid && !isExpanded && 'border-green-500/50 bg-green-500/5'
                    )}
                  >
                    {/* Header - always visible */}
                    <div 
                      className="p-2.5 flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleExpand(idx)}
                    >
                      {/* Checkbox */}
                      {showSelection && q.isValid ? (
                        <Checkbox
                          checked={q.selected || false}
                          onCheckedChange={(checked) => {
                            onSelectionChange?.(idx, !!checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                      ) : q.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}

                      {/* Question number */}
                      <span className="text-xs font-bold text-muted-foreground w-6">#{idx + 1}</span>

                      {/* Icon thumbnail - clickable */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openIconPicker(idx);
                        }}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors border",
                          q.icon_keyword 
                            ? "bg-muted/50 border-border/50 hover:bg-muted" 
                            : "bg-muted/30 border-dashed border-muted-foreground/30 hover:border-primary/50"
                        )}
                        title="აიკონის შეცვლა"
                      >
                        {q.icon_keyword ? (
                          <DynamicIcon slug={q.icon_keyword} size={24} />
                        ) : (
                          <ImagePlus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Difficulty badge */}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1.5 shrink-0",
                          q.difficulty === 'easy' && "border-green-500/50 text-green-600",
                          q.difficulty === 'medium' && "border-yellow-500/50 text-yellow-600",
                          q.difficulty === 'hard' && "border-red-500/50 text-red-600"
                        )}
                      >
                        {q.difficulty === 'easy' ? 'მარტივი' : q.difficulty === 'hard' ? 'რთული' : 'საშუალო'}
                      </Badge>

                      {/* Keyword badge or suggestions */}
                      {q.icon_keyword ? (
                        <>
                          <Badge variant="secondary" className="text-[10px] shrink-0 gap-0.5 max-w-[80px]">
                            <Tag className="h-2 w-2" />
                            <span className="truncate">{q.icon_keyword}</span>
                          </Badge>
                          {/* Warning if icon might reveal answer */}
                          {!validateIconKeyword(q.icon_keyword, q.correct_answer).isValid && (
                            <Badge variant="destructive" className="text-[10px] shrink-0 gap-0.5">
                              <AlertTriangle className="h-2 w-2" />
                              მინიშნება!
                            </Badge>
                          )}
                        </>
                      ) : (
                        <KeywordSuggestions
                          question={q.question_text}
                          answer={q.correct_answer}
                          onSelect={(kw) => updateKeyword(idx, kw)}
                          className="shrink-0"
                        />
                      )}

                      {/* Question text - truncated */}
                      <p className="text-sm truncate flex-1 min-w-0">
                        {q.question_text || <span className="text-destructive italic">კითხვა ცარიელია</span>}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!isEditing && onUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
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
                            className="h-7 w-7 p-0"
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
        </div>

        {/* Preview Panel - 2 columns */}
        <div className="lg:col-span-2 flex items-start justify-center p-4 bg-muted/30 rounded-lg sticky top-4">
          {selectedQuestion ? (
            <GameStyleQuestionPreview
              question={editingIndex === expandedIndex ? (editForm.question_text || '') : selectedQuestion.question_text}
              correctAnswer={editingIndex === expandedIndex ? (editForm.correct_answer || '') : selectedQuestion.correct_answer}
              incorrectAnswers={editingIndex === expandedIndex ? (editForm.incorrect_answers || []) : selectedQuestion.incorrect_answers}
              difficulty={editingIndex === expandedIndex ? (editForm.difficulty as 'easy' | 'medium' | 'hard') : selectedQuestion.difficulty}
              iconSlug={selectedQuestion.icon_keyword}
              iconKeyword={selectedQuestion.icon_keyword}
              questionNumber={expandedIndex !== null ? expandedIndex + 1 : 1}
              isEditable={true}
              onIconClick={() => expandedIndex !== null && openIconPicker(expandedIndex)}
              onQuestionEdit={(text) => {
                if (expandedIndex !== null && onUpdate) {
                  onUpdate(expandedIndex, { question_text: text });
                }
              }}
              onAnswerEdit={(correct, incorrect) => {
                if (expandedIndex !== null && onUpdate) {
                  onUpdate(expandedIndex, { correct_answer: correct, incorrect_answers: incorrect });
                }
              }}
            />
          ) : (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-sm">აირჩიეთ კითხვა პრევიუსთვის</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
