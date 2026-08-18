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
 * Each push is composed in the RECIPIENT's language
 * (profiles.preferred_language, default 'ka') — the same rule every other
 * push in this project follows. Recipients are grouped by language and each
 * group gets one send.
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

// Four rotating messages × seven app languages. Index N is the same message
// in every language, so the rotation stays in step across recipients.
const MESSAGES: Record<string, TestPush[]> = {
  ka: [
    { title: "შექმენი შენი ტრივია 🕹️", body: "შექმენი ტრივია და ითამაშე მეგობრებთან ერთად.", route: "/team?open=trivia", icon: `${SITE}/push/joystick.png` },
    { title: "ტრივია დიდ ეკრანზე 📺", body: "ითამაშე ტრივია მეგობრებთან და ოჯახთან ერთად TV-ზე.", route: "/team?open=tv", icon: `${SITE}/push/tv.png` },
    { title: "ჯილდოები გელოდება 🏆", body: "შეასრულე დღიური მისია და მიიღე ჯილდოები.", route: "/?missions=1", icon: `${SITE}/push/trophy.png` },
    { title: "ცოტაც დარჩა ✨", body: "1 მისია დაგრჩა შესასრულებელი.", route: "/?missions=1", icon: `${SITE}/push/crystal.png` },
  ],
  en: [
    { title: "Create your Trivia 🕹️", body: "Create your Trivia and play with friends.", route: "/team?open=trivia", icon: `${SITE}/push/joystick.png` },
    { title: "Trivia on the big screen 📺", body: "Play Trivia with your friends and family on TV.", route: "/team?open=tv", icon: `${SITE}/push/tv.png` },
    { title: "Rewards are waiting 🏆", body: "Complete your daily mission and get rewards.", route: "/?missions=1", icon: `${SITE}/push/trophy.png` },
    { title: "Almost there ✨", body: "You have 1 mission to complete.", route: "/?missions=1", icon: `${SITE}/push/crystal.png` },
  ],
  de: [
    { title: "Erstelle dein Trivia 🕹️", body: "Erstelle dein Trivia und spiel mit Freunden.", route: "/team?open=trivia", icon: `${SITE}/push/joystick.png` },
    { title: "Trivia auf dem großen Bildschirm 📺", body: "Spiel Trivia mit Freunden und Familie auf dem TV.", route: "/team?open=tv", icon: `${SITE}/push/tv.png` },
    { title: "Belohnungen warten 🏆", body: "Schließe deine Tagesmission ab und hol dir Belohnungen.", route: "/?missions=1", icon: `${SITE}/push/trophy.png` },
    { title: "Fast geschafft ✨", body: "Dir fehlt noch 1 Mission.", route: "/?missions=1", icon: `${SITE}/push/crystal.png` },
  ],
  es: [
    { title: "Crea tu Trivia 🕹️", body: "Crea tu Trivia y juega con amigos.", route: "/team?open=trivia", icon: `${SITE}/push/joystick.png` },
    { title: "Trivia en pantalla grande 📺", body: "Juega Trivia con amigos y familia en la TV.", route: "/team?open=tv", icon: `${SITE}/push/tv.png` },
    { title: "Las recompensas te esperan 🏆", body: "Completa tu misión diaria y consigue recompensas.", route: "/?missions=1", icon: `${SITE}/push/trophy.png` },
    { title: "Ya casi ✨", body: "Te queda 1 misión por completar.", route: "/?missions=1", icon: `${SITE}/push/crystal.png` },
  ],
  fr: [
    { title: "Crée ton Trivia 🕹️", body: "Crée ton Trivia et joue avec tes amis.", route: "/team?open=trivia", icon: `${SITE}/push/joystick.png` },
    { title: "Trivia sur grand écran 📺", body: "Joue au Trivia avec tes amis et ta famille sur la TV.", route: "/team?open=tv", icon: `${SITE}/push/tv.png` },
    { title: "Des récompenses t'attendent 🏆", body: "Termine ta mission du jour et gagne des récompenses.", route: "/?missions=1", icon: `${SITE}/push/trophy.png` },
    { title: "Presque fini ✨", body: "Il te reste 1 mission à accomplir.", route: "/?missions=1", icon: `${SITE}/push/crystal.png` },
  ],
  it: [
    { title: "Crea il tuo Trivia 🕹️", body: "Crea il tuo Trivia e gioca con gli amici.", route: "/team?open=trivia", icon: `${SITE}/push/joystick.png` },
    { title: "Trivia sul grande schermo 📺", body: "Gioca a Trivia con amici e famiglia sulla TV.", route: "/team?open=tv", icon: `${SITE}/push/tv.png` },
    { title: "I premi ti aspettano 🏆", body: "Completa la missione del giorno e ottieni i premi.", route: "/?missions=1", icon: `${SITE}/push/trophy.png` },
    { title: "Ci sei quasi ✨", body: "Ti resta 1 missione da completare.", route: "/?missions=1", icon: `${SITE}/push/crystal.png` },
  ],
  pt: [
    { title: "Crie seu Trivia 🕹️", body: "Crie seu Trivia e jogue com amigos.", route: "/team?open=trivia", icon: `${SITE}/push/joystick.png` },
    { title: "Trivia na tela grande 📺", body: "Jogue Trivia com amigos e família na TV.", route: "/team?open=tv", icon: `${SITE}/push/tv.png` },
    { title: "Recompensas esperando 🏆", body: "Complete sua missão diária e ganhe recompensas.", route: "/?missions=1", icon: `${SITE}/push/trophy.png` },
    { title: "Quase lá ✨", body: "Falta 1 missão para completar.", route: "/?missions=1", icon: `${SITE}/push/crystal.png` },
  ],
};

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
  const idx = Math.floor(Date.now() / 600_000) % MESSAGES.en.length;

  // Group recipients by their app language; one send per group.
  const { data: langRows } = await supabase
    .from("profiles")
    .select("user_id, preferred_language")
    .in("user_id", userIds);
  const groups = new Map<string, string[]>();
  for (const id of userIds) {
    const lang =
      (langRows ?? []).find((r: { user_id: string }) => r.user_id === id)
        ?.preferred_language || "ka";
    const key = MESSAGES[lang] ? lang : "ka";
    groups.set(key, [...(groups.get(key) ?? []), id]);
  }

  let sent = 0;
  let failed = 0;
  for (const [lang, ids] of groups) {
    const msg = MESSAGES[lang][idx];
    const result = await sendToUsers(
      supabase,
      ids,
      msg.title,
      msg.body,
      { route: msg.route, notification_type: "custom" },
      msg.icon,
    );
    sent += result.sent;
    failed += result.failed;
  }

  return new Response(
    JSON.stringify({ message: MESSAGES.en[idx].title, recipients: userIds.length, sent, failed }),
    { headers: { "Content-Type": "application/json" } },
  );
});
