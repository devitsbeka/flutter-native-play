import { supabase } from "./supabase/client";

export type OAuthProvider = "google" | "apple";

interface OAuthOptions {
  /** Where the provider should send the user back to. Defaults to the current origin. */
  redirect_uri?: string;
}

interface OAuthResult {
  error: Error | null;
  /** True once the browser has been handed off to the provider. */
  redirected?: boolean;
}

/**
 * Social sign-in through Supabase Auth directly.
 *
 * This replaces a third-party auth proxy that performed the OAuth dance on our
 * behalf and handed back tokens to install with setSession. Going straight to
 * Supabase removes that vendor from the login path entirely: the browser is
 * redirected to the provider, the provider returns to Supabase's /callback,
 * and supabase-js picks the session up from the return URL
 * (detectSessionInUrl, on by default).
 *
 * Requires the Google and Apple providers to be enabled in the Supabase
 * dashboard (Authentication -> Providers) with this app's client credentials,
 * and the site/redirect URLs allow-listed under Authentication -> URL
 * Configuration.
 *
 * Native iOS Apple sign-in does not come through here — it uses the Capacitor
 * plugin plus supabase.auth.signInWithIdToken, which is already native.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  options: OAuthOptions = {},
): Promise<OAuthResult> {
  const redirectTo =
    options.redirect_uri ||
    (typeof window !== "undefined" ? window.location.origin : undefined);

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // Apple returns the user's name only on the very first authorization,
      // so ask for it explicitly rather than relying on the default scopes.
      ...(provider === "apple" ? { scopes: "name email" } : {}),
    },
  });

  if (error) return { error };
  return { error: null, redirected: true };
}

/**
 * Backwards-compatible shape for existing call sites.
 */
export const oauth = {
  auth: { signInWithOAuth },
};
