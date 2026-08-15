import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A gifted seat says so, in the language the app is in.
 *
 * The event is written by the database — a client cannot insert a
 * notification row for somebody else's account — so the wording has to be
 * looked up on the way out, keyed by data->>'kind'. Three separate files have
 * to agree for that to work: the migration writing the kind, the translator
 * mapping it to a locale key, and the locale files carrying the key. Any one
 * of them out of step shows the player the raw key, or the English fallback
 * the row was stored with, which is the failure this test exists to catch.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const SQL = read("supabase/migrations/20260815140000_pro_seat_notifications.sql");
const TRANSLATOR = read("src/utils/notificationTranslations.ts");
const EN = read("src/locales/en.ts");
const KA = read("src/locales/ka.ts");

/** Every kind the two functions actually write. */
function sqlKinds(): string[] {
  return [...SQL.matchAll(/'kind',\s*'([a-z_]+)'/g)].map((m) => m[1]);
}

/** kind -> locale key, from one of the translator's two maps. */
function translatorMap(name: "seatTitles" | "seatMessages"): Record<string, string> {
  const start = TRANSLATOR.indexOf(`const ${name}`);
  const block = TRANSLATOR.slice(start, TRANSLATOR.indexOf("};", start));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(\w+):\s*'([\w.]+)'/g)) out[m[1]] = m[2];
  return out;
}

/** The string a locale file gives for `extra.<key>`, or "". */
function localeValue(file: string, dotted: string): string {
  const key = dotted.replace(/^extra\./, "");
  return file.match(new RegExp(`\\b${key}: "([^"]*)"`))?.[1] ?? "";
}

describe("a seat that moves tells both people", () => {
  const kinds = sqlKinds();

  it("writes one kind per event, and no others", () => {
    expect(new Set(kinds)).toEqual(
      new Set(["pro_seat_granted", "pro_seat_sent", "pro_seat_revoked"]),
    );
  });

  it("carries the kind on a type the app already draws an icon for", () => {
    // 'subscription' is what the bell renders a crown for. A type it does not
    // know renders as a generic row, which is how a gift arrives looking like
    // a system message.
    // The VALUES row, not the word — the note above the functions says
    // 'subscription' too.
    expect(SQL.match(/^\s*[\w.]+,\s*'subscription',\s*$/gm)?.length).toBe(kinds.length);
  });

  it.each(["seatTitles", "seatMessages"] as const)("translates every kind (%s)", (map) => {
    const keys = translatorMap(map);
    for (const kind of kinds) {
      expect(keys[kind], `${map} has no entry for ${kind}`).toBeTruthy();
    }
  });

  it("has both languages for every key the translator asks for", () => {
    const keys = [
      ...Object.values(translatorMap("seatTitles")),
      ...Object.values(translatorMap("seatMessages")),
    ];
    for (const key of keys) {
      for (const [lang, file] of [["en", EN], ["ka", KA]] as const) {
        expect(localeValue(file, key).length, `${lang} is missing ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("names the other player in every message", () => {
    // The row is written with the nickname in data.sender_nickname and the
    // sentence is rebuilt around it. A body without {name} silently drops the
    // one detail that makes the notification worth reading.
    for (const key of Object.values(translatorMap("seatMessages"))) {
      for (const [lang, file] of [["en", EN], ["ka", KA]] as const) {
        expect(localeValue(file, key), `${lang} ${key} does not use {name}`).toContain("{name}");
      }
    }
  });
});
