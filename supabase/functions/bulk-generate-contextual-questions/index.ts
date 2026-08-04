import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

interface InputItem {
  title: string;
  content: string;
  imageUrl?: string;
}

type ThemeType = 
  | 'people' | 'cities' | 'countries' | 'companies' | 'landmarks' | 'animals' | 'sports'
  | 'athletes' | 'footballers' | 'basketballers' | 'tennis_players'
  | 'painters' | 'paintings' | 'sculptors' | 'artworks'
  | 'scientists' | 'historical_figures'
  | 'musicians' | 'composers' | 'singers'
  | 'actors' | 'directors' | 'entertainers'
  | 'flags'
  | 'generic';

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

// Extended question templates for all theme types
const questionTemplates: Record<ThemeType, Record<string, string>> = {
  people: { image: 'ვინ არის ეს?', text: 'ვინ არის?' },
  cities: { image: 'რომელი ქალაქია?', text: 'რომელი ქალაქია?' },
  countries: { image: 'რომელი ქვეყანაა?', text: 'რომელი ქვეყანაა?' },
  companies: { image: 'რომელი კომპანიაა?', text: 'რომელი კომპანიაა?' },
  landmarks: { image: 'რომელი ღირსშესანიშნაობაა?', text: 'რომელი ადგილია?' },
  animals: { image: 'რომელი ცხოველია?', text: 'რომელი ცხოველია?' },
  sports: { image: 'ვინ არის ეს სპორტსმენი?', text: 'ვინ არის ეს სპორტსმენი?' },
  athletes: { image: 'ვინ არის ეს სპორტსმენი?', text: 'ვინ არის ეს სპორტსმენი?' },
  footballers: { image: 'ვინ არის ეს ფეხბურთელი?', text: 'ვინ არის ეს ფეხბურთელი?' },
  basketballers: { image: 'ვინ არის ეს კალათბურთელი?', text: 'ვინ არის ეს კალათბურთელი?' },
  tennis_players: { image: 'ვინ არის ეს ტენისისტი?', text: 'ვინ არის ეს ტენისისტი?' },
  painters: { image: 'ვინ არის ეს მხატვარი?', text: 'ვინ არის ეს მხატვარი?' },
  paintings: { image: 'ვინ დახატა ეს ნახატი?', text: 'ვინ დახატა?' },
  sculptors: { image: 'ვინ არის ეს მოქანდაკე?', text: 'ვინ არის ეს მოქანდაკე?' },
  artworks: { image: 'ვინ შექმნა ეს ნაწარმოები?', text: 'ვინ შექმნა?' },
  scientists: { image: 'ვინ არის ეს მეცნიერი?', text: 'ვინ არის ეს მეცნიერი?' },
  historical_figures: { image: 'ვინ არის ეს ისტორიული პიროვნება?', text: 'ვინ არის?' },
  musicians: { image: 'ვინ არის ეს მუსიკოსი?', text: 'ვინ არის ეს მუსიკოსი?' },
  composers: { image: 'ვინ არის ეს კომპოზიტორი?', text: 'ვინ არის ეს კომპოზიტორი?' },
  singers: { image: 'ვინ არის ეს მომღერალი?', text: 'ვინ არის ეს მომღერალი?' },
  actors: { image: 'ვინ არის ეს მსახიობი?', text: 'ვინ არის ეს მსახიობი?' },
  directors: { image: 'ვინ არის ეს რეჟისორი?', text: 'ვინ არის ეს რეჟისორი?' },
  entertainers: { image: 'ვინ არის ეს?', text: 'ვინ არის?' },
  flags: { image: 'რომელი ქვეყნის დროშაა?', text: 'რომელი ქვეყნის დროშაა?' },
  generic: { image: 'რა არის ეს?', text: 'დაასახელეთ:' }
};

// Dynamic question text based on theme and type
function getQuestionText(theme: ThemeType, questionType: string): string {
  return questionTemplates[theme]?.[questionType] || questionTemplates.generic[questionType] || questionTemplates.generic.image;
}

// Get theme description for AI context
function getThemeContext(theme: ThemeType): string {
  const contexts: Record<ThemeType, string> = {
    people: 'famous people, celebrities, historical figures, scientists, artists',
    cities: 'cities, capitals, urban areas, metropolitan regions',
    countries: 'countries, nations, sovereign states',
    companies: 'companies, brands, corporations, businesses, tech companies',
    landmarks: 'landmarks, monuments, famous buildings, architectural wonders, tourist attractions',
    animals: 'animals, wildlife, mammals, birds, fish, reptiles',
    sports: 'athletes, sportspeople, sports stars',
    athletes: 'athletes, sportspeople, sports stars from various disciplines',
    footballers: 'football/soccer players, professional footballers',
    basketballers: 'basketball players, NBA players, professional basketballers',
    tennis_players: 'tennis players, professional tennis athletes',
    painters: 'famous painters, visual artists, art masters',
    paintings: 'famous paintings, artworks, masterpieces',
    sculptors: 'sculptors, sculpture artists, famous sculptors',
    artworks: 'artworks, art pieces, museum exhibits',
    scientists: 'scientists, inventors, researchers, Nobel laureates',
    historical_figures: 'historical figures, leaders, revolutionaries, famous historical people',
    musicians: 'musicians, music artists, singers, performers',
    composers: 'classical composers, music composers, conductors',
    singers: 'singers, vocalists, music performers',
    actors: 'actors, actresses, movie stars, theater performers',
    directors: 'film directors, movie directors, famous filmmakers',
    entertainers: 'entertainers, celebrities, movie stars, directors',
    flags: 'national flags, country flags',
    generic: 'various topics and subjects'
  };
  return contexts[theme] || contexts.generic;
}

serve(async (req) => {
  const corsResponse = handleCorsPrelight(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { items, questionType, themeType = "generic", language = "ka" } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Items array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!AI_API_KEY) {
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
        themeType as ThemeType,
        language,
        AI_API_KEY
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
  themeType: ThemeType,
  language: string,
  apiKey: string
): Promise<GeneratedQuestion[]> {
  const isGeorgian = language === "ka";
  
  // Get dynamic question text based on theme
  const questionPrompt = getQuestionText(themeType, questionType);
  const themeContext = getThemeContext(themeType);

  const prompt = `You are creating trivia questions in ${isGeorgian ? "Georgian" : "English"} language.
The category is: ${themeContext}

For each of the following subjects, create a trivia question where:
1. The question text is: "${questionPrompt}"
2. The correct answer is the subject's name (translated to Georgian if the language is Georgian)
3. The 3 wrong answers should be OTHER items from the same category (${themeContext}) that are contextually similar and equally famous
4. All 4 answers should be similarly famous/recognizable to make the question challenging

Available subjects for wrong answers (use these for contextually similar distractors): ${allSubjects.join(", ")}

Subjects to create questions for:
${batch.map((item, i) => `${i + 1}. ${item.title}`).join("\n")}

Respond with a JSON array only, no other text or markdown:
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
- All answers must be in Georgian language
- Wrong answers MUST be from the same category (${themeContext})
- Keep answers short (1-3 words maximum)
- difficulty should be "easy" (very famous), "medium" (moderately known), or "hard" (less known but notable)
- Use the exact question_text format: "${questionPrompt}"
- Make sure all 3 incorrect answers are different from each other and from the correct answer`;

  try {
    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
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
        video_url: undefined,
        audio_url: undefined,
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
