import { describe, it, expect } from "vitest";
import {
  FREE_AVATAR_GENERATIONS,
  MAX_AVATAR_GENERATIONS,
  calculateAvatarQuota,
  isSceneUrl,
  needsSceneUpload,
  shouldResetSession,
} from "@/utils/avatarStudio";

const scene = (n: number) => ({ avatar_url: `https://cdn/u1/scene_${n}.png` });
const portrait = (n: number) => ({ avatar_url: `https://cdn/u1/portrait_${n}.png` });

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

describe("calculateAvatarQuota", () => {
  it("gives a new PRO member room for five of each", () => {
    const quota = calculateAvatarQuota([], true);
    expect(quota.maxPerType).toBe(MAX_AVATAR_GENERATIONS);
    expect(quota.isLimitReached).toBe(false);
    expect(quota.remainingGenerations).toBe(5);
  });

  it("gives a free member room for two of each", () => {
    const quota = calculateAvatarQuota([], false);
    expect(quota.maxPerType).toBe(FREE_AVATAR_GENERATIONS);
    expect(quota.remainingGenerations).toBe(2);
  });

  it("counts scenes and portraits separately", () => {
    const quota = calculateAvatarQuota([scene(1), scene(2), portrait(1)], true);
    expect(quota.sceneCount).toBe(2);
    expect(quota.portraitCount).toBe(1);
  });

  it("does not let a full scene shelf block new portraits from counting", () => {
    // The bug: scenes and portraits shared one cap, so five scenes silently
    // blocked every new avatar. The "+ new selfie" tile just stopped
    // responding, with nothing logged and no message shown.
    const fiveScenes = [scene(1), scene(2), scene(3), scene(4), scene(5)];
    const quota = calculateAvatarQuota(fiveScenes, true);
    expect(quota.sceneCount).toBe(5);
    expect(quota.portraitCount).toBe(0);
  });

  it("blocks generation once the scene shelf is full", () => {
    const scenesFull = calculateAvatarQuota([scene(1), scene(2)], false);
    expect(scenesFull.isLimitReached).toBe(true);
    expect(scenesFull.remainingGenerations).toBe(0);
  });

  it("does not let piled-up portraits block a new scene", () => {
    // THE regression. Portraits are minted in the background every time a
    // scene is applied — nobody asks for them. Counting them into the gate
    // meant ordinary scene-switching filled the portrait shelf and killed
    // the "+ new scene" tile, on an account with scene slots to spare. The
    // tile just stopped opening a file picker, and said nothing.
    const quota = calculateAvatarQuota(
      [scene(1), portrait(1), portrait(2), portrait(3), portrait(4)],
      false
    );
    expect(quota.portraitCount).toBe(4);
    expect(quota.isLimitReached).toBe(false);
    expect(quota.remainingGenerations).toBe(1);
  });

  it("reports the remaining count from the scene shelf", () => {
    const quota = calculateAvatarQuota([scene(1), scene(2), scene(3), portrait(1)], true);
    expect(quota.remainingGenerations).toBe(2);
  });

  it("never reports a negative remaining count", () => {
    const overfull = [scene(1), scene(2), scene(3), scene(4), scene(5), scene(6), scene(7)];
    const quota = calculateAvatarQuota(overfull, false);
    expect(quota.remainingGenerations).toBe(0);
    expect(quota.isLimitReached).toBe(true);
  });

  it("gives a PRO member strictly more room than a free member", () => {
    const shelf = [scene(1), scene(2), portrait(1), portrait(2)];
    expect(calculateAvatarQuota(shelf, false).isLimitReached).toBe(true);
    expect(calculateAvatarQuota(shelf, true).isLimitReached).toBe(false);
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
