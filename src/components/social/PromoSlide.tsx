import { Apple } from "lucide-react";
import { Background } from "@/components/social/StarQuestionFrame";
import type { SafeInsets } from "@/components/social/StarQuestionFrame";

/**
 * Promo slides for carousel posts — the App Store screenshot set (Figma
 * kTmQjqS4JrxlOYP9NdN4Vl, section 788:9335) rebuilt responsively so one
 * slide serves every canvas the pipeline posts to.
 *
 * Copy is localized per post language (en fallback), and every slide
 * carries the call-to-action row: an App Store badge and mytrivia.io.
 * Typography is the set's own: Manrope SemiBold, 1.2 leading, -0.04em
 * tracking, #FEFEFE; sublines Manrope Medium at 45% of the headline.
 *
 * Three archetypes:
 *  - hero-full: artwork fills the canvas (it carries the purple starfield),
 *    copy anchored top or bottom per artwork — Step01 mascot, Step05 party
 *  - device:    copy top-center over the shared starfield, phone mockup
 *    bleeding off the bottom — Step04
 *  - cta:       the closing slide — mascot artwork, centered copy, badges
 *    front and center
 *
 * Adding a slide = one asset + one entry in PROMO_SLIDES.
 */

interface PromoCopy {
  headline: string;
  subline: string;
}

export interface PromoSlideSpec {
  key: string;
  label: string;
  /**
   * hero-full: full-bleed scene art; device: phone art over the shared
   * background; panorama: a wide scene fitted whole under the copy (the
   * two-screen Trivia Party spread as one slide); cta: the closing slide.
   */
  layout: "hero-full" | "device" | "panorama" | "cta";
  copy: Record<string, PromoCopy>;
  /** File under /social-frames/promo/ */
  asset: string;
  /** Native aspect (w/h) of the asset, for sizing device art. */
  assetAspect: number;
  /** hero-full: where the copy block sits relative to the artwork. */
  copyPosition?: "top" | "bottom";
}

export const PROMO_SLIDES: PromoSlideSpec[] = [
  {
    key: "outsmart",
    label: "Outsmart friends",
    layout: "hero-full",
    copyPosition: "bottom",
    copy: {
      en: {
        headline: "Outsmart your friends",
        subline: "Quiz battles, picture rounds, and competitive leaderboards.",
      },
      ka: {
        headline: "აჯობე მეგობრებს",
        subline: "ქვიზ-ბრძოლები, სურათებიანი რაუნდები და ლიდერბორდები.",
      },
    },
    asset: "mascot-hero.jpg",
    assetAspect: 852 / 1846,
  },
  {
    key: "solo",
    label: "Solo play",
    layout: "device",
    copy: {
      en: {
        headline: "One tap and you're in.",
        subline: "Fast solo games across 45+ categories, always ready.",
      },
      ka: {
        headline: "ერთი შეხება და თამაშში ხარ",
        subline: "სწრაფი სოლო თამაშები 45+ კატეგორიაში — ყოველთვის მზად.",
      },
    },
    asset: "solo-hero.png",
    assetAspect: 1242 / 1412,
  },
  {
    key: "league",
    label: "Leaderboards",
    layout: "hero-full",
    copyPosition: "top",
    copy: {
      en: {
        headline: "Climb the league.",
        subline: "Weekly leaderboards with gifts and rewards for the sharpest players.",
      },
      ka: {
        headline: "აიწიე ლიგაში",
        subline: "ყოველკვირეული ლიდერბორდები საჩუქრებითა და ჯილდოებით.",
      },
    },
    asset: "league-hero.jpg",
    assetAspect: 1242 / 2198,
  },
  {
    key: "levels",
    label: "Never-ending trivia",
    layout: "device",
    copy: {
      en: {
        headline: "Never ending trivia.",
        subline: "Dozens of categories. Hundreds of levels. Thousands of questions.",
      },
      ka: {
        headline: "დაუსრულებელი ტრივია",
        subline: "ათობით კატეგორია. ასობით დონე. ათასობით კითხვა.",
      },
    },
    asset: "step04-devices.png",
    assetAspect: 1235 / 993,
  },
  {
    key: "party",
    label: "Trivia Party / TV",
    // The store set splits this scene across two screens; social gets the
    // whole spread on one slide.
    layout: "panorama",
    copy: {
      en: {
        headline: "Game night, on the big screen.",
        subline: "TV mode turns your living room into a quiz show.",
      },
      ka: {
        headline: "თამაშის ღამე დიდ ეკრანზე",
        subline: "TV რეჟიმი შენს მისაღებს ქვიზ-შოუდ აქცევს.",
      },
    },
    asset: "party-wide.jpg",
    assetAspect: 2484 / 2208,
  },
  {
    key: "rewards",
    label: "Daily rewards",
    layout: "device",
    copy: {
      en: {
        headline: "Come back and get rewarded.",
        subline: "Daily chests, streaks, and missions that pay out coins and gems.",
      },
      ka: {
        headline: "დაბრუნდი და მიიღე ჯილდო",
        subline: "ყოველდღიური სკივრები, სერიები და მისიები — მონეტებითა და ჯემებით.",
      },
    },
    asset: "rewards-hero.png",
    assetAspect: 1242 / 1422,
  },
  {
    key: "custom",
    label: "Custom quizzes",
    layout: "device",
    copy: {
      en: {
        headline: "Write your own trivia.",
        subline: "Build custom quizzes and host them for your friends.",
      },
      ka: {
        headline: "დაწერე შენი ტრივია",
        subline: "შექმენი საკუთარი ქვიზები და უმასპინძლე მეგობრებს.",
      },
    },
    asset: "custom-hero.png",
    assetAspect: 1242 / 1422,
  },
  {
    key: "cta",
    label: "Closing CTA",
    layout: "cta",
    copy: {
      en: {
        headline: "Play now!",
        subline: "Free on iPhone — join thousands of players.",
      },
      ka: {
        headline: "ითამაშე ახლავე!",
        subline: "უფასოა iPhone-ზე — შეუერთდი ათასობით მოთამაშეს.",
      },
    },
    asset: "mascot-hero.jpg",
    assetAspect: 852 / 1846,
  },
];

