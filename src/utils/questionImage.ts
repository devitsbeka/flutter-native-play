/**
 * Where a question's picture is actually fetched from.
 *
 * Every image question in the bank points at upload.wikimedia.org. Wikimedia
 * rate-limits per client IP over a time window, and starting a quiz asks for
 * several images at once: measured against the live host, a burst of twenty
 * came back with ten to fourteen 429s. On an image question the picture *is*
 * the question — the text is hidden — so a throttled image is a question
 * nobody can answer.
 *
 * Those URLs are sent through our own /img route instead, which fetches once
 * at the edge and caches. Wikimedia sees one request per image per edge
 * rather than one per player.
 *
 * Anything not on Wikimedia is returned untouched: the proxy only accepts
 * that host, and images we already serve ourselves have nothing to gain.
 */
const PROXIED_HOST = "upload.wikimedia.org";

export function questionImageSrc(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    // Relative or malformed — hand it back and let the browser decide.
    return imageUrl;
  }

  if (parsed.hostname !== PROXIED_HOST) return imageUrl;

  return `/img?u=${encodeURIComponent(parsed.toString())}`;
}
