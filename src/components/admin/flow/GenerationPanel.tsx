import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

    setIsGenerating(true);
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

      if (error) throw error;

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
      toast.success(`Generated ${questions.length} questions`);
    } catch (err) {
      console.error('Generation error:', err);
      toast.error('Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setCount(Math.min(300, Math.max(0, value)));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Selected Language Display */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/30">
        <span className="text-xl">
          {languages.find(l => l.code === selectedLanguage)?.flag || '🌐'}
        </span>
        <span className="text-sm font-medium">
          Generating in {languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage.toUpperCase()}
        </span>
      </div>

      {/* Category */}
      <div className="space-y-2">
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

      {/* Difficulty - Slider with 4 points */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Difficulty</Label>
        <div className="px-1">
          <Slider
            value={[difficultyIndex]}
            onValueChange={([v]) => setDifficultyIndex(v)}
            min={0}
            max={3}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between mt-1">
            {DIFFICULTIES.map((diff, idx) => (
              <span
                key={diff}
                onClick={() => setDifficultyIndex(idx)}
                className={cn(
                  "text-xs cursor-pointer transition-colors",
                  difficultyIndex === idx
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {DIFFICULTY_LABELS[diff]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Questions Count - Number Input */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Number of Questions
        </Label>
        <Input
          type="number"
          value={count}
          onChange={handleCountChange}
          min={0}
          max={300}
          className="h-9"
        />
        <p className="text-xs text-muted-foreground">
          Recommended: 50-100 for best quality. Max 300.
        </p>
      </div>

      {/* Knowledge Sources Component - Before Generate Button */}
      {knowledgeSourcesComponent}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !selectedCategory}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate {count} Questions
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Max {QUESTION_MAX_LENGTH} chars for questions, {ANSWER_MAX_LENGTH} for answers
      </p>
    </div>
  );
}
