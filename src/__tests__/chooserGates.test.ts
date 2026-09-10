/**
 * The online-room audit, phase E: the doors on the way in.
 *
 *  - The Pro door on the friends modes is on the card too, not only on the
 *    bar: ?mode=library from the home rail walked a non-PRO player into a
 *    real room.
 *  - A signed-out tap goes to sign-in instead of arming a handoff that
 *    spins ten seconds into "could not create room".
 *  - The out-of-games wall waits for the quota to be read, and does not
 *    wall Words (free) or Guess (a match for coins) at all.
 *  - A quick game checks the stake on the card; /game's refusal dropped the
 *    player home.
 *  - My Trivias with nothing authored goes through handoff, so Back does
 *    not re-run the seeded mode.
 *  - The public list says "blocked" and "full" as themselves, and one
 *    pending ask no longer locks the player's own rooms.
 *  - An approved knock opens the room from the Notifications page.
 *  - Create refreshes the Public list it lands on.
 *  - A settlement the server refused on purpose shows nothing, and says why.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const chooser = read("src/components/team/CreateRoomPage.tsx");
const list = read("src/components/team/PublicRoomsSection.tsx");
const LANGS = ["en", "ka", "de", "es", "fr", "it", "pt"];

describe("startMode's doors", () => {
  const start = chooser.slice(chooser.indexOf("const startMode = (key: GameChoice)"), chooser.indexOf("const launchMode = "));

  it("a signed-out tap goes to sign-in, and a restoring session waits", () => {
    expect(start).toMatch(/if \(!user\) \{\s*\n\s*if \(!authLoading\) \{\s*\n\s*onClose\(\);\s*\n\s*navigate\("\/auth"\);\s*\n\s*\}\s*\n\s*return;\s*\n\s*\}/);
    expect(chooser).toMatch(/const \{ user, profile, loading: authLoading \} = useAuth\(\);/);
  });

  it("the wall waits for the quota, and spares the modes that spend none", () => {
    expect(chooser).toMatch(/const blockedByLimit = !canPlay && !isVip && !limitLoading;/);
    expect(start).toMatch(/if \(blockedByLimit && key !== "words" && key !== "guess"\) return setShowLimitWall\(true\);/);
  });

  it("the friends modes go through the Pro gate on the card", () => {
    expect(start).toMatch(/if \(friendsOnlyMode\(key\) && !isVip\) return requirePro\("rooms", \(\) => launchMode\(key\)\);/);
  });

  it("a quick game checks the stake before the handoff", () => {
    expect(start).toMatch(/if \(key === "quick" && coins < REWARDS\.GAME_STAKE\) \{\s*\n\s*setShowQuickStake\(true\);\s*\n\s*return;\s*\n\s*\}/);
    expect(chooser).toMatch(/<NotEnoughStakeModal isOpen=\{showQuickStake\} onClose=\{\(\) => setShowQuickStake\(false\)\} stake=\{REWARDS\.GAME_STAKE\} \/>/);
  });

  it("My Trivias with nothing authored leaves through handoff", () => {
    expect(chooser).toMatch(/handoff\("\/team", \{ state: \{ openCreateChooser: true \} \}\);/);
    expect(chooser).not.toMatch(/navigate\("\/team", \{ state: \{ openCreateChooser: true \} \}\);/);
  });
});

describe("the public list's answers", () => {
  it("blocked and full are said as themselves", () => {
    expect(list).toMatch(/if \(outcome === "blocked"\) \{\s*\n\s*toast\.error\(t\("extra\.joinBlocked"\)\);\s*\n\s*return;\s*\n\s*\}/);
    expect(list).toMatch(/toast\.error\(t\(\/full\/i\.test\(message\) \? "extra\.joinRoomFull" : "extra\.joinAskFailed"\)\);/);
    for (const lang of LANGS) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["joinBlocked", "joinRoomFull", "settleDailyCap", "settleNoBalance"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
    }
  });

  it("one pending ask holds back only a NEW ask", () => {
    expect(list).toMatch(/blocked=\{!!waitingRoomId && waitingRoomId !== room\.id && room\.my_state !== "host" && room\.my_state !== "joined"\}/);
  });

  it("an approved knock opens the room from the Notifications page", () => {
    const page = read("src/pages/Notifications.tsx");
    const cases = page.slice(page.indexOf("switch (notification.type) {"), page.indexOf("(async () => {", page.indexOf("switch (notification.type) {")));
    expect(cases).toContain("case 'room_join_approved':");
  });

  it("Create refreshes the Public list it lands on", () => {
    const lobby = read("src/components/team/RoomLobbyV2.tsx");
    expect(lobby).toMatch(/if \(isPublic\) void queryClient\.invalidateQueries\(\{ queryKey: PUBLIC_ROOMS_KEY \}\);/);
  });
});

describe("a settlement that moved nothing on purpose", () => {
  it("the hook says why", () => {
    const hook = read("src/hooks/useGameStake.ts");
    expect(hook).toMatch(/const settleGameDetailed = useCallback\(/);
    expect(hook).toMatch(/reason: data\?\.reason \?\? null,/);
    expect(hook).toMatch(/settleGame,\s*\n\s*settleGameDetailed,/);
  });

  it("and the result screen shows nothing and says so, instead of an intended ±500", () => {
    const screen = read("src/components/game/MatchResultScreen.tsx");
    expect(screen).toMatch(/\} else if \(reason === "daily_cap" \|\| reason === "no_balance"\) \{/);
    expect(screen).toMatch(/setCoinChange\(0\);\s*\n\s*setSettleNote\(t\(reason === "daily_cap" \? "extra\.settleDailyCap" : "extra\.settleNoBalance"\)\);/);
    expect(screen).toMatch(/\{settleNote && \(/);
  });
});
