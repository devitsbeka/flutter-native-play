import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { QuestionType, CategoryWithCounts } from '@/hooks/useQuestionStudio';
import { StepCategorySelect } from './bulk/StepCategorySelect';
import { StepTopicValidation, ResolvedTopic } from './bulk/StepTopicValidation';
import { StepProcessing, GeneratedQuestion } from './bulk/StepProcessing';
import { StepReview } from './bulk/StepReview';
import { PRESET_CATEGORIES } from './bulk/PresetCategories';

type Step = 'select' | 'validate' | 'process' | 'review';

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
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [customKeywords, setCustomKeywords] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('image');
  const [validatedTopics, setValidatedTopics] = useState<ResolvedTopic[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [importing, setImporting] = useState(false);

  const resetState = () => {
    setStep('select');
    setSelectedPresets([]);
    setCustomKeywords('');
    setQuestionType('image');
    setValidatedTopics([]);
    setGeneratedQuestions([]);
    setImporting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  // Collect all keywords from presets + custom
  const getAllKeywords = (): string[] => {
    const keywords: string[] = [];
    
    selectedPresets.forEach(presetId => {
      const preset = PRESET_CATEGORIES.find(c => c.id === presetId);
      if (preset) {
        keywords.push(...preset.keywords);
      }
    });

    if (customKeywords.trim()) {
      const custom = customKeywords.split(',').map(k => k.trim()).filter(Boolean);
      keywords.push(...custom);
    }

    // Remove duplicates
    return [...new Set(keywords)];
  };

  const handleStepSelectNext = () => {
    setStep('validate');
  };

  const handleValidationNext = (topics: ResolvedTopic[]) => {
    setValidatedTopics(topics);
    setStep('process');
  };

  const handleProcessingComplete = (questions: GeneratedQuestion[]) => {
    setGeneratedQuestions(questions);
    setStep('review');
  };

  const handleImport = async (questions: GeneratedQuestion[], categoryId: string) => {
    setImporting(true);
    
    const formattedQuestions = questions.map(q => ({
      category_id: categoryId,
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
              {step === 'select' && 'ნაბიჯი 1/4'}
              {step === 'validate' && 'ნაბიჯი 2/4'}
              {step === 'process' && 'ნაბიჯი 3/4'}
              {step === 'review' && 'ნაბიჯი 4/4'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 'select' && (
            <StepCategorySelect
              selectedPresets={selectedPresets}
              onPresetsChange={setSelectedPresets}
              customKeywords={customKeywords}
              onCustomKeywordsChange={setCustomKeywords}
              questionType={questionType}
              onQuestionTypeChange={setQuestionType}
              onNext={handleStepSelectNext}
            />
          )}

          {step === 'validate' && (
            <StepTopicValidation
              keywords={getAllKeywords()}
              onBack={() => setStep('select')}
              onNext={handleValidationNext}
            />
          )}

          {step === 'process' && (
            <StepProcessing
              topics={validatedTopics}
              questionType={questionType}
              onBack={() => setStep('validate')}
              onComplete={handleProcessingComplete}
            />
          )}

          {step === 'review' && (
            <StepReview
              questions={generatedQuestions}
              categories={categories}
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
