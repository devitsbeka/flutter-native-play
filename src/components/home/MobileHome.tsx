import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { t } from "@/lib/i18n";
import myTriviaLogo from "@/assets/mytrivia-logo.svg";
import guestCastleDoor from "@/assets/figma-home/guest-castle-door.webp";
import giftDaily from "@/assets/figma-home/gift-daily.png";
import streakFire from "@/assets/figma-home/streak-fire.png";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { useWavyRect } from "@/components/home/wave";
import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { GuestLanguagePicker } from "@/components/home/GuestLanguagePicker";
import heroScene from "@/assets/figma-landing/hero-scene.png";

// Figma: Hom — the mobile home states, all drawn on a 500x946 frame:
//   632:296  Logged out / guest
//   991:781  Logged in
// Sizes below are the frame's own pixels; widths that must span the screen
// are expressed as a share of the frame width (vw) so the artwork keeps its
// designed proportions on any phone.

const AUTH_SHADOW = "0px 3.72px 0px 0px #d8d0e8, 0px 5.58px 14.881px 0px rgba(0,0,0,0.1)";
const AUTH_GRADIENT = "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(254,254,254,0.5))";

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
  // enough to fill the space above the nav. Bottom-anchored on the nav's
  // top edge — the same measure the feed's lip and the profile card use
  // (see NAV_CHROME) — fading out at the top into the page's wash.
  const style: React.CSSProperties = { bottom: NAV_CHROME, ...SCENE_TOP_FADE };

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
// Peak-to-trough of the card's top and bottom waves, centred on the edges
// they replace — so the card keeps its size and the crests reach half of
// this beyond either end. Gentle on purpose: this is an edge treatment, and
// a deep wave chews into the corners instead of rolling.
const CARD_WAVE = 8;
const CARD_WAVE_HALF = CARD_WAVE / 2;
const CARD_RADIUS = 33.41;
// The frame's border, drawn as a stroke along the silhouette rather than as
// a CSS border on the box: a border stops where the mask cuts, which leaves
// the straight sides outlined and the wavy ones bare.
const CARD_BORDER = 1.867;

// How much of the bottom nav lies over the home's scroller.
//
// The nav is fixed to the SCREEN's bottom edge and stands 88px of chrome
// (20px of padding around 48px items) plus half the home indicator's inset
// tall. The scroller is not: #root pads the whole inset, so the scroller
// ends a full inset above the screen's edge. What the hero has to keep
// clear is the nav's height minus that inset — on the web (inset 0) the
// nav's whole 92px, on the phone 88 + 17 - 34 = 71px.
//
// This used to be the nav's height alone, measured from the scroller's
// bottom as if the two edges were the same edge. On the web they are; in
// the app they are 34px apart, so the feed's lip and the profile card sat
// 34px higher above the nav than on the web (owner: "different main page
// heights on web and in the TestFlight app"), and the default scene, on a
// third formula again, ended 9px short of the feed — the pale band that
// showed between the card and the feed's lip on scroll. One measure now:
// the scene's foot, the feed's lip and the card's clearance all count from
// it. The card floats 49px clear of the nav, as in the frame.
export const NAV_CHROME =
  "calc(88px + max(0.25rem, var(--safe-bottom) / 2) - var(--safe-bottom))";
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

/* ------------------------------------------------------------------ *
 * Reward buttons on the profile card
 * ------------------------------------------------------------------ */

// The gift and the streak, as bare icons. They used to be 80px glass tabs
// on the scene (Figma 1076:3587 / 1076:3577) with a countdown under one and
// a word under the other; on the card there is room for the artwork and
// nothing else, so each icon has to say its own state. The flame breathes
// and the gift rocks — small, slow, never in step with each other, so the
// card reads as alive rather than as two things blinking.
interface IdleMotion {
  animate: Record<string, number[]>;
  transition: Record<string, unknown>;
}

