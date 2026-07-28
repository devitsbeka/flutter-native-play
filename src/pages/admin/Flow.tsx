import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GenerationPanel } from '@/components/admin/flow/GenerationPanel';
import { QuestionPreviewList } from '@/components/admin/flow/QuestionPreviewList';
import { QuestionQueue } from '@/components/admin/flow/QuestionQueue';
import { KnowledgeSourcesList, KnowledgeSource } from '@/components/admin/flow/KnowledgeSourcesList';
import { LanguageQuestionBrowser } from '@/components/admin/flow/LanguageQuestionBrowser';
import { AutoGenerationPanel, JobQuestionReview } from '@/components/admin/auto-generation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateSimilarity, removeDuplicatesFromBatch } from '@/utils/duplicateDetection';
import { QUALITY_CONSTANTS } from '@/constants/questionQuality';
import { usePersistedState } from '@/hooks/usePersistedState';

const { SIMILARITY_THRESHOLD } = QUALITY_CONSTANTS;
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
  qualityScore?: number;
  qualityGrade?: 'A' | 'B' | 'C' | 'D';
  qualityData?: {
    grammar_score: number;
    grammar_issues: string[];
    uniqueness_score: number;
    uniqueness_issues: string[];
    confusion_score: number;
    confusion_issues: string[];
    recommendations: string[];
    is_semantic_duplicate?: boolean;
    duplicate_of?: string;
    duplicate_reason?: string;
  };
  isReviewingQuality?: boolean;
}

export interface Category {
  id: string;
  name: string;
  category_id: string;
}

const LANGUAGES = [
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt-br', name: 'Portuguese', flag: '🇧🇷' },
];

export { LANGUAGES };

