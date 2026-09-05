import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Menu, Search } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import myTriviaLogo from "@/assets/mytrivia-logo.svg";
import guestGeoMap from "@/assets/figma-home/guest-geo-map.webp";
import coinChunky from "@/assets/figma-home/coin-chunky.png";
import gemChunky from "@/assets/figma-home/gem-chunky.png";
import giftDaily from "@/assets/figma-home/gift-daily.png";
import chestDaily from "@/assets/figma-home/chest-daily.png";
import streakFire from "@/assets/figma-home/streak-fire.png";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useWaveMask } from "@/components/home/wave";
import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import heroScene from "@/assets/figma-landing/hero-scene.png";

// Figma: Hom — the mobile home states, all drawn on a 500x946 frame:
//   632:296  Logged out / guest
//   991:781  Logged in
// Sizes below are the frame's own pixels; widths that must span the screen
// are expressed as a share of the frame width (vw) so the artwork keeps its
// designed proportions on any phone.

const STAT_SHADOW = "0px 2.745px 0px 0px #d8d0e8, 0px 4.116px 10.978px 0px rgba(0,0,0,0.1)";
const STAT_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";
const AUTH_SHADOW = "0px 3.72px 0px 0px #d8d0e8, 0px 5.58px 14.881px 0px rgba(0,0,0,0.1)";
const AUTH_GRADIENT = STAT_GRADIENT;

// The bottom nav is 88px of chrome (20px padding + 48px items) plus the
// device inset; scene art is anchored off it exactly as in the frame.
// The nav's real height, from the same token the nav and the layout use.
// This was a hand-written "88px + inset" that no longer matched either, so
// the week strip sat against the nav's top edge instead of clear of it.
const NAV_H = "calc(var(--bottom-nav-height) + var(--safe-bottom))";


/* ------------------------------------------------------------------ *
 * Scene background (logged-in states)
 * ------------------------------------------------------------------ */

// Above the app-wide backdrop, below the cards.
//
// GlobalSplineBackground paints a blob video at z-0, a white radial mask at
// z-1 and two particle layers at z-2 and z-3, all fixed over the whole app.
// The scene sat at z-0 with them, so the mask washed it out and the orbs and
// sparkles drifted across the face of a picture someone had generated of
// themselves. It goes above that stack and stays well below the widgets,
// which start at z-20.
const SCENE_Z = "z-[4]";

// The scene is anchored to the bottom and does not reach the top of the
// screen, so its top edge would otherwise cut straight across the animated
// blob wash behind it. Front-loaded ramp: near-solid within the top 16%, with
// only the last sliver of alpha spread far enough down to hide the tone seam
// between the artwork's sky and the page.
//
// Inline rather than a Tailwind arbitrary property: that ships `mask-image`
// alone, which iOS below 15.4 ignores outright — and an ignored mask is
// precisely the hard top edge this is here to prevent.
const SCENE_TOP_FADE: React.CSSProperties = {
  maskImage:
    "linear-gradient(to bottom, transparent 0, rgba(0,0,0,0.92) 16%, black 55%)",
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0, rgba(0,0,0,0.92) 16%, black 55%)",
};

// Figma 991:1239. The artwork starts at the very top of the frame and runs
// 896 of its 946px, the last 50 disappearing behind the nav; the header and
// the friends reel sit directly on it. Two washes lie over it: a white one
// that dissolves the top 31% so the chrome reads on near-white, and a
// lavender one beneath that tints the sky between 3% and 23%.
const SCENE_WASH =
  "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0) 31.362%), " +
  "linear-gradient(180deg, #d1c8f3 3.1744%, rgba(244,216,253,0) 22.768%)";

interface MobileSceneBackgroundProps {
  /** The Trivia King idle loop, played while no mascot is chosen. */
  defaultVideoSrc: string;
}

