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

ABSOLUTE RULE: Return ONLY broad category icons. NEVER specific animals, objects, or entities.

ALLOWED ICONS (use ONLY these types):
- Animals category: "animal", "wildlife", "nature", "paw", "creature"
- Insects category: "insect", "bug", "nature"  
- Marine category: "fish", "ocean", "marine-life", "water"
- Birds category: "bird", "feather", "wildlife"
- Science category: "science", "atom", "chemistry", "biology", "lab"
- History category: "history", "clock", "scroll", "book"
- Geography category: "globe", "map", "earth", "compass"
- Sports category: "trophy", "medal", "sports", "ball"
- Technology category: "technology", "computer", "gear"
- Art category: "art", "palette", "brush", "music"
- Food category: "food", "restaurant", "utensils"

BANNED: deer, lion, elephant, dog, cat, mosquito, butterfly, eagle, shark, any specific animal/insect/bird name

Return ONLY valid JSON with no markdown.`;

    const userPrompt = `Question: "${question}"
${category ? `Category: "${category}"` : ''}

This question may be in Georgian (ქართული) or any language. Understand the MEANING.

Return JSON:
{
  "slugs": ["icon1", "icon2", "icon3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "mainConcept": "General Topic Name"
}

CRITICAL RULES:
1. slugs MUST be generic category icons (animal, insect, bird, science, etc.)
2. NEVER use specific creature names (no deer, lion, mosquito, eagle, etc.)
3. If question is about ANY animal → use "animal", "wildlife", "paw", "creature"
4. If question is about ANY insect → use "insect", "bug", "nature"
5. If question is about ANY bird → use "bird", "feather", "wildlife"
6. If question is about ANY fish → use "fish", "ocean", "marine-life"

Examples:
- Question about deer antlers → slugs: ["animal", "wildlife", "nature", "paw"]
- Question about mosquito disease → slugs: ["insect", "bug", "nature", "biology"]
- Question about eagle flight → slugs: ["bird", "wildlife", "feather", "nature"]
- Question about shark teeth → slugs: ["fish", "ocean", "marine-life", "water"]`;
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
