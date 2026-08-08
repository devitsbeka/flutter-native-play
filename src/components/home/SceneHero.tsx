import { ReactNode } from "react";
import { motion } from "framer-motion";
import { formatCompactNumber } from "@/lib/utils";
import { useMissionStreak } from "@/hooks/useMissionStreak";
import coinChunky from "@/assets/figma-home/coin-chunky.png";
import gemChunky from "@/assets/figma-home/gem-chunky.png";
import giftWeekly from "@/assets/figma-home/gift-weekly.png";
import missionsCrystal from "@/assets/figma-home/missions-crystal.png";
import chestDaily from "@/assets/figma-home/chest-daily.png";
import checkStreak from "@/assets/figma-home/check-streak.svg";
import xDay from "@/assets/figma-home/x-day.svg";
import timerLine from "@/assets/figma-home/timer-line.svg";
import streakGlow from "@/assets/figma-home/streak-card-glow.svg";
import shieldOuter from "@/assets/figma-home/shield-outer.svg";
import shieldInner from "@/assets/figma-home/shield-inner.svg";

// Figma: Hom / node 601:1104 — left widget stack (profile card + level
// shield, glass weekly-streak strip, daily missions and chest buttons).
// Cards share one shadow; the chunky stat buttons share another.
const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";
const STAT_SHADOW = "0px 3.62px 0px 0px #d8d0e8, 0px 5.43px 14.48px 0px rgba(0,0,0,0.1)";
const STAT_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";

// Streak strip geometry from the design (circle lefts / label centers,
// relative to the card). No Friday slot — Mon..Thu, then Sat; Sunday is
// the gift.
const CIRCLE_X = [21.45, 64.4, 109.25, 152.51, 200.67];
const LABEL_CX = [36.12, 79.33, 123.91, 167.56, 215.09];
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
  onNameClick: () => void;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  onLevelClick: () => void;
  onMissionsClick: () => void;
  /** Sunday gift in the streak strip — daily rewards. */
  onGiftClick: () => void;
  /** "გახსენი სკივრი" button — chest rewards. */
  onChestClick: () => void;
  /** Click anywhere on the scene itself (outside widgets) — opens the
      avatar studio. Must live HERE, in the topmost overlay layer: clicks
      never reach the background image through the app's wrapper divs. */
  onSceneClick?: () => void;
  // Optional — Index renders the play button outside this overlay so it can
  // center on the full content area (this overlay is right-padded 300px)
  playButton?: ReactNode;
}

