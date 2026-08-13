/**
 * Turning a photo off a phone into something the app can upload.
 *
 * This is the first thing a person does in the avatar studio and it has to
 * work on the file their camera actually produced — which, on any recent
 * iPhone or iPad, is HEIC, and in a browser that is not Safari nothing can
 * decode it. The old path asked an <img> to load the file and gave up if it
 * would not, behind a guess about whether the file "looked" HEIC based on its
 * extension and MIME type. Both are routinely wrong: iOS hands over
 * `image/heic`, `image/heif`, `image/heic-sequence`, an empty string, and
 * sometimes a `.jpg` name on HEIF bytes. Every case the guess missed was
 * rethrown as "couldn't process the image" with nothing to act on.
 *
 * So: try every decoder, in order of what handles the most formats, and only
 * then decide it cannot be read. The conversion attempt no longer depends on
 * recognising HEIC in advance — if the browser cannot decode the bytes, the
 * HEIC decoder gets a turn regardless of what the file calls itself.
 */

export const MAX_PHOTO_BYTES = 30 * 1024 * 1024;

/**
 * Safari refuses to rasterise a canvas past roughly 16.7M pixels — and does
 * it by handing back a blank bitmap rather than throwing, so the failure
 * arrives later as an empty avatar. Recent phones shoot 48MP, which is well
 * past it, so the ceiling is enforced here instead.
 */
export const MAX_CANVAS_PIXELS = 16_777_216;

export type PhotoRejection = "not-an-image" | "too-large";

/** What went wrong, in terms the UI can turn into a sentence worth reading. */
export type PhotoFailure = PhotoRejection | "undecodable" | "canvas-unavailable";

export class PhotoInputError extends Error {
  constructor(readonly reason: PhotoFailure, message?: string) {
    super(message || reason);
    this.name = "PhotoInputError";
  }
}

interface FileFacts {
  name: string;
  type: string;
  size: number;
}

// `hif` is what some Sony and Canon bodies name their HEIF stills; `avif` and
// `tif` show up from screenshots and scans. None of them decoded under the
// old list, so picking one produced "not an image" for a real photo.
const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|heic|heif|hif|avif|bmp|tiff?)$/i;

/**
 * Whether to refuse the file before trying to decode it.
 *
 * Deliberately permissive about type: a phone that reports no MIME type at
 * all is common, and the decoders below settle the question far better than
 * a filename does. Only an outright non-image — a PDF, a video — is turned
 * away here.
 */
export function photoRejection(file: FileFacts): PhotoRejection | null {
  const claimsImage = file.type.startsWith("image/");
  const unknownType = file.type === "" || file.type === "application/octet-stream";
  const namedImage = IMAGE_EXTENSION.test(file.name);

  if (!claimsImage && !namedImage && !unknownType) return "not-an-image";
  if (file.size > MAX_PHOTO_BYTES) return "too-large";
  return null;
}

/**
 * A hint, not a gate.
 *
 * Used only to decide which decoder to reach for FIRST. Nothing is refused
 * for failing this test — that was the bug.
 */
export function looksLikeHeic(file: FileFacts): boolean {
  return (
    /\.(heic|heif|hif)$/i.test(file.name) ||
    /^image\/(heic|heif)/.test(file.type) ||
    file.type === ""
  );
}

/**
 * The size to draw at: inside the long edge, and inside the canvas ceiling.
 *
 * Aspect ratio is preserved, and the result is never zero — a 1px-tall
 * panorama scaled by area still has to have a height to draw into.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
  maxPixels: number = MAX_CANVAS_PIXELS
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) {
    throw new PhotoInputError("undecodable", "Image reported no dimensions");
  }

  const edgeScale = Math.min(1, maxEdge / Math.max(width, height));
  let w = width * edgeScale;
  let h = height * edgeScale;

  if (w * h > maxPixels) {
    const areaScale = Math.sqrt(maxPixels / (w * h));
    w *= areaScale;
    h *= areaScale;
  }

  // Rounding to nearest can put an area-limited size back OVER the ceiling by
  // a few dozen pixels, which is the whole point of the ceiling. Round down
  // in that case; a size that already fits keeps its exact rounding.
  const round = (value: number) => Math.max(1, Math.round(value));
  const rounded = { width: round(w), height: round(h) };
  if (rounded.width * rounded.height <= maxPixels) return rounded;
  return { width: Math.max(1, Math.floor(w)), height: Math.max(1, Math.floor(h)) };
}

/** A canvas that produced nothing — Safari's silent way of refusing. */
export function isUsableDataUrl(dataUrl: string | null | undefined): boolean {
  return !!dataUrl && dataUrl.startsWith("data:image/") && dataUrl.length > 512;
}

