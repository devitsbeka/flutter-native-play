import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { translations } from "@/locales";

// A key that no locale defines does not fall back to English — `t()` hands
// back the path, so the UI renders "team.inviteBtn" to the player. The sibling
// suite compares locales against each other, which cannot see this: the key is
// missing from all of them equally. This one compares the source's t("...")
// calls against the base locale instead.

const BASE = "ka";

function flatten(value: unknown, prefix = ""): Set<string> {
  const out = new Set<string>();
  for (const [key, child] of Object.entries((value ?? {}) as Record<string, unknown>)) {
    const path = `${prefix}${key}`;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      for (const nested of flatten(child, `${path}.`)) out.add(nested);
    } else {
      out.add(path);
    }
  }
  return out;
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!/node_modules|__tests__/.test(path)) sourceFiles(path, acc);
    } else if (/\.tsx?$/.test(path) && !/\.test\./.test(path) && !path.includes("/locales/")) {
      acc.push(path);
    }
  }
  return acc;
}

// Only literal keys: t(someVar) and t(`extra.${x}`) are resolved at runtime and
// cannot be checked from here.
const LITERAL_KEY = /\bt\(\s*["']([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)["']/g;

describe("every translation key used in the app exists", () => {
  const known = flatten(translations[BASE as keyof typeof translations]);

  const used = new Map<string, string>();
  for (const file of sourceFiles("src")) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(LITERAL_KEY)) {
      if (!used.has(match[1])) used.set(match[1], file);
    }
  }

  it("finds the t() calls to check", () => {
    expect(used.size).toBeGreaterThan(1000);
  });

  it("resolves every literal key against the base locale", () => {
    const missing = [...used.entries()]
      .filter(([key]) => !known.has(key))
      .map(([key, file]) => `${key} (${file})`);

    expect(missing, "keys that would render as raw paths").toEqual([]);
  });
});
