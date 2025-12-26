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
  Filter
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
import { cn } from '@/lib/utils';

const DIFFICULTIES = [
  { value: 'easy', label: 'ადვილი', color: 'bg-green-500' },
  { value: 'medium', label: 'საშუალო', color: 'bg-yellow-500' },
  { value: 'hard', label: 'რთული', color: 'bg-red-500' },
];

export default function AdminQuestions() {
  const { categories } = useAdminCategories();
  const { questions, loading, addQuestion, updateQuestion, deleteQuestion } = useAdminQuestions();
  const [search, setSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminQuestion | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    question_text: '',
    correct_answer: '',
    incorrect_answers: ['', '', ''],
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    level_number: 1,
    is_active: true,
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
    return matchesSearch && matchesCategory;
  });

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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <HelpCircle className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">კითხვები</h1>
              <p className="text-muted-foreground">მართეთ თამაშის კითხვები</p>
            </div>
          </div>
          <Button onClick={openAddDialog} disabled={categories.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            დამატება
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="მოძებნე კითხვა..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="w-64">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="კატეგორია" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა კატეგორია</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {filteredQuestions.map((question) => (
            <Card key={question.id} className={cn(!question.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryName(question.category_id)}
                      </Badge>
                      <Badge 
                        className={cn(
                          "text-xs",
                          DIFFICULTIES.find(d => d.value === question.difficulty)?.color
                        )}
                      >
                        {DIFFICULTIES.find(d => d.value === question.difficulty)?.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        დონე {question.level_number}
                      </span>
                    </div>
                    <p className="font-medium">{question.question_text}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">
                        ✓ {question.correct_answer}
                      </span>
                      {question.incorrect_answers.map((ans, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                          {ans}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(question)}
                    >
                      {question.is_active ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(question)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(question)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {search || filterCategoryId !== 'all' ? 'კითხვები ვერ მოიძებნა' : 'კითხვები არ არის. დაამატეთ პირველი კითხვა!'}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'კითხვის რედაქტირება' : 'ახალი კითხვა'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>კატეგორია</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="აირჩიე კატეგორია" />
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

            <div className="space-y-2">
              <Label>კითხვა</Label>
              <Textarea
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                placeholder="შეიყვანეთ კითხვა..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>სწორი პასუხი</Label>
              <Input
                value={formData.correct_answer}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                placeholder="სწორი პასუხი"
              />
            </div>

            <div className="space-y-2">
              <Label>არასწორი პასუხები</Label>
              {formData.incorrect_answers.map((ans, i) => (
                <Input
                  key={i}
                  value={ans}
                  onChange={(e) => {
                    const newAnswers = [...formData.incorrect_answers];
                    newAnswers[i] = e.target.value;
                    setFormData({ ...formData, incorrect_answers: newAnswers });
                  }}
                  placeholder={`არასწორი პასუხი ${i + 1}`}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>სირთულე</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(v) => setFormData({ ...formData, difficulty: v as any })}
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>დონე</Label>
                <Input
                  type="number"
                  value={formData.level_number}
                  onChange={(e) => setFormData({ ...formData, level_number: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              გაუქმება
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.category_id || !formData.question_text || !formData.correct_answer}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              კითხვა წაიშლება სამუდამოდ. ეს მოქმედება შეუქცევადია.
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
