import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SimilarQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  icon_slug: string | null;
  similarity: number;
  category_id: string;
}

export interface PropagationResult {
  sourceQuestion?: string;
  targetQuestion: string;
  targetQuestionId: string;
  oldIcon: string | null;
  newIcon: string;
  similarity: number;
}

export function useSimilarQuestions() {
  const [loading, setLoading] = useState(false);
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([]);
  const [propagating, setPropagating] = useState(false);

  const findSimilar = useCallback(async (
    questionId: string,
    questionText: string,
    threshold: number = 0.4
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-similar-questions', {
        body: { questionId, questionText, threshold, limit: 20 }
      });

      if (error) throw error;

      setSimilarQuestions(data.similarQuestions || []);
      return data.similarQuestions || [];
    } catch (err) {
      console.error('Error finding similar questions:', err);
      setSimilarQuestions([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const propagateIcon = useCallback(async (
    sourceQuestionId: string,
    iconSlug: string,
    targetQuestionIds: string[],
    threshold: number = 0.4
  ): Promise<{ success: boolean; updated: number }> => {
    setPropagating(true);
    try {
      const { data, error } = await supabase.functions.invoke('propagate-icons', {
        body: { 
          mode: 'apply',
          sourceQuestionId,
          iconSlug,
          threshold
        }
      });

      if (error) throw error;

      return { success: true, updated: data.updated || 0 };
    } catch (err) {
      console.error('Error propagating icons:', err);
      return { success: false, updated: 0 };
    } finally {
      setPropagating(false);
    }
  }, []);

  const clearSimilar = useCallback(() => {
    setSimilarQuestions([]);
  }, []);

  return {
    loading,
    similarQuestions,
    propagating,
    findSimilar,
    propagateIcon,
    clearSimilar
  };
}
