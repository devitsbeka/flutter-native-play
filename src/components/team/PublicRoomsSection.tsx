import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFriends } from "@/contexts/FriendsContext";
import { useAuth } from "@/contexts/AuthContext";
import { onlineUserIds } from "@/utils/presence";
import { motion } from "framer-motion";
import { Globe, Loader2, Users, Clock, Trash2, LogOut, X, UserPlus, Play } from "lucide-react";
import { RoomCardPlayButton } from "@/components/team/RoomCardPlayButton";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { GradientBackground, ROOM_GRADIENT_PRESETS } from "@/components/ui/noisy-gradient-backgrounds";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useCategoryIconByName, useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import {
  filterPublicRooms,
  PUBLIC_ROOMS_KEY,
  publicRoomPath,
  roomSeats,
  sortPublicRooms,
  usePublicRooms,
  type PublicRoom,
  type PublicRoomFilter,
} from "@/hooks/usePublicRooms";
import iconKingLounge from "@/assets/play-chooser/icon-king.webp";
import iconBattleLounge from "@/assets/play-chooser/icon-crate.png";
import { dealtCrests, dealtRoomIcon, fetchCrestPool } from "@/utils/roomCrests";
import { useRoomIconPool } from "@/hooks/useRoomIconPool";
import iconWordsLounge from "@/assets/play-chooser/icon-words.webp";
import crownIcon from "@/assets/crown-icon.png";
import sceneArena from "@/assets/tb-lobby/scene-arena.webp";

/**
 * The Public tab: rooms anyone can find, and ask to be let into.
 *
 * A card answers the three questions someone scrolling this list is actually
 * asking — what will it play first, who runs it, and is there a seat left —
 * and then offers the same "join" the games list offers, because from the
 * outside it is the same act. What happens behind that button is different:
 * being listed is not being open, so unless the host already invited you (or
 * you are in the room already), the button asks them and then says so.
 */
const LOUNGES: Record<string, { icon: string; labelKey: string }> = {
  king: { icon: iconKingLounge, labelKey: "lobby.vkTitle" },
  team_battle: { icon: iconBattleLounge, labelKey: "teamBattle.title" },
  words: { icon: iconWordsLounge, labelKey: "words.title" },
};

/**
 * One ink for every card: white. The gradient cards are deep and saturated
 * already; the pale arena scene gets DARKENED to match (reduced opacity
 * over deep purple, a dark wash, an inner shadow) rather than switching
 * the text to dark — the owner's call, and one ink is one less seam.
 */
const INK = {
  light: {
    text: "text-white",
    muted: "text-white/70",
    faint: "text-white/60",
    // A dark scrim, not a white one: white/15 with white type on it
    // disappeared over the light gradients (owner's screenshot).
    pill: "bg-black/25 border-white/25",
    ring: "border-white/60",
    more: "bg-white/30 text-white",
  },
} as const;

/**
 * The mixed pseudo-category as every picker in every language stores it.
 * A room's first round is denormalized as a NAME, so "Mixed" written by an
 * English host has to read as mixed for a Georgian viewer, and wear the
 * box rather than be looked up as a category called "Mixed".
 */
const MIXED_LABELS = new Set([
  "__mixed__", "Mixed", "სხვადასხვა", "შერეული", "Gemischt", "Mixto", "Mixte", "Misto",
]);

/** A joined (non-host) face on the card, so a filling room shows its people. */
interface CardPlayer {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
}

