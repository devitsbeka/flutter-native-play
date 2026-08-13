import { t } from "@/lib/i18n";
import { PhotoInputError, type PhotoFailure } from "@/utils/imageInput";

/**
 * The sentence to show when a photo will not load, plus what the file was.
 *
 * Kept apart from the decoding itself so the util stays testable without a
 * locale, and so both avatar modals say the same thing. "Couldn't process
 * the image" was the only message any of these produced, which told a person
 * nothing about whether to try a different photo, a smaller one, or a
 * different format — and told us nothing either.
 */
const MESSAGE_KEY: Record<PhotoFailure, string> = {
  "not-an-image": "errors.selectImageFile",
  "too-large": "errors.imageTooLarge",
  unreadable: "errors.photoNotDownloaded",
  undecodable: "errors.photoFormatUnsupported",
  "canvas-unavailable": "errors.photoTooBigToProcess",
};

export interface PhotoError {
  message: string;
  /** What the file actually was. Shown small, under the message. */
  diagnosis?: string;
}

export function photoError(error: unknown): PhotoError {
  const known = error instanceof PhotoInputError ? error : null;
  const reason: PhotoFailure = known?.reason ?? "undecodable";
  return { message: t(MESSAGE_KEY[reason]), diagnosis: known?.diagnosis };
}

/** Message only, for callers with nowhere to put the detail. */
export function photoErrorMessage(error: unknown): string {
  return photoError(error).message;
}