type Decoded = ImageBitmap | HTMLImageElement;

const decodedSize = (source: Decoded) => ({
  width: (source as ImageBitmap).width || (source as HTMLImageElement).naturalWidth,
  height: (source as ImageBitmap).height || (source as HTMLImageElement).naturalHeight,
});

/** The modern path: handles every format the browser knows, off the main thread. */
async function decodeWithBitmap(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap !== "function") {
    throw new PhotoInputError("undecodable", "createImageBitmap unavailable");
  }
  // Without this, a selfie taken in portrait arrives on its side: the camera
  // records the rotation as EXIF metadata rather than rotating the pixels,
  // and the default here is to ignore it.
  return createImageBitmap(blob, { imageOrientation: "from-image" });
}

/** The old path, kept for browsers whose createImageBitmap refuses a blob. */
function decodeWithImgElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new PhotoInputError("undecodable", "Image decoded to nothing"));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new PhotoInputError("undecodable", "Browser cannot decode this image"));
    };
    img.src = url;
  });
}

/** Last resort: transcode HEIC/HEIF to JPEG in JS, then decode that. */
async function transcodeHeic(file: Blob): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(converted) ? converted[0] : (converted as Blob);
}

async function decode(file: File): Promise<Decoded> {
  const attempts: Array<() => Promise<Decoded>> = looksLikeHeic(file)
    ? [
        // A file that announces itself as HEIC still goes to the browser
        // first — Safari decodes it natively and far faster than the JS
        // transcoder can.
        () => decodeWithBitmap(file),
        () => decodeWithImgElement(file),
        async () => decodeWithBitmap(await transcodeHeic(file)),
        async () => decodeWithImgElement(await transcodeHeic(file)),
      ]
    : [
        () => decodeWithBitmap(file),
        () => decodeWithImgElement(file),
        // Reached whenever the browser could not decode the bytes, whatever
        // the file claimed to be. A `.jpg` holding HEIF data lands here, and
        // used to be rethrown untried.
        async () => decodeWithBitmap(await transcodeHeic(file)),
      ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  console.warn("[imageInput] every decoder refused the file", {
    name: file.name,
    type: file.type,
    size: file.size,
    lastError,
  });
  throw new PhotoInputError("undecodable", "No decoder could read this image");
}

/**
 * A photo, decoded and re-encoded as a JPEG data URL the app can upload.
 *
 * Throws PhotoInputError with a reason the caller is expected to show. A
 * silent failure here is indistinguishable from a dead button, which is
 * exactly how this screen kept getting reported.
 */
export async function preparePhoto(
  file: File,
  maxEdge = 1024,
  quality = 0.85
): Promise<string> {
  const rejection = photoRejection(file);
  if (rejection) throw new PhotoInputError(rejection);

  const source = await decode(file);
  const { width: srcWidth, height: srcHeight } = decodedSize(source);
  const { width, height } = fitWithin(srcWidth, srcHeight, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoInputError("canvas-unavailable", "Canvas context unavailable");

  // A photo with transparency (a PNG selfie cut-out) becomes black on a JPEG
  // background unless something is painted underneath it first.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
  if ("close" in source) source.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (!isUsableDataUrl(dataUrl)) {
    throw new PhotoInputError("canvas-unavailable", "Canvas produced no image data");
  }
  return dataUrl;
}
