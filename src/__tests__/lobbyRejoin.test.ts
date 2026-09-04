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

  it("the room's emblem sits above its name, centred", () => {
    // Figma 1059:532: a 91px emblem, then the name under it, then how full
    // the room is. They shared a row at 44px for a while — the cheapest way
    // to keep a big heading and an emblem on a short screen — and the
    // design buys that height back from the lilac under the card instead.
    expect(universal).toMatch(/relative mb-\[15px\] block size-\[91px\] shrink-0/);
    expect(universal).not.toMatch(/size-\[44px\] object-contain/);
    expect(universal).not.toMatch(/flex flex-col items-start gap-2/);
  });

  it("and the card sits at the foot of the screen, 20px clear of Start", () => {
    // It used to take only 35% of the slack, which parked the card mid-air
    // with a screen of empty lilac between it and the button. All of it
    // now, above the title — and the 12px floor is what keeps the card off
    // the fold when the content is taller than the frame and there is no
    // slack to take.
    expect(universal).toMatch(/min-h-\[12px\] flex-1/);
    expect(universal).toMatch(/mb-\[20px\] mt-\[16px\]/);
  });
});

describe("the lobby's heading carries the count", () => {
  it("the name is centred and the seats sit under it", () => {
    // The one number that says whether this room can start used to be at
    // the foot of the players tab, below every bench and the hint — three
    // scrolls from the room's own name, and not on the rules tab at all.
    expect(universal).toMatch(/className="flex min-h-\[12px\] flex-1 flex-col items-center pt-\[39px\]"/);
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

  it("shows the host's face after the waiting caption (owner's ask)", () => {
    // "…waiting for the host" points at who: the host's avatar renders right
    // after the caption, from the host participant, in every lobby that shows
    // the line.
    expect(universal).toMatch(/captionAvatarUrl\?: string \| null;/);
    expect(universal).toMatch(/start\.captionAvatarUrl !== undefined && \(/);
    expect(universal).toMatch(/resolveAvatarUrl\(start\.captionAvatarUrl\) \?\? fallbackAvatarFor/);
    for (const file of ["src/pages/TeamBattlePage.tsx", "src/pages/KingPage.tsx", "src/components/team/RoomLobbyV2.tsx"]) {
      expect(read(file), file).toMatch(/captionAvatarUrl:[\s\S]{0,120}is_host\)\?\.avatar_url/);
    }
  });

  it("but a real action in the footer stays a button", () => {
    // The classic room's guest can ping the host — that is a thing to
    // press, not a thing to read.
    const lobby = read("src/components/team/RoomLobbyV2.tsx");
    expect(lobby).toMatch(/onPress: \(\) => void handlePingHost\(\)/);
    expect(lobby).not.toMatch(/captionOnly/);
  });
});

describe("the lobby says what the game is", () => {
  it("every mode writes its rules down, in the design's two sections", () => {
    // The Rules tab was a column of dropdowns under a heading that promised
    // rules — how many players, how many questions, play on TV — and what
    // the game actually IS was written nowhere in the app. Figma 1059:532
    // gives it prose: an uppercase label over a paragraph, settings under.
    expect(universal).toMatch(/rulesText\?: \{ key: string; heading: string; body: string \}\[\];/);
    expect(universal).toMatch(/font-hero text-\[16px\] uppercase leading-\[14px\]/);
    const byMode: [string, string][] = [
      ["src/components/team/RoomLobbyV2.tsx", "rulesClassic"],
      ["src/pages/KingPage.tsx", "rulesKing"],
      // The arena's rules were already written for this screen — they just
      // sat in 13px grey under three rows, as a footnote to the settings.
      ["src/pages/TeamBattlePage.tsx", "tbRules"],
      ["src/components/team/CreateRoomPage.tsx", "rulesWords"],
    ];
    for (const [file, key] of byMode) {
      const src = read(file);
      expect(src, file).toMatch(new RegExp(`rulesText=\\{\\[[\\s\\S]{0,400}lobby\\.${key}`));
      expect(src, file).toMatch(/heading: t\("lobby\.timeHeading"\)/);
    }
  });

  it("in every language, not only the two that were written first", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of [
        "rulesHeading",
        "timeHeading",
        "rulesClassic",
        "timeClassic",
        "rulesKing",
        "timeKing",
        "timeBattle",
        "rulesWords",
        "timeWords",
      ]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s*${key}: "..`));
      }
    }
  });

  it("the stake is one strip in the rules, not a shape per mode", () => {
    // It was a hand-built box on the King's couch, a rule row in the arena,
    // and nothing at all on the other two.
    expect(universal).toMatch(/reward\?: \{ label: string; icon\?: string; amount: ReactNode \};/);
    expect(universal).toMatch(/bg-\[#fdfbff\] pl-\[19px\] pr-\[15px\] shadow-\[0px_5px_0px_#d3c5db\]/);
    // In the Rules tab and ABOVE the written rules (owner's ask). It used to
    // sit on the card's foot, under whichever tab was open — so it appeared
    // below the benches on the Players tab, where it answers nothing anyone
    // is looking at, and three paragraphs down on the Rules tab.
    const rulesTab = universal.slice(
      universal.indexOf('key="rules"'),
      universal.indexOf('key="players"'),
    );
    expect(rulesTab).toMatch(/\{reward && \(/);
    expect(rulesTab.indexOf("{reward && (")).toBeLessThan(rulesTab.indexOf("{rulesText && rulesText.length > 0"));
    // And the card's foot no longer changes shape for it.
    expect(universal).not.toMatch(/reward \? "pb-\[22px\]"/);
    for (const file of ["src/pages/KingPage.tsx", "src/pages/TeamBattlePage.tsx"]) {
      expect(read(file), file).toMatch(/reward=\{\{ label: t\("lobby\.winnerTakes"\), icon: coinIconAsset/);
    }
    // And the room's size is said once, under its name — the rules tab used
    // to repeat it as a "Players 1–10" row two inches below.
    expect(universal).not.toMatch(/<LobbyInfoRow label=\{labels\.players\}>/);
  });
});

describe("a room card offers one way in", () => {
  it("the same button in two colours, mint on the public list and white on mine", () => {
    const button = read("src/components/team/RoomCardPlayButton.tsx");
    // The mint "play" button (Figma 1058:325): #81f0c3 face, #2bc889 lip.
    expect(button).toMatch(/mint: "bg-\[#81f0c3\] border-\[#2bc889\] text-\[#320c69\]"/);
    expect(button).toMatch(/white: "bg-white border-\[#d5c9e8\] text-\[#320c69\]"/);
    // Shape, size and depth are the component's, not the tone's, so the two
    // lists cannot drift apart again.
    expect(button).toMatch(/rounded-\[24px\] border-b-4 px-4 py-2 text-sm font-extrabold/);
    expect(button).toMatch(/active:translate-y-\[2px\] active:border-b-2/);
    // The public list wears mint only on a room that can start; every other
    // card on it is the same shape in white.
    expect(read("src/components/team/PublicRoomsSection.tsx")).toMatch(
      /tone=\{ready \? "mint" : "white"\}/,
    );
    expect(read("src/components/team/MyRoomsSection.tsx")).toMatch(
      /<RoomCardPlayButton\s*\n\s*tone="white"/,
    );
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