function PublicRoomCard({
  room,
  players,
  crests,
  online,
  blocked = false,
  knocks = 0,
  index,
  onAsk,
  onWithdraw,
  onRemove,
  busy,
}: {
  room: PublicRoom;
  players: CardPlayer[];
  /** A Battle room's two team crests — its real face on the card. */
  crests?: { a: string | null; b: string | null };
  /** Who, of everyone on this list, is in the app right now. */
  online: ReadonlySet<string>;
  /**
   * An ask on ANOTHER room is still waiting: this one's join is off until
   * that one is withdrawn. One door at a time.
   */
  blocked?: boolean;
  /** People knocking on this room — the host's, and only the host sees it. */
  knocks?: number;
  index: number;
  onAsk: (room: PublicRoom) => void;
  /** Take back a pending ask — one game at a time, so waiting is undoable. */
  onWithdraw: (room: PublicRoom) => void;
  /** Delete it (the host) or leave it (a seated guest). */
  onRemove: (room: PublicRoom) => void;
  busy: boolean;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { openProfile } = usePlayerProfile();
  const localizeCategory = useLocalizedCategoryName();
  const iconForCategory = useCategoryIconByName();

  const lounge = room.game_type_key ? LOUNGES[room.game_type_key] : undefined;
  // The card's face: the host's icon, else the game's lounge icon, else a
  // random one dealt from the shared pool by room id — no room shows bare.
  const iconPool = useRoomIconPool();
  const roomFace = room.room_icon ?? lounge?.icon ?? dealtRoomIcon(room.id, iconPool);
  const gradient = ROOM_GRADIENT_PRESETS[index % ROOM_GRADIENT_PRESETS.length];
  const seats = roomSeats(room);
  const inside = room.my_state === "host" || room.my_state === "joined";
  const waiting = room.my_state === "pending";
  // A room's cap can lag behind who is actually in it — the host set 2 and a
  // third walked in — so the seats a card DRAWS are never fewer than the
  // heads it counts. That is what kept a full room reading "3/2" and drawing
  // only two circles for three people.
  //
  // Who is online no longer changes the button. It used to: a "ready" room
  // (mine, full, everyone in the app) turned it mint while every other card
  // kept a white pill with a green dot, which meant the same act wore two
  // shapes and three words across one list. The seats above already say who
  // is here, one face at a time, and the dot on each of them says it better
  // than a dot on a button ever did.
  const effectiveSeats = seats != null ? Math.max(seats, room.player_count) : null;
  // The first round: its category's own icon and name, in the viewer's
  // language — or "mixed", whichever language the host's picker stored it
  // in. The listing carries an icon only for a queued round; a room whose
  // own category is the round carries the name alone, so the icon is
  // looked up from the name (categoryDisplayName), the same way the
  // translation is.
  const mixed = !room.first_category_name || MIXED_LABELS.has(room.first_category_name);
  const category = mixed ? null : localizeCategory(room.first_category_name);
  const categoryIcon = mixed
    ? "mystery-box"
    : room.first_category_icon || iconForCategory(room.first_category_name) || "mystery-box";
  // A Trivia Battle card is a picture of where it happens: the arena from
  // its lobby, empty, seats waiting — not one of the gradients every other
  // room wears.
  const scene = room.game_type_key === "team_battle" ? sceneArena : null;
  // The scene is DARKENED under the ink (reduced opacity over deep purple,
  // a dark wash, an inner shadow), so every card writes in the same white.
  const ink = INK.light;

  const enter = () => navigate(publicRoomPath(room));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden shadow-lg"
      onClick={() => (inside ? enter() : onAsk(room))}
      aria-disabled={blocked || undefined}
    >
      {/* The private tab's card proportions (MyRoomsSection): the same
          shape on both tabs, and taller than the strip this used to be. */}
      {/* 15% shorter than the private tab's proportions (owner's call): the
          height is set by the aspect ratio, so the ratio grows by 1/0.85 and
          the floor comes down with it. */}
      <div className="relative p-3 min-h-[202px] aspect-[1.55/1] md:aspect-[1.35/1] flex flex-col rounded-2xl overflow-hidden">
        {scene ? (
          <>
            {/* The arena, dimmed to a backdrop: the pale lilac scene at
                full strength swallowed every word on it. Deep purple under
                a faded image, a dark wash on top, and an inner shadow
                holding the edges — the picture stays, the text reads. */}
            <div className="absolute inset-0 bg-[#352258]" />
            <img
              alt=""
              src={scene}
              className="absolute inset-0 w-full h-full object-cover opacity-45"
              style={{ objectPosition: "50% 30%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2E1065]/80 via-[#2E1065]/35 to-[#2E1065]/45" />
            <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_48px_rgba(20,8,45,0.6)]" />
          </>
        ) : (
          <div className="absolute inset-0">
            <GradientBackground
              colors={gradient.colors}
              gradientSize="125% 125%"
              gradientOrigin="bottom-middle"
              enableNoise={false}
              className="w-full h-full"
            />
          </div>
        )}
        {/* Top: who runs it, who already joined, and how full it is */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openProfile(room.host_user_id);
              }}
              className={`flex items-center gap-2 min-w-0 rounded-full backdrop-blur-md border pl-1 pr-2.5 py-1 ${ink.pill}`}
            >
              <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                <SafeAvatarImage
                  avatarUrl={room.host_avatar_url}
                  fallback={room.host_nickname || "?"}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              </div>
              <img src={crownIcon} alt="" className="w-3 h-3 object-contain shrink-0" />
              <span className={`text-xs font-semibold truncate max-w-[104px] ${ink.text}`}>
                {room.host_nickname || t("extra.friendFallback")}
              </span>
            </button>
          </div>

          {/* Seats. The lounges are what this is for — their card is
              "is there room on that couch" — so they always show the pair;
              a classic room without a cap just counts heads. */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Somebody is knocking. The host sees it on the card, and a
                tap opens the room, where the doorstep asks accept / decline
                / block — the same modal as arriving in the lobby. */}
            {room.my_state === "host" && knocks > 0 && (
              <span
                aria-label={t("extra.joinRequestBody")}
                className="flex items-center gap-1 rounded-full bg-[#7126d5] px-2.5 py-1 shadow-[0px_4px_12px_0px_rgba(113,38,213,0.45)] animate-pulse"
              >
                <UserPlus className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-bold text-white">{knocks}</span>
              </span>
            )}
            <div className={`flex items-center gap-1 rounded-full backdrop-blur-md border px-2.5 py-1 ${ink.pill}`}>
              <Users className={`w-3.5 h-3.5 ${ink.text}`} />
              <span className={`text-xs font-bold ${ink.text}`}>
                {effectiveSeats ? `${room.player_count}/${effectiveSeats}` : room.player_count}
              </span>
            </div>
            {/* The way OUT, for the people who are in: the host deletes
                the room, a seated guest leaves it. Nobody else has anything
                to remove, so nobody else sees a button. */}
            {inside && (
              <button
                type="button"
                aria-label={room.my_state === "host" ? t("extra.rlDeleteRoom") : t("extra.rlLeaveRoom")}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(room);
                }}
                className={`w-7 h-7 rounded-full backdrop-blur-md border flex items-center justify-center active:scale-95 transition-transform ${ink.pill} ${ink.text}`}
              >
                {room.my_state === "host" ? (
                  <Trash2 className="w-3.5 h-3.5" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Middle: the room, and the round it plays first */}
        {room.game_type_key === "team_battle" ? (
          // The matchup frames its own name: one crest on each wing, the
          // title centered between them. The crests are what the captains
          // dressed — or the pair the room was dealt when nobody has yet.
          //
          // Centred as one group, not pinned to the card's two edges. At
          // justify-between the crests sat in the corners with a lake of
          // empty purple between them and the name — three things on one
          // line that did not read as one thing.
          <div className="relative z-10 flex-1 flex items-center justify-center gap-3 py-3">
            {crests?.a ? (
              <img
                src={crests.a}
                alt=""
                className="w-[53px] h-[53px] object-contain drop-shadow-lg -rotate-6 shrink-0"
              />
            ) : (
              <span className="w-[53px] h-[53px] rounded-full bg-white/10 border border-white/20 shrink-0" />
            )}
            <h3 className={`min-w-0 max-w-[58%] text-center font-display text-lg leading-tight line-clamp-2 drop-shadow-md ${ink.text}`}>
              {lounge ? t(lounge.labelKey) : room.room_name || t("extra.gameRoomDefault")}
            </h3>
            {crests?.b ? (
              <img
                src={crests.b}
                alt=""
                className="w-[53px] h-[53px] object-contain drop-shadow-lg rotate-6 shrink-0"
              />
            ) : (
              <span className="w-[53px] h-[53px] rounded-full bg-white/10 border border-white/20 shrink-0" />
            )}
          </div>
        ) : (
          <div className="relative z-10 flex-1 flex items-center gap-3 py-3">
            {/* Every room wears a face: the host's icon, else the game's,
                else a random one dealt from the shared pool by room id
                (owner's rule) — no room shows up bare. */}
            {roomFace && (
              <img
                src={roomFace}
                alt=""
                className="w-14 h-14 object-contain drop-shadow-lg shrink-0"
              />
            )}
            {/* A lounge IS its game: an arena called "Search Trail" with
                "Trivia Battle" in small type under it advertised a name
                nobody chose over the one thing a player is scanning for. The
                classic rooms keep their own name, which somebody did choose. */}
            <div className="min-w-0 flex-1">
              <h3 className={`font-display text-lg leading-tight line-clamp-2 drop-shadow-md ${ink.text}`}>
                {lounge ? t(lounge.labelKey) : room.room_name || t("extra.gameRoomDefault")}
              </h3>
              {!lounge && (
                <p className={`text-sm truncate mt-0.5 ${ink.muted}`}>
                  {t("extra.gameRoomLabel")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Every seat the room has, so the reader sees at a glance which
            couch is one player short of starting: claimed seats wear their
            faces (host first, crowned by the chip above), each with a green
            dot when that person is in the app right now; open seats are
            dashed outlines waiting to be filled. */}
        {effectiveSeats != null && effectiveSeats > 0 && (
          <div className="relative z-10 flex items-center gap-1 pb-2 flex-wrap">
            {Array.from({ length: Math.min(effectiveSeats, 10) }, (_, i) => {
              const person: CardPlayer | undefined =
                i === 0
                  ? {
                      user_id: room.host_user_id,
                      nickname: room.host_nickname,
                      avatar_url: room.host_avatar_url,
                    }
                  : players[i - 1];
              return person ? (
                <span key={person.user_id} className="relative shrink-0">
                  <span className={`block w-7 h-7 rounded-full overflow-hidden border-2 ${ink.ring}`}>
                    <SafeAvatarImage
                      avatarUrl={person.avatar_url}
                      fallback={person.nickname || "?"}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                  </span>
                  {online.has(person.user_id) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#2E1065]/70" />
                  )}
                </span>
              ) : (
                <span
                  key={`open-${i}`}
                  className="w-7 h-7 rounded-full border-2 border-dashed border-white/40 bg-white/10 shrink-0"
                />
              );
            })}
          </div>
        )}

        {/* Bottom: the first round on the left, the way in on the right */}
        <div className={`relative z-10 backdrop-blur-md border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 ${ink.pill}`}>
          <div className="flex items-center gap-2 min-w-0">
            {/* Just the category: its icon and its name. The "FIRST ROUND"
                caption above it was noise (owner's call) — a picked round
                wears its category's icon, an unpicked one the library's
                mystery box, the same face the picker gives "mixed". */}
            <DynamicIcon slug={categoryIcon} className="w-[26px] h-[26px] shrink-0" />
            <p className={`text-[15px] font-semibold truncate leading-tight ${ink.text}`}>
              {category || t("extra.cpMixedCategory")}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* The public list's button is the mint one. My Rooms draws the
                same button in white — same shape, same words, same play
                triangle; which list you are on is the only difference. */}
            <RoomCardPlayButton
              tone="mint"
              disabled={busy || waiting || blocked}
              onClick={(e) => {
                e.stopPropagation();
                if (inside) enter();
                else onAsk(room);
              }}
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : waiting ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  {t("extra.joinWaitingHost")}
                </>
              ) : (
                <>
                  {/* One word for one act. It used to say "Play" on a full
                      room, "Enter" on one I am already in and "Join" on a
                      stranger's — three labels for the one thing a card is
                      for, and the state they were distinguishing is already
                      on the card above them. */}
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {t("extra.roomPlay")}
                </>
              )}
            </RoomCardPlayButton>
            {/* Waiting is undoable: one game at a time means the ask must
                be withdrawable to knock on another door. */}
            {waiting && !busy && (
              <button
                type="button"
                aria-label={t("extra.withdrawJoin")}
                onClick={(e) => {
                  e.stopPropagation();
                  onWithdraw(room);
                }}
                className={`w-8 h-8 rounded-lg backdrop-blur-md border flex items-center justify-center active:scale-95 transition-transform ${ink.pill} ${ink.text}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PublicRoomsSection({
  filter = "all",
  searchQuery = "",
}: {
  filter?: PublicRoomFilter;
  searchQuery?: string;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = usePublicRooms();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  // The room whose delete/leave is being confirmed, if any.
  const [removing, setRemoving] = useState<PublicRoom | null>(null);

  const { user } = useAuth();
  const { friends } = useFriends();
  const friendIds = useMemo(() => new Set(friends.map((f) => f.friendId)), [friends]);

  // Who is on each couch. The public_rooms RPC carries only the host and a
  // count; the card wants to show WHO joined, and the Active filter wants
  // to know whether any of them is still here — so the seated participants
  // of every listed room ride in on one grouped query, hosts included.
  const allIds = useMemo(() => (data ?? []).map((r) => r.id), [data]);
  const { data: seating } = useQuery({
    queryKey: ["public-room-players", allIds],
    enabled: allIds.length > 0,
    staleTime: 10_000,
    refetchInterval: 25_000,
    queryFn: async (): Promise<{
      faces: Map<string, CardPlayer[]>;
      seated: Map<string, string[]>;
      crests: Map<string, { a: string | null; b: string | null }>;
    }> => {
      const [{ data: rows }, { data: crestRows }, pool] = await Promise.all([
        supabase
          .from("room_participants")
          .select("room_id, user_id, nickname, avatar_url, is_host, status")
          .in("room_id", allIds)
          .in("status", ["joined", "ready", "playing"]),
        // A Battle room's face is its two crests — the RPC doesn't carry
        // them, so they ride in on the same refresh.
        supabase
          .from("game_rooms")
          .select("id, team_a_icon, team_b_icon")
          .in("id", allIds),
        // The shared, ordered pool a captainless room draws its face from
        // (utils/roomCrests): the lobby deals from the same deck with the
        // same seed, so the card and the arena wear the same pair.
        fetchCrestPool(),
      ]);
      const faces = new Map<string, CardPlayer[]>();
      const seated = new Map<string, string[]>();
      (rows ?? []).forEach((p) => {
        seated.set(p.room_id, [...(seated.get(p.room_id) ?? []), p.user_id]);
        if (p.is_host) return;
        const arr = faces.get(p.room_id) ?? [];
        arr.push({ user_id: p.user_id, nickname: p.nickname, avatar_url: p.avatar_url });
        faces.set(p.room_id, arr);
      });
      // What the captains set wins; a side nobody dressed gets dealt a crest
      // from the library — seeded by the room id, so each room keeps ITS
      // random pair across refreshes instead of reshuffling every poll.
      const crests = new Map<string, { a: string | null; b: string | null }>();
      (crestRows ?? []).forEach((r) => {
        crests.set(
          r.id,
          dealtCrests(r.id, pool, { a: r.team_a_icon ?? null, b: r.team_b_icon ?? null }),
        );
      });
      return { faces, seated, crests };
    },
  });

  // Who, of everyone seated anywhere on this list, is in the app right now.
  // Through presence_for_users (utils/presence): the presence table itself
  // is owner-only, and would answer "you, and nobody else".
  const everyone = useMemo(() => {
    const ids = new Set<string>((data ?? []).map((r) => r.host_user_id));
    seating?.seated.forEach((people) => people.forEach((id) => ids.add(id)));
    return [...ids].sort();
  }, [data, seating]);
  const { data: online } = useQuery({
    queryKey: ["public-room-presence", everyone],
    enabled: everyone.length > 0,
    staleTime: 10_000,
    refetchInterval: 25_000,
    queryFn: () => onlineUserIds(everyone),
  });
  const onlineIds = useMemo(() => {
    // The viewer is online by definition — they are looking at this list —
    // so their own room counts as active without waiting for a heartbeat.
    const ids = new Set(online ?? []);
    if (user) ids.add(user.id);
    return ids;
  }, [online, user]);

  // The host said yes: walk in. A player who asked is waiting for exactly
  // this answer, and the room may fill and start while they read a card
  // that has only just changed its button. So an approval arriving while
  // this list is on screen opens the room itself. Each request is handled
  // once, whatever the channel replays.
  const walkedInRef = useMemo(() => new Set<string>(), []);
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`join-approved-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_join_requests",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { id?: string; room_id?: string; status?: string };
          if (row.status !== "approved" || !row.id || !row.room_id || walkedInRef.has(row.id)) return;
          walkedInRef.add(row.id);
          void (async () => {
            const { data: target } = await supabase
              .from("game_rooms")
              .select("room_code, game_type_key, game_mode, status")
              .eq("id", row.room_id!)
              .maybeSingle();
            if (!target || target.status === "cancelled") return;
            navigate(publicRoomPath(target));
          })();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, navigate, walkedInRef]);

  // Who is knocking on the rooms I host. The table's policy shows a host
  // their own rooms' requests and nobody else's, so the query is simply
  // "everything pending" and the answer is already mine. Realtime on the
  // same table (the policy filters the stream too) keeps the badge honest
  // between polls.
  const hostedIds = useMemo(
    () => (data ?? []).filter((r) => r.my_state === "host").map((r) => r.id),
    [data],
  );
  const { data: knocksByRoom } = useQuery({
    queryKey: ["public-room-knocks", hostedIds],
    enabled: hostedIds.length > 0,
    staleTime: 10_000,
    refetchInterval: 25_000,
    queryFn: async (): Promise<Map<string, number>> => {
      const { data: rows } = await supabase
        .from("room_join_requests")
        .select("room_id")
        .in("room_id", hostedIds)
        .eq("status", "pending");
      const map = new Map<string, number>();
      (rows ?? []).forEach((r) => map.set(r.room_id, (map.get(r.room_id) ?? 0) + 1));
      return map;
    },
  });
  useEffect(() => {
    if (hostedIds.length === 0) return;
    const channel = supabase
      .channel("public-room-knocks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_join_requests" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["public-room-knocks"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hostedIds.length, queryClient]);

  // The room I'm waiting on first, then mine, then my friends' rooms, then
  // everyone else's — and within each group the room closest to filling
  // first, so the couch one player short of starting is the first thing
  // a scroller sees.
  const roomsCtx = {
    seatedByRoom: seating?.seated ?? new Map<string, string[]>(),
    onlineIds,
    friendIds,
  };
  const rooms = sortPublicRooms(
    filterPublicRooms(data ?? [], filter, searchQuery, roomsCtx),
    friendIds,
    roomsCtx,
  );
  const playersByRoom = seating?.faces;

  // A match nobody is playing ends itself: a listed 'playing' battle whose
  // whole couch is offline gets reported to tb_finish_stale — the server
  // re-checks the silence itself (a deadline unanswered for minutes) and
  // closes the room, which drops it off this tab. Once per room per visit;
  // a database without the migration just answers with an error, quietly.
  const sweptStaleRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    (data ?? []).forEach((r) => {
      if (r.status !== "playing" || r.game_type_key !== "team_battle") return;
      const seated = seating?.seated.get(r.id) ?? [];
      const people = seated.includes(r.host_user_id) ? seated : [r.host_user_id, ...seated];
      if (people.some((id) => onlineIds.has(id))) return;
      if (sweptStaleRef.current.has(r.id)) return;
      sweptStaleRef.current.add(r.id);
      void supabase.rpc("tb_finish_stale", { p_room_id: r.id }).then(({ data: closed, error }) => {
        if (!error && closed) {
          void queryClient.invalidateQueries({ queryKey: PUBLIC_ROOMS_KEY });
        }
      });
    });
  }, [data, seating, onlineIds, queryClient]);

  // The same two exits the Private tab offers. Only the host may DELETE a
  // room (RLS matches no row for anybody else, with no error — so the
  // returned rows are the proof); a guest leaves by dropping their own
  // participant row, which also wipes their approval (the trigger in
  // 20260923100000), so coming back means knocking again.
  const confirmRemove = async () => {
    const room = removing;
    if (!room || !user) return;
    setRemoving(null);
    setBusyId(room.id);
    try {
      if (room.my_state === "host") {
        const { data: deleted, error } = await supabase
          .from("game_rooms")
          .delete()
          .eq("id", room.id)
          .select("id");
        if (error) throw error;
        if (!deleted || deleted.length === 0) {
          toast.error(t("extra.roomDeleteHostOnly"));
          return;
        }
        toast.success(t("extra.roomDeleted"));
      } else {
        const { data: left, error } = await supabase
          .from("room_participants")
          .delete()
          .eq("room_id", room.id)
          .eq("user_id", user.id)
          .select("id");
        if (error) throw error;
        if (!left || left.length === 0) {
          toast.error(t("extra.roomDeleteFailed"));
          return;
        }
        toast.success(t("extra.roomLeft"));
      }
      await queryClient.invalidateQueries({ queryKey: PUBLIC_ROOMS_KEY });
    } catch (e) {
      console.error("[publicRooms] remove failed", e);
      toast.error(t("extra.roomDeleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // The one room I am waiting on, if any: the sort puts it first and every
  // other card's join is off until it is withdrawn.
  const waitingRoomId = (data ?? []).find((r) => r.my_state === "pending")?.id ?? null;

  const ask = async (room: PublicRoom) => {
    if (busyId) return;
    setBusyId(room.id);
    try {
      // One door at a time, and the player closes it themselves: an ask
      // already waiting on another room has to be withdrawn (the X on its
      // card, which the sort keeps at the top) before knocking here. It
      // used to be taken back silently, which meant a mis-tap moved the
      // player's ask off the room they were actually waiting for.
      if ((data ?? []).some((r) => r.my_state === "pending" && r.id !== room.id)) {
        toast.error(t("extra.joinOneAtATime"));
        return;
      }
      const { data: outcome, error } = await supabase.rpc("request_room_join", {
        p_room_id: room.id,
      });
      if (error) throw error;
      if (outcome === "joined") {
        navigate(publicRoomPath(room));
        return;
      }
      toast.success(t("extra.joinAsked"));
      void refetch();
    } catch (e) {
      console.error("[publicRooms] join request failed", e);
      toast.error(t("extra.joinAskFailed"));
    } finally {
      setBusyId(null);
    }
  };

  // Take back a pending ask. Until the 20260926100000 policy is applied
  // the delete matches no row (RLS, silently) — the card just keeps
  // waiting, which is also what a failed withdraw should look like.
  const withdraw = async (room: PublicRoom) => {
    if (!user || busyId) return;
    setBusyId(room.id);
    try {
      const { error } = await supabase
        .from("room_join_requests")
        .delete()
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: PUBLIC_ROOMS_KEY });
    } catch (e) {
      console.error("[publicRooms] withdraw failed", e);
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 pt-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-full h-[216px] rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  // Rooms exist but none pass the filter (or the search): say that, not
  // "nobody has published a room yet", which would be a lie with a list
  // one tap away.
  if (rooms.length === 0 && (data ?? []).length > 0) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
          {t("extra.publicFilterEmpty")}
        </p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-muted flex items-center justify-center">
          <Globe className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">{t("extra.publicEmptyTitle")}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-[260px] mx-auto">
          {t("extra.publicEmptyBody")}
        </p>
      </div>
    );
  }

  return (
    // A width-based grid, not a column of stretched banners: one card per
    // row on a phone, two on tablets, three on wide screens.
    <div className="px-4 pt-3 pb-6 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
      {rooms.map((room, i) => (
        <PublicRoomCard
          key={room.id}
          room={room}
          players={playersByRoom?.get(room.id) ?? []}
          crests={seating?.crests.get(room.id)}
          online={onlineIds}
          knocks={knocksByRoom?.get(room.id) ?? 0}
          index={i}
          blocked={!!waitingRoomId && waitingRoomId !== room.id}
          onAsk={(r) => void ask(r)}
          onWithdraw={(r) => void withdraw(r)}
          onRemove={setRemoving}
          busy={busyId === room.id}
        />
      ))}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle>
              {removing?.my_state === "host" ? t("extra.rlDeleteRoom") : t("extra.rlLeaveRoom")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.my_state === "host"
                ? t("extra.rlDeleteRoomConfirm")
                : t("extra.rlLeaveRoomConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0">{t("extra.rlCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmRemove()}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              {removing?.my_state === "host" ? t("extra.rlDelete") : t("extra.rlLeaveRoom")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
