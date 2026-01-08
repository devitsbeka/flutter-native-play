import { useState } from 'react';
import { 
  HelpCircle, 
  Plus, 
  Search,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Filter,
  ImageOff,
  Rocket,
  Archive
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
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
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { useAdminQuestions, AdminQuestion } from '@/hooks/useAdminQuestions';
import { QuestionMockupPreview } from '@/components/admin/QuestionMockupPreview';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { cn } from '@/lib/utils';
import { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } from '@/utils/questionValidation';

const DIFFICULTIES = [
  { value: 'easy', label: 'ადვილი', color: 'bg-emerald-500' },
  { value: 'medium', label: 'საშუალო', color: 'bg-amber-500' },
  { value: 'hard', label: 'რთული', color: 'bg-rose-500' },
];

export default function AdminQuestions() {
  const { categories } = useAdminCategories();
  const { questions, loading, addQuestion, updateQuestion, deleteQuestion } = useAdminQuestions();
  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterMissingIcons, setFilterMissingIcons] = useState(false);
  const [filterProductionStatus, setFilterProductionStatus] = useState<string>('all');
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    category_id: '',
    question_text: '',
    correct_answer: '',
    incorrect_answers: ['', '', ''],
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    level_number: 1,
    is_active: true,
    icon_slug: '' as string,
  });

  const resetForm = () => {
    setFormData({
      category_id: categories[0]?.id || '',
      question_text: '',
      correct_answer: '',
      incorrect_answers: ['', '', ''],
      difficulty: 'medium',
      level_number: 1,
      is_active: true,
      icon_slug: '',
    });
  };

  const openAddDialog = () => {
    resetForm();
    setEditingQuestion(null);
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (question: AdminQuestion) => {
    setFormData({
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
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const questionData = {
        ...formData,
        incorrect_answers: formData.incorrect_answers.filter(a => a.trim() !== ''),
      };
      
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, questionData);
      } else {
        await addQuestion(questionData);
      }
      setIsAddDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteQuestion(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleToggleActive = async (question: AdminQuestion) => {
    await updateQuestion(question.id, { is_active: !question.is_active });
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question_text.toLowerCase().includes(search.toLowerCase()) ||
      q.correct_answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategoryId === 'all' || q.category_id === filterCategoryId;
    const matchesMissingIcon = !filterMissingIcons || !q.icon_slug || q.icon_slug.trim() === '';
    const matchesProductionStatus = filterProductionStatus === 'all' || 
      (filterProductionStatus === 'prod' && q.in_production) ||
      (filterProductionStatus === 'lib' && !q.in_production) ||
      (filterProductionStatus === 'toolong' && q.question_text.length > QUESTION_MAX_LENGTH);
    return matchesSearch && matchesCategory && matchesMissingIcon && matchesProductionStatus;
  });

  const missingIconsCount = questions.filter(q => !q.icon_slug || q.icon_slug.trim() === '').length;
  const inProdCount = questions.filter(q => q.in_production).length;
  const inLibCount = questions.filter(q => !q.in_production).length;
  const tooLongCount = questions.filter(q => q.question_text.length > QUESTION_MAX_LENGTH).length;

  const handleToggleProduction = async (question: AdminQuestion) => {
    // Don't allow pushing to prod if question is too long
    if (!question.in_production && question.question_text.length > QUESTION_MAX_LENGTH) {
      return;
    }
    await updateQuestion(question.id, { in_production: !question.in_production });
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? `${cat.icon} ${cat.name}` : 'უცნობი';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 rounded-xl">
              <HelpCircle className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">კითხვები</h1>
              <p className="text-sm text-muted-foreground">{questions.length} კითხვა</p>
            </div>
          </div>
          <Button size="sm" onClick={openAddDialog} disabled={categories.length === 0}>
            <Plus className="h-4 w-4 mr-1.5" />
            დამატება
          </Button>
        </div>

        {/* Compact Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="ძიება..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="w-48 h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="კატეგორია" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterProductionStatus} onValueChange={setFilterProductionStatus}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="სტატუსი" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა</SelectItem>
              <SelectItem value="prod">
                <span className="flex items-center gap-1.5">
                  <Rocket className="h-3.5 w-3.5 text-emerald-500" />
                  In Prod ({inProdCount})
                </span>
              </SelectItem>
              <SelectItem value="lib">
                <span className="flex items-center gap-1.5">
                  <Archive className="h-3.5 w-3.5 text-amber-500" />
                  In Lib ({inLibCount})
                </span>
              </SelectItem>
              <SelectItem value="toolong">
                <span className="flex items-center gap-1.5">
                  <span className="text-rose-500">⚠️</span>
                  Too Long ({tooLongCount})
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={filterMissingIcons ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setFilterMissingIcons(!filterMissingIcons)}
          >
            <ImageOff className="h-3.5 w-3.5" />
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {missingIconsCount}
            </Badge>
          </Button>
        </div>

        {/* Questions List - Compact Cards */}
        <div className="space-y-2">
          {filteredQuestions.map((question) => (
            <Card 
              key={question.id} 
              className={cn(
                "transition-all hover:shadow-sm",
                !question.is_active && "opacity-50"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Icon Display */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center border border-violet-500/20">
                      {question.icon_slug ? (
                        <DynamicIcon 
                          slug={question.icon_slug.split(',')[0]} 
                          size={32}
                        />
                      ) : (
                        <ImageOff className="w-5 h-5 text-muted-foreground/50" />
                      )}
                    </div>
                    {question.icon_slug && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[48px]">
                        {question.icon_slug.split(',')[0]}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {/* Production Status Badge */}
                      <Badge 
                        className={cn(
                          "text-[10px] px-1.5 py-0 cursor-pointer transition-colors",
                          question.in_production 
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                            : "bg-amber-500 hover:bg-amber-600 text-white",
                          question.question_text.length > QUESTION_MAX_LENGTH && !question.in_production && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => handleToggleProduction(question)}
                        title={question.question_text.length > QUESTION_MAX_LENGTH ? `კითხვა ზედმეტად გრძელია (${question.question_text.length}/${QUESTION_MAX_LENGTH})` : undefined}
                      >
                        {question.in_production ? (
                          <><Rocket className="h-2.5 w-2.5 mr-0.5" /> In Prod</>
                        ) : (
                          <><Archive className="h-2.5 w-2.5 mr-0.5" /> In Lib</>
                        )}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {getCategoryName(question.category_id)}
                      </Badge>
                      <Badge 
                        className={cn(
                          "text-[10px] px-1.5 py-0 text-white",
                          DIFFICULTIES.find(d => d.value === question.difficulty)?.color
                        )}
                      >
                        {DIFFICULTIES.find(d => d.value === question.difficulty)?.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        L{question.level_number}
                      </span>
                      {/* Character count warning */}
                      <span className={cn(
                        "text-[10px]",
                        question.question_text.length > QUESTION_MAX_LENGTH ? "text-rose-500 font-medium" : "text-muted-foreground"
                      )}>
                        {question.question_text.length}/{QUESTION_MAX_LENGTH}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-snug line-clamp-2">
                      {question.question_text}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                        ✓ {question.correct_answer}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleToggleActive(question)}
                    >
                      {question.is_active ? (
                        <ToggleRight className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(question)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDeleteTarget(question)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              {search || filterCategoryId !== 'all' ? 'კითხვები ვერ მოიძებნა' : 'დაამატეთ პირველი კითხვა'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog with Split Layout */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg">
              {editingQuestion ? 'კითხვის რედაქტირება' : 'ახალი კითხვა'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-h-[calc(90vh-140px)] overflow-hidden">
            {/* Form Side */}
            <ScrollArea className="h-[500px] border-r">
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">კატეგორია</Label>
                  <Select 
                    value={formData.category_id} 
                    onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="აირჩიე" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">კითხვა</Label>
                    <span className={cn(
                      "text-xs font-medium",
                      formData.question_text.length > QUESTION_MAX_LENGTH 
                        ? "text-rose-500" 
                        : formData.question_text.length > QUESTION_MAX_LENGTH * 0.8
                          ? "text-amber-500"
                          : "text-muted-foreground"
                    )}>
                      {formData.question_text.length}/{QUESTION_MAX_LENGTH}
                    </span>
                  </div>
                  <Textarea
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    placeholder="შეიყვანეთ კითხვა..."
                    rows={3}
                    className={cn(
                      "resize-none",
                      formData.question_text.length > QUESTION_MAX_LENGTH && "border-rose-500 focus-visible:ring-rose-500"
                    )}
                  />
                  {formData.question_text.length > QUESTION_MAX_LENGTH && (
                    <p className="text-xs text-rose-500">
                      ⚠️ კითხვა ძალიან გრძელია! შეამოკლეთ {formData.question_text.length - QUESTION_MAX_LENGTH} სიმბოლოთი
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-emerald-600">სწორი პასუხი</Label>
                    <span className={cn(
                      "text-xs font-medium",
                      formData.correct_answer.length > ANSWER_MAX_LENGTH 
                        ? "text-rose-500" 
                        : formData.correct_answer.length > ANSWER_MAX_LENGTH * 0.8
                          ? "text-amber-500"
                          : "text-muted-foreground"
                    )}>
                      {formData.correct_answer.length}/{ANSWER_MAX_LENGTH}
                    </span>
                  </div>
                  <Input
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    placeholder="სწორი პასუხი"
                    className={cn(
                      "h-9 border-emerald-200 focus-visible:ring-emerald-500",
                      formData.correct_answer.length > ANSWER_MAX_LENGTH && "border-rose-500 focus-visible:ring-rose-500"
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">არასწორი პასუხები</Label>
                  <div className="space-y-2">
                    {formData.incorrect_answers.map((ans, i) => (
                      <div key={i} className="relative">
                        <Input
                          value={ans}
                          onChange={(e) => {
                            const newAnswers = [...formData.incorrect_answers];
                            newAnswers[i] = e.target.value;
                            setFormData({ ...formData, incorrect_answers: newAnswers });
                          }}
                          placeholder={`პასუხი ${i + 1}`}
                          className={cn(
                            "h-9 pr-14",
                            ans.length > ANSWER_MAX_LENGTH && "border-rose-500 focus-visible:ring-rose-500"
                          )}
                        />
                        <span className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium",
                          ans.length > ANSWER_MAX_LENGTH 
                            ? "text-rose-500" 
                            : ans.length > ANSWER_MAX_LENGTH * 0.8
                              ? "text-amber-500"
                              : "text-muted-foreground"
                        )}>
                          {ans.length}/{ANSWER_MAX_LENGTH}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">სირთულე</Label>
                    <Select 
                      value={formData.difficulty} 
                      onValueChange={(v) => setFormData({ ...formData, difficulty: v as any })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">დონე</Label>
                    <Input
                      type="number"
                      value={formData.level_number}
                      onChange={(e) => setFormData({ ...formData, level_number: parseInt(e.target.value) || 1 })}
                      min={1}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Icon Slug Field */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">აიკონი (slug)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={formData.icon_slug}
                      onChange={(e) => setFormData({ ...formData, icon_slug: e.target.value })}
                      placeholder="მაგ: atom, crown, globe"
                      className="h-9 flex-1"
                    />
                    <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 border border-violet-500/20">
                      {formData.icon_slug ? (
                        <DynamicIcon slug={formData.icon_slug.split(',')[0]} size={28} />
                      ) : (
                        <ImageOff className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Preview Side */}
            <div className="bg-muted/30 flex items-center justify-center p-6">
              <QuestionMockupPreview
                question={formData.question_text}
                correctAnswer={formData.correct_answer}
                incorrectAnswers={formData.incorrect_answers.filter(a => a.trim())}
                difficulty={formData.difficulty}
                iconSlug={formData.icon_slug}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            {/* Show validation warning */}
            {(formData.question_text.length > QUESTION_MAX_LENGTH || 
              formData.correct_answer.length > ANSWER_MAX_LENGTH ||
              formData.incorrect_answers.some(a => a.length > ANSWER_MAX_LENGTH)) && (
              <p className="text-xs text-rose-500 mr-auto">
                ⚠️ შეასწორეთ სიგრძის პრობლემები შენახვამდე
              </p>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(false)}>
              გაუქმება
            </Button>
            <Button 
              size="sm"
              onClick={handleSave} 
              disabled={
                saving || 
                !formData.category_id || 
                !formData.question_text || 
                !formData.correct_answer ||
                formData.question_text.length > QUESTION_MAX_LENGTH ||
                formData.correct_answer.length > ANSWER_MAX_LENGTH ||
                formData.incorrect_answers.some(a => a.length > ANSWER_MAX_LENGTH)
              }
            >
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
              კითხვა წაიშლება სამუდამოდ.
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
    </ScrollArea>
  );
}
