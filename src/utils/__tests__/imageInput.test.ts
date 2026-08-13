import { describe, it, expect } from "vitest";
import {
  MAX_CANVAS_PIXELS,
  MAX_PHOTO_BYTES,
  PhotoInputError,
  fitWithin,
  isUsableDataUrl,
  looksLikeHeic,
  photoRejection,
} from "@/utils/imageInput";

const file = (name: string, type: string, size = 2_000_000) => ({ name, type, size });

describe("photoRejection", () => {
  it("accepts what a phone camera actually hands over", () => {
    // Every one of these is a real combination a phone or a browser produces.
    // The old check required a MIME type starting with "image/" OR one of
    // seven extensions, and turned the rest away as "not an image".
    const realPhotos = [
      file("IMG_4821.HEIC", "image/heic"),
      file("IMG_4821.heic", ""),
      file("IMG_4821.heif", "image/heif"),
      file("IMG_4821.HEIC", "image/heic-sequence"),
      file("DSC00021.HIF", "application/octet-stream"),
      file("selfie.jpg", "image/jpeg"),
      file("Screenshot.png", "image/png"),
      file("photo.avif", "image/avif"),
      file("scan.tiff", ""),
      file("no-extension-at-all", "image/jpeg"),
    ];

    for (const f of realPhotos) {
      expect(photoRejection(f), `${f.name} (${f.type || "no type"})`).toBeNull();
    }
  });

  it("still turns away things that are not photos", () => {
    expect(photoRejection(file("contract.pdf", "application/pdf"))).toBe("not-an-image");
    expect(photoRejection(file("clip.mov", "video/quicktime"))).toBe("not-an-image");
  });

  it("rejects a file past the size ceiling", () => {
    expect(photoRejection(file("huge.jpg", "image/jpeg", MAX_PHOTO_BYTES + 1))).toBe("too-large");
    expect(photoRejection(file("big.jpg", "image/jpeg", MAX_PHOTO_BYTES))).toBeNull();
  });

  it("leaves room for a modern camera roll photo", () => {
    // 48MP HEIC stills land in the 8-12MB range, and a burst-merged or ProRAW
    // export goes past 20MB. The old 15MB ceiling refused those outright.
    expect(photoRejection(file("IMG_9001.HEIC", "image/heic", 22_000_000))).toBeNull();
  });
});

describe("looksLikeHeic", () => {
  it("recognises the shapes iOS reports", () => {
    expect(looksLikeHeic(file("IMG_1.HEIC", "image/heic"))).toBe(true);
    expect(looksLikeHeic(file("IMG_1.heif", ""))).toBe(true);
    expect(looksLikeHeic(file("IMG_1.jpg", "image/heic-sequence"))).toBe(true);
    expect(looksLikeHeic(file("DSC_1.hif", "image/heif"))).toBe(true);
  });

  it("is only a hint — a plain jpeg is not excluded from conversion", () => {
    // THE bug. This test does not assert that a jpeg gets converted; it
    // asserts the hint is allowed to be wrong. The decoder ladder tries the
    // transcoder for anything the browser could not read, precisely because
    // a `.jpg` name on HEIF bytes used to be rethrown untried.
    expect(looksLikeHeic(file("selfie.jpg", "image/jpeg"))).toBe(false);
  });
});

describe("fitWithin", () => {
  it("leaves a small photo alone", () => {
    expect(fitWithin(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });

  it("scales the long edge down and keeps the aspect ratio", () => {
    expect(fitWithin(4032, 3024, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3024, 4032, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it("keeps a 48MP photo inside the canvas ceiling", () => {
    // Safari hands back a BLANK bitmap past ~16.7M pixels rather than
    // throwing, so the failure would otherwise arrive later as an empty
    // avatar with nothing to trace it to.
    const { width, height } = fitWithin(8064, 6048, 12_000, MAX_CANVAS_PIXELS);
    expect(width * height).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
    expect(width / height).toBeCloseTo(8064 / 6048, 2);
  });

  it("never collapses an extreme panorama to zero", () => {
    const { width, height } = fitWithin(20000, 3, 1024);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThanOrEqual(1);
  });

  it("refuses an image that decoded to nothing", () => {
    // naturalWidth 0 on a "successful" load: the canvas would silently
    // produce an empty JPEG the app would then upload as an avatar.
    expect(() => fitWithin(0, 0, 1024)).toThrow(PhotoInputError);
    expect(() => fitWithin(100, 0, 1024)).toThrow(PhotoInputError);
  });
});

describe("isUsableDataUrl", () => {
  it("rejects what a refusing canvas returns", () => {
    expect(isUsableDataUrl("data:,")).toBe(false);
    expect(isUsableDataUrl("")).toBe(false);
    expect(isUsableDataUrl(null)).toBe(false);
    expect(isUsableDataUrl("data:image/jpeg;base64,c2hvcnQ=")).toBe(false);
  });

  it("accepts a real encode", () => {
    expect(isUsableDataUrl(`data:image/jpeg;base64,${"A".repeat(600)}`)).toBe(true);
  });
});
