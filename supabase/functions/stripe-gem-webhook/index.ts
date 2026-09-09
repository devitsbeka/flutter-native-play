import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { lookupGemPack } from "../_shared/gems.ts";
import { creditSubscriptionWelcome } from "../_shared/iap.ts";
import {
  decideSubscription,
  webGrantWins,
  webMayExpire,
  type StripeSubscriptionLike,
} from "../_shared/stripeSubscriptionState.ts";

/**
 * Everything Stripe has to tell us — gem packs AND subscriptions.
 *
 * **The name is wrong and stays wrong on purpose.** This used to handle gem
 * packs only, and a `mode: "subscription"` checkout has no `product_id` in its
 * metadata, so every web PRO purchase reached the gem branch, failed
 * `lookupGemPack`, and was answered with a 400. Stripe retried for three days
 * and gave up. The money moved; the entitlement never did.
 *
 * The fix could have been a second function. It is not, for a deployment
 * reason that matters more than the name: edge functions here ship through
 * Lovable (AGENTS.md §4a), and a function Lovable has never seen has to be
 * deployed explicitly — `send-game-invite-push` sat at HTTP 404 for exactly
 * that reason while every other function answered 401. An existing function
 * gets redeployed from `main` on the next sync, and the Stripe dashboard
 * keeps pointing at the endpoint it already has, with the signing secret it
 * already has. Renaming it would cost a webhook re-registration and a second
 * `STRIPE_WEBHOOK_SECRET`, and the failure mode of getting that wrong is
 * silent.
 *
 * Events handled:
 *   checkout.session.completed        gem packs (mode=payment) — credit gems
 *   customer.subscription.created     PRO — write the entitlement
 *   customer.subscription.updated     renewal, cancellation, trial→active
 *   customer.subscription.deleted     the period actually ended
 *
 * A subscription-mode `checkout.session.completed` is acknowledged and
 * ignored: `customer.subscription.created` carries the same news with the
 * period end attached, and granting from both would be two writers for one
 * fact.
 *
 * Anything else gets a 200 and no action. Answering 4xx to an event we simply
 * do not handle is what makes Stripe retry it for days and then disable the
 * endpoint — so "not for us" is a success, not an error.
 */

// Stripe webhook needs to accept requests from Stripe's servers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * A gem pack was paid for.
 *
 * Unchanged behaviour: the grant comes from the server catalog rather than the
 * event, the purchase row is claimed with a `status = 'pending'` predicate so
 * Stripe's at-least-once delivery cannot pay out twice, and a failed credit
 * releases the claim instead of leaving somebody paid and empty-handed.
 */
async function handleGemCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<Response> {
  const userId = session.metadata?.user_id;
  const productId = session.metadata?.product_id;

  // `checkout.session.completed` also fires for asynchronous payment
  // methods before the money has actually moved, with payment_status
  // "unpaid". Crediting on that grants gems for a payment that may never
  // settle.
  if (session.payment_status !== "paid") {
    console.log(`Session ${session.id} completed but unpaid; nothing credited`);
    return json({ received: true, credited: false });
  }

  // The grant comes from the catalog, not from the event. Metadata is
  // editable in the Stripe dashboard and was, before this, the only thing
  // deciding how many gems a purchase was worth.
  const pack = lookupGemPack(productId);
  if (!userId || !pack) {
    console.error("Unusable session metadata:", session.metadata);
    return json({ error: "Missing metadata" }, 400);
  }
  const gems = pack.gems;

  // Claim the purchase before crediting. Stripe retries a webhook until it
  // gets a 2xx and will redeliver after a timeout, so an at-least-once
  // event met an unconditional credit: the same payment could pay out
  // several times. The `status = pending` predicate makes the row itself
  // the lock — only the first delivery matches it.
  const { data: claimed, error: claimError } = await supabase
    .from("gem_purchases")
    .update({
      status: "completed",
      payment_intent_id: session.payment_intent as string,
      completed_at: new Date().toISOString(),
    })
    .eq("checkout_session_id", session.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError) {
    console.error("Error claiming purchase record:", claimError);
    return json({ error: "Claim failed" }, 500);
  }

  if (!claimed) {
    console.log(`Session ${session.id} already processed; skipping`);
    return json({ received: true, duplicate: true });
  }

  console.log(`Processing payment for user ${userId}: ${gems} gems`);

  const { error: currencyError } = await supabase.rpc("update_user_currency", {
    p_user_id: userId,
    p_gems_delta: gems,
    p_coins_delta: 0,
  });

  if (currencyError) {
    // Release the claim, so a retry can credit rather than being turned
    // away as a duplicate on a purchase that was never paid out.
    console.error("Error crediting gems, claim released:", currencyError);
    await supabase
      .from("gem_purchases")
      .update({ status: "credit_failed" })
      .eq("id", claimed.id);

    return json({ error: "Credit failed" }, 500);
  }

  console.log(`Successfully credited ${gems} gems to user ${userId}`);

  // Log to purchase_transactions for analytics
  await supabase.from("purchase_transactions").insert({
    user_id: userId,
    product_id: pack.id,
    product_type: "gems",
    amount_paid: session.amount_total ? session.amount_total / 100 : 0,
    currency_used: (session.currency ?? "usd").toUpperCase(),
    value_received: { gems },
    platform: "web",
  });

  return json({ received: true, credited: true });
}

