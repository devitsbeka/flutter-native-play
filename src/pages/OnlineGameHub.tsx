import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/contexts/FriendsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/lib/toast";
import { getRandomGradient } from "@/config/roomGradients";
import iconSearch from "@/assets/online-game/imgIcon.svg";
import iconBell from "@/assets/online-game/imgIcon1.svg";
import iconAddFriend from "@/assets/online-game/imgIcon2.svg";
import iconPlay from "@/assets/online-game/imgIcon3.svg";
import iconPerson from "@/assets/online-game/imgIcon4.svg";
import iconPeople from "@/assets/online-game/imgIcon5.svg";
import iconBack from "@/assets/online-game/imgIcon6.svg";
import iconPlusBold from "@/assets/online-game/imgGroup2131327621.svg";
import crownPng from "@/assets/online-game/imgImage9.png";
import mascotShip from "@/assets/online-game/imgImage10.png";
import mascotBig from "@/assets/online-game/imgImage765.png";
import mascotA from "@/assets/online-game/imgContainer.png";
import mascotB from "@/assets/online-game/imgContainer1.png";
import mascotC from "@/assets/online-game/imgImage11.png";
import mascotD from "@/assets/online-game/imgImage12.png";

/**
 * The "Online Game" hub — implemented by direct extraction from the Figma
 * frames 940:6983 (King lobby) and 938:5472 (Team Battle lobby), which carry
 * the identical design; this one page serves both, parameterized by
 * /lobby/:gameType. Class strings, gradients, shadows and assets come from
 * the extraction (src/assets/online-game/*); the data underneath is live:
 * real friends in the stories strip, real rooms of the requested game type
 * in the grid, Play for rooms you're in, Join for rooms you're not.
 */

const MASCOTS = [mascotShip, mascotA, mascotB, mascotC, mascotD, mascotBig];

// The card backgrounds, byte-identical to the design's own SVG encoding:
// same viewBox, same radialGradient transform, per-card stop sets.
const GRADIENT_STOPS: [string, string][][] = [
  [["rgba(0,50,80,1)", "0"], ["rgba(0,75,105,1)", "0.125"], ["rgba(0,100,130,1)", "0.25"], ["rgba(0,150,180,1)", "0.5"], ["rgba(13,156,185,1)", "0.53125"], ["rgba(25,163,190,1)", "0.5625"], ["rgba(50,175,200,1)", "0.625"], ["rgba(75,188,210,1)", "0.6875"], ["rgba(100,200,220,1)", "0.75"], ["rgba(140,215,230,1)", "0.875"], ["rgba(180,230,240,1)", "1"]],
  [["rgba(20,60,30,1)", "0"], ["rgba(40,100,50,1)", "0.3"], ["rgba(60,125,65,1)", "0.45"], ["rgba(80,150,80,1)", "0.6"], ["rgba(115,175,100,1)", "0.725"], ["rgba(150,200,120,1)", "0.85"], ["rgba(200,230,180,1)", "1"]],
  [["rgba(10,0,30,1)", "0"], ["rgba(30,10,55,1)", "0.125"], ["rgba(50,20,80,1)", "0.25"], ["rgba(75,35,115,1)", "0.375"], ["rgba(100,50,150,1)", "0.5"], ["rgba(140,75,175,1)", "0.625"], ["rgba(180,100,200,1)", "0.75"], ["rgba(200,140,228,1)", "0.875"], ["rgba(220,180,255,1)", "1"]],
  [["rgba(80,40,20,1)", "0"], ["rgba(130,70,35,1)", "0.15"], ["rgba(180,100,50,1)", "0.3"], ["rgba(210,140,75,1)", "0.45"], ["rgba(240,180,100,1)", "0.6"], ["rgba(248,200,140,1)", "0.725"], ["rgba(255,220,180,1)", "0.85"], ["rgba(255,245,230,1)", "1"]],
  [["rgba(30,0,0,1)", "0"], ["rgba(65,10,0,1)", "0.125"], ["rgba(100,20,0,1)", "0.25"], ["rgba(150,40,10,1)", "0.375"], ["rgba(200,60,20,1)", "0.5"], ["rgba(228,90,35,1)", "0.625"], ["rgba(255,120,50,1)", "0.75"], ["rgba(255,160,75,1)", "0.875"], ["rgba(255,200,100,1)", "1"]],
  [["rgba(40,60,80,1)", "0"], ["rgba(60,90,115,1)", "0.15"], ["rgba(80,120,150,1)", "0.3"], ["rgba(115,150,175,1)", "0.45"], ["rgba(150,180,200,1)", "0.6"], ["rgba(200,220,235,1)", "0.85"], ["rgba(240,248,255,1)", "1"]],
  [["rgba(60,40,80,1)", "0"], ["rgba(90,60,110,1)", "0.15"], ["rgba(120,80,140,1)", "0.3"], ["rgba(150,110,170,1)", "0.45"], ["rgba(180,140,200,1)", "0.6"], ["rgba(220,200,240,1)", "0.85"], ["rgba(250,240,255,1)", "1"]],
];

