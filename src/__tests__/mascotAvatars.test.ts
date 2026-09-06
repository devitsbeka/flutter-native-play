import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MASCOTS } from "@/config/mascots";
import { mascotAvatarUrl, mascotIdFromAvatarUrl, resolveAvatarUrl } from "@/utils/avatarUtils";

/**
 * A mascot's face can be worn as the profile picture.
 *
 * The mascots were scenes only — the animal on the home screen — while the
 * circle picture had just two ways in, both of them a photo. A player with
 * no photo they want to give had nothing to pick.
 *
 * Stored by id, never by the bundled file's URL: that URL carries Vite's
 * content hash and changes on the next build, which is the fault
 * recoverViteHashedAvatar exists to paper over.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const modal = read("src/components/home/AvatarModal.tsx");

describe("a mascot worn as an avatar", () => {
  it("is stored by id, not by a hashed asset URL", () => {
    expect(mascotAvatarUrl("panda")).toBe("mascot:panda");
    expect(mascotIdFromAvatarUrl("mascot:panda")).toBe("panda");
    // Round trip, for every mascot there is.
    for (const m of MASCOTS) expect(mascotIdFromAvatarUrl(mascotAvatarUrl(m.id))).toBe(m.id);
  });

  it("is not confused with any other kind of avatar", () => {
    expect(mascotIdFromAvatarUrl("https://example.com/a.png")).toBeNull();
    expect(mascotIdFromAvatarUrl("/src/assets/mascot-avatar-1.png")).toBeNull();
    expect(mascotIdFromAvatarUrl("data:image/png;base64,xxx")).toBeNull();
    expect(mascotIdFromAvatarUrl(null)).toBeNull();
    expect(mascotIdFromAvatarUrl(undefined)).toBeNull();
    // A prefix with nothing after it names no mascot.
    expect(mascotIdFromAvatarUrl("mascot:")).toBeNull();
  });

  it("resolves to that mascot's own face", () => {
    for (const m of MASCOTS) expect(resolveAvatarUrl(mascotAvatarUrl(m.id)), m.id).toBe(m.thumb);
  });

  it("and a retired mascot falls back rather than breaking", () => {
    // The wolf and the dolphin were dropped; anyone still stored with one
    // lands on the initial-letter fallback, where a deleted upload lands.
    expect(resolveAvatarUrl("mascot:wolf")).toBeUndefined();
    expect(resolveAvatarUrl("mascot:nonesuch")).toBeUndefined();
  });

  it("every other avatar shape still resolves as it did", () => {
    expect(resolveAvatarUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(resolveAvatarUrl("data:image/png;base64,xxx")).toBe("data:image/png;base64,xxx");
    expect(resolveAvatarUrl(null)).toBeUndefined();
  });
});

describe("the picker", () => {
  it("offers the faces as a gallery, and saves the id", () => {
    expect(modal).toMatch(/t\("avatar\.animalAvatars"\)/);
    expect(modal).toMatch(/onClick=\{\(\) => chooseMascotAvatar\(mascot\.id\)\}/);
    expect(modal).toMatch(/avatar_url: mascotAvatarUrl\(id\)/);
    // The tick follows what is actually worn, read back through the same id.
    expect(modal).toMatch(/mascotIdFromAvatarUrl\(profile\?\.avatar_url\) === mascot\.id/);
  });

  it("hands the generated portraits' current flag back", () => {
    // Or the shelf keeps a tick on a face the player is no longer wearing.
    const handler = modal.slice(modal.indexOf("const chooseMascotAvatar"));
    expect(handler.slice(0, 900)).toMatch(/is_current: false/);
  });

  it("opens the photo picker from a label on the web", () => {
    // Safari opens an input from a label's own activation with no script.
    // `input.click()` has to stay inside the gesture to be honoured, and in
    // an animated dialog WebKit quietly declines — a tile that does nothing.
    expect(modal).toMatch(/<label htmlFor=\{htmlFor\}/);
    expect(modal).toMatch(/<NativeOrLabel/);
    expect(modal).toMatch(/htmlFor="avatar-file-input"/);
    // The native build has no input to open: it goes to the system sheet.
    expect(modal).toMatch(/if \(isNativePhotoPickerAvailable\(\)\) \{\s*\n\s*return \(\s*\n\s*<button type="button" onClick=\{onClick\}/);
  });
});
