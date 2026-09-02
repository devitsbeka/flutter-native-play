import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Menu, Search } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import myTriviaLogo from "@/assets/mytrivia-logo.svg";
import guestGeoMap from "@/assets/figma-home/guest-geo-map.webp";
import coinChunky from "@/assets/figma-home/coin-chunky.png";
import gemChunky from "@/assets/figma-home/gem-chunky.png";
import homeScene from "@/assets/figma-home/home-scene.webp";
import dailyRewardBag from "@/assets/figma-home/daily-reward-bag.png";
import streakFire from "@/assets/figma-home/streak-fire.png";
import flagGeRound from "@/assets/figma-home/flag-ge-round.svg";
import { getCountryFlag } from "@/data/opponents";
import { BackgroundVideo } from "@/components/shared/BackgroundVideo";

// Figma: Hom — the mobile home states, all drawn on a 500x946 frame:
//   632:296  Logged out / guest
//   991:781  Logged in
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

// Figma 991:1239. The artwork starts at the very top of the frame and runs
// 896 of its 946px, the last 50 disappearing behind the nav; the header and
// the friends reel sit directly on it. Two washes lie over it: a white one
// that dissolves the top 31% so the chrome reads on near-white, and a
// lavender one beneath that tints the sky between 3% and 23%.
const SCENE_WASH =
  "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0) 31.362%), " +
  "linear-gradient(180deg, #d1c8f3 3.1744%, rgba(244,216,253,0) 22.768%)";

interface MobileSceneBackgroundProps {
  /** Generated still for this user, when they have one. */
  sceneUrl: string | null;
  /** Matching idle-loop video for the generated scene. */
  sceneVideoUrl: string | null;
  /** Fall back to the frame's own Trivia King artwork. */
  showDefaultScene: boolean;
}

// The frame's artwork is a 1536x2752 portrait, the same 0.558 aspect as its
// 500x896 box, so `cover` from the top is the frame's own crop on a phone
// whose content area is that shape — and on a taller one it grows to fill
// rather than leave a strip of bare wash above the nav. A generated scene is
// 16:9 and keeps its centre column, where the subject stands.
export function MobileSceneBackground({
  sceneUrl,
  sceneVideoUrl,
  showDefaultScene,
}: MobileSceneBackgroundProps) {
  if (!sceneUrl && !showDefaultScene) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`md:hidden absolute inset-0 ${SCENE_Z} select-none pointer-events-none overflow-hidden bg-[#f9dbff]`}
    >
      {sceneUrl ? (
        sceneVideoUrl ? (
          // BackgroundVideo, not <video autoplay>: Low Power Mode paints a
          // play glyph over a suspended autoplay video and CSS cannot hide
          // it. The still renders until playback truly starts.
          <BackgroundVideo src={sceneVideoUrl} still={sceneUrl} className="absolute inset-0" />
        ) : (
          <img
            src={sceneUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full max-w-none object-cover"
          />
        )
      ) : (
        <img
          src={homeScene}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full max-w-none object-cover object-top"
        />
      )}
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: SCENE_WASH }} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Profile card (logged-in states)
 * ------------------------------------------------------------------ */

// Floor width for a stat pill, stepped by how long the value reads: one
// character ("6") stays narrow, two ("42") sit in the middle, three or more
// ("999", "1.2K") get the frame's own 84px floor. Anything longer just
// grows past the floor, so the number is never clipped.
function statPillMinWidth(value: string): number {
  if (value.length <= 1) return 64;
  if (value.length === 2) return 74;
  return 84;
}

// Chunky coin / gem pill — node 991:957 and 991:962. The frame froze each
// pill at one width for its sample value, which leaves short balances with a
// hole between the icon and the number; icon and value sit in a flex row
// instead, and the width steps with how long the value reads.
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
      className="relative flex h-[43.07px] shrink-0 items-center gap-[4px] rounded-[14.616px] border border-solid border-[#e8e0f5] pl-[7px] pr-[13px]"
      style={{ boxShadow: STAT_SHADOW, minWidth: statPillMinWidth(value) }}
    >
      <span aria-hidden className="absolute inset-0 rounded-[inherit]" style={{ background: STAT_GRADIENT }} />
      <img
        src={icon}
        alt=""
        draggable={false}
        className="relative size-[32.305px] shrink-0 object-cover"
      />
      <span className="relative flex-1 text-center font-['Nunito'] text-[16.159px] font-black leading-[25.132px] tracking-[-0.1462px] text-[#334155] whitespace-nowrap">
        {value}
      </span>
      <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_1.47px_0px_0px_white]" />
    </button>
  );
}

