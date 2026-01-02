// Content length validation for quiz questions and answers
// These limits ensure questions fit within a single viewport on mobile devices

export const QUESTION_MAX_LENGTH = 70; // Max length to ensure questions fit in UI without cropping
export const ANSWER_MAX_LENGTH = 60;   // Increased from 45 to accommodate more answers

export function isQuestionValid(question: string): boolean {
  return question.length <= QUESTION_MAX_LENGTH;
}

export function isAnswerValid(answer: string): boolean {
  return answer.length <= ANSWER_MAX_LENGTH;
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
