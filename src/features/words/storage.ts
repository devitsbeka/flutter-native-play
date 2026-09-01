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

export interface WordsSave {
  version: 1;
  /** Guest coins. A signed-in player's balance is their profile's. */
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

const KEY = "mytrivia.words.v1";

export const STARTING_COINS = 350;
export const HINT_COST = 25;
export const LEVEL_REWARD = 20;
export const BONUS_PAYOUT = 5;
export const BONUS_EVERY = 5;

export const freshSave = (): WordsSave => ({
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

export function loadSave(): WordsSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const parsed = JSON.parse(raw) as Partial<WordsSave>;
    if (parsed.version !== 1) return freshSave();
    return { ...freshSave(), ...parsed };
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
