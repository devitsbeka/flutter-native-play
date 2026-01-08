// Content length validation for quiz questions and answers
// These limits ensure questions fit within a single viewport on mobile devices

export const QUESTION_MAX_LENGTH = 65; // Max length to ensure questions fit in UI without cropping
export const ANSWER_MAX_LENGTH = 16;   // Max for Georgian language answers (stricter for UI fit)

export function isQuestionValid(question: string): boolean {
  return question.length <= QUESTION_MAX_LENGTH;
}

export function isAnswerValid(answer: string): boolean {
  return answer.length <= ANSWER_MAX_LENGTH;
}

// Check if answer text appears in question (critical quality issue)
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

export function areAllAnswersValid(answers: string[]): boolean {
  return answers.every(isAnswerValid);
}

export function isQuestionComplete(
  questionText: string,
  correctAnswer: string,
  incorrectAnswers: string[]
): boolean {
  if (!isQuestionValid(questionText)) return false;
  if (!isAnswerValid(correctAnswer)) return false;
  if (!areAllAnswersValid(incorrectAnswers)) return false;
  return true;
}
