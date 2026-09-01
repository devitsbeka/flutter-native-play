import { describe, it, expect } from "vitest";
import { emptyShared, hasNews, mergeShared } from "@/features/words/shared";
import { routeForRoom, roomKind } from "@/utils/roomRoutes";

/**
 * Two people on one Words board keep separate copies of what has been found
 * and swap them over a channel with nobody in charge. The rules below are
 * what make that safe: a copy is only adopted when it carries something new,
 * two copies of the same level add up rather than overwrite, and a newer
 * level wins outright.
 */
describe("words shared state", () => {
  it("adds up two copies of the same level", () => {
    const a = { ...emptyShared(3), found: { SAINT: "a" }, hinted: ["0,0"] };
    const b = { ...emptyShared(3), found: { SIT: "b" }, bonus: { SIN: "b" }, hinted: ["1,1"] };
    const m = mergeShared(a, b);
    expect(m.level).toBe(3);
    expect(m.found).toEqual({ SAINT: "a", SIT: "b" });
    expect(m.bonus).toEqual({ SIN: "b" });
    expect(m.hinted.sort()).toEqual(["0,0", "1,1"]);
  });

  it("keeps the first finder when both found a word at once", () => {
    const a = { ...emptyShared(1), found: { SIT: "a" } };
    const b = { ...emptyShared(1), found: { SIT: "b" } };
    expect(mergeShared(a, b).found.SIT).toBe("a");
  });

  it("follows a friend who moved on to the next level", () => {
    const a = { ...emptyShared(2), found: { CROWN: "a" } };
    const b = emptyShared(3);
    expect(mergeShared(a, b).level).toBe(3);
    expect(mergeShared(a, b).found).toEqual({});
  });

  it("ignores a copy that is a level behind", () => {
    const a = emptyShared(4);
    const b = { ...emptyShared(3), found: { CROWN: "b" } };
    expect(mergeShared(a, b)).toBe(a);
  });

  it("follows the room's language, since two banks cannot be added up", () => {
    // The joiner asks with their own copy; the room's answer, in another
    // language, replaces it whole — their level in the other bank is not
    // this board.
    const mine = { ...emptyShared(7, "en"), found: { ABOUT: "me" } };
    const room = { ...emptyShared(2, "ka"), found: { "შორის": "host" } };
    expect(hasNews(mine, room)).toBe(true);
    const merged = mergeShared(mine, room);
    expect(merged.lang).toBe("ka");
    expect(merged.level).toBe(2);
    expect(merged.found).toEqual({ "შორის": "host" });
  });

  it("only calls something news when it carries something new", () => {
    const local = { ...emptyShared(2), found: { CROW: "a" } };
    expect(hasNews(local, { ...emptyShared(2), found: { CROW: "a" } })).toBe(false);
    expect(hasNews(local, { ...emptyShared(2), found: { CROW: "b", WORN: "b" } })).toBe(true);
    expect(hasNews(local, { ...emptyShared(2), hinted: ["0,1"] })).toBe(true);
    expect(hasNews(local, emptyShared(3))).toBe(true);
    expect(hasNews(local, { ...emptyShared(1), found: { X: "b" } })).toBe(false);
  });
});

describe("room routes", () => {
  it("sends every kind of room to its own page", () => {
    expect(routeForRoom({ game_type_key: "king", room_code: "abc123" })).toBe("/king?code=ABC123");
    expect(routeForRoom({ game_type_key: "team_battle", room_code: "abc123" })).toBe("/team-battle?code=ABC123");
    expect(routeForRoom({ game_type_key: null, room_code: "abc123" })).toBe("/team?join=ABC123");
    expect(routeForRoom({ game_type_key: "words", room_code: "abc123" })).toBe("/words/ABC123");
  });

  it("reads a Words room stored without its catalog key", () => {
    // Until the words row is applied to the live database the room carries
    // a null key and game_mode = 'words'.
    expect(roomKind({ game_type_key: null, game_mode: "words" })).toBe("words");
    expect(routeForRoom({ game_type_key: null, game_mode: "words" }, "zz99zz")).toBe("/words/ZZ99ZZ");
  });

  it("falls back to the classic lobby for an unknown row", () => {
    expect(routeForRoom(null, "abc123")).toBe("/team?join=ABC123");
  });
});
