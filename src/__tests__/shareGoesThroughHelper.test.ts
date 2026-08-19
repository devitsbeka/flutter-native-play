import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * navigator.share is not reliably there in the iOS webview, and
 * navigator.clipboard refuses to write once the tap's transient activation is
 * spent — the pairing that put a permanent "Share failed" toast on the room
 * lobby's share button on device. Sharing goes through shareOrCopy() in
 * src/utils/shareLink.ts, which uses the native share sheet on Capacitor and
 * has a WKWebView-safe copy fallback. Only the helper itself may touch the
 * raw API.
 */

const SRC = join(__dirname, "..");
const ALLOWED = join("utils", "shareLink.ts");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("share sheet access", () => {
  it("no file besides utils/shareLink.ts calls navigator.share", () => {
    const offenders = walk(SRC).filter(
      (p) => !p.endsWith(ALLOWED) && /navigator\.share\s*\(/.test(readFileSync(p, "utf8")),
    );
    expect(
      offenders,
      "call shareOrCopy() from @/utils/shareLink instead — navigator.share breaks in the iOS webview",
    ).toEqual([]);
  });
});
