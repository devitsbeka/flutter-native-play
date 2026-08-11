// Figma: Hom / 637:390 — the PRO offer banners.
//
// The frame draws every card on a 575x435 canvas with absolute coordinates,
// so the card is built at that size and scaled to whatever width it is given
// rather than having each coordinate re-derived as a percentage. Same trick
// LoggedInHomeV2 uses for the world-map home.
//
// The frame draws a 396-tall card with the buy button hanging 39px below
// it. That overhang puts the card's bottom edge straight through the
// button on a real screen, so the card here is the full 435 and the button
// sits inside it.

import { useEffect, useRef, useState, type ReactNode } from "react";

export const BANNER_DESIGN_W = 575;
export const BANNER_DESIGN_H = 435;

/* ------------------------------------------------------------------ *
 * Skins
 * ------------------------------------------------------------------ */

// One jewel tone per banner, each a light-to-deep gradient of a single hue
// rather than a flat fill, with a darker relative of that hue for the waves.
// Every banner stays cool so the gold button is the only warm thing on the
// card and always reads as the thing to press.
//
// Nothing inside a card carries its own hue: tiles, panels and pills are
// white at low alpha, so they pick up whichever gradient sits behind them
// and can never clash with it.

export interface BannerSkin {
  /** Card fill — a gradient, top to bottom. */
  bg: string;
  /** Deep relative of the card hue; fills the three stacked wave layers. */
  wave: string;
  /** Hard lip and glow under the buy button, in the card's own hue. */
  buttonShadow: string;
}

export const SKIN_SOLO: BannerSkin = {
  bg: "linear-gradient(163deg, #C4B5FD 0%, #A78BFA 46%, #7C3AED 100%)",
  wave: "#5B21B6",
  buttonShadow: "#5B21B6",
};

export const SKIN_FAMILY: BannerSkin = {
  bg: "linear-gradient(163deg, #FDA4AF 0%, #FB7185 46%, #E11D48 100%)",
  wave: "#9F1239",
  buttonShadow: "#9F1239",
};

export const SKIN_INVITE: BannerSkin = {
  bg: "linear-gradient(163deg, #7DD3FC 0%, #38BDF8 46%, #0284C7 100%)",
  wave: "#075985",
  buttonShadow: "#075985",
};

/** Flash deal — the shorter fuse gets the brighter, more urgent green. */
export const SKIN_DEAL_HOURLY: BannerSkin = {
  bg: "linear-gradient(163deg, #6EE7B7 0%, #34D399 46%, #059669 100%)",
  wave: "#047857",
  buttonShadow: "#047857",
};

/** Daily deal — the calmer, richer indigo of the two. */
export const SKIN_DEAL_DAILY: BannerSkin = {
  bg: "linear-gradient(163deg, #A5B4FC 0%, #818CF8 46%, #4F46E5 100%)",
  wave: "#3730A3",
  buttonShadow: "#3730A3",
};

/** Glass used by every element that sits on a card: tiles, panels, pills. */
const GLASS_FILL = "linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.08) 100%)";
const GLASS_EDGE = "rgba(255,255,255,0.38)";
/** Lifts the top edge of a glass surface so it reads as a pane, not a hole. */
const GLASS_SHEEN = "inset 0px 1px 0px 0px rgba(255,255,255,0.45)";

// White type sits on the pale end of these gradients as often as the deep
// end, where it washes out. A soft dark shadow holds it legible on both
// without darkening the card itself.
const CARD_TEXT_SHADOW = "0px 1px 2px rgba(23,10,45,0.35), 0px 2px 8px rgba(23,10,45,0.18)";

// Tile captions reserve two lines of 16px/1.15 whether or not they need
// both, and centre inside that box. Without it a wrapping caption hangs
// below its neighbours and the row of tiles reads as misaligned.
const CAPTION_BOX_H = 37;

/* ------------------------------------------------------------------ *
 * Wave stack
 * ------------------------------------------------------------------ */

// Two paths, three layers. Every card in the frame exports the same two
// shapes and differs only in fill, so they are inlined once here instead of
// shipping fifteen near-identical SVGs.
const WAVE_TALL =
  "M0 0.10679C0 0.10679 0 0.106788 128.5 64.6578C186.156 93.6209 226.335 82.0376 289.5 82.0585C352.86 82.0795 394.421 96.6724 451 64.6578C575 -5.50635 575 0.10679 575 0.10679V204C575 217.255 564.255 228 551 228H24C10.7452 228 0 217.255 0 204V0.10679Z";
