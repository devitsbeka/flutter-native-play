import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Things that must not quietly disappear.
 *
 * This repo is edited by more than one agent. Lovable, in particular,
 * regenerates files from its own view of the world — the live database, a bun
 * install — and has twice removed something the build depends on without any
 * error at the point of removal:
 *
 *  - It regenerated `types.ts` from a database that did not yet have the
 *    entitlement migrations, deleting six RPC definitions. `main` then failed
 *    typecheck with 24 errors pointing at call sites, none of which explained
 *    the cause.
 *  - It installed with bun, updating `package.json` and `bun.lock` but not
 *    `package-lock.json`. Every CI job then died inside `npm ci`, before any
 *    code ran, on both open pull requests at once.
 *
 * Each of those cost far more to diagnose than to fix. These assertions turn
 * the same breakage into one named failure that says what happened and why.
 *
 * They are cheap and they are not clever on purpose: a grep for a symbol beats
 * a real type check here, because the point is a legible message, not rigour.
 */

const REPO = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

describe("repo invariants", () => {
  it("keeps the entitlement RPC types in the generated Supabase types", () => {
    const types = read("src/integrations/supabase/types.ts");

    // These are database functions the client calls by name. Regenerating
    // types.ts against a database missing the migrations silently drops them.
    const REQUIRED = [
      "grant_vip_days",
      "ensure_admin_lifetime_pro",
      "claim_daily_reward",
      "claim_leaderboard_reward",
      "credit_gameplay_reward",
      "exchange_currency",
    ];

    // Match the definition, not the bare name. A substring check passes for a
    // renamed or partially-removed entry — which it did, when this test was
    // first written against `types.includes(fn)`.
    const missing = REQUIRED.filter(
      (fn) => !new RegExp(`\\b${fn}:\\s*\\{`).test(types),
    );

    expect(
      missing,
      "types.ts is missing entitlement RPCs: " +
        missing.join(", ") +
        ".\n" +
        "This happens when types.ts is regenerated against a database that " +
        "does not have supabase/migrations/20260813*.sql applied.\n" +
        "Fix: apply the migrations, then regenerate — or restore the entries.",
    ).toEqual([]);
  });

  it("keeps package-lock.json in sync with package.json", () => {
    const pkg = JSON.parse(read("package.json"));
    const lock = JSON.parse(read("package-lock.json"));

    const declared = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];

    const locked = new Set(
      Object.keys(lock.packages ?? {})
        .filter((p) => p.startsWith("node_modules/"))
        .map((p) => p.replace(/^node_modules\//, "")),
    );

    const missing = declared.filter((dep) => !locked.has(dep));

    expect(
      missing,
      "package-lock.json is missing: " +
        missing.join(", ") +
        ".\n" +
        "`npm ci` refuses to install from an out-of-sync lockfile, so every " +
        "CI job fails before running any code.\n" +
        "This repo also carries bun.lock; installing with bun updates that one " +
        "and leaves package-lock.json behind.\n" +
        "Fix: npm install --package-lock-only",
    ).toEqual([]);
  });

  it("keeps the build from shipping without a backend", () => {
    const viteConfig = read("vite.config.ts");

    expect(
      viteConfig.includes("Refusing to build"),
      "vite.config.ts no longer refuses to build without VITE_SUPABASE_URL.\n" +
        "Vite inlines `undefined` for an unset VITE_* var, so without this the " +
        "build succeeds and deploys an app that cannot reach Supabase at all — " +
        "with nothing in CI to say why.",
    ).toBe(true);
  });

  it("keeps the environment file the build systems read", () => {
    expect(
      existsSync(resolve(REPO, ".env")),
      ".env is missing. Three separate builders read it — the GitHub deploy " +
        "workflow, Lovable, and local builds. It holds only the Supabase " +
        "project ref and the publishable anon key, both public by design.",
    ).toBe(true);

    const env = read(".env");
    for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
      expect(env.includes(key), `.env is missing ${key}`).toBe(true);
    }
  });

  it("keeps the client and server product catalogs in agreement", () => {
    // Three files name App Store product ids: the client's IAP_PRODUCTS, the
    // gem packs, and PRODUCTS in the edge function that decides what each id
    // grants. Only the last one is consulted when a purchase lands, so an id
    // that exists in the client and not there means Apple takes the money and
    // the user receives nothing — silently, with no error on any path.
    //
    // These ids are also permanent: App Store Connect never lets one be
    // renamed or reused, so a typo caught here is free and the same typo
    // caught after launch is not fixable at all.
    const ids = (source: string) =>
      new Set(
        [...read(source).matchAll(/"(io\.mytrivia\.[a-z0-9.]+)"/g)].map((m) => m[1]),
      );

    const server = ids("supabase/functions/_shared/iap.ts");
    const client = new Set([
      ...ids("src/hooks/useInAppPurchases.ts"),
      ...ids("src/config/gemPacks.ts"),
    ]);

    expect(server.size, "no product ids found in _shared/iap.ts").toBeGreaterThan(0);

    const unredeemable = [...client].filter((id) => !server.has(id));
    expect(
      unredeemable,
      `These product ids are sold by the app but absent from PRODUCTS in ` +
        `supabase/functions/_shared/iap.ts: ${unredeemable.join(", ")}. ` +
        "A purchase of one succeeds, is charged, and grants nothing.",
    ).toEqual([]);

    const unsold = [...server].filter((id) => !client.has(id));
    expect(
      unsold,
      `These product ids are in the server catalog but nothing in the app ` +
        `sells them: ${unsold.join(", ")}. Either wire them up or remove ` +
        "them — a half-present product is the shape the drift takes.",
    ).toEqual([]);
  });

  it("keeps the web gem catalog in step with the client's", () => {
    // Three lists name gem packs: gemPacks.ts drives both client surfaces,
    // _shared/gems.ts prices the Stripe checkout and decides what the webhook
    // credits, and _shared/iap.ts does the same for the App Store. If the web
    // catalog is missing a pack the shop offers, checkout returns
    // UNKNOWN_PRODUCT and the pack simply cannot be bought; if it disagrees on
    // the gem count, the buyer is charged one amount and credited another.
    const packs = (source: string, re: RegExp) =>
      new Map([...read(source).matchAll(re)].map((m) => [m[1], Number(m[2])]));

    const client = packs(
      "src/config/gemPacks.ts",
      /id:\s*"(gems_\w+)"[\s\S]*?\bgems:\s*(\d+)/g,
    );
    const server = packs(
      "supabase/functions/_shared/gems.ts",
      /(gems_\w+):\s*\{[\s\S]*?\bgems:\s*(\d+)/g,
    );

    expect(client.size, "no packs parsed from gemPacks.ts").toBeGreaterThan(0);
    expect([...server.keys()].sort()).toEqual([...client.keys()].sort());

    for (const [id, gems] of client) {
      expect(server.get(id), `pack ${id} grant`).toBe(gems);
    }
  });

  it("never lets the Stripe webhook run unsigned", () => {
    // It used to fall back to JSON.parse(body) with a console warning when
    // STRIPE_WEBHOOK_SECRET was unset. The endpoint is public and runs with
    // verify_jwt = false, because Stripe carries no Supabase session — so that
    // fallback meant anyone who knew the URL could post a made-up
    // checkout.session.completed and be credited, with no payment involved.
    // Comments stripped first: the note above the guard in that file names
    // the call it is banning, and matching the file text would flag it.
    const source = read("supabase/functions/stripe-gem-webhook/index.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(
      /JSON\.parse\(\s*body\s*\)/.test(source),
      "stripe-gem-webhook parses the request body directly. Events must only " +
        "come from constructEvent/constructEventAsync, which verifies Stripe's " +
        "signature — parsing the body is how the unauthenticated path returns.",
    ).toBe(false);

    expect(
      /constructEventAsync?\(/.test(source),
      "stripe-gem-webhook no longer verifies the Stripe signature.",
    ).toBe(true);
  });

  it("keeps both PRO subscriptions on a monthly identifier", () => {
    // PRO and Friends PRO differ by friend invites, not billing period, and
    // both render a "/month" label (PRO_TIERS in ProPlansSection.tsx). They
    // were once named vip.monthly/vip.annual after an unrelated shop_items
    // migration; whoever created the App Store products from those names
    // would have made the $7.99 tier yearly — undercharging 12x while the
    // screen said "/month", which is a guideline 2.3.1 rejection.
    //
    // Matched against the id strings only, not the file text — the comment
    // above IAP_PRODUCTS explains this history and names the old ids.
    const source = read("src/hooks/useInAppPurchases.ts");
    const periodic = [...source.matchAll(/"(io\.mytrivia\.[a-z0-9.]+)"/g)]
      .map((m) => m[1])
      .filter((id) => /annual|yearly/i.test(id));

    expect(
      periodic,
      `These subscription product ids say annual/yearly: ${periodic.join(", ")}. ` +
        "Both PRO tiers bill monthly — if an annual plan is genuinely being " +
        "added, give it its own tier and its own /year label rather than " +
        "renaming an existing monthly product.",
    ).toEqual([]);
  });

  it("keeps the entitlement migrations", () => {
    // Deleting one of these would rebuild a fresh database with the
    // free-subscription and currency-minting holes back in place.
    for (const file of [
      "supabase/migrations/20260813120000_lock_vip_entitlements.sql",
      "supabase/migrations/20260813150000_server_authoritative_currency.sql",
      "supabase/migrations/20260813210000_close_currency_public_grant.sql",
    ]) {
      expect(
        existsSync(resolve(REPO, file)),
        `${file} is missing. Without it a rebuilt database has the ` +
          "entitlement and currency holes open again.",
      ).toBe(true);
    }
  });
});
