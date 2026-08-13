import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getCorsHeaders, isNativeAppOrigin } from "../_shared/cors.ts";

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

    const { productId, gems, priceGel, productName } = await req.json();

    if (!productId || !gems || !priceGel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Product configuration with proper SKU and descriptions
    const productConfigs: Record<string, { name: string; description: string; sku: string }> = {
      gems_100: {
        name: "100 ალმასი - პატარა პაკეტი",
        description: "100 ალმასის შეძენა MyTrivia-ში. გამოიყენეთ სუპერ ძალების გასააქტიურებლად!",
        sku: "GEMS_100_GEL",
      },
      gems_500: {
        name: "500 ალმასი - საშუალო პაკეტი", 
        description: "500 ალმასის შეძენა MyTrivia-ში. იდეალური მოთამაშეებისთვის!",
        sku: "GEMS_500_GEL",
      },
      gems_1500: {
        name: "1500 ალმასი - დიდი პაკეტი (+20% ბონუსი)",
        description: "1500 ალმასის შეძენა MyTrivia-ში. პოპულარული არჩევანი 20% ბონუსით!",
        sku: "GEMS_1500_GEL",
      },
      gems_5000: {
        name: "5000 ალმასი - მეგა პაკეტი (+40% ბონუსი)",
        description: "5000 ალმასის შეძენა MyTrivia-ში. საუკეთესო ფასი 40% ბონუსით!",
        sku: "GEMS_5000_GEL",
      },
    };

    const productConfig = productConfigs[productId] || {
      name: productName || `${gems} ალმასი`,
      description: `${gems} ალმასის შეძენა MyTrivia-ში`,
      sku: `GEMS_${gems}_GEL`,
    };

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
        product_id: productId,
        gems_received: gems,
        amount_gel: priceGel,
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
            currency: "gel",
            product_data: {
              name: productConfig.name,
              description: productConfig.description,
              metadata: {
                sku: productConfig.sku,
                gems: gems.toString(),
                product_id: productId,
              },
            },
            unit_amount: Math.round(priceGel * 100), // Convert to tetri
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/cancel`,
      locale: "auto", // Auto-detect user's locale (Georgian not supported by Stripe)
      metadata: {
        user_id: userData.user.id,
        product_id: productId,
        gems: gems.toString(),
        purchase_id: purchaseRecord.id,
        sku: productConfig.sku,
      },
      payment_intent_data: {
        description: productConfig.name,
        metadata: {
          user_id: userData.user.id,
          product_id: productId,
          gems: gems.toString(),
          sku: productConfig.sku,
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
