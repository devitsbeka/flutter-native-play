import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Who gets seats, held to one answer.
 *
 * Solo PRO is one subscription for one player; Friends PRO carries the five
 * seats and is the reason it costs more. That rule is written in three places
 * by necessity — the allowance function, the panel that draws the seats, and
 * the benefit line on each tier card — and a screen that promises a friend the
 * database will refuse is the exact failure this app keeps producing.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const ALLOWANCE_SQL = read("supabase/migrations/20260815120000_solo_pro_has_no_seats.sql");
const SECTION = read("src/components/profile/ProSeatsSection.tsx");
const EN = read("src/locales/en.ts");
const KA = read("src/locales/ka.ts");

/** The CASE arms of pro_seat_allowance, as {tier: seats}. */
function sqlAllowance(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of ALLOWANCE_SQL.matchAll(/WHEN p_tier IN \(([^)]*)\) THEN (\d+)/g)) {
    for (const tier of m[1].split(",")) {
      out[tier.trim().replace(/'/g, "")] = Number(m[2]);
    }
  }
  return out;
}

/** The SEATS_BY_TIER map the panel uses to decide whether to render. */
function uiAllowance(): Record<string, number> {
  const block = SECTION.slice(
    SECTION.indexOf("const SEATS_BY_TIER"),
    SECTION.indexOf("}", SECTION.indexOf("const SEATS_BY_TIER")),
  );
  const out: Record<string, number> = {};
  for (const m of block.matchAll(/(\w+):\s*(\d+)/g)) out[m[1]] = Number(m[2]);
  return out;
}

describe("who has seats to give", () => {
  it("gives Friends PRO five", () => {
    expect(sqlAllowance().pro_plus).toBe(5);
    expect(sqlAllowance().pro_master).toBe(5);
  });

  it("gives solo PRO none", () => {
    // Named tiers only reach the CASE arms above; everything else falls to
    // ELSE 0, which is where 'pro' and 'standard' now land.
    expect(sqlAllowance().pro).toBeUndefined();
    expect(sqlAllowance().standard).toBeUndefined();
    expect(ALLOWANCE_SQL).toMatch(/ELSE 0/);
  });

  it("draws the panel for exactly the tiers the database pays out for", () => {
    // A panel offering a seat the database refuses is the promise-then-fail
    // shape; a panel missing for a tier that has seats is a benefit nobody
    // can find.
    expect(uiAllowance()).toEqual(sqlAllowance());
  });

  it("keeps a seat-granted subscription from conferring seats of its own", () => {
    // Otherwise one purchase chains: a seat carries tier 'pro', and reading
    // the tier alone would hand its holder an allowance to pass on.
    expect(ALLOWANCE_SQL).toMatch(/WHEN p_platform = 'seat' THEN 0/);
    expect(SECTION).toContain('purchase_platform === "seat"');
  });

  it("promises friends only on the tier that has them", () => {
    // The tier cards are what a player reads before paying, and the store
    // descriptions are generated from the same promise.
    const soloEn = EN.match(/mobileSoloBenefit2: "([^"]*)"/)?.[1] ?? "";
    const familyEn = EN.match(/mobileFamilyBenefit2: "([^"]*)"/)?.[1] ?? "";
    expect(soloEn).not.toMatch(/friend/i);
    expect(familyEn).toMatch(/5 friends/);

    const soloKa = KA.match(/mobileSoloBenefit2: "([^"]*)"/)?.[1] ?? "";
    const familyKa = KA.match(/mobileFamilyBenefit2: "([^"]*)"/)?.[1] ?? "";
    expect(soloKa).not.toMatch(/მეგობარ/);
    expect(familyKa).toMatch(/5 მეგობარ/);
  });
});
