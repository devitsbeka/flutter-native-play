import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

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

    // Get Stripe keys from app_settings
    const { data: stripeKeyData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stripe_secret_key")
      .single();

    const { data: webhookSecretData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "stripe_webhook_secret")
      .single();

    if (!stripeKeyData?.value) {
      console.error("Stripe key not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKeyData.value, {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecretData?.value && signature) {
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecretData.value
        );
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // If no webhook secret, just parse the event (less secure, for testing)
      event = JSON.parse(body);
      console.warn("Webhook secret not configured - skipping signature verification");
    }

    console.log("Received Stripe event:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const gems = parseInt(session.metadata?.gems || "0");
      const purchaseId = session.metadata?.purchase_id;
      const productId = session.metadata?.product_id;

      if (!userId || !gems) {
        console.error("Missing metadata in session:", session.metadata);
        return new Response(
          JSON.stringify({ error: "Missing metadata" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Processing payment for user ${userId}: ${gems} gems`);

      // Update purchase record
      if (purchaseId) {
        const { error: updateError } = await supabase
          .from("gem_purchases")
          .update({
            status: "completed",
            payment_intent_id: session.payment_intent as string,
            completed_at: new Date().toISOString(),
          })
          .eq("id", purchaseId);

        if (updateError) {
          console.error("Error updating purchase record:", updateError);
        }
      }

      // Credit gems to user
      const { error: currencyError } = await supabase.rpc("update_user_currency", {
        p_user_id: userId,
        p_gems_delta: gems,
        p_coins_delta: 0,
      });

      if (currencyError) {
        console.error("Error crediting gems:", currencyError);
        // Don't fail the webhook - log for manual resolution
        await supabase
          .from("gem_purchases")
          .update({ status: "credit_failed" })
          .eq("id", purchaseId);
      } else {
        console.log(`Successfully credited ${gems} gems to user ${userId}`);
      }

      // Log to purchase_transactions for analytics
      await supabase.from("purchase_transactions").insert({
        user_id: userId,
        product_id: productId,
        product_type: "gems",
        amount_paid: session.amount_total ? session.amount_total / 100 : 0,
        currency_used: "GEL",
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
