/**
 * The Guess card, and the sheet that dresses a team.
 *
 * Two changes that are easy to undo by accident:
 *
 *  - the create screen's first card used to be "Random Game", which rolled a
 *    category and opened a classic room — the same game the Classic Trivia
 *    card opens, one card to its right. It is the picture games now, which
 *    are a genuinely different thing to play and were reachable only by
 *    hunting through the library;
 *  - the crest sheet's green button used to require an icon, so renaming a
 *    side without also re-skinning it was impossible.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TEAM_NAME_MAX } from "@/utils/teamNameGenerator";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const create = read("src/components/team/CreateRoomPage.tsx");
const picker = read("src/components/team/RoomIconPickerModal.tsx");
const battle = read("src/pages/TeamBattlePage.tsx");
const screen = read("src/components/team/GuessPickerScreen.tsx");

const LOCALES = ["en", "ka", "de", "es", "fr", "it", "pt"] as const;

describe("Guess replaced Random on the create screen", () => {
  it("the card is the guess game, and nothing rolls a category any more", () => {
    expect(create).toMatch(/\{ key: "guess", art: featuredGuess,/);
    expect(create).not.toMatch(/\{ key: "random",/);
    expect(create).not.toMatch(/extra\.modeRandom/);
    // GameChoice is the union the cards are keyed by; "random" leaving it is
    // what makes a leftover reference a compile error rather than a dead
    // branch nobody notices.
    expect(create).toMatch(/type GameChoice = "quick" \| "guess" \|/);
  });

  it("the card asks which picture game instead of starting one", () => {
    // Every other card starts its game on the tap. This one cannot: which
    // picture game IS the choice, so it opens the question and arms the
    // start on the answer.
    expect(create).toMatch(/if \(key === "guess"\) \{/);
    const guessBranch = create.slice(create.indexOf('if (key === "guess") {'));
    const branchBody = guessBranch.slice(0, guessBranch.indexOf("autoStart.current = true;"));
    expect(branchBody).not.toMatch(/autoStart/);
    expect(create).toMatch(/extra\.guessPickTitle/);
    // And the answer PLAYS it, in the versus flow, with no room anywhere.
    // This went through a pre-lobby, then through a room started on the
    // pick; both were wrong for the same reason. A picture game is one
    // player (owner), and a room meant a row, a lobby route, a start and a
    // walk-in before the first question — plus a room left in the player's
    // list when the round was over.
    expect(create).toMatch(
      /const pickGuessCategory = \(cat: Category\) => \{[\s\S]*?handoff\(`\/game\?category=\$\{cat\.id\}`\);\s*\n\s*onClose\(\);\s*\n\s*\};/,
    );
    expect(create).not.toMatch(/setPreLobby\("guess"\)/);
    // Both cards say so.
    expect(create).toMatch(/key: "guess"[^}]*players: "1"/);
  });

  it("the question gets a screen, not a strip under the card", () => {
    // It used to unfold as three-to-a-row tiles beneath the picked card,
    // half of them below the fold and wedged against the Create button.
    // Figma 1059:8 gives it the page: the carousel AND the Create footer
    // stand down while it is open.
    expect(create).toMatch(/const guessPicking = gameChoice === "guess";/);
    expect(create).toMatch(/\{guessPicking \? \(/);
    expect(create).toMatch(/<GuessPickerScreen/);
    // Its own scroller — the document does not scroll on the device.
    expect(create).toMatch(/guessPicking \? \(\s*\n(?:.*\n)*?\s*<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">/);
    // And the back arrow closes the question before it leaves the page.
    expect(create).toMatch(/guessPicking \? setGameChoice\(null\) : navigate\("\/"\)/);
  });

  it("the screen is the designed grid", () => {
    // Two to a row at 167px, the art at its designed 82x96 box, and the
    // petal corners: within a complete 2x2 block each card rounds its
    // inner corner to 54. A block that is not complete stays plain, which
    // is what the design shows for a fifth, partnerless card.
    expect(screen).toMatch(/grid-cols-2 gap-x-\[14px\] gap-y-\[20px\]/);
    expect(screen).toMatch(/h-\[167px\]/);
    expect(screen).toMatch(/h-\[96px\] w-\[82px\]/);
    expect(screen).toMatch(/size=\{82\}/);
    for (const radius of [
      "rounded-\\[24px_24px_54px_24px\\]",
      "rounded-\\[24px_24px_24px_54px\\]",
      "rounded-\\[24px_54px_24px_24px\\]",
      "rounded-\\[54px_24px_24px_24px\\]",
    ]) {
      expect(screen).toMatch(new RegExp(radius));
    }
    expect(screen).toMatch(/if \(blockStart \+ 4 > total\) return "rounded-\[24px\]";/);
  });

  it("a picked tile actually walks into the room it just made", () => {
    // The category branch of performCreate created the room and stopped
    // there. It leaned on createRoom flipping the multiplayer context to
    // phase "lobby" — which only the rooms hub renders, over itself — and
    // /create-room mounts its own provider whose only consumer is the create
    // screen. So on that route the room was made, the context changed, and
    // the screen sat exactly where it was. Every other branch navigates; this
    // one has to as well.
    expect(create).toMatch(/let walkInCode: string \| null = null;/);
    // The code the room GOT, not the one that was planned — createRoom falls
    // back to a fresh code on a collision.
    expect(create).toMatch(/walkInCode = room\?\.room_code \?\? null;/);
    // Navigate first, close second: closing first paints the chooser
    // underneath for the whole join round trip. Through `handoff`, which is
    // that navigate plus the history rule — a chooser a rail deep-linked is
    // replaced rather than left behind for the Back button.
    expect(create).toMatch(/if \(walkInCode\) \{\s*\n\s*handoff\(/);
    expect(create).toMatch(/handoff\(`\/team\?join=\$\{walkInCode\}/);
    // And it goes last, so the invitations are sent before the screen leaves.
    const walkIn = create.indexOf("if (walkInCode) {");
    const invites = create.indexOf("await sendInvitation(challengeUserId, room.id);");
    expect(invites).toBeGreaterThan(-1);
    expect(walkIn).toBeGreaterThan(invites);
  });

  it("and a second tap can still arm the start", () => {
    // createEnabled does not change when one category replaces another, so
    // an effect keyed only on it never re-ran: after a create that failed and
    // toasted, every later tap set the ref and waited on a dependency that
    // was already true.
    expect(create).toMatch(
      /\}, \[gameChoice, createEnabled, isCreating, selectedCategory, user\]\);/,
    );
    // `user` is in there for a different failure: handleCreate returns at
    // once without a session, so a tap that landed before auth finished
    // restoring spent the arming on a call that did nothing, and the card
    // was dead for the rest of the visit. It stays armed until the session
    // is there.
    expect(create).toMatch(/if \(!autoStart\.current\) return;\s*\n(?:\s*\/\/.*\n)*\s*if \(!user\) return;/);
  });

  it("and going back brings the carousel back with it", () => {
    // The cards derive their height from --row-h, which the row measures and
    // publishes on itself. That measurement used to be a mount effect with []
    // deps — but the Guess screen UNMOUNTS the row while this component stays
    // mounted, so coming back mounted a new row the effect never ran for and
    // the observer was still watching the old, detached one. --row-h went
    // unset and every card resolved to zero height: a heading, a hairline and
    // no cards. A callback ref follows the element instead of the mount.
    expect(create).toMatch(/const rowRef = useCallback\(\(el: HTMLDivElement \| null\) => \{/);
    expect(create).toMatch(/rowObserver\.current\?\.disconnect\(\);/);
    expect(create).toMatch(/rowObserver\.current = ro;/);
    // The old shape, which could not survive the row being remounted.
    expect(create).not.toMatch(/const el = rowRef\.current;/);
  });

  it("and no room is created for it at all", () => {
    // The room was the whole problem: a row, a participant, a lobby route,
    // a start and a walk-in before the first question — and the room still
    // in the player's list afterwards. Playing it WITH friends is the
    // Library's room, which is where that belongs.
    expect(create).not.toMatch(/guessSolo/);
    expect(create).not.toMatch(/gameChoice === "guess" && room/);
    expect(create).not.toMatch(/roomIsPlaying/);
    // The versus screen has always taken a category on its URL and ignored
    // it, spinning to a random winner. It honours it now, or the picked
    // picture game would not be the one played.
    const vs = read("src/components/game/VSScreen.tsx");
    expect(vs).toMatch(/selectedCategoryId \} = useGame\(\)/);
    expect(vs).toMatch(/const chosenCategory = useMemo\(/);
    expect(vs).toMatch(/if \(chosenCategory\) \{\s*\n\s*setSelectedCategory\(\{ id: chosenCategory\.id, name: chosenCategory\.name \}\);/);
    // And a re-spin would throw the choice away.
    expect(vs).toMatch(/isCategoryLocked && !chosenCategory && categorySpinsLeft > 0/);
  });

  it("and startGame can be told which room, so it cannot read a stale one", () => {
    // state.currentRoom is set through setState, so a caller a tick behind
    // createRoom reads null off that closure and the round silently never
    // starts — the same silent nothing as every other bug in this sequence.
    const ctx = read("src/contexts/MultiplayerContextV2.tsx");
    expect(ctx).toMatch(/const startGame = useCallback\(async \(hostShouldObserve\?: boolean, room\?: GameRoom\) => \{/);
    expect(ctx).toMatch(/const startingRoom = room \?\? state\.currentRoom;/);
    // isHost is derived from state.currentRoom and is stale for the same
    // reason, so the guard reads the room in hand. Split in two since this
    // was written, and both halves now toast: "the round silently never
    // starts" above was the whole complaint, and a silent guard was still
    // one of the ways to produce it (see startSaysWhy.test.ts).
    expect(ctx).toMatch(/if \(!startingRoom \|\| !user\) \{/);
    expect(ctx).toMatch(/if \(startingRoom\.host_user_id !== user\.id\) \{/);
    expect(ctx).toMatch(/startGame: \(hostShouldObserve\?: boolean, room\?: GameRoom\) => Promise<void>;/);
  });

  it("the tiles are the picture games the database actually has", () => {
    // POPULAR_IMAGE_CATEGORY_IDS names six; guess_movie has no row, and a
    // tile that opens a category nobody can play is worse than no tile.
    expect(create).toMatch(/POPULAR_IMAGE_CATEGORY_IDS as readonly string\[\]\)\s*\n?\s*\.map\(\(id\) => categories\.find/);
    expect(create).toMatch(/\.filter\(\(c\): c is Category => !!c\)/);
  });

  it("every language names it", () => {
    for (const lang of LOCALES) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/modeGuessTitle: "/);
      expect(src, lang).toMatch(/modeGuessDesc: "/);
      expect(src, lang).toMatch(/guessPickTitle: "/);
      expect(src, lang).not.toMatch(/modeRandomTitle|modeRandomDesc/);
    }
  });
});

describe("the icon sheet saves what it was opened for", () => {
  it("a rename lands without picking an icon", () => {
    // `disabled={!selectedIcon || ...}` meant a dead green button on any
    // room with no icon on its row — every battle side before its captain's
    // device writes the dealt crest — no matter what was typed.
    expect(picker).toMatch(/const iconToSave = selectedIcon \?\? currentIconUrl;/);
    expect(picker).toMatch(/const canConfirm = iconOnly \? !!iconToSave : !!iconToSave \|\| !!editableName\.trim\(\);/);
    expect(picker).toMatch(/disabled=\{!canConfirm \|\| isGeneratingName\}/);
    // Which makes the icon optional at every call site.
    expect(picker).toMatch(/onConfirm: \(iconUrl: string \| null, newName: string\) => void;/);
  });

  it("it takes its starting values once per opening", () => {
    // The reset used to re-run whenever currentIconUrl or roomName changed —
    // which in a lobby means whenever the live room row moves underneath,
    // wiping the icon just tapped and retyping over the name being typed.
    expect(picker).toMatch(/const openedRef = useRef\(false\);/);
    expect(picker).toMatch(/if \(openedRef\.current\) return;/);
  });

  it("a team's name is capped where it is typed", () => {
    expect(TEAM_NAME_MAX).toBe(12);
    expect(picker).toMatch(/maxLength=\{nameMaxLength\}/);
    expect(battle).toMatch(/nameMaxLength=\{TEAM_NAME_MAX\}/);
    expect(battle).toMatch(/p_name: name\.slice\(0, TEAM_NAME_MAX\)/);
  });

  it("the battle lobby saves either half, and reads the room back", () => {
    expect(battle).toMatch(/if \(iconUrl\) void setTeamIcon\(team, iconUrl\);/);
    expect(battle).toMatch(/if \(newName && newName !== before\) void setTeamName\(team, newName\);/);
    // Realtime is the right default and not a guarantee; a write about your
    // own room re-reads it so the screen shows what you just did.
    const ctx = read("src/contexts/TeamBattleContext.tsx");
    expect(ctx).toMatch(/const refreshRoom = useCallback\(async \(\) => \{/);
    expect((battle.match(/await refreshRoom\(\);/g) ?? []).length).toBe(2);
  });
});
