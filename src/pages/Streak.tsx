import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useStreakMilestones } from "@/hooks/useStreakMilestones";
import { formatDayMonthShort, formatWeekdayShort } from "@/utils/localDate";
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
 * It replaces a modal that said the same three things in a generic sheet:
 * the last seven days as a row of orange chips, the two counts, and a list
 * of "XP bonus" milestones that nothing in the app ever granted (see the
 * note in levelCalculation about advertised rewards). This page shows the
 * week the design draws — a coin for every day kept, the flame on today,
 * the chest at the end of the row — and the milestones pay: real coins,
 * once each, through claim_streak_milestone.
 *
 * The streak is profiles.current_streak, which the home flame and every
 * results screen already mean by the word: it is advanced by
 * increment_profile_stats on a win and reset on a loss.
 */

const CARD_SHADOW =
  "shadow-[0px_2px_8px_0px_rgba(102,51,153,0.06),0px_8px_24px_0px_rgba(102,51,153,0.12)]";
/** The stat cards' box (1069:451). */
const RAIL =
  "border border-[rgba(156,100,181,0.5)] bg-[#faf0fa] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)] rounded-[20px]";
/** The reward button's chrome (Button - Coins, 1069:466), open and locked alike. */
const REWARD_BUTTON =
  "relative h-[43px] rounded-[14.616px] border border-[#e8e0f5] shadow-[0px_2.94px_0px_0px_#d8d0e8,0px_4.409px_11.758px_0px_rgba(0,0,0,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.5)_0%,rgba(254,254,254,0.5)_100%)]";

type DaySlot = {
  date: Date;
  /** Three days either side of today, so today is the fourth of seven. */
  offset: number;
  state: "done" | "missed" | "today" | "ahead";
};

export default function Streak() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const { milestones, claimed, claiming, claim } = useStreakMilestones();
  const listRef = useRef<HTMLDivElement>(null);

  const currentStreak = profile?.current_streak || 0;
  const bestStreak = Math.max(profile?.best_streak || 0, currentStreak);

  // The week (1069:345): today sits in the fourth slot with three days
  // either side, and the last slot is the chest. A day behind today is
  // "done" while the running streak still covers it — the streak counts
  // today as its first day — and missed once it is past that.
  const week = useMemo<DaySlot[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const offset = i - 3;
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const state: DaySlot["state"] =
        offset === 0 ? "today" : offset > 0 ? "ahead" : currentStreak > -offset ? "done" : "missed";
      return { date, offset, state };
    });
  }, [currentStreak]);

  const dateRange = `${formatDayMonthShort(week[0].date, language)} - ${formatDayMonthShort(week[6].date, language)}`;

  const onClaim = async (days: number, coins: number) => {
    const awarded = await claim(days);
    if (awarded !== null) toast.success(`+${t("extra.streakCoinsReward", { count: awarded })}`);
    else toast.error(t("common.error"));
    void coins;
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

          {/* The week (1069:336). */}
          <section className="mt-[22px] px-4">
            <div className="flex items-center gap-[6px]">
              <Calendar className="h-4 w-4 text-[#6b7280]" strokeWidth={1.33} />
              <span className="font-[Nunito] text-[14px] font-medium leading-5 tracking-[-0.16px] text-[#4b5563]">
                {dateRange}
              </span>
            </div>
            <div className="mt-[13px] flex h-[62px] gap-[14px]">
              {week.map((slot, i) => {
                const isChest = i === 6;
                const label = formatWeekdayShort(slot.date, language);
                const tile = cn(
                  "relative flex h-full min-w-0 flex-1 flex-col items-center rounded-[16px] py-2",
                  slot.state === "today"
                    ? "border border-[#ffba26] bg-[rgba(255,186,38,0.1)] shadow-[0px_2px_0px_0px_#e5e7eb]"
                    : isChest
                      ? "bg-[#402666]"
                      : "bg-white drop-shadow-[0px_2px_0px_#e5e7eb]",
                );
                const art = isChest ? chestImg : slot.state === "today" ? flameImg : coinImg;
                // The days not yet kept — ahead, or behind and missed — wear
                // the coin greyed (1069:516): luminosity at 44%.
                const dim = !isChest && (slot.state === "ahead" || slot.state === "missed");
                const inner = (
                  <>
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
                  </>
                );
                return isChest ? (
                  <button
                    key={i}
                    type="button"
                    aria-label={t("extra.streakWeekChest")}
                    onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className={tile}
                  >
                    {inner}
                  </button>
                ) : (
                  <div key={i} className={tile}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Current / Best (1069:451, 1069:457). */}
          <section className="mt-[29px] grid grid-cols-2 gap-[23px] px-[22px]">
            {[
              { label: t("extra.currentLabel"), value: currentStreak },
              { label: t("extra.bestLabel"), value: bestStreak },
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

          {/* The milestones (List Item, 1069:150). */}
          <div ref={listRef} className="mx-[27px] mt-[23px] flex flex-col gap-[10px] pb-6">
            {milestones.map((m) => {
              const reached = currentStreak >= m.days;
              const paid = claimed.includes(m.days);
              return (
                <div
                  key={m.days}
                  className={cn(
                    "relative flex h-[66px] min-h-[64px] items-center rounded-[16px] border-2 border-[rgba(255,255,255,0.6)] bg-[rgba(252,247,255,0.6)] px-[14px]",
                    CARD_SHADOW,
                  )}
                >
                  <span
                    className={cn(
                      "font-[Nunito] text-[15px] font-semibold leading-[22.5px] tracking-[-0.16px] text-[#0f1729]",
                      !reached && "opacity-50",
                    )}
                  >
                    {t("extra.daysLabel", { count: m.days })}
                  </span>

                  {reached ? (
                    <button
                      type="button"
                      disabled={paid || claiming !== null}
                      onClick={() => void onClaim(m.days, m.coins)}
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
                      <span className="font-[Nunito] text-[12px] font-bold leading-[25.132px] tracking-[-0.36px] text-[#334155]">
                        {paid ? t("missions.claimed") : t("extra.open")}
                      </span>
                      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.47px_0px_0px_white]" />
                    </button>
                  ) : (
                    <span
                      aria-label={t("extra.streakNotYet", { count: m.days - currentStreak })}
                      className={cn(REWARD_BUTTON, "absolute right-[15px] flex w-[45px] items-center justify-center")}
                    >
                      <img alt="" src={lockImg} className="size-[32px] object-contain mix-blend-luminosity" />
                      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.47px_0px_0px_white]" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
