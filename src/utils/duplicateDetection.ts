/**
 * Utility functions for detecting and removing duplicate questions
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

/**
 * Removes duplicate questions from a batch based on text similarity
 * @param questions Array of questions with question_text property
 * @param threshold Similarity threshold (0-1), questions above this are considered duplicates
 * @returns Array of unique questions (same type as input)
 */
export function removeDuplicatesFromBatch<T extends { question_text: string }>(
  questions: T[],
  threshold: number = 0.55
): T[] {
  const unique: T[] = [];
  
  for (const q of questions) {
    const isDuplicate = unique.some(existing => 
      calculateSimilarity(q.question_text, existing.question_text) > threshold
    );
    
    if (!isDuplicate) {
      unique.push(q);
    }
  }
  
  return unique;
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
  return existingQuestions.some(existing => 
    calculateSimilarity(newQuestion, existing) > threshold
  );
}
