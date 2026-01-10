import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Link, Loader2 } from 'lucide-react';
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
}

const DIFFICULTIES = [
  { id: 'mixed', label: '🎲 Mixed' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export function GenerationPanel({ categories, languages, selectedLanguage, onQuestionsGenerated, isGenerating, setIsGenerating, knowledgeSources = [] }: Props) {
  const [mode, setMode] = useState<'ai' | 'url'>('ai');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('mixed');
  const [count, setCount] = useState(50);
  const [topic, setTopic] = useState('');
  const [url, setUrl] = useState('');

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
          topic: topic || null,
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

  const handleParseUrl = async () => {
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-quiz-url', {
        body: { url },
      });

      if (error) throw error;

      const questions: GeneratedQuestion[] = (data.questions || []).map((q: any, i: number) => {
        const validation = validateQuestion(q);
        return {
          id: `parsed-${Date.now()}-${i}`,
          questionText: q.question_text || q.questionText,
          correctAnswer: q.correct_answer || q.correctAnswer,
          incorrectAnswers: q.incorrect_answers || q.incorrectAnswers || [],
          categoryId: selectedCategory || categories[0]?.id || '',
          categoryName: categories.find(c => c.id === selectedCategory)?.name || 'Unknown',
          difficulty: q.difficulty || 'medium',
          language: q.language || 'en',
          iconSlug: q.icon_slug,
          status: 'pending' as const,
          ...validation,
        };
      });

      onQuestionsGenerated(questions);
      toast.success(`Parsed ${questions.length} questions from URL`);
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Failed to parse URL');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'ai' | 'url')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-1.5">
            <Link className="h-3.5 w-3.5" />
            URL Parse
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4 mt-4">
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

          {/* Difficulty - Inline Buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Difficulty</Label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff.id}
                  onClick={() => setDifficulty(diff.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    difficulty === diff.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Topic (optional)</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Ancient Rome, Space..."
              className="h-9"
            />
          </div>

          {/* Count */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Questions: {count}
            </Label>
            <Slider
              value={[count]}
              onValueChange={([v]) => setCount(v)}
              min={10}
              max={200}
              step={10}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 50-100 for best quality. Max 200.
            </p>
          </div>

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
          
          {knowledgeSources.length > 0 && (
            <div className="mt-2 px-2 py-1.5 bg-primary/10 rounded-md border border-primary/20">
              <p className="text-xs text-primary font-medium text-center">
                📚 Using {knowledgeSources.length} knowledge source{knowledgeSources.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="url" className="space-y-4 mt-4">
          {/* Category for parsed questions */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Assign to Category</Label>
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

          {/* URL Input */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quiz URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/quiz..."
              className="h-9"
            />
          </div>

          {/* Parse Button */}
          <Button
            onClick={handleParseUrl}
            disabled={isGenerating || !url}
            className="w-full gap-2"
            variant="secondary"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Link className="h-4 w-4" />
                Parse URL
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Supports most quiz websites with structured content
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
