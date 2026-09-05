import { describe, it, expect } from "vitest";
import {
  DEFAULT_MASCOT_ID,
  MASCOTS,
  MASCOT_IDS,
  isMascotId,
  mascotById,
  parseMascotId,
} from "@/config/mascots";
import { readFileSync } from "node:fs";
import { translations, LANGUAGES } from "@/locales";

describe("the mascot catalog", () => {
  it("carries the eight mascots, the King first", () => {
    expect(MASCOTS.map((m) => m.id)).toEqual([...MASCOT_IDS]);
    expect(MASCOTS).toHaveLength(8);
    expect(MASCOTS[0].id).toBe(DEFAULT_MASCOT_ID);
  });

  it("gives every mascot a face tile and a scene", () => {
    for (const m of MASCOTS) {
      expect(m.thumb, m.id).toBeTruthy();
      expect(m.scene, m.id).toBeTruthy();
    }
  });

  it("keeps the King's idle loop and its poster", () => {
    // The home screen has always played this; a player who never picks
    // must stay exactly where they were.
    const king = mascotById("king");
    expect(king.video).toBe("/videos/trivia-king-scene.mp4");
    expect(king.still).toBeTruthy();
    // The animals are stills — no loop to play.
    for (const m of MASCOTS.filter((x) => x.id !== "king")) {
      expect(m.video, m.id).toBeUndefined();
    }
  });

  it("reads stored ids back and refuses anything else", () => {
    expect(parseMascotId("owl")).toBe("owl");
    expect(parseMascotId("dragon")).toBeNull();
    expect(parseMascotId(null)).toBeNull();
    expect(parseMascotId(undefined)).toBeNull();
    expect(parseMascotId(3)).toBeNull();
    expect(isMascotId("giraffe")).toBe(true);
  });

  it("falls back to the King for an unknown or missing id", () => {
    expect(mascotById(null).id).toBe("king");
    expect(mascotById(undefined).id).toBe("king");
    expect(mascotById("panda").id).toBe("panda");
  });

  it("is named in every language", () => {
    for (const { code } of LANGUAGES) {
      const names = (translations[code] as { avatar: { mascotNames: Record<string, string> } }).avatar
        .mascotNames;
      for (const id of MASCOT_IDS) expect(names[id], `${code}.${id}`).toBeTruthy();
    }
  });

  it("matches the ids the database accepts", () => {
    // profiles.home_mascot carries a CHECK naming the ids; a mascot added on
    // one side only is refused on save and silently forgotten on reload.
    const sql = readFileSync("supabase/migrations/20261004100000_home_mascot.sql", "utf8");
    for (const id of MASCOT_IDS) expect(sql).toContain(`'${id}'`);
  });
});