// The default scene: the Trivia King loop at the page root, behind the
// header and the friends strip, exactly as the home screen has always
// played it. A chosen mascot is a different picture with different needs
// and is painted by MobileMascotScene instead.
export function MobileSceneBackground({ defaultVideoSrc }: MobileSceneBackgroundProps) {
  // The loop is 16:9, so it spans 227.2vw from -47.8vw as in the frame —
  // far wider than the screen precisely so that a landscape clip is tall
  // enough to fill the space above the nav. Bottom-anchored, fading out at
  // the top into the page's wash.
  const style: React.CSSProperties = { bottom: NAV_H, ...SCENE_TOP_FADE };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`md:hidden absolute inset-0 ${SCENE_Z} select-none pointer-events-none overflow-hidden`}
    >
      {/* The default scene is the Trivia King idle loop, not a still of it.
          The full-bleed rewrite dropped the video and rendered the home-scene
          artwork on its own, so the character simply stopped moving;
          `heroScene` is the exported frame that holds until playback starts. */}
      <div className="absolute left-[-47.8vw] w-[227.2vw] aspect-video" style={style}>
        <BackgroundVideo
          src={defaultVideoSrc}
          still={heroScene}
          className="absolute inset-0 size-full"
        />
        {/* The loop's own foot, dissolved into the page so the clip does not
            end on a visible edge above the nav. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(246,222,255,0) 55.7%, #f6deff 88.4%)" }}
        />
      </div>
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: SCENE_WASH }} />
    </motion.div>
  );
}

interface MobileMascotSceneProps {
  /** The chosen mascot's 9:16 scene. */
  sceneUrl: string;
}

// The chosen mascot as the phone's wallpaper: the whole 9:16 frame, covering
// the page behind the header, the friends strip and the profile card, with
// the same white wash over the top that the King loop wears so the chrome
// stays readable on it. A phone taller than 9:16 loses a sliver off each
// side; the character sits in the middle of the frame and keeps.
//
// Two framings came before this and were both wrong: bled to 106vw and
// nav-anchored, the head went under the friends strip; fitted whole into
// the band above the card, it read as a pasted card. The art was made for
// the screen — it takes the screen.
export function MobileMascotScene({ sceneUrl }: MobileMascotSceneProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`md:hidden absolute inset-0 ${SCENE_Z} select-none pointer-events-none overflow-hidden`}
    >
      <img
        src={sceneUrl}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: SCENE_WASH }} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Profile card (logged-in states)
 * ------------------------------------------------------------------ */

// Chunky coin / gem pill — nodes 1076:2088 (coins, 87×40) and 1076:2095
// (gems, 75×40). The frame froze each pill at one width for its sample
// value, which leaves short balances with a hole between the icon and the
// number; icon and value sit in a flex row instead, and the width steps with
// how long the value reads so nothing is ever clipped.
function statPillMinWidth(value: string): number {
  if (value.length <= 1) return 58;
  if (value.length === 2) return 66;
  return 75;
}

function StatPill({
  icon,
  value,
  label,
  onClick,
}: {
  icon: string;
  value: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex h-[40px] shrink-0 items-center gap-[2px] rounded-[33px] border-[0.934px] border-solid border-[#e8e0f5] pl-[3.6px] pr-[11px]"
      style={{ boxShadow: STAT_SHADOW, minWidth: statPillMinWidth(value) }}
    >
      <span aria-hidden className="absolute inset-0 rounded-[inherit]" style={{ background: STAT_GRADIENT }} />
      <img
        src={icon}
        alt=""
        draggable={false}
        className="relative size-[29.876px] shrink-0 object-cover"
      />
      <span className="relative flex-1 text-center font-['Nunito'] text-[16.159px] font-black leading-[25.132px] tracking-[-0.1462px] text-[#334155] whitespace-nowrap">
        {value}
      </span>
      <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.372px_0px_0px_white]" />
    </button>
  );
}

// Figma 1076:2066. The card is 464 wide on the 500 frame — 17px from the left
// edge, 19 from the right — and 83 tall, with its bottom edge at 789: 49px
// clear of the nav's 88px of chrome on the 926 frame. Everything inside it is
// placed in the frame's own pixels: the avatar and the name from the left,
// the two balances from the right.
const CARD_H = 83;
const CARD_LEFT = 17;
const CARD_RIGHT = 19;
// Narrower than this and the name has no room left between the avatar and
// the balances (avatar 67 + name floor 60 + pills 168 + insets), so the card
// is scaled down uniformly instead of squeezed: every size, gap and radius
// stays the frame's own, only smaller. Every current phone is wider.
const CARD_MIN_W = 340;
// How far the card's hills reach past its lines (Figma 1076:3700 / 3697):
// 11px above the top, 10px below the bottom.
const CARD_WAVE_TOP = 11;
const CARD_WAVE_BOTTOM = 10;

// The bottom nav's real height: 88px of chrome (20px of padding around 48px
// items) plus the padding it adds for the home indicator. The card floats
// 49px clear of it, as in the frame. Exported: the scroll-reveal home's feed
// pulls itself up over exactly this strip and clears the nav by it, so the
// card and the feed cannot disagree about where the nav is.
export const NAV_CHROME = "calc(88px + max(0.25rem, var(--safe-bottom) / 2))";
const CARD_GAP_ABOVE_NAV = 49;

