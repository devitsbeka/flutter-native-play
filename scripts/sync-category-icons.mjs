#!/usr/bin/env node
/**
 * Re-snapshot src/data/categoryIconMap.ts from `categories.icon_slug`.
 *
 * That column is the source of what icon a category wears — it is what
 * Discover draws from and what a migration curates. This file exists because
 * a few surfaces need an answer before any query has come back, so it keeps
 * a copy; a copy that nobody refreshes is how it got 39 of 70 categories
 * wrong last time, with Celebrities showing a singer on one screen and a gold
 * star on another.
 *
 *   node scripts/sync-category-icons.mjs           # rewrite the file
 *   node scripts/sync-category-icons.mjs --check   # exit 1 if it is stale
 *
 * Reads .env for the project ref and the publishable (anon) key — both public
 * by design, and enough for this one column.
 */
import { readFileSync, writeFileSync } from "node:fs";

const MAP_FILE = "src/data/categoryIconMap.ts";
const GENERATED = "  // Generated from categories.icon_slug — do not hand-edit.";

function env() {
  const raw = readFileSync(".env", "utf8");
  const pick = (key) =>
    raw.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  const url = pick("VITE_SUPABASE_URL");
  const key = pick("VITE_SUPABASE_PUBLISHABLE_KEY") || pick("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) {
    console.error("Missing VITE_SUPABASE_URL / publishable key in .env");
    process.exit(1);
  }
  return { url, key };
}

async function liveSlugs() {
  const { url, key } = env();
  const res = await fetch(
    `${url}/rest/v1/categories?select=category_id,icon_slug&is_active=eq.true`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) {
    console.error(`categories query failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const rows = await res.json();
  const out = new Map();
  for (const r of rows) if (r.category_id && r.icon_slug) out.set(r.category_id, r.icon_slug);
  return out;
}

/** Rewrite one `export const NAME: Record<string, string> = { ... };` block. */
function rebuild(src, name, live) {
  const at = src.indexOf(`export const ${name}`);
  if (at === -1) throw new Error(`${name} not found in ${MAP_FILE}`);
  const open = src.indexOf("{", at);
  const close = src.indexOf("\n};", open);
  const body = src.slice(open + 1, close);

  // Keep any key the database does not carry — aliases and legacy ids that
  // nothing would restore if this dropped them.
  const merged = new Map();
  for (const m of body.matchAll(/'([^']+)':\s*'([^']+)'/g)) {
    if (!merged.has(m[1])) merged.set(m[1], m[2]);
  }
  for (const [k, v] of live) merged.set(k, v);

  const lines = [GENERATED];
  for (const k of [...merged.keys()].sort()) lines.push(`  '${k}': '${merged.get(k)}',`);
  return src.slice(0, open + 1) + "\n" + lines.join("\n") + "\n" + src.slice(close + 1);
}

const live = await liveSlugs();
const before = readFileSync(MAP_FILE, "utf8");
let after = rebuild(before, "CATEGORY_ID_TO_ICON", live);
after = rebuild(after, "CATEGORY_ICON_SLUGS", live);

if (process.argv.includes("--check")) {
  if (after !== before) {
    console.error(`${MAP_FILE} is out of step with categories.icon_slug.`);
    console.error("Run: node scripts/sync-category-icons.mjs");
    process.exit(1);
  }
  console.log(`${MAP_FILE} matches the database (${live.size} categories).`);
  process.exit(0);
}

if (after === before) {
  console.log(`${MAP_FILE} already matches the database (${live.size} categories).`);
} else {
  writeFileSync(MAP_FILE, after);
  console.log(`${MAP_FILE} updated from ${live.size} categories.`);
}
