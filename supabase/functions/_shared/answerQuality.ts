/**
 * Quality gate for machine-shortened answer sets.
 *
 * Shared between the shorten-answers edge function and its test. The rules come
 * from what this bank actually got wrong the first time it was shortened:
 * "Amsterdam Stk Exch", "Pritzker Prize Fdn", "Noise-induced H.L." — a model
 * told to fit 20 characters will invent an abbreviation rather than admit it
 * cannot. Rejecting is always safe: a long answer still renders, a mangled one
 * is just wrong.
 */

/** Abbreviations a reader already knows. Anything else clipped with a capital
 *  letter or a trailing period is something the model invented. */
const KNOWN_ABBREVIATIONS = new Set([
  "USA", "UK", "USSR", "UN", "EU", "NATO", "DNA", "RNA", "NASA", "WHO", "FBI",
  "CIA", "AI", "PC", "TV", "US", "UAE", "CO2", "CO₂", "H2O", "H₂O", "PhD", "AD",
  "BC", "BCE", "CE", "GDP", "IQ", "LED", "GPS", "USB", "HTML", "CSS", "SQL",
  "API", "CPU", "GPU", "RAM", "NBA", "NFL", "FIFA", "WWE", "WWI", "WWII",
]);

/** A word clipped with a full stop mid-label: "Global Arch. Board".
 *
 *  Detecting a clipped word by its shape alone does not work — plenty of real
 *  names run three consonants together ("Stearns", "Wright") — so the explicit
 *  list below does that job instead.
 *
 *  Initials are the tricky case. "T.S. Eliot" is a name and must pass;
 *  "Noise-induced H.L." is "hearing loss" chopped up and must not. What
 *  separates them is whether a word follows: a person's initials introduce a
 *  surname, a clipped phrase just stops. */
const INVENTED_ABBREVIATION = /\b[A-Z][a-z]{1,4}\.(?!$)/;
const DANGLING_INITIALS = /(?:\b[A-Z]\.){2,}\s*$/;

const CLIPPED_WORD =
  /\b(?:Fdn|Intl|Assoc|Dept|Cncl|Comm|Univ|Natl|Govt|Mgmt|Stk|Exch|Bldg|Prod|Sci|Engr|Ops|Org|Inst|Approx|Constel|Atmos|Photosynth|Calc|signif|perm|arch|Estab|Devel)\b\.?/i;

/** Key tokens of a proper noun: capitalised words and digits. If one vanishes,
 *  the model renamed the thing rather than shortening it. */
function keyTokens(s: string): string[] {
  return (s.match(/\b(?:[A-Z][\w'’-]+|\d[\d,.]*)\b/g) ?? []).map((t) => t.toLowerCase());
}

/**
 * Check a proposed answer set as a whole. Returns a reason to reject, or null
 * to accept. Rejecting keeps the original answers, which is always safe —
 * a long answer renders, a wrong one does not.
 */
function rejectAnswerSet(
  originalCorrect: string,
  originalIncorrect: string[],
  newCorrect: string,
  newIncorrect: string[],
): string | null {
  const all = [newCorrect, ...newIncorrect];

  if (all.length !== 4 || all.some((a) => !a || !a.trim())) {
    return "did not return four non-empty answers";
  }

  const seen = new Set(all.map((a) => a.toLowerCase().replace(/[^a-z0-9]/gi, "")));
  if (seen.size !== 4) return "two answers are the same after shortening";

  for (const a of all) {
    if (CLIPPED_WORD.test(a)) return `invented abbreviation in "${a}"`;
    if (DANGLING_INITIALS.test(a)) return `clipped phrase in "${a}"`;
    const suspect = a.match(INVENTED_ABBREVIATION)?.[0];
    if (suspect && !KNOWN_ABBREVIATIONS.has(suspect.replace(/\./g, "").toUpperCase())) {
      return `invented abbreviation in "${a}"`;
    }
  }

  // A proper noun that lost one of its key tokens was renamed, not shortened.
  // Dropping tokens the question already supplies is fine, so only the correct
  // answer is checked, and only against itself.
  const before = keyTokens(originalCorrect);
  const after = new Set(keyTokens(newCorrect));
  const dropped = before.filter((t) => !after.has(t));
  if (before.length > 0 && dropped.length === before.length && newCorrect !== originalCorrect) {
    // Collapsing a name to its own initials is a shortening, not a rename:
    // "World Health Organization" -> "WHO" keeps every token, as a letter each.
    const initials = before.map((t) => t[0]).join("");
    const isAcronym = newCorrect.replace(/[^A-Za-z]/g, "").toLowerCase() === initials;
    if (!isAcronym) {
      return `"${newCorrect}" dropped every distinguishing term from "${originalCorrect}"`;
    }
  }

  // The whole point of the pass: nothing may stay over the limit unless it is a
  // proper noun we deliberately refused to rename, and even then the correct
  // answer must not be the longest.
  const lengths = all.map((a) => a.length);
  const longest = Math.max(...lengths);
  const runnerUp = [...lengths].sort((a, b) => b - a)[1];
  if (lengths[0] === longest && lengths[0] - runnerUp > 6) {
    return `correct answer is ${lengths[0] - runnerUp} chars longer than any distractor — guessable`;
  }
  if (longest > 48) {
    return `answer still ${longest} chars, past where the button ellipsizes`;
  }

  // Refuse a no-op that claims success.
  const changed =
    newCorrect !== originalCorrect ||
    newIncorrect.some((a, i) => a !== (originalIncorrect[i] ?? ""));
  if (!changed) return "no change made";

  return null;
}

export { rejectAnswerSet, KNOWN_ABBREVIATIONS };
