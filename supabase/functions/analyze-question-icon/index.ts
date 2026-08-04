import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const question = body.question || body.questionText;
    const category = body.category;
    
    if (!question) {
      console.error('No question provided. Body:', JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!AI_API_KEY) {
      throw new Error('AI_API_KEY is not configured');
    }

    const systemPrompt = `You are an icon keyword extractor. Return ONLY a JSON object, nothing else.`;

    const userPrompt = `Analyze this trivia question and return search keywords for finding a matching icon.

Question: "${question}"
${category ? `Category: "${category}"` : ''}

Return ONLY this JSON format (no markdown, no explanation):
{"slugs":["keyword1","keyword2","keyword3"],"keywords":["keyword1","keyword2","keyword3","keyword4"],"mainConcept":"Topic"}

Rules:
- slugs: 3-5 broad category keywords (animal, science, history, sport, music, movie, food, tech, art, geography)
- keywords: 5-8 related search terms
- mainConcept: short topic name in English
- For animals use: animal, wildlife, paw, creature
- For science use: science, atom, lab, chemistry
- For sports use: trophy, ball, medal, sport`;

    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel('google/gemini-2.5-flash'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_icon_keywords",
              description: "Extract keywords for icon matching",
              parameters: {
                type: "object",
                properties: {
                  slugs: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 broad category keywords"
                  },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "5-8 related search terms"
                  },
                  mainConcept: {
                    type: "string",
                    description: "Short topic name in English"
                  }
                },
                required: ["slugs", "keywords", "mainConcept"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_icon_keywords" } }
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
    
    // Check for malformed function call or other issues
    const finishReason = data.choices?.[0]?.finish_reason;
    const nativeFinishReason = data.choices?.[0]?.native_finish_reason;
    
    // Try tool call response first
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
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
      } catch (e) {
        console.error('Failed to parse tool call:', e);
      }
    }

    // Fallback to content parsing
    const content = data.choices?.[0]?.message?.content;
    
    // If no content and malformed function call, return generic fallback based on category
    if (!content || nativeFinishReason === 'MALFORMED_FUNCTION_CALL') {
      console.log('AI returned no content or malformed call, using category fallback for:', question.substring(0, 50));
      
      // Extract simple keywords from question text itself
      const questionLower = question.toLowerCase();
      const fallbackSlugs: string[] = [];
      
      // Simple keyword detection
      if (category) fallbackSlugs.push(category.toLowerCase());
      if (questionLower.includes('ვინ') || questionLower.includes('who')) fallbackSlugs.push('person');
      if (questionLower.includes('სად') || questionLower.includes('where')) fallbackSlugs.push('geography');
      if (questionLower.includes('როდის') || questionLower.includes('when')) fallbackSlugs.push('history');
      
      // Ensure at least one slug
      if (fallbackSlugs.length === 0) fallbackSlugs.push('general');
      
      return new Response(
        JSON.stringify({ 
          slugs: fallbackSlugs.slice(0, 5), 
          keywords: fallbackSlugs, 
          mainConcept: category || 'general',
          fallback: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to extract JSON from content
    let parsed;
    try {
      // Find JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*"slugs"[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // Clean and try parsing directly
        const cleanContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        parsed = JSON.parse(cleanContent);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.substring(0, 200));
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format', fallback: true }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
