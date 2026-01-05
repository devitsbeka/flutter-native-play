import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GenerationPanel } from '@/components/admin/flow/GenerationPanel';
import { QuestionPreviewList } from '@/components/admin/flow/QuestionPreviewList';
import { QuestionQueue } from '@/components/admin/flow/QuestionQueue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedQuestion {
  id: string;
  questionText: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  categoryId: string;
  categoryName: string;
  difficulty: string;
  language: string;
  iconSlug?: string;
  suggestedIconSlugs?: string[];
  status: 'pending' | 'approved' | 'rejected';
  isValid: boolean;
  warnings: string[];
  isDuplicate?: boolean;
}

export interface Category {
  id: string;
  name: string;
  category_id: string;
}

const LANGUAGES = [
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'pt-br', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'nb', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sr-latn', name: 'Serbian', flag: '🇷🇸' },
];

export { LANGUAGES };

export default function Flow() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [stats, setStats] = useState({ inLib: 0, inProd: 0 });
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const pendingQuestions = generatedQuestions.filter(q => q.status === 'pending');
      const focusedQuestion = pendingQuestions.find(q => q.id === focusedQuestionId);
      const currentIndex = pendingQuestions.findIndex(q => q.id === focusedQuestionId);

      switch (e.key) {
        case 'Enter':
          if (focusedQuestion) {
            e.preventDefault();
            handleApprove(focusedQuestion.id);
            // Move focus to next
            if (currentIndex < pendingQuestions.length - 1) {
              setFocusedQuestionId(pendingQuestions[currentIndex + 1].id);
            }
          }
          break;
        case 'Backspace':
        case 'Delete':
          if (focusedQuestion) {
            e.preventDefault();
            handleReject(focusedQuestion.id);
            // Move focus to next
            if (currentIndex < pendingQuestions.length - 1) {
              setFocusedQuestionId(pendingQuestions[currentIndex + 1].id);
            } else if (currentIndex > 0) {
              setFocusedQuestionId(pendingQuestions[currentIndex - 1].id);
            }
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (pendingQuestions.length === 0) return;
          
          if (e.shiftKey) {
            // Previous question
            if (currentIndex > 0) {
              setFocusedQuestionId(pendingQuestions[currentIndex - 1].id);
            } else {
              setFocusedQuestionId(pendingQuestions[pendingQuestions.length - 1].id);
            }
          } else {
            // Next question
            if (currentIndex < pendingQuestions.length - 1) {
              setFocusedQuestionId(pendingQuestions[currentIndex + 1].id);
            } else {
              setFocusedQuestionId(pendingQuestions[0].id);
            }
          }
          break;
        case 'Escape':
          setFocusedQuestionId(null);
          setSelectedPreviewId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generatedQuestions, focusedQuestionId]);

  // Set first pending question as focused when questions are generated
  useEffect(() => {
    if (!focusedQuestionId) {
      const firstPending = generatedQuestions.find(q => q.status === 'pending');
      if (firstPending) {
        setFocusedQuestionId(firstPending.id);
      }
    }
  }, [generatedQuestions.length]);

  // Update selected preview when focus changes
  useEffect(() => {
    if (focusedQuestionId) {
      setSelectedPreviewId(focusedQuestionId);
    }
  }, [focusedQuestionId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, category_id')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    setCategories(data || []);
  };

  const fetchStats = async () => {
    const { count: libCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('in_production', false);
    
    const { count: prodCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('in_production', true);
    
    setStats({ inLib: libCount || 0, inProd: prodCount || 0 });
  };

  // Check for duplicate questions in the database
  const checkDuplicates = useCallback(async (questions: GeneratedQuestion[]): Promise<GeneratedQuestion[]> => {
    if (questions.length === 0) return questions;
    
    setIsCheckingDuplicates(true);
    try {
      const questionTexts = questions.map(q => q.questionText);
      
      const { data: existing, error } = await supabase
        .from('questions')
        .select('question_text')
        .in('question_text', questionTexts);
      
      if (error) {
        console.error('Error checking duplicates:', error);
        return questions;
      }

      const duplicateTexts = new Set(existing?.map(e => e.question_text) || []);
      
      return questions.map(q => ({
        ...q,
        isDuplicate: duplicateTexts.has(q.questionText),
        warnings: duplicateTexts.has(q.questionText) 
          ? [...q.warnings, 'Already exists in database']
          : q.warnings,
        isValid: !duplicateTexts.has(q.questionText) && q.isValid,
      }));
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, []);

  const handleQuestionsGenerated = useCallback(async (questions: GeneratedQuestion[]) => {
    // Check for duplicates before adding to the list
    const checkedQuestions = await checkDuplicates(questions);
    setGeneratedQuestions(prev => [...checkedQuestions, ...prev]);
    
    const duplicateCount = checkedQuestions.filter(q => q.isDuplicate).length;
    if (duplicateCount > 0) {
      toast.info(`${duplicateCount} duplicate question(s) found`);
    }
    
    // Focus first new question
    if (checkedQuestions.length > 0) {
      setFocusedQuestionId(checkedQuestions[0].id);
    }
  }, [checkDuplicates]);

  const handleApprove = useCallback((id: string) => {
    setGeneratedQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, status: 'approved' as const } : q)
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    setGeneratedQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, status: 'rejected' as const } : q)
    );
  }, []);

  const handleBulkApprove = (ids: string[]) => {
    setGeneratedQuestions(prev =>
      prev.map(q => ids.includes(q.id) ? { ...q, status: 'approved' as const } : q)
    );
  };

  const handleBulkReject = (ids: string[]) => {
    setGeneratedQuestions(prev =>
      prev.map(q => ids.includes(q.id) ? { ...q, status: 'rejected' as const } : q)
    );
  };

  const handleUpdateQuestion = useCallback((id: string, updates: Partial<GeneratedQuestion>) => {
    setGeneratedQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  }, []);

  const handleTranslateAll = async () => {
    const approved = generatedQuestions.filter(q => q.status === 'approved' && q.isValid && !q.isDuplicate);
    if (approved.length === 0) {
      toast.error('No approved questions to translate');
      return;
    }

    setIsTranslating(true);
    try {
      const sourceLanguage = approved[0].language;
      
      const { data, error } = await supabase.functions.invoke('translate-questions', {
        body: {
          questions: approved.map(q => ({
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            incorrectAnswers: q.incorrectAnswers,
            difficulty: q.difficulty,
            categoryId: q.categoryId,
            categoryName: q.categoryName,
            iconSlug: q.iconSlug,
          })),
          sourceLanguage,
          targetLanguages: LANGUAGES.map(l => l.code),
        },
      });

      if (error) throw error;

      const translations = data.translations || [];
      const newQuestions: GeneratedQuestion[] = translations.map((t: any, i: number) => ({
        id: `trans-${Date.now()}-${i}`,
        ...t,
        status: 'pending' as const,
        isValid: true,
        warnings: [],
      }));

      // Check duplicates for translations
      const checkedTranslations = await checkDuplicates(newQuestions);
      setGeneratedQuestions(prev => [...checkedTranslations, ...prev]);
      
      toast.success(`Created ${checkedTranslations.length} translations in ${data.languages} languages`);
    } catch (err) {
      console.error('Translation error:', err);
      toast.error('Failed to translate questions');
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePublishToLib = async () => {
    const approved = generatedQuestions.filter(q => q.status === 'approved' && q.isValid && !q.isDuplicate);
    if (approved.length === 0) {
      toast.error('No approved questions to publish');
      return;
    }

    const questionsToInsert = approved.map(q => ({
      question_text: q.questionText,
      correct_answer: q.correctAnswer,
      incorrect_answers: q.incorrectAnswers,
      category_id: q.categoryId,
      difficulty: q.difficulty,
      icon_slug: q.iconSlug,
      in_production: false,
      is_active: true,
    }));

    const { error } = await supabase.from('questions').insert(questionsToInsert);
    
    if (error) {
      console.error('Error publishing questions:', error);
      toast.error('Failed to publish questions');
      return;
    }

    toast.success(`Published ${approved.length} questions to Library`);
    setGeneratedQuestions(prev => prev.filter(q => q.status !== 'approved'));
    fetchStats();
  };

  const handlePublishToProd = async () => {
    const approved = generatedQuestions.filter(q => q.status === 'approved' && q.isValid && !q.isDuplicate);
    if (approved.length === 0) {
      toast.error('No approved questions to publish');
      return;
    }

    const questionsToInsert = approved.map(q => ({
      question_text: q.questionText,
      correct_answer: q.correctAnswer,
      incorrect_answers: q.incorrectAnswers,
      category_id: q.categoryId,
      difficulty: q.difficulty,
      icon_slug: q.iconSlug,
      in_production: true,
      is_active: true,
    }));

    const { error } = await supabase.from('questions').insert(questionsToInsert);
    
    if (error) {
      console.error('Error publishing questions:', error);
      toast.error('Failed to publish questions');
      return;
    }

    toast.success(`Published ${approved.length} questions to Production`);
    setGeneratedQuestions(prev => prev.filter(q => q.status !== 'approved'));
    fetchStats();
  };

  const handleClearRejected = () => {
    setGeneratedQuestions(prev => prev.filter(q => q.status !== 'rejected'));
  };

  const pendingCount = generatedQuestions.filter(q => q.status === 'pending').length;
  const approvedCount = generatedQuestions.filter(q => q.status === 'approved').length;
  const rejectedCount = generatedQuestions.filter(q => q.status === 'rejected').length;

  const selectedQuestion = generatedQuestions.find(q => q.id === selectedPreviewId);

  return (
    <div className="h-full flex flex-col" ref={containerRef}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/30">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            Flow - Question Factory
          </h1>
          {(isCheckingDuplicates || isTranslating) && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              {isTranslating ? 'Translating...' : 'Checking duplicates...'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-muted-foreground">
            Generate, review, and publish questions in 20 languages
          </p>
          <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
            <kbd className="font-mono">Enter</kbd> Approve • <kbd className="font-mono">⌫</kbd> Reject • <kbd className="font-mono">Tab</kbd> Navigate
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Generation Panel */}
        <div className="w-80 border-r border-border/50 flex flex-col bg-card/20">
          <ScrollArea className="flex-1">
            <GenerationPanel
              categories={categories}
              languages={LANGUAGES}
              onQuestionsGenerated={handleQuestionsGenerated}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          </ScrollArea>
        </div>

        {/* Middle: Preview & Review */}
        <div className="flex-1 flex flex-col bg-background/50">
          <QuestionPreviewList
            questions={generatedQuestions}
            categories={categories}
            onApprove={handleApprove}
            onReject={handleReject}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onUpdateQuestion={handleUpdateQuestion}
            languages={LANGUAGES}
            focusedQuestionId={focusedQuestionId}
            onFocusChange={setFocusedQuestionId}
          />
        </div>

        {/* Right: Queue */}
        <div className="w-80 border-l border-border/50 bg-card/20 flex flex-col">
          <QuestionQueue
            pendingCount={pendingCount}
            approvedCount={approvedCount}
            rejectedCount={rejectedCount}
            inLibCount={stats.inLib}
            inProdCount={stats.inProd}
            onPublishToLib={handlePublishToLib}
            onPublishToProd={handlePublishToProd}
            onClearRejected={handleClearRejected}
            onTranslateAll={handleTranslateAll}
            isTranslating={isTranslating}
            selectedQuestion={selectedQuestion}
            onUpdateQuestion={handleUpdateQuestion}
          />
        </div>
      </div>
    </div>
  );
}
