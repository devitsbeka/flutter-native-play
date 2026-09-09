/**
 * My Trivias is the host's own quiz, not something to publish.
 *
 * A published room is listed for strangers to walk into; a personal trivia
 * is "yours to hand out rather than to advertise" (see
 * partyCategoryPrivacy.test.ts, the same rule for the party category one
 * screen over). Unlike the party category — which the picker simply drops
 * from the list — the My Trivias tile stays on screen as the fourth card it
 * always is, greyed out and untappable, so a host creating or already
 * running a public room sees why the option is there and not why it
 * vanished (owner: "when i'm creating public room we should exclude 'my
 * trivia' option from my options, show as black and white that last
 * option").
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const picker = read("src/components/team/CategoryPickerModal.tsx");

describe("the My Trivias tile, greyed out rather than gone", () => {
  it("defaults to allowed — every other opener is unaffected", () => {
    expect(picker).toMatch(/allowMyTrivias = true,/);
  });

  it("only the my-trivias card is disabled when the opener says no", () => {
    expect(picker).toMatch(
      /key: "my-trivias",.*?disabled: !allowMyTrivias/,
    );
    expect(picker).toMatch(/key: "random",.*?disabled: false/);
    expect(picker).toMatch(/key: "random5",.*?disabled: false/);
    expect(picker).toMatch(/key: "library",.*?disabled: false/);
  });

  it("a disabled card takes no tap and wears no colour", () => {
    expect(picker).toMatch(/onClick=\{card\.disabled \? undefined : card\.onTap\}/);
    expect(picker).toMatch(/disabled=\{card\.disabled\}/);
    expect(picker).toMatch(/grayscale opacity-50 cursor-not-allowed/);
  });
});

describe("a room's own pickers disable it exactly while the room is public", () => {
  it("the lobby and the results screen key it off the room's is_public", () => {
    expect(read("src/components/team/RoomLobbyV2.tsx")).toMatch(
      /allowMyTrivias=\{!currentRoom\?\.is_public\}/,
    );
    expect(read("src/components/team/GameResultsScreenV2.tsx")).toMatch(
      /allowMyTrivias=\{!currentRoom\?\.is_public\}/,
    );
  });

  it("room creation keys it off the same publishRoom flag the party category uses", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create).toMatch(/allowMyTrivias=\{!publishRoom\}/);
  });
});
