import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Calendar, Check } from "lucide-react";
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
    // Ledger rows (the day bonus) are not missions to do.
    return day.missions
      .filter((m) => m.mission_id !== "day_bonus" && m.mission_id !== "week_bonus")
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

          {/* The week (1069:336): one tappable tile per day. */}
          <section className="mt-[29px] px-4">
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
                    aria-pressed={isSelected}
                    onClick={() => setSelected(slot.key)}
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
            <p className="mt-[12px] text-center font-[Nunito] text-[12px] font-medium leading-[16px] tracking-[-0.16px] text-[#6b7280]">
              {t("extra.streakKeepRule")}
            </p>
          </section>

          {/* The selected day's missions (List Item, 1069:150), easiest first. */}
          <section className="mt-[23px] px-[27px]">
            <div className="mb-[10px] flex items-baseline justify-between">
              <h2 className="font-[Nunito] text-[16px] font-bold leading-[22px] tracking-[-0.16px] text-[#402666]">
                {t("extra.streakDayMissions")}
              </h2>
              <span className="font-[Nunito] text-[12px] font-medium leading-[16px] tracking-[-0.16px] text-[#6b7280]">
                {formatDayWithWeekday(selectedSlot.date, language, { utc: true })}
              </span>
            </div>
            <div className="flex flex-col gap-[10px]">
              {user && day.loading && rows.length === 0
                ? Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className={cn(ROW, "animate-pulse", CARD_SHADOW)} aria-hidden />
                  ))
                : rows.map((row) => {
                    const canWork = !!user && selectedSlot.state === "today" && !row.completed;
                    const past = selectedSlot.state === "kept" || selectedSlot.state === "missed";
                    const muted = !row.completed && (past || selectedSlot.state === "ahead");
                    const body = (
                      <>
                        <img
                          alt=""
                          src={MISSION_ICONS[getMissionIcon(row.missionId)]}
                          className={cn("mr-[10px] size-[34px] shrink-0 object-contain", muted && "mix-blend-luminosity opacity-60")}
                        />
                        <span className={cn("flex min-w-0 flex-1 flex-col pr-[96px] text-left", muted && "opacity-50")}>
                          <span className={cn(LABEL, "truncate leading-[20px]")}>{row.title}</span>
                          <span className="truncate font-[Nunito] text-[12px] font-medium leading-[16px] tracking-[-0.16px] text-[#6b7280]">
                            {row.description}
                            {row.target > 1 && !row.completed && row.progress > 0 ? ` · ${row.progress}/${row.target}` : ""}
                          </span>
                        </span>

                        {row.completed ? (
                          <span
                            className={cn(REWARD_BUTTON, "absolute right-[15px] flex items-center gap-[3px] pl-[7px] pr-[10px] opacity-70")}
                            aria-label={t("missions.completedLabel")}
                          >
                            <Check className="size-[18px] text-[#10b981]" strokeWidth={3} />
                            <span className={CHIP_TEXT}>{t("missions.completedLabel")}</span>
                            <span aria-hidden className={CHIP_GLOSS} />
                          </span>
                        ) : past ? (
                          <span className={cn(REWARD_BUTTON, "absolute right-[15px] flex w-[45px] items-center justify-center")}>
                            <img alt="" src={lockImg} className="size-[32px] object-contain mix-blend-luminosity" />
                            <span aria-hidden className={CHIP_GLOSS} />
                          </span>
                        ) : (
                          <span
                            className={cn(REWARD_BUTTON, "absolute right-[15px] flex items-center gap-[3px] pl-[7px] pr-[10px]")}
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
                      </>
                    );
                    return canWork ? (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => openMission(row.missionId)}
                        className={cn(ROW, "w-full text-left active:scale-[0.99]", CARD_SHADOW)}
                      >
                        {body}
                      </button>
                    ) : (
                      <div key={row.id} className={cn(ROW, CARD_SHADOW)}>
                        {body}
                      </div>
                    );
                  })}
            </div>
          </section>

          {/* The milestones (List Item, 1069:150): coins, once each. */}
          <section className="mt-[23px] px-[27px] pb-6">
            <h2 className="mb-[10px] font-[Nunito] text-[16px] font-bold leading-[22px] tracking-[-0.16px] text-[#402666]">
              {t("extra.streakMilestonesTitle")}
            </h2>
            <div className="flex flex-col gap-[10px]">
              {milestones.map((m) => {
                const reached = currentStreak >= m.days;
                const paid = claimed.includes(m.days);
                return (
                  <div key={m.days} className={cn(ROW, CARD_SHADOW)}>
                    <span className={cn(LABEL, !reached && "opacity-50")}>
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
                          "absolute right-[15px] flex min-w-[84px] items-center gap-[3px] pl-[7px] pr-[10px] disabled:cursor-default",
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
                        className={cn(REWARD_BUTTON, "absolute right-[15px] flex w-[45px] items-center justify-center")}
                      >
                        <img alt="" src={lockImg} className="size-[32px] object-contain mix-blend-luminosity" />
                        <span aria-hidden className={CHIP_GLOSS} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
