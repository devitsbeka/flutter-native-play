import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  containsBlockedText,
  BLOCKED_SUBSTRINGS,
  BLOCKED_WORDS,
} from "@/utils/contentFilter";

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const SHARED = "supabase/functions/_shared/contentFilter.ts";
const MIGRATION = "supabase/migrations/20261014110000_server_side_content_filter.sql";

/**
 * One blocklist, three runtimes.
 *
 * The list used to live in `src/utils/contentFilter.ts` and be readable only
 * by the React app, which is why every screen it protected was protected only
 * in the app: the edge functions that write quiz text and the tables a direct
 * PostgREST call can reach had no screen at all, and the anon key ships in
 * the iOS binary, so skipping the client was a `curl` away.
 *
 * It now lives in `supabase/functions/_shared/`, which Deno and Vite both
 * import, and Postgres — which cannot import TypeScript — gets a copy seeded
 * into `blocked_terms` by the migration. That copy is the one thing here that
 * can rot silently: adding a slur to the TypeScript list and forgetting the
 * SQL would leave the database happily accepting it. This test is what makes
 * that fail out loud.
 */
describe("the blocklist has one copy per runtime and they agree", () => {
  it("keeps the terms in the shared module, not in the client one", () => {
    const client = src("src/utils/contentFilter.ts");
    expect(client).toContain("supabase/functions/_shared/contentFilter.ts");
    // A term list that grew back in the client is the regression: two lists,
    // one of which is not the one the server runs.
    expect(client).not.toMatch(/BLOCKED_(SUBSTRINGS|WORDS)\s*:\s*string\[\]\s*=/);
    expect(src(SHARED)).toMatch(/export const BLOCKED_SUBSTRINGS/);
  });

  it("seeds the database with exactly the terms TypeScript screens on", () => {
    const sql = src(MIGRATION);
    const block = sql.slice(
      sql.indexOf("INSERT INTO public.blocked_terms"),
      sql.indexOf("ON CONFLICT (term)"),
    );
    expect(block.length).toBeGreaterThan(0);

    const seeded = { substring: [] as string[], word: [] as string[] };
    for (const [, term, kind] of block.matchAll(
      /\(\s*'((?:[^']|'')+)'\s*,\s*'(substring|word)'\s*\)/g,
    )) {
      seeded[kind as "substring" | "word"].push(term.replace(/''/g, "'"));
    }

    expect([...seeded.substring].sort()).toEqual([...BLOCKED_SUBSTRINGS].sort());
    expect([...seeded.word].sort()).toEqual([...BLOCKED_WORDS].sort());
  });

  it("guards the four tables that carry player-authored text", () => {
    const sql = src(MIGRATION);
    for (const table of ["profiles", "game_rooms", "tv_sessions", "user_quiz_posts"]) {
      expect(sql).toMatch(
        new RegExp(`BEFORE INSERT OR UPDATE ON public\\.${table}\\b`),
      );
    }
    // profiles.nickname is the public display name; the rest are the names
    // rendered to other players.
    expect(sql).toMatch(/reject_blocked_text\('nickname'\)/);
    expect(sql).toMatch(/'room_name', 'game_name'/);
  });

  it("revokes the new functions from PUBLIC before granting (CLAUDE.md rule 3)", () => {
    const sql = src(MIGRATION);
    for (const fn of [
      "moderation_normalize(text)",
      "moderation_tokens(text)",
      "moderation_word_candidates(text)",
      "contains_blocked_text(text)",
      "blocked_terms_normalize()",
      "reject_blocked_text()",
    ]) {
      const escaped = fn.replace(/[()]/g, "\\$&");
      expect(sql).toMatch(
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${escaped} FROM PUBLIC`),
      );
    }
    // The list must not be readable by a client: knowing it exactly is a
    // bypass checklist.
    expect(sql).toMatch(/ALTER TABLE public\.blocked_terms ENABLE ROW LEVEL SECURITY/);
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.contains_blocked_text\(text\) TO (anon|authenticated)/);
  });

  it("still screens the same strings after the move", () => {
    // The move was a move, not a rewrite. A handful of the cases the SQL twin
    // was verified against, so a change to the shared module that breaks
    // matching fails here rather than in production.
    expect(containsBlockedText("F.u.c.k this")).toBe(true);
    expect(containsBlockedText("f u c k")).toBe(true);
    expect(containsBlockedText("ბოზო შენ")).toBe(true);
    expect(containsBlockedText("сука блядь")).toBe(true);
    expect(containsBlockedText("Scunthorpe United")).toBe(false);
    expect(containsBlockedText("Dick Van Dyke")).toBe(false);
  });
});
