/**
 * What the app does before it shows "Something went wrong".
 *
 * Two things reach the root boundary. A deploy: the tab is running an old
 * build, taps a route whose chunk is now a 404, and there is nothing wrong
 * with the app — a reload fixes it. And a real crash: a render that throws,
 * which a reload may or may not fix and which must be recorded either way.
 *
 * The owner's question (owner: "when i see this screen? why we can't reload
 * to not show this screen, check it") was fair on both counts:
 *
 *   - a stale chunk was only caught once it had already thrown inside React.
 *     Vite raises `vite:preloadError` before that, so the reload can happen
 *     with no error screen and no lost render at all;
 *   - the once-only guard against a reload loop lived for the whole session.
 *     After one silent recovery, the NEXT deploy in the same tab went
 *     straight to the error screen. The guard is cleared once the reloaded
 *     app has been up for a while, so it is one reload per incident;
 *   - a real crash went straight to the screen. It gets one silent retry of
 *     the render first (AppErrorBoundary); a transient one — a race, a null
 *     from a query that has since answered — recovers unseen, and a
 *     deterministic one shows the screen on the second throw, reported both
 *     times.
 */

export const CHUNK_RELOAD_KEY = "mytrivia_chunk_reload";

/** How long the reloaded app must stay up before another reload is allowed. */
export const HEALTHY_AFTER_MS = 15_000;

/** A chunk request that failed because the deployed build moved under us. */
export function isStaleChunkError(error: unknown): boolean {
  const e = error as { message?: unknown; name?: unknown } | null | undefined;
  const message = `${typeof e?.message === "string" ? e.message : ""} ${typeof e?.name === "string" ? e.name : ""}`;
  return (
    /dynamically imported module/i.test(message) ||
    /Loading chunk .* failed/i.test(message) ||
    /Loading CSS chunk .* failed/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Unable to preload CSS/i.test(message)
  );
}

/**
 * Reload once for a stale build. False when this incident already reloaded
 * — the flag is what stops a reload loop when it is NOT a deploy.
 */
export function reloadOnceForStaleBuild(): boolean {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** The reloaded app is up and well: the next stale chunk may reload again. */
export function markAppHealthy(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // Storage that refuses is storage that never set the flag.
  }
}

/**
 * Catch a failed lazy import before it becomes a render error. Vite fires
 * this for dynamic imports and their CSS; preventDefault keeps it from also
 * throwing into the component that asked.
 */
export function installPreloadErrorReload(): void {
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnceForStaleBuild()) event.preventDefault();
  });
}
