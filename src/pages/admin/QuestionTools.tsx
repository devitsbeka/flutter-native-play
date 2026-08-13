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
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminCategories } from '@/hooks/useAdminCategories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CombinedShortener from '@/components/admin/CombinedShortener';

interface LongQuestion {
  id: string;
  question_text: string;
  category_id: string;
  length: number;
  shorten_status: string | null;
  /** The shortened rewrite waiting to go live, if the shortener produced one. */
  pending_question_text: string | null;
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

  // Long Questions Functions
  // Publishing a pending rewrite. The original is kept in
  // original_question_text — the shortener already stores it — so a bad
  // rewrite can be put back rather than being a one-way edit to live content.
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);

  const publishPending = async (q: LongQuestion) => {
    if (!q.pending_question_text) return;
    setPublishingId(q.id);
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          question_text: q.pending_question_text,
          original_question_text: q.question_text,
          pending_question_text: null,
          shorten_status: 'shortened',
        })
        .eq('id', q.id);
      if (error) throw error;

      setLongQuestions((prev) => prev.filter((row) => row.id !== q.id));
      toast({ title: 'გამოქვეყნდა', description: q.pending_question_text });
    } catch (error) {
      console.error('Publish failed:', error);
      toast({ title: 'ვერ გამოქვეყნდა', variant: 'destructive' });
    } finally {
      setPublishingId(null);
    }
  };

  const publishAllPending = async () => {
    const ready = longQuestions.filter((q) => q.pending_question_text);
    if (ready.length === 0) return;
    setPublishingAll(true);
    let done = 0;
    try {
      // Sequential rather than parallel: these are writes to live content and
      // a partial failure should stop where it stopped, not scatter.
      for (const q of ready) {
        const { error } = await supabase
          .from('questions')
          .update({
            question_text: q.pending_question_text,
            original_question_text: q.question_text,
            pending_question_text: null,
            shorten_status: 'shortened',
          })
          .eq('id', q.id);
        if (error) throw error;
        done += 1;
      }
      setLongQuestions((prev) => prev.filter((q) => !q.pending_question_text));
      toast({ title: 'გამოქვეყნდა', description: `${done} კითხვა` });
    } catch (error) {
      console.error('Bulk publish failed:', error);
      toast({
        title: 'შეჩერდა',
        description: `გამოქვეყნდა ${done}/${ready.length}`,
        variant: 'destructive',
      });
    } finally {
      setPublishingAll(false);
    }
  };

  const scanLongQuestions = async () => {
    setScanningLong(true);
    setLongQuestions([]);

    try {
      let query = supabase
        .from('questions')
        // pending_question_text is the whole point of the review queue: the
        // shortener writes its rewrite there and marks the row
        // pending_review. Nothing ever read it back, so every one of those
        // rewrites sat unused while the long original stayed in production.
        .select('id, question_text, category_id, shorten_status, pending_question_text')
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
            <CombinedShortener categories={categories} />
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
                    <div className="flex items-center justify-between gap-2">
                      <Label>შედეგები ({longQuestions.length})</Label>
                      <div className="flex items-center gap-2">
                        {/* How many of these already have a rewrite waiting.
                            Publishing them costs nothing and needs no AI — the
                            work was done and then stranded. */}
                        {longQuestions.some((q) => q.pending_question_text) && (
                          <Button
                            size="sm"
                            className="h-7"
                            disabled={publishingAll || !!publishingId}
                            onClick={publishAllPending}
                          >
                            {publishingAll ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            {`გამოქვეყნდეს ყველა (${longQuestions.filter((q) => q.pending_question_text).length})`}
                          </Button>
                        )}
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {longQuestions.length} გრძელი კითხვა
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {longQuestions.map((q) => (
                        <div
                          key={q.id}
                          className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getCategoryName(q.category_id)}
                              </Badge>
                              {q.shorten_status === 'pending_review' && (
                                <Badge className="text-xs bg-blue-500">📝 მოლოდინში</Badge>
                              )}
                              {q.shorten_status === 'shortened' && (
                                <Badge className="text-xs bg-green-500">✅ შემოკლდა</Badge>
                              )}
                              {q.shorten_status === 'unshortenable' && (
                                <Badge variant="destructive" className="text-xs">❌ შეუმოკლებადი</Badge>
                              )}
                              {!q.shorten_status && (
                                <Badge variant="secondary" className="text-xs">🔴 დასამუშავებელი</Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {q.length} სიმბოლო
                            </Badge>
                          </div>
                          <p className="text-sm">{q.question_text}</p>

                          {/* The rewrite the shortener already produced. It
                              was written to the database and never shown
                              anywhere, so the long original stayed live. */}
                          {q.pending_question_text && (
                            <div className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 p-2 dark:bg-emerald-950/20">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <Badge className="bg-emerald-600 text-xs">
                                  {q.pending_question_text.length} სიმბოლო
                                </Badge>
                                <Button
                                  size="sm"
                                  className="h-7"
                                  disabled={publishingId === q.id || publishingAll}
                                  onClick={() => publishPending(q)}
                                >
                                  {publishingId === q.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    'გამოქვეყნება'
                                  )}
                                </Button>
                              </div>
                              <p className="text-sm">{q.pending_question_text}</p>
                            </div>
                          )}
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