const WAVE_SHORT =
  "M0 0.11241C0 0.11241 0 0.112408 128.5 68.0609C186.156 98.5483 226.335 86.3554 289.5 86.3774C352.86 86.3995 394.421 101.76 451 68.0609C575 -5.79615 575 0.11241 575 0.11241V216C575 229.255 564.255 240 551 240H24C10.7452 240 0 229.255 0 216V0.11241Z";

function WaveStack({ fill }: { fill: string }) {
  return (
    <>
      <svg
        aria-hidden
        className="absolute left-0 top-[207px] block"
        width={575}
        height={228}
        viewBox="0 0 575 228"
        preserveAspectRatio="none"
      >
        <path d={WAVE_TALL} fill={fill} opacity={0.55} />
      </svg>
      <svg
        aria-hidden
        className="absolute left-0 top-[195px] block"
        width={575}
        height={240}
        viewBox="0 0 575 240"
        preserveAspectRatio="none"
      >
        <path d={WAVE_SHORT} fill={fill} opacity={0.2} />
      </svg>
      <svg
        aria-hidden
        className="absolute left-0 top-[179px] block"
        width={575}
        height={240}
        viewBox="0 0 575 240"
        preserveAspectRatio="none"
      >
        <path d={WAVE_SHORT} fill={fill} opacity={0.12} />
      </svg>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

/** Scale factor that fits the 575px design into the measured width. */
function useBannerScale() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / BANNER_DESIGN_W);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, scale };
}

interface ProBannerCardProps {
  skin: BannerSkin;
  /** Card body — positioned in design pixels against a 575x396 box. */
  children: ReactNode;
  /** Label on the button that straddles the card's bottom edge. */
  actionLabel: ReactNode;
  onAction?: () => void;
  actionDisabled?: boolean;
  /** Full-width strip above the title (deal countdown). */
  topStrip?: ReactNode;
  onClick?: () => void;
  dimmed?: boolean;
}

