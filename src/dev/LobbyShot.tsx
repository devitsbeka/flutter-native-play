/**
 * Lobby Shot — a dev-server render target for the universal lobby
 * (Figma 1018:5815 / 1018:4416), like /dev/v2 for the home page: every
 * lobby needs a live room and a signed-in host, which a screenshot pass
 * cannot have, so this page feeds the component the shapes each mode
 * maps onto it.
 *
 *   /dev/lobby?mode=battle|king|classic|quick&tab=rules|players
 */
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { UniversalLobby, LobbyInviteRow, LobbyInfoRow, type LobbyPlayer, type LobbyPlayerGroup } from "@/components/lobby/UniversalLobby";
import { LOBBY_SCENES } from "@/utils/lobbyScene";
import coinIconAsset from "@/assets/tb-lobby/coin.png";

const FACE = (seed: string) => `https://api.dicebear.com/9.x/thumbs/png?seed=${seed}&size=96`;

const PEOPLE: LobbyPlayer[] = [
  { id: "1", name: "Beka", avatarUrl: FACE("beka"), isHost: true, isYou: true, score: 1250, rounds: 4 },
  { id: "2", name: "Nino", avatarUrl: FACE("nino"), isHost: false, isYou: false, score: 980, rounds: 4 },
  { id: "3", name: "Giorgi", avatarUrl: FACE("giorgi"), isHost: false, isYou: false, score: 640, rounds: 2 },
  { id: "4", name: "Mariam", avatarUrl: FACE("mariam"), isHost: false, isYou: false, pending: true },
];

const FACES = [
  { url: FACE("a"), online: true },
  { url: FACE("b"), online: true },
  { url: FACE("c"), online: false },
];

export default function LobbyShot() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const mode = params.get("mode") ?? "battle";
  const tab = (params.get("tab") ?? "players") as "rules" | "players";
  const noop = () => undefined;
  const labels = {
    rules: t("lobby.uGameRules"),
    players: t("lobby.uPlayersTab"),
    invite: t("lobby.uInvite"),
    you: t("lobby.uYou"),
    rounds: (count: number) => t("lobby.uRoundsShort", { count }),
  };
  const visibility = (value: "public" | "private") => ({
    key: "visibility",
    label: t("lobby.uVisibility"),
    options: [
      { value: "public", label: t("extra.roomPublic") },
      { value: "private", label: t("extra.roomPrivate") },
    ],
    value,
    onChange: noop,
  });

  if (mode === "battle") {
    const bench = (team: "a" | "b", players: LobbyPlayer[]): LobbyPlayerGroup => ({
      key: team,
      title: (
        <div className={team === "a" ? "flex flex-col" : "mt-[18px] flex flex-col"}>
          {team === "b" && (
            <p className="mb-[10px] text-center font-hero text-[26px] leading-[30px] text-[#d8b2e8]" style={{ textShadow: "0px 2px 2px rgba(199,188,204,0.6)" }}>
              VS
            </p>
          )}
          <div className="flex items-center gap-3 pl-[2px] pr-[4px]">
            <span className="block size-[60px] rounded-full bg-white/40 border-2 border-dashed border-[#b9a5e6]" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-[Nunito] font-black leading-[22px] text-[#0c172c] text-[18px] tracking-[-0.16px]">
                {team === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB")}
              </p>
              <p className="font-[Nunito] text-[12px] leading-4 text-[#402666]/60">{players.filter((p) => !p.pending).length}/3</p>
            </div>
            <button type="button" className="flex h-[40px] max-w-[46%] items-center gap-2 rounded-full border border-[rgba(156,100,181,0.5)] bg-white/60 py-[3px] pl-3 pr-[3px]">
              <span className="min-w-0 text-left">
                <span className="block font-[Nunito] text-[10px] leading-3 text-[#402666]/60">{t("lobby.captainLabel")}</span>
                <span className="block max-w-[96px] truncate font-[Nunito] text-[13px] font-bold leading-4 text-[#402666]">{players[0].name}</span>
              </span>
              <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#e9d8ff]" style={{ boxShadow: `0 0 0 2px ${team === "a" ? "#e7ba87" : "#ed6149"}` }}>
                <img alt="" src={players[0].avatarUrl ?? undefined} className="h-full w-full object-cover" />
              </span>
            </button>
          </div>
        </div>
      ),
      players,
      footer: team === "a" ? <LobbyInviteRow className="mb-[6px] mt-[6px]" faces={FACES} label={labels.invite} onPress={noop} /> : null,
    });
    return (
      <UniversalLobby
        sceneArt={LOBBY_SCENES.battle}
        roomName={t("teamBattle.title")}
        onBack={noop}
        unreadCount={2}
        labels={labels}
        rules={[visibility("public")]}
        rulesExtra={
          <>
            <LobbyInfoRow label={t("lobby.uTeamSize")}>3 v 3</LobbyInfoRow>
            <LobbyInfoRow label={t("lobby.roundsN", { n: 8 })} hint={t("lobby.autoRounds")} />
            <LobbyInfoRow label={t("lobby.winnerTakes")}>
              <img alt="" src={coinIconAsset} className="h-6 w-6 object-contain" />
              1200
            </LobbyInfoRow>
            <p className="px-[6px] pt-[2px] font-[Nunito] text-[13px] leading-[18px] text-[#402666]/70">{t("lobby.tbRules")}</p>
          </>
        }
        players={[bench("a", [PEOPLE[0], PEOPLE[3]]), bench("b", [PEOPLE[1], PEOPLE[2]])]}
        playersHint={t("teamBattle.minTwoPerTeam")}
        capacity={{ min: 4, max: 6, taken: 4, fullLabel: t("extra.mpRoomFull") }}
        inviteFaces={FACES}
        initialTab={tab}
        start={{ label: t("lobby.startGame"), onPress: noop, disabled: true }}
      />
    );
  }

  if (mode === "quick") {
    return (
      <UniversalLobby
        sceneArt={LOBBY_SCENES.quick}
        roomName={t("extra.modeQuickTitle")}
        onBack={noop}
        labels={labels}
        rules={[]}
        rulesExtra={
          <>
            <LobbyInfoRow label={t("lobby.uPlayersTab")}>1</LobbyInfoRow>
            <p className="px-[6px] pt-[2px] font-[Nunito] text-[13px] leading-[18px] text-[#402666]/70">{t("extra.modeQuickDesc")}</p>
          </>
        }
        players={[{ ...PEOPLE[0], score: undefined, rounds: undefined }]}
        inviteFaces={FACES}
        initialTab={tab}
        start={{ label: t("lobby.startGame"), onPress: noop }}
      />
    );
  }

  // classic
  return (
    <UniversalLobby
      sceneArt={LOBBY_SCENES.random}
      roomName="Midnight Owls"
      onRename={noop}
      onBack={noop}
      unreadCount={2}
      category={{ label: t("lobby.uSelectCategory"), onPress: noop }}
      tv={{ label: t("lobby.uPlayOnTv"), onPress: noop }}
      labels={labels}
      rules={[
        {
          key: "questions",
          label: t("lobby.uQuestionsPerRound"),
          options: [5, 10, 20].map((n) => ({ value: String(n), label: String(n) })),
          value: "10",
          onChange: noop,
        },
        visibility("private"),
      ]}
      players={PEOPLE}
      playersHint={null}
      capacity={{ min: 1, max: 10, taken: 4, fullLabel: t("extra.mpRoomFull") }}
      inviteFaces={FACES}
      onInvite={noop}
      initialTab={tab}
      start={{ label: t("lobby.startGame"), onPress: noop }}
    />
  );
}
