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

/**
 * The /img route lives on the web origin (the Cloudflare Worker in front of
 * mytrivia.io). On the web a relative URL reaches it. Inside the native app
 * the page is served from capacitor://localhost, where a relative /img has
 * nobody behind it — the request dies in the webview and every image
 * question falls back to text. Any non-http(s) origin gets the production
 * host spelled out.
 */
function imgRouteOrigin(protocol: string): string {
  return protocol === "http:" || protocol === "https:" ? "" : "https://mytrivia.io";
}

export function questionImageSrc(
  imageUrl: string | null | undefined,
  pageProtocol: string = typeof window !== "undefined" ? window.location.protocol : "https:",
): string | null {
  if (!imageUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    // Relative or malformed — hand it back and let the browser decide.
    return imageUrl;
  }

  if (parsed.hostname !== PROXIED_HOST) return imageUrl;

  return `${imgRouteOrigin(pageProtocol)}/img?u=${encodeURIComponent(parsed.toString())}`;
}
