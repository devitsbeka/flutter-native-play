import { transliterateGeorgian } from "@/utils/transliteration";

/**
 * Fold a string into the one form both scripts can be compared in.
 *
 * Georgian goes to its Latin spelling and everything else is lowercased, so
 * "ზეიმის მოედანი" and "Zeimis Moedani" both become `zeimis moedani`. Anything
 * already Latin — a room code, an English title — passes through untouched
 * apart from the case.
 *
 * The fold is deliberately one-way. Latin is *not* pushed back into Georgian:
 * that direction is ambiguous (`ts` is either ც or წ, `kh` either ხ or ქ) and
 * a wrong guess silently loses a match. Georgian to Latin is one letter to one
 * spelling, so it always lands somewhere both sides can meet.
 *
 * Distinct letters that share a Latin spelling (თ and ტ, ქ and კ) collapse
 * together here. That is a feature for a search box: someone typing a name
 * they have only heard is not going to pick the right one.
 */
export function searchKey(value: string | null | undefined): string {
  if (!value) return "";
  return transliterateGeorgian(value.toLowerCase());
}

/**
 * Does any of these fields match what the player typed, in either script?
 *
 * Matches on the raw text first — an exact substring is a match whatever the
 * script — and then on the folded form, which is what lets `zeimis moedani`,
 * `zeim` or plain `ze` find a room called "ზეიმის მოედანი".
 *
 * An empty query matches everything, so a caller can hand this its query
 * unconditionally instead of branching around it.
 */
export function matchesQuery(
  query: string,
  fields: (string | null | undefined)[],
): boolean {
  const raw = query.trim().toLowerCase();
  if (!raw) return true;

  const folded = searchKey(raw);

  return fields.some((field) => {
    if (!field) return false;
    if (field.toLowerCase().includes(raw)) return true;
    return searchKey(field).includes(folded);
  });
}
