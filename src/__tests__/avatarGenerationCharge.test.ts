import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FREE_AVATAR_GENERATIONS,
  MAX_AVATAR_GENERATIONS,
  EXTRA_GENERATION_GEM_COST,
} from "@/utils/avatarStudio";

/**
 * The avatar allowance is stated twice — once in the browser, for the UI, and
 * once in `claim_avatar_generation`, which is what actually charges. They have
 * to agree or the screen says "this one is free" and a gem disappears.
 *
 * This is a mirror check like the price ones, but it guards something the
 * others do not: the cost of being wrong here is an AI bill, not game
 * inventory. `generate-avatar` used to check nothing at all — no quota, no
 * balance, no ceiling — and the entire payment lived in a browser line that
 * could simply be deleted.
 */
const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261104130000_avatar_generation_is_server_charged.sql"),
  "utf8",
);

const constant = (name: string): number => {
  const m = migration.match(new RegExp(`${name}\\s+constant integer\\s*:=\\s*(\\d+)`));
  if (!m) throw new Error(`${name} is not declared in the migration`);
  return Number(m[1]);
};

describe("the avatar allowance the server charges by", () => {
  it("matches the included allowance the UI promises", () => {
    expect(constant("v_free_allowance"), "free allowance").toBe(FREE_AVATAR_GENERATIONS);
    expect(constant("v_pro_allowance"), "PRO allowance").toBe(MAX_AVATAR_GENERATIONS);
  });

  it("charges what the UI says it will", () => {
    expect(constant("v_gem_cost")).toBe(EXTRA_GENERATION_GEM_COST);
  });

  it("caps the day regardless of what the caller claims", () => {
    // The one number that is not a mirror. `billable` decides the GEM charge
    // and is taken on trust — only the caller knows whether a person asked for
    // this portrait or the app derived it. The ceiling is what makes lying
    // about that bounded rather than free, so it must apply to every claim.
    const ceiling = constant("v_daily_ceiling");
    expect(ceiling).toBeGreaterThan(MAX_AVATAR_GENERATIONS);
    expect(ceiling).toBeLessThanOrEqual(50);

    const ceilingCheck = migration.indexOf("v_today >= v_daily_ceiling");
    const billableBranch = migration.indexOf("IF NOT p_billable");
    expect(ceilingCheck, "the ceiling check is missing").toBeGreaterThan(-1);
    expect(
      ceilingCheck,
      "the ceiling must be checked BEFORE the billable branch, or a caller claiming 'not billable' skips it",
    ).toBeLessThan(billableBranch);
  });

  it("revokes from anon and authenticated, not just PUBLIC", () => {
    // This assertion is the second version. The first checked for
    // `REVOKE ... FROM PUBLIC` and passed — while the function was in fact
    // callable by any signed-in user, which running the SQL then showed.
    //
    // Supabase's default privileges GRANT new functions to anon and
    // authenticated explicitly, and revoking the PUBLIC pseudo-role does not
    // touch an explicit grant. Naming PUBLIC alone is precisely the mistake,
    // so a test that accepts it asserts the bug.
    //
    // supabase/tests/08-money-not-anon.sql is the real check — it asks
    // Postgres rather than the file. This one keeps the migration honest at
    // the point somebody edits it.
    for (const fn of ["claim_avatar_generation", "refund_avatar_generation"]) {
      const revoke = migration.match(
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\)\\s*FROM ([^;]+);`),
      );
      expect(revoke, `${fn} is never revoked`).not.toBeNull();
      const roles = revoke![1];
      expect(roles, `${fn}: revoking PUBLIC alone leaves the default grant`).toMatch(/anon/);
      expect(roles, `${fn}: revoking PUBLIC alone leaves the default grant`).toMatch(/authenticated/);
    }

    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.(claim|refund)_avatar_generation[^;]*TO authenticated/,
    );
  });
});

describe("the client no longer charges for a generation", () => {
  const modal = readFileSync(
    join(process.cwd(), "src/components/home/AvatarModal.tsx"),
    "utf8",
  );

  it("does not call spendGems before generating", () => {
    // The whole bug, in one line. It counted the quota in the browser, decided
    // in the browser, and paid in the browser — and generate-avatar checked
    // none of it.
    expect(modal).not.toMatch(/await spendGems\(/);
  });

  it("still tells the person what the tap will cost", () => {
    // Moving the charge to the server must not make the UI go quiet about it.
    expect(modal).toMatch(/decideGeneration\(/);
    expect(modal).toMatch(/avatar\.paidWithGems/);
  });

  it("marks only a requested portrait as chargeable", () => {
    const portrait = readFileSync(join(process.cwd(), "src/utils/portraitAvatar.ts"), "utf8");
    // `avatar_` is derived from a scene and `heal_` repairs a broken one.
    // Neither was asked for; neither has ever cost a gem.
    expect(portrait).toMatch(/billable:\s*prefix === "portrait"/);
  });
});
