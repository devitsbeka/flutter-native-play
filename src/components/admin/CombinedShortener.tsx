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
  Trash2,
  Pencil,
  Save,
  X,
  RotateCcw,
  Globe,
  Zap,
  Undo2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  originalQuestion: string;
  shortenedQuestion: string | null;
  questionLength: number;
  newQuestionLength: number | null;
  questionStatus: 'shortened' | 'unshortenable' | 'ok' | 'failed';
  originalCorrect: string;
  shortenedCorrect: string | null;
  originalIncorrect: string[];
  shortenedIncorrect: (string | null)[];
  answerStatus: 'shortened' | 'partially_shortened' | 'unshortenable' | 'ok' | 'failed';
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
  needsRewrite: number;
  alreadyProcessed: number;
  unshortenable: number;
  loading: boolean;
}

interface NeedsRewriteQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  answer_shorten_status: string | null;
  language: string;
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
  const [inProduction, setInProduction] = useState<boolean>(true);
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [aggressiveMode, setAggressiveMode] = useState<boolean>(false);
  const [needsRewriteQuestions, setNeedsRewriteQuestions] = useState<NeedsRewriteQuestion[]>([]);
  const [statsReloadKey, setStatsReloadKey] = useState(0);
  const [loadingNeedsRewrite, setLoadingNeedsRewrite] = useState(false);
  const [progress, setProgress] = useState<CombinedProgress>({
    total: 0, processed: 0, shortened: 0, unshortenable: 0, failed: 0, remaining: 0, status: 'idle', batchNumber: 0
  });
  const [results, setResults] = useState<CombinedResult[]>([]);
  const [stats, setStats] = useState<CombinedStats>({
    total: 0, needsWork: 0, needsRewrite: 0, alreadyProcessed: 0, unshortenable: 0, loading: false
  });
  
  const [viewMode, setViewMode] = useState<'shorten' | 'needs_rewrite'>('shorten');
  const [isPaused, setIsPaused] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<EditedValues>({});

  // Mixed-language fix state
  const [mixedLangProgress, setMixedLangProgress] = useState<{ status: 'idle' | 'running' | 'done'; fixed: number; skipped: number; remaining: number }>({ status: 'idle', fixed: 0, skipped: 0, remaining: 0 });

  const fixMixedLanguageQuestions = async () => {
    setMixedLangProgress({ status: 'running', fixed: 0, skipped: 0, remaining: 0 });

    try {
      const { data, error } = await supabase.functions.invoke('fix-mixed-language-questions', {
        body: { batchSize: 10 }
      });

      if (error) throw error;

      setMixedLangProgress({ status: 'done', fixed: data.fixed || 0, skipped: data.skipped || 0, remaining: data.remaining || 0 });
      toast({ title: 'Mixed-language fix complete ✅', description: `Fixed: ${data.fixed}, Skipped: ${data.skipped}, Remaining: ${data.remaining}` });
      setStatsReloadKey(prev => prev + 1);
    } catch (err) {
      console.error('Mixed-language fix error:', err);
      toast({ title: 'Error fixing mixed-language questions', variant: 'destructive' });
      setMixedLangProgress(prev => ({ ...prev, status: 'idle' }));
    }
  };

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      setStats(prev => ({ ...prev, loading: true }));
      
      try {
        const PAGE_SIZE = 1000;
        let allQuestions: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from('questions')
            .select('id, question_text, correct_answer, incorrect_answers, shorten_status, answer_shorten_status, in_production, language')
            .eq('is_active', true);
          
          if (categoryId !== 'all') query = query.eq('category_id', categoryId);
          if (languageFilter !== 'all') query = query.eq('language', languageFilter);

          const { data } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
          if (data && data.length > 0) allQuestions.push(...data);
          if (!data || data.length < PAGE_SIZE) hasMore = false;
          page++;
        }

        const targetQuestions = allQuestions.filter(q => inProduction ? q.in_production : !q.in_production);
        
        // Questions needing work: long question OR long answers, not yet processed
        const needsWork = targetQuestions.filter(q => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [];
          const questionTooLong = q.question_text.length > MAX_QUESTION_LENGTH && !q.shorten_status;
          const correctTooLong = q.correct_answer.length > MAX_ANSWER_LENGTH;
          const anyIncorrectTooLong = incorrectAnswers.some((a: string) => a.length > MAX_ANSWER_LENGTH);
          const answersTooLong = (correctTooLong || anyIncorrectTooLong) && !q.answer_shorten_status;
          return questionTooLong || answersTooLong;
        });
        
        const rewriteCount = targetQuestions.filter(q => q.answer_shorten_status === 'needs_rewrite');
        const alreadyProcessed = targetQuestions.filter(q => q.shorten_status === 'shortened' || q.answer_shorten_status === 'shortened');

        const unshortenable = targetQuestions.filter(q => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [];
          const qUnshortenable = q.shorten_status === 'unshortenable' && q.question_text.length > MAX_QUESTION_LENGTH;
          const aUnshortenable = q.answer_shorten_status === 'unshortenable' && (
            q.correct_answer.length > MAX_ANSWER_LENGTH || incorrectAnswers.some((a: string) => a.length > MAX_ANSWER_LENGTH)
          );
          return qUnshortenable || aUnshortenable;
        });
        
        setStats({
          total: targetQuestions.length,
          needsWork: needsWork.length,
          needsRewrite: rewriteCount.length,
          alreadyProcessed: alreadyProcessed.length,
          unshortenable: unshortenable.length,
          loading: false
        });
      } catch (err) {
        console.error('Error loading stats:', err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, [categoryId, inProduction, languageFilter, progress.status, statsReloadKey]);

  const startShortening = async (testMode = false) => {
    setIsPaused(false);
    setResults([]);
    
    setProgress({
      total: testMode ? 5 : stats.needsWork,
      processed: 0, shortened: 0, unshortenable: 0, failed: 0,
      remaining: testMode ? 5 : stats.needsWork,
      status: 'running', batchNumber: 0
    });

    let batchNum = 0;
    let shouldContinue = true;
    let allResults: CombinedResult[] = [];

    try {
      while (shouldContinue && !isPaused) {
        batchNum++;
        
        const { data: qData, error: qError } = await supabase.functions.invoke('shorten-questions', {
          body: { 
            categoryId: categoryId === 'all' ? null : categoryId,
            testMode,
            inProduction,
            language: languageFilter === 'all' ? undefined : languageFilter,
          }
        });

        if (qError) console.error('Question shorten error:', qError);

        const { data: aData, error: aError } = await supabase.functions.invoke('shorten-answers', {
          body: { 
            categoryId: categoryId === 'all' ? null : categoryId,
            testMode,
            inProduction,
            aggressiveMode,
            language: languageFilter === 'all' ? undefined : languageFilter,
          }
        });

        if (aError) console.error('Answer shorten error:', aError);

        // Merge results
        const resultMap = new Map<string, CombinedResult>();
        
        for (const qr of (qData?.results || [])) {
          resultMap.set(qr.id, {
            id: qr.id,
            originalQuestion: qr.original,
            shortenedQuestion: qr.shortened,
            questionLength: qr.originalLength,
            newQuestionLength: qr.newLength,
            questionStatus: qr.status,
            originalCorrect: '', shortenedCorrect: null, originalIncorrect: [], shortenedIncorrect: [],
            answerStatus: 'ok',
            overallStatus: qr.status === 'shortened' ? 'shortened' : qr.status === 'unshortenable' ? 'unshortenable' : 'failed'
          });
        }
        
        for (const ar of (aData?.results || [])) {
          if (resultMap.has(ar.id)) {
            const existing = resultMap.get(ar.id)!;
            existing.originalCorrect = ar.originalCorrect;
            existing.shortenedCorrect = ar.shortenedCorrect;
            existing.originalIncorrect = ar.originalIncorrect;
            existing.shortenedIncorrect = ar.shortenedIncorrect;
            existing.answerStatus = ar.status;
            if (existing.questionStatus === 'shortened' && ar.status === 'shortened') existing.overallStatus = 'shortened';
            else if (existing.questionStatus === 'shortened' || ar.status === 'shortened' || ar.status === 'partially_shortened') existing.overallStatus = 'partially';
            else if (existing.questionStatus === 'unshortenable' && ar.status === 'unshortenable') existing.overallStatus = 'unshortenable';
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
        
        if (bothDone || testMode) shouldContinue = false;

        const currentRemaining = Math.max(qData?.remaining || 0, aData?.remaining || 0);

        setProgress({
          total: Math.max(allResults.length + currentRemaining, allResults.length),
          processed: allResults.length,
          shortened: allResults.filter(r => r.overallStatus === 'shortened').length,
          unshortenable: allResults.filter(r => r.overallStatus === 'unshortenable').length,
          failed: allResults.filter(r => r.overallStatus === 'failed').length,
          remaining: currentRemaining,
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
          description: `დამუშავდა ${allResults.length} კითხვა (${allResults.filter(r => r.overallStatus === 'shortened').length} shortened directly)`,
        });
        setStatsReloadKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('Shorten error:', err);
      toast({ title: 'შეცდომა', description: 'შემოკლება ვერ მოხერხდა', variant: 'destructive' });
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
    setProgress({ total: 0, processed: 0, shortened: 0, unshortenable: 0, failed: 0, remaining: 0, status: 'idle', batchNumber: 0 });
  };

  const undoShorten = async (id: string) => {
    try {
      // Fetch original text
      const { data: q, error: fetchErr } = await supabase
        .from('questions')
        .select('original_question_text')
        .eq('id', id)
        .single();
      
      if (fetchErr || !q?.original_question_text) {
        toast({ title: 'No original text to restore', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('questions')
        .update({ 
          question_text: q.original_question_text, 
          shorten_status: null, 
          original_question_text: null 
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Restored original question ↩️' });
      setResults(prev => prev.filter(r => r.id !== id));
      setStatsReloadKey(prev => prev + 1);
    } catch (err) {
      console.error('Undo error:', err);
      toast({ title: 'Error restoring', variant: 'destructive' });
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase.from('questions').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast({ title: 'კითხვა წაიშალა' });
      setResults(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  const startEdit = (result: CombinedResult) => {
    setEditingId(result.id);
    setEditedValues({
      questionText: result.shortenedQuestion || result.originalQuestion,
      correctAnswer: result.shortenedCorrect || result.originalCorrect,
      incorrectAnswers: result.shortenedIncorrect.map((s, idx) => s || result.originalIncorrect[idx])
    });
  };

  const saveEdit = async (id: string) => {
    try {
      const updates: Record<string, unknown> = {};
      if (editedValues.questionText) updates.question_text = editedValues.questionText;
      if (editedValues.correctAnswer) updates.correct_answer = editedValues.correctAnswer;
      if (editedValues.incorrectAnswers) updates.incorrect_answers = editedValues.incorrectAnswers;

      const { error } = await supabase.from('questions').update(updates).eq('id', id);
      if (error) throw error;

      setResults(prev => prev.map(r => 
        r.id === id ? { ...r, 
          shortenedQuestion: editedValues.questionText || r.shortenedQuestion,
          newQuestionLength: editedValues.questionText?.length || r.newQuestionLength,
          shortenedCorrect: editedValues.correctAnswer || r.shortenedCorrect,
          shortenedIncorrect: editedValues.incorrectAnswers || r.shortenedIncorrect
        } : r
      ));

      toast({ title: 'შენახულია' });
      setEditingId(null);
      setEditedValues({});
    } catch (err) {
      console.error('Save edit error:', err);
      toast({ title: 'შეცდომა', variant: 'destructive' });
    }
  };

  // Load needs_rewrite questions
  const loadNeedsRewriteQuestions = async () => {
    setLoadingNeedsRewrite(true);
    try {
      let query = supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers, answer_shorten_status, language')
        .eq('is_active', true)
        .eq('answer_shorten_status', 'needs_rewrite');
      
      if (categoryId !== 'all') query = query.eq('category_id', categoryId);
      if (languageFilter !== 'all') query = query.eq('language', languageFilter);
      query = query.eq('in_production', inProduction);

      const { data, error } = await query;
      if (error) throw error;
      
      setNeedsRewriteQuestions((data || []).map(q => ({
        ...q,
        incorrect_answers: Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [],
      })));
    } catch (err) {
      console.error('Error loading needs_rewrite questions:', err);
      toast({ title: 'Error loading flagged questions', variant: 'destructive' });
    } finally {
      setLoadingNeedsRewrite(false);
    }
  };

  const deleteNeedsRewriteQuestion = async (id: string) => {
    try {
      const { error } = await supabase.from('questions').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      setNeedsRewriteQuestions(prev => prev.filter(q => q.id !== id));
      setStats(prev => ({ ...prev, needsRewrite: prev.needsRewrite - 1 }));
      toast({ title: 'Question removed' });
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const resetNeedsRewriteQuestion = async (id: string) => {
    try {
      const { error } = await supabase.from('questions').update({ answer_shorten_status: null }).eq('id', id);
      if (error) throw error;
      setNeedsRewriteQuestions(prev => prev.filter(q => q.id !== id));
      setStats(prev => ({ ...prev, needsRewrite: prev.needsRewrite - 1, needsWork: prev.needsWork + 1 }));
      toast({ title: 'Reset for reprocessing' });
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
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
          AI ავტომატურად შეამოკლებს კითხვებს ({MAX_QUESTION_LENGTH} სიმბოლომდე) და პასუხებს ({MAX_ANSWER_LENGTH} სიმბოლომდე) — Direct Apply mode
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Display */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center p-2">
            <div className="text-2xl font-bold text-foreground">
              {stats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : stats.total}
            </div>
            <div className="text-xs text-muted-foreground">{inProduction ? 'In Prod' : 'In Lib'}</div>
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
            className={`text-center cursor-pointer p-2 rounded-lg transition-colors hover:bg-orange-100 dark:hover:bg-orange-900/30 ${viewMode === 'needs_rewrite' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => { setViewMode('needs_rewrite'); loadNeedsRewriteQuestions(); }}
          >
            <div className="text-2xl font-bold text-orange-500">
              {stats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : stats.needsRewrite}
            </div>
            <div className="text-xs text-muted-foreground">⚠️ Needs Rewrite</div>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl font-bold text-red-500">
              {stats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : stats.unshortenable}
            </div>
            <div className="text-xs text-muted-foreground">🚫 Unshortenable</div>
          </div>
          <div className="text-center p-2">
            <div className="text-2xl font-bold text-green-500">
              {stats.loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : stats.alreadyProcessed}
            </div>
            <div className="text-xs text-muted-foreground">დამუშავებული</div>
          </div>
        </div>

        {/* Reset Unshortenable */}
        {stats.unshortenable > 0 && viewMode === 'shorten' && (
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
            <span className="text-sm text-muted-foreground">
              {stats.unshortenable} questions marked unshortenable — reset to retry with AI?
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await supabase
                    .from('questions')
                    .update({ shorten_status: null })
                    .eq('is_active', true)
                    .eq('in_production', inProduction)
                    .eq('shorten_status', 'unshortenable')
                    .match(categoryId !== 'all' ? { category_id: categoryId } : {})
                    .match(languageFilter !== 'all' ? { language: languageFilter } : {});

                  await supabase
                    .from('questions')
                    .update({ answer_shorten_status: null })
                    .eq('is_active', true)
                    .eq('in_production', inProduction)
                    .eq('answer_shorten_status', 'unshortenable')
                    .match(categoryId !== 'all' ? { category_id: categoryId } : {})
                    .match(languageFilter !== 'all' ? { language: languageFilter } : {});

                  toast({ title: 'Unshortenable status reset ✅' });
                  setStatsReloadKey(prev => prev + 1);
                } catch (err) {
                  toast({ title: 'Error resetting', variant: 'destructive' });
                }
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Mixed Language Fix */}
        {viewMode === 'shorten' && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
            <Globe className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              {mixedLangProgress.status === 'running' 
                ? `Fixing... ${mixedLangProgress.fixed} fixed, ${mixedLangProgress.skipped} skipped`
                : mixedLangProgress.status === 'done'
                ? `Done! Fixed ${mixedLangProgress.fixed}, skipped ${mixedLangProgress.skipped}, remaining: ${mixedLangProgress.remaining}`
                : 'Fix Georgian questions with English answers — translate question text to English'
              }
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={fixMixedLanguageQuestions}
              disabled={mixedLangProgress.status === 'running'}
            >
              {mixedLangProgress.status === 'running' ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Globe className="h-3 w-3 mr-1" />
              )}
              {mixedLangProgress.status === 'running' ? 'Fixing...' : 'Fix Mixed Language'}
            </Button>
          </div>
        )}

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
                  <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label><Globe className="h-3 w-3 inline mr-1" />Language</Label>
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="ka">🇬🇪 Georgian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>სტატუსი</Label>
            <Select value={inProduction ? 'prod' : 'lib'} onValueChange={(v) => setInProduction(v === 'prod')}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lib">In Lib</SelectItem>
                <SelectItem value="prod">In Prod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <Switch checked={aggressiveMode} onCheckedChange={setAggressiveMode} />
            <Label className="flex items-center gap-1 text-xs cursor-pointer" onClick={() => setAggressiveMode(!aggressiveMode)}>
              <Zap className="h-3 w-3" />
              Aggressive (13-20)
            </Label>
          </div>

          <div className="flex gap-2">
            {progress.status === 'idle' && (
              <>
                <Button variant="outline" onClick={() => startShortening(true)} disabled={stats.needsWork === 0}>
                  <Play className="h-4 w-4 mr-2" />
                  ტესტი (5)
                </Button>
                <Button onClick={() => startShortening(false)} disabled={stats.needsWork === 0}>
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
                      <CheckCircle className="h-4 w-4" /> {progress.shortened}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="h-4 w-4" /> {progress.unshortenable}
                    </span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="h-4 w-4" /> {progress.failed}
                    </span>
                  </div>
                </div>
                <Progress value={progress.total > 0 ? (progress.processed / progress.total) * 100 : 0} className="h-2" />
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
                <Label>შედეგები ({results.length})</Label>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={`p-4 rounded-lg border ${
                        result.overallStatus === 'shortened' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' 
                        : result.overallStatus === 'partially' ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                        : result.overallStatus === 'unshortenable' ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                        : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant={
                                result.overallStatus === 'shortened' ? 'default' : 
                                result.overallStatus === 'partially' ? 'secondary' :
                                result.overallStatus === 'unshortenable' ? 'destructive' : 'outline'
                              }
                              className="text-xs"
                            >
                              {result.overallStatus === 'shortened' ? '✅ Applied' : 
                               result.overallStatus === 'partially' ? 'ნაწილობრივ' :
                               result.overallStatus === 'unshortenable' ? 'შეუმოკლებადი' : 'შეცდომა'}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {result.overallStatus === 'shortened' && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => undoShorten(result.id)} title="Undo">
                                  <Undo2 className="h-3 w-3" />
                                </Button>
                              )}
                              {editingId !== result.id && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEdit(result)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => deleteQuestion(result.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {editingId === result.id ? (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-violet-600">კითხვა:</label>
                                <Input value={editedValues.questionText || ''} onChange={(e) => setEditedValues(prev => ({ ...prev, questionText: e.target.value }))} className="text-sm" />
                                <span className={`text-xs ${(editedValues.questionText?.length || 0) > MAX_QUESTION_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  {editedValues.questionText?.length || 0}/{MAX_QUESTION_LENGTH}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-green-600">სწორი პასუხი:</label>
                                <Input value={editedValues.correctAnswer || ''} onChange={(e) => setEditedValues(prev => ({ ...prev, correctAnswer: e.target.value }))} className="text-sm" />
                                <span className={`text-xs ${(editedValues.correctAnswer?.length || 0) > MAX_ANSWER_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  {editedValues.correctAnswer?.length || 0}/{MAX_ANSWER_LENGTH}
                                </span>
                              </div>
                              {editedValues.incorrectAnswers?.map((ans, idx) => (
                                <div key={idx} className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">არასწორი {idx + 1}:</label>
                                  <Input value={ans} onChange={(e) => {
                                    const newIncorrect = [...(editedValues.incorrectAnswers || [])];
                                    newIncorrect[idx] = e.target.value;
                                    setEditedValues(prev => ({ ...prev, incorrectAnswers: newIncorrect }));
                                  }} className="text-sm" />
                                  <span className={`text-xs ${ans.length > MAX_ANSWER_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    {ans.length}/{MAX_ANSWER_LENGTH}
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-end gap-1 pt-2">
                                <Button variant="ghost" size="sm" className="h-7" onClick={() => { setEditingId(null); setEditedValues({}); }}>
                                  <X className="h-3 w-3 mr-1" /> გაუქმება
                                </Button>
                                <Button size="sm" className="h-7" onClick={() => saveEdit(result.id)}>
                                  <Save className="h-3 w-3 mr-1" /> შენახვა
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-violet-600">კითხვა:</label>
                                {result.shortenedQuestion ? (
                                  <div className="text-sm">
                                    <span className="line-through text-muted-foreground text-xs block">{result.originalQuestion} ({result.questionLength})</span>
                                    <span className="flex items-center gap-2 mt-1">
                                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="font-medium">{result.shortenedQuestion}</span>
                                      <span className={`text-xs ${(result.newQuestionLength || 0) > MAX_QUESTION_LENGTH ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                        ({result.newQuestionLength}){(result.newQuestionLength || 0) > MAX_QUESTION_LENGTH && ' ⚠️ still too long!'}
                                      </span>
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">{result.originalQuestion} ({result.questionLength})</div>
                                )}
                              </div>
                              
                              {(result.shortenedCorrect || result.originalCorrect) && (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-green-600">სწორი პასუხი:</label>
                                  {result.shortenedCorrect ? (
                                    <div className="text-sm flex items-center gap-2">
                                      <span className="line-through text-muted-foreground text-xs">{result.originalCorrect}</span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-medium">{result.shortenedCorrect}</span>
                                    </div>
                                  ) : result.originalCorrect ? (
                                    <div className="text-sm text-muted-foreground">{result.originalCorrect}</div>
                                  ) : null}
                                </div>
                              )}
                              
                              {result.originalIncorrect.length > 0 && (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium text-muted-foreground">არასწორი პასუხები:</label>
                                  <div className="text-sm space-y-1">
                                    {result.originalIncorrect.map((ans, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        {result.shortenedIncorrect[idx] ? (
                                          <>
                                            <span className="line-through text-muted-foreground text-xs">{ans}</span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">{result.shortenedIncorrect[idx]}</span>
                                          </>
                                        ) : (
                                          <span className="text-muted-foreground">{ans}</span>
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
          </>
        ) : viewMode === 'needs_rewrite' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Needs Rewrite ({needsRewriteQuestions.length})</Label>
              <Button size="sm" variant="outline" onClick={loadNeedsRewriteQuestions} disabled={loadingNeedsRewrite}>
                {loadingNeedsRewrite ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                Refresh
              </Button>
            </div>
            
            {loadingNeedsRewrite ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : needsRewriteQuestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No questions need rewriting</div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {needsRewriteQuestions.map(q => (
                  <div key={q.id} className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-medium">{q.question_text}</div>
                        <div className="text-xs text-muted-foreground">
                          ✅ {q.correct_answer} | ❌ {q.incorrect_answers.join(', ')}
                        </div>
                        <Badge variant="outline" className="text-xs">{q.language === 'ka' ? '🇬🇪' : '🇬🇧'} {q.language}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => resetNeedsRewriteQuestion(q.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Reset
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => deleteNeedsRewriteQuestion(q.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