/**
 * A PRO subscription was created, renewed, cancelled or ended.
 *
 * The whole decision — which user, which tier, until when, and whether this
 * state has been paid for — is `decideSubscription` in
 * `_shared/stripeSubscriptionState.ts`, which has no imports and is unit
 * tested. This function is only the write.
 *
 * Writing the *current* state rather than applying a delta is what makes
 * out-of-order and duplicate deliveries harmless, which is the same reason
 * `revenuecat-webhook` re-reads the subscriber instead of trusting the event
 * body. There is no `iap_events` claim on the entitlement write because there
 * is nothing to double-apply: the same event twice produces the same row.
 */
async function handleSubscription(
  supabase: SupabaseClient,
  subscription: StripeSubscriptionLike & { id?: string },
): Promise<Response> {
  const decision = decideSubscription(subscription);

  if (decision.action === "ignore") {
    console.warn(`[STRIPE-SUB] Ignoring subscription ${subscription.id}: ${decision.reason}`);
    return json({ received: true, ignored: decision.reason });
  }

  const { data: existing } = await supabase
    .from("vip_subscriptions")
    .select("vip_tier, expires_at, purchase_platform")
    .eq("user_id", decision.userId)
    .maybeSingle();

  if (decision.action === "expire") {
    // Only end what Stripe granted. An App Store subscription, an admin grant
    // and a referral reward are not ours to revoke — the mirror of the same
    // rule in `iap.ts`, which refuses to expire a row the store did not write.
    if (!existing || !webMayExpire(existing.purchase_platform)) {
      console.log(
        `[STRIPE-SUB] ${decision.reason} for ${decision.userId}, but the row is ${existing?.purchase_platform ?? "absent"}; left alone`,
      );
      return json({ received: true, expired: false });
    }

    const { error } = await supabase
      .from("vip_subscriptions")
      .update({
        expires_at: new Date().toISOString(),
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", decision.userId);

    if (error) {
      console.error("[STRIPE-SUB] Failed to expire:", error);
      return json({ error: "Expire failed" }, 500);
    }

    console.log(`[STRIPE-SUB] Expired ${decision.userId} (${decision.reason})`);
    return json({ received: true, expired: true });
  }

  if (!webGrantWins({ tier: decision.tier, expiresAt: decision.expiresAt }, existing)) {
    // They hold something better already — usually an App Store subscription
    // bought on the phone. Shortening it because a web renewal landed second
    // would take away time they paid for.
    console.log(
      `[STRIPE-SUB] ${decision.userId} already holds ${existing?.vip_tier} to ${existing?.expires_at}; web grant not applied`,
    );
  } else {
    const { error } = await supabase.from("vip_subscriptions").upsert(
      {
        user_id: decision.userId,
        vip_tier: decision.tier,
        expires_at: decision.expiresAt,
        auto_renew: decision.autoRenew,
        purchase_platform: "web",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("[STRIPE-SUB] Failed to write entitlement:", error);
      return json({ error: "Grant failed" }, 500);
    }

    console.log(
      `[STRIPE-SUB] ${decision.userId} → ${decision.tier} until ${decision.expiresAt} (auto_renew=${decision.autoRenew})`,
    );
  }

  if (decision.payWelcome) {
    // Shares `iap.ts`'s claim, so the bundle is paid once per person per tier
    // whether they subscribed on the App Store or on the web — and a renewal,
    // which brings a fresh event every month, does not pay it again.
    await creditSubscriptionWelcome(
      supabase,
      decision.userId,
      decision.tier,
      {
        productId: `stripe:${decision.tier}`,
        store: "stripe",
        transactionId: subscription.id ?? `stripe:${decision.userId}:${decision.tier}`,
      },
      "web",
    );
  }

  return json({ received: true, granted: true });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Stripe keys from environment
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeSecretKey) {
      console.error("Stripe key not configured in environment");
      return json({ error: "Stripe not configured" }, 400);
    }

    // Fail closed. This used to fall back to `JSON.parse(body)` with a console
    // warning when the secret was missing, which made the endpoint — public,
    // `verify_jwt = false`, because Stripe has no Supabase session — accept a
    // hand-written `checkout.session.completed` from anyone who knew the URL.
    // No payment required: post the JSON, get the gems. A missing secret is a
    // deployment mistake, and the safe response to one is to stop.
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set; refusing to process events");
      return json({ error: "Webhook secret not configured" }, 500);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return json({ error: "Missing signature" }, 401);
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return json({ error: "Invalid signature" }, 400);
    }

    console.log("Received Stripe event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // A subscription checkout is finished by `customer.subscription.created`,
        // which is the event that knows when the period ends.
        if (session.mode === "subscription") {
          return json({ received: true, deferred: "customer.subscription.created" });
        }
        return await handleGemCheckout(supabase, session);
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return await handleSubscription(
          supabase,
          event.data.object as unknown as StripeSubscriptionLike & { id?: string },
        );

      default:
        return json({ received: true, ignored: event.type });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return json({ error: errorMessage }, 500);
  }
});
