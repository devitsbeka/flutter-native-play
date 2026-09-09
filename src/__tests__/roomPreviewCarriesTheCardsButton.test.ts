/**
 * The preview sheet carries the card's own button, beside Close.
 *
 * The sheet used to close and nothing else — the way in was the card's
 * button, deliberately not repeated. But a player who has just read what a
 * room plays and what a seat costs is exactly the player who wants the way
 * in, and sending them back out to the card for it was a tap for nothing
 * (owner: "show same button what we show on card next to the close button
 * when user taps on card to see categories in round, make sure buttons
 * have same styles").
 *
 * One button, built once: the CARD builds it as a factory (same tone, same
 * word, same tap), draws it on itself, and hands the same factory to the
 * sheet, which draws it at the sheet's size beside a Close in the same
 * pill and asks it to close the sheet after the tap. Two lists, two cards,
 * one shape. The rail card has no button, so its sheet has Close alone.
 *
 * And the sheet's rounds: a client ahead of the rounds migration read an
 * empty list and said the host had picked nothing, under a card that said
 * "Random" — the old RPC still names the first round, so that is the list
 * until the migration lands. The private list also refreshes when a queue
 * changes now; a host picking rounds writes nothing else.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const sheet = read("src/components/team/RoomPreviewSheet.tsx");
const publicRooms = read("src/components/team/PublicRoomsSection.tsx");
const myRooms = read("src/components/team/MyRoomsSection.tsx");

describe("the sheet's footer", () => {
  it("is Close and the card's button, in the card's own pill, the same size", () => {
    expect(sheet).toMatch(/export const PREVIEW_BUTTON_CLASS = "flex-1 justify-center py-3 text-\[15px\]";/);
    // Close is the same pill unfilled — RoomCardPlayButton's `outline`
    // tone, white's stroke and no face (owner: "close button do not need
    // white color, show with just stroke") — not a second shape.
    expect(sheet).toMatch(/<RoomCardPlayButton tone="outline" className=\{PREVIEW_BUTTON_CLASS\} onClick=\{onClose\}>\s*\n\s*\{t\("common\.close"\)\}\s*\n\s*<\/RoomCardPlayButton>\s*\n\s*\{action\}/);
    expect(read("src/components/team/RoomCardPlayButton.tsx")).toMatch(/outline: "bg-transparent border-x-2 border-t-2 border-\[#d5c9e8\] text-\[#320c69\]",/);
    // The chunky outline Close is gone: two shapes in one row read as two
    // ranks of button.
    expect(sheet).not.toMatch(/ChunkyButton/);
  });

  it("draws what it is handed and builds nothing of its own", () => {
    expect(sheet).toMatch(/export type PreviewActionFactory = \(opts\?: \{ className\?: string; then\?: \(\) => void \}\) => ReactNode;/);
    expect(sheet).not.toMatch(/onJoin|onAsk|navigate\(/);
  });
});

describe("the public card", () => {
  it("builds its button once and draws it on itself", () => {
    expect(publicRooms).toMatch(/const playButton: PreviewActionFactory = \(opts = \{\}\) => \(/);
    expect(publicRooms).toMatch(/\{playButton\(\)\}/);
  });

  it("hands the same one to the sheet, which sizes it and closes on the tap", () => {
    expect(publicRooms).toMatch(/onPreview\(room, playButton\)/);
    expect(publicRooms).toMatch(/action=\{previewing\?\.action\(\{ className: PREVIEW_BUTTON_CLASS, then: \(\) => setPreviewing\(null\) \}\)\}/);
    expect(publicRooms).toMatch(/className=\{opts\.className\}/);
    expect(publicRooms).toMatch(/opts\.then\?\.\(\);/);
  });
});

describe("the private cards", () => {
  it("the grid card builds its button once and draws it on itself", () => {
    expect(myRooms).toMatch(/const playButton: PreviewActionFactory = \(opts = \{\}\) => \(/);
    expect(myRooms).toMatch(/\{action && \(\s*\/\*[\s\S]*?playButton\(\)\s*\n\s*\)\}/);
  });

  it("hands it to the sheet only when it has one; the rail card hands nothing", () => {
    expect(myRooms).toMatch(/onPreview\(action \? playButton : undefined\);/);
    expect(myRooms).toMatch(/onPreview=\{\(action\) => setPreviewing\(\{ room, action \}\)\}/);
    expect(myRooms).toMatch(/onPreview=\{\(\) => setPreviewing\(\{ room \}\)\}/);
    expect(myRooms).toMatch(/action=\{previewing\?\.action\?\.\(\{ className: PREVIEW_BUTTON_CLASS, then: \(\) => setPreviewing\(null\) \}\)\}/);
  });
});

describe("the rounds the sheet counts", () => {
  it("a public room ahead of the rounds migration still lists the round its card names", () => {
    const hook = read("src/hooks/usePublicRooms.ts");
    expect(hook).toMatch(/: row\.first_category_name\s*\n\s*\? \[\{ name: row\.first_category_name as string/);
  });

  it("the private list refreshes when a room's queue changes", () => {
    const hook = read("src/hooks/useMyRooms.ts");
    expect(hook).toMatch(/table: 'room_category_queue' \}, \(\) => realtimeInvalidate\?\.\(\)\)/);
  });
});

describe("the round rows", () => {
  it("are the lobby's own: number, icon tile, name over Round N — narrow, not a card each", () => {
    // The rows handed the icon a CSS size it ignores (it defaults to 128px)
    // and a random round carried no slug, so each row swelled around a
    // giant faint placeholder (owner: "show more narrow containers for
    // each category with icons").
    expect(sheet).toMatch(/className="flex min-h-\[58px\] items-center gap-2 rounded-xl border border-\[#e8e0f5\] bg-white\/70 py-2 pl-2 pr-3"/);
    expect(sheet).toMatch(/<span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-\[#7126d5\]\/10">\s*\n\s*<DynamicIcon slug=\{roundIconSlug\(round\)\} size=\{22\} shadow=\{false\} \/>/);
    expect(sheet).toMatch(/t\("lobby\.uRoundLabel", \{ count: i \+ 1 \}\)/);
    expect(sheet).not.toMatch(/className="h-6 w-6 shrink-0"/);
  });

  it("a random or mixed round wears the mystery box, like everywhere else", () => {
    expect(sheet).toMatch(/import \{ roundIconSlug \} from "@\/utils\/ownTriviaRound";/);
  });
});
