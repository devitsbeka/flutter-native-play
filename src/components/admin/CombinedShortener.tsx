import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  Trash2,
  Pencil,
  Save,
  X,
  RotateCcw,
  Globe,
  Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CombinedResult {
  id: string;
  // Question
  originalQuestion: string;
  shortenedQuestion: string | null;
  questionLength: number;
  newQuestionLength: number | null;
  questionStatus: 'shortened' | 'unshortenable' | 'ok' | 'pending';
  // Answers
  originalCorrect: string;
  shortenedCorrect: string | null;
  originalIncorrect: string[];
  shortenedIncorrect: (string | null)[];
  answerStatus: 'shortened' | 'partially_shortened' | 'unshortenable' | 'ok' | 'pending';
  // Combined
  overallStatus: 'shortened' | 'partially' | 'unshortenable' | 'failed';
}

interface CombinedProgress {
  total: number;
  processed: number;
  shortened: number;
  unshortenable: number;
  failed: number;
  remaining: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  batchNumber: number;
}

interface CombinedStats {
  total: number;
  needsWork: number;
  pendingReview: number;
  needsRewrite: number;
  alreadyProcessed: number;
  loading: boolean;
}

interface PendingQuestion {
  id: string;
  question_text: string;
  pending_question_text: string | null;
  correct_answer: string;
  pending_correct_answer: string | null;
  incorrect_answers: string[];
  pending_incorrect_answers: string[] | null;
  shorten_status: string | null;
  answer_shorten_status: string | null;
}

interface EditedValues {
  questionText?: string;
  correctAnswer?: string;
  incorrectAnswers?: string[];
}

const MAX_QUESTION_LENGTH = 67;
const MAX_ANSWER_LENGTH = 20;

interface CombinedShortenerProps {
  categories: Category[];
}

