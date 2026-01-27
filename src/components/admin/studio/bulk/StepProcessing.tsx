import { useState, useEffect, useRef } from 'react';
import { Check, X, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ResolvedTopic } from './StepTopicValidation';
import { QuestionType } from '@/hooks/useQuestionStudio';

interface ParsedItem {
  slug: string;
  title: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export interface GeneratedQuestion {
  subject: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string;
  video_url?: string;
  audio_url?: string;
}

interface StepProcessingProps {
  topics: ResolvedTopic[];
  questionType: QuestionType;
  onBack: () => void;
  onComplete: (questions: GeneratedQuestion[]) => void;
}

const BATCH_SIZE = 3;
const DELAY_BETWEEN_BATCHES = 1000;

export function StepProcessing({ topics, questionType, onBack, onComplete }: StepProcessingProps) {
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'parsing' | 'generating' | 'done' | 'error'>('parsing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    startProcessing();
    return () => {
      abortRef.current = true;
    };
  }, []);

  const startProcessing = async () => {
    abortRef.current = false;
    
    // Initialize items
    const initialItems: ParsedItem[] = topics.map(t => ({
      slug: t.slug!,
      title: t.title || t.keyword,
      content: '',
      status: 'pending'
    }));
    setItems(initialItems);

    // Process in batches
    const results: ParsedItem[] = [...initialItems];
    
    for (let i = 0; i < topics.length; i += BATCH_SIZE) {
      if (abortRef.current) return;
      
      const batch = topics.slice(i, i + BATCH_SIZE);
      
      // Mark as processing
      batch.forEach((_, idx) => {
        const itemIndex = i + idx;
        if (results[itemIndex]) {
          results[itemIndex].status = 'processing';
        }
      });
      setItems([...results]);

      // Parse each in batch
      const batchPromises = batch.map(async (topic, batchIdx) => {
        const itemIndex = i + batchIdx;
        try {
          const { data, error } = await supabase.functions.invoke('parse-wikipedia-media', {
            body: {
              url: topic.wikiUrl,
              questionType
            }
          });

          if (error) throw error;
          
          if (data?.success) {
            results[itemIndex] = {
              ...results[itemIndex],
              content: data.content || '',
              imageUrl: data.mediaUrl,
              audioUrl: data.mediaType === 'audio' ? data.mediaUrl : undefined,
              status: 'success'
            };
          } else {
            results[itemIndex].status = 'error';
            results[itemIndex].error = data?.error || 'Unknown error';
          }
        } catch (err: any) {
          results[itemIndex].status = 'error';
          results[itemIndex].error = err.message || 'Parse failed';
        }
      });

      await Promise.all(batchPromises);
      setItems([...results]);
      setProgress(Math.round(((i + BATCH_SIZE) / topics.length) * 50));

      // Rate limit delay
      if (i + BATCH_SIZE < topics.length) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
      }
    }

    // Generate questions
    if (abortRef.current) return;
    setStage('generating');
    setProgress(60);

    const successfulItems = results.filter(r => r.status === 'success');
    
    if (successfulItems.length === 0) {
      setStage('error');
      setErrorMessage('ვერცერთი გვერდი ვერ დამუშავდა');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('bulk-generate-contextual-questions', {
        body: {
          items: successfulItems.map(item => ({
            title: item.title,
            content: item.content.slice(0, 2000), // Limit content size
            imageUrl: item.imageUrl,
            audioUrl: item.audioUrl
          })),
          questionType,
          language: 'ka'
        }
      });

      if (error) throw error;

      setProgress(100);
      setStage('done');

      if (data?.questions) {
        onComplete(data.questions);
      } else {
        setStage('error');
        setErrorMessage('კითხვების გენერაცია ვერ მოხერხდა');
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setStage('error');
      setErrorMessage(err.message || 'კითხვების გენერაცია ვერ მოხერხდა');
    }
  };

  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const processingCount = items.filter(i => i.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">
            {stage === 'parsing' && 'გვერდების დამუშავება...'}
            {stage === 'generating' && 'კითხვების გენერაცია...'}
            {stage === 'done' && 'დასრულდა!'}
            {stage === 'error' && 'შეცდომა'}
          </h3>
          <span className="text-sm text-muted-foreground">
            {progress}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="text-green-500">✓ {successCount}</span>
          <span className="text-destructive">✗ {errorCount}</span>
          {processingCount > 0 && (
            <span className="text-primary">⏳ {processingCount}</span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {stage === 'error' && errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}

      {/* Items List */}
      <ScrollArea className="h-[350px] border rounded-lg">
        <div className="p-2 space-y-1">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg",
                item.status === 'processing' && "bg-primary/5",
                item.status === 'error' && "bg-destructive/5"
              )}
            >
              {/* Status Icon */}
              <div className="shrink-0">
                {item.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-muted" />
                )}
                {item.status === 'processing' && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                {item.status === 'success' && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                {item.status === 'error' && (
                  <X className="h-5 w-5 text-destructive" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.title}</p>
                {item.status === 'success' && item.imageUrl && (
                  <p className="text-xs text-green-600">სურათი მოიძებნა</p>
                )}
                {item.status === 'error' && (
                  <p className="text-xs text-destructive">{item.error}</p>
                )}
              </div>

              {/* Thumbnail */}
              {item.imageUrl && item.status === 'success' && (
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="w-10 h-10 rounded object-cover shrink-0"
                />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onBack} disabled={stage === 'parsing' || stage === 'generating'}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          უკან
        </Button>
        {stage === 'error' && (
          <Button onClick={startProcessing}>
            თავიდან ცდა
          </Button>
        )}
      </div>
    </div>
  );
}
