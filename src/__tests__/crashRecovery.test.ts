/**
 * Before "Something went wrong": a stale build reloads itself before React
 * ever throws, once per incident rather than once per session, and a real
 * crash gets one silent retry of the render before the screen (owner: "when
 * i see this screen? why we can't reload to not show this screen, check
 * it"). The screen is what is left: a deterministic crash, reported twice.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isStaleChunkError, CHUNK_RELOAD_KEY } from "@/utils/crashRecovery";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const main = read("src/main.tsx");
const boundary = read("src/components/shared/AppErrorBoundary.tsx");

describe("a stale build", () => {
  it("is recognised by every shape the browsers give it, and nothing else", () => {
    for (const message of [
      "Failed to fetch dynamically imported module: https://x/assets/Foo-abc123.js",
      "Loading chunk 12 failed",
      "Loading CSS chunk 12 failed",
      "Importing a module script failed.",
      "Unable to preload CSS for /assets/foo.css",
    ]) {
      expect(isStaleChunkError(new Error(message)), message).toBe(true);
    }
    expect(isStaleChunkError({ name: "ChunkLoadError", message: "" })).toBe(true);
    expect(isStaleChunkError(new TypeError("Cannot read properties of null (reading 'id')"))).toBe(false);
    expect(isStaleChunkError(null)).toBe(false);
    expect(isStaleChunkError("string")).toBe(false);
  });

  it("reloads from main before React sees it, and the guard is per incident", () => {
    expect(main).toMatch(/installPreloadErrorReload\(\);\s*\n\s*setTimeout\(markAppHealthy, HEALTHY_AFTER_MS\);/);
    const util = read("src/utils/crashRecovery.ts");
    expect(util).toMatch(/window\.addEventListener\("vite:preloadError", \(event\) => \{\s*\n\s*if \(reloadOnceForStaleBuild\(\)\) event\.preventDefault\(\);/);
    expect(util).toMatch(/if \(sessionStorage\.getItem\(CHUNK_RELOAD_KEY\)\) return false;\s*\n\s*sessionStorage\.setItem\(CHUNK_RELOAD_KEY, "1"\);/);
    expect(CHUNK_RELOAD_KEY).toBe("mytrivia_chunk_reload");
  });
});

describe("a real crash", () => {
  it("gets one silent retry, reported both times, and only then the screen", () => {
    expect(boundary).toMatch(/private retried = false;/);
    expect(boundary).toMatch(/const stale = isStaleChunkError\(error\);\s*\n\s*if \(stale && reloadOnceForStaleBuild\(\)\) return;/);
    expect(boundary).toMatch(/retried: this\.retried,/);
    expect(boundary).toMatch(/if \(!stale && !this\.retried\) \{\s*\n\s*this\.retried = true;\s*\n\s*this\.setState\(\{ hasError: false, error: null \}\);\s*\n\s*\}/);
    // The buttons clear the guard, so a tap always gets a fresh reload.
    expect(boundary).toMatch(/handleReload = \(\) => \{\s*\n\s*markAppHealthy\(\);\s*\n\s*window\.location\.reload\(\);/);
    expect(boundary).not.toMatch(/sessionStorage/);
  });
});