// One design-exact chunky stat pill (coins / gems) inside the profile card.
function StatButton({
  left,
  imgLeft,
  imgTop,
  icon,
  value,
  onClick,
}: {
  left: number;
  imgLeft: number;
  imgTop: number;
  icon: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-[97px] h-[53.05px] w-[128.94px] rounded-[18px] border-[1.5px] border-solid border-[#e8e0f5]"
      style={{ left, boxShadow: STAT_SHADOW }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[18px]" style={{ background: STAT_GRADIENT }} />
      <div className="absolute size-[39.79px]" style={{ left: imgLeft, top: imgTop }}>
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={icon} />
      </div>
      <p className="absolute left-[82.41px] top-[9.21px] -translate-x-1/2 font-['Nunito'] font-black text-[19.9px] leading-[30.95px] tracking-[-0.18px] text-[#334155] whitespace-nowrap">
        {value}
      </p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.81px_0px_0px_white]" />
    </button>
  );
}

// Floating overlay for the personalized scene homepage: the artwork itself is
// rendered full-bleed at the page root; this component carries the left
// widget stack from the Figma home and the bottom-center play button.
export function SceneHero({
  nickname,
  level,
  xpCurrent,
  xpTotal,
  coins,
  gems,
  onNameClick,
  onCoinsClick,
  onGemsClick,
  onLevelClick,
  onMissionsClick,
  onGiftClick,
  onChestClick,
  onSceneClick,
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
      {/* Scene click-catcher: first child so every widget rendered after it
          stays on top and keeps its own clicks */}
      {onSceneClick && (
        <button
          type="button"
          aria-label="შეცვალე სცენა"
          onClick={onSceneClick}
          className="absolute inset-0 pointer-events-auto cursor-pointer"
        />
      )}

      {/* Left widget stack (Figma node 601:1104, coords relative to the
          profile card at page 128/176) */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, type: "spring" }}
        className="absolute left-[56px] top-[53px] h-[424px] w-[336px] pointer-events-auto"
      >
        {/* Profile card (node 601:1129) */}
        <div
          className="absolute left-0 top-0 h-[169px] w-[298px] overflow-hidden rounded-[24px] bg-[rgba(252,247,255,0.8)]"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <button
            type="button"
            onClick={onNameClick}
            className="absolute left-[19px] top-[12px] font-['Slackey'] capitalize text-[32px] leading-[48px] tracking-[-0.16px] text-[#402666] whitespace-nowrap"
          >
            {nickname}
          </button>
          <p className="absolute left-[23px] top-[59px] text-[14px] leading-[21px] font-semibold tracking-[-0.16px] text-[#402666] whitespace-nowrap">
            {xpCurrent.toLocaleString("en-US")} / {xpTotal.toLocaleString("en-US")} XP
          </p>
          {/* Coins (node 601:1136) / Gems (node 601:1144) */}
          <StatButton left={14} imgLeft={9.61} imgTop={3.43} icon={coinChunky} value={formatCompactNumber(coins)} onClick={onCoinsClick} />
          <StatButton left={151.05} imgLeft={8.13} imgTop={4.81} icon={gemChunky} value={formatCompactNumber(gems)} onClick={onGemsClick} />
        </div>

        {/* Level shield (node 601:1152) - overlaps the card's top-right corner */}
        <button
          type="button"
          aria-label={`დონე ${level}`}
          onClick={onLevelClick}
          className="absolute left-[252px] top-[-2px] z-10 h-[93px] w-[82.06px]"
        >
          <div className="absolute left-[7.66px] top-[-10.03px] h-[101.63px] w-[74.4px] pointer-events-none">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={shieldOuter} />
          </div>
          <div className="absolute left-[11.09px] top-[-5.63px] h-[94.4px] w-[67.56px] pointer-events-none">
            <div className="absolute inset-[-8%_-17.61%_-17.42%_-17.61%]">
              <img alt="" className="block max-w-none size-full" src={shieldInner} />
            </div>
          </div>
          <p
            className="absolute left-[46.02px] top-[2.77px] -translate-x-1/2 text-[35px] font-bold leading-[52.5px] tracking-[-1.75px] text-white whitespace-nowrap"
            style={{
              fontFamily: "'Intel One Mono', 'Nunito', monospace",
              textShadow: "0px 2.19px 2.19px rgba(0,0,0,0.3), 0px 4.38px 6.57px rgba(0,0,0,0.15)",
            }}
          >
            {level}
          </p>
          <p className="absolute left-[45.8px] top-[46.66px] -translate-x-1/2 text-[9.85px] font-bold leading-[14.78px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">
            დონე
          </p>
        </button>

        {/* Weekly streak glass card (node 601:1555) */}
        <div
          className="absolute left-[-1px] top-[178px] h-[96px] w-[300px] overflow-hidden rounded-[24px] bg-[rgba(252,247,255,0.8)]"
          style={{ boxShadow: CARD_SHADOW }}
        >
          {/* Glassmorphism layers (nodes 601:1560..1566) */}
          <div className="absolute inset-0 rounded-[24px] backdrop-blur-[51.28px] bg-[rgba(84,84,84,0.1)]" />
          <div className="absolute left-[5.79px] top-[6.84px] h-[82.05px] w-[287.41px]">
            <div className="absolute inset-[-8.33%_-2.38%]">
              <img alt="" className="block max-w-none size-full" src={streakGlow} />
            </div>
          </div>
          <div className="absolute inset-0 rounded-[24px] border-[1.14px] border-solid border-[rgba(0,0,0,0.8)] blur-[4.56px] mix-blend-multiply" />
          <div className="absolute inset-0 rounded-[24px] border-[1.14px] border-solid border-[rgba(255,255,255,0.8)] blur-[1.71px] mix-blend-plus-lighter" />
          <div className="absolute inset-0 rounded-[24px] border-[1.14px] border-solid border-[rgba(255,255,255,0.2)] blur-[1.71px] mix-blend-plus-lighter" />

          {DAY_LABELS.map((label, i) => {
            const state = dayState(SLOT_WEEKDAYS[i]);
            const isToday = SLOT_WEEKDAYS[i] === todayIdx;
            const isFuture = SLOT_WEEKDAYS[i] > todayIdx;
            return (
              <div key={label} className="contents">
                {isToday && state === "pending" ? (
                  /* Today: gold timer chip on a purple gradient (node 601:1193) */
                  <div
                    className="absolute top-[21.98px] flex h-[27.33px] w-[27.42px] items-start rounded-[125px]"
                    style={{
                      left: CIRCLE_X[i],
                      backgroundImage:
                        "linear-gradient(180deg, rgb(107,46,224) 8%, rgb(133,71,235) 44.8%, rgb(122,56,217) 72.4%, rgb(89,31,184) 100%)",
                    }}
                  >
                    <div className="relative flex size-[27.02px] items-center justify-center rounded-full border-[1.27px] border-solid border-[#fbbf24] shadow-[0px_2.53px_0px_0px_#b45309,0px_4.22px_10.13px_0px_rgba(245,158,11,0.5)]">
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-full"
                        style={{ backgroundImage: "linear-gradient(to bottom, #fcd34d, #f59e0b 50%, #d97706)" }}
                      />
                      <img
                        alt=""
                        className="relative size-[16.98px] drop-shadow-[0px_1.69px_1.27px_rgba(0,0,0,0.07)]"
                        src={timerLine}
                      />
                      <div className="absolute left-[6.79px] top-[3.37px] size-[2.55px] rounded-full bg-white opacity-70" />
                      <div className="absolute left-[13.88px] top-[17.21px] size-[1.88px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-50" />
                      <div className="absolute inset-0 pointer-events-none rounded-full shadow-[inset_0px_1.27px_0px_0px_rgba(255,255,255,0.35)]" />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`absolute top-[21.98px] flex h-[27.33px] w-[27.42px] items-center justify-center rounded-full ${
                      state === "done" ? "bg-[#10b981]" : "bg-[rgba(149,129,171,0.14)]"
                    }`}
                    style={{ left: CIRCLE_X[i] }}
                  >
                    {state === "done" && (
                      <div className="relative size-[16.4px]">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={checkStreak} />
                      </div>
                    )}
                    {state === "failed" && (
                      <div className="relative size-[14px]">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={xDay} />
                      </div>
                    )}
                    {isFuture && (
                      <p className="font-['Nunito'] font-bold text-[16px] leading-[16px] tracking-[0.5px] text-[#887695] -mt-[9px]">
                        ...
                      </p>
                    )}
                  </div>
                )}
                <p
                  className={`absolute top-[58.05px] -translate-x-1/2 text-center text-[13.15px] leading-[19.73px] font-semibold tracking-[-0.16px] text-[#402666] whitespace-nowrap ${
                    isToday || isFuture ? "" : "opacity-50"
                  }`}
                  style={{ left: LABEL_CX[i] }}
                >
                  {label}
                </p>
              </div>
            );
          })}

          {/* Sunday gift (node 601:1207) */}
          <button type="button" onClick={onGiftClick} className="absolute left-[238.8px] top-[15px] h-[41.31px] w-[41.44px]">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={giftWeekly} />
          </button>
          <p className="absolute left-[260.06px] top-[58.05px] -translate-x-1/2 text-center text-[13.15px] leading-[19.73px] font-semibold tracking-[-0.16px] text-[#402666] whitespace-nowrap">
            კვ
          </p>
        </div>

        {/* დღის მისიები (node 601:1570) */}
        <button
          type="button"
          onClick={onMissionsClick}
          className="absolute left-[-1px] top-[288px] h-[60px] w-[298px] rounded-[24px] border-[2.28px] border-solid border-[#eed8ff] text-left shadow-[0px_4.56px_0px_0px_#a186d0,0px_7.6px_18.24px_0px_rgba(104,71,204,0.5)]"
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-[21px]"
            style={{ backgroundImage: "linear-gradient(to bottom, #ebdbfe, #e3caff 50%, #d5abff)" }}
          />
          <p className="absolute left-[64.72px] top-[17.72px] font-['Inter'] font-semibold text-[14px] text-[#282a2a] whitespace-nowrap">
            დღის მისიები
          </p>
          <div className="absolute left-[11.82px] top-[5.74px] size-[5.24px] rounded-full bg-white" />
          <div className="absolute left-[24.16px] top-[30.24px] size-[4.88px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-90" />
          <div className="absolute left-[7.81px] top-[3.28px] flex size-[44.63px] items-center justify-center">
            <div className="size-[43.25px] rotate-[1.86deg]">
              <img alt="" className="max-w-none object-contain pointer-events-none size-full" src={missionsCrystal} />
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2.28px_0px_0px_rgba(255,255,255,0.35)]" />
        </button>

        {/* გახსენი სკივრი (node 601:1595) */}
        <button
          type="button"
          onClick={onChestClick}
          className="absolute left-[-1px] top-[364px] h-[60px] w-[298px] rounded-[24px] border-[2.28px] border-solid border-[#fcd4a3] text-left shadow-[0px_4.56px_0px_0px_#cea87e,0px_7.6px_18.24px_0px_rgba(0,0,0,0.28)]"
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-[21px]"
            style={{ backgroundImage: "linear-gradient(to bottom, #fbe7d4, #eedcca 50%, #ecc89d)" }}
          />
          <p className="absolute left-[64.72px] top-[18.72px] font-['Inter'] font-semibold text-[14px] text-[#282a2a] whitespace-nowrap">
            გახსენი სკივრი
          </p>
          <div className="absolute left-[11.82px] top-[5.74px] size-[5.24px] rounded-full bg-white" />
          <div className="absolute left-[24.16px] top-[30.24px] size-[4.88px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-90" />
          <div className="absolute left-[9px] top-[3px] flex size-[49.15px] items-center justify-center">
            <div className="size-[48.76px] rotate-[-0.46deg]">
              <img alt="" className="max-w-none object-cover pointer-events-none size-full" src={chestDaily} />
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_2.28px_0px_0px_rgba(255,255,255,0.35)]" />
        </button>
      </motion.div>

      {/* Bottom center: play button (when not rendered by the page itself) */}
      {playButton && (
        <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 pointer-events-auto">
          {playButton}
        </div>
      )}
    </div>
  );
}
