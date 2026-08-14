/**
 * A mission's name and description, in the language being read.
 *
 * Missions are defined in code and then written into the database as rows —
 * title and all — so the row carries whatever language the app was written
 * in, and the player who completed it a month ago has a Georgian row on an
 * English screen forever. The row's `mission_id` does not change, though, so
 * the words can be looked up from it at the moment they are shown, and the
 * stored title only has to answer for missions this build has never heard of.
 */

import { t } from "@/lib/i18n";

/** `{n}` in a description is the mission's target. */
function fill(text: string, target?: number): string {
  return target === undefined ? text : text.replace("{n}", String(target));
}

export function missionTitle(missionId: string | null | undefined, stored: string): string {
  if (!missionId) return stored;
  const key = `missionPool.${missionId}Title`;
  const translated = t(key);
  // t() hands the key back when nothing is defined for it.
  return translated === key ? stored : translated;
}

export function missionDescription(
  missionId: string | null | undefined,
  stored: string,
  target?: number,
): string {
  if (!missionId) return fill(stored, target);
  const key = `missionPool.${missionId}Desc`;
  const translated = t(key);
  return translated === key ? fill(stored, target) : fill(translated, target);
}
