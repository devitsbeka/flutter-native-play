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
export const GLASS_SHEEN = "inset 0px 1px 0px 0px rgba(255,255,255,0.7)";

// The PRO card's own tiles (1119:5515). Same violet wash as SKIN_WHITE's,
// drawn at the mock's hairline rather than the old card's 1px border.
const PERK_TILE_FILL = "linear-gradient(180deg, rgba(124,58,237,0.09) 0%, rgba(124,58,237,0.03) 100%)";
const PERK_TILE_EDGE = "rgba(124,58,237,0.16)";
const PERK_SHEEN = "inset 0px 0.762px 0px 0px rgba(255,255,255,0.7)";

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
//
// Opacities are 30% down from what they were drawn at (0.35 / 0.16 / 0.10).
// The banners float over the animated scene background, and at full strength
// the stack read as a grey wash creeping up the bottom of the card rather
// than as part of the artwork.
const WAVE_LAYERS = [
  { path: WAVE_TALL, height: 228, bottom: 0.1, opacity: 0.245 },
  { path: WAVE_SHORT, height: 240, bottom: 0, opacity: 0.112 },
  { path: WAVE_SHORT, height: 240, bottom: 16, opacity: 0.07 },
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
function useBannerScale(maxScale: number, designW: number = BANNER_DESIGN_W) {
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
  // size — a design-width stage inside an unmeasured box overflows every
  // parent it has for one frame.
  const scale = width > 0 ? Math.min(width / designW, maxScale) : 0;
  const offsetX = Math.max(0, (width - designW * scale) / 2);

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

/** The face the app wears when it is selling PRO. Exported because the
    paywall sells the same thing and must not invent a second gold. */
export const GOLD_BUTTON =
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
export const BUY_SHADOW = "0px 6px 0px 0px #7e2378, 0px 10px 24px 0px rgba(16,185,129,0.5)";

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
 * Pieces the deal card still uses
 * ------------------------------------------------------------------ */

function BannerStripPill({ icon, fill, ink, children }: { icon: string; fill: string; ink: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-[3px] rounded-[24px] px-[9px] py-[5px]" style={{ background: fill }}>
      {/* 18px/14px in the frame, +10% by request — the deal-name and
          countdown pills were the hardest text to read on the banner. */}
      <img src={icon} alt="" draggable={false} className="size-[20px] object-contain" />
      <p className="whitespace-nowrap text-center text-[15.4px] font-semibold" style={{ color: ink }}>
        {children}
      </p>
    </div>
  );
}

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

/* ------------------------------------------------------------------ *
 * The PRO offer card — Figma 1119:5471 (Friends) and 1119:5502 (solo)
 * ------------------------------------------------------------------ */

/**
 * The banner a PRO tier is sold on.
 *
 * A different card from the one above it in this file, not a re-skin of it.
 * The old banner was a 575-wide landscape strip: a crown, a title and a price
 * across the top, three tiles under them, and a button straddling the bottom
 * edge. On a phone that canvas was drawn at about two thirds size, so the
 * captions landed near 11px and the benefits became fine print — which is why
 * it grew a whole second layout that stacked them into a list.
 *
 * The mock is a portrait card 426 wide, which is roughly a phone, so it is
 * drawn near 1:1 where it is actually read and the stacked fallback has
 * nothing left to fix. It leads with the artwork instead of a crown, and the
 * three promises sit on tiles with their art hung over the top edge.
 */
export const PRO_CARD_W = 426;
export const PRO_CARD_H = 527;
/** The solid ledge under the card — reserved by the stage, not clipped. */
const PRO_CARD_FOOT = 8;

/** Card fill, and the colour the hero's foot is blurred out into. */
const PRO_CARD_FILL = "#f5ecfd";

// The three tiles, and the column each one is centred on. The frame parks
// them at these x's on the 426 canvas; every measure inside a tile follows
// from its own box rather than from the frame's per-tile drift.
const PERK_LEFTS = [20, 155.226, 289.657];
const PERK_W = 119.317;
const PERK_H = 87.6;
const PERK_TOP = 338.121;
// The frame draws each icon at its own size — 51.7, 46.1, 53.3 — because the
// three renders are different shapes. Ours are one square set, so they take
// one size and one baseline: the frame's own, which is where its three icons
// all end (~370.8).
const PERK_ICON = 50;
const PERK_ICON_TOP = 321;
const PERK_LABEL_W = 98.635;
const PERK_LABEL_TOP = 381.08;
// Two lines of 14, which is exactly what the frame's label box holds. Reserved
// whether or not both are needed: without it a caption that wraps hangs below
// its neighbours and the row reads as misaligned.
const PERK_LABEL_H = 28.184;

export interface ProPerk {
  icon: string;
  label: ReactNode;
}

/** The gold face's three specks of light, at the 398-wide button's own x's. */
const PRO_SPECULARS = [
  { left: 50.84, top: 7.75, size: 3.809, fill: "#ffffff", opacity: 0.49 },
  { left: 187.05, top: 14.62, size: 3.809, fill: "#ffffff", opacity: 0.35 },
  { left: 63.04, top: 32.13, size: 3.809, fill: "rgba(255,255,255,0.8)", opacity: 0.58 },
];

export function ProOfferCard({
  hero,
  title,
  savings,
  perks,
  actionLabel,
  onAction,
  actionDisabled,
  actionActive,
  onClick,
  dimmed,
  maxScale = 1.25,
}: {
  /** The scene across the top, bleeding past both edges of the card. */
  hero: string;
  title: ReactNode;
  /** Per cent off, when there is a real one. No badge without it. */
  savings?: number;
  perks: ProPerk[];
  actionLabel: ReactNode;
  onAction?: () => void;
  actionDisabled?: boolean;
  /** The tier the player is already on — draws the quiet button. */
  actionActive?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
  maxScale?: number;
}) {
  const { ref, scale, offsetX } = useBannerScale(maxScale, PRO_CARD_W);
  const stageHeight = PRO_CARD_H + PRO_CARD_FOOT;

  return (
    <div
      ref={ref}
      className="relative w-full"
      // The stage is scaled, so the wrapper reserves the scaled height
      // itself — a transform does not affect layout.
      style={{ height: stageHeight * scale, opacity: dimmed ? 0.7 : 1 }}
    >
      <div
        className="absolute top-0"
        style={{
          left: offsetX,
          width: PRO_CARD_W,
          height: stageHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          onClick={onClick}
          className={`absolute left-0 top-0 h-[527px] w-[426px] overflow-clip rounded-[28px] border border-solid border-[#e8daf8] shadow-[0px_0px_0px_1px_#ffffff,0px_8px_0px_0px_#cfc0e9] ${
            onClick ? "cursor-pointer" : ""
          }`}
          style={{ background: PRO_CARD_FILL }}
        >
          {/* The scene, wider than the card on both sides so it has no edges
              of its own to see (1119:5503). */}
          <img
            src={hero}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-[-36px] top-[-1px] h-[279px] w-[495px] max-w-none object-cover"
          />
          {/* 1119:5530 and 1119:5531: two bands of the card's own fill,
              blurred, laid across the picture's foot so it dissolves into the
              card rather than ending on a line. Two, as drawn — one is not
              opaque enough at the middle to cover the join, which is the
              whole reason the frame has a pair. */}
          {[30, -10].map((left) => (
            <div
              key={left}
              aria-hidden
              className="pointer-events-none absolute top-[241px] h-[80px] w-[398px] blur-[22px]"
              style={{ left, background: PRO_CARD_FILL }}
            />
          ))}

          {/* 1119:5511 — what is off, when something is. Never drawn without
              a real figure behind it: a badge is a claim about money. */}
          {savings != null && (
            <div className="absolute left-[17px] top-[14px] flex h-[32px] items-center rounded-[15.8px] border-2 border-solid border-[#ffe8b5] bg-[rgba(249,198,37,0.62)] px-[10.2px] shadow-[0px_2.26px_6.78px_0px_rgba(151,64,64,0.06),0px_2.26px_0px_0px_#d6c7c4]">
              <span className="whitespace-nowrap font-[Nunito] text-[13.664px] font-extrabold leading-[13.664px] tracking-[-0.1562px] text-[#78350f]">
                -{savings}%
              </span>
            </div>
          )}

          {/* 1119:5532 — the name, in the face the app's own headings wear. */}
          <p className="absolute left-[22px] right-[16px] top-[267px] truncate font-hero text-[26px] capitalize leading-[44.814px] tracking-[-0.1494px] text-[#402666]">
            {title}
          </p>

          {perks.slice(0, PERK_LEFTS.length).map((perk, i) => {
            const left = PERK_LEFTS[i];
            return (
              <div key={i}>
                <div
                  aria-hidden
                  className="absolute rounded-[18.282px] border-[0.762px] border-solid"
                  style={{
                    left,
                    top: PERK_TOP,
                    width: PERK_W,
                    height: PERK_H,
                    backgroundImage: PERK_TILE_FILL,
                    borderColor: PERK_TILE_EDGE,
                    boxShadow: PERK_SHEEN,
                  }}
                />
                <img
                  src={perk.icon}
                  alt=""
                  draggable={false}
                  className="absolute max-w-none object-contain"
                  style={{
                    left: left + (PERK_W - PERK_ICON) / 2,
                    top: PERK_ICON_TOP,
                    width: PERK_ICON,
                    height: PERK_ICON,
                  }}
                />
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: left + (PERK_W - PERK_LABEL_W) / 2,
                    top: PERK_LABEL_TOP,
                    width: PERK_LABEL_W,
                    height: PERK_LABEL_H,
                  }}
                >
                  <p className="line-clamp-2 text-center font-[Nunito] text-[12.188px] font-semibold leading-[14.016px] tracking-[-0.1219px] text-[#402666]">
                    {perk.label}
                  </p>
                </div>
              </div>
            );
          })}

          {/* 1119:5504 — the buy button, inside the card now rather than
              straddling its bottom edge. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
            disabled={actionDisabled}
            className="absolute left-[14px] top-[447px] flex h-[59px] w-[398px] items-center justify-center rounded-[18.282px] border border-solid disabled:cursor-not-allowed"
            style={{
              borderColor: actionActive ? ACTIVE_BORDER : "#e9e5fa",
              boxShadow: actionActive
                ? ACTIVE_SHADOW
                : "0px 4.57px 0px 0px #841a66, 0px 7.617px 18.282px 0px rgba(132,26,102,0.17)",
            }}
          >
            <span
              aria-hidden
              className="absolute left-[2px] top-px h-[54px] w-[393px] rounded-[16px]"
              style={{ backgroundImage: actionActive ? ACTIVE_BUTTON : GOLD_BUTTON }}
            />
            {!actionActive &&
              PRO_SPECULARS.map((spec) => (
                <span
                  key={spec.left}
                  aria-hidden
                  className="absolute rounded-full"
                  style={{
                    left: spec.left,
                    top: spec.top,
                    width: spec.size,
                    height: spec.size,
                    background: spec.fill,
                    opacity: spec.opacity,
                  }}
                />
              ))}
            <span
              className={`relative flex items-center gap-[8px] whitespace-nowrap font-[Nunito] text-[18px] font-bold leading-[23.576px] tracking-[-0.1371px] ${
                actionActive ? "text-[#402666]" : "text-white drop-shadow-[0px_3.047px_2.285px_rgba(0,0,0,0.07)]"
              }`}
            >
              {actionActive && <Check className="size-[18px]" strokeWidth={3} />}
              {actionLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Frames 1119:5471 and 1119:5502 — one PRO tier, sold. */
export function ProTierBanner({
  hero,
  name,
  savings,
  perks,
  actionLabel,
  onAction,
  actionDisabled,
  actionActive,
  onClick,
  dimmed,
}: {
  hero: string;
  name: ReactNode;
  savings?: number;
  perks: ProPerk[];
  actionLabel: ReactNode;
  onAction: () => void;
  actionDisabled?: boolean;
  /** The tier the player is already on — draws the quiet button. */
  actionActive?: boolean;
  onClick?: () => void;
  dimmed?: boolean;
}) {
  return (
    <ProOfferCard
      hero={hero}
      title={name}
      savings={savings}
      perks={perks}
      actionLabel={actionLabel}
      onAction={onAction}
      actionDisabled={actionDisabled}
      actionActive={actionActive}
      onClick={onClick}
      dimmed={dimmed}
    />
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
