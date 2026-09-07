import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isAllowedDeepLinkPath } from "@/native/nativeShell";

/**
 * The deep-link allowlist and the association file have to agree.
 *
 * They protect the same thing from two directions. Apple enforces the
 * association file for universal links; nothing enforced the custom scheme,
 * which used to forward any incoming path straight into the router — so every
 * route in the bundle was reachable from outside the app, including the two
 * unreleased game modes and the alternate home screen.
 *
 * If someone publishes a new path in the association file and not here, the
 * link opens the app and lands on the home screen instead of the content. If
 * someone adds one here and not there, the app accepts a path Apple never
 * vouched for. Both are the drift this test exists to catch.
 */
const aasa = JSON.parse(
  readFileSync(
    join(process.cwd(), "public/.well-known/apple-app-site-association"),
    "utf8",
  ),
) as {
  applinks: { details: Array<{ paths: string[] }> };
};

const publishedPaths = aasa.applinks.details[0].paths;
const allowed = publishedPaths.filter((p) => !p.startsWith("NOT "));
const denied = publishedPaths
  .filter((p) => p.startsWith("NOT "))
  .map((p) => p.slice("NOT ".length));

/** Turn an association-file pattern into one concrete path that matches it. */
function sample(pattern: string): string {
  return pattern.replace(/\*$/, "sample").replace(/\/\*/g, "/sample");
}

describe("deep link allowlist", () => {
  it("accepts every path the association file publishes", () => {
    for (const pattern of allowed) {
      const path = sample(pattern);
      expect(
        isAllowedDeepLinkPath(path),
        `${pattern} is published to Apple but rejected here (tried ${path})`,
      ).toBe(true);
    }
  });

  it("rejects every path the association file excludes", () => {
    for (const pattern of denied) {
      const path = sample(pattern);
      expect(
        isAllowedDeepLinkPath(path),
        `${pattern} is excluded from universal links but accepted here (tried ${path})`,
      ).toBe(false);
    }
  });

  it("rejects the unreleased and internal surfaces", () => {
    // The routes this allowlist was written for. Each is compiled into the
    // shipped bundle; none may be reachable from a link.
    const mustNotOpen = [
      "/king",
      "/team-battle",
      "/newui",
      "/newui/path/abc",
      "/v3",
      "/dev/v2",
      "/admin",
      "/admin/reports",
      "/docs",
      "/styleguide",
      "/all-buttons",
      "/delete-account",
      "/reset-password",
    ];

    for (const path of mustNotOpen) {
      expect(isAllowedDeepLinkPath(path), `${path} must not be deep-linkable`).toBe(
        false,
      );
    }
  });

  it("does not accept a path that merely starts with an allowed one", () => {
    // `/room/ABC` is content; `/room/ABC/settings` is not a published shape.
    expect(isAllowedDeepLinkPath("/room/ABC123")).toBe(true);
    expect(isAllowedDeepLinkPath("/room/ABC123/../../admin")).toBe(false);
    expect(isAllowedDeepLinkPath("/leaderboards")).toBe(true);
    expect(isAllowedDeepLinkPath("/leaderboardsX")).toBe(false);
  });
});
