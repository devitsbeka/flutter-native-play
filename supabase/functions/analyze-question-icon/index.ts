import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Accept both 'question' and 'questionText' for compatibility
    const question = body.question || body.questionText;
    const category = body.category;
    
    if (!question) {
      console.error('No question provided. Body:', JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an icon matching assistant for trivia games. Analyze questions in ANY language (English, Georgian, Spanish, etc.).

Your job is to return GENERIC CATEGORY KEYWORDS that will be used to search an icon library.
The keywords will match icons via partial matching (e.g., "animal" matches "forest-full-of-animals", "paw" matches "cat-paw-print").

ABSOLUTE RULE: Return BROAD CATEGORY keywords only. NEVER return specific answer words.

KEYWORD MAPPING:
- Any animal question → "animal", "wildlife", "paw", "creature", "forest"
- Insect/bug question → "insect", "bug", "beetle", "ant"  
- Marine/fish question → "fish", "ocean", "marine", "sea", "water"
- Bird question → "bird", "feather", "wing", "flying"
- Science question → "science", "atom", "lab", "microscope", "chemistry"
- History question → "history", "scroll", "castle", "ancient", "medieval"
- Geography question → "globe", "map", "earth", "compass", "world"
- Sports question → "trophy", "ball", "medal", "sport", "athlete"
- Technology question → "computer", "laptop", "phone", "tech", "gear"
- Art question → "art", "palette", "paint", "brush", "canvas"
- Food question → "food", "cooking", "chef", "restaurant", "kitchen"
- Music question → "music", "guitar", "microphone", "piano", "note"
- Movie/TV question → "movie", "film", "camera", "clapperboard", "cinema"

BANNED words (never use): specific animal names (deer, lion, elephant, mosquito, eagle, shark), answer-hinting words

Return ONLY valid JSON with no markdown.`;

    const userPrompt = `Question: "${question}"
${category ? `Category: "${category}"` : ''}

This question may be in Georgian or any language. Understand the MEANING.

Return JSON:
{
  "slugs": ["keyword1", "keyword2", "keyword3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "mainConcept": "General Topic Name"
}

RULES:
1. slugs = 3-5 broad search keywords (will partial-match icon slugs)
2. keywords = 5-10 broader keywords for fallback matching
3. For ANY animal question → slugs: ["animal", "wildlife", "paw", "creature"]
4. For ANY insect question → slugs: ["insect", "bug", "beetle", "nature"]
5. For ANY bird question → slugs: ["bird", "feather", "wing", "wildlife"]
6. For ANY fish/marine question → slugs: ["fish", "ocean", "marine", "sea"]
7. mainConcept = short English description of the topic

Examples:
- Question about deer antlers → slugs: ["animal", "wildlife", "paw", "creature"]
- Question about mosquito disease → slugs: ["insect", "bug", "beetle", "nature"]
- Question about eagle flight → slugs: ["bird", "feather", "wing", "wildlife"]
- Question about shark teeth → slugs: ["fish", "ocean", "marine", "sea"]`;

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited', fallback: true }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI gateway error', fallback: true }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No AI response', fallback: true }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response, handling potential markdown formatting
    let parsed;
    try {
      // Remove potential markdown code blocks
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content, parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format', fallback: true }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate response structure
    const result = {
      slugs: Array.isArray(parsed.slugs) ? parsed.slugs.slice(0, 5) : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 10) : [],
      mainConcept: typeof parsed.mainConcept === 'string' ? parsed.mainConcept : '',
    };

    console.log('Analyzed question:', question.substring(0, 50), '→', result.slugs);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('analyze-question-icon error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', fallback: true }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
