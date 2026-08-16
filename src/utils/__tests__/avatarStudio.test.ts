import { describe, it, expect } from "vitest";
import {
  EXTRA_GENERATION_GEM_COST,
  FREE_AVATAR_GENERATIONS,
  MAX_AVATAR_GENERATIONS,
  calculateAvatarQuota,
  decideGeneration,
  isRequestedPortraitUrl,
  isSceneUrl,
  needsSceneUpload,
  shouldResetSession,
} from "@/utils/avatarStudio";

const scene = (n: number) => ({ avatar_url: `https://cdn/u1/scene_${n}.png` });
/** A portrait the person asked for. */
const portrait = (n: number) => ({ avatar_url: `https://cdn/u1/portrait_${n}.png` });
/** A portrait the app minted itself when a scene was applied. */
const derived = (n: number) => ({ avatar_url: `https://cdn/u1/avatar_${n}.png` });

describe("isSceneUrl", () => {
  it("recognises stored scenes by their filename", () => {
    expect(isSceneUrl("https://cdn/abc/scene_1717171.png")).toBe(true);
  });

  it("does not mistake a portrait for a scene", () => {
    expect(isSceneUrl("https://cdn/abc/portrait_1717171.png")).toBe(false);
    expect(isSceneUrl("https://cdn/abc/temp_1717171.jpg")).toBe(false);
  });

  it("handles missing urls without throwing", () => {
    expect(isSceneUrl(null)).toBe(false);
    expect(isSceneUrl(undefined)).toBe(false);
    expect(isSceneUrl("")).toBe(false);
  });
});

describe("isRequestedPortraitUrl", () => {
  it("recognises a portrait the person asked for", () => {
    expect(isRequestedPortraitUrl("https://cdn/u1/portrait_1717.png")).toBe(true);
  });

  it("does not charge for a portrait the app derived from a scene", () => {
    // Every account made before this split has a pile of these. Reading one
    // as a requested generation would bill people for work they never asked
    // for, and close the tile on accounts that had never used it.
    expect(isRequestedPortraitUrl("https://cdn/u1/avatar_1717.png")).toBe(false);
    expect(isRequestedPortraitUrl("https://cdn/u1/scene_1717.png")).toBe(false);
    expect(isRequestedPortraitUrl(null)).toBe(false);
  });
});

describe("calculateAvatarQuota", () => {
  it("gives a new PRO member room for five of each", () => {
    const quota = calculateAvatarQuota([], true);
    expect(quota.maxPerType).toBe(MAX_AVATAR_GENERATIONS);
    expect(quota.scene.remaining).toBe(5);
    expect(quota.avatar.remaining).toBe(5);
    expect(quota.scene.isLimitReached).toBe(false);
  });

  it("gives a free member one of each", () => {
    const quota = calculateAvatarQuota([], false);
    expect(quota.maxPerType).toBe(FREE_AVATAR_GENERATIONS);
    expect(quota.scene.remaining).toBe(1);
    expect(quota.avatar.remaining).toBe(1);
  });

  it("counts scenes and avatars against their own budgets", () => {
    const quota = calculateAvatarQuota([scene(1), scene(2), portrait(1)], true);
    expect(quota.scene.used).toBe(2);
    expect(quota.avatar.used).toBe(1);
  });

  it("does not let a full scene shelf close the avatar tiles", () => {
    // The bug: both tiles were gated on the scene count, so one scene used
    // up the avatar tile too. It simply stopped responding, with nothing
    // logged and no message shown.
    const quota = calculateAvatarQuota([scene(1)], false);
    expect(quota.scene.isLimitReached).toBe(true);
    expect(quota.avatar.isLimitReached).toBe(false);
    expect(quota.avatar.remaining).toBe(1);
  });

  it("does not let piled-up derived portraits block anything", () => {
    // THE regression. Applying a scene mints its portrait in the background
    // — nobody asks for it. Counting those into a gate meant ordinary
    // scene-switching filled a shelf and killed the tile, on an account with
    // slots to spare. Derived portraits are stored under `avatar_`; only
    // `portrait_` rows were actually requested.
    const quota = calculateAvatarQuota(
      [derived(1), derived(2), derived(3), derived(4), derived(5)],
      false
    );
    expect(quota.derivedPortraitCount).toBe(5);
    expect(quota.avatar.isLimitReached).toBe(false);
    expect(quota.scene.isLimitReached).toBe(false);
  });

  it("never reports a negative remaining count", () => {
    const overfull = [scene(1), scene(2), scene(3), scene(4), scene(5), scene(6), scene(7)];
    const quota = calculateAvatarQuota(overfull, false);
    expect(quota.scene.remaining).toBe(0);
    expect(quota.scene.isLimitReached).toBe(true);
  });

  it("gives a PRO member strictly more room than a free member", () => {
    const shelf = [scene(1), scene(2), portrait(1), portrait(2)];
    expect(calculateAvatarQuota(shelf, false).scene.isLimitReached).toBe(true);
    expect(calculateAvatarQuota(shelf, true).scene.isLimitReached).toBe(false);
  });
});

