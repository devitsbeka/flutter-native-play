import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Clock, Crown } from "lucide-react";
import coinPurseIcon from "@/assets/icons/icon-coin-purse.png";
import { useCurrency } from "@/hooks/useCurrency";
import { useSound } from "@/contexts/SoundContext";
import { useRewardTimers, useDailyRewardsClaim } from "@/hooks/useRewardTimers";
import confetti from "canvas-confetti";
import coinIcon from "@/assets/icons/icon-coin.png";
import gemIcon from "@/assets/icons/icon-gem.png";
import { FlyingCurrency } from "@/components/shared/FlyingCurrency";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVipStatus } from "@/hooks/useVipStatus";

interface DailyRewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  onClaim?: () => void;
}

const dailyRewards = [
  { day: 1, coins: 50, gems: 0 },
  { day: 2, coins: 75, gems: 0 },
  { day: 3, coins: 100, gems: 1 },
  { day: 4, coins: 125, gems: 0 },
  { day: 5, coins: 150, gems: 2 },
  { day: 6, coins: 200, gems: 0 },
  { day: 7, coins: 300, gems: 5 },
];

// Per-day card gradients: bright same-family color pairs — cross-family
// blends (teal into rose etc.) muddy out in the middle and read dark
const DAY_GRADIENTS: [string, string][] = [
  ["#34D399", "#2563EB"], // 1 teal → blue
  ["#A78BFA", "#D946EF"], // 2 violet → fuchsia
  ["#FBBF24", "#F97316"], // 3 amber → orange
  ["#FB7185", "#EC4899"], // 4 coral → pink
  ["#22D3EE", "#3B82F6"], // 5 cyan → blue
  ["#818CF8", "#A855F7"], // 6 indigo → violet
  ["#FDE047", "#F59E0B"], // 7 gold
];

const cardGradient = (index: number) => {
  const [from, to] = DAY_GRADIENTS[index % DAY_GRADIENTS.length];
  return `linear-gradient(215deg, ${from} 0%, ${to} 100%)`;
};

const celebrateClaim = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1"],
    zIndex: 9999,
  });
};

// Bright frosted reward pill (coin/gem icon + amount) — needs to shine
// against every card gradient
function RewardPill({ icon, value }: { icon: string; value: number }) {
  return (
    <div
      className="flex h-[46px] items-center gap-1.5 rounded-[16px] px-3"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.25) 100%)",
        border: "1.5px solid rgba(255,255,255,0.7)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.15), inset 0 1.5px 0 rgba(255,255,255,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <img
        src={icon}
        alt=""
        className="shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
        width={30}
        height={30}
      />
      <span className="font-display text-lg font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
        {value}
      </span>
    </div>
  );
}

function DayRewardCard({
  reward,
  index,
  currentDay,
  claimedToday,
  canClaim,
  onClaim,
  t,
}: {
  reward: (typeof dailyRewards)[0];
  index: number;
  currentDay: number;
  claimedToday: boolean;
  canClaim: boolean;
  onClaim: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const isToday = index === currentDay;
  const isClaimed = index < currentDay || (index === currentDay && claimedToday);
  const isLocked = index > currentDay;
  const isAvailable = isToday && canClaim && !claimedToday;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative flex h-[260px] w-[272px] flex-shrink-0 snap-center flex-col items-center justify-between rounded-[24px] px-3 py-6"
      style={{
        background: cardGradient(index),
        border: "1.5px solid #D6399C",
        filter: isLocked ? "saturate(0.75) brightness(1.05)" : undefined,
      }}
    >
      {/* Day label */}
      <span className="font-display text-2xl font-bold text-white drop-shadow-sm">
        {t("dailyRewards.day", { day: reward.day })}
      </span>

      {/* Reward pills */}
      <div className="flex items-center gap-2">
        <RewardPill icon={coinIcon} value={reward.coins} />
        {reward.gems > 0 && <RewardPill icon={gemIcon} value={reward.gems} />}
      </div>

      {/* Claim button / state */}
      {isClaimed ? (
        <div
          className="flex h-[50px] w-[144px] items-center justify-center gap-1.5 rounded-[18px]"
          style={{ background: "rgba(255,255,255,0.3)", border: "0.5px solid rgba(255,255,255,0.5)" }}
        >
          <Check className="h-5 w-5 text-white" />
          <span className="text-base font-bold text-white">{t("dailyRewards.claimed")}</span>
        </div>
      ) : isLocked ? (
        <div
          className="flex h-[50px] w-[144px] items-center justify-center rounded-[18px]"
          style={{ background: "rgba(255,255,255,0.25)", border: "0.5px solid rgba(255,255,255,0.4)" }}
        >
          <Lock className="h-5 w-5 text-white/80" />
        </div>
      ) : (
        <motion.button
          onClick={isAvailable ? onClaim : undefined}
          disabled={!isAvailable}
          whileTap={isAvailable ? { scale: 0.95 } : undefined}
          animate={isAvailable ? { scale: [1, 1.04, 1] } : undefined}
          transition={isAvailable ? { repeat: Infinity, duration: 1.6 } : undefined}
          className="h-[50px] w-[144px] rounded-[18px] text-lg font-bold text-black disabled:opacity-60"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(254,254,254,0.6) 100%)",
            border: "0.5px solid #BFCDDE",
          }}
        >
          {t("dailyRewards.claim")}
        </motion.button>
      )}
    </motion.div>
  );
}

