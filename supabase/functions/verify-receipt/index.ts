/**
 * Re-sync the calling user's entitlements from the store.
 *
 * Called by the app after a purchase completes and after "restore purchases".
 * It takes no meaningful input: the user comes from the verified JWT, and
 * what they own comes from RevenueCat. Anything in the request body is
 * ignored.
 *
 * The previous implementation read `{ receiptData, productId, userId }` from
 * the body and wrote a subscription row from it — no store call, no check
 * that the transaction existed, and `userId` taken from the body rather than
 * the token, so any signed-in user could grant a year of PRO to any account.
 * The endpoint kept its name so the client contract survives; nothing else
 * about it is the same.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { syncUserFromStore } from "../_shared/iap.ts";

Deno.serve(async (req: Request) => {
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Authorization required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Identify the caller from their own token. This is the only place the
    // user id may come from.
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return json({ success: false, error: "Invalid or expired token" }, 401);
    }

    // Writes go through the service role, because the entitlement tables are
    // no longer client-writable.
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const result = await syncUserFromStore(supabase, user.id);

    console.log(
      `Synced entitlements for ${user.id}: tier=${result.tier ?? "none"} ` +
      `expires=${result.expiresAt ?? "n/a"} gemsCredited=${result.gemsCredited}`,
    );

    return json({
      success: true,
      tier: result.tier,
      expiresAt: result.expiresAt,
      gemsCredited: result.gemsCredited,
    });
  } catch (error: unknown) {
    // Describe what was actually thrown, including the things that are not
    // Errors.
    //
    // This used to be `error instanceof Error ? error.message : "Unknown
    // error"`, and a PostgrestError is a plain object — so every database
    // failure in this path reported itself as the literal string "Unknown
    // error", with the code, message, details and hint all discarded. The one
    // statement in syncUserFromStore that throws a non-Error is
    // syncSubscription's `if (error) throw error` on the vip_subscriptions
    // upsert, so "Unknown error" meant precisely "the upsert failed and we
    // will not tell you why". It cost several build cycles to narrow from the
    // client side, which is exactly the work this line exists to avoid.
    const message =
      error instanceof Error
        ? error.message
        : (() => {
            const e = error as Record<string, unknown> | null;
            if (e && typeof e === "object" && typeof e.message === "string") {
              // PostgrestError shape: message plus code/details/hint.
              return [e.message, e.code && `(${e.code})`, e.details, e.hint]
                .filter(Boolean)
                .join(" ");
            }
            return typeof error === "string" ? error : JSON.stringify(error);
          })();

    console.error("Entitlement sync failed:", error);
    return json({ success: false, error: message }, 500);
  }
});
