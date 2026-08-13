import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { missionTitle, missionDescription } from "@/utils/missionText";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Star, X } from "lucide-react";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import {
  useMissions,
  useDailyMissionsFor,
  useWeekBonus,
  getMissionIcon,
  todayKey,
  WEEK_BONUS,
  weekBonusPowerUp,
  weekStartOf,
  type MissionIconKey,
} from "@/hooks/useMissions";
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
import xpSparkIcon from "@/assets/level/xp-spark.png";

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
import { SunsetButton } from "@/components/shared/SunsetButton";
import { formatDayWithWeekday } from "@/utils/localDate";

interface MissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which day to open on. null (the default) means today. */
  date?: string | null;
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
    // A mission naming one category opens that category, not the browser.
    case "category_movies":
      return { to: "/category/movies" };
    case "category_music":
      return { to: "/category/music" };
    case "category_animals":
      return { to: "/category/animals" };
    case "category_sports":
      return { to: "/category/sports" };
    case "category_cuisine":
      return { to: "/category/georgian_cuisine" };
    case "invite_to_play":
      return { to: "/team", state: { openCreateRoom: true } };
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
        <img src={xpSparkIcon} alt="" className="shrink-0" width={18} height={18} />
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
      {/* Named from mission_id rather than from the row's stored title: the
          row was written in whatever language the app was in when the
          mission was handed out. */}
      <h3 className="mt-2.5 font-display text-lg font-bold text-[#402666]">
        {missionTitle(mission.mission_id, mission.mission_title)}
      </h3>
      {mission.mission_description && (
        <p className="mt-1 text-sm text-slate-500">
          {missionDescription(mission.mission_id, mission.mission_description, mission.target_value)}
        </p>
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

export function MissionsModal({ isOpen, onClose, date = null }: MissionsModalProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { weeklyMissions } = useMissions();
  // Whichever day was tapped. Today routes back to the live query, so
  // progress and realtime behave exactly as before.
  const weekBonus = useWeekBonus();
  const [claimingBonus, setClaimingBonus] = useState(false);
  const day = useDailyMissionsFor(date);
  const dailyMissions = day.missions;
  const loading = day.loading;

  // "ორშაბათი, 10 აგვისტო" in the player's own language, plus whether that
  // day is behind or ahead — the date alone does not say which.
  //
  // Not toLocaleDateString: browsers ship no Georgian locale data and Intl
  // answers a missing locale with an English date rather than an error, so
  // this line read "Sunday, Aug 16" to every Georgian player. See localDate.
  const dayLabel = (() => {
    if (!date || day.kind === "today") return "";
    const when = formatDayWithWeekday(new Date(`${date}T00:00:00Z`), language, { utc: true });
    return `${when} · ${t(day.kind === "past" ? "missions.pastDay" : "missions.futureDay")}`;
  })();
  const { currentStreak } = useMissionStreak();
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [dailyIndex, setDailyIndex] = useState(0);
  const [weeklyIndex, setWeeklyIndex] = useState(0);

  const missions = activeTab === "daily" ? dailyMissions : weeklyMissions;
  const index = activeTab === "daily" ? dailyIndex : weeklyIndex;
  const setIndex = activeTab === "daily" ? setDailyIndex : setWeeklyIndex;
  const safeIndex = missions.length > 0 ? Math.min(index, missions.length - 1) : 0;
  const mission = missions[safeIndex];

  const trackRef = useRef<HTMLDivElement | null>(null);

  // The track is the source of truth for which card is showing: a drag
  // moves it without going through React, so the index follows the scroll
  // rather than the other way round.
  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === next ? prev : next));
  };

  const scrollToIndex = (i: number, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
    setIndex(i);
  };

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

  // Put the track where that index says, without animating into place —
  // the track starts at 0 whenever it mounts or the tab swaps it out, and
  // sliding from there would look like a page the player did not ask for.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    el.scrollTo({ left: safeIndex * el.clientWidth, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, missions.length]);

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
            {/* Close — same treatment as the other home modals. Tapping the
                backdrop already dismisses, but that is not discoverable and
                is unreachable on a phone where the sheet fills the screen. */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
              style={{ boxShadow: "0 2px 0 #E5E7EB" }}
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>

            <div className="px-5 pb-5 pt-5">
              {/* Header — right padding keeps the title clear of the close button */}
              <h2 className="pr-12 font-display text-xl font-bold text-[#402666]">
                {t("missions.title")}
              </h2>
              <p className="mt-0.5 pr-12 text-xs text-slate-500">
                {day.kind === "today" ? t("missions.subtitle") : dayLabel}
              </p>

              {/* Week package — the prize for a clean sweep of all seven
                  days. Shown as progress while the week is still running so
                  it is something to aim at, not a surprise at the end. */}
              {!weekBonus.claimed && (
                <div
                  className="mt-3.5 rounded-2xl px-3 py-2.5"
                  style={{
                    background: weekBonus.claimable
                      ? "linear-gradient(90deg, #F59E0B 0%, #D97706 100%)"
                      : "linear-gradient(90deg, #A78BFA 0%, #7C3AED 100%)",
                    boxShadow: weekBonus.claimable
                      ? "0 3px 0 0 #B45309, inset 0 1.5px 0 0 rgba(255,255,255,0.35)"
                      : "0 3px 0 0 #6D28D9, inset 0 1.5px 0 0 rgba(255,255,255,0.35)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">
                      {t("missions.weekPackage")}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#5B21B6]">
                      {weekBonus.daysComplete}/7
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold text-white">
                      <img src={coinIcon} alt="" width={13} height={13} />
                      {WEEK_BONUS.coins}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold text-white">
                      <img src={gemIcon} alt="" width={13} height={13} />
                      {WEEK_BONUS.gems}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold text-white">
                      {weekBonusPowerUp(weekStartOf(todayKey())) === "time-drain" ? (
                        <TimeIcon size={13} />
                      ) : (
                        <img
                          src={POWER_UP_ICONS[weekBonusPowerUp(weekStartOf(todayKey()))] || power5050}
                          alt=""
                          width={13}
                          height={13}
                        />
                      )}
                      {WEEK_BONUS.power_up_count}x
                    </span>
                  </div>
                  {weekBonus.claimable && (
                    <button
                      type="button"
                      disabled={claimingBonus}
                      onClick={async () => {
                        setClaimingBonus(true);
                        await weekBonus.claim();
                        setClaimingBonus(false);
                      }}
                      className="mt-2 w-full rounded-full bg-white py-1.5 text-xs font-bold text-[#B45309] disabled:opacity-60"
                    >
                      {claimingBonus ? t("missions.claimed") : t("missions.claimReward")}
                    </button>
                  )}
                </div>
              )}

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

              {/* Carousel. A scroll-snap track rather than one swapped card:
                  the cards are really side by side, so a thumb drag, a
                  trackpad and the arrows all move it, and the browser owns
                  the momentum and rubber-banding. */}
              <div className="relative mt-3.5">
                {loading ? (
                  <div className="h-[290px] animate-pulse rounded-[20px] bg-white/70" />
                ) : missions.length === 0 ? (
                  <div className="flex h-[290px] items-center justify-center rounded-[20px] bg-white/70 text-sm text-slate-400">
                    {t("missions.noMissions")}
                  </div>
                ) : (
                  <div
                    ref={trackRef}
                    onScroll={onTrackScroll}
                    className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
                    style={{ touchAction: "pan-x pan-y" }}
                  >
                    {missions.map((m) => (
                      <div key={m.id} className="w-full shrink-0 snap-center">
                        <MissionCard mission={m} t={t} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Prev / next arrows */}
                {safeIndex > 0 && (
                  <button
                    onClick={() => scrollToIndex(safeIndex - 1)}
                    className="absolute -left-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-md transition-colors hover:text-[#402666]"
                    aria-label="previous mission"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {safeIndex < missions.length - 1 && (
                  <button
                    onClick={() => scrollToIndex(safeIndex + 1)}
                    className="absolute -right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-500 shadow-md transition-colors hover:text-[#402666]"
                    aria-label="next mission"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dots double as the scoreboard: green for a mission already
                  done, grey for one still open. The current page keeps the
                  elongated pill, so position and progress read separately —
                  colour alone could not say both. */}
              {missions.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {missions.map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => scrollToIndex(i)}
                      aria-label={`${t("missions.progress")} ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        i === safeIndex ? "w-5" : "w-1.5"
                      } ${
                        m.completed
                          ? "bg-emerald-500"
                          : i === safeIndex
                            ? "bg-[#7C3AED]"
                            : "bg-slate-300 hover:bg-slate-400"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Start / continue — routes to where this mission is played.
                  Only today can be acted on: a past day is settled and a
                  future one has not opened, so both close instead of
                  sending the player somewhere that cannot help them. */}
              <SunsetButton
                onClick={() => {
                  onClose();
                  if (day.kind === "today" && mission && !mission.completed) {
                    const dest = missionDestination(mission.mission_id);
                    navigate(dest.to, dest.state ? { state: dest.state } : undefined);
                  }
                }}
                className="mt-4"
              >
                {day.kind !== "today"
                  ? t("common.close")
                  : mission && !mission.completed && mission.current_progress === 0
                    ? t("missions.startBtn")
                    : t("missions.continueBtn")}
              </SunsetButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MissionsModal;
