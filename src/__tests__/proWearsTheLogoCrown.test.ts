/**
 * Where a crown means Pro, it is the wordmark's crown.
 *
 * The paywall opened on `icon-vip-crown` — an ornate jewelled render that
 * appears nowhere else in the app and looks nothing like the crown in the
 * MyTrivia logo. So the screen that sells Pro wore a mark the player had
 * never seen, on the one screen where recognising the brand matters most
 * (owner's ask).
 *
 * `crown-3d.png` is the wordmark's own crown: the raster embedded in
 * `mytrivia-logo.svg` is byte-for-byte this file. The repo carries seven
 * identical copies of it under different names — Vite dedupes them by
 * content — and this is the one the Pro surfaces import.
 *
 * The shop keeps the ornate crown: there it is a product's catalogue art
 * and a category filter's glyph, not the brand mark.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const bytes = (p: string) => readFileSync(join(process.cwd(), p));

describe("the crown the Pro screens wear", () => {
  it.each([
    "src/components/pro/ProPaywallModal.tsx",
    "src/components/home/FriendJoinedModal.tsx",
  ])("%s imports the wordmark's crown", (file) => {
    const src = read(file);
    expect(src).toMatch(/import crownIcon from "@\/assets\/crown-3d\.png";/);
    // Nothing on the screen still pulls the ornate one in. Matched on the
    // import itself, so the comment above it may name what it replaced.
    expect(src).not.toMatch(/from "@\/assets\/icons\/icon-vip-crown/);
  });

  it("and that file really is the crown inside the logo", () => {
    // If the logo is ever redrawn, this fails rather than letting the
    // paywall drift back to wearing something else.
    const svg = read("src/assets/mytrivia-logo.svg");
    const embedded = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/)?.[1];
    expect(embedded, "the logo still embeds a PNG crown").toBeTruthy();
    const digest = (b: Buffer) => createHash("md5").update(b).digest("hex");
    expect(digest(Buffer.from(embedded!, "base64"))).toBe(digest(bytes("src/assets/crown-3d.png")));
  });

  it("the shop's own crowns are left alone — they are art, not the mark", () => {
    expect(read("src/hooks/useShopData.tsx")).toMatch(/icon-vip-crown/);
    expect(read("src/components/shared/IconTabBar.tsx")).toMatch(/icon-vip-crown/);
  });
});
