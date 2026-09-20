/**
 * Store purchases, resolved into entitlements.
 *
 * One catalog and one apply path, shared by the two things that can learn
 * about a purchase: `verify-receipt` (the app asking us to re-sync after a
 * purchase or a restore) and `revenuecat-webhook` (RevenueCat telling us
 * something changed while the app wasn't looking).
 *
 * The rule both obey: **nothing a client says is evidence.** The app's call
 * is a trigger, not a payload — we go and ask RevenueCat what this user
 * actually owns, and write that. The previous version of verify-receipt
 * trusted `{ productId, userId }` straight off the request body and handed
 * out a year of PRO to anyone who asked.
 *
 * This file is the Deno half: the secret key, the fetch, and nothing else.
 * Everything that decides what a purchase *means* lives in
 * `iapEntitlements.ts`, which has no Deno globals and no `https://` imports
 * so that it can be imported by a test — see
 * `src/__tests__/noDenoInBrowserTypecheck.test.ts` for why that matters, and
 * `src/__tests__/subscriptionFollowsTheBuyer.test.ts` for what it bought.
 * Callers import from here exactly as before; the re-export below keeps the
 * whole surface in one place.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  creditConsumables,
  parseSubscriber,
  syncSubscription,
  type SubscriberState,
} from "./iapEntitlements.ts";

export * from "./iapEntitlements.ts";

const REVENUECAT_API = "https://api.revenuecat.com/v1";

/**
 * Ask RevenueCat what this user owns.
 *
 * `appUserID` is the Supabase user id — the client calls
 * `Purchases.logIn({ appUserID: user.id })`, so the two identities already
 * line up. Uses the *secret* API key, which must never reach a client.
 */
export async function fetchSubscriberState(appUserId: string): Promise<SubscriberState> {
  const apiKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!apiKey) {
    throw new Error("REVENUECAT_SECRET_API_KEY is not configured");
  }

  const res = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RevenueCat lookup failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return parseSubscriber(json?.subscriber ?? {});
}

/** Re-sync everything the store knows about one user. */
export async function syncUserFromStore(supabase: SupabaseClient, userId: string) {
  const state = await fetchSubscriberState(userId);
  const subscription = await syncSubscription(supabase, userId, state);
  const gemsCredited = await creditConsumables(supabase, userId, state);
  return { ...subscription, gemsCredited };
}
