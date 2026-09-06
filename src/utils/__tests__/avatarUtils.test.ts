import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isValidAvatarUrl, resolveAvatarUrl, retiredPresetFromAvatarUrl } from "@/utils/avatarUtils";
import { MASCOT_AVATARS } from "@/config/mascotAvatars";

/** One of MyTrivia's own round characters — what a retired preset now draws. */
const isOurFace = (url: string | undefined) => !!url && MASCOT_AVATARS.some((a) => a.url === url);

// Avatars come from four different eras of this app: bundled assets, dev
// paths that leaked into the database, build-hashed paths that stop
// resolving after the next deploy, and Supabase URLs. Getting any of these
// wrong shows a broken image where a person's face should be.

beforeEach(() => {
  // These paths legitimately log on the recovery/fallback branches.
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveAvatarUrl — nothing to show", () => {
  it("returns undefined for a missing avatar so the caller can fall back", () => {
    expect(resolveAvatarUrl(null)).toBeUndefined();
    expect(resolveAvatarUrl(undefined)).toBeUndefined();
    expect(resolveAvatarUrl("")).toBeUndefined();
  });
});

describe("resolveAvatarUrl — remote urls", () => {
  it("passes through Supabase and other https urls untouched", () => {
    const url = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/avatars/u1/scene_1.png";
    expect(resolveAvatarUrl(url)).toBe(url);
  });

  it("passes through http urls untouched", () => {
    expect(resolveAvatarUrl("http://example.com/a.png")).toBe("http://example.com/a.png");
  });

  it("passes through data urls, which the camera flow produces", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    expect(resolveAvatarUrl(dataUrl)).toBe(dataUrl);
  });
});

describe("resolveAvatarUrl — the retired presets", () => {
  // The drawn people (bot-avatar-N) are retired as profile pictures: a stored
  // one draws one of MyTrivia's own round characters instead.
  //
  // mascot-avatar-N is NOT retired any more. It was, for one release — the
  // animals were dealt in its place — and the owner's answer on seeing that
  // was that an animal reads as stock art rather than as anything of ours.
  // Those resolve to their own art again, which is what the assertions here
  // that used to expect an animal now say.
  it("maps a dev-server preset path to one of our faces", () => {
    const resolved = resolveAvatarUrl("/src/assets/avatars/bot-avatar-4.png");
    expect(isOurFace(resolved)).toBe(true);
    expect(resolved).not.toMatch(/bot-avatar-4/);
  });

  it("maps a relative asset path the same way", () => {
    expect(resolveAvatarUrl("src/assets/avatars/mascot-avatar-2.png")).toBe(
      resolveAvatarUrl("/src/assets/avatars/mascot-avatar-2.png")
    );
  });

  it("resolves every drawn person to one of ours", () => {
    for (let n = 1; n <= 10; n++) {
      expect(isOurFace(resolveAvatarUrl(`/src/assets/avatars/bot-avatar-${n}.png`)), `bot ${n}`).toBe(true);
    }
  });

  it("and every one of our own faces to its own art, the King included", () => {
    // He is not offered as a choice, but a player already wearing him has
    // that path stored: resolving it to something else would swap their
    // picture out from under them.
    for (let n = 1; n <= 8; n++) {
      const resolved = resolveAvatarUrl(`/src/assets/avatars/mascot-avatar-${n}.png`);
      expect(resolved, `mascot ${n}`).toBeDefined();
      expect(isOurFace(resolved) || n === 1, `mascot ${n}`).toBe(true);
    }
    // Eight distinct pictures, not one dealt face repeated.
    const urls = new Set<string | undefined>();
    for (let n = 1; n <= 8; n++) urls.add(resolveAvatarUrl(`/src/assets/avatars/mascot-avatar-${n}.png`));
    expect(urls.size).toBe(8);
  });

  it("deals the same drawn person the same face every time, and spreads them", () => {
    expect(resolveAvatarUrl("/src/assets/avatars/bot-avatar-3.png")).toBe(
      resolveAvatarUrl("/src/assets/avatars/bot-avatar-3.png")
    );
    const urls = new Set<string | undefined>();
    for (let n = 1; n <= 10; n++) urls.add(resolveAvatarUrl(`/src/assets/avatars/bot-avatar-${n}.png`));
    expect(urls.size).toBeGreaterThan(1);
  });

  it("names the preset a stored value refers to, in the three forms it was stored in", () => {
    expect(retiredPresetFromAvatarUrl("/src/assets/avatars/bot-avatar-4.png")).toBe("bot-avatar-4");
    // Not a retired preset any more — it names one of ours, which resolves.
    expect(retiredPresetFromAvatarUrl("src/assets/avatars/mascot-avatar-2.png")).toBeNull();
    expect(retiredPresetFromAvatarUrl("/assets/bot-avatar-4-uiIFWm1y.png")).toBe("bot-avatar-4");
    expect(retiredPresetFromAvatarUrl("https://x/y/bot-avatar-4.png")).toBeNull();
    expect(retiredPresetFromAvatarUrl(null)).toBeNull();
  });

  it("returns undefined for an asset path that is not in the set", () => {
    expect(resolveAvatarUrl("/src/assets/avatars/does-not-exist.png")).toBeUndefined();
  });
});

