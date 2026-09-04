/**
 * Getting back into a room you are already in.
 *
 * Four small things stood between a player and a room that was waiting for
 * them, and each was invisible from inside the lobby:
 *
 *  - the header's bell counted notifications, drew the badge, and did
 *    nothing at all when pressed — in the one place an invitation or a join
 *    request is most likely to be sitting;
 *  - a seated player who had closed the app looked exactly like one who had
 *    not, so the host waited on somebody who left ten minutes ago;
 *  - a room whose whole roster is online — the only room on the list you
 *    can walk into and play this minute — sorted by recency, wherever that
 *    happened to put it;
 *  - and the arena's VS sat under both benches rather than between them,
 *    because grid auto-placement is sparse.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compareRooms, type OrderableRoom } from "@/utils/roomOrder";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const battle = read("src/pages/TeamBattlePage.tsx");

describe("the lobby's bell", () => {
  it("is a button that opens the notifications", () => {
    expect(universal).toMatch(/onClick=\{onBell\}/);
    expect(universal).toMatch(/onBell\?: \(\) => void;/);
    // A <span> with a badge on it is decoration.
    expect(universal).not.toMatch(/<span className="relative flex h-10 w-10 items-center justify-center rounded-full">\s*\n\s*<Bell/);
  });

  it("every lobby wires it", () => {
    for (const file of [
      "src/pages/KingPage.tsx",
      "src/pages/TeamBattlePage.tsx",
      "src/components/team/RoomLobbyV2.tsx",
      "src/components/team/CreateRoomPage.tsx",
    ]) {
      expect(read(file), file).toMatch(/onBell=\{\(\) => navigate\("\/notifications"\)\}/);
    }
  });
});

describe("an absent player is visible, and callable", () => {
  it("the face greys and wears the bell, and the row says the word", () => {
    expect(universal).toMatch(/offline\?: boolean;/);
    expect(universal).toMatch(/onCall\?: \(\) => void;/);
    expect(universal).toMatch(/player\.offline && "opacity-45 grayscale"/);
    // The badge sits ON the avatar: the face is what says "away", and a
    // loose amber circle at the far end of the row was a whole name away
    // from what it referred to.
    expect(universal).toMatch(/\{player\.offline && \(\s*\n\s*<span[^]*?-bottom-0\.5 -right-0\.5[^]*?BellRing/);
    expect(universal).toMatch(/player\.offline && player\.onCall \?/);
    expect(universal).toMatch(/\{callLabel\}/);
  });

  it("the arena reads presence and pings the person who is missing", () => {
    expect(battle).toMatch(
      /const \{ online, loaded: presenceLoaded \} = useParticipantPresence\(seatedIds\)/,
    );
    // A bot is never away; nor are you, sitting here looking at the screen —
    // and nor is anybody before the first answer has come back. `online`
    // starts empty, which is indistinguishable from a deserted room, so the
    // lobby opened with every face greyed and belled.
    expect(battle).toMatch(/offline:\s*\n?\s*presenceLoaded &&/);
    expect(battle).toMatch(/!online\.has\(p\.user_id\)/);
    const hook = read("src/hooks/useParticipantPresence.ts");
    expect(hook).toMatch(/loaded: boolean;/);
    expect(hook).toMatch(/return \{ online, arrived, loaded \};/);
    // Same road the in-match call takes: a notification that routes back
    // here, plus a push for somebody who has left the app.
    expect(battle).toMatch(/createNotification\(\s*target\.user_id,\s*"room_ping",/);
    expect(battle).toMatch(/invoke\("send-social-push", \{ body: \{ kind: "team_poke", roomId: room\.id \} \}\)/);
    // And one per person per half-minute.
    expect(battle).toMatch(/calledIds\.has\(target\.user_id\)/);
    expect(battle).toMatch(/30_000,/);
  });
});

describe("a room you can play in right now sorts first", () => {
  const room = (over: Partial<OrderableRoom> = {}): OrderableRoom => ({
    created_at: "2026-01-01T00:00:00Z",
    last_activity_at: "2026-01-01T00:00:00Z",
    ...over,
  });

  it("beats an invitation, a live TV session and anything newer", () => {
    const live = room({ hasFullRoster: true, created_at: "2020-01-01T00:00:00Z" });
    expect(compareRooms(live, room({ hasPendingInvite: true }))).toBeLessThan(0);
    expect(compareRooms(live, room({ hasLiveTV: true }))).toBeLessThan(0);
    expect(compareRooms(live, room({ created_at: "2030-01-01T00:00:00Z" }))).toBeLessThan(0);
  });

  it("and the old order still holds underneath it", () => {
    expect(compareRooms(room({ hasPendingInvite: true }), room({ hasLiveTV: true }))).toBeLessThan(0);
    expect(
      compareRooms(room({ created_at: "2030-01-01T00:00:00Z" }), room()),
    ).toBeLessThan(0);
  });

  it("is everyone, not anyone — a room with one of four present is a wait", () => {
    const hook = read("src/hooks/useMyRooms.ts");
    expect(hook).toMatch(
      /has_full_roster:\s*\n?\s*participants\.length > 1 && onlineParticipants\.length === participants\.length,/,
    );
  });
});

describe("the arena's heading and its VS", () => {
  it("the VS sits between the crests, on their own row", () => {
    // Grid auto-placement is sparse: naming columns 1 and 3 and leaving 2
    // for a later child put that child on a row of its own.
    expect(universal).toMatch(/gridColumn: i === 0 \? 1 : 3, gridRow: 1/);
    expect(universal).toMatch(/gridColumn: 2, gridRow: 1/);
  });

  it("the room's icon and its name share one row", () => {
    expect(universal).toMatch(/<div className="flex items-center gap-2\.5">/);
    expect(universal).toMatch(/size-\[44px\] object-contain/);
    expect(universal).not.toMatch(/flex flex-col items-start gap-2/);
  });

  it("and the card starts higher up the screen", () => {
    // 36px of fixed air plus a flex-1 that ate every spare pixel pushed the
    // card — the point of the screen — under the fold.
    expect(universal).toMatch(/min-h-\[12px\] flex-\[0\.35\]/);
    expect(universal).toMatch(/mb-\[7px\] mt-\[16px\]/);
  });
});

describe("the lobby's heading carries the count", () => {
  it("the name is centred and the seats sit under it", () => {
    // The one number that says whether this room can start used to be at
    // the foot of the players tab, below every bench and the hint — three
    // scrolls from the room's own name, and not on the rules tab at all.
    expect(universal).toMatch(/className="flex shrink-0 flex-col items-center"/);
    expect(universal).toMatch(
      /\{Math\.min\(capacity\.taken, capacity\.max\)\}\/\{capacity\.max\} \{labels\.players\.toLowerCase\(\)\}/,
    );
    // And exactly once — it left the foot of the list rather than doubling.
    expect((universal.match(/capacity\.max\} \{labels\.players/g) ?? []).length).toBe(1);
  });

  it("the waiting line is two points smaller, and says what it is waiting for", () => {
    expect(universal).toMatch(/text-\[14px\] font-medium leading-\[18px\][^"]*text-\[#402666\]"/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/needToStart: ".*\{n\}.*"/);
    }
    // The Georgian is the owner's own wording.
    expect(read("src/locales/ka.ts")).toContain(
      "needToStart: \"თამაშის დასაწყებად საჭიროა კიდევ {n} მოთამაშე\",",
    );
  });
});

describe("only the host is offered the start", () => {
  it("a guest gets the line, not a dead button", () => {
    // The room's one big call to action, greyed, in front of somebody it
    // will never be for.
    expect(universal).toMatch(/captionOnly\?: boolean;/);
    expect(universal).toMatch(/\{!start\.captionOnly && \(/);
    expect(battle).toMatch(/captionOnly: true,\s*\n\s*caption: t\("teamBattle\.waitingHost"\)/);
    // The King's couch has the same shape: a shared couch is the host's to
    // start, and its guests used to get the button greyed and unexplained.
    expect(read("src/pages/KingPage.tsx")).toMatch(/humans > 1 && !isKingHost/);
  });

  it("but a real action in the footer stays a button", () => {
    // The classic room's guest can ping the host — that is a thing to
    // press, not a thing to read.
    const lobby = read("src/components/team/RoomLobbyV2.tsx");
    expect(lobby).toMatch(/onPress: \(\) => void handlePingHost\(\)/);
    expect(lobby).not.toMatch(/captionOnly/);
  });
});

describe("a room that can start says so", () => {
  it("full, mine, and everybody in the app turns the button green", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    // Full is measured against the EFFECTIVE seats (never below the head
    // count), so an under-set cap can't leave a truly full room short.
    expect(section).toMatch(/const full = effectiveSeats != null && room\.player_count >= effectiveSeats;/);
    // Everyone, not anyone — the host counts too.
    expect(section).toMatch(
      /online\.has\(room\.host_user_id\) && players\.every\(\(p\) => online\.has\(p\.user_id\)\)/,
    );
    expect(section).toMatch(/const ready = inside && full && everyoneHere;/);
    // The mint "play" button (Figma 1058:325): #81f0c3 face, #2bc889 lip.
    expect(section).toMatch(/rounded-\[24px\] bg-\[#81f0c3\] border-b-4 border-\[#2bc889\] text-\[#320c69\]/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/roomPlay: "/);
    }
  });

  it("and the arena's crests cluster with its name instead of the card's edges", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/flex-1 flex items-center justify-center gap-3 py-3/);
    expect(section).not.toMatch(/flex-1 flex items-center justify-between gap-2 py-3/);
  });
});

describe("walking to another screen does not sign you out of the room", () => {
  const tracker = read("src/components/UserPresenceTracker.tsx");

  it("the heartbeat survives a navigation", () => {
    // `updatePresence` depended on location.pathname, so it was a new
    // function on every route change — and the effect that owns the
    // heartbeat, which depends on it, tore down and rebuilt. Its cleanup
    // writes `offline`. Everyone in the lobby you had just walked into saw
    // you as away until the next heartbeat, up to a minute later.
    expect(tracker).toMatch(/const pageRef = useRef\(location\.pathname\);/);
    expect(tracker).toMatch(/current_page: pageRef\.current,/);
    expect(tracker).toMatch(/\}, \[user\?\.id, isSessionValid\]\);/);
    expect(tracker).not.toMatch(/\[user\?\.id, location\.pathname, isSessionValid\]/);
  });

  it("and a status change is never swallowed by the one in flight", () => {
    // Fine for two identical heartbeats, wrong for a change: an `offline`
    // in flight dropped the `online` behind it and left the row saying the
    // opposite of the truth.
    expect(tracker).toMatch(/wantedRef\.current = status;/);
    expect(tracker).toMatch(/while \(wantedRef\.current\) \{/);
  });
});
