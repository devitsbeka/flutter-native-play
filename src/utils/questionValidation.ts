// Content length validation for quiz questions and answers
// These limits ensure questions fit within a single viewport on mobile devices
// STRICT POLICY: Questions/answers exceeding these limits should be REJECTED, not truncated

import { QUALITY_CONSTANTS } from '@/constants/questionQuality';

export const QUESTION_MAX_LENGTH = QUALITY_CONSTANTS.QUESTION_MAX_LENGTH;
export const ANSWER_MAX_LENGTH = QUALITY_CONSTANTS.ANSWER_MAX_LENGTH;

/**
 * Check if a question text is within the character limit
 */
export function isQuestionValid(question: string): boolean {
  return question.length > 0 && question.length <= QUESTION_MAX_LENGTH;
}

/**
 * Check if an answer text is within the character limit
 */
export function isAnswerValid(answer: string): boolean {
  return answer.length > 0 && answer.length <= ANSWER_MAX_LENGTH;
}

/**
 * Check if answer text appears in question (critical quality issue)
 */
export function hasAnswerInQuestion(questionText: string, correctAnswer: string): boolean {
  if (!questionText || !correctAnswer) return false;
  
  const normalizedQuestion = questionText.toLowerCase().replace(/[?!.,]/g, '').trim();
  const normalizedCorrect = correctAnswer.toLowerCase().replace(/[?!.,]/g, '').trim();
  
  // Check if correct answer (or significant part) appears in question
  if (normalizedCorrect.length >= 4 && normalizedQuestion.includes(normalizedCorrect)) {
    return true;
  }
  
  // Check for partial match (first 2 words if answer is multi-word)
  const answerWords = normalizedCorrect.split(/\s+/);
  if (answerWords.length >= 2) {
    const partialAnswer = answerWords.slice(0, 2).join(' ');
    if (partialAnswer.length >= 6 && normalizedQuestion.includes(partialAnswer)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if all answers in an array are within the character limit
 */
export function areAllAnswersValid(answers: string[]): boolean {
  return answers.every(isAnswerValid);
}

/**
 * STRICT validation: Check if a complete question meets all requirements
 * Returns true only if ALL limits are satisfied - no truncation allowed
 */
export function isQuestionComplete(
  questionText: string,
  correctAnswer: string,
  incorrectAnswers: string[]
): boolean {
  if (!questionText || !correctAnswer) return false;
  if (!isQuestionValid(questionText)) return false;
  if (!isAnswerValid(correctAnswer)) return false;
  if (incorrectAnswers.length !== 3) return false;
  if (!areAllAnswersValid(incorrectAnswers)) return false;
  return true;
}

/**
 * Get validation errors for a question (useful for UI feedback)
 */
export function getValidationErrors(
  questionText: string,
  correctAnswer: string,
  incorrectAnswers: string[]
): string[] {
  const errors: string[] = [];
  
  if (!questionText) {
    errors.push('კითხვის ტექსტი აუცილებელია');
  } else if (questionText.length > QUESTION_MAX_LENGTH) {
    errors.push(`კითხვა ძალიან გრძელია (${questionText.length}/${QUESTION_MAX_LENGTH} სიმბოლო)`);
  }
  
  if (!correctAnswer) {
    errors.push('სწორი პასუხი აუცილებელია');
  } else if (correctAnswer.length > ANSWER_MAX_LENGTH) {
    errors.push(`სწორი პასუხი ძალიან გრძელია (${correctAnswer.length}/${ANSWER_MAX_LENGTH} სიმბოლო)`);
  }
  
  if (incorrectAnswers.length !== 3) {
    errors.push('საჭიროა 3 არასწორი პასუხი');
  } else {
    incorrectAnswers.forEach((answer, index) => {
      if (!answer) {
        errors.push(`არასწორი პასუხი ${index + 1} აუცილებელია`);
      } else if (answer.length > ANSWER_MAX_LENGTH) {
        errors.push(`არასწორი პასუხი ${index + 1} ძალიან გრძელია (${answer.length}/${ANSWER_MAX_LENGTH})`);
      }
    });
  }
  
  if (questionText && correctAnswer && hasAnswerInQuestion(questionText, correctAnswer)) {
    errors.push('კითხვა შეიცავს სწორ პასუხს');
  }
  
  return errors;
}
