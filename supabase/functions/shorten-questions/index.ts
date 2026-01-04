import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_LENGTH = 67;
const BATCH_SIZE = 10;

interface Question {
  id: string;
  question_text: string;
  category_id: string;
}

interface ShortenResult {
  id: string;
  original: string;
  shortened: string | null;
  status: 'shortened' | 'unshortenable' | 'failed';
  originalLength: number;
  newLength: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, testMode, inProduction } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for questions that need shortening
    let query = supabase
      .from("questions")
      .select("id, question_text, category_id")
      .eq("is_active", true)
      .is("shorten_status", null);

    // Filter by production status
    if (inProduction !== undefined) {
      query = query.eq("in_production", inProduction);
    }

    // Filter by category if specified
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }

    // Only get questions longer than MAX_LENGTH
    const { data: allQuestions, error: fetchError } = await query;
    
    if (fetchError) {
      console.error("Error fetching questions:", fetchError);
      throw fetchError;
    }

    // Filter by length in code (Supabase doesn't support LENGTH in queries easily)
    const longQuestions = (allQuestions || []).filter(
      (q) => q.question_text.length > MAX_LENGTH
    );

    const limit = testMode ? Math.min(5, longQuestions.length) : BATCH_SIZE;
    const questionsToProcess = longQuestions.slice(0, limit);

    if (questionsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          done: true,
          processed: 0,
          shortened: 0,
          unshortenable: 0,
          failed: 0,
          remaining: 0,
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ShortenResult[] = [];
    let shortened = 0;
    let unshortenable = 0;
    let failed = 0;

    // Process questions one by one to avoid overwhelming the AI
    for (const question of questionsToProcess) {
      try {
        const prompt = `შენ ხარ ქართული ქვიზის კითხვების შემოკლების ექსპერტი. შენი ამოცანაა კითხვის შემოკლება ${MAX_LENGTH} სიმბოლომდე, მნიშვნელობის შენარჩუნებით.

წესები:
1. შეინარჩუნე ზუსტად იგივე მნიშვნელობა და სწორი პასუხი
2. გამოიყენე ბუნებრივი ქართული გრამატიკა
3. წაშალე ზედმეტი სიტყვები: "რომელი", "რა ერქვა", "რომელმა" და ა.შ.
4. იყავი ლაკონური მაგრამ გასაგები

თუ კითხვის შემოკლება ${MAX_LENGTH} სიმბოლომდე შეუძლებელია მნიშვნელობის დაკარგვის გარეშე, უპასუხე მხოლოდ: CANNOT_SHORTEN

კითხვა: "${question.question_text}"
მიმდინარე სიგრძე: ${question.question_text.length} სიმბოლო
სამიზნე: ${MAX_LENGTH} სიმბოლომდე

შემოკლებული კითხვა:`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: prompt }
            ],
            max_tokens: 200,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log("Rate limited, marking as failed for retry");
            results.push({
              id: question.id,
              original: question.question_text,
              shortened: null,
              status: 'failed',
              originalLength: question.question_text.length,
              newLength: null,
            });
            failed++;
            continue;
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content?.trim() || "";

        if (aiResponse === "CANNOT_SHORTEN" || aiResponse.includes("CANNOT_SHORTEN")) {
          // Mark as unshortenable
          await supabase
            .from("questions")
            .update({ 
              shorten_status: "unshortenable",
              original_question_text: question.question_text
            })
            .eq("id", question.id);

          results.push({
            id: question.id,
            original: question.question_text,
            shortened: null,
            status: 'unshortenable',
            originalLength: question.question_text.length,
            newLength: null,
          });
          unshortenable++;
        } else if (aiResponse.length > 0 && aiResponse.length <= MAX_LENGTH) {
          // Successfully shortened
          await supabase
            .from("questions")
            .update({ 
              question_text: aiResponse,
              shorten_status: "shortened",
              original_question_text: question.question_text
            })
            .eq("id", question.id);

          results.push({
            id: question.id,
            original: question.question_text,
            shortened: aiResponse,
            status: 'shortened',
            originalLength: question.question_text.length,
            newLength: aiResponse.length,
          });
          shortened++;
        } else if (aiResponse.length > MAX_LENGTH) {
          // AI tried but still too long - mark as unshortenable
          await supabase
            .from("questions")
            .update({ 
              shorten_status: "unshortenable",
              original_question_text: question.question_text
            })
            .eq("id", question.id);

          results.push({
            id: question.id,
            original: question.question_text,
            shortened: aiResponse,
            status: 'unshortenable',
            originalLength: question.question_text.length,
            newLength: aiResponse.length,
          });
          unshortenable++;
        } else {
          // Empty response - mark as failed
          results.push({
            id: question.id,
            original: question.question_text,
            shortened: null,
            status: 'failed',
            originalLength: question.question_text.length,
            newLength: null,
          });
          failed++;
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.error(`Error processing question ${question.id}:`, err);
        results.push({
          id: question.id,
          original: question.question_text,
          shortened: null,
          status: 'failed',
          originalLength: question.question_text.length,
          newLength: null,
        });
        failed++;
      }
    }

    const remaining = longQuestions.length - questionsToProcess.length;

    return new Response(
      JSON.stringify({
        done: remaining === 0 || testMode,
        processed: questionsToProcess.length,
        shortened,
        unshortenable,
        failed,
        remaining,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in shorten-questions function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
