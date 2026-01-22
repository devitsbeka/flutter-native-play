import { getCorsHeaders } from "./cors.ts";

export type FactCheckItem = {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
};

export type FactCheckResult = {
  index: number;
  pass: boolean;
  confidence: number; // 0..1
  reason?: string;
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

function safeJsonParse<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = (fenced ? fenced[1] : text).trim();
  return JSON.parse(jsonStr);
}

export async function factCheckQuestions(opts: {
  req: Request;
  items: FactCheckItem[];
  context: {
    language: "ka" | "en";
    mode: "multiple_choice" | "true_false";
    topicHint?: string;
    categoryHint?: string;
  };
  model?: string;
  minConfidence?: number;
}): Promise<{ results: FactCheckResult[]; corsHeaders: Record<string, string> }> {
  const corsHeaders = getCorsHeaders(opts.req);
  const { items, context } = opts;

  const minConfidence = typeof opts.minConfidence === "number" ? opts.minConfidence : 0.85;
  if (!Array.isArray(items) || items.length === 0) {
    return { results: [], corsHeaders };
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const systemPrompt = context.language === "ka"
    ? `შენ ხარ უკიდურესად მკაცრი ფაქტების შემმოწმებელი (fact-checker) ქართული ტრივიისთვის.

ამოცანა: შეამოწმე თითოეული ელემენტი:
1) სწორია თუ არა correct_answer მოცემული question_text-ისთვის.
2) ყველა incorrect_answers უნდა იყოს არასწორი (არ შეიძლება სწორი იყოს).
3) თუ 100%-ით დარწმუნებული არ ხარ ფაქტში/პასუხში — აუცილებლად ჩათვალე FAIL.

ფორმატი:
- დააბრუნე მხოლოდ JSON ობიექტი {"results": [...]}
- results-ის თითოეულ ელემენტში მოიტანე: index (რიცხვი), pass (boolean), confidence (0..1), reason (მოკლე).

სპეც. წესი True/False-ზე:
- თუ correct_answer არის "მართალია"/"მცდარია", მაშინ question_text არის განცხადება.
- PASS მხოლოდ მაშინ, თუ განცხადების ჭეშმარიტება/მცდარობა ზუსტად ემთხვევა correct_answer-ს.
`
    : `You are an extremely strict fact-checker for trivia.

Task: for each item verify:
1) correct_answer is correct for the question_text.
2) all incorrect_answers are incorrect.
3) If you are not 100% sure, mark FAIL.

Return ONLY JSON object: {"results": [{"index":0,"pass":true,"confidence":0.93,"reason":"..."}]}

True/False rule:
- If correct_answer is "True"/"False" (or localized), question_text is a statement.
- PASS only if statement truth value matches correct_answer.
`;

  const userPayload = {
    topicHint: context.topicHint || null,
    categoryHint: context.categoryHint || null,
    mode: context.mode,
    items: items.map((it, index) => ({
      index,
      question_text: it.question_text,
      correct_answer: it.correct_answer,
      incorrect_answers: it.incorrect_answers,
    })),
    minConfidence,
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            context.language === "ka"
              ? `შეამოწმე შემდეგი კითხვები. თუ არ ხარ 100%-ით დარწმუნებული — FAIL.\n\n${JSON.stringify(userPayload)}`
              : `Fact-check the following items. If not 100% sure — FAIL.\n\n${JSON.stringify(userPayload)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("factCheckQuestions AI error:", resp.status, t);
    if (resp.status === 429) {
      throw new Error("Rate limited");
    }
    if (resp.status === 402) {
      throw new Error("Payment required");
    }
    throw new Error(`Fact-check API error: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from fact-check model");

  const parsed = safeJsonParse<{ results?: FactCheckResult[] }>(content);
  const results = Array.isArray(parsed.results) ? parsed.results : [];

  // Normalize + enforce minConfidence
  const normalized = results
    .filter((r) => typeof r?.index === "number")
    .map((r) => ({
      index: r.index,
      pass: Boolean(r.pass) && (typeof r.confidence === "number" ? r.confidence : 0) >= minConfidence,
      confidence: typeof r.confidence === "number" ? r.confidence : 0,
      reason: r.reason,
    }));

  return { results: normalized, corsHeaders };
}
