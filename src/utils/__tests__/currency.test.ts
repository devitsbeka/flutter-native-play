import { describe, it, expect, beforeEach } from "vitest";
import { installMemoryLocalStorage } from "@/test/memoryLocalStorage";
import {
  formatMonthlyPrice,
  formatPrice,
  getPriceDisplay,
  shouldShowGel,
  usdToGel,
} from "@/utils/currency";

// These strings are what a person reads before deciding to pay. A wrong
// number here is not a rendering bug, it is a wrong price.

const RATE = 2.75;

beforeEach(() => {
  installMemoryLocalStorage();
});

const useLanguage = (lang: string) => localStorage.setItem("preferredLanguage", lang);

describe("shouldShowGel", () => {
  it("defaults to GEL when no language has been chosen", () => {
    // Georgian is the primary market; an unset preference must not
    // silently price the whole app in dollars.
    expect(shouldShowGel()).toBe(true);
  });

  it("shows GEL for Georgian", () => {
    useLanguage("ka");
    expect(shouldShowGel()).toBe(true);
  });

  it("shows USD for every other language", () => {
    for (const lang of ["en", "ru", "de"]) {
      useLanguage(lang);
      expect(shouldShowGel(), lang).toBe(false);
    }
  });
});

describe("usdToGel", () => {
  it("converts at the configured rate", () => {
    expect(usdToGel(1)).toBe(RATE);
    expect(usdToGel(10)).toBe(27.5);
  });

  it("rounds to whole tetri, never fractions of a coin", () => {
    expect(usdToGel(9.99)).toBe(27.47);
    const converted = usdToGel(3.33);
    expect(Number.isInteger(Math.round(converted * 100))).toBe(true);
    expect(converted.toString()).toBe(converted.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));
  });

  it("converts zero to zero", () => {
    expect(usdToGel(0)).toBe(0);
  });

  it("is monotonic — a dearer item is never cheaper in GEL", () => {
    let previous = -1;
    for (const usd of [0, 0.99, 1, 4.99, 9.99, 24.99, 99.99]) {
      const gel = usdToGel(usd);
      expect(gel, `$${usd}`).toBeGreaterThan(previous);
      previous = gel;
    }
  });
});

describe("formatPrice", () => {
  it("renders GEL with the lari sign", () => {
    useLanguage("ka");
    expect(formatPrice(9.99)).toBe("27.47 ₾");
  });

  it("renders USD with a dollar sign", () => {
    useLanguage("en");
    expect(formatPrice(9.99)).toBe("$9.99");
  });

  it("drops a trailing .00 in both currencies", () => {
    useLanguage("en");
    expect(formatPrice(10)).toBe("$10");
    useLanguage("ka");
    expect(formatPrice(4)).toBe("11 ₾"); // 4 × 2.75 = 11.00
  });

  it("keeps genuine decimals rather than truncating them", () => {
    useLanguage("ka");
    expect(formatPrice(10)).toBe("27.50 ₾"); // not "27.5"
    useLanguage("en");
    expect(formatPrice(4.5)).toBe("$4.50");
  });

  it("always shows a currency marker", () => {
    for (const lang of ["ka", "en"]) {
      useLanguage(lang);
      for (const usd of [0, 1, 9.99, 100]) {
        expect(formatPrice(usd), `${lang} $${usd}`).toMatch(/[$₾]/);
      }
    }
  });

  it("never renders NaN or undefined into a price", () => {
    for (const lang of ["ka", "en"]) {
      useLanguage(lang);
      for (const usd of [0, 0.01, 999.99]) {
        expect(formatPrice(usd)).not.toMatch(/NaN|undefined/);
      }
    }
  });
});

describe("formatMonthlyPrice", () => {
  it("appends a localised per-month suffix", () => {
    useLanguage("ka");
    expect(formatMonthlyPrice(9.99)).toBe("27.47 ₾/თვე");
    useLanguage("en");
    expect(formatMonthlyPrice(9.99)).toBe("$9.99/mo");
  });

  it("honours an explicit label in either currency", () => {
    useLanguage("ka");
    expect(formatMonthlyPrice(4, " / კვირა")).toBe("11.00 ₾ / კვირა");
    useLanguage("en");
    expect(formatMonthlyPrice(4, "/wk")).toBe("$4.00/wk");
  });

  it("keeps two decimals, unlike formatPrice", () => {
    useLanguage("en");
    expect(formatMonthlyPrice(10)).toBe("$10.00/mo");
  });
});

describe("getPriceDisplay", () => {
  it("splits the GEL price into value and trailing symbol", () => {
    useLanguage("ka");
    expect(getPriceDisplay(9.99)).toEqual({
      value: "27.47",
      symbol: "",
      suffix: " ₾",
      monthLabel: "/თვე",
    });
  });

  it("splits the USD price into leading symbol and value", () => {
    useLanguage("en");
    expect(getPriceDisplay(9.99)).toEqual({
      value: "9.99",
      symbol: "$",
      suffix: "",
      monthLabel: "/mo",
    });
  });

  it("reassembles into the same number formatPrice shows", () => {
    for (const lang of ["ka", "en"]) {
      useLanguage(lang);
      for (const usd of [1, 4.99, 9.99]) {
        const parts = getPriceDisplay(usd);
        const assembled = `${parts.symbol}${parts.value}${parts.suffix}`;
        // formatPrice trims a trailing .00; compare the numeric part only.
        const numeric = (s: string) => parseFloat(s.replace(/[^\d.]/g, ""));
        expect(numeric(assembled), `${lang} $${usd}`).toBeCloseTo(numeric(formatPrice(usd)), 2);
      }
    }
  });
});
