/**
 * Push the "come and play" notification for a game invitation.
 *
 * `send-push-notification` is an admin broadcast — it takes a title, a body
 * and a list of user ids, and requires the `admin` role. That is right for
 * what it is and useless here: a player inviting a friend is not an admin,
 * and an endpoint that let one player choose the text another player sees on
 * their lock screen would be a way to send anything to anyone.
 *
 * So this takes an **invitation id and nothing else**. Everything shown to
 * the recipient is composed here from rows the server reads itself:
 *
 *   - the invitation must exist, be `pending`, and have the caller as sender
 *   - the recipient is the invitation's receiver, never a parameter
 *   - the title and body are built from the sender's nickname and the room
 *
 * A caller who forges another player's id gets 403, and one who invents an
 * invitation gets 404. The worst an authorised caller can do is make their
 * own name appear on a friend's phone, which is the feature.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendToUsers } from "../_shared/push.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // The caller is whoever the token says, never whoever the body says.
    const asCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await asCaller.auth.getUser();
    if (authError || !user) return json({ error: "Invalid or expired token" }, 401);

    const { invitationId } = await req.json().catch(() => ({}));
    if (!invitationId || typeof invitationId !== "string") {
      return json({ error: "invitationId is required" }, 400);
    }

    // Reads go through the service role: push_tokens is not readable by the
    // sender, and it must not become so — the token is the capability.
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: invite } = await supabase
      .from("game_invitations")
      .select("id, sender_id, receiver_id, room_id, status")
      .eq("id", invitationId)
      .maybeSingle();

    if (!invite) return json({ error: "Invitation not found" }, 404);
    if (invite.sender_id !== user.id) {
      // Somebody else's invitation. Not theirs to announce.
      return json({ error: "Not your invitation" }, 403);
    }
    if (invite.status !== "pending") {
      // Already accepted, declined or expired — nothing to call anyone about.
      return json({ sent: 0, skipped: "not_pending" });
    }

    const [{ data: sender }, { data: room }, { data: receiver }] = await Promise.all([
      supabase.from("profiles").select("nickname").eq("user_id", user.id).maybeSingle(),
      supabase.from("game_rooms").select("room_name, room_code").eq("id", invite.room_id).maybeSingle(),
      // The push is composed in the RECIPIENT's language — the one they
      // picked in the app, synced to profiles.preferred_language. The
      // sender's language is irrelevant: it is not their lock screen.
      supabase.from("profiles").select("preferred_language").eq("user_id", invite.receiver_id).maybeSingle(),
    ]);

    const who = sender?.nickname?.trim() || "A friend";
    const where = room?.room_name?.trim();

    // One entry per app language; the column default is 'en', so players who
    // never touched the switcher get English — the safe universal fallback.
    const MESSAGES: Record<string, { title: string; room: (n: string, w: string) => string; plain: (n: string) => string }> = {
      ka: {
        title: "მოდი, ითამაშე 🎮",
        room: (n, w) => `${n} გიწვევს ოთახში „${w}“`,
        plain: (n) => `${n} გიწვევს თამაშში`,
      },
      en: {
        title: "Come and play 🎮",
        room: (n, w) => `${n} invited you to ${w}`,
        plain: (n) => `${n} invited you to a game`,
      },
      de: {
        title: "Komm und spiel mit 🎮",
        room: (n, w) => `${n} hat dich zu „${w}“ eingeladen`,
        plain: (n) => `${n} hat dich zu einem Spiel eingeladen`,
      },
      es: {
        title: "¡Ven a jugar! 🎮",
        room: (n, w) => `${n} te invitó a ${w}`,
        plain: (n) => `${n} te invitó a una partida`,
      },
      fr: {
        title: "Viens jouer 🎮",
        room: (n, w) => `${n} t'a invité à ${w}`,
        plain: (n) => `${n} t'a invité à une partie`,
      },
      it: {
        title: "Vieni a giocare 🎮",
        room: (n, w) => `${n} ti ha invitato a ${w}`,
        plain: (n) => `${n} ti ha invitato a una partita`,
      },
      pt: {
        title: "Vem jogar 🎮",
        room: (n, w) => `${n} convidou você para ${w}`,
        plain: (n) => `${n} convidou você para um jogo`,
      },
    };
    const lang = receiver?.preferred_language ?? "en";
    const msg = MESSAGES[lang] ?? MESSAGES.en;

    const title = msg.title;
    const body = where ? msg.room(who, where) : msg.plain(who);

    // `route` is what usePushNotifications navigates to when the notification
    // is tapped, and it has to be the room rather than the screen the room
    // lives on. `/team` alone just opens the app — the player still has to
    // find the invitation and accept it, which is most of the work the
    // notification was supposed to save them.
    //
    // `/team?join=CODE` is the existing invite deep link: RoomRedirect maps
    // /room/:code onto it, and TeamV2 consumes `?join=` by joining directly
    // for a signed-in player. The code is the room's `room_code`, not its id
    // — the id is a uuid TeamV2 does not look up.
    //
    // Falls back to `/team` if the room has no code, which is better than a
    // link that lands on a join attempt that cannot succeed.
    const joinCode = room?.room_code?.trim();
    const route = joinCode ? `/team?join=${encodeURIComponent(joinCode)}` : "/team";

    const { sent, failed } = await sendToUsers(
      supabase,
      [invite.receiver_id],
      title,
      body,
      {
        type: "game_invite",
        route,
        room_id: String(invite.room_id),
        invitation_id: String(invite.id),
      },
    );

    console.log(
      `Game invite push: invitation=${invite.id} sender=${user.id} ` +
        `receiver=${invite.receiver_id} sent=${sent} failed=${failed}`,
    );

    // A recipient with notifications off has no tokens, and that is a normal
    // outcome rather than an error — the in-app invitation still exists.
    return json({ sent, failed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Game invite push failed:", error);
    return json({ error: message }, 500);
  }
});