export default function Flow() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [generatedQuestions, setGeneratedQuestions, clearGeneratedQuestions] = usePersistedState<GeneratedQuestion[]>('flow-generated-questions', []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isReviewingQuality, setIsReviewingQuality] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [stats, setStats] = useState({ inLib: 0, inProd: 0 });
  const [languageStats, setLanguageStats] = useState<Record<string, { inLib: number; inProd: number }>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ka');
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [isUserEditing, setIsUserEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchStatsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Warn before closing tab with pending questions
  useEffect(() => {
    const pendingCount = generatedQuestions.filter(q => q.status === 'pending').length;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [generatedQuestions]);

  // Update selected preview when focus changes
  useEffect(() => {
    if (focusedQuestionId) {
      setSelectedPreviewId(focusedQuestionId);
    }
  }, [focusedQuestionId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, category_id, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    setCategories(data || []);
  };

  const fetchStats = useCallback(async () => {
    // Use RPC or multiple count queries to avoid 1000 row limit
    const languageCodes = LANGUAGES.map(l => l.code);
    const langStats: Record<string, { inLib: number; inProd: number }> = {};
    
    // Initialize all languages with 0
    languageCodes.forEach(code => {
      langStats[code] = { inLib: 0, inProd: 0 };
    });
    
    // Fetch counts per language using separate count queries (more accurate)
    const promises = languageCodes.flatMap(code => [
      supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('language', code)
        .eq('is_active', true)
        .eq('in_production', false)
        .then(({ count }) => ({ code, type: 'lib' as const, count: count || 0 })),
      supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('language', code)
        .eq('is_active', true)
        .eq('in_production', true)
        .then(({ count }) => ({ code, type: 'prod' as const, count: count || 0 })),
    ]);
    
    try {
      const results = await Promise.all(promises);
      
      results.forEach(({ code, type, count }) => {
        if (!langStats[code]) {
          langStats[code] = { inLib: 0, inProd: 0 };
        }
        if (type === 'lib') {
          langStats[code].inLib = count;
        } else {
          langStats[code].inProd = count;
        }
      });
      
      setLanguageStats(langStats);
      
      // Calculate totals
      const totalLib = Object.values(langStats).reduce((sum, s) => sum + s.inLib, 0);
      const totalProd = Object.values(langStats).reduce((sum, s) => sum + s.inProd, 0);
      setStats({ inLib: totalLib, inProd: totalProd });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Debounced stats fetcher to prevent rapid re-renders during editing
  const debouncedFetchStats = useCallback(() => {
    // Clear any pending timeout
    if (fetchStatsTimeoutRef.current) {
      clearTimeout(fetchStatsTimeoutRef.current);
    }
    // Don't fetch if user is actively editing
    if (isUserEditing) return;
    
    // Debounce by 2 seconds
    fetchStatsTimeoutRef.current = setTimeout(() => {
      fetchStats();
    }, 2000);
  }, [fetchStats, isUserEditing]);

  // Initialize data and set up real-time subscription
  useEffect(() => {
    fetchCategories();
    fetchStats();
    
    // Set up real-time subscription for question changes
    const channel = supabase
      .channel('questions-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions'
        },
        () => {
          // Use debounced fetch to prevent disruption while editing
          debouncedFetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchStatsTimeoutRef.current) {
        clearTimeout(fetchStatsTimeoutRef.current);
      }
    };
  }, [fetchStats, debouncedFetchStats]);

  // Check for duplicate questions in the database using semantic similarity
  const checkDuplicates = useCallback(async (questions: GeneratedQuestion[]): Promise<GeneratedQuestion[]> => {
    if (questions.length === 0) return questions;
    
    setIsCheckingDuplicates(true);
    try {
      // First, deduplicate within the batch itself
      const batchDeduped = removeDuplicatesFromBatch(
        questions.map(q => ({ ...q, question_text: q.questionText })),
        SIMILARITY_THRESHOLD
      ).map(q => {
        const { question_text, ...rest } = q as any;
        return rest as GeneratedQuestion;
      });
      
      const batchDuplicateCount = questions.length - batchDeduped.length;
      if (batchDuplicateCount > 0) {
        console.log(`Removed ${batchDuplicateCount} duplicates within the generated batch`);
      }

      // Get unique category IDs from questions
      const categoryIds = [...new Set(batchDeduped.map(q => q.categoryId))];
      
      // Fetch existing questions from the same categories for semantic comparison
      const { data: existing, error } = await supabase
        .from('questions')
        .select('id, question_text')
        .in('category_id', categoryIds)
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching existing questions:', error);
        return batchDeduped;
      }

      const existingTexts = existing?.map(e => e.question_text) || [];
      console.log(`Checking ${batchDeduped.length} questions against ${existingTexts.length} existing in database`);
      
      // Use semantic similarity instead of exact match
      return batchDeduped.map(q => {
        const similarQuestion = existingTexts.find(existingText => 
          calculateSimilarity(q.questionText, existingText) > SIMILARITY_THRESHOLD
        );
        
        const isDuplicate = !!similarQuestion;
        const duplicateWarning = isDuplicate 
          ? `Similar to existing: "${similarQuestion!.substring(0, 40)}..."`
          : null;
        
        return {
          ...q,
          isDuplicate,
          warnings: duplicateWarning 
            ? [...q.warnings, duplicateWarning]
            : q.warnings,
          isValid: !isDuplicate && q.isValid,
        };
      });
    } finally {
      setIsCheckingDuplicates(false);
    }
  }, []);

  // Review quality of generated questions using AI
  const reviewQuestionQuality = useCallback(async (questions: GeneratedQuestion[]) => {
    if (questions.length === 0) return;
    setIsReviewingQuality(true);
    
    try {
      // Get unique category IDs for semantic duplicate checking
      const categoryIds = [...new Set(questions.map(q => q.categoryId))];
      const primaryCategoryId = categoryIds.length === 1 ? categoryIds[0] : undefined;

      const payload = questions.map(q => ({
        id: q.id,
        question_text: q.questionText,
        correct_answer: q.correctAnswer,
        incorrect_answers: q.incorrectAnswers,
        category_id: q.categoryId,
      }));

      const { data, error } = await supabase.functions.invoke('review-generated-questions', {
        body: { questions: payload, categoryId: primaryCategoryId, language: selectedLanguage },
      });

      if (error) {
        console.error('Quality review error:', error);
        return;
      }

      const results = data?.results || [];
      
      setGeneratedQuestions(prev => prev.map(q => {
        const review = results.find((r: any) => r.id === q.id);
        if (!review) return q;
        
        const isSemanticDup = !!review.is_semantic_duplicate;
        const dupWarnings: string[] = [];
        if (isSemanticDup && review.duplicate_reason) {
          dupWarnings.push(`Semantic duplicate: ${review.duplicate_reason}`);
        }
        if (isSemanticDup && review.duplicate_of) {
          dupWarnings.push(`Similar to: "${review.duplicate_of.substring(0, 50)}..."`);
        }

        return {
          ...q,
          qualityScore: review.overall_score,
          qualityGrade: review.grade,
          isDuplicate: q.isDuplicate || isSemanticDup,
          warnings: isSemanticDup ? [...q.warnings, ...dupWarnings] : q.warnings,
          isValid: isSemanticDup ? false : q.isValid,
          qualityData: {
            grammar_score: review.grammar_score,
            grammar_issues: review.grammar_issues,
            uniqueness_score: review.uniqueness_score,
            uniqueness_issues: review.uniqueness_issues,
            confusion_score: review.confusion_score,
            confusion_issues: review.confusion_issues,
            recommendations: review.recommendations,
            is_semantic_duplicate: isSemanticDup,
            duplicate_of: review.duplicate_of,
            duplicate_reason: review.duplicate_reason,
          },
        };
      }));
    } catch (err) {
      console.error('Quality review failed:', err);
    } finally {
      setIsReviewingQuality(false);
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

    // Run quality review in background
    const nonDuplicates = checkedQuestions.filter(q => !q.isDuplicate);
    if (nonDuplicates.length > 0) {
      reviewQuestionQuality(nonDuplicates);
    }
  }, [checkDuplicates, reviewQuestionQuality]);

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

  const handleFixQuestion = useCallback(async (id: string) => {
    const question = generatedQuestions.find(q => q.id === id);
    if (!question || !question.qualityData) return;

    // Set loading state
    setGeneratedQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, isReviewingQuality: true } : q
    ));

    try {
      const { data, error } = await supabase.functions.invoke('fix-generated-question', {
        body: {
          question_text: question.questionText,
          correct_answer: question.correctAnswer,
          incorrect_answers: question.incorrectAnswers,
          reviewData: question.qualityData,
          language: question.language,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setGeneratedQuestions(prev => prev.map(q =>
          q.id === id ? {
            ...q,
            questionText: data.fixed.question_text,
            correctAnswer: data.fixed.correct_answer,
            incorrectAnswers: data.fixed.incorrect_answers,
            qualityScore: data.qualityScore,
            qualityGrade: data.qualityGrade,
            qualityData: data.qualityData,
            isReviewingQuality: false,
          } : q
        ));
        toast.success(`Fixed! New score: ${data.qualityScore}%`);
      }
    } catch (err) {
      console.error('Fix question error:', err);
      toast.error('Failed to fix question');
      setGeneratedQuestions(prev => prev.map(q =>
        q.id === id ? { ...q, isReviewingQuality: false } : q
      ));
    }
  }, [generatedQuestions]);

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

    // Quality gate: warn about questions without icons
    const noIconQuestions = approved.filter(q => !q.iconSlug);
    if (noIconQuestions.length > 0) {
      const confirmed = window.confirm(
        `${noIconQuestions.length} of ${approved.length} questions have no icon assigned.\n\nPublish anyway?`
      );
      if (!confirmed) return;
    }

    const questionsToInsert = approved.map(q => ({
      question_text: q.questionText,
      correct_answer: q.correctAnswer,
      incorrect_answers: q.incorrectAnswers,
      category_id: q.categoryId,
      difficulty: q.difficulty,
      language: q.language,
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

    // Quality gate: warn about questions without icons
    const noIconQuestions = approved.filter(q => !q.iconSlug);
    if (noIconQuestions.length > 0) {
      const confirmed = window.confirm(
        `${noIconQuestions.length} of ${approved.length} questions have no icon assigned.\n\nPublish to PRODUCTION anyway?`
      );
      if (!confirmed) return;
    }

    const questionsToInsert = approved.map(q => ({
      question_text: q.questionText,
      correct_answer: q.correctAnswer,
      incorrect_answers: q.incorrectAnswers,
      category_id: q.categoryId,
      difficulty: q.difficulty,
      language: q.language,
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
    <div className="h-full overflow-y-auto" ref={containerRef}>
      {/* Header - Compact Card Design */}
      <div className="p-3 border-b border-border/50">
        <div className="bg-card rounded-lg border border-border/50 shadow-sm p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h1 className="text-base font-semibold">Flow - Question Factory</h1>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Generate, review, and publish questions in 20 languages
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded hidden md:block">
                <kbd className="font-mono text-[10px]">Enter</kbd> Approve • <kbd className="font-mono text-[10px]">⌫</kbd> Reject • <kbd className="font-mono text-[10px]">Tab</kbd> Navigate
              </div>
              {(isCheckingDuplicates || isTranslating || isReviewingQuality) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  {isTranslating ? 'Translating...' : isReviewingQuality ? 'Reviewing quality...' : 'Checking...'}
                </div>
              )}
            </div>
          </div>
          
          {/* Language Stats Bar - Compact Horizontal Scroll */}
          <div className="overflow-x-auto md:scrollbar-none scrollbar-thin scrollbar-thumb-muted/50 scrollbar-track-transparent -mx-1 px-1">
            <div className="flex gap-2 min-w-max py-1">
              {LANGUAGES.map(lang => {
                const langStat = languageStats[lang.code] || { inLib: 0, inProd: 0 };
                const total = langStat.inLib + langStat.inProd;
                const hasQuestions = total > 0;
                const isSelected = selectedLanguage === lang.code;
                
                return (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : hasQuestions 
                          ? 'bg-background border-border/50 hover:border-primary/50' 
                          : 'bg-destructive/5 border-destructive/30 hover:bg-destructive/10'
                    }`}
                    title={`${lang.name}: ${langStat.inLib} lib, ${langStat.inProd} prod`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <div className="flex flex-col items-start text-left">
                      <span className={`text-xs font-semibold leading-tight ${isSelected ? 'text-primary' : ''}`}>
                        {lang.code.toUpperCase()}
                      </span>
                      <span className={`text-sm font-bold leading-tight ${
                        isSelected ? 'text-primary' : hasQuestions ? 'text-foreground' : 'text-destructive'
                      }`}>
                        {total.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap">
                      {langStat.inLib}L • {langStat.inProd}P
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Generation Panel */}
      <div className="border-b border-border/50 bg-card/30">
        <GenerationPanel
          categories={categories}
          languages={LANGUAGES}
          selectedLanguage={selectedLanguage}
          onQuestionsGenerated={handleQuestionsGenerated}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          knowledgeSources={knowledgeSources}
          knowledgeSourcesComponent={
            <KnowledgeSourcesList
              sources={knowledgeSources}
              onSourcesChange={setKnowledgeSources}
            />
          }
        />
      </div>

      {/* Language Question Browser */}
      <LanguageQuestionBrowser
        language={selectedLanguage}
        languageFlag={LANGUAGES.find(l => l.code === selectedLanguage)?.flag || '🌐'}
        languageName={LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}
        categories={categories}
        onStatsChanged={fetchStats}
      />

      {/* Two Column Layout - More space for questions */}
      <div className="flex">
        {/* Left: Preview & Review - NOW WIDER */}
        <div className="flex-1 flex flex-col bg-background/50">
          <QuestionPreviewList
            questions={generatedQuestions}
            categories={categories}
            onApprove={handleApprove}
            onReject={handleReject}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onUpdateQuestion={handleUpdateQuestion}
            onFixQuestion={handleFixQuestion}
            isReviewingQuality={isReviewingQuality}
            languages={LANGUAGES}
            focusedQuestionId={focusedQuestionId}
            onFocusChange={setFocusedQuestionId}
            onEditStart={() => setIsUserEditing(true)}
            onEditEnd={() => setIsUserEditing(false)}
          />
        </div>

        {/* Right: Queue - Responsive width */}
        <div className="w-80 lg:w-96 border-l border-border/50 bg-card/20 flex-shrink-0 h-screen flex flex-col">
          <div className="flex flex-col flex-1 overflow-y-auto">
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
            
            {/* Auto Generation Panel */}
            <div className="p-3 border-t border-border/50 relative z-10">
              <AutoGenerationPanel categories={categories} />
            </div>
            
            {/* Job Question Review */}
            <div className="p-3 border-t border-border/50 pb-8">
              <JobQuestionReview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
