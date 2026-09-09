/**
 * A seat at a room table costs the stake, and the tap that takes it says so.
 *
 * A room round is settled as a pot: every seated player pays 500 in and the
 * table is what gets paid out. A player who cannot cover it was not stopped
 * anywhere — they knocked, sat down, played, and settle_room_round took what
 * they had (the debit is floored at the balance, deliberately, because a
 * short pot beats a negative balance). The pot was quietly short and nobody
 * had been told anything (owner: "room matches also needs 500 coins to
 * participate, if not it should show the reason after click").
 *
 * So the door says it: knocking on a public room and taking a seat at
 * somebody else's private one both check the balance first and raise the
 * modal that explains it — the same one every other screen uses, which
 * carries the two ways out, gems exchanged for coins and the daily reward.
 *
 * The host is not stopped from opening their own room, and the lounges are
 * not touched: the party, the arena and the King's couch carry their own
 * stakes and are not settled by settle_room_round.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const publicRooms = read("src/components/team/PublicRoomsSection.tsx");
const myRooms = read("src/components/team/MyRoomsSection.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("knocking on a public room", () => {
  it("checks the balance before the knock, not after it", () => {
    const ask = publicRooms.slice(publicRooms.indexOf("const ask = async (room: PublicRoom)"));
    expect(ask).toMatch(/if \(coins < REWARDS\.GAME_STAKE\) \{\s*\n\s*setShowNoStake\(true\);\s*\n\s*return;\s*\n\s*\}/);
    // Before the request_room_join RPC, so a knock is never sent by
    // somebody who could not sit down if it were answered.
    expect(ask.indexOf("setShowNoStake(true)")).toBeLessThan(ask.indexOf("request_room_join"));
  });

  it("and says why, in the modal that carries the way out of it", () => {
    expect(publicRooms).toMatch(/<NotEnoughStakeModal isOpen=\{showNoStake\} onClose=\{\(\) => setShowNoStake\(false\)\} \/>/);
  });
});

describe("taking a seat at a private table", () => {
  it("is the same check, on the tap that takes it", () => {
    expect(myRooms).toMatch(
      /if \(roomKind\(room\) === "classic" && !room\.is_host && coins < REWARDS\.GAME_STAKE\) \{\s*\n\s*setShowNoStake\(true\);\s*\n\s*return;\s*\n\s*\}/,
    );
    expect(myRooms).toMatch(/<NotEnoughStakeModal isOpen=\{showNoStake\} onClose=\{\(\) => setShowNoStake\(false\)\} \/>/);
  });

  it("but the host may always open their own room, and lounges are none of this", () => {
    // The host's room is theirs to edit and invite into; their Start is
    // gated on the same stake, which is the moment it costs anything.
    const join = myRooms.slice(myRooms.indexOf("const handleJoin = async (room: MyRoom)"), myRooms.indexOf("const openRoom = async"));
    expect(join).toMatch(/!room\.is_host/);
    expect(join).toMatch(/roomKind\(room\) === "classic"/);
  });
});

describe("and the host's Start", () => {
  it("asks the balance, not the subscription", () => {
    // useGameStake's `hasEnoughCoins` is `isVipFreePlay || canAfford` — PRO
    // is exempt from a QUICK game's loss because nobody is on the other
    // side of one. A room pot is other players' money, and the migration is
    // explicit that PRO stakes into it like everyone else; waving a PRO
    // player through here meant the table funding them.
    expect(lobby).toMatch(/const \{ coins \} = useCurrency\(\);/);
    expect(lobby).toMatch(/const canCoverStake = coins >= REWARDS\.GAME_STAKE;/);
    expect(lobby).toMatch(/if \(seatedPlayers >= 2 && !canCoverStake\) \{/);
    // The comment above canCoverStake still names the hook; nothing imports
    // it any more.
    expect(lobby).not.toMatch(/from "@\/hooks\/useGameStake"/);
  });

  it("and only where there is a pot — a room of one is practice and free", () => {
    expect(lobby).toMatch(/seatedPlayers >= 2 && !canCoverStake/);
    const pot = read("supabase/migrations/20261015100000_room_round_pot.sql");
    expect(pot).toMatch(/IF v_players < 2 THEN/);
  });
});
