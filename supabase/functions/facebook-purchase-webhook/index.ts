/**
 * Facebook Purchase Webhook Edge Function
 *
 * Validates and processes in-app purchases made via Facebook Instant Games payments.
 *
 * Flow:
 *   1. Client completes purchase via FBInstant.payments.purchaseAsync()
 *   2. Client calls this function with the purchase receipt
 *   3. We verify the purchase with Facebook's Graph API
 *   4. Credit the purchased items (gems, VIP time, etc.) to the player
 *   5. Record the transaction for analytics
 *
 * Environment variables required:
 *   - FACEBOOK_APP_ID: The Facebook App ID
 *   - FACEBOOK_APP_SECRET: The Facebook App Secret
 *   - SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maps Facebook product IDs to gem amounts
const PRODUCT_GEM_MAP: Record<string, number> = {
  'gem_pack_50': 50,
  'gem_pack_100': 100,
  'gem_pack_250': 250,
  'gem_pack_500': 500,
  'gem_pack_1000': 1000,
};

// Maps Facebook product IDs to VIP durations (in days)
const PRODUCT_VIP_MAP: Record<string, number> = {
  'vip_1_day': 1,
  'vip_7_days': 7,
  'vip_30_days': 30,
};

/**
 * Verify a purchase with Facebook's Graph API.
 */
async function verifyPurchaseWithFacebook(
  purchaseToken: string,
  appId: string,
  appSecret: string
): Promise<{ is_valid: boolean; product_id?: string; payment_id?: string } | null> {
  try {
    // Get an app access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    );
    const tokenData = await tokenResponse.json();
    const appAccessToken = tokenData.access_token;

    if (!appAccessToken) {
      console.error('Failed to get Facebook app access token');
      return null;
    }

    // Verify the purchase
    const verifyResponse = await fetch(
      `https://graph.facebook.com/${appId}/payment_transactions?access_token=${appAccessToken}&purchase_token=${purchaseToken}`
    );
    const verifyData = await verifyResponse.json();

    if (verifyData.data && verifyData.data.length > 0) {
      const transaction = verifyData.data[0];
      return {
        is_valid: true,
        product_id: transaction.product_id,
        payment_id: transaction.id,
      };
    }

    return { is_valid: false };
  } catch (error) {
    console.error('Facebook purchase verification error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const facebookAppId = Deno.env.get("FACEBOOK_APP_ID");
    const facebookAppSecret = Deno.env.get("FACEBOOK_APP_SECRET");

    if (!facebookAppId || !facebookAppSecret) {
      return new Response(
        JSON.stringify({ error: "Facebook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { purchaseToken, productId, userId, facebookPlayerId } = await req.json();

    if (!purchaseToken || !productId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Verify the purchase with Facebook
    const verification = await verifyPurchaseWithFacebook(purchaseToken, facebookAppId, facebookAppSecret);

    if (!verification || !verification.is_valid) {
      console.error("Purchase verification failed for token:", purchaseToken);
      return new Response(
        JSON.stringify({ error: "Purchase verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Check if this purchase has already been processed (idempotency)
    const { data: existingTx } = await supabase
      .from("purchase_transactions")
      .select("id")
      .eq("transaction_id", verification.payment_id || purchaseToken)
      .maybeSingle();

    if (existingTx) {
      return new Response(
        JSON.stringify({ success: true, message: "Purchase already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Credit the purchase to the user
    let valueReceived: Record<string, unknown> = {};

    if (PRODUCT_GEM_MAP[productId]) {
      const gems = PRODUCT_GEM_MAP[productId];
      const { error: currencyError } = await supabase.rpc("update_user_currency", {
        p_user_id: userId,
        p_gems_delta: gems,
        p_coins_delta: 0,
      });

      if (currencyError) {
        console.error("Failed to credit gems:", currencyError);
        return new Response(
          JSON.stringify({ error: "Failed to credit purchase" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      valueReceived = { gems };
    } else if (PRODUCT_VIP_MAP[productId]) {
      const days = PRODUCT_VIP_MAP[productId];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      // Check for existing VIP
      const { data: existingVip } = await supabase
        .from("vip_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingVip) {
        // Extend existing VIP
        const currentExpiry = new Date(existingVip.expires_at);
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        baseDate.setDate(baseDate.getDate() + days);

        await supabase
          .from("vip_subscriptions")
          .update({ expires_at: baseDate.toISOString() })
          .eq("user_id", userId);
      } else {
        // Create new VIP
        await supabase
          .from("vip_subscriptions")
          .insert({
            user_id: userId,
            vip_tier: "pro",
            expires_at: expiresAt.toISOString(),
          });
      }

      valueReceived = { vip_days: days };
    }

    // Step 4: Log the transaction
    await supabase.from("purchase_transactions").insert({
      user_id: userId,
      product_id: productId,
      product_type: PRODUCT_GEM_MAP[productId] ? "gems" : "vip",
      amount_paid: 0, // FB doesn't expose price in server-side verification
      currency_used: "USD",
      value_received: valueReceived,
      platform: "facebook",
      transaction_id: verification.payment_id || purchaseToken,
    });

    return new Response(
      JSON.stringify({ success: true, valueReceived }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Facebook purchase webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
