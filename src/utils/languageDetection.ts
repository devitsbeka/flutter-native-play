/**
 * Detect whether text is Georgian or English/Latin based on Unicode character ranges.
 * Georgian Unicode range: U+10A0–U+10FF (Mkhedruli + Asomtavruli)
 */

const GEORGIAN_REGEX = /[\u10A0-\u10FF]/g;
const ALPHA_REGEX = /[a-zA-Z\u10A0-\u10FF]/g;

/**
 * Returns 'ka' if Georgian characters make up >30% of alphabetic characters,
 * otherwise returns 'en'.
 */
export function detectLanguage(text: string): 'ka' | 'en' {
  const alphaChars = text.match(ALPHA_REGEX);
  if (!alphaChars || alphaChars.length === 0) return 'en';

  const georgianChars = text.match(GEORGIAN_REGEX);
  const georgianCount = georgianChars ? georgianChars.length : 0;
  const ratio = georgianCount / alphaChars.length;

  return ratio > 0.3 ? 'ka' : 'en';
}

/**
 * Detect question language from question text and correct answer combined.
 */
export function detectQuestionLanguage(
  questionText: string,
  correctAnswer: string
): 'ka' | 'en' {
  return detectLanguage(`${questionText} ${correctAnswer}`);
}
