/**
 * The host's bin, on every other row of the lobby.
 *
 * A seat, once filled, could not be emptied by the host: a wrong invite, a
 * stranger who walked into a public room, a friend who fell asleep — each
 * sat in the list until its owner chose to leave (owner: "host should be
 * able remove players from lobby, show delete icon next to the players
 * username").
 *
 *   the row     a bin at the trailing edge, on everybody but the host
 *               themself, only while the room waits, only for the host;
 *   the tap     asks first — "Remove {name}?" — then goes through
 *               lobby_manage_seat, the battle lobby's own seat function,
 *               which checks host, waiting and not-self on the server;
 *   the removed their own device notices the seat is gone, confirms it with
 *               the table, says so, and leaves the room.
 *
 * There was a remove handler in the lobby before this, deleting the row
 * itself, and nothing that called it. Gone.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const rpc = read("supabase/migrations/20260921120000_lobby_manage_seat.sql");

describe("the row", () => {
  it("draws a bin for a player with onRemove, last, as a sibling of the body", () => {
    expect(universal).toMatch(/onRemove\?: \(\) => void;/);
    expect(universal).toMatch(/remove\?: string;/);
    expect(universal).toMatch(/onClick=\{player\.onRemove\}\s*\n\s*aria-label=\{removeLabel\}/);
    expect(universal).toMatch(/<Trash2 className=\{addFriendIcon\}/);
    expect(universal).toMatch(/\{Body\}\s*\n\s*\{addFriend\}\s*\n\s*\{call\}\s*\n\s*\{armband\}\s*\n\s*\{remove\}/);
    // Both benches — the room's single list and the battle's two — get it.
    expect(universal.match(/removeLabel=\{labels\.remove \?\? "Remove"\}/g) ?? []).toHaveLength(2);
  });
});

describe("the lobby", () => {
  it("offers it to the host, on everyone else, while the room waits", () => {
    expect(lobby).toMatch(
      /onRemove:\s*\n\s*isHost && p\.user_id !== user\?\.id && !matchLive\s*\n\s*\? \(\) => setRemoveTarget\(\{ userId: p\.user_id, name: p\.nickname \}\)\s*\n\s*: undefined,/,
    );
    expect(lobby).toMatch(/remove: t\("extra\.lobbyRemovePlayer"\),/);
  });

  it("asks first, then goes through lobby_manage_seat — never a bare delete", () => {
    expect(lobby).toMatch(/t\("team\.removePlayerTitle", \{ name: removeTarget\.name \}\)/);
    expect(lobby).toMatch(/onClick=\{\(\) => void handleRemovePlayer\(removeTarget\.userId\)\}/);
    expect(lobby).toMatch(
      /supabase\.rpc\("lobby_manage_seat", \{\s*\n\s*p_room_id: currentRoom\.id,\s*\n\s*p_user_id: userId,\s*\n\s*p_action: "remove",\s*\n\s*\}\)/,
    );
    expect(lobby).not.toMatch(/from\("room_participants"\)\s*\n\s*\.delete\(\)/);
    expect(lobby).not.toMatch(/handleRemoveParticipant/);
    // The function does the checking: host, waiting, not yourself.
    expect(rpc).toMatch(/RAISE EXCEPTION 'LOBBY_NOT_HOST'/);
    expect(rpc).toMatch(/IF v_status IS DISTINCT FROM 'waiting' THEN/);
    expect(rpc).toMatch(/RAISE EXCEPTION 'LOBBY_HOST_CANNOT_REMOVE_SELF'/);
    expect(rpc).toMatch(/REVOKE ALL ON FUNCTION public\.lobby_manage_seat\(uuid, uuid, text\) FROM PUBLIC, anon;/);
  });

  it("the removed player's own device notices, checks the table, and leaves", () => {
    expect(lobby).toMatch(/const wasSeatedRef = useRef\(false\);/);
    expect(lobby).toMatch(/if \(!wasSeatedRef\.current \|\| participants\.length === 0\) return;\s*\n\s*if \(currentRoom\.status !== "waiting"\) return;/);
    expect(lobby).toMatch(
      /\.maybeSingle\(\)\s*\n\s*\.then\(\(\{ data \}\) => \{\s*\n\s*if \(cancelled \|\| data\) return;\s*\n\s*wasSeatedRef\.current = false;\s*\n\s*toast\.info\(t\("extra\.removedByHost"\)\);\s*\n\s*exitRoom\(\);\s*\n\s*navigate\("\/team", \{ replace: true \}\);/,
    );
  });
});

describe("the words", () => {
  it("are in all seven", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["lobbyRemovePlayer", "removedByHost", "removePlayerMessage"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
      expect(src, `${lang}.removePlayerTitle`).toMatch(/\n\s+removePlayerTitle: "[^"]*\{name\}[^"]*",/);
    }
  });
});
