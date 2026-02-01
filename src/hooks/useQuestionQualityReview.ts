import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReviewResult {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  grammar_score: number;
  grammar_issues: string[];
  uniqueness_score: number;
  uniqueness_issues: string[];
  confusion_score: number;
  confusion_issues: string[];
  recommendations: string[];
}

export interface ReviewOptions {
  categoryId?: string;
  questionIds?: string[];
  onlyProduction?: boolean;
  limit?: number;
}

export interface ReviewSummary {
  A: number;
  B: number;
  C: number;
  D: number;
}

export function useQuestionQualityReview() {
  const [reviewing, setReviewing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ A: 0, B: 0, C: 0, D: 0 });

  const startReview = useCallback(async (options: ReviewOptions) => {
    setReviewing(true);
    setResults([]);
    setSummary({ A: 0, B: 0, C: 0, D: 0 });

    try {
      // First, count total questions
      let countQuery = supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (options.categoryId) {
        countQuery = countQuery.eq('category_id', options.categoryId);
      }
      if (options.onlyProduction) {
        countQuery = countQuery.eq('in_production', true);
      }

      const { count } = await countQuery;
      const total = Math.min(count || 0, options.limit || 50);
      setProgress({ current: 0, total });

      // Process in smaller batches for progress updates
      const batchSize = 10;
      const allResults: ReviewResult[] = [];
      
      for (let offset = 0; offset < total; offset += batchSize) {
        const currentBatchSize = Math.min(batchSize, total - offset);
        
        // Fetch question IDs for this batch
        let fetchQuery = supabase
          .from('questions')
          .select('id')
          .eq('is_active', true)
          .range(offset, offset + currentBatchSize - 1);

        if (options.categoryId) {
          fetchQuery = fetchQuery.eq('category_id', options.categoryId);
        }
        if (options.onlyProduction) {
          fetchQuery = fetchQuery.eq('in_production', true);
        }

        const { data: questionBatch } = await fetchQuery;
        
        if (!questionBatch || questionBatch.length === 0) break;

        const { data, error } = await supabase.functions.invoke('review-question-quality', {
          body: {
            questionIds: questionBatch.map(q => q.id),
            limit: currentBatchSize,
            saveResults: true,
          },
        });

        if (error) {
          console.error('Review batch error:', error);
          toast.error(`Batch review failed: ${error.message}`);
          continue;
        }

        if (data?.results) {
          allResults.push(...data.results);
          setResults([...allResults]);
          setProgress({ current: allResults.length, total });
        }
      }

      // Calculate final summary
      const finalSummary = {
        A: allResults.filter(r => r.grade === 'A').length,
        B: allResults.filter(r => r.grade === 'B').length,
        C: allResults.filter(r => r.grade === 'C').length,
        D: allResults.filter(r => r.grade === 'D').length,
      };
      setSummary(finalSummary);
      
      toast.success(`Review complete: ${allResults.length} questions analyzed`);
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Failed to complete review');
    } finally {
      setReviewing(false);
    }
  }, []);

  const moveToLibrary = useCallback(async (questionIds: string[]) => {
    if (questionIds.length === 0) {
      toast.error('No questions selected');
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .update({ in_production: false })
        .in('id', questionIds);

      if (error) throw error;

      toast.success(`Moved ${questionIds.length} questions to library`);
      
      // Update local results to reflect the change
      setResults(prev => prev.map(r => 
        questionIds.includes(r.id) 
          ? { ...r, movedToLibrary: true } as ReviewResult & { movedToLibrary: boolean }
          : r
      ));
    } catch (error) {
      console.error('Move to library error:', error);
      toast.error('Failed to move questions to library');
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setSummary({ A: 0, B: 0, C: 0, D: 0 });
    setProgress({ current: 0, total: 0 });
  }, []);

  return {
    reviewing,
    progress,
    results,
    summary,
    startReview,
    moveToLibrary,
    clearResults,
  };
}
