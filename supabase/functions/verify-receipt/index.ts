import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyReceiptRequest {
  receiptData: string;
  productId: string;
  userId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { receiptData, productId, userId } = await req.json() as VerifyReceiptRequest;

    console.log(`Verifying receipt for user ${userId}, product ${productId}`);

    if (!receiptData || !productId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine subscription duration based on product ID
    let expiresAt: Date;
    const now = new Date();
    
    if (productId.includes("monthly")) {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    } else if (productId.includes("annual")) {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days
    } else if (productId.includes("adfree")) {
      // Lifetime purchase - set far future date
      expiresAt = new Date("2099-12-31");
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Unknown product ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from("vip_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existingSub) {
      // Update existing subscription
      const currentExpiry = new Date(existingSub.expires_at);
      const newExpiry = currentExpiry > now ? new Date(currentExpiry.getTime() + (expiresAt.getTime() - now.getTime())) : expiresAt;

      const { error: updateError } = await supabase
        .from("vip_subscriptions")
        .update({
          expires_at: newExpiry.toISOString(),
          apple_product_id: productId,
          apple_original_transaction_id: receiptData,
          purchase_platform: "ios",
          updated_at: now.toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        throw updateError;
      }

      console.log(`Updated subscription for user ${userId}, expires ${newExpiry.toISOString()}`);
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from("vip_subscriptions")
        .insert({
          user_id: userId,
          vip_tier: productId.includes("adfree") ? "ad_free" : "vip",
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          apple_product_id: productId,
          apple_original_transaction_id: receiptData,
          purchase_platform: "ios",
          auto_renew: !productId.includes("adfree"),
        });

      if (insertError) {
        console.error("Error creating subscription:", insertError);
        throw insertError;
      }

      console.log(`Created subscription for user ${userId}, expires ${expiresAt.toISOString()}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Receipt verified and subscription activated",
        expiresAt: expiresAt.toISOString(),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("Error verifying receipt:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
