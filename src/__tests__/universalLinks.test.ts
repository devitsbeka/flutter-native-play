import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Every path the app claims as a universal link has to be a route it can
 * render.
 *
 * The two halves live far apart — `public/.well-known/apple-app-site-association`
 * is what iOS reads to decide whether to open the app at all, and `App.tsx` is
 * what decides what appears once it does — so they drift silently and in both
 * directions:
 *
 *  - a path in the AASA with no route opens the app onto the 404 page, which
 *    looks worse than the link having done nothing;
 *  - a route missing from the AASA opens Safari instead of the app, which is
 *    how `/leaderboards` behaved when it was first wanted as an App Store
 *    In-App Event deep link.
 *
 * This checks the first direction for every advertised path, and pins the
 * handful of routes that exist specifically to be linked to.
 */

const REPO = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

const aasa = JSON.parse(read("public/.well-known/apple-app-site-association"));
const app = read("src/App.tsx");

/** The allow rules — the `NOT ` ones are exclusions, not destinations. */
const advertised: string[] = (aasa.applinks.details[0].paths as string[]).filter(
  (p) => !p.startsWith("NOT "),
);

/** `/play/*` advertises the `/play` family; the route may take parameters. */
const rootOf = (path: string) => path.replace(/\/\*$/, "").replace(/^\//, "");

describe("the universal links the app advertises", () => {
  it("advertises something at all", () => {
    expect(advertised.length).toBeGreaterThan(0);
  });

  it.each(advertised)("%s has a route that can render it", (path) => {
    const root = rootOf(path);
    // A route declaration beginning with this segment: `/play/:a/:b` answers
    // for `/play/*`, and `/join` answers for both `/join` and `/join/*`.
    const declared = new RegExp(`path="/${root}(/|"|:)`).test(app);

    expect(
      declared,
      `the AASA advertises "${path}" but App.tsx declares no route under ` +
        `"/${root}" — iOS would open the app straight onto the 404 page`
    ).toBe(true);
  });
});

describe("routes that exist to be linked to", () => {
  // `/leaderboards` is the App Store In-App Events deep link. Without it in
  // the AASA the link opens Safari, which defeats the entire point of an
  // event that is supposed to bring someone back into the app.
  it("keeps /leaderboards a universal link", () => {
    expect(
      advertised,
      "/leaderboards left the AASA — the In-App Events deep link would open " +
        "Safari instead of the app"
    ).toContain("/leaderboards");
  });

  it("keeps the legal pages OUT of the app", () => {
    // These are the URLs on the App Store listing. They must open in a
    // browser for someone who has never installed the app, so they are
    // excluded rather than advertised.
    const excluded: string[] = (aasa.applinks.details[0].paths as string[]).filter(
      (p) => p.startsWith("NOT "),
    );
    for (const prefix of ["NOT /privacy-policy*", "NOT /terms*"]) {
      expect(
        excluded,
        `${prefix} is gone: the App Store's privacy policy link would try to ` +
          "open the app instead of showing the page"
      ).toContain(prefix);
    }
  });
});
