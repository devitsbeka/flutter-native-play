import { describe, it, expect } from "vitest";
import {
  MAX_CANVAS_PIXELS,
  MAX_PHOTO_BYTES,
  PhotoInputError,
  fitWithin,
  isUsableDataUrl,
  looksLikeHeic,
  photoRejection,
  shouldTryTranscode,
  sniffFormat,
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

  it("calls a zero-byte file unreadable, not an unsupported format", () => {
    // What a cloud-only photo looks like before it has been downloaded:
    // the File is real, the bytes are not. Every decoder fails, and calling
    // that a format problem sends the person off to convert a good photo.
    expect(photoRejection(file("IMG_2201.HEIC", "image/heic", 0))).toBe("unreadable");
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

describe("sniffFormat", () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  const ascii = (text: string, pad = 0) =>
    new Uint8Array([...Array(pad).fill(0), ...text.split("").map((c) => c.charCodeAt(0))]);

  it("names the common formats from their first bytes", () => {
    expect(sniffFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffFormat(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("png");
    expect(sniffFormat(ascii("GIF89a"))).toBe("gif");
    expect(sniffFormat(bytes(0x42, 0x4d, 0x00, 0x00))).toBe("bmp");
  });

  it("names a webp only when the RIFF payload says so", () => {
    const webp = new Uint8Array(16);
    webp.set(ascii("RIFF"), 0);
    webp.set(ascii("WEBP"), 8);
    expect(sniffFormat(webp)).toBe("webp");
  });

  it("recognises every brand an iPhone writes", () => {
    // The reason this exists: the type and the extension are the two things
    // phones and cloud drives get wrong, and they were the only evidence the
    // old code had. A file called .jpg holding these bytes IS a HEIC.
    for (const brand of ["heic", "heix", "mif1", "msf1", "hevc"]) {
      const heif = new Uint8Array(16);
      heif.set(ascii("ftyp"), 4);
      heif.set(ascii(brand), 8);
      expect(sniffFormat(heif), brand).toBe("heif");
    }
  });

  it("tells AVIF apart from HEIF — same container, different codec", () => {
    const avif = new Uint8Array(16);
    avif.set(ascii("ftyp"), 4);
    avif.set(ascii("avif"), 8);
    expect(sniffFormat(avif)).toBe("avif");
  });

  it("says unknown rather than guessing", () => {
    expect(sniffFormat(bytes(0x00, 0x01, 0x02, 0x03))).toBe("unknown");
    expect(sniffFormat(bytes(0xff))).toBe("unknown");
    expect(sniffFormat(new Uint8Array(0))).toBe("unknown");
  });

  it("does not call an mp4 a photo", () => {
    // Live Photos sit next to stills in the picker and share the container.
    const mp4 = new Uint8Array(16);
    mp4.set(ascii("ftyp"), 4);
    mp4.set(ascii("isom"), 8);
    expect(sniffFormat(mp4)).toBe("unknown");
  });
});

describe("shouldTryTranscode", () => {
  it("runs the transcoder for HEIF and for bytes it cannot name", () => {
    expect(shouldTryTranscode("heif")).toBe(true);
    // The case that used to be rethrown untried.
    expect(shouldTryTranscode("unknown")).toBe(true);
  });

  it("does not fetch a wasm decoder for a corrupt jpeg", () => {
    // A JPEG the browser refuses is damaged, not secretly another format —
    // there is nothing to gain from a second decoder failing more slowly.
    expect(shouldTryTranscode("jpeg")).toBe(false);
    expect(shouldTryTranscode("png")).toBe(false);
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
