import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Toasts are off except for connectivity, and `src/lib/toast.ts` is what
 * turns them off.
 *
 * It only works because every call site imports `toast` from there instead of
 * from "sonner". One import straight from the library puts the cards back at
 * the top of the screen for whatever that file does, and nothing about that
 * file would look wrong in review — it is the same `toast.success(...)` as
 * everywhere else.
 */

const SRC = join(__dirname, "..");
const HELPER = join("lib", "toast.ts");
// The Toaster component still comes from sonner; only `toast` is routed.
const SONNER_TOAST_IMPORT = /import\s*\{[^}]*\btoast\b[^}]*\}\s*from\s*["']sonner["']/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("toast delivery", () => {
  it("no file besides lib/toast.ts imports toast from sonner", () => {
    const offenders = walk(SRC)
      .filter((p) => !p.endsWith(HELPER))
      .filter((p) => SONNER_TOAST_IMPORT.test(readFileSync(p, "utf8")))
      .map((p) => relative(SRC, p));

    expect(
      offenders,
      'import { toast } from "@/lib/toast" instead — importing it from sonner ' +
        "bypasses the suppression and puts the cards back on screen",
    ).toEqual([]);
  });

  it("suppresses ordinary toasts and lets connectivity through", async () => {
    const source = readFileSync(join(SRC, HELPER), "utf8");
    // The suppressed surface must cover what the app actually calls, or a
    // missing method is a crash rather than a silent no-op.
    for (const method of ["error", "success", "info", "warning"]) {
      expect(source, `toast.${method} is called in the app but not exported`).toMatch(
        new RegExp(`\\b${method}:`),
      );
    }

    const { toast, connectivityToast } = await import("@/lib/toast");
    // Returns an id like sonner's, so `const id = toast.x(...)` stays safe.
    expect(toast.success("nothing to see")).toBe("");
    expect(typeof connectivityToast.error).toBe("function");
  });
});
