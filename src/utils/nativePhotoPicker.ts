import { Capacitor } from "@capacitor/core";

/**
 * The phone's own photo picker and camera, used when the app runs natively.
 *
 * Inside the native app there is no reason to decode HEIC in JavaScript at
 * all: iOS and Android hand back a JPEG from their own image pipeline, at
 * whatever size we ask for, already rotated upright. That is the one path
 * that cannot fail on a camera format, because the platform that wrote the
 * file is the one reading it.
 *
 * The browser build never reaches this — `isNativePhotoPickerAvailable()`
 * is false there and the file input (or `getUserMedia`) handles it.
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

type Permission = "photos" | "camera";

async function ensurePermission(
  Camera: typeof import("@capacitor/camera").Camera,
  permission: Permission,
): Promise<void> {
  const current = await Camera.checkPermissions();
  if (current[permission] === "granted") return;

  const requested = await Camera.requestPermissions({ permissions: [permission] });
  if (requested[permission] !== "granted") {
    throw new Error(`${permission} permission denied`);
  }
}

/**
 * A cancel is a decision, not a failure.
 *
 * Both plugins report it by throwing with "cancelled"/"canceled" in the
 * message, which is indistinguishable from a real error to any caller that
 * only looks at whether the promise rejected.
 */
function asResult(error: unknown): NativePhotoResult {
  const message = error instanceof Error ? error.message : String(error);
  if (CANCELLED.test(message)) return { dataUrl: null, cancelled: true };
  throw error;
}

export async function pickPhotoFromLibrary(maxEdge = 1024): Promise<NativePhotoResult> {
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

  try {
    await ensurePermission(Camera, "photos");

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
    return asResult(error);
  }
}

/**
 * Take a photo with the system camera.
 *
 * The avatar flows used to open the camera *inside the webview*, with
 * `navigator.mediaDevices.getUserMedia` and a `<video>` element. That works
 * in every browser and is not reliable inside a WKWebView: `getUserMedia`
 * there is gated behind app-bound domains (`WKAppBoundDomains` in Info.plist
 * plus `limitsNavigationsToAppBoundDomains`), which this app does not declare
 * and should not have to — declaring it would cap the app at ten navigable
 * domains for the sake of one screen.
 *
 * The plugin route has none of that: it is the system camera UI, it asks for
 * permission with the string already in Info.plist, and it hands back an
 * upright JPEG. The webview never touches a media stream.
 *
 * Front camera by default, because every caller here is taking a selfie for
 * an avatar. `allowEditing` stays off for the same reason as the library
 * picker above.
 */
export async function takePhotoWithCamera(maxEdge = 1024): Promise<NativePhotoResult> {
  const { Camera, CameraResultType, CameraSource, CameraDirection } = await import(
    "@capacitor/camera"
  );

  try {
    await ensurePermission(Camera, "camera");

    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      direction: CameraDirection.Front,
      width: maxEdge,
      correctOrientation: true,
    });

    return { dataUrl: photo.dataUrl ?? null, cancelled: false };
  } catch (error) {
    return asResult(error);
  }
}
