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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl კონექტორი არ არის დაკავშირებული. გადადით Settings → Connectors' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape the URL with Firecrawl
    console.log('Scraping URL:', url);
    
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error('Firecrawl scrape error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || 'გვერდის სკრეიპინგი ვერ მოხერხდა' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeData.data?.markdown || '';
    console.log('Scraped content length:', markdown.length);

    if (!markdown || markdown.length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'გვერდზე შინაარსი ვერ მოიძებნა' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to extract questions
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI სერვისი არ არის კონფიგურირებული' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a quiz question extractor. Extract trivia questions from the provided web content.

Rules:
1. Extract all quiz/trivia questions with their answers
2. Identify which answer is correct (look for markers like ✓, *, "correct", highlighted answers, etc.)
3. If correct answer is not marked, use your knowledge to determine the correct answer
4. Each question must have exactly 4 answer options (1 correct + 3 incorrect)
5. Question text should be max 150 characters
6. Each answer should be max 60 characters
7. Output in Georgian if the content is in Georgian, otherwise output in the original language
8. Determine difficulty: easy (basic facts), medium (requires some knowledge), hard (requires deep knowledge)

Return a JSON array of questions with this exact structure:
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

If no valid questions found, return: {"questions": []}`;

    console.log('Calling AI to extract questions...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract quiz questions from this web content:\n\n${markdown.slice(0, 15000)}` }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
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

    console.log('Extracted questions count:', parsed.questions?.length || 0);

    return new Response(
      JSON.stringify({ success: true, questions: parsed.questions || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-quiz-url:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'უცნობი შეცდომა' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
