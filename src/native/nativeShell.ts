import { Capacitor } from "@capacitor/core";

/**
 * The bits of native app behaviour that have nowhere else to live.
 *
 * Everything here is a no-op on the web, and every plugin is imported lazily
 * so the web bundle never pulls the native code in. Called once from the app
 * bootstrap.
 */

/** The page wash the app paints behind everything (see index.html theme-color). */
export const APP_BACKGROUND = "#fbfaf8";

let statusBarReady = false;

/**
 * Status bar: the app paints it, not the system.
 *
 * `setOverlaysWebView(false)` kept the webview *below* the status bar, so
 * that strip was never the app's to draw — iOS filled it from the window,
 * which is black. Every screen therefore had a black band across the top
 * that belonged to no page, most visibly over the game rooms, where the
 * gradient stopped dead at the notch.
 *
 * Overlaying means the webview owns the full screen and any fixed background
 * runs edge to edge under the clock. The cost is that content has to keep out
 * from under it, which is what `--safe-top` and the `.safe-top` utility are
 * for. That utility was already written on PageHeader and defined nowhere, so
 * the padding this needs was missing on every screen rather than on some of
 * them — see index.css.
 *
 * The style is the dark-glyph one, because the app is light nearly
 * everywhere. A screen with a dark background of its own can call
 * `setStatusBarStyle("light")` on entry and put it back on exit.
 */
export async function configureStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform() || statusBarReady) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      // Transparent rather than the wash: with the webview overlaying, a
      // solid colour here would paint a band back over the page.
      await StatusBar.setBackgroundColor({ color: "#00000000" });
    }
    statusBarReady = true;
  } catch (error) {
    console.warn("[native] Status bar setup failed:", error);
  }
}

/**
 * Flip the status bar glyphs for a screen that is dark under them.
 *
 * `"light"` means light glyphs for a dark background — the opposite of
 * Capacitor's `Style.Light`, which means *dark* glyphs for a light one. The
 * naming has caught enough people that this wrapper takes the plain-English
 * word and does the translation here.
 */
export async function setStatusBarStyle(mode: "light" | "dark"): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: mode === "light" ? Style.Dark : Style.Light });
  } catch (error) {
    console.warn("[native] Status bar style change failed:", error);
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
    // NOTE this does far more than its name says. The iOS implementation is
    // webView.scrollView.scrollEnabled = NO — the webview's DOCUMENT
    // scroller is off, permanently, for the whole app. That is wanted (it is
    // what stops iOS dragging the page around when the keyboard opens), but
    // it means NO PAGE may rely on document scrolling: every screen must own
    // an overflow-y-auto container. A page that forgets scrolls perfectly in
    // every browser and is frozen solid on the device — that was the
    // category page, twice.
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
