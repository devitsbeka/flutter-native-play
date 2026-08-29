import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { GAME_TYPES } from "@/game-types/registry";
import { en } from "@/locales/en";

/**
 * The game type registry lives in three places that have to agree by `key`:
 * the client descriptors (src/game-types/registry.ts), the seed rows in the
 * migration, and the locale strings the /play page renders with. Nothing at
 * runtime checks the first two against each other — a descriptor whose key was
 * never seeded silently loses its DB overrides and can never be dark-launched,
 * which is exactly the kind of quiet drift this repo's invariants exist for.
 */

const REPO = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");

describe("game type registry", () => {
  it("seeds every client-side game type in the registry migration", () => {
    const migration = read(
      "supabase/migrations/20260916100000_game_types_registry.sql",
    );
    for (const gt of GAME_TYPES) {
      expect(migration, `'${gt.key}' has no seed row in the game_types migration`)
        .toMatch(new RegExp(`\\('${gt.key}',`));
    }
  });

  it("has English strings for every game type card", () => {
    const lookup = (key: string) => {
      let value: unknown = en;
      for (const part of key.split(".")) {
        value = (value as Record<string, unknown> | undefined)?.[part];
      }
      return typeof value === "string" ? value : undefined;
    };
    for (const gt of GAME_TYPES) {
      expect(lookup(gt.titleKey), `missing locale string ${gt.titleKey}`).toBeTruthy();
      expect(lookup(gt.descKey), `missing locale string ${gt.descKey}`).toBeTruthy();
    }
  });
});
