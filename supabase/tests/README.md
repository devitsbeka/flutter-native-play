# Running the entitlement and currency SQL for real

These migrations rewrote how money and subscriptions work. Until this
harness existed, none of that SQL had ever been **executed** — it had been
reviewed and it compiled, which is not the same thing, and a `CREATE
FUNCTION` succeeding tells you nothing about whether the body references a
table that exists.

This runs it against a throwaway local Postgres and asserts the behaviour.

## Running it

Needs `postgresql` installed locally. No Supabase, no network.

```bash
PGBIN=/usr/lib/postgresql/16/bin          # adjust for your version
rm -rf /tmp/pgtest && mkdir -p /tmp/pgtest && chown postgres /tmp/pgtest
su postgres -s /bin/bash -c "$PGBIN/initdb -D /tmp/pgtest -U postgres --auth=trust"
su postgres -s /bin/bash -c "$PGBIN/pg_ctl -D /tmp/pgtest -l /tmp/pg.log -o '-p 55432 -k /tmp' start"

psql -h /tmp -p 55432 -U postgres -f supabase/tests/00-supabase-shim.sql
for f in supabase/migrations/*.sql; do
  psql -h /tmp -p 55432 -U postgres -q -f "$f" >/dev/null 2>&1
done
psql -h /tmp -p 55432 -U postgres -f supabase/tests/01-entitlements.sql
```

Read the output. Each case says whether it must succeed or must fail; a
line that does the opposite of its label is a real regression.

## What it covers

Twenty cases, one per claim made in the P0 and currency commits:

- A signed-in user cannot mint currency, cannot touch another user's
  balance, and can still spend their own
- Gameplay rewards are capped per award and per day, and an unknown reward
  kind is refused
- `vip_subscriptions` is not directly writable by a client
- `grant_vip_days` accepts only known durations and stacks rather than resets
- `exchange_currency` uses the server's 500:1 rate and rejects sub-gem amounts
- The daily reward pays the right amount and cannot be claimed twice a day
- A leaderboard reward can only be claimed by its owner, exactly once

## What it does not cover

**The shim is not Supabase.** `auth.uid()` here reads a session variable
rather than a JWT, and roughly 36 of the historical migrations fail to apply
locally because they depend on Supabase's `storage`/`realtime` schemas. The
tables these functions touch do all get created, which is what makes the
results meaningful — but this proves the *logic*, not the deployment.

**Nothing here tests the edge functions.** `verify-receipt`,
`revenuecat-webhook` and `_shared/iap.ts` are Deno, are not covered by this,
and as of writing have never been executed anywhere. They need a Supabase
project — see `ACTION_ITEMS.md`.
