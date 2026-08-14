import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { lookupGemPack } from "../_shared/gems.ts";

// Stripe webhook needs to accept requests from Stripe's servers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

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
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fail closed. This used to fall back to `JSON.parse(body)` with a console
    // warning when the secret was missing, which made the endpoint — public,
    // `verify_jwt = false`, because Stripe has no Supabase session — accept a
    // hand-written `checkout.session.completed` from anyone who knew the URL.
    // No payment required: post the JSON, get the gems. A missing secret is a
    // deployment mistake, and the safe response to one is to stop.
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set; refusing to process events");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received Stripe event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const productId = session.metadata?.product_id;

      // `checkout.session.completed` also fires for asynchronous payment
      // methods before the money has actually moved, with payment_status
      // "unpaid". Crediting on that grants gems for a payment that may never
      // settle.
      if (session.payment_status !== "paid") {
        console.log(`Session ${session.id} completed but unpaid; nothing credited`);
        return new Response(
          JSON.stringify({ received: true, credited: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // The grant comes from the catalog, not from the event. Metadata is
      // editable in the Stripe dashboard and was, before this, the only thing
      // deciding how many gems a purchase was worth.
      const pack = lookupGemPack(productId);
      if (!userId || !pack) {
        console.error("Unusable session metadata:", session.metadata);
        return new Response(
          JSON.stringify({ error: "Missing metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
        return new Response(
          JSON.stringify({ error: "Claim failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!claimed) {
        console.log(`Session ${session.id} already processed; skipping`);
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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

        return new Response(
          JSON.stringify({ error: "Credit failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
