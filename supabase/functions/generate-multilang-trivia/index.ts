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
const ANSWER_MAX_LENGTH = 16;

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

    // Support up to 200 questions by chunking
    const requestedCount = Math.min(count || 50, 200);
    const chunkSize = 50;
    const chunks = Math.ceil(requestedCount / chunkSize);

    const languageName = LANGUAGE_NAMES[language] || language;
    
    const difficultyInstruction = difficulty 
      ? `All questions should be ${difficulty} difficulty.`
      : `Mix the difficulty levels: include easy, medium, and hard questions.`;

    const topicInstruction = topic 
      ? `Focus specifically on the topic: "${topic}".`
      : '';

    const systemPrompt = `You are a trivia question generator. Generate unique, accurate trivia questions.

CRITICAL CHARACTER LIMITS - THESE ARE STRICT:
- Question text: MAXIMUM ${QUESTION_MAX_LENGTH} characters (including spaces and punctuation)
- Each answer option: MAXIMUM ${ANSWER_MAX_LENGTH} characters

If a question or answer exceeds the limit, you MUST shorten it while preserving meaning.

Examples of proper length:
- Question: "რომელ წელს დაარსდა NASA?" (25 chars) ✓
- Answer: "1958" (4 chars) ✓
- Answer: "ალბერტ აინშტაინი" would be shortened to "აინშტაინი" ✓

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
        ? requestedCount - (chunkIndex * chunkSize)
        : chunkSize;

      const userPrompt = `Generate ${chunkCount} unique trivia questions in ${languageName} about the category "${categoryName}".

${difficultyInstruction}
${topicInstruction}

${chunks > 1 ? `This is batch ${chunkIndex + 1} of ${chunks}, so ensure questions are unique and cover different aspects of the topic.` : ''}

Remember:
- ALL text must be in ${languageName}
- Questions max ${QUESTION_MAX_LENGTH} characters
- Answers max ${ANSWER_MAX_LENGTH} characters
- Include exactly 1 correct answer and 3 incorrect answers
- Make questions diverse and interesting
- Avoid duplicate or very similar questions

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

    // Try to find icons for each question
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const questionsWithIcons = await Promise.all(
      allQuestions.map(async (q: any) => {
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