// The avatar's ring — the same gradient the friends reel draws around
// whoever is online, which on your own card is always you.
const AVATAR_RING = "linear-gradient(135deg, #9333EA 0%, #EC4899 50%, #F97316 100%)";

function useCardScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? CARD_MIN_W : Math.max(0, window.innerWidth - CARD_LEFT - CARD_RIGHT)
  );
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(1, width / CARD_MIN_W);
  return {
    ref,
    scale,
    designWidth: scale > 0 ? width / scale : width,
  };
}

interface MobileProfileCardProps {
  nickname: string;
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null;
  coins: number;
  gems: number;
  /** The avatar disc: the mascot / avatar picker. */
  onAvatarClick: () => void;
  onNameClick: () => void;
  onCoinsClick: () => void;
  onGemsClick: () => void;
}

// node 1076:2066. The avatar in its gradient ring, the nickname beside it and
// the coin and gem pills on the right, all on one 83px frosted bar anchored
// above the bottom nav so the scene it floats on is not covered by it.
export function MobileProfileCard({
  nickname,
  avatarUrl,
  animatedAvatarUrl,
  coins,
  gems,
  onAvatarClick,
  onNameClick,
  onCoinsClick,
  onGemsClick,
}: MobileProfileCardProps) {
  const { ref, scale, designWidth } = useCardScale();
  // The card's edges roll (Figma 1076:3700 / 3697): the frosted glass itself
  // is masked to a wave dealt fresh on every visit, with its hills reaching
  // 11px above the top edge and 10px below the bottom.
  const wave = useWaveMask({ top: CARD_WAVE_TOP + 5, bottom: CARD_WAVE_BOTTOM + 6, width: designWidth });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 26 }}
      className="md:hidden absolute z-20"
      style={{
        left: CARD_LEFT,
        right: CARD_RIGHT,
        bottom: `calc(${NAV_CHROME} + ${CARD_GAP_ABOVE_NAV}px)`,
        height: CARD_H * scale,
      }}
    >
      <div
        className="absolute bottom-0 left-0 origin-bottom-left"
        style={{ width: designWidth, height: CARD_H, transform: `scale(${scale})` }}
      >
        {/* The shadow, cast by the same wavy shape: a blurred copy of the
            card's silhouette under it. A box-shadow would trace the straight
            box, and a mask on the card would cut a shadow of its own away. */}
        <div
          aria-hidden
          className="absolute left-0 right-0 translate-y-[7px] blur-[11px]"
          style={{ top: -CARD_WAVE_TOP, bottom: -CARD_WAVE_BOTTOM }}
        >
          <div className="size-full rounded-[33.41px] bg-[rgba(102,51,153,0.16)]" style={wave} />
        </div>
        <div
          // Frosted AND nearly opaque: the mascot wallpaper runs under the
          // card. The blur turns whatever is behind it into a wash, and the
          // fill keeps that wash pale enough that the name and the balances
          // sit on white rather than on the character's hoodie. The box
          // reaches past the card's lines by the hills' height, and the
          // mask rolls its edges; everything inside is placed from the
          // card's own top, CARD_WAVE_TOP further down.
          className="absolute left-0 right-0 overflow-hidden rounded-[33.41px] border-[1.867px] border-solid border-white bg-[rgba(252,247,255,0.82)] backdrop-blur-[37px]"
          style={{ top: -CARD_WAVE_TOP, bottom: -CARD_WAVE_BOTTOM, ...wave }}
        >
          {/* Avatar — node 1076:3548: a 52px disc, 2.5px gradient ring, 1.6px
              white ring, 44px picture, 14.6px in from the card's edge. */}
          <button
            type="button"
            onClick={onAvatarClick}
            aria-label={t("extra.changeScene")}
            className="absolute left-[14.64px] top-[25px] size-[52.364px] rounded-full p-[2.455px]"
            style={{ background: AVATAR_RING }}
          >
            <span className="block size-full rounded-full bg-white p-[1.636px]">
              <span className="block size-full overflow-hidden rounded-full">
                <SmartAvatar
                  avatarUrl={avatarUrl}
                  animatedAvatarUrl={animatedAvatarUrl}
                  fallback={nickname}
                  size="lg"
                  showSparkle={false}
                  className="size-full object-cover"
                />
              </span>
            </span>
          </button>

          {/* The name is bounded by the balances and truncates; the pills
              never shrink, so a long name gives up its own characters rather
              than pushing them out. */}
          <button
            type="button"
            onClick={onNameClick}
            className="absolute left-[77px] right-[196px] top-[28px] h-[44.814px] truncate text-left font-slackey text-[26px] capitalize leading-[44.814px] tracking-[-0.1494px] text-[#402666]"
          >
            {nickname}
          </button>

          <div className="absolute right-[20px] top-[28px] flex gap-[6.162px]">
            <StatPill
              icon={coinChunky}
              value={formatCompactNumber(coins)}
              label={t("common.coins")}
              onClick={onCoinsClick}
            />
            <StatPill
              icon={gemChunky}
              value={formatCompactNumber(gems)}
              label={t("common.gems")}
              onClick={onGemsClick}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Hero widgets — the reward tabs floating on the scene
 * ------------------------------------------------------------------ */

