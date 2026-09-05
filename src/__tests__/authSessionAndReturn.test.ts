/**
 * Two ways the app threw a signed-in player out, and where it put them next.
 *
 * The report: "sometimes the site kicks me out and I see this multiplayer
 * screen, and after refresh sometimes I go to the online game page instead
 * of the main page." Those are two separate defects that chain — the wall
 * sends you to /auth, and /auth is where the second one fires.
 *
 * 1. AuthContext treated ANY auth event carrying a null session as "signed
 *    out, and settled". supabase-js delivers a null session on several
 *    events; only SIGNED_OUT and an empty INITIAL_SESSION mean the account
 *    is gone. A TOKEN_REFRESHED that came back empty — routine on mobile
 *    Chrome, which freezes backgrounded tabs — cleared the user AND set
 *    loading false, which every consumer reads as signed out. Hence the
 *    "Sign in to play with friends" wall over a good session, and hence a
 *    reload fixing it: the stored token was never actually invalid.
 *
 * 2. `authReturnTo` was written to localStorage before a Google redirect and
 *    removed only when /auth saw a user. The redirect returns to the ORIGIN,
 *    not to /auth, so on the common path nothing ever read it, and a
 *    cancelled attempt wrote nothing back. It stayed forever, and the next
 *    visit to /auth obeyed it.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AUTH_RETURN_TO_TTL_MS,
  forgetAuthReturnTo,
  isSafeReturnPath,
  rememberAuthReturnTo,
  takeAuthReturnTo,
} from "@/utils/authReturnTo";

// The suite runs on node, with no DOM. A few lines of in-memory storage
// beats pulling jsdom in for one file — this repo carries two lockfiles and
// a dependency added carelessly takes CI down (CLAUDE.md #2).
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}
(globalThis as unknown as { localStorage: Storage }).localStorage =
  new MemoryStorage() as unknown as Storage;

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const context = read("src/contexts/AuthContext.tsx");
const authPage = read("src/pages/Auth.tsx");
const modal = read("src/components/shared/AuthRequiredModal.tsx");

describe("a null session is not automatically a sign-out", () => {
  it("only SIGNED_OUT and an empty INITIAL_SESSION tear the user down", () => {
    expect(context).toMatch(
      /if \(event !== "SIGNED_OUT" && event !== "INITIAL_SESSION"\) \{/,
    );
    // And it says which event it ignored, so a repeat report names its cause.
    expect(context).toMatch(/console\.warn\("\[AuthContext\] empty session on", event,/);
    // The teardown is the only place that clears.
    expect(context).toMatch(/setSession\(null\);\s*\n\s*setUser\(null\);\s*\n\s*setProfile\(null\);\s*\n\s*setLoading\(false\);/);
  });

  it("a good session is taken at face value and never cleared by the guard", () => {
    expect(context).toMatch(/if \(currentSession\?\.user\) \{\s*\n\s*setSession\(currentSession\);\s*\n\s*setUser\(currentSession\.user\);/);
    // The old unconditional pair is gone: it ran before the event was known.
    expect(context).not.toMatch(/setUser\(currentSession\?\.user \?\? null\);/);
  });

  it("getSession only ever adds a user, so it cannot wipe one mid-flight", () => {
    // The listener may already have delivered a session; this resolving with
    // null afterwards used to overwrite it — the same wall, other direction.
    expect(context).not.toMatch(/setUser\(existingSession\?\.user \?\? null\);/);
    expect(context).toMatch(/if \(existingSession\?\.user\) \{[^}]*setUser\(existingSession\.user\);/);
  });

  it("and a rejected getSession settles instead of spinning forever", () => {
    // No catch meant an unhandled rejection and loading stuck true: a
    // spinner with nothing to tap, which is worse than the wall.
    expect(context).toMatch(/\.catch\(\(err\) => \{/);
    expect(context).toMatch(/console\.warn\("\[AuthContext\] getSession failed:", err\);/);
  });
});

describe("where /auth sends you afterwards", () => {
  it("an explicit ?returnTo beats a stored one", () => {
    // The param came from the tap that opened the screen; the stored value
    // may be from an OAuth trip that never came back.
    expect(authPage).toMatch(/if \(returnTo\) \{\s*\n\s*navigate\(decodeURIComponent\(returnTo\)\);\s*\n\s*\} else if \(saved\) \{/);
    expect(authPage).toMatch(/const saved = takeAuthReturnTo\(\);/);
  });

  it("and the raw localStorage key is nobody's business any more", () => {
    for (const [name, src] of [["Auth", authPage], ["modal", modal]] as const) {
      expect(src, name).not.toMatch(/localStorage\.(get|set|remove)Item\(['"]authReturnTo['"]/);
    }
  });

  it("a failed or cancelled attempt drops the destination", () => {
    // Nothing is coming back to consume it, so leaving it is the bug.
    expect(authPage.match(/forgetAuthReturnTo\(\)/g) ?? []).toHaveLength(2);
    expect(modal).toMatch(/forgetAuthReturnTo\(\)/);
    expect(modal).toMatch(/rememberAuthReturnTo\(returnToPath\)/);
  });
});

describe("the stored destination, run rather than read", () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    localStorage.clear();
  });

  it("comes back while the round trip could still be running", () => {
    rememberAuthReturnTo("/team?tab=public", NOW);
    expect(takeAuthReturnTo(NOW + 5_000)).toBe("/team?tab=public");
  });

  it("is read exactly once", () => {
    rememberAuthReturnTo("/team", NOW);
    expect(takeAuthReturnTo(NOW)).toBe("/team");
    expect(takeAuthReturnTo(NOW)).toBeNull();
  });

  it("stops being obeyed once the trip cannot still be in progress", () => {
    rememberAuthReturnTo("/team", NOW);
    expect(takeAuthReturnTo(NOW + AUTH_RETURN_TO_TTL_MS + 1)).toBeNull();
    // A month later — the reported case — is emphatically not honoured.
    rememberAuthReturnTo("/team", NOW);
    expect(takeAuthReturnTo(NOW + 30 * 24 * 3600_000)).toBeNull();
  });

  it("and a stale value is cleared, not left for the next visit", () => {
    rememberAuthReturnTo("/team", NOW);
    takeAuthReturnTo(NOW + 30 * 24 * 3600_000);
    expect(localStorage.getItem("authReturnTo")).toBeNull();
  });

  it("a clock that jumped backwards does not resurrect one", () => {
    rememberAuthReturnTo("/team", NOW);
    expect(takeAuthReturnTo(NOW - 30 * 24 * 3600_000)).toBeNull();
  });

  it("the values already sitting in people's browsers are dropped", () => {
    // The old format was a bare path with no timestamp. Honouring it would
    // hand every affected browser the bug exactly one more time.
    localStorage.setItem("authReturnTo", "/team");
    expect(takeAuthReturnTo(NOW)).toBeNull();
    expect(localStorage.getItem("authReturnTo")).toBeNull();
  });

  it("survives junk without throwing", () => {
    for (const junk of ["{", "null", "{}", '{"path":"/team"}', '{"at":123}', "42"]) {
      localStorage.setItem("authReturnTo", junk);
      expect(takeAuthReturnTo(NOW), junk).toBeNull();
    }
  });

  it("never navigates off our own origin", () => {
    // The value is replayed into navigate(); "//evil.example" is a
    // protocol-relative URL, which a leading "/" check alone would allow.
    expect(isSafeReturnPath("/team")).toBe(true);
    for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example", "team", "", null]) {
      expect(isSafeReturnPath(bad as string), String(bad)).toBe(false);
      rememberAuthReturnTo(bad as string, NOW);
      expect(takeAuthReturnTo(NOW), String(bad)).toBeNull();
    }
  });

  it("forget clears it", () => {
    rememberAuthReturnTo("/team", NOW);
    forgetAuthReturnTo();
    expect(takeAuthReturnTo(NOW)).toBeNull();
  });
});
