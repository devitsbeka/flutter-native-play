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
  sourceMode?: 'last-added' | 'all';
  language?: string;
}

export interface ReviewSummary {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface ResolveProgress {
  current: number;
  total: number;
  currentQuestion?: string;
}

export function useQuestionQualityReview() {
  const [reviewing, setReviewing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [resolveProgress, setResolveProgress] = useState<ResolveProgress>({ current: 0, total: 0 });
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ A: 0, B: 0, C: 0, D: 0 });
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

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
      if (options.language && options.language !== 'all') {
        countQuery = countQuery.eq('language', options.language);
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
          .order('created_at', { ascending: false })
          .range(offset, offset + currentBatchSize - 1);

        if (options.categoryId) {
          fetchQuery = fetchQuery.eq('category_id', options.categoryId);
        }
        if (options.onlyProduction) {
          fetchQuery = fetchQuery.eq('in_production', true);
        }
        if (options.language && options.language !== 'all') {
          fetchQuery = fetchQuery.eq('language', options.language);
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
      
      // Get the results being moved to update summary
      const movedResults = results.filter(r => questionIds.includes(r.id));
      
      // Remove moved questions from results
      setResults(prev => prev.filter(r => !questionIds.includes(r.id)));
      
      // Update summary counts
      setSummary(prev => ({
        A: prev.A - movedResults.filter(r => r.grade === 'A').length,
        B: prev.B - movedResults.filter(r => r.grade === 'B').length,
        C: prev.C - movedResults.filter(r => r.grade === 'C').length,
        D: prev.D - movedResults.filter(r => r.grade === 'D').length,
      }));
    } catch (error) {
      console.error('Move to library error:', error);
      toast.error('Failed to move questions to library. Make sure you have admin permissions.');
    }
  }, [results]);

  const resolveQuestions = useCallback(async (questionIds: string[]) => {
    if (questionIds.length === 0) {
      toast.error('No questions selected');
      return;
    }

    setResolving(true);
    setResolveProgress({ current: 0, total: questionIds.length });

    try {
      // Get review data for selected questions
      const questionsToResolve = results.filter(r => questionIds.includes(r.id));
      
      // Process one at a time to show progress
      const resolvedResults: ReviewResult[] = [];
      const failedIds: string[] = [];

      for (let i = 0; i < questionsToResolve.length; i++) {
        const question = questionsToResolve[i];
        setResolveProgress({ 
          current: i, 
          total: questionsToResolve.length,
          currentQuestion: question.question_text.substring(0, 50) + '...'
        });

        try {
          const { data, error } = await supabase.functions.invoke('resolve-question-quality', {
            body: {
              questionId: question.id,
              reviewData: {
                grammar_issues: question.grammar_issues,
                uniqueness_issues: question.uniqueness_issues,
                confusion_issues: question.confusion_issues,
                recommendations: question.recommendations,
              },
            },
          });

          if (error) {
            console.error(`Failed to resolve ${question.id}:`, error);
            failedIds.push(question.id);
            continue;
          }

          if (data?.success && data?.newReview) {
            resolvedResults.push(data.newReview);
          }
        } catch (err) {
          console.error(`Error resolving ${question.id}:`, err);
          failedIds.push(question.id);
        }
      }

      setResolveProgress({ current: questionsToResolve.length, total: questionsToResolve.length });

      // Update results with resolved questions and track resolved IDs
      if (resolvedResults.length > 0) {
        // Add to resolved IDs set
        setResolvedIds(prev => {
          const newSet = new Set(prev);
          resolvedResults.forEach(r => newSet.add(r.id));
          return newSet;
        });

        setResults(prev => {
          const updated = [...prev];
          resolvedResults.forEach(resolved => {
            const idx = updated.findIndex(r => r.id === resolved.id);
            if (idx !== -1) {
              updated[idx] = resolved;
            }
          });
          return updated;
        });

        // Recalculate summary
        setResults(currentResults => {
          const newSummary = {
            A: currentResults.filter(r => r.grade === 'A').length,
            B: currentResults.filter(r => r.grade === 'B').length,
            C: currentResults.filter(r => r.grade === 'C').length,
            D: currentResults.filter(r => r.grade === 'D').length,
          };
          setSummary(newSummary);
          return currentResults;
        });

        toast.success(`Resolved ${resolvedResults.length} questions`);
      }

      if (failedIds.length > 0) {
        toast.error(`Failed to resolve ${failedIds.length} questions`);
      }
    } catch (error) {
      console.error('Resolve error:', error);
      toast.error('Failed to resolve questions');
    } finally {
      setResolving(false);
      setResolveProgress({ current: 0, total: 0 });
    }
  }, [results]);

  const loadSavedIssues = useCallback(async (options: ReviewOptions) => {
    setReviewing(true);
    setResults([]);
    setSummary({ A: 0, B: 0, C: 0, D: 0 });

    try {
      let query = supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers, ai_review_data, ai_review_grade, ai_review_score')
        .eq('is_active', true)
        .in('ai_review_grade', ['B', 'C', 'D'])
        .order('created_at', { ascending: false });

      if (options.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }
      if (options.onlyProduction) {
        query = query.eq('in_production', true);
      }
      if (options.language && options.language !== 'all') {
        query = query.eq('language', options.language);
      }

      const queryLimit = options.sourceMode === 'all' ? 1000 : (options.limit || 50);
      query = query.limit(queryLimit);

      const { data, error } = await query;

      if (error) throw error;

      const mappedResults: ReviewResult[] = (data || []).map((q) => {
        const reviewData = (q.ai_review_data as Record<string, any>) || {};
        const incorrectAnswers = Array.isArray(q.incorrect_answers)
          ? (q.incorrect_answers as string[])
          : [];

        return {
          id: q.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: incorrectAnswers,
          overall_score: q.ai_review_score || 0,
          grade: (q.ai_review_grade || 'D') as ReviewResult['grade'],
          grammar_score: reviewData.grammar_score ?? 100,
          grammar_issues: reviewData.grammar_issues ?? [],
          uniqueness_score: reviewData.uniqueness_score ?? 100,
          uniqueness_issues: reviewData.uniqueness_issues ?? [],
          confusion_score: reviewData.confusion_score ?? 100,
          confusion_issues: reviewData.confusion_issues ?? [],
          recommendations: reviewData.recommendations ?? [],
        };
      });

      setResults(mappedResults);
      setSummary({
        A: mappedResults.filter(r => r.grade === 'A').length,
        B: mappedResults.filter(r => r.grade === 'B').length,
        C: mappedResults.filter(r => r.grade === 'C').length,
        D: mappedResults.filter(r => r.grade === 'D').length,
      });

      toast.success(`Loaded ${mappedResults.length} questions with issues`);
    } catch (error) {
      console.error('Load saved issues error:', error);
      toast.error('Failed to load saved issues');
    } finally {
      setReviewing(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setSummary({ A: 0, B: 0, C: 0, D: 0 });
    setProgress({ current: 0, total: 0 });
    setResolvedIds(new Set());
  }, []);

  return {
    reviewing,
    resolving,
    progress,
    resolveProgress,
    results,
    summary,
    resolvedIds,
    startReview,
    loadSavedIssues,
    moveToLibrary,
    resolveQuestions,
    clearResults,
  };
}
