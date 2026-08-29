import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Copy, Crown, Swords } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  TeamBattleProvider,
  useTeamBattle,
  type TBTeam,
} from "@/contexts/TeamBattleContext";
import { TeamBattleMatch } from "@/components/team-battle/TeamBattleMatch";
import { useCategories } from "@/hooks/useCategories";

const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";

/**
 * /team-battle — the Team Battle flow (docs/GAME_TYPES_DESIGN.md §2), its own
 * page the way /tv is: entry (create or join by code) → team lobby → the
 * server-driven match phases in TeamBattleMatch.
 */
export default function TeamBattlePage() {
  return (
    <TeamBattleProvider>
      <TeamBattleInner />
    </TeamBattleProvider>
  );
}

function TeamBattleInner() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { room, state } = useTeamBattle();
  const [params] = useSearchParams();
  const { joinRoom } = useTeamBattle();

  // /team-battle?code=ABC123 joins straight into the lobby (shared links).
  useEffect(() => {
    const code = params.get("code");
    if (code && !room && user) void joinRoom(code);
  }, [params, room, user, joinRoom]);

  const inMatch = room && state && !state.settled && room.status === "playing";

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <div className="max-w-md mx-auto px-5 pb-10">
        {!inMatch && (
          <div className="flex items-center gap-2 pt-4 pb-2">
            <button
              onClick={() => (room ? undefined : navigate(-1))}
              aria-label={t("common.back")}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#402666] active:scale-95 transition-transform"
              style={{ visibility: room ? "hidden" : "visible" }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-xl font-bold text-[#402666] flex items-center gap-2">
              <Swords className="w-5 h-5" /> {t("teamBattle.title")}
            </h1>
          </div>
        )}

        {!room ? <TBEntry /> : inMatch ? <TeamBattleMatch /> : <TBLobby />}
      </div>
    </div>
  );
}

function TBEntry() {
  const { t } = useLanguage();
  const { createRoom, joinRoom, loading } = useTeamBattle();
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col gap-4 mt-4">
      <p className="text-sm text-[#402666]/60">{t("teamBattle.entryHint")}</p>
      <button
        onClick={() => void createRoom()}
        disabled={loading}
        className="rounded-[20px] p-5 text-left font-bold text-[#402666] disabled:opacity-60"
        style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
      >
        {t("teamBattle.createRoom")}
      </button>
      <div
        className="rounded-[20px] p-5 flex gap-2"
        style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("teamBattle.codePlaceholder")}
          maxLength={6}
          className="flex-1 min-w-0 bg-transparent outline-none font-mono text-lg tracking-widest text-[#402666] placeholder:text-[#402666]/30"
        />
        <button
          onClick={() => void joinRoom(code)}
          disabled={code.length < 6 || loading}
          className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white font-bold disabled:opacity-40"
        >
          {t("teamBattle.joinRoom")}
        </button>
      </div>
    </div>
  );
}

function TBLobby() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { room, participants, isHost, myTeam, setTeam, startMatch, leaveRoom, loading, state, settle } =
    useTeamBattle();
  const { categories } = useCategories();

  // A finished match parks the room back at "waiting" with a done state row;
  // the settle claim is idempotent, so any device landing here fires it.
  useEffect(() => {
    if (state?.phase === "done" && !state.settled) void settle();
  }, [state?.phase, state?.settled, settle]);

  const teamOf = (team: TBTeam) => participants.filter((p) => p.team === team);
  const teamsEqual =
    teamOf("a").length > 0 &&
    teamOf("a").length === teamOf("b").length &&
    participants.every((p) => p.team);

  const copyCode = () => {
    void navigator.clipboard?.writeText(room?.room_code ?? "");
    toast.success(t("teamBattle.codeCopied"));
  };

  const start = () => {
    const usable = categories.filter((c) => c.tier === "free" || c.tier === "standard");
    void startMatch(usable.map((c) => ({ uuid: c.uuid, name: c.name })));
  };

  return (
    <div className="flex flex-col gap-4 mt-2">
      <button
        onClick={copyCode}
        className="rounded-[20px] p-4 flex items-center justify-between"
        style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
      >
        <div>
          <p className="text-xs text-[#402666]/50">{t("teamBattle.shareCode")}</p>
          <p className="font-mono text-2xl font-bold tracking-[0.3em] text-[#402666]">
            {room?.room_code}
          </p>
        </div>
        <Copy className="w-5 h-5 text-[#402666]/50" />
      </button>

      <div className="grid grid-cols-2 gap-3">
        {(["a", "b"] as TBTeam[]).map((team) => (
          <div
            key={team}
            className="rounded-[20px] p-4 min-h-[180px]"
            style={{
              background: "rgba(252,247,255,0.92)",
              boxShadow: CARD_SHADOW,
              outline: myTeam === team ? "2px solid #7C3AED" : "none",
            }}
          >
            <p className="font-bold text-sm text-[#402666] mb-2">
              {team === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB")}
              <span className="text-[#402666]/40 font-normal"> · {teamOf(team).length}</span>
            </p>
            <div className="flex flex-col gap-2">
              {teamOf(team).map((p) => (
                <div key={p.user_id} className="flex items-center gap-2">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#7C3AED]/20" />
                  )}
                  <span className="text-sm text-[#402666] truncate">
                    {p.nickname}
                    {p.user_id === user?.id ? ` (${t("teamBattle.you")})` : ""}
                  </span>
                  {p.is_host && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </div>
              ))}
            </div>
            {myTeam !== team && (
              <button
                onClick={() => void setTeam(team)}
                className="mt-3 text-xs font-bold text-[#7C3AED]"
              >
                {t("teamBattle.joinTeam")}
              </button>
            )}
          </div>
        ))}
      </div>

      {isHost ? (
        <button
          onClick={start}
          disabled={!teamsEqual || loading}
          className="rounded-[20px] p-4 bg-[#7C3AED] text-white font-bold disabled:opacity-40"
        >
          {loading ? t("teamBattle.starting") : t("teamBattle.start")}
        </button>
      ) : (
        <p className="text-center text-sm text-[#402666]/50">{t("teamBattle.waitingHost")}</p>
      )}
      {!teamsEqual && isHost && (
        <p className="text-center text-xs text-[#402666]/40">{t("teamBattle.needEqualTeams")}</p>
      )}

      <button onClick={() => void leaveRoom()} className="text-xs text-[#402666]/40 mt-2">
        {t("teamBattle.leave")}
      </button>
    </div>
  );
}
