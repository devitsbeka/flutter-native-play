import { useState, useEffect } from 'react';
import { 
  Wand2, 
  Search, 
  AlertTriangle, 
  Loader2, 
  Image, 
  Text, 
  Play,
  Pause,
  CheckCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Check,
  Trash2,
  Pencil,
  Save,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LongQuestion {
  id: string;
  question_text: string;
  category_id: string;
  length: number;
}

interface IconAssignmentProgress {
  total: number;
  processed: number;
  assigned: number;
  failed: number;
  remaining: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  batchNumber: number;
  estimatedTimeRemaining?: string;
  rateLimited?: boolean;
}

interface IconStats {
  total: number;
  withIcons: number;
  withoutIcons: number;
  loading: boolean;
}

interface ShortenResult {
  id: string;
  original: string;
  shortened: string | null;
  status: 'shortened' | 'unshortenable' | 'failed';
  originalLength: number;
  newLength: number | null;
}

interface EditedQuestionValues {
  questionText?: string;
}

interface EditedAnswerValues {
  correctAnswer?: string;
  incorrectAnswers?: string[];
}

interface ShortenProgress {
  total: number;
  processed: number;
  shortened: number;
  unshortenable: number;
  failed: number;
  remaining: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  batchNumber: number;
}

interface ShortenStats {
  inLib: number;
  longInLib: number;
  alreadyShortened: number;
  unshortenable: number;
  loading: boolean;
}

// Answer Shortening Types
interface AnswerShortenResult {
  id: string;
  questionText: string;
  originalCorrect: string;
  shortenedCorrect: string | null;
  originalIncorrect: string[];
  shortenedIncorrect: (string | null)[];
  status: 'shortened' | 'partially_shortened' | 'unshortenable' | 'failed';
  correctShortened: boolean;
  incorrectShortenedCount: number;
}

interface AnswerShortenProgress {
  total: number;
  processed: number;
  shortened: number;
  partiallyShortened: number;
  unshortenable: number;
  failed: number;
  remaining: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  batchNumber: number;
}

interface AnswerShortenStats {
  inLib: number;
  longAnswers: number;
  alreadyShortened: number;
  unshortenable: number;
  loading: boolean;
}

const MAX_QUESTION_LENGTH = 67;
const MAX_ANSWER_LENGTH = 20;

export default function QuestionTools() {
  const { categories } = useAdminCategories();
  const { toast } = useToast();
  
  // Icon Assignment State
  const [iconCategoryId, setIconCategoryId] = useState<string>('all');
  const [iconProgress, setIconProgress] = useState<IconAssignmentProgress>({
    total: 0,
    processed: 0,
    assigned: 0,
    failed: 0,
    remaining: 0,
    status: 'idle',
    batchNumber: 0
  });
  const [isPaused, setIsPaused] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{
    batchNumber: number;
    processed: number;
    assigned: number;
  }>>([]);

  // Long Questions State
  const [longQCategoryId, setLongQCategoryId] = useState<string>('all');
  const [longQuestions, setLongQuestions] = useState<LongQuestion[]>([]);
  const [scanningLong, setScanningLong] = useState(false);
  const [minLength, setMinLength] = useState(70);

  // Icon Stats State
  const [iconStats, setIconStats] = useState<IconStats>({
    total: 0,
    withIcons: 0,
    withoutIcons: 0,
    loading: false
  });

  // AI Shortener State
  const [shortenCategoryId, setShortenCategoryId] = useState<string>('all');
  const [shortenInProduction, setShortenInProduction] = useState<boolean>(false);
  const [shortenProgress, setShortenProgress] = useState<ShortenProgress>({
    total: 0,
    processed: 0,
    shortened: 0,
    unshortenable: 0,
    failed: 0,
    remaining: 0,
    status: 'idle',
    batchNumber: 0
  });
  const [shortenResults, setShortenResults] = useState<ShortenResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [shortenStats, setShortenStats] = useState<ShortenStats>({
    inLib: 0,
    longInLib: 0,
    alreadyShortened: 0,
    unshortenable: 0,
    loading: false
  });
  const [isShortenPaused, setIsShortenPaused] = useState(false);
  
  // Edit state for questions
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editedQuestionValues, setEditedQuestionValues] = useState<EditedQuestionValues>({});

  // Answer Shortener State
  const [answerCategoryId, setAnswerCategoryId] = useState<string>('all');
  const [answerInProduction, setAnswerInProduction] = useState<boolean>(false);
  const [answerProgress, setAnswerProgress] = useState<AnswerShortenProgress>({
    total: 0,
    processed: 0,
    shortened: 0,
    partiallyShortened: 0,
    unshortenable: 0,
    failed: 0,
    remaining: 0,
    status: 'idle',
    batchNumber: 0
  });
  const [answerResults, setAnswerResults] = useState<AnswerShortenResult[]>([]);
  const [selectedAnswerResults, setSelectedAnswerResults] = useState<Set<string>>(new Set());
  const [answerStats, setAnswerStats] = useState<AnswerShortenStats>({
    inLib: 0,
    longAnswers: 0,
    alreadyShortened: 0,
    unshortenable: 0,
    loading: false
  });
  const [isAnswerPaused, setIsAnswerPaused] = useState(false);
  const [shortenMode, setShortenMode] = useState<'questions' | 'answers'>('questions');
  
  // Edit state for answers
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editedAnswerValues, setEditedAnswerValues] = useState<EditedAnswerValues>({});

  // Load icon stats on mount and when category changes
  useEffect(() => {
    const loadIconStats = async () => {
      setIconStats(prev => ({ ...prev, loading: true }));
      
      let query = supabase
        .from('questions')
        .select('id, icon_slug', { count: 'exact' })
        .eq('is_active', true);
      
      if (iconCategoryId !== 'all') {
        query = query.eq('category_id', iconCategoryId);
      }

      const { data, count } = await query;
      
      const withIcons = data?.filter(q => q.icon_slug && q.icon_slug.trim() !== '').length || 0;
      const total = count || 0;
      
      setIconStats({
        total,
        withIcons,
        withoutIcons: total - withIcons,
        loading: false
      });
    };

    loadIconStats();
  }, [iconCategoryId]);

  // Load shorten stats
  useEffect(() => {
    const loadShortenStats = async () => {
      setShortenStats(prev => ({ ...prev, loading: true }));
      
      try {
        let baseQuery = supabase
          .from('questions')
          .select('id, question_text, shorten_status, in_production')
          .eq('is_active', true);
        
        if (shortenCategoryId !== 'all') {
          baseQuery = baseQuery.eq('category_id', shortenCategoryId);
        }

        const { data: questions } = await baseQuery;
        
        if (!questions) {
          setShortenStats(prev => ({ ...prev, loading: false }));
          return;
        }

        const inLibQuestions = questions.filter(q => !q.in_production);
        const inProdQuestions = questions.filter(q => q.in_production);
        const targetQuestions = shortenInProduction ? inProdQuestions : inLibQuestions;
        
        const longOnes = targetQuestions.filter(q => 
          q.question_text.length > MAX_QUESTION_LENGTH && !q.shorten_status
        );
        const shortened = targetQuestions.filter(q => q.shorten_status === 'shortened');
        const unshortenable = targetQuestions.filter(q => q.shorten_status === 'unshortenable');
        
        setShortenStats({
          inLib: targetQuestions.length,
          longInLib: longOnes.length,
          alreadyShortened: shortened.length,
          unshortenable: unshortenable.length,
          loading: false
        });
      } catch (err) {
        console.error('Error loading shorten stats:', err);
        setShortenStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadShortenStats();
  }, [shortenCategoryId, shortenInProduction, shortenProgress.status]);

  // Batch Icon Assignment Function
  const startIconAssignment = async (testMode = false) => {
    setIsPaused(false);
    setBatchResults([]);
    const targetCount = testMode ? 10 : iconStats.withoutIcons;
    setIconProgress({
      total: targetCount,
      processed: 0,
      assigned: 0,
      failed: 0,
      remaining: targetCount,
      status: 'running',
      batchNumber: 0
    });

    const startTime = Date.now();
    let totalProcessed = 0;
    let totalAssigned = 0;
    let batchNum = 0;
    let shouldContinue = true;

    try {
      while (shouldContinue && !isPaused) {
        batchNum++;
        
        const { data, error } = await supabase.functions.invoke('batch-assign-icons', {
          body: { 
            categoryId: iconCategoryId === 'all' ? null : iconCategoryId,
            testMode 
          }
        });

        if (error) {
          console.error('Batch error:', error);
          toast({
            title: 'შეცდომა',
            description: 'ბათჩის დამუშავება ვერ მოხერხდა',
            variant: 'destructive',
          });
          break;
        }

        if (data.done || data.remaining === 0 || testMode) {
          shouldContinue = false;
        }

        totalProcessed += data.processed || 0;
        totalAssigned += data.assigned || 0;

        const elapsed = (Date.now() - startTime) / 1000;
        const rate = totalProcessed / elapsed;
        const remaining = testMode ? 0 : (data.remaining || 0);
        const estimatedSeconds = rate > 0 ? remaining / rate : 0;
        const estimatedTime = estimatedSeconds > 60 
          ? `~${Math.ceil(estimatedSeconds / 60)} წუთი` 
          : `~${Math.ceil(estimatedSeconds)} წამი`;

        setIconProgress({
          total: testMode ? totalProcessed : iconStats.withoutIcons,
          processed: totalProcessed,
          assigned: totalAssigned,
          failed: totalProcessed - totalAssigned,
          remaining: testMode ? 0 : remaining,
          status: shouldContinue ? 'running' : 'completed',
          batchNumber: batchNum,
          estimatedTimeRemaining: shouldContinue ? estimatedTime : undefined,
          rateLimited: data.rateLimited
        });

        setBatchResults(prev => [...prev, {
          batchNumber: batchNum,
          processed: data.processed || 0,
          assigned: data.assigned || 0
        }]);

        if (data.rateLimited) {
          toast({
            title: 'Rate limit',
            description: '2 წამით ველოდებით...',
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (!isPaused) {
        setIconProgress(prev => ({ ...prev, status: 'completed' }));
        toast({
          title: testMode ? 'ტესტი დასრულდა! ✅' : 'აიკონების მინიჭება დასრულდა! 🎉',
          description: `დამუშავდა ${totalProcessed} კითხვა, მინიჭდა ${totalAssigned} აიკონი`,
        });
      }
    } catch (err) {
      console.error('Icon assignment error:', err);
      toast({
        title: 'შეცდომა',
        description: 'აიკონების მინიჭება ვერ მოხერხდა',
        variant: 'destructive',
      });
      setIconProgress(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const pauseIconAssignment = () => {
    setIsPaused(true);
    setIconProgress(prev => ({ ...prev, status: 'paused' }));
  };

  const resumeIconAssignment = () => {
    setIsPaused(false);
    startIconAssignment();
  };

  const resetIconAssignment = () => {
    setIsPaused(false);
    setBatchResults([]);
    setIconProgress({
      total: 0,
      processed: 0,
      assigned: 0,
      failed: 0,
      remaining: 0,
      status: 'idle',
      batchNumber: 0
    });
  };

  // AI Shortener Functions
  const startShortenQuestions = async (testMode = false) => {
    setIsShortenPaused(false);
    setShortenResults([]);
    setSelectedResults(new Set());
    
    setShortenProgress({
      total: testMode ? 5 : shortenStats.longInLib,
      processed: 0,
      shortened: 0,
      unshortenable: 0,
      failed: 0,
      remaining: testMode ? 5 : shortenStats.longInLib,
      status: 'running',
      batchNumber: 0
    });

    let batchNum = 0;
    let shouldContinue = true;
    let allResults: ShortenResult[] = [];

    try {
      while (shouldContinue && !isShortenPaused) {
        batchNum++;
        
        const { data, error } = await supabase.functions.invoke('shorten-questions', {
          body: { 
            categoryId: shortenCategoryId === 'all' ? null : shortenCategoryId,
            testMode,
            inProduction: shortenInProduction
          }
        });

        if (error) {
          console.error('Shorten batch error:', error);
          toast({
            title: 'შეცდომა',
            description: 'კითხვების შემოკლება ვერ მოხერხდა',
            variant: 'destructive',
          });
          break;
        }

        if (data.done || data.remaining === 0 || testMode) {
          shouldContinue = false;
        }

        allResults = [...allResults, ...(data.results || [])];
        setShortenResults(allResults);

        setShortenProgress({
          total: testMode ? data.processed : shortenStats.longInLib,
          processed: allResults.length,
          shortened: allResults.filter(r => r.status === 'shortened').length,
          unshortenable: allResults.filter(r => r.status === 'unshortenable').length,
          failed: allResults.filter(r => r.status === 'failed').length,
          remaining: data.remaining || 0,
          status: shouldContinue ? 'running' : 'completed',
          batchNumber: batchNum
        });

        // Delay between batches
        if (!testMode && shouldContinue) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!isShortenPaused) {
        setShortenProgress(prev => ({ ...prev, status: 'completed' }));
        toast({
          title: testMode ? 'ტესტი დასრულდა! ✅' : 'შემოკლება დასრულდა! 🎉',
          description: `შემოკლდა ${allResults.filter(r => r.status === 'shortened').length} კითხვა`,
        });
      }
    } catch (err) {
      console.error('Shorten error:', err);
      toast({
        title: 'შეცდომა',
        description: 'შემოკლება ვერ მოხერხდა',
        variant: 'destructive',
      });
      setShortenProgress(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const pauseShortenQuestions = () => {
    setIsShortenPaused(true);
    setShortenProgress(prev => ({ ...prev, status: 'paused' }));
  };

  const resetShortenQuestions = () => {
    setIsShortenPaused(false);
    setShortenResults([]);
    setSelectedResults(new Set());
    setShortenProgress({
      total: 0,
      processed: 0,
      shortened: 0,
      unshortenable: 0,
      failed: 0,
      remaining: 0,
      status: 'idle',
      batchNumber: 0
    });
  };

  const toggleResultSelection = (id: string) => {
    setSelectedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllShortened = () => {
    const shortenedIds = shortenResults
      .filter(r => r.status === 'shortened')
      .map(r => r.id);
    setSelectedResults(new Set(shortenedIds));
  };

  const pushSelectedToProd = async () => {
    if (selectedResults.size === 0) return;

    try {
      // Get the pending values for selected questions
      const { data: pendingQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('id, pending_question_text')
        .in('id', Array.from(selectedResults));

      if (fetchError) throw fetchError;

      // Update each question - copy pending to actual
      for (const q of pendingQuestions || []) {
        if (q.pending_question_text) {
          await supabase
            .from('questions')
            .update({ 
              question_text: q.pending_question_text,
              pending_question_text: null,
              shorten_status: 'shortened',
              in_production: true
            })
            .eq('id', q.id);
        }
      }

      toast({
        title: 'წარმატება! ✅',
        description: `${selectedResults.size} კითხვა გადავიდა პროდაქშენში`,
      });

      // Remove pushed items from results
      setShortenResults(prev => prev.filter(r => !selectedResults.has(r.id)));
      setSelectedResults(new Set());
    } catch (err) {
      console.error('Push to prod error:', err);
      toast({
        title: 'შეცდომა',
        description: 'პროდაქშენში გადატანა ვერ მოხერხდა',
        variant: 'destructive',
      });
    }
  };

  // Delete question function
  const deleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'კითხვა წაიშალა',
      });

      setShortenResults(prev => prev.filter(r => r.id !== id));
      setSelectedResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      console.error('Delete question error:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive',
      });
    }
  };

  // Edit question functions
  const startEditQuestion = (result: ShortenResult) => {
    setEditingQuestionId(result.id);
    setEditedQuestionValues({
      questionText: result.shortened || result.original
    });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditedQuestionValues({});
  };

  const saveEditQuestion = async (id: string) => {
    if (!editedQuestionValues.questionText) return;

    try {
      const { error } = await supabase
        .from('questions')
        .update({ 
          pending_question_text: editedQuestionValues.questionText
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setShortenResults(prev => prev.map(r => 
        r.id === id 
          ? { ...r, shortened: editedQuestionValues.questionText!, newLength: editedQuestionValues.questionText!.length }
          : r
      ));

      toast({
        title: 'შენახულია',
      });

      setEditingQuestionId(null);
      setEditedQuestionValues({});
    } catch (err) {
      console.error('Save edit error:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive',
      });
    }
  };

  const hideUnshortenable = async () => {
    const unshortenableIds = shortenResults
      .filter(r => r.status === 'unshortenable')
      .map(r => r.id);

    if (unshortenableIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false })
        .in('id', unshortenableIds);

      if (error) throw error;

      toast({
        title: 'წარმატება!',
        description: `${unshortenableIds.length} კითხვა დაიმალა`,
      });

      setShortenResults(prev => prev.filter(r => r.status !== 'unshortenable'));
    } catch (err) {
      console.error('Hide unshortenable error:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive',
      });
    }
  };

  // Load answer shorten stats
  useEffect(() => {
    const loadAnswerStats = async () => {
      setAnswerStats(prev => ({ ...prev, loading: true }));
      
      try {
        let baseQuery = supabase
          .from('questions')
          .select('id, correct_answer, incorrect_answers, answer_shorten_status, in_production')
          .eq('is_active', true);
        
        if (answerCategoryId !== 'all') {
          baseQuery = baseQuery.eq('category_id', answerCategoryId);
        }

        const { data: questions } = await baseQuery;
        
        if (!questions) {
          setAnswerStats(prev => ({ ...prev, loading: false }));
          return;
        }

        const inLibQuestions = questions.filter(q => !q.in_production);
        const inProdQuestions = questions.filter(q => q.in_production);
        const targetQuestions = answerInProduction ? inProdQuestions : inLibQuestions;
        
        // Count questions with long answers
        const longAnswerQuestions = targetQuestions.filter(q => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers) 
            ? q.incorrect_answers as string[]
            : [];
          const correctTooLong = q.correct_answer.length > MAX_ANSWER_LENGTH;
          const anyIncorrectTooLong = incorrectAnswers.some(a => a.length > MAX_ANSWER_LENGTH);
          return (correctTooLong || anyIncorrectTooLong) && !q.answer_shorten_status;
        });
        
        const shortened = targetQuestions.filter(q => q.answer_shorten_status === 'shortened');
        const unshortenable = targetQuestions.filter(q => 
          q.answer_shorten_status === 'unshortenable' || q.answer_shorten_status === 'partially_shortened'
        );
        
        setAnswerStats({
          inLib: targetQuestions.length,
          longAnswers: longAnswerQuestions.length,
          alreadyShortened: shortened.length,
          unshortenable: unshortenable.length,
          loading: false
        });
      } catch (err) {
        console.error('Error loading answer stats:', err);
        setAnswerStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadAnswerStats();
  }, [answerCategoryId, answerInProduction, answerProgress.status]);

  // Answer Shortening Functions
  const startShortenAnswers = async (testMode = false) => {
    setIsAnswerPaused(false);
    setAnswerResults([]);
    setSelectedAnswerResults(new Set());
    
    setAnswerProgress({
      total: testMode ? 5 : answerStats.longAnswers,
      processed: 0,
      shortened: 0,
      partiallyShortened: 0,
      unshortenable: 0,
      failed: 0,
      remaining: testMode ? 5 : answerStats.longAnswers,
      status: 'running',
      batchNumber: 0
    });

    let batchNum = 0;
    let shouldContinue = true;
    let allResults: AnswerShortenResult[] = [];

    try {
      while (shouldContinue && !isAnswerPaused) {
        batchNum++;
        
        const { data, error } = await supabase.functions.invoke('shorten-answers', {
          body: { 
            categoryId: answerCategoryId === 'all' ? null : answerCategoryId,
            testMode,
            inProduction: answerInProduction
          }
        });

        if (error) {
          console.error('Answer shorten batch error:', error);
          toast({
            title: 'შეცდომა',
            description: 'პასუხების შემოკლება ვერ მოხერხდა',
            variant: 'destructive',
          });
          break;
        }

        if (data.done || data.remaining === 0 || testMode) {
          shouldContinue = false;
        }

        allResults = [...allResults, ...(data.results || [])];
        setAnswerResults(allResults);

        setAnswerProgress({
          total: testMode ? data.processed : answerStats.longAnswers,
          processed: allResults.length,
          shortened: allResults.filter(r => r.status === 'shortened').length,
          partiallyShortened: allResults.filter(r => r.status === 'partially_shortened').length,
          unshortenable: allResults.filter(r => r.status === 'unshortenable').length,
          failed: allResults.filter(r => r.status === 'failed').length,
          remaining: data.remaining || 0,
          status: shouldContinue ? 'running' : 'completed',
          batchNumber: batchNum
        });

        if (!testMode && shouldContinue) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!isAnswerPaused) {
        setAnswerProgress(prev => ({ ...prev, status: 'completed' }));
        toast({
          title: testMode ? 'ტესტი დასრულდა! ✅' : 'პასუხების შემოკლება დასრულდა! 🎉',
          description: `შემოკლდა ${allResults.filter(r => r.status === 'shortened').length} კითხვის პასუხები`,
        });
      }
    } catch (err) {
      console.error('Answer shorten error:', err);
      toast({
        title: 'შეცდომა',
        description: 'პასუხების შემოკლება ვერ მოხერხდა',
        variant: 'destructive',
      });
      setAnswerProgress(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const pauseShortenAnswers = () => {
    setIsAnswerPaused(true);
    setAnswerProgress(prev => ({ ...prev, status: 'paused' }));
  };

  const resetShortenAnswers = () => {
    setIsAnswerPaused(false);
    setAnswerResults([]);
    setSelectedAnswerResults(new Set());
    setAnswerProgress({
      total: 0,
      processed: 0,
      shortened: 0,
      partiallyShortened: 0,
      unshortenable: 0,
      failed: 0,
      remaining: 0,
      status: 'idle',
      batchNumber: 0
    });
  };

  const toggleAnswerResultSelection = (id: string) => {
    setSelectedAnswerResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllShortenedAnswers = () => {
    const shortenedIds = answerResults
      .filter(r => r.status === 'shortened' || r.status === 'partially_shortened')
      .map(r => r.id);
    setSelectedAnswerResults(new Set(shortenedIds));
  };

  const pushSelectedAnswersToProd = async () => {
    if (selectedAnswerResults.size === 0) return;

    try {
      // Get the pending values for selected questions
      const { data: pendingQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('id, pending_correct_answer, pending_incorrect_answers, correct_answer, incorrect_answers')
        .in('id', Array.from(selectedAnswerResults));

      if (fetchError) throw fetchError;

      // Update each question - copy pending to actual
      for (const q of pendingQuestions || []) {
        const updates: Record<string, unknown> = {
          answer_shorten_status: 'shortened',
          in_production: true,
          pending_correct_answer: null,
          pending_incorrect_answers: null
        };

        if (q.pending_correct_answer) {
          updates.correct_answer = q.pending_correct_answer;
        }
        if (q.pending_incorrect_answers) {
          updates.incorrect_answers = q.pending_incorrect_answers;
        }

        await supabase
          .from('questions')
          .update(updates)
          .eq('id', q.id);
      }

      toast({
        title: 'წარმატება! ✅',
        description: `${selectedAnswerResults.size} კითხვა გადავიდა პროდაქშენში`,
      });

      setAnswerResults(prev => prev.filter(r => !selectedAnswerResults.has(r.id)));
      setSelectedAnswerResults(new Set());
    } catch (err) {
      console.error('Push answers to prod error:', err);
      toast({
        title: 'შეცდომა',
        description: 'პროდაქშენში გადატანა ვერ მოხერხდა',
        variant: 'destructive',
      });
    }
  };

  // Delete answer question function
  const deleteAnswerQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'კითხვა წაიშალა',
      });

      setAnswerResults(prev => prev.filter(r => r.id !== id));
      setSelectedAnswerResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      console.error('Delete question error:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive',
      });
    }
  };

  // Edit answer functions
  const startEditAnswer = (result: AnswerShortenResult) => {
    setEditingAnswerId(result.id);
    setEditedAnswerValues({
      correctAnswer: result.shortenedCorrect || result.originalCorrect,
      incorrectAnswers: result.shortenedIncorrect.map((s, idx) => 
        s || result.originalIncorrect[idx]
      )
    });
  };

  const cancelEditAnswer = () => {
    setEditingAnswerId(null);
    setEditedAnswerValues({});
  };

  const saveEditAnswer = async (id: string) => {
    if (!editedAnswerValues.correctAnswer && !editedAnswerValues.incorrectAnswers) return;

    try {
      const updates: Record<string, unknown> = {};
      if (editedAnswerValues.correctAnswer) {
        updates.pending_correct_answer = editedAnswerValues.correctAnswer;
      }
      if (editedAnswerValues.incorrectAnswers) {
        updates.pending_incorrect_answers = editedAnswerValues.incorrectAnswers;
      }

      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setAnswerResults(prev => prev.map(r => 
        r.id === id 
          ? { 
              ...r, 
              shortenedCorrect: editedAnswerValues.correctAnswer || r.shortenedCorrect,
              shortenedIncorrect: editedAnswerValues.incorrectAnswers || r.shortenedIncorrect
            }
          : r
      ));

      toast({
        title: 'შენახულია',
      });

      setEditingAnswerId(null);
      setEditedAnswerValues({});
    } catch (err) {
      console.error('Save edit error:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive',
      });
    }
  };

  // Long Questions Functions
  const scanLongQuestions = async () => {
    setScanningLong(true);
    setLongQuestions([]);

    try {
      let query = supabase
        .from('questions')
        .select('id, question_text, category_id')
        .eq('is_active', true);
      
      if (longQCategoryId !== 'all') {
        query = query.eq('category_id', longQCategoryId);
      }

      const { data: questions, error } = await query;

      if (error) throw error;

      const longOnes = (questions || [])
        .filter(q => q.question_text.length > minLength)
        .map(q => ({
          ...q,
          length: q.question_text.length
        }))
        .sort((a, b) => b.length - a.length);

      setLongQuestions(longOnes);

      toast({
        title: 'სკანირება დასრულდა',
        description: longOnes.length > 0 
          ? `ნაპოვნია ${longOnes.length} გრძელი კითხვა`
          : 'გრძელი კითხვები არ მოიძებნა',
      });
    } catch (err) {
      console.error('Long question scan error:', err);
      toast({
        title: 'შეცდომა',
        description: 'სკანირება ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setScanningLong(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? `${cat.icon} ${cat.name}` : 'უცნობი';
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 rounded-xl">
            <Wand2 className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">კითხვების ინსტრუმენტები</h1>
            <p className="text-muted-foreground">აიკონები, შემოკლება და ვალიდაცია</p>
          </div>
        </div>

        <Tabs defaultValue="shortener" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="shortener" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI შემოკლება
            </TabsTrigger>
            <TabsTrigger value="icons" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              აიკონები
            </TabsTrigger>
            <TabsTrigger value="length" className="flex items-center gap-2">
              <Text className="h-4 w-4" />
              სიგრძე
            </TabsTrigger>
          </TabsList>

          {/* AI Shortener Tab */}
          <TabsContent value="shortener" className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
              <Button
                variant={shortenMode === 'questions' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShortenMode('questions')}
                className="gap-2"
              >
                <Text className="h-4 w-4" />
                კითხვები
              </Button>
              <Button
                variant={shortenMode === 'answers' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShortenMode('answers')}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                პასუხები
              </Button>
            </div>

            {/* Questions Shortener */}
            {shortenMode === 'questions' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI კითხვების შემოკლება
                </CardTitle>
                <CardDescription>
                  AI ავტომატურად შეამოკლებს კითხვებს {MAX_QUESTION_LENGTH} სიმბოლომდე
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Display */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {shortenStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : shortenStats.inLib}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {shortenInProduction ? 'In Prod' : 'In Lib'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {shortenStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : shortenStats.longInLib}
                    </div>
                    <div className="text-xs text-muted-foreground">გრძელი ({`>${MAX_QUESTION_LENGTH}`})</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {shortenStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : shortenStats.alreadyShortened}
                    </div>
                    <div className="text-xs text-muted-foreground">შემოკლებული</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {shortenStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : shortenStats.unshortenable}
                    </div>
                    <div className="text-xs text-muted-foreground">შეუმოკლებადი</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label>კატეგორია</Label>
                    <Select value={shortenCategoryId} onValueChange={setShortenCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ კატეგორია" />
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

                  <div className="space-y-2">
                    <Label>სტატუსი</Label>
                    <Select 
                      value={shortenInProduction ? 'prod' : 'lib'} 
                      onValueChange={(v) => setShortenInProduction(v === 'prod')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lib">In Lib</SelectItem>
                        <SelectItem value="prod">In Prod</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    {shortenProgress.status === 'idle' && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => startShortenQuestions(true)} 
                          disabled={shortenStats.longInLib === 0}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          ტესტი (5)
                        </Button>
                        <Button 
                          onClick={() => startShortenQuestions(false)} 
                          disabled={shortenStats.longInLib === 0}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          შემოკლება ({shortenStats.longInLib})
                        </Button>
                      </>
                    )}
                    {shortenProgress.status === 'running' && (
                      <Button variant="outline" onClick={pauseShortenQuestions}>
                        <Pause className="h-4 w-4 mr-2" />
                        პაუზა
                      </Button>
                    )}
                    {(shortenProgress.status === 'completed' || shortenProgress.status === 'paused') && (
                      <Button variant="ghost" onClick={resetShortenQuestions}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        თავიდან
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress */}
                {shortenProgress.total > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>პროგრესი: {shortenProgress.processed} / {shortenProgress.total}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {shortenProgress.shortened}
                        </span>
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="h-4 w-4" />
                          {shortenProgress.unshortenable}
                        </span>
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="h-4 w-4" />
                          {shortenProgress.failed}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={shortenProgress.total > 0 ? (shortenProgress.processed / shortenProgress.total) * 100 : 0} 
                      className="h-2"
                    />
                    {shortenProgress.status === 'running' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        ბათჩი #{shortenProgress.batchNumber} მუშავდება...
                      </div>
                    )}
                  </div>
                )}

                {/* Results */}
                {shortenResults.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>შედეგები ({shortenResults.length})</Label>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={selectAllShortened}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          მონიშნე შემოკლებულები
                        </Button>
                        {selectedResults.size > 0 && (
                          <Button 
                            size="sm" 
                            onClick={pushSelectedToProd}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Prod-ში ({selectedResults.size})
                          </Button>
                        )}
                        {shortenResults.some(r => r.status === 'unshortenable') && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={hideUnshortenable}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            დამალე შეუმოკლებადი
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {shortenResults.map((result) => (
                        <div
                          key={result.id}
                          className={`p-3 rounded-lg border ${
                            result.status === 'shortened' 
                              ? 'border-green-200 bg-green-50 dark:bg-green-950/20' 
                              : result.status === 'unshortenable'
                              ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                              : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {result.status === 'shortened' && (
                              <Checkbox
                                checked={selectedResults.has(result.id)}
                                onCheckedChange={() => toggleResultSelection(result.id)}
                                className="mt-1"
                              />
                            )}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={
                                      result.status === 'shortened' ? 'default' : 
                                      result.status === 'unshortenable' ? 'destructive' : 'secondary'
                                    }
                                    className="text-xs"
                                  >
                                    {result.status === 'shortened' ? 'შემოკლდა' : 
                                     result.status === 'unshortenable' ? 'შეუმოკლებადი' : 'შეცდომა'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {result.originalLength} → {result.newLength || '-'} სიმბოლო
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {result.status === 'shortened' && editingQuestionId !== result.id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => startEditQuestion(result)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    onClick={() => deleteQuestion(result.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-sm">
                                <div className="text-muted-foreground line-through text-xs mb-1">
                                  {result.original}
                                </div>
                                {editingQuestionId === result.id ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={editedQuestionValues.questionText || ''}
                                      onChange={(e) => setEditedQuestionValues({ questionText: e.target.value })}
                                      className="text-sm"
                                    />
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">
                                        {editedQuestionValues.questionText?.length || 0} სიმბოლო
                                      </span>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7"
                                          onClick={cancelEditQuestion}
                                        >
                                          <X className="h-3 w-3 mr-1" />
                                          გაუქმება
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="h-7"
                                          onClick={() => saveEditQuestion(result.id)}
                                        >
                                          <Save className="h-3 w-3 mr-1" />
                                          შენახვა
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  result.shortened && (
                                    <div className="font-medium">
                                      {result.shortened}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {shortenResults.length === 0 && shortenProgress.status === 'idle' && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">დააჭირეთ "შემოკლება" გრძელი კითხვების AI შემოკლებისთვის</p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Answers Shortener */}
            {shortenMode === 'answers' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI პასუხების შემოკლება
                </CardTitle>
                <CardDescription>
                  AI ავტომატურად შეამოკლებს პასუხებს {MAX_ANSWER_LENGTH} სიმბოლომდე
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Display */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {answerStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : answerStats.inLib}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {answerInProduction ? 'In Prod' : 'In Lib'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {answerStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : answerStats.longAnswers}
                    </div>
                    <div className="text-xs text-muted-foreground">გრძელი ({`>${MAX_ANSWER_LENGTH}`})</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {answerStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : answerStats.alreadyShortened}
                    </div>
                    <div className="text-xs text-muted-foreground">შემოკლებული</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {answerStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : answerStats.unshortenable}
                    </div>
                    <div className="text-xs text-muted-foreground">შეუმოკლებადი</div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label>კატეგორია</Label>
                    <Select value={answerCategoryId} onValueChange={setAnswerCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ კატეგორია" />
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

                  <div className="space-y-2">
                    <Label>სტატუსი</Label>
                    <Select 
                      value={answerInProduction ? 'prod' : 'lib'} 
                      onValueChange={(v) => setAnswerInProduction(v === 'prod')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lib">In Lib</SelectItem>
                        <SelectItem value="prod">In Prod</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    {answerProgress.status === 'idle' && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => startShortenAnswers(true)} 
                          disabled={answerStats.longAnswers === 0}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          ტესტი (5)
                        </Button>
                        <Button 
                          onClick={() => startShortenAnswers(false)} 
                          disabled={answerStats.longAnswers === 0}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          შემოკლება ({answerStats.longAnswers})
                        </Button>
                      </>
                    )}
                    {answerProgress.status === 'running' && (
                      <Button variant="outline" onClick={pauseShortenAnswers}>
                        <Pause className="h-4 w-4 mr-2" />
                        პაუზა
                      </Button>
                    )}
                    {(answerProgress.status === 'completed' || answerProgress.status === 'paused') && (
                      <Button variant="ghost" onClick={resetShortenAnswers}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        თავიდან
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress */}
                {answerProgress.total > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>პროგრესი: {answerProgress.processed} / {answerProgress.total}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {answerProgress.shortened}
                        </span>
                        <span className="flex items-center gap-1 text-blue-500">
                          <Check className="h-4 w-4" />
                          {answerProgress.partiallyShortened} ნაწილ.
                        </span>
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="h-4 w-4" />
                          {answerProgress.unshortenable}
                        </span>
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="h-4 w-4" />
                          {answerProgress.failed}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={answerProgress.total > 0 ? (answerProgress.processed / answerProgress.total) * 100 : 0} 
                      className="h-2"
                    />
                    {answerProgress.status === 'running' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        ბათჩი #{answerProgress.batchNumber} მუშავდება...
                      </div>
                    )}
                  </div>
                )}

                {/* Results */}
                {answerResults.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>შედეგები ({answerResults.length})</Label>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={selectAllShortenedAnswers}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          მონიშნე შემოკლებულები
                        </Button>
                        {selectedAnswerResults.size > 0 && (
                          <Button 
                            size="sm" 
                            onClick={pushSelectedAnswersToProd}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Prod-ში ({selectedAnswerResults.size})
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {answerResults.map((result) => (
                        <div
                          key={result.id}
                          className={`p-3 rounded-lg border ${
                            result.status === 'shortened' 
                              ? 'border-green-200 bg-green-50 dark:bg-green-950/20' 
                              : result.status === 'partially_shortened'
                              ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                              : result.status === 'unshortenable'
                              ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                              : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {(result.status === 'shortened' || result.status === 'partially_shortened') && (
                              <Checkbox
                                checked={selectedAnswerResults.has(result.id)}
                                onCheckedChange={() => toggleAnswerResultSelection(result.id)}
                                className="mt-1"
                              />
                            )}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge 
                                    variant={
                                      result.status === 'shortened' ? 'default' : 
                                      result.status === 'partially_shortened' ? 'secondary' :
                                      result.status === 'unshortenable' ? 'destructive' : 'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {result.status === 'shortened' ? 'შემოკლდა' : 
                                     result.status === 'partially_shortened' ? 'ნაწილობრივ' :
                                     result.status === 'unshortenable' ? 'შეუმოკლებადი' : 'შეცდომა'}
                                  </Badge>
                                  {result.correctShortened && (
                                    <Badge variant="outline" className="text-xs text-green-600">
                                      ✓ სწორი პასუხი
                                    </Badge>
                                  )}
                                  {result.incorrectShortenedCount > 0 && (
                                    <Badge variant="outline" className="text-xs text-blue-600">
                                      {result.incorrectShortenedCount} არასწორი
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {(result.status === 'shortened' || result.status === 'partially_shortened') && editingAnswerId !== result.id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => startEditAnswer(result)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    onClick={() => deleteAnswerQuestion(result.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                {result.questionText}
                              </div>
                              
                              {editingAnswerId === result.id ? (
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-xs font-medium text-green-600">სწორი პასუხი:</label>
                                    <Input
                                      value={editedAnswerValues.correctAnswer || ''}
                                      onChange={(e) => setEditedAnswerValues(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                      className="text-sm"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {editedAnswerValues.correctAnswer?.length || 0} სიმბოლო
                                    </span>
                                  </div>
                                  {editedAnswerValues.incorrectAnswers?.map((ans, idx) => (
                                    <div key={idx} className="space-y-1">
                                      <label className="text-xs font-medium text-muted-foreground">არასწორი {idx + 1}:</label>
                                      <Input
                                        value={ans}
                                        onChange={(e) => {
                                          const newIncorrect = [...(editedAnswerValues.incorrectAnswers || [])];
                                          newIncorrect[idx] = e.target.value;
                                          setEditedAnswerValues(prev => ({ ...prev, incorrectAnswers: newIncorrect }));
                                        }}
                                        className="text-sm"
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {ans.length} სიმბოლო
                                      </span>
                                    </div>
                                  ))}
                                  <div className="flex justify-end gap-1 pt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7"
                                      onClick={cancelEditAnswer}
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      გაუქმება
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7"
                                      onClick={() => saveEditAnswer(result.id)}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      შენახვა
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm space-y-1">
                                  {result.shortenedCorrect && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-green-600 font-medium">სწორი:</span>
                                      <span className="line-through text-muted-foreground text-xs">{result.originalCorrect}</span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-medium">{result.shortenedCorrect}</span>
                                    </div>
                                  )}
                                  {result.shortenedIncorrect.map((shortened, idx) => shortened && (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="text-muted-foreground text-xs">არასწორი {idx + 1}:</span>
                                      <span className="line-through text-muted-foreground text-xs">{result.originalIncorrect[idx]}</span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm">{shortened}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {answerResults.length === 0 && answerProgress.status === 'idle' && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">დააჭირეთ "შემოკლება" გრძელი პასუხების AI შემოკლებისთვის</p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </TabsContent>

          {/* Icon Assignment Tab */}
          <TabsContent value="icons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  აიკონების ავტო-მინიჭება
                </CardTitle>
                <CardDescription>
                  AI ანალიზის საშუალებით კითხვებს ავტომატურად მიენიჭება შესაბამისი აიკონები
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats Display */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {iconStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : iconStats.total}
                    </div>
                    <div className="text-xs text-muted-foreground">სულ კითხვა</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {iconStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : iconStats.withIcons}
                    </div>
                    <div className="text-xs text-muted-foreground">აიკონით</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">
                      {iconStats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : iconStats.withoutIcons}
                    </div>
                    <div className="text-xs text-muted-foreground">აიკონის გარეშე</div>
                  </div>
                </div>

                {/* Batch Processing Status */}
                {iconProgress.status === 'running' && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        ბათჩი #{iconProgress.batchNumber} მუშავდება...
                      </div>
                      {iconProgress.estimatedTimeRemaining && (
                        <span className="text-xs text-muted-foreground">
                          დარჩა: {iconProgress.estimatedTimeRemaining}
                        </span>
                      )}
                    </div>
                    {iconProgress.rateLimited && (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Rate limit - ველოდებით...
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>კატეგორია</Label>
                    <Select value={iconCategoryId} onValueChange={setIconCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ კატეგორია" />
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

                  <div className="flex gap-2">
                    {iconProgress.status === 'idle' && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => startIconAssignment(true)} 
                          disabled={iconStats.withoutIcons === 0}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          ტესტი (10)
                        </Button>
                        <Button onClick={() => startIconAssignment(false)} disabled={iconStats.withoutIcons === 0}>
                          <Play className="h-4 w-4 mr-2" />
                          ყველა ({iconStats.withoutIcons})
                        </Button>
                      </>
                    )}
                    {iconProgress.status === 'running' && (
                      <Button variant="outline" onClick={pauseIconAssignment}>
                        <Pause className="h-4 w-4 mr-2" />
                        პაუზა
                      </Button>
                    )}
                    {iconProgress.status === 'paused' && (
                      <Button onClick={resumeIconAssignment}>
                        <Play className="h-4 w-4 mr-2" />
                        გაგრძელება
                      </Button>
                    )}
                    {(iconProgress.status === 'completed' || iconProgress.status === 'paused') && (
                      <Button variant="ghost" onClick={resetIconAssignment}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        თავიდან
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress */}
                {iconProgress.total > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>პროგრესი: {iconProgress.processed} / {iconProgress.total}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {iconProgress.assigned}
                        </span>
                        <span className="flex items-center gap-1 text-amber-500">
                          <XCircle className="h-4 w-4" />
                          {iconProgress.failed}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          დარჩა: {iconProgress.remaining}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={iconProgress.total > 0 ? ((iconProgress.total - iconProgress.remaining) / iconProgress.total) * 100 : 0} 
                      className="h-2"
                    />
                    {iconProgress.status === 'running' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        5x პარალელური დამუშავება...
                      </div>
                    )}
                  </div>
                )}

                {/* Batch Results */}
                {batchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <Label>ბათჩების შედეგები:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {batchResults.slice(-10).map((batch) => (
                        <div
                          key={batch.batchNumber}
                          className="p-2 rounded-lg border bg-muted/50 text-xs"
                        >
                          <span className="font-medium">ბათჩი #{batch.batchNumber}:</span>{' '}
                          <span className="text-green-600">{batch.assigned}</span>/{batch.processed}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Long Questions Tab */}
          <TabsContent value="length" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Text className="h-5 w-5" />
                  გრძელი კითხვების სკანერი
                </CardTitle>
                <CardDescription>
                  მოძებნეთ კითხვები რომლებიც აღემატება {minLength} სიმბოლოს
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>კატეგორია</Label>
                    <Select value={longQCategoryId} onValueChange={setLongQCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="აირჩიეთ კატეგორია" />
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

                  <div className="w-32 space-y-2">
                    <Label>მინ. სიგრძე</Label>
                    <Select 
                      value={minLength.toString()} 
                      onValueChange={(v) => setMinLength(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50+</SelectItem>
                        <SelectItem value="70">70+</SelectItem>
                        <SelectItem value="100">100+</SelectItem>
                        <SelectItem value="150">150+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={scanLongQuestions} disabled={scanningLong}>
                    {scanningLong ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        სკანირება...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        სკანირება
                      </>
                    )}
                  </Button>
                </div>

                {/* Results */}
                {longQuestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>შედეგები ({longQuestions.length})</Label>
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {longQuestions.length} გრძელი კითხვა
                      </Badge>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {longQuestions.map((q) => (
                        <div
                          key={q.id}
                          className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryName(q.category_id)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {q.length} სიმბოლო
                            </Badge>
                          </div>
                          <p className="text-sm">{q.question_text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {longQuestions.length === 0 && !scanningLong && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Text className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">დააჭირეთ სკანირებას გრძელი კითხვების მოსაძებნად</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
