import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Crown, Flame } from "lucide-react";
import coinPurseIcon from "@/assets/icons/icon-coin-purse.png";
import giftClosedIcon from "@/assets/icons/gift-box.png";
import giftOpenIcon from "@/assets/icons/unboxing-gift.png";
import chestClosedIcon from "@/assets/icons/icon-chest-box.png";
import treasureIcon from "@/assets/icons/pile-of-treasure.png";
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
import { mergeDailyReceipts, type ClaimedReward } from "@/utils/dailyRewardReceipts";
import { RewardRoadCanvas } from "./RewardRoadCanvas";
import { ROAD, clampChipX, roadHeight, roadNodes } from "./rewardRoad";

/**
 * The palette of a stop, and it is deliberately almost empty.
 *
 * Every day used to have its own gradient — seven of them, teal into blue,
 * violet into fuchsia, amber into orange — and under each one a bar in the
 * SAME gradient with the day's takings written across it in white. Seven
 * colour families and fourteen saturated objects on one small screen, with
 * every number set on a gradient it had to fight to be read against. It
 * looked like a coupon app.
 *
 * One saturated thing now: today. Everything else is white, or the sheet's
 * own lavender, and every number is dark violet ink on near-white — which is
 * both quieter and the only version of this screen you can actually read.
 * The day is told by where it sits on the road, not by a colour that means
 * nothing.
 */
const TODAY_FACE = "linear-gradient(180deg, #9B6BF3 0%, #7126D5 100%)";
const TODAY_EDGE = "#5A1BA6";
/** A day already taken, and a day still ahead: white, outlined, quiet. */
const CLAIMED_FACE = "#FFFFFF";
/**
 * Missed: the sheet's own tint, a step away from disappearing.
 *
 * Locked days are NOT drawn in this — the first cut painted both of them the
 * same near-invisible lavender, and the whole bottom half of the road (four
 * days you have not reached yet) came out as a pale wash with two locks
 * floating in it. Ahead of you is not the same as gone: the lock is the
 * difference, on the same white face a claimed day gets.
 */
const SPENT_FACE = "#F4F0FB";
/** The hairline every surface in this app is outlined with. */
const RING = "#E8E0F5";
/** The app's ink. Everything written on the map is this colour at some opacity. */
const INK = "#402666";

/**
 * The box a power-up badge is drawn in on a claimed day's line, in px.
 *
 * Smaller than the 18px the coin and gem use, and deliberately: those two
 * fill about two thirds of their own square, while every power badge fills
 * its file edge to edge. 12 is what puts a badge's ink at roughly the 12px
 * the currency ink measures, so the row reads as one size. See the note at
 * the render site for the measurements.
 *
 * A number rather than a class because TimeIcon takes a `size` prop, and one
 * source for both is the point.
 */
const POWER_ICON_PX = 12;

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

/**
 * The white chip the app draws on a tinted ground: a hairline violet border
 * over a hard edge of the same family. Lifted from MissionsModal's chipStyle
 * so the two chips in the footer are literally the same object as every other
 * chip in the product.
 */
const CHIP_SURFACE = {
  background: "#FFFFFF",
  border: `1.5px solid ${RING}`,
  boxShadow: "0 2px 0 #EDE6F7",
} as const;

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
 * today's claim is still stamped yesterday. The stop this screen called
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

/** The UTC weekday, Monday = 0, to match the order of the stops. */
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

/**
 * One icon and its number, from a day's takings. Everything shrink-0 and
 * nowrap: the line's contract is a single centred row, whatever the day paid.
 *
 * Dark ink on the sheet, not white on a gradient. The gradient bar these used
 * to sit on is gone — it was the loudest object on the map and the hardest
 * thing on it to read.
 *
 * `className` carries the spacing to whatever sits on its left, because that
 * spacing is not the same everywhere — see the render site.
 */
