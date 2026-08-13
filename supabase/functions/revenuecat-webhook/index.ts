/**
 * RevenueCat webhook — the authoritative writer of store entitlements.
 *
 * The app can only tell us about things that happen while it is open. Renewals
 * land at 3am, cancellations happen in the App Store's own settings, and
 * refunds are issued by Apple support days later. Without this endpoint the
 * only entitlement changes we would ever see are purchases, which is how
 * subscriptions end up never expiring.
 *
 * Authenticated by a shared secret in the Authorization header, configured on
 * the RevenueCat side. `verify_jwt = false` in config.toml because RevenueCat
 * has no Supabase session — this header is the whole gate, so it is compared
 * in constant time and the function refuses to run if the secret is unset.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { webhookCorsHeaders } from "../_shared/cors.ts";
import { syncUserFromStore } from "../_shared/iap.ts";

/**
 * Events that change what a user is entitled to. Everything else (TEST,
 * SUBSCRIBER_ALIAS, and the informational transfer notices) is acknowledged
 * without a re-sync.
 *
 * Each one is handled the same way: re-read the subscriber from RevenueCat
 * rather than trying to mutate state from the event body. The event tells us
 * *that* something changed; RevenueCat tells us what the truth now is. That
 * makes out-of-order and duplicate deliveries harmless.
 */
const ENTITLEMENT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
  "CANCELLATION",
  "UNCANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "SUBSCRIPTION_PAUSED",
  "TRANSFER",
]);

/** Constant-time comparison, so a wrong secret leaks nothing through timing. */
function secretMatches(provided: string, expected: string): boolean {
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: webhookCorsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...webhookCorsHeaders, "Content-Type": "application/json" },
    });

  const expectedSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!expectedSecret) {
    // Refusing is the safe failure. Processing unauthenticated webhooks would
    // let anyone who finds the URL write entitlements — the exact hole this
    // whole change set exists to close.
    console.error("REVENUECAT_WEBHOOK_SECRET is not configured; refusing to process");
    return json({ error: "Webhook not configured" }, 500);
  }

  const provided = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secretMatches(provided, expectedSecret)) {
    console.warn("Rejected webhook with bad or missing secret");
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const event = body?.event ?? {};
    const eventId: string | undefined = event.id;
    const eventType: string = event.type ?? "UNKNOWN";

    // RevenueCat's app_user_id is the Supabase user id — the client sets it
    // with Purchases.logIn({ appUserID: user.id }). An anonymous id ($RCAnonymousID)
    // means the purchase happened before sign-in; there is no account to
    // credit yet, and the app's own re-sync will pick it up after login.
    const appUserId: string | undefined = event.app_user_id;

    if (!eventId) {
      return json({ error: "Missing event id" }, 400);
    }

    // Record the event before acting on it. The unique constraint on event_id
    // is what makes RevenueCat's retries idempotent.
    const { error: ledgerError } = await supabase.from("iap_events").insert({
      event_id: eventId,
      event_type: eventType,
      user_id: appUserId && !appUserId.startsWith("$RCAnonymousID") ? appUserId : null,
      product_id: event.product_id ?? null,
      store: event.store ?? null,
      transaction_id: event.transaction_id ?? null,
      event_at: event.event_timestamp_ms ? new Date(event.event_timestamp_ms).toISOString() : null,
      payload: body,
    });

    if (ledgerError) {
      if (ledgerError.code === "23505") {
        console.log(`Event ${eventId} already processed; acknowledging`);
        return json({ received: true, duplicate: true });
      }
      throw ledgerError;
    }

    if (!ENTITLEMENT_EVENTS.has(eventType)) {
      console.log(`Event ${eventId} (${eventType}) needs no entitlement change`);
      return json({ received: true, applied: false });
    }

    if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
      console.log(`Event ${eventId} has no signed-in user; nothing to apply`);
      return json({ received: true, applied: false });
    }

    try {
      const result = await syncUserFromStore(supabase, appUserId);

      console.log(
        `Applied ${eventType} for ${appUserId}: tier=${result.tier ?? "none"} ` +
        `expires=${result.expiresAt ?? "n/a"} gemsCredited=${result.gemsCredited}`,
      );
    } catch (syncError) {
      // The ledger row is already in, and it is what makes retries idempotent —
      // so leaving it behind after a failed sync would turn RevenueCat's next
      // delivery into a "duplicate, already processed" no-op and strand the
      // entitlement. Release the claim so the retry actually retries.
      await supabase.from("iap_events").delete().eq("event_id", eventId);
      throw syncError;
    }

    return json({ received: true, applied: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook processing failed:", error);
    // A 500 makes RevenueCat retry, which is what we want for transient
    // failures — the ledger keeps the retry from double-applying.
    return json({ error: message }, 500);
  }
});
