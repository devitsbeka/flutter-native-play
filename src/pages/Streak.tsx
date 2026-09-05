import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bell, Calendar, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useMissionStreak } from "@/hooks/useMissionStreak";
import { useStreakMilestones } from "@/hooks/useStreakMilestones";
import { dailyPoolForDate, getMissionIcon, todayKey, useDailyMissionsFor } from "@/hooks/useMissions";
import { MISSION_ICONS } from "@/components/mission/missionIcons";
import { missionDestination } from "@/utils/missionDestination";
import { missionDescription, missionTitle } from "@/utils/missionText";
import { formatDayMonthShort, formatDayWithWeekday, formatWeekdayShort } from "@/utils/localDate";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import { MyTriviaLiveLogo } from "@/components/shared/MyTriviaLiveLogo";
import { SunsetButton } from "@/components/shared/SunsetButton";
import coinImg from "@/assets/streak/coin.png";
import flameImg from "@/assets/streak/flame.png";
import chestImg from "@/assets/streak/chest.png";
import moneyBagImg from "@/assets/streak/money-bag.png";
import lockImg from "@/assets/streak/lock.png";

/**
 * The streak page (Figma 1069:18), where the home screen's flame lands.
 *
 * The streak is days kept: a day is kept by finishing at least one of its
 * four missions, and every day opens with "play one game", so coming back
 * and playing once is always enough. The page shows the two counts, the
 * week around today with a tile per day, that day's four missions — easiest
 * first — in the list rows, and the milestones the streak pays: real coins,
 * once each, through claim_streak_milestone.
 *
 * It replaces a modal that said three things in a generic sheet and
 * advertised an XP bonus nothing ever granted.
 */

const CARD_SHADOW =
  "shadow-[0px_2px_8px_0px_rgba(102,51,153,0.06),0px_8px_24px_0px_rgba(102,51,153,0.12)]";
/** The stat cards' box (1069:451). */
const RAIL =
  "border border-[rgba(156,100,181,0.5)] bg-[#faf0fa] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)] rounded-[20px]";
/** The list row (List Item, 1069:150), missions and milestones alike. */
const ROW =
  "relative flex h-[66px] min-h-[64px] items-center rounded-[16px] border-2 border-[rgba(255,255,255,0.6)] bg-[rgba(252,247,255,0.6)] px-[14px]";
/** The reward button's chrome (Button - Coins, 1069:466), open and locked alike. */
const REWARD_BUTTON =
  "relative h-[43px] rounded-[14.616px] border border-[#e8e0f5] shadow-[0px_2.94px_0px_0px_#d8d0e8,0px_4.409px_11.758px_0px_rgba(0,0,0,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.5)_0%,rgba(254,254,254,0.5)_100%)]";
const LABEL = "font-[Nunito] text-[15px] font-semibold leading-[22.5px] tracking-[-0.16px] text-[#0f1729]";
const CHIP_TEXT = "font-[Nunito] text-[12px] font-bold leading-[25.132px] tracking-[-0.36px] text-[#334155]";
const CHIP_GLOSS = "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.47px_0px_0px_white]";

const DAY_MS = 86_400_000;

