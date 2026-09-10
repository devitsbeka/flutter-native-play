import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");

describe("the TV's picture question wears the quiz's treatment", () => {
  // The TV drew the picture object-cover across half the screen: a giant,
  // cropped brand mark with no tile reveal (owner: "giant image of logos,
  // cropped and we don't show pixels like we do on default games ... make
  // sure image is compact well displayed not cropped").
  const tv = read("src/components/tv/TVQuestionScreenV4.tsx");

  it("resolves the round's treatment from the stored category name", () => {
    expect(tv).toMatch(/const idForCategory = useCategoryIdByName\(\);/);
    expect(tv).toMatch(/const imageTreatment = imageTreatmentFor\(idForCategory\(categoryName\)\);/);
  });

  it("a logo sits on white, contained and capped, and opens tile by tile as the clock runs", () => {
    expect(tv).toMatch(/imageTreatment\.inset \? "bg-white" : "bg-gray-100",/);
    expect(tv).toMatch(/<span className="relative inline-flex max-h-\[72%\] max-w-\[80%\]">/);
    expect(tv).toMatch(/className=\{cn\("block max-h-full max-w-full w-auto h-auto object-contain", !tvImageLoaded && "opacity-0"\)\}/);
    expect(tv).toMatch(/<ImageRevealMask\s*\n\s*seed=\{currentQuestion\.image_url!\}\s*\n\s*progressPercent=\{Math\.max\(0, Math\.min\(100, timerPercent\)\)\}\s*\n\s*revealAll=\{isReveal\}/);
  });

  it("nothing is cropped: a flag is contained with a hairline, a photograph contained over a wash", () => {
    expect(tv).not.toMatch(/object-cover object-top/);
    expect(tv).toMatch(/"max-h-\[80%\] max-w-full w-auto h-auto ring-1 ring-black\/20 rounded-\[2px\]"/);
    expect(tv).toMatch(/imageTreatment\.band && \(/);
    expect(tv).toMatch(/className="pointer-events-none absolute -inset-12 opacity-50 blur-2xl"/);
  });
});

describe("a tapped answer survives a flaky connection", () => {
  // One retry after 250ms was all a tap got; two dropped requests in a row
  // reverted it, and the player pressed the same answer four or five times
  // (owner: "it was exhausting").
  const ctx = read("src/contexts/TVGameContext.tsx");

  it("asks up to five times over about five seconds before giving the tap back", () => {
    expect(ctx).toMatch(/const SUBMIT_RETRY_DELAYS_MS = \[0, 400, 900, 1600, 2500\];/);
    expect(ctx).toMatch(/for \(const delay of SUBMIT_RETRY_DELAYS_MS\) \{/);
    expect(ctx).toMatch(/if \(!rpcError && rpcData\) break;/);
    expect(ctx).toMatch(/if \(!rpcError && !rpcData\) rpcError = \{ message: 'empty response' \};/);
    expect(ctx).not.toMatch(/RPC failed once/);
  });

  it("a server rejection is still final at once, and the revert still follows every failed attempt", () => {
    expect(ctx).toMatch(/if \(!result\.accepted\) \{[\s\S]*?revertOptimisticAnswer\(result\.reason \|\| 'rejected'\);/);
    expect(ctx).toMatch(/revertOptimisticAnswer\(rpcError\?\.message \|\| 'rpc failed'\);/);
  });
});
