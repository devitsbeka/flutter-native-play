/**
 * Pressing Create lands you where the trivia will appear.
 *
 * Generation outlives the wizard (TriviaCreationContext), so the wizard
 * closes immediately — and it closed onto whatever tab the player was on,
 * which is Public by default. The only sign the work had started was the
 * Create button on the OTHER tab saying "Creating…": "it shows modal and
 * land me on public tab and can't see where it is creating" (owner).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const team = read("src/pages/TeamV2.tsx");
const card = read("src/components/team/TriviaBeingMadeCard.tsx");

describe("the hand-off lands on the private tab", () => {
  it("both wizards switch tab and clear the filter before the modal", () => {
    // Both: the blind-trivia wizard and the quiz wizard hand off the same
    // way, and a filter left on something else would hide the arrival.
    const handoffs = team.match(/onTriviaHandedOff=\{\(\) => \{[\s\S]*?\}\}/g) ?? [];
    expect(handoffs).toHaveLength(2);
    for (const h of handoffs) {
      expect(h).toMatch(/setSortFilter\("all"\);/);
      expect(h).toMatch(/setActiveTab\("private"\);/);
      expect(h).toMatch(/setShowTriviaOnItsWay\(true\);/);
    }
  });

  it("and nothing hands off without switching", () => {
    expect(team).not.toMatch(/onTriviaHandedOff=\{\(\) => setShowTriviaOnItsWay\(true\)\}/);
  });
});

describe("what is waiting there", () => {
  it("a card for the running job, above both lists", () => {
    // Under "all" the trivia list only renders once there IS a trivia, so a
    // player making their first one would land on an empty page.
    expect(team).toMatch(/\{triviaJob && <TriviaBeingMadeCard job=\{triviaJob\} \/>\}/);
    const privateBlock = team.slice(team.indexOf('{activeTab === "private" && ('));
    expect(privateBlock.indexOf("TriviaBeingMadeCard")).toBeLessThan(privateBlock.indexOf("<MyRoomsSection"));
    expect(team).toMatch(/const \{ busy: triviaBusy, job: triviaJob \} = useTriviaCreation\(\);/);
  });

  it("saying what the modal that just closed said, in every language it already speaks", () => {
    // The same two keys the on-its-way modal uses — no new strings to leave
    // untranslated, and the card reads as its continuation.
    expect(card).toMatch(/extra\.partyOnItsWayTitle" : "extra\.triviaOnItsWayTitle/);
    expect(card).toMatch(/\{job\.subject\}/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/triviaOnItsWayTitle: "/);
    }
  });
});
