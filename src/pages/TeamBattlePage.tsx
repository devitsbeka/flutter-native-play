import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Swords } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/contexts/FriendsContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import {
  TeamBattleProvider,
  useTeamBattle,
  type TBTeam,
} from "@/contexts/TeamBattleContext";
import { TeamBattleMatch } from "@/components/team-battle/TeamBattleMatch";
import { useCategories } from "@/hooks/useCategories";
import {
  CoinPill,
  Divider,
  InviteRow,
  LILAC_BG,
  LilacHeader,
  PlusSeat,
  ScaledCanvas,
  Seat,
  StartButton,
} from "@/components/lobby/LilacLobby";
import sceneArena from "@/assets/tb-lobby/scene-arena.png";
import podiumSeatA from "@/assets/tb-lobby/podium-seat-a.png";
import podiumSeatB from "@/assets/tb-lobby/podium-seat-b.png";
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
  return <TBEntry />;
}

function TBEntry() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { createRoom, joinRoom, loading } = useTeamBattle();
  const [code, setCode] = useState("");

  return (
    <div className="h-[100dvh] w-full overflow-hidden safe-bleed bg-[#7E7ADB] relative">
      {/* The VS-screen watermark treatment, with this mode's own mark */}
      <Swords
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] text-white/[0.05] pointer-events-none"
        aria-hidden
      />
      <div className="w-full h-full flex flex-col max-w-[520px] mx-auto relative px-6">
        <div className="flex items-center pt-[calc(var(--safe-top)_+_0.75rem)]">
          <button
            onClick={() => navigate(-1)}
            aria-label={t("common.back")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-8 pb-16">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-black text-white"
              style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
            >
              {t("teamBattle.title")}
            </motion.h1>
            <p className="text-white/70 text-sm mt-3 max-w-[300px] mx-auto">
              {t("teamBattle.entryHint")}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <ChunkyButton
              variant="white"
              size="xl"
              className="w-full"
              icon={<Swords className="w-5 h-5" />}
              disabled={loading}
              onClick={() => void createRoom()}
            >
              {t("teamBattle.createRoom")}
            </ChunkyButton>

            <div className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm p-2 pl-4 border border-white/[0.12]">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("teamBattle.codePlaceholder")}
                maxLength={6}
                className="flex-1 min-w-0 bg-transparent outline-none font-mono text-lg tracking-[0.3em] text-white placeholder:text-white/40"
              />
              <ChunkyButton
                variant="mint"
                size="md"
                disabled={code.length < 6 || loading}
                onClick={() => void joinRoom(code)}
              >
                {t("teamBattle.joinRoom")}
              </ChunkyButton>
            </div>
          </div>
        </div>
      </div>
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
  const { friends, refreshFriendsIfStale } = useFriends();
  const navigate = useNavigate();
  const {
    room, participants, isHost, myTeam, setTeam, addBot, removeBot,
    startMatch, leaveRoom, loading, state, settle,
  } = useTeamBattle();
  const { categories } = useCategories();
  const [rounds, setRounds] = useState(6);

  useEffect(() => refreshFriendsIfStale(), [refreshFriendsIfStale]);

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

  const copyCode = () => {
    void navigator.clipboard?.writeText(room?.room_code ?? "");
    toast.success(t("teamBattle.codeCopied"));
  };

  const start = () => {
    const usable = categories.filter((c) => c.tier === "free" || c.tier === "standard");
    void startMatch(usable.map((c) => ({ uuid: c.uuid, name: c.name })), rounds);
  };

  // A seat press does the useful thing: move yourself to that team, or (as
  // host, already on it) seat an AI player there.
  const seatAction = (team: TBTeam) => {
    if (myTeam !== team) void setTeam(team);
    else if (isHost) void addBot(team);
    else copyCode();
  };

  const memberAction = (p: (typeof participants)[number]) => {
    if (p.is_bot && isHost) void removeBot(p.user_id);
    else if (!p.is_bot) navigate(`/profile/${p.user_id}`);
  };

  const renderTeamSeats = (
    team: TBTeam,
    slots: [number, number][],
    podium: [number, number],
    podiumImg: string,
  ) => {
    const members = teamOf(team);
    const ring = team === "a" ? ("blue" as const) : ("red" as const);
    return (
      <>
        {slots.map(([left, top], i) => {
          const p = members[i];
          return p ? (
            <Seat
              key={`${team}${i}`}
              left={left}
              top={top}
              avatarUrl={p.avatar_url}
              nickname={p.nickname}
              ring={ring}
              onClick={() => memberAction(p)}
            />
          ) : (
            <PlusSeat key={`${team}${i}`} left={left} top={top} onClick={() => seatAction(team)} />
          );
        })}
        {members[4] ? (
          <Seat
            left={podium[0]}
            top={podium[1]}
            avatarUrl={members[4].avatar_url}
            nickname={members[4].nickname}
            ring={ring}
            onClick={() => memberAction(members[4])}
          />
        ) : (
          <button
            className="absolute size-[48px] -scale-y-100 rotate-180"
            style={{ left: podium[0], top: podium[1] }}
            onClick={() => seatAction(team)}
          >
            <img alt="" className="absolute inset-0 max-w-none size-full" src={podiumImg} />
          </button>
        )}
      </>
    );
  };

  const captainOf = (members: typeof participants) =>
    members.find((p) => !p.is_bot) ?? members[0];
  const captainA = captainOf(teamA);
  const captainB = captainOf(teamB);

  return (
    <div
      className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto overflow-x-hidden"
      style={{ background: LILAC_BG }}
    >
      <ScaledCanvas>
        {/* arena scene (938:6267) + edge fade */}
        <div className="absolute left-[32px] top-[166px] w-[435px] h-[780px] pointer-events-none">
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={sceneArena} />
          <div className="absolute inset-0" style={{ backgroundImage: ARENA_FADE }} />
        </div>

        <LilacHeader
          title={t("teamBattle.title")}
          onBack={() => void leaveRoom()}
          onHelp={copyCode}
        />

        <InviteRow
          top={94}
          inviteLabel={t("lobby.invite")}
          entries={friends.map((f) => ({
            id: f.friendId,
            nickname: f.nickname,
            avatarUrl: f.avatarUrl,
            online: !!f.isOnline,
          }))}
          onInvite={copyCode}
          onEntry={copyCode}
        />

        {/* Pick duration (940:7647 + chips 940:7648/936:21181/936:21183) */}
        <p className="absolute left-[39px] top-[216px] font-[Nunito] font-medium leading-[24px] text-[#0c172c] text-[15px] tracking-[-0.16px]">
          {t("lobby.pickDuration")}
        </p>
        {DURATIONS.map((n, i) => {
          const selected = rounds === n;
          const tooSmall = n < minTiles;
          return (
            <button
              key={n}
              onClick={() => !tooSmall && setRounds(n)}
              disabled={tooSmall}
              className={`absolute h-[48px] w-[115px] rounded-[16.85px] border border-solid ${
                selected
                  ? "border-[#e8e0f5] shadow-[0px_3.389px_0px_0px_#d8d0e8,0px_5.083px_13.556px_0px_rgba(0,0,0,0.1)]"
                  : "border-[#b897c4]"
              } ${tooSmall ? "opacity-30" : ""}`}
              style={{
                left: 39 + i * 130,
                top: 251,
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

        {/* the pot (943:21933) — what each winner is actually paid */}
        <CoinPill left={158} top={497} width={190} value="300" />

        {renderTeamSeats("a", TEAM_A_SLOTS, PODIUM_A, podiumSeatA)}
        {renderTeamSeats("b", TEAM_B_SLOTS, PODIUM_B, podiumSeatB)}

        {/* team names row (943:21929) */}
        <div className="absolute left-[26px] top-[713px] w-[441px] flex items-center justify-between">
          <div className="flex gap-[10px] items-center">
            <img alt="" className="size-[36px] -scale-y-100 rotate-180 object-contain" src={teamPenguins} />
            <p className="font-[Nunito] font-black leading-[24px] text-[#0c172c] text-[18px] tracking-[-0.16px] whitespace-nowrap">
              {t("teamBattle.teamA")}
            </p>
          </div>
          <div className="flex gap-[10px] items-center">
            <p className="font-[Nunito] font-extrabold leading-[24px] text-[#0c172c] text-[18px] text-right tracking-[-0.16px] whitespace-nowrap">
              {t("teamBattle.teamB")}
            </p>
            <img alt="" className="size-[36px] -scale-y-100 rotate-180 object-contain" src={teamFormula} />
          </div>
        </div>

        {/* captains + VS (940:7751 / 936:21185 / 940:7825) */}
        <TBCaptainChip left={37} accent="#e7ba87" name={captainA?.nickname} avatarUrl={captainA?.avatar_url} />
        <p
          className="absolute left-[191px] top-[774px] w-[118px] text-[77px] leading-[43px] text-center not-italic text-[#f5d9ff]"
          style={{ fontFamily: "'Slackey', 'TASolivare', cursive", textShadow: "0px 4px 4px #c7bccc" }}
        >
          VS
        </p>
        <TBCaptainChip left={351} accent="#ed6149" name={captainB?.nickname} avatarUrl={captainB?.avatar_url} />

        <Divider top={830} />

        {isHost ? (
          <StartButton
            label={loading ? t("teamBattle.starting") : t("lobby.startGame")}
            onClick={start}
            disabled={!teamsEqual || loading}
          />
        ) : (
          <p className="absolute left-[33px] top-[870px] w-[434px] text-center font-[Nunito] font-semibold text-[15px] text-[#523b76]/70">
            {t("teamBattle.waitingHost")}
          </p>
        )}

        {isHost && !teamsEqual && (
          <p className="absolute left-[33px] top-[688px] w-[434px] text-center font-[Nunito] font-medium text-[13px] text-[#523b76]/60">
            {t("teamBattle.needEqualTeams")}
          </p>
        )}
      </ScaledCanvas>
    </div>
  );
}

// The TB captain pill (940:7751): name on the left, round avatar docked right.
function TBCaptainChip({
  left,
  accent,
  name,
  avatarUrl,
}: {
  left: number;
  accent: string;
  name?: string;
  avatarUrl?: string | null;
}) {
  return (
    <div
      className="absolute h-[50px] w-[116px] rounded-[16.85px] border-[1.153px] border-solid shadow-[0px_3.389px_0px_0px_#d8d0e8,0px_5.083px_13.556px_0px_rgba(0,0,0,0.1)]"
      style={{
        left,
        top: 758,
        borderColor: accent,
        background: "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))",
      }}
    >
      <p className="absolute left-[8px] right-[42px] top-1/2 -translate-y-1/2 font-[Nunito] font-black leading-[28.974px] text-[#334155] text-[16px] text-center tracking-[-0.1686px] whitespace-nowrap overflow-hidden text-ellipsis">
        {name ?? "—"}
      </p>
      <div className="absolute left-[74px] top-[5px] size-[33px] rounded-[9999px] overflow-clip bg-[rgba(192,192,192,0.24)]">
        {avatarUrl && (
          <img alt="" className="absolute inset-0 max-w-none object-cover size-full rounded-[9999px]" src={avatarUrl} />
        )}
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.695px_0px_0px_white]" />
    </div>
  );
}