function ClaimedAmount({ icon, value, className = "" }: { icon: string; value: string; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-0.5 text-sm font-bold text-[#402666] ${className}`}>
      <img src={icon} alt="" width={18} height={18} className="shrink-0" />
      {value}
    </span>
  );
}

/**
 * One stop on the road: a medallion sitting on the road, and under it a
 * caption — the weekday, and one line saying what this day did.
 *
 * A stop used to carry three objects: a white pill with the weekday above the
 * medallion, the medallion, and a coloured chip below it holding a receipt, a
 * lock, the word "Missed" or a countdown. Seven of those is twenty-one pieces
 * of furniture on a phone screen. The lock and the "Missed" said what the
 * medallion had already said by being pale, so they are gone; the weekday and
 * the takings are one caption block now, which is also what stops a stop from
 * jumping as its state changes.
 *
 * The caption is clamped back inside the map's edges independently of the
 * medallion — see clampChipX — so the widest line cannot hang off a narrow
 * phone.
 */
function RoadStop({
  date,
  index,
  x,
  y,
  mapWidth,
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
  x: number;
  y: number;
  mapWidth: number;
  state: DayState;
  /** The reveal runs only on today's stop; every other stop gets "idle". */
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
  const isToday = state === "today";
  /** Today, with the reward still there, and nothing already in flight. */
  const isClaimable = isToday && canClaim && phase === "idle";
  /** The last stop of the week is the one worth walking to, so it is treasure. */
  const isFinal = index === 6;
  const weekday = formatWeekday(date, language);

  /**
   * What this day paid. `awarded` is what the server just handed back and is
   * only ever set on today's stop; `claimedReward` is what the tables
   * remember. Preferring the live one matters because it needs no round
   * trip: the takings appear with the confetti rather than after a refetch
   * that may not have happened yet.
   */
  const receipt = awarded ?? claimedReward;

  /**
   * Today is the biggest stop on the road, and Sunday is the next biggest.
   *
   * Sunday pays the most — 300 coins and 5 gems against Monday's 50 — and
   * once the gift under a locked stop became a lock glyph there was nothing
   * left to say so. Size says it, and costs no ink.
   */
  const size = isToday ? 84 : isFinal ? 72 : 62;
  const art = isFinal
    ? showOpenGift
      ? treasureIcon
      : chestClosedIcon
    : showOpenGift
      ? giftOpenIcon
      : giftClosedIcon;

  /**
   * The three surfaces, and only one of them is a colour.
   *
   * Today stands on the app's hard edge, because it is the one thing here you
   * can press. The rest are outlined with the hairline and nothing else — a
   * claimed day is white so the opened gift carries it, a missed or locked one
   * is the sheet's own tint, a step away from disappearing.
   */
  const face = isToday ? TODAY_FACE : isMissed ? SPENT_FACE : CLAIMED_FACE;
  const lift = isToday
    ? `0 0 0 5px #FFFFFF, 0 5px 0 ${TODAY_EDGE}, inset 0 2px 0 rgba(255,255,255,0.22), 0 12px 20px rgba(64,38,102,0.16)`
    : isMissed
      ? `0 0 0 1.5px ${RING}`
      : `0 0 0 1.5px ${RING}, 0 2px 0 #EDE6F7`;

  /**
   * What a stop is, said in words for anyone who cannot see that it is pale.
   *
   * The lock glyph and the greyed gift are the whole visual vocabulary now,
   * which is exactly the sort of economy that leaves a screen reader with
   * nothing. The state is on the medallion instead of printed under it.
   */
  const spokenState =
    state === "claimed"
      ? t("dailyRewards.claimed")
      : isMissed
        ? t("dailyRewards.missed")
        : state === "future"
          ? t("dailyRewards.locked")
          : t("dailyRewards.today");

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={isClaimable ? { scale: 0.94 } : undefined}
        transition={{ delay: index * 0.04, type: "spring", stiffness: 320, damping: 22 }}
        className="absolute z-10 flex items-center justify-center rounded-full"
        role="img"
        aria-label={`${weekday} — ${spokenState}`}
        // Offset by half itself rather than by a -translate-x-1/2 class:
        // framer-motion writes the element's `transform` outright for the
        // entrance scale, which REPLACES a Tailwind translate instead of
        // composing with it. That put every medallion's top-left corner on
        // the road rather than its centre — the gifts sat half a medallion
        // down and to the right of the stop they belong to.
        style={{ left: x - size / 2, top: y - size / 2, width: size, height: size, background: face, boxShadow: lift }}
      >
        {state === "future" ? (
          // Nothing is promised here: what a day pays is decided by
          // claim_daily_reward when it is opened, so a locked stop shows a
          // lock and not a figure.
          <Lock className="h-5 w-5 text-[#B9A8D6]" />
        ) : (
          /* Always the gift — closed, then open. What was inside is shown
             once, in the caption below, where the day's takings already live.

             It used to be shown twice: the prize replaced the gift here AND
             the receipt appeared below it, so the moment of opening had the
             answer in two places and the opened box — the thing that says
             "you opened it" — was never seen at all. */
          <motion.img
            key={showOpenGift ? "open" : "closed"}
            src={art}
            alt=""
            className="object-contain"
            style={{
              width: size * 0.62,
              height: size * 0.62,
              opacity: isMissed ? 0.32 : 1,
              filter: isMissed ? "saturate(0.15)" : undefined,
            }}
            animate={
              phase === "opening"
                ? { rotate: [0, -10, 10, -8, 8, -5, 5, 0], scale: [1, 1.08, 1.08, 1.12, 1.12, 1.15, 1.15, 1.2] }
                : phase === "revealed"
                  // Lands: the lid comes off and it settles, rather than
                  // carrying on bobbing as though still waiting to be opened.
                  ? { scale: [1.2, 0.95, 1], rotate: 0 }
                  : isClaimable
                    ? { y: [0, -4, 0] }
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
        )}

        {/* The ring that says "here, now". Only ever on one stop. */}
        {isClaimable && (
          <motion.span
            className="pointer-events-none absolute inset-[-9px] rounded-full border-2 border-[#9B6BF3]/60"
            animate={{ scale: [1, 1.14, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.1, ease: "easeOut" }}
          />
        )}

        {/* The tap target IS the gift.

            There was a Claim button on a chip under it, which on a road is
            the same instruction written twice: the stop pulses, the gift
            bobs, and then a separate purple bar says press me. On a map you
            press the place you are standing on, so the whole medallion takes
            the tap — an 84px circle, comfortably past the 44pt minimum.

            A real <button> laid over the face rather than a click handler on
            the medallion: it is focusable, it says what it does to a screen
            reader, and it exists ONLY while there is something to claim, so
            there is no disabled control to tab into on the other six stops.
            The press is felt on the medallion itself through whileTap. */}
        {isClaimable && (
          <button
            type="button"
            onClick={canClaim && phase === "idle" ? onClaim : undefined}
            aria-label={t("dailyRewards.claim")}
            className="absolute inset-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7126D5]"
          />
        )}
      </motion.div>

      {/* The caption: the weekday, and one line for what the day did. Fixed
          width and centred, so a stop with takings and a stop without are the
          same object in the same place. */}
      <div
        className="pointer-events-none absolute z-10 w-[176px] -translate-x-1/2 text-center"
        style={{ left: clampChipX(x, mapWidth), top: y + size / 2 + 9 }}
      >
        <div
          className="whitespace-nowrap text-[11px] font-bold capitalize tracking-[0.02em]"
          style={{ color: isToday ? "#7126D5" : INK, opacity: isMissed || state === "future" ? 0.38 : 0.62 }}
        >
          {weekday}
        </div>

        {state === "claimed" || (state === "today" && phase === "revealed") ? (
          receipt ? (
            // What the day actually paid, as one centred line of ink — no
            // pill, no check, no "Claimed" label. The opened gift above it
            // has already said it was taken. Coins are constant; the bonus is
            // at most one more kind — see claim_daily_reward's "never a third
            // pill" rule.
            //
            // The spacing is optical, not nominal, and that is the whole
            // point. A uniform gap measured DEAD EVEN in the box model and
            // still looked wrong, because what a reader sees is the ink, and
            // every glyph here carries a different amount of its own padding:
            // the coin PNG sits ~4px inside its 18px box, the snowflake
            // almost none, and a digit ends flush. Measured off a 3x
            // screenshot, a uniform 12px separated two rewards by only twice
            // what binds an icon to its own number, so "125" and the
            // snowflake read as a single run instead of two things.
            //
            // So: rewards are held ~20px apart, a clear 3x the 6px inside
            // one. Change an icon and these want re-measuring; they are
            // chosen against the art that is here.
            <div className="mt-0.5 flex items-center justify-center whitespace-nowrap">
              <ClaimedAmount icon={coinIcon} value={String(receipt.coins)} />
              {receipt.gems > 0 && (
                <ClaimedAmount icon={gemIcon} value={String(receipt.gems)} className="ml-[18px]" />
              )}
              {/* The power-up badge is NOT sized or spaced like the currency
                  icons beside it, because matching those numbers is what made
                  it look wrong. Both were 18px boxes with gap-0.5, and on
                  screen the snowflake was half again as big as the gem and sat
                  twice as close to its number.

                  The art is why. Measured off the alpha channel, the coin and
                  gem fill about two thirds of their square — 11.4 and 12.0px
                  of ink in an 18px box, with 3.4 and 3.1px of clear space on
                  the right. Every power badge fills its file edge to edge:
                  17.9px of ink in that same box, and 0.1px on the right. So
                  the same 18 drew a bigger icon and the same gap-0.5 drew a
                  tighter gap.

                  POWER_ICON_PX is the box that puts a badge's INK at ~12px
                  tall, matching the coin's 12.1 and the gem's 10.4 — it comes
                  out at 12.0/12.4/12.2/12.1 for freeze, 5050, replace and
                  time-drain, so one number serves all four. gap-[5px] then
                  puts ~5.5px of clear space before the digit against the
                  currencies' 5.1-5.4.

                  object-contain is not decoration either: freeze is 356x393
                  and replace 379x405, so a square box without it stretches
                  both about 10% wide. */}
              {receipt.powerUp && (
                <span className="ml-[18px] flex shrink-0 items-center gap-[5px] text-sm font-bold text-[#402666]">
                  {receipt.powerUp === "time-drain" ? (
                    <TimeIcon size={POWER_ICON_PX} />
                  ) : (
                    <img
                      src={POWER_ICONS[receipt.powerUp] || power5050}
                      alt=""
                      width={POWER_ICON_PX}
                      height={POWER_ICON_PX}
                      className="shrink-0 object-contain"
                    />
                  )}
                  {receipt.powerUpCount}
                </span>
              )}
            </div>
          ) : null
        ) : !canClaim && phase === "idle" && isToday ? (
          // Today, but not yet. The word "Claim" on a button that cannot be
          // pressed is the screen arguing with itself — and with the very
          // countdown underneath it. Say the wait instead.
          //
          // This is belt and braces: with the calendars aligned, a spent day
          // renders as "claimed" above and never reaches here. It still
          // covers the gap while this week's claims are being fetched, when
          // the timer already knows the day is gone and the stop does not.
          <div className="mt-0.5 whitespace-nowrap font-mono text-[13px] font-bold text-[#402666]/55">
            {timeLeft}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function DailyRewardsModal({ isOpen, onClose, currentStreak, onClaim }: DailyRewardsModalProps) {
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
  // Which days of this week have a claim recorded, as UTC yyyy-mm-dd.
  const [claimedDates, setClaimedDates] = useState<Set<string>>(new Set());
  // Per-day receipts (what each claim paid), keyed the same way. Days claimed
  // before the receipt columns existed have none and show a plain check.
  const [claimedRewards, setClaimedRewards] = useState<Record<string, ClaimedReward>>({});
  // What the server actually granted. The gift hides the amount until the
  // claim comes back; PRO Plus multipliers and the once-per-day guard are all
  // decided server-side, so what is revealed is what was actually paid.
  const [awarded, setAwarded] = useState<{ coins: number; gems: number; powerUp: string | null; powerUpCount: number } | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // The map is drawn at the width the device actually gives it — the modal is
  // a share of the viewport, so that is anything from a narrow phone to the
  // desktop cap. Zero until measured, which is the signal not to draw yet.
  const [mapWidth, setMapWidth] = useState(0);

  const week = weekOf(new Date());
  const todayISO = rewardISO(new Date());
  const todayIndex = utcWeekIndex(new Date());

  const nodes = useMemo(() => roadNodes(week.length, mapWidth), [week.length, mapWidth]);
  const mapHeight = useMemo(() => roadHeight(week.length), [week.length]);

  // This week's claims, so the road can say which days were taken and which
  // slipped past — and what each of them paid.
  //
  // Two sources, because one is not enough. user_daily_rewards carries the
  // receipt columns, which is the complete answer: coins, gems AND the
  // power-up. But they are only filled in for days claimed since the
  // migration that added them, so an older claim leaves them NULL and the
  // stop fell back to a bare check — which is why one day in the week showed
  // "100" and the rest showed nothing but a tick.
  //
  // currency_grants is the second source and it is not a guess: the same
  // claim_daily_reward call that writes the receipt also writes a ledger row
  // through apply_currency_grant, with the coins and gems it actually paid.
  // It goes back further than the receipt columns do. It cannot recover the
  // power-up — nothing records that per day — so it fills in underneath the
  // receipt rather than replacing it.
  //
  // RLS scopes both selects to the signed-in player's own rows.
  useEffect(() => {
    if (!isOpen || !user) return;
    let cancelled = false;

    const weekStart = rewardISO(week[0]);
    const weekEnd = rewardISO(week[6]);
    // Exclusive upper bound: the instant Sunday ends, in UTC — the calendar
    // reward_date is stamped on.
    const dayAfterWeek = new Date(week[6]);
    dayAfterWeek.setUTCDate(dayAfterWeek.getUTCDate() + 1);

    void Promise.all([
      supabase
        .from("user_daily_rewards")
        // The receipt columns postdate the generated types — the cast keeps
        // the client from narrowing the row to the stale shape.
        .select("reward_date, daily_claimed, coins_awarded, gems_awarded, power_up, power_up_count" as "*")
        .gte("reward_date", weekStart)
        .lte("reward_date", weekEnd),
      supabase
        .from("currency_grants")
        .select("coins, gems, created_at, reference")
        .eq("kind", "daily_reward")
        .gte("created_at", `${weekStart}T00:00:00.000Z`)
        .lt("created_at", `${rewardISO(dayAfterWeek)}T00:00:00.000Z`),
    ]).then(([daily, grants]) => {
      if (cancelled || !daily.data) return;
      const rows = (daily.data as unknown) as Parameters<typeof mergeDailyReceipts>[0];
      setClaimedDates(new Set(rows.filter((r) => r.daily_claimed).map((r) => String(r.reward_date))));
      const receipts = mergeDailyReceipts(rows, (grants.data ?? []) as Parameters<typeof mergeDailyReceipts>[1]);
      setClaimedRewards(receipts);
    });
    return () => {
      cancelled = true;
    };
    // week is derived from "now" and stable within a day — the open flag is
    // what should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

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

  /**
   * Measure the map, and centre today's stop in the window.
   *
   * A ref callback rather than an effect on the ref: the scroller does not
   * exist while the modal is closed, so there is no node to measure until
   * AnimatePresence has mounted it, and an effect keyed on `isOpen` runs
   * before the entrance transform has settled. The observer then keeps the
   * width honest through a rotation or a desktop resize.
   */
  const attachScroller = useCallback(
    (node: HTMLDivElement | null) => {
      // React calls the ref with null as the modal unmounts, which is the one
      // chance to drop the observer — there is no cleanup phase for a ref
      // callback otherwise, and the modal is mounted and unmounted every time
      // it opens.
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (!node) return;

      setMapWidth(node.clientWidth);
      // Stop i's centre is a known y; subtracting half the window puts today
      // in the middle of it, with the road running off both edges. Jumped, not
      // smoothed: the modal is still arriving, and a scroll animation racing
      // the entrance reads as a stumble.
      node.scrollTop = Math.max(0, ROAD.head + todayIndex * ROAD.step - node.clientHeight / 2);

      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => setMapWidth(node.clientWidth));
      observer.observe(node);
      resizeObserverRef.current = observer;
    },
    [todayIndex]
  );

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

  // How far along the road has actually been walked — gold up to here, plain
  // road after. Today counts as reached whether or not it has been claimed:
  // you are standing on it.
  const travelledThrough = todayIndex;

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
              role="dialog"
              aria-modal="true"
              aria-label={t("dailyRewards.title")}
              // A map wants room: 80% of the viewport in both directions,
              // capped so it does not become a billboard on a desktop and
              // floored so it does not become a slot on a small phone.
              className="relative flex h-[80dvh] max-h-[760px] w-[80vw] min-w-[280px] max-w-[420px] flex-col overflow-hidden rounded-[28px]"
              // The shell every modal in this app is built on: the lavender
              // gradient, not white, over the same hard edge. A white sheet
              // between two of these reads as a different app.
              style={{
                background: "linear-gradient(180deg, #FDFAFF 0%, #F4EEFB 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0,0,0,0.18)",
              }}
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                style={{ boxShadow: "0 2px 0 #E5E7EB" }}
                aria-label="close"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>

              {/* Header: coin purse + title/subtitle, with the streak beside it */}
              <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-5">
                <img src={coinPurseIcon} alt="" className="h-[52px] w-[52px] shrink-0 object-contain" />
                <div className="min-w-0 pr-10">
                  <h2 className="font-display text-lg font-bold text-[#402666]">
                    {t("dailyRewards.title")}
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#402666]/70">{t("dailyRewards.subtitle")}</p>
                </div>
              </div>

              {/* The road itself: a fixed-height box that scrolls itself.
                  The document does not scroll on iOS (nativeShell disables
                  the webview's scroller outright), so a map that simply grew
                  would be frozen solid on the device — CLAUDE.md rule 4b.

                  min-h-0 is what makes flex-1 mean "take what is left and
                  scroll the rest": without it the box refuses to shrink below
                  its content and the map pushes the footer off the modal. */}
              <div className="relative min-h-0 flex-1">
                <div
                  ref={attachScroller}
                  className="scrollbar-hide absolute inset-0 overflow-y-auto overscroll-contain"
                >
                  <div className="relative" style={{ width: "100%", height: mapHeight }}>
                    {mapWidth > 0 && (
                      <>
                        <RewardRoadCanvas
                          width={mapWidth}
                          height={mapHeight}
                          nodes={nodes}
                          travelledThrough={travelledThrough}
                        />
                        {week.map((date, index) => (
                          <RoadStop
                            key={rewardISO(date)}
                            date={date}
                            index={index}
                            x={nodes[index].x}
                            y={nodes[index].y}
                            mapWidth={mapWidth}
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
                      </>
                    )}
                  </div>
                </div>

                {/* The road runs on under the header and the footer rather
                    than stopping at them — these two fades are what sell that.
                    Anchored to the scrolling box, not to the modal, so a
                    footer that wraps to two rows cannot leave a fade stranded
                    in the middle of it. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-[#FDFAFF] to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-[#F4EEFB] to-transparent" />
              </div>

              {/* The streak, and the VIP bonus when there is one.

                  This has now been three things. It started as three pastel
                  pills floating under the map like stickers; then it was the
                  missions sheet's streak row, a full-width green gradient bar
                  — which is a fine component there, and here was the loudest
                  object on a screen whose whole point had become restraint.
                  It is two of the app's own white chips, centred, and it is
                  the last thing you look at rather than the first.

                  The countdown is not here. It belongs to today's stop, where
                  the gift you cannot open yet is, and the modal opens centred
                  on it — a second clock down here was the screen saying the
                  same thing twice. */}
              <div className="flex shrink-0 items-center justify-center gap-2 px-4 pb-4 pt-1">
                <div
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={CHIP_SURFACE}
                >
                  <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold" style={{ color: INK }}>
                    {t("missions.streak")}
                  </span>
                  <span className="text-xs font-bold" style={{ color: INK, opacity: 0.55 }}>
                    {currentStreak} {t("missions.days")}
                  </span>
                </div>

                {isProPlus() && (
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={CHIP_SURFACE}>
                    <Crown className="h-3.5 w-3.5 text-[#7126D5]" />
                    <span className="text-xs font-bold" style={{ color: INK }}>
                      {t("extra.vipBonusPercent")}
                    </span>
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
