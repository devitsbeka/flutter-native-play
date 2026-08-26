import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Check, LogIn, UserPlus, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFriends } from "@/hooks/useFriends";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/lib/toast";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { cn } from "@/lib/utils";
import { dateLocaleFor } from "@/utils/dateLocale";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { useCategoryIdentity } from "@/hooks/useCategoryIdentity";
import { cleanInviteCode, readInviteIntent } from "@/utils/inviteLink";
import { georgianDative } from "@/utils/georgianName";
import logoLight from "@/assets/mytrivia-logo-light.svg";
import logoDark from "@/assets/mytrivia-logo.svg";

/**
 * The other end of a shared invite link.
 *
 * Before this, /room/<code> redirected to /team?join=<code> and joined on
 * sight: no idea who had invited you, and if you had no account you became
 * an anonymous user called "Trivia King" without being asked. The link now
 * lands here first — who is inviting you, what they are playing, who else is
 * in — and joining is a decision rather than a side effect.
 *
 * Accepting is also what makes the two of you friends. The host's half of
 * that agreement was sending a link only they can mint; this screen is the
 * other half, which is why the friendship is written on the tap and not on
 * arrival.
 */

interface InvitePreview {
  host_user_id: string;
  host_nickname: string;
  host_avatar_url: string | null;
  host_animated_avatar_url: string | null;
  host_country_code: string | null;
  room_code: string | null;
  room_name: string | null;
  category_id: string | null;
  category_name: string | null;
  room_status: string | null;
  player_count: number | null;
  // Only room_preview returns these; a personal link has no room row of its
  // own to describe, and gets undefined.
  is_archived?: boolean | null;
  created_at?: string | null;
  last_activity_at?: string | null;
}

interface InvitePlayer {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  animated_avatar_url: string | null;
  country_code: string | null;
  is_host: boolean;
}

/**
 * Which kind of link brought them here.
 *
 * "invite" is /i/<personal code>: sixteen unguessable characters only its
 * owner can mint, so holding one is proof its owner asked. Accepting makes
 * the two of you friends.
 *
 * "room" is /room/<room code>: six characters, printed in the lobby and
 * pasted into group chats. It is every link shared before the personal one
 * existed, so it gets the same welcome screen -- but joining a room is all a
 * room code should be able to do on its own, so the host is offered with a
 * friend button rather than added automatically.
 */