describe("decideGeneration", () => {
  const quotaOf = (used: number, isVip = false) =>
    calculateAvatarQuota(Array.from({ length: used }, (_, i) => scene(i)), isVip).scene;

  it("generates for free while the allowance lasts", () => {
    expect(decideGeneration(quotaOf(0), 0)).toEqual({ action: "generate" });
  });

  it("charges a gem for the one past the allowance", () => {
    expect(decideGeneration(quotaOf(1), 3)).toEqual({
      action: "charge",
      gems: EXTRA_GENERATION_GEM_COST,
    });
  });

  it("charges the same single gem the sixth time for a PRO member", () => {
    expect(decideGeneration(quotaOf(5, true), 1)).toEqual({
      action: "charge",
      gems: EXTRA_GENERATION_GEM_COST,
    });
  });

  it("blocks with a reason when the gems are not there", () => {
    // The point of the reason: the caller has something to SAY. A refusal
    // with nothing to show for it is what reads as a broken button.
    expect(decideGeneration(quotaOf(1), 0)).toEqual({
      action: "blocked",
      reason: "insufficient-gems",
      gems: EXTRA_GENERATION_GEM_COST,
    });
  });

  it("spends exactly one gem, never the balance", () => {
    const decision = decideGeneration(quotaOf(1), 500);
    expect(decision).toEqual({ action: "charge", gems: 1 });
  });
});

describe("shouldResetSession", () => {
  it("resets when the modal genuinely opens", () => {
    expect(
      shouldResetSession({ isOpen: true, wasOpen: false, generationInFlight: false })
    ).toBe(true);
  });

  it("does not reset on a re-render while already open", () => {
    // THE regression. The effect that owns this depended on the Supabase
    // `user` object rather than `user.id`, so every token refresh re-ran it
    // and threw the user back to the gallery mid-flow, discarding the
    // generated scene before it could be saved. Nothing crashed and nothing
    // was logged — the only symptom was "nothing changed", for any photo.
    expect(
      shouldResetSession({ isOpen: true, wasOpen: true, generationInFlight: false })
    ).toBe(false);
  });

  it("never resets while a generation is running", () => {
    // Reopening the modal after minimising it to the progress chip must not
    // throw away the work in flight.
    expect(
      shouldResetSession({ isOpen: true, wasOpen: false, generationInFlight: true })
    ).toBe(false);
    expect(
      shouldResetSession({ isOpen: true, wasOpen: true, generationInFlight: true })
    ).toBe(false);
  });

  it("does not reset on the reopen that delivers a finished generation", () => {
    // The modal now steps out of the way once a generation is under way and
    // the shell reopens it when the result lands. That reopen is a genuine
    // closed -> open transition with nothing in flight any more — the two
    // conditions this used to reset on — so judged on those alone it would
    // put the gallery up over the preview and the generation would be on
    // screen for no frames at all.
    expect(
      shouldResetSession({
        isOpen: true,
        wasOpen: false,
        generationInFlight: false,
        awaitingPreview: true,
      })
    ).toBe(false);
  });

  it("does not reset while closed", () => {
    for (const wasOpen of [true, false]) {
      for (const generationInFlight of [true, false]) {
        expect(
          shouldResetSession({ isOpen: false, wasOpen, generationInFlight }),
          `wasOpen=${wasOpen} inFlight=${generationInFlight}`
        ).toBe(false);
      }
    }
  });

  it("resets exactly once across an open, re-render, close, reopen cycle", () => {
    // Walk the real lifecycle the way the effect sees it.
    const frames = [
      { isOpen: true, generationInFlight: false }, // opened
      { isOpen: true, generationInFlight: false }, // token refresh re-render
      { isOpen: true, generationInFlight: false }, // another re-render
      { isOpen: false, generationInFlight: false }, // closed
      { isOpen: true, generationInFlight: false }, // reopened
    ];

    let wasOpen = false;
    const resets: number[] = [];
    frames.forEach((frame, i) => {
      if (shouldResetSession({ ...frame, wasOpen })) resets.push(i);
      wasOpen = frame.isOpen;
    });

    expect(resets).toEqual([0, 4]);
  });

  it("skips the reset when the modal reopens onto a running generation", () => {
    const frames = [
      { isOpen: true, generationInFlight: false }, // opened
      { isOpen: true, generationInFlight: true }, // generation started
      { isOpen: false, generationInFlight: true }, // minimised to the chip
      { isOpen: true, generationInFlight: true }, // reopened, still running
      { isOpen: true, generationInFlight: false }, // finished, showing preview
    ];

    let wasOpen = false;
    const resets: number[] = [];
    frames.forEach((frame, i) => {
      if (shouldResetSession({ ...frame, wasOpen })) resets.push(i);
      wasOpen = frame.isOpen;
    });

    // Only the very first open resets; the reopen at index 3 must not.
    expect(resets).toEqual([0]);
  });
});

describe("needsSceneUpload", () => {
  it("skips the upload when generation already stored this scene", () => {
    const url = "https://cdn/u1/scene_100.png";
    expect(needsSceneUpload(url, url)).toBe(false);
  });

  it("uploads when applying a scene this session did not generate", () => {
    expect(needsSceneUpload("https://cdn/u1/scene_100.png", "https://cdn/u1/scene_200.png")).toBe(
      true
    );
  });

  it("uploads when nothing was stored yet", () => {
    expect(needsSceneUpload(null, "https://cdn/u1/scene_100.png")).toBe(true);
    expect(needsSceneUpload(undefined, "https://cdn/u1/scene_100.png")).toBe(true);
  });
});
