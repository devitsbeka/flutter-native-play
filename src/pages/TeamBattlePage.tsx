import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, ChevronLeft, Plus } from "lucide-react";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import {
  TeamBattleProvider,
  useTeamBattle,
  type TBTeam,
} from "@/contexts/TeamBattleContext";
import { TeamBattleMatch } from "@/components/team-battle/TeamBattleMatch";
import { useCategories } from "@/hooks/useCategories";
import {
  AnimatedCoinPill,
  FriendPeek,
  type InviteEntry,
  LILAC_BG,
  LilacHeader,
  FitBox,
  PlusSeat,
  Seat,
  SeatMenu,
  type SeatMenuAction,
  StartButton,
} from "@/components/lobby/LilacLobby";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import sceneArena from "@/assets/tb-lobby/scene-arena.webp";
import teamPenguins from "@/assets/tb-lobby/team-penguins.png";
import teamFormula from "@/assets/tb-lobby/team-formula.png";

/**
 * /team-battle — the Team Battle flow (docs/GAME_TYPES_DESIGN.md §2), its own
 * page the way /tv is: entry (create or join by code) → team lobby → the
 * server-driven match phases in TeamBattleMatch. Entry and match live on the
 * game screens' periwinkle; the lobby wears the room's jewel gradient like
 * RoomLobbyV2 does.
 */
export default function TeamBattlePage() {
  return (
    <TeamBattleProvider>
      <TeamBattleInner />
    </TeamBattleProvider>
  );
}

function TeamBattleInner() {
  const { user } = useAuth();
  const { room, state, joinRoom } = useTeamBattle();
  const [params] = useSearchParams();
  // Settling flips the room back to "waiting" within a round-trip; the
  // result screen stays up until the player dismisses it, or it would be an
  // unreadable flash on the way back to the lobby.
  const [resultSeen, setResultSeen] = useState(false);

  useEffect(() => {
    if (state?.phase !== "done") setResultSeen(false);
  }, [state?.phase, state?.game_id]);

  // /team-battle?code=ABC123 joins straight into the lobby (shared links,
  // and the round-start watcher pulling a wandering teammate in).
  useEffect(() => {
    const code = params.get("code");
    if (code && !room && user) void joinRoom(code);
  }, [params, room, user, joinRoom]);

  const inMatch =
    room &&
    state &&
    ((room.status === "playing" && !state.settled) ||
      (state.phase === "done" && !resultSeen));

  if (inMatch) return <TeamBattleMatch onResultDismiss={() => setResultSeen(true)} />;
  if (room) return <TBLobby />;
  return <TBGate joining={!!params.get("code")} />;
}

/**
 * There is no entry step in the design — arriving here without a room means
 * one gets created for you (or joined, when a ?code is in the URL) and the
 * arena lobby opens. This gate is just the lilac wash while that happens,
 * with a retry if the round-trip fails.
 */
