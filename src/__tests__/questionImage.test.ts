import { describe, it, expect } from "vitest";
import { questionImageSrc } from "@/utils/questionImage";

/**
 * Question images must not be fetched from Wikimedia once per player.
 *
 * Measured against the live host: a burst of twenty flag images — roughly
 * what starting a quiz asks for — came back with three to fourteen 429s
 * depending on how recently the IP had asked. The User-Agent makes no
 * difference; whichever burst goes first succeeds and the next is throttled.
 *
 * On an image question the picture is the question, so a throttled image is
 * a question nobody can answer. They go through our own /img route, which
 * fetches once at the edge and caches for a year.
 */
describe("question images are fetched through our own edge", () => {
  const FLAG =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_Greece.svg/1280px-Flag_of_Greece.svg.png";

  it("sends Wikimedia images through the proxy", () => {
    const src = questionImageSrc(FLAG);
    expect(src).toBe(`/img?u=${encodeURIComponent(FLAG)}`);
  });

  it("encodes the target so a query string in it cannot leak out", () => {
    const withQuery = "https://upload.wikimedia.org/a.png?x=1&y=2";
    const src = questionImageSrc(withQuery)!;
    // Exactly one "?" — the one that starts our own query.
    expect(src.split("?").length - 1).toBe(1);
    expect(src).toContain(encodeURIComponent("?x=1&y=2"));
  });

  it("leaves images we already serve ourselves alone", () => {
    const own = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/robot.png";
    expect(questionImageSrc(own)).toBe(own);
  });

  it("does not rewrite a lookalike host", () => {
    const evil = "https://upload.wikimedia.org.evil.com/x.png";
    expect(questionImageSrc(evil)).toBe(evil);
  });

  it("passes through anything that is not a URL", () => {
    expect(questionImageSrc("/local/thing.png")).toBe("/local/thing.png");
  });

  it("has nothing to do for a question with no image", () => {
    expect(questionImageSrc(null)).toBeNull();
    expect(questionImageSrc(undefined)).toBeNull();
    expect(questionImageSrc("")).toBeNull();
  });
});
