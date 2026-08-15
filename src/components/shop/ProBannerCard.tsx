// Figma: Hom / 637:390 — the PRO offer banners.
//
// The frame lays every card out in absolute coordinates on a 575-wide
// canvas, so the card is built at that width and scaled to whatever it is
// given rather than having each coordinate re-derived as a percentage. Same
// trick LoggedInHomeV2 uses for the world-map home.
//
// The button straddles the card's bottom edge by design — 77 tall at y358
// against a 396 card, so exactly half of it hangs below. It paints above
// the card, and the stage reserves room for its shadow.

import { Check } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const BANNER_DESIGN_W = 575;
// 470, not 435: the card is 396 and the button hangs to 435, but its lip
// and glow reach ~34px further. The reel clips to this height, so the stage
// has to reserve that or the button's own shadow is shaved off.
export const BANNER_DESIGN_H = 470;
const CARD_H = 396;
const BUTTON_TOP = 358;
// The invite frame's button pair (nodes 676:124 and 676:160).
const PAIR_H = 62;

/* ------------------------------------------------------------------ *
 * Skins
 * ------------------------------------------------------------------ */

// Every banner is white. Colour on the card competed with the button for
// attention and made five offers look like five different products; on a
// white card the gold CTA is the only saturated thing on screen.
//
// The skin is still a type rather than a set of constants so a banner can
// be re-tinted without touching the markup, but there is one of them.

export interface BannerSkin {
  /** Card fill. */
  bg: string;
  /** Fill of the three stacked wave layers at the foot of the card. */
  wave: string;
  /** Titles, captions, prices. */
  ink: string;
  /** Struck-through prices and other secondary type. */
  inkSoft: string;
  /** Benefit tiles and the invite reward panel. */
  tileFill: string;
  tileEdge: string;
  /** The deal card's countdown pills. */
  pillFill: string;
  /** Optional inset glow on the card itself (the invite frame's gold wash). */
  innerGlow?: string;
}

export const SKIN_WHITE: BannerSkin = {
  bg: "linear-gradient(163deg, #FFFFFF 0%, #FDFBFF 55%, #F5EFFB 100%)",
  wave: "#C9B8E4",
  ink: "#402666",
  inkSoft: "rgba(64,38,102,0.45)",
  tileFill: "linear-gradient(180deg, rgba(124,58,237,0.09) 0%, rgba(124,58,237,0.03) 100%)",
  tileEdge: "rgba(124,58,237,0.16)",
  pillFill: "rgba(64,38,102,0.07)",
};

/** Lifts the top edge of a tile so it reads as a pane, not a hole. */
const GLASS_SHEEN = "inset 0px 1px 0px 0px rgba(255,255,255,0.7)";

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

// The waves are the foot of the card, so they hang from its bottom edge
// rather than from a fixed y.
//
// The frame gives them a top — 167.9, 156, 140 against a 396-tall card — and
// that is what they were drawn at. It is the same measurement read from the
// other end while the card is 396 tall, and only that: a phone stacks the
// benefits into a list, which makes the card ~550, and the waves still ended
// at 396 with a band of bare white card under them.
//
// So each layer keeps the gap the frame leaves beneath it (396 minus its own
// bottom edge) and is positioned by that instead.
const WAVE_LAYERS = [
  { path: WAVE_TALL, height: 228, bottom: 0.1, opacity: 0.35 },
  { path: WAVE_SHORT, height: 240, bottom: 0, opacity: 0.16 },
  { path: WAVE_SHORT, height: 240, bottom: 16, opacity: 0.1 },
];