function gradientUri(stops: [string, string][]): string {
  const stopTags = stops
    .map(([c, o]) => `<stop stop-color='${c}' offset='${o}'/>`)
    .join("");
  return `url("data:image/svg+xml;utf8,<svg viewBox='0 0 468 322.76' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -40.345 -58.5 0 234 325.99)'>${stopTags}</radialGradient></defs></svg>")`;
}

const hashIndex = (id: string, mod: number) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
};

function timeAgoShort(iso: string | null): { label: string; fresh: boolean } {
  if (!iso) return { label: "—", fresh: false };
  const mins = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return { label: `${mins}m ago`, fresh: true };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { label: `${hours}h ago`, fresh: true };
  const days = Math.floor(hours / 24);
  if (days < 7) return { label: `${days}d ago`, fresh: false };
  return { label: `${Math.floor(days / 7)}w ago`, fresh: false };
}

type Room = Tables<"game_rooms">;
type Participant = Tables<"room_participants">;

const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

// The 3px ring + soft drop the design puts on every cluster avatar.
const ringShadow = (online: boolean) =>
  `0px 0px 0px 1px rgba(0,0,0,0), 0px 0px 0px 3px ${online ? "#22c55e" : "rgba(148,163,184,0.7)"}, 0px 4px 6px -1px rgba(10,13,18,0.1), 0px 2px 4px -2px rgba(10,13,18,0.06)`;

function ClusterAvatar({ p, left, top, crowned }: { p: Participant; left: number; top: number; crowned: boolean }) {
  const online = p.status === "joined" || p.status === "ready" || p.status === "playing";
  return (
    <div className="absolute flex flex-col items-start" style={{ left, top }}>
      <div
        className="bg-[rgba(255,255,255,0.2)] flex flex-col items-start overflow-clip relative rounded-[9999px] shrink-0 size-[32px]"
        style={{ boxShadow: ringShadow(online) }}
      >
        {p.avatar_url ? (
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={p.avatar_url} loading="lazy" />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundImage: "linear-gradient(135deg, rgb(168,85,247) 0%, rgb(236,72,153) 100%)" }}
          >
            <p className="font-[Nunito] font-bold text-[13px] text-white">{p.nickname?.charAt(0)?.toUpperCase()}</p>
          </div>
        )}
      </div>
      {crowned && (
        <div className="absolute left-[-4px] top-[-8px] size-[14px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.06)]">
          <img alt="" className="absolute max-w-none object-contain size-full" src={crownPng} />
        </div>
      )}
    </div>
  );
}

