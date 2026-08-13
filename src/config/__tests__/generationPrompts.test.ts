import { describe, it, expect } from "vitest";
import { SCENE_AVATAR_PROMPT } from "@/config/sceneAvatarPrompt";
import { PORTRAIT_AVATAR_PROMPT } from "@/config/portraitAvatarPrompt";
import { CHARACTER_RENDER_STYLE } from "@/config/characterStyle";

// These prompts are the product. Nothing else in the codebase reads them, so
// a rule dropped during an edit fails silently and only shows up as a worse
// generation weeks later — which is exactly how the adult-only proportion
// rule turned every child into a small adult. Each check below stands for a
// visible defect somebody reported.

describe("scene prompt", () => {
  it("reads the age from the photo before building the body", () => {
    expect(SCENE_AVATAR_PROMPT).toMatch(/AGE — READ IT FROM THE PHOTO FIRST/);
    // Age has to reach the BODY. The old prompt described a child's face on
    // hardcoded adult proportions, which is what "small adult" looks like.
    expect(SCENE_AVATAR_PROMPT).toMatch(/head-to-body ratio/i);
  });

  it("carries proportions for every age band, not just adults", () => {
    for (const band of [/ADULT \(roughly 18\+\)/, /TEENAGER \(roughly 13-17\)/, /CHILD \(roughly 6-12\)/, /YOUNG CHILD \(roughly 3-5\)/]) {
      expect(SCENE_AVATAR_PROMPT, `missing band ${band}`).toMatch(band);
    }
  });

  it("never asks for adult proportions unconditionally", () => {
    // The regression to guard: a single global instruction to render an adult
    // body overrides whatever the age section says.
    expect(SCENE_AVATAR_PROMPT).not.toMatch(/Render a realistically proportioned adult body/);
    expect(SCENE_AVATAR_PROMPT).not.toMatch(/sculpt a full-size adult torso/);
  });

  it("lets a child's head be larger without calling it a mistake", () => {
    // A child IS about 6 heads tall against an adult's 7.5. Without this the
    // anti-bobblehead rule shrinks a correct child head into a small adult.
    expect(SCENE_AVATAR_PROMPT).toMatch(/larger than an adult's, which is correct/);
  });

  it("uses the fixed set as the scale reference for age", () => {
    // The furniture is constant, so relative size is what actually shows age.
    expect(SCENE_AVATAR_PROMPT).toMatch(/resize the character against the furniture/);
  });

  it("requires the sneakers to be mirrored", () => {
    // The reported defect: both feet rendered as right shoes.
    expect(SCENE_AVATAR_PROMPT).toMatch(/MIRROR IMAGES/);
    expect(SCENE_AVATAR_PROMPT).toMatch(/Never render two right shoes or two left shoes/);
    expect(SCENE_AVATAR_PROMPT).toMatch(/big toe is on the INNER side/i);
  });

  it("pins down the other paired parts that go wrong", () => {
    expect(SCENE_AVATAR_PROMPT).toMatch(/five fingers on each hand/i);
    expect(SCENE_AVATAR_PROMPT).toMatch(/one handle, on one side only/i);
    expect(SCENE_AVATAR_PROMPT).toMatch(/bean bag visibly compresses/i);
  });

  it("keeps the set, the camera and the safe area fixed", () => {
    // Everything above is about the character; none of it may loosen the
    // branded set that makes every player's homepage one world.
    expect(SCENE_AVATAR_PROMPT).toMatch(/THE SCENE IS FIXED — REPRODUCE IT EXACTLY/);
    expect(SCENE_AVATAR_PROMPT).toMatch(/CAMERA AND ZOOM — FIXED/);
    expect(SCENE_AVATAR_PROMPT).toMatch(/SAFE AREA — CRITICAL/);
  });

  it("embeds the shared render style so the two generations cannot drift", () => {
    expect(SCENE_AVATAR_PROMPT).toContain(CHARACTER_RENDER_STYLE);
    expect(PORTRAIT_AVATAR_PROMPT).toContain(CHARACTER_RENDER_STYLE);
  });
});

describe("portrait prompt", () => {
  it("holds the character at the age the scene showed", () => {
    expect(PORTRAIT_AVATAR_PROMPT).toMatch(/AGE — MATCH THE REFERENCE EXACTLY/);
    expect(PORTRAIT_AVATAR_PROMPT).toMatch(/Never age the character up or down/);
  });
});

describe("shared render style", () => {
  it("asks for real geometry for the person's own age", () => {
    expect(CHARACTER_RENDER_STYLE).toMatch(/FOR THIS PERSON'S ACTUAL AGE/);
    expect(CHARACTER_RENDER_STYLE).toMatch(/Never age the person up or down/);
  });

  it("still forbids the exaggerations, without forbidding a child's real head", () => {
    expect(CHARACTER_RENDER_STYLE).toMatch(/no chibi, no bobblehead/);
    expect(CHARACTER_RENDER_STYLE).toMatch(/accuracy, not exaggeration/);
  });
});
