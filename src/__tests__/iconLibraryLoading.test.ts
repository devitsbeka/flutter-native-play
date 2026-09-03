import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Why every icon in the app was a blank square.
 *
 * DynamicIcon draws nothing until `useIconLibrary().isLoaded`. That flag used
 * to mean two things at once: the shipped catalogue in `public/data` had
 * arrived, AND a read of the whole `icon_library` table had come back. The
 * second is an overlay — icons uploaded since the file was generated — and
 * 69 of the 71 live categories do not need it, because their slug is in the
 * file. Putting it in front of the first paint bought nothing and cost a REST
 * round trip on every screen with a category on it.
 *
 * Worse, neither loader could fail twice. Both cached their promise at module
 * scope and neither cleared it on failure, so one dropped request — a phone
 * that lost signal for the second the page started — left every icon blank
 * for the life of the page. No retry, no error on screen, no way back except
 * a reload. That is what "icons not loading on discover" looked like.
 *
 * These pin the rules that came out of it. They are source assertions where
 * the behaviour lives inside a React hook, in the spirit of
 * repo-invariants.test.ts: the point is a failure that names the cause.
 */

const SOURCE = readFileSync(
  resolve(__dirname, "../hooks/useIconLibrary.ts"),
  "utf8",
);

describe("the icon catalogue does not gate the page on the network", () => {
  it("is ready as soon as the shipped file is in, database or no database", () => {
    const flag = SOURCE.match(/isLoaded:.*$/m)?.[0] ?? "";
    expect(flag, "isLoaded should be derived from the shipped index").toContain(
      "iconIndex.length > 0",
    );
    expect(
      flag,
      "isLoaded must not wait on the icon_library read — that is an overlay, " +
        "not the catalogue, and waiting on it blanks every icon in the app " +
        "for as long as the request takes",
    ).not.toContain("dbLoaded");
  });

  it("reads the shipped index before the database overlay", () => {
    // ~120 rows of the overlay are icons the shipped file already has, at the
    // same path with a `?t=<upload>` cache buster appended. Preferring the
    // overlay makes each of those resolve twice — once plain, then again at a
    // URL that differs only in its query string — which is a second download
    // of identical bytes and a visible blink on every icon.
    const body = SOURCE.slice(SOURCE.indexOf("const getIconBySlug"));
    const fn = body.slice(0, body.indexOf("}, [iconIndex, dbIcons]);"));
    expect(fn.indexOf("iconIndex.find")).toBeGreaterThan(-1);
    expect(fn.indexOf("dbIcons[slug]")).toBeGreaterThan(-1);
    expect(
      fn.indexOf("iconIndex.find"),
      "the shipped index has to answer first",
    ).toBeLessThan(fn.indexOf("dbIcons[slug]"));
  });

  it("forgets a failed database read instead of caching the failure", () => {
    const fn = SOURCE.slice(
      SOURCE.indexOf("async function loadDbIcons"),
      SOURCE.indexOf("export function refreshDbIconsCache"),
    );
    expect(fn, "a thrown fetch must not escape as a rejected cached promise")
      .toContain("catch");
    expect(
      fn,
      "clear dbIconsPromise on failure, or every later caller is handed the " +
        "same rejection forever",
    ).toContain("dbIconsPromise = null");
  });

  it("takes the newest rows, since PostgREST caps the response at 1000", () => {
    const fn = SOURCE.slice(
      SOURCE.indexOf("async function loadDbIcons"),
      SOURCE.indexOf("export function refreshDbIconsCache"),
    );
    // The table holds ~9000 rows. Unordered, the thousand that come back are
    // the oldest — precisely the ones the shipped file already carries — so
    // the overlay covered nothing it was added to cover.
    expect(fn).toContain("created_at");
    expect(fn).toContain("ascending: false");
  });
});

describe("loadIconIndex", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("answers empty on a failed fetch rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    vi.resetModules();
    const { loadIconIndex } = await import("@/hooks/useIconLibrary");
    await expect(loadIconIndex()).resolves.toEqual([]);
  });

  it("asks again after a failure instead of pinning an empty catalogue", async () => {
    const items = [{ slug: "chair", file_name: "chair.png", category: "x", tags: [], title: "Chair" }];
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true, json: async () => ({ items }) });
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { loadIconIndex } = await import("@/hooks/useIconLibrary");

    expect(await loadIconIndex()).toEqual([]);
    // The retry is the whole point: the second mount gets a real catalogue.
    expect(await loadIconIndex()).toEqual(items);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fetches the file the HTML preloads, at the same path", () => {
    const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
    const path = SOURCE.match(/ICON_LIBRARY_LOCAL_PATH = '([^']+)'/)?.[1];
    expect(path).toBeTruthy();
    // A preload for a URL nothing then requests is a wasted 1.3 MB, and a
    // request with no preload starts only once the route's JS has mounted.
    expect(html).toContain(`rel="preload" as="fetch" type="application/json" href="${path}"`);
  });
});
