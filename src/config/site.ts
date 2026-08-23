/**
 * Canonical public URL for links we hand to other people — referral invites,
 * challenge shares, QR codes. These must always point at production, never at
 * whatever origin the sender happens to be browsing (localhost, a preview
 * deploy), so they stay valid for the recipient.
 *
 * Override with VITE_PUBLIC_SITE_URL when running a staging environment that
 * should generate its own links.
 */
export const SITE_URL: string =
  import.meta.env.VITE_PUBLIC_SITE_URL || "https://mytrivia.io";

/** Builds an absolute public URL from a root-relative path. */
export function siteUrl(path: string): string {
  return `${SITE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/**
 * The native app's bundle identifier. Doubles as the Sign in with Apple client
 * id on iOS, where Apple expects the bundle id of the app making the request,
 * so this must stay in sync with `appId` in capacitor.config.ts and with the
 * App ID registered in the Apple Developer account.
 */
export const APP_BUNDLE_ID: string =
  import.meta.env.VITE_APP_BUNDLE_ID || "io.mytrivia.app";

/**
 * Facebook app id, for the Messenger Send Dialog on the web.
 *
 * `fb-messenger://share` is an app scheme: it works on a phone that has
 * Messenger installed and does nothing at all in a desktop browser, which is
 * why the Messenger button did nothing there. The web equivalent is
 * facebook.com/dialog/send, and that one refuses to open without an app id.
 *
 * Empty is handled — the share falls back to the plain Facebook share dialog,
 * which needs no id and still carries the link and its preview image. Set
 * VITE_FACEBOOK_APP_ID (a Meta *app* id, not the Pixel id in index.html) to
 * get the real Messenger dialog instead.
 */
export const FACEBOOK_APP_ID: string = import.meta.env.VITE_FACEBOOK_APP_ID || "";
