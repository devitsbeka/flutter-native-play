import { describe, it, expect } from "vitest";
import { PATHS, findPath, pathCategories, pathStats, startWithCategories, HOME_ROWS } from "../paths";
import { countdownTarget, formatCountdown, promoIsLive } from "../promo";
import { promotionLabel } from "../usePromotion";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { splitRich } from "../richText";
import { translations, LANGUAGES } from "@/locales";

/**
 * The V3 home's content is derived, not typed in: the paths cut the live
 * category list by `type`, the counters add its levels up, and the offer
 * strip's clock is computed from the calendar. This pins the cuts and the
 * arithmetic, and the one rule that keeps a card from appearing twice.
 */
const sample = [
  { id: "world_history", type: "classic" as const, totalLevels: 20 },
  { id: "geography", type: "classic" as const, totalLevels: 17 },
  { id: "movies", type: "fun" as const, totalLevels: 20 },
  { id: "guess_city", type: "fun" as const, totalLevels: 20 },
  { id: "guess_flag", type: "fun" as const, totalLevels: 17 },
  { id: "most_likely_to", type: "fun" as const, totalLevels: 3 },
  { id: "math", type: "educational" as const, totalLevels: 22 },
];

describe("paths", () => {
  it("cuts the list by type, with the picture categories on their own path", () => {
    const ids = (id: string) => pathCategories(findPath(id)!, sample).map((c) => c.id);
    expect(ids("classic")).toEqual(["world_history", "geography"]);
    expect(ids("fun")).toEqual(["movies"]);
    expect(ids("educational")).toEqual(["math"]);
    expect(ids("pictures")).toEqual(["guess_city", "guess_flag"]);
  });

  it("never puts a category on two paths, and leaves the party category off all of them", () => {
    const seen = new Map<string, string[]>();
    for (const p of PATHS) for (const c of pathCategories(p, sample)) seen.set(c.id, [...(seen.get(c.id) ?? []), p.id]);
    for (const [id, on] of seen) expect(on, id).toHaveLength(1);
    expect(seen.has("most_likely_to")).toBe(false);
  });

  it("adds the levels up", () => {
    expect(pathStats(findPath("classic")!, sample)).toEqual({ categories: 2, levels: 37 });
    expect(pathStats(findPath("pictures")!, sample)).toEqual({ categories: 2, levels: 37 });
  });

  it("leads the start-with band with the picture categories in list order", () => {
    expect(startWithCategories(sample).map((c) => c.id)).toEqual(["guess_city", "guess_flag"]);
  });

  it("names a path for every home row", () => {
    for (const row of HOME_ROWS) expect(findPath(row.path)).toBeDefined();
  });

  it("has every string each path needs, in every language", () => {
    for (const { code } of LANGUAGES) {
      const v3 = (translations[code] as unknown as { homeV3: Record<string, string> }).homeV3;
      for (const p of PATHS) {
        for (const part of ["tag", "title", "desc"]) expect(v3[`path_${p.id}_${part}`], `${code} ${p.id} ${part}`).toBeTruthy();
      }
      for (const row of HOME_ROWS) {
        expect(v3[`row_${row.id}_title`], `${code} ${row.id}`).toBeTruthy();
        expect(v3[`row_${row.id}_subtitle`], `${code} ${row.id}`).toBeTruthy();
      }
    }
  });
});

describe("the offer strip", () => {
  it("formats HH : MM : SS and never goes negative", () => {
    expect(formatCountdown(10 * 3600_000 + 53 * 60_000 + 37_000)).toBe("10 : 53 : 37");
    expect(formatCountdown(-5)).toBe("00 : 00 : 00");
  });

  it("counts to the end of the day, and to the offer's end on its last day", () => {
    const noon = new Date(2026, 8, 10, 12, 0, 0).getTime();
    expect(countdownTarget(noon, "2026-12-31T00:00:00Z")).toBe(new Date(2026, 8, 11).getTime());
    const lastDay = new Date(2026, 8, 30, 12, 0, 0);
    const end = new Date(2026, 8, 30, 20, 0, 0);
    expect(countdownTarget(lastDay.getTime(), end.toISOString())).toBe(end.getTime());
  });

  it("is over once the date has passed", () => {
    expect(promoIsLive(Date.parse("2026-09-01T00:00:00Z"), "2026-09-30T23:59:59+04:00")).toBe(true);
    expect(promoIsLive(Date.parse("2026-10-01T00:00:00Z"), "2026-09-30T23:59:59+04:00")).toBe(false);
  });

  it("labels itself in the player's language and falls back to English", () => {
    const promo = { id: "x", label: { en: "Autumn Offer", ka: "შემოდგომის შეთავაზება" }, endsAt: "2026-09-30T23:59:59+04:00" };
    expect(promotionLabel(promo, "ka")).toBe("შემოდგომის შეთავაზება");
    expect(promotionLabel(promo, "fr")).toBe("Autumn Offer");
  });

  it("keeps the promotions table in the generated Supabase types", () => {
    // The strip reads `public.promotions` (supabase/migrations/20260924120000_promotions.sql).
    // Regenerating types against a database without that migration would
    // silently drop the table and break usePromotion.ts — apply the
    // migration first, then regenerate. See CLAUDE.md rule 1.
    const types = readFileSync(resolve(process.cwd(), "src/integrations/supabase/types.ts"), "utf8");
    expect(/\bpromotions:\s*\{/.test(types)).toBe(true);
  });

  it("seeds the migration with a label in every language", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260924120000_promotions.sql"), "utf8");
    for (const { code } of LANGUAGES) expect(sql, code).toMatch(new RegExp(`"${code}": "`));
  });
});

describe("rich text", () => {
  it("splits **bold** runs out of a sentence", () => {
    expect(splitRich("Rival **dynasties** turn a **century**.")).toEqual([
      { text: "Rival ", bold: false },
      { text: "dynasties", bold: true },
      { text: " turn a ", bold: false },
      { text: "century", bold: true },
      { text: ".", bold: false },
    ]);
    expect(splitRich("plain")).toEqual([{ text: "plain", bold: false }]);
  });

  it("keeps every path description's bold runs balanced in every language", () => {
    for (const { code } of LANGUAGES) {
      const v3 = (translations[code] as unknown as { homeV3: Record<string, string> }).homeV3;
      for (const p of PATHS) {
        const desc = v3[`path_${p.id}_desc`];
        expect((desc.match(/\*\*/g) ?? []).length % 2, `${code} ${p.id}`).toBe(0);
        expect(splitRich(desc).some((part) => part.bold), `${code} ${p.id}`).toBe(true);
      }
    }
  });
});