// The frame draws the Georgian flag as a 30px disc (node 992:5607). Every
// other country gets its emoji flag cropped into the same disc, scaled up so
// the glyph's own margins fall outside the circle.
function RoundFlag({ code }: { code: string }) {
  if (code.toUpperCase() === "GE") {
    return <img src={flagGeRound} alt="" draggable={false} className="size-[30px] shrink-0" />;
  }
  // getCountryFlag falls back to a blank white flag for a code it doesn't
  // know, which says less than showing nothing at all.
  const emoji = getCountryFlag(code);
  if (!emoji || emoji === "🏳️") return null;
  return (
    <span
      aria-hidden
      className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"
    >
      <span className="block text-[30px] leading-none" style={{ transform: "scale(1.5)" }}>
        {emoji}
      </span>
    </span>
  );
}

// The frame is 500 wide with 24px either side of the card, so the card is
// 452 and everything inside it is placed in the frame's own pixels — the
// balances from the left, the two reward tabs from the right. A 393px phone
// gives the card 345, and at 1:1 the tabs land on the balances. So the card
// is laid out at its design width and scaled down uniformly to whatever
// width the phone has: every size, gap and radius stays the frame's own,
// only smaller. On anything at least as wide as the frame it renders 1:1
// and the right-anchored tabs simply follow the wider card.
const CARD_DESIGN_W = 452;
const CARD_H = 123;
const CARD_INSET = 24;

// The bottom nav's real height: 88px of chrome (20px of padding around 48px
// items) plus the padding it adds for the home indicator. The card floats
// 53px clear of it, as in the frame (nav at 854, card bottom at 801).
const NAV_CHROME = "calc(88px + max(0.25rem, var(--safe-bottom) / 2))";
const CARD_GAP_ABOVE_NAV = 53;

// Reward tabs — nodes 991:1027 (purse) and 994:5637 (flame). The flame tab
// is the purse tab turned 180°, so its gradient and corners are written
// here already turned rather than rotated in CSS: a rotated element would
// carry its hard shadow to its top edge, while the frame keeps both shadows
// on the bottom.
const TAB_SHADOW = "0px 2.277px 6.831px 0px rgba(0,0,0,0.06), 0px 2.277px 0px 0px #cbc3d4";
const TAB_BORDER = "3.415px solid rgba(255,255,255,0.65)";
const PURSE_TAB_RADIUS = "12.57px 25.046px 105.877px 20px";
const FLAME_TAB_RADIUS = "105.877px 20px 12.57px 25.046px";
const PURSE_TAB_GRADIENT = "linear-gradient(to bottom, #e0cdf5, #ffedee)";
const FLAME_TAB_GRADIENT = "linear-gradient(to bottom, #f5cdcd, #fff3ed)";

function useCardScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? CARD_DESIGN_W : Math.max(0, window.innerWidth - CARD_INSET * 2)
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
  return {
    ref,
    scale: Math.min(1, width / CARD_DESIGN_W),
    designWidth: Math.max(CARD_DESIGN_W, width),
  };
}

interface MobileProfileCardProps {
  nickname: string;
  /** ISO-2 of the country the player is ranked in; flag sits before the name. */
  countryCode?: string | null;
  /** Place on that country's board (global when we have no country). */
  rank?: number | null;
  coins: number;
  gems: number;
  onNameClick: () => void;
  /** The rank badge is a shortcut into the board it came from. */
  onRankClick: () => void;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  /** The purse tab: daily rewards. */
  onGiftClick: () => void;
  /** The flame tab: the play streak. */
  onStreakClick: () => void;
}

