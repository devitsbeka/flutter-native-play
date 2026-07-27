import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// A deployed SPA only updates when the page reloads - devices that keep the
// tab open for hours silently run stale code through publish after publish
// (which made fixes look like they "didn't work" while the server was
// already serving the new build). This guard compares the bundle hash this
// page is RUNNING against the one the server currently SERVES, and reloads
// at a safe moment when they differ.

const CHECK_INTERVAL_MS = 45 * 1000;

// The ONLY unsafe moment is an actively running game (question/reveal/
// countdown phases - flagged by TVGameContext). Lobbies, menus, results:
// all reconnect cleanly after a reload. The earlier route-based allowlist
// left devices that lived on game screens all evening permanently stale.
const isSafeMoment = (): boolean =>
  !(window as unknown as { __liveGameActive?: boolean }).__liveGameActive;

// Survives route changes: once a newer build is detected, reload at the
// first safe opportunity
let staleDetected = false;

// Short human-readable fingerprint of the code THIS device is running -
// rendered in lobby corners so build mismatches are visible at a glance
export function currentBuildLabel(): string {
  const b = runningBundle();
  return b ? b.replace(/^index-/, "").replace(/\.js$/, "") : "dev";
}

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
  if (isSafeMoment()) {
    console.warn("[FreshBuild] Reloading to pick up the new build");
    window.location.reload();
  }
}

export function useFreshBuildGuard() {
  const location = useLocation();

  // Any navigation while a newer build is known to exist → reload if no
  // game is actively running
  useEffect(() => {
    if (staleDetected && isSafeMoment()) {
      console.warn("[FreshBuild] Stale build and no live game - reloading");
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
