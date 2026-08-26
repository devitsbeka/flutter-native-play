import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Clock, Crown } from "lucide-react";
import coinPurseIcon from "@/assets/icons/icon-coin-purse.png";
import giftClosedIcon from "@/assets/icons/gift-box.png";
import giftOpenIcon from "@/assets/icons/unboxing-gift.png";
import { useSound } from "@/contexts/SoundContext";
import { useRewardTimers, useDailyRewardsClaim } from "@/hooks/useRewardTimers";
import confetti from "canvas-confetti";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { FlyingCurrency } from "@/components/shared/FlyingCurrency";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVipStatus } from "@/hooks/useVipStatus";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatWeekday } from "@/utils/localDate";
import power5050 from "@/assets/powers/5050.png";
import powerFreeze from "@/assets/powers/freeze.png";
import powerReplace from "@/assets/powers/replace.png";
import { TimeIcon } from "@/components/shared/TimeIcon";

const POWER_ICONS: Record<string, string | null> = {
  "5050": power5050,
  freeze: powerFreeze,
  replace: powerReplace,
  "time-drain": null, // drawn by TimeIcon instead of an image
};

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  onClaim?: () => void;
}

// Per-day card gradients: bright same-family color pairs — cross-family
// blends (teal into rose etc.) muddy out in the middle and read dark
const DAY_GRADIENTS: [string, string][] = [
  ["#34D399", "#2563EB"], // Mon teal → blue
  ["#A78BFA", "#D946EF"], // Tue violet → fuchsia
  ["#FBBF24", "#F97316"], // Wed amber → orange
  ["#FB7185", "#EC4899"], // Thu coral → pink
  ["#22D3EE", "#3B82F6"], // Fri cyan → blue
  ["#818CF8", "#A855F7"], // Sat indigo → violet
  ["#FDE047", "#F59E0B"], // Sun gold
];

const cardGradient = (index: number) => {
  const [from, to] = DAY_GRADIENTS[index % DAY_GRADIENTS.length];
  return `linear-gradient(215deg, ${from} 0%, ${to} 100%)`;
};

const celebrateClaim = () => {
  confetti({
    particleCount: 120,
    spread: 75,
    origin: { y: 0.55 },
    colors: ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1"],
    zIndex: 9999,
  });
};

/**
 * A reward day as yyyy-mm-dd, in UTC — the calendar the rewards actually run
 * on.
 *
 * Not a style choice. `claim_daily_reward` writes `reward_date := CURRENT_DATE`
 * on a Postgres server set to UTC, useRewardTimers looks the row up by
 * `new Date().toISOString()`, and dailyResetCountdown counts to UTC midnight.
 * Three things agreeing; this screen was the fourth, keyed to the DEVICE's
 * local date, and it disagreed with all of them.
 *
 * What that looked like: in any timezone east of UTC, between local midnight
 * and the offset, the local date is already tomorrow while the row holding
 * today's claim is still stamped yesterday. The card this screen called
 * "today" therefore found no claim and drew a closed gift with a Claim
 * button, while the timer — reading the right row — knew the day was spent
 * and disabled it. A Claim you cannot press, over a running countdown.
 * At UTC+4 that is every night between 00:00 and 04:00.
 *
 * The database owns the boundary and cannot be told otherwise from here, so
 * the client matches the database. The visible consequence is that the day
 * turns over at UTC midnight — 04:00 in Tbilisi — which is exactly when the
 * next reward becomes claimable. Rewards on the player's own local day would
 * mean storing their timezone and changing the function; a different job.
 */
export const rewardISO = (d: Date) => d.toISOString().split("T")[0];

/** The UTC weekday, Monday = 0, to match the row of cards. */
const utcWeekIndex = (d: Date) => (d.getUTCDay() + 6) % 7;

/** Monday..Sunday of the UTC week containing `today`. */
export const weekOf = (today: Date): Date[] => {
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - utcWeekIndex(today));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d;
  });
};

type DayState = "claimed" | "missed" | "today" | "future";
type ClaimPhase = "idle" | "opening" | "revealed";

/** What a claim paid — the receipt the claimed pill shows. */
interface ClaimedReward {
  coins: number;
  gems: number;
  powerUp: string | null;
  powerUpCount: number;
}

