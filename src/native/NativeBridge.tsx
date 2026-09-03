import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { configureDeepLinks, hideSplashScreen } from "@/native/nativeShell";
import { TrackingConsentGate } from "@/native/TrackingConsentGate";
import { primeTrackingConsent } from "@/native/trackingConsent";

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
      requestAnimationFrame(() => {
        hideSplashScreen();

        // Ask about tracking here, and nowhere earlier.
        //
        // This is the call App Review has to be able to find. It used to
        // happen only inside adService, behind an opt-in "watch ad" button
        // that a reviewer never pressed, and build 34 was rejected for a
        // prompt that could not be located. Nothing about it is conditional
        // on sign-in, VIP status, or ads now — it runs on every cold start
        // until iOS has an answer on file.
        //
        // After the splash rather than before: iOS only presents the ATT
        // dialog while the app is active, and the native side waits for that
        // anyway. Doing it here also means the explanation screen appears
        // over a drawn app rather than a white webview.
        void primeTrackingConsent();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      dispose?.();
    };
  }, [navigate]);

  // The ATT explanation screen. Invisible until consent is asked for, and
  // mounted here so it is already subscribed when the effect above primes it
  // — child effects run before the parent's, so the ordering holds.
  return <TrackingConsentGate />;
}
