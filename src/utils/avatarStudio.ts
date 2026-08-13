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

/**
 * What a stored generation is, read from its filename.
 *
 * Three things live in the same table and the same bucket, and only the path
 * prefix tells them apart:
 *
 *   `<user>/scene_<ts>.png`     a full-body scene, asked for from "my scenes"
 *   `<user>/portrait_<ts>.png`  a circle avatar, asked for from "new avatar"
 *   `<user>/avatar_<ts>.png`    a circle avatar the app MINTED ITSELF
 *
 * The third one matters. Applying a scene derives its matching portrait in
 * the background, without anybody requesting it — so it must not spend
 * anyone's budget. Older accounts have a pile of these under the `avatar_`
 * name, which is why user-requested portraits took the new `portrait_` name
 * rather than the reverse: nothing already stored can be mistaken for a
 * generation the person chose to spend.
 */
export type GenerationKind = "scene" | "avatar";

export const isSceneUrl = (url: string | null | undefined): boolean =>
  !!url && url.includes("/scene_");

/** A portrait the PERSON asked for, as opposed to one derived from a scene. */
export const isRequestedPortraitUrl = (url: string | null | undefined): boolean =>
  !!url && url.includes("/portrait_");

/**
 * The budgets, per kind.
 *
 * One free generation of each kind, five of each with PRO, and past that a
 * generation costs a gem — so the shelf being full is a price, not a wall.
 */
export const MAX_AVATAR_GENERATIONS = 5;
export const FREE_AVATAR_GENERATIONS = 1;
export const EXTRA_GENERATION_GEM_COST = 1;

export interface KindQuota {
  /** Included generations of this kind — 1 free, 5 with PRO. */
  max: number;
  /** How many of this kind the person has asked for. */
  used: number;
  /** Included generations still to spend. */
  remaining: number;
  /** Included allowance is gone — the next one costs gems. */
  isLimitReached: boolean;
}

export interface AvatarQuota {
  maxPerType: number;
  scene: KindQuota;
  avatar: KindQuota;
  /** Generations the app derived on its own. Displayed, never charged for. */
  derivedPortraitCount: number;
}

/**
 * How much room is left to generate, per kind.
 *
 * Scenes and avatars have SEPARATE budgets and always have — they used to
 * share one, so a few scenes silently blocked new avatars and the "+ new
 * selfie" tile simply stopped responding with no explanation. What changed
 * is that the avatar budget now counts avatars: both tiles used to be gated
 * on the scene shelf alone, so one scene closed the avatar tile too.
 *
 * Derived portraits are counted into neither. Gating on them resurrected the
 * original bug from the other side — enough background portraits and the
 * tile went dead while the shelf it displayed sat half empty.
 */
export function calculateAvatarQuota(
  generations: readonly AvatarGenerationLike[],
  isVip: boolean
): AvatarQuota {
  const maxPerType = isVip ? MAX_AVATAR_GENERATIONS : FREE_AVATAR_GENERATIONS;

  const countOf = (used: number): KindQuota => ({
    max: maxPerType,
    used,
    remaining: Math.max(0, maxPerType - used),
    isLimitReached: used >= maxPerType,
  });

  const sceneCount = generations.filter((g) => isSceneUrl(g.avatar_url)).length;
  const requestedPortraits = generations.filter((g) =>
    isRequestedPortraitUrl(g.avatar_url)
  ).length;

  return {
    maxPerType,
    scene: countOf(sceneCount),
    avatar: countOf(requestedPortraits),
    derivedPortraitCount: generations.length - sceneCount - requestedPortraits,
  };
}

/**
 * What tapping "create" should do, given the budget and the wallet.
 *
 * Returned rather than decided inline so the modal never has to guess: every
 * refusal here carries a reason the UI is obliged to show. A tile that can't
 * act and won't say why is the exact bug this screen keeps producing.
 */
export type GenerateDecision =
  | { action: "generate" }
  | { action: "charge"; gems: number }
  | { action: "blocked"; reason: "insufficient-gems"; gems: number };

export function decideGeneration(
  quota: KindQuota,
  gemBalance: number,
  cost: number = EXTRA_GENERATION_GEM_COST
): GenerateDecision {
  if (!quota.isLimitReached) return { action: "generate" };
  if (gemBalance >= cost) return { action: "charge", gems: cost };
  return { action: "blocked", reason: "insufficient-gems", gems: cost };
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
