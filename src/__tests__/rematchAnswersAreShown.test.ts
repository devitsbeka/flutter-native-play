/**
 * The host watches the table answer, on the faces.
 *
 * The rematch goes out to every seat at once and comes back one seat at a
 * time, and until it has the host is looking at one screen with one
 * question on it: who is in? That screen showed a buzzer, a stack of names
 * and a pot — the answers being the smallest thing on it — and a player who
 * said no simply disappeared from it, because declining gives the seat up
 * and the list was built from the room's seats.
 *
 * So it is drawn as the table instead: each asked player's avatar in the
 * circle they wear in the players list, with a badge and a word for what
 * they have said (owner: "show host- players avatars in circle how we show
 * it and show live who accept and who did not").
 *
 * Three answers, not two. "Did not" is a no as much as a not-yet, and they
 * are not the same news: one seat is gone, the other may still come in.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const wait = read("src/components/team/RematchSheet.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("a seat's answer", () => {
  it("is one of three, and the sheet is told it rather than working it out", () => {
    // The sheet cannot derive "declined": that seat is no longer in the
    // room, so only the caller's snapshot of who was asked still knows.
    expect(wait).toMatch(/export type RematchAnswer = "ready" \| "waiting" \| "declined";/);
    expect(wait).toMatch(/answer: RematchAnswer;/);
    expect(wait).not.toMatch(/ready: boolean;/);
  });

  it("shows the face in the players list's own circle", () => {
    // Same ring and same greying as a seat in the lobby, so the person here
    // reads as the person the host was just sitting with.
    expect(wait).toMatch(/"block h-14 w-14 overflow-hidden rounded-full bg-\[#e9d8ff\]",/);
    expect(wait).toMatch(/shadow-\[0px_0px_0px_2px_rgba\(148,163,184,0\.75\)\]/);
    expect(wait).toMatch(/dimmed && "opacity-45 grayscale",/);
    expect(wait).toMatch(/const dimmed = asked && said !== "ready";/);
    // Through SafeAvatarImage: a build-hashed avatar_url from an older
    // deploy 404s, and a torn-page glyph is not a face.
    expect(wait).toMatch(/<SafeAvatarImage/);
  });

  it("and a badge on it, one per answer, with the word underneath", () => {
    expect(wait).toMatch(/\{said === "ready" && <Check /);
    expect(wait).toMatch(/\{said === "waiting" && <Loader2 /);
    expect(wait).toMatch(/\{said === "declined" && <X /);
    expect(wait).toMatch(/t\("extra\.rematchWaitReady"\)/);
    expect(wait).toMatch(/t\("extra\.rematchWaitPending"\)/);
    expect(wait).toMatch(/t\("extra\.rematchWaitDeclined"\)/);
  });

  it("only a yes counts towards the pot and towards Start", () => {
    expect(wait).toMatch(/const ready = seats\.filter\(\(s\) => s\.answer === "ready"\)\.length;/);
    expect(wait).toMatch(/const undecided = seats\.filter\(\(s\) => s\.answer === "waiting"\)\.length;/);
    expect(wait).toMatch(/const playing = ready \+ 1;/);
  });

  it("and the faces lead the sheet, where the buzzer used to", () => {
    expect(wait).toMatch(/\{seats\.map\(\(seat\) => \(\s*\n\s*<RematchFace key=\{seat\.user_id\} seat=\{seat\}/);
    expect(wait).not.toMatch(/trivia-buzzer/);
  });
});

describe("what the lobby passes it", () => {
  it("the table as it was asked, remembered", () => {
    expect(lobby).toMatch(/const \[askedSeats, setAskedSeats\] = useState<Omit<RematchSeat, "answer">\[\]>\(\[\]\);/);
    expect(lobby).toMatch(
      /setAskedSeats\(\s*\n\s*tableToAsk\.map\(\(p\) => \(\{ user_id: p\.user_id, nickname: p\.nickname, avatar_url: p\.avatar_url \}\)\),\s*\n\s*\);/,
    );
  });

  it("and the room, read live, for what each of them has answered since", () => {
    // A gone seat is a no — answerRematchRequest deletes the row on decline
    // — and a seat that is here but not "ready" has not answered yet.
    expect(lobby).toMatch(/const seated = participants\.find\(\(p\) => p\.user_id === seat\.user_id\);/);
    expect(lobby).toMatch(
      /answer: !seated \? "declined" : \(seated\.status as string\) === "ready" \? "ready" : "waiting",/,
    );
    // The ask shows the table; once asked, the same faces carry answers.
    expect(lobby).toMatch(/seats=\{rematchAsked \? rematchSeats : tableSeats\}/);
  });

  it("which is live because the room's own channel keeps participants live", () => {
    // Every accept writes status "ready" on the player's own row and every
    // decline deletes it; both are room_participants writes, and the lobby
    // is subscribed to them for this room.
    const mp = read("src/contexts/MultiplayerContextV2.tsx");
    expect(mp).toMatch(
      /\{ event: "\*", schema: "public", table: "room_participants", filter: `room_id=eq\.\$\{roomId\}` \}/,
    );
    const util = read("src/utils/rematchRequests.ts");
    expect(util).toMatch(/\.update\(\{ status: "ready" \}\)/);
    expect(util).toMatch(/\.from\("room_participants"\)\.delete\(\)\.eq\("room_id", data\.room_id\)\.eq\("user_id", userId\);/);
  });
});
