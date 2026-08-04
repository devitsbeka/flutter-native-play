import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";


serve(async (req) => {
  const corsResponse = handleCorsPrelight(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { title, content, mediaUrl, questionType, questionCount } = await req.json();

    if (!content || !questionType || !questionCount) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating", questionCount, "questions for:", title, "Type:", questionType);

    const systemPrompt = getSystemPrompt(questionType, mediaUrl);
    const userPrompt = getUserPrompt(title, content, questionType, questionCount);

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-3-flash-preview"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate trivia questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string" },
                        correct_answer: { type: "string" },
                        incorrect_answers: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 3,
                          maxItems: 3,
                        },
                        difficulty: {
                          type: "string",
                          enum: ["easy", "medium", "hard"],
                        },
                      },
                      required: ["question_text", "correct_answer", "incorrect_answers", "difficulty"],
                    },
                  },
                },
                required: ["questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", data);
      return new Response(
        JSON.stringify({ success: false, error: "No questions generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    let questions = parsed.questions || [];

    // Add media URL to questions if applicable
    if (mediaUrl && questionType !== "text") {
      questions = questions.map((q: any) => ({
        ...q,
        ...(questionType === "image" && { image_url: mediaUrl }),
        ...(questionType === "video" && { video_url: mediaUrl }),
        ...(questionType === "audio" && { audio_url: mediaUrl }),
      }));
    }

    console.log("Generated", questions.length, "questions");

    return new Response(
      JSON.stringify({ success: true, questions }),
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

function getSystemPrompt(questionType: string, mediaUrl?: string): string {
  const basePrompt = `შენ ხარ ქართული ტრივიას კითხვების გენერატორი. შენი ამოცანაა შექმნა საინტერესო, ფაქტობრივად ზუსტი კითხვები ქართულ ენაზე.

თითოეულ კითხვას უნდა ჰქონდეს:
- კითხვის ტექსტი (ქართულად)
- 1 სწორი პასუხი
- 3 არასწორი პასუხი (რომლებიც უნდა იყოს დამაჯერებელი, მაგრამ არასწორი)
- სირთულე: easy, medium ან hard

მნიშვნელოვანი წესები:
- ყველა ტექსტი უნდა იყოს ქართულად
- პასუხები უნდა იყოს მოკლე (1-4 სიტყვა)
- კითხვები უნდა იყოს ფაქტობრივად ზუსტი
- არასწორი პასუხები უნდა იყოს დამაჯერებელი`;

  if (questionType === "image") {
    return `${basePrompt}

სპეციალური ინსტრუქციები სურათიანი კითხვებისთვის:
- კითხვა უნდა ეხებოდეს სურათზე გამოსახულ ობიექტს/ადამიანს/ადგილს
- კითხვა უნდა იყოს მოკლე (2-5 სიტყვა), მაგალითად: "ვინ არის ეს?", "რა არის ეს?", "სად მდებარეობს?"
- პასუხი უნდა იყოს ის, რაც სურათზეა ნაჩვენები`;
  }

  if (questionType === "video") {
    return `${basePrompt}

სპეციალური ინსტრუქციები ვიდეო კითხვებისთვის:
- კითხვა უნდა ეხებოდეს ვიდეოში ნაჩვენებ მოვლენას/ადამიანს
- კითხვა უნდა იყოს მოკლე (2-5 სიტყვა)`;
  }

  if (questionType === "audio") {
    return `${basePrompt}

სპეციალური ინსტრუქციები აუდიო კითხვებისთვის:
- კითხვა უნდა ეხებოდეს აუდიოში მოსმენილს
- კითხვა უნდა იყოს მოკლე, მაგალითად: "ვინ მღერის?", "რა სიმღერაა?"`;
  }

  return basePrompt;
}

function getUserPrompt(title: string, content: string, questionType: string, questionCount: number): string {
  return `თემა: "${title}"

კონტენტი:
${content.slice(0, 6000)}

შექმენი ${questionCount} ${getTypeLabel(questionType)} კითხვა ზემოთ მოცემული ინფორმაციის საფუძველზე.`;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "image": return "სურათიანი";
    case "video": return "ვიდეო";
    case "audio": return "აუდიო";
    default: return "ტექსტური";
  }
}
