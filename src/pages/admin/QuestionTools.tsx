import { useState } from 'react';
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
  RotateCcw
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

interface QuestionWithIcon {
  id: string;
  question_text: string;
  category_id: string;
  icon_slug?: string;
}

interface LongQuestion {
  id: string;
  question_text: string;
  category_id: string;
  length: number;
}

interface IconAssignmentProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
}

export default function QuestionTools() {
  const { categories } = useAdminCategories();
  const { toast } = useToast();
  
  // Icon Assignment State
  const [iconCategoryId, setIconCategoryId] = useState<string>('all');
  const [iconProgress, setIconProgress] = useState<IconAssignmentProgress>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    status: 'idle'
  });
  const [isPaused, setIsPaused] = useState(false);
  const [processedQuestions, setProcessedQuestions] = useState<Array<{
    id: string;
    question: string;
    slugs: string[];
    success: boolean;
  }>>([]);

  // Long Questions State
  const [longQCategoryId, setLongQCategoryId] = useState<string>('all');
  const [longQuestions, setLongQuestions] = useState<LongQuestion[]>([]);
  const [scanningLong, setScanningLong] = useState(false);
  const [minLength, setMinLength] = useState(70);

  // Icon Assignment Functions
  const startIconAssignment = async () => {
    setIsPaused(false);
    setProcessedQuestions([]);
    setIconProgress({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      status: 'running'
    });

    try {
      // Fetch questions WITHOUT icon assignments only (null or empty icon_slug)
      let query = supabase
        .from('questions')
        .select('id, question_text, category_id, icon_slug')
        .eq('is_active', true)
        .or('icon_slug.is.null,icon_slug.eq.');
      
      if (iconCategoryId !== 'all') {
        query = query.eq('category_id', iconCategoryId);
      }

      const { data: questions, error } = await query;

      if (error) throw error;

      if (!questions || questions.length === 0) {
        toast({
          title: 'კითხვები არ მოიძებნა',
          description: 'ყველა კითხვას უკვე აქვს აიკონი მინიჭებული',
        });
        setIconProgress(prev => ({ ...prev, status: 'completed' }));
        return;
      }

      setIconProgress(prev => ({ ...prev, total: questions.length }));

      // Process questions in batches
      for (let i = 0; i < questions.length; i++) {
        // Check if paused
        if (isPaused) {
          setIconProgress(prev => ({ ...prev, status: 'paused' }));
          return;
        }

        const question = questions[i];

        try {
          // Call the AI analyze function
          const { data, error: fnError } = await supabase.functions.invoke('analyze-question-icon', {
            body: { questionText: question.question_text }
          });

          if (fnError) throw fnError;

          const slugs = data?.slugs || [];
          
          // Save icon_slug to database if we got slugs
          if (slugs.length > 0) {
            await supabase
              .from('questions')
              .update({ icon_slug: slugs.join(',') })
              .eq('id', question.id);
          }

          setProcessedQuestions(prev => [...prev, {
            id: question.id,
            question: question.question_text,
            slugs,
            success: slugs.length > 0
          }]);

          setIconProgress(prev => ({
            ...prev,
            processed: prev.processed + 1,
            success: slugs.length > 0 ? prev.success + 1 : prev.success,
            failed: slugs.length === 0 ? prev.failed + 1 : prev.failed
          }));

          // Small delay between requests to avoid rate limiting
          if (i < questions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (err) {
          console.error('Error processing question:', err);
          setProcessedQuestions(prev => [...prev, {
            id: question.id,
            question: question.question_text,
            slugs: [],
            success: false
          }]);
          setIconProgress(prev => ({
            ...prev,
            processed: prev.processed + 1,
            failed: prev.failed + 1
          }));
        }
      }

      setIconProgress(prev => ({ ...prev, status: 'completed' }));
      toast({
        title: 'აიკონების მინიჭება დასრულდა',
        description: `დამუშავდა ${questions.length} კითხვა`,
      });
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
    // Note: In a real implementation, you'd need to track where we left off
    toast({
      title: 'გაგრძელება',
      description: 'პროცესის გასაგრძელებლად ხელახლა დაიწყეთ',
    });
  };

  const resetIconAssignment = () => {
    setIsPaused(false);
    setProcessedQuestions([]);
    setIconProgress({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      status: 'idle'
    });
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
            <p className="text-muted-foreground">აიკონები, დუბლიკატები და ვალიდაცია</p>
          </div>
        </div>

        <Tabs defaultValue="icons" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="icons" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              აიკონების მინიჭება
            </TabsTrigger>
            <TabsTrigger value="length" className="flex items-center gap-2">
              <Text className="h-4 w-4" />
              სიგრძის შემოწმება
            </TabsTrigger>
          </TabsList>

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
                      <Button onClick={startIconAssignment}>
                        <Play className="h-4 w-4 mr-2" />
                        დაწყება
                      </Button>
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
                          {iconProgress.success}
                        </span>
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="h-4 w-4" />
                          {iconProgress.failed}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={(iconProgress.processed / iconProgress.total) * 100} 
                      className="h-2"
                    />
                    {iconProgress.status === 'running' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        მუშავდება...
                      </div>
                    )}
                  </div>
                )}

                {/* Results */}
                {processedQuestions.length > 0 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    <Label>ბოლო დამუშავებული:</Label>
                    {processedQuestions.slice(-10).reverse().map((q) => (
                      <div
                        key={q.id}
                        className={`p-3 rounded-lg border text-sm ${
                          q.success 
                            ? 'border-green-200 bg-green-50 dark:bg-green-950/20' 
                            : 'border-red-200 bg-red-50 dark:bg-red-950/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 flex-1">{q.question}</p>
                          {q.success ? (
                            <Badge variant="secondary" className="shrink-0">
                              {q.slugs.slice(0, 2).join(', ')}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="shrink-0">
                              ვერ მოიძებნა
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
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
