import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KeywordSource {
  keyword: string;
  transliterated: string;
  source: 'question_georgian' | 'question_english' | 'answer_georgian' | 'answer_english' | 'quoted';
}

export interface IconSuggestion {
  slug: string;
  title: string;
  icon_url: string | null;
  score: number;
  matchReason: string;
  matchedKeyword: string;
}

export interface SuggestionResult {
  keywords: KeywordSource[];
  suggestions: IconSuggestion[];
  totalMatches: number;
}

export const useIconSuggestions = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(async (
    questionText: string,
    correctAnswer?: string,
    questionId?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('suggest-icons', {
        body: {
          question_text: questionText,
          correct_answer: correctAnswer,
          question_id: questionId
        }
      });

      if (fnError) throw fnError;

      setResult(data as SuggestionResult);
      return data as SuggestionResult;
    } catch (err: any) {
      console.error('Error getting icon suggestions:', err);
      setError(err.message || 'Failed to get suggestions');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    loading,
    result,
    error,
    getSuggestions,
    clearSuggestions
  };
};
