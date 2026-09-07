/**
 * Getting back out of Stripe Checkout.
 *
 * Checkout is a page on stripe.com, so opening it is a cross-origin
 * navigation and the app's own page stays underneath it in the tab's history.
 * Stripe's own back arrow does NOT go back — it navigates forward to the
 * session's `cancel_url`. So the stack after a cancelled purchase is
 *
 *     [ … , the page you were on , stripe.com , the cancel page ]
 *
 * which is why the owner's Back landed on the account page (the old
 * hard-coded `cancel_url`) and the next Back landed on the payment screen
 * again: Checkout is still sitting there, one step down.
 *
 * A cross-origin entry cannot be deleted, but it can be STEPPED OVER. This
 * records how deep the history was when checkout was opened; the cancel page
 * reads it back and jumps straight to that depth, so the player lands on the
 * page they pressed Buy on and Checkout is left in the forward direction
 * where nobody will meet it.
 *
 * `history.length` counts the whole joint session history, cross-origin
 * entries included, so the arithmetic holds however many pages Checkout
 * pushed on its way through.
 */

const KEY = "mytrivia:checkout-launch";

/** Depth is only meaningful within one tab, which is what sessionStorage is. */
interface Launch {
  /** Where Buy was pressed. Only for the fallback and for logging. */
  path: string;
  /** `history.length` at that moment. */
  depth: number;
  /** When, so a stale record from a previous session is not trusted. */
  at: number;
}

/** Older than this and the record is ignored — Checkout expires long before. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
/** More steps than any real checkout adds; beyond it, do not guess. */
const MAX_STEPS = 12;

/** Call immediately before handing the tab to Stripe. */
export function rememberCheckoutLaunch(): void {
  try {
    const launch: Launch = {
      path: window.location.pathname + window.location.search,
      depth: window.history.length,
      at: Date.now(),
    };
    sessionStorage.setItem(KEY, JSON.stringify(launch));
  } catch {
    // Private mode, or storage full: the cancel page falls back to the home
    // screen, which is worse than exact but is not a trap.
  }
}

/** Read and clear the record. Exported for the test and the cancel page. */
export function readCheckoutLaunch(now = Date.now()): Launch | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Launch>;
    if (typeof parsed?.depth !== "number" || typeof parsed?.at !== "number") return null;
    if (now - parsed.at > MAX_AGE_MS) return null;
    return { path: typeof parsed.path === "string" ? parsed.path : "/", depth: parsed.depth, at: parsed.at };
  } catch {
    return null;
  }
}

/**
 * How many entries to step back to land on the page checkout was opened
 * from, or null when the record cannot be trusted and the caller should just
 * go somewhere sensible instead.
 *
 * Exported on its own so the arithmetic is testable without a browser.
 */
export function stepsBackToLaunch(launchDepth: number, currentDepth: number): number | null {
  const steps = currentDepth - launchDepth;
  if (!Number.isFinite(steps) || steps < 1 || steps > MAX_STEPS) return null;
  return steps;
}
