import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

describe("the route that lets any of this run", () => {
  // Cloudflare answers a request whose path matches a file in ./dist from the
  // asset server BEFORE the Worker runs. Every /videos/*.mp4 is such a file,
  // so without run_worker_first the handler above is dead code and production
  // quietly goes back to 200-with-everything — which is exactly how the first
  // deploy of it shipped. Nothing else fails when this line is deleted; only
  // a phone does.
  it("wrangler.toml routes /videos/* through the worker first", () => {
    const wrangler = readFileSync(
      resolve(__dirname, "../../wrangler.toml"),
      "utf8",
    );
    const line = wrangler.match(/^run_worker_first\s*=\s*(.+)$/m);
    expect(
      line,
      "run_worker_first is gone from wrangler.toml — the assets server will " +
        "answer /videos/* before serveVideo runs, and iOS video playback " +
        "breaks with nothing red in CI",
    ).not.toBeNull();
    expect(line![1]).toContain('"/videos/*"');
  });

  // The SPA fallback is greedier than the /videos case: with
  // not_found_handling = "single-page-application" the asset server answers
  // every GET — a path with no file behind it gets index.html — so a route
  // the Worker handles only ever sees non-GET methods unless it is listed
  // here. /img served index.html instead of images; the client's preload
  // validation then dropped every Wikimedia-backed question, and the
  // picture-guess categories collapsed to one-or-two-question levels and a
  // false "you answered everything" screen. /room/* is the same failure for
  // invite link previews.
  it("wrangler.toml routes /img and /room/* through the worker first", () => {
    const wrangler = readFileSync(
      resolve(__dirname, "../../wrangler.toml"),
      "utf8",
    );
    const line = wrangler.match(/^run_worker_first\s*=\s*(.+)$/m);
    expect(
      line,
      "run_worker_first is gone from wrangler.toml — the SPA fallback will " +
        "answer /img with index.html, image preload validation will drop " +
        "every question, and picture-guess levels shrink to nothing with " +
        "nothing red in CI",
    ).not.toBeNull();
    expect(line![1]).toContain('"/img"');
    expect(line![1]).toContain('"/room/*"');
  });
});
