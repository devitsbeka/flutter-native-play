import { motion } from "framer-motion";
import { Menu, Search } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useMissionStreak } from "@/hooks/useMissionStreak";
import myTriviaLogo from "@/assets/mytrivia-logo.svg";
import guestGeoMap from "@/assets/figma-home/guest-geo-map.webp";
import coinChunky from "@/assets/figma-home/coin-chunky.png";
import gemChunky from "@/assets/figma-home/gem-chunky.png";
import coinPurse from "@/assets/icons/icon-coin-purse.png";
import xDay from "@/assets/figma-home/x-day.svg";
import missionsCrystal from "@/assets/figma-home/missions-crystal.png";
import shieldOuter from "@/assets/figma-home/shield-outer.svg";
import shieldInner from "@/assets/figma-home/shield-inner.svg";

// Figma: Hom — the three mobile home states, all drawn on a 500x946 frame:
//   632:296  Logged out / guest
//   628:437  Logged in, no generated scene (default Trivia King loop)
//   626:201  Logged in, personalized scene
// Sizes below are the frame's own pixels; widths that must span the screen
// are expressed as a share of the frame width (vw) so the artwork keeps its
// designed proportions on any phone.

const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";
const STAT_SHADOW = "0px 2.94px 0px 0px #d8d0e8, 0px 4.409px 11.758px 0px rgba(0,0,0,0.1)";
const STAT_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";
const AUTH_SHADOW = "0px 3.72px 0px 0px #d8d0e8, 0px 5.58px 14.881px 0px rgba(0,0,0,0.1)";
const AUTH_GRADIENT = STAT_GRADIENT;

// The bottom nav is 88px of chrome (20px padding + 48px items) plus the
// device inset; scene art is anchored off it exactly as in the frame.
const NAV_H = "calc(88px + env(safe-area-inset-bottom))";

// Dissolves the scene artwork's top edge into the page wash. Both spellings
// ship: iOS below 15.4 only understands the -webkit- one, and there the
// unprefixed property alone would leave the edge as a hard line.
const SCENE_TOP_FADE: React.CSSProperties = {
  maskImage: "linear-gradient(to bottom, transparent 0, black 60%)",
  WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 60%)",
};

/* ------------------------------------------------------------------ *
 * Scene background (logged-in states)
 * ------------------------------------------------------------------ */

interface MobileSceneBackgroundProps {
  /** Generated 16:9 still for this user, when they have one. */
  sceneUrl: string | null;
  /** Matching idle-loop video for the generated scene. */
  sceneVideoUrl: string | null;
  /** Fall back to the shared Trivia King loop. */
  showDefaultScene: boolean;
  defaultVideoSrc: string;
  /** Tapping the artwork opens the avatar studio, as on desktop. */
  onSceneClick?: () => void;
}

// Catches taps on the artwork itself — the same affordance SceneHero gives
// the desktop scene. It covers the artwork's footprint rather than the whole
// layer, so bare page wash above the scene stays inert, and it renders before
// the widgets in Index so every one of those keeps its own clicks.
function SceneTapTarget({
  onSceneClick,
  className,
  style,
}: {
  onSceneClick?: () => void;
  className: string;
  style: React.CSSProperties;
}) {
  if (!onSceneClick) return null;
  return (
    <button
      type="button"
      aria-label="შეცვალე სცენა"
      onClick={onSceneClick}
      className={`${className} pointer-events-auto cursor-pointer`}
      style={style}
    />
  );
}

