import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

/**
 * Where the app's keys live — which is not here.
 *
 * This page used to read and WRITE `app_settings`: an input for
 * `stripe_secret_key`, a masked field, a Save button, and setup instructions
 * telling the operator to paste an `sk_live_…` into it.
 *
 * Nothing has ever read that table. All three Stripe functions call
 * `Deno.env.get("STRIPE_SECRET_KEY")`. So the form configured nothing while
 * looking exactly like it had — and stored a live payment credential in a
 * database column in plaintext, which is the one place AGENTS.md §5 says real
 * secrets must never go.
 *
 * The rows are deleted in 20261104120000 and the state, the fetch and the save
 * went with them. What is left is the instructions, corrected — including the
 * subscription events, whose absence is why a web PRO purchase used to charge
 * the card and grant nothing.
 */
export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Where the app's keys and secrets actually live
        </p>
      </div>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle>Payment Settings</CardTitle>
          </div>
          <CardDescription>
            Stripe keys are Supabase platform secrets, not database rows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/*
            This page used to render an input for `stripe_secret_key`, link to
            dashboard.stripe.com/apikeys, and save whatever was typed into
            `app_settings`.

            No edge function has ever read that table. All three Stripe
            functions use Deno.env.get("STRIPE_SECRET_KEY"). So the form did
            nothing at all except put a live sk_live_… into a Postgres column
            in plaintext — the one place AGENTS.md §5 says real secrets must
            never go — and left whoever used it believing payments were
            configured.

            The rows are deleted in 20261104120000. What replaces the form is
            the truth about where the keys go.
          */}
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="font-medium">There is nothing to enter here.</p>
            <p className="text-muted-foreground mt-1">
              This page used to accept a Stripe secret key and store it in the
              database. Nothing ever read it — the edge functions read
              environment secrets — so the form configured nothing while
              looking like it had, and put a live key in a table besides.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Where the keys go</h4>
            <ol className="text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                Supabase Dashboard → Edge Functions → Secrets. Set{" "}
                <code>STRIPE_SECRET_KEY</code> and{" "}
                <code>STRIPE_WEBHOOK_SECRET</code>.
              </li>
              <li>
                Get the secret key from{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Stripe Dashboard → API Keys
                </a>
                .
              </li>
              <li>
                In{" "}
                <a
                  href="https://dashboard.stripe.com/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Stripe Dashboard → Webhooks
                </a>
                , add the endpoint{" "}
                <code>your-app-url/functions/v1/stripe-gem-webhook</code> and
                copy its signing secret into{" "}
                <code>STRIPE_WEBHOOK_SECRET</code>.
              </li>
              <li>
                <strong>Subscribe that endpoint to the subscription events</strong>{" "}
                as well as <code>checkout.session.completed</code>:{" "}
                <code>customer.subscription.created</code>,{" "}
                <code>.updated</code> and <code>.deleted</code>. Without them a
                web PRO purchase charges the card and grants nothing — the
                endpoint handles both, despite the name.
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
