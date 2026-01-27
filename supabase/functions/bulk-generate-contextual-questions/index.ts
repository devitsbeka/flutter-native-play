import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";

interface InputItem {
  title: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
}

interface GeneratedQuestion {
  subject: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  image_url?: string;
  video_url?: string;
  audio_url?: string;
}

serve(async (req) => {
  const corsResponse = handleCorsPrelight(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { items, questionType, language = "ka" } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Items array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating contextual questions for ${items.length} items, type: ${questionType}`);

    // Build the list of all subjects for contextual wrong answers
    const allSubjects = items.map((item: InputItem) => item.title);

    // Generate questions in batches
    const BATCH_SIZE = 10;
    const allQuestions: GeneratedQuestion[] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const batchQuestions = await generateQuestionsForBatch(
        batch,
        allSubjects,
        questionType,
        language,
        LOVABLE_API_KEY
      );
      allQuestions.push(...batchQuestions);
    }

    return new Response(
      JSON.stringify({
        success: true,
        questions: allQuestions,
        count: allQuestions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateQuestionsForBatch(
  batch: InputItem[],
  allSubjects: string[],
  questionType: string,
  language: string,
  apiKey: string
): Promise<GeneratedQuestion[]> {
  const isGeorgian = language === "ka";

  // Build prompt for contextual question generation
  const subjectsList = batch.map((item) => item.title).join(", ");
  const otherSubjects = allSubjects.filter(
    (s) => !batch.find((b) => b.title === s)
  );

  const questionPrompt = questionType === "image" 
    ? (isGeorgian ? "ვინ/რა არის ეს?" : "Who/What is this?")
    : (isGeorgian ? "დაასახელეთ:" : "Name:");

  const prompt = `You are creating trivia questions in ${isGeorgian ? "Georgian" : "English"} language.

For each of the following subjects, create a trivia question where:
1. The question is simple: "${questionPrompt}"
2. The correct answer is the subject's name (translated to Georgian if needed)
3. The 3 wrong answers should be OTHER items from this SAME category that are contextually similar
4. All 4 answers should be similarly famous/recognizable so it's challenging

Available subjects for wrong answers: ${allSubjects.join(", ")}

Subjects to create questions for:
${batch.map((item, i) => `${i + 1}. ${item.title}`).join("\n")}

Respond with a JSON array only, no other text:
[
  {
    "subject": "Original English Name",
    "question_text": "${questionPrompt}",
    "correct_answer": "სწორი პასუხი ქართულად",
    "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
    "difficulty": "medium"
  }
]

Important rules:
- All answers must be in Georgian
- Wrong answers must be from the same category (e.g., if subject is a scientist, wrong answers should be other scientists)
- Keep answers short (1-3 words)
- difficulty should be "easy", "medium", or "hard" based on how famous/recognizable the subject is`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert trivia question creator. Always respond with valid JSON arrays only, no markdown or other formatting.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let questions: any[];
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      questions = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      // Return empty array for this batch if parsing fails
      return [];
    }

    // Map questions to include media URLs
    return questions.map((q: any, index: number) => {
      const originalItem = batch[index];
      return {
        subject: q.subject,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers?.slice(0, 3) || [],
        difficulty: q.difficulty || "medium",
        image_url: questionType === "image" ? originalItem?.imageUrl : undefined,
        audio_url: questionType === "audio" ? originalItem?.audioUrl : undefined,
        video_url: undefined, // Video requires manual input
      };
    }).filter((q: GeneratedQuestion) => 
      q.question_text && 
      q.correct_answer && 
      q.incorrect_answers.length >= 3
    );
  } catch (error) {
    console.error("Batch generation error:", error);
    return [];
  }
}
