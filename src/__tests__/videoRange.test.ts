import { describe, it, expect } from "vitest";
import { parseRange } from "../../worker/range";

/**
 * The range parser behind /videos/*.
 *
 * iOS refuses to play streamed video from a host that mishandles byte
 * ranges — AVFoundation opens every stream with a range probe expecting a
 * 206, and the assets binding answers 200-with-everything (measured against
 * production; see the final-pass audit, finding F-1). The worker slices
 * ranges itself, and this is the arithmetic that decides what a player's
 * range probe gets back.
 */
describe("parseRange", () => {
  const SIZE = 1000;

  it("parses the probe AVFoundation opens with", () => {
    expect(parseRange("bytes=0-1", SIZE)).toEqual([0, 1]);
  });

  it("parses an open-ended tail request", () => {
    expect(parseRange("bytes=200-", SIZE)).toEqual([200, 999]);
  });

  it("parses a suffix request", () => {
    expect(parseRange("bytes=-100", SIZE)).toEqual([900, 999]);
  });

  it("clamps an end past the file to the file", () => {
    expect(parseRange("bytes=0-999999", SIZE)).toEqual([0, 999]);
  });

  it("clamps a suffix longer than the file to the whole file", () => {
    expect(parseRange("bytes=-5000", SIZE)).toEqual([0, 999]);
  });

  it("rejects a start beyond the file (the 416 case)", () => {
    expect(parseRange("bytes=1000-", SIZE)).toBeNull();
    expect(parseRange("bytes=1500-1600", SIZE)).toBeNull();
  });

  it("rejects an inverted range", () => {
    expect(parseRange("bytes=500-100", SIZE)).toBeNull();
  });

  it("rejects what it cannot parse, so the caller falls back to a full 200", () => {
    expect(parseRange("bytes=", SIZE)).toBeNull();
    expect(parseRange("bytes=abc-def", SIZE)).toBeNull();
    expect(parseRange("items=0-1", SIZE)).toBeNull();
    // Multi-range: spec-legal, deliberately unsupported — full 200 instead.
    expect(parseRange("bytes=0-1,5-9", SIZE)).toBeNull();
    expect(parseRange("bytes=-0", SIZE)).toBeNull();
  });
});
