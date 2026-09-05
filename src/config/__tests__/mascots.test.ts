import { describe, it, expect } from "vitest";
import { MASCOTS, MASCOT_IDS, isMascotId, mascotById, parseMascotId } from "@/config/mascots";
import { readFileSync } from "node:fs";
import { translations, LANGUAGES } from "@/locales";

describe("the mascot catalog", () => {
  it("carries the seven animals, and no King", () => {
    // The King is the home screen's own default, not a choice: a player who
    // never picks keeps the idle loop, and the picker shows only the animals.
    expect(MASCOTS.map((m) => m.id)).toEqual([...MASCOT_IDS]);
    expect(MASCOTS).toHaveLength(7);
    expect(isMascotId("king")).toBe(false);
  });

  it("gives every mascot a face tile and a scene", () => {
    for (const m of MASCOTS) {
      expect(m.thumb, m.id).toBeTruthy();
      expect(m.scene, m.id).toBeTruthy();
    }
  });

  it("reads stored ids back and refuses anything else", () => {
    expect(parseMascotId("owl")).toBe("owl");
    expect(parseMascotId("dragon")).toBeNull();
    expect(parseMascotId("king")).toBeNull();
    expect(parseMascotId(null)).toBeNull();
    expect(parseMascotId(undefined)).toBeNull();
    expect(parseMascotId(3)).toBeNull();
    expect(isMascotId("giraffe")).toBe(true);
  });

  it("answers null for an unknown or missing id, so the default loop plays", () => {
    expect(mascotById(null)).toBeNull();
    expect(mascotById(undefined)).toBeNull();
    expect(mascotById("panda")?.id).toBe("panda");
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
