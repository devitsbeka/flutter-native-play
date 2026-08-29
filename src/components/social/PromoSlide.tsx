import { Background } from "@/components/social/StarQuestionFrame";
import type { SafeInsets } from "@/components/social/StarQuestionFrame";

/**
 * Promo slides for carousel posts — the App Store screenshot set (Figma
 * kTmQjqS4JrxlOYP9NdN4Vl, section 788:9335) rebuilt responsively so one
 * slide serves every canvas the pipeline posts to, instead of a flattened
 * 1242×2208 export that fits nothing else.
 *
 * Typography is the set's own: Manrope SemiBold, 1.2 leading, -0.04em
 * tracking, #FEFEFE; sublines Manrope Medium at 45% of the headline. Hero
 * art is exported from the same Figma frames (public/social-frames/promo/).
 *
 * Two archetypes cover the set:
 *  - hero-full: the artwork fills the canvas (it carries the purple starfield
 *    itself), copy anchored to the lower-left — Step01 "Outsmart your friends"
 *  - device:    copy top-center over the shared starfield background, phone
 *    mockup bleeding off the bottom edge — Step03/04
 *
 * Adding a slide = one asset + one entry in PROMO_SLIDES.
 */

export interface PromoSlideSpec {
  key: string;
  layout: "hero-full" | "device";
  headline: string;
  subline: string;
  /** File under /social-frames/promo/ */
  asset: string;
  /** Native aspect (w/h) of the asset, for sizing device art. */
  assetAspect: number;
}

export const PROMO_SLIDES: PromoSlideSpec[] = [
  {
    key: "outsmart",
    layout: "hero-full",
    headline: "Outsmart your friends",
    subline: "Quiz battles, picture rounds, and competitive leaderboards.",
    asset: "mascot-hero.png",
    assetAspect: 852 / 1846,
  },
  {
    key: "levels",
    layout: "device",
    headline: "Never ending trivia.",
    subline: "Dozens of categories. Hundreds of levels. Thousands of questions.",
    asset: "step04-devices.png",
    assetAspect: 1235 / 993,
  },
];

export const promoByKey = (key: string): PromoSlideSpec | undefined =>
  PROMO_SLIDES.find((p) => p.key === key);

export function PromoSlide({
  w,
  h,
  spec,
  safeInsets,
}: {
  w: number;
  h: number;
  spec: PromoSlideSpec;
  safeInsets?: SafeInsets;
}) {
  const ratio = h / w;
  const wide = ratio < 0.95;
  const safe = {
    top: safeInsets?.top ?? 0,
    bottom: safeInsets?.bottom ?? 0,
    left: safeInsets?.left ?? 0,
    right: safeInsets?.right ?? 0,
  };
  const c = w / 1080;
  // Headline scale per canvas family; subline is the set's 54/120 ratio.
  const headSize = (ratio >= 1.6 ? 92 : ratio >= 0.95 ? 72 : 56) * c;
  const subSize = headSize * 0.45;

  const frameStyle: React.CSSProperties = {
    width: w,
    height: h,
    position: "relative",
    overflow: "hidden",
    background: "#080e12",
  };

  const headStyle: React.CSSProperties = {
    fontFamily: "'Manrope', 'Nunito Sans', 'Noto Sans Georgian', sans-serif",
    fontWeight: 600,
    fontSize: headSize,
    lineHeight: 1.2,
    letterSpacing: `${-0.04 * headSize}px`,
    color: "#FEFEFE",
    margin: 0,
  };
  const subStyle: React.CSSProperties = {
    fontFamily: "'Manrope', 'Nunito Sans', 'Noto Sans Georgian', sans-serif",
    fontWeight: 500,
    fontSize: subSize,
    lineHeight: 1.35,
    color: "#FFFFFF",
    margin: 0,
  };

  const src = `/social-frames/promo/${spec.asset}`;

  if (spec.layout === "hero-full") {
    // Artwork is the whole scene; copy sits lower-left inside the safe box.
    const copyBottom = Math.max(0.075 * h, safe.bottom + 40 * c);
    const copyLeft = Math.max(0.1 * w, safe.left + 40 * c);
    const copyRight = Math.max(0.12 * w, safe.right + 40 * c);
    return (
      <div style={frameStyle}>
        <Background />
        <img
          src={src}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: wide ? "center 20%" : "top center",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: copyLeft,
            right: copyRight,
            bottom: copyBottom,
            display: "flex",
            flexDirection: "column",
            gap: 24 * c,
            // The art's own gradient can run light behind the copy on crops;
            // a soft scrim keeps the white text solid without reading as a bar.
            textShadow: "0 2px 24px rgba(20, 8, 60, 0.55)",
          }}
        >
          <p style={headStyle}>{spec.headline}</p>
          <p style={{ ...subStyle, opacity: 0.92 }}>{spec.subline}</p>
        </div>
      </div>
    );
  }

  // device layout: copy top-center, phone art bleeding off the bottom.
  const copyTop = Math.max(0.055 * h, safe.top + 30 * c);
  const artW = Math.min(w * (wide ? 0.52 : 0.92), (h * 0.62) * spec.assetAspect);
  return (
    <div style={frameStyle}>
      <Background />
      <div
        style={{
          position: "absolute",
          top: copyTop,
          left: Math.max(0.08 * w, safe.left + 30 * c),
          right: Math.max(0.08 * w, safe.right + 30 * c),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20 * c,
          textAlign: "center",
        }}
      >
        <p style={headStyle}>{spec.headline}</p>
        <p style={{ ...subStyle, opacity: 0.9 }}>{spec.subline}</p>
      </div>
      <img
        src={src}
        alt=""
        style={{
          position: "absolute",
          left: wide ? "auto" : "50%",
          right: wide ? 0.06 * w : "auto",
          transform: wide ? undefined : "translateX(-50%)",
          bottom: 0,
          width: artW,
        }}
      />
    </div>
  );
}
