/**
 * Getting back out of Stripe Checkout.
 *
 * Two things the owner hit on the web PRO purchase, both from the same
 * cause: Checkout is a page on stripe.com, so the app's own page stays in
 * the tab's history underneath it, and Checkout's back arrow does not go
 * back — it navigates FORWARD to the session's `cancel_url`. The stack after
 * a cancelled purchase was
 *
 *     [ … , the page you were on , stripe.com , /profile?tab=PRO ]
 *
 * so Back landed on the account page (the hard-coded cancel_url) rather than
 * where Buy was pressed, and the next Back landed on the payment screen,
 * which is still sitting there. A cross-origin entry cannot be deleted, but
 * it can be stepped over: the launch depth is recorded before the tab
 * leaves, and the cancel page jumps straight back to it.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readCheckoutLaunch, stepsBackToLaunch } from "@/utils/checkoutReturn";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("how far back the launch page is", () => {
  it("one push by Checkout and one by the cancel page is two steps", () => {
    expect(stepsBackToLaunch(4, 6)).toBe(2);
  });

  it("and however many pages Checkout pushed on the way, because the depth is measured, not assumed", () => {
    // history.length counts cross-origin entries too, so a Checkout that
    // pushed three of its own is still landed exactly.
    expect(stepsBackToLaunch(4, 9)).toBe(5);
  });

  it("no movement, or backwards, is not trusted", () => {
    // A capped history (browsers stop growing it) or a stale record: better
    // to go somewhere sensible than to throw the player an arbitrary
    // distance through their own history.
    expect(stepsBackToLaunch(4, 4)).toBeNull();
    expect(stepsBackToLaunch(9, 4)).toBeNull();
  });

  it("nor is an absurd distance", () => {
    expect(stepsBackToLaunch(1, 40)).toBeNull();
  });
});

describe("the record itself", () => {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  afterEach(() => store.clear());

  const put = (value: unknown) =>
    store.set("mytrivia:checkout-launch", JSON.stringify(value));

  it("is read once and cleared, so a later visit cannot act on it", () => {
    put({ path: "/profile?tab=PRO", depth: 4, at: Date.now() });
    expect(readCheckoutLaunch()?.depth).toBe(4);
    expect(readCheckoutLaunch()).toBeNull();
  });

  it("is ignored once it is hours old", () => {
    const at = Date.now() - 3 * 60 * 60 * 1000;
    put({ path: "/", depth: 4, at });
    expect(readCheckoutLaunch()).toBeNull();
  });

  it("and survives nothing being there at all", () => {
    expect(readCheckoutLaunch()).toBeNull();
  });
});

describe("the wiring", () => {
  it("both checkout functions send Stripe's back arrow to the stepping page", () => {
    for (const fn of ["create-pro-checkout", "create-gem-checkout"]) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      expect(src, fn).toMatch(/cancel_url: `\$\{origin\}\/checkout\/cancelled`/);
    }
    // Not the account page, which is where the owner's Back kept landing.
    expect(read("supabase/functions/create-pro-checkout/index.ts")).not.toMatch(
      /cancel_url: `\$\{origin\}\/profile/,
    );
  });

  it("the app has that route, and it steps rather than renders", () => {
    expect(read("src/App.tsx")).toMatch(/<Route path="\/checkout\/cancelled" element=\{<CheckoutCancelled \/>\} \/>/);
    const page = read("src/pages/checkout/Cancelled.tsx");
    expect(page).toMatch(/window\.history\.go\(-steps\)/);
    // And when the depth cannot be trusted it replaces itself rather than
    // leaving the player standing on top of Stripe.
    expect(page).toMatch(/navigate\(launch\?\.path \?\? "\/", \{ replace: true \}\)/);
  });

  it("both purchase paths mark the depth before the tab leaves", () => {
    for (const hook of ["useProPurchase", "useGemPurchase"]) {
      const src = read(`src/hooks/${hook}.ts`);
      expect(src, hook).toMatch(/rememberCheckoutLaunch\(\);\s*\n\s*window\.location\.href = data\.url;/);
    }
  });

  it("and the nickname is read only when a customer is actually created", () => {
    // One of the four round trips the tab waits on between pressing Buy and
    // Checkout appearing, spent on a name only a NEW customer needs.
    for (const fn of ["create-pro-checkout", "create-gem-checkout"]) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      const list = src.indexOf("stripe.customers.list");
      const nickname = src.indexOf('.select("nickname")');
      expect(list, fn).toBeGreaterThan(-1);
      expect(nickname, fn).toBeGreaterThan(list);
    }
  });
});
