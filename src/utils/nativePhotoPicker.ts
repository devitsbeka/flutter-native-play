import { Capacitor } from "@capacitor/core";

/**
 * The phone's own photo picker, used when the app runs natively.
 *
 * Inside the native app there is no reason to decode HEIC in JavaScript at
 * all: iOS and Android hand back a JPEG from their own image pipeline, at
 * whatever size we ask for, already rotated upright. That is the one path
 * that cannot fail on a camera format, because the platform that wrote the
 * file is the one reading it.
 *
 * The browser build never reaches this — `isNativePhotoPickerAvailable()`
 * is false there and the file input handles it, decoders and all.
 */
export function isNativePhotoPickerAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export interface NativePhotoResult {
  dataUrl: string | null;
  /** The person closed the picker without choosing. Not an error. */
  cancelled: boolean;
}

const CANCELLED = /cancel/i;

export async function pickPhotoFromLibrary(maxEdge = 1024): Promise<NativePhotoResult> {
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

  try {
    const permissions = await Camera.checkPermissions();
    if (permissions.photos !== "granted") {
      const requested = await Camera.requestPermissions({ permissions: ["photos"] });
      if (requested.photos !== "granted") {
        throw new Error("Photo library permission denied");
      }
    }

    const photo = await Camera.getPhoto({
      quality: 90,
      // No crop UI: the avatar pipeline frames the face itself, and an extra
      // editing step before the real preview is a step to abandon.
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      width: maxEdge,
      // The plugin applies EXIF rotation rather than passing it along, which
      // is what puts a portrait selfie upright.
      correctOrientation: true,
    });

    return { dataUrl: photo.dataUrl ?? null, cancelled: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (CANCELLED.test(message)) return { dataUrl: null, cancelled: true };
    throw error;
  }
}
