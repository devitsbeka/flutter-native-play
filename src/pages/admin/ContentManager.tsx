import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Search,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ChevronRight,
  HelpCircle,
  MoreHorizontal,
  FileText,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminCategories, AdminCategory } from '@/hooks/useAdminCategories';
import { useAdminQuestions, AdminQuestion } from '@/hooks/useAdminQuestions';
import { QuestionMockupPreview } from '@/components/admin/QuestionMockupPreview';
import { CategoryMockupPreview } from '@/components/admin/CategoryMockupPreview';
import { IconPicker } from '@/components/admin/IconPicker';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const DIFFICULTIES = [
  { value: 'easy', label: 'ადვილი', color: 'bg-emerald-500' },
  { value: 'medium', label: 'საშუალო', color: 'bg-amber-500' },
  { value: 'hard', label: 'რთული', color: 'bg-rose-500' },
];

const CATEGORY_TYPES = [
  { value: 'classic', label: 'კლასიკური' },
  { value: 'fun', label: 'გართობა' },
  { value: 'educational', label: 'საგანმანათლებლო' },
];

const EMOJI_OPTIONS = [
  '📚', '🏰', '📜', '🌍', '🔬', '⚽', '🎨', '⛪', '🤔', '🏺',
  '🗣️', '🏛️', '💰', '⚔️', '🏗️', '🎬', '🎵', '🍲', '🦁', '📱',
];

const GRADIENT_PRESETS = [
  { value: 'from-blue-400 to-cyan-500', label: 'ცისფერი' },
  { value: 'from-violet-400 to-purple-500', label: 'იასამნისფერი' },
  { value: 'from-amber-400 to-orange-500', label: 'ნარინჯისფერი' },
  { value: 'from-emerald-400 to-teal-500', label: 'მწვანე' },
  { value: 'from-rose-400 to-pink-500', label: 'ვარდისფერი' },
  { value: 'from-red-400 to-orange-500', label: 'წითელი' },
];

