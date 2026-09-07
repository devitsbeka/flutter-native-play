#!/usr/bin/env node
/**
 * Generates `src/data/attributions.ts` — the data behind the in-app
 * Credits screen (`/credits`).
 *
 * Every picture-round image in the app comes from Wikimedia Commons, and the
 * per-round specs in `scripts/popular-image-categories/spec/*.json` already
 * record the Commons file name and the licence for each one. Most of those
 * licences are Creative Commons BY or BY-SA, which require the title, the
 * author and the licence to be shown wherever the work is used. Nothing did
 * that, so this script builds the list from the specs rather than anyone
 * typing it out — regenerate it and the credits screen follows the content.
 *
 * The specs do not carry the author, so authors come from the Commons API
 * (`extmetadata.Artist`) and are cached back into the JSON. Re-running with
 * an existing JSON only fetches files it has not seen.
 *
 *   node scripts/build-attributions.mjs            # fetch missing authors
 *   node scripts/build-attributions.mjs --offline  # no network; author: null
 *
 * `_reject.json` specs describe candidates that were turned down and carry no
 * image, so they contribute nothing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_DIR = path.join(ROOT, "scripts/popular-image-categories/spec");
// A .ts module rather than .json: the project's tsconfig does not enable
// `resolveJsonModule`, and turning it on for one import is a build-wide
// change nobody asked for.
const OUT = path.join(ROOT, "src/data/attributions.ts");

const OFFLINE = process.argv.includes("--offline");

/** Licences whose terms require the author to be named. */
const ATTRIBUTION_REQUIRED = /^CC BY(-SA)? /;

/** A Commons category slug, from the spec file name. */
function collectionOf(fileName) {
  return fileName
    .replace(/\.json$/, "")
    .replace(/_(expansion\d*|v\d+|types)$/, "")
    .replace(/^guess_/, "");
}

function readSpecs() {
  const rows = new Map(); // Commons "File:x.jpg" -> row
  for (const name of fs.readdirSync(SPEC_DIR).sort()) {
    if (!name.endsWith(".json")) continue;
    if (name.endsWith("_reject.json")) continue;
    const parsed = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, name), "utf8"));
    if (!Array.isArray(parsed)) continue; // guess_logo_types.json is a lookup
    for (const entry of parsed) {
      if (!entry?.file || !entry?.license) continue;
      const existing = rows.get(entry.file);
      if (existing) {
        if (!existing.collections.includes(collectionOf(name))) {
          existing.collections.push(collectionOf(name));
        }
        continue;
      }
      rows.set(entry.file, {
        file: entry.file,
        title: entry.file.replace(/^File:/, "").replace(/\.\w+$/, "").replace(/_/g, " "),
        subject: entry.answers?.en ?? entry.key ?? null,
        author: null,
        license: entry.license,
        source: `https://commons.wikimedia.org/wiki/${entry.file.replace(/ /g, "_").replace(/\?/g, "%3F")}`,
        collections: [collectionOf(name)],
      });
    }
  }
  return rows;
}

function stripHtml(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAuthors(files) {
  const authors = new Map();
  const BATCH = 50;
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const url =
      "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2" +
      "&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist|LicenseShortName" +
      "&titles=" +
      encodeURIComponent(batch.join("|"));
    let json;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "MyTrivia-credits-builder/1.0 (support@mytrivia.io)" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        json = await res.json();
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    for (const page of json?.query?.pages ?? []) {
      const meta = page?.imageinfo?.[0]?.extmetadata;
      const artist = meta?.Artist?.value;
      if (artist) authors.set(page.title, stripHtml(artist) || null);
    }
    const normalised = json?.query?.normalized ?? [];
    for (const { from, to } of normalised) {
      if (authors.has(to)) authors.set(from, authors.get(to));
    }
    process.stderr.write(`  authors ${Math.min(i + BATCH, files.length)}/${files.length}\r`);
  }
  process.stderr.write("\n");
  return authors;
}

const rows = readSpecs();

// Carry authors already fetched by an earlier run, so a regenerate after a
// content change only asks Commons about the new files.
if (fs.existsSync(OUT)) {
  const previous = fs.readFileSync(OUT, "utf8");
  for (const line of previous.split("\n")) {
    const trimmed = line.trim().replace(/,$/, "");
    if (!trimmed.startsWith("{")) continue;
    let item;
    try {
      item = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const row = rows.get(item.file);
    if (row && item.author) row.author = item.author;
  }
}

const missing = [...rows.values()].filter((r) => !r.author).map((r) => r.file);
if (missing.length && !OFFLINE) {
  process.stderr.write(`Fetching ${missing.length} author(s) from Wikimedia Commons…\n`);
  const authors = await fetchAuthors(missing);
  for (const row of rows.values()) {
    if (!row.author) row.author = authors.get(row.file) ?? null;
  }
} else if (missing.length) {
  process.stderr.write(`--offline: leaving ${missing.length} author(s) unresolved\n`);
}

const items = [...rows.values()].sort((a, b) => a.title.localeCompare(b.title, "en"));

const byLicense = {};
for (const item of items) byLicense[item.license] = (byLicense[item.license] ?? 0) + 1;

const counts = {
  total: items.length,
  attributionRequired: items.filter((i) => ATTRIBUTION_REQUIRED.test(i.license)).length,
  byLicense: Object.fromEntries(Object.entries(byLicense).sort((a, b) => b[1] - a[1])),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
// One entry per line: readable in a diff when the picture rounds change,
// without the indentation cost of pretty-printing 1,500 objects.
const serialised = `// GENERATED FILE — do not edit by hand.
//
// Regenerate with:  node scripts/build-attributions.mjs
//
// Source: ${"scripts/popular-image-categories/spec/*.json"} + Wikimedia Commons
// (author names come from the Commons API; see the script for how).
// Last generated: ${new Date().toISOString().slice(0, 10)}

export interface Attribution {
  /** Commons page name, e.g. "File:Brad Pitt-69858.jpg". */
  file: string;
  /** The work's title, as Commons records it. */
  title: string;
  /** What the picture is of, in the app's own words. */
  subject: string | null;
  /** The author Commons names, or null when Commons states none. */
  author: string | null;
  /** The licence the work is offered under. */
  license: string;
  /** The Commons file page, which carries the full licence terms. */
  source: string;
  /** Which picture rounds use it. */
  collections: string[];
}

/** How many works, and under which licences. */
export const ATTRIBUTION_COUNTS = ${JSON.stringify(counts, null, 2)} as const;

/** Every third-party image the app ships a picture round for. */
export const ATTRIBUTIONS: Attribution[] = [
${items.map((item) => "  " + JSON.stringify(item) + ",").join("\n")}
];
`;
fs.writeFileSync(OUT, serialised);

const unresolved = items.filter((i) => ATTRIBUTION_REQUIRED.test(i.license) && !i.author);
process.stderr.write(
  `Wrote ${items.length} entries to ${path.relative(ROOT, OUT)} ` +
    `(${counts.attributionRequired} require attribution, ${unresolved.length} without a named author)\n`,
);