// node 991:948. Flag, nickname and rank on the first row, the coin and gem
// pills under them, and the two reward tabs tucked into the top-right —
// the purse for daily rewards, the flame for the streak. Anchored above the
// bottom nav, so the scene it floats on is not covered by it.
export function MobileProfileCard({
  nickname,
  countryCode,
  rank,
  coins,
  gems,
  onNameClick,
  onRankClick,
  onCoinsClick,
  onGemsClick,
  onGiftClick,
  onStreakClick,
}: MobileProfileCardProps) {
  const { ref, scale, designWidth } = useCardScale();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 26 }}
      className="md:hidden absolute inset-x-6 z-20"
      style={{
        bottom: `calc(${NAV_CHROME} + ${CARD_GAP_ABOVE_NAV}px)`,
        height: CARD_H * scale,
      }}
    >
      <div
        className="absolute bottom-0 left-0 origin-bottom-left"
        style={{ width: designWidth, height: CARD_H, transform: `scale(${scale})` }}
      >
        <div
          className="relative size-full overflow-hidden border-2 border-solid border-white bg-[rgba(252,247,255,0.8)]"
          style={{ borderRadius: "24px 24px 54px 24px", boxShadow: CARD_SHADOW }}
        >
          {/* Flag, name, rank. The name is bounded by the flame tab and
              truncates; the flag and the badge never shrink, so a long name
              gives up its own characters rather than pushing them out. */}
          <div className="absolute left-[24px] right-[163px] top-[12px] flex h-[48px] items-center">
            {countryCode && (
              <span className="relative -top-[3px] mr-[14px] flex shrink-0">
                <RoundFlag code={countryCode} />
              </span>
            )}
            <button
              type="button"
              onClick={onNameClick}
              className="min-w-0 truncate text-left font-slackey text-[32px] capitalize leading-[48px] tracking-[-0.16px] text-[#402666]"
            >
              {nickname}
            </button>
            {!!rank && (
              <button
                type="button"
                onClick={onRankClick}
                aria-label={`${t("leaderboard.yourRank")} #${rank}`}
                className="ml-[9px] shrink-0 rounded-full border-[1.435px] border-solid border-[#402666] px-[6.698px] py-[1.914px] text-center font-['Nunito'] text-[13px] font-extrabold leading-[13.396px] tracking-[-0.1531px] text-[#402666] whitespace-nowrap"
              >
                #{rank}
              </button>
            )}
          </div>

          <div className="absolute left-[13px] top-[61px] flex gap-[6.6px]">
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

          {/* Flame tab — the streak. The flame itself is a sibling laid
              over the tab, as in the frame; taps fall through it. */}
          <button
            type="button"
            aria-label={t("dailyRewards.streak")}
            onClick={onStreakClick}
            className="absolute right-[85px] top-[6px] h-[104px] w-[70px]"
            style={{
              background: FLAME_TAB_GRADIENT,
              border: TAB_BORDER,
              borderRadius: FLAME_TAB_RADIUS,
              boxShadow: TAB_SHADOW,
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-[97px] top-[37px] h-[47px] w-[38px] overflow-hidden opacity-[0.99]"
          >
            <img
              src={streakFire}
              alt=""
              draggable={false}
              className="absolute left-[-22.05%] top-[-9.91%] h-[118.8%] w-[143.81%] max-w-none"
            />
          </span>

          {/* Purse tab — daily rewards. */}
          <button
            type="button"
            aria-label={t("extra.dailyRewards")}
            onClick={onGiftClick}
            className="absolute right-[7px] top-[6px] h-[104px] w-[70px]"
            style={{
              background: PURSE_TAB_GRADIENT,
              border: TAB_BORDER,
              borderRadius: PURSE_TAB_RADIUS,
              boxShadow: TAB_SHADOW,
            }}
          >
            <span className="pointer-events-none absolute left-[12.59px] top-[27.59px] h-[42px] w-[37px] overflow-hidden">
              <img
                src={dailyRewardBag}
                alt=""
                draggable={false}
                className="absolute left-[-20.41%] top-[-10.71%] h-[126.79%] w-[144.9%] max-w-none"
              />
            </span>
          </button>
        </div>
      </div>
    </motion.div>
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
