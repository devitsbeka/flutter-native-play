/**
 * Utility functions for detecting and removing duplicate questions
 * Optimized for performance with pre-computation and early termination
 */

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?.!,;:'"()]/g, '')
    .replace(/\s+/g, ' ');
}

export function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text);
  const numbers = text.match(/\d+/g) || [];
  const words = normalized.split(' ').filter(w => w.length > 3);
  return new Set([...numbers, ...words]);
}

/**
 * Optimized similarity calculation using pre-computed normalized text and keywords
 * This avoids repeated normalizeText() and extractKeywords() calls
 */
export function calculateSimilarityOptimized(
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
  
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  // Jaccard index with pre-computed sets
  let intersectionCount = 0;
  for (const k of keywords1) {
    if (keywords2.has(k)) intersectionCount++;
  }
  const unionSize = keywords1.size + keywords2.size - intersectionCount;
  
  return intersectionCount / unionSize;
}

/**
 * Original similarity function for backward compatibility
 * Consider using pre-computed version for batch operations
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const s1 = normalizeText(text1);
  const s2 = normalizeText(text2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }
  
  // Keyword-based similarity (Jaccard index)
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);
  
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  const intersection = [...keywords1].filter(k => keywords2.has(k));
  const union = new Set([...keywords1, ...keywords2]);
  
  return intersection.length / union.size;
}

interface ProcessedQuestion<T> {
  original: T;
  normalized: string;
  keywords: Set<string>;
  length: number;
}

/**
 * Removes duplicate questions from a batch based on text similarity
 * Optimized with pre-computation and early length-based filtering
 * 
 * @param questions Array of questions with question_text property
 * @param threshold Similarity threshold (0-1), questions above this are considered duplicates
 * @returns Array of unique questions (same type as input)
 */
export function removeDuplicatesFromBatch<T extends { question_text: string }>(
  questions: T[],
  threshold: number = 0.55
): T[] {
  if (questions.length === 0) return [];
  
  // Pre-compute normalized texts and keyword sets - O(n)
  const processed: ProcessedQuestion<T>[] = questions.map(q => ({
    original: q,
    normalized: normalizeText(q.question_text),
    keywords: extractKeywords(q.question_text),
    length: q.question_text.length
  }));

  const unique: ProcessedQuestion<T>[] = [];
  
  // Length ratio threshold for early filtering
  const lengthFilterThreshold = threshold * 0.5;

  for (const q of processed) {
    let isDuplicate = false;
    
    for (const existing of unique) {
      // Early exit: length-based filtering - skip if lengths differ too much
      const lengthRatio = Math.min(q.length, existing.length) / Math.max(q.length, existing.length);
      if (lengthRatio < lengthFilterThreshold) continue;

      // Use optimized similarity with pre-computed values
      const similarity = calculateSimilarityOptimized(
        q.normalized, 
        q.keywords, 
        existing.normalized, 
        existing.keywords
      );
      
      if (similarity > threshold) {
        isDuplicate = true;
        break; // Early termination once duplicate found
      }
    }
    
    if (!isDuplicate) {
      unique.push(q);
    }
  }

  return unique.map(u => u.original);
}

/**
 * Checks if a question is similar to any in an existing list
 * @param newQuestion The question to check
 * @param existingQuestions List of existing questions
 * @param threshold Similarity threshold
 * @returns true if the question is a duplicate
 */
export function isDuplicateQuestion(
  newQuestion: string,
  existingQuestions: string[],
  threshold: number = 0.55
): boolean {
  if (existingQuestions.length === 0) return false;
  
  // Pre-compute for the new question
  const newNormalized = normalizeText(newQuestion);
  const newKeywords = extractKeywords(newQuestion);
  const newLength = newQuestion.length;
  const lengthFilterThreshold = threshold * 0.5;
  
  for (const existing of existingQuestions) {
    // Early length filter
    const lengthRatio = Math.min(newLength, existing.length) / Math.max(newLength, existing.length);
    if (lengthRatio < lengthFilterThreshold) continue;
    
    const existingNormalized = normalizeText(existing);
    const existingKeywords = extractKeywords(existing);
    
    const similarity = calculateSimilarityOptimized(
      newNormalized,
      newKeywords,
      existingNormalized,
      existingKeywords
    );
    
    if (similarity > threshold) return true;
  }
  
  return false;
}
