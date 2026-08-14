import { describe, it, expect } from "vitest";
import { languageForCountry, languageToApply } from "@/utils/countryLanguage";

describe("which language a country gets", () => {
  it("maps the countries the app ships a translation for", () => {
    expect(languageForCountry("GE")).toBe("ka");
    expect(languageForCountry("US")).toBe("en");
    expect(languageForCountry("DE")).toBe("de");
    expect(languageForCountry("BR")).toBe("pt");
  });

  it("does not care about case", () => {
    // The profile stores "GE"; the country table is keyed lower-case.
    expect(languageForCountry("ge")).toBe(languageForCountry("GE"));
  });

  it("falls back to English for a country with no translation", () => {
    expect(languageForCountry("JP")).toBe("en");
    expect(languageForCountry(null)).toBe("en");
  });
});

describe("keeping the language on the account's country", () => {
  it("switches when the two have drifted apart", () => {
    // The reported state: profile says Georgia, app is in English.
    expect(languageToApply({ override: null, countryCode: "GE", current: "en" })).toBe("ka");
    expect(languageToApply({ override: null, countryCode: "US", current: "ka" })).toBe("en");
  });

  it("does nothing when they already agree", () => {
    // Returning a language here would re-render every consumer on each pass.
    expect(languageToApply({ override: null, countryCode: "GE", current: "ka" })).toBeNull();
    expect(languageToApply({ override: null, countryCode: "US", current: "en" })).toBeNull();
  });

  it("waits while the country is still unknown", () => {
    // Null until the profile loads and IP detection has had its say. Treating
    // that as "no country" would flip everyone to English on every cold start.
    expect(languageToApply({ override: null, countryCode: null, current: "ka" })).toBeNull();
    expect(languageToApply({ override: null, countryCode: undefined, current: "ka" })).toBeNull();
  });

  it("leaves ?lang= alone", () => {
    // The only way to read the app in a language your account is not set to.
    expect(languageToApply({ override: "fr", countryCode: "GE", current: "fr" })).toBeNull();
    expect(languageToApply({ override: "en", countryCode: "GE", current: "en" })).toBeNull();
  });

  it("settles in one step", () => {
    // Whatever it returns must be a fixed point, or the effect that applies
    // it and then re-runs on the new language would never stop.
    for (const country of ["GE", "US", "DE", "FR", "JP"]) {
      const first = languageToApply({ override: null, countryCode: country, current: "ka" });
      const settled = first ?? "ka";
      expect(languageToApply({ override: null, countryCode: country, current: settled })).toBeNull();
    }
  });
});
