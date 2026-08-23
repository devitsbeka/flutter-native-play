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
 * wider. At 3x that hero wants 470–690 real pixels.
 *
 * So art sized by eye against the discover card looks fine there and falls
 * apart on the category page. That is exactly what happened: a re-export
 * (3e2f661) took five of the six down, `guess_logo` from 320px to 102px — a
 * 4.6x upscale on a phone, and visibly mushy. Nothing failed, because the
 * surface that shows the problem is not the surface the art was checked on.
 *
 * The floor below is a ratchet, not a target: it says "no smaller than what
 * we already have". The real target is 1024x1024, which covers the hero at 3x
 * with headroom and still downsamples cleanly for the card. Raise the floor
 * when the 1024s land; never lower it to make a re-export pass.
 */
const ICON_DIR = join(process.cwd(), "src/assets/popular");

/** Smallest edge each icon is currently shipped at. */
const FLOOR_PX = 320;

/** Width and height from a PNG's IHDR, which is always the first chunk. */
function pngSize(file: string): { width: number; height: number } {
  const data = readFileSync(file);
  // 8-byte signature, then the IHDR length/type, then width and height.
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

describe("popular category artwork", () => {
  it("ships one PNG per guess-category", () => {
    const files = readdirSync(ICON_DIR).filter((f) => f.endsWith(".png"));
    expect(files.length).toBe(POPULAR_IMAGE_CATEGORY_IDS.length);
    for (const id of POPULAR_IMAGE_CATEGORY_IDS) {
      expect(files, `missing art for ${id}`).toContain(`${id}.png`);
    }
  });

  it.each([...POPULAR_IMAGE_CATEGORY_IDS])(
    "%s is big enough for the category-page hero",
    (id) => {
      const { width, height } = pngSize(join(ICON_DIR, `${id}.png`));

      expect(
        width,
        `${id}.png is ${width}px. The hero draws it up to 230 CSS px, which is ` +
          `690 real pixels at 3x — a re-export below ${FLOOR_PX}px is the ` +
          `regression this test exists for. Supply larger art, do not lower the floor.`
      ).toBeGreaterThanOrEqual(FLOOR_PX);

      // Square, because both surfaces centre it in a square box and a
      // non-square export would letterbox differently in each.
      expect(height, `${id}.png is not square (${width}x${height})`).toBe(width);
    }
  );
});
