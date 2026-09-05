/**
 * Where to go after an OAuth round trip, and when to stop believing it.
 *
 * The Google flow leaves the app entirely, so the destination cannot be held
 * in React state — it goes to localStorage before the redirect and is read
 * when the user comes back.
 *
 * The catch is that "comes back" is not guaranteed. The redirect target is
 * `window.location.origin`, which is `/` — not `/auth`, the only screen that
 * consumes this key. So on the common path the value is written and never
 * read, and a cancelled or failed sign-in does not write anything back
 * either. It simply stays, with no expiry, for as long as the browser keeps
 * the profile.
 *
 * The next time that person reaches `/auth` for ANY reason — most often the
 * "Sign in to play with friends" wall, whose button goes straight there —
 * the effect finds a months-old path and navigates them to it. That is a
 * user landing on the online-game page when they expected home, from a
 * Google sign-in they abandoned once.
 *
 * (AuthRequiredModal's Apple branch already documents this hazard and
 * deliberately writes nothing. The Google branch beside it did not.)
 *
 * So: the value carries the time it was written and is only honoured while
 * an OAuth round trip could plausibly still be in progress. Anything older
 * is somebody's abandoned attempt, and is dropped rather than obeyed.
 */

const KEY = "authReturnTo";

/**
 * How long a stored destination stays believable.
 *
 * An OAuth round trip is seconds; ten minutes is generous enough to cover a
 * slow provider, a password prompt and a 2FA code, and short enough that it
 * cannot outlive the session that started it.
 */
export const AUTH_RETURN_TO_TTL_MS = 10 * 60 * 1000;

/**
 * Is this somewhere inside our own app?
 *
 * The value is replayed into `navigate()`, so it has to be a path and not a
 * URL. "//evil.example" is a protocol-relative URL that a browser treats as
 * another origin, which is why a leading "/" alone is not enough of a check.
 */
export function isSafeReturnPath(path: string | null | undefined): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\")
  );
}

/** Remember where to land, with the time it was asked for. */
export function rememberAuthReturnTo(path: string, now: number = Date.now()): void {
  if (!isSafeReturnPath(path)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: now }));
  } catch {
    /* private mode: the explicit returnTo param still covers the same-tab flow */
  }
}

/** Drop it — the attempt failed, was cancelled, or has been honoured. */
export function forgetAuthReturnTo(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/**
 * Read the destination once, and only if it is still fresh.
 *
 * Always removes the key, fresh or stale: a value that was not good enough
 * to use now will not be good enough later, and leaving it is how this
 * became a bug in the first place.
 *
 * A value in the older plain-string format is dropped, not obeyed. It has no
 * timestamp, so there is no way to tell an OAuth trip that is still in flight
 * from the abandoned one this was written to fix — and every browser that
 * currently carries a stale key would otherwise get the bug one last time.
 * The cost of dropping it is that an OAuth trip in flight across this deploy
 * lands on home instead of where it started. That is the safe direction.
 */
export function takeAuthReturnTo(now: number = Date.now()): string | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  forgetAuthReturnTo();
  if (!raw) return null;

  // The pre-timestamp format: a bare path, already cleared above.
  if (raw.startsWith("/")) return null;

  try {
    const parsed = JSON.parse(raw) as { path?: unknown; at?: unknown };
    const path = parsed?.path;
    const at = parsed?.at;
    if (!isSafeReturnPath(typeof path === "string" ? path : null)) return null;
    if (typeof at !== "number" || !Number.isFinite(at)) return null;
    // A clock that went backwards should not resurrect a stale value, so the
    // age is measured in absolute terms.
    if (Math.abs(now - at) > AUTH_RETURN_TO_TTL_MS) return null;
    return path as string;
  } catch {
    return null;
  }
}
