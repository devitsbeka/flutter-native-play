import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase/client";

export type OAuthProvider = "google" | "apple";

interface OAuthOptions {
  /** Where the provider should send the user back to. Defaults to the current
      origin. Ignored on native — see NATIVE_REDIRECT. */
  redirect_uri?: string;
}

interface OAuthResult {
  error: Error | null;
  /** True once the browser has been handed off to the provider. */
  redirected?: boolean;
}

/**
 * Where the OAuth dance comes back to on the device.
 *
 * The custom scheme registered in Info.plist, NOT window.location.origin.
 * In the Capacitor webview the origin is `capacitor://localhost`, which is
 * not in Supabase's redirect allow-list — and Supabase answers an
 * un-allow-listed redirect by clamping to its configured Site URL. That was
 * the bug report: tapping Google opened "the old version" — the Lovable-era
 * web app the Site URL still pointed at — inside the webview, because the
 * whole flow ran and ended there.
 *
 * Must be listed in Supabase → Authentication → URL Configuration →
 * Redirect URLs, exactly: mytrivia://auth-callback
 */
const NATIVE_REDIRECT = "mytrivia://auth-callback";

/**
 * Social sign-in through Supabase Auth directly.
 *
 * On the web: supabase-js redirects this page to the provider and picks the
 * session out of the return URL (detectSessionInUrl).
 *
 * On native the same flow has to change shape twice. The provider page must
 * open in the SYSTEM browser, not the webview — Google refuses to run OAuth
 * inside embedded webviews at all — so the redirect is skipped and the URL is
 * handed to SFSafariViewController via @capacitor/browser. And the return leg
 * cannot be a web origin: it is the custom scheme above, which reopens the
 * app, where nativeShell's appUrlOpen listener installs the session and
 * closes the browser sheet.
 *
 * Native iOS **Apple** sign-in does not come through here — it uses the
 * Capacitor plugin plus supabase.auth.signInWithIdToken, fully native, which
 * is why Apple worked while Google was broken.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  options: OAuthOptions = {},
): Promise<OAuthResult> {
  const native = Capacitor.isNativePlatform();

  const redirectTo = native
    ? NATIVE_REDIRECT
    : options.redirect_uri ||
      (typeof window !== "undefined" ? window.location.origin : undefined);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // On native, supabase-js must not navigate the webview — that is how
      // the whole app got replaced by the auth flow. Take the URL instead.
      skipBrowserRedirect: native,
      // Apple returns the user's name only on the very first authorization,
      // so ask for it explicitly rather than relying on the default scopes.
      ...(provider === "apple" ? { scopes: "name email" } : {}),
    },
  });

  if (error) return { error };

  if (native) {
    if (!data?.url) {
      return { error: new Error("No authorization URL returned") };
    }
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url });
  }

  return { error: null, redirected: true };
}

/**
 * Backwards-compatible shape for existing call sites.
 */
export const oauth = {
  auth: { signInWithOAuth },
};