export default function InvitePage({ by = "invite" }: { by?: "invite" | "room" }) {
  const { code: rawCode } = useParams<{ code: string }>();
  // A chat app can glue its message onto the path, not just the query — see
  // cleanInviteCode. Scrubbed here, once, so every lookup and every link built
  // back out of it uses the code and not the sentence that followed it.
  const code = cleanInviteCode(rawCode);
  const { search } = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { friends, sendFriendRequest, refreshFriends } = useFriends();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [players, setPlayers] = useState<InvitePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  // The lookup itself did not answer, as opposed to answering "no such code".
  const [loadFailed, setLoadFailed] = useState(false);
  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [requested, setRequested] = useState<Set<string>>(new Set());

  /**
   * What the link says it is for. See utils/inviteLink.
   *
   * A room code (/room/<code>) is always about its own room and carries no
   * intent of its own.
   */
  const intent = by === "room" ? { kind: "room" as const, roomCode: code ?? "" } : readInviteIntent(search);

  /**
   * Whether the sentence under the name is set in capitals.
   *
   * The design is the Georgian screen, where the script has no cases and
   * uppercase lifts nothing but the Latin inside the line — "MyTrivia-ზე"
   * becomes "MYTRIVIA-ზე". The same rule in English shouts a whole sentence,
   * which is not what was drawn. The name keeps its caps everywhere; that one
   * is a name.
   */
  const shoutBody = language === "ka";

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Both readable signed out: someone who has never opened this app taps a
      // link in a chat, and has to see who invited them before deciding
      // whether to make an account at all.
      const load = () => Promise.all([
        by === "room"
          ? supabase.rpc("room_preview", { p_room_code: code })
          : supabase.rpc("invite_preview", { p_code: code }),
        by === "room"
          ? supabase.rpc("room_players", { p_room_code: code })
          : intent.kind === "friend"
            // A friend request names nobody else. Asking for the room's
            // players would draw a lobby the sender never offered.
            ? Promise.resolve({ data: [] as unknown, error: null })
            : supabase.rpc("invite_room_players", { p_code: code }),
      ]);

      let [{ data: previewRows, error: previewError }, { data: playerRows }] = await load();

      // A call that FAILED is not a link that is dead, and until now both
      // rendered the same "this invite link no longer works" — the error was
      // destructured away. A phone that has just been handed a link is often
      // on the worst connection it will see all day (a chat app backgrounded,
      // wifi handing over), so the first attempt is worth retrying before
      // telling someone their invitation is void.
      if (!cancelled && previewError) {
        console.warn("[invite] preview failed, retrying", previewError);
        await new Promise(resolve => setTimeout(resolve, 900));
        if (cancelled) return;
        [{ data: previewRows, error: previewError }, { data: playerRows }] = await load();
      }
      if (cancelled) return;
      if (previewError) {
        console.error("[invite] preview failed", { code, by, previewError });
        setLoadFailed(true);
      }

      let resolved = (previewRows?.[0] as InvitePreview) ?? null;
      let people = (playerRows as InvitePlayer[]) ?? [];

      if (resolved && by !== "room") {
        if (intent.kind === "friend") {
          // The sender pressed "+" on the friends strip. Whatever lobby they
          // happen to still be sitting in is not what they sent, so it is
          // dropped here rather than drawn as an invitation.
          resolved = { ...resolved, room_code: null, room_name: null, category_id: null, category_name: null, room_status: null, player_count: null };
          people = [];
        } else if (intent.kind === "room") {
          // The link names its room. Read that room directly instead of
          // trusting the far end's guess, which picks the sender's most
          // recently touched waiting room and can be a different one.
          const [{ data: roomRows }, { data: roomPlayers }] = await Promise.all([
            supabase.rpc("room_preview", { p_room_code: intent.roomCode }),
            supabase.rpc("room_players", { p_room_code: intent.roomCode }),
          ]);
          if (cancelled) return;
          const room = (roomRows as InvitePreview[] | null)?.[0];
          if (!room) {
            // The named room is not there. That is the normal state of a link
            // shared from Create Room before Create was pressed — the code is
            // reserved, the room is not made yet — and it is also what a
            // deleted room looks like. Either way the friendship is what is
            // left, and invite_preview's own guess at a room must not stand in
            // for the one that was named.
            resolved = { ...resolved, room_code: null, room_name: null, category_id: null, category_name: null, room_status: null, player_count: null };
            people = [];
          } else {
            // The host identity stays the invite code's owner — they are who
            // sent it, and accepting befriends them — while everything about
            // the room comes from the room itself.
            resolved = {
              ...resolved,
              room_code: room.room_code,
              room_name: room.room_name,
              category_id: room.category_id,
              category_name: room.category_name,
              room_status: room.room_status,
              player_count: room.player_count,
              is_archived: room.is_archived,
              created_at: room.created_at,
              last_activity_at: room.last_activity_at,
            };
            people = (roomPlayers as InvitePlayer[] | null) ?? [];
          }
        }
      }

      if (cancelled) return;
      setPreview(resolved);
      setPlayers(people);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // intent is derived from `search`, which is in the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, by, search]);

  const alreadyFriends = !!preview && friends.some(f => f.friendId === preview.host_user_id);
  // Only a personal link can be "your own". A host opening their own room
  // link is just rejoining, and should be offered the room like anyone else.
  const isOwnLink = by === "invite" && !!preview && preview.host_user_id === user?.id;
  /**
   * There is a room to describe, and whether you can still walk into it.
   *
   * These used to be the same question, because room_preview only returned
   * rooms that were not archived: no row meant no room meant a dead link,
   * and the screen said "this invitation link no longer works" — the same
   * words a mistyped code gets. A link that was real when it was sent
   * deserves better than being told it never existed.
   *
   * Now the room comes back whatever state it is in, and the two questions
   * are separate. A finished room still has a name, a category, the people
   * who were in it and the day it was made; it just cannot be joined.
   */
  const hasRoom = !!preview?.room_code;
  const roomIsOver =
    hasRoom && (preview?.is_archived === true || preview?.room_status === "finished");
  const canJoinRoom = hasRoom && !roomIsOver;

  // The room card carried a name and a category in words and no picture, so
  // it read as a list item while every other room in the app is drawn with
  // its icon. category_id on a room row can be a slug or a uuid depending on
  // how the room was made; this resolves either to the icon library's name
  // for the picture.
  const categoryIdentity = useCategoryIdentity(preview?.category_id);

  const dateLocale = dateLocaleFor(language);

  /** "3 days ago" — how long ago the link was worth sending. */
  const roomAge = (() => {
    const when = preview?.last_activity_at || preview?.created_at;
    if (!when) return null;
    const at = new Date(when);
    if (Number.isNaN(at.getTime())) return null;
    return t(roomIsOver ? "extra.inviteRoomPlayedAgo" : "extra.inviteRoomOpenedAgo").replace(
      "{ago}",
      formatDistanceToNow(at, { addSuffix: true, locale: dateLocale }),
    );
  })();

  const accept = useCallback(async () => {
    if (!code || !preview) return;
    setJoining(true);
    try {
      let signedIn = user;

      if (!signedIn) {
        const chosen = nickname.trim();
        if (!chosen) {
          toast.error(t("extra.inviteNeedName"));
          setJoining(false);
          return;
        }
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) {
          // Anonymous sign-in can be switched off for the project. Send them
          // to sign up with the invite remembered, rather than failing here
          // with nothing to do next.
          navigate(`/auth?returnTo=${encodeURIComponent(`/i/${code}${search}`)}`);
          return;
        }
        signedIn = data.user;

        // The profile comes from a trigger on the new auth user, so the name
        // has to land after it. This used to sleep a flat 800ms and write
        // once — 800ms of nothing on every guest join, and a name silently
        // dropped if the trigger happened to be slower than the guess.
        //
        // Measured against production, the row is there on the first read.
        // So: try immediately, and only wait if it is genuinely not ready.
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: rows } = await supabase
            .from("profiles")
            .update({ nickname: chosen })
            .eq("user_id", data.user.id)
            .select("user_id");
          if (rows?.length) break;
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }

      // Only the personal link befriends. A room code is not evidence that
      // its host wanted this particular person in their friends list.
      if (by === "invite") {
        const { error } = await supabase.rpc("accept_invite", { p_code: code });
        if (error) {
          toast.error(t("extra.inviteAcceptFailed"));
          setJoining(false);
          return;
        }
        await refreshFriends();
      }

      // Straight into the room if there is one to join; otherwise the
      // friendship IS the outcome, so land them at home where the new friend
      // is already in the strip at the top.
      if (canJoinRoom && preview.room_code) {
        navigate(`/team?join=${preview.room_code}`, { replace: true });
      } else {
        toast.success(t("extra.inviteNowFriends").replace("{name}", preview.host_nickname));
        navigate("/", { replace: true });
      }
    } finally {
      setJoining(false);
    }
  }, [by, code, preview, canJoinRoom, user, nickname, navigate, refreshFriends, t]);

  const addPlayer = useCallback(async (playerId: string) => {
    setRequested(prev => new Set(prev).add(playerId));
    const ok = await sendFriendRequest(playerId);
    if (!ok) {
      setRequested(prev => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
    }
  }, [sendFriendRequest]);

  if (loading || authLoading) {
    return (
      <div className="h-[calc(100dvh-var(--safe-top)-var(--safe-bottom))] flex items-center justify-center bg-[#7B68D9]">
        <div className="w-8 h-8 border-4 border-white/80 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // A code that resolves to nothing is a link that was mistyped, or an
  // account that is gone. Say so and offer the way in rather than spinning.
  //
  // A lookup that could not be made is a different thing and gets a different
  // answer: "try again", not "your invitation is void". Telling someone their
  // link is dead when the network hiccuped loses the invitation for good —
  // they will not tap it twice.
  if (!preview) {
    return (
      <div className="h-[calc(100dvh-var(--safe-top)-var(--safe-bottom))] flex flex-col items-center justify-center gap-6 px-8 bg-[#7B68D9] text-center">
        <p className="text-white text-lg font-semibold">
          {t(loadFailed ? "extra.inviteLoadFailed" : "extra.inviteNotFound")}
        </p>
        {loadFailed ? (
          <ChunkyButton variant="white" size="lg" onClick={() => window.location.reload()}>
            {t("extra.tryAgain")}
          </ChunkyButton>
        ) : (
          <ChunkyButton variant="white" size="lg" onClick={() => navigate("/", { replace: true })}>
            {t("extra.inviteGoHome")}
          </ChunkyButton>
        )}
      </div>
    );
  }

  /**
   * A friend request is its own screen, drawn to Figma 900:6931.
   *
   * It has no room card, no player list and nothing to scroll — one face, one
   * sentence and one button — and the purple wall it shared with the room
   * invite left it looking like a page whose content had failed to load. The
   * design gives it the app's own lavender ground, the dark logo, and the
   * button on the bottom edge where a single-decision screen puts it.
   *
   * The room invite keeps the purple field: its card and roster are drawn in
   * white-on-translucent and there is no design for them on a light ground.
   */
  if (!hasRoom && !isOwnLink) {
    return (
      <FriendInviteScreen
        // "მეგობრობა სურს" — wants friendship — governs the dative, so the
        // name in front of it has to be "TriviaMaste-ს". Only here: the room
        // screen's sentence is "გიწვევს სათამაშოდ", which takes the plain
        // name, and every other language inflects nothing.
        nickname={shoutBody ? georgianDative(preview.host_nickname) : preview.host_nickname}
        avatarUrl={preview.host_avatar_url}
        subtitle={t("extra.inviteFriendSubtitle")}
        tagline={t("extra.inviteFriendTagline")}
        // The design is the Georgian screen, where uppercase has nothing to
        // work on but the Latin inside the line: "MyTrivia-ზე" becomes
        // "MYTRIVIA-ზე" and the Georgian is untouched, because the script has
        // no cases. Applied to English the same rule shouts a whole sentence
        // — WANTS TO BE FRIENDS ON MYTRIVIA — which is not what was drawn.
        // The name keeps its caps in every language; that one is a name.
        shoutBody={language === "ka"}
        cta={
          joining
            ? t("extra.inviteJoining")
            : alreadyFriends
              ? t("extra.inviteGoHome")
              : t("extra.inviteAcceptFriend")
        }
        onAccept={accept}
        disabled={joining || (!user && !nickname.trim())}
        guestNameField={
          !user && (
            <div className="w-full">
              <label className="mb-2 block text-sm font-medium text-[#5a6495]">
                {t("extra.inviteYourName")}
              </label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value.slice(0, 20))}
                placeholder={t("extra.inviteNamePlaceholder")}
                maxLength={20}
                autoComplete="nickname"
                className={GUEST_NAME_INPUT}
              />
            </div>
          )
        }
        signInLink={
          !user && (
            <button
              onClick={() => navigate(`/auth?returnTo=${encodeURIComponent(`/i/${code}${search}`)}`)}
              className="w-full text-sm font-medium text-[#5a6495] underline underline-offset-4"
            >
              {t("extra.inviteHaveAccount")}
            </button>
          )
        }
      />
    );
  }

  return (
    <InviteShell>
      {/* Who is inviting you. The whole reason this screen exists. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 mt-4 flex flex-col items-center gap-4 text-center"
      >
        <InviteAvatar nickname={preview.host_nickname} avatarUrl={preview.host_avatar_url} />
        {/* Name first. The other order reads as a sentence with its subject
            at the end -- "is inviting you to play / Beka". */}
        <div>
          <h1
            className="font-display text-[21px] uppercase leading-tight tracking-[-0.16px] text-[#161e46]"
            // TASolivare ships a single 700 face, so CSS font matching picks it for
            // any weight asked for and never synthesises a heavier one — font-black
            // would change nothing here. Thickening the strokes is what actually
            // makes the name read as heavier than the sentence under it, which is
            // the weight relationship the design has (Black over Bold) and the one
            // weight we ship cannot express.
            style={{ WebkitTextStroke: "0.4px currentColor" }}
          >
            {preview.host_nickname}
          </h1>
          <p className={cn("mt-3 font-display text-[19px] leading-tight tracking-[-0.16px] text-[#161e46]", shoutBody && "uppercase")}>
            {t("extra.inviteInvitesYou")}
          </p>
        </div>
      </motion.div>

      {/* What you are being invited to. */}
      {hasRoom && (
        <div className={cn(LIGHT_CARD, "mb-4 p-4")}>
          <div className="flex items-start justify-between gap-3">
            {/* The picture the room is drawn with everywhere else.
                CategoryArtwork and not QuizCategoryIcon: the six
                picture-guess categories ship their own 3D art, and the icon
                library would draw "guess the movie" as a generic
                clapperboard. Rendered only when there is something to
                resolve, so an unknown category leaves no gap. */}
            {(categoryIdentity.iconSlug || categoryIdentity.categoryId) && (
              <CategoryArtwork
                categoryId={categoryIdentity.categoryId}
                iconSlug={categoryIdentity.iconSlug}
                size={40}
                className="shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg text-[#161e46]">
                {preview.room_name || t("extra.inviteRoomFallback")}
              </p>
              {preview.category_name && (
                <p className="mt-0.5 truncate text-sm text-[#5a6495]">{preview.category_name}</p>
              )}
            </div>
            {/* Live or finished, said on the card rather than only in the
                button: someone opening a link days later should be able to
                see WHAT it was without pressing anything. */}
            <span
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                roomIsOver
                  ? "bg-[#161e46]/10 text-[#5a6495]"
                  : "bg-emerald-500/15 text-emerald-700",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  roomIsOver ? "bg-[#5a6495]/60" : "animate-pulse bg-emerald-500",
                )}
              />
              {roomIsOver ? t("extra.inviteRoomFinished") : t("extra.inviteRoomLive")}
            </span>
          </div>
          {roomAge && <p className="mt-2 text-xs text-[#5a6495]/80">{roomAge}</p>}
        </div>
      )}

      {/* Who else is in, each with a way to add them. Only the host is
          befriended by accepting; these are ordinary requests, because
          nobody else in the room agreed to anything. */}
      {players.length > 0 && (
        <div className={cn(LIGHT_CARD, "mb-4 overflow-hidden")}>
          <div className="flex items-center gap-2 border-b border-[#161e46]/10 px-4 py-3">
            <Users className="h-4 w-4 text-[#5a6495]" />
            <span className="text-sm font-medium text-[#5a6495]">
              {t("extra.invitePlayers")} ({players.length})
            </span>
          </div>
          <div className="divide-y divide-[#161e46]/[0.08]">
            {players.map(player => {
              const isFriend = friends.some(f => f.friendId === player.user_id);
              const isSelf = player.user_id === user?.id;
              const asked = requested.has(player.user_id);
              return (
                <div key={player.user_id} className="flex items-center gap-3 px-4 py-3">
                  <SafeAvatar
                    avatarUrl={player.avatar_url}
                    fallback={(player.nickname || "?").charAt(0).toUpperCase()}
                    className="h-10 w-10"
                    fallbackClassName="bg-[#7439cb]/15 text-[#161e46] font-semibold"
                  />
                  {/* Name and its add button as one group, so the button
                      reads as belonging to that person rather than sitting
                      in a column at the far edge. Same shape and the same
                      place as the lobby's chip — this screen is the lobby
                      seen from outside. */}
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="min-w-0 truncate font-medium text-[#161e46]">
                      {player.nickname}
                    </span>
                    {/* Nothing to offer a signed-out visitor: they cannot
                        send a friend request yet, and a row of greyed-out
                        buttons reads as broken rather than as not-yet. */}
                    {user && !isSelf && (by === "room" || !player.is_host) && (
                      isFriend || asked ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <button
                          onClick={() => addPlayer(player.user_id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7439cb]/15 text-[#7439cb] transition-colors hover:bg-[#7439cb]/25 active:scale-95"
                          aria-label={t("extra.inviteAddFriend")}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}
                  </div>
                  {player.is_host && (
                    <span className="shrink-0 text-xs text-[#5a6495]">{t("extra.inviteHostTag")}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* A guest needs a name before anything else. Without one they used to
          arrive in the room as "Trivia King", which is nobody. */}
      {!user && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-[#5a6495]">
            {t("extra.inviteYourName")}
          </label>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value.slice(0, 20))}
            placeholder={t("extra.inviteNamePlaceholder")}
            maxLength={20}
            autoComplete="nickname"
            className={GUEST_NAME_INPUT}
          />
        </div>
      )}

      <div className="mt-auto pt-2">
        {isOwnLink ? (
          <div className="space-y-4 text-center">
            <p className="text-[#5a6495]">{t("extra.inviteThisIsYours")}</p>
            <ChunkyButton
              variant="white"
              size="lg"
              className="w-full"
              onClick={() => navigate("/", { replace: true })}
            >
              {t("extra.inviteGoHome")}
            </ChunkyButton>
          </div>
        ) : roomIsOver ? (
          /* The room is finished, so there is nothing to join and the button
             must not say there is. What the link WAS is above — the name, the
             category, who played, when — and every one of those players has a
             friend button beside them, which is the thing still worth doing
             with an invitation that arrived late. */
          <div className="space-y-4 text-center">
            <p className="text-sm text-[#5a6495]">{t("extra.inviteRoomOverBody")}</p>
            <ChunkyButton
              variant="white"
              size="lg"
              className="w-full"
              onClick={() => navigate("/", { replace: true })}
            >
              {t("extra.inviteGoHome")}
            </ChunkyButton>
          </div>
        ) : (
          <ChunkyButton
            variant="white"
            size="xl"
            className="w-full"
            onClick={accept}
            disabled={joining || (!user && !nickname.trim())}
            icon={canJoinRoom ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          >
            {joining
              ? t("extra.inviteJoining")
              : canJoinRoom
                ? t("extra.inviteJoinGame")
                : alreadyFriends
                  ? t("extra.inviteGoHome")
                  : t("extra.inviteAcceptFriend")}
          </ChunkyButton>
        )}

        {!user && (
          <button
            onClick={() => navigate(`/auth?returnTo=${encodeURIComponent(`/i/${code}${search}`)}`)}
            className="mt-4 w-full text-sm font-medium text-[#5a6495] underline underline-offset-4"
          >
            {t("extra.inviteHaveAccount")}
          </button>
        )}
      </div>
    </InviteShell>
  );
}

/** The card language of the light ground: the same recipe Create Room uses. */
const LIGHT_CARD = "rounded-2xl border border-white/70 bg-white/55 backdrop-blur-[2px]";

/** One field, on both screens, so a guest's name box cannot drift between them. */
const GUEST_NAME_INPUT =
  "h-14 w-full rounded-2xl border border-[#7439cb]/25 bg-white/70 px-4 text-base text-[#161e46] outline-none placeholder:text-[#5a6495]/60 focus:border-[#7439cb]/60";

/**
 * The ground both invite screens stand on — Figma 900:6931.
 *
 *   #cab7e6, with two blurred washes over it: a cold blue at the upper left
 *   and a warm cream at the upper right. They are what stop a flat fill from
 *   reading as an error page.
 *
 * The room invite used to be a purple wall with white-on-translucent cards on
 * it, which made the two halves of the same feature look like two apps.
 */
function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    // A fixed-height box that scrolls itself. The document does not scroll on
    // the device -- see CLAUDE.md 4b -- and this screen can carry a room card,
    // a roster and a keyboard.
    <div className="h-[100dvh] overflow-y-auto safe-bleed bg-[#cab7e6]">
      {/* Fixed rather than absolute so the washes stay put behind the content
          when it scrolls or a keyboard pushes the page up. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[7%] top-[26%] h-[24%] w-[30%] bg-[#9ec7f0] blur-[60px]" />
        <div className="absolute left-[73%] top-[30%] h-[24%] w-[30%] bg-[#fffcef] blur-[60px]" />
      </div>

      {/* min-h-FULL, not min-h-[100dvh], and no safe insets of its own.
          Both were wrong together and the second hid the first.

          The safe area is already paid for twice above this line: #root pads
          every screen by --safe-top/--safe-bottom, and safe-bleed on the
          scroller cancels that and re-adds it so the wash still reaches the
          true edge. The scrollport is therefore 100dvh MINUS both insets, and
          a child asking for min-h-[100dvh] inside it overran by exactly their
          sum — 93px on an iPhone 15 Pro — while its own pt/pb pushed the
          content down a third time. On the device the CTA came out half cut
          and "I already have an account" was off-screen entirely; it scrolled,
          but nothing about a screen this short tells you to try.

          min-h-full fills the scrollport instead of exceeding it, and the
          padding here is now only the design's own 24/20. */}
      <div className="relative mx-auto flex min-h-full w-full max-w-[520px] flex-col px-5 pb-5 pt-6">
        {/* Whose app this is. Most people reach these screens from a link in a
            chat and a good share of them have never heard of MyTrivia, so one
            image answers it before anything else is read. */}
        <div className="flex shrink-0 justify-center">
          <img src={logoDark} alt="MyTrivia" className="h-11 w-auto select-none" draggable={false} />
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * The face at the top of both screens.
 *
 * 138px in the design's 501px frame -> 27.5% of the width, ringed in #7439cb
 * at 12px -> 2.4%, over a soft yellow bloom.
 */
function InviteAvatar({ nickname, avatarUrl }: { nickname: string; avatarUrl: string | null }) {
  return (
    <div
      className="flex h-[108px] w-[108px] shrink-0 items-center justify-center rounded-full border-[9px] border-[#7439cb] bg-[#cab7e6]"
      style={{ boxShadow: "0px 4px 4px 13px rgba(253,206,46,0.19)" }}
    >
      <SafeAvatar
        avatarUrl={avatarUrl}
        fallback={(nickname || "?").charAt(0).toUpperCase()}
        className="h-full w-full"
        fallbackClassName="text-2xl font-bold bg-white/70 text-[#161e46]"
      />
    </div>
  );
}

/**
 * The friend-request screen — Figma 900:6931.
 *
 * One face, one sentence and one button, on the shell above. The room invite
 * is the same shell with a room card and a roster in the middle of it.
 *
 * uppercase: Georgian has no cases, so it only lifts the Latin inside the
 * line -- "MyTrivia" becomes "MYTRIVIA", the nickname becomes TRIVIAMASTE --
 * which is what the design shows. See shoutBody.
 */
function FriendInviteScreen({
  nickname,
  avatarUrl,
  subtitle,
  tagline,
  cta,
  onAccept,
  disabled,
  guestNameField,
  signInLink,
  shoutBody,
}: {
  nickname: string;
  avatarUrl: string | null;
  subtitle: string;
  tagline: string;
  cta: string;
  shoutBody: boolean;
  onAccept: () => void;
  disabled: boolean;
  guestNameField: React.ReactNode;
  signInLink: React.ReactNode;
}) {
  return (
    <InviteShell>
      {/* Sat a little above the true middle, as drawn: the design puts this
          block's centre at 41% of the frame, and centring it between the logo
          and the button would land it at 48%. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col items-center justify-center gap-6 pb-[22%] text-center"
      >
        <InviteAvatar nickname={nickname} avatarUrl={avatarUrl} />

        <div className="w-full">
          <h1
            className="font-display text-[21px] uppercase leading-tight tracking-[-0.16px] text-[#161e46]"
            // TASolivare ships a single 700 face, so CSS font matching picks it for
            // any weight asked for and never synthesises a heavier one — font-black
            // would change nothing here. Thickening the strokes is what actually
            // makes the name read as heavier than the sentence under it, which is
            // the weight relationship the design has (Black over Bold) and the one
            // weight we ship cannot express.
            style={{ WebkitTextStroke: "0.4px currentColor" }}
          >
            {nickname}
          </h1>
          <p className={cn("mt-7 font-display text-[19px] leading-tight tracking-[-0.16px] text-[#161e46]", shoutBody && "uppercase")}>
            {subtitle}
          </p>
          <p className={cn("mt-2 text-[14px] font-medium leading-snug tracking-[-0.16px] text-[#5a6495]", shoutBody && "uppercase")}>
            {tagline}
          </p>
        </div>

        {guestNameField}
      </motion.div>

      {/* On the bottom edge, which is where a screen with one decision on it
          puts its button. */}
      <div className="shrink-0 space-y-3">
        <ChunkyButton
          variant="white"
          size="xl"
          className="w-full"
          onClick={onAccept}
          disabled={disabled}
          icon={<UserPlus className="h-5 w-5" />}
        >
          {cta}
        </ChunkyButton>
        {signInLink}
      </div>
    </InviteShell>
  );
}
