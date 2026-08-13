import { t } from "@/lib/i18n";
import { PhotoInputError, type PhotoFailure } from "@/utils/imageInput";

/**
 * The sentence to show when a photo will not load.
 *
 * Kept apart from the decoding itself so the util stays testable without a
 * locale, and so both avatar modals say the same thing. "Couldn't process
 * the image" was the only message any of these produced, which told a person
 * nothing about whether to try a different photo, a smaller one, or a
 * different format.
 */
const MESSAGE_KEY: Record<PhotoFailure, string> = {
  "not-an-image": "errors.selectImageFile",
  "too-large": "errors.imageTooLarge",
  undecodable: "errors.photoFormatUnsupported",
  "canvas-unavailable": "errors.photoTooBigToProcess",
};

export function photoErrorMessage(error: unknown): string {
  const reason: PhotoFailure =
    error instanceof PhotoInputError ? error.reason : "undecodable";
  return t(MESSAGE_KEY[reason]);
}
