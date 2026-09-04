/**
 * The arena's sidelines: a poke for a teammate who is not answering, an
 * icon for the player on the spot, and an inbox that reads them back once
 * the turn is over. These pin the wiring; the SQL suite (14-room-reactions)
 * executes who may send to whom.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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
    // Under the last answer, in the flow. It was a pill floating over the
    // gap above the question card — the one place on this screen where
    // something CAN be covered — and it is the next thing the eye reaches
    // after reading D.
    expect(match).toMatch(/\{called && \(/);
    expect(match).toMatch(/className="flex flex-shrink-0 justify-center pt-1"/);
    expect(match).not.toMatch(/pointer-events-none absolute left-1\/2 top-0\.5 z-30/);
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

  it("six animations, picked then sent — no library over the question", () => {
    const bar = read("src/components/team-battle/ReactionBar.tsx");
    // The library was three thousand nouns behind a search box, opened over
    // a live question with a clock running on it, to say "well done".
    expect(bar).not.toMatch(/RoomIconPickerModal|dealIcons|useSentIcons/);
    expect(read("src/hooks/useRoomReactions.ts")).not.toMatch(/useSentIcons|localStorage/);
    // Pick, then Send, where the library's + used to be.
    expect(bar).toMatch(/onSelect=\{\(\) => setPicked\(/);
    expect(bar).toMatch(/disabled=\{!picked\}/);
    expect(bar).toMatch(/t\("teamBattle\.sendIconAction"\)/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/sendIconAction: "/);
    }
    // And it says so afterwards: the button used to clear the picked tile
    // and go dead, which from the sender's side is indistinguishable from
    // nothing having happened.
    expect(bar).toMatch(/t\("teamBattle\.reactionSent"\)/);
    expect(bar).toMatch(/setTimeout\(\(\) => setSent\(false\), 1400\)/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/reactionSent: "/);
    }
    // Only the picked one animates: six looping Lotties under a running
    // clock is a lot of phone for a row nobody has chosen from yet.
    expect(bar).toMatch(/loop=\{selected\} autoplay=\{selected\}/);
  });

  it("the six are a fixed catalog keyed by name, and the inbox reads both", () => {
    const cat = read("src/components/team-battle/reactions.ts");
    for (const key of ["clap", "laugh", "love", "angry", "disappointed", "genius"]) {
      expect(cat).toMatch(new RegExp(`key: "${key}"`));
      expect(existsSync(join(process.cwd(), `src/assets/lottie/reactions/${key}.json`))).toBe(true);
      const label = `reaction${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      for (const lang of ["ka", "en", "de", "es", "fr", "it", "pt"]) {
        expect(read(`src/locales/${lang}.ts`), lang).toMatch(new RegExp(`${label}: "`));
      }
    }
    // The key is what rides the broadcast, so a device still on the build
    // that sent library icons puts a URL on the wire and it has to render.
    expect(read("src/components/team-battle/ReactionBar.tsx")).toMatch(
      /reaction \? \(\s*<Lottie[^]*?\) : \(\s*<img src=\{r\.icon\}/,
    );
    // CC BY 4.0 asks for attribution; this is where it lives.
    expect(read("src/assets/lottie/reactions/README.md")).toMatch(/CC BY 4\.0/);
  });

  it("they pop on every screen at once, for a second and a half", () => {
    // This was an inbox: reactions addressed to the player on the spot,
    // stacked, and read one at a time AFTER their turn. So the people who
    // sent them watched nothing happen, and the one person they were for
    // read them once the moment had passed.
    expect(match).toMatch(/<ReactionBar toUserId=\{player\.user_id\} \/>/);
    expect(match).toMatch(/<ReactionPops items=\{pops\} senders=\{senders\} \/>/);
    expect(match).not.toMatch(/ReactionInbox|inbox\.next/);
    const hook = read("src/hooks/useRoomReactions.ts");
    expect(hook).toMatch(/export const REACTION_MS = 1500;/);
    expect(hook).toMatch(/now - r\.at < REACTION_MS/);
    expect(hook).not.toMatch(/to_user_id === meId/);
    // Stamped on arrival: the sender's clock is not this device's.
    expect(read("src/contexts/TeamBattleContext.tsx")).toMatch(/at: Date\.now\(\) \}\],/);
    // And each one says whose it is.
    const bar = read("src/components/team-battle/ReactionBar.tsx");
    expect(bar).toMatch(/<SmartAvatar\s*\n?\s*avatarUrl=\{who\?\.avatar_url \?\? null\}/);
  });

  it("they sit at the end of the turn's own row, not in a band of their own", () => {
    // A row of its own held 46px of empty purple whenever nobody was
    // reacting, and pushed the question and its answers down the screen to
    // hold it.
    const bar = read("src/components/team-battle/ReactionBar.tsx");
    expect(bar).toMatch(/h-\[34px\] min-w-0 flex-shrink items-center justify-end/);
    // Three, not five: this row already carries a name and a Call button.
    expect(bar).toMatch(/items\.slice\(-3\)/);
    // And it is where the ✓/✗ tally used to be, which moved above the card.
    expect(match).toMatch(/<ReactionPops items=\{pops\} senders=\{senders\} \/>\s*\n\s*<\/div>/);
  });

  it("the tally moved above the question card, hard right", () => {
    // The band the category's artwork floats in was empty air on the other
    // side of the picture; nothing moves to make room for it there.
    expect(match).toMatch(
      /pointer-events-none absolute right-4 top-1 z-20 flex items-center gap-2 rounded-full/,
    );
    expect(match).toMatch(/✓ \{turnPicks\.filter\(\(p\) => p\.correct\)\.length\}/);
  });

  it("a side reads crest, then name over score", () => {
    // The name and the score were stacked with the crest beside only the
    // name, so the number sat under a blank.
    expect(match).toMatch(/flex items-center gap-2 \$\{team === "a" \? "" : "flex-row-reverse"\}/);
    expect(match).toMatch(/text-\[26px\] font-black leading-none text-white/);
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
  it("a guess board runs thirty seconds, everything else a minute", () => {
    const pics = [{ slug: "guess_logo" }, { slug: "guess_city" }];
    expect(turnSecondsFor(pics)).toBe(30);
    expect(turnSecondsFor([{ slug: "guess_flag" }])).toBe(30);

    expect(turnSecondsFor([{ slug: "animals" }])).toBe(60);
    // A mixed board takes the longer clock: the slowest question on it is
    // what the turn has to accommodate.
    expect(turnSecondsFor([{ slug: "guess_logo" }, { slug: "animals" }])).toBe(60);
    // And anything that arrives without a slug is not assumed to be quick.
    expect(turnSecondsFor([{ slug: "guess_logo" }, {}])).toBe(60);
    expect(turnSecondsFor([])).toBe(60);
  });

  it("the clock reaching zero ends the answering on the device", () => {
    // The RPC refuses a late answer, but refusing it server-side leaves the
    // buttons live: the player taps into a hole until tb_advance lands.
    const match = read("src/components/team-battle/TeamBattleMatch.tsx");
    expect(match).toMatch(/const timeUp = secondsLeft <= 0;/);
    expect(match).toMatch(/if \(submitting \|\| choice \|\| !question \|\| timeUp\) return;/);
    expect(match).toMatch(/disabled=\{!isSpotlight \|\| !!choice \|\| submitting \|\| timeUp\}/);
    expect(match).toMatch(/if \(!choice && timeUp\) return "disabled";/);
    // And the fallback clock agrees with what the board now asks for.
    expect(match).toMatch(/state\?\.turn_seconds \?\? 60/);
  });

  it("both values are inside the range every version of the RPC accepts", () => {
    // 20..90 in 20260917100000 and 20260921210000, 20..180 after
    // 20260924100000 — so no start has to be retried at a lower number.
    for (const n of [30, 60]) {
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

describe("a ping says what it is for", () => {
  const trans = read("src/utils/notificationTranslations.ts");

  it("three messages under one type, told apart by the kind that was sent", () => {
    // A guest asking the host to start, a teammate calling the player on
    // the spot, and a lobby calling somebody back to an empty seat — all
    // `room_ping`, and all of them titled "{name}: Let's play!", which is
    // only true of the first.
    expect(trans).toMatch(/if \(type === 'room_ping' && typeof data\?\.kind === 'string'\)/);
    expect(trans).toMatch(/team_poke: 'teamBattle\.pokeNotifTitle'/);
    expect(trans).toMatch(/room_callback: 'teamBattle\.callBackTitle'/);
  });

  it("and the body is never the words that happened to be stored", () => {
    // What got stored was whatever the sender had to hand: a category name,
    // or a bare room code like "7EXAZJ" under "Let's play!".
    expect(trans).toMatch(/if \(type === 'room_ping'\) \{/);
    expect(trans).toMatch(/team_poke: 'teamBattle\.pokeNotifBody'/);
    expect(trans).toMatch(/room_callback: 'teamBattle\.callBackBody'/);
    expect(trans).toMatch(/pingBodies\[kind\] \?\? 'extra\.pingHostNotifBody'/);
    // Nobody sends a room code as a message any more either.
    expect(read("src/pages/TeamBattlePage.tsx")).not.toMatch(
      /"room_ping",[^]{0,200}room\.room_code,\s*\n\s*\{/,
    );
    expect(read("src/pages/TeamBattlePage.tsx")).toMatch(/kind: "room_callback",/);
    expect(match).toMatch(/t\("teamBattle\.pokeNotifBody"\)/);
  });

  it("in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/callBackTitle: ".*\{name\}.*"/);
      expect(src, lang).toMatch(/callBackBody: "/);
      expect(src, lang).toMatch(/pokeNotifBody: "/);
      expect(src, lang).toMatch(/pingHostNotifBody: "/);
      expect(src, lang).toMatch(/someoneLabel: "/);
    }
  });
});
