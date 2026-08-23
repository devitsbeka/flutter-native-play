import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/lib/toast";
import { GeneratedQuestion, Category } from '@/pages/admin/Flow';
import { hasAnswerInQuestion } from '@/utils/questionValidation';
import { QUALITY_CONSTANTS } from '@/constants/questionQuality';
import { cn } from '@/lib/utils';
import type { KnowledgeSource } from './KnowledgeSourcesList';

const { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH, MAX_ANSWER_LENGTH_DIFF } = QUALITY_CONSTANTS;

interface Props {
  categories: Category[];
  languages: { code: string; name: string; flag: string }[];
  selectedLanguage: string;
  onQuestionsGenerated: (questions: GeneratedQuestion[]) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  knowledgeSources?: KnowledgeSource[];
  onKnowledgeSourcesChange?: (sources: KnowledgeSource[]) => void;
  knowledgeSourcesComponent?: React.ReactNode;
}

const DIFFICULTIES = ['mixed', 'easy', 'medium', 'hard'];
const DIFFICULTY_LABELS: Record<string, string> = {
  mixed: '🎲 Mixed',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function GenerationPanel({ categories, languages, selectedLanguage, onQuestionsGenerated, isGenerating, setIsGenerating, knowledgeSources = [], knowledgeSourcesComponent }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [difficultyIndex, setDifficultyIndex] = useState<number>(0); // 0=mixed, 1=easy, 2=medium, 3=hard
  const [count, setCount] = useState(50);

  const difficulty = DIFFICULTIES[difficultyIndex];

  const validateQuestion = (q: any): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    const questionText = q.questionText || q.question_text || '';
    const correctAnswer = q.correctAnswer || q.correct_answer || '';
    const incorrectAnswers = q.incorrectAnswers || q.incorrect_answers || [];
    
    // Length validations
    if (questionText.length > QUESTION_MAX_LENGTH) {
      warnings.push(`Question too long: ${questionText.length}/${QUESTION_MAX_LENGTH}`);
    }
    if (correctAnswer.length > ANSWER_MAX_LENGTH) {
      warnings.push(`Correct answer too long: ${correctAnswer.length}/${ANSWER_MAX_LENGTH}`);
    }
    incorrectAnswers.forEach((a: string, i: number) => {
      if (a && a.length > ANSWER_MAX_LENGTH) {
        warnings.push(`Answer ${i + 1} too long: ${a.length}/${ANSWER_MAX_LENGTH}`);
      }
    });

    // Check if answer appears in question (critical quality issue)
    if (hasAnswerInQuestion(questionText, correctAnswer)) {
      warnings.push('Question reveals the answer');
    }

    // Check answer length parity (anti-cheating)
    if (correctAnswer && incorrectAnswers.length === 3) {
      const allAnswers = [correctAnswer, ...incorrectAnswers];
      const lengths = allAnswers.map(a => (a || '').length);
      const maxDiff = Math.max(...lengths) - Math.min(...lengths);
      if (maxDiff > MAX_ANSWER_LENGTH_DIFF) {
        warnings.push('Answer lengths vary too much (easy to guess)');
      }
    }

    return { isValid: warnings.length === 0, warnings };
  };

  const handleGenerate = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return;

    // Warn for large batches
    if (count > 50) {
      toast.warning('Large batches may take longer. Consider 50 or fewer for faster results.');
    }

    setIsGenerating(true);
    const startTime = Date.now();
    
    try {
      // Prepare knowledge sources for API
      const knowledgeContext = knowledgeSources.length > 0 
        ? knowledgeSources.map(s => ({
            url: s.url,
            title: s.title,
            content: s.contentSummary,
          }))
        : null;

      const { data, error } = await supabase.functions.invoke('generate-multilang-trivia', {
        body: {
          categoryId: selectedCategory,
          categoryName: category.name,
          language: selectedLanguage,
          difficulty: difficulty === 'mixed' ? null : difficulty,
          count,
          topic: null,
          knowledgeSources: knowledgeContext,
        },
      });

      if (error) {
        // Check for timeout-like errors
        const errorMsg = error.message || '';
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('network') || errorMsg.includes('timeout')) {
          throw new Error('Generation timed out. Try generating 50 or fewer questions.');
        }
        throw error;
      }

      const questions: GeneratedQuestion[] = (data.questions || []).map((q: any, i: number) => {
        const validation = validateQuestion(q);
        return {
          id: `gen-${Date.now()}-${i}`,
          questionText: q.questionText || q.question_text,
          correctAnswer: q.correctAnswer || q.correct_answer,
          incorrectAnswers: q.incorrectAnswers || q.incorrect_answers || [],
          categoryId: selectedCategory,
          categoryName: category.name,
          difficulty: q.difficulty || difficulty,
          language: selectedLanguage,
          iconSlug: q.iconSlug || q.icon_slug,
          status: 'pending' as const,
          ...validation,
        };
      });

      onQuestionsGenerated(questions);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      toast.success(`Generated ${questions.length} questions in ${elapsed}s`);
    } catch (err) {
      console.error('Generation error:', err);
      const elapsed = (Date.now() - startTime) / 1000;
      const errorMessage = (err as Error).message || 'Failed to generate questions';
      
      // Check if it's likely a timeout
      if (elapsed > 55 || errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        toast.error(`Request timed out after ${Math.round(elapsed)}s. Try generating 50 or fewer questions.`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    // Cap at 100 instead of 300 to prevent timeouts
    setCount(Math.min(100, Math.max(0, value)));
  };

  return (
    <div className="p-4">
      {/* Horizontal Layout - Responsive Flex */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Language Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/30 h-9">
          <span className="text-lg leading-none">
            {languages.find(l => l.code === selectedLanguage)?.flag || '🌐'}
          </span>
          <span className="text-sm font-medium whitespace-nowrap">
            {languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage.toUpperCase()}
          </span>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty - Compact Slider */}
        <div className="flex flex-col gap-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Difficulty</Label>
          <div className="flex items-center gap-2 h-9">
            <Slider
              value={[difficultyIndex]}
              onValueChange={([v]) => setDifficultyIndex(v)}
              min={0}
              max={3}
              step={1}
              className="flex-1"
            />
            <span
              className={cn(
                "text-xs font-medium px-2 py-1 rounded bg-muted whitespace-nowrap min-w-[70px] text-center",
                difficultyIndex === 0 && "text-primary"
              )}
            >
              {DIFFICULTY_LABELS[difficulty]}
            </span>
          </div>
        </div>

        {/* Questions Count */}
        <div className="flex flex-col gap-1 w-20">
          <Label className="text-xs text-muted-foreground">Count</Label>
          <Input
            type="number"
            value={count}
            onChange={handleCountChange}
            min={0}
            max={100}
            className="h-9 text-center"
          />
        </div>

        {/* Knowledge Sources - Compact Inline */}
        <div className="flex-shrink-0">
          {knowledgeSourcesComponent}
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedCategory}
          className="gap-2 h-9 px-6"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate {count}
            </>
          )}
        </Button>
      </div>

      {/* Limits hint */}
      <p className="text-xs text-muted-foreground mt-2">
        Max {QUESTION_MAX_LENGTH} chars for questions, {ANSWER_MAX_LENGTH} for answers
      </p>
    </div>
  );
}
