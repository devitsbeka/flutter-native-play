import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subject, questionCount = 10, answerFormat = "4_answers" } = await req.json()

    if (!subject) {
      return new Response(
        JSON.stringify({ error: "Subject is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formatInstructions = answerFormat === "true_false" 
      ? "Each question should have a correct answer of either 'True' or 'False', and the incorrect answer should be the opposite."
      : "Each question should have exactly 1 correct answer and 3 plausible but incorrect answers."

    const prompt = `Generate ${questionCount} trivia questions about "${subject}".

${formatInstructions}

Return a JSON object with:
- "suggestedTitle": A catchy title for this quiz (in Georgian if subject seems Georgian, otherwise English)
- "questions": An array of question objects

Each question object should have:
- "question_text": The question (keep it under 100 characters, clear and concise)
- "correct_answer": The correct answer
- "incorrect_answers": Array of ${answerFormat === "true_false" ? "1" : "3"} incorrect answers

Make questions engaging, educational, and varied in difficulty. Mix easy, medium, and hard questions.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.`

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("SITE_URL") || "https://lovable.dev",
        "X-Title": "Lovable Quiz Generator"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenRouter error:", errorText)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error("No content in response")
    }

    // Parse the JSON from the response
    let quizData
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : content
      quizData = JSON.parse(jsonStr.trim())
    } catch (parseError) {
      console.error("Failed to parse quiz data:", content)
      throw new Error("Failed to parse generated quiz")
    }

    return new Response(
      JSON.stringify(quizData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate quiz" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
