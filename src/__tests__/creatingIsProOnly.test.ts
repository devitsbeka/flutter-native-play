import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const chooser = read("src/components/team/CreateRoomPage.tsx");
const typeModal = read("src/components/social/CreateTriviaTypeModal.tsx");
const hub = read("src/pages/TeamV2.tsx");

/**
 * "to create trivia, collection, my trivia party - users should be pro.
 * show lock icon and clicking on it to create one - we should show become
 * pro page" (owner).
 *
 * The + on the Private tab already asked. Every other door into the same
 * three editors — the page that asks what to make, the play chooser's My
 * Trivia card, the team menu, the deep links a push or a mission arrives
 * with — opened them cold.
 *
 * PLAYING what you already made is NOT gated: a player whose PRO lapsed
 * keeps their own quizzes and still plays them solo, which is the rule
 * this screen already follows (ownTriviaIsSoloWithoutPro.test.ts).
 */
describe("the page that asks what to make", () => {
  it("padlocks all three, and a tap opens the PRO page instead of the editor", () => {
    expect(typeModal).toMatch(/const \{ isVip, requirePro, showProModal, setShowProModal \} = useProGating\(\);/);
    expect(typeModal).toMatch(/const createLocked = !isVip;/);
    expect(typeModal).toMatch(/if \(createLocked\) \{\s*\n\s*requirePro\(card\.feature, \(\) => undefined\);\s*\n\s*return;\s*\n\s*\}/);
    expect(typeModal).toMatch(/<ProPaywallModal isOpen=\{showProModal\} onClose=\{\(\) => setShowProModal\(false\)\} \/>/);
    expect(typeModal).toMatch(/\{createLocked && \(\s*\n\s*<span className="absolute right-\[12px\] top-\[12px\]/);
    expect(typeModal).toMatch(/<Lock className="h-\[15px\] w-\[15px\]" strokeWidth=\{2\.5\} \/>/);
    // Each card names the feature the paywall is asked about.
    expect(typeModal).toMatch(/feature: "trivia", onPick: \(\) => onSelectSingle\(\)/);
    expect(typeModal).toMatch(/feature: "collection", onPick: \(\) => onSelectCollection\(\)/);
  });

  it("but resuming a draft is left alone", () => {
    expect(typeModal).toMatch(/<DraftsList onResumeDraft=\{handleResumeDraft\} onClose=\{handleClose\} \/>/);
    expect(typeModal).not.toMatch(/requirePro\([^)]*handleResumeDraft/);
  });
});

describe("the play chooser's My Trivia card", () => {
  it("is padlocked only for somebody with nothing of their own", () => {
    expect(chooser).toMatch(/const createIsLocked = !isVip;/);
    expect(chooser).toMatch(/const myTriviasLocked = createIsLocked && hasOwnTrivias === false;/);
    expect(chooser).toMatch(/queryKey: \["has-own-trivias", user\?\.id\]/);
    expect(chooser).toMatch(/\{card\.key === "mytrivias" && myTriviasLocked && \(/);
    expect(chooser).toMatch(/src=\{lockRender\}/);
  });

  it("and leads to the PRO page rather than the editor", () => {
    expect(chooser).toMatch(/if \(key === "mytrivias" && myTriviasLocked\) return requirePro\("trivia", \(\) => launchMode\(key\)\);/);
    // ...including the tap that beat the answer to "do they have any?".
    expect(chooser).toMatch(/if \(!hasAny && !isVip\) \{[\s\S]*?requirePro\("trivia", \(\) => undefined\);/);
    // The create sub-menu on the same screen asks too.
    expect(chooser).toMatch(/if \(createIsLocked\) \{\s*\n\s*requirePro\(type === "collection" \? "collection" : "trivia", \(\) => undefined\);/);
  });
});

describe("every other door into the three editors", () => {
  it("goes through one gate in the hub", () => {
    expect(hub).toMatch(/const requireProToCreate = \(open: \(\) => void\) => \{\s*\n\s*if \(roomsLocked\) return setShowRoomsWall\(true\);\s*\n\s*open\(\);\s*\n\s*\};/);
    expect(hub).toMatch(/requireProToCreate\(\(\) => setShowCreateQuizModal\(true\)\);/);
    expect(hub).toMatch(/requireProToCreate\(\(\) => setShowCreateCollectionModal\(true\)\);/);
    expect(hub).toMatch(/requireProToCreate\(\(\) => setShowPersonalTriviaModal\(true\)\);/);
    expect(hub).toMatch(/requireProToCreate\(\(\) => \{\s*\n\s*setAutoOpenPersonalTrivia\(true\);/);
  });

  it("and a draft still opens, because it was already started", () => {
    expect(hub).toMatch(/if \(draftId\) \{\s*\n\s*setEditingDraftId\(draftId\);\s*\n\s*setShowCreateCollectionModal\(true\);\s*\n\s*return;\s*\n\s*\}/);
  });
});
