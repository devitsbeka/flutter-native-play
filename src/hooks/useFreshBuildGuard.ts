import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// A deployed SPA only updates when the page reloads - devices that keep the
// tab open for hours silently run stale code through publish after publish
// (which made fixes look like they "didn't work" while the server was
// already serving the new build). This guard compares the bundle hash this
// page is RUNNING against the one the server currently SERVES, and reloads
// at a safe moment when they differ.

const CHECK_INTERVAL_MS = 2 * 60 * 1000;

// Never auto-reload in the middle of live gameplay - only on browse-y routes
const SAFE_PREFIXES = ["/explore", "/leaderboards", "/shop", "/profile", "/settings"];
const isSafeRoute = (pathname: string): boolean =>
  pathname === "/" || SAFE_PREFIXES.some(p => pathname.startsWith(p));

// Survives route changes: once a newer build is detected, reload at the
// first safe opportunity
let staleDetected = false;

function runningBundle(): string | null {
  const script = document.querySelector<HTMLScriptElement>('script[src*="assets/index-"]');
  const match = script?.src.match(/assets\/(index-[^/]+\.js)/);
  return match ? match[1] : null;
}

async function servedBundle(): Promise<string | null> {
  try {
    const res = await fetch("/", { cache: "no-store" });
    const html = await res.text();
    const match = html.match(/assets\/(index-[^"']+\.js)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function checkAndMaybeReload() {
  const current = runningBundle();
  if (!current) return;
  const served = await servedBundle();
  if (!served) return;
  if (served === current) {
    staleDetected = false;
    return;
  }
  if (!staleDetected) {
    console.warn("[FreshBuild] New build deployed:", served, "(running:", current, ")");
  }
  staleDetected = true;
  if (isSafeRoute(window.location.pathname)) {
    console.warn("[FreshBuild] Reloading to pick up the new build");
    window.location.reload();
  }
}

export function useFreshBuildGuard() {
  const location = useLocation();

  // Landing on a safe route while a newer build is known to exist → reload
  useEffect(() => {
    if (staleDetected && isSafeRoute(location.pathname)) {
      console.warn("[FreshBuild] Safe route reached with stale build - reloading");
      window.location.reload();
    }
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(checkAndMaybeReload, CHECK_INTERVAL_MS);
    // Returning to the app is the perfect moment to catch up
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkAndMaybeReload();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