// A parcel being shaken, with a rest between shakes — a loop that never
// pauses reads as a spinner, not as a thing sitting there.
const GIFT_IDLE: IdleMotion = {
  animate: { rotate: [0, -6, 5, -3, 0], y: [0, -2, 0, -1, 0] },
  transition: { duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" },
};

// A flame guttering: never quite the same size twice, and off the gift's
// beat so the two never swing together.
const FLAME_IDLE: IdleMotion = {
  animate: { scale: [1, 1.08, 0.97, 1.04, 1], rotate: [0, -3, 2, -1.5, 0] },
  transition: { duration: 2.1, repeat: Infinity, ease: "easeInOut" },
};

// 54px of tap target (the 44px floor with room to spare) around 48px of art.
function RewardIconButton({
  icon,
  label,
  onClick,
  idle,
  muted = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  idle: IdleMotion;
  muted?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex size-[54px] shrink-0 items-center justify-center"
      whileTap={{ scale: 0.9 }}
    >
      <motion.img
        src={icon}
        alt=""
        draggable={false}
        className={`size-[48px] object-contain ${
          muted ? "grayscale opacity-45" : "drop-shadow-[0_3px_6px_rgba(102,51,153,0.28)]"
        }`}
        // Muted is a dead thing: grey AND still. Animating it would say the
        // opposite of what the grey says.
        animate={muted ? { rotate: 0, y: 0, scale: 1 } : idle.animate}
        transition={muted ? { duration: 0.35, ease: "easeOut" } : idle.transition}
      />
    </motion.button>
  );
}

interface MobileProfileCardProps {
  nickname: string;
  avatarUrl?: string | null;
  animatedAvatarUrl?: string | null;
  /** Is there a daily reward waiting? The gift is colour only when there is. */
  canClaimGift: boolean;
  /** The avatar disc: the mascot / avatar picker. */
  onAvatarClick: () => void;
  onNameClick: () => void;
  onGiftClick: () => void;
  onStreakClick: () => void;
}

// node 1076:2066. The avatar in its gradient ring, the nickname beside it and
// the two reward buttons on the right, all on one 83px frosted bar anchored
// above the bottom nav so the scene it floats on is not covered by it.
//
// The balances used to sit on the right of this card. They are on the strip
// under the header now — the place the game-mode selection screen keeps them
// — and showing them twice on one screen was a second source of truth for
// the same two numbers. The gift and the streak, which used to be a pair of
// glass tabs floating on the scene with their own labels, moved into the
// space that left: icon-only, and the icons carry the state that the labels
// used to spell out.
export function MobileProfileCard({
  nickname,
  avatarUrl,
  animatedAvatarUrl,
  canClaimGift,
  onAvatarClick,
  onNameClick,
  onGiftClick,
  onStreakClick,
}: MobileProfileCardProps) {
  const { ref, scale, designWidth } = useCardScale();
  // The card's edges roll (Figma 1076:3700 / 3697): one closed silhouette,
  // dealt fresh on every visit, that both masks the frosted glass and is
  // stroked for the card's white outline — so the border follows the wave
  // instead of stopping where the mask cuts.
  const shape = useWavyRect({
    width: designWidth,
    height: CARD_H + CARD_WAVE,
    radius: CARD_RADIUS,
    top: CARD_WAVE,
    bottom: CARD_WAVE,
  });

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
        {/* The shadow, cast by the same silhouette: a blurred copy of it
            under the card. A box-shadow would trace the straight box, and a
            mask on the card would cut a shadow of its own away. */}
        <div
          aria-hidden
          className="absolute left-0 right-0 translate-y-[6px] blur-[10px]"
          style={{ top: -CARD_WAVE_HALF, bottom: -CARD_WAVE_HALF }}
        >
          <div className="size-full bg-[rgba(102,51,153,0.16)]" style={shape.mask} />
        </div>
        <div
          // Frosted AND nearly opaque: the mascot wallpaper runs under the
          // card. The blur turns whatever is behind it into a wash, and the
          // fill keeps that wash pale enough that the name and the balances
          // sit on white rather than on the character's hoodie. The box
          // reaches half a wave past the card's lines at either end and the
          // mask rolls those edges; everything inside is placed from the
          // card's own top, CARD_WAVE_HALF further down.
          className="absolute left-0 right-0 overflow-hidden bg-[rgba(252,247,255,0.82)] backdrop-blur-[37px]"
          style={{ top: -CARD_WAVE_HALF, bottom: -CARD_WAVE_HALF, ...shape.mask }}
        >
          {/* Avatar — node 1076:3548: a 52px disc, 2.5px gradient ring, 1.6px
              white ring, 44px picture, 14.6px in from the card's edge. */}
          <button
            type="button"
            onClick={onAvatarClick}
            aria-label={t("extra.changeScene")}
            className="absolute left-[14.64px] top-[18px] size-[52.364px] rounded-full p-[2.455px]"
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
            className="absolute left-[77px] right-[150px] top-[21px] h-[44.814px] truncate text-left font-slackey text-[26px] capitalize leading-[44.814px] tracking-[-0.1494px] text-[#402666]"
          >
            {nickname}
          </button>

          {/* The two rewards, centred on the card's own middle line as the
              avatar is (18 + 27 against the box's 45.5). */}
          <div className="absolute right-[18px] top-[18px] flex items-center gap-[8px]">
            <RewardIconButton
              icon={giftDaily}
              label={t("extra.dailyRewards")}
              onClick={onGiftClick}
              idle={GIFT_IDLE}
              // Nothing to claim: the gift goes grey and stops moving, so the
              // one that IS claimable is the only colour on the card.
              muted={!canClaimGift}
            />
            <RewardIconButton
              icon={streakFire}
              label={t("extra.heroStreak")}
              onClick={onStreakClick}
              idle={FLAME_IDLE}
            />
          </div>
        </div>
        {/* The outline, on the same silhouette the mask cuts: one continuous
            stroke around the rounded sides and both waves. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0"
          style={{ top: -CARD_WAVE_HALF, bottom: -CARD_WAVE_HALF }}
        >
          <svg className="size-full" viewBox={shape.viewBox} preserveAspectRatio="none" fill="none">
            <path d={shape.path} fill="none" stroke="#ffffff" strokeWidth={CARD_BORDER} />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * (The reward tabs that used to float on the scene here — Figma 1076:3587
 * and 1076:3577, an 80px glass card each for the gift and the streak — are
 * gone. Both are icon buttons on the profile card now; see
 * RewardIconButton above.)
 * ------------------------------------------------------------------ */

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
  /** Start a game without an account. See the button below for why it exists. */
  onGuestPlay: () => void;
  onMenu: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
}

// node 632:296 — logo and tagline up top, the Georgian trophy map filling
// the middle, provider buttons and the terms note above the nav.
export function MobileGuestHero({
  onApple,
  onGoogle,
  onEmail,
  onGuestPlay,
  onMenu,
  onTerms,
  onPrivacy,
}: MobileGuestHeroProps) {
  return (
    <div className="md:hidden pointer-events-none absolute inset-0 z-20 flex flex-col overflow-hidden">
      {/* Header (node 632:308 / 632:385): burger and the language puck —
          the wordmark lives in the body on this state. The puck replaced
          SpotlightSearch here; see GuestLanguagePicker for why search is the
          wrong offer to a signed-out visitor. */}
      <div className="pointer-events-auto flex h-[70px] shrink-0 items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label={t("nav.menu")}
          className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-white/30"
        >
          <Menu className="size-6 text-gray-600" />
        </button>
        <GuestLanguagePicker />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        // Lifted 30px with `top`, not a translate utility: framer writes its
        // own transform on this element for the entrance and would overwrite
        // one. `top` on a relatively positioned box is a paint-time offset,
        // so the band below keeps its height and the art is free to be
        // placed on its own terms.
        className="relative -top-[30px] flex shrink-0 flex-col items-center px-4 pt-[9px]"
      >
        {/* 661x172 lockup rendered at the frame's 66.511px crown height,
            which is exactly the designed 255.605px wide */}
        <img src={myTriviaLogo} alt="MyTrivia" className="h-[66.511px] w-auto select-none" draggable={false} />
        <p className="mt-[16.5px] max-w-[394px] whitespace-pre-line text-center text-[18px] leading-[27px] tracking-[-0.16px] text-[#002b63]">
          {t("extra.guestTagline")}
        </p>
      </motion.div>

      {/* The castle door stands on the bottom of this band so its base meets
          the provider buttons. Unlike the panorama that used to sit here it
          is a portrait cut-out (1101x1718, ~0.64), so it is sized by HEIGHT
          and centred, not bled past both edges — a vw-based width would blow
          a 9:14 frame far past the viewport. object-contain against the band
          means the artwork is never sliced through, which would leave a hard
          horizontal edge across the page on phones whose band is shorter
          than the frame's; on those it simply scales down. max-w keeps it
          off the page gutters on short-and-wide viewports, where fitting by
          height alone would otherwise run it edge to edge.

          It is drawn a quarter larger than the band and hangs that quarter
          off the bottom, behind the provider buttons: h-125% with
          bottom:-25% keeps the TOP pinned exactly where the band starts, so
          the extra size all goes downward into the buttons rather than up
          into the tagline. That overlap is why the button stack below owns a
          z-index — without one the absolutely positioned art would paint
          over it and swallow the taps.

          The idle breath is deliberately barely there: 2.2% over 6s from
          origin-bottom, so the frame settles on its base like something
          standing rather than floating. <MotionConfig reducedMotion="user">
          in App.tsx drops the scale for anyone who asks for less motion,
          leaving the opacity fade — no call-site guard needed. */}
      {/* Below 700px tall the band is squeezed to a sliver — the art lands
          around 60px high there, which reads as a smudge rather than a
          castle — so the whole band goes, matching the max-height:700px
          short-screen convention already used across the quiz screens. The
          band is dropped rather than just its contents: hiding only the art
          would leave its flex-1 behind as a band of empty lavender, and on a
          screen that short the space is better given back to the buttons. */}
      <div className="relative mt-[16px] min-h-0 flex-1 [@media(max-height:700px)]:hidden">
        <motion.img
          src={guestCastleDoor}
          alt=""
          draggable={false}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, scale: [1, 1.022, 1] }}
          transition={{
            opacity: { duration: 0.7, ease: "easeOut" },
            scale: { duration: 6, ease: "easeInOut", repeat: Infinity, delay: 0.7 },
          }}
          className="pointer-events-none absolute inset-x-0 bottom-[calc(-25%_+_30px)] z-0 mx-auto h-[125%] max-w-[76%] origin-bottom select-none object-contain object-bottom [-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent_98%)] [mask-image:linear-gradient(to_bottom,black_80%,transparent_98%)]"
        />

        {/* The frosted half of the same transition. The mask above dissolves
            the artwork itself; this blurs and lightens the ground it sits on
            across the same span, so the button stack reads as resting on a
            soft bed rather than as a hard edge laid over a picture. It is
            masked in from the top for the same reason the art is masked out
            — an unmasked backdrop-filter has a visible start line. Sits at
            z-5: above the art, below the z-10 buttons, and
            pointer-events-none so it never eats a tap. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[-64px] z-[5] h-[128px] bg-gradient-to-b from-white/0 to-white/55 backdrop-blur-[6px] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_70%)] [mask-image:linear-gradient(to_bottom,transparent,black_70%)]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        className="pointer-events-auto relative z-10 shrink-0 px-4 min-[420px]:px-6"
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
          {/* Play without an account.
              Guest play already worked — handlePlayClick starts a quick game
              for a signed-out player — but the only way to reach it was the
              floating hex button in the bottom nav, which sits over the
              artwork and reads as decoration. So this screen was, to anyone
              who did not know that, a sign-in wall: three provider buttons
              and no way past them.

              That is an App Store guideline 2.1 rejection on its own, and the
              review notes tell Apple the app "can be launched and played as a
              guest without creating an account" — which was true and
              undiscoverable at the same time. */}
          <button
            type="button"
            onClick={onGuestPlay}
            className="mx-auto mt-1 flex h-[44px] items-center justify-center px-4 text-[15px] font-semibold tracking-[-0.16px] text-[#402666] underline underline-offset-4 active:opacity-70"
          >
            {t("extra.playAsGuestShort")}
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
