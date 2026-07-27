# Deployment

The app deploys through Lovable, which mirrors the `main` branch of this
repository and publishes it to https://mytrivia.io.

## Flow

1. Changes merge to `main` on GitHub (via pull request).
2. Lovable's GitHub sync ingests the new commits (usually within a minute;
   the activity feed in the Lovable editor shows the latest synced commit).
3. Pressing **Publish** in Lovable builds the synced workspace and deploys
   it, applying any new Supabase migrations from `supabase/migrations/`.

## Verifying what is actually live

The deployed bundle carries a content hash. Compare the live hash with a
local build to know exactly which commit is serving:

```sh
# hash currently served in production
curl -s https://mytrivia.io/ | grep -o 'assets/index-[^\"]*\.js'

# hash of the current checkout
npx vite build && ls dist/assets/index-*.js
```

If the hashes differ, the site has not been published from the current
`main` yet.

## If Lovable stops syncing

Lovable occasionally misses GitHub webhook events and reports "Up to date"
while `main` is ahead. Pushing any new commit to `main` fires a fresh
webhook and unsticks the sync.
