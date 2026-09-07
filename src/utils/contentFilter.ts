/**
 * The client's door to the text screen — the list itself lives elsewhere.
 *
 * This module used to BE the blocklist, and being a `src/` module was the
 * whole problem: only the React app could read it, so every screen it
 * protected was protected only in the app. The edge functions that author
 * quiz text and the database rows a direct PostgREST call can write had no
 * screen at all.
 *
 * The list moved to `supabase/functions/_shared/contentFilter.ts`, which
 * Deno and Vite can both import, and this file forwards to it so every
 * existing `@/utils/contentFilter` import keeps working and there is still
 * exactly one copy of the terms. Postgres gets its own copy — it cannot
 * import TypeScript — in the `blocked_terms` table, kept honest by
 * `src/__tests__/blocklistIsOneList.test.ts`.
 */
export {
  containsBlockedText,
  anyBlockedText,
  BLOCKED_SUBSTRINGS,
  BLOCKED_WORDS,
} from "../../supabase/functions/_shared/contentFilter.ts";
