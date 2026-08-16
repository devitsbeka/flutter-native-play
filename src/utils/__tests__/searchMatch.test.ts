import { describe, it, expect } from "vitest";
import { matchesQuery, searchKey } from "@/utils/searchMatch";

/**
 * Typing a Georgian name on a Latin keyboard has to find it.
 *
 * The rooms list matched with a plain `includes` on the raw strings, so a room
 * called "ზეიმის მოედანი" was reachable only by someone who had switched their
 * keyboard to Georgian — `zeimis moedani` and `ze` both returned nothing.
 */
describe("searchKey", () => {
  it("folds Georgian to its Latin spelling", () => {
    expect(searchKey("ზეიმის მოედანი")).toBe("zeimis moedani");
  });

  it("leaves Latin alone apart from the case", () => {
    expect(searchKey("Zeimis Moedani")).toBe("zeimis moedani");
    expect(searchKey("PARTY7")).toBe("party7");
  });

  it("handles a name in both scripts at once", () => {
    expect(searchKey("ზეიმი 2024")).toBe("zeimi 2024");
  });

  it("is empty for nothing", () => {
    expect(searchKey("")).toBe("");
    expect(searchKey(null)).toBe("");
    expect(searchKey(undefined)).toBe("");
  });
});

describe("matchesQuery", () => {
  const room = ["ზეიმის მოედანი", "ბუნება", "K7X2QA"];

  it("finds a Georgian name from its full Latin spelling", () => {
    expect(matchesQuery("zeimis moedani", room)).toBe(true);
  });

  it("finds it from the first word", () => {
    expect(matchesQuery("zeimis", room)).toBe(true);
  });

  it("finds it from two letters", () => {
    expect(matchesQuery("ze", room)).toBe(true);
  });

  it("still finds it when typed in Georgian", () => {
    expect(matchesQuery("ზეიმ", room)).toBe(true);
    expect(matchesQuery("ზეიმის მოედანი", room)).toBe(true);
  });

  it("searches every field, not just the first", () => {
    expect(matchesQuery("buneba", room)).toBe(true); // the category, in Latin
    expect(matchesQuery("ბუნება", room)).toBe(true);
    expect(matchesQuery("k7x2", room)).toBe(true); // the room code
  });

  it("does not match something unrelated", () => {
    expect(matchesQuery("kalaki", room)).toBe(false);
    expect(matchesQuery("zzz", room)).toBe(false);
    expect(matchesQuery("ქალაქი", room)).toBe(false);
  });

  it("matches everything when nothing is typed", () => {
    expect(matchesQuery("", room)).toBe(true);
    expect(matchesQuery("   ", room)).toBe(true);
  });

  it("ignores the case and surrounding space of the query", () => {
    expect(matchesQuery("  ZeImIs  ", room)).toBe(true);
  });

  it("skips empty fields rather than matching on them", () => {
    expect(matchesQuery("ze", [null, undefined, ""])).toBe(false);
  });

  it("is forgiving about letters that share a Latin spelling", () => {
    // თ and ტ both transliterate to "t", so someone who has only heard the
    // name still finds it. Same for ქ/კ.
    expect(matchesQuery("tbilisi", ["თბილისი"])).toBe(true);
    expect(matchesQuery("kartuli", ["ქართული"])).toBe(true);
  });

  it("finds a Latin name typed in Georgian", () => {
    expect(matchesQuery("პარტი", ["Parti Night"])).toBe(true);
  });
});