// Figma 1076:3587 (gift), 1076:3577 (streak) and 1076:3581 (quest): three
// frosted tabs on the scene between the friends reel and the profile card —
// the daily-reward gift with its countdown on the left, the streak flame and
// the missions chest on the right. Each is an 80px glass card whose outer
// top corner swells to 62px, with its artwork spilling over the top edge.
const WIDGET_GLASS =
  "linear-gradient(180deg, rgba(188,223,248,0.5) 0%, rgba(212,201,220,0.5) 15.385%, rgba(255,209,150,0.5) 37.981%, rgba(255,255,255,0.5) 71.056%, rgba(255,255,255,0.5) 100%)";
const WIDGET_SHADOW =
  "0px 1.867px 7.469px 0px rgba(102,51,153,0.06), 0px 7.469px 22.407px 0px rgba(102,51,153,0.12)";
const WIDGET_BORDER = "1.867px solid #ffffff";
// The big corner is the outer top one: top-right on the left-hand gift,
// top-left on the right-hand pair.
const GIFT_RADIUS = "22.41px 62.41px 23px 22.407px";
const RIGHT_RADIUS = "62.41px 22.41px 23px 22.407px";

// The frame measures every widget from the top of a frame whose header is
// 69px tall. The header here reports its own height on the home column, so
// the widgets hang off that instead and keep the frame's gaps under a header
// that measures differently.
const FRAME_HEADER_H = 69;
function belowHeader(frameY: number): string {
  return `calc(var(--home-header-h, ${FRAME_HEADER_H}px) + ${frameY - FRAME_HEADER_H}px)`;
}

const WIDGET_LABEL =
  "pointer-events-none absolute text-center font-['Nunito'] text-[14px] font-extrabold leading-[16px] tracking-[-0.16px] text-[rgba(0,0,0,0.91)]";

interface MobileHeroWidgetsProps {
  /** Under the gift: the time left to claim today's reward, or the call to claim it. */
  giftLabel: string;
  onGiftClick: () => void;
  onStreakClick: () => void;
  onQuestClick: () => void;
}

