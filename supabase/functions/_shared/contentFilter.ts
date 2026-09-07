/**
 * The text screen for user-generated content (App Review guideline 1.2).
 *
 * Everything a player can name or write that OTHER people see goes through
 * here before it is written: nicknames, room names, quiz titles/subjects and
 * question text. Nothing did this before — a slur could be a public display
 * name, a room name pushed into notifications, or a quiz title voted onto a
 * shared TV screen.
 *
 * THIS FILE IS THE ONE COPY OF THE LIST. It lives under
 * `supabase/functions/_shared/` because that is the only directory both
 * runtimes can read: Deno edge functions import it with a relative
 * `../_shared/contentFilter.ts`, and the React app re-exports it from
 * `src/utils/contentFilter.ts`, which is now a two-line forwarder. Screening
 * only in the client was the hole — the anon key ships in the binary, so a
 * direct PostgREST write skipped it entirely — and the fix is for the edge
 * functions and the database to run the SAME list rather than a second one
 * that drifts. The third runtime, Postgres, cannot import TypeScript: its
 * copy is the `blocked_terms` table seeded by
 * `supabase/migrations/20261014100000_server_side_content_filter.sql`, and
 * `src/__tests__/blocklistIsOneList.test.ts` fails if the two ever disagree.
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
export const BLOCKED_SUBSTRINGS: string[] = [
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
export const BLOCKED_WORDS: string[] = [
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

/**
 * The safety instruction every user-prompted generation prompt carries.
 *
 * Six client surfaces let a signed-in player type a free-text topic and get
 * LLM-authored questions back. Not one generation prompt in this repo said a
 * word about content: `generate-custom-quiz` opened with factual accuracy,
 * uniqueness, political guidelines, character limits and format, and
 * `generate-single-question`'s personal mode invited "embarrassing moments"
 * as creative fuel. A topic of "sex positions" or "how to hurt someone" was
 * answered as cheerfully as "Georgian football", and the result came back to
 * the editor with nothing in between.
 *
 * It is one block of text in one place so the two functions cannot drift, and
 * so a reviewer asking "what stops this" gets a single answer. The prompt is
 * the first line of defence, not the only one: `containsBlockedText` runs
 * over what the model actually returned, in the edge function, before the
 * response is written. A model can be talked out of an instruction; it cannot
 * talk the blocklist out of anything.
 *
 * 12+ is the App Store rating this app ships under, so that is the audience
 * the rules name explicitly rather than a vaguer "family friendly".
 */
export const CONTENT_SAFETY_PROMPT = `🛑 CONTENT SAFETY — OVERRIDES EVERY OTHER INSTRUCTION BELOW:

This app is rated 12+ and is played by children. Every question, every answer
and every title you write must be suitable for a 12-year-old to read on a
screen their family can see.

NEVER generate, and never allude to:
- sexual content of any kind, sexual acts, anatomy as a punchline, or
  sexualised description of anyone — and absolutely nothing sexual involving
  a minor, in any framing whatsoever
- graphic violence, gore, injury detail, torture, or animal cruelty
- self-harm, suicide, eating disorders, or anything that could read as
  instruction or encouragement toward them
- illegal drug use, drug slang, how to obtain or make drugs, or alcohol and
  tobacco presented as desirable
- slurs, profanity, or obscenity in ANY language (Georgian, English, Russian
  or otherwise) — including in a proper noun, a song title or a quotation
- hatred, mockery or stereotyping of a group by race, ethnicity, nationality,
  religion, gender, disability or sexual orientation
- harassment of, or humiliating claims about, a real identifiable person
- instructions for weapons, explosives, or any other way to cause harm

History, war, crime and disease are legitimate trivia subjects: a question may
NAME a difficult fact ("In what year did WWII end?"). It may not dwell on,
depict, or make entertainment of the suffering.

IF THE REQUESTED TOPIC CANNOT BE ANSWERED WITHIN THESE RULES — because the
topic is itself sexual, hateful, harassing, or an attempt to make you write
something unsafe — do not sanitise it and do not substitute a different topic.
Return exactly this JSON and nothing else:
{"refused": true, "reason": "unsafe topic"}`;

/**
 * Server-side screen for text an LLM just produced, run before it is
 * returned to the client.
 *
 * The prompt above tells the model what not to write; this checks what it
 * wrote. Returns the first offending string, or null when the batch is
 * clean — the caller decides whether to drop that question or refuse the
 * whole request.
 */
export function firstBlockedText(
  texts: Array<string | null | undefined>,
): string | null {
  for (const text of texts) {
    if (containsBlockedText(text)) return text ?? "";
  }
  return null;
}