export default function ContentManager() {
  const { categories, loading: catsLoading, addCategory, updateCategory, deleteCategory } = useAdminCategories();
  
  // Selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  
  // Category question counts (fetched separately)
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  
  // Fetch question counts per category using RPC (server-side aggregation)
  const fetchQuestionCounts = useCallback(async () => {
    if (categories.length === 0) return;
    
    setCountsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_category_question_counts');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { category_id: string; question_count: number }) => {
        counts[row.category_id] = row.question_count;
      });
      setQuestionCounts(counts);
    } catch (err) {
      console.error('Error fetching question counts:', err);
    } finally {
      setCountsLoading(false);
    }
  }, [categories.length]);
  
  useEffect(() => {
    fetchQuestionCounts();
  }, [fetchQuestionCounts]);
  
  // Use hook with selected category for server-side filtering
  const { 
    questions, 
    loading: qsLoading, 
    totalCount, 
    page, 
    pageSize, 
    setPage, 
    addQuestion, 
    updateQuestion, 
    deleteQuestion 
  } = useAdminQuestions(selectedCategoryId);
  
  // Search
  const [categorySearch, setCategorySearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');
  
  // Dialogs
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'question'; item: any } | null>(null);
  const [saving, setSaving] = useState(false);

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    category_id: '',
    name: '',
    icon: '📚',
    icon_slug: '',
    color: 'from-blue-400 to-cyan-500',
    description: '',
    total_levels: 20,
    type: 'classic',
    is_active: true,
    sort_order: 0,
  });

  // Question form
  const [questionForm, setQuestionForm] = useState({
    category_id: '',
    question_text: '',
    correct_answer: '',
    incorrect_answers: ['', '', ''],
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    level_number: 1,
    is_active: true,
    icon_slug: '',
  });

  // Derived data
  const selectedCategory = useMemo(() => 
    categories.find(c => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const filteredCategories = useMemo(() => 
    categories.filter(cat =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
      cat.category_id.toLowerCase().includes(categorySearch.toLowerCase())
    ),
    [categories, categorySearch]
  );

  // Client-side search filter on current page of questions
  const filteredQuestions = useMemo(() => {
    if (!questionSearch) return questions;
    return questions.filter(q => 
      q.question_text.toLowerCase().includes(questionSearch.toLowerCase())
    );
  }, [questions, questionSearch]);

  const selectedQuestion = useMemo(() =>
    questions.find(q => q.id === selectedQuestionId),
    [questions, selectedQuestionId]
  );

  // Pagination helpers
  const totalPages = Math.ceil(totalCount / pageSize);
  const showingFrom = totalCount > 0 ? page * pageSize + 1 : 0;
  const showingTo = Math.min((page + 1) * pageSize, totalCount);


  // Category handlers
  const openAddCategory = () => {
    setCategoryForm({
      category_id: '',
      name: '',
      icon: '📚',
      icon_slug: '',
      color: 'from-blue-400 to-cyan-500',
      description: '',
      total_levels: 20,
      type: 'classic',
      is_active: true,
      sort_order: 0,
    });
    setEditingCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const openEditCategory = (category: AdminCategory) => {
    setCategoryForm({
      category_id: category.category_id,
      name: category.name,
      icon: category.icon,
      icon_slug: category.icon_slug || '',
      color: category.color,
      description: category.description || '',
      total_levels: category.total_levels,
      type: category.type,
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
      } else {
        await addCategory(categoryForm);
      }
      setIsCategoryDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Question handlers
  const openAddQuestion = () => {
    setQuestionForm({
      category_id: selectedCategoryId || categories[0]?.id || '',
      question_text: '',
      correct_answer: '',
      incorrect_answers: ['', '', ''],
      difficulty: 'medium',
      level_number: 1,
      is_active: true,
      icon_slug: '',
    });
    setEditingQuestion(null);
    setIsQuestionDialogOpen(true);
  };

  const openEditQuestion = (question: AdminQuestion) => {
    setQuestionForm({
      category_id: question.category_id,
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      incorrect_answers: [
        question.incorrect_answers[0] || '',
        question.incorrect_answers[1] || '',
        question.incorrect_answers[2] || '',
      ],
      difficulty: question.difficulty,
      level_number: question.level_number,
      is_active: question.is_active,
      icon_slug: question.icon_slug || '',
    });
    setEditingQuestion(question);
    setIsQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    setSaving(true);
    try {
      const data = {
        ...questionForm,
        incorrect_answers: questionForm.incorrect_answers.filter(a => a.trim()),
        icon_slug: questionForm.icon_slug || null,
      };
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, data);
      } else {
        await addQuestion(data);
      }
      setIsQuestionDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'category') {
      await deleteCategory(deleteTarget.item.id);
      if (selectedCategoryId === deleteTarget.item.id) {
        setSelectedCategoryId(null);
      }
    } else {
      await deleteQuestion(deleteTarget.item.id);
      if (selectedQuestionId === deleteTarget.item.id) {
        setSelectedQuestionId(null);
      }
    }
    setDeleteTarget(null);
  };

  const loading = catsLoading || qsLoading;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Column 1: Categories */}
      <div className="w-64 border-r border-border/50 flex flex-col bg-card/30">
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">კატეგორიები</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openAddCategory}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="ძიება..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="h-7 text-xs pl-7 bg-background/50"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-1">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setSelectedQuestionId(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all group",
                  selectedCategoryId === category.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent/50",
                  !category.is_active && "opacity-50"
                )}
              >
                <DynamicIcon 
                  slug={category.icon_slug || undefined}
                  categoryId={category.category_id}
                  size={24}
                  className="shrink-0"
                  fallbackEmoji={category.icon}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{category.name}</p>
                  <p className={cn(
                    "text-[10px]",
                    selectedCategoryId === category.id 
                      ? "text-primary-foreground/70" 
                      : "text-muted-foreground"
                  )}>
                    {questionCounts[category.id] || 0} კითხვა
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-5 w-5 opacity-0 group-hover:opacity-100",
                        selectedCategoryId === category.id && "opacity-100"
                      )}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={() => openEditCategory(category)}>
                      <Pencil className="h-3 w-3 mr-2" /> რედაქტირება
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => updateCategory(category.id, { is_active: !category.is_active })}
                    >
                      {category.is_active ? (
                        <><ToggleLeft className="h-3 w-3 mr-2" /> გამორთვა</>
                      ) : (
                        <><ToggleRight className="h-3 w-3 mr-2" /> ჩართვა</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setDeleteTarget({ type: 'category', item: category })}
                    >
                      <Trash2 className="h-3 w-3 mr-2" /> წაშლა
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </button>
            ))}
            
            {filteredCategories.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">კატეგორიები არ არის</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Column 2: Questions */}
      <div className="w-80 border-r border-border/50 flex flex-col bg-background/50">
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {selectedCategory && (
                <>
                  <DynamicIcon 
                    slug={selectedCategory.icon_slug || undefined}
                    categoryId={selectedCategory.category_id}
                    size={20}
                    fallbackEmoji={selectedCategory.icon}
                  />
                  <span className="text-xs font-semibold truncate">{selectedCategory.name}</span>
                </>
              )}
              {!selectedCategory && (
                <span className="text-xs font-semibold text-muted-foreground">ყველა კითხვა ({questions.length.toLocaleString()})</span>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={openAddQuestion}
              disabled={categories.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input 
              placeholder="კითხვის ძიება..."
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
              className="h-7 text-xs pl-7 bg-background/50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1">
            {filteredQuestions.map((question) => {
              const cat = categories.find(c => c.id === question.category_id);
              return (
                <button
                  key={question.id}
                  onClick={() => setSelectedQuestionId(question.id)}
                  className={cn(
                    "w-full flex items-start gap-2 px-2 py-2 rounded-md text-left transition-all group",
                    selectedQuestionId === question.id 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent/50",
                    !question.is_active && "opacity-50"
                  )}
                >
                  <DynamicIcon 
                    slug={question.icon_slug || undefined}
                    categoryId={cat?.category_id}
                    size={18}
                    className="shrink-0 mt-0.5"
                    fallbackEmoji={cat?.icon}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug line-clamp-2">
                      {question.question_text}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {!selectedCategoryId && cat && (
                        <span className={cn(
                          "text-[9px] px-1 py-0.5 rounded flex items-center",
                          selectedQuestionId === question.id 
                            ? "bg-primary-foreground/20" 
                            : "bg-muted"
                        )}>
                          <DynamicIcon 
                            slug={cat.icon_slug || undefined}
                            categoryId={cat.category_id}
                            size={14}
                            hideIfEmpty={true}
                            fallbackEmoji={cat.icon}
                          />
                        </span>
                      )}
                      <span className={cn(
                        "text-[9px] px-1 py-0.5 rounded",
                        selectedQuestionId === question.id 
                          ? "bg-primary-foreground/20" 
                          : DIFFICULTIES.find(d => d.value === question.difficulty)?.color + " text-white"
                      )}>
                        {DIFFICULTIES.find(d => d.value === question.difficulty)?.label}
                      </span>
                      <span className={cn(
                        "text-[9px]",
                        selectedQuestionId === question.id 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      )}>
                        L{question.level_number}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredQuestions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">
                  {selectedCategoryId ? 'კითხვები არ არის' : 'აირჩიეთ კატეგორია'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="p-2 border-t border-border/50 flex items-center justify-between bg-background/50">
            <span className="text-[10px] text-muted-foreground">
              {showingFrom}-{showingTo} / {totalCount.toLocaleString()}
            </span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setPage(p => Math.max(0, p - 1))} 
                disabled={page === 0 || qsLoading}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setPage(p => p + 1)} 
                disabled={page >= totalPages - 1 || qsLoading}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Preview & Edit */}
      <div className="flex-1 flex flex-col bg-muted/20">
        {selectedQuestion ? (
          <>
            {/* Question Details Header */}
            <div className="p-4 border-b border-border/50 bg-background/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded text-white",
                    DIFFICULTIES.find(d => d.value === selectedQuestion.difficulty)?.color
                  )}>
                    {DIFFICULTIES.find(d => d.value === selectedQuestion.difficulty)?.label}
                  </span>
                  <span className="text-xs text-muted-foreground">დონე {selectedQuestion.level_number}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuestion(selectedQuestion.id, { is_active: !selectedQuestion.is_active })}
                  >
                    {selectedQuestion.is_active ? (
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEditQuestion(selectedQuestion)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDeleteTarget({ type: 'question', item: selectedQuestion })}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Question Content */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="max-w-xl mx-auto space-y-6">
                {/* Question Text */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">კითხვა</label>
                  <p className="mt-1 text-sm font-medium leading-relaxed">{selectedQuestion.question_text}</p>
                </div>

                {/* Answers */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">პასუხები</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">✓</span>
                      <span className="text-sm">{selectedQuestion.correct_answer}</span>
                    </div>
                    {selectedQuestion.incorrect_answers.map((ans, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center justify-center font-bold">
                          {String.fromCharCode(66 + i)}
                        </span>
                        <span className="text-sm text-muted-foreground">{ans}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">ვიზუალი</label>
                  <div className="flex justify-center">
                    <QuestionMockupPreview
                      question={selectedQuestion.question_text}
                      correctAnswer={selectedQuestion.correct_answer}
                      incorrectAnswers={selectedQuestion.incorrect_answers}
                      difficulty={selectedQuestion.difficulty}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : selectedCategory ? (
          <>
            {/* Category Details Header */}
            <div className="p-4 border-b border-border/50 bg-background/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedCategory.icon}</span>
                  <div>
                    <h2 className="font-semibold">{selectedCategory.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedCategory.category_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateCategory(selectedCategory.id, { is_active: !selectedCategory.is_active })}
                  >
                    {selectedCategory.is_active ? (
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEditCategory(selectedCategory)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDeleteTarget({ type: 'category', item: selectedCategory })}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Category Content */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="max-w-xl mx-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-card border">
                    <p className="text-xs text-muted-foreground">კითხვები</p>
                    <p className="text-2xl font-bold">{questionCounts[selectedCategory.id] || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-card border">
                    <p className="text-xs text-muted-foreground">დონეები</p>
                    <p className="text-2xl font-bold">{selectedCategory.total_levels}</p>
                  </div>
                </div>

                {selectedCategory.description && (
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">აღწერა</label>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedCategory.description}</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">ვიზუალი</label>
                  <div className="flex justify-center">
                    <CategoryMockupPreview
                      name={selectedCategory.name}
                      icon={selectedCategory.icon}
                      color={selectedCategory.color}
                      description={selectedCategory.description || ''}
                      totalLevels={selectedCategory.total_levels}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ChevronRight className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">აირჩიეთ კატეგორია ან კითხვა</p>
            </div>
          </div>
        )}
      </div>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ID (slug)</Label>
                <Input
                  value={categoryForm.category_id}
                  onChange={(e) => setCategoryForm({ ...categoryForm, category_id: e.target.value })}
                  placeholder="geography"
                  disabled={!!editingCategory}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">სახელი</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="გეოგრაფია"
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">აიკონი</Label>
              <Tabs defaultValue={categoryForm.icon_slug ? "library" : "emoji"} className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="emoji">ემოჯი</TabsTrigger>
                  <TabsTrigger value="library">ბიბლიოთეკა (9K)</TabsTrigger>
                </TabsList>
                <TabsContent value="emoji" className="mt-2">
                  <div className="flex flex-wrap gap-1 p-2 border rounded-lg">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, icon: emoji, icon_slug: '' })}
                        className={cn(
                          "text-lg p-1 rounded hover:bg-muted transition-colors",
                          categoryForm.icon === emoji && !categoryForm.icon_slug && "bg-primary/20 ring-2 ring-primary"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="library" className="mt-2">
                  <IconPicker
                    value={categoryForm.icon_slug}
                    onChange={(slug) => setCategoryForm({ ...categoryForm, icon_slug: slug })}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ფერი</Label>
              <div className="grid grid-cols-6 gap-2">
                {GRADIENT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, color: preset.value })}
                    className={cn(
                      "h-8 rounded-lg bg-gradient-to-r transition-all",
                      preset.value,
                      categoryForm.color === preset.value && "ring-2 ring-primary ring-offset-2"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ტიპი</Label>
                <Select value={categoryForm.type} onValueChange={(v) => setCategoryForm({ ...categoryForm, type: v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">დონეები</Label>
                <Input
                  type="number"
                  value={categoryForm.total_levels}
                  onChange={(e) => setCategoryForm({ ...categoryForm, total_levels: parseInt(e.target.value) || 20 })}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">აღწერა</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="კატეგორიის აღწერა..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(false)}>გაუქმება</Button>
            <Button size="sm" onClick={handleSaveCategory} disabled={saving || !categoryForm.category_id || !categoryForm.name}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editingCategory ? 'შენახვა' : 'დამატება'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'კითხვის რედაქტირება' : 'ახალი კითხვა'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">კატეგორია</Label>
              <Select value={questionForm.category_id} onValueChange={(v) => setQuestionForm({ ...questionForm, category_id: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="აირჩიე" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">კითხვა</Label>
              <Textarea
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                placeholder="შეიყვანეთ კითხვა..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-emerald-600">სწორი პასუხი</Label>
              <Input
                value={questionForm.correct_answer}
                onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                className="h-9 border-emerald-200 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">არასწორი პასუხები</Label>
              <div className="space-y-2">
                {questionForm.incorrect_answers.map((ans, i) => (
                  <Input
                    key={i}
                    value={ans}
                    onChange={(e) => {
                      const newAnswers = [...questionForm.incorrect_answers];
                      newAnswers[i] = e.target.value;
                      setQuestionForm({ ...questionForm, incorrect_answers: newAnswers });
                    }}
                    placeholder={`პასუხი ${i + 1}`}
                    className="h-9"
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker for Question */}
            <div className="space-y-1.5">
              <Label className="text-xs">აიკონი (სურვილისამებრ)</Label>
              <IconPicker
                value={questionForm.icon_slug}
                onChange={(slug) => setQuestionForm({ ...questionForm, icon_slug: slug })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">სირთულე</Label>
                <Select value={questionForm.difficulty} onValueChange={(v) => setQuestionForm({ ...questionForm, difficulty: v as any })}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">დონე</Label>
                <Input
                  type="number"
                  value={questionForm.level_number}
                  onChange={(e) => setQuestionForm({ ...questionForm, level_number: parseInt(e.target.value) || 1 })}
                  min={1}
                  className="h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsQuestionDialogOpen(false)}>გაუქმება</Button>
            <Button size="sm" onClick={handleSaveQuestion} disabled={saving || !questionForm.category_id || !questionForm.question_text || !questionForm.correct_answer}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editingQuestion ? 'შენახვა' : 'დამატება'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>დარწმუნებული ხარ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'category' 
                ? `კატეგორია "${deleteTarget?.item?.name}" წაიშლება სამუდამოდ.`
                : 'კითხვა წაიშლება სამუდამოდ.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}