import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
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

    // Retired products: known to the server, deliberately not sold.
    //
    // `io.mytrivia.adfree` is the only one. Its sole entry point was a modal
    // Index rendered and never opened, so it could not be bought from any
    // shipped build — and a product App Review cannot reach is a 2.1
    // rejection the moment it is attached to a submission. It was dropped
    // from IAP_PRODUCTS; PRO already removes ads.
    //
    // The server keeps it, because the `ad_free` tier is not the edge
    // function's alone: it is written into the subscriptions table, the
    // pro-seats migration and supabase/tests/03-pro-seats.sql. Deleting the
    // mapping would orphan the tier without removing it.
    const RETIRED = new Set(["io.mytrivia.adfree"]);

    for (const id of RETIRED) {
      expect(
        server.has(id),
        `${id} is listed here as retired but the server no longer knows it — ` +
          "drop it from RETIRED, or restore the mapping so an existing " +
          "entitlement still resolves.",
      ).toBe(true);
      expect(
        client.has(id),
        `${id} is sold by the app again. That is fine, but it needs a real ` +
          "entry point a reviewer can reach before the product is attached " +
          "to a submission — remove it from RETIRED once it has one.",
      ).toBe(false);
    }

    const unsold = [...server].filter((id) => !client.has(id) && !RETIRED.has(id));
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


  it("charges the price it displays, in every currency", () => {
    // Two copies of the price table: src/config/pricing.ts, which every
    // screen reads, and supabase/functions/_shared/pricing.ts, which both
    // checkouts charge from. An edge function cannot import from src/, so
    // they are written twice — and a change to one alone is a screen quoting
    // one number while Stripe takes another, which is exactly the fault this
    // table was introduced to end (10.97 lari shown, 9.99 charged).
    const parse = (source: string) => {
      const body = read(source).match(/PRICES: Record<PriceKey, Record<Currency, number>> = \{([\s\S]*?)\n\};/);
      expect(body, `no PRICES table in ${source}`).toBeTruthy();
      const table: Record<string, string> = {};
      for (const line of body![1].split("\n")) {
        const row = line.match(/^\s*(\w+):\s*\{([^}]*)\}/);
        if (row) table[row[1]] = row[2].replace(/\s+/g, "");
      }
      return table;
    };

    const client = parse("src/config/pricing.ts");
    const server = parse("supabase/functions/_shared/pricing.ts");

    expect(Object.keys(client).length, "no rows parsed from the client table").toBeGreaterThan(0);
    expect(
      Object.keys(server).sort(),
      "the two price tables sell different things",
    ).toEqual(Object.keys(client).sort());

    for (const key of Object.keys(client)) {
      expect(
        server[key],
        `${key} is priced differently in the app and in the checkout: ` +
          `app has ${client[key]}, checkout has ${server[key]}. The app would ` +
          "quote one number and Stripe would take the other.",
      ).toBe(client[key]);
    }

    // Same currencies on both sides, or a language maps to a currency the
    // checkout cannot price.
    const languages = (source: string) =>
      read(source)
        .match(/CURRENCY_BY_LANGUAGE: Record<string, Currency> = \{([\s\S]*?)\n\};/)![1]
        .replace(/\s+/g, "");
    expect(
      languages("supabase/functions/_shared/pricing.ts"),
      "the app and the checkout disagree about which currency a language buys in",
    ).toBe(languages("src/config/pricing.ts"));
  });

  it("keeps the two PRO tier products on a monthly identifier", () => {
    // PRO and Friends PRO differ by friend invites, not billing period, and
    // both render a "/month" label (PRO_TIERS in ProPlansSection.tsx). They
    // were once named vip.monthly/vip.annual after an unrelated shop_items
    // migration; whoever created the App Store products from those names
    // would have made the $7.99 tier yearly — undercharging 12x while the
    // screen said "/month", which is a guideline 2.3.1 rejection.
    //
    // What this catches is a RENAME: either tier's id turning into an annual
    // or weekly one while the tier's own screens keep saying /month. The
    // paywall's other billing periods (pro.annual, pro.weekly) are separate
    // products with their own label — src/config/proPlans.ts pairs each id
    // with the period it prints — so they are named here as expected, not
    // matched by pattern. An id that appears in neither list fails.
    const source = read("src/hooks/useInAppPurchases.ts");
    const TIER_PRODUCTS = ["io.mytrivia.pro.monthly", "io.mytrivia.proplus.monthly"];
    const PERIOD_PRODUCTS = ["io.mytrivia.pro.annual", "io.mytrivia.pro.weekly"];

    const subscriptions = [...source.matchAll(/"(io\.mytrivia\.(?:pro|proplus)\.[a-z0-9.]+)"/g)]
      .map((m) => m[1]);

    for (const id of TIER_PRODUCTS) {
      expect(subscriptions, `${id} is missing from IAP_PRODUCTS`).toContain(id);
    }

    const unaccounted = subscriptions.filter(
      (id) => !TIER_PRODUCTS.includes(id) && !PERIOD_PRODUCTS.includes(id),
    );
    expect(
      unaccounted,
      `These subscription product ids are neither of the two monthly tiers ` +
        `nor a known billing period: ${unaccounted.join(", ")}. A tier id must ` +
        "stay monthly — renaming one to annual is how the $7.99 tier would be " +
        "created as yearly behind a /month label. A genuinely new period gets " +
        "its own id, its own row in proPlans.ts, and its own label.",
    ).toEqual([]);
  });

  it("never puts a safe-area utility on the same element as its own padding", () => {
    // `.safe-top` / `.safe-bottom` / `.safe-screen` are written as doubled
    // selectors (`.safe-bottom.safe-bottom`) so they outrank the utilities
    // that were beating them — a modal's `p-4` used to win and the contents
    // sat under the status bar.
    //
    // That specificity cuts the other way too, and silently: an element
    // carrying both `safe-bottom` and `pb-6` gets the inset ONLY, and the
    // 24px the design asked for is discarded with nothing to show for it.
    // That is how the start-game button in the room lobby ended up against
    // the bottom of the screen.
    //
    // The two cannot be combined, so combine them by hand:
    //   `safe-bottom pb-6` -> `pb-[calc(1.5rem_+_var(--safe-bottom))]`
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = resolve(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx$/.test(entry)) continue;

        const source = readFileSync(full, "utf8");
        for (const match of source.matchAll(/class(?:Name)?="([^"]*)"/g)) {
          const classes = match[1].split(/\s+/);
          const has = (name: string) => classes.includes(name);
          // Only bare utilities count — `pb-[calc(... var(--safe-bottom))]`
          // is the fix, not the fault.
          const padded = (prefixes: string[]) =>
            classes.some((c) => prefixes.some((p) => new RegExp(`^${p}-\\d`).test(c)));

          const bottomClash =
            (has("safe-bottom") || has("safe-screen")) && padded(["pb", "py", "p"]);
          const topClash = (has("safe-top") || has("safe-screen")) && padded(["pt", "py"]);

          if (bottomClash || topClash) {
            offenders.push(`${full.slice(resolve(REPO).length + 1)}: ${match[1]}`);
          }
        }
      }
    };

    walk(resolve(REPO, "src"));

    expect(
      offenders,
      "These elements ask for a safe-area inset and their own padding on the " +
        "same element. The doubled safe-* selector wins and the padding is " +
        "dropped:\n" +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("lists every shareable route in the universal-links file", () => {
    // A path missing from apple-app-site-association fails silently and
    // invisibly: iOS opens the link in Safari, on a phone that has the app
    // installed, with nothing anywhere to say why. /i/* shipped that way —
    // it is the personal invite link, the format every share button in the
    // app emits, and it was the one route not in the list.
    const aasa = JSON.parse(read("public/.well-known/apple-app-site-association"));
    const paths: string[] = aasa.applinks.details[0].paths;

    for (const route of ["/i/*", "/room/*", "/join/*", "/challenge/*"]) {
      expect(
        paths,
        `${route} is missing from the universal-links file, so iOS will open ` +
          "it in Safari instead of the app.",
      ).toContain(route);
    }
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
