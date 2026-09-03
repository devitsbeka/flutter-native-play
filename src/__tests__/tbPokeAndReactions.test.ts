/**
 * The arena's sidelines: a poke for a teammate who is not answering, an
 * icon for the player on the spot, and an inbox that reads them back once
 * the turn is over. These pin the wiring; the SQL suite (14-room-reactions)
 * executes who may send to whom.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const match = read("src/components/team-battle/TeamBattleMatch.tsx");

describe("the poke", () => {
  it("only a teammate of the human on the spot can poke, with a cooldown, and it goes out as a room_ping plus a push", () => {
    expect(match).toMatch(/const canPoke = !isSpotlight && !isBotTurn && !!player && !!myTeam && player\.team === myTeam;/);
    expect(match).toMatch(/setTimeout\(\(\) => setPokeCooldown\(false\), 30_000\)/);
    expect(match).toMatch(/createNotification\(\s*player\.user_id,\s*"room_ping",/);
    expect(match).toMatch(/kind: "team_poke",[^]*?game_type_key: "team_battle"/);
    expect(match).toMatch(/invoke\("send-social-push", \{ body: \{ kind: "team_poke", roomId: room\.id \} \}\)/);
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
  it("spectators send the spotlight an icon; the inbox reads it back after the turn", () => {
    expect(match).toMatch(/<ReactionBar roomId=\{room\.id\} toUserId=\{player\.user_id\} \/>/);
    expect(match).toMatch(/const onSpot = state\.phase === "rapid_fire" && state\.active_player === user\?\.id;/);
    expect(match).toMatch(/!onSpot && inbox\.items\.length > 0/);
    const bar = read("src/components/team-battle/ReactionBar.tsx");
    expect(bar).toMatch(/<RoomIconPickerModal[^]*?iconOnly/);
    expect(bar).toMatch(/rememberRecentIcon\(icon\)/);
    const hook = read("src/hooks/useRoomReactions.ts");
    expect(hook).toMatch(/\.from\("room_reactions"\)\s*\.insert\(/);
    expect(hook).toMatch(/filter: `to_user_id=eq\.\$\{meId\}`/);
  });

  it("the table is guarded by seat and wired into CI", () => {
    const mig = read("supabase/migrations/20260927100000_room_reactions.sql");
    expect(mig).toMatch(/from_user_id = auth\.uid\(\)[^]*?from_user_id <> to_user_id/);
    expect(mig).toMatch(/ALTER PUBLICATION supabase_realtime ADD TABLE public\.room_reactions/);
    expect(read(".github/workflows/pr-checks.yml")).toMatch(/14-room-reactions\.sql/);
    expect(read("src/integrations/supabase/types.ts")).toMatch(/room_reactions: \{/);
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
