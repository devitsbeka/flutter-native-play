import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * generate-room-name falls back to Georgian when no language is sent, so a
 * call site that omits it hands an English (or German, French…) user a
 * Georgian room name — which is exactly what the icon picker did. Every
 * invoke must carry the user's language; the UI never mixes languages.
 */

const SRC = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("generate-room-name calls", () => {
  it("every invoke passes the user's language", () => {
    const offenders: string[] = [];
    for (const p of walk(SRC)) {
      const text = readFileSync(p, "utf8");
      let idx = 0;
      while ((idx = text.indexOf("invoke('generate-room-name'", idx)) !== -1) {
        // The body literal follows within the call; language must be in it.
        const window = text.slice(idx, idx + 300);
        if (!/language/.test(window)) offenders.push(p);
        idx += 1;
      }
    }
    expect(
      offenders,
      "pass { language } in the invoke body — the server defaults to Georgian without it",
    ).toEqual([]);
  });
});
