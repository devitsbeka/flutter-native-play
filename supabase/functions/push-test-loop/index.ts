import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendToUsers } from "../_shared/push.ts";

/**
 * TEMPORARY — the push test loop.
 *
 * Fired by a pg_cron job every ten minutes while push notifications are being
 * tested on TestFlight. Rotates through a fixed set of messages, each with an
 * icon and a deep-link route, so every firing exercises a different
 * look-and-landing.
 *
 * Two guards, because a function on a timer must not be able to spam players:
 *
 *   1. The caller has to present PUSH_TEST_SECRET — same pattern as the
 *      payment webhooks, which also run with verify_jwt off.
 *   2. It only ever sends to admins. The recipient list is user_roles rows
 *      with role 'admin', so even a runaway schedule reaches nobody but the
 *      team.
 *
 * Retire the whole function when the real scheduled pushes ship:
 *   SELECT cron.unschedule('push-test-loop');
 * and delete this directory.
 */

interface TestPush {
  title: string;
  body: string;
  route: string;
  /** Served from public/push/ on the site, so the URL never changes. */
  icon: string;
}

const SITE = "https://mytrivia.io";

const MESSAGES: TestPush[] = [
  {
    title: "Create your Trivia 🕹️",
    body: "Create your Trivia and play with friends.",
    route: "/team",
    icon: `${SITE}/push/joystick.png`,
  },
  {
    title: "Trivia on the big screen 📺",
    body: "Play Trivia with your friends and family on TV.",
    route: "/team",
    icon: `${SITE}/push/tv.png`,
  },
  {
    title: "Rewards are waiting 🏆",
    body: "Complete your daily mission and get rewards.",
    route: "/",
    icon: `${SITE}/push/trophy.png`,
  },
  {
    title: "Almost there ✨",
    body: "You have 1 mission to complete.",
    route: "/",
    icon: `${SITE}/push/crystal.png`,
  },
];

serve(async (req) => {
  const secret = Deno.env.get("PUSH_TEST_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Admins only — see the header comment.
  const { data: admins, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  const userIds = (admins ?? []).map((r: { user_id: string }) => r.user_id);

  // Stateless rotation: each ten-minute window picks the next message, so
  // there is no counter to store and a re-fired window sends the same thing.
  const msg = MESSAGES[Math.floor(Date.now() / 600_000) % MESSAGES.length];

  const result = await sendToUsers(
    supabase,
    userIds,
    msg.title,
    msg.body,
    { route: msg.route, notification_type: "custom" },
    msg.icon,
  );

  return new Response(
    JSON.stringify({ message: msg.title, recipients: userIds.length, ...result }),
    { headers: { "Content-Type": "application/json" } },
  );
});
