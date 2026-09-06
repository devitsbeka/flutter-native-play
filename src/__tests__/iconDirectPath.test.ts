/**
 * A category icon is asked for the moment its card mounts.
 *
 * Every icon in the shipped index is stored as `<slug>.png`, so a slug is
 * enough to name the file. DynamicIcon used to wait for the whole 1.3 MB
 * catalogue before it would draw anything — sixty cards on Discover, each
 * blank until the catalogue arrived (owner: "why do category icons need
 * that much time, empty cards while scrolling"). The direct name goes
 * first; the catalogue and the database are the fallbacks, in that order,
 * once storage has refused it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const icon = read("src/components/shared/DynamicIcon.tsx");

describe("the direct path", () => {
  it("names the file from the slug, and only from a slug that can be a file name", () => {
    expect(icon).toMatch(/return \/\^\[a-z0-9\]\[a-z0-9_-\]\*\$\/i\.test\(first\) \? first : null;/);
    expect(icon).toMatch(/directSlug && !directFailed \? `\$\{ICON_STORAGE_URL\}\/\$\{directSlug\}\.png` : null;/);
  });

  it("draws before the catalogue gate, with no skeleton", () => {
    const direct = icon.indexOf("if (directUrl) {");
    const gate = icon.indexOf("if (!isLoaded || (isResolvingIcon && !asyncIconUrl)) {");
    expect(direct).toBeGreaterThan(0);
    expect(gate).toBeGreaterThan(direct);
  });

  it("keeps its own loaded flag, so the catalogue arriving later cannot fade a drawn icon out", () => {
    // The shared flag is reset whenever isLoaded flips; onLoad never fires
    // twice for an unchanged src, so a direct icon on that flag would
    // vanish the moment the catalogue landed.
    expect(icon).toMatch(/onLoad=\{\(\) => setDirectLoaded\(true\)\}/);
    expect(icon).toMatch(/directLoaded \? "opacity-100" : "opacity-0"/);
    expect(icon).toMatch(/setDirectFailed\(false\);\s*\n\s*setDirectLoaded\(false\);\s*\n\s*\}, \[directSlug\]\);/);
  });

  it("hands over to the catalogue and the database only once storage has refused the name", () => {
    expect(icon).toMatch(/onError=\{\(\) => \{\s*\n\s*setDirectLoaded\(false\);\s*\n\s*setDirectFailed\(true\);/);
    expect(icon).toMatch(/if \(directUrl\) return;\s*\n\s*if \(slug && isLoaded\) \{/);
  });

  it("every icon in the shipped index really is <slug>.png, which is what makes the direct name safe", () => {
    const index = JSON.parse(read("public/data/icon-index-slim.json")) as { items: { slug: string; file_name: string }[] };
    expect(index.items.length).toBeGreaterThan(1000);
    const off = index.items.filter((i) => i.file_name !== `${i.slug}.png`);
    expect(off, off.slice(0, 3).map((i) => `${i.slug} -> ${i.file_name}`).join(", ")).toHaveLength(0);
  });
});
