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
    // `primeTrackingConsent()` now records that the app is up; the prompt
    // itself waits for `declareAgeGroup()` and appears only for a player who
    // has said they are 18+. `useConsentOrchestration` supplies the age as
    // soon as the profile resolves, so for a returning adult this is still
    // the first thing that happens after launch — which is what App Review
    // has to be able to find.
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
