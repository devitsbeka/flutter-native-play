// Figma: Hom / 637:390 — the PRO offer banners.
//
// The frame draws every card on a 575x435 canvas with absolute coordinates,
// so the card is built at that size and scaled to whatever width it is given
// rather than having each coordinate re-derived as a percentage. Same trick
// LoggedInHomeV2 uses for the world-map home.
//
// 435, not 396: the card rectangle is 396 tall and the buy button hangs 39px
// below it. Both live inside the stage so nothing is ever clipped.

import { useEffect, useRef, useState, type ReactNode } from "react";

export const BANNER_DESIGN_W = 575;
export const BANNER_DESIGN_H = 435;
const CARD_H = 396;

/* ------------------------------------------------------------------ *
 * Skins
 * ------------------------------------------------------------------ */

export interface BannerSkin {
  /** Card fill. */
  bg: string;
  /** Fill of the three stacked wave layers at the foot of the card. */
  wave: string;
  /** Top colour of the benefit tiles. */
  tile: string;
  /** Colour the tile gradient fades to. */
  tileFade: string;
}

export const SKIN_SOLO: BannerSkin = {
  bg: "#9333EA",
  wave: "#7E2358",
  tile: "#7E2358",
  tileFade: "rgba(147,51,234,0.42)",
};

export const SKIN_FAMILY: BannerSkin = {
  bg: "#E40070",
  wave: "#7E2478",
  tile: "#7E2478",
  tileFade: "rgba(228,0,112,0.42)",
};

export const SKIN_INVITE: BannerSkin = {
  bg: "#008FF1",
  wave: "#2F2A4D",
  tile: "#008FF1",
  tileFade: "rgba(0,143,241,0.30)",
};

export const SKIN_DEAL: BannerSkin = {
  bg: "#00AE9B",
  wave: "#374C85",
  tile: "#E40070",
  tileFade: "rgba(228,0,112,0.34)",
};

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
        className="absolute left-0 top-[167.9px] block"
        width={575}
        height={228}
        viewBox="0 0 575 228"
        preserveAspectRatio="none"
      >
        <path d={WAVE_TALL} fill={fill} />
      </svg>
      <svg
        aria-hidden
        className="absolute left-0 top-[156px] block"
        width={575}
        height={240}
        viewBox="0 0 575 240"
        preserveAspectRatio="none"
      >
        <path d={WAVE_SHORT} fill={fill} opacity={0.3} />
      </svg>
      <svg
        aria-hidden
        className="absolute left-0 top-[140px] block"
        width={575}
        height={240}
        viewBox="0 0 575 240"
        preserveAspectRatio="none"
      >
        <path d={WAVE_SHORT} fill={fill} opacity={0.2} />
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
          className={`absolute left-0 top-0 h-[396px] w-[575px] overflow-hidden rounded-[24px] ${
            onClick ? "cursor-pointer" : ""
          }`}
          style={{ background: skin.bg }}
        >
          <WaveStack fill={skin.wave} />
          <div
            aria-hidden
            className="absolute inset-0 rounded-[24px] shadow-[inset_0px_20px_42px_0px_rgba(0,0,0,0.25)]"
          />
          {topStrip}
          {children}
        </div>

        {/* Buy / invite button — straddles the card's bottom edge */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
          disabled={actionDisabled}
          className="absolute left-[68px] top-[358px] flex h-[77px] w-[424px] items-center justify-center gap-[3px] rounded-[24px] border-[3px] border-solid border-[#9fa8a3] p-[3px] shadow-[0px_6px_0px_0px_#7e2378,0px_10px_24px_0px_rgba(16,185,129,0.5)] disabled:cursor-not-allowed"
        >
          <span
            aria-hidden
            className="absolute inset-0 rounded-[24px]"
            style={{
              backgroundImage:
                "linear-gradient(180.65deg, rgb(226,213,32) 13.506%, rgb(187,32,143) 90.414%, rgb(129,225,201) 194.33%)",
            }}
          />
          <span className="relative whitespace-nowrap text-[18px] font-bold leading-[30.95px] tracking-[-0.18px] text-white drop-shadow-[0px_4px_3px_rgba(0,0,0,0.07)]">
            {actionLabel}
          </span>
          {/* Three specks of light on the button face (nodes 636:161–163) */}
          <span aria-hidden className="absolute left-[16.42px] top-[8.42px] size-[5.152px] rounded-full bg-white opacity-[0.49]" />
          <span aria-hidden className="absolute left-[195.16px] top-[17.36px] size-[5.283px] rounded-full bg-white opacity-[0.35]" />
          <span aria-hidden className="absolute left-[32.71px] top-[40.71px] size-[4.589px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-[0.58]" />
          <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_3px_0px_0px_rgba(255,255,255,0.35)]" />
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
        className="absolute w-[150px] rounded-[24px] border border-solid border-[#b5cf3d]"
        style={{
          left,
          top,
          height,
          backgroundImage: `linear-gradient(180deg, ${skin.tile} 31.154%, ${skin.tileFade} 100%)`,
        }}
      />
      <img
        src={icon}
        alt=""
        draggable={false}
        className="absolute max-w-none object-contain"
        style={{ left: iconLeft, top: iconTop, width: iconSize, height: iconSize }}
      />
      <p
        className="absolute -translate-x-1/2 text-center text-[16px] font-semibold leading-none text-white"
        style={{ left: labelCenter, top: labelTop, width: labelWidth }}
      >
        {label}
      </p>
    </>
  );
}

