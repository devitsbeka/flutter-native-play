# Hosting: moving mytrivia.io to Cloudflare

The web app is a static Vite SPA that talks to Supabase, so hosting only has
to serve files. It is deployed to **Cloudflare Workers static assets**.

**Why Cloudflare.** The build is ~408 MB, 281 MB of which is 181 video files.
Platforms that meter egress (Vercel and Netlify both include 100 GB/month,
then bill for overage) would charge indefinitely for serving static video —
100 GB is roughly 10,000 first-loads here. Cloudflare does not meter
bandwidth. It also serves from inside Georgia, where the players are, rather
than from Frankfurt or Istanbul.

## Files involved

| File | Purpose |
| --- | --- |
| `wrangler.toml` | Worker config. Assets-only (no server code), SPA routing. |
| `public/_headers` | Cache and security headers; Vite copies it into `dist/`. |
| `.github/workflows/deploy.yml` | Builds and deploys on every push to `main`. |

## One-time setup

### 1. Cloudflare account and API token

Create a Cloudflare account if you do not have one, then make a deploy token
at **My Profile → API Tokens → Create Token**, using the *Edit Cloudflare
Workers* template. It needs:

- Account → Workers Scripts → **Edit**
- Account → Account Settings → **Read**
- Zone → Workers Routes → **Edit** (only once you attach the custom domain)

Copy the token — it is shown once.

Your account ID is on the right-hand side of any Cloudflare dashboard page,
or from `npx wrangler whoami`.

### 2. Repository secrets

In GitHub → Settings → Secrets and variables → Actions, add:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow fails fast with a clear message if either is missing.

### 3. First deploy (does not touch the live site)

Push to `main`, or run the workflow manually from the Actions tab. Wrangler
prints a `*.workers.dev` URL. The custom domain is still commented out in
`wrangler.toml`, so mytrivia.io keeps being served by the old host — nothing
is at risk yet.

The first deploy uploads ~408 MB and is slow. Later deploys only upload
changed files.

### 4. Verify on the workers.dev URL

Before moving any traffic, check on that URL:

- The homepage loads and you can sign in with **Google and Apple** (both are
  enabled on the Supabase project; the redirect allowlist is the thing to
  confirm — see below).
- Deep links work directly: `/profile`, `/leaderboards`, `/dev/v2`, and a
  `/challenge/<code>` link.
- A quiz plays end to end, and videos load.

**Add the workers.dev URL to Supabase** first, or OAuth will bounce to the
wrong place: Supabase → Authentication → URL Configuration → Redirect URLs.
Add `https://mytrivia.io` and `https://www.mytrivia.io` there too, so they
are ready before the cutover.

### 5. Cut over

1. Move the `mytrivia.io` zone into your Cloudflare account (Add a site, then
   change nameservers at your registrar). DNS propagation is the slow part.
2. Uncomment the `routes` block in `wrangler.toml` and push. Cloudflare
   creates and manages the DNS records itself — do not also point records at
   the old host by hand.
3. Confirm the site loads from the new deployment and the Lovable badge is
   gone. That badge is injected by the old host at serve time, not by our
   code, so it disappears with the move.

### 6. Rollback

Re-comment the `routes` block and repoint DNS at the previous host, or use
**Workers → Deployments → Rollback** in the Cloudflare dashboard to return to
the previous version instantly.

## Caching

`public/_headers` sets:

- `/assets/*` and `/fonts/*` — one year, `immutable`. Vite content-hashes
  these filenames, so a URL can never point at different bytes.
- `/videos/*` — 30 days. These filenames are **not** hashed, so changing a
  video needs a new filename or a cache purge to propagate.
- `/index.html`, `/` and `/sw.js` — `no-cache`. The HTML shell names the
  hashed assets, so it must revalidate for a deploy to take effect, and a
  stale service worker would pin clients to an old build.

## Known trade-off: missing assets return the app shell

`not_found_handling = "single-page-application"` serves `index.html` for any
unmatched path, which is what makes client-side routes work. The side effect
is that a missing file — say a stale chunk requested by a tab that was open
across a deploy — returns HTML with a `200` instead of a `404`, and the
browser reports a confusing MIME-type error.

This is left as-is deliberately. Vercel and Netlify behave the same way with
catch-all rewrites, and `useFreshBuildGuard` already reloads long-open tabs
when a new build ships, which is the situation that would trigger it. Fixing
it properly means putting a small Worker in front of the assets, which would
make SPA navigations count as Worker invocations (100k/day on the free plan)
instead of unmetered asset reads. Not worth it unless the error shows up in
Sentry.

## Recommended follow-up: get the videos out of the build

281 MB of the 408 MB build is video. Every deploy re-uploads it, and a video
cannot be changed without a rebuild. Moving those files to object storage —
Cloudflare R2 (also no egress fees) or the Supabase storage already in use —
and referencing them by URL would cut the deployment to ~127 MB and decouple
media updates from code releases. This matters more once Facebook Instant
Games is in scope, where load size is an explicit review criterion.
