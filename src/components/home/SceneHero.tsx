import { ReactNode } from "react";
import { motion } from "framer-motion";
import { formatCompactNumber } from "@/lib/utils";
import { useRewardTimers } from "@/hooks/useRewardTimers";
import coinChunky from "@/assets/figma-home/coin-chunky.png";
import gemChunky from "@/assets/figma-home/gem-chunky.png";
import { WeekMissionsStrip } from "@/components/home/WeekMissionsStrip";
import checkStreak from "@/assets/figma-home/check-streak.svg";
import xDay from "@/assets/figma-home/x-day.svg";
import timerLine from "@/assets/figma-home/timer-line.svg";
import shieldOuter from "@/assets/figma-home/shield-outer.svg";
import shieldInner from "@/assets/figma-home/shield-inner.svg";
import swordLine from "@/assets/figma-home/sword-line.svg";
import { GreenPlayButton } from "@/components/shared/GreenPlayButton";

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
  /** Opens a day's missions. Carries the ISO date of the day tapped. */
  onMissionsClick: (dateISO: string) => void;
  /** Sunday gift in the streak strip — daily rewards. */
  onGiftClick: () => void;
  /** Click anywhere on the scene itself (outside widgets) — opens the
      avatar studio. Must live HERE, in the topmost overlay layer: clicks
      never reach the background image through the app's wrapper divs. */
  onSceneClick?: () => void;
  /** Below lg the right sidebar (with its quick-play button) is hidden for
      space — when set, a quick-play button renders under the chest button
      in the left stack instead. */
  onQuickPlay?: () => void;
  // Optional — Index renders the play button outside this overlay so it can
  // center on the full content area (this overlay is right-padded 300px)
  playButton?: ReactNode;
}

// Floor width for a stat pill, stepped by how long the value reads: one
// character ("6") stays narrow, two ("42") sit in the middle, three or more
// ("999", "1.2K") get the full pill. Anything longer just grows past the
// floor, so the number is never clipped.
function statPillMinWidth(value: string): number {
  if (value.length <= 1) return 79;
  if (value.length === 2) return 91;
  return 103;
}

// One chunky stat pill (coins / gems) inside the profile card. The design
// froze the pill at one width for a 3-digit value, which leaves short
// balances with a hole between the icon and the number; icon and value sit
// in a flex row instead, and the width steps with the value's length.
function StatButton({
  icon,
  value,
  onClick,
}: {
  icon: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-[53.05px] shrink-0 items-center gap-[5px] rounded-[18px] border-[1.5px] border-solid border-[#e8e0f5] pl-[9px] pr-[13px]"
      style={{ boxShadow: STAT_SHADOW, minWidth: statPillMinWidth(value) }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[18px]" style={{ background: STAT_GRADIENT }} />
      <div className="relative size-[39.79px] shrink-0">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={icon} />
      </div>
      <p className="relative flex-1 text-center font-['Nunito'] font-black text-[19.9px] leading-[30.95px] tracking-[-0.18px] text-[#334155] whitespace-nowrap">
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
  onSceneClick,
  onQuickPlay,
  playButton,
}: SceneHeroProps) {
  // The purse greys out once today's reward is taken.
  const { canClaimDaily } = useRewardTimers();

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
        className="absolute left-4 xl:left-[56px] top-[53px] h-[370px] w-[356px] pointer-events-auto"
      >
        {/* Profile card (node 601:1129) */}
        <div
          className="absolute left-0 top-0 h-[169px] w-full overflow-hidden rounded-[24px] bg-[rgba(252,247,255,0.8)]"
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
          {/* Coins (node 601:1136) / Gems (node 601:1144) — one row, so the
              gem pill follows the coin pill however wide that one gets. */}
          <div className="absolute left-[14px] top-[97px] flex gap-[8.11px]">
            <StatButton icon={coinChunky} value={formatCompactNumber(coins)} onClick={onCoinsClick} />
            <StatButton icon={gemChunky} value={formatCompactNumber(gems)} onClick={onGemsClick} />
          </div>
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

        {/* One section for the week and the daily purse — the same strip
            the phone shows. It replaced three: this card carried five days
            plus a gift, and "daily missions" and "open the chest" sat under
            it as separate buttons. Every day here opens its own missions,
            so those buttons had nothing left to say that the row does not. */}
        <div className="absolute left-0 top-[178px] w-full">
          <WeekMissionsStrip
            className="h-[100px]"
            onMissionsClick={onMissionsClick}
            onGiftClick={onGiftClick}
            dailyRewardClaimed={!canClaimDaily}
          />
        </div>

        {/* Below lg the continue-playing sidebar (and its quick-play) is
            hidden for space — the play button joins the stack here instead,
            right under the chest */}
        {onQuickPlay && (
          <GreenPlayButton
            onClick={onQuickPlay}
            icon={<img alt="" className="size-[24px]" src={swordLine} />}
            className="absolute left-0 top-[298px] h-[60px] w-full gap-3 font-['Inter'] text-[14px] lg:hidden"
          >
            სწრაფი თამაში
          </GreenPlayButton>
        )}
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
