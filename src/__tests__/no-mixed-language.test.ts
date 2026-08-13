import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Half a screen in English and half in Georgian is the bug this stops.
 *
 * A Georgian string typed straight into a component cannot be translated —
 * it renders as Georgian in all seven languages — so an English session gets
 * English chrome around Georgian content. The fix is always the same: put the
 * words in `src/locales` and read them with `t()`.
 *
 * SWEPT is the list of places that have been through that already. Cleaning
 * an area means clearing its Georgian literals and then adding it here, which
 * is what keeps the next change from quietly putting one back. It grows; it
 * does not shrink.
 *
 * What is deliberately NOT here:
 *   - `src/locales` — the Georgian translations themselves.
 *   - `src/pages/admin`, `src/components/admin` — internal tools, Georgian by
 *     choice, never seen by a player.
 *   - Dictionaries whose Georgian IS the data: transliteration tables, icon
 *     keywords, `countryCoordinates`, `localDate`'s month and weekday names
 *     (which are only read when the language is Georgian anyway).
 */

const SWEPT = [
  "src/components/home/SceneSidebar.tsx",
  "src/components/profile/CountrySelectModal.tsx",
  "src/components/team/TeamRightSidebar.tsx",
  "src/components/team/widgets/MyTriviasWidget.tsx",
  "src/components/home/MissionsModal.tsx",
  "src/pages/Leaderboards.tsx",
  "src/pages/Settings.tsx",
  "src/utils/countryName.ts",
  "src/utils/missionText.ts",
  "src/utils/notificationTranslations.ts",
];

/**
 * Georgian that is matched against stored data rather than shown to anyone.
 * Translating one of these would break the query it belongs to.
 */
const DATA_SENTINELS = ['"[წაშლილი]"'];

const GEORGIAN = /[\u10A0-\u10FF]/;

function offendingLines(file: string): string[] {
  const out: string[] = [];
  const lines = readFileSync(file, "utf8").split("\n");
  let inBlockComment = false;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      return;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      return;
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (!GEORGIAN.test(line)) return;
    if (DATA_SENTINELS.some((s) => line.includes(s))) return;
    out.push(`${file}:${i + 1}  ${trimmed.slice(0, 100)}`);
  });

  return out;
}

describe("no mixed language", () => {
  it("keeps swept files free of Georgian typed into the source", () => {
    const offenders = SWEPT.flatMap(offendingLines);
    expect(
      offenders,
      `Georgian text in a swept file renders as Georgian in every language.\n` +
        `Move it into src/locales/ka.ts + en.ts and read it with t():\n` +
        offenders.join("\n"),
    ).toEqual([]);
  });

  it("lists only files that exist", () => {
    // A renamed file would silently stop being checked.
    for (const file of SWEPT) {
      expect(statSync(file).isFile(), `${file} is listed as swept but is gone`).toBe(true);
    }
  });

  it("still has ground left to cover, and says how much", () => {
    // Not a failure — a measurement, so the size of the remaining sweep is
    // visible in CI rather than in someone's head.
    const skip = ["locales", "__tests__", "admin", "documentation"];
    const skipFiles = [
      "transliteration.ts",
      "categoryIconKeywords.ts",
      "countryCoordinates.ts",
      "iconAnswerValidation.ts",
      "useIconLibrary.ts",
      "categoryIconMap.ts",
      "localDate.ts",
      "AllButtons.tsx",
    ];
    const walk = (dir: string, acc: string[] = []): string[] => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          if (!skip.includes(entry)) walk(path, acc);
        } else if (/\.tsx?$/.test(entry) && !skipFiles.includes(entry)) {
          acc.push(path);
        }
      }
      return acc;
    };

    const remaining = walk("src").filter(
      (f) => !SWEPT.includes(f.split("\\").join("/")) && offendingLines(f).length > 0,
    );
    // Ratchet: this may fall as tiers are swept, and must never climb.
    expect(remaining.length).toBeLessThanOrEqual(95);
  });
});
