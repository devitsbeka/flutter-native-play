import { useState } from 'react';
import { Plus, Link2, Sparkles, Scissors } from 'lucide-react';
import { useQuestionStudio, StudioQuestion } from '@/hooks/useQuestionStudio';
import { StudioTabs } from '@/components/admin/studio/StudioTabs';
import { CategorySidebar } from '@/components/admin/studio/CategorySidebar';
import { QuestionList } from '@/components/admin/studio/QuestionList';
import { QuestionPreviewPanel } from '@/components/admin/studio/QuestionPreviewPanel';
import { BulkActionsBar } from '@/components/admin/studio/BulkActionsBar';
import { CreateQuestionModal, NewQuestionData } from '@/components/admin/studio/CreateQuestionModal';
import { URLImportTool } from '@/components/admin/studio/URLImportTool';
import { BulkGeneratorModal } from '@/components/admin/studio/BulkGeneratorModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function QuestionStudio() {
  const studio = useQuestionStudio();
  
  // Edit modal state
  const [editingQuestion, setEditingQuestion] = useState<StudioQuestion | null>(null);
  const [editForm, setEditForm] = useState({
    question_text: '',
    correct_answer: '',
    incorrect_answers: ['', '', ''],
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  });
  
  // Delete confirmation state
  const [deleteQuestion, setDeleteQuestion] = useState<StudioQuestion | null>(null);

  // Create/Import modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showURLImport, setShowURLImport] = useState(false);
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);

  // Open edit modal
  const handleEdit = (question: StudioQuestion) => {
    setEditForm({
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      incorrect_answers: [
        question.incorrect_answers[0] || '',
        question.incorrect_answers[1] || '',
        question.incorrect_answers[2] || '',
      ],
      difficulty: question.difficulty,
    });
    setEditingQuestion(question);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    
    const success = await studio.updateQuestion(editingQuestion.id, {
      question_text: editForm.question_text,
      correct_answer: editForm.correct_answer,
      incorrect_answers: editForm.incorrect_answers.filter(a => a.trim()),
      difficulty: editForm.difficulty,
    });
    
    if (success) {
      setEditingQuestion(null);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteQuestion) return;
    await studio.deleteQuestion(deleteQuestion.id);
    setDeleteQuestion(null);
  };

  // Toggle production status
  const handleToggleProduction = async (question: StudioQuestion) => {
    await studio.updateQuestion(question.id, {
      in_production: !question.in_production,
    });
  };

  // Bulk operations
  const selectedArray = Array.from(studio.selectedIds);

  // Handle create question
  const handleCreateQuestion = async (data: NewQuestionData): Promise<boolean> => {
    return await studio.addQuestion({
      category_id: data.category_id,
      question_text: data.question_text,
      correct_answer: data.correct_answer,
      incorrect_answers: data.incorrect_answers,
      difficulty: data.difficulty,
      in_production: false,
      icon_slug: data.icon_slug,
      image_url: data.image_url,
      video_url: data.video_url,
      audio_url: data.audio_url,
    });
  };

  // Handle URL import
  const handleURLImport = async (questions: Array<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    image_url?: string;
    video_url?: string;
    audio_url?: string;
  }>) => {
    // Get currently selected category or first category
    const categoryId = studio.selectedCategoryId || studio.allCategories[0]?.id;
    if (!categoryId) return;

    await studio.bulkAddQuestions(
      questions.map(q => ({
        ...q,
        category_id: categoryId,
      }))
    );
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.14))] flex flex-col -m-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div>
          <h1 className="text-lg font-semibold">Question Studio</h1>
          <p className="text-sm text-muted-foreground">
            Manage and preview all questions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            ახალი კითხვა
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowURLImport(true)}>
            <Link2 className="h-4 w-4 mr-1" />
            URL იმპორტი
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowBulkGenerator(true)}>
            <Sparkles className="h-4 w-4 mr-1" />
            Bulk Generator
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => studio.bulkShortenAnswers()}
            disabled={!!studio.shortenProgress}
          >
            <Scissors className="h-4 w-4 mr-1" />
            {studio.shortenProgress
              ? `${studio.shortenProgress.processed}/${studio.shortenProgress.total}...`
              : 'შემოკლება'}
          </Button>
          <StudioTabs
            activeTab={studio.productionStatus}
            onTabChange={(tab) => {
              studio.setProductionStatus(tab);
              studio.clearSelection();
            }}
            libraryCount={studio.libraryCounts}
            productionCount={studio.productionCounts}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-56 shrink-0">
          <CategorySidebar
            categories={studio.categories}
            selectedCategoryId={studio.selectedCategoryId}
            onSelectCategory={studio.setSelectedCategoryId}
            searchValue={studio.categorySearch}
            onSearchChange={studio.setCategorySearch}
            productionStatus={studio.productionStatus}
            loading={studio.loadingCategories}
          />
        </div>

        {/* Questions List */}
        <div className="w-96 shrink-0">
          <QuestionList
            questions={studio.questions}
            selectedIds={studio.selectedIds}
            onToggleSelection={studio.toggleSelection}
            onSelectAll={studio.selectAll}
            onClearSelection={studio.clearSelection}
            previewIndex={studio.previewIndex}
            onPreviewChange={studio.setPreviewIndex}
            searchValue={studio.questionSearch}
            onSearchChange={studio.setQuestionSearch}
            filters={studio.filters}
            onFiltersChange={studio.setFilters}
            language={studio.language}
            onLanguageChange={studio.setLanguage}
            page={studio.page}
            pageSize={studio.pageSize}
            totalCount={studio.totalCount}
            onPageChange={studio.setPage}
            loading={studio.loadingQuestions}
            shortenedIds={studio.shortenedIds}
          />
        </div>

        {/* Preview Panel */}
        <div className="flex-1 min-w-0 bg-muted/30">
          <QuestionPreviewPanel
            question={studio.previewQuestion}
            questionIndex={studio.previewIndex}
            totalQuestions={studio.questions.length}
            productionStatus={studio.productionStatus}
            onPrevious={() => studio.setPreviewIndex(Math.max(0, studio.previewIndex - 1))}
            onNext={() => studio.setPreviewIndex(Math.min(studio.questions.length - 1, studio.previewIndex + 1))}
            onEdit={handleEdit}
            onDuplicate={studio.duplicateQuestion}
            onDelete={setDeleteQuestion}
            onToggleProduction={handleToggleProduction}
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={studio.selectedIds.size}
        productionStatus={studio.productionStatus}
        onPushToProduction={() => studio.bulkPushToProduction(selectedArray)}
        onRemoveFromProduction={() => studio.bulkRemoveFromProduction(selectedArray)}
        onDelete={() => studio.bulkDelete(selectedArray)}
        onChangeDifficulty={(d) => studio.bulkChangeDifficulty(selectedArray, d)}
        onShortenAnswers={() => {
          console.log('[SHORTEN-CLICK] selectedArray:', selectedArray);
          studio.bulkShortenAnswers(selectedArray);
        }}
        shortenDisabled={!!studio.shortenProgress}
        onClearSelection={studio.clearSelection}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>კითხვის რედაქტირება</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>კითხვა</Label>
              <Textarea
                value={editForm.question_text}
                onChange={(e) => setEditForm(f => ({ ...f, question_text: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>სწორი პასუხი</Label>
              <Input
                value={editForm.correct_answer}
                onChange={(e) => setEditForm(f => ({ ...f, correct_answer: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>არასწორი პასუხები</Label>
              {editForm.incorrect_answers.map((ans, i) => (
                <Input
                  key={i}
                  value={ans}
                  onChange={(e) => {
                    const newAnswers = [...editForm.incorrect_answers];
                    newAnswers[i] = e.target.value;
                    setEditForm(f => ({ ...f, incorrect_answers: newAnswers }));
                  }}
                  placeholder={`პასუხი ${i + 1}`}
                />
              ))}
            </div>
            
            <div className="space-y-2">
              <Label>სირთულე</Label>
              <Select
                value={editForm.difficulty}
                onValueChange={(v) => setEditForm(f => ({ ...f, difficulty: v as 'easy' | 'medium' | 'hard' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">მარტივი</SelectItem>
                  <SelectItem value="medium">საშუალო</SelectItem>
                  <SelectItem value="hard">რთული</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              გაუქმება
            </Button>
            <Button onClick={handleSaveEdit}>შენახვა</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteQuestion} onOpenChange={() => setDeleteQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>დარწმუნებული ხართ?</AlertDialogTitle>
            <AlertDialogDescription>
              კითხვა სამუდამოდ წაიშლება. ეს მოქმედება შეუქცევადია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Question Modal */}
      <CreateQuestionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        categories={studio.allCategories}
        onSubmit={handleCreateQuestion}
      />

      {/* URL Import Tool */}
      <URLImportTool
        open={showURLImport}
        onOpenChange={setShowURLImport}
        categories={studio.allCategories}
        onImport={handleURLImport}
      />

      {/* Bulk Generator */}
      <BulkGeneratorModal
        open={showBulkGenerator}
        onOpenChange={setShowBulkGenerator}
        categories={studio.allCategories}
        onImport={studio.bulkAddQuestions}
      />
    </div>
  );
}
