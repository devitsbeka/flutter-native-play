import { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";
import { useMissionStreak } from "@/hooks/useMissionStreak";
import coinChunky from "@/assets/figma-home/coin-chunky.png";
import gemChunky from "@/assets/figma-home/gem-chunky.png";
import giftWeekly from "@/assets/figma-home/gift-weekly.png";
import missionsCrystal from "@/assets/figma-home/missions-crystal.png";
import checkStreak from "@/assets/figma-home/check-streak.svg";
import shieldOuter from "@/assets/figma-home/shield-outer.svg";
import shieldInner from "@/assets/figma-home/shield-inner.svg";

// Figma: Hom / node 596:42 — left widget stack (group 601:961).
// Cards share one shadow; the chunky stat buttons share another.
const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";
const STAT_SHADOW = "0px 3.62px 0px 0px #d8d0e8, 0px 5.43px 14.48px 0px rgba(0,0,0,0.1)";
const STAT_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";

// Streak strip geometry from the design (circle lefts / label centers).
// The design has no Friday slot — Mon..Thu, then Sat, Sunday is the gift.
const CIRCLE_X = [21.88, 63.19, 105.44, 148.63, 189.01];
const LABEL_X = [35.5, 77.07, 119.06, 163.13, 202.89];
const DAY_LABELS = ["ორშ", "სამ", "ოთხ", "ხუთ", "შაბ"];
const SLOT_WEEKDAYS = [0, 1, 2, 3, 5]; // 0 = Monday

type DayState = "done" | "failed" | "pending";

interface SceneHeroProps {
  nickname: string;
  level: number;
  xpCurrent: number;
  xpTotal: number;
  coins: number;
  gems: number;
  missionsCount: number;
  onNameClick: () => void;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  onLevelClick: () => void;
  onMissionsClick: () => void;
  playButton: ReactNode;
}

// Floating overlay for the personalized scene homepage: the artwork itself is
// rendered full-bleed at the page root; this component carries the left
// widget stack from the Figma home (profile card + level shield, weekly
// streak, missions row) and the bottom-center play button.
export function SceneHero({
  nickname,
  level,
  xpCurrent,
  xpTotal,
  coins,
  gems,
  missionsCount,
  onNameClick,
  onCoinsClick,
  onGemsClick,
  onLevelClick,
  onMissionsClick,
  playButton,
}: SceneHeroProps) {
  const { streak, currentStreak } = useMissionStreak();

  // Per-day streak state for the current week: a day is "done" when the
  // running streak covers it, "failed" when it's already past and wasn't,
  // and "pending" when it's today (not yet done) or still ahead.
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // 0 = Monday
  const lastDone = streak?.last_completion_date || null;
  const dayState = (weekday: number): DayState => {
    if (weekday > todayIdx) return "pending";
    if (lastDone && currentStreak > 0) {
      const dayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (todayIdx - weekday));
      const last = new Date(`${lastDone}T00:00:00`);
      const diff = Math.round((last.getTime() - dayDate.getTime()) / 86_400_000);
      if (diff >= 0 && diff < currentStreak) return "done";
    }
    return weekday === todayIdx ? "pending" : "failed";
  };

  return (
    <div className="relative w-full h-full pointer-events-none">
      {/* Left widget stack (Figma group 601:961) */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, type: "spring" }}
        className="absolute left-[56px] top-[53px] h-[360px] w-[332px] pointer-events-auto"
      >
        {/* Profile card (node 601:883) */}
        <div
          className="absolute left-0 top-0 h-[176px] w-[298px] overflow-hidden rounded-[24px] bg-[rgba(252,247,255,0.8)]"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <button
            type="button"
            onClick={onNameClick}
            className="absolute left-[19px] top-[19px] font-['Slackey'] capitalize text-[32px] leading-[48px] tracking-[-0.16px] text-[#402666] whitespace-nowrap"
          >
            {nickname}
          </button>
          <p className="absolute left-[23px] top-[66px] text-[14px] font-semibold text-[#402666] whitespace-nowrap">
            {xpCurrent.toLocaleString("en-US")} / {xpTotal.toLocaleString("en-US")} XP
          </p>

          {/* Coins (node 601:904) */}
          <button
            type="button"
            onClick={onCoinsClick}
            className="absolute left-[14px] top-[104px] h-[53.05px] w-[128.94px] rounded-[18px] border-[1.81px] border-solid border-[#e8e0f5]"
            style={{ boxShadow: STAT_SHADOW }}
          >
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[18px]" style={{ background: STAT_GRADIENT }} />
            <div className="absolute left-[9.61px] top-[3.43px] size-[39.79px]">
              <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={coinChunky} />
            </div>
            <p className="absolute left-[82.42px] top-[9.24px] -translate-x-1/2 font-['Nunito'] font-black text-[19.9px] leading-[30.95px] tracking-[-0.18px] text-[#334155] whitespace-nowrap">
              {formatCompactNumber(coins)}
            </p>
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.81px_0px_0px_white]" />
          </button>

          {/* Gems (node 601:907) */}
          <button
            type="button"
            onClick={onGemsClick}
            className="absolute left-[151.06px] top-[104px] h-[53.05px] w-[128.94px] rounded-[18px] border-[1.81px] border-solid border-[#e8e0f5]"
            style={{ boxShadow: STAT_SHADOW }}
          >
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[18px]" style={{ background: STAT_GRADIENT }} />
            <div className="absolute left-[8.14px] top-[4.82px] size-[39.79px]">
              <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={gemChunky} />
            </div>
            <p className="absolute left-[82.42px] top-[9.24px] -translate-x-1/2 font-['Nunito'] font-black text-[19.9px] leading-[30.95px] tracking-[-0.18px] text-[#334155] whitespace-nowrap">
              {formatCompactNumber(gems)}
            </p>
            <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.81px_0px_0px_white]" />
          </button>
        </div>

        {/* Level shield (node 596:345) - overlaps the card's top-right corner */}
        <button
          type="button"
          aria-label={`დონე ${level}`}
          onClick={onLevelClick}
          className="absolute left-[249.97px] top-0 z-10 h-[93px] w-[82.06px]"
        >
          <div className="absolute left-[7.66px] top-[-10.42px] h-[103.94px] w-[74.4px] pointer-events-none">
            <div className="absolute inset-[0.37%_0_1.86%_0]">
              <img alt="" className="block max-w-none size-full" src={shieldOuter} />
            </div>
          </div>
          <div className="absolute left-[12.04px] top-[-4.65px] h-[92.29px] w-[65.65px] pointer-events-none">
            <div className="absolute inset-[-6.89%_-16.25%_-16.67%_-16.25%]">
              <img alt="" className="block max-w-none size-full" src={shieldInner} />
            </div>
          </div>
          <p
            className="absolute left-[44.52px] top-[6.02px] -translate-x-1/2 text-[35px] font-bold tracking-[-1.75px] text-white whitespace-nowrap"
            style={{
              fontFamily: "'Intel One Mono', 'Nunito', monospace",
              textShadow: "0px 2.19px 2.19px rgba(0,0,0,0.3), 0px 4.38px 6.57px rgba(0,0,0,0.15)",
            }}
          >
            {level}
          </p>
          <p className="absolute left-[44.81px] top-[49.78px] -translate-x-1/2 text-[9.85px] font-bold text-[rgba(255,255,255,0.7)] whitespace-nowrap">
            დონე
          </p>
        </button>

        {/* Weekly streak card (node 599:37) */}
        <div
          className="absolute left-0 top-[190px] h-[99px] w-[298px] overflow-hidden rounded-[24px] bg-[#fcf7ff]"
          style={{ boxShadow: CARD_SHADOW }}
        >
          {DAY_LABELS.map((label, i) => {
            const state = dayState(SLOT_WEEKDAYS[i]);
            const isToday = SLOT_WEEKDAYS[i] === todayIdx;
            return (
              <div key={label} className="contents">
                <div
                  className={`absolute top-[21.99px] flex size-[27.33px] items-center justify-center rounded-full border-[2.73px] border-solid border-white drop-shadow-[0px_16.4px_10.93px_rgba(10,13,18,0.08)] ${
                    state === "done" ? "bg-[#10b981]" : "bg-[#e2d7e9]"
                  } ${isToday ? "ring-2 ring-[#9061f9]/70 ring-offset-1 ring-offset-[#fcf7ff]" : ""}`}
                  style={{ left: CIRCLE_X[i] }}
                >
                  {state === "done" && (
                    <div className="relative size-[16.4px]">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={checkStreak} />
                    </div>
                  )}
                  {state === "failed" && (
                    <X className="size-[14px] text-[#b7a5c4]" strokeWidth={3} />
                  )}
                </div>
                <p
                  className={`absolute top-[58.19px] -translate-x-1/2 text-center text-[13.15px] font-semibold text-[#402666] whitespace-nowrap ${
                    state === "done" || isToday ? "" : "opacity-50"
                  }`}
                  style={{ left: LABEL_X[i] }}
                >
                  {label}
                </p>
              </div>
            );
          })}

          {/* Sunday gift (node 601:901) */}
          <div className="absolute left-[224.69px] top-[15px] size-[41.31px]">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={giftWeekly} />
          </div>
          <p className="absolute left-[244.89px] top-[58.19px] -translate-x-1/2 text-center text-[13.15px] font-semibold text-[#402666] whitespace-nowrap">
            კვ
          </p>
        </div>

        {/* Missions row (node 601:407) */}
        <button
          type="button"
          onClick={onMissionsClick}
          className="absolute left-0 top-[300px] h-[60px] w-[298px] overflow-hidden rounded-[24px] bg-[#fcf7ff] text-left"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="absolute left-[19.65px] top-1/2 -translate-y-1/2 size-[29.07px] rotate-[1.86deg]">
            <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={missionsCrystal} />
          </div>
          <p className="absolute left-[56px] top-1/2 -translate-y-1/2 text-[14px] font-semibold text-[#402666] whitespace-nowrap">
            მისიები
          </p>
          <div className="absolute left-[251px] top-1/2 flex h-[20.71px] w-[29px] -translate-y-1/2 items-center justify-center rounded-full border-[1.475px] border-solid border-[#d5d0d8]">
            <p className="font-['Nunito'] font-bold text-[11.6px] leading-[11.8px] tracking-[-0.118px] text-[#9783a3] whitespace-nowrap">
              {missionsCount}
            </p>
          </div>
        </button>
      </motion.div>

      {/* Bottom center: play button */}
      <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 pointer-events-auto">
        {playButton}
      </div>
    </div>
  );
}
