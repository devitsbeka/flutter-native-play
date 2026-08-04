import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const LANGUAGE_NAMES: Record<string, string> = {
  'ka': 'Georgian (ქართული)',
  'en': 'English',
  'fr': 'French (Français)',
  'de': 'German (Deutsch)',
  'es': 'Spanish (Español)',
  'it': 'Italian (Italiano)',
  'pt-br': 'Portuguese (Português)',
};

const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;

interface Question {
  questionText: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  difficulty: string;
  categoryId: string;
  categoryName: string;
  iconSlug?: string;
  language?: string;
}

async function translateBatch(
  questions: Question[],
  targetLanguage: string,
  apiKey: string
): Promise<Question[]> {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  
  const systemPrompt = `You are a professional translator. Translate trivia questions accurately while maintaining their meaning.

CRITICAL CHARACTER LIMITS:
- Question text: MAXIMUM ${QUESTION_MAX_LENGTH} characters
- Each answer: MAXIMUM ${ANSWER_MAX_LENGTH} characters

If translation exceeds limits, shorten while preserving meaning. Use abbreviations if needed.

CRITICAL FOR GEORGIAN (ka) TRANSLATIONS - Use ONLY native Georgian words, NOT Slavic/Russian loanwords:
❌ "კომარა" → ✅ "კოღო" (mosquito)
❌ "ბაბოჩკა" → ✅ "პეპელა" (butterfly)
❌ "სტაკანი" → ✅ "ჭიქა" (glass)
❌ "კარტოშკა" → ✅ "კარტოფილი" (potato)
❌ "აგურცი" → ✅ "კიტრი" (cucumber)
❌ "კაპუსტა" → ✅ "კომბოსტო" (cabbage)
❌ "სტოლი" → ✅ "მაგიდა" (table)
❌ "კროვატი" → ✅ "საწოლი" (bed)
❌ "დივანი" → ✅ "ტახტი" (sofa)
❌ "მაიკა" → ✅ "მაისური" (t-shirt)
❌ "პლატია" → ✅ "კაბა" (dress)
❌ "შტანი" → ✅ "შარვალი" (pants)
❌ "ბოლნიცა" → ✅ "საავადმყოფო" (hospital)
❌ "აპტეკა" → ✅ "აფთიაქი" (pharmacy)
❌ "მაგაზინი" → ✅ "მაღაზია" (store)

Return JSON with "translations" array matching input order.`;

  const userPrompt = `Translate these trivia questions to ${languageName}:

${JSON.stringify(questions.map(q => ({
  question: q.questionText,
  correct: q.correctAnswer,
  incorrect: q.incorrectAnswers
})), null, 2)}

Return ONLY valid JSON:
{
  "translations": [
    {
      "questionText": "translated question (max ${QUESTION_MAX_LENGTH} chars)",
      "correctAnswer": "translated (max ${ANSWER_MAX_LENGTH} chars)",
      "incorrectAnswers": ["...", "...", "..."]
    }
  ]
}`;

  const response = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiModel('google/gemini-2.5-flash'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Translation API error for ${targetLanguage}:`, response.status, errorText);
    throw new Error(`Translation failed for ${targetLanguage}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in translation response');
  }

  const parsed = JSON.parse(content);
  const translations = parsed.translations || [];

  // Validate and filter translations that exceed limits
  const validatedTranslations: Question[] = [];
  
  for (let idx = 0; idx < questions.length; idx++) {
    const original = questions[idx];
    const translated = translations[idx];
    
    if (!translated) continue;
    
    const questionText = translated.questionText || original.questionText;
    const correctAnswer = translated.correctAnswer || original.correctAnswer;
    const incorrectAnswers = translated.incorrectAnswers || original.incorrectAnswers;
    
    // Validate lengths - skip translations that exceed limits
    const questionTooLong = questionText.length > QUESTION_MAX_LENGTH;
    const correctTooLong = correctAnswer.length > ANSWER_MAX_LENGTH;
    const anyIncorrectTooLong = incorrectAnswers.some((a: string) => a && a.length > ANSWER_MAX_LENGTH);
    
    if (questionTooLong || correctTooLong || anyIncorrectTooLong) {
      console.warn(`Translation to ${targetLanguage} exceeded limits: "${questionText.substring(0, 40)}..." - skipping`);
      continue;
    }
    
    validatedTranslations.push({
      ...original,
      questionText,
      correctAnswer,
      incorrectAnswers,
      language: targetLanguage,
    });
  }
  
  console.log(`Validated ${validatedTranslations.length}/${translations.length} translations for ${targetLanguage}`);

  return validatedTranslations;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions, targetLanguages, sourceLanguage } = await req.json();
    
    if (!AI_API_KEY) {
      throw new Error('AI_API_KEY is not configured');
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions provided');
    }

    // Filter out source language from targets
    const languagesToTranslate = (targetLanguages || Object.keys(LANGUAGE_NAMES))
      .filter((lang: string) => lang !== sourceLanguage);

    console.log(`Translating ${questions.length} questions to ${languagesToTranslate.length} languages`);

    const allTranslations: Question[] = [];
    const batchSize = 10; // Process 10 questions per translation batch to stay within limits
    
    // Process languages sequentially but questions in batches
    for (const targetLang of languagesToTranslate) {
      console.log(`Translating to ${targetLang}...`);
      
      const chunks: Question[][] = [];
      for (let i = 0; i < questions.length; i += batchSize) {
        chunks.push(questions.slice(i, i + batchSize));
      }

      for (const chunk of chunks) {
        try {
          const translated = await translateBatch(chunk, targetLang, AI_API_KEY);
          allTranslations.push(...translated);
        } catch (error) {
          console.error(`Error translating chunk to ${targetLang}:`, error);
          // Continue with other chunks/languages
        }
      }
    }

    console.log(`Completed: ${allTranslations.length} total translations`);

    return new Response(JSON.stringify({ 
      translations: allTranslations,
      count: allTranslations.length,
      languages: languagesToTranslate.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in translate-questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
