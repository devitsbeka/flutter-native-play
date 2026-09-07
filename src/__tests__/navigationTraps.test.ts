/**
 * Three ways the app could refuse to let go of a player.
 *
 * Found while sweeping for the shape of the Stripe back-button trap: a screen
 * that pushes a destination in an effect and then re-pushes it every time you
 * come back, and a guard that reloads the page on a condition its own reload
 * cannot clear.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("signing in does not become a wall", () => {
  const auth = read("src/pages/Auth.tsx");

  it("the redirect replaces rather than pushes", () => {
    // The effect fires whenever there is a user, so a PUSHED destination
    // leaves /auth underneath it: Back re-mounts this screen, the user is
    // still there, and it pushes again. You cannot get past the screen you
    // signed in on.
    expect(auth).toMatch(/navigate\(target, \{ replace: true \}\);/);
    expect(auth).not.toMatch(/navigate\(decodeURIComponent\(returnTo\)\);/);
    expect(auth).not.toMatch(/\n\s*navigate\("\/"\);/);
  });
});

describe("the fresh-build guard reloads once, not forever", () => {
  const guard = read("src/hooks/useFreshBuildGuard.ts");

  it("an attempt is recorded where it outlives the reload it guards", () => {
    // Module state dies with the page — the record has to survive the very
    // reload it is meant to limit.
    expect(guard).toMatch(/const ATTEMPT_KEY = "mytrivia:freshbuild-attempt";/);
    expect(guard).toMatch(/sessionStorage\.setItem\(ATTEMPT_KEY, id\);/);
    expect(guard).toMatch(/if \(sessionStorage\.getItem\(ATTEMPT_KEY\) === id\) \{/);
  });

  it("and every reload path goes through it", () => {
    // Three of them: the interval/visibility check by build id, the same by
    // bundle name, and the one on navigation. A stale service worker or CDN
    // edge keeps the served id ahead of the running one whatever we do, and
    // the check runs every 45 seconds and on every return to the app.
    expect(guard.match(/reloadForBuild\(/g) ?? []).toHaveLength(4);
    const automatic = guard.slice(guard.indexOf("async function checkAndMaybeReload"));
    expect(automatic).not.toMatch(/window\.location\.reload\(\)/);
  });

  it("a person can still insist, and success forgets the attempt", () => {
    expect(guard).toMatch(/clearReloadAttempt\(\);\s*\n\s*window\.location\.reload\(\);/);
    expect(guard.match(/clearReloadAttempt\(\);/g) ?? []).toHaveLength(3);
  });
});

describe("the TV code entry can be typed into with the keyboard up", () => {
  const entry = read("src/components/controller/ControllerCodeEntry.tsx");

  it("owns its scrolling and leaves room for the keypad", () => {
    // The field focuses itself; on iOS the webview is not resized for the
    // keyboard and its document scroller is off, so a centred min-h-screen
    // page put the field and the Join button under the keys.
    expect(entry).toMatch(/h-\[100dvh\] safe-bleed overflow-y-auto/);
    expect(entry).toMatch(/pb-\[calc\(1\.5rem_\+_var\(--keyboard-height,0px\)\)\]/);
    // The screen with the input is no longer the document-height kind.
    const form = entry.slice(entry.indexOf("return (\n    <>"));
    expect(form).not.toMatch(/className="min-h-screen/);
  });
});
