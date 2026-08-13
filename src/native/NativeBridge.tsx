import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { configureDeepLinks, hideSplashScreen } from "@/native/nativeShell";

/**
 * The native shell's foothold inside the router.
 *
 * Renders nothing. It exists because two native concerns need something React
 * only knows: deep links need `navigate`, and the launch screen should come
 * down when the first route has actually painted rather than on a timer.
 *
 * Mounted inside BrowserRouter, above the app, so it is running before the
 * first deep link can arrive.
 */
export function NativeBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;

    configureDeepLinks(navigate).then((cleanup) => {
      if (cancelled) cleanup();
      else dispose = cleanup;
    });

    // Two frames: the first is scheduled before paint, the second runs after
    // it. Hiding on the first uncovers a webview that has laid out but not
    // yet drawn, which flashes white on exactly the slower devices the splash
    // is there to cover.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => { hideSplashScreen(); });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      dispose?.();
    };
  }, [navigate]);

  return null;
}
