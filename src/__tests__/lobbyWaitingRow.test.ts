/**
 * The lobby's waiting line: said once, with a real face, and breathing.
 *
 * Three things the owner caught on the classic room screen.
 *
 * 1. "Invite a friend — a game needs two players" was on screen twice at
 *    once — under the player rows and again under the Start button. Same
 *    key, same words, two places.
 *
 * 2. A player whose avatar_url no longer loads got the browser's torn-page
 *    glyph next to their name. The row rendered `player.avatarUrl` straight
 *    into an <img>. LobbyFace — which resolves the URL and falls back on
 *    error — already existed in this very file, with a comment describing
 *    this exact bug being fixed for the invite row. The players list and
 *    the footer caption were never moved over.
 *
 * 3. "Waiting for the host to start…" held perfectly still, so a guest
 *    could not tell a live room from a stuck one.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const classic = read("src/components/team/RoomLobbyV2.tsx");
const arena = read("src/pages/TeamBattlePage.tsx");
const king = read("src/pages/KingPage.tsx");

describe("the invite line is said once", () => {
  it("the classic lobby no longer passes the hint it already shows below the CTA", () => {
    expect(classic).not.toMatch(/playersHint=\{enoughPlayers \? null : t\("extra\.rlNeedsSecondPlayer"\)\}/);
    // The footer caption — the surviving copy — is untouched.
    expect(classic).toMatch(/caption: !needsCategorySelection && !enoughPlayers && !isStarting \? t\("extra\.rlNeedsSecondPlayer"\) : null,/);
    // Exactly one place renders that string as lobby chrome now.
    expect(classic.match(/t\("extra\.rlNeedsSecondPlayer"\)/g) ?? []).toHaveLength(2); // caption + the start toast
  });

  it("but the prop survives, because the arena's hint says something else", () => {
    // "2 more to start" is not duplicated anywhere, so removing the prop
    // outright would have taken a useful line with it.
    expect(universal).toMatch(/playersHint\?: string \| null;/);
    expect(arena).toMatch(/playersHint=\{stillNeeded > 0 \? t\("teamBattle\.needToStart", \{ n: stillNeeded \}\) : null\}/);
  });
});

describe("a face that cannot load is a mascot, not a torn page", () => {
  it("the player row goes through LobbyFace", () => {
    expect(universal).toMatch(/<LobbyFace url=\{player\.avatarUrl \?\? null\} seed=\{player\.name\} \/>/);
    // The bare <img> that produced the glyph is gone.
    expect(universal).not.toMatch(/<img alt="" src=\{player\.avatarUrl\}/);
  });

  it("and so does the host's face on the waiting line", () => {
    expect(universal).toMatch(/<LobbyFace\s*\n\s*url=\{start\.captionAvatarUrl \?\? null\}/);
    expect(universal).toMatch(/seed=\{start\.captionAvatarName \?\? ""\}/);
    // The ring moved to the wrapper, so the round crop still holds.
    expect(universal).toMatch(/size-6 shrink-0 overflow-hidden rounded-full ring-2 ring-white\/70/);
  });

  it("LobbyFace recovers what it can and falls back on a real load failure", () => {
    // Not just "no URL" — a URL that 404s is the case the players list hit.
    expect(universal).toMatch(/const resolved = resolveAvatarUrl\(url\);/);
    expect(universal).toMatch(/const src = failed \|\| !resolved \? fallbackAvatarFor\(seed\) : resolved;/);
    expect(universal).toMatch(/onError=\{\(\) => setFailed\(true\)\}/);
  });

  it("every lobby still hands it the real host, not a placeholder", () => {
    for (const [name, src] of [["arena", arena], ["king", king], ["classic", classic]] as const) {
      expect(src, name).toMatch(/captionAvatarUrl:[\s\S]{0,140}is_host\)\?\.avatar_url/);
    }
  });
});

describe("the waiting line breathes", () => {
  it("opt-in, so an instruction can still hold still", () => {
    expect(universal).toMatch(/captionPulse\?: boolean;/);
    expect(universal).toMatch(/start\.captionPulse && !reduceMotion \? \{ opacity: \[1, 0\.6, 1\] \} : undefined/);
    expect(universal).toMatch(/duration: 2\.4, repeat: Infinity, ease: "easeInOut"/);
  });

  it("reduced motion gets the words and the face, holding still", () => {
    // The guard is on both animate and transition, so nothing is scheduled.
    expect(universal.match(/start\.captionPulse && !reduceMotion/g) ?? []).toHaveLength(2);
  });

  it("is on wherever a guest is waiting for a host", () => {
    expect(classic).toMatch(/caption: t\("team\.waitingForHost"\),\s*\n\s*captionPulse: true,/);
    expect(arena).toMatch(/caption: t\("teamBattle\.waitingHost"\),\s*\n\s*captionPulse: true,/);
  });

  it("and off on a dead end", () => {
    // The King's "no questions in your language" is not a thing in progress.
    expect(king).toMatch(/captionPulse: !noPool,/);
  });
});