function TBGate({ joining }: { joining: boolean }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { createRoom } = useTeamBattle();
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (joining || !user || attempted.current) return;
    attempted.current = true;
    void createRoom().then((created) => {
      if (!created) setFailed(true);
      // The room's code goes into the URL so a refresh rejoins this room
      // instead of minting a new one.
      else navigate(`/team-battle?code=${created.room_code}`, { replace: true });
    });
  }, [joining, user, createRoom, navigate]);

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden safe-bleed relative flex flex-col items-center justify-center gap-6"
      style={{ background: LILAC_BG }}
    >
      <button
        onClick={() => navigate(-1)}
        aria-label={t("common.back")}
        className="absolute left-5 top-[calc(var(--safe-top)_+_1rem)] w-10 h-10 flex items-center justify-center rounded-full bg-white/40"
      >
        <ChevronLeft className="w-5 h-5 text-[#523b76]" />
      </button>
      <p
        className="text-[26px] text-[#523b76]"
        style={{ fontFamily: "'TASolivare', sans-serif" }}
      >
        {t("teamBattle.title")}
      </p>
      {failed ? (
        <ChunkyButton
          variant="white"
          size="lg"
          onClick={() => {
            setFailed(false);
            attempted.current = false;
            void createRoom().then((created) => {
              if (!created) setFailed(true);
              else navigate(`/team-battle?code=${created.room_code}`, { replace: true });
            });
          }}
        >
          {t("common.retry")}
        </ChunkyButton>
      ) : (
        <motion.div
          className="w-8 h-8 rounded-full border-[3px] border-[#8858d5]/30 border-t-[#8858d5]"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}

// Seat slots per team, straight from the frame (943:21930): four avatar
// spots and one empty podium per side. Team A wears the blue ring, Team B
// the red one, exactly as the design's borders say.
const TEAM_A_SLOTS: [number, number][] = [
  [91, 431], [30, 457], [23, 517], [82, 546],
];
const TEAM_B_SLOTS: [number, number][] = [
  [356, 431], [407, 457], [431, 514], [376, 546],
];
const PODIUM_A: [number, number] = [151, 572];
const PODIUM_B: [number, number] = [302, 572];

// The arena scene's edge fade (938:6267 overlay).
const ARENA_FADE =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 435 780' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(1.3318e-15 39 -21.75 2.3881e-15 217.5 390)'><stop stop-color='rgba(255,255,255,0)' offset='0'/><stop stop-color='rgba(245,217,255,1)' offset='1'/></radialGradient></defs></svg>\")";

// Server rule: tiles even, ≥ 2×team size, ≤ 12 — these are the valid picks.
const DURATIONS = [6, 10, 12];

function TBLobby() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    room, participants, pendingInvites, isHost, myTeam, setTeam, addBot,
    setCaptain, manageSeat, startMatch, leaveRoom, loading, state, settle,
  } = useTeamBattle();
  const { categories } = useCategories();
  const [rounds, setRounds] = useState(6);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [peek, setPeek] = useState<InviteEntry | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [params, setParams] = useSearchParams();

  // Keep the room's code in the URL: refresh, share, and the round-start
  // watcher all address this exact room by it.
  useEffect(() => {
    if (room && params.get("code") !== room.room_code) {
      setParams({ code: room.room_code }, { replace: true });
    }
  }, [room, params, setParams]);

  // A finished match parks the room back at "waiting" with a done state row;
  // the settle claim is idempotent, so any device landing here fires it.
  useEffect(() => {
    if (state?.phase === "done" && !state.settled) void settle();
  }, [state?.phase, state?.settled, settle]);

  const teamOf = (team: TBTeam) => participants.filter((p) => p.team === team);
  const teamA = teamOf("a");
  const teamB = teamOf("b");
  const teamsEqual =
    teamA.length > 0 && teamA.length === teamB.length && participants.every((p) => p.team);
  const minTiles = Math.max(6, 2 * teamA.length);
  // What the winning team will actually take home: 50 coins per round for
  // each winning HUMAN (bots are never paid — the pot doesn't move for them).
  const humansA = teamA.filter((p) => !p.is_bot).length;
  const humansB = teamB.filter((p) => !p.is_bot).length;
  const potValue = 50 * rounds * Math.max(1, humansA, humansB);

  const start = () => {
    const usable = categories.filter((c) => c.tier === "free" || c.tier === "standard");
    void startMatch(usable.map((c) => ({ uuid: c.uuid, name: c.name })), rounds);
  };

  // The team the last-pressed + seat belonged to: peek invites carry it
  // directly, and a modal invite gets moved onto it right after it lands
  // (the modal itself cannot write a team).
  const inviteTeamRef = useRef<TBTeam | null>(null);

  // The peek's Invite button sends the real room invite — the same
  // invited-participant row the invite modal writes, whose DB trigger
  // delivers the notification. The invitee holds the tapped seat greyed
  // until they accept.
  const inviteToGame = async (entry: InviteEntry) => {
    if (!room) return;
    const { data: existing } = await supabase
      .from("room_participants")
      .select("id")
      .eq("room_id", room.id)
      .eq("user_id", entry.id)
      .maybeSingle();
    if (existing) {
      setInvitedIds((prev) => new Set([...prev, entry.id]));
      return;
    }
    const { error } = await supabase.from("room_participants").insert({
      room_id: room.id,
      user_id: entry.id,
      status: "invited",
      nickname: entry.nickname,
      avatar_url: entry.avatarUrl,
      is_host: false,
      ...(inviteTeamRef.current ? { team: inviteTeamRef.current } : {}),
    });
    if (error) {
      console.error("[TB] invite failed", error);
      toast.error(t("extra.inviteFailed"));
      return;
    }
    setInvitedIds((prev) => new Set([...prev, entry.id]));
    toast.success(t("extra.inviteSent"));
  };

  // A modal invite lands teamless; when it was launched from a + seat, park
  // the newest teamless invite on that seat's team.
  const assignPendingTeam = async () => {
    const team = inviteTeamRef.current;
    if (!team || !room) return;
    const { data } = await supabase
      .from("room_participants")
      .select("user_id")
      .eq("room_id", room.id)
      .eq("status", "invited")
      .is("team", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) void manageSeat(data.user_id, team === "a" ? "move_a" : "move_b");
  };

  // An open seat on the other team seats YOU there; one on your own team
  // opens the invite modal for that seat. AI players have their own labeled
  // button — a seat press never silently conjures a bot.
  const seatAction = (team: TBTeam) => {
    if (myTeam !== team) void setTeam(team);
    else {
      inviteTeamRef.current = team;
      setInviteOpen(true);
    }
  };

  // Hold a seat to manage it: the host moves anyone between teams or
  // removes them (pending invites and bots included); a player can switch
  // their own team.
  const [seatMenu, setSeatMenu] = useState<{ p: TBParticipant; pending: boolean } | null>(null);
  type TBParticipant = (typeof participants)[number];

  const seatMenuActions = (p: TBParticipant): SeatMenuAction[] => {
    const actions: SeatMenuAction[] = [];
    if (isHost) {
      if (p.team !== "a")
        actions.push({
          label: t("lobby.moveTo", { team: t("teamBattle.teamA") }),
          onPress: () => void manageSeat(p.user_id, "move_a"),
        });
      if (p.team !== "b")
        actions.push({
          label: t("lobby.moveTo", { team: t("teamBattle.teamB") }),
          onPress: () => void manageSeat(p.user_id, "move_b"),
        });
      if (p.user_id !== user?.id)
        actions.push({
          label: t("lobby.removeSeat"),
          destructive: true,
          onPress: () => void manageSeat(p.user_id, "remove"),
        });
    } else if (p.user_id === user?.id) {
      actions.push({
        label: t("lobby.switchTeam"),
        onPress: () => void setTeam(p.team === "a" ? "b" : "a"),
      });
    }
    return actions;
  };

  const seatTap = (p: TBParticipant, pending: boolean) => {
    if (pending || p.is_bot) {
      if (isHost) setSeatMenu({ p, pending });
    } else {
      navigate(`/profile/${p.user_id}`);
    }
  };
  const seatHold = (p: TBParticipant, pending: boolean) => {
    if (seatMenuActions(p).length > 0) setSeatMenu({ p, pending });
  };

  // Teamless pending invites still occupy a seat — the emptier side.
  const pendingA = pendingInvites.filter((p) => p.team === "a");
  const pendingB = pendingInvites.filter((p) => p.team === "b");
  pendingInvites
    .filter((p) => !p.team)
    .forEach((p) => {
      (teamA.length + pendingA.length <= teamB.length + pendingB.length ? pendingA : pendingB).push(p);
    });

  const renderTeamSeats = (
    team: TBTeam,
    slots: [number, number][],
    podium: [number, number],
  ) => {
    const entries = [
      ...teamOf(team).map((p) => ({ p, pending: false })),
      ...(team === "a" ? pendingA : pendingB).map((p) => ({ p, pending: true })),
    ];
    const ring = team === "a" ? ("blue" as const) : ("red" as const);
    const all: [number, number][] = [...slots, podium];
    return (
      <>
        {all.map(([left, top], i) => {
          const entry = entries[i];
          return entry ? (
            <Seat
              key={`${team}${i}`}
              left={left}
              top={top - 255}
              avatarUrl={entry.p.avatar_url}
              nickname={entry.p.nickname}
              ring={ring}
              pending={entry.pending}
              onClick={() => seatTap(entry.p, entry.pending)}
              onLongPress={() => seatHold(entry.p, entry.pending)}
            />
          ) : (
            <PlusSeat key={`${team}${i}`} left={left} top={top - 255} onClick={() => seatAction(team)} />
          );
        })}
      </>
    );
  };

  // The named captain (tb_set_captain), falling back to the first human so
  // the pill is never empty on a filled team.
  const captainOf = (members: typeof participants) =>
    members.find((p) => p.is_captain) ?? members.find((p) => !p.is_bot) ?? members[0];
  const captainA = captainOf(teamA);
  const captainB = captainOf(teamB);

  // Host taps a captain pill to hand the armband to the team's next member.
  const cycleCaptain = (members: typeof participants) => {
    if (!isHost || members.length === 0) return;
    const current = members.findIndex((p) => p.is_captain);
    const next = members[(current + 1) % members.length];
    void setCaptain(next.user_id);
  };

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden safe-bleed flex flex-col"
      style={{ background: LILAC_BG }}
    >
      <LilacHeader
        title={t("teamBattle.title")}
        onBack={() => {
          // Navigate away first so the gate never re-creates a room the
          // instant this one clears.
          navigate("/");
          void leaveRoom();
        }}
        onHelp={() => setHelpOpen((v) => !v)}
      />

      {/* the same friends reel the home page uses — identical sizes/fonts */}
      <div className="relative z-10 w-full shrink-0 px-4">
        <FriendsStoriesBar
          onAddFriendClick={() => setInviteOpen(true)}
          onFriendClick={(f) =>
            setPeek({ id: f.friendId, nickname: f.nickname, avatarUrl: f.avatarUrl, online: !!f.isOnline })
          }
        />
      </div>

      {/* Pick duration (940:7647 + chips) — in flow, left-aligned with the
          friends strip's 16px edge */}
      <div className="relative z-10 w-full max-w-[500px] mx-auto shrink-0 px-4 pt-1">
        <p className="font-[Nunito] font-medium leading-[24px] text-[#0c172c] text-[15px] tracking-[-0.16px]">
          {t("lobby.pickDuration")}
        </p>
        <div className="flex gap-[14px] pt-[10px]">
          {DURATIONS.map((n) => {
            const selected = rounds === n;
            const tooSmall = n < minTiles;
            return (
              <button
                key={n}
                onClick={() => !tooSmall && setRounds(n)}
                disabled={tooSmall}
                className={`relative h-[48px] w-[115px] rounded-[16.85px] border border-solid ${
                  selected
                    ? "border-[#e8e0f5] shadow-[0px_3.389px_0px_0px_#d8d0e8,0px_5.083px_13.556px_0px_rgba(0,0,0,0.1)]"
                    : "border-[#b897c4]"
                } ${tooSmall ? "opacity-30" : ""}`}
                style={{
                  background: selected
                    ? "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))"
                    : "rgba(255,255,255,0.2)",
                }}
              >
                <p
                  className={`font-[Nunito] font-black leading-[28.974px] text-[#334155] text-[18.629px] text-center tracking-[-0.1686px] whitespace-nowrap ${selected ? "" : "opacity-60"}`}
                >
                  {t("lobby.roundsN", { n })}
                </p>
                <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.695px_0px_0px_white]" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0">
      <FitBox width={500} height={575}>
        {/* arena scene (938:6267) + edge fade */}
        <div className="absolute left-[32px] top-[-89px] w-[435px] h-[780px] pointer-events-none">
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={sceneArena} />
          <div className="absolute inset-0" style={{ backgroundImage: ARENA_FADE }} />
        </div>

        {/* the pot (943:21933) — the winning team's real take: 50 coins a
            round to every winning human (tb_settle, 20260921130000) */}
        <AnimatedCoinPill left={158} top={242} width={190} value={potValue} />

        {renderTeamSeats("a", TEAM_A_SLOTS, PODIUM_A)}
        {renderTeamSeats("b", TEAM_B_SLOTS, PODIUM_B)}

        {/* team names row (943:21929), with the host's labeled AI-player buttons */}
        <div className="absolute left-[26px] top-[458px] w-[441px] flex items-center justify-between">
          <div className="flex gap-[10px] items-center">
            <img alt="" className="size-[36px] -scale-y-100 rotate-180 object-contain" src={teamPenguins} />
            <p className="font-[Nunito] font-black leading-[24px] text-[#0c172c] text-[18px] tracking-[-0.16px] whitespace-nowrap">
              {t("teamBattle.teamA")}
            </p>
            {isHost && teamA.length < 5 && (
              <button
                onClick={() => void addBot("a")}
                className="flex items-center gap-[4px] rounded-[9999px] border border-[#b897c4] bg-white/40 px-[8px] py-[3px] active:scale-95 transition-transform"
              >
                <Bot className="w-3.5 h-3.5 text-[#523b76]" />
                <Plus className="w-3 h-3 text-[#523b76]" />
              </button>
            )}
          </div>
          <div className="flex gap-[10px] items-center">
            {isHost && teamB.length < 5 && (
              <button
                onClick={() => void addBot("b")}
                className="flex items-center gap-[4px] rounded-[9999px] border border-[#b897c4] bg-white/40 px-[8px] py-[3px] active:scale-95 transition-transform"
              >
                <Plus className="w-3 h-3 text-[#523b76]" />
                <Bot className="w-3.5 h-3.5 text-[#523b76]" />
              </button>
            )}
            <p className="font-[Nunito] font-extrabold leading-[24px] text-[#0c172c] text-[18px] text-right tracking-[-0.16px] whitespace-nowrap">
              {t("teamBattle.teamB")}
            </p>
            <img alt="" className="size-[36px] -scale-y-100 rotate-180 object-contain" src={teamFormula} />
          </div>
        </div>

        {/* captains + VS (940:7751 / 936:21185 / 940:7825) */}
        <TBCaptainChip
          left={37}
          accent="#e7ba87"
          name={captainA?.nickname}
          avatarUrl={captainA?.avatar_url}
          onClick={() => cycleCaptain(teamA)}
        />
        <p
          className="absolute left-[191px] top-[519px] w-[118px] text-[77px] leading-[43px] text-center not-italic text-[#f5d9ff]"
          style={{ fontFamily: "'Slackey', 'TASolivare', cursive", textShadow: "0px 4px 4px #c7bccc" }}
        >
          VS
        </p>
        <TBCaptainChip
          right={33}
          accent="#ed6149"
          name={captainB?.nickname}
          avatarUrl={captainB?.avatar_url}
          onClick={() => cycleCaptain(teamB)}
        />

        {isHost && !teamsEqual && (
          <p className="absolute left-[33px] top-[433px] w-[434px] text-center font-[Nunito] font-medium text-[13px] text-[#523b76]/60">
            {t("teamBattle.needEqualTeams")}
          </p>
        )}

        {helpOpen && (
          <div
            className="absolute left-[32px] top-[20px] w-[435px] rounded-[24px] p-5 bg-white/95 border border-[#e8e0f5] z-10 shadow-[0px_8px_24px_0px_rgba(102,51,153,0.18)]"
            onClick={() => setHelpOpen(false)}
          >
            <p className="font-bold text-[#402666] mb-1">{t("teamBattle.title")}</p>
            <p className="text-sm text-[#402666]/70 leading-relaxed">{t("lobby.tbRules")}</p>
          </div>
        )}
      </FitBox>
      </div>

      {isHost ? (
        <StartButton
          label={loading ? t("teamBattle.starting") : t("lobby.startGame")}
          onClick={start}
          disabled={!teamsEqual || loading}
        />
      ) : (
        <p className="w-full max-w-[500px] mx-auto shrink-0 px-[24px] pt-[14px] pb-[20px] text-center font-[Nunito] font-semibold text-[15px] text-[#523b76]/70">
          {t("teamBattle.waitingHost")}
        </p>
      )}

      {room && (
        <InviteFriendsModal
          isOpen={inviteOpen}
          onClose={() => {
            setInviteOpen(false);
            inviteTeamRef.current = null;
          }}
          inviteLink={`https://mytrivia.io/team-battle?code=${room.room_code}`}
          roomId={room.id}
          roomCode={room.room_code}
          onInviteSuccess={() => void assignPendingTeam()}
        />
      )}

      <SeatMenu
        target={seatMenu ? { nickname: seatMenu.p.nickname, avatarUrl: seatMenu.p.avatar_url } : null}
        onClose={() => setSeatMenu(null)}
        actions={seatMenu ? seatMenuActions(seatMenu.p) : []}
      />

      <FriendPeek
        friend={peek}
        onClose={() => setPeek(null)}
        actionLabel={t("lobby.inviteToGame")}
        invitedLabel={t("lobby.invitedState")}
        invited={
          !!peek &&
          (invitedIds.has(peek.id) || participants.some((p) => p.user_id === peek.id))
        }
        onAction={() => peek && void inviteToGame(peek)}
      />
    </div>
  );
}

// The TB captain pill (940:7751): name on the left, round avatar docked
// right. Hugs its content — a short name makes a short pill.
function TBCaptainChip({
  left,
  right,
  accent,
  name,
  avatarUrl,
  onClick,
}: {
  left?: number;
  right?: number;
  accent: string;
  name?: string;
  avatarUrl?: string | null;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="absolute h-[50px] inline-flex items-center gap-[8px] pl-[14px] pr-[8px] max-w-[180px] rounded-[16.85px] border-[1.153px] border-solid shadow-[0px_3.389px_0px_0px_#d8d0e8,0px_5.083px_13.556px_0px_rgba(0,0,0,0.1)]"
      style={{
        left,
        right,
        top: 503,
        borderColor: accent,
        background: "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))",
      }}
    >
      <p className="font-[Nunito] font-black leading-[28.974px] text-[#334155] text-[16px] tracking-[-0.1686px] whitespace-nowrap overflow-hidden text-ellipsis">
        {name ?? "—"}
      </p>
      <div className="relative shrink-0 size-[33px] rounded-[9999px] overflow-clip bg-[rgba(192,192,192,0.24)]">
        {avatarUrl && (
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full rounded-[9999px]" src={avatarUrl} />
        )}
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.695px_0px_0px_white]" />
    </button>
  );
}
