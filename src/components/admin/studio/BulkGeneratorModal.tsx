import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from "@/lib/toast";
import { CategoryWithCounts } from '@/hooks/useQuestionStudio';
import { StepCategorySelect } from './bulk/StepCategorySelect';
import { StepProcessing, GeneratedQuestion } from './bulk/StepProcessing';
import { StepReview } from './bulk/StepReview';
import { detectThemeFromCategoryName, ThemeType } from './bulk/PresetCategories';

type Step = 'select' | 'process' | 'review';
type SimpleQuestionType = 'text' | 'image';

interface BulkGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWithCounts[];
  onImport: (questions: Array<{
    category_id: string;
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    image_url?: string;
    video_url?: string;
    audio_url?: string;
  }>) => Promise<boolean>;
}

export function BulkGeneratorModal({ open, onOpenChange, categories, onImport }: BulkGeneratorModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [questionType, setQuestionType] = useState<SimpleQuestionType>('image');
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [importing, setImporting] = useState(false);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const themeType: ThemeType = selectedCategory 
    ? detectThemeFromCategoryName(selectedCategory.name) 
    : 'generic';

  const resetState = () => {
    setStep('select');
    setSelectedCategoryId('');
    setSubjects([]);
    setQuestionType('image');
    setGeneratedQuestions([]);
    setImporting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleStepSelectNext = () => {
    setStep('process');
  };

  const handleProcessingComplete = (questions: GeneratedQuestion[]) => {
    setGeneratedQuestions(questions);
    setStep('review');
  };

  const handleImport = async (questions: GeneratedQuestion[]) => {
    setImporting(true);
    
    const formattedQuestions = questions.map(q => ({
      category_id: selectedCategoryId,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers,
      difficulty: q.difficulty,
      image_url: q.image_url,
      video_url: q.video_url,
      audio_url: q.audio_url,
    }));

    const success = await onImport(formattedQuestions);
    
    if (success) {
      toast.success(`${questions.length} კითხვა დაემატა ბიბლიოთეკას`);
      handleOpenChange(false);
    }
    
    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Bulk Generator
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {step === 'select' && 'ნაბიჯი 1/3'}
              {step === 'process' && 'ნაბიჯი 2/3'}
              {step === 'review' && 'ნაბიჯი 3/3'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 'select' && (
            <StepCategorySelect
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
              subjects={subjects}
              onSubjectsChange={setSubjects}
              questionType={questionType}
              onQuestionTypeChange={setQuestionType}
              onNext={handleStepSelectNext}
            />
          )}

          {step === 'process' && (
            <StepProcessing
              subjects={subjects}
              questionType={questionType}
              themeType={themeType}
              onBack={() => setStep('select')}
              onComplete={handleProcessingComplete}
            />
          )}

          {step === 'review' && (
            <StepReview
              questions={generatedQuestions}
              categoryName={selectedCategory?.name || ''}
              onBack={() => setStep('process')}
              onImport={handleImport}
              importing={importing}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