/** The app's modal, as MissionInfoModal and LevelInfoModal draw it. */
function StreakSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))] backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-5"
            style={{ boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)" }}
          >
            <div className="sticky top-0 z-10 h-0">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                style={{ boxShadow: "0 2px 0 #E5E7EB" }}
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <h2 className="px-11 text-center font-display text-2xl font-bold text-[#6D28D9]">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DaySlot = {
  /** The day key mission rows are stored under (a UTC date). */
  key: string;
  date: Date;
  /** Three days either side of today, so today is the fourth of seven. */
  offset: number;
  state: "kept" | "missed" | "today" | "ahead";
};

/** A row of the day's list: a stored mission, or the pool's preview of one. */
type DayRow = {
  id: string;
  missionId: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  coins: number;
  completed: boolean;
};

export default function Streak() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { streak, currentStreak, bestStreak } = useMissionStreak();
  const { milestones, claimed, claiming, claim } = useStreakMilestones();

  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const day = useDailyMissionsFor(selected);
  /** The row opened for its full text. */
  const [detail, setDetail] = useState<DayRow | null>(null);
  /** The milestones, behind the chest tile. */
  const [rewardsOpen, setRewardsOpen] = useState(false);

  // The week (1069:345): today sits in the fourth slot with three days
  // either side. A day behind today is kept while the recorded streak
  // covers it — the row says which day was kept last and how many in a row
  // led up to it — and missed otherwise. Stepped in whole days from the UTC
  // day key rather than rebuilt from local calendar parts: east of UTC the
  // two disagree for the first hours of the day, and a slot would open a
  // date with no rows against it.
  const week = useMemo<DaySlot[]>(() => {
    const todayMs = Date.parse(`${today}T00:00:00Z`);
    const lastKept = streak?.last_completion_date ? Date.parse(`${streak.last_completion_date}T00:00:00Z`) : null;
    const run = streak?.current_streak || 0;
    return Array.from({ length: 7 }, (_, i) => {
      const offset = i - 3;
      const ms = todayMs + offset * DAY_MS;
      const kept = lastKept !== null && run > 0 && ms <= lastKept && ms > lastKept - run * DAY_MS;
      const state: DaySlot["state"] =
        offset === 0 ? "today" : offset > 0 ? "ahead" : kept ? "kept" : "missed";
      return { key: new Date(ms).toISOString().slice(0, 10), date: new Date(ms), offset, state };
    });
  }, [today, streak]);

  const dateRange = `${formatDayMonthShort(week[0].date, language, { utc: true })} - ${formatDayMonthShort(week[6].date, language, { utc: true })}`;
  const selectedSlot = week.find((s) => s.key === selected) ?? week[3];
  const todayKept = streak?.last_completion_date === today;

  // The selected day's rows. Signed in, the day hook answers: today's live
  // rows, a past day's history, a future day's preview. Signed out there is
  // nothing to read, so the day's rotation stands in.
  const rows = useMemo<DayRow[]>(() => {
    if (!user) {
      return dailyPoolForDate(selected).map((m) => ({
        id: `pool-${selected}-${m.mission_id}`,
        missionId: m.mission_id,
        title: missionTitle(m.mission_id, m.title),
        description: missionDescription(m.mission_id, m.description, m.beginner.target),
        target: m.beginner.target,
        progress: 0,
        coins: m.beginner.coins,
        completed: false,
      }));
    }
    // Ledger rows (the day bonus) are not missions to do. The rows come
    // back in no particular order; the ladder's is easiest first.
    const ladder = dailyPoolForDate(selected).map((m) => m.mission_id);
    const rank = (id: string) => {
      const i = ladder.indexOf(id);
      return i === -1 ? ladder.length : i;
    };
    return day.missions
      .filter((m) => m.mission_id !== "day_bonus" && m.mission_id !== "week_bonus")
      .sort((a, b) => rank(a.mission_id) - rank(b.mission_id))
      .map((m) => ({
        id: m.id,
        missionId: m.mission_id,
        title: missionTitle(m.mission_id, m.mission_title),
        description: missionDescription(m.mission_id, m.mission_description || "", m.target_value),
        target: m.target_value,
        progress: m.current_progress,
        coins: m.reward_coins,
        completed: m.completed,
      }));
  }, [user, selected, day.missions]);

  const onClaim = async (days: number) => {
    const awarded = await claim(days);
    if (awarded !== null) toast.success(`+${t("extra.streakCoinsReward", { count: awarded })}`);
    else toast.error(t("common.error"));
  };

  const openMission = (missionId: string) => {
    const dest = missionDestination(missionId);
    navigate(dest.to, dest.state ? { state: dest.state } : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#fbfaf8] pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
      {/* The wash (1069:122). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(249,219,255,0.55) 0%, rgba(249,219,255,0.3) 45%, rgba(249,219,255,0.55) 100%)",
        }}
      />

      {/* Header (1069:123): back, the wordmark, search and the bell. */}
      <header className="relative z-20 shrink-0 border-b border-[#d9cfda] p-4">
        <div className="mx-auto flex w-full max-w-[700px] items-center justify-between md:max-w-[520px]">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            aria-label={t("common.back")}
            className="rounded-full p-2 opacity-[0.66] transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-6 w-6 text-[#4b5563]" />
          </motion.button>
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <button type="button" onClick={() => navigate("/")} aria-label="MyTrivia" className="cursor-pointer">
              <MyTriviaLiveLogo responsive />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <SpotlightSearch variant="button" />
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/notifications")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/30"
            >
              <Bell className="h-5 w-5 text-[#4b5563]" />
              {unreadCount > 0 && (
                <span
                  className="absolute left-[22px] top-[2px] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-[13.5px] text-white"
                  style={{
                    background: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
                    boxShadow: "0 2px 2px rgba(239,68,68,0.5)",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Scrolls itself — the document never does on the device (CLAUDE.md 4b). */}
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-[700px] px-4 pb-4 md:max-w-[520px]">
          {/* Title (1069:261): Nunito Black 34 on 36, tracking -1.3, upper case. */}
          <h1 className="pl-4 pt-[27px] font-[Nunito] text-[34px] font-black uppercase leading-[36px] tracking-[-1.3px] text-[#3a2260]">
            {t("extra.streakTitle")}
          </h1>

          {/* Current / Best (1069:451, 1069:457). */}
          <section className="mt-[22px] grid grid-cols-2 gap-[23px] px-[22px]">
            {[
              { label: t("extra.currentLabel"), value: currentStreak },
              { label: t("extra.bestLabel"), value: Math.max(bestStreak, currentStreak) },
            ].map((stat) => (
              <div key={stat.label} className={cn("relative flex h-[152px] flex-col items-center p-[6px]", RAIL)}>
                <span className="w-full rounded-[16px] px-[15px] py-2 text-center font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666] drop-shadow-[0px_2px_4px_rgba(0,0,0,0.1)]">
                  {stat.label}
                </span>
                <span className="mt-[-3px] font-hero text-[56px] leading-[62px] tracking-[-0.16px] text-[#402666]">
                  {stat.value}
                </span>
                <span className="font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
                  {stat.value === 1 ? t("extra.streakDayOne") : t("extra.streakDayMany")}
                </span>
              </div>
            ))}
          </section>

          {/* The week (1069:336): one tappable tile per day, and the chest
              on the end that holds the streak's rewards. */}
          <section className="mt-[29px] px-4" aria-label={t("extra.streakKeepRule")}>
            <div className="flex items-center gap-[6px]">
              <Calendar className="h-4 w-4 text-[#6b7280]" strokeWidth={1.33} />
              <span className="font-[Nunito] text-[14px] font-medium leading-5 tracking-[-0.16px] text-[#4b5563]">
                {dateRange}
              </span>
            </div>
            <div className="mt-[13px] flex h-[62px] gap-[14px]">
              {week.map((slot, i) => {
                const isChest = i === 6;
                const isSelected = slot.key === selected;
                const label = formatWeekdayShort(slot.date, language, { utc: true });
                const art = isChest ? chestImg : slot.state === "today" ? flameImg : coinImg;
                // The days not yet kept — ahead, or behind and missed — wear
                // the coin greyed (1069:516): luminosity at 44%. Today's
                // flame greys the same way until the day is kept.
                const dim =
                  !isChest &&
                  (slot.state === "ahead" || slot.state === "missed" || (slot.state === "today" && !todayKept));
                return (
                  <button
                    key={slot.key}
                    type="button"
                    aria-label={isChest ? t("extra.streakWeekChest") : formatDayWithWeekday(slot.date, language, { utc: true })}
                    aria-pressed={isChest ? undefined : isSelected}
                    onClick={() => (isChest ? setRewardsOpen(true) : setSelected(slot.key))}
                    className={cn(
                      "relative flex h-full min-w-0 flex-1 flex-col items-center rounded-[16px] py-2 transition-shadow",
                      slot.state === "today"
                        ? "border border-[#ffba26] bg-[rgba(255,186,38,0.1)] shadow-[0px_2px_0px_0px_#e5e7eb]"
                        : isChest
                          ? "bg-[#402666]"
                          : "bg-white drop-shadow-[0px_2px_0px_#e5e7eb]",
                      // The day whose missions are listed below.
                      isSelected && "ring-2 ring-[#402666] ring-offset-2 ring-offset-[#fbfaf8]",
                    )}
                  >
                    <span
                      className={cn(
                        "font-[Nunito] text-[10px] font-bold leading-[15px] tracking-[-0.16px]",
                        isChest ? "text-white" : "text-[#6b7280]",
                      )}
                    >
                      {label}
                    </span>
                    {/* The designed leaf is 29×22, cover-fit: a square render
                        centred, 22 tall. */}
                    <span className="absolute top-[31px] flex h-[22px] w-[29px] items-center justify-center">
                      <img
                        alt=""
                        src={art}
                        className={cn("h-[22px] w-[22px] object-contain", dim && "mix-blend-luminosity opacity-[0.44]")}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* The selected day's missions (List Item, 1069:150), easiest first. */}
          <section className="mt-[29px] px-[27px]" aria-label={t("extra.streakDayMissions")}>
            <h2 className="mb-[10px] font-[Nunito] text-[16px] font-bold leading-[22px] tracking-[-0.16px] text-[#402666]">
              {formatDayWithWeekday(selectedSlot.date, language, { utc: true })}
            </h2>
            <div className="flex flex-col gap-[10px]">
              {user && day.loading && rows.length === 0
                ? Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className={cn(ROW, "animate-pulse", CARD_SHADOW)} aria-hidden />
                  ))
                : rows.map((row) => {
                    const past = selectedSlot.state === "kept" || selectedSlot.state === "missed";
                    const muted = !row.completed && (past || selectedSlot.state === "ahead");
                    // One line, cut short if it must: the tap opens the full
                    // text. The chip is a flex sibling, so a wide one never
                    // runs over the words.
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setDetail(row)}
                        className={cn(ROW, "w-full gap-[10px] text-left active:scale-[0.99]", CARD_SHADOW)}
                      >
                        <img
                          alt=""
                          src={MISSION_ICONS[getMissionIcon(row.missionId)]}
                          className={cn(
                            "size-[34px] shrink-0 object-contain",
                            (muted || row.completed) && "mix-blend-luminosity opacity-60",
                          )}
                        />
                        <span
                          className={cn(
                            LABEL,
                            "min-w-0 flex-1 truncate",
                            muted && "opacity-50",
                            row.completed && "text-[#6b7280] line-through opacity-60",
                          )}
                        >
                          {row.description}
                          {row.target > 1 && !row.completed && row.progress > 0 ? ` · ${row.progress}/${row.target}` : ""}
                        </span>

                        {row.completed ? (
                          <span
                            className={cn(REWARD_BUTTON, "flex w-[45px] shrink-0 items-center justify-center opacity-70")}
                            aria-label={t("missions.completedLabel")}
                          >
                            <Check className="size-[22px] text-[#9ca3af]" strokeWidth={3} />
                            <span aria-hidden className={CHIP_GLOSS} />
                          </span>
                        ) : past ? (
                          <span className={cn(REWARD_BUTTON, "flex w-[45px] shrink-0 items-center justify-center")}>
                            <img alt="" src={lockImg} className="size-[32px] object-contain mix-blend-luminosity" />
                            <span aria-hidden className={CHIP_GLOSS} />
                          </span>
                        ) : (
                          <span
                            className={cn(REWARD_BUTTON, "flex shrink-0 items-center gap-[3px] pl-[7px] pr-[10px]")}
                            aria-label={t("extra.streakCoinsReward", { count: row.coins })}
                          >
                            <img
                              alt=""
                              src={coinImg}
                              className={cn("size-[26px] shrink-0 object-contain", muted && "mix-blend-luminosity opacity-[0.44]")}
                            />
                            <span className={CHIP_TEXT}>+{row.coins}</span>
                            <span aria-hidden className={CHIP_GLOSS} />
                          </span>
                        )}
                      </button>
                    );
                  })}
            </div>
          </section>

        </div>
      </div>

      {/* The full mission, for a row that was cut short — and the way to
          go and do it, when it is today's and still open. */}
      <StreakSheet open={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ""}>
        {detail && (
          <div className="flex flex-col items-center text-center">
            <img
              alt=""
              src={MISSION_ICONS[getMissionIcon(detail.missionId)]}
              className={cn("mt-3 size-[72px] object-contain", detail.completed && "mix-blend-luminosity opacity-60")}
            />
            <p
              className={cn(
                "mt-3 px-2 text-[15px] font-semibold leading-[22px] text-[#402666]",
                detail.completed && "text-slate-500 line-through",
              )}
            >
              {detail.description}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {detail.completed ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">
                  <Check className="size-4" strokeWidth={3} />
                  {t("missions.completedLabel")}
                </span>
              ) : (
                <>
                  {detail.target > 1 && (
                    <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#402666] shadow-sm">
                      {detail.progress}/{detail.target}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#402666] shadow-sm">
                    <img alt="" src={coinImg} className="size-[18px] object-contain" />+{detail.coins}
                  </span>
                </>
              )}
            </div>
            {!!user && selectedSlot.state === "today" && !detail.completed && (
              <SunsetButton
                className="mt-5 w-full"
                onClick={() => {
                  setDetail(null);
                  openMission(detail.missionId);
                }}
              >
                {t("missions.startBtn")}
              </SunsetButton>
            )}
          </div>
        )}
      </StreakSheet>

      {/* The streak's rewards (List Item, 1069:150): coins, once each. */}
      <StreakSheet open={rewardsOpen} onClose={() => setRewardsOpen(false)} title={t("extra.streakMilestonesTitle")}>
        <div className="mt-4 flex flex-col gap-[10px]">
          {milestones.map((m) => {
            const reached = currentStreak >= m.days;
            const paid = claimed.includes(m.days);
            return (
              <div key={m.days} className={cn(ROW, "border-[#efe8f6] bg-[#fbf8ff]")}>
                <span className={cn(LABEL, "flex-1", !reached && "opacity-50")}>
                  {t("extra.daysLabel", { count: m.days })}
                </span>

                {reached ? (
                  <button
                    type="button"
                    disabled={paid || claiming !== null}
                    onClick={() => void onClaim(m.days)}
                    aria-label={`${t("extra.open")} — ${t("extra.streakCoinsReward", { count: m.coins })}`}
                    className={cn(
                      REWARD_BUTTON,
                      "flex min-w-[84px] shrink-0 items-center gap-[3px] pl-[7px] pr-[10px] disabled:cursor-default",
                      paid && "opacity-70",
                    )}
                  >
                    <img
                      alt=""
                      src={moneyBagImg}
                      className={cn("size-[32px] shrink-0 object-contain", paid && "mix-blend-luminosity")}
                    />
                    <span className={CHIP_TEXT}>{paid ? t("missions.claimed") : t("extra.open")}</span>
                    <span aria-hidden className={CHIP_GLOSS} />
                  </button>
                ) : (
                  <span
                    aria-label={t("extra.streakNotYet", { count: m.days - currentStreak })}
                    className={cn(REWARD_BUTTON, "flex w-[45px] shrink-0 items-center justify-center")}
                  >
                    <img alt="" src={lockImg} className="size-[32px] object-contain mix-blend-luminosity" />
                    <span aria-hidden className={CHIP_GLOSS} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </StreakSheet>
    </div>
  );
}
