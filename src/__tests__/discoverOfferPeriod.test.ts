/**
 * The Discover cover quotes the plan it opens on — the year — so the word
 * after the price has to be "year".
 *
 * It said "/ month" for a while: the locale string carried the period as a
 * fixed word while the price came from the annual plan, so the cover read
 * "$23.88 / month" for a subscription that charges $23.88 a year. That is
 * a wrong price on the first screen a reviewer sees the offer on, which is
 * exactly what guideline 2.3.1 / 3.1.2 rejections are made of.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRO_PLANS, periodKeyFor } from "@/config/proPlans";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the period comes from the plan, not the sentence", () => {
  it("every locale leaves the period to be filled in", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["promoNote", "promoNoteTrial"]) {
        const m = src.match(new RegExp(`\\n\\s+${key}: "([^"]*)",`));
        expect(m, `${lang}.discover.${key}`).not.toBeNull();
        expect(m![1], `${lang}.discover.${key}`).toContain("{price} / {period}");
      }
    }
  });

  it("and the cover fills it from the same helper as the paywall footnote", () => {
    const discover = read("src/pages/Discover.tsx");
    expect(discover).toMatch(/\.replace\("\{period\}", t\(periodKeyFor\(plan\)\)\)/);
    const paywall = read("src/components/pro/ProPaywallModal.tsx");
    expect(paywall).toMatch(/periodKeyFor/);
    expect(paywall).not.toMatch(/function periodKeyFor/);
  });

  it("and the button only says free when the store grants free days", () => {
    // Same rule as the paywall's ctaTrial/ctaSubscribe: "Try for free" over a
    // product with no introductory offer is a promise the store will not keep.
    // The label the OTHER way changed — the button used to read "Get PRO"
    // (paywall.ctaSubscribe) with the price relegated to a line underneath,
    // and now names the price on its face via shop.buyFor — but the branch
    // this guards is the same one: free is spoken only when free is granted.
    const discover = read("src/pages/Discover.tsx");
    expect(discover).toMatch(/offer\.hasTrial\s*\n?\s*\? t\("discover\.promoCtaTrialDays"\)/);
    expect(discover).toMatch(/: t\("shop\.buyFor"\)\.replace\("\{price\}", offer\.priceLine\)/);
    expect(discover).toMatch(/hasTrial: Boolean\(trialDays\)/);
  });

  it("the trial button names the length the store granted, in every locale", () => {
    // Same shape as promoNote/promoNoteTrial: the number is filled in from
    // the product, never written into the sentence — a locale that hard-codes
    // "3 days" keeps saying three when the offer changes to seven.
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      const m = src.match(/\n\s+promoCtaTrialDays: "([^"]*)",/);
      expect(m, `${lang}.discover.promoCtaTrialDays`).not.toBeNull();
      expect(m![1], `${lang}.discover.promoCtaTrialDays`).toContain("{days}");
    }
    const discover = read("src/pages/Discover.tsx");
    expect(discover).toMatch(/\.replace\("\{days\}", String\(offer\.trialDays\)\)/);
  });

  it("and that price on the button is the plan's own, with its period", () => {
    // The face must not invent a figure: priceLine is built from the same
    // resolved store price and the same periodKeyFor helper as the note.
    const discover = read("src/pages/Discover.tsx");
    expect(discover).toMatch(/const priceLine = `\$\{price\} \/ \$\{t\(periodKeyFor\(plan\)\)\}`/);
  });

  it("the year says year and the months say month", () => {
    const annual = PRO_PLANS.find((p) => p.id === "annual")!;
    expect(periodKeyFor(annual)).toBe("paywall.period_annual");
    for (const plan of PRO_PLANS.filter((p) => p.months === 1)) {
      expect(periodKeyFor(plan)).toBe("paywall.period_monthly");
    }
  });
});
