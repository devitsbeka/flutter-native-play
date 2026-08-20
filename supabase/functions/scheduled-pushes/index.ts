import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendToUsers } from "../_shared/push.ts";
import { PUSH_META, pushMessage, type PushKind } from "../_shared/pushCopy.ts";

/**
 * The real scheduled pushes — replaces the temporary `push-test-loop`.
 *
 * Fired by pg_cron every 30 minutes. Each run works out, per reachable user
 * (anyone with a push token), what time it is where they live and whether
 * exactly one of the scheduled notifications is due AND true for them right
 * now. Almost every run sends nothing to almost everyone — that is the
 * design. The rules:
 *
 *   EVENING SLOT (19:00 local, one per day, first true condition wins;
 *   skipped entirely for anyone active in the last 2 hours):
 *     - inactive 30+/7+/3+ days  -> win-back push, each stage fired ONCE ever
 *     - mission streak >= 3 and today's mission untouched -> streak saver
 *     - claimed yesterday's daily reward but not today's  -> daily chest
 *       (deliberately keyed to "claimed yesterday": it nudges a habit that
 *       exists instead of nagging every account every evening)
 *     - today's mission started but unfinished            -> almost there
 *     - mission done, reward unclaimed                    -> claim reward
 *
 *   WEEKLY:
 *     - Monday 12:00  -> league results (only if they appear in last week's
 *                        leaderboard snapshot)
 *     - Saturday 17:00-> TV family prompt (only if nothing else was sent
 *                        today, max once per 7 days)
 *     - Sunday 12:00  -> creator digest (only if their trivias got played
 *                        this week)
 *     - Sunday 18:00  -> league last chance (only rank 2-5 with XP this week)
 *
 *   LIVES REFILL (any run, non-PRO only): all 5 free plays were spent and
 *   the 3-hour window elapsed within the last ~35 minutes — i.e. the refill
 *   JUST happened — and they have not opened the app since. Never at night
 *   (10:00-21:59 local only), max 2 per day, never within 2 hours of another
 *   push. PRO players have unlimited plays and are never sent this.
 *
 * Every send is recorded in push_log; the caps above are queries against it,
 * which also makes a re-fired cron window idempotent.
 *
 * Auth: pg_cron presents the same shared secret the test loop used, so no
 * new platform secret is needed (PUSH_CRON_SECRET is honoured first if it
 * is ever set).
 */

const MAX_FREE_PLAYS = 5; // mirror of src/utils/playLimit.ts
const PLAY_WINDOW_MS = 3 * 60 * 60 * 1000;
const RUN_INTERVAL_MS = 30 * 60 * 1000;

const EVENING_KINDS: PushKind[] = [
  "streak_saver",
  "daily_chest",
  "mission_progress",
  "mission_reward",
  "winback_3",
  "winback_7",
  "winback_30",
];
const WINBACK_KINDS: PushKind[] = ["winback_3", "winback_7", "winback_30"];

// Country -> IANA timezone, DST handled by Intl. Multi-zone countries get
// their most populous zone; an unknown or missing country falls back to
// Georgia's zone, which is where most of the player base lives.
const COUNTRY_TZ: Record<string, string> = {
  ge: "Asia/Tbilisi",
  us: "America/New_York",
  gb: "Europe/London",
  de: "Europe/Berlin",
  at: "Europe/Vienna",
  ch: "Europe/Zurich",
  fr: "Europe/Paris",
  es: "Europe/Madrid",
  it: "Europe/Rome",
  pt: "Europe/Lisbon",
  br: "America/Sao_Paulo",
  mx: "America/Mexico_City",
  ar: "America/Argentina/Buenos_Aires",
  co: "America/Bogota",
  cl: "America/Santiago",
  pe: "America/Lima",
  ca: "America/Toronto",
  ru: "Europe/Moscow",
  ua: "Europe/Kyiv",
  pl: "Europe/Warsaw",
  tr: "Europe/Istanbul",
  am: "Asia/Yerevan",
  az: "Asia/Baku",
  kz: "Asia/Almaty",
  il: "Asia/Jerusalem",
  ae: "Asia/Dubai",
  in: "Asia/Kolkata",
  cn: "Asia/Shanghai",
  jp: "Asia/Tokyo",
  kr: "Asia/Seoul",
  au: "Australia/Sydney",
  nz: "Pacific/Auckland",
};
const DEFAULT_TZ = "Asia/Tbilisi";

interface LocalTime {
  hour: number;
  weekday: number; // 0 = Sunday ... 6 = Saturday
  date: string; // YYYY-MM-DD in the user's zone
}

