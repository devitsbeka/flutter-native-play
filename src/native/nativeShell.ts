import { Capacitor } from "@capacitor/core";

/**
 * The bits of native app behaviour that have nowhere else to live.
 *
 * Everything here is a no-op on the web, and every plugin is imported lazily
 * so the web bundle never pulls the native code in. Called once from the app
 * bootstrap.
 */

/** The page wash the app paints behind everything (see index.html theme-color). */
const APP_BACKGROUND = "#fbfaf8";

let statusBarReady = false;

/**
 * Status bar: dark glyphs on the light lavender wash.
 *
 * `setOverlaysWebView(false)` keeps the webview below the status bar rather
 * than under it. The alternative — overlaying and paying for it with
 * safe-area padding everywhere — only works if every screen remembers the
 * padding, and the audit found roughly twenty that do and an unknown number
 * that don't.
 */
export async function configureStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform() || statusBarReady) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: APP_BACKGROUND });
    }
    statusBarReady = true;
  } catch (error) {
    console.warn("[native] Status bar setup failed:", error);
  }
}

/**
 * Dismiss the launch screen once React has actually painted.
 *
 * Capacitor hides the splash on a timer by default, which either uncovers a
 * blank webview (timer too short) or holds a still image over a ready app
 * (too long). Both read as slowness. `autoHide` is off in capacitor.config,
 * so this is the only thing that takes it down.
 */
export async function hideSplashScreen(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch (error) {
    console.warn("[native] Splash hide failed:", error);
  }
}

/**
 * Keyboard: report its height to CSS instead of letting iOS scroll the
 * whole webview.
 *
 * When the keyboard opens over a fixed-position footer, iOS shifts the entire
 * document up and the header leaves the screen. Publishing the height as a
 * custom property lets the layout make room for it and keeps the page still.
 */
export async function configureKeyboard(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");

    await Keyboard.setResizeMode({ mode: KeyboardResize.None });
    await Keyboard.setScroll({ isDisabled: true });

    const setHeight = (px: number) =>
      document.documentElement.style.setProperty("--keyboard-height", `${px}px`);

    setHeight(0);
    Keyboard.addListener("keyboardWillShow", (info) => setHeight(info.keyboardHeight));
    Keyboard.addListener("keyboardWillHide", () => setHeight(0));
  } catch (error) {
    console.warn("[native] Keyboard setup failed:", error);
  }
}

/**
 * Turn an incoming deep link into an in-app route.
 *
 * Universal links (`https://mytrivia.io/...`) and the custom scheme both
 * arrive through `appUrlOpen`. Without a handler they do nothing at all: a
 * challenge invite tapped in Messages opens the website in Safari instead of
 * the app the recipient has installed, and the OAuth return leg never
 * completes.
 *
 * `navigate` is the router's navigate function, passed in rather than
 * imported so this file stays outside React.
 */
export async function configureDeepLinks(
  navigate: (path: string) => void,
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};

  try {
    const { App } = await import("@capacitor/app");
    const { supabase } = await import("@/integrations/supabase/client");

    const handle = await App.addListener("appUrlOpen", async ({ url }) => {
      try {
        const parsed = new URL(url);

        // Supabase returns OAuth results either in the fragment (implicit) or
        // as a ?code= (PKCE). detectSessionInUrl is off on native, because the
        // tokens never touch the page URL here — they arrive on this event.
        const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        const code = parsed.searchParams.get("code");

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          navigate("/");
          return;
        }

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          navigate("/");
          return;
        }

        // Anything else is a content link: keep the path and query, drop the
        // origin, and let the router decide whether it knows the route.
        navigate(`${parsed.pathname}${parsed.search}`);
      } catch (error) {
        console.warn("[native] Could not handle deep link:", url, error);
      }
    });

    return () => { handle.remove(); };
  } catch (error) {
    console.warn("[native] Deep link setup failed:", error);
    return () => {};
  }
}

/** Everything that can run before React mounts. */
export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Promise.all([configureStatusBar(), configureKeyboard()]);
}
