# Deployment

Merging to `main` deploys. `.github/workflows/deploy.yml` typechecks, runs the
unit and smoke tests, builds, and publishes `dist/` to Cloudflare Workers,
which serves https://mytrivia.io and https://www.mytrivia.io (see
`wrangler.toml`). A deploy takes roughly two to three minutes. Nothing has to
be pressed in Lovable — Lovable syncing the repo does not publish the site.

## Verifying what is actually live

Every build stamps an id and writes it to `version.json`:

```sh
curl -s https://mytrivia.io/version.json
# {"build":"msozdn5e"}
```

The id is `Date.now().toString(36)` at build time, so it decodes to when that
build was made — which is the quickest way to tell whether a deploy landed:

```sh
python3 -c "import datetime;print(datetime.datetime.utcfromtimestamp(int('msozdn5e',36)/1000))"
# 2026-08-11 18:15:26
```

Comparing the `assets/index-*.js` hash against a local build no longer works
as a check: the build id is part of the bundle, so two builds of the same
commit produce different hashes.

## "I merged a fix but I don't see it"

Deploys land on the server; a *page* only picks them up when it reloads. A tab
or installed app left open keeps running the code it loaded, however many
deploys have shipped since.

1. Confirm the server is current: `curl -s https://mytrivia.io/version.json`
   and check the decoded time against the merge, or look for the change itself
   in the served bundle, e.g.
   `curl -s https://mytrivia.io/assets/<chunk>.js | grep -c "<a string your change added>"`.
2. Confirm what the *device* is running: Settings shows the running build id
   at the bottom. If it differs from `version.json`, that page is stale —
   tapping the line pulls the new build.

`useFreshBuildGuard` normally does this automatically: it polls `version.json`
every 45 seconds and on tab focus, and reloads when the ids differ (never
during a live game). A page running a build older than that guard cannot
rescue itself and needs one manual refresh.
