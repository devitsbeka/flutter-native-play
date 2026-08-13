import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Connectivity, from the platform that actually knows.
 *
 * `navigator.onLine` inside a WKWebView is close to useless: it reports the
 * webview's own notion of reachability, which stays `true` on a phone that
 * has dropped to no signal, and does not fire `online`/`offline` reliably
 * when the radio state changes. So the offline banner — the app's only
 * feedback that a request failed because the network went away — effectively
 * never appeared on iOS.
 *
 * `@capacitor/network` reads the real connection state and pushes changes.
 * The browser events stay as the web implementation.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const apply = (online: boolean) => {
      setIsOnline(online);
      // Latches on the first disconnection so callers can tell "has been
      // offline at some point" from "is offline now" — used to decide whether
      // a refetch is worth doing on reconnect.
      if (!online) setWasOffline(true);
    };

    if (Capacitor.isNativePlatform()) {
      let remove: (() => void) | undefined;
      let cancelled = false;

      (async () => {
        try {
          const { Network } = await import("@capacitor/network");

          const status = await Network.getStatus();
          if (!cancelled) apply(status.connected);

          const handle = await Network.addListener("networkStatusChange", (s) =>
            apply(s.connected),
          );
          if (cancelled) handle.remove();
          else remove = () => handle.remove();
        } catch (error) {
          console.warn("[network] Falling back to navigator.onLine:", error);
        }
      })();

      return () => {
        cancelled = true;
        remove?.();
      };
    }

    const handleOnline = () => apply(true);
    const handleOffline = () => apply(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
