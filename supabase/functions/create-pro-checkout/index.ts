import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders, isNativeAppOrigin } from "../_shared/cors.ts";

// PRO tier product configurations
const PRO_PRODUCTS = {
  pro: {
    name: "სოლო PRO - ყოველთვიური გამოწერა",
    nameEn: "Solo PRO - Monthly Subscription",
    description: "ყოველთვიური PRO გამოწერა: 2x XP, რეკლამების გარეშე, VIP ბეჯი, 1 მეგობრის მოწვევა",
    descriptionEn: "Monthly PRO subscription: 2x XP, No ads, VIP badge, 1 friend invite",
    priceGel: 9.99,
    sku: "PRO_SOLO_MONTHLY_GEL",
    friendInvites: 1,
    // Same tier bought for a year, at the price the paywall quotes
    // (src/config/proPlans.ts). A yearly line, not a twelfth of anything:
    // Stripe bills the interval it is given.
    yearly: {
      priceGel: 59.88,
      sku: "PRO_SOLO_ANNUAL_GEL",
    },
  },
  pro_plus: {
    name: "სამეგობრო PRO - ყოველთვიური გამოწერა",
    nameEn: "Family PRO - Monthly Subscription", 
    description: "ყოველთვიური სამეგობრო PRO: 2x XP, რეკლამების გარეშე, VIP ბეჯი + ფრეიმები, ყოველდღიური ჯილდოები, 5 მეგობრის მოწვევა",
    descriptionEn: "Monthly Family PRO subscription: 2x XP, No ads, VIP badge + frames, daily rewards, 5 friend invites",
    priceGel: 19.99,
    sku: "PRO_FAMILY_MONTHLY_GEL",
    friendInvites: 5,
  },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // PRO is a digital subscription, so on iOS it must be sold through In-App
  // Purchase (App Store guideline 3.1.1). useProPurchase already branches to
  // RevenueCat on native; this refusal is the backstop.
  if (isNativeAppOrigin(req)) {
    console.warn("Refused web PRO checkout from a native app origin");
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get user from auth header (optional for guest checkout)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabase.auth.getUser(token);

      if (!userError && userData.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;

        // Get profile nickname
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("user_id", userId)
          .single();

        userName = profile?.nickname || null;
      }
    }

    const { tierId, period } = await req.json();

    if (!tierId || !PRO_PRODUCTS[tierId as keyof typeof PRO_PRODUCTS]) {
      return new Response(
        JSON.stringify({ error: "Invalid tier ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productConfig = PRO_PRODUCTS[tierId as keyof typeof PRO_PRODUCTS];

    // A yearly plan is the same tier on a longer interval. Only offered where
    // one is configured; anything else falls back to the monthly line rather
    // than inventing a price.
    const yearly = period === "year" ? (productConfig as { yearly?: { priceGel: number; sku: string } }).yearly : undefined;
    if (period === "year" && !yearly) {
      console.warn(`[PRO-CHECKOUT] No yearly price for tier=${tierId}; billing monthly`);
    }
    const priceGel = yearly?.priceGel ?? productConfig.priceGel;
    const sku = yearly?.sku ?? productConfig.sku;
    const interval = yearly ? "year" : "month";

    // Get or create Stripe customer if user is authenticated
    let customerId: string | undefined;
    if (userId && userEmail) {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          name: userName || undefined,
          metadata: {
            user_id: userId,
          },
        });
        customerId = customer.id;
      }
    }

    // Get origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://mytrivia.io";

    // Create Stripe Checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : undefined, // Will be collected during checkout for guests
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gel",
            product_data: {
              name: productConfig.name,
              description: productConfig.description,
              metadata: {
                sku,
                tier_id: tierId,
                friend_invites: productConfig.friendInvites.toString(),
              },
            },
            unit_amount: Math.round(priceGel * 100), // Convert to tetri
            recurring: {
              interval,
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/profile?tab=PRO&subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile?tab=PRO&subscription=cancelled`,
      locale: "auto",
      metadata: {
        user_id: userId || "guest",
        tier_id: tierId,
        sku,
        friend_invites: productConfig.friendInvites.toString(),
      },
      subscription_data: {
        metadata: {
          user_id: userId || "guest",
          tier_id: tierId,
          friend_invites: productConfig.friendInvites.toString(),
        },
      },
      allow_promotion_codes: true,
    });

    console.log(`[PRO-CHECKOUT] Created session for tier=${tierId}, user=${userId || "guest"}, session=${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating PRO checkout session:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