export const promoByKey = (key: string): PromoSlideSpec | undefined =>
  PROMO_SLIDES.find((p) => p.key === key);

/** App Store pill + mytrivia.io pill — the call-to-action row on every slide. */
function CtaBadges({ size, center }: { size: number; center?: boolean }) {
  const pill: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: size * 0.35,
    borderRadius: 999,
    padding: `${size * 0.45}px ${size * 0.8}px`,
    fontFamily: "'Manrope', 'Nunito Sans', sans-serif",
    fontWeight: 600,
    fontSize: size,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
  return (
    <div
      style={{
        display: "flex",
        gap: size * 0.5,
        justifyContent: center ? "center" : "flex-start",
        alignItems: "center",
      }}
    >
      <span style={{ ...pill, background: "rgba(8,14,18,0.82)", color: "#FFFFFF" }}>
        <Apple size={size * 1.05} strokeWidth={2.2} />
        App Store
      </span>
      <span style={{ ...pill, background: "rgba(255,255,255,0.92)", color: "#402666" }}>
        mytrivia.io
      </span>
    </div>
  );
}

export function PromoSlide({
  w,
  h,
  spec,
  lang = "en",
  safeInsets,
}: {
  w: number;
  h: number;
  spec: PromoSlideSpec;
  lang?: string;
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
  const copy = spec.copy[lang] ?? spec.copy.en;
  const headSize = (ratio >= 1.6 ? 92 : ratio >= 0.95 ? 72 : 56) * c;
  const subSize = headSize * 0.45;
  const badgeSize = headSize * 0.34;

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

  if (spec.layout === "cta") {
    // Closing slide: artwork behind, copy and badges centered in the lower
    // half where the mascot art leaves clear gradient.
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
            objectPosition: wide ? "center 15%" : "top center",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: Math.max(0.08 * w, safe.left + 30 * c),
            right: Math.max(0.08 * w, safe.right + 30 * c),
            bottom: Math.max(0.09 * h, safe.bottom + 40 * c),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28 * c,
            textAlign: "center",
            textShadow: "0 2px 24px rgba(20, 8, 60, 0.55)",
          }}
        >
          <p style={{ ...headStyle, fontSize: headSize * 1.15 }}>{copy.headline}</p>
          <p style={{ ...subStyle, opacity: 0.92 }}>{copy.subline}</p>
          <CtaBadges size={badgeSize * 1.5} center />
        </div>
      </div>
    );
  }

  if (spec.layout === "hero-full") {
    const top = spec.copyPosition === "top";
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
            // Copy-at-top artwork keeps its subject low, and vice versa.
            objectPosition: top ? (wide ? "center 70%" : "bottom center") : wide ? "center 20%" : "top center",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: Math.max(0.1 * w, safe.left + 40 * c),
            right: Math.max(0.12 * w, safe.right + 40 * c),
            ...(top
              ? { top: Math.max(0.06 * h, safe.top + 30 * c) }
              : { bottom: Math.max(0.075 * h, safe.bottom + 40 * c) }),
            display: "flex",
            flexDirection: "column",
            gap: 22 * c,
            textShadow: "0 2px 24px rgba(20, 8, 60, 0.55)",
          }}
        >
          <p style={headStyle}>{copy.headline}</p>
          <p style={{ ...subStyle, opacity: 0.92 }}>{copy.subline}</p>
          <CtaBadges size={badgeSize} />
        </div>
      </div>
    );
  }

  if (spec.layout === "panorama") {
    // The whole scene on one slide: copy top-center, the wide art fitted
    // uncropped below it, anchored to the bottom edge.
    const copyTop = Math.max(0.055 * h, safe.top + 30 * c);
    const availW = w - safe.left - safe.right;
    const availH = h * 0.62 - safe.bottom;
    const panW = Math.min(availW, availH * spec.assetAspect);
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
            gap: 18 * c,
            textAlign: "center",
          }}
        >
          <p style={headStyle}>{copy.headline}</p>
          <p style={{ ...subStyle, opacity: 0.9 }}>{copy.subline}</p>
          <CtaBadges size={badgeSize} center />
        </div>
        <img
          src={src}
          alt=""
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: Math.max(0, safe.bottom * 0.5),
            width: panW,
          }}
        />
      </div>
    );
  }

  // device layout: copy top-center, phone art bleeding off the bottom.
  const copyTop = Math.max(0.055 * h, safe.top + 30 * c);
  const artW = Math.min(w * (wide ? 0.52 : 0.92), h * 0.58 * spec.assetAspect);
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
          gap: 18 * c,
          textAlign: "center",
        }}
      >
        <p style={headStyle}>{copy.headline}</p>
        <p style={{ ...subStyle, opacity: 0.9 }}>{copy.subline}</p>
        <CtaBadges size={badgeSize} center />
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
