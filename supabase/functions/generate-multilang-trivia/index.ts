import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_NAMES: Record<string, string> = {
  'ka': 'Georgian (ქართული)',
  'en': 'English',
  'ru': 'Russian (Русский)',
  'es': 'Spanish (Español)',
  'fr': 'French (Français)',
  'pt-br': 'Portuguese (Português)',
  'it': 'Italian (Italiano)',
  'de': 'German (Deutsch)',
  'nl': 'Dutch (Nederlands)',
  'sv': 'Swedish (Svenska)',
  'nb': 'Norwegian (Norsk)',
  'da': 'Danish (Dansk)',
  'fi': 'Finnish (Suomi)',
  'pl': 'Polish (Polski)',
  'cs': 'Czech (Čeština)',
  'sk': 'Slovak (Slovenčina)',
  'hu': 'Hungarian (Magyar)',
  'ro': 'Romanian (Română)',
  'hr': 'Croatian (Hrvatski)',
  'sr-latn': 'Serbian Latin (Srpski)',
};

const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;
const SIMILARITY_THRESHOLD = 0.55;

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?.!,;:'"()]/g, '')
    .replace(/\s+/g, ' ');
}

// Extract keywords from text for Jaccard similarity
function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text);
  const numbers = text.match(/\d+/g) || [];
  const words = normalized.split(' ').filter(w => w.length > 3);
  return new Set([...numbers, ...words]);
}

