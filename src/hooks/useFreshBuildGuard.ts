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
// rendered in lobby corners and in Settings so "I'm not seeing the update"
// takes one glance to settle: compare it with what /version.json reports.
export function currentBuildLabel(): string {
  if (typeof __BUILD_ID__ === "string" && __BUILD_ID__) return __BUILD_ID__;
  const b = runningBundle();
  return b ? b.replace(/^index-/, "").replace(/\.js$/, "") : "dev";
}

// Manual "check for updates" for the build line in Settings. Reloads straight
// away when the server has something newer, so a stuck device has a way back
// that doesn't involve explaining browser caches.
export async function checkForUpdateNow(): Promise<"updating" | "current"> {
  const served = await servedBuildId();
  if (served && served !== __BUILD_ID__) {
    window.location.reload();
    return "updating";
  }
  const current = runningBundle();
  const servedName = current ? await servedBundle() : null;
  if (current && servedName && servedName !== current) {
    window.location.reload();
    return "updating";
  }
  return "current";
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

// Preferred check: a build id compiled into this bundle against the one in
// version.json, which every deploy rewrites. It needs neither a parseable
// script tag nor an uncached index.html, so it still works where the bundle
// comparison quietly gives up — exactly the case that leaves a device stale
// for weeks. Returns null when it cannot tell (dev server, offline, an older
// deploy that predates version.json).
async function servedBuildId(): Promise<string | null> {
  const running = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : null;
  if (!running) return null;
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { build?: string };
    return typeof data.build === "string" ? data.build : null;
  } catch {
    return null;
  }
}

async function checkAndMaybeReload() {
  const servedId = await servedBuildId();
  if (servedId) {
    if (servedId === __BUILD_ID__) {
      staleDetected = false;
      return;
    }
    if (!staleDetected) {
      console.warn("[FreshBuild] New build deployed:", servedId, "(running:", __BUILD_ID__, ")");
    }
    staleDetected = true;
    if (isSafeMoment()) {
      console.warn("[FreshBuild] Reloading to pick up the new build");
      window.location.reload();
    }
    return;
  }

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
