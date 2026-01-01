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

    const systemPrompt = `You are an icon matching assistant. Your job is to analyze trivia questions (often in Georgian language) and identify the VISUAL subject that would make the best icon representation.

Focus on:
- The main VISUAL subject of the question (animals, objects, places, people, concepts)
- Concrete, drawable things rather than abstract concepts
- The most specific identifiable subject

Return ONLY valid JSON with no markdown formatting.`;

    const userPrompt = `Analyze this trivia question and identify the best visual icon subject.

Question: "${question}"
${category ? `Category: "${category}"` : ''}

Return JSON in this exact format:
{
  "slugs": ["slug1", "slug2", "slug3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "mainConcept": "brief description"
}

Rules:
- slugs: 3-5 specific icon slugs in kebab-case (e.g., "octopus", "blue-whale", "dna-helix")
- keywords: 5-10 English keywords for icon search (nouns, not adjectives)
- mainConcept: The primary visual subject in 2-4 words

Examples:
- Question about octopus blood → slugs: ["octopus", "squid", "crab", "lobster"], keywords: ["marine", "invertebrate", "ocean", "sea", "creature", "animal"]
- Question about Einstein → slugs: ["einstein", "scientist", "physics", "brain"], keywords: ["science", "genius", "physicist", "relativity", "atom"]
- Question about Eiffel Tower → slugs: ["eiffel-tower", "paris", "france", "tower"], keywords: ["landmark", "monument", "architecture", "city", "travel"]`;

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
