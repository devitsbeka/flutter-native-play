# Deploying the entitlement functions

Three functions decide who has PRO and who gets gems. None of them has ever
run: they need two secrets and a deploy, and the RevenueCat webhook needs to
be pointed at one of them.

Until that's done the app builds and installs fine, and every purchase fails
to grant anything.

| Function | Does | Auth |
|---|---|---|
| `verify-receipt` | App asks the server to re-sync entitlements after a purchase or restore | Supabase JWT |
| `revenuecat-webhook` | RevenueCat reports renewals, cancellations, refunds | Shared secret header |
| `_shared/iap.ts` | Catalog + the apply logic both of the above use | — |

## 1. Set the secrets

Two values. Neither belongs in the repo, in `.env`, or in a workflow file.

```bash
npx supabase login          # once
npx supabase link --project-ref sqwpzezkhpqkdyltvsim

# The RevenueCat SECRET key — starts with sk_, from
# RevenueCat → Project Settings → API keys → Secret keys.
# NOT the appl_… SDK key, which is public and lives in .env.
npx supabase secrets set REVENUECAT_SECRET_API_KEY='sk_…'

# A secret you invent, shared with RevenueCat in step 3.
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET="$(openssl rand -hex 32)"
```

Keep the webhook value — you need to paste the same string into RevenueCat.
If you generate it inline as above, print it once with
`npx supabase secrets list` (it shows a digest, not the value) or generate it
separately and copy it.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
injected by the platform; you do not set those.

## 2. Deploy

```bash
npx supabase functions deploy verify-receipt
npx supabase functions deploy revenuecat-webhook
```

`config.toml` already carries the JWT settings: `verify-receipt` requires a
signed-in caller, `revenuecat-webhook` does not — RevenueCat has no Supabase
session, so its Authorization header is the whole gate. **The webhook refuses
to run at all when `REVENUECAT_WEBHOOK_SECRET` is unset**, rather than
accepting unauthenticated calls, so a missed step fails closed.

## 3. Point RevenueCat at the webhook

RevenueCat → Project Settings → Integrations → Webhooks:

- **URL** — `https://sqwpzezkhpqkdyltvsim.supabase.co/functions/v1/revenuecat-webhook`
- **Authorization header** — the exact `REVENUECAT_WEBHOOK_SECRET` value.
  A bare secret or `Bearer <secret>` both work; the handler strips the prefix.

Send a test event from that screen. A correct setup returns 200. A wrong
secret returns 401, which is the useful failure — it means the gate works.

## 4. Check it end to end

Needs the Paid Applications Agreement signed, or StoreKit returns no
products and there is nothing to buy.

1. Sandbox-purchase VIP monthly on a device.
2. `npx supabase functions logs verify-receipt` — expect
   `Synced entitlements for <uid>: tier=pro …`.
3. Confirm the `vip_subscriptions` row has `vip_tier = 'pro'` and an
   `expires_at` that came from the store, not from a date the app invented.
4. Cancel in the sandbox account. Within a few minutes the webhook should log
   an `EXPIRATION` or `CANCELLATION`, and the row should expire on its own.
   That last step is the one worth actually doing — it is the half that never
   worked before, because nothing was listening.

## What's asserted, and what isn't

`supabase/tests/` executes the SQL these functions write through — the caps,
the claim rules, the RLS. It does **not** execute the functions themselves;
they are Deno and need a real project. Step 4 is currently the only thing
that tests them.
