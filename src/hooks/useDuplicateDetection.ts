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

// Optimized text normalization
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?.!,;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract keywords for similarity comparison
function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text);
  return new Set(normalized.split(' ').filter(w => w.length > 2));
}

// Pre-processed question structure for batch comparisons
interface ProcessedQuestion {
  id: string;
  originalText: string;
  normalized: string;
  keywords: Set<string>;
  length: number;
}

/**
 * Optimized similarity calculation using pre-computed values
 * Avoids repeated normalization and keyword extraction
 */
function calculateSimilarityOptimized(
  norm1: string,
  keywords1: Set<string>,
  norm2: string,
  keywords2: Set<string>
): number {
  if (norm1 === norm2) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;
  
  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return shorter / longer;
  }
  
  // Word-based similarity (Jaccard index) with pre-computed sets
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  let intersectionCount = 0;
  for (const word of keywords1) {
    if (keywords2.has(word)) intersectionCount++;
  }
  const unionSize = keywords1.size + keywords2.size - intersectionCount;
  
  return intersectionCount / unionSize;
}

/**
 * Pre-process questions for efficient batch comparison
 */
function preprocessQuestions(questions: { id: string; question_text: string }[]): ProcessedQuestion[] {
  return questions.map(q => ({
    id: q.id,
    originalText: q.question_text,
    normalized: normalizeText(q.question_text),
    keywords: extractKeywords(q.question_text),
    length: q.question_text.length
  }));
}

/**
 * Paginated fetch to bypass Supabase's 1000-row default limit
 */
async function fetchAllQuestions(categoryId?: string): Promise<{ id: string; question_text: string; category_id: string }[]> {
  const PAGE_SIZE = 1000;
  let allData: { id: string; question_text: string; category_id: string }[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('questions')
      .select('id, question_text, category_id')
      .eq('is_active', true);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await query.range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = allData.concat(data);
    }

    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    }
    page++;
  }

  return allData;
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
      // Fetch ALL existing questions using paginated fetch
      const existingQuestions = await fetchAllQuestions(categoryId);

      // Pre-process existing questions - O(n)
      const processedExisting = preprocessQuestions(
        (existingQuestions || []).map(q => ({ id: q.id, question_text: q.question_text }))
      );

      const duplicates: DuplicateResult[] = [];
      const lengthFilterThreshold = similarityThreshold * 0.5;

      // Pre-process new questions
      for (const newQ of questions) {
        const newNormalized = normalizeText(newQ.question_text);
        const newKeywords = extractKeywords(newQ.question_text);
        const newLength = newQ.question_text.length;

        for (const existingQ of processedExisting) {
          // Early exit: length-based filtering
          const lengthRatio = Math.min(newLength, existingQ.length) / Math.max(newLength, existingQ.length);
          if (lengthRatio < lengthFilterThreshold) continue;

          const similarity = calculateSimilarityOptimized(
            newNormalized,
            newKeywords,
            existingQ.normalized,
            existingQ.keywords
          );
          
          if (similarity >= similarityThreshold) {
            duplicates.push({
              questionText: newQ.question_text,
              existingId: existingQ.id,
              existingQuestion: existingQ.originalText,
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

      // Pre-process all questions once - O(n)
      const processed = preprocessQuestions(
        (questions || []).map(q => ({ id: q.id, question_text: q.question_text }))
      );

      const duplicates: DuplicateResult[] = [];
      const checkedPairs = new Set<string>();
      const lengthFilterThreshold = similarityThreshold * 0.5;

      // O(n²) comparisons but with optimizations
      for (let i = 0; i < processed.length; i++) {
        const q1 = processed[i];
        
        for (let j = i + 1; j < processed.length; j++) {
          const q2 = processed[j];
          
          const pairKey = `${q1.id}-${q2.id}`;
          if (checkedPairs.has(pairKey)) continue;
          checkedPairs.add(pairKey);

          // Early exit: length-based filtering
          const lengthRatio = Math.min(q1.length, q2.length) / Math.max(q1.length, q2.length);
          if (lengthRatio < lengthFilterThreshold) continue;

          // Use pre-computed values for similarity
          const similarity = calculateSimilarityOptimized(
            q1.normalized,
            q1.keywords,
            q2.normalized,
            q2.keywords
          );
          
          if (similarity >= similarityThreshold) {
            duplicates.push({
              questionText: q1.originalText,
              existingId: q2.id,
              existingQuestion: q2.originalText,
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
