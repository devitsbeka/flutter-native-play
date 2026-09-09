/**
 * An invitation on a room card: a grey seat, a green Confirm, an X.
 *
 * The first version put a purple "Invited by …" pill in the top row and a
 * purple Confirm at the bottom. With the host, the age, the seats and the
 * way out already there, it was one thing too many (owner: "invitation
 * still looks weird … show avatar who was invited as black and white
 * besides the host avatar and let's show green button - confirm button and
 * X besides that green button to deny, remove invited by.. and date
 * label, it is too much on cards, show new if room is new (1 hour) after
 * that don't show date label").
 *
 * So, on BOTH tabs' cards: the viewer's own face in black and white in the
 * seat that is theirs to take, right after the people who are really in;
 * a green Confirm (the same mint every one-tap-from-a-game button wears)
 * and an X beside it that gives the seat up and answers the invite; no
 * badge; and a time label that says "New" for the first hour and then
 * nothing.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isNewRoom, NEW_ROOM_MS } from "@/utils/roomAge";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const mine = read("src/components/team/MyRoomsSection.tsx");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const reader = read("src/utils/pendingRoomInvites.ts");

describe("the badge is gone", () => {
  it("no component, no key, no import", () => {
    expect(existsSync(join(process.cwd(), "src/components/team/RoomInviteBadge.tsx"))).toBe(false);
    expect(mine).not.toMatch(/RoomInviteBadge/);
    expect(pub).not.toMatch(/RoomInviteBadge/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).not.toMatch(/roomInvitedBy/);
    }
  });
});

describe("the invited face is black and white, beside the host", () => {
  it("private card: the viewer's own row, greyed, ring kept, no online dot", () => {
    expect(mine).toMatch(/const reservedForMe = room\.has_pending_invite && p\.user_id === user\?\.id;/);
    expect(mine).toMatch(/reservedForMe\s*\n\s*\? "grayscale opacity-70 ring-2 ring-slate-400\/70/);
  });

  it("public card: the seat after the seated players, drawn from the viewer's own profile", () => {
    // The public faces query lists seated players only, so the reserved seat
    // has to come from the viewer's profile.
    expect(pub).toMatch(/const reservedForMe = invited && !!me && i === players\.length \+ 1;/);
    expect(pub).toMatch(/= players\[i - 1\] \?\? \(reservedForMe \? me : undefined\);/);
    expect(pub).toMatch(/\$\{reservedForMe \? "grayscale opacity-70" : ""\}/);
    expect(pub).toMatch(/\{!reservedForMe && online\.has\(person\.user_id\) && \(/);
    expect(pub).toMatch(/me=\{me\}/);
  });
});

describe("Confirm is green, and an X beside it says no", () => {
  it("private card", () => {
    expect(mine).toMatch(/tone=\{room\.has_pending_invite \? "mint" : "white"\}/);
    expect(mine).toMatch(/\{room\.has_pending_invite && !isJoining && \(\s*\n\s*<button\s*\n\s*type="button"\s*\n\s*aria-label=\{t\("extra\.notifDecline"\)\}/);
    expect(mine).toMatch(/onDeclineInvite\?\.\(room\);/);
    expect(mine).toMatch(/onDeclineInvite=\{\(r\) => void handleDeclineInvite\(r\)\}/);
    expect(mine).toMatch(/await declineRoomInvite\(room\.id, user\.id, room\.pending_invite_from\.notificationId\);/);
  });

  it("public card", () => {
    expect(pub).toMatch(/tone=\{invited \|\| ready \? "mint" : "white"\}/);
    expect(pub).toMatch(/\{invited && !busy && \(\s*\n\s*<button\s*\n\s*type="button"\s*\n\s*aria-label=\{t\("extra\.notifDecline"\)\}/);
    expect(pub).toMatch(/onDeclineInvite=\{\(r\) => void declineInvite\(r\)\}/);
    expect(pub).toMatch(/await declineRoomInvite\(room\.id, user\.id, invite\.notificationId\);/);
  });

  it("no gives the seat up — a seat that stays is staked — and answers the invite", () => {
    expect(reader).toMatch(/export async function declineRoomInvite\(roomId: string, userId: string, notificationId: string\)/);
    expect(reader).toMatch(/from\("room_participants"\)\.delete\(\)\.eq\("room_id", roomId\)\.eq\("user_id", userId\)/);
    expect(reader).toMatch(/markNotificationActioned\(notificationId, "declined"\)/);
    expect(reader).toMatch(/notificationId: n\.id,/);
  });
});

describe("the time label is New for an hour, then nothing", () => {
  it("the rule", () => {
    const now = Date.now();
    expect(NEW_ROOM_MS).toBe(60 * 60_000);
    expect(isNewRoom(new Date(now - 10 * 60_000).toISOString(), now)).toBe(true);
    expect(isNewRoom(new Date(now - 59 * 60_000).toISOString(), now)).toBe(true);
    expect(isNewRoom(new Date(now - 61 * 60_000).toISOString(), now)).toBe(false);
    expect(isNewRoom(null, now)).toBe(false);
    expect(isNewRoom("not a date", now)).toBe(false);
  });

  it("both cards draw New and never the running age", () => {
    for (const src of [mine, pub]) {
      expect(src).toMatch(/useRoomIsNew\(room\.created_at\)/);
      expect(src).not.toMatch(/useRoomAge\(/);
      expect(src).not.toMatch(/createdAgo/);
      expect(src).toMatch(/\{t\("extra\.roomStatusNew"\)\}/);
    }
    expect(mine).toMatch(/\{isNew && \(\s*\n\s*<span className="inline-flex items-center gap-1\.5 whitespace-nowrap px-2\.5 py-1 rounded-full bg-white\/60/);
    expect(pub).toMatch(/\{isNew && \(\s*\n\s*<span className=\{`shrink-0 whitespace-nowrap rounded-full px-2\.5 py-1 text-xs font-bold \$\{ink\.pill\} \$\{ink\.text\}`\}>\s*\n\s*\{t\("extra\.roomStatusNew"\)\}/);
  });
});
