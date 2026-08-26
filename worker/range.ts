/**
 * The byte-range arithmetic behind /videos/*.
 *
 * In its own module, free of Cloudflare's ambient types, so the unit test can
 * import it without dragging the whole worker into the app's typecheck.
 */

/** `bytes=a-b` | `bytes=a-` | `bytes=-n` → [start, endInclusive], or null. */
export function parseRange(header: string, size: number): [number, number] | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    // Suffix form: the last N bytes.
    const suffix = Number(m[2]);
    if (suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return null;
  return [start, end];
}
