import { describe, it, expect } from "vitest";
import {
  DEVELOPER_ONLY_GAME_TYPES,
  GAME_TYPES,
  applyDeveloperMode,
  type GameTypeKey,
  type GameTypeStatus,
} from "@/game-types/registry";

const mode = (key: GameTypeKey, status: GameTypeStatus = "live") => ({ key, status });

describe("developer-only game types", () => {
  it("are Versus King and Team Battle until they are promoted", () => {
    expect([...DEVELOPER_ONLY_GAME_TYPES].sort()).toEqual(["king", "team_battle"]);
  });

  it("are not shown at all with developer mode off — not even as teasers", () => {
    const shown = applyDeveloperMode(GAME_TYPES, false).map((g) => g.key);
    expect(shown).not.toContain("king");
    expect(shown).not.toContain("team_battle");
    // Everything else is untouched, in its own status.
    expect(shown).toEqual(["classic", "tv_show", "words"]);
    expect(applyDeveloperMode([mode("classic", "coming_soon")], false)).toEqual([
      mode("classic", "coming_soon"),
    ]);
  });

  it("are live for an admin with developer mode on, whatever the registry says", () => {
    const shown = applyDeveloperMode(GAME_TYPES, true);
    expect(shown.map((g) => g.key)).toEqual(["classic", "tv_show", "team_battle", "king", "words"]);
    for (const key of DEVELOPER_ONLY_GAME_TYPES) {
      expect(shown.find((g) => g.key === key)?.status, key).toBe("live");
    }
    // A DB row marking it hidden or coming soon does not win over the switch
    expect(applyDeveloperMode([mode("king", "hidden")], true)).toEqual([mode("king", "live")]);
  });

  it("does not mutate the input", () => {
    const input = [mode("king", "coming_soon")];
    applyDeveloperMode(input, true);
    expect(input[0].status).toBe("coming_soon");
  });
});
