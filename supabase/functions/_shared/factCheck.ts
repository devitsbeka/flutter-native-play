import { getCorsHeaders } from "./cors.ts";
import { AI_CHAT_URL, AI_API_KEY, AI_PROVIDER, aiModel } from "./ai.ts";

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

/**
 * Two checkers, and they have to agree.
 *
 * The pair was written for a gateway that fronts every vendor, so one is
 * Google's and one is OpenAI's — genuinely independent, which is the whole
 * point of asking twice. Talking to Google directly, that pair cannot work:
 * generativelanguage.googleapis.com has never heard of gpt-5-mini and does
 * not accept the "google/" prefix on its own models either. Both calls 404,
 * every batch fails the check, and run-generation-job does the right thing
 * with a broken checker — it refuses to save anything. Which is exactly what
 * it did: "Fact-check failed, will retry later", 503, forever, on a key with
 * credit on it.
 *
 * So the pair depends on who is answering. A vendor-agnostic gateway keeps
 * the cross-family check. Google direct gets two different Google models —
 * less independent than two vendors, and still two separate judgements at
 * temperature 0 rather than one model marking its own homework.
 */
const CROSS_VENDOR_MODELS = ["google/gemini-2.5-pro", "openai/gpt-5-mini"] as const;
const GOOGLE_ONLY_MODELS = ["google/gemini-2.5-pro", "google/gemini-2.5-flash"] as const;

const [PRIMARY_MODEL, SECONDARY_MODEL] =
  AI_PROVIDER === "google" ? GOOGLE_ONLY_MODELS : CROSS_VENDOR_MODELS;

function safeJsonParse<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = (fenced ? fenced[1] : text).trim();
  return JSON.parse(jsonStr);
}

async function runSingleFactCheck(opts: {
  items: FactCheckItem[];
  context: {
    language: "ka" | "en";
    mode: "multiple_choice" | "true_false";
    topicHint?: string;
    categoryHint?: string;
  };
  model: string;
  minConfidence: number;
  apiKey: string;
  temperature?: number;
}): Promise<FactCheckResult[]> {
  const { items, context, model, minConfidence, apiKey, temperature } = opts;

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

  const resp = await fetch(AI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Through aiModel(), because the id written above is the canonical
      // "google/gemini-2.5-pro" form and Google's own endpoint wants it bare
      // — and wants the retired ones under their successor's name. Every
      // other AI call in the codebase goes through this; this file was the
      // one that did not, and it sent the prefix straight through.
      model: aiModel(model),
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
      ...(temperature !== undefined ? { temperature } : {}),
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error(`factCheck [${model}] error:`, resp.status, t);
    if (resp.status === 429) throw new Error("Rate limited");
    if (resp.status === 402) throw new Error("Payment required");
    throw new Error(`Fact-check API error (${model}): ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No content from fact-check model ${model}`);

  const parsed = safeJsonParse<{ results?: FactCheckResult[] }>(content);
  const results = Array.isArray(parsed.results) ? parsed.results : [];

  return results
    .filter((r) => typeof r?.index === "number")
    .map((r) => ({
      index: r.index,
      pass: Boolean(r.pass) && (typeof r.confidence === "number" ? r.confidence : 0) >= minConfidence,
      confidence: typeof r.confidence === "number" ? r.confidence : 0,
      reason: r.reason,
    }));
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

  const minConfidence = typeof opts.minConfidence === "number" ? opts.minConfidence : 0.95;
  if (!Array.isArray(items) || items.length === 0) {
    return { results: [], corsHeaders };
  }

  if (!AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured");
  }

  // Run BOTH model families in parallel for cross-validation
  console.log(`Fact-checking ${items.length} items with dual-model cross-validation (minConfidence: ${minConfidence})`);

  const [primaryResults, secondaryResults] = await Promise.all([
    runSingleFactCheck({
      items,
      context,
      model: PRIMARY_MODEL,
      minConfidence,
      apiKey: AI_API_KEY,
      temperature: 0,
    }),
    runSingleFactCheck({
      items,
      context,
      model: SECONDARY_MODEL,
      minConfidence,
      apiKey: AI_API_KEY,
      // Left at the provider default: openai/gpt-5-mini accepts nothing else,
      // and a second Gemini at its own default is still a separate judgement.
    }),
  ]);

  // Build lookup maps
  const primaryByIndex = new Map(primaryResults.map((r) => [r.index, r]));
  const secondaryByIndex = new Map(secondaryResults.map((r) => [r.index, r]));

  // Cross-validate: question passes ONLY if BOTH models agree
  const crossValidated: FactCheckResult[] = items.map((_, idx) => {
    const p = primaryByIndex.get(idx);
    const s = secondaryByIndex.get(idx);

    const primaryPass = p?.pass ?? false;
    const secondaryPass = s?.pass ?? false;
    const bothPass = primaryPass && secondaryPass;

    // Log disagreements for debugging
    if (primaryPass !== secondaryPass) {
      const pModel = PRIMARY_MODEL.split("/")[1];
      const sModel = SECONDARY_MODEL.split("/")[1];
      const rejector = !primaryPass ? pModel : sModel;
      const reason = !primaryPass ? p?.reason : s?.reason;
      console.log(`⚠️ Model disagreement on Q${idx}: ${rejector} rejected (${reason || "no reason"})`);
    }

    if (!bothPass && (p || s)) {
      const reasons: string[] = [];
      if (!primaryPass && p) reasons.push(`${PRIMARY_MODEL.split("/")[1]}: ${p.reason || "failed"}`);
      if (!secondaryPass && s) reasons.push(`${SECONDARY_MODEL.split("/")[1]}: ${s.reason || "failed"}`);
      console.log(`❌ Q${idx} rejected: ${reasons.join(" | ")}`);
    }

    return {
      index: idx,
      pass: bothPass,
      confidence: Math.min(p?.confidence ?? 0, s?.confidence ?? 0),
      reason: bothPass
        ? "Passed both models"
        : `Rejected: ${[
            !primaryPass ? `${PRIMARY_MODEL.split("/")[1]}: ${p?.reason || "failed/missing"}` : null,
            !secondaryPass ? `${SECONDARY_MODEL.split("/")[1]}: ${s?.reason || "failed/missing"}` : null,
          ].filter(Boolean).join(" | ")}`,
    };
  });

  const passCount = crossValidated.filter((r) => r.pass).length;
  console.log(`Dual-model fact-check: ${passCount}/${items.length} passed (both models agree at ≥${minConfidence} confidence)`);

  return { results: crossValidated, corsHeaders };
}
