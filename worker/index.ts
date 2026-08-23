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
  /** Both public by design — the project ref and the publishable (anon) key. */
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

/** `/room/ABC123`, the link the lobby's share button hands out. */
const ROOM_PATH = /^\/room\/([A-Za-z0-9-]{4,16})\/?$/;

/** A link preview is scraped once and then cached by the chat app for a long
 *  time, so this only needs to be short enough that a renamed room catches up. */
const PREVIEW_CACHE_SECONDS = 300;

interface RoomPreview {
  roomName: string | null;
  hostNickname: string | null;
  hostAvatar: string | null;
}

/**
 * Who is inviting, and to what.
 *
 * Read with the publishable key over PostgREST: both rows are already
 * world-readable (joining a room by its code depends on it), so this asks for
 * nothing a signed-out visitor could not ask for itself.
 */
async function fetchRoomPreview(env: Env, code: string): Promise<RoomPreview | null> {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  const headers = { apikey: key, authorization: `Bearer ${key}` };
  const get = async (path: string) => {
    const res = await fetch(`${base}/rest/v1/${path}`, { headers });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>[];
  };

  const rooms = await get(
    `game_rooms?select=room_name,host_user_id&room_code=eq.${encodeURIComponent(code)}&limit=1`,
  );
  const room = rooms?.[0];
  if (!room) return null;

  let hostNickname: string | null = null;
  let hostAvatar: string | null = null;
  if (typeof room.host_user_id === "string") {
    const profiles = await get(
      `profiles?select=nickname,avatar_url&user_id=eq.${room.host_user_id}&limit=1`,
    );
    const profile = profiles?.[0];
    hostNickname = (profile?.nickname as string) ?? null;
    // Avatars carry a cache-busting query string; keep it, it is part of the
    // URL that actually resolves.
    hostAvatar = (profile?.avatar_url as string) ?? null;
  }

  return {
    roomName: (room.room_name as string) ?? null,
    hostNickname,
    hostAvatar,
  };
}

/** Replace the content of one meta tag, wherever it appears in <head>. */
class MetaContent {
  constructor(private readonly value: string) {}
  element(el: { setAttribute: (n: string, v: string) => void }) {
    el.setAttribute("content", this.value);
  }
}

/** Drop a meta tag whose value no longer describes the image beside it. */
class RemoveElement {
  element(el: { remove: () => void }) {
    el.remove();
  }
}

/**
 * The share preview for a room invite.
 *
 * index.html is one static file for every route, so a shared invite scraped
 * as-is showed the site-wide card: a crown, and the app's tagline. Nothing in
 * it said who was inviting you or where. The Worker already stands in front
 * of every request, so the invite's own details are written into the tags on
 * the way out, per request, without the app needing to be server-rendered.
 *
 * Everything here degrades to the untouched page: no code, no room, no
 * Supabase binding, a failed lookup — all fall through to the plain asset.
 */
async function roomPreview(request: Request, env: Env, code: string): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  const contentType = assetResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return assetResponse;

  let preview: RoomPreview | null = null;
  try {
    preview = await fetchRoomPreview(env, code);
  } catch {
    return assetResponse; // A preview is never worth failing the page for.
  }
  if (!preview) return assetResponse;

  const who = preview.hostNickname?.trim();
  const where = preview.roomName?.trim();
  const title = who && where ? `${who} · ${where}` : who || where || "MyTrivia";

  // Canonicalise the scheme: behind the edge the inbound URL can be http,
  // and an http og:url on an https page is the sort of mismatch a scraper is
  // entitled to distrust.
  const canonical = new URL(request.url);
  canonical.protocol = "https:";

  const rewriter = new HTMLRewriter()
    .on('meta[property="og:title"]', new MetaContent(title))
    .on('meta[property="og:url"]', new MetaContent(canonical.toString()))
    .on('meta[property="og:type"]', new MetaContent("website"));

  // The inviter's face. A host with no avatar keeps the page's own card,
  // which is the Trivia King scene — the character the app opens on — so the
  // fallback is still the game rather than a blank frame.
  if (preview.hostAvatar) {
    rewriter
      .on('meta[property="og:image"]', new MetaContent(preview.hostAvatar))
      .on('meta[name="twitter:image"]', new MetaContent(preview.hostAvatar))
      // A portrait is square; asking for a wide card letterboxes it.
      .on('meta[name="twitter:card"]', new MetaContent("summary"))
      // The page declares 1200x630 for its own card. Leaving that in place
      // over a square avatar tells the scraper a shape the image does not
      // have, which is what makes one get cropped to something odd — and
      // guessing a size for someone else's upload would be the same mistake.
      .on('meta[property="og:image:width"]', new RemoveElement())
      .on('meta[property="og:image:height"]', new RemoveElement())
      .on('meta[property="og:image:type"]', new RemoveElement());
  }

  const out = rewriter.transform(assetResponse);
  const response = new Response(out.body, out);
  response.headers.set("cache-control", `public, max-age=${PREVIEW_CACHE_SECONDS}`);
  return response;
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

  // A cold edge still has to ask Wikimedia once per image, and a round's
  // burst of cold images can get this colo's IP throttled just like a
  // player's used to be — the first player through a fresh location then
  // lost some pictures while everyone behind a warm cache saw them all.
  // Throttles and transient upstream failures are retried with a short
  // backoff before the failure is passed to the card; a definitive answer
  // (404 and friends) is not retried.
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 400 : 900));
    }
    try {
      response = await fetch(upstream.toString(), {
        headers: { "user-agent": UPSTREAM_UA, accept: "image/*" },
        // Ask Cloudflare to hold it too, so a miss here is still cheap next time.
        cf: { cacheEverything: true, cacheTtl: CACHE_SECONDS },
      });
    } catch {
      response = null;
      continue;
    }
    if (response.ok || (response.status !== 429 && response.status < 500)) break;
  }

  if (!response) {
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

    const room = ROOM_PATH.exec(url.pathname);
    if (room && (request.method === "GET" || request.method === "HEAD")) {
      return roomPreview(request, env, room[1]);
    }

    return env.ASSETS.fetch(request);
  },
};
