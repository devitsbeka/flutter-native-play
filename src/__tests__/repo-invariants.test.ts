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
