import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Sparkles, Star } from "lucide-react";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { useMissions, getMissionIcon, type MissionIconKey } from "@/hooks/useMissions";
import { useMissionStreak } from "@/hooks/useMissionStreak";
import { useLanguage } from "@/contexts/LanguageContext";

// 3D mission icons from the Figma set
import iconCheck from "@/assets/missions/check.png";
import iconMap from "@/assets/missions/map.png";
import iconTarget from "@/assets/missions/target.png";
import iconShoe from "@/assets/missions/shoe.png";
import iconTrophy from "@/assets/missions/trophy.png";
import iconTv from "@/assets/missions/tv.png";
import iconHearts from "@/assets/missions/hearts.png";

const MISSION_ICONS: Record<MissionIconKey, string> = {
  check: iconCheck,
  map: iconMap,
  target: iconTarget,
  shoe: iconShoe,
  trophy: iconTrophy,
  tv: iconTv,
  hearts: iconHearts,
};

// Power-up icons for reward chips
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import { TimeIcon } from "@/components/shared/TimeIcon";

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Where the CTA takes the player to actually work on a mission: category
// missions go to discover, friend missions open the create-room flow, the TV
// mission opens a room with TV mode pre-toggled, everything else (play, win,
// answers, perfect) starts from the "how do you want to play" chooser.
function missionDestination(missionId: string): { to: string; state?: Record<string, unknown> } {
  switch (missionId) {
    case "play_categories":
    case "weekly_categories":
      return { to: "/discover" };
    case "play_friend":
    case "weekly_friend_games":
      return { to: "/team", state: { openCreateRoom: true } };
    case "play_tv":
      return { to: "/team", state: { openTV: true } };
    default:
      return { to: "/", state: { openPlayOptions: true } };
  }
}

const POWER_UP_ICONS: Record<string, string | null> = {
  "5050": power5050,
  freeze: powerFreeze,
  replace: powerReplace,
  "time-drain": null, // Use TimeIcon component instead
};

interface Mission {
  id: string;
  mission_id: string;
  mission_title: string;
  mission_description: string | null;
  target_value: number;
  current_progress: number;
  reward_xp: number;
  reward_coins: number;
  reward_gems: number;
  reward_power_up: string | null;
  reward_power_up_count: number;
  completed: boolean;
}

const chipStyle = { border: "1.5px solid #E8E0F5", boxShadow: "0 2px 0 #EDE6F7" };

// One fixed row of four chips so every mission card has the same height
function RewardChips({ mission }: { mission: Mission }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      <div
        className="flex items-center justify-center gap-1 rounded-full bg-white px-1.5 py-1.5"
        style={chipStyle}
      >
        <img src={coinIcon} alt="" className="shrink-0" width={18} height={18} />
        <span className="text-xs font-bold text-[#402666]">{mission.reward_coins}</span>
      </div>
      <div
        className="flex items-center justify-center gap-1 rounded-full bg-white px-1.5 py-1.5"
        style={chipStyle}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-violet-500" />
        <span className="text-xs font-bold text-[#402666]">{mission.reward_xp}XP</span>
      </div>
      <div
        className="flex items-center justify-center gap-1 rounded-full bg-white px-1.5 py-1.5"
        style={chipStyle}
      >
        <img src={gemIcon} alt="" className="shrink-0" width={18} height={18} />
        <span className="text-xs font-bold text-[#402666]">{mission.reward_gems}</span>
      </div>
      <div
        className="flex items-center justify-center gap-1 rounded-full bg-white px-1.5 py-1.5"
        style={chipStyle}
      >
        {mission.reward_power_up === "time-drain" ? (
          <TimeIcon size={18} />
        ) : (
          <img
            src={POWER_UP_ICONS[mission.reward_power_up || ""] || power5050}
            alt=""
            className="shrink-0"
            width={18}
            height={18}
          />
        )}
        <span className="text-xs font-bold text-[#402666]">
          {mission.reward_power_up_count || 1}x
        </span>
      </div>
    </div>
  );
}

function MissionCard({ mission, t }: { mission: Mission; t: (key: string) => string }) {
  const progress = Math.min((mission.current_progress / mission.target_value) * 100, 100);
  const isComplete = mission.completed;

  return (
    <div
      className="flex min-h-[290px] flex-col rounded-[20px] bg-white p-5"
      style={{
        border: "2px solid #F2AEDC",
        boxShadow: "0 3px 0 0 #F4D4E9, inset 0 1.5px 0 0 #fff",
      }}
    >
      {/* Icon + title + description */}
      <img
        src={MISSION_ICONS[getMissionIcon(mission.mission_id)]}
        alt=""
        className="h-11 w-11 object-contain"
      />
      <h3 className="mt-2.5 font-display text-lg font-bold text-[#402666]">
        {mission.mission_title}
      </h3>
      {mission.mission_description && (
        <p className="mt-1 text-sm text-slate-500">{mission.mission_description}</p>
      )}

      {/* Progress */}
      <div className="mt-auto flex items-center justify-between pt-4">
        {isComplete ? (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            {t("missions.completedLabel")}
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400">{t("missions.progress")}</span>
        )}
        <span className="text-xs font-bold text-slate-500">
          {Math.min(mission.current_progress, mission.target_value)}/{mission.target_value}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/70">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #2DD4A0 0%, #10B981 100%)" }}
        />
      </div>

      {/* Rewards */}
      <div className="mt-3.5">
        <RewardChips mission={mission} />
      </div>
    </div>
  );
}

