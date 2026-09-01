/**
 * Local save for the Words mode.
 *
 * What lives here is per device: the level a solo player is on, the words
 * found on it, free hints won on the luck wheel, the scrapbook. A signed-in
 * player's coins are their real wallet (useCurrency — credits through
 * `credit_gameplay_reward`, spends through `update_user_currency`, per
 * CLAUDE.md rule 3); the `coins` field below is only ever read for a guest,
 * who has no wallet to draw on.
 */

/** Where a solo player is in one language's bank. */
export interface SoloProgress {
  /** 1-based number of the level the player is on. */
  level: number;
  /** Board words found on the current level, so a reload keeps them. */
  found: string[];
  /** Bonus words found on the current level. */
  bonusFound: string[];
  /** Letters revealed by hints on the current level, as "row,col". */
  hinted: string[];
}

export interface WordsSave {
  version: 2;
  /** Guest coins. A signed-in player's balance is their profile's. */
  coins: number;
  /** Free hints won on the luck wheel; spent before coins are. */
  freeHints: number;
  /** Solo progress, one per language — switching language keeps each. */
  progress: Partial<Record<WordsLanguage, SoloProgress>>;
  /** Scene ids the player has completed a full pack of. */
  scrapbook: string[];
  /** Bonus words found in total; every fifth pays out. */
  bonusTotal: number;
}

export const freshProgress = (): SoloProgress => ({ level: 1, found: [], bonusFound: [], hinted: [] });

import type { WordsLanguage } from "./levels";

const KEY = "mytrivia.words.v1";

export const STARTING_COINS = 350;
export const HINT_COST = 25;
export const LEVEL_REWARD = 20;
export const BONUS_PAYOUT = 5;
export const BONUS_EVERY = 5;

export const freshSave = (): WordsSave => ({
  version: 2,
  coins: STARTING_COINS,
  freeHints: 0,
  progress: {},
  scrapbook: [],
  bonusTotal: 0,
});

export function loadSave(): WordsSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const parsed = JSON.parse(raw) as Partial<Omit<WordsSave, "version">> & {
      version?: number;
      level?: number;
      found?: string[];
      bonusFound?: string[];
      hinted?: string[];
    };
    if (parsed.version === 1) {
      // The first save had one English-only progress; it becomes the
      // English entry and everything else carries over.
      return {
        ...freshSave(),
        coins: parsed.coins ?? STARTING_COINS,
        freeHints: parsed.freeHints ?? 0,
        scrapbook: parsed.scrapbook ?? [],
        bonusTotal: parsed.bonusTotal ?? 0,
        progress: {
          en: {
            level: parsed.level ?? 1,
            found: parsed.found ?? [],
            bonusFound: parsed.bonusFound ?? [],
            hinted: parsed.hinted ?? [],
          },
        },
      };
    }
    if (parsed.version !== 2) return freshSave();
    return {
      ...freshSave(),
      coins: parsed.coins ?? STARTING_COINS,
      freeHints: parsed.freeHints ?? 0,
      scrapbook: parsed.scrapbook ?? [],
      bonusTotal: parsed.bonusTotal ?? 0,
      progress: parsed.progress ?? {},
    };
  } catch {
    return freshSave();
  }
}

export function persistSave(save: WordsSave) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Private mode or a full quota: the game still plays, it just forgets.
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
