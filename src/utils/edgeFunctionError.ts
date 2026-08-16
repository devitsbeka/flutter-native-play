import { t } from "@/lib/i18n";

/**
 * What the edge function actually said.
 *
 * `supabase.functions.invoke` throws away the only useful part of a failure.
 * On any non-2xx it returns a `FunctionsHttpError` whose message is the fixed
 * string **"Edge Function returned a non-2xx status code"** — the response
 * body, where the function put its reason, is left unread on `error.context`.
 *
 * So every AI screen in this app reports the same sentence for five unrelated
 * conditions. `generate-custom-quiz` alone answers 400 (no subject), 402 (the
 * AI provider is out of credits), 429 (rate limited), 422 (every generated
 * question failed the fact check) and 500 (no API key, or the provider
 * errored) — each with a written explanation in the body, none of which has
 * ever reached a player or a log.
 *
 * That is not a cosmetic loss. "Can't create trivia, it starts generating and
 * then nothing" was a 402 with `AI კრედიტები ამოიწურა` in the body: the
 * server knew exactly what was wrong and said so, and the client replaced it
 * with a sentence that describes nothing.
 *
 * Reads the body, falls back to a status-appropriate line, and falls back
 * again to the caller's message.
 */

interface MaybeHttpError {
  message?: string;
  context?: unknown;
}

/** Status codes worth their own wording, whatever the function wrote. */
function messageForStatus(status: number): string | null {
  if (status === 402) return t("errors.aiOutOfCredits");
  if (status === 429) return t("errors.aiBusy");
  if (status === 401 || status === 403) return t("errors.signInRequired");
  if (status === 404) return t("errors.serviceUnavailable");
  return null;
}

export async function edgeFunctionMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  const context = (error as MaybeHttpError | null)?.context;

  if (typeof Response !== "undefined" && context instanceof Response) {
    // Cloned so the caller can still read the body if it wants to; an
    // already-consumed Response would throw here and lose the message a
    // second time.
    let body: unknown = null;
    try {
      body = await context.clone().json();
    } catch {
      /* not JSON, or already read — the status still tells us something */
    }

    const written =
      body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
        ? ((body as { error: string }).error as string)
        : null;

    // The status wins over the body for the conditions above: those messages
    // are written for a player, and several functions phrase 402 as an
    // internal-sounding provider error.
    return messageForStatus(context.status) ?? written ?? fallback;
  }

  const message = (error as MaybeHttpError | null)?.message;
  // The generic one is worse than saying nothing specific at all.
  if (message && message !== "Edge Function returned a non-2xx status code") {
    return message;
  }
  return fallback;
}