// Calculate similarity between two texts (Jaccard index)
function calculateSimilarity(text1: string, text2: string): number {
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

// Remove duplicates within a batch based on similarity
function removeDuplicatesFromBatch(questions: any[]): any[] {
  const unique: any[] = [];
  
  for (const q of questions) {
    const qText = q.questionText || '';
    const isDuplicate = unique.some(existing => 
      calculateSimilarity(qText, existing.questionText || '') > SIMILARITY_THRESHOLD
    );
    
    if (!isDuplicate) {
      unique.push(q);
    }
  }
  
  return unique;
}

// Check if a question is similar to any existing questions
function isSimilarToExisting(questionText: string, existingTexts: string[]): string | null {
  for (const existing of existingTexts) {
    if (calculateSimilarity(questionText, existing) > SIMILARITY_THRESHOLD) {
      return existing;
    }
  }
  return null;
}

// STRICT validation - returns true only if ALL limits are met
function isValidQuestion(q: any): boolean {
  const questionText = q.questionText || '';
  const correctAnswer = q.correctAnswer || '';
  const incorrectAnswers = q.incorrectAnswers || [];
  
  if (!questionText || !correctAnswer) {
    return false;
  }
  if (questionText.length > QUESTION_MAX_LENGTH) {
    console.log(`Rejecting question (${questionText.length} chars > ${QUESTION_MAX_LENGTH}): ${questionText.substring(0, 50)}...`);
    return false;
  }
  if (correctAnswer.length > ANSWER_MAX_LENGTH) {
    console.log(`Rejecting answer (${correctAnswer.length} chars > ${ANSWER_MAX_LENGTH}): ${correctAnswer}`);
    return false;
  }
  if (!Array.isArray(incorrectAnswers) || incorrectAnswers.length !== 3) {
    return false;
  }
  for (const answer of incorrectAnswers) {
    if (!answer || answer.length > ANSWER_MAX_LENGTH) {
      console.log(`Rejecting incorrect answer (${(answer || '').length} chars > ${ANSWER_MAX_LENGTH}): ${answer}`);
      return false;
    }
  }
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, categoryName, language, difficulty, count, topic } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing questions from this category for duplicate detection
    console.log(`Fetching existing questions for category ${categoryId}...`);
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('question_text')
      .eq('category_id', categoryId)
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('Error fetching existing questions:', fetchError);
    }
    
    const existingTexts = existingQuestions?.map(q => q.question_text) || [];
    console.log(`Found ${existingTexts.length} existing questions in category`);

    // Support up to 200 questions by chunking - request extra to compensate for validation filtering
    const requestedCount = Math.min(count || 50, 200);
    const extraForValidation = Math.ceil(requestedCount * 0.5); // Request 50% extra to account for duplicates
    const adjustedCount = requestedCount + extraForValidation;
    const chunkSize = 50;
    const chunks = Math.ceil(adjustedCount / chunkSize);

    const languageName = LANGUAGE_NAMES[language] || language;
    
    const difficultyInstruction = difficulty 
      ? `All questions should be ${difficulty} difficulty.`
      : `Mix the difficulty levels: include easy, medium, and hard questions.`;

    const topicInstruction = topic 
      ? `Focus specifically on the topic: "${topic}".`
      : '';

    // Include some existing questions in the prompt to help AI avoid them
    const existingSample = existingTexts.slice(0, 30).map(t => `- ${t}`).join('\n');
    const avoidDuplicatesInstruction = existingTexts.length > 0 
      ? `\n\n⚠️ AVOID creating questions similar to these existing ones:\n${existingSample}\n\nCreate DIFFERENT questions about NEW facts and topics.`
      : '';

    const systemPrompt = `You are a trivia question generator. Generate unique, accurate trivia questions.

🚨🚨🚨 STRICT CHARACTER LIMITS - QUESTIONS EXCEEDING LIMITS WILL BE REJECTED:

- Question text: MAXIMUM ${QUESTION_MAX_LENGTH} characters (including spaces and punctuation)
- Each answer option: MAXIMUM ${ANSWER_MAX_LENGTH} characters

⚠️ IMPORTANT: If you cannot phrase a question/answer within these limits, SKIP IT and create a different question instead. DO NOT try to shorten - create a different fact instead.

✅ Examples of proper length:
- Question: "რომელ წელს დაარსდა NASA?" (25 chars) - GOOD
- Answer: "1958" (4 chars) - GOOD
- Answer: "აინშტაინი" (9 chars) - GOOD

❌ Examples that will be REJECTED:
- Question over 65 chars - REJECTED
- Answer "ალბერტ აინშტაინი" (16 chars) - may be too long in some languages - use shorter form

🚫 ANSWER LENGTH PARITY - CRITICAL ANTI-CHEATING RULE:
1. ALL 4 answers MUST be similar in character length (within 5 characters of each other)
2. The correct answer must NOT be noticeably longer or shorter than incorrect answers
3. If the correct answer is detailed, make ALL incorrect answers equally detailed
4. NEVER make the correct answer stand out by length - this allows guessing

🔴 DO NOT REVEAL ANSWERS IN QUESTIONS:
- The correct answer text must NOT appear in the question
- If asking about "X", don't say "Which X..." where X is the answer

EXAMPLES:
❌ BAD: Correct: "პირველი მსოფლიო ომი" | Incorrect: "ომი", "ბრძოლა", "კონფლიქტი"
✓ GOOD: Correct: "პირველი მსოფლიო ომი" | Incorrect: "მეორე მსოფლიო ომი", "კორეის ომი 1950", "ვიეტნამის ომი"

Return a JSON object with a "questions" array. Each question should have:
- questionText: the question (max ${QUESTION_MAX_LENGTH} chars)
- correctAnswer: the correct answer (max ${ANSWER_MAX_LENGTH} chars)
- incorrectAnswers: array of 3 wrong answers (each max ${ANSWER_MAX_LENGTH} chars)
- difficulty: "easy", "medium", or "hard"
- iconKeywords: array of 2-3 English keywords for finding an icon (e.g., ["mountain", "nature", "landscape"])`;

    const allQuestions: any[] = [];

    // Generate in chunks for large requests
    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      const chunkCount = chunkIndex === chunks - 1 
        ? adjustedCount - (chunkIndex * chunkSize)
        : chunkSize;

      const userPrompt = `Generate ${chunkCount} unique trivia questions in ${languageName} about the category "${categoryName}".

${difficultyInstruction}
${topicInstruction}
${avoidDuplicatesInstruction}

${chunks > 1 ? `This is batch ${chunkIndex + 1} of ${chunks}, so ensure questions are unique and cover different aspects of the topic.` : ''}

CRITICAL REMINDERS:
- ALL text must be in ${languageName}
- Questions MAXIMUM ${QUESTION_MAX_LENGTH} characters - questions over this limit will be REJECTED
- Answers MAXIMUM ${ANSWER_MAX_LENGTH} characters - answers over this limit will be REJECTED
- Include exactly 1 correct answer and 3 incorrect answers
- Make questions diverse and interesting
- Avoid duplicate or very similar questions
- If you cannot fit a fact within limits, skip it and use a different fact

Return ONLY valid JSON with this structure:
{
  "questions": [
    {
      "questionText": "...",
      "correctAnswer": "...",
      "incorrectAnswers": ["...", "...", "..."],
      "difficulty": "easy|medium|hard",
      "iconKeywords": ["keyword1", "keyword2"]
    }
  ]
}`;

      console.log(`Generating chunk ${chunkIndex + 1}/${chunks}: ${chunkCount} questions in ${language} for category ${categoryName}`);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI API error: ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in AI response');
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse AI response:', content);
        throw new Error('Invalid JSON from AI');
      }

      const questions = parsedContent.questions || [];
      allQuestions.push(...questions);
      console.log(`Chunk ${chunkIndex + 1} generated ${questions.length} questions (total: ${allQuestions.length})`);
    }

    console.log(`Generated ${allQuestions.length} total questions`);

    // STRICT validation: Filter out questions that exceed character limits
    const validQuestions = allQuestions.filter(isValidQuestion);
    console.log(`Validation: ${allQuestions.length} generated, ${validQuestions.length} passed strict limits`);

    // Deduplicate within the generated batch
    const batchDeduped = removeDuplicatesFromBatch(validQuestions);
    console.log(`Batch deduplication: ${validQuestions.length} -> ${batchDeduped.length}`);

    // Filter out questions similar to existing ones in database
    const uniqueQuestions = batchDeduped.filter(q => {
      const similarTo = isSimilarToExisting(q.questionText, existingTexts);
      if (similarTo) {
        console.log(`Filtered DB duplicate: "${q.questionText.substring(0, 40)}..." similar to "${similarTo.substring(0, 40)}..."`);
        return false;
      }
      return true;
    });
    console.log(`DB deduplication: ${batchDeduped.length} -> ${uniqueQuestions.length}`);

    // Take only the requested number of unique questions
    const trimmedQuestions = uniqueQuestions.slice(0, requestedCount);

    // Try to find icons for each question
    const questionsWithIcons = await Promise.all(
      trimmedQuestions.map(async (q: any) => {
        // Questions already passed validation, no need to truncate
        if (q.iconKeywords?.length > 0) {
          const { data: icons } = await supabase
            .from('icon_library')
            .select('slug')
            .or(q.iconKeywords.map((k: string) => `tags.cs.{${k.toLowerCase()}}`).join(','))
            .limit(1);

          if (icons && icons.length > 0) {
            q.iconSlug = icons[0].slug;
          }
        }
        delete q.iconKeywords;
        return q;
      })
    );

    return new Response(JSON.stringify({ questions: questionsWithIcons }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-multilang-trivia:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