export function MobileHeroWidgets({ giftLabel, onGiftClick, onStreakClick, onQuestClick }: MobileHeroWidgetsProps) {
  return (
    <div className="md:hidden pointer-events-none absolute inset-0 z-20">
      {/* Gift — card at (18, 223.8) 80×90; the box leans 5.88° over its top edge. */}
      <button
        type="button"
        onClick={onGiftClick}
        aria-label={t("extra.dailyRewards")}
        className="pointer-events-auto absolute left-[18px] h-[90px] w-[80px] backdrop-blur-[37px]"
        style={{
          top: belowHeader(223.8),
          background: WIDGET_GLASS,
          border: WIDGET_BORDER,
          borderRadius: GIFT_RADIUS,
          boxShadow: WIDGET_SHADOW,
        }}
      />
      <span
        aria-hidden
        className="absolute left-[30.76px] flex h-[72px] w-[68.432px] items-center justify-center"
        style={{ top: belowHeader(211) }}
      >
        <span className="block h-[66px] w-[62px] overflow-hidden" style={{ transform: "rotate(5.88deg)" }}>
          <img
            src={giftDaily}
            alt=""
            draggable={false}
            className="absolute left-[-17.86%] top-[-16.95%] h-[128.81%] w-[135.71%] max-w-none"
          />
        </span>
      </span>
      <span className={WIDGET_LABEL} style={{ top: belowHeader(223.8 + 63), left: 18, width: 80 }}>
        {giftLabel}
      </span>

      {/* Streak — card at (401, 218) 80×96; the flame leans -8.95° over it. */}
      <button
        type="button"
        onClick={onStreakClick}
        aria-label={t("extra.heroStreak")}
        className="pointer-events-auto absolute right-[19px] h-[96px] w-[80px] backdrop-blur-[37px]"
        style={{
          top: belowHeader(218),
          background: WIDGET_GLASS,
          border: WIDGET_BORDER,
          borderRadius: RIGHT_RADIUS,
          boxShadow: WIDGET_SHADOW,
        }}
      />
      <span
        aria-hidden
        className="absolute right-[8.78px] flex h-[79.416px] w-[103.022px] items-center justify-center"
        style={{ top: belowHeader(207.53) }}
      >
        <img
          src={streakFire}
          alt=""
          draggable={false}
          className="block h-[65.595px] w-[93.96px] max-w-none object-cover"
          style={{ transform: "rotate(-8.95deg)" }}
        />
      </span>
      <span className={WIDGET_LABEL} style={{ top: belowHeader(218 + 70), right: 19, width: 80 }}>
        {t("extra.heroStreak")}
      </span>

      {/* Quest — card at (400, 339) 80×90; the chest sits inside it, leaning
          -7.57° and poking 14px above the top edge. */}
      <button
        type="button"
        onClick={onQuestClick}
        aria-label={t("extra.heroQuest")}
        className="pointer-events-auto absolute right-[20px] h-[90px] w-[80px] backdrop-blur-[37px]"
        style={{
          top: belowHeader(339),
          background: WIDGET_GLASS,
          border: WIDGET_BORDER,
          borderRadius: RIGHT_RADIUS,
          boxShadow: WIDGET_SHADOW,
        }}
      />
      <span
        aria-hidden
        className="absolute right-[22.7px] flex h-[81.945px] w-[80.173px] items-center justify-center"
        style={{ top: belowHeader(339 - 13.87) }}
      >
        <span className="block h-[73.207px] w-[71.144px] overflow-hidden" style={{ transform: "rotate(-7.57deg)" }}>
          <img
            src={chestDaily}
            alt=""
            draggable={false}
            className="absolute left-[-8.24%] top-[-13.04%] h-[113.04%] w-[115.03%] max-w-none"
          />
        </span>
      </span>
      <span className={WIDGET_LABEL} style={{ top: belowHeader(339 + 63), right: 20, width: 80 }}>
        {t("extra.heroQuest")}
      </span>
    </div>
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


interface MobileGuestHeroProps {
  onApple: () => void;
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
        {/* Provider stack. Apple leads as the HIG black button — guideline
            4.8 wants it at least as prominent as any other login, and the
            HIG's own buttons (black fill, centered logo+label) are what
            reviewers expect to see. Google follows in its official white
            style, then email. (The old row — Apple in a lilac pill next to
            bare G and mail icons — read as custom chrome, not the sanctioned
            buttons.) */}
        <div className="mx-auto flex w-full max-w-[392px] flex-col gap-[10px]">
          <button
            type="button"
            onClick={onApple}
            className="flex h-[50px] w-full items-center justify-center gap-[10px] rounded-[14px] bg-black text-white active:opacity-80"
          >
            <AppleGlyph />
            <span className="text-[16px] font-semibold tracking-[-0.2px]">
              {t("extra.appleSignInBtn")}
            </span>
          </button>
          <button
            type="button"
            onClick={onGoogle}
            className="flex h-[50px] w-full items-center justify-center gap-[10px] rounded-[14px] border border-[#dadce0] bg-white text-[#1f1f1f] active:opacity-80"
          >
            <GoogleGlyph />
            <span className="text-[16px] font-medium tracking-[-0.2px]">
              {t("extra.landingGoogleSignIn")}
            </span>
          </button>
          {/* No Facebook button: no Facebook provider is configured, and
              the placeholder that opened the signup form instead read as
              broken sign-in — which is exactly how it was reported. Restore
              it only once a real Meta app is wired into Supabase Auth. */}
          <button
            type="button"
            onClick={onEmail}
            className="relative flex h-[50px] w-full items-center justify-center gap-[10px] overflow-hidden rounded-[14px] border-[1.542px] border-solid border-[#e8e0f5] text-[#002b63]"
            style={{ boxShadow: AUTH_SHADOW }}
          >
            <span aria-hidden className="absolute inset-0 rounded-[inherit]" style={{ background: AUTH_GRADIENT }} />
            <span className="relative flex items-center gap-[10px]">
              <MailGlyph />
              <span className="text-[15px] font-bold tracking-[-0.16px]">{t("extra.landingOrEmail")}</span>
            </span>
            <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.86px_0px_0px_white]" />
          </button>
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
