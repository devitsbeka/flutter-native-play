import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { POPULAR_IMAGE_CATEGORY_IDS } from "@/config/popularImageCategories";

/**
 * The guess-category art has to survive being drawn big.
 *
 * One file, two very different sizes. The discover card draws it at `w-[53%]`
 * of a small card — around 90 CSS px — while CategoryPage's hero draws it at
 * `w-[40%] max-w-[230px]`, which is 156 CSS px on a phone and 230 on anything
 * wider. At 3x that hero wants 690 real pixels.
 *
 * So art sized by eye against the discover card looks fine there and falls
 * apart on the category page. That is exactly what happened: a re-export
 * (3e2f661) took five of the six down, `guess_logo` from 320px to 102px — a
 * 4.6x upscale, and visibly mushy. Nothing failed, because the surface that
 * shows the problem is not the surface the art was checked on.
 *
 * All six are now 1000x1000, which clears the hero at 3x with room to spare.
 * The floor is a ratchet: raise it when better art lands, never lower it to
 * make a re-export pass.
 *
 * Format is checked too, and not for tidiness. AVIF would be the obvious
 * choice for files this size and would render as a broken image on iOS 15,
 * which this app still supports — WebP is iOS 14, AVIF is iOS 16. One of
 * these arrived as an AVIF during the upload that produced them.
 */
const ICON_DIR = join(process.cwd(), "src/assets/popular");

/** Every icon is shipped at this edge length. */
const FLOOR_PX = 1000;

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

  it("ships exactly one image per guess-category, and nothing else", () => {
    // "Nothing else" matters: the art arrives by upload under names like
    // Movie-icon.webp, and a leftover copy is dead weight in the bundle
    // directory that no import points at.
    expect(files.length).toBe(POPULAR_IMAGE_CATEGORY_IDS.length);

    for (const id of POPULAR_IMAGE_CATEGORY_IDS) {
      const match = files.filter((f) => f.startsWith(`${id}.`));
      expect(match, `expected exactly one file for ${id}, found ${match.join(", ") || "none"}`)
        .toHaveLength(1);
    }
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
    const file = files.find((f) => f.startsWith(`${id}.`))!;
    const ext = file.slice(file.lastIndexOf("."));
    expect(
      ALLOWED_EXTENSIONS,
      `${file}: AVIF and friends need iOS 16; this app deploys to 15, where the ` +
        `icon would not render at all. Convert to WebP.`
    ).toContain(ext);
  });
});
