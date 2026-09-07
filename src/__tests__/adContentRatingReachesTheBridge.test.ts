import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The values in `initOptions()` have to be ones the native bridge parses.
 *
 * This app has now shipped two settings that were silently discarded at the
 * Capacitor boundary: `npa: '1'`, which iOS read with `call.getBool` and
 * therefore dropped, and `maxAdContentRating: 'T'`, which the plugin's switch
 * does not recognise. Neither logged anything on the JavaScript side. Both
 * governed how ads are treated for a player under the age of consent, and
 * both were off for the entire life of the integration.
 *
 * The plugin's accepted values are in
 * `ios/Sources/AdMobPlugin/AdMobPlugin.swift`, `setRequestConfiguration`.
 */
const raw = readFileSync(join(process.cwd(), "src/services/adService.ts"), "utf8");

/**
 * Comments stripped. Both of these mistakes are written up at length in that
 * file, quoting the wrong values verbatim, and the prose must not be what
 * satisfies or fails an assertion about the code.
 */
const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");

/** The four the native switch matches. Anything else hits its `default:`. */
const ACCEPTED = ["General", "ParentalGuidance", "Teen", "MatureAudience"];

describe("ad settings survive the bridge", () => {
  it("sends a content rating the plugin recognises", () => {
    const match = source.match(/maxAdContentRating:\s*'([^']+)'/);
    expect(match, "no maxAdContentRating is being set at all").not.toBeNull();
    expect(
      ACCEPTED,
      `'${match![1]}' is not one of the four values the native switch matches, ` +
        "so it is dropped and no cap is applied",
    ).toContain(match![1]);
  });

  it("sends npa as a boolean", () => {
    // iOS reads it with `call.getBool`. A string reaches neither platform.
    expect(source).toMatch(/npa:\s*true as const/);
    expect(source).not.toMatch(/npa:\s*'1'/);
  });
});