// One compact icon+amount pair for the claimed pill. Everything shrink-0 and
// nowrap: the pill's contract is a single centered line, whatever the day paid.
function ClaimedAmount({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5 text-sm font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
      <img src={icon} alt="" width={18} height={18} className="shrink-0" />
      {value}
    </span>
  );
}

function DayRewardCard({
  date,
  index,
  state,
  phase,
  awarded,
  claimedReward,
  canClaim,
  timeLeft,
  onClaim,
  language,
  t,
}: {
  date: Date;
  index: number;
  state: DayState;
  /** The reveal runs only on today's card; every other card gets "idle". */
  phase: ClaimPhase;
  awarded: ClaimedReward | null;
  /** The receipt for an already-claimed day; null for pre-receipt claims. */
  claimedReward: ClaimedReward | null;
  canClaim: boolean;
  /** How long until the next reward, for the not-yet-claimable state. */
  timeLeft: string;
  onClaim: () => void;
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const isMissed = state === "missed";
  const showOpenGift = state === "claimed" || phase === "revealed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative flex h-[260px] w-[272px] flex-shrink-0 snap-center flex-col items-center justify-between overflow-hidden rounded-[24px] px-3 py-6"
      style={{
        background: cardGradient(index),
        filter: isMissed
          ? "saturate(0.25) brightness(0.92)"
          : state === "future"
            ? "saturate(0.75) brightness(1.05)"
            : undefined,
      }}
    >
      {/* Weekday label — the calendar, not a streak counter */}
      <span className="font-display text-2xl font-bold capitalize text-white drop-shadow-sm">
        {formatWeekday(date, language)}
      </span>

      {/* The middle: a gift until it is opened. What is inside is the
          server's decision, so nothing is promised here — the surprise IS
          the feature. */}
      <div className="relative flex h-[96px] items-center justify-center">
        {/* Always the gift — closed, then open. What was inside is shown once,
            on the button, where the day's receipt already lives.

            It used to be shown twice: the prize replaced the gift here AND
            the receipt appeared below it, so the moment of opening had the
            answer in two places and the opened box — the thing that says
            "you opened it" — was never seen at all. */}
        <motion.img
          key={showOpenGift ? "open" : "closed"}
          src={showOpenGift ? giftOpenIcon : giftClosedIcon}
          alt=""
          className="h-[88px] w-[88px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
          style={{ opacity: isMissed ? 0.55 : 1 }}
          animate={
            phase === "opening"
              ? { rotate: [0, -10, 10, -8, 8, -5, 5, 0], scale: [1, 1.08, 1.08, 1.12, 1.12, 1.15, 1.15, 1.2] }
              : phase === "revealed"
                // Lands: the lid comes off and it settles, rather than
                // carrying on bobbing as though still waiting to be opened.
                ? { scale: [1.2, 0.95, 1], rotate: 0 }
                : state === "today" && canClaim
                  ? { y: [0, -5, 0] }
                  : undefined
          }
          transition={
            phase === "opening"
              ? { duration: 0.85 }
              : phase === "revealed"
                ? { duration: 0.45 }
                : { repeat: Infinity, duration: 1.8, ease: "easeInOut" }
          }
        />
      </div>

      {/* State row */}
      {state === "claimed" || (state === "today" && phase === "revealed") ? (
        claimedReward ? (
          // The receipt: check + what the day actually paid, one centered
          // line always (nowrap, everything shrink-0) — no "Claimed" label,
          // the check says it. Coins are constant; the bonus is at most one
          // more kind — see claim_daily_reward's "never a third pill" rule.
          //
          // The gap here is what separates one reward from the next, and it
          // has to beat the gap INSIDE a reward by enough to group them: at
          // 6px against the icon's own 2px, the coin's amount and the next
          // reward's icon sat closer than a pair of digits and "125❄" read as
          // one run. Widened to 12px and the inner gaps left alone, so each
          // icon still reads as belonging to its own number. There is room —
          // the card is 272px and the widest receipt is about 100px of it.
          <div
            className="flex h-[50px] min-w-[144px] max-w-full items-center justify-center gap-3 whitespace-nowrap rounded-[18px] px-3"
            style={{ background: "rgba(255,255,255,0.3)" }}
          >
            <Check className="h-5 w-5 shrink-0 text-white" />
            <ClaimedAmount icon={coinIcon} value={String(claimedReward.coins)} />
            {claimedReward.gems > 0 && <ClaimedAmount icon={gemIcon} value={String(claimedReward.gems)} />}
            {claimedReward.powerUp && (
              <span className="flex shrink-0 items-center gap-0.5 text-sm font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
                {claimedReward.powerUp === "time-drain" ? (
                  <TimeIcon size={18} />
                ) : (
                  <img src={POWER_ICONS[claimedReward.powerUp] || power5050} alt="" width={18} height={18} className="shrink-0" />
                )}
                {claimedReward.powerUpCount}x
              </span>
            )}
          </div>
        ) : (
          // Claimed before receipts existed — nothing to itemize, the check
          // alone marks the day taken.
          <div
            className="flex h-[50px] w-[144px] items-center justify-center rounded-[18px]"
            style={{ background: "rgba(255,255,255,0.3)" }}
          >
            <Check className="h-6 w-6 text-white" />
          </div>
        )
      ) : isMissed ? (
        <div
          className="flex h-[50px] w-[144px] items-center justify-center rounded-[18px]"
          style={{ background: "rgba(255,255,255,0.22)" }}
        >
          <span className="text-base font-bold text-white/85">{t("dailyRewards.missed")}</span>
        </div>
      ) : state === "future" ? (
        <div
          className="flex h-[50px] w-[144px] items-center justify-center rounded-[18px]"
          style={{ background: "rgba(255,255,255,0.25)" }}
        >
          <Lock className="h-5 w-5 text-white/80" />
        </div>
      ) : (
        !canClaim && phase === "idle" ? (
          // Today, but not yet. The word "Claim" on a button that cannot be
          // pressed is the screen arguing with itself — and with the very
          // countdown underneath it. Say the wait instead.
          //
          // This is belt and braces: with the calendars aligned, a spent day
          // renders as "claimed" above and never reaches here. It still
          // covers the gap while this week's claims are being fetched, when
          // the timer already knows the day is gone and the card does not.
          <div
            className="flex h-[50px] w-[144px] items-center justify-center rounded-[18px]"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            <span className="font-mono text-base font-bold text-white/90">{timeLeft}</span>
          </div>
        ) : (
        <motion.button
          onClick={canClaim && phase === "idle" ? onClaim : undefined}
          disabled={!canClaim || phase !== "idle"}
          whileTap={canClaim ? { scale: 0.95 } : undefined}
          animate={canClaim && phase === "idle" ? { scale: [1, 1.04, 1] } : undefined}
          transition={canClaim && phase === "idle" ? { repeat: Infinity, duration: 1.6 } : undefined}
          className="h-[50px] w-[144px] rounded-[18px] text-lg font-bold text-black disabled:opacity-60"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(254,254,254,0.6) 100%)",
          }}
        >
          {phase === "opening" ? "…" : t("dailyRewards.claim")}
        </motion.button>
        )
      )}
    </motion.div>
  );
}

