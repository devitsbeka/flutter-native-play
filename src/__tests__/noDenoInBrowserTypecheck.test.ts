import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

/**
 * A file under `src/` may import from `supabase/functions/`, but only a
 * module that would survive the browser typecheck.
 *
 * `tsconfig.app.json` includes `src` — and TypeScript follows imports out of
 * it regardless, so importing an edge-function module compiles that module
 * under the browser config too. Deno globals and `https://` specifiers do not
 * resolve there, and the failure does not show up in the editor or in
 * `vitest`: it appears for the first time as a red deploy.
 *
 * That is how it happened. A test imported `_shared/push.ts` for its FCM
 * payload, `npm run typecheck` went green locally because the rebase had not
 * landed yet, and `main` shipped broken:
 *
 *     push.ts(14,37): error TS2307: Cannot find module
 *       'https://esm.sh/@supabase/supabase-js@2'
 *     push.ts(27,15): error TS2304: Cannot find name 'Deno'
 *
 * The fix is the shape `pushCopy.ts` and `pushPayload.ts` already have: keep
 * the logic worth testing in a module free of Deno and of `https://` imports,
 * and let the runtime module import that.
 */

const ROOT = resolve(__dirname, "..", "..");
const SRC = join(ROOT, "src");
const FUNCTIONS = join(ROOT, "supabase", "functions");

const IMPORT_RE = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
const DENO_GLOBAL = /\bDeno\s*\./;
const REMOTE_IMPORT = /(?:from|import)\s*\(?\s*["']https?:\/\//;

/**
 * Comments and their contents are not code.
 *
 * Without this the rule reported pushPayload.ts — whose header says, in
 * words, not to use `Deno.` — as using it.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** Resolve a relative specifier the way tsc would, tolerating a missing extension. */
function resolveLocal(fromFile: string, spec: string): string | null {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Every edge-function module reachable from `entry`, including itself. */
function reachable(entry: string, seen = new Set<string>()): string[] {
  if (seen.has(entry)) return [];
  seen.add(entry);
  const source = stripComments(readFileSync(entry, "utf8"));
  const out = [entry];
  for (const [, spec] of source.matchAll(IMPORT_RE)) {
    if (!spec.startsWith(".")) continue;
    const target = resolveLocal(entry, spec);
    if (target?.startsWith(FUNCTIONS)) out.push(...reachable(target, seen));
  }
  return out;
}

describe("edge-function modules imported by src", () => {
  it("pull in no Deno globals and no https:// imports", () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      const source = stripComments(readFileSync(file, "utf8"));
      for (const [, spec] of source.matchAll(IMPORT_RE)) {
        if (!spec.startsWith(".")) continue;
        const target = resolveLocal(file, spec);
        if (!target?.startsWith(FUNCTIONS)) continue;

        for (const dep of reachable(target)) {
          const depSource = stripComments(readFileSync(dep, "utf8"));
          const why = DENO_GLOBAL.test(depSource)
            ? "uses the Deno global"
            : REMOTE_IMPORT.test(depSource)
              ? "imports over https://"
              : null;
          if (why) {
            offenders.push(
              `${relative(ROOT, file)} reaches ${relative(ROOT, dep)}, which ${why}`,
            );
          }
        }
      }
    }

    expect(
      [...new Set(offenders)],
      "these break `npm run typecheck` in CI while looking fine locally — move the " +
        "tested logic into a Deno-free module (see _shared/pushPayload.ts)",
    ).toEqual([]);
  });
});
