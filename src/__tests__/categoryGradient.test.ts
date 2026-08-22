import { describe, expect, it } from "vitest";
import { categoryGradient } from "@/utils/categoryGradient";

/**
 * `categories.color` holds a Tailwind class fragment, not a colour, and the
 * cards used to interpolate it straight into linear-gradient(). That produces
 * a declaration the browser rejects outright — so the element painted nothing
 * and its white label and white buttons sat on the page background, invisible.
 * A silently-dropped CSS declaration is invisible in review too, hence these.
 */

/** Every stop the browser will actually accept. */
const CSS_COLOR = /#[0-9a-f]{3,8}|rgba?\(|hsla?\(|var\(/i;

function stopsOf(gradient: string): string[] {
  const inner = gradient.replace(/^linear-gradient\(/, "").replace(/\)$/, "");
  return inner.split(",").slice(1).map((s) => s.trim());
}

describe("categoryGradient", () => {
  it("turns a Tailwind class fragment into real colour stops", () => {
    const css = categoryGradient("from-yellow-300 to-amber-400");
    expect(css).toBe("linear-gradient(135deg, #fde047, #fbbf24)");
  });

  it("never leaks a class name into the CSS", () => {
    // The exact shape that broke: the class survived into the declaration.
    for (const color of [
      "from-yellow-300 to-amber-400",
      "from-violet-300 to-purple-400",
      "from-pink-300 to-rose-400",
      "bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600",
    ]) {
      const css = categoryGradient(color);
      expect(css, `class fragment left in: ${css}`).not.toMatch(/from-|via-|to-[a-z]/);
      for (const stop of stopsOf(css)) {
        expect(stop, `not a colour the browser accepts: ${stop}`).toMatch(CSS_COLOR);
      }
    }
  });

  it("falls back rather than emitting an unpaintable gradient", () => {
    for (const color of [null, undefined, "", "from-notacolor-999"]) {
      for (const stop of stopsOf(categoryGradient(color))) {
        expect(stop, `unusable stop from ${JSON.stringify(color)}`).toMatch(CSS_COLOR);
      }
    }
  });

  it("passes through a value that is already a colour", () => {
    expect(categoryGradient("#6366f1")).toBe("linear-gradient(135deg, #6366f1, #6366f1)");
  });

  it("honours a caller's angle", () => {
    expect(categoryGradient("from-red-500 to-red-600", "to bottom")).toBe(
      "linear-gradient(to bottom, #ef4444, #dc2626)",
    );
  });

  it("covers every colour the categories table actually stores", () => {
    // The 53 shades in use as of the national-categories rollout. A new
    // category whose shade is missing here degrades to the fallback, which is
    // ugly but paints — the point is that none of these silently do.
    const inUse = [
      "amber-400", "amber-500", "blue-400", "blue-500", "cyan-400", "cyan-500", "cyan-600",
      "emerald-300", "emerald-400", "emerald-500", "emerald-600", "fuchsia-400", "fuchsia-500",
      "gray-500", "green-400", "green-500", "indigo-400", "indigo-500", "indigo-600",
      "lime-400", "lime-500", "neutral-500", "orange-300", "orange-400", "orange-500",
      "pink-300", "pink-400", "pink-500", "purple-400", "purple-500", "red-400", "red-500",
      "red-600", "rose-400", "rose-500", "rose-600", "sky-300", "slate-400", "slate-500",
      "stone-400", "stone-600", "teal-400", "teal-500", "teal-600", "violet-300", "violet-400",
      "violet-500", "violet-600", "yellow-300", "yellow-400", "yellow-600", "zinc-400", "zinc-500",
    ];
    const fallback = categoryGradient("from-definitely-000 to-nonsense-000");
    for (const shade of inUse) {
      expect(
        categoryGradient(`from-${shade} to-${shade}`),
        `${shade} is not mapped — it would paint the fallback`,
      ).not.toBe(fallback);
    }
  });
});
