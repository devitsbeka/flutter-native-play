/**
 * The armband is decided once there are teams to captain.
 *
 * It used to be a chip under each bench's name from the moment the room was
 * made: a role nobody could fill yet, named twice, over two empty benches —
 * and the vote behind it was reachable only by knowing to tap it. Nothing
 * about a captain can be settled until the teams exist, so it waits for
 * them, and then takes over the line that was counting people in.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAPTAIN_VOTE_GRACE_MS,
  CAPTAIN_VOTE_MS,
  captainIsVoted,
  captainVoteIsOpen,
  captainVoteSecondsLeft,
} from "@/utils/captainVote";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const page = read("src/pages/TeamBattlePage.tsx");
const context = read("src/contexts/TeamBattleContext.tsx");
const universal = read("src/components/lobby/UniversalLobby.tsx");

describe("nothing about captains until the benches are full", () => {
  it("the chip under each team name is gone", () => {
    expect(page).not.toMatch(/onClick=\{\(\) => setCaptainInfo\(team\)\}/);
    expect(page).not.toMatch(/\{face\?\.nickname \?\? t\("lobby\.chooseCaptain"\)\}/);
  });

  it("and the full room's line is where it happens instead", () => {
    // The hint answers "how many more?", which a full room is not asking.
    expect(universal).toMatch(/playersFullSlot\?: ReactNode;/);
    expect(universal).toMatch(/\{playersFullSlot \?\? \(/);
    expect(page).toMatch(/playersFullSlot=\{/);
    expect(page).toMatch(/const bothFull = teamA\.length >= perSide && teamB\.length >= perSide;/);
  });
});

describe("who gets the armband", () => {
  it("voted from three a side; rolled at 2-2", () => {
    // A vote between two people is a staring contest.
    expect(page).toMatch(/const votes = captainIsVoted\(perSide\);/);
    expect(page).toMatch(/const pick = humans\[Math\.floor\(Math\.random\(\) \* humans\.length\)\];/);
    expect(page).toMatch(/void setCaptain\(pick\.user_id\)/);
    // The host's device is the only writer, so the two benches get one
    // captain each rather than one per device racing the others.
    expect(page).toMatch(/if \(!isHost \|\| !bothFull \|\| votes \|\| rolledRef\.current\) return;/);
    // A side that already elected somebody is left alone.
    expect(page).toMatch(/if \(humans\.length === 0 \|\| humans\.some\(\(p\) => p\.is_captain\)\) continue;/);
  });

  it("ten seconds to vote, and five before it opens itself", () => {
    expect(CAPTAIN_VOTE_MS).toBe(10_000);
    expect(CAPTAIN_VOTE_GRACE_MS).toBe(5_000);
    expect(page).toMatch(/}, CAPTAIN_VOTE_GRACE_MS\);/);
    // Only the host broadcasts, so the window opens once however many
    // devices are watching.
    expect(page).toMatch(/if \(!isHost \|\| !bothFull \|\| !votes \|\| openedRef\.current\) return;/);
    // And a host who already pressed the button does not open it twice.
    expect(page).toMatch(/if \(openedRef\.current\) return;\s*\n\s*openedRef\.current = true;/);
  });

  it("the window is a message, not a record", () => {
    // Ten seconds and then gone — the same reasoning as the poke and the
    // reactions, on the same channel, and no migration for any of it. The
    // votes themselves are durable: tb_vote_captain writes room_participants.
    expect(context).toMatch(/\.on\("broadcast", \{ event: "captain_vote" \}, \(\) => \{\s*\n\s*setCaptainVoteAt\(Date\.now\(\)\);/);
    expect(context).toMatch(/event: "captain_vote",/);
    expect(context).toMatch(/captainVoteAt: number \| null;/);
    expect(page).toMatch(/void voteCaptain\(userId\)/);
  });

  it("every device runs the same clock off the message it heard", () => {
    // Stamped on arrival, not on send: the opener's clock is not this
    // device's. self:true means the opener gets its own message back.
    expect(context).toMatch(/\{ config: \{ broadcast: \{ self: true \} \} \}/);
    expect(page).toMatch(/const voting = captainVoteIsOpen\(captainVoteAt, voteNow\);/);
    expect(page).toMatch(/const voteSecondsLeft = captainVoteSecondsLeft\(captainVoteAt, voteNow\);/);
  });
});

describe("being told", () => {
  it("the crown says so for a second and a half, then takes itself away", () => {
    const modal = read("src/components/team-battle/YoureCaptainModal.tsx");
    expect(modal).toMatch(/export const CAPTAIN_CROWN_MS = 1500;/);
    expect(modal).toMatch(/window\.setTimeout\(onClose, CAPTAIN_CROWN_MS\)/);
    // Tapping closes it earlier.
    expect(modal).toMatch(/onClick=\{onClose\}/);
    expect(modal).toMatch(/t\("lobby\.youAreCaptain"\)/);
  });

  it("watched on the armband itself, and only once", () => {
    // The armband lands on room_participants and every device already reads
    // that; a refetch or a reconnect must not show the crown again.
    expect(page).toMatch(
      /participants\.some\(\(p\) => p\.user_id === user\.id && p\.is_captain\)/,
    );
    expect(page).toMatch(/if \(!iAmCaptain \|\| toldRef\.current\) return;/);
    expect(page).toMatch(/<YoureCaptainModal open=\{crowned\}/);
  });

  it("in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/youAreCaptain: "../);
      expect(locale, lang).toMatch(/captainVoteOpen: "[^"]*\{n\}/);
    }
  });
});

describe("the window, run rather than read", () => {
  const t = 1_000_000;

  it("2-2 rolls, 3-3 and up votes", () => {
    expect(captainIsVoted(2)).toBe(false);
    expect(captainIsVoted(3)).toBe(true);
    expect(captainIsVoted(5)).toBe(true);
  });

  it("is shut until somebody opens it", () => {
    expect(captainVoteIsOpen(null, t)).toBe(false);
    expect(captainVoteSecondsLeft(null, t)).toBe(0);
  });

  it("runs ten seconds from the message this device heard", () => {
    expect(captainVoteIsOpen(t, t)).toBe(true);
    expect(captainVoteSecondsLeft(t, t)).toBe(10);
    expect(captainVoteSecondsLeft(t, t + 1_000)).toBe(9);
    expect(captainVoteSecondsLeft(t, t + 9_500)).toBe(1);
  });

  it("and the number never reads 0 while the sheet is still up", () => {
    // Rounded up: 200ms left is "1". They have to disappear together.
    expect(captainVoteIsOpen(t, t + 9_800)).toBe(true);
    expect(captainVoteSecondsLeft(t, t + 9_800)).toBe(1);
    expect(captainVoteIsOpen(t, t + 10_000)).toBe(false);
    expect(captainVoteSecondsLeft(t, t + 10_000)).toBe(0);
    expect(captainVoteSecondsLeft(t, t + 60_000)).toBe(0);
  });

  it("a clock that ran backwards does not reopen it", () => {
    // A device whose clock jumped is stamped on arrival, but be explicit.
    expect(captainVoteSecondsLeft(t, t - 5_000)).toBe(CAPTAIN_VOTE_MS / 1000 + 5);
    expect(captainVoteIsOpen(t, t - 5_000)).toBe(true);
  });
});
