import { useState, useEffect } from 'react';
import { Check, X, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface ResolvedTopic {
  keyword: string;
  slug: string | null;
  wikiUrl: string | null;
  valid: boolean;
  title: string | null;
  error?: string;
  selected: boolean;
}

interface StepTopicValidationProps {
  keywords: string[];
  onBack: () => void;
  onNext: (topics: ResolvedTopic[]) => void;
}

export function StepTopicValidation({ keywords, onBack, onNext }: StepTopicValidationProps) {
  const [topics, setTopics] = useState<ResolvedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resolveTopics();
  }, [keywords]);

  const resolveTopics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('bulk-resolve-topics', {
        body: { keywords, language: 'en' }
      });

      if (fnError) throw fnError;

      if (data?.topics) {
        setTopics(data.topics.map((t: any) => ({
          ...t,
          selected: t.valid
        })));
      }
    } catch (err) {
      console.error('Error resolving topics:', err);
      setError('თემების ვალიდაცია ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (index: number) => {
    setTopics(prev => prev.map((t, i) => 
      i === index ? { ...t, selected: !t.selected } : t
    ));
  };

  const selectAll = () => {
    setTopics(prev => prev.map(t => ({ ...t, selected: t.valid })));
  };

  const deselectAll = () => {
    setTopics(prev => prev.map(t => ({ ...t, selected: false })));
  };

  const selectedCount = topics.filter(t => t.selected).length;
  const validCount = topics.filter(t => t.valid).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">იძებნება Wikipedia გვერდები...</p>
        <p className="text-sm text-muted-foreground">{keywords.length} თემა</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button onClick={resolveTopics} variant="outline">
          თავიდან ცდა
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">მოიძებნა {validCount} თემა</h3>
          <p className="text-sm text-muted-foreground">
            აირჩიეთ რომელი თემები დამუშავდეს
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            ყველა
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            არცერთი
          </Button>
        </div>
      </div>

      {/* Topic List */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-2 space-y-1">
          {topics.map((topic, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                topic.valid 
                  ? "hover:bg-accent cursor-pointer" 
                  : "opacity-50 cursor-not-allowed bg-muted/50"
              )}
              onClick={() => topic.valid && toggleTopic(index)}
            >
              <Checkbox
                checked={topic.selected}
                disabled={!topic.valid}
                onCheckedChange={() => topic.valid && toggleTopic(index)}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{topic.keyword}</span>
                  {topic.valid ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                </div>
                {topic.valid ? (
                  <p className="text-sm text-muted-foreground truncate">
                    → {topic.slug}
                  </p>
                ) : (
                  <p className="text-sm text-destructive truncate">
                    {topic.error || 'გვერდი ვერ მოიძებნა'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          უკან
        </Button>
        <div className="text-sm text-muted-foreground">
          არჩეულია: <span className="font-medium text-foreground">{selectedCount}</span> / {validCount}
        </div>
        <Button 
          onClick={() => onNext(topics.filter(t => t.selected))}
          disabled={selectedCount === 0}
        >
          {selectedCount} თემის სკანირება →
        </Button>
      </div>
    </div>
  );
}
