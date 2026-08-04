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

## Current state

The migration is **complete**. `mytrivia.io` and `www.mytrivia.io` are custom
domains on the `mytrivia` Worker in the `Dev@itsbeka.com` Cloudflare account,
alongside `mytrivia.mytrivia.workers.dev` as a fallback and staging URL.

The old host injected a vendor badge and an analytics script into the served
HTML; Cloudflare serves the build untouched, so the shell went from 12,943
bytes to 3,197 and is now byte-identical to `dist/index.html`.

## One-time setup

### 1. Cloudflare API token

Create a deploy token at **My Profile → API Tokens** (a *user* page — it is
not under Workers or under the domain). Use the *Edit Cloudflare Workers*
template, then add one more permission:

- Zone → **DNS** → **Edit**, scoped to the `mytrivia.io` zone

The template alone is not enough. Attaching a custom domain writes DNS
records, and a token without that permission fails at the last step with
`Authentication error [code: 10000]` on `/zones/<id>/workers/routes` — after
any conflicting record has already been removed, i.e. mid-outage.

Copy the token; it is shown once. The account ID is on the right-hand side of
any dashboard page, or from `npx wrangler whoami`.

### 2. Repository secrets

In GitHub → Settings → Secrets and variables → Actions, add:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The workflow fails fast with a clear message if either is missing. Every push
to `main` then deploys automatically; there is no publish button anywhere.

### 3. Attaching a custom domain

Cloudflare refuses to attach a hostname that already has DNS records it did
not create:

```
Hostname 'mytrivia.io' already has externally managed DNS records
(A, CNAME, etc). Delete them first. [code: 100117]
```

Moving a zone into Cloudflare imports the existing records, so the record
pointing at the previous host must be deleted first — and the site is
unreachable from that moment until the attach completes. Delete the record
and deploy back to back, at a quiet hour.

If the token turns out to lack the DNS permission, attach the domain from the
dashboard instead: **Workers & Pages → mytrivia → Settings → Domains &
Routes → Add → Custom domain**. That path uses your login rather than a
token and restores service immediately.

Note that the zone overview page shows "No Workers connected" even when
custom domains are attached — that panel counts Workers **Routes** only.
Check **Workers & Pages → mytrivia → Domains** for the real state.

### 4. Verify after any cutover

- Deep links resolve directly: `/profile`, `/leaderboards`, `/dev/v2`, and a
  `/challenge/<code>` link.
- Sign-in works with **Google and Apple**. Both are enabled on the Supabase
  project; the thing to confirm is that the origin is listed under Supabase →
  Authentication → URL Configuration → Redirect URLs. Add the workers.dev URL
  there too if testing against it.
- A quiz plays end to end and videos load.

### 5. Rollback

Comment out the `routes` block and redeploy, then point DNS back at the old
host. Or use **Workers → Deployments → Rollback** in the dashboard to return
to a previous version instantly.

`workers_dev = true` is set deliberately: declaring `routes` otherwise
disables the workers.dev route, so a failed custom-domain attach leaves the
Worker with no route at all and takes the site down entirely rather than
merely leaving the custom domain unattached.

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
