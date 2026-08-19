import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Username-only registration that survives email confirmations being ON.
 *
 * Username accounts use a manufactured @mytrivia.local pseudo-email, which
 * can never receive a confirmation link — so the moment "Confirm email" is
 * enabled for the project (to keep real-email signups honest), the plain
 * auth.signUp path would create username accounts that can never activate.
 *
 * This function creates them through the admin API with email_confirm: true,
 * pre-confirming the address that never needed confirming. Real-email
 * signups do NOT come through here — they use auth.signUp and genuinely
 * confirm their inbox.
 *
 * Open endpoint by design (verify_jwt = false): registration happens signed
 * out, exactly like the auth signup endpoint it replaces. It refuses
 * anything that isn't a bare username, so it cannot be used to pre-confirm
 * arbitrary real addresses.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { username, password } = await req.json();

    if (typeof username !== "string" || typeof password !== "string") {
      return json({ error: "username and password are required" }, 400);
    }
    // Bare usernames only — with an @ this would become a machine for
    // creating pre-confirmed accounts on real addresses.
    if (username.includes("@")) {
      return json({ error: "invalid username" }, 400);
    }
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      return json({ error: "invalid username" }, 400);
    }
    // Mirror the client's signup password policy (8+, letter, digit).
    if (password.length < 8 || !/\p{L}/u.test(password) || !/\d/.test(password)) {
      return json({ error: "weak password" }, 400);
    }

    // Same pseudo-email derivation the client has always used, so existing
    // accounts and the login path keep matching.
    const pseudoEmail = `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "")}@mytrivia.local`;
    if (pseudoEmail.startsWith("@")) {
      return json({ error: "invalid username" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await admin.auth.admin.createUser({
      email: pseudoEmail,
      password,
      email_confirm: true,
      user_metadata: { nickname: trimmed },
    });

    if (error) {
      // Keep the message shape the clients already branch on.
      const msg = /already/i.test(error.message)
        ? "User already registered"
        : error.message;
      return json({ error: msg }, 400);
    }

    return json({ ok: true, user_id: data.user?.id ?? null });
  } catch (e) {
    console.error("register-username error:", e);
    return json({ error: "registration failed" }, 500);
  }
});
