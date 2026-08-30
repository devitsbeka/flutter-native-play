import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, ChevronLeft, Copy, Crown, Plus, Swords, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { getGradientById } from "@/config/roomGradients";
import {
  TeamBattleProvider,
  useTeamBattle,
  type TBTeam,
} from "@/contexts/TeamBattleContext";
import { TeamBattleMatch } from "@/components/team-battle/TeamBattleMatch";
import { useCategories } from "@/hooks/useCategories";

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

function TBLobby() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    room, participants, isHost, myTeam, setTeam, addBot, removeBot,
    startMatch, leaveRoom, loading, state, settle,
  } = useTeamBattle();
  const { categories } = useCategories();
  const gradient = getGradientById(room?.background_gradient ?? undefined);

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
    <div
      className="h-[100dvh] w-full flex flex-col overflow-hidden safe-bleed"
      style={{ background: gradient?.gradient ?? "#7E7ADB" }}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col max-w-[520px] mx-auto">
        <div className="flex items-center justify-between px-5 pt-[calc(var(--safe-top)_+_0.75rem)] pb-3">
          <h1
            className="text-2xl font-black text-white flex items-center gap-2"
            style={{ fontFamily: "'TASolivare', sans-serif" }}
          >
            <Swords className="w-5 h-5" /> {t("teamBattle.title")}
          </h1>
          <button onClick={() => void leaveRoom()} className="text-white/60 text-xs font-bold">
            {t("teamBattle.leave")}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 flex flex-col gap-4">
          <button
            onClick={copyCode}
            className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/[0.12] p-4 flex items-center justify-between"
          >
            <div className="text-left">
              <p className="text-[11px] text-white/60 font-semibold uppercase tracking-wide">
                {t("teamBattle.shareCode")}
              </p>
              <p className="font-mono text-2xl font-bold tracking-[0.3em] text-white">
                {room?.room_code}
              </p>
            </div>
            <Copy className="w-5 h-5 text-white/60" />
          </button>

          <div className="grid grid-cols-2 gap-3">
            {(["a", "b"] as TBTeam[]).map((team) => (
              <div
                key={team}
                className="rounded-2xl bg-white/10 backdrop-blur-sm p-3 min-h-[190px] flex flex-col"
                style={{
                  border: myTeam === team ? "1.5px solid rgba(255,255,255,0.55)" : "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <p className="font-bold text-sm text-white mb-2">
                  {teamLabelText(t, team)}
                  <span className="text-white/50 font-normal"> · {teamOf(team).length}</span>
                </p>
                <div className="flex flex-col gap-2 flex-1">
                  {teamOf(team).map((p) => (
                    <div key={p.user_id} className="flex items-center gap-2 rounded-xl px-1 py-0.5">
                      {p.is_bot ? (
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <SmartAvatar avatarUrl={p.avatar_url} fallback={p.nickname} size="xs" />
                      )}
                      <span className="text-sm text-white truncate">
                        {p.nickname}
                        {p.user_id === user?.id ? ` (${t("teamBattle.you")})` : ""}
                      </span>
                      {p.is_host && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                      {p.is_bot && isHost && (
                        <button
                          onClick={() => void removeBot(p.user_id)}
                          aria-label={t("common.close")}
                          className="ml-auto text-white/40 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {myTeam !== team && (
                    <button
                      onClick={() => void setTeam(team)}
                      className="text-xs font-bold text-[#83F7DA]"
                    >
                      {t("teamBattle.joinTeam")}
                    </button>
                  )}
                  {isHost && teamOf(team).length < 5 && (
                    <button
                      onClick={() => void addBot(team)}
                      className="text-xs font-bold text-white/60 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <Bot className="w-3.5 h-3.5" />
                      {t("teamBattle.addBot")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!teamsEqual && isHost && (
            <p className="text-center text-xs text-white/60">{t("teamBattle.needEqualTeams")}</p>
          )}
          {!isHost && (
            <p className="text-center text-sm text-white/60">{t("teamBattle.waitingHost")}</p>
          )}
        </div>

        {isHost && (
          <div
            className="px-5 pt-4 pb-[calc(1.25rem_+_var(--safe-bottom))] bg-gradient-to-t from-black/50 via-black/20 to-transparent"
          >
            <ChunkyButton
              variant="white"
              size="xl"
              className="w-full"
              disabled={!teamsEqual || loading}
              onClick={start}
            >
              {loading ? t("teamBattle.starting") : t("teamBattle.start")}
            </ChunkyButton>
          </div>
        )}
      </div>
    </div>
  );
}

const teamLabelText = (t: (k: string) => string, team: TBTeam) =>
  team === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB");
