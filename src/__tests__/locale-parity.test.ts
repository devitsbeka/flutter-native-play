/**
 * The app has to be readable in all seven languages.
 *
 * Every string a player sees comes from src/locales/*.ts, keyed the same way
 * in each file. Three things go wrong there, and none of them fail a build:
 *
 *  - a key added to ka.ts and forgotten in the rest, so the reader silently
 *    gets the English fallback (or the raw key, if English missed it too);
 *  - a Georgian value pasted into a Latin locale as a placeholder and never
 *    translated, so a French player reads Georgian;
 *  - a {placeholder} renamed on one side, so the sentence prints "{count}".
 *
 * TypeScript catches the first only because every locale is declared as
 * KaTranslations — which it is today, and this test is what notices if that
 * ever stops being true.
 */

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { translations, LANGUAGES } from "@/locales";

const CODES = LANGUAGES.map((l) => l.code);
const GEORGIAN = /[Ⴀ-ჿ]/;

function flatten(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else if (v && typeof v === "object") for (const [k2, v2] of flatten(v, key)) out.set(k2, v2);
  }
  return out;
}

const flat = new Map(CODES.map((c) => [c, flatten(translations[c])]));
const ka = flat.get("ka")!;

/** The placeholders a string expects, order-insensitive. */
const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) || []).sort().join(",");

describe("every language carries every string", () => {
  it("declares all seven languages", () => {
    expect(CODES.sort()).toEqual(["de", "en", "es", "fr", "it", "ka", "pt"]);
  });

  it.each(CODES)("%s has the same keys as ka", (code) => {
    const missing = [...ka.keys()].filter((k) => !flat.get(code)!.has(k));
    const extra = [...flat.get(code)!.keys()].filter((k) => !ka.has(k));
    expect({ missing: missing.slice(0, 20), extra: extra.slice(0, 20) }).toEqual({ missing: [], extra: [] });
  });

  /**
   * A Georgian value in a Latin locale is an untranslated leftover. Latin
   * locales legitimately contain no Georgian at all — not even a brand name,
   * which is written "MyTrivia" everywhere.
   */
  it.each(CODES.filter((c) => c !== "ka"))("%s has no Georgian left in it", (code) => {
    const untranslated = [...flat.get(code)!]
      .filter(([, v]) => GEORGIAN.test(v))
      .map(([k, v]) => `${k} = ${v.slice(0, 40)}`);
    expect(untranslated).toEqual([]);
  });

  it.each(CODES.filter((c) => c !== "ka"))("%s keeps ka's {placeholders}", (code) => {
    const mismatched = [...flat.get(code)!]
      .filter(([k, v]) => ka.has(k) && placeholders(ka.get(k)!) !== placeholders(v))
      .map(([k, v]) => `${k}: ka[${placeholders(ka.get(k)!)}] vs ${code}[${placeholders(v)}]`);
    expect(mismatched).toEqual([]);
  });
});

describe("every key the code asks for exists", () => {
  /**
   * Literal t("ns.key") / t('ns.key') call sites. Keys built at runtime
   * (t(`missionPool.${id}Title`)) can't be swept this way — missionText.ts
   * falls back to the stored text for those on purpose.
   */
  const used = execSync(
    `grep -rhoE "\\bt\\(['\\"][a-zA-Z0-9_]+\\.[a-zA-Z0-9_.]+['\\"]" src --include='*.tsx' --include='*.ts' ` +
      `--exclude-dir=__tests__ | sed -E "s/^t\\(['\\"]//; s/['\\"]$//" | sort -u`,
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);

  it("finds the call sites at all (guards the grep itself)", () => {
    expect(used.length).toBeGreaterThan(1000);
  });

  it.each(CODES)("%s defines every literal key used in the app", (code) => {
    const missing = used.filter((k) => !flat.get(code)!.has(k));
    expect(missing).toEqual([]);
  });
});
