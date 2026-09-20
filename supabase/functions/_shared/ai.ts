/**
 * Provider-agnostic AI gateway for edge functions.
 *
 * Every AI-calling function imports AI_CHAT_URL / AI_API_KEY / aiModel() from
 * here instead of hard-coding a vendor endpoint, so switching providers is a
 * secrets change rather than a code change across 30+ functions.
 *
 * Provider is chosen at cold start from whichever secret is present, in order:
 *
 *   1. AI_GATEWAY_URL + AI_GATEWAY_API_KEY — any OpenAI-compatible endpoint
 *      (OpenRouter, Azure, a self-hosted proxy, Vertex through a gateway).
 *      Set AI_MODEL_PREFIX="" if your gateway wants bare model names.
 *   2. GEMINI_API_KEY — Google AI Studio's OpenAI-compatible endpoint. Model
 *      ids are sent without the "google/" prefix.
 *   3. LOVABLE_API_KEY — the legacy vendor gateway. Transitional only: it
 *      keeps production running until one of the above is configured. Delete
 *      this branch (and the secret) once the cutover is verified.
 *
 * Cutover: set GEMINI_API_KEY in Supabase secrets, redeploy, confirm
 * AI_PROVIDER reports "google", then remove the legacy secret and branch.
 */

export type AiProviderName = "custom" | "google" | "legacy" | "none";

interface AiProvider {
  name: AiProviderName;
  chatUrl: string;
  apiKey: string;
  mapModel: (model: string) => string;
}

const GOOGLE_OPENAI_CHAT_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// Legacy vendor endpoint. Referenced only here; delete with the branch below.
const LEGACY_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function stripVendorPrefix(model: string): string {
  return model.replace(/^google\//, "");
}

/**
 * Models Google has retired for newly created API keys, with the successor
 * their own 404 names. The Lovable gateway still serves the old ids, so this
 * remap applies only when talking to Google directly — call sites keep the
 * canonical names and this table absorbs the churn in one place.
 *
 * If another feature starts failing with "no longer available to new users",
 * the error message names the replacement: add one line here.
 */
const GOOGLE_MODEL_SUCCESSORS: Record<string, string> = {
  "gemini-2.5-flash": "gemini-3.6-flash",
  // "This model models/gemini-2.5-pro is no longer available to new users.
  //  Please update your code to use models/gemini-3.1-pro-preview" — quoted
  //  from the 404 that blocked every fact-check, and with it every question
  //  the generator wrote.
  "gemini-2.5-pro": "gemini-3.1-pro-preview",
};

function mapGoogleModel(model: string): string {
  const bare = stripVendorPrefix(model);
  return GOOGLE_MODEL_SUCCESSORS[bare] ?? bare;
}

function resolveProvider(): AiProvider {
  const gatewayUrl = Deno.env.get("AI_GATEWAY_URL");
  const gatewayKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (gatewayUrl && gatewayKey) {
    // An explicit empty prefix means the gateway wants bare model names.
    const keepPrefix = Deno.env.get("AI_MODEL_PREFIX") !== "";
    return {
      name: "custom",
      chatUrl: gatewayUrl,
      apiKey: gatewayKey,
      mapModel: keepPrefix ? (m) => m : stripVendorPrefix,
    };
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    return {
      name: "google",
      chatUrl: GOOGLE_OPENAI_CHAT_URL,
      apiKey: geminiKey,
      mapModel: mapGoogleModel,
    };
  }

  const legacyKey = Deno.env.get("LOVABLE_API_KEY");
  if (legacyKey) {
    return {
      name: "legacy",
      chatUrl: LEGACY_CHAT_URL,
      apiKey: legacyKey,
      mapModel: (m) => m,
    };
  }

  return {
    name: "none",
    chatUrl: GOOGLE_OPENAI_CHAT_URL,
    apiKey: "",
    mapModel: stripVendorPrefix,
  };
}

const provider = resolveProvider();

/** Which provider these functions are talking to. Useful in logs. */
export const AI_PROVIDER: AiProviderName = provider.name;

/** OpenAI-compatible chat-completions endpoint for the active provider. */
export const AI_CHAT_URL: string = provider.chatUrl;

/** Bearer token for the active provider. Empty string when unconfigured. */
export const AI_API_KEY: string = provider.apiKey;

/**
 * Normalizes a model id for the active provider. Call sites keep writing the
 * canonical "google/gemini-2.5-flash" form; this maps it to whatever the
 * active endpoint expects.
 */
export function aiModel(model: string): string {
  return provider.mapModel(model);
}

/**
 * Describe an AI gateway failure well enough to act on it.
 *
 * Call sites threw `AI API error: ${status}` and dropped both the upstream
 * body and which provider produced it. That is the same mistake verify-receipt
 * paid for with `"Unknown error"`: a 403 that says nothing cannot be told
 * apart from a wrong key, an unbilled project, a model the key has no access
 * to, or a gateway that has stopped accepting the account entirely — and the
 * reason only existed in a function log nobody outside the Supabase dashboard
 * can read.
 *
 * The provider name matters most. `resolveProvider()` picks at cold start in
 * precedence order — custom gateway, then GEMINI_API_KEY, then the legacy
 * LOVABLE_API_KEY — so an app still on `legacy` is not calling Google at all,
 * and fixing Google billing would change nothing. Naming it in the error is
 * the difference between that being obvious and being guessed at.
 *
 * Anything key-shaped in the upstream body is redacted: these strings reach a
 * client, and a provider that echoes the credential back in its own error
 * message must not have it forwarded.
 */
export function describeAiFailure(status: number, body: string): string {
  const redacted = body
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, "[redacted-key]")
    .replace(/\bsk-[0-9A-Za-z_-]{10,}/g, "[redacted-key]")
    .replace(/Bearer\s+[0-9A-Za-z._-]{10,}/gi, "Bearer [redacted]")
    .slice(0, 400);

  return `AI API error: ${status} (provider=${AI_PROVIDER}) ${redacted}`.trim();
}