export default function CombinedShortener({ categories }: CombinedShortenerProps) {
  const { toast } = useToast();
  
  const [categoryId, setCategoryId] = useState<string>('all');
  const [inProduction, setInProduction] = useState<boolean>(false);
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [aggressiveMode, setAggressiveMode] = useState<boolean>(false);
  const [needsRewriteQuestions, setNeedsRewriteQuestions] = useState<PendingQuestion[]>([]);
  const [loadingNeedsRewrite, setLoadingNeedsRewrite] = useState(false);
  const [progress, setProgress] = useState<CombinedProgress>({
    total: 0,
    processed: 0,
    shortened: 0,
    unshortenable: 0,
    failed: 0,
    remaining: 0,
    status: 'idle',
    batchNumber: 0
  });
  const [results, setResults] = useState<CombinedResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<CombinedStats>({
    total: 0,
    needsWork: 0,
    pendingReview: 0,
    needsRewrite: 0,
    alreadyProcessed: 0,
    loading: false
  });
  
  // Pending review state
  const [viewMode, setViewMode] = useState<'shorten' | 'pending'>('shorten');
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<EditedValues>({});

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      setStats(prev => ({ ...prev, loading: true }));
      
      try {
        let query = supabase
          .from('questions')
          .select('id, question_text, correct_answer, incorrect_answers, shorten_status, answer_shorten_status, in_production')
          .eq('is_active', true);
        
        if (categoryId !== 'all') {
          query = query.eq('category_id', categoryId);
        }

        const { data: questions } = await query;
        
        if (!questions) {
          setStats(prev => ({ ...prev, loading: false }));
          return;
        }

        const targetQuestions = questions.filter(q => 
          inProduction ? q.in_production : !q.in_production
        );
        
        // Questions needing work: long question OR long answers, not yet processed
        const needsWork = targetQuestions.filter(q => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers) 
            ? q.incorrect_answers as string[]
            : [];
          const questionTooLong = q.question_text.length > MAX_QUESTION_LENGTH && !q.shorten_status;
          const correctTooLong = q.correct_answer.length > MAX_ANSWER_LENGTH;
          const anyIncorrectTooLong = incorrectAnswers.some(a => a.length > MAX_ANSWER_LENGTH);
          const answersTooLong = (correctTooLong || anyIncorrectTooLong) && !q.answer_shorten_status;
          return questionTooLong || answersTooLong;
        });
        
        // Questions pending review - have shortened versions waiting
        const pendingReview = targetQuestions.filter(q => 
          q.shorten_status === 'pending_review' || q.answer_shorten_status === 'pending_review'
        );
        
        const alreadyProcessed = targetQuestions.filter(q => 
          q.shorten_status === 'shortened' || q.answer_shorten_status === 'shortened'
        );
        
        setStats({
          total: targetQuestions.length,
          needsWork: needsWork.length,
          pendingReview: pendingReview.length,
          alreadyProcessed: alreadyProcessed.length,
          loading: false
        });
      } catch (err) {
        console.error('Error loading stats:', err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, [categoryId, inProduction, progress.status]);

  const startShortening = async (testMode = false) => {
    setIsPaused(false);
    setResults([]);
    setSelectedResults(new Set());
    
    setProgress({
      total: testMode ? 5 : stats.needsWork,
      processed: 0,
      shortened: 0,
      unshortenable: 0,
      failed: 0,
      remaining: testMode ? 5 : stats.needsWork,
      status: 'running',
      batchNumber: 0
    });

    let batchNum = 0;
    let shouldContinue = true;
    let allResults: CombinedResult[] = [];

    try {
      // Call both question and answer shortening
      while (shouldContinue && !isPaused) {
        batchNum++;
        
        // Call shorten-questions
        const { data: qData, error: qError } = await supabase.functions.invoke('shorten-questions', {
          body: { 
            categoryId: categoryId === 'all' ? null : categoryId,
            testMode,
            inProduction
          }
        });

        if (qError) {
          console.error('Question shorten error:', qError);
        }

        // Call shorten-answers
        const { data: aData, error: aError } = await supabase.functions.invoke('shorten-answers', {
          body: { 
            categoryId: categoryId === 'all' ? null : categoryId,
            testMode,
            inProduction
          }
        });

        if (aError) {
          console.error('Answer shorten error:', aError);
        }

        // Merge results by question ID
        const questionResults = qData?.results || [];
        const answerResults = aData?.results || [];
        
        // Create a map for quick lookup
        const resultMap = new Map<string, CombinedResult>();
        
        for (const qr of questionResults) {
          resultMap.set(qr.id, {
            id: qr.id,
            originalQuestion: qr.original,
            shortenedQuestion: qr.shortened,
            questionLength: qr.originalLength,
            newQuestionLength: qr.newLength,
            questionStatus: qr.status,
            originalCorrect: '',
            shortenedCorrect: null,
            originalIncorrect: [],
            shortenedIncorrect: [],
            answerStatus: 'ok',
            overallStatus: qr.status === 'shortened' ? 'shortened' : qr.status === 'unshortenable' ? 'unshortenable' : 'failed'
          });
        }
        
        for (const ar of answerResults) {
          if (resultMap.has(ar.id)) {
            const existing = resultMap.get(ar.id)!;
            existing.originalCorrect = ar.originalCorrect;
            existing.shortenedCorrect = ar.shortenedCorrect;
            existing.originalIncorrect = ar.originalIncorrect;
            existing.shortenedIncorrect = ar.shortenedIncorrect;
            existing.answerStatus = ar.status;
            // Update overall status
            if (existing.questionStatus === 'shortened' && ar.status === 'shortened') {
              existing.overallStatus = 'shortened';
            } else if (existing.questionStatus === 'shortened' || ar.status === 'shortened' || ar.status === 'partially_shortened') {
              existing.overallStatus = 'partially';
            } else if (existing.questionStatus === 'unshortenable' && ar.status === 'unshortenable') {
              existing.overallStatus = 'unshortenable';
            }
          } else {
            resultMap.set(ar.id, {
              id: ar.id,
              originalQuestion: ar.questionText,
              shortenedQuestion: null,
              questionLength: ar.questionText.length,
              newQuestionLength: null,
              questionStatus: 'ok',
              originalCorrect: ar.originalCorrect,
              shortenedCorrect: ar.shortenedCorrect,
              originalIncorrect: ar.originalIncorrect,
              shortenedIncorrect: ar.shortenedIncorrect,
              answerStatus: ar.status,
              overallStatus: ar.status === 'shortened' ? 'shortened' : ar.status === 'partially_shortened' ? 'partially' : ar.status === 'unshortenable' ? 'unshortenable' : 'failed'
            });
          }
        }

        const newResults = Array.from(resultMap.values());
        allResults = [...allResults, ...newResults];
        setResults(allResults);

        const bothDone = (qData?.done || qData?.remaining === 0 || qError) && 
                         (aData?.done || aData?.remaining === 0 || aError);
        
        if (bothDone || testMode) {
          shouldContinue = false;
        }

        setProgress({
          total: testMode ? allResults.length : stats.needsWork,
          processed: allResults.length,
          shortened: allResults.filter(r => r.overallStatus === 'shortened').length,
          unshortenable: allResults.filter(r => r.overallStatus === 'unshortenable').length,
          failed: allResults.filter(r => r.overallStatus === 'failed').length,
          remaining: Math.max(qData?.remaining || 0, aData?.remaining || 0),
          status: shouldContinue ? 'running' : 'completed',
          batchNumber: batchNum
        });

        if (!testMode && shouldContinue) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!isPaused) {
        setProgress(prev => ({ ...prev, status: 'completed' }));
        toast({
          title: testMode ? 'ტესტი დასრულდა! ✅' : 'შემოკლება დასრულდა! 🎉',
          description: `დამუშავდა ${allResults.length} კითხვა`,
        });
      }
    } catch (err) {
      console.error('Shorten error:', err);
      toast({
        title: 'შეცდომა',
        description: 'შემოკლება ვერ მოხერხდა',
        variant: 'destructive',
      });
      setProgress(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const pauseShortening = () => {
    setIsPaused(true);
    setProgress(prev => ({ ...prev, status: 'paused' }));
  };

  const resetShortening = () => {
    setIsPaused(false);
    setResults([]);
    setSelectedResults(new Set());
    setProgress({
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

  const toggleSelection = (id: string) => {
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
    const shortenedIds = results
      .filter(r => r.overallStatus === 'shortened' || r.overallStatus === 'partially')
      .map(r => r.id);
    setSelectedResults(new Set(shortenedIds));
  };

  const pushSelectedToProd = async () => {
    if (selectedResults.size === 0) return;

    try {
      // Get the pending values for selected questions
      const { data: pendingQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('id, pending_question_text, pending_correct_answer, pending_incorrect_answers')
        .in('id', Array.from(selectedResults));

      if (fetchError) throw fetchError;

      // Update each question - copy pending to actual
      for (const q of pendingQuestions || []) {
        const updates: Record<string, unknown> = {
          in_production: true,
          pending_question_text: null,
          pending_correct_answer: null,
          pending_incorrect_answers: null
        };

        if (q.pending_question_text) {
          updates.question_text = q.pending_question_text;
          updates.shorten_status = 'shortened';
        }
        if (q.pending_correct_answer) {
          updates.correct_answer = q.pending_correct_answer;
          updates.answer_shorten_status = 'shortened';
        }
        if (q.pending_incorrect_answers) {
          updates.incorrect_answers = q.pending_incorrect_answers;
          updates.answer_shorten_status = 'shortened';
        }

        await supabase
          .from('questions')
          .update(updates)
          .eq('id', q.id);
      }

      toast({
        title: 'წარმატება! ✅',
        description: `${selectedResults.size} კითხვა გადავიდა პროდაქშენში`,
      });

      setResults(prev => prev.filter(r => !selectedResults.has(r.id)));
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

      setResults(prev => prev.filter(r => r.id !== id));
      setSelectedResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      console.error('Delete error:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive',
      });
    }
  };

  const startEdit = (result: CombinedResult) => {
    setEditingId(result.id);
    setEditedValues({
      questionText: result.shortenedQuestion || result.originalQuestion,
      correctAnswer: result.shortenedCorrect || result.originalCorrect,
      incorrectAnswers: result.shortenedIncorrect.map((s, idx) => 
        s || result.originalIncorrect[idx]
      )
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedValues({});
  };

  const saveEdit = async (id: string) => {
    try {
      const updates: Record<string, unknown> = {};
      
      if (editedValues.questionText) {
        updates.pending_question_text = editedValues.questionText;
      }
      if (editedValues.correctAnswer) {
        updates.pending_correct_answer = editedValues.correctAnswer;
      }
      if (editedValues.incorrectAnswers) {
        updates.pending_incorrect_answers = editedValues.incorrectAnswers;
      }

      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setResults(prev => prev.map(r => 
        r.id === id 
          ? { 
              ...r, 
              shortenedQuestion: editedValues.questionText || r.shortenedQuestion,
              newQuestionLength: editedValues.questionText?.length || r.newQuestionLength,
              shortenedCorrect: editedValues.correctAnswer || r.shortenedCorrect,
              shortenedIncorrect: editedValues.incorrectAnswers || r.shortenedIncorrect
            }
          : r
      ));

      toast({
        title: 'შენახულია',
      });

      setEditingId(null);
      setEditedValues({});
    } catch (err) {
      console.error('Save edit error:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive',
      });
    }
  };

  const hideUnshortenable = async () => {
    const unshortenableIds = results
      .filter(r => r.overallStatus === 'unshortenable')
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

      setResults(prev => prev.filter(r => r.overallStatus !== 'unshortenable'));
    } catch (err) {
      console.error('Hide error:', err);
      toast({
        title: 'შეცდომა',
        variant: 'destructive',
      });
    }
  };

  // Load pending review questions
  const loadPendingQuestions = async () => {
    setLoadingPending(true);
    try {
      let query = supabase
        .from('questions')
        .select('id, question_text, pending_question_text, correct_answer, pending_correct_answer, incorrect_answers, pending_incorrect_answers, shorten_status, answer_shorten_status')
        .eq('is_active', true)
        .or('shorten_status.eq.pending_review,answer_shorten_status.eq.pending_review');
      
      if (categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }
      
      if (!inProduction) {
        query = query.eq('in_production', false);
      } else {
        query = query.eq('in_production', true);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      setPendingQuestions((data || []).map(q => ({
        ...q,
        incorrect_answers: Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [],
        pending_incorrect_answers: Array.isArray(q.pending_incorrect_answers) ? q.pending_incorrect_answers as string[] : null
      })));
    } catch (err) {
      console.error('Error loading pending questions:', err);
      toast({
        title: 'შეცდომა',
        description: 'მოლოდინის კითხვების ჩატვირთვა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setLoadingPending(false);
    }
  };

  // Approve pending question
  const approvePending = async (id: string) => {
    try {
      const question = pendingQuestions.find(q => q.id === id);
      if (!question) return;

      const updates: Record<string, unknown> = {
        pending_question_text: null,
        pending_correct_answer: null,
        pending_incorrect_answers: null
      };

      if (question.pending_question_text) {
        updates.question_text = question.pending_question_text;
        updates.shorten_status = 'shortened';
      }
      if (question.pending_correct_answer) {
        updates.correct_answer = question.pending_correct_answer;
        updates.answer_shorten_status = 'shortened';
      }
      if (question.pending_incorrect_answers) {
        updates.incorrect_answers = question.pending_incorrect_answers;
        updates.answer_shorten_status = 'shortened';
      }

      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'დადასტურებულია ✅' });
      setPendingQuestions(prev => prev.filter(q => q.id !== id));
      // Refresh stats
      setStats(prev => ({
        ...prev,
        pendingReview: prev.pendingReview - 1,
        alreadyProcessed: prev.alreadyProcessed + 1
      }));
    } catch (err) {
      console.error('Approve error:', err);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  // Approve all selected pending
  const approveAllPending = async () => {
    for (const id of selectedResults) {
      await approvePending(id);
    }
    setSelectedResults(new Set());
  };

  // Reject pending (mark as needs reprocess)
  const rejectPending = async (id: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          shorten_status: null,
          answer_shorten_status: null,
          pending_question_text: null,
          pending_correct_answer: null,
          pending_incorrect_answers: null
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'უარყოფილია - ხელახლა დასამუშავებელი' });
      setPendingQuestions(prev => prev.filter(q => q.id !== id));
      setStats(prev => ({
        ...prev,
        pendingReview: prev.pendingReview - 1,
        needsWork: prev.needsWork + 1
      }));
    } catch (err) {
      console.error('Reject error:', err);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          კომბინირებული AI შემოკლება
        </CardTitle>
        <CardDescription>
          AI ავტომატურად შეამოკლებს კითხვებს ({MAX_QUESTION_LENGTH} სიმბოლომდე) და პასუხებს ({MAX_ANSWER_LENGTH} სიმბოლომდე)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Display */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div 
            className={`text-center cursor-pointer p-2 rounded-lg transition-colors ${viewMode === 'shorten' ? '' : ''}`}
          >
            <div className="text-2xl font-bold text-foreground">
              {stats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : stats.total}
            </div>
            <div className="text-xs text-muted-foreground">
              {inProduction ? 'In Prod' : 'In Lib'}
            </div>
          </div>
          <div 
            className={`text-center cursor-pointer p-2 rounded-lg transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30 ${viewMode === 'shorten' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setViewMode('shorten')}
          >
            <div className="text-2xl font-bold text-amber-500">
              {stats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : stats.needsWork}
            </div>
            <div className="text-xs text-muted-foreground">შესამოკლებელი</div>
          </div>
          <div 
            className={`text-center cursor-pointer p-2 rounded-lg transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30 ${viewMode === 'pending' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => { setViewMode('pending'); loadPendingQuestions(); }}
          >
            <div className="text-2xl font-bold text-blue-500">
              {stats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : stats.pendingReview}
            </div>
            <div className="text-xs text-muted-foreground">📝 მოლოდინში</div>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl font-bold text-green-500">
              {stats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : stats.alreadyProcessed}
            </div>
            <div className="text-xs text-muted-foreground">დამუშავებული</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] space-y-2">
            <Label>კატეგორია</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
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
              value={inProduction ? 'prod' : 'lib'} 
              onValueChange={(v) => setInProduction(v === 'prod')}
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
            {progress.status === 'idle' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => startShortening(true)} 
                  disabled={stats.needsWork === 0}
                >
                  <Play className="h-4 w-4 mr-2" />
                  ტესტი (5)
                </Button>
                <Button 
                  onClick={() => startShortening(false)} 
                  disabled={stats.needsWork === 0}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  შემოკლება ({stats.needsWork})
                </Button>
              </>
            )}
            {progress.status === 'running' && (
              <Button variant="outline" onClick={pauseShortening}>
                <Pause className="h-4 w-4 mr-2" />
                პაუზა
              </Button>
            )}
            {(progress.status === 'completed' || progress.status === 'paused') && (
              <Button variant="ghost" onClick={resetShortening}>
                <RotateCcw className="h-4 w-4 mr-2" />
                თავიდან
              </Button>
            )}
          </div>
        </div>

        {/* View Mode Content */}
        {viewMode === 'shorten' ? (
          <>
            {/* Progress */}
            {progress.total > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>პროგრესი: {progress.processed} / {progress.total}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {progress.shortened}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="h-4 w-4" />
                      {progress.unshortenable}
                    </span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="h-4 w-4" />
                      {progress.failed}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={progress.total > 0 ? (progress.processed / progress.total) * 100 : 0} 
                  className="h-2"
                />
                {progress.status === 'running' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    ბათჩი #{progress.batchNumber} მუშავდება...
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>შედეგები ({results.length})</Label>
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
                    {results.some(r => r.overallStatus === 'unshortenable') && (
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
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={`p-4 rounded-lg border ${
                        result.overallStatus === 'shortened' 
                          ? 'border-green-200 bg-green-50 dark:bg-green-950/20' 
                          : result.overallStatus === 'partially'
                          ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                          : result.overallStatus === 'unshortenable'
                          ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                          : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {(result.overallStatus === 'shortened' || result.overallStatus === 'partially') && (
                          <Checkbox
                            checked={selectedResults.has(result.id)}
                            onCheckedChange={() => toggleSelection(result.id)}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant={
                                  result.overallStatus === 'shortened' ? 'default' : 
                                  result.overallStatus === 'partially' ? 'secondary' :
                                  result.overallStatus === 'unshortenable' ? 'destructive' : 'outline'
                                }
                                className="text-xs"
                              >
                                {result.overallStatus === 'shortened' ? 'შემოკლდა' : 
                                 result.overallStatus === 'partially' ? 'ნაწილობრივ' :
                                 result.overallStatus === 'unshortenable' ? 'შეუმოკლებადი' : 'შეცდომა'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              {(result.overallStatus === 'shortened' || result.overallStatus === 'partially') && editingId !== result.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => startEdit(result)}
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

                          {editingId === result.id ? (
                            /* Edit Mode */
                            <div className="space-y-4">
                              {/* Question Edit */}
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-violet-600">კითხვა:</label>
                                <Input
                                  value={editedValues.questionText || ''}
                                  onChange={(e) => setEditedValues(prev => ({ ...prev, questionText: e.target.value }))}
                                  className="text-sm"
                                />
                                <span className={`text-xs ${(editedValues.questionText?.length || 0) > MAX_QUESTION_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  {editedValues.questionText?.length || 0}/{MAX_QUESTION_LENGTH} სიმბოლო
                                </span>
                              </div>
                              
                              {/* Correct Answer Edit */}
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-green-600">სწორი პასუხი:</label>
                                <Input
                                  value={editedValues.correctAnswer || ''}
                                  onChange={(e) => setEditedValues(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                  className="text-sm"
                                />
                                <span className={`text-xs ${(editedValues.correctAnswer?.length || 0) > MAX_ANSWER_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  {editedValues.correctAnswer?.length || 0}/{MAX_ANSWER_LENGTH} სიმბოლო
                                </span>
                              </div>
                              
                              {/* Incorrect Answers Edit */}
                              {editedValues.incorrectAnswers?.map((ans, idx) => (
                                <div key={idx} className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">არასწორი {idx + 1}:</label>
                                  <Input
                                    value={ans}
                                    onChange={(e) => {
                                      const newIncorrect = [...(editedValues.incorrectAnswers || [])];
                                      newIncorrect[idx] = e.target.value;
                                      setEditedValues(prev => ({ ...prev, incorrectAnswers: newIncorrect }));
                                    }}
                                    className="text-sm"
                                  />
                                  <span className={`text-xs ${ans.length > MAX_ANSWER_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    {ans.length}/{MAX_ANSWER_LENGTH} სიმბოლო
                                  </span>
                                </div>
                              ))}
                              
                              <div className="flex justify-end gap-1 pt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  გაუქმება
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7"
                                  onClick={() => saveEdit(result.id)}
                                >
                                  <Save className="h-3 w-3 mr-1" />
                                  შენახვა
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* View Mode */
                            <div className="space-y-3">
                              {/* Question */}
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-violet-600">კითხვა:</label>
                                {result.shortenedQuestion ? (
                                  <div className="text-sm">
                                    <span className="line-through text-muted-foreground text-xs block">{result.originalQuestion}</span>
                                    <span className="flex items-center gap-2 mt-1">
                                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="font-medium">{result.shortenedQuestion}</span>
                                      <span className="text-xs text-muted-foreground">({result.newQuestionLength} სიმბ.)</span>
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">{result.originalQuestion}</div>
                                )}
                              </div>
                              
                              {/* Correct Answer */}
                              {(result.shortenedCorrect || result.originalCorrect) && (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-green-600">სწორი პასუხი:</label>
                                  {result.shortenedCorrect ? (
                                    <div className="text-sm flex items-center gap-2">
                                      <span className="line-through text-muted-foreground text-xs">{result.originalCorrect}</span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-medium">{result.shortenedCorrect}</span>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">{result.originalCorrect}</div>
                                  )}
                                </div>
                              )}
                              
                              {/* Incorrect Answers */}
                              {result.originalIncorrect.length > 0 && (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">არასწორი პასუხები:</label>
                                  <div className="space-y-1">
                                    {result.originalIncorrect.map((original, idx) => (
                                      <div key={idx} className="text-sm">
                                        {result.shortenedIncorrect[idx] ? (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                                            <span className="line-through text-muted-foreground text-xs">{original}</span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">{result.shortenedIncorrect[idx]}</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <span className="text-xs">{idx + 1}.</span>
                                            <span>{original}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.length === 0 && progress.status === 'idle' && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">დააჭირეთ "შემოკლება" კითხვებისა და პასუხების AI შემოკლებისთვის</p>
              </div>
            )}
          </>
        ) : (
          /* Pending Review View */
          <div className="space-y-4">
            {loadingPending ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-muted-foreground mt-2">იტვირთება...</p>
              </div>
            ) : pendingQuestions.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <Label>მოლოდინში ({pendingQuestions.length})</Label>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        const allIds = pendingQuestions.map(q => q.id);
                        setSelectedResults(new Set(allIds));
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      მონიშნე ყველა
                    </Button>
                    {selectedResults.size > 0 && (
                      <Button 
                        size="sm" 
                        onClick={approveAllPending}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        დადასტურება ({selectedResults.size})
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {pendingQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedResults.has(q.id)}
                          onCheckedChange={() => toggleSelection(q.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge className="text-xs bg-blue-500">მოლოდინში</Badge>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-100"
                                onClick={() => approvePending(q.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                დადასტურება
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                                onClick={() => rejectPending(q.id)}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                ხელახლა
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteQuestion(q.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Question comparison */}
                          {q.pending_question_text && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-violet-600">კითხვა:</label>
                              <div className="text-sm">
                                <span className="line-through text-muted-foreground text-xs block">{q.question_text}</span>
                                <span className="flex items-center gap-2 mt-1">
                                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium">{q.pending_question_text}</span>
                                  <span className={`text-xs ${q.pending_question_text.length <= MAX_QUESTION_LENGTH ? 'text-green-600' : 'text-red-500'}`}>
                                    ({q.pending_question_text.length} სიმბ.)
                                  </span>
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Answer comparison */}
                          {q.pending_correct_answer && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-green-600">სწორი პასუხი:</label>
                              <div className="text-sm flex items-center gap-2">
                                <span className="line-through text-muted-foreground text-xs">{q.correct_answer}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{q.pending_correct_answer}</span>
                              </div>
                            </div>
                          )}

                          {/* Incorrect answers comparison */}
                          {q.pending_incorrect_answers && q.pending_incorrect_answers.length > 0 && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">არასწორი პასუხები:</label>
                              <div className="space-y-1">
                                {q.incorrect_answers.map((original, idx) => (
                                  <div key={idx} className="text-sm flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{idx + 1}.</span>
                                    <span className="line-through text-muted-foreground text-xs">{original}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium">{q.pending_incorrect_answers?.[idx] || original}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20 text-green-500" />
                <p className="text-sm">მოლოდინში კითხვები არ არის</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
