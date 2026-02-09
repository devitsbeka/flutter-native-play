/**
 * Facebook Auth Edge Function
 *
 * Exchanges a Facebook Instant Games signed player info for a Supabase JWT.
 *
 * Flow:
 *   1. Client sends { playerId, signature, nonce, playerName, playerPhoto }
 *   2. We verify the HMAC-SHA256 signature using the Facebook App Secret
 *   3. Look up or create a Supabase user linked to this FB player ID
 *   4. Return a Supabase access_token + refresh_token
 *
 * Environment variables required:
 *   - FACEBOOK_APP_SECRET: The Facebook app secret for signature verification
 *   - SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin operations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verify the Facebook signed player info signature.
 *
 * Facebook signs the payload with HMAC-SHA256 using the app secret.
 * The signature is a base64url-encoded string: <signature>.<base64url-encoded-payload>
 */
async function verifyFacebookSignature(
  signature: string,
  appSecret: string
): Promise<{ player_id: string; algorithm: string } | null> {
  try {
    // Facebook signature format: base64url(sig).base64url(payload)
    const [sigB64, payloadB64] = signature.split('.');
    if (!sigB64 || !payloadB64) return null;

    // Decode the payload
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);

    // Verify HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
    const expectedB64 = base64Encode(new Uint8Array(expectedSig))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Compare signatures
    const sigDecoded = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const expectedDecoded = expectedB64.replace(/-/g, '+').replace(/_/g, '/');

    if (sigDecoded !== expectedDecoded) {
      console.error('Signature mismatch');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Signature verification error:', error);
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
    const facebookAppSecret = Deno.env.get("FACEBOOK_APP_SECRET");

    if (!facebookAppSecret) {
      console.error("FACEBOOK_APP_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Facebook auth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { playerId, signature, nonce, playerName, playerPhoto } = await req.json();

    if (!playerId || !signature) {
      return new Response(
        JSON.stringify({ error: "Missing playerId or signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Verify the Facebook signature
    const verifiedPayload = await verifyFacebookSignature(signature, facebookAppSecret);

    if (!verifiedPayload || verifiedPayload.player_id !== playerId) {
      console.error("Facebook signature verification failed for player:", playerId);
      return new Response(
        JSON.stringify({ error: "Invalid Facebook signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Check if this Facebook player is already linked to a Supabase user
    const { data: existingLink } = await supabase
      .from("facebook_player_links")
      .select("supabase_user_id")
      .eq("facebook_player_id", playerId)
      .maybeSingle();

    let supabaseUserId: string;

    if (existingLink) {
      // Returning player - update last login
      supabaseUserId = existingLink.supabase_user_id;

      await supabase
        .from("facebook_player_links")
        .update({
          last_login_at: new Date().toISOString(),
          facebook_name: playerName,
          facebook_photo_url: playerPhoto,
        })
        .eq("facebook_player_id", playerId);

    } else {
      // New player - create a Supabase user and link

      // Create a pseudo-email for the Facebook user (Supabase auth requires email)
      const pseudoEmail = `fb_${playerId}@facebook.mytrivia.local`;
      // Random secure password (player will never type this - auth is via FB)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: pseudoEmail,
        password: randomPassword,
        email_confirm: true, // Auto-confirm since FB already verified identity
        user_metadata: {
          nickname: playerName || 'Player',
          avatar_url: playerPhoto,
          source: 'facebook_instant_games',
        },
      });

      if (createError || !newUser.user) {
        console.error("Failed to create Supabase user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      supabaseUserId = newUser.user.id;

      // Create the link record
      const { error: linkError } = await supabase
        .from("facebook_player_links")
        .insert({
          facebook_player_id: playerId,
          supabase_user_id: supabaseUserId,
          facebook_name: playerName,
          facebook_photo_url: playerPhoto,
        });

      if (linkError) {
        console.error("Failed to create Facebook player link:", linkError);
        // Non-fatal: user was created, link can be retried
      }

      // Update the profile with Facebook info (profile is auto-created by DB trigger)
      // Give it a moment for the trigger to fire
      await new Promise(resolve => setTimeout(resolve, 500));

      await supabase
        .from("profiles")
        .update({
          nickname: playerName || 'Player',
          avatar_url: playerPhoto,
        })
        .eq("user_id", supabaseUserId);
    }

    // Step 3: Generate a Supabase session for this user
    // Use admin.generateLink to get a magic link, then exchange it
    // Or simpler: sign in with the pseudo-email using admin powers

    const pseudoEmail = `fb_${playerId}@facebook.mytrivia.local`;

    // Generate a new session via admin API
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: pseudoEmail,
    });

    if (sessionError || !sessionData) {
      console.error("Failed to generate session:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the OTP from the magic link to get a real session
    const token_hash = sessionData.properties?.hashed_token;
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'magiclink',
    });

    if (verifyError || !verifyData.session) {
      console.error("Failed to verify OTP:", verifyError);
      return new Response(
        JSON.stringify({ error: "Failed to establish session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
        user_id: supabaseUserId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Facebook auth error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
