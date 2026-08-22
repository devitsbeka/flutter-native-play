import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendToUsers, type PushPerson } from "../_shared/push.ts";
import { PUSH_META, pushMessage, type PushKind } from "../_shared/pushCopy.ts";

/**
 * Event pushes between players: friend request, request accepted, challenge
 * score beaten. Same trust model as `send-game-invite-push`: the caller
 * hands over an EVENT ID and nothing else — recipient, names and text are
 * all composed here from rows the server reads itself, in the recipient's
 * language. Nobody gets to choose what appears on someone else's lock
 * screen.
 *
 * `verify_jwt` is off because one of the three events is raised by guests:
 * a challenge link is played signed-out, and the "your score was beaten"
 * push must still reach the challenger. The friend events require and
 * validate a JWT here instead. What keeps the anonymous path honest:
 *
 *   - the attempt row must exist and genuinely beat the challenger's score
 *   - each attempt can trigger at most one push, enforced by push_log's
 *     unique (kind, detail) index — not by best-effort checks
 *   - each challenger receives at most 3 of these per day, so scripting
 *     attempts cannot turn the feature into a bullhorn
 *
 * The friend pushes are likewise once-per-friendship via the same index.
 */

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { kind, friendshipId, attemptId, roomId } = await req.json().catch(() => ({}));

    // ---- Who is asking (required for the friend events) -------------------
    const readCaller = async (): Promise<string | null> => {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return null;
      const asCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await asCaller.auth.getUser();
      return user?.id ?? null;
    };

    let recipientId: string;
    let pushKind: PushKind;
    let params: Record<string, string | number>;
    let route: string;
    let detail: string;
    // Who the push is FROM, when it is from a player. iOS then draws
    // their avatar with the app icon badged onto it instead of a bare
    // app icon. Left undefined for anything the app itself says.
    let person: PushPerson | undefined;

    if (kind === "friend_request" || kind === "friend_accept") {
      if (!friendshipId || typeof friendshipId !== "string") {
        return json({ error: "friendshipId is required" }, 400);
      }
      const callerId = await readCaller();
      if (!callerId) return json({ error: "Authorization required" }, 401);

      const { data: friendship } = await supabase
        .from("friendships")
        .select("id, user_id, friend_id, status")
        .eq("id", friendshipId)
        .maybeSingle();
      if (!friendship) return json({ error: "Friendship not found" }, 404);

      if (kind === "friend_request") {
        // Sender announces their own pending request to the receiver.
        if (friendship.user_id !== callerId) return json({ error: "Not your request" }, 403);
        if (friendship.status !== "pending") return json({ sent: 0, skipped: "not_pending" });
        recipientId = friendship.friend_id;
      } else {
        // Accepter tells the original sender. The accepter is friend_id.
        if (friendship.friend_id !== callerId) return json({ error: "Not your acceptance" }, 403);
        if (friendship.status !== "accepted") return json({ sent: 0, skipped: "not_accepted" });
        recipientId = friendship.user_id;
      }

      const { data: caller } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("user_id", callerId)
        .maybeSingle();
      pushKind = kind;
      params = { name: caller?.nickname?.trim() || "Someone" };
      person = { name: String(params.name), avatarUrl: caller?.avatar_url };
      route = PUSH_META[kind].route;
      detail = `${kind}:${friendship.id}`;
    } else if (kind === "challenge_beaten") {
      if (!attemptId || typeof attemptId !== "string") {
        return json({ error: "attemptId is required" }, 400);
      }
      const { data: attempt } = await supabase
        .from("challenge_attempts")
        .select("id, challenge_link_id, player_name, player_score")
        .eq("id", attemptId)
        .maybeSingle();
      if (!attempt) return json({ error: "Attempt not found" }, 404);

      const { data: challenge } = await supabase
        .from("challenge_links")
        .select("id, code, challenger_id, challenger_score")
        .eq("id", attempt.challenge_link_id)
        .maybeSingle();
      if (!challenge) return json({ error: "Challenge not found" }, 404);
      if (attempt.player_score <= challenge.challenger_score) {
        return json({ sent: 0, skipped: "not_beaten" });
      }

      // Playing your own link is practice, not news.
      const callerId = await readCaller();
      if (callerId && callerId === challenge.challenger_id) {
        return json({ sent: 0, skipped: "own_challenge" });
      }

      // At most 3 beat-notices per challenger per day, whatever happens.
      const { count } = await supabase
        .from("push_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", challenge.challenger_id)
        .eq("kind", "challenge_beaten")
        .eq("sent_on", new Date().toISOString().slice(0, 10));
      if ((count ?? 0) >= 3) return json({ sent: 0, skipped: "daily_cap" });

      recipientId = challenge.challenger_id;
      pushKind = "challenge_beaten";
      params = { name: attempt.player_name?.trim() || "Someone" };
      // A challenge can be played by someone with no account at all, so
      // there is a name but no avatar — iOS draws their monogram.
      person = { name: String(params.name) };
      route = `/challenge/${challenge.code}`;
      detail = `challenge_beaten:${attempt.id}`;
    } else if (kind === "room_ping") {
      // A player in a lobby asking the host to come start the game. This
      // used to go through send-push-notification, which requires the admin
      // role — so every ping from a real player 403'd silently, and the ones
      // that did send carried no route. Caller must be a participant of the
      // room; the recipient is always the host, and the route is the room.
      if (!roomId || typeof roomId !== "string") {
        return json({ error: "roomId is required" }, 400);
      }
      const callerId = await readCaller();
      if (!callerId) return json({ error: "Authorization required" }, 401);

      const { data: room } = await supabase
        .from("game_rooms")
        .select("id, room_code, room_name, host_user_id, status")
        .eq("id", roomId)
        .maybeSingle();
      if (!room) return json({ error: "Room not found" }, 404);
      if (room.host_user_id === callerId) return json({ sent: 0, skipped: "own_room" });

      const { data: membership } = await supabase
        .from("room_participants")
        .select("id")
        .eq("room_id", room.id)
        .eq("user_id", callerId)
        .maybeSingle();
      if (!membership) return json({ error: "Not in this room" }, 403);

      // The client has a 30s cooldown, but a cooldown enforced only by the
      // party doing the spamming is a suggestion: one ping per host per
      // minute, whoever asks.
      const { data: recentPing } = await supabase
        .from("push_log")
        .select("id")
        .eq("user_id", room.host_user_id)
        .eq("kind", "room_ping")
        .gt("created_at", new Date(Date.now() - 60_000).toISOString())
        .limit(1)
        .maybeSingle();
      if (recentPing) return json({ sent: 0, skipped: "throttled" });

      const { data: caller } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("user_id", callerId)
        .maybeSingle();

      recipientId = room.host_user_id;
      pushKind = "room_ping";
      params = {
        name: caller?.nickname?.trim() || "Someone",
        room: room.room_name?.trim() || room.room_code,
      };
      person = { name: String(params.name), avatarUrl: caller?.avatar_url };
      route = `/team?join=${encodeURIComponent(room.room_code)}`;
      detail = "";
    } else {
      return json({ error: "Unknown kind" }, 400);
    }

    // The unique (kind, detail) index is the idempotency: claim the event
    // BEFORE sending, and a duplicate claim means someone else already sent.
    // room_ping has no event identity (the same host may be pinged again
    // after the throttle window) — null detail opts out of the unique index.
    const { error: logError } = await supabase
      .from("push_log")
      .insert({ user_id: recipientId, kind: pushKind, detail: detail || null });
    if (logError) {
      if (logError.code === "23505") return json({ sent: 0, skipped: "already_sent" });
      return json({ error: logError.message }, 500);
    }

    const { data: recipient } = await supabase
      .from("profiles")
      .select("preferred_language")
      .eq("user_id", recipientId)
      .maybeSingle();

    const msg = pushMessage(pushKind, recipient?.preferred_language, params);
    const result = await sendToUsers(
      supabase,
      [recipientId],
      msg.title,
      msg.body,
      { route, notification_type: pushKind },
      PUSH_META[pushKind].icon,
      person,
    );

    return json({ sent: result.sent, failed: result.failed });
  } catch (error) {
    console.error("send-social-push error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
