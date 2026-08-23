import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * The guess-category art has to survive being drawn big.
 *
 * Two surfaces draw the same picture at very different sizes. CategoryPage's
 * hero draws it at `w-[40%] max-w-[230px]` — 690 device px at 3x — while
 * Discover's card draws it at 141 CSS px, or 423, and the room picker at 26.
 *
 * Sizing one file by eye against the card is how `guess_logo` came to ship at
 * 102px and look visibly mushy on the hero (3e2f661 took five of the six down
 * that way). Sizing it for the hero and using it everywhere is how Discover
 * came to spend 737 KB drawing six icons at 141 CSS px. Both were measured on
 * the surface that was not being looked at.
 *
 * So there are two files per category: a 1000px hero and a 512px card. Both
 * bounds below are ratchets — raise the hero floor when better art lands, and
 * never widen either to make a re-export pass.
 *
 * Format is checked too, and not for tidiness. AVIF would be the obvious
 * choice for files this size and would render as a broken image on iOS 15,
 * which this app still supports — WebP is iOS 14, AVIF is iOS 16. One of
 * these arrived as an AVIF during the upload that produced them.
 */
const ICON_DIR = join(process.cwd(), "src/assets/popular");

/** Every hero icon is shipped at this edge length. */
const FLOOR_PX = 1000;

/**
 * The card variant covers Discover's 423 device px with a little headroom for
 * a wider phone, and must stay well under the hero's size or it is not a
 * variant at all — it is the hero's art under a second name.
 */
const CARD_MIN_PX = 448;
const CARD_MAX_PX = 640;

/** Safe on every browser this app targets, iOS 15 included. */
const ALLOWED_EXTENSIONS = [".webp", ".png"];

/**
 * Width and height of a PNG or a WebP.
 *
 * Hand-parsed rather than pulled from an image library: this runs in the unit
 * suite, and the point is to read the bytes that are actually committed.
 */
function imageSize(file: string): { width: number; height: number } {
  const d = readFileSync(file);

  // PNG: 8-byte signature, then IHDR length/type, then width and height.
  if (d.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: d.readUInt32BE(16), height: d.readUInt32BE(20) };
  }

  // WebP: "RIFF" .... "WEBP" then a chunk whose fourcc says which of the
  // three encodings it is. Each stores its size differently.
  if (d.subarray(0, 4).toString("ascii") === "RIFF" && d.subarray(8, 12).toString("ascii") === "WEBP") {
    const fourcc = d.subarray(12, 16).toString("ascii");
    if (fourcc === "VP8X") {
      // 24-bit little-endian, stored as (size - 1).
      const w = d.readUIntLE(24, 3) + 1;
      const h = d.readUIntLE(27, 3) + 1;
      return { width: w, height: h };
    }
    if (fourcc === "VP8L") {
      // 14 bits each, packed after the 1-byte signature.
      const bits = d.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (fourcc === "VP8 ") {
      // Lossy: dimensions follow the 3-byte start code, 14 bits each.
      return { width: d.readUInt16LE(26) & 0x3fff, height: d.readUInt16LE(28) & 0x3fff };
    }
  }

  throw new Error(`${file}: not a PNG or WebP this reader understands`);
}

describe("popular category artwork", () => {
  const files = readdirSync(ICON_DIR);

  it("ships exactly one hero and one card image per guess-category", () => {
    // "Exactly" matters: the art arrives by upload under names like
    // Movie-icon.webp, and a leftover copy is dead weight in the bundle
    // directory that no import points at.
    expect(files.length).toBe(POPULAR_IMAGE_CATEGORY_IDS.length * 2);

    for (const id of POPULAR_IMAGE_CATEGORY_IDS) {
      const hero = files.filter((f) => f.startsWith(`${id}.`));
      const card = files.filter((f) => f.startsWith(`${id}_card.`));
      expect(hero, `expected one hero file for ${id}, found ${hero.join(", ") || "none"}`).toHaveLength(1);
      expect(card, `expected one card file for ${id}, found ${card.join(", ") || "none"}`).toHaveLength(1);
    }
  });

  it.each([...POPULAR_IMAGE_CATEGORY_IDS])("%s has a card variant sized for the card", (id) => {
    // Discover draws these at 141 CSS px — 423 device px at 3x. Shipping the
    // hero's 1000px art to that surface cost 737 KB for six icons, measured.
    const file = files.find((f) => f.startsWith(`${id}_card.`))!;
    const { width, height } = imageSize(join(ICON_DIR, file));
    expect(width, `${file} must cover 423 device px`).toBeGreaterThanOrEqual(CARD_MIN_PX);
    expect(
      width,
      `${file} is ${width}px — at that size it is the hero's art again, not a card variant`
    ).toBeLessThanOrEqual(CARD_MAX_PX);
    expect(height).toBe(width);
  });

  it.each([...POPULAR_IMAGE_CATEGORY_IDS])("%s is big enough for the hero", (id) => {
    const file = files.find((f) => f.startsWith(`${id}.`))!;
    const { width, height } = imageSize(join(ICON_DIR, file));

    expect(
      width,
      `${file} is ${width}px. The hero draws it up to 230 CSS px, which is 690 ` +
        `real pixels at 3x. Supply larger art; do not lower the floor.`
    ).toBeGreaterThanOrEqual(FLOOR_PX);

    // Square, because both surfaces centre it in a square box and a
    // non-square export would letterbox differently in each.
    expect(height, `${file} is not square (${width}x${height})`).toBe(width);
  });

  it.each([...POPULAR_IMAGE_CATEGORY_IDS])("%s is in a format iOS 15 can render", (id) => {
    const ext = files.find((f) => f.startsWith(`${id}.`))!.slice(-5);
    expect(
      ALLOWED_EXTENSIONS,
      `${id}: AVIF and friends need iOS 16; this app deploys to 15, where the ` +
        `icon would not render at all. Convert to WebP.`
    ).toContain(ext);
  });
});
