/**
 * Local save for the Expo word-wheel mode.
 *
 * This mode is an experiment and lives entirely on the device: the coins it
 * shows are its own play money, not the account's currency, so nothing here
 * touches the database (CLAUDE.md rule 3 — currency is server-authoritative
 * and this mode has no server side yet). Everything is one JSON blob in
 * localStorage, read once on mount and written on every change.
 */

export interface ExpoSave {
  version: 1;
  coins: number;
  /** Free hints won on the luck wheel; spent before coins are. */
  freeHints: number;
  /** 1-based number of the level the player is on. */
  level: number;
  /** Board words found on the current level, so a reload keeps them. */
  found: string[];
  /** Bonus words found on the current level. */
  bonusFound: string[];
  /** Letters revealed by hints on the current level, as "row,col". */
  hinted: string[];
  /** Scene ids the player has completed a full pack of. */
  scrapbook: string[];
  /** Bonus words found in total; every fifth pays out. */
  bonusTotal: number;
}

const KEY = "mytrivia.expo.v1";

export const STARTING_COINS = 350;
export const HINT_COST = 25;
export const LEVEL_REWARD = 20;
export const BONUS_PAYOUT = 5;
export const BONUS_EVERY = 5;

export const freshSave = (): ExpoSave => ({
  version: 1,
  coins: STARTING_COINS,
  freeHints: 0,
  level: 1,
  found: [],
  bonusFound: [],
  hinted: [],
  scrapbook: [],
  bonusTotal: 0,
});

export function loadSave(): ExpoSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const parsed = JSON.parse(raw) as Partial<ExpoSave>;
    if (parsed.version !== 1) return freshSave();
    return { ...freshSave(), ...parsed };
  } catch {
    return freshSave();
  }
}

export function persistSave(save: ExpoSave) {
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
