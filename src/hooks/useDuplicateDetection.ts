import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DuplicateResult {
  questionText: string;
  existingId: string;
  similarity: number;
  existingQuestion: string;
  matchType: 'answer' | 'text';
  correctAnswer?: string;
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
  correctAnswer: string;
  categoryId: string;
}

/**
 * Optimized similarity calculation using pre-computed values
 */
function calculateSimilarityOptimized(
  norm1: string,
  keywords1: Set<string>,
  norm2: string,
  keywords2: Set<string>
): number {
  if (norm1 === norm2) return 1;
  if (norm1.length === 0 || norm2.length === 0) return 0;
  
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return shorter / longer;
  }
  
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
function preprocessQuestions(questions: { id: string; question_text: string; correct_answer: string; category_id: string }[]): ProcessedQuestion[] {
  return questions.map(q => ({
    id: q.id,
    originalText: q.question_text,
    normalized: normalizeText(q.question_text),
    keywords: extractKeywords(q.question_text),
    length: q.question_text.length,
    correctAnswer: q.correct_answer,
    categoryId: q.category_id,
  }));
}

/**
 * Paginated fetch to bypass the 1000-row default limit
 */
async function fetchAllQuestions(categoryId?: string): Promise<{ id: string; question_text: string; correct_answer: string; category_id: string }[]> {
  const PAGE_SIZE = 1000;
  let allData: { id: string; question_text: string; correct_answer: string; category_id: string }[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('questions')
      .select('id, question_text, correct_answer, category_id')
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
      const existingQuestions = await fetchAllQuestions(categoryId);

      const processedExisting = preprocessQuestions(existingQuestions);

      const duplicates: DuplicateResult[] = [];
      const lengthFilterThreshold = similarityThreshold * 0.5;

      for (const newQ of questions) {
        const newNormalized = normalizeText(newQ.question_text);
        const newKeywords = extractKeywords(newQ.question_text);
        const newLength = newQ.question_text.length;

        for (const existingQ of processedExisting) {
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
              matchType: 'text',
            });
            break;
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
    similarityThreshold: number = 0.7
  ): Promise<DuplicateScanResult> => {
    setScanning(true);
    setScanResult(null);

    try {
      const questions = await fetchAllQuestions(categoryId);
      const processed = preprocessQuestions(questions);

      const duplicates: DuplicateResult[] = [];

      // ========== LAYER 1: Answer-based matching (O(n)) ==========
      // Group questions by (category_id + normalized correct_answer)
      const answerGroups = new Map<string, ProcessedQuestion[]>();
      for (const q of processed) {
        const normalizedAnswer = q.correctAnswer.toLowerCase().trim();
        // Skip very short answers (likely generic: "კი", "არა", etc.)
        if (normalizedAnswer.length < 3) continue;
        const key = `${q.categoryId}::${normalizedAnswer}`;
        if (!answerGroups.has(key)) {
          answerGroups.set(key, []);
        }
        answerGroups.get(key)!.push(q);
      }

      // Track IDs already flagged via answer match to avoid double-reporting
      const answerMatchedIds = new Set<string>();

      for (const [, group] of answerGroups) {
        if (group.length < 2) continue;
        // Flag all pairs in the group — first question is the "anchor"
        const anchor = group[0];
        for (let i = 1; i < group.length; i++) {
          const dup = group[i];
          duplicates.push({
            questionText: anchor.originalText,
            existingId: dup.id,
            existingQuestion: dup.originalText,
            similarity: 1,
            matchType: 'answer',
            correctAnswer: anchor.correctAnswer,
          });
          answerMatchedIds.add(anchor.id);
          answerMatchedIds.add(dup.id);
        }
      }

      // ========== LAYER 2: Text similarity for remaining questions ==========
      const remaining = processed.filter(q => !answerMatchedIds.has(q.id));
      const lengthFilterThreshold = similarityThreshold * 0.5;

      for (let i = 0; i < remaining.length; i++) {
        const q1 = remaining[i];
        for (let j = i + 1; j < remaining.length; j++) {
          const q2 = remaining[j];

          const lengthRatio = Math.min(q1.length, q2.length) / Math.max(q1.length, q2.length);
          if (lengthRatio < lengthFilterThreshold) continue;

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
              matchType: 'text',
            });
          }
        }
      }

      // Sort: answer matches first, then by similarity descending
      duplicates.sort((a, b) => {
        if (a.matchType !== b.matchType) return a.matchType === 'answer' ? -1 : 1;
        return b.similarity - a.similarity;
      });

      const result: DuplicateScanResult = {
        totalChecked: questions.length,
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
        const answerCount = duplicates.filter(d => d.matchType === 'answer').length;
        const textCount = duplicates.filter(d => d.matchType === 'text').length;
        toast({
          title: 'სკანირება დასრულდა',
          description: `ნაპოვნია ${duplicates.length} დუბლიკატი (${answerCount} პასუხით, ${textCount} ტექსტით)`,
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