function RoomCard({
  room,
  participants,
  isMember,
  onPlay,
  onJoin,
}: {
  room: Room;
  participants: Participant[];
  isMember: boolean;
  onPlay: () => void;
  onJoin: () => void;
}) {
  const { t } = useLanguage();
  const gradient = gradientUri(GRADIENT_STOPS[hashIndex(room.id, GRADIENT_STOPS.length)]);
  const mascot = MASCOTS[hashIndex(room.id, MASCOTS.length)];
  const ago = timeAgoShort(room.last_activity_at ?? room.created_at);
  const host = participants.find((p) => p.is_host) ?? participants[0];
  const others = participants.filter((p) => p !== host);
  const shown = [host, ...others.slice(0, 3)].filter(Boolean) as Participant[];
  const overflow = participants.length - shown.length;
  const clusterWidth = 8 + shown.length * 24 + (overflow > 0 ? 24 : 0);

  return (
    <div className="flex flex-col items-start w-full">
      <div className="flex flex-col h-[322.758px] items-start overflow-clip relative rounded-[20px] shadow-[0px_4px_0px_0px_#e5e7eb,0px_6px_20px_-4px_rgba(0,0,0,0.1)] shrink-0 w-full">
        <div className="flex flex-col h-[322.758px] items-start overflow-clip p-[12px] relative shrink-0 w-full" style={{ backgroundImage: gradient }}>
          {/* top row: freshness + player count pills */}
          <div className="flex items-start justify-between relative shrink-0 w-full">
            <div className="backdrop-blur-[4px] bg-[rgba(255,255,255,0.2)] flex gap-[6px] items-center px-[10px] py-[4px] relative rounded-[9999px] shrink-0">
              <div className={`${ago.fresh ? "bg-[#4ade80]" : "bg-[#fbbf24]"} opacity-60 relative rounded-[9999px] shrink-0 size-[6px]`} />
              <p className="font-[Nunito] font-bold leading-[16px] text-[12px] text-white tracking-[-0.16px] whitespace-nowrap">{ago.label}</p>
            </div>
            <div className="backdrop-blur-[4px] bg-[rgba(255,255,255,0.2)] flex gap-[6px] items-center px-[10px] py-[4px] relative rounded-[9999px] shrink-0">
              <div className="relative shrink-0 size-[14px]">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={iconPerson} />
              </div>
              <p className="font-[Nunito] font-bold leading-[16px] text-[12px] text-white tracking-[-0.16px] whitespace-nowrap">{participants.length}</p>
            </div>
          </div>

          {/* middle: mascot + name + category */}
          <div className="flex flex-1 flex-col items-start justify-center min-h-px py-[12px] relative w-full">
            <div className="flex gap-[12px] items-center relative shrink-0 w-full">
              <div className="relative shadow-[0px_10px_16px_0px_rgba(0,0,0,0.04),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 size-[56px]">
                <img alt="" className="absolute max-w-none object-contain size-full" src={mascot} loading="lazy" />
              </div>
              <div className="flex flex-1 flex-col items-start min-w-px relative">
                <div className="flex flex-col h-[22.5px] items-start overflow-clip relative shrink-0 w-full">
                  <p className="leading-[22.5px] not-italic text-[18px] text-white tracking-[-0.16px] whitespace-nowrap" style={{ fontFamily: "'TASolivare', sans-serif" }}>
                    {room.room_name || `Room #${room.room_code}`}
                  </p>
                </div>
                {room.category_name && (
                  <div className="flex flex-col h-[22px] items-start overflow-clip pt-[2px] relative shrink-0 w-full">
                    <p className="font-[Nunito] font-normal leading-[20px] text-[14px] text-[rgba(255,255,255,0.7)] tracking-[-0.16px] whitespace-nowrap">
                      {room.category_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* bottom glass bar: avatar cluster + CTA */}
          <div className="backdrop-blur-[12px] bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.2)] border-solid flex h-[54px] items-center justify-between px-[12px] py-[10px] relative rounded-[16px] shrink-0 w-full">
            <div className="relative h-[32px] shrink-0" style={{ width: clusterWidth + 24 }}>
              {shown.map((p, i) => (
                <ClusterAvatar key={p.user_id} p={p} left={4 + i * 24} top={4} crowned={i === 0} />
              ))}
              {overflow > 0 && (
                <div
                  className="absolute backdrop-blur-[4px] bg-[rgba(255,255,255,0.3)] border-2 border-[rgba(255,255,255,0.4)] border-solid flex items-center justify-center rounded-[9999px] shadow-[0px_4px_6px_0px_rgba(10,13,18,0.1),0px_2px_4px_0px_rgba(10,13,18,0.06)] size-[32px]"
                  style={{ left: 4 + shown.length * 24, top: 4 }}
                >
                  <p className="font-[Nunito] font-bold leading-[15px] text-[10px] text-white tracking-[-0.16px] whitespace-nowrap">+{overflow}</p>
                </div>
              )}
            </div>
            {isMember ? (
              <button
                onClick={onPlay}
                className="backdrop-blur-[12px] bg-[rgba(255,255,255,0.7)] flex gap-[6px] items-center px-[12px] py-[6px] relative rounded-[12px] shadow-[0px_4px_6px_0px_rgba(10,13,18,0.1),0px_2px_4px_0px_rgba(10,13,18,0.06)] shrink-0 active:scale-95 transition-transform"
              >
                <div className="relative shrink-0 size-[14px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={iconPlay} />
                </div>
                <p className="font-[Nunito] font-extrabold leading-[20px] text-[#2e1065] text-[14px] text-center tracking-[-0.16px] whitespace-nowrap">
                  {t("onlineGame.play")}
                </p>
              </button>
            ) : (
              <button
                onClick={onJoin}
                className="backdrop-blur-[12px] bg-[rgba(255,255,255,0.7)] flex gap-[6px] items-center px-[12px] py-[6px] relative rounded-[12px] shadow-[0px_4px_6px_0px_rgba(10,13,18,0.1),0px_2px_4px_0px_rgba(10,13,18,0.06)] shrink-0 active:scale-95 transition-transform"
              >
                <div className="bg-[#10b981] relative rounded-[9999px] shrink-0 size-[6px]" />
                <p className="font-[Nunito] font-extrabold leading-[20px] text-[#2e1065] text-[14px] text-center tracking-[-0.16px] whitespace-nowrap">
                  {t("onlineGame.join")}
                </p>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnlineGameHub() {
  const navigate = useNavigate();
  const { gameType = "team_battle" } = useParams();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { friends, refreshFriendsIfStale } = useFriends();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [participantsByRoom, setParticipantsByRoom] = useState<Map<string, Participant[]>>(new Map());
  const [creating, setCreating] = useState(false);

  useEffect(() => refreshFriendsIfStale(), [refreshFriendsIfStale]);

  const loadRooms = useCallback(async () => {
    const { data: roomRows } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("game_type_key", gameType)
      .neq("status", "cancelled")
      .or("is_archived.is.null,is_archived.eq.false")
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(12);
    const list = roomRows ?? [];
    setRooms(list);
    if (list.length === 0) {
      setParticipantsByRoom(new Map());
      return;
    }
    const { data: partRows } = await supabase
      .from("room_participants")
      .select("*")
      .in("room_id", list.map((r) => r.id));
    const map = new Map<string, Participant[]>();
    (partRows ?? []).forEach((p) => {
      const arr = map.get(p.room_id) ?? [];
      arr.push(p);
      map.set(p.room_id, arr);
    });
    setParticipantsByRoom(map);
  }, [gameType]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const enterRoom = useCallback(
    (room: Room) => {
      if (gameType === "team_battle") navigate(`/team-battle?code=${room.room_code}`);
      else navigate("/king");
    },
    [gameType, navigate],
  );

  const joinRoom = useCallback(
    async (room: Room) => {
      if (!user) return;
      if (room.status === "playing" && gameType === "team_battle") {
        toast.error(t("teamBattle.matchInProgress"));
        return;
      }
      await supabase.from("room_participants").insert({
        room_id: room.id,
        user_id: user.id,
        nickname: profile?.nickname || "Player",
        avatar_url: profile?.avatar_url,
        country_code: profile?.country_code,
        is_host: false,
        status: "joined",
      });
      enterRoom(room);
    },
    [user, profile, gameType, enterRoom, t],
  );

  const createRoom = useCallback(async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      let room: Room | null = null;
      let error: { code?: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase
          .from("game_rooms")
          .insert({
            host_user_id: user.id,
            room_code: generateRoomCode(),
            status: "waiting",
            game_type_key: gameType,
            game_mode: gameType,
            min_players: gameType === "king" ? 1 : 2,
            max_players: 10,
            background_gradient: getRandomGradient(),
            is_permanent: true,
            last_activity_at: new Date().toISOString(),
          })
          .select()
          .single();
        error = res.error;
        room = res.data ?? null;
        if (!error || error.code !== "23505") break;
      }
      if (error || !room) throw error ?? new Error("no room");
      await supabase.from("room_participants").insert({
        room_id: room.id,
        user_id: user.id,
        nickname: profile?.nickname || "Player",
        avatar_url: profile?.avatar_url,
        country_code: profile?.country_code,
        is_host: true,
        status: "joined",
        ...(gameType === "team_battle" ? { team: "a" } : {}),
      });
      enterRoom(room);
    } catch (e) {
      console.error("[OnlineGameHub] create failed", e);
      toast.error(t("teamBattle.createFailed"));
    } finally {
      setCreating(false);
    }
  }, [user, profile, gameType, creating, enterRoom, t]);

  const onlineFirst = useMemo(
    () => [...friends].sort((a, b) => Number(b.isOnline ?? false) - Number(a.isOnline ?? false)),
    [friends],
  );

  const storyRing = (online: boolean) =>
    online
      ? "linear-gradient(135deg, rgb(147, 51, 234) 0%, rgb(236, 72, 153) 50%, rgb(249, 115, 22) 100%)"
      : "linear-gradient(135deg, rgb(148, 163, 184) 0%, rgb(203, 213, 225) 100%)";

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-[#fbfaf8]">
      <div className="flex flex-col items-start relative mx-auto w-full max-w-[500px] pb-[96px]">
        {/* ── sticky header: title + actions, friends stories ─────────────── */}
        <div className="sticky top-0 z-20 backdrop-blur-[12px] bg-[rgba(251,250,248,0.95)] border-[rgba(229,231,235,0.3)] border-b border-solid flex flex-col items-start relative shrink-0 w-full">
          <div className="bg-[#fbfaf8] border-[rgba(229,231,235,0.3)] border-b border-solid flex flex-col items-start relative shrink-0 w-full">
            <div className="flex h-[76px] items-center justify-between px-[16px] relative shrink-0 w-full">
              <p className="leading-[28px] not-italic text-[#1e293b] text-[20px] tracking-[0.5px] uppercase whitespace-nowrap" style={{ fontFamily: "'TASolivare', sans-serif" }}>
                {t("onlineGame.title")}
              </p>
              <div className="flex gap-[4px] items-center relative shrink-0">
                <button onClick={() => navigate("/discover")} className="flex flex-col items-start justify-center p-[8px] relative rounded-[9999px] shrink-0">
                  <div className="relative shrink-0 size-[20px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={iconSearch} />
                  </div>
                </button>
                <button onClick={() => navigate("/notifications")} className="flex items-center justify-center relative rounded-[9999px] shrink-0 size-[40px]">
                  <div className="relative shrink-0 size-[20px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={iconBell} />
                  </div>
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col h-[108px] items-start overflow-x-auto overflow-y-clip scrollbar-hide px-[16px] relative shrink-0 w-full">
            <div className="flex gap-[16px] items-start pb-[12px] pr-[16px] pt-[8px] relative shrink-0">
              <button onClick={() => navigate("/team")} className="flex flex-col gap-[8px] items-center relative shrink-0">
                <div className="border-2 border-[#c084fc] border-dashed flex items-center justify-center min-h-[64px] min-w-[64px] relative rounded-[9999px] shrink-0 size-[64px]" style={{ backgroundImage: "linear-gradient(135deg, rgb(243, 232, 255) 0%, rgb(233, 213, 255) 100%)" }}>
                  <div className="relative shrink-0 size-[24px]">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={iconAddFriend} />
                  </div>
                </div>
                <p className="font-[Nunito] font-medium leading-[16px] text-[#475569] text-[12px] text-center tracking-[-0.16px] whitespace-nowrap">
                  {t("onlineGame.add")}
                </p>
              </button>

              {[{ id: "you", nickname: t("onlineGame.you"), avatarUrl: profile?.avatar_url ?? null, isOnline: true },
                ...onlineFirst.map((f) => ({ id: f.friendId, nickname: f.nickname, avatarUrl: f.avatarUrl, isOnline: !!f.isOnline }))].map((entry) => (
                <div key={entry.id} className="flex flex-col gap-[8px] items-center relative shrink-0">
                  <div className="relative shrink-0 size-[64px]">
                    <div className="absolute flex flex-col items-start left-0 p-[3px] rounded-[9999px] top-0" style={{ backgroundImage: storyRing(entry.isOnline) }}>
                      <div className="bg-white flex flex-col items-start p-[2px] relative rounded-[9999px] shrink-0 w-[58px]">
                        <div className="h-[54px] overflow-clip relative rounded-[9999px] shrink-0 w-full">
                          {entry.avatarUrl ? (
                            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[9999px] size-[54px]" src={entry.avatarUrl} loading="lazy" />
                          ) : (
                            <div className="absolute flex items-center justify-center rounded-[9999px] size-[54px]" style={{ backgroundImage: "linear-gradient(135deg, rgb(168, 85, 247) 0%, rgb(236, 72, 153) 100%)" }}>
                              <p className="font-[Nunito] font-bold leading-[24px] text-[16px] text-white tracking-[-0.16px]">{entry.nickname.charAt(0).toUpperCase()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`absolute border-2 border-solid border-white left-[48px] rounded-[9999px] size-[16px] top-[48px] ${entry.isOnline ? "bg-[#22c55e] shadow-[0px_0px_8px_0px_rgba(34,197,94,0.6)]" : "bg-[#94a3b8]"}`} />
                  </div>
                  <p className={`font-[Nunito] ${entry.id === "you" ? "font-semibold" : "font-medium"} leading-[16px] max-w-[64px] overflow-hidden text-ellipsis text-[#334155] text-[12px] text-center tracking-[-0.16px] whitespace-nowrap`}>
                    {entry.nickname}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── tabs + filter bar ────────────────────────────────────────────── */}
        <div className="backdrop-blur-[12px] bg-[rgba(251,250,248,0.95)] flex flex-col items-start shrink-0 w-full sticky top-[184px] z-10">
          <div className="flex flex-col items-start pb-[8px] pt-[12px] px-[16px] relative shrink-0 w-full">
            <div className="flex items-start p-[6px] relative rounded-[20px] shrink-0 w-full">
              <div aria-hidden className="absolute bg-[#f3f4f6] inset-0 pointer-events-none rounded-[20px]" />
              <div className="flex-1 relative rounded-[16px]">
                <div className="bg-white flex h-[35.5px] items-center justify-center rounded-[16px] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] w-full relative">
                  <p className="font-[Nunito] font-semibold leading-[19.5px] text-[#0f1729] text-[13px] text-center tracking-[-0.16px] whitespace-nowrap">
                    {t("onlineGame.roomsTab")}
                  </p>
                </div>
              </div>
              <button onClick={() => navigate("/team")} className="flex flex-1 items-center justify-center p-[8px] relative rounded-[16px] self-stretch">
                <p className="font-[Nunito] font-semibold leading-[19.5px] text-[#6b7280] text-[13px] text-center tracking-[-0.16px] whitespace-nowrap">
                  {t("onlineGame.myTriviaTab")}
                </p>
              </button>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]" />
            </div>
          </div>
          <div className="border-[rgba(229,231,235,0.5)] border-b border-solid flex flex-col items-start relative shrink-0 w-full">
            <div className="flex gap-[6px] h-[54px] items-center px-[16px] py-[8px] relative shrink-0 w-full">
              <button onClick={() => navigate(-1)} className="bg-[rgba(255,255,255,0.8)] border border-[rgba(229,231,235,0.3)] border-solid flex items-center justify-center relative rounded-[9999px] shrink-0 size-[36px]">
                <div className="relative shrink-0 size-[16px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={iconBack} />
                </div>
              </button>
              <div className="bg-[rgba(255,255,255,0.8)] border border-[rgba(229,231,235,0.3)] border-solid flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[9999px] shrink-0">
                <div className="relative shrink-0 size-[16px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={iconPeople} />
                </div>
                <p className="font-[Nunito] font-semibold text-[13px] text-[#334155] leading-[20px]">{rooms.length}</p>
              </div>
              <div className="flex-1 min-w-px" />
              <button
                onClick={() => void createRoom()}
                disabled={creating}
                className="bg-[#8858d5] drop-shadow-[0px_1px_1.5px_rgba(10,13,18,0.1),0px_1px_1px_rgba(10,13,18,0.1)] flex gap-[6px] items-center px-[12px] py-[8px] relative rounded-[9999px] shrink-0 active:scale-95 transition-transform disabled:opacity-60"
              >
                <div className="relative shrink-0 size-[14px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={iconPlusBold} />
                </div>
                <p className="font-[Nunito] font-bold leading-[20px] text-[14px] text-white tracking-[-0.16px] whitespace-nowrap">
                  {t("onlineGame.create")}
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* ── rooms grid ───────────────────────────────────────────────────── */}
        <div className="flex flex-col items-start p-[16px] relative w-full">
          <div className="flex flex-col gap-[12px] pb-[16px] relative shrink-0 w-full">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                participants={participantsByRoom.get(room.id) ?? []}
                isMember={(participantsByRoom.get(room.id) ?? []).some((p) => p.user_id === user?.id)}
                onPlay={() => enterRoom(room)}
                onJoin={() => void joinRoom(room)}
              />
            ))}
            {rooms.length === 0 && (
              <p className="font-[Nunito] text-[#6b7280] text-[14px] w-full text-center py-10">
                {t("onlineGame.empty")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
