import { useMemo, useState } from "react";
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
import { Globe, Loader2, Users, Clock, Trash2, LogOut } from "lucide-react";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { GradientBackground, ROOM_GRADIENT_PRESETS } from "@/components/ui/noisy-gradient-backgrounds";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
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
import teamPenguins from "@/assets/tb-lobby/team-penguins.png";
import teamFormula from "@/assets/tb-lobby/team-formula.png";
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
    pill: "bg-white/15 border-white/20",
    ring: "border-white/60",
    more: "bg-white/30 text-white",
  },
} as const;

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
  index,
  onAsk,
  onRemove,
  busy,
}: {
  room: PublicRoom;
  players: CardPlayer[];
  /** A Battle room's two team crests — its real face on the card. */
  crests?: { a: string | null; b: string | null };
  index: number;
  onAsk: (room: PublicRoom) => void;
  /** Delete it (the host) or leave it (a seated guest). */
  onRemove: (room: PublicRoom) => void;
  busy: boolean;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { openProfile } = usePlayerProfile();
  const localizeCategory = useLocalizedCategoryName();

  const lounge = room.game_type_key ? LOUNGES[room.game_type_key] : undefined;
  const gradient = ROOM_GRADIENT_PRESETS[index % ROOM_GRADIENT_PRESETS.length];
  const seats = roomSeats(room);
  const inside = room.my_state === "host" || room.my_state === "joined";
  const waiting = room.my_state === "pending";
  const category = room.first_category_name ? localizeCategory(room.first_category_name) : null;
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
    >
      <div className="relative p-3 min-h-[172px] flex flex-col rounded-2xl overflow-hidden">
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
              style={{ objectPosition: "50% 42%" }}
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
            {/* Who already joined, right next to the host — a filling room
                shows its faces, not just a count. */}
            {players.length > 0 && (
              <span className="flex items-center shrink-0">
                {players.slice(0, 3).map((p, i) => (
                  <span
                    key={p.user_id}
                    className={`relative block w-6 h-6 rounded-full overflow-hidden border-2 shrink-0 ${ink.ring} ${i > 0 ? "-ml-2" : ""}`}
                  >
                    <SafeAvatarImage
                      avatarUrl={p.avatar_url}
                      fallback={p.nickname || "?"}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                  </span>
                ))}
                {players.length > 3 && (
                  <span className={`-ml-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 ${ink.ring} ${ink.more}`}>
                    +{players.length - 3}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Seats. The lounges are what this is for — their card is
              "is there room on that couch" — so they always show the pair;
              a classic room without a cap just counts heads. */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`flex items-center gap-1 rounded-full backdrop-blur-md border px-2.5 py-1 ${ink.pill}`}>
              <Users className={`w-3.5 h-3.5 ${ink.text}`} />
              <span className={`text-xs font-bold ${ink.text}`}>
                {seats ? `${room.player_count}/${seats}` : room.player_count}
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
        <div className="relative z-10 flex-1 flex items-center gap-3 py-3">
          {room.game_type_key === "team_battle" ? (
            // The two crests ARE the arena's face — the sides the captains
            // dressed, tilted toward each other like the matchup they are.
            <span className="flex items-center shrink-0 -space-x-3">
              <img
                src={crests?.a ?? teamPenguins}
                alt=""
                className="w-12 h-12 object-contain drop-shadow-lg -rotate-6"
              />
              <img
                src={crests?.b ?? teamFormula}
                alt=""
                className="w-12 h-12 object-contain drop-shadow-lg rotate-6"
              />
            </span>
          ) : (
            (lounge || room.room_icon) && (
              <img
                src={lounge?.icon ?? room.room_icon!}
                alt=""
                className="w-14 h-14 object-contain drop-shadow-lg shrink-0"
              />
            )
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
                {t("extra.publicRoomLabel")}
              </p>
            )}
          </div>
        </div>

        {/* Bottom: the first round on the left, the way in on the right */}
        <div className={`relative z-10 backdrop-blur-md border rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 ${ink.pill}`}>
          <div className="flex items-center gap-2 min-w-0">
            {room.first_category_icon ? (
              <DynamicIcon slug={room.first_category_icon} className="w-5 h-5 shrink-0" />
            ) : (
              <Globe className={`w-4 h-4 shrink-0 ${ink.muted}`} />
            )}
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold uppercase tracking-wide leading-none ${ink.faint}`}>
                {t("extra.firstRoundLabel")}
              </p>
              <p className={`text-sm font-semibold truncate leading-tight ${ink.text}`}>
                {/* No round picked yet means the first round is mixed —
                    say that, not "not chosen yet", which reads as a
                    room that is not ready. */}
                {category || t("game.difficulty.mixed")}
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={busy || waiting}
            onClick={(e) => {
              e.stopPropagation();
              if (inside) enter();
              else onAsk(room);
            }}
            className="flex items-center gap-1.5 shrink-0 rounded-lg bg-white/70 backdrop-blur-md px-3 py-1.5 text-sm font-extrabold text-[#2E1065] shadow-md disabled:opacity-60"
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t("extra.roomJoinLive")}
              </>
            )}
          </motion.button>
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
      const [{ data: rows }, { data: crestRows }] = await Promise.all([
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
      const crests = new Map<string, { a: string | null; b: string | null }>();
      (crestRows ?? []).forEach((r) => {
        crests.set(r.id, { a: r.team_a_icon ?? null, b: r.team_b_icon ?? null });
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

  // Mine first, then my friends' rooms, then everyone else's — each group
  // newest first.
  const rooms = sortPublicRooms(
    filterPublicRooms(data ?? [], filter, searchQuery, {
      seatedByRoom: seating?.seated ?? new Map(),
      onlineIds,
      friendIds,
    }),
    friendIds,
  );
  const playersByRoom = seating?.faces;

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

  const ask = async (room: PublicRoom) => {
    if (busyId) return;
    setBusyId(room.id);
    try {
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

  if (isLoading) {
    return (
      <div className="space-y-3 px-4 pt-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-full h-[172px] rounded-2xl bg-muted animate-pulse" />
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
          index={i}
          onAsk={(r) => void ask(r)}
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