export function MissionsModal({ isOpen, onClose }: MissionsModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { dailyMissions, weeklyMissions, loading } = useMissions();
  const { currentStreak } = useMissionStreak();
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [dailyIndex, setDailyIndex] = useState(0);
  const [weeklyIndex, setWeeklyIndex] = useState(0);

  const missions = activeTab === "daily" ? dailyMissions : weeklyMissions;
  const index = activeTab === "daily" ? dailyIndex : weeklyIndex;
  const setIndex = activeTab === "daily" ? setDailyIndex : setWeeklyIndex;
  const safeIndex = missions.length > 0 ? Math.min(index, missions.length - 1) : 0;
  const mission = missions[safeIndex];

  // Escape dismisses the modal, same as backdrop and the continue button
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Start each open on the first unfinished mission
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("daily");
    setDailyIndex(Math.max(0, dailyMissions.findIndex((m) => !m.completed)));
    setWeeklyIndex(Math.max(0, weeklyMissions.findIndex((m) => !m.completed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden rounded-[28px]"
            style={{
              background: "linear-gradient(180deg, #FDFAFF 0%, #F4EEFB 100%)",
              border: "3px solid rgba(255,255,255,0.95)",
              boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)",
            }}
          >
            <div className="px-5 pb-5 pt-5">
              {/* Header */}
              <h2 className="font-display text-xl font-bold text-[#402666]">
                {t("missions.title")}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{t("missions.subtitle")}</p>

              {/* Streak banner */}
              <div
                className="mt-3.5 flex items-center justify-between rounded-2xl px-3 py-2.5"
                style={{
                  background: "linear-gradient(90deg, #2DD4A0 0%, #10B981 100%)",
                  boxShadow: "0 3px 0 0 #0EA97C, inset 0 1.5px 0 0 rgba(255,255,255,0.35)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="text-sm font-bold text-white">{t("missions.streak")}</span>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F766E]">
                  {currentStreak} {t("missions.days")}
                </div>
              </div>

              {/* Daily / Weekly tabs */}
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-[#EFE9F7] p-1">
                {(["daily", "weekly"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full py-1.5 text-sm font-bold transition-all ${
                      activeTab === tab
                        ? "bg-white text-[#402666] shadow-sm"
                        : "text-slate-500 hover:text-slate-600"
                    }`}
                  >
                    {t(`missions.${tab}`)}
                  </button>
                ))}
              </div>

              {/* One-card carousel */}
              <div className="relative mt-3.5">
                {loading ? (
                  <div className="h-[290px] animate-pulse rounded-[20px] bg-white/70" />
                ) : !mission ? (
                  <div className="flex h-[290px] items-center justify-center rounded-[20px] bg-white/70 text-sm text-slate-400">
                    {t("missions.noMissions")}
                  </div>
                ) : (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${activeTab}-${mission.id}`}
                      initial={{ opacity: 0, x: 32 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -32 }}
                      transition={{ duration: 0.18 }}
                    >
                      <MissionCard mission={mission} t={t} />
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Prev / next arrows */}
                {safeIndex > 0 && (
                  <button
                    onClick={() => setIndex(safeIndex - 1)}
                    className="absolute -left-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-md transition-colors hover:text-[#402666]"
                    aria-label="previous mission"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {safeIndex < missions.length - 1 && (
                  <button
                    onClick={() => setIndex(safeIndex + 1)}
                    className="absolute -right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-md transition-colors hover:text-[#402666]"
                    aria-label="next mission"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dots */}
              {missions.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {missions.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => setIndex(i)}
                      aria-label={`mission ${i + 1}`}
                      className={`rounded-full transition-all duration-200 ${
                        i === safeIndex
                          ? "h-1.5 w-5 bg-[#7C3AED]"
                          : "h-1.5 w-1.5 bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Start / continue — routes to where this mission is played */}
              <motion.button
                onClick={() => {
                  onClose();
                  if (mission && !mission.completed) {
                    const dest = missionDestination(mission.mission_id);
                    navigate(dest.to, dest.state ? { state: dest.state } : undefined);
                  }
                }}
                whileTap={{ scale: 0.97, y: 2 }}
                className="mt-4 h-12 w-full rounded-full font-display text-base font-bold text-white"
                style={{
                  background: "linear-gradient(90deg, #F25CA2 0%, #FF9A3D 100%)",
                  border: "2px solid #FBB1D0",
                  boxShadow: "0 4px 0 0 #D6427F, inset 0 1.5px 0 0 rgba(255,255,255,0.4)",
                }}
              >
                {mission && !mission.completed && mission.current_progress === 0
                  ? t("missions.startBtn")
                  : t("missions.continueBtn")}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MissionsModal;
