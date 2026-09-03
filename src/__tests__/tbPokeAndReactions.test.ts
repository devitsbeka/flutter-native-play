/**
 * The arena's sidelines: a poke for a teammate who is not answering, an
 * icon for the player on the spot, and an inbox that reads them back once
 * the turn is over. These pin the wiring; the SQL suite (14-room-reactions)
 * executes who may send to whom.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { turnSecondsFor } from "@/utils/turnLength";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const match = read("src/components/team-battle/TeamBattleMatch.tsx");

describe("the poke", () => {
  it("only a teammate of the human on the spot can poke, with a cooldown, and it goes out as a room_ping plus a push", () => {
    expect(match).toMatch(/const canPoke = !isSpotlight && !isBotTurn && !!player && !!myTeam && player\.team === myTeam;/);
    expect(match).toMatch(/setTimeout\(\(\) => setPokeCooldown\(false\), 30_000\)/);
    expect(match).toMatch(/createNotification\(\s*player\.user_id,\s*"room_ping",/);
    expect(match).toMatch(/kind: "team_poke",[^]*?game_type_key: "team_battle"/);
    expect(match).toMatch(/invoke\("send-social-push", \{ body: \{ kind: "team_poke", roomId: room\.id \} \}\)/);
    // And the one that reaches somebody who is looking at the question: the
    // notification and the push are both for a player who is away.
    expect(match).toMatch(/sendPoke\(player\.user_id, name\);/);
  });

  it("the called player sees a label, for three seconds, over nothing that matters", () => {
    // The app's toasts are delivery-suppressed (lib/toast), so before this
    // the only thing that arrived mid-turn was the notification sound.
    const ctx = read("src/contexts/TeamBattleContext.tsx");
    expect(ctx).toMatch(/\.on\("broadcast", \{ event: "poke" \}/);
    expect(ctx).toMatch(/const sendPoke = useCallback\(\(toUserId: string, fromNickname: string\)/);
    // Only the player being called, and a fresh call re-triggers it.
    expect(match).toMatch(/if \(!lastPoke \|\| !user \|\| lastPoke\.to !== user\.id\) return;/);
    expect(match).toMatch(/setTimeout\(\(\) => setCalled\(false\), 3000\)/);
    // In the gap the question card already leaves above itself, and out of
    // the way of taps: a call that hides what it is telling you to answer is
    // worse than no call.
    expect(match).toMatch(/pointer-events-none absolute left-1\/2 top-0\.5 z-30/);
    expect(match).toMatch(/t\("teamBattle\.callOut"\)/);
  });

  it("the push server knows the kind, routes it to the arena, and copies it in seven languages", () => {
    const fn = read("supabase/functions/send-social-push/index.ts");
    expect(fn).toMatch(/kind === "team_poke"/);
    expect(fn).toMatch(/\.from\("team_battle_state"\)[^]*?active_player/);
    expect(fn).toMatch(/route = `\/team-battle\?code=\$\{encodeURIComponent\(room\.room_code\)\}`;/);
    const copy = read("supabase/functions/_shared/pushCopy.ts");
    expect(copy).toMatch(/\| "team_poke";/);
    for (const lang of ["ka", "en", "de", "es", "fr", "it", "pt"]) {
      expect(copy).toMatch(new RegExp(`team_poke: \\{[^]*?${lang}: \\{ title:`));
    }
  });

  it("a ping's popup, card and detail all open the room the ping is from", () => {
    for (const f of [
      "src/contexts/NotificationsContext.tsx",
      "src/components/home/NotificationsPanel.tsx",
      "src/pages/Notifications.tsx",
      "src/components/notifications/NotificationDetailModal.tsx",
    ]) {
      const src = read(f);
      expect(src).toMatch(/routeForRoom\(/);
      expect(src).not.toMatch(/room_ping[^]{0,400}\/team\?join=/);
    }
  });
});

describe("the icons", () => {
  it("they travel on the match's own channel, not through a table", () => {
    // There WAS a table, `room_reactions`, with row-level rules about who
    // may send to whom. It never existed anywhere it mattered: migrations
    // here land by hand, one paste at a time, and until that paste happens
    // PostgREST answers every insert with "relation does not exist" — so
    // the feature shipped and every icon anyone tapped did nothing at all.
    //
    // A reaction is read once, by one person, minutes after it is sent, and
    // then never again. That is a message, and the match already has a
    // message channel.
    const ctx = read("src/contexts/TeamBattleContext.tsx");
    expect(ctx).toMatch(/\.on\("broadcast", \{ event: "reaction" \}/);
    expect(ctx).toMatch(/const sendReaction = useCallback\(/);
    expect(ctx).toMatch(/event: "reaction",/);
    // A fresh game forgets the last one's.
    expect(ctx).toMatch(/setReactions\(\[\]\);/);

    // Code, not prose — the module's header explains the table it replaced.
    const hook = read("src/hooks/useRoomReactions.ts");
    expect(hook).not.toMatch(/from "@\/integrations\/supabase/);
    expect(hook).not.toMatch(/\.from\("room_reactions"\)/);
    // And nothing anywhere still reaches for the table.
    expect(read("src/integrations/supabase/types.ts")).not.toMatch(/room_reactions/);
    expect(read(".github/workflows/pr-checks.yml")).not.toMatch(/room-reactions/);
  });

  it("the row is dealt fresh each game, with what you have sent at the front", () => {
    // It used to be read out of localStorage — "recently used", forever —
    // so the same six icons greeted the same player every match they ever
    // played.
    const bar = read("src/components/team-battle/ReactionBar.tsx");
    expect(bar).toMatch(/function dealIcons\(pool: readonly string\[\], count: number\)/);
    expect(bar).toMatch(/const row = \[\.\.\.sent, \.\.\.dealt\.filter\(\(d\) => !sent\.includes\(d\)\)\]/);
    const hook = read("src/hooks/useRoomReactions.ts");
    expect(hook).not.toMatch(/localStorage\.(get|set)Item/);
    expect(hook).toMatch(/export function useSentIcons\(\)/);
  });

  it("the button says send, because the pick leaves the screen", () => {
    const picker = read("src/components/team/RoomIconPickerModal.tsx");
    expect(picker).toMatch(/confirmLabel\?: string;/);
    expect(picker).toMatch(/\{confirmLabel \?\? t\("extra\.ripSelect"\)\}/);
    expect(read("src/components/team-battle/ReactionBar.tsx")).toMatch(
      /confirmLabel=\{t\("teamBattle\.sendIconAction"\)\}/,
    );
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/sendIconAction: "/);
    }
  });

  it("the inbox reads one at a time, and says who sent it", () => {
    // A wrapped row of six was a pile of stickers with no sender attached to
    // any of them. One card, one face, one name; closing it brings the next.
    expect(match).toMatch(/<ReactionBar toUserId=\{player\.user_id\} \/>/);
    expect(match).toMatch(/const onSpot = state\.phase === "rapid_fire" && state\.active_player === user\?\.id;/);
    expect(match).toMatch(/!onSpot && inbox\.next/);
    const bar = read("src/components/team-battle/ReactionBar.tsx");
    expect(bar).toMatch(/<SmartAvatar avatarUrl=\{who\?\.avatar_url \?\? null\}/);
    expect(bar).toMatch(/remaining > 1 &&/);
    const hook = read("src/hooks/useRoomReactions.ts");
    expect(hook).toMatch(/next: items\[0\] \?\? null/);
  });
});

describe("the invitation popup", () => {
  it("answers on the spot: Join accepts and opens the room, Decline says no", () => {
    const gate = read("src/components/team/GameInviteGate.tsx");
    expect(gate).toMatch(/const code = await acceptInvitation\(next\.id\);\s*if \(code\) navigate\(routeForRoom\(next\.room, code\)\);/);
    expect(gate).toMatch(/acceptLabel=\{t\("extra\.notifJoin"\)\}/);
    expect(gate).toMatch(/declineLabel=\{t\("extra\.notifDecline"\)\}/);
    expect(gate).toMatch(/onDecline=\{\(\) => next && void declineInvitation\(next\.id\)\}/);
    // The room's kind has to travel with the invitation for routeForRoom to
    // open the arena rather than the classic lobby.
    const hook = read("src/hooks/useGameInvitations.ts");
    expect(hook).toMatch(/select\("room_code, category_name, game_type_key, game_mode"\)/);
    expect(hook).toMatch(/room:game_rooms\(room_code, category_name, game_type_key, game_mode\)/);
  });

  it("is the doorstep's card, not a second one", () => {
    // A friend inviting you and a stranger knocking are the same question
    // with the roles swapped; they were drawn as two different popups.
    for (const f of [
      "src/components/team/GameInviteGate.tsx",
      "src/components/team/JoinRequestGate.tsx",
    ]) {
      expect(read(f)).toMatch(/<PersonAskModal\b/);
    }
    // Only the words differ.
    expect(read("src/components/team/GameInviteGate.tsx")).toMatch(/body=\{t\("extra\.inviteModalBody"\)\}/);
    for (const lang of ["ka", "en", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`)).toMatch(/inviteModalBody: "/);
    }
    // And the hook no longer raises one of its own beside it.
    expect(read("src/hooks/useGameInvitations.ts")).not.toMatch(/friendInvitesYouGame/);
  });

  it("is mounted once, app-wide, beside the doorstep", () => {
    expect(read("src/App.tsx")).toMatch(/<GlobalGameInviteGate \/>/);
  });

  it("leaves invitations that were already waiting to the notifications list", () => {
    // Otherwise every launch opens a modal over the home screen for an
    // invitation the player has already seen, until it expires.
    const gate = read("src/components/team/GameInviteGate.tsx");
    expect(gate).toMatch(/alreadyWaiting\.current = new Set\(pendingInvitations\.map\(\(inv\) => inv\.id\)\)/);
    expect(gate).toMatch(/pendingInvitations\.filter\(\(inv\) => !seen\.has\(inv\.id\)\)/);
  });
});

describe("a turn is as long as its questions need", () => {
  it("a picture board runs a minute, everything else ninety seconds", () => {
    const pics = [{ slug: "guess_logo" }, { slug: "guess_city" }];
    expect(turnSecondsFor(pics)).toBe(60);
    expect(turnSecondsFor([{ slug: "guess_flag" }])).toBe(60);

    expect(turnSecondsFor([{ slug: "animals" }])).toBe(90);
    // A mixed board takes the longer clock: the slowest question on it is
    // what the turn has to accommodate.
    expect(turnSecondsFor([{ slug: "guess_logo" }, { slug: "animals" }])).toBe(90);
    // And anything that arrives without a slug is not assumed to be quick.
    expect(turnSecondsFor([{ slug: "guess_logo" }, {}])).toBe(90);
    expect(turnSecondsFor([])).toBe(90);
  });

  it("both values are inside the range every version of the RPC accepts", () => {
    // 20..90 in 20260917100000 and 20260921210000, 20..180 after
    // 20260924100000 — so no start has to be retried at a lower number.
    for (const n of [60, 90]) {
      expect(n).toBeGreaterThanOrEqual(20);
      expect(n).toBeLessThanOrEqual(90);
    }
    const ctx = read("src/contexts/TeamBattleContext.tsx");
    expect(ctx).toMatch(/p_turn_seconds: turnSecondsFor\(categories\)/);
    expect(ctx).not.toMatch(/between 20 and 90/);
    // The slug is what tells them apart, and it has to survive the trip.
    expect(read("src/pages/TeamBattlePage.tsx")).toMatch(/slug: c\.category_id/);
  });
});
