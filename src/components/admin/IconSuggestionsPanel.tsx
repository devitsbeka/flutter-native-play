import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Tag, Check, Lightbulb, ArrowRight, Link2, AlertCircle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useIconSuggestions, KeywordSource, IconSuggestion } from '@/hooks/useIconSuggestions';
import { useSimilarQuestions, SimilarQuestion } from '@/hooks/useSimilarQuestions';
import { toast } from "@/lib/toast";

interface QuestionData {
  id: string;
  question_text: string;
  correct_answer?: string;
  icon_slug?: string | null;
}

interface IconSuggestionsPanelProps {
  question: QuestionData | null;
  onAssignIcon: (slug: string) => void;
  getIconUrl: (slug: string) => string | null;
  onRefresh?: () => void;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  'question_georgian': { label: 'კითხვა (ქარ)', color: 'bg-blue-500/20 text-blue-400' },
  'question_english': { label: 'კითხვა (eng)', color: 'bg-green-500/20 text-green-400' },
  'answer_georgian': { label: 'პასუხი (ქარ)', color: 'bg-purple-500/20 text-purple-400' },
  'answer_english': { label: 'პასუხი (eng)', color: 'bg-yellow-500/20 text-yellow-400' },
  'quoted': { label: 'ციტატა', color: 'bg-cyan-500/20 text-cyan-400' },
};

export function IconSuggestionsPanel({ 
  question, 
  onAssignIcon, 
  getIconUrl,
  onRefresh
}: IconSuggestionsPanelProps) {
  const { loading, result, getSuggestions, clearSuggestions } = useIconSuggestions();
  const { 
    loading: loadingSimilar, 
    similarQuestions, 
    propagating,
    findSimilar, 
    propagateIcon,
    clearSimilar 
  } = useSimilarQuestions();
  const [lastQuestionId, setLastQuestionId] = useState<string | null>(null);

  // Auto-fetch suggestions when question changes
  useEffect(() => {
    if (question && question.id !== lastQuestionId) {
      setLastQuestionId(question.id);
      getSuggestions(question.question_text, question.correct_answer, question.id);
      findSimilar(question.id, question.question_text, 0.4);
    } else if (!question) {
      clearSuggestions();
      clearSimilar();
      setLastQuestionId(null);
    }
  }, [question, lastQuestionId, getSuggestions, clearSuggestions, findSimilar, clearSimilar]);

  // Handle propagating icon to similar questions
  const handleApplyToSimilar = async () => {
    if (!question?.icon_slug || similarQuestions.length === 0) return;

    const targetIds = similarQuestions
      .filter(sq => sq.icon_slug !== question.icon_slug)
      .map(sq => sq.id);

    if (targetIds.length === 0) {
      toast.info('ყველა მსგავს კითხვას უკვე აქვს ეს აიკონი');
      return;
    }

    const result = await propagateIcon(
      question.id,
      question.icon_slug,
      targetIds,
      0.4
    );

    if (result.success) {
      toast.success(`აიკონი მინიჭებულია ${result.updated} მსგავს კითხვას`);
      onRefresh?.();
      // Refresh similar questions
      findSimilar(question.id, question.question_text, 0.4);
    } else {
      toast.error('შეცდომა აიკონის მინიჭებისას');
    }
  };

  if (!question) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
        აირჩიეთ კითხვა შეთავაზებების სანახავად
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">ანალიზი...</span>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const { keywords, suggestions } = result;

  // Filter out useless keywords (only show ones with real translations, not raw phonetic)
  const usefulKeywords = keywords.filter(kw => 
    kw.keyword !== kw.transliterated || // Has real translation
    kw.source === 'question_english' || // English words are always useful
    kw.source === 'answer_english' ||
    suggestions.some(s => s.matchedKeyword === kw.transliterated) // Matched something
  );

  // Group keywords by source
  const keywordsBySource = usefulKeywords.reduce((acc, kw) => {
    if (!acc[kw.source]) acc[kw.source] = [];
    acc[kw.source].push(kw);
    return acc;
  }, {} as Record<string, KeywordSource[]>);

  // Filter similar questions that have different icons
  const questionsToUpdate = similarQuestions.filter(
    sq => sq.icon_slug !== question.icon_slug
  );

  return (
    <div className="max-h-[250px] overflow-y-auto border-t border-border/30 bg-gradient-to-b from-primary/5 to-transparent">
      {/* Keywords Section - Collapsible */}
      <Collapsible className="border-b border-border/20">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-primary/5 transition-colors">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">ამოღებული საკვანძო სიტყვები</span>
            {keywords.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {keywords.length}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3">
          {keywords.length === 0 ? (
            <p className="text-xs text-muted-foreground">სიტყვები ვერ მოიძებნა</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(keywordsBySource).map(([source, kws]) => (
                <div key={source} className="flex flex-wrap items-center gap-1">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded",
                    SOURCE_LABELS[source]?.color || 'bg-muted'
                  )}>
                    {SOURCE_LABELS[source]?.label || source}
                  </span>
                  {kws.slice(0, 5).map((kw, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs">
                      <span className="text-foreground/80">{kw.keyword}</span>
                      {kw.keyword !== kw.transliterated && (
                        <>
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-primary font-medium">{kw.transliterated}</span>
                        </>
                      )}
                      {idx < Math.min(kws.length - 1, 4) && <span className="text-muted-foreground">,</span>}
                    </div>
                  ))}
                  {kws.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">+{kws.length - 5} სხვა</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Suggestions Section - Collapsible */}
      <Collapsible className="border-b border-border/20">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-3 hover:bg-amber-500/5 transition-colors">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-500">შეთავაზებული აიკონები</span>
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {suggestions.length}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-3">
          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">შეთავაზებები ვერ მოიძებნა</p>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {suggestions.map((suggestion) => {
                  const isCurrentIcon = question.icon_slug === suggestion.slug;
                  const iconUrl = suggestion.icon_url || getIconUrl(suggestion.slug);
                  
                  return (
                    <button
                      key={suggestion.slug}
                      onClick={() => !isCurrentIcon && onAssignIcon(suggestion.slug)}
                      disabled={isCurrentIcon}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all",
                        isCurrentIcon 
                          ? "bg-green-500/20 border border-green-500/50 cursor-default"
                          : "bg-background/50 hover:bg-background border border-transparent hover:border-primary/30"
                      )}
                    >
                      {/* Icon Preview */}
                      <div className="w-8 h-8 rounded bg-background flex items-center justify-center shrink-0 shadow-sm">
                        {iconUrl ? (
                          <img src={iconUrl} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <div className="w-6 h-6 bg-muted rounded" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium truncate">{suggestion.slug}</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] h-4 px-1",
                              suggestion.score >= 90 ? "border-green-500 text-green-500" :
                              suggestion.score >= 70 ? "border-amber-500 text-amber-500" :
                              "border-muted-foreground text-muted-foreground"
                            )}
                          >
                            {suggestion.score}%
                          </Badge>
                          {isCurrentIcon && (
                            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {suggestion.matchReason}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Similar Questions Section - Hidden */}
    </div>
  );
}