/** One rounded pill in the deal card's top strip. */
function BannerStripPill({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-[2px] rounded-[24px] bg-[rgba(255,255,255,0.22)] px-[8px] py-[4px]">
      <img src={icon} alt="" draggable={false} className="size-[16px] object-contain" />
      <p className="whitespace-nowrap text-center text-[12px] font-semibold text-white">{children}</p>
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
  art: [
    { src: people, left: 126, top: 45, size: 69 },
    { src: people, left: 150, top: 37, size: 68 },
  ],
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
        style={{ left: header.titleLeft, top: header.titleTop, width: header.titleWidth }}
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
      <p className="absolute left-[296.5px] top-[100px] w-[331px] -translate-x-1/2 text-center text-[18px] font-extrabold leading-[1.39] text-white">
        {headline}
      </p>
      <div
        className="absolute left-[142px] top-[188px] h-[106px] w-[308px] rounded-[24px] border border-solid border-[#b5cf3d]"
        style={{ backgroundImage: `linear-gradient(180deg, ${skin.tile} 31.154%, ${skin.tileFade} 100%)` }}
      />
      <img
        src={crown}
        alt=""
        draggable={false}
        className="absolute left-[172px] top-[210px] size-[64.8px] max-w-none object-contain"
      />
      <p className="absolute left-[329.5px] top-[232px] -translate-x-1/2 whitespace-nowrap text-center text-[22px] font-semibold leading-none text-white">
        {reward}
      </p>
    </ProBannerCard>
  );
}

/** Frames 637:352 and 637:353 — countdown strip, title, discount badge. */
export function DealBanner({
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
      skin={SKIN_DEAL}
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
      <p className="absolute left-[262px] top-[74px] -translate-x-1/2 whitespace-nowrap text-center text-[24px] font-extrabold leading-none text-white">
        {title}
      </p>
      <div className="absolute left-[413px] top-[75px] flex h-[28px] w-[52px] items-center justify-center rounded-[24px] bg-[#ffd300]">
        <p className="whitespace-nowrap text-[14px] font-extrabold leading-none text-[#541f00]">-{savings}%</p>
      </div>
      {tiles.map((tile) => (
        <BannerTile key={tile.labelCenter} skin={SKIN_DEAL} left={tileLeft(tile)} top={177} height={115} {...tile} />
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
