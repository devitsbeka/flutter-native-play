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

    // Register the intent to ask about tracking. It does NOT prompt here.
    //
    // This used to sit inside the double-rAF below and put the ATT dialog on
    // the first painted frame of a cold start — no session, no age, no
    // interaction. The age gate only runs inside signup, so a 13-year-old was
    // asked to allow tracking before ever declaring an age: guideline 5.1.4.
    //
    // `primeTrackingConsent()` prompts, on every cold start, for everyone,
    // until iOS has an answer on file. It waits for nothing else.
    //
    // An earlier version gated it on the player having declared themselves
    // 18+, which meant a guest was never asked. App Review played as a guest
    // on an iPad, could not find the prompt, and rejected under 2.1. Younger
    // players are protected by the ad restrictions keyed off age, not by
    // withholding the question.
    void primeTrackingConsent();

    // Two frames: the first is scheduled before paint, the second runs after
    // it. Hiding on the first uncovers a webview that has laid out but not
    // yet drawn, which flashes white on exactly the slower devices the splash
    // is there to cover.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hideSplashScreen();
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
