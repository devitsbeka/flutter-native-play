import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders, isNativeAppOrigin } from "../_shared/cors.ts";
import { lookupGemPack } from "../_shared/gems.ts";
import {
  currencyForLanguage,
  gemPackCopy,
  priceOf,
  toMinorUnits,
  type PriceKey,
} from "../_shared/pricing.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Gems are digital goods consumed in the app, so on iOS they must be bought
  // through In-App Purchase (App Store guideline 3.1.1). The native client
  // now routes to RevenueCat; refusing here as well means a regression in
  // that branch fails visibly instead of shipping a rejectable build.
  if (isNativeAppOrigin(req)) {
    console.warn("Refused web gem checkout from a native app origin");
    return new Response(
      JSON.stringify({ error: "NATIVE_MUST_USE_IAP" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Stripe key from environment
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("Stripe key not configured in environment");
      return new Response(
        JSON.stringify({ error: "STRIPE_NOT_CONFIGURED" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { productId, language } = await req.json();

    // The only thing taken from the request is *which* pack. Quantity and
    // price come from the server catalog.
    //
    // This used to read `{ gems, priceGel }` from the body, use priceGel as
    // the Stripe amount and put gems into session metadata, which the webhook
    // then credited. Anyone signed in could ask for five million gems at one
    // tetri and be charged exactly that.
    //
    // An unknown product id is refused rather than falling back to a generic
    // line item built from the request — that fallback was the hole's second
    // half, since it made any made-up id work.
    const pack = lookupGemPack(productId);
    if (!pack) {
      console.warn(`Refused checkout for unknown gem pack: ${JSON.stringify(productId)}`);
      return new Response(
        JSON.stringify({ error: "UNKNOWN_PRODUCT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The buyer's language picks the currency, and the pack's row in the
    // shared table gives the amount in it. This was USD for everyone while
    // the shop displayed a converted GEL figure — display and charge in two
    // different currencies, neither matching the other.
    const currency = currencyForLanguage(language);
    const priceKey = `gems_${pack.gems}` as PriceKey;
    const amount = priceOf(priceKey, currency);
    const copy = gemPackCopy(pack.gems, language);
    const sku = `GEMS_${pack.gems}_${currency}`;

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("user_id", userData.user.id)
      .single();

    const customers = await stripe.customers.list({
      email: userData.user.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        name: profile?.nickname || undefined,
        metadata: {
          user_id: userData.user.id,
        },
      });
      customerId = customer.id;
    }

    // Create pending purchase record
    const { data: purchaseRecord, error: purchaseError } = await supabase
      .from("gem_purchases")
      .insert({
        user_id: userData.user.id,
        product_id: pack.id,
        gems_received: pack.gems,
        // The column is named for lari but holds whatever was charged; the
        // currency is on the Stripe session.
        amount_gel: amount,
        status: "pending",
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Error creating purchase record:", purchaseError);
      throw purchaseError;
    }

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://mytrivia.io";

    // Create Stripe Checkout session with enhanced product details
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: copy.name,
              description: copy.description,
              metadata: {
                sku,
                gems: pack.gems.toString(),
                product_id: pack.id,
              },
            },
            unit_amount: toMinorUnits(amount),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/cancel`,
      locale: "auto", // Auto-detect user's locale (Georgian not supported by Stripe)
      // `gems` rides along for readability in the Stripe dashboard only. The
      // webhook re-derives the grant from product_id against the same catalog
      // rather than trusting this, so editing it in Stripe changes nothing.
      metadata: {
        user_id: userData.user.id,
        product_id: pack.id,
        gems: pack.gems.toString(),
        purchase_id: purchaseRecord.id,
        sku,
      },
      payment_intent_data: {
        description: pack.name,
        metadata: {
          user_id: userData.user.id,
          product_id: pack.id,
          gems: pack.gems.toString(),
          sku,
        },
      },
    });

    // Update purchase record with checkout session ID
    await supabase
      .from("gem_purchases")
      .update({ checkout_session_id: session.id })
      .eq("id", purchaseRecord.id);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