function WaveStack({ fill }: { fill: string }) {
  return (
    <>
      {WAVE_LAYERS.map((layer, i) => (
        <svg
          key={i}
          aria-hidden
          className="absolute left-0 block"
          style={{ bottom: layer.bottom }}
          width={575}
          height={layer.height}
          viewBox={`0 0 575 ${layer.height}`}
          preserveAspectRatio="none"
        >
          <path d={layer.path} fill={fill} opacity={layer.opacity} />
        </svg>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

/**
 * Fits the 575px design to whatever width the banner is actually given.
 *
 * Measured from the element, not from the viewport, so the sidebar
 * collapsing or a column changing width is handled the same way a phone
 * rotating is — there is no breakpoint to get wrong.
 *
 * Capped at `maxScale` so a wide column does not blow the artwork up past
 * the resolution behind it; when the cap bites, the stage centres in the
 * space rather than hugging the left edge.
 */
function useBannerScale(maxScale: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Before the first measurement, render at nothing rather than at full
  // size — a 575px stage inside an unmeasured box overflows every parent
  // it has for one frame.
  const scale = width > 0 ? Math.min(width / BANNER_DESIGN_W, maxScale) : 0;
  const offsetX = Math.max(0, (width - BANNER_DESIGN_W * scale) / 2);

  return { ref, scale, offsetX };
}

interface ProBannerCardProps {
  skin: BannerSkin;
  /** Card body — positioned in design pixels against a 575x396 box. */
  children: ReactNode;
  /** Label on the button that straddles the card's bottom edge. */
  actionLabel: ReactNode;
  onAction?: () => void;
  actionDisabled?: boolean;
  /**
   * This card is the tier the player is already on. Draws the quiet face —
   * see ACTIVE_BUTTON — rather than the gold one, so "Active" stops looking
   * like a second thing to buy.
   */
  actionActive?: boolean;
  /** Full-width strip above the title (deal countdown). */
  topStrip?: ReactNode;
  onClick?: () => void;
  dimmed?: boolean;
  /** Largest the design is allowed to be drawn. */
  maxScale?: number;
  /**
   * A second button beside the first, as the invite frame (676:188) has:
   * the pair is 244 wide and 62 tall against the single button's 424 by 77,
   * and straddles the card's bottom edge the same way. The primary keeps the
   * gold face; this one takes the card's own pale fill.
   */
  secondaryAction?: { label: ReactNode; onAction?: () => void; disabled?: boolean };
  /**
   * Card height in design pixels, when the body needs more room than the
   * frame's 396 — a phone stacks the benefit tiles into a list, and the list
   * is taller than the row it replaces. The button and the stage follow it,
   * so the button keeps straddling the edge and its shadow keeps its room.
   */
  cardHeight?: number;
}

// The three specks of light and the top lip that every button on these cards
// carries (nodes 636:161-163). `quiet` drops the speculars: they are lit for
// the gold face and on a pale one they read as dust.
function ButtonFace({ fill, quiet }: { fill: string; quiet?: boolean }) {
  return (
    <>
      <span aria-hidden className="absolute inset-0 rounded-[24px]" style={{ backgroundImage: fill }} />
      {!quiet && (
        <>
          <span aria-hidden className="absolute left-[16.42px] top-[8.42px] size-[5.152px] rounded-full bg-white opacity-[0.49]" />
          <span aria-hidden className="absolute left-[195.16px] top-[17.36px] size-[5.283px] rounded-full bg-white opacity-[0.35]" />
          <span aria-hidden className="absolute left-[32.71px] top-[40.71px] size-[4.589px] rounded-full bg-[rgba(255,255,255,0.8)] opacity-[0.58]" />
        </>
      )}
      <span aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0px_3px_0px_0px_rgba(255,255,255,0.35)]" />
    </>
  );
}

const GOLD_BUTTON =
  "linear-gradient(180.6543874615296deg, rgb(226,213,32) 13.506%, rgb(187,32,143) 90.414%, rgb(129,225,201) 194.33%)";

/**
 * The face a tier wears once you are on it.
 *
 * The gold button is the card selling itself, and it was drawn identically
 * whether it said "Buy" or "Active" — the same shout, the same glow, for a
 * button that does nothing. A tier you already own has nothing left to sell,
 * so it goes quiet: the card's own pale fill, its ink instead of white, a
 * check, and none of the lift or the green glow that says *press me*.
 */
const ACTIVE_BUTTON = "linear-gradient(180deg, #F4EEFC 0%, #E6DAF7 100%)";
const ACTIVE_BORDER = "rgba(64,38,102,0.16)";
const ACTIVE_SHADOW = "0px 2px 0px 0px rgba(64,38,102,0.10), 0px 6px 16px 0px rgba(64,38,102,0.10)";
const BUY_SHADOW = "0px 6px 0px 0px #7e2378, 0px 10px 24px 0px rgba(16,185,129,0.5)";

export function ProBannerCard({
  skin,
  children,
  actionLabel,
  onAction,
  actionDisabled,
  actionActive,
  topStrip,
  onClick,
  dimmed,
  maxScale = 1.25,
  cardHeight = CARD_H,
  secondaryAction,
}: ProBannerCardProps) {
  const { ref, scale, offsetX } = useBannerScale(maxScale);
  // The button hangs half below the card wherever the card ends, and the
  // stage keeps the same room beneath it for the lip and glow.
  const buttonTop = cardHeight - (CARD_H - BUTTON_TOP);
  const stageHeight = cardHeight + (BANNER_DESIGN_H - CARD_H);

  return (
    <div
      ref={ref}
      className="relative w-full"
      // The stage is scaled, so the wrapper has to reserve the scaled height
      // itself — a transform does not affect layout.
      style={{ height: stageHeight * scale, opacity: dimmed ? 0.7 : 1 }}
    >
      <div
        className="absolute top-0"
        style={{
          left: offsetX,
          width: BANNER_DESIGN_W,
          height: stageHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Card body */}
        <div
          onClick={onClick}
          className={`absolute left-0 top-0 w-[575px] overflow-hidden rounded-[24px] ${
            onClick ? "cursor-pointer" : ""
          }`}
          style={{
            height: cardHeight,
            backgroundImage: skin.bg,
            boxShadow: [
              skin.innerGlow,
              "0 2px 6px rgba(64,38,102,0.06)",
              "0 10px 28px rgba(64,38,102,0.10)",
            ]
              .filter(Boolean)
              .join(", "),
          }}
        >
          <WaveStack fill={skin.wave} />
          <div
            aria-hidden
            className="absolute inset-0 rounded-[24px] shadow-[inset_0px_0px_0px_1px_rgba(64,38,102,0.06)]"
          />
          {topStrip}
          {children}
        </div>

        {/* Buy / invite button — node 636:156, verbatim.

            77 tall at y358 against a 396 card, so exactly half of it hangs
            below the card's edge. It is a sibling of the card, not a child,
            and paints after it, so the card's edge passes behind it and the
            card's own clipping never touches it.

            The invite frame pairs it with a second, shorter button; the two
            sit on the same edge, so the pair carries its own height and its
            own half-below offset. */}
        {secondaryAction ? (
          <div
            className="absolute left-0 z-20 flex w-[575px] justify-center gap-[23px]"
            style={{ top: cardHeight - PAIR_H / 2 }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                secondaryAction.onAction?.();
              }}
              disabled={secondaryAction.disabled}
              className="relative flex h-[62px] w-[244px] items-center justify-center gap-[10px] rounded-[24px] border-[3px] border-solid border-[#9fa8a3] p-[3px] shadow-[0px_6px_0px_0px_rgba(68,36,107,0.08),0px_10px_24px_0px_rgba(16,185,129,0.5)] disabled:cursor-not-allowed"
            >
              <ButtonFace fill="linear-gradient(#FDF0FF, #FDF0FF)" />
              <span
                className="relative flex items-center gap-[10px] whitespace-nowrap text-[18px] font-bold leading-[30.95px] tracking-[-0.18px]"
                style={{ color: skin.ink }}
              >
                {secondaryAction.label}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAction?.();
              }}
              disabled={actionDisabled}
              className="relative flex h-[62px] w-[244px] items-center justify-center gap-[10px] rounded-[24px] border-[3px] border-solid p-[3px] disabled:cursor-not-allowed"
              style={{
                borderColor: actionActive ? ACTIVE_BORDER : "#9fa8a3",
                boxShadow: actionActive ? ACTIVE_SHADOW : BUY_SHADOW,
              }}
            >
              <ButtonFace fill={actionActive ? ACTIVE_BUTTON : GOLD_BUTTON} quiet={actionActive} />
              <span
                className={`relative flex items-center gap-[8px] whitespace-nowrap text-[18px] font-bold leading-[30.95px] tracking-[-0.18px] ${
                  actionActive ? "" : "text-white drop-shadow-[0px_4px_3px_rgba(0,0,0,0.07)]"
                }`}
                style={actionActive ? { color: skin.ink } : undefined}
              >
                {actionActive && <Check className="size-[18px]" strokeWidth={3} />}
                {actionLabel}
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
            disabled={actionDisabled}
            className="absolute left-[68px] z-20 flex h-[77px] w-[424px] items-center justify-center gap-[3px] rounded-[24px] border-[3px] border-solid p-[3px] disabled:cursor-not-allowed"
            style={{
              top: buttonTop,
              borderColor: actionActive ? ACTIVE_BORDER : "#9fa8a3",
              boxShadow: actionActive ? ACTIVE_SHADOW : BUY_SHADOW,
            }}
          >
            <ButtonFace fill={actionActive ? ACTIVE_BUTTON : GOLD_BUTTON} quiet={actionActive} />
            <span
              className={`relative flex items-center gap-[8px] whitespace-nowrap text-[18px] font-bold leading-[30.95px] tracking-[-0.18px] ${
                actionActive ? "" : "text-white drop-shadow-[0px_4px_3px_rgba(0,0,0,0.07)]"
              }`}
              style={actionActive ? { color: skin.ink } : undefined}
            >
              {actionActive && <Check className="size-[20px]" strokeWidth={3} />}
              {actionLabel}
            </span>
          </button>
        )}
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
          backgroundImage: skin.tileFill,
          borderColor: skin.tileEdge,
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
        <p className="text-center text-[16px] font-semibold leading-[1.15]" style={{ color: skin.ink }}>
          {label}
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Stacked benefits (narrow stages)
 * ------------------------------------------------------------------ */

// Three tiles side by side across 575 design pixels leaves each one 150 wide
// with a 16px caption — which, on a phone, is a 575px canvas drawn at about
// two thirds size, so the caption lands near 11px and the benefits become
// fine print. Stacked, a row is the full width of the card and its label can
// be half as big again, reading at a normal size once scaled.
const ROW_LEFT = 52;
const ROW_W = 471;
const ROW_H = 92;
const ROW_GAP = 12;
const ROWS_TOP = 150;

// What the frame leaves between the last thing in the card and the card's
// own bottom edge: 396 tall with tiles ending at 294. Keeping it means the
// button clears the list by the same margin it clears the tiles by — at 34
// the button landed on top of the third row.
const CARD_FOOT = CARD_H - 294;

/** Design height a stacked tier card needs for `count` benefits. */
function stackedCardHeight(count: number): number {
  return ROWS_TOP + count * ROW_H + (count - 1) * ROW_GAP + CARD_FOOT;
}

function BannerRow({
  skin,
  index,
  icon,
  iconSize,
  label,
}: {
  skin: BannerSkin;
  index: number;
  icon: string;
  iconSize: number;
  label: ReactNode;
}) {
  const top = ROWS_TOP + index * (ROW_H + ROW_GAP);
  // The artwork keeps the size the frame gave it, centred in the row's own
  // gutter rather than scaled to fit — these icons are drawn at different
  // sizes on purpose and matching them flattens the set.
  const art = Math.min(iconSize, ROW_H - 14);

  return (
    <div
      className="absolute flex items-center gap-[18px] rounded-[24px] border border-solid px-[22px]"
      style={{
        left: ROW_LEFT,
        top,
        width: ROW_W,
        height: ROW_H,
        backgroundImage: skin.tileFill,
        borderColor: skin.tileEdge,
        boxShadow: GLASS_SHEEN,
      }}
    >
      <img
        src={icon}
        alt=""
        draggable={false}
        className="shrink-0 object-contain"
        style={{ width: art, height: art }}
      />
      <p className="text-[26px] font-semibold leading-[1.2]" style={{ color: skin.ink }}>
        {label}
      </p>
    </div>
  );
}

/** One rounded pill in the deal card's top strip. */
// 15% above the frame's sizes: at the width a phone actually gives the card,
// the deal label and its countdown read as fine print beside the title.
function BannerStripPill({ icon, fill, ink, children }: { icon: string; fill: string; ink: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-[3px] rounded-[24px] px-[9px] py-[5px]" style={{ background: fill }}>
      <img src={icon} alt="" draggable={false} className="size-[18px] object-contain" />
      <p className="whitespace-nowrap text-center text-[14px] font-semibold" style={{ color: ink }}>
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
  actionActive,
  onClick,
  dimmed,
  stacked,
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
  /** The tier the player is already on — draws the quiet button. */
  actionActive?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
  /** Benefits as a list rather than a row — see the note on BannerRow. */
  stacked?: boolean;
}) {
  return (
    <ProBannerCard
      skin={skin}
      onClick={onClick}
      dimmed={dimmed}
      actionLabel={actionLabel}
      actionDisabled={actionDisabled}
      actionActive={actionActive}
      onAction={onAction}
      cardHeight={stacked ? stackedCardHeight(tiles.length) : undefined}
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
        className="absolute flex flex-col gap-[10px]"
        style={{
          left: header.titleLeft,
          top: header.titleTop,
          width: header.titleWidth,
          color: skin.ink,
        }}
      >
        <p className="text-center font-display text-[24px] font-extrabold leading-none">{name}</p>
        {/* The month label carries its own separator ("/თვე", "/mo"), so
            adding one here printed "10.97 ₾ / /თვე". */}
        <p className="text-center font-semibold leading-none">
          <span className="text-[24px]">{price} </span>
          <span className="text-[16px]">{month}</span>
        </p>
      </div>
      {stacked
        ? tiles.map((tile, i) => (
            <BannerRow
              key={tile.labelCenter}
              skin={skin}
              index={i}
              icon={tile.icon}
              iconSize={tile.iconSize}
              label={tile.label}
            />
          ))
        : tiles.map((tile) => (
            <BannerTile key={tile.labelCenter} skin={skin} left={tileLeft(tile)} top={164} height={130} {...tile} />
          ))}
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
  price,
  wasPrice,
  gemIcon,
  actionLabel,
  onAction,
  actionDisabled,
  maxScale,
}: {
  skin: BannerSkin;
  title: ReactNode;
  savings: number;
  stripLabel: ReactNode;
  stripIcon: string;
  remaining: ReactNode;
  remainingIcon: string;
  tiles: BannerTileContent[];
  /** What the bundle costs, in gems. */
  price: number;
  /** What the same contents cost bought separately. */
  wasPrice: number;
  gemIcon: string;
  actionLabel: ReactNode;
  onAction: () => void;
  actionDisabled?: boolean;
  maxScale?: number;
}) {
  return (
    <ProBannerCard
      skin={skin}
      maxScale={maxScale}
      actionLabel={actionLabel}
      actionDisabled={actionDisabled}
      onAction={onAction}
      topStrip={
        <div className="absolute left-[20px] top-[21px] flex w-[538px] items-center justify-between">
          <BannerStripPill icon={stripIcon} fill={skin.pillFill} ink={skin.ink}>{stripLabel}</BannerStripPill>
          <BannerStripPill icon={remainingIcon} fill={skin.pillFill} ink={skin.ink}>{remaining}</BannerStripPill>
        </div>
      }
    >
      {/* Title and its discount, as one centred row. The frame parks the
          badge at a fixed x half the card away from the title, which reads
          as two unrelated things; it belongs to the title, so it travels
          with it. */}
      <div
        className="absolute left-[287.5px] top-[66px] flex -translate-x-1/2 items-center gap-[10px]"
        style={{ color: skin.ink }}
      >
        <p className="whitespace-nowrap text-center font-display text-[24px] font-extrabold leading-none">
          {title}
        </p>
        <span
          className="flex h-[28px] shrink-0 items-center justify-center rounded-[24px] bg-[#FCD34D] px-[10px]"
        >
          <span className="whitespace-nowrap text-[14px] font-extrabold leading-none text-[#78350F]">
            -{savings}%
          </span>
        </span>
      </div>

      {/* What it costs. A banner with a buy button and no price asks the
          player to tap to find out. */}
      <div className="absolute left-[287.5px] top-[108px] flex -translate-x-1/2 items-center gap-[10px]" style={{ color: skin.ink }}>
        <span
          className="flex items-center gap-[4px] text-[16px] font-semibold line-through decoration-2"
          style={{ color: skin.inkSoft }}
        >
          <img src={gemIcon} alt="" draggable={false} className="size-[18px] object-contain opacity-80" />
          {wasPrice}
        </span>
        <span className="flex items-center gap-[5px] text-[24px] font-extrabold">
          <img src={gemIcon} alt="" draggable={false} className="size-[28px] object-contain" />
          {price}
        </span>
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
