import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Gift, Flame, Check, X, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { GameModal } from "@/components/ui/game-modal";
import { getStreakMilestones } from "@/utils/levelCalculation";

const WEEKDAY_KEYS = [
  "weekdayMon", "weekdaeTue", "weekdayWed", "weekdayThu",
  "weekdayFri", "weekdaySat", "weekdaySun",
] as const;

// JS getDay(): 0=Sun,1=Mon...6=Sat → convert to 0=Mon...6=Sun
function jsDayToMonday(jsDay: number) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

interface GiftMilestone {
  afterDay: number;
  bonus: number;
  rewardKey: string;
  isUnlocked: boolean;
}

// Floating particles inside the today circle
function TodayParticles() {
  const particles = useMemo(() => 
    Array.from({ length: 6 }).map((_, i) => ({
      x: 8 + Math.random() * 24,
      y: 8 + Math.random() * 24,
      size: 2 + Math.random() * 2,
      delay: i * 0.4,
      duration: 2 + Math.random() * 1.5,
    })), []
  );

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: p.x,
            top: p.y,
            background: "rgba(167, 139, 250, 0.6)",
          }}
          animate={{
            y: [0, -6, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}

// Hook for momentum-based drag scrolling
function useDragScroll(ref: React.RefObject<HTMLDivElement | null>) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const animFrame = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.clientX;
    scrollLeft.current = el.scrollLeft;
    lastX.current = e.clientX;
    lastTime.current = Date.now();
    velocity.current = 0;
    cancelAnimationFrame(animFrame.current);
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
    el.style.scrollBehavior = "auto";
  }, [ref]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !ref.current) return;
    const dx = e.clientX - startX.current;
    ref.current.scrollLeft = scrollLeft.current - dx;
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (e.clientX - lastX.current) / dt;
    }
    lastX.current = e.clientX;
    lastTime.current = now;
  }, [ref]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !ref.current) return;
    isDragging.current = false;
    ref.current.style.cursor = "";
    ref.current.releasePointerCapture(e.pointerId);
    
    // Momentum scroll
    const el = ref.current;
    let v = velocity.current * 15; // amplify
    const decel = 0.95;
    const tick = () => {
      if (Math.abs(v) < 0.5) return;
      el.scrollLeft -= v;
      v *= decel;
      animFrame.current = requestAnimationFrame(tick);
    };
    tick();
  }, [ref]);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrame.current);
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