function localTime(now: Date, countryCode: string | null | undefined): LocalTime {
  const tz = COUNTRY_TZ[(countryCode ?? "").toLowerCase()] ?? DEFAULT_TZ;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      hour: Number(get("hour")) % 24,
      weekday: weekdays.indexOf(get("weekday")),
      date: `${get("year")}-${get("month")}-${get("day")}`,
    };
  } catch {
    return { hour: now.getUTCHours(), weekday: now.getUTCDay(), date: now.toISOString().slice(0, 10) };
  }
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Candidate {
  userId: string;
  lang: string;
  local: LocalTime;
  lastSeen: number | null; // epoch ms, null = no presence signal
  isVip: boolean;
  freePlaysUsed: number;
  freeWindowStart: number | null;
}

interface Send {
  userId: string;
  kind: PushKind;
  params?: Record<string, string | number>;
}

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("PUSH_CRON_SECRET") || Deno.env.get("PUSH_TEST_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const now = new Date();
  const nowMs = now.getTime();

  // Reachable users only — no token, nothing to compute.
  const { data: tokenRows, error: tokenError } = await supabase
    .from("push_tokens")
    .select("user_id");
  if (tokenError) return json({ error: tokenError.message }, 500);
  const userIds = [...new Set((tokenRows ?? []).map((r: { user_id: string }) => r.user_id))];
  if (userIds.length === 0) return json({ sent: 0, reason: "no reachable users" });

  const [profilesQ, presenceQ, vipQ, logTodayQ] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, preferred_language, country_code, free_plays_used, free_plays_window_start")
      .in("user_id", userIds),
    supabase.from("user_presence").select("user_id, last_seen").in("user_id", userIds),
    supabase
      .from("vip_subscriptions")
      .select("user_id")
      .in("user_id", userIds)
      .gt("expires_at", now.toISOString()),
    // Everything sent in the last 8 days covers every cap this run applies:
    // per-day dedupe, the 2/day lives cap, the 2-hour spacing and the weekly
    // TV cap. Win-back "once ever" is checked separately below.
    supabase
      .from("push_log")
      .select("user_id, kind, sent_on, created_at")
      .in("user_id", userIds)
      .gte("created_at", new Date(nowMs - 8 * 24 * 3600 * 1000).toISOString()),
  ]);
  if (profilesQ.error) return json({ error: profilesQ.error.message }, 500);

  const presence = new Map<string, number>();
  for (const r of presenceQ.data ?? []) {
    if (r.last_seen) presence.set(r.user_id, Date.parse(r.last_seen));
  }
  const vip = new Set((vipQ.data ?? []).map((r: { user_id: string }) => r.user_id));

  interface LogRow { user_id: string; kind: string; sent_on: string; created_at: string }
  const recentLog = (logTodayQ.data ?? []) as LogRow[];
  const logByUser = new Map<string, LogRow[]>();
  for (const row of recentLog) {
    logByUser.set(row.user_id, [...(logByUser.get(row.user_id) ?? []), row]);
  }
  const utcToday = now.toISOString().slice(0, 10);
  const sentToday = (userId: string, kind?: PushKind) =>
    (logByUser.get(userId) ?? []).some((r) => r.sent_on === utcToday && (!kind || r.kind === kind));
  const countToday = (userId: string, kind: PushKind) =>
    (logByUser.get(userId) ?? []).filter((r) => r.sent_on === utcToday && r.kind === kind).length;
  const sentWithinHours = (userId: string, hours: number) =>
    (logByUser.get(userId) ?? []).some((r) => Date.parse(r.created_at) > nowMs - hours * 3600 * 1000);
  const sentWithinDays = (userId: string, kind: PushKind, days: number) =>
    (logByUser.get(userId) ?? []).some(
      (r) => r.kind === kind && Date.parse(r.created_at) > nowMs - days * 24 * 3600 * 1000,
    );

  const candidates: Candidate[] = (profilesQ.data ?? []).map((p) => ({
    userId: p.user_id,
    lang: p.preferred_language || "en",
    local: localTime(now, p.country_code),
    lastSeen: presence.get(p.user_id) ?? null,
    isVip: vip.has(p.user_id),
    freePlaysUsed: p.free_plays_used ?? 0,
    freeWindowStart: p.free_plays_window_start ? Date.parse(p.free_plays_window_start) : null,
  }));

  const sends: Send[] = [];

  // ---- Evening slot (19:00 local) --------------------------------------
  const evening = candidates.filter(
    (c) =>
      c.local.hour === 19 &&
      !EVENING_KINDS.some((k) => sentToday(c.userId, k)) &&
      // Someone using the app right now doesn't need a reminder about it.
      (c.lastSeen === null || c.lastSeen < nowMs - 2 * 3600 * 1000),
  );

  if (evening.length > 0) {
    const ids = evening.map((c) => c.userId);
    const [streaksQ, missionsQ, rewardsQ, winbackLogQ] = await Promise.all([
      supabase
        .from("user_mission_streaks")
        .select("user_id, current_streak, last_completion_date")
        .in("user_id", ids),
      supabase
        .from("user_missions")
        .select("user_id, mission_date, completed, current_progress, reward_claimed")
        .in("user_id", ids)
        .gte("mission_date", shiftDate(utcToday, -2)),
      supabase
        .from("user_daily_rewards")
        .select("user_id, reward_date, daily_claimed, chest_claimed")
        .in("user_id", ids)
        .gte("reward_date", shiftDate(utcToday, -2)),
      // "Once ever" for win-back stages — a lifetime lookback, not 8 days.
      supabase
        .from("push_log")
        .select("user_id, kind")
        .in("user_id", ids)
        .in("kind", WINBACK_KINDS),
    ]);

    const streaks = new Map(
      (streaksQ.data ?? []).map((r) => [r.user_id, r]),
    );
    const missionsByUser = new Map<string, { mission_date: string; completed: boolean; current_progress: number; reward_claimed: boolean }[]>();
    for (const m of missionsQ.data ?? []) {
      missionsByUser.set(m.user_id, [...(missionsByUser.get(m.user_id) ?? []), m]);
    }
    const rewardsByUser = new Map<string, { reward_date: string; daily_claimed: boolean | null; chest_claimed: boolean | null }[]>();
    for (const r of rewardsQ.data ?? []) {
      rewardsByUser.set(r.user_id, [...(rewardsByUser.get(r.user_id) ?? []), r]);
    }
    const winbackSentEver = new Map<string, Set<string>>();
    for (const r of winbackLogQ.data ?? []) {
      const set = winbackSentEver.get(r.user_id) ?? new Set<string>();
      set.add(r.kind);
      winbackSentEver.set(r.user_id, set);
    }

    for (const c of evening) {
      const inactiveDays = c.lastSeen === null ? null : Math.floor((nowMs - c.lastSeen) / (24 * 3600 * 1000));

      // Win-back replaces the ladder once someone has drifted away. A stage
      // fires once ever; an already-notified stage does NOT fall back to a
      // lower one — that would turn three touches into a drumbeat.
      if (inactiveDays !== null && inactiveDays >= 3) {
        const stage: PushKind = inactiveDays >= 30 ? "winback_30" : inactiveDays >= 7 ? "winback_7" : "winback_3";
        if (!winbackSentEver.get(c.userId)?.has(stage)) {
          sends.push({ userId: c.userId, kind: stage });
        }
        continue;
      }
      if (inactiveDays === null) continue; // no activity signal — stay quiet

      const today = c.local.date;
      const yesterday = shiftDate(today, -1);
      const todayMissions = (missionsByUser.get(c.userId) ?? []).filter((m) => m.mission_date === today);
      const streak = streaks.get(c.userId);

      // 1) Streak about to break: streak >= 3, nothing completed today.
      if (
        streak &&
        (streak.current_streak ?? 0) >= 3 &&
        streak.last_completion_date !== today &&
        !todayMissions.some((m) => m.completed)
      ) {
        sends.push({ userId: c.userId, kind: "streak_saver", params: { days: streak.current_streak } });
        continue;
      }

      // 2) Daily chest: claimed yesterday, not yet today — keep the habit.
      const rewards = rewardsByUser.get(c.userId) ?? [];
      const claimedYesterday = rewards.some((r) => r.reward_date === yesterday && (r.daily_claimed || r.chest_claimed));
      const claimedToday = rewards.some((r) => r.reward_date === today && (r.daily_claimed || r.chest_claimed));
      if (claimedYesterday && !claimedToday) {
        sends.push({ userId: c.userId, kind: "daily_chest" });
        continue;
      }

      // 3) Mission started but unfinished.
      if (todayMissions.some((m) => !m.completed && m.current_progress > 0)) {
        sends.push({ userId: c.userId, kind: "mission_progress" });
        continue;
      }

      // 4) Mission done, reward sitting unclaimed.
      if (todayMissions.some((m) => m.completed && !m.reward_claimed)) {
        sends.push({ userId: c.userId, kind: "mission_reward" });
      }
    }
  }

  // ---- Weekly slots ------------------------------------------------------
  const mondayNoon = candidates.filter(
    (c) => c.local.weekday === 1 && c.local.hour === 12 && !sentToday(c.userId, "league_results"),
  );
  if (mondayNoon.length > 0) {
    const { data: snaps } = await supabase
      .from("weekly_leaderboard_snapshots")
      .select("user_id")
      .in("user_id", mondayNoon.map((c) => c.userId))
      .gte("snapshot_date", shiftDate(utcToday, -8));
    const played = new Set((snaps ?? []).map((s: { user_id: string }) => s.user_id));
    for (const c of mondayNoon) {
      if (played.has(c.userId)) sends.push({ userId: c.userId, kind: "league_results" });
    }
  }

  const saturdayTv = candidates.filter(
    (c) =>
      c.local.weekday === 6 &&
      c.local.hour === 17 &&
      !sentToday(c.userId) &&
      !sentWithinDays(c.userId, "tv_weekend", 7),
  );
  for (const c of saturdayTv) sends.push({ userId: c.userId, kind: "tv_weekend" });

  const sundayNoon = candidates.filter(
    (c) => c.local.weekday === 0 && c.local.hour === 12 && !sentToday(c.userId, "creator_digest"),
  );
  if (sundayNoon.length > 0) {
    const ids = sundayNoon.map((c) => c.userId);
    const { data: posts } = await supabase
      .from("user_quiz_posts")
      .select("id, user_id")
      .in("user_id", ids);
    const postOwner = new Map((posts ?? []).map((p: { id: string; user_id: string }) => [p.id, p.user_id]));
    if (postOwner.size > 0) {
      const { data: plays } = await supabase
        .from("quiz_post_plays")
        .select("post_id")
        .in("post_id", [...postOwner.keys()])
        .gte("played_at", new Date(nowMs - 7 * 24 * 3600 * 1000).toISOString());
      const counts = new Map<string, number>();
      for (const p of plays ?? []) {
        const owner = postOwner.get(p.post_id);
        if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
      }
      for (const c of sundayNoon) {
        const count = counts.get(c.userId) ?? 0;
        if (count > 0) sends.push({ userId: c.userId, kind: "creator_digest", params: { count } });
      }
    }
  }

  const sundayEvening = candidates.filter(
    (c) => c.local.weekday === 0 && c.local.hour === 18 && !sentToday(c.userId, "league_lastchance"),
  );
  if (sundayEvening.length > 0) {
    const { data: league } = await supabase
      .from("user_league_data")
      .select("user_id, current_rank, weekly_xp")
      .in("user_id", sundayEvening.map((c) => c.userId));
    for (const row of league ?? []) {
      const rank = row.current_rank ?? 0;
      if ((row.weekly_xp ?? 0) > 0 && rank >= 2 && rank <= 5) {
        sends.push({ userId: row.user_id, kind: "league_lastchance", params: { rank } });
      }
    }
  }

  // ---- Lives refilled (non-PRO) -----------------------------------------
  for (const c of candidates) {
    if (c.isVip) continue;
    if (c.freePlaysUsed < MAX_FREE_PLAYS || c.freeWindowStart === null) continue;
    const refillAt = c.freeWindowStart + PLAY_WINDOW_MS;
    // Only the window that JUST elapsed — an exhausted window from last night
    // is not news, and this is what keeps the push to one per refill.
    if (refillAt > nowMs || refillAt < nowMs - (RUN_INTERVAL_MS + 5 * 60 * 1000)) continue;
    if (c.lastSeen !== null && c.lastSeen > refillAt) continue; // already came back
    if (c.local.hour < 10 || c.local.hour >= 22) continue;
    if (countToday(c.userId, "lives_full") >= 2) continue;
    if (sentWithinHours(c.userId, 2)) continue;
    if (sends.some((s) => s.userId === c.userId)) continue;
    sends.push({ userId: c.userId, kind: "lives_full" });
  }

  // ---- Send and log ------------------------------------------------------
  const langByUser = new Map(candidates.map((c) => [c.userId, c.lang]));
  let sent = 0;
  let failed = 0;
  for (const s of sends) {
    const msg = pushMessage(s.kind, langByUser.get(s.userId), s.params);
    const meta = PUSH_META[s.kind];
    try {
      const result = await sendToUsers(
        supabase,
        [s.userId],
        msg.title,
        msg.body,
        { route: meta.route, notification_type: s.kind },
        meta.icon,
      );
      sent += result.sent;
      failed += result.failed;
      await supabase.from("push_log").insert({ user_id: s.userId, kind: s.kind });
    } catch (e) {
      failed += 1;
      console.error(`send failed for ${s.kind}:`, e instanceof Error ? e.message : e);
    }
  }

  return json({ candidates: candidates.length, decided: sends.length, sent, failed });

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
});
