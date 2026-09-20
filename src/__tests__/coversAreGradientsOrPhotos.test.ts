import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COVER_GRADIENTS, randomCoverGradient } from "@/config/coverGradients";

/**
 * A trivia cover is a gradient or a photo. Nothing generates one.
 *
 * Reaching the last step of CreateQuizModal fired `generate-cover-image` at
 * a model and sat on a spinner; CoverImagePicker offered three more goes,
 * kept the results in `cover_image_generations`, and showed them back as a
 * grid. All of that for decoration — and a gradient was already underneath
 * as the fallback for when it failed (owner: "use random background
 * gradients, or upload photo option, no generations for trivia covers").
 *
 * So the fallback is the feature: a random gradient to start, a shuffle and
 * a full set of swatches to change it, and the camera roll for a photo.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const picker = read("src/components/social/CoverImagePicker.tsx");
const editor = read("src/components/social/GameStyleQuestionEditor.tsx");
const quizModal = read("src/components/social/CreateQuizModal.tsx");
const generation = read("src/contexts/BackgroundGenerationContext.tsx");

/** Every file that used to carry its own copy of the list. */
const ONCE_HAD_A_COPY = [
  "src/components/social/CoverImagePicker.tsx",
  "src/components/social/EditQuizModal.tsx",
  "src/components/social/AddRoundToCollectionModal.tsx",
  "src/components/social/CreateQuizModal.tsx",
  "src/components/social/CreateCollectionModal.tsx",
  "src/contexts/TriviaCreationContext.tsx",
];

describe("one list of gradients", () => {
  it("is the only one, because six copies had already drifted into four", () => {
    // CreateCollectionModal's fifth gradient ended #8B5B95 where every
    // other copy had #8B5CF6, and the lists ran 16, 10, 6, 6.
    for (const p of ONCE_HAD_A_COPY) {
      expect(read(p), p).not.toMatch(/const COVER_GRADIENTS = \[/);
      expect(read(p), p).toMatch(/from "@\/config\/coverGradients"/);
    }
  });

  it("holds the superset, so nothing lost a backdrop in the merge", () => {
    expect(COVER_GRADIENTS).toHaveLength(16);
    expect(new Set(COVER_GRADIENTS).size).toBe(16);
    for (const g of COVER_GRADIENTS) expect(g).toMatch(/gradient\(/);
    // The typo'd one is gone rather than merged in beside its twin.
    expect(COVER_GRADIENTS.join("\n")).not.toContain("#8B5B95");
  });

  it("picks one at random, and never off the end", () => {
    expect(randomCoverGradient(() => 0)).toBe(COVER_GRADIENTS[0]);
    // Math.random never returns 1; a test stub can, and an unclamped index
    // would hand back undefined, which renders as no background at all.
    expect(randomCoverGradient(() => 1)).toBe(COVER_GRADIENTS[COVER_GRADIENTS.length - 1]);
    for (let i = 0; i < 50; i++) {
      expect(COVER_GRADIENTS).toContain(randomCoverGradient());
    }
  });

  it("gives every new cover its own, rather than everyone the first one", () => {
    // These seeded useState with COVER_GRADIENTS[0]; only their reset paths
    // were random, so a new trivia looked like every other new trivia.
    for (const p of [
      "src/components/social/CreateQuizModal.tsx",
      "src/components/social/CreateCollectionModal.tsx",
      "src/components/social/AddRoundToCollectionModal.tsx",
    ]) {
      expect(read(p), p).toMatch(/useState\(\(\) => randomCoverGradient\(\)\)/);
      expect(read(p), p).not.toMatch(/useState\(COVER_GRADIENTS\[0\]\)/);
    }
  });
});

describe("the cover picker", () => {
  it("offers a photo, a shuffle, and the whole set to choose from", () => {
    expect(picker).toMatch(/<Upload className="w-4 h-4" \/>/);
    expect(picker).toMatch(/onClick=\{\(\) => pickGradient\(randomCoverGradient\(\)\)\}/);
    expect(picker).toMatch(/\{COVER_GRADIENTS\.map\(\(gradient\) => \{/);
    expect(picker).toMatch(/onClick=\{\(\) => pickGradient\(gradient\)\}/);
  });

  it("finally does something with onGradientChange, which nothing ever called", () => {
    // The prop existed from the start; there was no way to choose a
    // gradient at all, only to accept whichever one seeded the modal.
    expect(picker).toMatch(/const pickGradient = \(gradient: string\) => \{\s*\n\s*onGradientChange\(gradient\);/);
  });

  it("clears the photo when a gradient is chosen, since they share the slot", () => {
    expect(picker).toMatch(/if \(currentImage\) onImageChange\(null\);/);
  });

  it("and asks no model for a picture", () => {
    expect(picker).not.toMatch(/handleGenerateAI/);
    expect(picker).not.toMatch(/startCoverGeneration|useBackgroundGeneration/);
    // The query, not the name: the comment at the top of the file says
    // what this picker used to do, and should keep saying it.
    expect(picker).not.toMatch(/\.from\("cover_image_generations"\)/);
    expect(picker).not.toMatch(/previousGenerations|MAX_GENERATIONS/);
  });

  it("but keeps the content screen on an uploaded photo", () => {
    // Somebody's camera roll on a public cover is guideline 1.2, and that
    // check is a screen, not a generation. It still fails open.
    expect(picker).toMatch(/invoke\("validate-cover-image"/);
  });
});

describe("the creation flow", () => {
  it("no longer fires a generation on reaching the cover step", () => {
    expect(quizModal).not.toMatch(/startCoverGeneration/);
    expect(quizModal).not.toMatch(/handleGenerateCover/);
    expect(quizModal).not.toMatch(/coverGenerationCount|isGeneratingCoverLocal/);
  });

  it("and its refresh button rolls the gradient instead", () => {
    expect(quizModal).toMatch(/const handleShuffleGradient = \(\) => setSelectedGradient\(randomCoverGradient\(\)\);/);
    expect(quizModal).toMatch(/onShuffleGradient=\{handleShuffleGradient\}/);
    // Both call sites — the wizard step and the fullscreen edit mode.
    expect(quizModal.match(/onShuffleGradient=\{handleShuffleGradient\}/g)).toHaveLength(2);
  });

  it("so the editor's cover footer has nothing left to wait for", () => {
    expect(editor).toMatch(/onShuffleGradient\?: \(\) => void;/);
    expect(editor).not.toMatch(/isGeneratingCover|coverGenerationCount/);
    expect(editor).not.toMatch(/disabled=\{isGeneratingCover/);
  });
});

describe("the generation context", () => {
  it("has no cover branch left to call", () => {
    expect(generation).not.toMatch(/startCoverGeneration/);
    expect(generation).not.toMatch(/invoke\("generate-cover-image"/);
  });

  it("but still reads back the notifications the old path wrote", () => {
    // Those rows are in the table and predate this change.
    expect(generation).toMatch(/export type GenerationType = "avatar" \| "cover";/);
  });

  it("and avatar generation is untouched — a different feature", () => {
    expect(generation).toMatch(/const startAvatarGeneration = useCallback\(/);
  });
});

describe("the words for it", () => {
  it("exist in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/shuffleGradientBtn: "[^"]+",/);
      expect(locale, lang).toMatch(/coverBackgroundLabel: "[^"]+",/);
    }
  });
});
