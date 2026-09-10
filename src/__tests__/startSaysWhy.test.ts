/**
 * A Start that does not start says why, and a new room asks before letting
 * strangers in.
 *
 * THE DEAD START. The owner: "i still can't start the game, wtf?" — a live,
 * full-opacity button, three players seated, and pressing it did nothing.
 * Not a refusal they could act on: no toast, no spinner, no visible reason.
 *
 * The start path had seven exits that ended in a bare `return` or a
 * console line. Any one of them produces exactly that symptom, and from the
 * outside they are indistinguishable from each other and from a hang. The
 * one that is most likely in the wild is the room re-read failing — a
 * dropped connection or an RLS refusal — which ended with console.error and
 * nothing else.
 *
 * This does not claim to have found the guard that fired on the owner's
 * phone; it makes every one of them speak, so the next press names itself.
 *
 * ASK ME BY DEFAULT. A room is created Public with Joining set to "Ask me"
 * (owner's ask), reversing the open-by-default of 20260930100000. The column
 * default is the whole change: no client path sets this field when it creates
 * a room, so every one of them picks it up and a new path cannot miss it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");
const create = read("src/components/team/CreateRoomPage.tsx");
const sql = read("supabase/migrations/20261014100000_rooms_ask_to_join_by_default.sql");

/** The body of one function in the context, by its declaration line. */
function fn(name: string): string {
  const start = ctx.indexOf(`const ${name} = useCallback(async`);
  expect(start, name).toBeGreaterThan(-1);
  const end = ctx.indexOf("\n  }, [", start);
  return ctx.slice(start, end === -1 ? undefined : end);
}

describe("every way Start can fail now says so", () => {
  it.each(["startGame", "startNewRound", "startNextFromQueue"])(
    "%s has no bare return before it has spoken",
    (name) => {
      const body = fn(name);
      const lines = body.split("\n");
      const silent: string[] = [];
      lines.forEach((line, i) => {
        if (!line.trim().endsWith("return;")) return;
        const near = lines.slice(Math.max(0, i - 6), i + 1).join("\n");
        // Spoken for: the exit toasts.
        if (near.includes("toast")) return;
        // Handed off: the line above starts a round through another of these
        // functions, which speaks for itself. That is a delegation, not a
        // dead end, and it is why this check names the rule rather than
        // just counting bare returns.
        if (/await start[A-Za-z]+\(\);/.test(lines[i - 1] ?? "")) return;
        // Outrun: another client's start won the compare-and-swap, and ITS
        // round is what arrives on this screen a moment later — over
        // realtime, with its own countdown. Saying "failed" here would be a
        // lie told over a round that is starting (roundStartIsOneWrite).
        // The claim's field list runs longer than the six lines above the
        // return, so this one looks further back.
        if (lines.slice(Math.max(0, i - 14), i + 1).join("\n").includes("claimRoundStart(")) return;
        silent.push(`${i}: ${line.trim()}`);
      });
      expect(silent, `${name} still has silent exits`).toEqual([]);
    },
  );

  it("the host guard is a message, not just a console warning", () => {
    // The Start button is drawn from the same isHost, so when this disagrees
    // with it the host taps a live button and nothing happens at all.
    expect((ctx.match(/toast\.error\(tStandalone\("extra\.mpOnlyHostStarts"\)\)/g) ?? []).length).toBe(3);
  });

  it("and a room re-read that fails tells the host what to do", () => {
    // The likeliest real cause: the row read fails and the round never
    // begins. It used to end with a console line the player never sees.
    expect(ctx).toMatch(
      /console\.error\("\[startNewRound\] Failed to fetch fresh room:", roomError\);\s*\n\s*toast\.error\(tStandalone\("extra\.mpRoomDataNotFound"\), \{\s*\n\s*description: tStandalone\("extra\.mpReopenRoom"\),/,
    );
  });

  it("in every language, since this is what a stuck host reads", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/\n\s+mpOnlyHostStarts: "[^"]+",/);
      expect(src, lang).toMatch(/\n\s+mpReopenRoom: "[^"]+",/);
    }
  });
});

describe("a new room is public, and asks", () => {
  it("public was already the default and stays it", () => {
    expect(create).toMatch(/const isPublic = true;/);
  });

  it("ask-me comes from the column, so no create path can miss it", () => {
    // Nothing on the client sets requires_approval when it creates a room —
    // the chooser, the lounges and Words all insert without it — so the
    // column default reaches all of them at once.
    expect(sql).toMatch(/ALTER COLUMN requires_approval SET DEFAULT true;/);
    const clientSets = ctx.match(/requires_approval:/g) ?? [];
    expect(clientSets).toHaveLength(0);
  });

  it("and rooms that already exist are left alone", () => {
    // Quietly starting to hold arrivals for approval would strand the people
    // knocking on a host who never asked to be a doorman.
    expect(sql).not.toMatch(/UPDATE public\.game_rooms/i);
    expect(sql).toMatch(/LEFT ALONE/);
  });

  it("the lobby row still reports the room's real setting", () => {
    // The default decides what a NEW room is; the row is not hard-coded to
    // it, or a host who turned it off would see it turn itself back on.
    const lobby = read("src/components/team/RoomLobbyV2.tsx");
    expect(lobby).toMatch(/value: needsApproval \? "ask" : "open",/);
    expect(lobby).toMatch(/const needsApproval = Boolean\(\(currentRoom as \{ requires_approval\?: boolean \}\)\.requires_approval\);/);
  });
});
