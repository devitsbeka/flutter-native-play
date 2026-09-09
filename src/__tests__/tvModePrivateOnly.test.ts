/**
 * TV mode is a private-room thing.
 *
 * It pairs the room with a single screen everyone in the room plays toward
 * — the friends the host invited there. A public room is matched with
 * whoever the list sends it, not a group with a shared TV, so the row
 * offered a device nobody arriving that way has a reason to reach for.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the lobby's Play on TV row", () => {
  it("shows only for the host of a room that is not public", () => {
    expect(lobby).toMatch(
      /tv=\{isHost && !isPublicRoom \? \{ label: t\("lobby\.uPlayOnTv"\), onPress: \(\) => setIsTVModeEnabled\(true\) \} : undefined\}/,
    );
  });

  it("reads the same flag the Visibility toggle writes", () => {
    // Not a second notion of "public" — the row and the toggle have to
    // agree the moment a host flips Visibility, not after a refetch.
    // ...and the draft store's intent for a public draft, so the TV row is
    // not offered on a room about to be published (draftIsPrivateUntilCreate.test).
    expect(lobby).toMatch(
      /const isPublicRoom =\s*\n\s*Boolean\(\(currentRoom as \{ is_public\?: boolean \}\)\.is_public\) \|\|\s*\n\s*publishedNow \|\|\s*\n\s*draftWantsPublic\(currentRoom\.id\);/,
    );
  });
});
