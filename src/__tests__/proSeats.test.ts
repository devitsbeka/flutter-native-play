import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Who has seats to give, held to one answer.
 *
 * PRO is one seat, Friends PRO is five. That rule is written in three places
 * by necessity — the allowance function, the panel that draws the seats, and
 * the benefit line on each tier card — and a screen that promises a friend
 * the database will refuse is the exact failure this app keeps producing.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const ALLOWANCE_SQL = read("supabase/migrations/20260815090000_pro_seats.sql");
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

/** The SEATS_BY_TIER map the panel uses to decide what to draw. */
function uiAllowance(): Record<string, number> {
  const start = SECTION.indexOf("const SEATS_BY_TIER");
  const block = SECTION.slice(start, SECTION.indexOf("}", start));
  const out: Record<string, number> = {};
  for (const m of block.matchAll(/(\w+):\s*(\d+)/g)) out[m[1]] = Number(m[2]);
  return out;
}

describe("who has seats to give", () => {
  it("gives PRO one and Friends PRO five", () => {
    const sql = sqlAllowance();
    expect(sql.pro).toBe(1);
    expect(sql.standard).toBe(1);
    expect(sql.pro_plus).toBe(5);
    expect(sql.pro_master).toBe(5);
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

  it("promises on each card the number of friends that tier can carry", () => {
    // The tier cards are what a player reads before paying, and the App Store
    // descriptions are written from the same promise.
    expect(EN.match(/mobileSoloBenefit2: "([^"]*)"/)?.[1]).toMatch(/1 friend/);
    expect(EN.match(/mobileFamilyBenefit2: "([^"]*)"/)?.[1]).toMatch(/5 friends/);
    expect(KA.match(/mobileSoloBenefit2: "([^"]*)"/)?.[1]).toMatch(/1 მეგობარ/);
    expect(KA.match(/mobileFamilyBenefit2: "([^"]*)"/)?.[1]).toMatch(/5 მეგობარ/);
  });

  it("says what a seat is before offering to spend one", () => {
    // "0 of 1 seats used" names a quantity without saying what it does. Both
    // languages carry the explanation, and the panel renders it.
    expect(SECTION).toContain('t("extra.proSeatsHow")');
    for (const [name, file] of [["en", EN], ["ka", KA]] as const) {
      const how = file.match(/proSeatsHow: "([^"]*)"/)?.[1] ?? "";
      expect(how.length, `${name} has no proSeatsHow`).toBeGreaterThan(30);
    }
  });
});
