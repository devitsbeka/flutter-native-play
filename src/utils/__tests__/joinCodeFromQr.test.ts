import { describe, it, expect } from "vitest";
import { joinCodeFromQr } from "../joinCodeFromQr";

/**
 * The scanner's decode callback fires about fifteen times a second on whatever
 * is in front of the camera, so this runs against arbitrary strings from the
 * world. It has to be sure about what it accepts.
 */

describe("joinCodeFromQr", () => {
  it("reads the three shapes the app itself produces", () => {
    expect(joinCodeFromQr("https://mytrivia.io/join?code=ABC123")).toBe("ABC123");
    expect(joinCodeFromQr("https://mytrivia.io/join/ABC123")).toBe("ABC123");
    expect(joinCodeFromQr("ABC123")).toBe("ABC123");
  });

  it("normalises case and surrounding whitespace", () => {
    expect(joinCodeFromQr("  abc123  ")).toBe("ABC123");
    expect(joinCodeFromQr("https://mytrivia.io/join?code=abc123")).toBe("ABC123");
  });

  it("refuses anything that is not a code", () => {
    for (const text of [
      "",
      "   ",
      "https://example.com",
      "https://mytrivia.io/profile",
      "hello world",
      "WWW.SOMESHOP.COM/PROMO",
    ]) {
      expect(joinCodeFromQr(text), text).toBeNull();
    }
  });

  it("refuses a code-shaped string of the wrong length", () => {
    // 4 to 8, which is what the room codes are.
    expect(joinCodeFromQr("ABC")).toBeNull();
    expect(joinCodeFromQr("ABCD")).toBe("ABCD");
    expect(joinCodeFromQr("ABCDEFGH")).toBe("ABCDEFGH");
    expect(joinCodeFromQr("ABCDEFGHI")).toBeNull();
  });

  it("refuses a /join URL whose code is junk rather than passing it on", () => {
    // The old parser handed url.searchParams.get("code") straight to
    // navigate() without checking its shape, so a crafted link could put
    // anything in the query string of the page it sent you to.
    expect(joinCodeFromQr("https://mytrivia.io/join?code=../../admin")).toBeNull();
    expect(joinCodeFromQr("https://mytrivia.io/join?code=")).toBeNull();
    expect(joinCodeFromQr("https://mytrivia.io/join")).toBeNull();
  });

  it("does not throw on a string that only looks like a URL", () => {
    expect(() => joinCodeFromQr("/join/ABC123")).not.toThrow();
    expect(joinCodeFromQr("not a url but /join is in it")).toBeNull();
  });
});