export function DailyRewardsModal({ isOpen, onClose, onClaim }: DailyRewardsModalProps) {
  const { t, language } = useLanguage();
  const { playSound, vibrate } = useSound();
  const { user } = useAuth();
  const { canClaimDaily, dailyTimeLeft, refreshTimers } = useRewardTimers();
  const { claimDailyReward } = useDailyRewardsClaim();
  const { isProPlus } = useVipStatus();
  const [claimedToday, setClaimedToday] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showFlyingGems, setShowFlyingGems] = useState(false);
  const [phase, setPhase] = useState<ClaimPhase>("idle");
  // Which days of this week have a claim recorded, as local yyyy-mm-dd.
  const [claimedDates, setClaimedDates] = useState<Set<string>>(new Set());
  // Per-day receipts (what each claim paid), keyed the same way. Days claimed
  // before the receipt columns existed have none and show a plain "Claimed".
  const [claimedRewards, setClaimedRewards] = useState<Record<string, ClaimedReward>>({});
  // What the server actually granted. The gift hides the amount until the
  // claim comes back; PRO Plus multipliers and the once-per-day guard are all
  // decided server-side, so what is revealed is what was actually paid.
  const [awarded, setAwarded] = useState<{ coins: number; gems: number; powerUp: string | null; powerUpCount: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const week = weekOf(new Date());
  const todayISO = rewardISO(new Date());
  const todayIndex = utcWeekIndex(new Date());

  // This week's claims, so the row can say which days were taken and which
  // slipped past. RLS scopes the select to the signed-in player's own rows.
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;
    void supabase
      .from("user_daily_rewards")
      // The receipt columns postdate the generated types — the cast keeps
      // the client from narrowing the row to the stale shape.
      .select("reward_date, daily_claimed, coins_awarded, gems_awarded, power_up, power_up_count" as "*")
      .gte("reward_date", rewardISO(week[0]))
      .lte("reward_date", rewardISO(week[6]))
      .then(({ data }) => {
        if (cancelled || !data) return;
        const rows = (data as unknown) as {
          reward_date: string;
          daily_claimed: boolean | null;
          coins_awarded?: number | null;
          gems_awarded?: number | null;
          power_up?: string | null;
          power_up_count?: number | null;
        }[];
        const claimed = rows.filter((r) => r.daily_claimed);
        setClaimedDates(new Set(claimed.map((r) => String(r.reward_date))));
        const receipts: Record<string, ClaimedReward> = {};
        for (const r of claimed) {
          if (r.coins_awarded == null) continue; // claimed before receipts existed
          receipts[String(r.reward_date)] = {
            coins: r.coins_awarded,
            gems: r.gems_awarded ?? 0,
            powerUp: r.power_up ?? null,
            powerUpCount: r.power_up_count ?? 0,
          };
        }
        setClaimedRewards(receipts);
      });
    return () => {
      cancelled = true;
    };
    // week is derived from "now" and stable within a day — the open flag is
    // what should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  // Mouse-drag scrolling with momentum for the day-cards row. Touch keeps
  // native scrolling; snap is lifted while dragging (assigning scrollLeft
  // under "snap mandatory" fights the browser and feels broken) and light
  // proximity snapping returns once the momentum settles.
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0, lastX: 0, lastT: 0, v: 0, raf: 0 });

  const dragPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = scrollContainerRef.current;
    if (!el) return;
    cancelAnimationFrame(drag.current.raf);
    el.style.scrollSnapType = "none";
    drag.current = { down: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft, lastX: e.clientX, lastT: performance.now(), v: 0, raf: 0 };
  };

  const dragPointerMove = (e: React.PointerEvent) => {
    const s = drag.current;
    if (!s.down) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 5) s.moved = true;
    el.scrollLeft = s.startScroll - dx;
    const now = performance.now();
    const dt = now - s.lastT;
    if (dt > 0) s.v = (s.lastX - e.clientX) / dt;
    s.lastX = e.clientX;
    s.lastT = now;
  };

  const dragPointerUp = () => {
    const s = drag.current;
    if (!s.down) return;
    s.down = false;
    const el = scrollContainerRef.current;
    if (!el) return;
    let v = s.v * 16;
    const glide = () => {
      if (Math.abs(v) < 0.5) {
        el.style.scrollSnapType = "x proximity";
        return;
      }
      el.scrollLeft += v;
      v *= 0.92;
      s.raf = requestAnimationFrame(glide);
    };
    s.raf = requestAnimationFrame(glide);
    // A real drag must not trigger the card's claim button on release
    if (s.moved) {
      const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
      el.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => el.removeEventListener("click", swallow, { capture: true } as any), 0);
    }
  };

  // Sync claimed state with timer hook
  useEffect(() => {
    setClaimedToday(!canClaimDaily);
  }, [canClaimDaily]);

  // Escape dismisses the modal, same as backdrop and the X button
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Scroll to center today's card when the modal opens
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Card i's center = px-6 edge padding (24) + i * (272 card + 16 gap)
      // + half a card; subtracting half the viewport centers it exactly, so
      // both peeking neighbors show through with equal gaps.
      const cardWidth = 272 + 16; // w-[272px] + gap-4 (16px)
      const scrollPosition = 24 + todayIndex * cardWidth + 136 - container.offsetWidth / 2;
      setTimeout(() => {
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, todayIndex]);

  const handleClaim = async () => {
    if (claimedToday || !canClaimDaily || phase !== "idle") return;

    // The gift wobbles while the server decides what is inside — never less
    // than the wobble's own length, or a fast answer cuts the animation dead.
    setPhase("opening");
    vibrate([50, 30, 50]);
    const minWobble = new Promise((r) => setTimeout(r, 900));
    const [claim] = await Promise.all([claimDailyReward(), minWobble]);
    if (!claim) {
      setPhase("idle");
      return;
    }

    const receipt = { coins: claim.coins, gems: claim.gems, powerUp: claim.powerUp, powerUpCount: claim.powerUpCount };
    setAwarded(receipt);
    setPhase("revealed");
    playSound("reward");
    celebrateClaim();
    setClaimedDates((prev) => new Set([...prev, todayISO]));
    setClaimedRewards((prev) => ({ ...prev, [todayISO]: receipt }));
    refreshTimers();

    // Let the prize wiggle, then fly it to the wallet and close.
    setTimeout(() => {
      setClaimedToday(true);
      setShowFlyingCoins(true);
      if (claim.gems > 0) setTimeout(() => setShowFlyingGems(true), 300);
      setTimeout(() => {
        setShowFlyingCoins(false);
        setShowFlyingGems(false);
        setPhase("idle");
        onClaim?.();
        onClose();
      }, 1400);
    }, 2400);
  };

  // A day is "claimed" only when the ledger has a claim on that date. The
  // cooldown flag must not paint today claimed: the server's day flips at UTC
  // midnight, so a claim late on Saturday kept blocking through the small
  // hours of local Sunday — and Sunday then showed "Claimed" with nothing
  // claimed (and no receipt). Today with the cooldown still running renders
  // as "today" with the claim button disabled and the countdown below.
  const stateOf = (date: Date, index: number): DayState => {
    const iso = rewardISO(date);
    if (claimedDates.has(iso))
      return index === todayIndex && phase !== "idle" ? "today" : "claimed";
    if (index === todayIndex) return "today";
    return iso < todayISO ? "missed" : "future";
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))] backdrop-blur-[2px]"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-[24px] bg-white"
              style={{ boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)" }}
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                style={{ boxShadow: "0 2px 0 #E5E7EB" }}
                aria-label="close"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>

              {/* Header: coin purse + title/subtitle */}
              <div className="flex items-center gap-3 px-6 pt-6">
                <img src={coinPurseIcon} alt="" className="h-[64px] w-[64px] object-contain" />
                <div>
                  <h2 className="font-display text-xl font-bold text-[#402666]">
                    {t("dailyRewards.title")}
                  </h2>
                  <p className="mt-0.5 text-sm text-[#402666]/70">{t("dailyRewards.subtitle")}</p>
                </div>
              </div>

              {/* Weekday cards — next card peeks in from the right */}
              <div
                ref={scrollContainerRef}
                className="scrollbar-hide mt-6 flex cursor-grab select-none gap-4 overflow-x-auto px-6 pb-2 active:cursor-grabbing"
                style={{ scrollSnapType: "x proximity" }}
                onPointerDown={dragPointerDown}
                onPointerMove={dragPointerMove}
                onPointerUp={dragPointerUp}
                onPointerLeave={dragPointerUp}
              >
                {week.map((date, index) => (
                  <DayRewardCard
                    key={rewardISO(date)}
                    date={date}
                    index={index}
                    state={stateOf(date, index)}
                    phase={index === todayIndex ? phase : "idle"}
                    awarded={index === todayIndex ? awarded : null}
                    claimedReward={claimedRewards[rewardISO(date)] ?? null}
                    canClaim={canClaimDaily && !claimedToday}
                    timeLeft={dailyTimeLeft}
                    onClaim={handleClaim}
                    language={language}
                    t={t}
                  />
                ))}
              </div>

              {/* Next-claim timer + VIP bonus */}
              <div className="flex min-h-[46px] items-center justify-center gap-2 px-6 pb-5 pt-2">
                {!canClaimDaily && (
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{
                      background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
                      boxShadow: "0 2px 0 #FCD34D",
                    }}
                  >
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="font-mono text-sm font-bold text-amber-700">{dailyTimeLeft}</span>
                  </div>
                )}
                {isProPlus() && (
                  <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5">
                    <Crown className="h-4 w-4 text-white" />
                    <span className="text-sm font-bold text-white">{t("extra.vipBonusPercent")}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying Currency Animations - outside modal for proper z-index */}
      <AnimatePresence>
        {showFlyingCoins && awarded && (
          <FlyingCurrency type="coins" amount={awarded.coins} isActive={showFlyingCoins} />
        )}
        {showFlyingGems && awarded && awarded.gems > 0 && (
          <FlyingCurrency type="gems" amount={awarded.gems} isActive={showFlyingGems} />
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyRewardsModal;
