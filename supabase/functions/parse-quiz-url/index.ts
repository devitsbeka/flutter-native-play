import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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
        formats: ['markdown', 'html'],
        onlyMainContent: false, // Get full page content
        waitFor: 2000, // Wait for dynamic content
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
    const html = scrapeData.data?.html || '';
    console.log('Scraped markdown length:', markdown.length);
    console.log('Scraped html length:', html.length);
    console.log('Markdown preview:', markdown.slice(0, 500));

    // Use HTML if markdown is too short
    const content = markdown.length > html.length ? markdown : html;

    if (!content || content.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'გვერდზე შინაარსი ვერ მოიძებნა',
          scrapedContent: content.slice(0, 500) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to extract questions
    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI სერვისი არ არის კონფიგურირებული' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert quiz question extractor. Your task is to extract trivia questions from web content, especially from Georgian (ქართული) websites.

CRITICAL INSTRUCTIONS:
1. Look for ANY patterns that indicate quiz questions, such as:
   - Numbered lists with questions
   - Multiple choice options (A, B, C, D or ა, ბ, გ, დ)
   - Question marks followed by answer options
   - Radio buttons or checkboxes with answers
   - "კითხვა" or "პასუხი" keywords
   - Any Q&A format

2. For each question found:
   - Extract the complete question text
   - Identify ALL answer options (usually 4)
   - Determine which answer is correct (look for: ✓, ✔, correct, სწორი, highlighted, selected, checked)
   - If correct answer is not marked, use your knowledge to determine it

3. Output MUST be in the same language as the source content (Georgian if Georgian)

4. Each question MUST have:
   - question_text: The full question (max 200 characters)
   - correct_answer: The correct answer (max 80 characters)
   - incorrect_answers: Array of EXACTLY 3 wrong answers
   - difficulty: "easy", "medium", or "hard" based on question complexity
   - level_number: 1 (default)

5. If you find questions but they don't have 4 options, try to generate appropriate wrong answers

6. Even if the content seems incomplete, extract whatever questions you can find

Return a JSON object with this EXACT structure:
{
  "questions": [
    {
      "question_text": "კითხვის ტექსტი?",
      "correct_answer": "სწორი პასუხი",
      "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
      "difficulty": "medium",
      "level_number": 1
    }
  ],
  "extraction_notes": "Any notes about the extraction process"
}

If absolutely no questions can be found, return: {"questions": [], "extraction_notes": "reason why no questions found"}`;

    console.log('Calling AI to extract questions...');
    
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
          { role: 'user', content: `Extract ALL quiz questions from this web content. Look carefully for any question-answer patterns:\n\n${content.slice(0, 20000)}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more consistent extraction
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI დამუშავება ვერ მოხერხდა: ' + aiResponse.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '{"questions": []}';
    
    console.log('AI response:', aiContent.slice(0, 500));
    
    let parsed;
    try {
      parsed = JSON.parse(aiContent);
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'AI პასუხის გარჩევა ვერ მოხერხდა',
          rawResponse: aiContent.slice(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const questions = parsed.questions || [];
    console.log('Extracted questions count:', questions.length);
    if (parsed.extraction_notes) {
      console.log('Extraction notes:', parsed.extraction_notes);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        questions,
        scrapedContent: content.slice(0, 1000),
        extractionNotes: parsed.extraction_notes
      }),
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
