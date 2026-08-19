/**
 * The text screen for user-generated content (App Review guideline 1.2).
 *
 * Everything a player can name or write that OTHER people see goes through
 * here before it is written: nicknames, room names, quiz titles/subjects and
 * question text. Nothing did this before — a slur could be a public display
 * name, a room name pushed into notifications, or a quiz title voted onto a
 * shared TV screen.
 *
 * Scope is deliberate: this blocks slurs and hard profanity in the app's two
 * content languages (Georgian and English), not mild rudeness — a trivia app
 * about films and history must not reject "Dick Van Dyke" or "Middlesex".
 * Matching is done on a normalized copy (lowercased, common leet
 * substitutions, separators stripped) so "S.h.i.t" and "sh1t" match, and
 * short ambiguous words are matched only as whole words to avoid the
 * classic Scunthorpe false positives.
 */

// Substring terms: unambiguous enough that appearing anywhere in the text is
// disqualifying, even embedded in another word.
const BLOCKED_SUBSTRINGS: string[] = [
  // English slurs / hard profanity
  "nigger",
  "nigga",
  "faggot",
  "motherfucker",
  "cocksucker",
  "childporn",
  // Georgian profanity (written forms)
  "შეყლე",
  "ყლეობ",
  "მუტელ",
  "ტრაკში",
  "შემეცი",
  "მოგიტყან",
  "მოგტყან",
  "გიჟინ",
  "დედამოტყნულ",
  "დედაშენს",
  "შენი დედა",
  "ბოზო",
  "ბოზი",
  "ყლეზე",
  // Georgian profanity in Latin transliteration (players type both)
  "shechame",
  "mutel",
  "traki shen",
  "mogityan",
  "dedamotynul",
  "bozo shen",
];

// Whole-word terms: too short or too common as substrings to match loosely.
// Deliberately NOT here: historical names and terms (hitler, nazi) — this is
// a trivia app and WWII quizzes are legitimate content; blocking them
// punished English-language history quizzes while the Georgian spellings
// passed. Same for place-name collisions (coon → Coon Rapids).
const BLOCKED_WORDS: string[] = [
  // English
  "fuck",
  "fucker",
  "fucking",
  "shit",
  "cunt",
  "whore",
  "slut",
  "bitch",
  "retard",
  "rapist",
  // Georgian
  "ყლე",
  "ბოზ",
  "მუტლ",
  "ტყნავ",
  "ძუკნა",
  "ნაბოზვარ",
  "დაუნ",
  // Transliterations
  "yle",
  "boz",
  "dzukna",
  "nabozvar",
  // Common English variants
  "fuk",
  "phuck",
  "fck",
  "tranny",
  "kys",
  "paki",
  "chink",
  "spic",
  "kike",
  // Russian (a realistic input language for this region)
  "бля",
  "сука",
  "хуй",
  "мудак",
];

// Russian substrings — unambiguous roots.
const RU_SUBSTRINGS = ["пизд", "хуе", "ебан", "ебат", "заеб", "шлюха", "долбо"];
BLOCKED_SUBSTRINGS.push(...RU_SUBSTRINGS);

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

/** Lowercase, map leetspeak, drop separators — the string we match against. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => LEET[ch] ?? ch)
    .join("")
    .replace(/[\s._\-*+,'"`~^|/\\()[\]{}]+/g, "");
}

/**
 * Split into words. Whitespace, hyphens and slashes are real word
 * boundaries; any other punctuation INSIDE a token is obfuscation and is
 * stripped ("F.u.c.k" → "fuck"), which keeps "Scunthorpe" intact while
 * catching the dotted spellings.
 */
function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .split("")
    .map((ch) => LEET[ch] ?? ch)
    .join("")
    // Runs of 3+ of the same letter collapse to one: "fuuuck" → "fuck".
    // Doubles stay — "bookkeeper" must survive.
    .replace(/(\p{L})\1{2,}/gu, "$1")
    .split(/[\s\-_/\\|]+/)
    .map((tok) => tok.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter(Boolean);

  // A run of 3+ single-character tokens is spelled-out obfuscation
  // ("f u c k", "ყ ლ ე") — join each run into an extra candidate token.
  const out = [...base];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 3) out.push(run.join(""));
    run = [];
  };
  for (const tok of base) {
    if (tok.length === 1) run.push(tok);
    else flush();
  }
  flush();
  return out;
}

/** Suffix-stripped candidates so plurals and simple inflections match. */
function wordCandidates(token: string): string[] {
  const c = [token];
  if (token.endsWith("es")) c.push(token.slice(0, -2));
  if (token.endsWith("s")) c.push(token.slice(0, -1));
  if (token.endsWith("ed")) c.push(token.slice(0, -2));
  if (token.endsWith("ing")) c.push(token.slice(0, -3));
  return c;
}

/**
 * True when the text contains a blocked term. Empty/whitespace input is
 * clean — emptiness is the caller's own validation, not a moderation call.
 */
export function containsBlockedText(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;

  const squashed = normalize(text);
  for (const term of BLOCKED_SUBSTRINGS) {
    if (squashed.includes(normalize(term))) return true;
  }

  const words = new Set(tokenize(text).flatMap(wordCandidates));
  for (const term of BLOCKED_WORDS) {
    const normTerm = tokenize(term).join("");
    if (words.has(normTerm)) return true;
  }

  return false;
}

/** Convenience for screening a batch (quiz title + every question/answer). */
export function anyBlockedText(texts: Array<string | null | undefined>): boolean {
  return texts.some((t) => containsBlockedText(t));
}