describe("resolveAvatarUrl — stale build-hashed paths", () => {
  // These were written to the database by an earlier deploy and stop
  // resolving the moment the next build changes the hash.
  it("recovers a hashed bot avatar to the same animal as its dev path", () => {
    expect(resolveAvatarUrl("/assets/bot-avatar-4-uiIFWm1y.png")).toBe(
      resolveAvatarUrl("/src/assets/avatars/bot-avatar-4.png")
    );
  });

  it("recovers a hashed mascot avatar to the same animal as its dev path", () => {
    expect(resolveAvatarUrl("/assets/mascot-avatar-3-A1b2C3d4.png")).toBe(
      resolveAvatarUrl("/src/assets/avatars/mascot-avatar-3.png")
    );
  });

  it("returns undefined for a hashed path it cannot map, rather than a dead url", () => {
    // A dead /assets/ url renders as a broken image; undefined lets the
    // caller show its own fallback.
    expect(resolveAvatarUrl("/assets/some-other-image-A1b2C3d4.png")).toBeUndefined();
  });

  it("recovers across the image extensions the pattern allows", () => {
    for (const ext of ["png", "jpg", "jpeg", "webp"]) {
      expect(resolveAvatarUrl(`/assets/bot-avatar-2-A1b2C3d4.${ext}`), ext).toBe(
        resolveAvatarUrl("/src/assets/avatars/bot-avatar-2.png")
      );
    }
  });
});

describe("resolveAvatarUrl — anything else", () => {
  it("returns an unrecognised value unchanged and lets the browser try", () => {
    expect(resolveAvatarUrl("avatars/custom.png")).toBe("avatars/custom.png");
    expect(resolveAvatarUrl("//cdn.example.com/a.png")).toBe("//cdn.example.com/a.png");
  });

  it("never returns an empty string, which would render as a broken image", () => {
    const inputs = [
      null,
      undefined,
      "",
      "https://x/y.png",
      "/src/assets/avatars/bot-avatar-1.png",
      "/assets/bot-avatar-1-A1b2C3d4.png",
      "/assets/unknown-A1b2C3d4.png",
      "data:image/png;base64,AAA",
      "weird",
    ];
    for (const input of inputs) {
      const resolved = resolveAvatarUrl(input);
      expect(resolved === undefined || resolved.length > 0, String(input)).toBe(true);
    }
  });
});

describe("isValidAvatarUrl", () => {
  it("accepts remote and data urls", () => {
    expect(isValidAvatarUrl("https://example.com/a.png")).toBe(true);
    expect(isValidAvatarUrl("http://example.com/a.png")).toBe(true);
    expect(isValidAvatarUrl("data:image/png;base64,AAA")).toBe(true);
  });

  it("rejects missing values and local paths", () => {
    expect(isValidAvatarUrl(null)).toBe(false);
    expect(isValidAvatarUrl(undefined)).toBe(false);
    expect(isValidAvatarUrl("")).toBe(false);
    expect(isValidAvatarUrl("/src/assets/avatars/bot-avatar-1.png")).toBe(false);
    expect(isValidAvatarUrl("/assets/bot-avatar-1-A1b2C3d4.png")).toBe(false);
  });
});