// node 626:952 (personalized) / 628:446 (default). Both render the 16:9
// artwork far wider than the screen and anchor it near the bottom nav; the
// default loop additionally fades into the page wash on its way down.
export function MobileSceneBackground({
  sceneUrl,
  sceneVideoUrl,
  showDefaultScene,
  defaultVideoSrc,
  onSceneClick,
}: MobileSceneBackgroundProps) {
  if (sceneUrl) {
    // 774.7 / 500 wide, left edge at -110.3 / 500.
    //
    // The frame floats the artwork 28px clear of the nav, which on a real
    // phone reads as a strip of bare page wash under the scene, closed off
    // by the hard cut of the artwork's own bottom edge. It sits ON the nav
    // instead: the wave divider overlaps the last 14px, so the cut is never
    // visible and there is nothing left to read as empty.
    //
    // The top edge is mask-faded — the wash behind it is an animated blob
    // loop, so a flat cut would read as a hard line straight across the
    // page. 140px was not enough: the artwork's own sky is a deeper
    // lavender than the wash, so the fade finished while the two tones
    // still differed and the seam showed anyway. Fading over most of the
    // artwork's height spreads that difference out until it disappears.
    const box = "absolute left-[-22.06vw] w-[154.94vw] max-w-none";
    // Inline rather than a Tailwind arbitrary property: that ships
    // `mask-image` alone, which iOS below 15.4 ignores outright — and an
    // ignored mask is precisely the hard top edge this is here to prevent.
    const style: React.CSSProperties = { bottom: NAV_H, ...SCENE_TOP_FADE };
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="md:hidden absolute inset-0 z-0 select-none pointer-events-none overflow-hidden"
      >
        {sceneVideoUrl ? (
          <video
            src={sceneVideoUrl}
            poster={sceneUrl}
            autoPlay
            loop
            muted
            playsInline
            className={box}
            style={style}
          />
        ) : (
          <img src={sceneUrl} alt="" draggable={false} className={box} style={style} />
        )}
        {/* Scenes are 16:9, so aspect-video on the same box reproduces the
            artwork's footprint exactly. */}
        <SceneTapTarget
          onSceneClick={onSceneClick}
          className={`${box} aspect-video`}
          style={{ bottom: NAV_H }}
        />
      </motion.div>
    );
  }

  if (!showDefaultScene) return null;

  // 1136 / 500 wide, left edge at -239 / 500, reaching to 13px off the frame
  // bottom — it runs on behind the nav, but its fade to the page wash lands
  // exactly on the nav's top edge, so nothing hard-edged ever shows.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="md:hidden absolute inset-0 z-0 select-none pointer-events-none overflow-hidden"
    >
      <div
        className="absolute left-[-47.8vw] w-[227.2vw] aspect-video [mask-image:linear-gradient(to_bottom,transparent_0,black_140px)]"
        style={{ bottom: "calc(13px + env(safe-area-inset-bottom))" }}
      >
        <video
          src={defaultVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 size-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(246,222,255,0) 55.7%, #f6deff 88.4%)" }}
        />
      </div>
      <SceneTapTarget
        onSceneClick={onSceneClick}
        className="absolute left-[-47.8vw] w-[227.2vw] aspect-video"
        style={{ bottom: "calc(13px + env(safe-area-inset-bottom))" }}
      />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Profile card (logged-in states)
 * ------------------------------------------------------------------ */

// Chunky coin / gem pill — node 626:1183 and 626:1188. The gradient, value
// and icon sit on the padding box so the frame's own coordinates apply.
function StatPill({
  icon,
  iconLeft,
  iconTop,
  value,
  label,
  onClick,
}: {
  icon: string;
  iconLeft: number;
  iconTop: number;
  value: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative h-[43.075px] w-[104.7px] shrink-0 rounded-[14.616px] border-[1.218px] border-solid border-[#e8e0f5]"
      style={{ boxShadow: STAT_SHADOW }}
    >
      <span aria-hidden className="absolute inset-0 rounded-[inherit]" style={{ background: STAT_GRADIENT }} />
      <img
        src={icon}
        alt=""
        draggable={false}
        className="absolute size-[32.31px] object-cover"
        style={{ left: iconLeft, top: iconTop }}
      />
      <span className="absolute left-[67.05px] top-[7.48px] -translate-x-1/2 font-['Nunito'] text-[16.159px] font-black leading-[25.132px] tracking-[-0.1462px] text-[#334155] whitespace-nowrap">
        {value}
      </span>
      <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.47px_0px_0px_white]" />
    </button>
  );
}

// Mon, Tue, Wed, Thu, Sat, Sun — the frame skips Friday, matching the
// desktop streak strip (SceneHero) this card is the phone counterpart of.
const DAY_LABELS = ["ორშ", "სამ", "ოთხ", "ხუთ", "შაბ", "კვ"];
const SLOT_WEEKDAYS = [0, 1, 2, 3, 5, 6]; // 0 = Monday

type DayState = "done" | "failed" | "pending";

interface MobileProfileCardProps {
  nickname: string;
  level: number;
  coins: number;
  gems: number;
  onNameClick: () => void;
  onLevelClick: () => void;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  onGiftClick: () => void;
  /** The weekly streak row is the phone's only way into missions. */
  onMissionsClick: () => void;
}

// node 626:1179, re-stacked. The frame put the nickname and the coin/gem
// pills on one row and the level under the name; the pills overran long
// nicknames, so the name keeps the row to itself, the pills drop beneath it
// and the level becomes the same shield SceneHero uses on desktop, sitting
// over the top-right corner. That costs 29px of height (181 → 210). The card
// also sits above the bottom nav rather than under the friends reel, so the
// scene it floats on is not covered by it.
export function MobileProfileCard({
  nickname,
  level,
  coins,
  gems,
  onNameClick,
  onLevelClick,
  onCoinsClick,
  onGemsClick,
  onGiftClick,
  onMissionsClick,
}: MobileProfileCardProps) {
  const { streak, currentStreak } = useMissionStreak();

  // Same rule as the desktop strip: a day is done when the running streak
  // still covers it, failed once it's past, pending today or ahead.
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
    <>
    {/* Who you are — directly under the friends reel, in normal flow. */}
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 26 }}
      className="md:hidden relative z-20 mx-6 mt-[22px]"
    >
      <div
        className="relative h-[123px] w-full overflow-hidden rounded-[24px] bg-[rgba(252,247,255,0.8)]"
        style={{ boxShadow: CARD_SHADOW }}
      >
        {/* The nickname owns its own row now, so nothing can sit over it.
            It is bounded on the right by the level shield and truncates —
            the frame let it run under the coin pill, which is why a name as
            ordinary as "TriviaMaster" lost its last letter. */}
        <button
          type="button"
          onClick={onNameClick}
          className="absolute left-[26px] right-[86px] top-[11px] truncate text-left font-slackey text-[32px] capitalize leading-[48px] tracking-[-0.16px] text-[#402666]"
        >
          {nickname}
        </button>

        <div className="absolute left-[26px] top-[64px] flex gap-[6.6px]">
          <StatPill
            icon={coinChunky}
            iconLeft={7.8}
            iconTop={2.78}
            value={formatCompactNumber(coins)}
            label={t("common.coins")}
            onClick={onCoinsClick}
          />
          <StatPill
            icon={gemChunky}
            iconLeft={6.6}
            iconTop={3.91}
            value={formatCompactNumber(gems)}
            label={t("common.gems")}
            onClick={onGemsClick}
          />
        </div>

      </div>

      {/* Level shield — the same badge SceneHero carries on desktop. It
          overhangs the card's top-right corner, so it is a sibling of the
          card rather than a child: the card clips its own contents. */}
      <button
        type="button"
        aria-label={`${t("modals.levelLabel")} ${level}`}
        onClick={onLevelClick}
        className="absolute right-[-2px] top-[-14px] z-10 h-[93px] w-[82.06px]"
      >
        <img alt="" src={shieldOuter} className="absolute left-[7.66px] top-[-10.03px] h-[101.63px] w-[74.4px] max-w-none" />
        <span className="absolute left-[11.09px] top-[-5.63px] block h-[94.4px] w-[67.56px]">
          <span className="absolute inset-[-8%_-17.61%_-17.42%_-17.61%] block">
            <img alt="" src={shieldInner} className="block size-full max-w-none" />
          </span>
        </span>
        <span
          className="absolute left-[46.02px] top-[2.77px] block -translate-x-1/2 whitespace-nowrap text-[35px] font-bold leading-[52.5px] tracking-[-1.75px] text-white"
          style={{
            fontFamily: "'Intel One Mono', 'Nunito', monospace",
            textShadow: "0px 2.19px 2.19px rgba(0,0,0,0.3), 0px 4.38px 6.57px rgba(0,0,0,0.15)",
          }}
        >
          {level}
        </span>
        <span className="absolute left-[45.8px] top-[46.66px] block -translate-x-1/2 whitespace-nowrap text-[9.85px] font-bold leading-[14.78px] text-[rgba(255,255,255,0.7)]">
          {t("modals.levelLabel")}
        </span>
      </button>
    </motion.div>

    {/* The week — its own card, held down by the bottom nav so the scene
        between the two has room to show through. */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 26 }}
      className="md:hidden absolute inset-x-0 z-20 mx-6"
      style={{ bottom: `calc(${NAV_H} + 31px)` }}
    >
      <div
        className="relative h-[94px] w-full overflow-hidden rounded-[24px] bg-[rgba(252,247,255,0.8)]"
        style={{ boxShadow: CARD_SHADOW }}
      >
        {/* Six day slots then the daily-rewards gift (node 626:1399).

            The days are one button, not decoration — the phone has no
            separate missions section, so the week itself is the way in.
            The gift keeps its own button beside it for daily rewards. */}
        <div className="absolute left-[26px] right-[22px] top-[16px] flex items-end justify-between">
          <button
            type="button"
            onClick={onMissionsClick}
            aria-label={t("missions.title")}
            className="flex flex-1 items-end justify-between pr-[10px] text-left"
          >
          {DAY_LABELS.map((label, i) => {
            const weekday = SLOT_WEEKDAYS[i];
            const state = dayState(weekday);
            const isToday = weekday === todayIdx;
            const isFuture = weekday > todayIdx;
            return (
              <div key={label} className="flex flex-col items-center">
                {isToday && state === "pending" ? (
                  /* Today: the missions crystal on the gold chip — the day
                     the player can still act on, showing what acting means.
                     Drawn 15% over the plain day slots so the one actionable
                     day in the row is the one that catches the eye. */
                  <div
                    className="flex h-[31.43px] w-[31.53px] items-start rounded-[125px]"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, rgb(107,46,224) 8%, rgb(133,71,235) 44.8%, rgb(122,56,217) 72.4%, rgb(89,31,184) 100%)",
                    }}
                  >
                    <div className="relative flex size-[31.07px] items-center justify-center rounded-full border-[1.456px] border-solid border-[#fbbf24] shadow-[0px_2.913px_0px_0px_#b45309,0px_4.854px_11.651px_0px_rgba(245,158,11,0.5)]">
                      <div
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundImage: "linear-gradient(to bottom, #fcd34d, #f59e0b 50%, #d97706)" }}
                      />
                      <img
                        src={missionsCrystal}
                        alt=""
                        className="relative size-[27.6px] object-contain drop-shadow-[0px_1.941px_1.456px_rgba(0,0,0,0.07)]"
                      />
                      <div className="absolute left-[7.81px] top-[3.88px] size-[2.935px] rounded-full bg-white opacity-[0.73]" />
                      <div className="absolute left-[15.96px] top-[19.79px] size-[2.163px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-[0.53]" />
                      <div
                        aria-hidden
                        className="absolute inset-0 rounded-full shadow-[inset_0px_1.456px_0px_0px_rgba(255,255,255,0.35)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex h-[27.328px] w-[27.42px] items-center justify-center rounded-full ${
                      state === "done" ? "bg-[#10b981]" : "bg-[rgba(149,129,171,0.14)]"
                    }`}
                  >
                    {state === "done" && (
                      <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" aria-hidden>
                        <path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke="#fff"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {state === "failed" && <img src={xDay} alt="" className="size-[14px]" />}
                    {isFuture && (
                      <p className="-mt-[9px] font-['Nunito'] text-[16px] font-bold leading-[16px] tracking-[0.5px] text-[#887695]">
                        ...
                      </p>
                    )}
                  </div>
                )}
                <p
                  className={`mt-[8.73px] text-center text-[13.15px] font-semibold leading-[19.725px] tracking-[-0.16px] text-[#402666] whitespace-nowrap ${
                    isToday || isFuture ? "" : "opacity-50"
                  }`}
                >
                  {label}
                </p>
              </div>
            );
          })}
          </button>

          {/* Daily rewards (node 626:1404) */}
          <button
            type="button"
            onClick={onGiftClick}
            aria-label={t("extra.dailyRewards")}
            className="relative h-[62px] w-[76px] shrink-0 rounded-full border-[3px] border-solid border-[rgba(255,255,255,0.9)] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1),0px_3px_0px_0px_#fdba74]"
            style={{ backgroundImage: "linear-gradient(to bottom, #fff7ed, #fed7aa)" }}
          >
            <span className="absolute left-[17.5px] top-[2px] block h-[48px] w-[41px] overflow-hidden">
              <img
                src={coinPurse}
                alt=""
                draggable={false}
                className="absolute left-[-16.46%] h-full w-[116.46%] max-w-none"
              />
            </span>
          </button>
        </div>
      </div>
    </motion.div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Guest (logged out)
 * ------------------------------------------------------------------ */

function AppleGlyph() {
  return (
    <svg viewBox="0 0 17 21" className="h-[21px] w-[17px]" fill="currentColor" aria-hidden>
      <path d="M14.03 11.07c-.02-2.1 1.71-3.11 1.79-3.16-.98-1.43-2.5-1.62-3.04-1.64-1.29-.13-2.52.76-3.18.76-.65 0-1.67-.74-2.74-.72-1.41.02-2.71.82-3.44 2.08-1.46 2.54-.37 6.3 1.05 8.36.7 1.01 1.53 2.14 2.62 2.1 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.04.8-1.17 1.13-2.3 1.15-2.36-.03-.01-2.2-.85-2.21-3.36zM11.96 4.6c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16z" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[24px]" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18.5 18.5" className="size-[18.498px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M18.13 9.46c0-.66-.06-1.29-.17-1.9H9.25v3.6h4.98a4.26 4.26 0 01-1.85 2.8v2.33h2.99c1.75-1.61 2.76-3.99 2.76-6.83z"
      />
      <path
        fill="#34A853"
        d="M9.25 18.5c2.5 0 4.6-.83 6.12-2.24l-2.99-2.32c-.83.56-1.89.88-3.13.88-2.41 0-4.45-1.62-5.18-3.81H.98v2.39a9.25 9.25 0 008.27 5.1z"
      />
      <path
        fill="#FBBC05"
        d="M4.07 11.01a5.54 5.54 0 010-3.53V5.1H.98a9.25 9.25 0 000 8.3l3.09-2.39z"
      />
      <path
        fill="#EA4335"
        d="M9.25 3.67c1.36 0 2.58.47 3.54 1.39l2.65-2.65C13.85.92 11.75 0 9.25 0A9.25 9.25 0 00.98 5.1l3.09 2.38c.73-2.19 2.77-3.81 5.18-3.81z"
      />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[24px]" fill="none" aria-hidden>
      <rect x="2.5" y="4.5" width="19" height="15" rx="1.5" stroke="#1e2b6f" strokeWidth="1.8" />
      <path d="M3 6l9 6.5L21 6" stroke="#1e2b6f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Square provider button — node 633:578 / 633:583 / 633:587
function AuthIconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative size-[54px] shrink-0 rounded-[18.498px] border-[1.542px] border-solid border-[#e8e0f5]"
      style={{ boxShadow: AUTH_SHADOW }}
    >
      <span aria-hidden className="absolute inset-0 rounded-[inherit]" style={{ background: AUTH_GRADIENT }} />
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
      <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.86px_0px_0px_white]" />
    </button>
  );
}

interface MobileGuestHeroProps {
  onApple: () => void;
  onFacebook: () => void;
  onGoogle: () => void;
  onEmail: () => void;
  onMenu: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  searchButton: React.ReactNode;
}

// node 632:296 — logo and tagline up top, the Georgian trophy map filling
// the middle, provider buttons and the terms note above the nav.
export function MobileGuestHero({
  onApple,
  onFacebook,
  onGoogle,
  onEmail,
  onMenu,
  onTerms,
  onPrivacy,
  searchButton,
}: MobileGuestHeroProps) {
  return (
    <div className="md:hidden pointer-events-none absolute inset-0 z-20 flex flex-col overflow-hidden">
      {/* Header (node 632:308 / 632:385): burger and search only — the
          wordmark lives in the body on this state */}
      <div className="pointer-events-auto flex h-[70px] shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label={t("nav.menu")}
          className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/30"
        >
          <Menu className="size-6 text-gray-600" />
        </button>
        {searchButton ?? (
          <span className="flex size-9 items-center justify-center">
            <Search className="size-5 text-gray-600" />
          </span>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="flex shrink-0 flex-col items-center px-4 pt-[9px]"
      >
        {/* 661x172 lockup rendered at the frame's 66.511px crown height,
            which is exactly the designed 255.605px wide */}
        <img src={myTriviaLogo} alt="MyTrivia" className="h-[66.511px] w-auto select-none" draggable={false} />
        <p className="mt-[16.5px] max-w-[394px] text-center text-[18px] leading-[27px] tracking-[-0.16px] text-[#002b63]">
          {t("extra.guestTagline")}
        </p>
      </motion.div>

      {/* The island sits on the bottom of this band so its lower edge meets
          the provider buttons. It is 893 / 500 wide with its left edge at
          -219 / 500, but max-height caps it to the band and object-contain
          scales it down to fit: the artwork is never sliced through, which
          would leave a hard horizontal edge across the page on phones whose
          band is shorter than the frame's. Positioned with `left` rather
          than a translate utility because framer's inline transform on a
          motion element would overwrite the class. */}
      <div className="relative mt-[16px] min-h-0 flex-1">
        <motion.img
          src={guestGeoMap}
          alt=""
          draggable={false}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="pointer-events-none absolute bottom-0 max-w-none select-none object-contain object-bottom"
          style={{ left: "calc(50% - 93.8vw)", width: "178.6vw", maxHeight: "100%" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        className="pointer-events-auto shrink-0 px-4 min-[420px]:px-6"
      >
        {/* Provider row (node 633:604) — 392px wide in the frame. The Apple
            button takes the slack, putting its glyph at 18px and its label at
            46px exactly as designed; on phones too narrow for the full label
            it ellipsizes rather than running under the Facebook button. */}
        <div className="mx-auto flex w-full max-w-[392px] items-center gap-[10px]">
          <button
            type="button"
            onClick={onApple}
            className="relative flex h-[54px] min-w-0 flex-1 items-center gap-[11px] overflow-hidden rounded-[18.498px] border-[1.542px] border-solid border-[#e8e0f5] pl-[18px] pr-[10px]"
            style={{ boxShadow: AUTH_SHADOW }}
          >
            <span aria-hidden className="absolute inset-0 rounded-[inherit]" style={{ background: AUTH_GRADIENT }} />
            <span className="relative shrink-0 text-black">
              <AppleGlyph />
            </span>
            <span className="relative min-w-0 truncate text-[13px] font-bold leading-[18.498px] tracking-[-0.1644px] text-black">
              {t("extra.appleSignInBtn")}
            </span>
            <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.86px_0px_0px_white]" />
          </button>
          <AuthIconButton onClick={onFacebook} label="Facebook">
            <FacebookGlyph />
          </AuthIconButton>
          <AuthIconButton onClick={onGoogle} label="Google">
            <GoogleGlyph />
          </AuthIconButton>
          <AuthIconButton onClick={onEmail} label={t("auth.email")}>
            <MailGlyph />
          </AuthIconButton>
        </div>

        {/* Terms note (node 633:469) */}
        <p className="mx-auto mt-[17px] max-w-[393px] text-center text-[12px] leading-[21px] tracking-[-0.16px] text-[#402666]">
          {t("extra.guestTermsIntro")}{" "}
          <button type="button" onClick={onTerms} className="text-[#0f198a] underline underline-offset-2">
            {t("extra.guestTermsService")}
          </button>{" "}
          {t("extra.guestTermsAnd")}{" "}
          <button type="button" onClick={onPrivacy} className="text-[#0f198a] underline underline-offset-2">
            {t("extra.guestTermsConditions")}
          </button>
        </p>
      </motion.div>

      {/* Clearance for the fixed bottom nav (node 632:325) */}
      <div className="shrink-0" style={{ height: `calc(52px + ${NAV_H})` }} />
    </div>
  );
}
