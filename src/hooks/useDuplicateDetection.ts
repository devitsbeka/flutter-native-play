import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DuplicateResult {
  questionText: string;
  existingId: string;
  similarity: number;
  existingQuestion: string;
}

export interface DuplicateScanResult {
  totalChecked: number;
  duplicatesFound: number;
  duplicates: DuplicateResult[];
}

// Simple similarity check using normalized Levenshtein-like approach
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?.!,;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }
  
  // Word-based similarity
  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export function useDuplicateDetection() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<DuplicateScanResult | null>(null);
  const { toast } = useToast();

  const checkForDuplicates = useCallback(async (
    questions: { question_text: string }[],
    categoryId?: string,
    similarityThreshold: number = 0.7
  ): Promise<DuplicateScanResult> => {
    setScanning(true);
    setScanResult(null);

    try {
      // Fetch existing questions from database
      let query = supabase
        .from('questions')
        .select('id, question_text, category_id')
        .eq('is_active', true);
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data: existingQuestions, error } = await query;

      if (error) throw error;

      const duplicates: DuplicateResult[] = [];

      for (const newQ of questions) {
        for (const existingQ of existingQuestions || []) {
          const similarity = calculateSimilarity(newQ.question_text, existingQ.question_text);
          
          if (similarity >= similarityThreshold) {
            duplicates.push({
              questionText: newQ.question_text,
              existingId: existingQ.id,
              existingQuestion: existingQ.question_text,
              similarity,
            });
            break; // Only report first match per new question
          }
        }
      }

      const result: DuplicateScanResult = {
        totalChecked: questions.length,
        duplicatesFound: duplicates.length,
        duplicates,
      };

      setScanResult(result);
      return result;
    } catch (err: any) {
      console.error('Error checking duplicates:', err);
      toast({
        title: 'შეცდომა',
        description: 'დუბლიკატების შემოწმება ვერ მოხერხდა',
        variant: 'destructive',
      });
      return { totalChecked: 0, duplicatesFound: 0, duplicates: [] };
    } finally {
      setScanning(false);
    }
  }, [toast]);

  const scanDatabaseForDuplicates = useCallback(async (
    categoryId?: string,
    similarityThreshold: number = 0.8
  ): Promise<DuplicateScanResult> => {
    setScanning(true);
    setScanResult(null);

    try {
      let query = supabase
        .from('questions')
        .select('id, question_text, category_id')
        .eq('is_active', true);
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data: questions, error } = await query;

      if (error) throw error;

      const duplicates: DuplicateResult[] = [];
      const checkedPairs = new Set<string>();

      for (let i = 0; i < (questions || []).length; i++) {
        for (let j = i + 1; j < (questions || []).length; j++) {
          const q1 = questions![i];
          const q2 = questions![j];
          
          const pairKey = [q1.id, q2.id].sort().join('-');
          if (checkedPairs.has(pairKey)) continue;
          checkedPairs.add(pairKey);

          const similarity = calculateSimilarity(q1.question_text, q2.question_text);
          
          if (similarity >= similarityThreshold) {
            duplicates.push({
              questionText: q1.question_text,
              existingId: q2.id,
              existingQuestion: q2.question_text,
              similarity,
            });
          }
        }
      }

      const result: DuplicateScanResult = {
        totalChecked: questions?.length || 0,
        duplicatesFound: duplicates.length,
        duplicates,
      };

      setScanResult(result);

      if (duplicates.length === 0) {
        toast({
          title: 'სკანირება დასრულდა',
          description: 'დუბლიკატები არ მოიძებნა',
        });
      } else {
        toast({
          title: 'სკანირება დასრულდა',
          description: `ნაპოვნია ${duplicates.length} პოტენციური დუბლიკატი`,
          variant: 'destructive',
        });
      }

      return result;
    } catch (err: any) {
      console.error('Error scanning database:', err);
      toast({
        title: 'შეცდომა',
        description: 'მონაცემთა ბაზის სკანირება ვერ მოხერხდა',
        variant: 'destructive',
      });
      return { totalChecked: 0, duplicatesFound: 0, duplicates: [] };
    } finally {
      setScanning(false);
    }
  }, [toast]);

  const clearScanResult = useCallback(() => {
    setScanResult(null);
  }, []);

  return {
    scanning,
    scanResult,
    setScanResult,
    checkForDuplicates,
    scanDatabaseForDuplicates,
    clearScanResult,
  };
}
