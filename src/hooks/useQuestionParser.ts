import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ParsedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  level_number: number;
  isValid: boolean;
  warnings: string[];
}

// Character limits for UI display
export const CHAR_LIMITS = {
  question: { max: 150, warn: 120 },
  answer: { max: 60, warn: 50 },
};

export function validateQuestion(q: Partial<ParsedQuestion>): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let isValid = true;

  // Check question length
  if (q.question_text) {
    if (q.question_text.length > CHAR_LIMITS.question.max) {
      warnings.push(`კითხვა ძალიან გრძელია (${q.question_text.length}/${CHAR_LIMITS.question.max})`);
      isValid = false;
    } else if (q.question_text.length > CHAR_LIMITS.question.warn) {
      warnings.push(`კითხვა გრძელია (${q.question_text.length}/${CHAR_LIMITS.question.max})`);
    }
  } else {
    warnings.push('კითხვა ცარიელია');
    isValid = false;
  }

  // Check correct answer length
  if (q.correct_answer) {
    if (q.correct_answer.length > CHAR_LIMITS.answer.max) {
      warnings.push(`სწორი პასუხი ძალიან გრძელია (${q.correct_answer.length}/${CHAR_LIMITS.answer.max})`);
      isValid = false;
    } else if (q.correct_answer.length > CHAR_LIMITS.answer.warn) {
      warnings.push(`სწორი პასუხი გრძელია (${q.correct_answer.length}/${CHAR_LIMITS.answer.max})`);
    }
  } else {
    warnings.push('სწორი პასუხი ცარიელია');
    isValid = false;
  }

  // Check incorrect answers
  if (q.incorrect_answers && q.incorrect_answers.length > 0) {
    q.incorrect_answers.forEach((ans, idx) => {
      if (ans.length > CHAR_LIMITS.answer.max) {
        warnings.push(`პასუხი ${idx + 1} ძალიან გრძელია (${ans.length}/${CHAR_LIMITS.answer.max})`);
        isValid = false;
      } else if (ans.length > CHAR_LIMITS.answer.warn) {
        warnings.push(`პასუხი ${idx + 1} გრძელია (${ans.length}/${CHAR_LIMITS.answer.max})`);
      }
    });

    if (q.incorrect_answers.length !== 3) {
      warnings.push(`საჭიროა 3 არასწორი პასუხი (მიმდინარე: ${q.incorrect_answers.length})`);
      isValid = false;
    }
  } else {
    warnings.push('არასწორი პასუხები ცარიელია');
    isValid = false;
  }

  return { isValid, warnings };
}

export function useQuestionParser() {
  const [parsing, setParsing] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const { toast } = useToast();

  const parseFromUrl = async (url: string): Promise<ParsedQuestion[]> => {
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-quiz-url', {
        body: { url },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'გვერდის დამუშავება ვერ მოხერხდა');
      }

      const questions = (data.questions || []).map((q: any) => {
        const validation = validateQuestion(q);
        return {
          ...q,
          difficulty: q.difficulty || 'medium',
          level_number: q.level_number || 1,
          ...validation,
        };
      });

      setParsedQuestions(questions);
      return questions;
    } catch (err: any) {
      console.error('Error parsing URL:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'URL-ის დამუშავება ვერ მოხერხდა',
        variant: 'destructive',
      });
      return [];
    } finally {
      setParsing(false);
    }
  };

  const parseFromText = async (text: string): Promise<ParsedQuestion[]> => {
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-text-content', {
        body: { text },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'ტექსტის დამუშავება ვერ მოხერხდა');
      }

      const questions = (data.questions || []).map((q: any) => {
        const validation = validateQuestion(q);
        return {
          ...q,
          difficulty: q.difficulty || 'medium',
          level_number: q.level_number || 1,
          ...validation,
        };
      });

      setParsedQuestions(questions);
      return questions;
    } catch (err: any) {
      console.error('Error parsing text:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'ტექსტის დამუშავება ვერ მოხერხდა',
        variant: 'destructive',
      });
      return [];
    } finally {
      setParsing(false);
    }
  };

  const parseFromJson = (jsonString: string): ParsedQuestion[] => {
    try {
      const data = JSON.parse(jsonString);
      const items = Array.isArray(data) ? data : [data];

      const questions = items.map((item: any) => {
        // Support both simple and full formats
        const q: Partial<ParsedQuestion> = {
          question_text: item.question_text || item.question || '',
          correct_answer: item.correct_answer || item.correct || '',
          incorrect_answers: item.incorrect_answers || item.wrong || [],
          difficulty: item.difficulty || 'medium',
          level_number: item.level_number || item.level || 1,
        };

        const validation = validateQuestion(q);
        return { ...q, ...validation } as ParsedQuestion;
      });

      setParsedQuestions(questions);
      return questions;
    } catch (err: any) {
      toast({
        title: 'შეცდომა',
        description: 'არასწორი JSON ფორმატი',
        variant: 'destructive',
      });
      return [];
    }
  };

  const parseFromCsv = (csvString: string): ParsedQuestion[] => {
    try {
      const lines = csvString.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV უნდა შეიცავდეს სათაურს და მინიმუმ ერთ მწკრივს');
      }

      // Skip header row
      const dataLines = lines.slice(1);

      const questions = dataLines.map((line) => {
        // Handle CSV with quoted fields
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const q: Partial<ParsedQuestion> = {
          question_text: values[0] || '',
          correct_answer: values[1] || '',
          incorrect_answers: [values[2] || '', values[3] || '', values[4] || ''].filter(Boolean),
          difficulty: (values[5] as 'easy' | 'medium' | 'hard') || 'medium',
          level_number: parseInt(values[6]) || 1,
        };

        const validation = validateQuestion(q);
        return { ...q, ...validation } as ParsedQuestion;
      });

      setParsedQuestions(questions);
      return questions;
    } catch (err: any) {
      toast({
        title: 'შეცდომა',
        description: err.message || 'არასწორი CSV ფორმატი',
        variant: 'destructive',
      });
      return [];
    }
  };

  const clearParsedQuestions = () => {
    setParsedQuestions([]);
  };

  const updateQuestion = (index: number, updates: Partial<ParsedQuestion>) => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[index], ...updates };
      const validation = validateQuestion(q);
      updated[index] = { ...q, ...validation };
      return updated;
    });
  };

  const removeQuestion = (index: number) => {
    setParsedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    parsing,
    parsedQuestions,
    parseFromUrl,
    parseFromText,
    parseFromJson,
    parseFromCsv,
    clearParsedQuestions,
    updateQuestion,
    removeQuestion,
    CHAR_LIMITS,
  };
}
