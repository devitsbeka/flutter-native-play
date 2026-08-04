import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'ტექსტი ძალიან მოკლეა' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI სერვისი არ არის კონფიგურირებული' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a quiz question parser. Parse trivia questions from the provided text, which may be in various formats.

Common formats you should recognize:
1. Numbered questions with A/B/C/D options (correct marked with ✓, *, or "correct")
2. "კითხვა:" / "სწორი:" / "არასწორი:" format
3. Q&A format with answers listed after questions
4. Multiple choice with correct answer indicated somehow
5. Any other quiz/trivia format

Rules:
1. Extract all identifiable quiz questions
2. Each question must have exactly 4 answer options (1 correct + 3 incorrect)
3. If less than 4 options are provided, generate plausible wrong answers
4. Question text should be max 150 characters (shorten if needed while preserving meaning)
5. Each answer should be max 60 characters
6. Keep the language of the original text (if Georgian, output Georgian)
7. Determine difficulty: easy (basic facts), medium (requires some knowledge), hard (requires deep knowledge)
8. Look for correct answer markers: ✓, *, (correct), (სწორი), highlighted text, etc.

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question_text": "The question text",
      "correct_answer": "The correct answer",
      "incorrect_answers": ["Wrong 1", "Wrong 2", "Wrong 3"],
      "difficulty": "easy|medium|hard",
      "level_number": 1
    }
  ]
}

If the text doesn't contain parseable questions, return: {"questions": []}`;

    console.log('Parsing text, length:', text.length);

    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel('google/gemini-2.5-flash'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse quiz questions from this text:\n\n${text.slice(0, 20000)}` }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit-ი მიღწეულია, გთხოვთ მოიცადოთ' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'კრედიტები ამოიწურა' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI დამუშავება ვერ მოხერხდა' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '{"questions": []}';
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'AI პასუხის გარჩევა ვერ მოხერხდა' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed questions count:', parsed.questions?.length || 0);

    return new Response(
      JSON.stringify({ success: true, questions: parsed.questions || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-text-content:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'უცნობი შეცდომა' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