export function WeeklyStreakRow({ onNewClick }: { onNewClick?: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedGift, setSelectedGift] = useState<GiftMilestone | null>(null);
  const dragHandlers = useDragScroll(scrollRef);

  const { data: profile } = useQuery({
    queryKey: ["profile-streak", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("current_streak, best_streak")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const currentStreak = profile?.current_streak ?? 0;

  // Build the scrollable timeline: past weeks + current week + future weeks
  const timeline = useMemo(() => {
    const today = new Date();
    const todayMondayIdx = jsDayToMonday(today.getDay());

    const totalWeeks = Math.max(Math.ceil(currentStreak / 7) + 1, 3);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - todayMondayIdx);
    startDate.setDate(startDate.getDate() - (totalWeeks - 1) * 7);

    const days: { date: Date; weekdayKey: string; isToday: boolean; isCompleted: boolean; dayIndex: number }[] = [];
    
    for (let i = 0; i < totalWeeks * 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const mondayIdx = jsDayToMonday(d.getDay());
      const isToday = d.toDateString() === today.toDateString();
      
      const daysAgo = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const isCompleted = daysAgo >= 0 && daysAgo < currentStreak;

      days.push({
        date: d,
        weekdayKey: WEEKDAY_KEYS[mondayIdx],
        isToday,
        isCompleted,
        dayIndex: i,
      });
    }

    return days;
  }, [currentStreak]);

  // Gift milestones every 3 days of streak
  const milestones = useMemo(() => {
    const streakMilestones = getStreakMilestones();
    const gifts: GiftMilestone[] = [];
    
    for (let d = 3; d <= Math.max(currentStreak + 10, 30); d += 3) {
      const milestone = streakMilestones.find(m => m.days === d);
      let rewardKey = "milestoneXpBonus";
      let bonus = milestone?.bonus ?? 25;
      if (d >= 30) { rewardKey = "milestoneDoubleXp"; }
      else if (d >= 10) { rewardKey = "milestoneXpBonusGift"; }
      
      gifts.push({
        afterDay: d,
        bonus,
        rewardKey,
        isUnlocked: currentStreak >= d,
      });
    }
    return gifts;
  }, [currentStreak]);

  if (!user) return null;

  function getMilestoneRewardText(gift: GiftMilestone): string {
    if (gift.rewardKey === "milestoneDoubleXp") {
      return t(`extra.${gift.rewardKey}`);
    }
    return t(`extra.${gift.rewardKey}`, { percent: gift.bonus });
  }

  const todayIndex = timeline.findIndex(d => d.isToday);
  const giftAfterDays = new Set(milestones.map(m => m.afterDay));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full px-4 pt-2 pb-1 pointer-events-auto z-30 relative"
      >
        {/* Top row: label + NEW button */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-base font-bold text-foreground">
              {t("extra.yourStreak")}
            </span>
            {currentStreak > 0 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                  color: "#92400E",
                  boxShadow: "0 2px 0 rgba(253,230,138,0.5)",
                }}
              >
                {currentStreak} 🔥
              </span>
            )}
          </div>
          <motion.button
            onClick={onNewClick}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold text-white"
            style={{
              background: "linear-gradient(180deg, #9C6ADE 0%, #7B4BBF 100%)",
              boxShadow: "0 4px 0 #5B2FA0, 0 6px 12px rgba(124, 58, 237, 0.3)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95, y: 2 }}
          >
            <Plus className="w-4 h-4" />
            {t("extra.newButton")}
          </motion.button>
        </div>

        {/* Scrollable streak days with drag + momentum */}
        <div
          ref={(el) => {
            (scrollRef as any).current = el;
            if (el && todayIndex >= 0) {
              const scrollTo = Math.max(0, todayIndex * 52 - el.clientWidth / 2 + 26);
              el.scrollLeft = scrollTo;
            }
          }}
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide select-none touch-pan-x"
          style={{ cursor: "grab" }}
          onPointerDown={dragHandlers.onPointerDown}
          onPointerMove={dragHandlers.onPointerMove}
          onPointerUp={dragHandlers.onPointerUp}
          onPointerCancel={dragHandlers.onPointerUp as any}
        >
          {timeline.map((day, i) => {
            // Show a gift circle after every 3rd day position in the timeline (1-indexed)
            const dayPosition = i + 1; // 1-based position
            const showGift = dayPosition % 3 === 0;
            const giftMilestone = showGift
              ? {
                  afterDay: dayPosition,
                  bonus: 25,
                  rewardKey: dayPosition >= 30 ? "milestoneDoubleXp" : dayPosition >= 10 ? "milestoneXpBonusGift" : "milestoneXpBonus",
                  isUnlocked: currentStreak >= dayPosition,
                }
              : null;

            return (
              <div key={i} className="flex items-end gap-1.5">
                <motion.div
                  className="flex flex-col items-center gap-1 flex-shrink-0"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.4), type: "spring", stiffness: 300 }}
                >
                  {/* Weekday label */}
                  <span className={`text-[10px] font-semibold ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {t(`extra.${day.weekdayKey}`)}
                  </span>

                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden ${
                      day.isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={
                      day.isCompleted
                        ? {
                            background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)",
                            boxShadow: "0 2px 6px rgba(253, 230, 138, 0.5)",
                          }
                        : day.isToday
                        ? {
                            background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 50%, #C4B5FD 100%)",
                            border: "none",
                          }
                        : {
                            background: "hsl(var(--muted))",
                            border: "2px solid hsl(var(--border))",
                          }
                    }
                  >
                    {day.isToday && <TodayParticles />}
                    {day.isCompleted ? (
                      <Check className="w-4 h-4 text-amber-700 relative z-10" />
                    ) : day.isToday ? (
                      <span className="text-sm font-bold text-primary relative z-10">?</span>
                    ) : day.date < new Date(new Date().toDateString()) ? (
                      <X className="w-4 h-4 text-muted-foreground/60" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Today indicator dot */}
                  {day.isToday && (
                    <span className="text-[10px] font-bold text-primary mt-0.5">
                      {t("extra.today")}
                    </span>
                  )}
                </motion.div>

                {/* Gift milestone circle after every 5th streak day */}
                {giftMilestone && (
                  <motion.div
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                  >
                    <span className="text-[10px] font-bold text-rose-500">Gift</span>
                    <motion.button
                      onClick={() => setSelectedGift(giftMilestone)}
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={
                        giftMilestone.isUnlocked
                          ? {
                              background: "linear-gradient(180deg, #FB7185 0%, #E11D48 100%)",
                              boxShadow: "0 3px 0 rgba(190,18,60,0.4), 0 4px 12px rgba(225,29,72,0.3)",
                            }
                          : {
                              background: "linear-gradient(180deg, #FFE4E6 0%, #FECDD3 100%)",
                              border: "2px solid #FB7185",
                            }
                      }
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Gift className={`w-4 h-4 ${giftMilestone.isUnlocked ? "text-white" : "text-rose-500"}`} />
                    </motion.button>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Gift milestone modal */}
      {selectedGift && (
        <GameModal
          isOpen={!!selectedGift}
          onClose={() => setSelectedGift(null)}
          variant="gold"
          fullScreen={false}
          icon={
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: selectedGift.isUnlocked
                  ? "linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)"
                  : "linear-gradient(135deg, #E9D5FF 0%, #C4B5FD 100%)",
                boxShadow: selectedGift.isUnlocked
                  ? "0 5px 0 #5B21B6, inset 0 2px 4px rgba(255,255,255,0.3)"
                  : "0 5px 0 #A78BFA",
              }}
            >
              <Gift className={`w-8 h-8 ${selectedGift.isUnlocked ? "text-white" : "text-purple-600"}`} />
            </div>
          }
          title={t("extra.streakGiftReward")}
          subtitle={`${selectedGift.afterDay} ${t("extra.daysLabel", { count: selectedGift.afterDay }).replace(String(selectedGift.afterDay), "").trim()}`}
        >
          <div className="text-center space-y-4">
            <div
              className="mx-auto p-4 rounded-2xl"
              style={{
                background: selectedGift.isUnlocked
                  ? "linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)"
                  : "linear-gradient(180deg, rgba(167,139,250,0.1) 0%, rgba(167,139,250,0.05) 100%)",
                border: `2px solid ${selectedGift.isUnlocked ? "rgba(34,197,94,0.3)" : "rgba(167,139,250,0.3)"}`,
              }}
            >
              <span className="text-3xl mb-2 block">
                {selectedGift.isUnlocked ? "🎉" : "🎁"}
              </span>
              <p className="text-base font-bold text-foreground">
                {getMilestoneRewardText(selectedGift)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedGift.isUnlocked
                  ? t("extra.milestoneUnlocked")
                  : t("extra.milestoneLocked", { count: selectedGift.afterDay - currentStreak })}
              </p>
            </div>
          </div>
        </GameModal>
      )}
    </>
  );
}
