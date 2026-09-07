import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { installMemoryLocalStorage } from "@/test/memoryLocalStorage";
import { monthLabel } from "@/utils/currency";

// This module used to export a USD→GEL converter (`usdToGel`, `formatPrice`,
// `formatMonthlyPrice`, `getPriceDisplay`) built on a flat 2.75 rate, and this
// file tested every one of them — including that $9.99 renders as "27.47 ₾",
// a number nothing has ever charged. The converter is gone: prices come from
// src/config/pricing.ts on the web and from StoreKit on a device, and the only
// thing this module ever really supplied was the "/mo" suffix.
//
// What is left is a string a person reads next to a price, so it is still
// worth pinning — and so is the absence of the converter.

beforeEach(() => {
  installMemoryLocalStorage();
});

const setStoredLanguage = (lang: string) => localStorage.setItem("preferredLanguage", lang);

describe("monthLabel", () => {
  it("defaults to the English suffix when no language has been chosen", () => {
    expect(monthLabel()).toBe("/mo");
  });

  it("uses the Georgian form for Georgian", () => {
    setStoredLanguage("ka");
    expect(monthLabel()).toBe("/თვე");
  });

  it("uses the English abbreviation for every other language the app ships", () => {
    for (const lang of ["en", "de", "es", "fr", "it", "pt"]) {
      setStoredLanguage(lang);
      expect(monthLabel(), lang).toBe("/mo");
    }
  });

  it("takes no amount, so it cannot render one", () => {
    // The whole failure mode was a helper that accepted a USD figure and
    // returned it converted. A suffix has nothing to convert.
    expect(monthLabel.length).toBe(0);
  });
});

describe("the currency module", () => {
  const source = readFileSync(
    join(process.cwd(), "src/utils/currency.ts"),
    "utf8",
  );

  /** The file without its comments — the part that actually runs. */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("carries no exchange rate", () => {
    // 2.75 lari to the dollar is the constant that quoted 10.97 ₾ for a 9.99 ₾
    // subscription and 2.72 ₾ for a $0.99 gem pack. Reintroducing it here —
    // or any other hardcoded rate — puts a number on a paywall that no
    // checkout will honour (guideline 2.3.1).
    //
    // Matched against the stripped source, because the module's own docstring
    // names the rate to explain why it is gone, and that history stays.
    expect(
      code,
      "a conversion rate is back in currency.ts — prices belong in " +
        "src/config/pricing.ts, one real figure per currency",
    ).not.toMatch(/USD_TO_GEL|usdToGel|2\.75/);
  });

  it("exports nothing that formats an amount", () => {
    const exported = [...source.matchAll(/export function (\w+)/g)].map((m) => m[1]);
    expect(exported).toEqual(["monthLabel"]);
  });
});