export function DailyRewardsModal({ isOpen, onClose, currentStreak, onClaim }: DailyRewardsModalProps) {
  const { t } = useLanguage();
  const { addCurrency } = useCurrency();
  const { playSound, vibrate } = useSound();
  const { canClaimDaily, dailyTimeLeft, refreshTimers } = useRewardTimers();
  const { claimDailyReward } = useDailyRewardsClaim();
  const { getDailyRewardMultiplier, isProPlus } = useVipStatus();
  const [claimedToday, setClaimedToday] = useState(false);
  const [showFlyingCoins, setShowFlyingCoins] = useState(false);
  const [showFlyingGems, setShowFlyingGems] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const currentDay = Math.min((currentStreak - 1) % 7, 6);
  const vipMultiplier = getDailyRewardMultiplier();

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

  // Scroll to center the current day when modal opens
  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = 272 + 16; // w-[272px] + gap-4 (16px)
      const scrollPosition = currentDay * cardWidth - container.offsetWidth / 2 + cardWidth / 2;
      setTimeout(() => {
        container.scrollTo({ left: Math.max(0, scrollPosition), behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, currentDay]);

  const handleClaim = async () => {
    if (claimedToday || !canClaimDaily) return;

    const reward = dailyRewards[currentDay];

    // Apply VIP multiplier for PRO Plus users (+50% rewards)
    const finalCoins = Math.floor(reward.coins * vipMultiplier);
    const finalGems = Math.floor((reward.gems || 0) * vipMultiplier);

    playSound("reward");
    vibrate([50, 30, 50]);
    celebrateClaim();

    // Mark as claimed in database
    const success = await claimDailyReward();
    if (!success) return;

    await addCurrency(finalCoins, finalGems);

    setShowFlyingCoins(true);
    if (reward.gems > 0) {
      setTimeout(() => setShowFlyingGems(true), 300);
    }

    setClaimedToday(true);
    refreshTimers();

    setTimeout(() => {
      setShowFlyingCoins(false);
      setShowFlyingGems(false);
      onClaim?.();
      onClose();
    }, 1500);
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
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

              {/* Day cards — next card peeks in from the right */}
              <div
                ref={scrollContainerRef}
                className="scrollbar-hide mt-6 flex cursor-grab select-none gap-4 overflow-x-auto px-6 pb-2 active:cursor-grabbing"
                style={{ scrollSnapType: "x proximity" }}
                onPointerDown={dragPointerDown}
                onPointerMove={dragPointerMove}
                onPointerUp={dragPointerUp}
                onPointerLeave={dragPointerUp}
              >
                {dailyRewards.map((reward, index) => (
                  <DayRewardCard
                    key={reward.day}
                    reward={reward}
                    index={index}
                    currentDay={currentDay}
                    claimedToday={claimedToday}
                    canClaim={canClaimDaily}
                    onClaim={handleClaim}
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
        {showFlyingCoins && (
          <FlyingCurrency type="coins" amount={dailyRewards[currentDay].coins} isActive={showFlyingCoins} />
        )}
        {dailyRewards[currentDay].gems > 0 && showFlyingGems && (
          <FlyingCurrency type="gems" amount={dailyRewards[currentDay].gems} isActive={showFlyingGems} />
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyRewardsModal;