export function ProBannerCard({
  skin,
  children,
  actionLabel,
  onAction,
  actionDisabled,
  topStrip,
  onClick,
  dimmed,
}: ProBannerCardProps) {
  const { ref, scale } = useBannerScale();

  return (
    <div
      ref={ref}
      className="relative w-full"
      // The stage is scaled, so the wrapper has to reserve the scaled height
      // itself — a transform does not affect layout.
      style={{ height: BANNER_DESIGN_H * scale, opacity: dimmed ? 0.7 : 1 }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: BANNER_DESIGN_W,
          height: BANNER_DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Card body */}
        <div
          onClick={onClick}
          className={`absolute left-0 top-0 h-[435px] w-[575px] overflow-hidden rounded-[24px] ${
            onClick ? "cursor-pointer" : ""
          }`}
          style={{ backgroundImage: skin.bg }}
        >
          <WaveStack fill={skin.wave} />
          <div
            aria-hidden
            className="absolute inset-0 rounded-[24px] shadow-[inset_0px_12px_28px_0px_rgba(0,0,0,0.14)]"
          />
          {topStrip}
          {children}
        </div>

        {/* Buy / invite button.

            The frame hangs it off the card's bottom edge. On a device that
            edge then runs straight across the button — a hard line with the
            card's colour above it and the page wash below — and the button
            reads as cropped by whatever it is sitting on. The card now fills
            the whole stage and the button sits inside it, above everything
            in the card, so nothing crosses it. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
          disabled={actionDisabled}
          className="absolute left-[68px] top-[340px] z-20 flex h-[77px] w-[424px] items-center justify-center gap-[3px] rounded-[24px] border-[2px] border-solid border-[rgba(255,255,255,0.55)] p-[3px] disabled:cursor-not-allowed"
          // The lip is the button's own darker amber and the glow is tinted
          // to the card, so both read as the button's edge rather than as a
          // shape behind it.
          style={{
            boxShadow: `0px 5px 0px 0px #B45309, 0px 10px 20px 0px ${skin.buttonShadow}59`,
          }}
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-[24px]"
            style={{ backgroundImage: "linear-gradient(180deg, #FDE68A 0%, #FBBF24 48%, #F59E0B 100%)" }}
          />
          <span className="relative whitespace-nowrap text-[18px] font-extrabold leading-[30.95px] tracking-[-0.18px] text-[#78350F]">
            {actionLabel}
          </span>
          <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_3px_0px_0px_rgba(255,255,255,0.5)]" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces used by the card bodies
 * ------------------------------------------------------------------ */

/**
 * One benefit tile with its artwork breaking out over the top edge.
 *
 * `iconSize` and `iconTop` come straight from the frame — the icons are not
 * a uniform size and do not share a baseline, so each one carries its own.
 */
export function BannerTile({
  skin,
  left,
  top,
  height,
  icon,
  iconSize,
  iconLeft,
  iconTop,
  label,
  labelTop,
  labelWidth,
  labelCenter,
}: {
  skin: BannerSkin;
  left: number;
  top: number;
  height: number;
  icon: string;
  iconSize: number;
  iconLeft: number;
  iconTop: number;
  label: ReactNode;
  labelTop: number;
  labelWidth: number;
  /** Frame's own centre for the caption — a few px off the tile's centre. */
  labelCenter: number;
}) {
  return (
    <>
      <div
        className="absolute w-[150px] rounded-[24px] border border-solid"
        style={{
          left,
          top,
          height,
          backgroundImage: GLASS_FILL,
          borderColor: GLASS_EDGE,
          boxShadow: GLASS_SHEEN,
        }}
      />
      <img
        src={icon}
        alt=""
        draggable={false}
        className="absolute max-w-none object-contain"
        style={{ left: iconLeft, top: iconTop, width: iconSize, height: iconSize }}
      />
      <div
        className="absolute flex -translate-x-1/2 items-center justify-center"
        style={{ left: labelCenter, top: labelTop, width: labelWidth, height: CAPTION_BOX_H }}
      >
        <p
          className="text-center text-[16px] font-semibold leading-[1.15] text-white"
          style={{ textShadow: CARD_TEXT_SHADOW }}
        >
          {label}
        </p>
      </div>
    </>
  );
}

/** One rounded pill in the deal card's top strip. */
function BannerStripPill({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-[2px] rounded-[24px] bg-[rgba(255,255,255,0.22)] px-[8px] py-[4px]">
      <img src={icon} alt="" draggable={false} className="size-[16px] object-contain" />
      <p className="whitespace-nowrap text-center text-[12px] font-semibold text-white" style={{ textShadow: CARD_TEXT_SHADOW }}>
        {children}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The three banners
 *
 * Presentational only — every value arrives as a prop, so the carousel
 * owns the data and these own the frame's geometry.
 * ------------------------------------------------------------------ */

export interface BannerTileContent {
  icon: string;
  iconSize: number;
  iconLeft: number;
  iconTop: number;
  label: ReactNode;
  labelTop: number;
  labelWidth: number;
  labelCenter: number;
}

/**
 * The header geometry differs between the two PRO frames, so it travels with
 * the variant rather than being averaged into one layout: solo (636:169)
 * leads with a big tilted crown and a narrow 143px title column, family
 * (636:180) with a smaller upright pair of people and a 215px column its
 * longer name needs to stay on one line.
 */
export interface ProTierHeader {
  /** Artwork boxes, drawn in order — family layers two overlapping groups. */
  art: { src: string; left: number; top: number; size: number; rotate?: number }[];
  titleLeft: number;
  titleTop: number;
  titleWidth: number;
}

export const HEADER_SOLO = (crown: string): ProTierHeader => ({
  art: [{ src: crown, left: 143.4, top: 33.4, size: 88.77, rotate: -21.65 }],
  titleLeft: 246.63,
  titleTop: 41.82,
  titleWidth: 143,
});

export const HEADER_FAMILY = (people: string): ProTierHeader => ({
  // The frame layers two copies of the group offset from each other. One
  // reads as a crowd already; two just look like a rendering mistake, so a
  // single icon sits centred on the pair's combined bounds at their size.
  art: [{ src: people, left: 132, top: 35.5, size: 80 }],
  titleLeft: 214.76,
  titleTop: 46.42,
  titleWidth: 215.37,
});

/** Frames 636:169 (solo) and 636:180 (family). */
export function ProTierBanner({
  skin,
  header,
  name,
  price,
  month,
  tiles,
  actionLabel,
  onAction,
  actionDisabled,
  onClick,
  dimmed,
}: {
  skin: BannerSkin;
  header: ProTierHeader;
  name: ReactNode;
  price: ReactNode;
  month: ReactNode;
  tiles: BannerTileContent[];
  actionLabel: ReactNode;
  onAction: () => void;
  actionDisabled?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  return (
    <ProBannerCard
      skin={skin}
      onClick={onClick}
      dimmed={dimmed}
      actionLabel={actionLabel}
      actionDisabled={actionDisabled}
      onAction={onAction}
    >
      {header.art.map((art, i) => (
        <img
          key={i}
          src={art.src}
          alt=""
          draggable={false}
          className="absolute max-w-none object-contain"
          style={{
            left: art.left,
            top: art.top,
            width: art.size,
            height: art.size,
            transform: art.rotate ? `rotate(${art.rotate}deg)` : undefined,
          }}
        />
      ))}
      <div
        className="absolute flex flex-col gap-[10px] text-white"
        style={{
          left: header.titleLeft,
          top: header.titleTop,
          width: header.titleWidth,
          textShadow: CARD_TEXT_SHADOW,
        }}
      >
        <p className="text-center text-[24px] font-extrabold leading-none">{name}</p>
        <p className="font-semibold leading-none">
          <span className="text-[24px]">{price} / </span>
          <span className="text-[16px]">{month}</span>
        </p>
      </div>
      {tiles.map((tile) => (
        <BannerTile key={tile.labelCenter} skin={skin} left={tileLeft(tile)} top={164} height={130} {...tile} />
      ))}
    </ProBannerCard>
  );
}

/** Frame 636:222 — one wide reward panel instead of three tiles. */
export function InviteBanner({
  skin,
  art,
  crown,
  headline,
  reward,
  actionLabel,
  onAction,
  actionDisabled,
  onClick,
}: {
  skin: BannerSkin;
  art: string;
  crown: string;
  headline: ReactNode;
  reward: ReactNode;
  actionLabel: ReactNode;
  onAction: () => void;
  actionDisabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <ProBannerCard
      skin={skin}
      onClick={onClick}
      actionLabel={actionLabel}
      actionDisabled={actionDisabled}
      onAction={onAction}
    >
      <img
        src={art}
        alt=""
        draggable={false}
        className="absolute left-[263px] top-[22px] size-[66px] max-w-none object-contain"
      />
      <p
        className="absolute left-[296.5px] top-[100px] w-[331px] -translate-x-1/2 text-center text-[18px] font-extrabold leading-[1.39] text-white"
        style={{ textShadow: CARD_TEXT_SHADOW }}
      >
        {headline}
      </p>
      <div
        className="absolute left-[142px] top-[188px] h-[106px] w-[308px] rounded-[24px] border border-solid"
        style={{ backgroundImage: GLASS_FILL, borderColor: GLASS_EDGE, boxShadow: GLASS_SHEEN }}
      />
      <img
        src={crown}
        alt=""
        draggable={false}
        className="absolute left-[172px] top-[210px] size-[64.8px] max-w-none object-contain"
      />
      <p
        className="absolute left-[329.5px] top-[232px] -translate-x-1/2 whitespace-nowrap text-center text-[22px] font-semibold leading-none text-white"
        style={{ textShadow: CARD_TEXT_SHADOW }}
      >
        {reward}
      </p>
    </ProBannerCard>
  );
}

/** Frames 637:352 and 637:353 — countdown strip, title, discount badge. */
export function DealBanner({
  skin,
  title,
  savings,
  stripLabel,
  stripIcon,
  remaining,
  remainingIcon,
  tiles,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  skin: BannerSkin;
  title: ReactNode;
  savings: number;
  stripLabel: ReactNode;
  stripIcon: string;
  remaining: ReactNode;
  remainingIcon: string;
  tiles: BannerTileContent[];
  actionLabel: ReactNode;
  onAction: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <ProBannerCard
      skin={skin}
      actionLabel={actionLabel}
      actionDisabled={actionDisabled}
      onAction={onAction}
      topStrip={
        <div className="absolute left-[20px] top-[21px] flex w-[538px] items-center justify-between">
          <BannerStripPill icon={stripIcon}>{stripLabel}</BannerStripPill>
          <BannerStripPill icon={remainingIcon}>{remaining}</BannerStripPill>
        </div>
      }
    >
      <p
        className="absolute left-[262px] top-[74px] -translate-x-1/2 whitespace-nowrap text-center text-[24px] font-extrabold leading-none text-white"
        style={{ textShadow: CARD_TEXT_SHADOW }}
      >
        {title}
      </p>
      <div className="absolute left-[413px] top-[75px] flex h-[28px] w-[52px] items-center justify-center rounded-[24px] bg-[#FCD34D]">
        <p className="whitespace-nowrap text-[14px] font-extrabold leading-none text-[#78350F]">-{savings}%</p>
      </div>
      {tiles.map((tile) => (
        <BannerTile key={tile.labelCenter} skin={skin} left={tileLeft(tile)} top={177} height={115} {...tile} />
      ))}
    </ProBannerCard>
  );
}

// The three tile columns sit at a fixed x in every frame; which one a tile
// belongs to follows from its caption's centre.
function tileLeft(tile: BannerTileContent): number {
  if (tile.labelCenter < 200) return 43;
  return tile.labelCenter < 380 ? 213 : 382;
}
