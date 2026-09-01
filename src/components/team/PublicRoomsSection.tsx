import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Loader2, Users, Clock } from "lucide-react";
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
  publicRoomPath,
  roomSeats,
  usePublicRooms,
  type PublicRoom,
  type PublicRoomFilter,
} from "@/hooks/usePublicRooms";
import iconKingLounge from "@/assets/play-chooser/icon-king.webp";
import iconBattleLounge from "@/assets/play-chooser/icon-crate.png";
import iconWordsLounge from "@/assets/play-chooser/icon-words.webp";
import crownIcon from "@/assets/crown-icon.png";

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

function PublicRoomCard({
  room,
  index,
  onAsk,
  busy,
}: {
  room: PublicRoom;
  index: number;
  onAsk: (room: PublicRoom) => void;
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

  const enter = () => navigate(publicRoomPath(room));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden shadow-lg"
      onClick={() => (inside ? enter() : onAsk(room))}
    >
      <GradientBackground
        colors={gradient.colors}
        gradientSize="125% 125%"
        gradientOrigin="bottom-middle"
        enableNoise={false}
        className="relative p-3 min-h-[172px] flex flex-col rounded-2xl"
      >
        {/* Top: who runs it, and how full it is */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openProfile(room.host_user_id);
            }}
            className="flex items-center gap-2 min-w-0 rounded-full bg-white/15 backdrop-blur-md border border-white/20 pl-1 pr-2.5 py-1"
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
            <span className="text-white text-xs font-semibold truncate max-w-[104px]">
              {room.host_nickname || t("extra.friendFallback")}
            </span>
          </button>

          {/* Seats. The lounges are what this is for — their card is
              "is there room on that couch" — so they always show the pair;
              a classic room without a cap just counts heads. */}
          <div className="flex items-center gap-1 shrink-0 rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-2.5 py-1">
            <Users className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-bold">
              {seats ? `${room.player_count}/${seats}` : room.player_count}
            </span>
          </div>
        </div>

        {/* Middle: the room, and the round it plays first */}
        <div className="relative z-10 flex-1 flex items-center gap-3 py-3">
          {(lounge || room.room_icon) && (
            <img
              src={lounge?.icon ?? room.room_icon!}
              alt=""
              className="w-14 h-14 object-contain drop-shadow-lg shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-white text-lg leading-tight line-clamp-2 drop-shadow-md">
              {room.room_name || t("extra.gameRoomDefault")}
            </h3>
            <p className="text-white/70 text-sm truncate mt-0.5">
              {lounge ? t(lounge.labelKey) : t("extra.publicRoomLabel")}
            </p>
          </div>
        </div>

        {/* Bottom: the first round on the left, the way in on the right */}
        <div className="relative z-10 bg-white/15 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {room.first_category_icon ? (
              <DynamicIcon slug={room.first_category_icon} className="w-5 h-5 shrink-0" />
            ) : (
              <Globe className="w-4 h-4 text-white/80 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide leading-none">
                {t("extra.firstRoundLabel")}
              </p>
              <p className="text-white text-sm font-semibold truncate leading-tight">
                {category || t("extra.roomNoCategoryYet")}
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
      </GradientBackground>
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
  const [busyId, setBusyId] = useState<string | null>(null);

  const rooms = filterPublicRooms(data ?? [], filter, searchQuery);

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
    <div className="px-4 pt-3 pb-6 space-y-3">
      {rooms.map((room, i) => (
        <PublicRoomCard
          key={room.id}
          room={room}
          index={i}
          onAsk={(r) => void ask(r)}
          busy={busyId === room.id}
        />
      ))}
    </div>
  );
}
