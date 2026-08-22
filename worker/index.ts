/**
 * The Worker in front of the static build.
 *
 * It exists for one route. Every image question — 4,239 of them — pointed
 * straight at upload.wikimedia.org, and Wikimedia rate-limits per client IP
 * over a time window. Starting a quiz asks for a handful of images at once,
 * and measured against the live host, a burst of twenty came back with ten
 * to fourteen 429s. The picture *is* the question on those cards, so a
 * throttled image is an unanswerable question.
 *
 * The User-Agent makes no difference — whichever burst goes first succeeds
 * and the next one is throttled regardless of what it calls itself — so the
 * only fix is to stop asking Wikimedia once per player. Requests go through
 * here instead: the edge fetches an image once, caches it, and serves every
 * later request from the cache. Wikimedia sees one request per image per
 * edge rather than one per player.
 *
 * Everything else falls through to the assets binding, which is what the
 * Worker did implicitly when it had no code at all.
 */

/** Only this host may be proxied. */
const ALLOWED_HOST = "upload.wikimedia.org";

/**
 * A year. Wikimedia thumbnail URLs carry the size and the file version in the
 * path, so a given URL's bytes do not change; a new picture is a new URL.
 */
const CACHE_SECONDS = 31_536_000;

/** Upstream is given a real name and a contact, which is Wikimedia's policy. */
const UPSTREAM_UA = "MyTrivia/1.0 (https://mytrivia.io) image-proxy";

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

function badRequest(reason: string): Response {
  // Deliberately not a redirect to the origin: a 4xx makes the <img> fire
  // onError, and the card falls back to showing the question text.
  return new Response(reason, { status: 400, headers: { "cache-control": "no-store" } });
}

async function proxyImage(request: Request, url: URL, ctx: ExecutionContext): Promise<Response> {
  const target = url.searchParams.get("u");
  if (!target) return badRequest("missing u");

  let upstream: URL;
  try {
    upstream = new URL(target);
  } catch {
    return badRequest("u is not a url");
  }

  // An open proxy would let anyone serve anything from our domain and spend
  // our bandwidth doing it, so the host is an allowlist of exactly one.
  if (upstream.protocol !== "https:" || upstream.hostname !== ALLOWED_HOST) {
    return badRequest("host not allowed");
  }

  // Key the cache on the normalised upstream URL rather than on the incoming
  // request, so the same picture is one entry however the query was written.
  const cacheKey = new Request(`https://img.cache/${encodeURIComponent(upstream.toString())}`, {
    method: "GET",
  });
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) {
    const withHeader = new Response(hit.body, hit);
    withHeader.headers.set("x-proxy-cache", "hit");
    return withHeader;
  }

  let response: Response;
  try {
    response = await fetch(upstream.toString(), {
      headers: { "user-agent": UPSTREAM_UA, accept: "image/*" },
      // Ask Cloudflare to hold it too, so a miss here is still cheap next time.
      cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
    });
  } catch {
    return new Response("upstream unreachable", {
      status: 502,
      headers: { "cache-control": "no-store" },
    });
  }

  if (!response.ok) {
    // Pass the failure through without caching it. A 429 now must not become
    // a 429 for everyone for a year.
    return new Response(`upstream ${response.status}`, {
      status: response.status === 429 ? 503 : response.status,
      headers: { "cache-control": "no-store" },
    });
  }

  const out = new Response(response.body, response);
  out.headers.set("cache-control", `public, max-age=${CACHE_SECONDS}, immutable`);
  out.headers.set("access-control-allow-origin", "*");
  out.headers.delete("set-cookie");
  out.headers.set("x-proxy-cache", "miss");

  // Store without blocking the response the player is waiting for.
  ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/img") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("method not allowed", { status: 405 });
      }
      return proxyImage(request, url, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
