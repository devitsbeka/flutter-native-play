/**
 * The two decisions inside the avatar studio that have gone wrong before,
 * pulled out so they can be exercised without mounting the modal.
 *
 * Both failed SILENTLY when they were wrong — no crash, no error toast, just
 * work quietly disappearing or a button that would not do anything. That is
 * the class a person is least likely to notice and a test is most likely to
 * catch, which is why they live here.
 */

/** A generation row, narrowed to the fields these decisions depend on. */
export interface AvatarGenerationLike {
  avatar_url: string;
}

/** Full-body scenes are stored as `<user>/scene_<ts>.png`; portraits are not. */
export const isSceneUrl = (url: string | null | undefined): boolean =>
  !!url && url.includes("/scene_");

/** PRO members get the full cap per type; everyone else gets two. */
export const MAX_AVATAR_GENERATIONS = 5;
export const FREE_AVATAR_GENERATIONS = 2;

export interface AvatarQuota {
  maxPerType: number;
  sceneCount: number;
  portraitCount: number;
  isLimitReached: boolean;
  remainingGenerations: number;
}

/**
 * How much room is left to generate.
 *
 * Scenes and portraits count against SEPARATE caps. They used to share one,
 * so a few scenes silently blocked new avatars — the "+ new selfie" tile
 * simply stopped responding with no explanation. One full generation
 * produces both a scene and a portrait, so creating a new one needs room on
 * both sides.
 */
export function calculateAvatarQuota(
  generations: readonly AvatarGenerationLike[],
  isVip: boolean
): AvatarQuota {
  const maxPerType = isVip ? MAX_AVATAR_GENERATIONS : FREE_AVATAR_GENERATIONS;
  const sceneCount = generations.filter((g) => isSceneUrl(g.avatar_url)).length;
  const portraitCount = generations.length - sceneCount;

  return {
    maxPerType,
    sceneCount,
    portraitCount,
    isLimitReached: sceneCount >= maxPerType || portraitCount >= maxPerType,
    remainingGenerations: Math.max(
      0,
      Math.min(maxPerType - sceneCount, maxPerType - portraitCount)
    ),
  };
}

export interface SessionResetInput {
  /** Whether the modal is open on this render. */
  isOpen: boolean;
  /** Whether it was open on the previous render. */
  wasOpen: boolean;
  /** Whether a generation is running right now. */
  generationInFlight: boolean;
}

/**
 * Whether to clear the modal's transient state back to the gallery.
 *
 * Only ever on a real closed -> open transition, and never while a
 * generation is running. The effect that owns this used to depend on the
 * Supabase `user` OBJECT rather than `user.id`, so every session/token
 * refresh re-ran it and reset the step mid-flow — throwing the user out of
 * the upload/preview step and discarding the generated scene before it
 * could be saved. The symptom was "I tried another photo but still the same
 * scene, nothing changed", for any photo, with nothing logged anywhere.
 */
export const shouldResetSession = ({
  isOpen,
  wasOpen,
  generationInFlight,
}: SessionResetInput): boolean => isOpen && !wasOpen && !generationInFlight;

/**
 * Whether applying a scene still needs to upload it.
 *
 * Generation now stores the scene immediately, so applying it later only
 * flips which one is current. Re-uploading would create a second copy and a
 * second row for the same image.
 */
export const needsSceneUpload = (
  storedSceneUrl: string | null | undefined,
  urlToApply: string
): boolean => storedSceneUrl !== urlToApply;
