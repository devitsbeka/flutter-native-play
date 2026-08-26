import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders, isNativeAppOrigin } from "../_shared/cors.ts";
import {
  currencyForLanguage,
  priceOf,
  productCopy,
  toMinorUnits,
} from "../_shared/pricing.ts";

/**
 * What each tier grants, and which row of the price table it is sold from.
 *
 * Prices and the buyer-facing name and description are no longer here: they
 * live in _shared/pricing.ts, in every currency and every language the app
 * ships in, and the same table is mirrored in src/config/pricing.ts. This
 * file used to carry one Georgian name, one price, and one currency, so a
 * German buyer read Georgian and was charged lari.
 *
 * The year is sold as pro_plus, because it carries five friend seats — see
 * src/config/proPlans.ts. A tier with no `yearly` row bills monthly instead
 * (below), so leaving pro_plus.yearly null would have taken 9.99 a month from
 * someone who chose the 59.88 year.
 */
/**
 * Free days granted on a yearly subscription, by Stripe.
 *
 * **This must match `trialDays` on the annual plan in
 * src/config/proPlans.ts**, which is what the paywall advertises. The two
 * deploy through different pipelines — the client with a merge to main, this
 * function through Lovable — so the client can be showing a trial this file
 * has not started granting yet. When changing it, deploy this side first.
 *
 * Monthly plans have none: the offer is on the year.
 */
const TRIAL_DAYS_YEARLY = 3;

const PRO_TIERS = {
  pro: {
    monthly: { priceKey: "pro_monthly" as const, sku: "PRO_SOLO_MONTHLY" },
    // Kept for app builds shipped before the year gained its extra seats:
    // those send tier=pro with period=year and should still be charged the
    // annual price they were shown, at the one seat they were sold.
    yearly: { priceKey: "pro_annual" as const, sku: "PRO_SOLO_ANNUAL" },
    friendInvites: 1,
  },
  pro_plus: {
    monthly: { priceKey: "pro_plus_monthly" as const, sku: "PRO_FAMILY_MONTHLY" },
    yearly: { priceKey: "pro_annual" as const, sku: "PRO_FAMILY_ANNUAL" },
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

    const { tierId, period, language } = await req.json();

    if (!tierId || !PRO_TIERS[tierId as keyof typeof PRO_TIERS]) {
      return new Response(
        JSON.stringify({ error: "Invalid tier ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tier = PRO_TIERS[tierId as keyof typeof PRO_TIERS];

    // A yearly plan is the same tier on a longer interval. Only offered where
    // one is configured; anything else bills monthly rather than inventing a
    // yearly price.
    const wantsYear = period === "year";
    if (wantsYear && !tier.yearly) {
      console.warn(`[PRO-CHECKOUT] No yearly price for tier=${tierId}; billing monthly`);
    }
    const line = (wantsYear && tier.yearly) ? tier.yearly : tier.monthly;
    const interval = (wantsYear && tier.yearly) ? "year" : "month";

    // The buyer's own language decides the currency and the words. Both come
    // from the shared table, so the amount taken here is the amount the app
    // quoted before sending them.
    const currency = currencyForLanguage(language);
    const copy = productCopy(line.priceKey, language);
    const amount = priceOf(line.priceKey, currency);
    const sku = `${line.sku}_${currency}`;

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
            currency: currency.toLowerCase(),
            product_data: {
              name: copy.name,
              description: copy.description,
              metadata: {
                sku,
                tier_id: tierId,
                friend_invites: tier.friendInvites.toString(),
              },
            },
            unit_amount: toMinorUnits(amount),
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
        friend_invites: tier.friendInvites.toString(),
      },
      subscription_data: {
        // The free days the paywall advertises on the annual row. Stripe bills
        // nothing until they are up, and the webhook grants the entitlement
        // from the subscription's status either way.
        ...(interval === "year" && TRIAL_DAYS_YEARLY > 0
          ? { trial_period_days: TRIAL_DAYS_YEARLY }
          : {}),
        metadata: {
          user_id: userId || "guest",
          tier_id: tierId,
          friend_invites: tier.friendInvites.toString(),
        },
      },
      allow_promotion_codes: true,
    });

    console.log(`[PRO-CHECKOUT] Created session for ${amount} ${currency} ${interval}ly, tier=${tierId}, trial=${interval === "year" ? TRIAL_DAYS_YEARLY : 0}d, user=${userId || "guest"}, session=${session.id}`);

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
