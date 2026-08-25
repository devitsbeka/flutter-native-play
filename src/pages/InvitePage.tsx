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
import { readInviteIntent, roomIsFreshEnoughToOffer } from "@/utils/inviteLink";
import logoLight from "@/assets/mytrivia-logo-light.svg";

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
  const { code } = useParams<{ code: string }>();
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
          if (room) {
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
        } else if (resolved.room_code) {
          // A "pending" link: no room existed when it was shared, so this one
          // was resolved just now. Check how old it is before offering it —
          // a lobby left open on Tuesday is still `waiting` on Friday, and
          // is not what anybody is being invited to.
          const { data: roomRows } = await supabase.rpc("room_preview", {
            p_room_code: resolved.room_code,
          });
          if (cancelled) return;
          const room = (roomRows as InvitePreview[] | null)?.[0];
          const fresh = roomIsFreshEnoughToOffer(
            room?.last_activity_at,
            room?.created_at,
            Date.now(),
          );
          if (!fresh) {
            resolved = { ...resolved, room_code: null, room_name: null, category_id: null, category_name: null, room_status: null, player_count: null };
            people = [];
          } else if (room) {
            resolved = {
              ...resolved,
              is_archived: room.is_archived,
              created_at: room.created_at,
              last_activity_at: room.last_activity_at,
            };
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
      <div className="h-[100dvh] flex items-center justify-center bg-[#7B68D9]">
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
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-6 px-8 bg-[#7B68D9] text-center">
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

  return (
    // Its own scroller, not the document's: nativeShell disables the webview
    // scroller for the life of the app, so a page that merely grows is frozen
    // solid on the device. See CLAUDE.md 4b.
    <div className="h-[100dvh] overflow-y-auto safe-bleed bg-[#7B68D9]">
      <div className="max-w-[520px] mx-auto px-5 pt-[calc(var(--safe-top)+24px)] pb-12">

        {/* Whose app this is.
            Most people reach this screen from a link in a chat, and a good
            share of them have never heard of MyTrivia — the page opened on a
            purple field with a stranger's face on it and nothing to say where
            they were. The lockup carries the crown and the wordmark together,
            so one image answers it. Light variant: the ground is purple. */}
        <div className="flex justify-center mb-6">
          <img
            src={logoLight}
            alt="MyTrivia"
            className="h-9 w-auto select-none"
            draggable={false}
          />
        </div>

        {/* Who is inviting you. The whole reason this screen exists. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center gap-3 mb-8"
        >
          <SafeAvatar
            avatarUrl={preview.host_avatar_url}
            fallback={(preview.host_nickname || "?").charAt(0).toUpperCase()}
            className="w-24 h-24 border-4 border-white/25 shadow-xl"
            fallbackClassName="text-3xl font-bold bg-white/20 text-white"
          />
          {/* Name first. The other order reads as a sentence with its
              subject at the end -- "is inviting you to play / Beka". */}
          <div>
            <h1 className="text-white text-2xl font-bold drop-shadow">{preview.host_nickname}</h1>
            <p className="text-white/75 text-sm font-medium">
              {hasRoom ? t("extra.inviteInvitesYou") : t("extra.inviteFriendSubtitle")}
            </p>
            {/* A friend request has no room card under it to explain what
                happens next, so the second line does: three words that this
                is a quiz app and that accepting leads to playing together.
                With a room on screen it would be saying it twice. */}
            {!hasRoom && (
              <p className="mt-1.5 text-white/55 text-[13px] leading-snug">
                {t("extra.inviteFriendTagline")}
              </p>
            )}
          </div>
        </motion.div>

        {/* What you are being invited to. Absent when the host has no room
            open — the invite is then simply to be friends, and inventing a
            room card for it would promise a game that is not there. */}
        {hasRoom && (
          <div className="w-full p-4 rounded-2xl bg-white/10 border border-white/[0.12] mb-4">
            <div className="flex items-start justify-between gap-3">
              {/* The picture the room is drawn with everywhere else. Without
                  it the card was two lines of text where the rooms list, the
                  countdown and the results screen all show the category.

                  CategoryArtwork and not QuizCategoryIcon: the six
                  picture-guess categories ship their own 3D art, which is what
                  the library and the Discover cards draw them with, and
                  QuizCategoryIcon goes straight to the icon library instead —
                  so "guess the movie" came out as a generic clapperboard
                  rather than as itself.

                  Rendered only when there is something to resolve, so an
                  unknown category leaves no gap beside the title. */}
              {(categoryIdentity.iconSlug || categoryIdentity.categoryId) && (
                <CategoryArtwork
                  categoryId={categoryIdentity.categoryId}
                  iconSlug={categoryIdentity.iconSlug}
                  size={40}
                  className="shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold text-lg truncate">
                  {preview.room_name || t("extra.inviteRoomFallback")}
                </p>
                {preview.category_name && (
                  <p className="text-white/70 text-sm mt-0.5 truncate">{preview.category_name}</p>
                )}
              </div>
              {/* Live or finished, and said on the card rather than only in
                  the button. Someone opening a link days later should be able
                  to see WHAT it was without pressing anything. */}
              <span
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                  roomIsOver ? "bg-white/10 text-white/60" : "bg-emerald-400/20 text-emerald-200",
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    roomIsOver ? "bg-white/40" : "bg-emerald-300 animate-pulse",
                  )}
                />
                {roomIsOver ? t("extra.inviteRoomFinished") : t("extra.inviteRoomLive")}
              </span>
            </div>
            {roomAge && (
              <p className="text-white/45 text-xs mt-2">{roomAge}</p>
            )}
          </div>
        )}

        {/* Who else is in, each with a way to add them. Only the host is
            befriended by accepting; these are ordinary requests, because
            nobody else in the room agreed to anything. */}
        {players.length > 0 && (
          <div className="w-full rounded-2xl bg-white/10 border border-white/[0.12] mb-6 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.12]">
              <Users className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-sm font-medium">
                {t("extra.invitePlayers")} ({players.length})
              </span>
            </div>
            <div className="divide-y divide-white/[0.08]">
              {players.map(player => {
                const isFriend = friends.some(f => f.friendId === player.user_id);
                const isSelf = player.user_id === user?.id;
                const asked = requested.has(player.user_id);
                return (
                  <div key={player.user_id} className="flex items-center gap-3 px-4 py-3">
                    <SafeAvatar
                      avatarUrl={player.avatar_url}
                      fallback={(player.nickname || "?").charAt(0).toUpperCase()}
                      className="w-10 h-10"
                      fallbackClassName="bg-white/20 text-white font-semibold"
                    />
                    {/* Name and its add button as one group, so the button
                        reads as belonging to that person rather than sitting
                        in a column at the far edge. Same shape and the same
                        place as the lobby's chip — this screen is the lobby
                        seen from outside, and the two should not look like
                        different features. */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="min-w-0 truncate text-white font-medium">
                        {player.nickname}
                      </span>
                      {/* Nothing to offer a signed-out visitor: they cannot
                          send a friend request yet, and a row of greyed-out
                          buttons reads as broken rather than as not-yet. */}
                      {user && !isSelf && (by === "room" || !player.is_host) && (
                        isFriend || asked ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                        ) : (
                          <button
                            onClick={() => addPlayer(player.user_id)}
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                              "bg-white/15 text-white transition-colors hover:bg-white/25 active:scale-95"
                            )}
                            aria-label={t("extra.inviteAddFriend")}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                    </div>
                    {player.is_host && (
                      <span className="text-white/50 text-xs shrink-0">{t("extra.inviteHostTag")}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* A guest needs a name before anything else. Without one they used
            to arrive in the room as "Trivia King", which is nobody. */}
        {!user && (
          <div className="mb-4">
            <label className="block text-white/75 text-sm font-medium mb-2">
              {t("extra.inviteYourName")}
            </label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value.slice(0, 20))}
              placeholder={t("extra.inviteNamePlaceholder")}
              maxLength={20}
              autoComplete="nickname"
              className={cn(
                "w-full h-14 px-4 rounded-2xl text-white placeholder:text-white/40",
                "bg-white/10 border border-white/20 outline-none",
                "focus:border-white/50 text-base"
              )}
            />
          </div>
        )}

        {isOwnLink ? (
          <div className="text-center space-y-4">
            <p className="text-white/75">{t("extra.inviteThisIsYours")}</p>
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
          <div className="text-center space-y-4">
            <p className="text-white/75 text-sm">{t("extra.inviteRoomOverBody")}</p>
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
            icon={canJoinRoom ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
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
            className="w-full mt-4 text-white/70 text-sm font-medium underline underline-offset-4"
          >
            {t("extra.inviteHaveAccount")}
          </button>
        )}
      </div>
    </div>
  );
}
